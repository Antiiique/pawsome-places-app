import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft, ChevronRight, ChevronUp, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Pet {
  id: string;
  user_id: string;
  name: string;
  species: string;
  breed: string | null;
  birth_date: string | null;
  sex: string | null;
  avatar_url: string | null;
  bio: string | null;
  color: string | null;
  size_class: string | null;
  is_vaccinated: boolean | null;
  is_sterilized: boolean | null;
  is_microchipped: boolean | null;
}

interface PetPhoto {
  id: string;
  url: string;
  caption: string | null;
  created_at: string;
}

interface PhotoComment {
  id: string;
  body: string;
  created_at: string;
  user_id: string;
  profiles: { display_name: string | null; avatar_url: string | null } | null;
}

// ─── Types (visited places) ───────────────────────────────────────────────────

interface VisitedPlace {
  id: string;
  name: string;
  photo_url: string | null;
  category: string;
  review_rating: number;
  lat: number | null;
  lng: number | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function categoryLabel(cat: string): string {
  const map: Record<string, string> = {
    restaurant: "🍽️ Restaurant", hotel: "🏨 Hôtel", shop: "🛍️ Commerce",
    park: "🌳 Parc", vet: "🏥 Vétérinaire", cafe: "☕ Café", other: "📍 Autre",
    veterinaire: "🏥 Vétérinaire", outdoor: "🌿 Parc", parc_chiens: "🐕 Parc chiens",
    animalerie: "🐾 Animalerie", pension: "🏠 Pension", toiletteur: "🛁 Toiletteur",
    educateur: "🎓 Éducateur", osteopathe: "🦴 Ostéopathe", masseur: "💆 Masseur",
    pet_sitter: "🏡 Pet Sitter", dog_walker: "🦮 Dog Walker",
  };
  return map[cat] ?? `📍 ${cat}`;
}

function speciesEmoji(s: string | null): string {
  if (!s) return "🐾";
  const l = s.toLowerCase();
  if (l.includes("chien") || l.includes("dog")) return "🐕";
  if (l.includes("chat") || l.includes("cat")) return "🐈";
  if (l.includes("lapin") || l.includes("rabbit")) return "🐇";
  if (l.includes("oiseau") || l.includes("bird")) return "🦜";
  return "🐾";
}

function petAge(birthDate: string | null): string | null {
  if (!birthDate) return null;
  const months = Math.floor((Date.now() - new Date(birthDate).getTime()) / (1000 * 60 * 60 * 24 * 30));
  if (months < 1) return "< 1 mois";
  if (months < 12) return `${months} mois`;
  const y = Math.floor(months / 12);
  return `${y} an${y > 1 ? "s" : ""}`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins}min`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `il y a ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `il y a ${d}j`;
  return new Date(dateStr).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

// ─── Photo lightbox ───────────────────────────────────────────────────────────

function PhotoLightbox({
  photos,
  initialIndex,
  onClose,
}: {
  photos: PetPhoto[];
  initialIndex: number;
  onClose: () => void;
}) {
  const { user } = useAuthContext();
  const [index, setIndex] = useState(initialIndex);
  const [zoomed, setZoomed] = useState(false);
  const [comments, setComments] = useState<PhotoComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const swipeStartX = useRef<number | null>(null);

  const photo = photos[index];

  useEffect(() => {
    let cancelled = false;
    setLoadingComments(true);
    setComments([]);
    supabase
      .from("pet_photo_comments" as any)
      .select("id, body, created_at, user_id, profiles(display_name, avatar_url)")
      .eq("photo_id", photo.id)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (!cancelled && data) setComments(data as unknown as PhotoComment[]);
        if (!cancelled) setLoadingComments(false);
      });
    return () => { cancelled = true; };
  }, [photo.id]);

  const goTo = (newIndex: number) => {
    if (newIndex < 0 || newIndex >= photos.length) return;
    setIndex(newIndex);
    setBody("");
    setZoomed(false);
  };

  const send = async () => {
    if (!user || !body.trim()) return;
    setSending(true);
    const { data, error } = await supabase
      .from("pet_photo_comments" as any)
      .insert({ photo_id: photo.id, user_id: user.id, body: body.trim() })
      .select("id, body, created_at, user_id, profiles(display_name, avatar_url)")
      .single();
    if (error) { toast.error("Impossible d'envoyer le commentaire"); }
    else if (data) {
      setComments(prev => [...prev, data as unknown as PhotoComment]);
      setBody("");
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
    setSending(false);
  };

  // ── Zoom plein écran ──
  if (zoomed) return createPortal(
    <div
      className="fixed inset-0 z-[900] bg-black flex items-center justify-center"
      onClick={() => setZoomed(false)}
    >
      <button
        className="absolute top-4 left-4 w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors z-10"
        onClick={() => setZoomed(false)}
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <img
        src={photo.url}
        alt={photo.caption ?? ""}
        className="max-w-full max-h-full object-contain"
        onClick={e => e.stopPropagation()}
      />
    </div>,
    document.body
  );

  return createPortal(
    <div
      className="fixed inset-0 z-[800] bg-black/90 flex flex-col"
      onClick={onClose}
    >
      {/* Header — ← retour à gauche, compteur au centre, X à droite */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3" onClick={e => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-white/70 text-sm">{index + 1} / {photos.length}</span>
        <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Photo + nav */}
      <div
        className="relative flex items-center justify-center shrink-0"
        style={{ maxHeight: "50vh" }}
        onClick={e => e.stopPropagation()}
        onTouchStart={e => { swipeStartX.current = e.touches[0].clientX; }}
        onTouchEnd={e => {
          if (swipeStartX.current === null) return;
          const dx = e.changedTouches[0].clientX - swipeStartX.current;
          if (dx < -50) goTo(index + 1);
          else if (dx > 50) goTo(index - 1);
          swipeStartX.current = null;
        }}
      >
        <img
          key={photo.id}
          src={photo.url}
          alt={photo.caption ?? ""}
          className="max-w-full object-contain cursor-zoom-in"
          style={{ maxHeight: "50vh" }}
          onClick={() => setZoomed(true)}
        />
        {index > 0 && (
          <button
            onClick={() => goTo(index - 1)}
            className="absolute left-2 w-8 h-8 rounded-full bg-black/40 flex items-center justify-center text-white hover:bg-black/60 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        {index < photos.length - 1 && (
          <button
            onClick={() => goTo(index + 1)}
            className="absolute right-2 w-8 h-8 rounded-full bg-black/40 flex items-center justify-center text-white hover:bg-black/60 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Dots */}
      {photos.length > 1 && (
        <div className="flex justify-center gap-1.5 py-2 shrink-0" onClick={e => e.stopPropagation()}>
          {photos.map((_, i) => (
            <button key={i} onClick={() => goTo(i)} className={`w-1.5 h-1.5 rounded-full transition-colors ${i === index ? "bg-white" : "bg-white/30"}`} />
          ))}
        </div>
      )}

      {/* Caption */}
      {photo.caption && (
        <p className="text-center text-xs text-white/60 italic px-6 pb-2 shrink-0" onClick={e => e.stopPropagation()}>{photo.caption}</p>
      )}

      {/* Comments */}
      <div
        className="flex-1 overflow-y-auto bg-card rounded-t-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-4 pt-3 pb-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Commentaires</p>
        </div>
        <div className="px-4 py-2 space-y-3">
          {loadingComments ? (
            <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>
          ) : comments.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Aucun commentaire — soyez le premier !</p>
          ) : (
            comments.map(c => (
              <div key={c.id} className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
                  {c.profiles?.avatar_url
                    ? <img src={c.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                    : <span className="text-xs font-bold text-muted-foreground">{(c.profiles?.display_name?.[0] ?? "?").toUpperCase()}</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-semibold text-foreground truncate">{c.profiles?.display_name ?? "Anonyme"}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(c.created_at)}</span>
                  </div>
                  <p className="text-xs text-foreground mt-0.5 leading-relaxed">{c.body}</p>
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        {user ? (
          <div className="sticky bottom-0 border-t border-border px-4 py-3 flex items-center gap-2 bg-card">
            <input
              value={body}
              onChange={e => setBody(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Ajouter un commentaire…"
              maxLength={500}
              className="flex-1 text-sm bg-muted rounded-full px-3 py-1.5 outline-none placeholder:text-muted-foreground"
            />
            <button
              onClick={send}
              disabled={!body.trim() || sending}
              className="w-8 h-8 rounded-full bg-primary flex items-center justify-center disabled:opacity-40 transition-opacity"
            >
              {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin text-primary-foreground" /> : <Send className="w-3.5 h-3.5 text-primary-foreground" />}
            </button>
          </div>
        ) : (
          <div className="border-t border-border px-4 py-3 text-xs text-muted-foreground text-center bg-card">
            Connecte-toi pour commenter
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface PetProfilePanelProps {
  petId: string | null;
  onClose: () => void;
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export default function PetProfilePanel({ petId, onClose }: PetProfilePanelProps) {
  const [visible, setVisible] = useState(false);
  const [snapState, setSnapState] = useState<"half" | "full">("half");
  const [pet, setPet] = useState<Pet | null>(null);
  const [photos, setPhotos] = useState<PetPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [visitedPlaces, setVisitedPlaces] = useState<VisitedPlace[]>([]);

  // ── Drag state (same pattern as StrayReportModal) ──
  const [dragging, setDragging] = useState(false);
  const [dragDelta, setDragDelta] = useState(0);
  const isDragging    = useRef(false);
  const dragStartY    = useRef(0);
  const lastTouchY    = useRef(0);
  const lastTouchTime = useRef(0);
  const lastVelocity  = useRef(0);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  useEffect(() => {
    window.dispatchEvent(new Event("map-freeze"));
    return () => { window.dispatchEvent(new Event("map-unfreeze")); };
  }, []);

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
    setDragDelta(y - dragStartY.current);
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

  // ── Load pet data when petId changes ──
  useEffect(() => {
    if (!petId) return;
    setVisible(true);
    setSnapState("half");
    setLightboxIndex(null);
    setVisitedPlaces([]);
    let cancelled = false;
    async function load() {
      setLoading(true);
      const [petRes, photosRes] = await Promise.all([
        supabase
          .from("pets" as any)
          .select("id, user_id, name, species, breed, birth_date, sex, avatar_url, bio, color, size_class, is_vaccinated, is_sterilized, is_microchipped")
          .eq("id", petId)
          .single(),
        supabase
          .from("pet_photos" as any)
          .select("id, url, caption, created_at")
          .eq("pet_id", petId)
          .order("created_at", { ascending: false }),
      ]);
      if (!cancelled) {
        setPet((petRes.data ?? null) as unknown as Pet | null);
        setPhotos((photosRes.data ?? []) as unknown as PetPhoto[]);
      }

      // Load visited places via review_pets → place_reviews → pet_friendly_places
      const { data: reviewPetsData } = await (supabase as any)
        .from("review_pets")
        .select("review_id")
        .eq("pet_id", petId);

      if (!cancelled && reviewPetsData && reviewPetsData.length > 0) {
        const reviewIds = reviewPetsData.map((r: any) => r.review_id);
        const { data: reviewsData } = await supabase
          .from("place_reviews")
          .select("id, place_id, rating")
          .in("id", reviewIds);

        if (reviewsData && reviewsData.length > 0) {
          const placeIds = (reviewsData as any[]).map(r => r.place_id);
          const ratingMap: Record<string, number> = {};
          for (const r of (reviewsData as any[])) ratingMap[r.place_id] = r.rating;

          const { data: placesData } = await supabase
            .from("pet_friendly_places")
            .select("id, name, photo_url, category, latitude, longitude")
            .in("id", placeIds);

          if (!cancelled) {
            const seen = new Set<string>();
            const result: VisitedPlace[] = [];
            for (const p of (placesData as any[]) || []) {
              if (!seen.has(p.id)) {
                seen.add(p.id);
                result.push({ id: p.id, name: p.name, photo_url: p.photo_url, category: p.category, review_rating: ratingMap[p.id] ?? 0, lat: p.latitude ?? null, lng: p.longitude ?? null });
              }
            }
            setVisitedPlaces(result);
          }
        }
      }

      if (!cancelled) setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [petId]);

  if (!petId && !visible) return null;

  const age = pet ? petAge(pet.birth_date) : null;

  const panelStyle = (() => {
    const snapBase = snapState === "full" ? 0 : 55;
    const headerH = 56;
    const h = window.innerHeight - headerH;
    const dragPct = dragging && h > 0 ? (dragDelta / h) * 100 : 0;
    const currentPct = Math.max(0, Math.min(100, snapBase + dragPct));
    return {
      top: 0,
      paddingTop: snapState === "full" ? "env(safe-area-inset-top)" : 0,
      transform: `translateY(${visible ? currentPct + "%" : "100%"})`,
      transition: dragging ? "none" : "transform 0.3s cubic-bezier(0.4,0,0.2,1), padding-top 0.3s cubic-bezier(0.4,0,0.2,1)",
    };
  })();

  return createPortal(
    <>
      {/* Scrim — identique StrayReportModal */}
      <div
        className="fixed inset-0 z-[700] bg-black/50"
        style={{ opacity: visible ? 1 : 0, transition: "opacity 0.3s ease" }}
        onClick={handleClose}
      />

      {/* Bottom sheet — identique StrayReportModal */}
      {lightboxIndex !== null && photos.length > 0 && (
        <PhotoLightbox
          photos={photos}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}

      <div
        className="fixed left-0 right-0 bottom-0 z-[700] bg-card rounded-t-2xl shadow-2xl flex flex-col"
        style={panelStyle}
      >
        <>
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

            {/* Header */}
            <div
              className="flex items-center justify-between px-5 pt-3 pb-3 border-b border-border shrink-0"
              onTouchStart={handleDragStart}
              onTouchMove={handleDragMove}
              onTouchEnd={handleDragEnd}
              style={{ touchAction: "none" }}
            >
              <h2 className="font-bold text-foreground text-lg">
                {pet ? pet.name : "Profil animal"}
              </h2>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => setSnapState(s => s === "half" ? "full" : "half")}
                  className="p-1.5 rounded-full hover:bg-muted transition-colors"
                >
                  <ChevronUp className={`w-5 h-5 text-muted-foreground transition-transform duration-300 ${snapState === "full" ? "rotate-180" : ""}`} />
                </button>
                <button onClick={handleClose} className="p-1.5 rounded-full hover:bg-muted transition-colors">
                  <X className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
            </div>

            {/* Scrollable content — only in full mode */}
            <div className="flex-1" style={{ overflowY: "auto", touchAction: "pan-y" }}>
              {loading ? (
                <div className="flex justify-center items-center py-16">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : !pet ? (
                <div className="p-8 text-center text-sm text-muted-foreground">Animal introuvable</div>
              ) : (
                <div>
                  {/* Hero */}
                  <div className="w-full bg-muted" style={{ height: 160 }}>
                    {pet.avatar_url
                      ? <img src={pet.avatar_url} alt={pet.name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-7xl">{speciesEmoji(pet.species)}</div>
                    }
                  </div>

                  {/* Info */}
                  <div className="px-5 py-4 space-y-3 border-b border-border">
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      {pet.breed && <span>{pet.breed}</span>}
                      {pet.color && <span>· {pet.color}</span>}
                      {age && <span>· {age}</span>}
                      {pet.size_class && (
                        <span>· {({ petit: "Petit", moyen: "Moyen", grand: "Grand", tres_grand: "Très grand" } as Record<string,string>)[pet.size_class] ?? pet.size_class}</span>
                      )}
                    </div>

                    {pet.bio && (
                      <p className="text-sm text-muted-foreground italic leading-relaxed border-l-2 border-primary/30 pl-3">"{pet.bio}"</p>
                    )}

                    {(pet.is_vaccinated || pet.is_sterilized || pet.is_microchipped) && (
                      <div className="flex gap-1.5 flex-wrap">
                        {pet.is_vaccinated   && <span className="text-[10px] bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 px-2 py-0.5 rounded-full font-medium">💉 Vacciné</span>}
                        {pet.is_sterilized   && <span className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 px-2 py-0.5 rounded-full font-medium">✂️ Stérilisé</span>}
                        {pet.is_microchipped && <span className="text-[10px] bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 px-2 py-0.5 rounded-full font-medium">📡 Pucé</span>}
                      </div>
                    )}
                  </div>

                  {/* Photo album */}
                  <div className="px-5 py-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                      Album · {photos.length} photo{photos.length !== 1 ? "s" : ""}
                    </p>

                    {photos.length === 0 ? (
                      <div className="text-center py-10 text-muted-foreground">
                        <span className="text-4xl opacity-30">📷</span>
                        <p className="text-xs mt-2">Aucune photo dans l'album</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-1">
                        {photos.map((photo, i) => (
                          <button
                            key={photo.id}
                            onClick={() => setLightboxIndex(i)}
                            className="relative aspect-square overflow-hidden rounded-lg bg-muted hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                            <img src={photo.url} alt={photo.caption ?? ""} className="w-full h-full object-cover" />
                            {photo.caption && (
                              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-1.5 py-1">
                                <p className="text-[9px] text-white line-clamp-1">{photo.caption}</p>
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Visited places */}
                  {visitedPlaces.length > 0 && (
                    <div className="px-5 py-4 border-t border-border">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                        Lieux visités · {visitedPlaces.length}
                      </p>
                      <div className="space-y-2">
                        {visitedPlaces.map(place => (
                          <button
                            key={place.id}
                            onClick={() => {
                              window.dispatchEvent(new CustomEvent("global-search-open-place", { detail: { placeId: place.id } }));
                              if (place.lat != null && place.lng != null) {
                                window.dispatchEvent(new CustomEvent("map-pan-to", { detail: { lat: place.lat, lng: place.lng } }));
                              }
                              handleClose();
                            }}
                            className="w-full text-left flex gap-3 p-3 rounded-xl border border-border bg-card hover:bg-muted/60 active:scale-[0.99] transition-all"
                          >
                            <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 bg-muted border border-border">
                              {place.photo_url
                                ? <img src={place.photo_url} alt={place.name} className="w-full h-full object-cover" />
                                : <div className="w-full h-full flex items-center justify-center text-xl">📍</div>
                              }
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-foreground text-sm truncate">{place.name}</p>
                              <p className="text-[10px] text-muted-foreground">{categoryLabel(place.category)}</p>
                              {place.review_rating > 0 && (
                                <p className="text-[10px] text-yellow-500 font-medium mt-0.5">
                                  {"★".repeat(place.review_rating)}{"☆".repeat(5 - place.review_rating)}
                                </p>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
        </>
      </div>
    </>,
    document.body
  );
}
