import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") || "";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") || "";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:contact@pawsome.app";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

function b64url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let str = "";
  for (const byte of bytes) str += String.fromCharCode(byte);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function b64urlDecode(str: string): Uint8Array {
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

async function buildVapidJwt(audience: string): Promise<string> {
  const header = b64url(new TextEncoder().encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const payload = b64url(new TextEncoder().encode(JSON.stringify({
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: VAPID_SUBJECT,
  })));
  const toSign = `${header}.${payload}`;

  const privKeyBytes = b64urlDecode(VAPID_PRIVATE_KEY);
  // Wrap raw P-256 scalar into PKCS8 DER
  const pkcs8Header = new Uint8Array([
    0x30, 0x41, 0x02, 0x01, 0x00, 0x30, 0x13, 0x06, 0x07, 0x2a, 0x86, 0x48,
    0xce, 0x3d, 0x02, 0x01, 0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03,
    0x01, 0x07, 0x04, 0x27, 0x30, 0x25, 0x02, 0x01, 0x01, 0x04, 0x20,
  ]);
  const pkcs8 = new Uint8Array(pkcs8Header.length + privKeyBytes.length);
  pkcs8.set(pkcs8Header);
  pkcs8.set(privKeyBytes, pkcs8Header.length);

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    pkcs8,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const sig = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    cryptoKey,
    new TextEncoder().encode(toSign)
  );

  return `${toSign}.${b64url(sig)}`;
}

async function sendPushToSubscription(
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } },
  payload: { title: string; body: string; tag?: string; related_id?: string | null; type?: string }
): Promise<void> {
  const url = new URL(subscription.endpoint);
  const audience = `${url.protocol}//${url.host}`;
  const jwt = await buildVapidJwt(audience);

  // Encrypt payload using aes128gcm
  const authBytes = b64urlDecode(subscription.keys.auth);
  const p256dhBytes = b64urlDecode(subscription.keys.p256dh);

  // Import subscriber public key
  const subscriberKey = await crypto.subtle.importKey(
    "raw", p256dhBytes, { name: "ECDH", namedCurve: "P-256" }, true, []
  );

  // Generate ephemeral server key pair
  const serverKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]
  );
  const serverPublicBytes = new Uint8Array(await crypto.subtle.exportKey("raw", serverKeyPair.publicKey));

  // ECDH shared secret
  const sharedBits = await crypto.subtle.deriveBits(
    { name: "ECDH", public: subscriberKey }, serverKeyPair.privateKey, 256
  );

  // HKDF extract+expand
  const enc = new TextEncoder();

  async function hkdfExtract(salt: Uint8Array, ikm: Uint8Array): Promise<CryptoKey> {
    const saltKey = await crypto.subtle.importKey("raw", salt, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const prk = await crypto.subtle.sign("HMAC", saltKey, ikm);
    return crypto.subtle.importKey("raw", prk, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  }

  async function hkdfExpand(prk: CryptoKey, info: Uint8Array, length: number): Promise<Uint8Array> {
    const t = new Uint8Array(await crypto.subtle.sign("HMAC", prk, new Uint8Array([...info, 0x01])));
    return t.slice(0, length);
  }

  const salt = crypto.getRandomValues(new Uint8Array(16));

  // PRK_key
  const prkKey = await hkdfExtract(
    authBytes,
    new Uint8Array([...new Uint8Array(sharedBits), ...enc.encode("WebPush: info\x00"), ...p256dhBytes, ...serverPublicBytes])
  );
  const ikm = await hkdfExpand(prkKey, enc.encode("Content-Encoding: aes128gcm\x00"), 32);

  // Content encryption key and nonce
  const prkInfo = await hkdfExtract(salt, new Uint8Array([...ikm]));
  const cek = await hkdfExpand(prkInfo, enc.encode("Content-Encoding: aes128gcm\x00"), 16);
  const nonce = await hkdfExpand(prkInfo, enc.encode("Content-Encoding: nonce\x00"), 12);

  const aesKey = await crypto.subtle.importKey("raw", cek, { name: "AES-GCM" }, false, ["encrypt"]);

  const plaintext = enc.encode(JSON.stringify(payload));
  // Pad to fixed block (add trailing 0x02 delimiter)
  const padded = new Uint8Array([...plaintext, 0x02]);

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonce, tagLength: 128 }, aesKey, padded
  );

  // Build body: salt(16) + recordSize(4) + keyLen(1) + serverPublicKey(65) + ciphertext
  const recordSize = new DataView(new ArrayBuffer(4));
  recordSize.setUint32(0, 4096, false);
  const body = new Uint8Array([
    ...salt,
    ...new Uint8Array(recordSize.buffer),
    serverPublicBytes.length,
    ...serverPublicBytes,
    ...new Uint8Array(ciphertext),
  ]);

  const res = await fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      "Authorization": `vapid t=${jwt},k=${VAPID_PUBLIC_KEY}`,
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "aes128gcm",
      "TTL": "86400",
    },
    body,
  });

  if (!res.ok && res.status !== 201) {
    const text = await res.text();
    console.error("Push send failed:", res.status, text);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    // Webhook from Supabase DB: { type: "INSERT", table: "user_notifications", record: {...} }
    const record = body.record ?? body;

    const userId = record.user_id;
    const title = record.title || "Pawsome Places";
    const message = record.message || "";
    const relatedId = record.related_id ?? null;
    const type = record.type ?? "zone_alert";

    if (!userId) return new Response("ok", { headers: corsHeaders });

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("endpoint, keys")
      .eq("user_id", userId);

    if (!subs || subs.length === 0) return new Response("ok", { headers: corsHeaders });

    await Promise.allSettled(
      subs.map((sub: any) =>
        sendPushToSubscription(sub, { title, body: message, tag: type, related_id: relatedId, type })
      )
    );

    return new Response(JSON.stringify({ sent: subs.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-push error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
