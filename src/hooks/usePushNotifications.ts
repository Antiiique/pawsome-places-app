import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY as string;

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function usePushNotifications() {
  const { user } = useAuthContext();
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    if (typeof Notification !== "undefined") setPermission(Notification.permission);
  }, []);

  const subscribe = useCallback(async (): Promise<boolean> => {
    if (!user || !("serviceWorker" in navigator) || !("PushManager" in window)) return false;

    const perm = await Notification.requestPermission();
    setPermission(perm);
    if (perm !== "granted") return false;

    try {
      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      const subJson = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
      await (supabase as any).from("push_subscriptions").upsert({
        user_id: user.id,
        endpoint: subJson.endpoint,
        keys: subJson.keys,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,endpoint" });

      setSubscribed(true);
      return true;
    } catch (err) {
      console.error("Push subscribe error:", err);
      return false;
    }
  }, [user]);

  const unsubscribe = useCallback(async () => {
    if (!user || !("serviceWorker" in navigator)) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await (supabase as any).from("push_subscriptions").delete().eq("user_id", user.id).eq("endpoint", sub.endpoint);
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } catch (err) {
      console.error("Push unsubscribe error:", err);
    }
  }, [user]);

  return { permission, subscribed, subscribe, unsubscribe };
}
