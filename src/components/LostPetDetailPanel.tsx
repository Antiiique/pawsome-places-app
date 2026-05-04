import { useEffect, useRef, useState } from "react";
import { X, User, MapPin, Phone, Mail, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

function getSafePhone(phone: string | null): string | null {
  if (!phone) return null;
  return /^[0-9\s+\-().]+$/.test(phone.trim()) ? phone.trim() : null;
}

export interface LostPet {
  id: string;
  user_id: string;
  pet_name: string;
  species: string;
  breed: string | null;
  color: string | null;
  age_description: string | null;
  description: string | null;
  last_seen_address: string | null;
  last_seen_lat: number | null;
  last_seen_lng: number | null;
  last_seen_date: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  status: string;
  created_at: string;
}

interface LostPetDetailPanelProps {
  lostPet: LostPet | null;
  onClose: () => void;
  onStatusChanged: () => void;
}

const VELOCITY_THRESHOLD = 0.3;

export default function LostPetDetailPanel({ lostPet, onClose, onStatusChanged }: LostPetDetailPanelProps) {
  const { user } = useAuthContext();
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [poster, setPoster] = useState<{ display_name: string | null; avatar_url: string | null } | null>(null);
  const [marking, setMarking] = useState(false);

  // ── Bottom sheet snap state ──
  const [snap, setSnap] = useState<"half" | "full">("half");
  const [dragDelta, setDragDelta] = useState(0);
  const snapRef = useRef<"half" | "full">("half");
  const dragDeltaRef = useRef(0);
  const isDragging = useRef(false);
  const touchStartY = useRef<number | null>(null);
  const velPrevY = useRef<number | null>(null);
  const velPrevT = useRef<number | null>(null);
  const velCurrY = useRef<number | null>(null);
  const velCurrT = useRef<number | null>(null);

  const setSnapState = (s: "half" | "full") => { snapRef.current = s; setSnap(s); };

  useEffect(() => {
    snapRef.current = "half"; setSnap("half");
    dragDeltaRef.current = 0; setDragDelta(0);
  }, [lostPet?.id]);

  const baseOffset = snap === "half" ? 52 : 0;
  const currentOffset = Math.max(0, baseOffset + dragDelta);

  const handleDragStart = (e: React.TouchEvent) => {
    isDragging.current = true;
    const y = e.touches[0].clientY;
    touchStartY.current = y;
    dragDeltaRef.current = 0;
    velPrevY.current = null; velPrevT.current = null;
    velCurrY.current = y; velCurrT.current = Date.now();
  };

  const handleDragMove = (e: React.TouchEvent) => {
    if (!isDragging.current || touchStartY.current === null) return;
    velPrevY.current = velCurrY.current;
    velPrevT.current = velCurrT.current;
    velCurrY.current = e.touches[0].clientY;
    velCurrT.current = Date.now();
    const dy = e.touches[0].clientY - touchStartY.current;
    const deltaPercent = (dy / window.innerHeight) * 100;
    dragDeltaRef.current = deltaPercent;
    setDragDelta(deltaPercent);
  };

  const handleDragEnd = () => {
    if (!isDragging.current) return;
    isDragging.current = false;

    const vel =
      velPrevY.current !== null && velCurrY.current !== null &&
      velPrevT.current !== null && velCurrT.current !== null &&
      velCurrT.current > velPrevT.current
        ? (velCurrY.current - velPrevY.current) / (velCurrT.current - velPrevT.current)
        : 0;

    const currentSnap = snapRef.current;
    const base = currentSnap === "half" ? 52 : 0;
    const finalOffset = base + dragDeltaRef.current;
    dragDeltaRef.current = 0;
    setDragDelta(0);
    touchStartY.current = null;

    if (vel > VELOCITY_THRESHOLD) {
      if (currentSnap === "full") setSnapState("half");
      else onClose();
    } else if (vel < -VELOCITY_THRESHOLD) {
      setSnapState("full");
    } else {
      if (finalOffset > 70) onClose();
      else if (finalOffset > 26) setSnapState("half");
      else setSnapState("full");
    }
  };

  useEffect(() => {
    if (!lostPet) { setPhotos([]); setPoster(null); return; }
    setPhotoIndex(0);
    supabase.from("lost_pet_photos" as any).select("url").eq("lost_pet_id", lostPet.id).then(({ data }) => {
      if (data) setPhotos((data as any[]).map(p => p.url));
    });
    supabase.from("profiles").select("display_name, avatar_url").eq("id", lostPet.user_id).maybeSingle().then(({ data }) => {
      if (data) setPoster(data as any);
    });
  }, [lostPet?.id]);

  const handleMarkFound = async () => {
    if (!lostPet || user?.id !== lostPet.user_id) return;
    setMarking(true);
    const { error } = await supabase.from("lost_pets" as any).update({ status: "found" }).eq("id", lostPet.id).eq("user_id", user!.id);
    if (error) { toast.error("Erreur lors de la mise à jour"); setMarking(false); return; }
    toast.success("🎉 Super nouvelle ! Annonce marquée comme retrouvé !");
    onStatusChanged();
    onClose();
    setMarking(false);
  };

  const handleDelete = async () => {
    if (!lostPet || user?.id !== lostPet.user_id) return;
    if (!window.confirm("Supprimer cette annonce définitivement ?")) return;
    for (const url of photos) {
      const path = url.split("/stray-photos/")[1];
      if (path) await supabase.storage.from("stray-photos").remove([path]);
    }
    const { error } = await supabase.from("lost_pets" as any).delete().eq("id", lostPet.id).eq("user_id", user!.id);
    if (error) { toast.error("Erreur lors de la suppression"); return; }
    toast.success("Annonce supprimée");
    onStatusChanged();
    onClose();
  };

  if (!lostPet) return null;

  const isOwner = user?.id === lostPet.user_id;
  const isFound = lostPet.status === "found";
  const mapsUrl = lostPet.last_seen_lat && lostPet.last_seen_lng
    ? `https://maps.google.com/maps?q=${lostPet.last_seen_lat},${lostPet.last_seen_lng}`
    : null;

  return (
    <>
      {/* FAB close */}
      <button
        onClick={onClose}
        className="fixed bottom-8 right-4 z-[651] p-3 bg-card/90 backdrop-blur-sm rounded-full shadow-lg border border-border hover:bg-muted transition-colors"
      >
        <X className="w-5 h-5 text-foreground" />
      </button>

      <div
        className="fixed bottom-0 left-0 right-0 z-[650] bg-card rounded-t-2xl shadow-2xl flex flex-col"
        style={{
          height: "calc(100vh - 56px)",
          transform: `translateY(${currentOffset}%)`,
          transition: isDragging.current ? "none" : "transform 0.3s cubic-bezier(0.4,0,0.2,1)",
          willChange: "transform",
        }}
        onTouchStart={handleDragStart}
        onTouchMove={handleDragMove}
        onTouchEnd={handleDragEnd}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <div className="px-5 pt-3 pb-4 border-b border-border shrink-0">
          <span className={`inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full ${
            isFound
              ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
              : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
          }`}>
            {isFound ? "✅ RETROUVÉ" : "🆘 PERDU"}
          </span>
          <h2 className="font-bold text-2xl text-foreground mt-2 truncate">{lostPet.pet_name}</h2>
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {lostPet.breed && <span className="text-xs bg-muted text-foreground px-2.5 py-0.5 rounded-full">🐾 {lostPet.breed}</span>}
            {lostPet.color && <span className="text-xs bg-muted text-foreground px-2.5 py-0.5 rounded-full">🎨 {lostPet.color}</span>}
            {lostPet.age_description && <span className="text-xs bg-muted text-foreground px-2.5 py-0.5 rounded-full">🎂 {lostPet.age_description}</span>}
          </div>
        </div>

        <ScrollArea className="flex-1 min-h-0">
          {/* Photo gallery */}
          {photos.length > 0 && (
            <div className="relative w-full h-52 bg-muted shrink-0">
              <img src={photos[photoIndex]} alt={lostPet.pet_name} className="w-full h-full object-cover" />
              {photos.length > 1 && (
                <>
                  <button
                    onClick={() => setPhotoIndex(i => (i - 1 + photos.length) % photos.length)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPhotoIndex(i => (i + 1) % photos.length)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                    {photos.map((_, i) => (
                      <button key={i} onClick={() => setPhotoIndex(i)}
                        className={`w-1.5 h-1.5 rounded-full transition-colors ${i === photoIndex ? "bg-white" : "bg-white/40"}`} />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          <div className="p-5 space-y-4 pb-24">
            {/* Poster */}
            {poster && (
              <button
                onClick={() => window.dispatchEvent(new CustomEvent("open-user-profile", { detail: { userId: lostPet.user_id } }))}
                className="flex items-center gap-3 w-full text-left p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0 border border-border">
                  {poster.avatar_url
                    ? <img src={poster.avatar_url} className="w-full h-full object-cover" alt="" />
                    : <User className="w-5 h-5 text-muted-foreground" />
                  }
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Publié par</p>
                  <p className="text-sm font-semibold text-foreground">{poster.display_name || "Utilisateur"}</p>
                </div>
              </button>
            )}

            {/* Last seen */}
            {(lostPet.last_seen_address || lostPet.last_seen_date) && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Dernière localisation</p>
                {lostPet.last_seen_date && (
                  <div className="flex items-center gap-2 text-sm text-foreground">
                    <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span>{new Date(lostPet.last_seen_date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span>
                  </div>
                )}
                {lostPet.last_seen_address && (
                  <div className="flex items-start gap-2 text-sm text-foreground">
                    <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="leading-relaxed">{lostPet.last_seen_address}</p>
                      {mapsUrl && (
                        <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline mt-0.5 inline-block">
                          → Voir sur Google Maps
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Description */}
            {lostPet.description && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Description</p>
                <p className="text-sm text-foreground leading-relaxed">{lostPet.description}</p>
              </div>
            )}

            {/* Contact */}
            {(lostPet.contact_phone || lostPet.contact_email) && (
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 space-y-2.5">
                <p className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide">Contact</p>
                {lostPet.contact_phone && (
                  getSafePhone(lostPet.contact_phone)
                    ? <a href={`tel:${getSafePhone(lostPet.contact_phone)}`} className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors">
                        <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span>{lostPet.contact_phone}</span>
                      </a>
                    : <div className="flex items-center gap-2 text-sm text-foreground">
                        <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span>{lostPet.contact_phone}</span>
                      </div>
                )}
                {lostPet.contact_email && (
                  <a href={`mailto:${lostPet.contact_email}`} className="flex items-center gap-2 text-sm text-foreground hover:text-primary transition-colors">
                    <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span>{lostPet.contact_email}</span>
                  </a>
                )}
              </div>
            )}

            {/* Owner actions */}
            {isOwner && (
              <div className="space-y-2 pt-1">
                {!isFound && (
                  <Button
                    onClick={handleMarkFound}
                    disabled={marking}
                    className="w-full bg-green-600 hover:bg-green-700 text-white gap-2"
                  >
                    🎉 Mon animal a été retrouvé !
                  </Button>
                )}
                <Button
                  onClick={handleDelete}
                  variant="outline"
                  className="w-full text-destructive border-destructive hover:bg-destructive/10 gap-2"
                >
                  🗑️ Supprimer l'annonce
                </Button>
              </div>
            )}

            <p className="text-[10px] text-muted-foreground text-center">
              Publié le {new Date(lostPet.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
        </ScrollArea>
      </div>
    </>
  );
}
