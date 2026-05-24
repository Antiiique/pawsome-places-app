import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, ChevronUp, Image, Loader2, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { useHandedness } from "@/contexts/HandednessContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const MAPBOX_TOKEN = (import.meta.env.VITE_MAPBOX_TOKEN as string) || "pk.eyJ1IjoiZWx2aW5hZ2QiLCJhIjoiY21vcjMwNHU5MmFodzJxc2FnOTc1bHVsYiJ9.zkIqku9ZIn5_h674NQLX3w";

interface LostPetModalProps {
  open: boolean;
  onClose: () => void;
  onPublished: () => void;
}

const emptyForm = {
  pet_name: "",
  breed: "",
  color: "",
  age_description: "",
  description: "",
  last_seen_address: "",
  last_seen_date: new Date().toISOString().slice(0, 10),
  contact_phone: "",
  contact_email: "",
};

export default function LostPetModal({ open, onClose, onPublished }: LostPetModalProps) {
  const { user } = useAuthContext();
  const { isLeftHanded } = useHandedness();
  const [visible, setVisible] = useState(false);
  const [snapState, setSnapState] = useState<"half" | "full">("half");
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Drag state
  const [dragging, setDragging] = useState(false);
  const [dragDelta, setDragDelta] = useState(0);
  const isDragging    = useRef(false);
  const dragStartY    = useRef(0);
  const lastTouchY    = useRef(0);
  const lastTouchTime = useRef(0);
  const lastVelocity  = useRef(0);

  // Freeze map while open
  useEffect(() => {
    if (!open) return;
    window.dispatchEvent(new Event("map-freeze"));
    return () => { window.dispatchEvent(new Event("map-unfreeze")); };
  }, [open]);

  // Sync visible with open
  const prevOpen = useRef(false);
  if (open !== prevOpen.current) {
    prevOpen.current = open;
    if (open) { setSnapState("half"); setTimeout(() => setVisible(true), 10); }
  }

  const handleClose = () => {
    setVisible(false);
    setTimeout(() => {
      setPhotos([]); setPreviews([]);
      setForm(emptyForm);
      setLat(null); setLng(null);
      onClose();
    }, 300);
  };

  const handleDragStart = (e: React.TouchEvent) => {
    isDragging.current = true;
    dragStartY.current = e.touches[0].clientY;
    lastTouchY.current = e.touches[0].clientY;
    lastTouchTime.current = Date.now();
    lastVelocity.current = 0;
    setDragging(true);
    setDragDelta(0);
  };

  const handleDragMove = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    const y = e.touches[0].clientY;
    const now = Date.now();
    const dt = now - lastTouchTime.current;
    if (dt > 0) lastVelocity.current = (y - lastTouchY.current) / dt;
    lastTouchY.current = y;
    lastTouchTime.current = now;
    setDragDelta(y - dragStartY.current); // signed
  };

  const handleDragEnd = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    setDragging(false);
    const h = window.innerHeight - 56;
    const deltaPct = h > 0 ? (dragDelta / h) * 100 : 0;
    const vel = lastVelocity.current;
    if (snapState === "half") {
      if (vel < -0.3 || deltaPct < -15) { setSnapState("full"); }
      else if (vel > 0.3 || deltaPct > 15) { handleClose(); }
    } else {
      if (vel > 0.5 || deltaPct > 25) { setSnapState("half"); }
    }
    setDragDelta(0);
  };

  const getGPS = () => {
    setGeoLoading(true);
    navigator.geolocation?.getCurrentPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      setLat(latitude);
      setLng(longitude);
      try {
        const resp = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?access_token=${MAPBOX_TOKEN}&types=address,neighborhood,place&language=fr`);
        const data = await resp.json();
        if (data.features?.[0]) setForm(f => ({ ...f, last_seen_address: data.features[0].place_name }));
      } catch {}
      setGeoLoading(false);
    }, () => setGeoLoading(false));
  };

  const addPhotos = (files: FileList | null) => {
    if (!files) return;
    const valid = Array.from(files).filter(f => {
      if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(f.type)) {
        toast.error(`${f.name} : format non supporté (JPEG, PNG, WebP)`); return false;
      }
      if (f.size > 5 * 1024 * 1024) {
        toast.error(`${f.name} : trop volumineux (max 5 Mo)`); return false;
      }
      return true;
    }).slice(0, 5 - photos.length);
    setPhotos(prev => [...prev, ...valid].slice(0, 5));
    setPreviews(prev => [...prev, ...valid.map(f => URL.createObjectURL(f))].slice(0, 5));
  };

  const removePhoto = (i: number) => {
    setPhotos(p => p.filter((_, idx) => idx !== i));
    setPreviews(p => p.filter((_, idx) => idx !== i));
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!form.pet_name.trim()) { toast.error("Le nom de l'animal est requis"); return; }
    if (!lat || !lng) { toast.error("La localisation est requise — utilise le bouton GPS ou saisis une adresse"); return; }
    setSubmitting(true);
    try {
      const { data: lostPet, error } = await supabase
        .from("lost_pets" as any)
        .insert({
          user_id: user.id,
          pet_name: form.pet_name.trim(),
          species: "dog",
          breed: form.breed || null,
          color: form.color || null,
          age_description: form.age_description || null,
          description: form.description || null,
          last_seen_address: form.last_seen_address || null,
          last_seen_lat: lat,
          last_seen_lng: lng,
          last_seen_date: form.last_seen_date || null,
          contact_phone: form.contact_phone || null,
          contact_email: form.contact_email || user.email || null,
          status: "active",
        })
        .select("id")
        .single();

      if (error || !lostPet) throw error || new Error("Impossible de créer l'annonce");

      const petId = (lostPet as any).id;

      for (const photo of photos) {
        const path = `${user.id}/lost/${petId}/${Date.now()}_${photo.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
        const { data: uploadData } = await supabase.storage.from("stray-photos").upload(path, photo);
        if (uploadData) {
          const { data: { publicUrl } } = supabase.storage.from("stray-photos").getPublicUrl(path);
          await supabase.from("lost_pet_photos" as any).insert({ lost_pet_id: petId, url: publicUrl });
        }
      }

      if (lat && lng) {
        await supabase.rpc("notify_nearby_users_lost_pet" as any, {
          p_lost_pet_id: petId,
          p_lat: lat,
          p_lng: lng,
          p_pet_name: form.pet_name.trim(),
          p_poster_id: user.id,
        }).then(() => {});
      }

      toast.success("Annonce publiée ! Les utilisateurs proches ont été notifiés 🔔");
      onPublished();
      handleClose();
    } catch (err: any) {
      toast.error("Erreur : " + (err?.message || "inconnue"));
    } finally {
      setSubmitting(false);
    }
  };

  if (!open && !visible) return null;

  return createPortal(
    <>
      {/* Scrim */}
      <div
        className="fixed inset-0 z-[700] bg-black/60"
        style={{ opacity: visible ? 1 : 0, transition: "opacity 0.3s ease" }}
        onClick={handleClose}
      />

      {/* Bottom sheet — full screen */}
      <div
        className="fixed left-0 right-0 bottom-0 z-[700] bg-card rounded-t-2xl shadow-2xl flex flex-col"
        style={(() => {
          const snapBase = snapState === "full" ? 0 : 55;
          const headerH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-h")) || 56;
          const h = window.innerHeight - headerH;
          const dragPct = dragging && h > 0 ? (dragDelta / h) * 100 : 0;
          const currentPct = Math.max(0, Math.min(100, snapBase + dragPct));
          return {
            top: 0,
            paddingTop: snapState === "full" ? "env(safe-area-inset-top)" : 0,
            transform: `translateY(${visible ? currentPct + "%" : "100%"})`,
            transition: dragging ? "none" : "transform 0.3s cubic-bezier(0.4,0,0.2,1), padding-top 0.3s cubic-bezier(0.4,0,0.2,1)",
          };
        })()}
      >
        {/* Drag handle */}
        <div
          className="shrink-0 flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing"
          onTouchStart={handleDragStart}
          onTouchMove={handleDragMove}
          onTouchEnd={handleDragEnd}
          style={{ touchAction: "none" }}
        >
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Header (swipeable) */}
        <div
          className={`flex items-center justify-between px-5 pt-3 pb-3 border-b border-border shrink-0 ${isLeftHanded ? "flex-row-reverse" : ""}`}
          onTouchStart={handleDragStart}
          onTouchMove={handleDragMove}
          onTouchEnd={handleDragEnd}
          style={{ touchAction: "none" }}
        >
          <div>
            <h2 className="font-bold text-lg text-foreground">​🆘 Signaler un animal perdu</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Les utilisateurs à moins de 50 km seront notifiés</p>
          </div>
          <div className={`flex items-center gap-1 shrink-0 ${isLeftHanded ? "flex-row-reverse" : ""}`}>
            <button onClick={() => setSnapState(s => s === "half" ? "full" : "half")} className="p-1.5 rounded-full hover:bg-muted transition-colors">
              <ChevronUp className={`w-5 h-5 text-muted-foreground transition-transform duration-300 ${snapState === "full" ? "rotate-180" : ""}`} />
            </button>
            <button onClick={handleClose} className="p-1.5 rounded-full hover:bg-muted transition-colors">
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Scrollable content — only scrolls in full mode */}
        <div className="flex-1 p-5 space-y-4 pb-24" style={{ overflowY: "auto", touchAction: "pan-y" }}>
          {/* Photos */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Photos <span className="text-muted-foreground font-normal normal-case">(jusqu'à 5)</span></p>
            <div className="flex gap-2 flex-wrap">
              {previews.map((url, i) => (
                <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border border-border">
                  <img src={url} className="w-full h-full object-cover" alt="" />
                  <button onClick={() => removePhoto(i)} className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center">
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
              {photos.length < 5 && (
                <button onClick={() => photoInputRef.current?.click()}
                  className="w-20 h-20 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 hover:bg-muted transition-colors">
                  <Image className="w-5 h-5 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground">Ajouter</span>
                </button>
              )}
            </div>
            <input ref={photoInputRef} type="file" accept="image/*" multiple hidden onChange={e => addPhotos(e.target.files)} />
          </div>

          {/* Nom */}
          <div>
            <label className="text-xs font-medium text-foreground">Nom de l'animal *</label>
            <input value={form.pet_name} onChange={e => setForm(f => ({ ...f, pet_name: e.target.value }))}
              className="mt-1 w-full h-10 bg-muted rounded-lg px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary"
              placeholder="Ex: Rex" />
          </div>

          {/* Race + Couleur */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground">Race</label>
              <input value={form.breed} onChange={e => setForm(f => ({ ...f, breed: e.target.value }))}
                className="mt-1 w-full h-10 bg-muted rounded-lg px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary"
                placeholder="Ex: Labrador" />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Couleur</label>
              <input value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                className="mt-1 w-full h-10 bg-muted rounded-lg px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary"
                placeholder="Ex: Caramel" />
            </div>
          </div>

          {/* Âge + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground">Âge</label>
              <input value={form.age_description} onChange={e => setForm(f => ({ ...f, age_description: e.target.value }))}
                className="mt-1 w-full h-10 bg-muted rounded-lg px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary"
                placeholder="Ex: 3 ans" />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Date de disparition</label>
              <input type="date" value={form.last_seen_date} onChange={e => setForm(f => ({ ...f, last_seen_date: e.target.value }))}
                className="mt-1 w-full h-10 bg-muted rounded-lg px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary" />
            </div>
          </div>

          {/* Localisation */}
          <div>
            <label className="text-xs font-medium text-foreground">Dernière localisation connue</label>
            <div className="flex gap-2 mt-1">
              <input value={form.last_seen_address} onChange={e => setForm(f => ({ ...f, last_seen_address: e.target.value }))}
                className="flex-1 h-10 bg-muted rounded-lg px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary"
                placeholder="Adresse ou quartier…" />
              <button onClick={getGPS} disabled={geoLoading}
                className="shrink-0 h-10 w-10 bg-primary rounded-lg flex items-center justify-center disabled:opacity-50 hover:bg-primary/90 transition-colors">
                {geoLoading ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <MapPin className="w-4 h-4 text-white" />}
              </button>
            </div>
            {lat && <p className="text-[10px] text-green-600 dark:text-green-400 mt-1">✓ Position GPS enregistrée ({lat.toFixed(4)}, {lng?.toFixed(4)})</p>}
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-medium text-foreground">Description & signes particuliers</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3}
              className="mt-1 w-full bg-muted rounded-lg px-3 py-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary resize-none"
              placeholder="Collier, taille, comportement, circonstances de la disparition…" />
          </div>

          {/* Contact */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-foreground">Coordonnées de contact</p>
            <div className="grid grid-cols-2 gap-3">
              <input value={form.contact_phone} onChange={e => setForm(f => ({ ...f, contact_phone: e.target.value }))}
                className="h-10 bg-muted rounded-lg px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary"
                placeholder="📞 Téléphone" />
              <input type="email" value={form.contact_email} onChange={e => setForm(f => ({ ...f, contact_email: e.target.value }))}
                className="h-10 bg-muted rounded-lg px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary"
                placeholder="✉️ Email" />
            </div>
          </div>

          <Button onClick={handleSubmit} disabled={submitting || !form.pet_name.trim()} className="w-full gap-2 bg-amber-500 hover:bg-amber-600 text-white">
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Publication…</> : "​🆘 Publier l'annonce"}
          </Button>
        </div>
      </div>

    </>,
    document.body
  );
}
