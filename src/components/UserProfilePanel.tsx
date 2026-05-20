import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { X, MapPin, User, Calendar, MessageCircle, Loader2, ChevronUp, Star, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────────────

interface UserProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  city: string | null;
  points: number;
  created_at: string | null;
  last_seen_at?: string | null;
  postal_code?: string | null;
}

interface Pet {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  avatar_url: string | null;
  birth_date: string | null;
  sex: string | null;
  bio: string | null;
  color: string | null;
  size_class: string | null;
  is_vaccinated: boolean | null;
  is_sterilized: boolean | null;
  is_microchipped: boolean | null;
}

interface SubmittedPlace {
  id: string;
  name: string;
  city: string | null;
  address: string | null;
  category: string;
  subcategory: string | null;
  status: string | null;
  created_at: string | null;
  reviewed_at: string | null;
  phone: string | null;
  website: string | null;
  accepts_dogs: boolean | null;
  accepts_cats: boolean | null;
  dogs_on_leash_only: boolean | null;
  outdoor_seating: boolean | null;
  water_bowl_provided: boolean | null;
  linked_place_id: string | null;
  linked_photo_url: string | null;
  linked_rating: number | null;
  linked_lat: number | null;
  linked_lng: number | null;
}

interface StrayReport {
  id: string;
  species: string | null;
  breed: string | null;
  city: string | null;
  created_at: string | null;
}

interface LostPet {
  id: string;
  pet_name: string;
  breed: string | null;
  color: string | null;
  status: string;
  last_seen_address: string | null;
  created_at: string;
}

interface Review {
  id: string;
  place_id: string;
  rating: number;
  body: string | null;
  created_at: string;
  place_name: string | null;
  place_photo: string | null;
}

// ─── Levels ──────────────────────────────────────────────────────────────────

const LEVELS = [
  { min: 0,    max: 99,       emoji: "🌱", label: "Explorateur" },
  { min: 100,  max: 299,      emoji: "🐾", label: "Aventurier" },
  { min: 300,  max: 699,      emoji: "🦮", label: "Contributeur" },
  { min: 700,  max: 1499,     emoji: "⭐", label: "Expert" },
  { min: 1500, max: Infinity, emoji: "🦁", label: "Ambassadeur" },
];

function getLevel(points: number) {
  return LEVELS.find(l => points >= l.min && points <= l.max) ?? LEVELS[0];
}

function getLevelProgress(points: number) {
  const lvl = getLevel(points);
  if (lvl.max === Infinity) return 100;
  return Math.min(100, Math.round(((points - lvl.min) / (lvl.max - lvl.min)) * 100));
}

// ─── Badges ──────────────────────────────────────────────────────────────────

function getBadges(reviewCount: number, strayCount: number, approvedSubCount: number, points: number) {
  return [
    { id: "first_review", emoji: "🐾", label: "Premier pas",  unlocked: reviewCount >= 1,       tip: "1 avis" },
    { id: "critic",       emoji: "📝", label: "Critique",     unlocked: reviewCount >= 10,      tip: "10 avis" },
    { id: "explorer",     emoji: "🗺️", label: "Explorateur",  unlocked: reviewCount >= 50,      tip: "50 avis" },
    { id: "rescuer1",     emoji: "🆘", label: "Secouriste",   unlocked: strayCount >= 1,        tip: "1 signalement" },
    { id: "watcher",      emoji: "🐕", label: "Veilleur",     unlocked: strayCount >= 5,        tip: "5 signalements" },
    { id: "rescuer10",    emoji: "🏆", label: "Sauveteur",    unlocked: strayCount >= 10,       tip: "10 signalements" },
    { id: "pioneer",      emoji: "📍", label: "Pionnier",     unlocked: approvedSubCount >= 1,  tip: "1 lieu ajouté" },
    { id: "ambassador",   emoji: "🌟", label: "Ambassadeur",  unlocked: points >= 500,          tip: "500 points" },
    { id: "legend",       emoji: "💎", label: "Légende",      unlocked: points >= 1500,         tip: "1500 points" },
  ];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function memberSince(dateStr: string): string {
  const months = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24 * 30));
  if (months < 1) return "Ce mois-ci";
  if (months < 12) return `Membre depuis ${months} mois`;
  const years = Math.floor(months / 12);
  return `Membre depuis ${years} an${years > 1 ? "s" : ""}`;
}

function lastSeenBadge(dateStr: string | null | undefined): { label: string; color: string } {
  if (!dateStr) return { label: "Absent depuis longtemps", color: "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400" };
  const diffDays = (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays < 1)  return { label: "🟢 En ligne aujourd'hui", color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" };
  if (diffDays < 7)  return { label: "🟡 Actif cette semaine",  color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300" };
  if (diffDays < 30) return { label: "🟠 Actif ce mois-ci",    color: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300" };
  if (diffDays < 90) return { label: "🔴 Peu actif",           color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" };
  return                     { label: "⚫ Absent",              color: "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400" };
}

function speciesEmoji(s: string | null): string {
  if (!s) return "🐾";
  const l = s.toLowerCase();
  if (l.includes("chien") || l.includes("dog"))    return "🐕";
  if (l.includes("chat") || l.includes("cat"))     return "🐈";
  if (l.includes("lapin") || l.includes("rabbit")) return "🐇";
  if (l.includes("oiseau") || l.includes("bird"))  return "🦜";
  return "🐾";
}

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

// ─── Props ───────────────────────────────────────────────────────────────────

interface UserProfilePanelProps {
  userId: string | null;
  onClose: () => void;
  onOpenChat: (convId: string, other: { id: string; display_name: string | null; avatar_url: string | null }) => void;
  onBack?: () => void;
  onNavigateAway?: () => void;
  initialSnap?: "half" | "full";
}

// ─── Constants ───────────────────────────────────────────────────────────────

const HALF = 55;
const SNAP_VELOCITY = 0.4;

// ─── Component ───────────────────────────────────────────────────────────────

export default function UserProfilePanel({ userId, onClose, onOpenChat, onBack, onNavigateAway, initialSnap }: UserProfilePanelProps) {
  const { user: me } = useAuthContext();

  // Mount / visibility animation
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  // Snap / drag
  const [snap, setSnap] = useState<"half" | "full">("half");
  const [dragDelta, setDragDelta] = useState(0);
  const isDragging = useRef(false);
  const dragStartY = useRef(0);
  const dragStartTime = useRef(0);

  // Avatar zoom
  const [avatarZoomed, setAvatarZoomed] = useState(false);

  // Data
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [strayCount, setStrayCount] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [approvedSubCount, setApprovedSubCount] = useState(0);
  const [lostPets, setLostPets] = useState<LostPet[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [submittedPlaces, setSubmittedPlaces] = useState<SubmittedPlace[]>([]);
  const [recentStrays, setRecentStrays] = useState<StrayReport[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [petPhotos, setPetPhotos] = useState<Record<string, Array<{ id: string; url: string }>>>({});

  // Mount / unmount effect
  useEffect(() => {
    if (userId) {
      setMounted(true);
      setSnap(initialSnap ?? "half");
      setAvatarZoomed(false);
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
      const t = setTimeout(() => setMounted(false), 350);
      return () => clearTimeout(t);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    window.dispatchEvent(new Event("map-freeze"));
    return () => { window.dispatchEvent(new Event("map-unfreeze")); };
  }, [userId]);

  // Data loading
  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setReviews([]);
      setPets([]);
      setPetPhotos({});
      setSubmittedPlaces([]);
      setRecentStrays([]);
      setLostPets([]);
      return;
    }
    setLoading(true);

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    Promise.all([
      (supabase as any).from("profiles").select("id, display_name, avatar_url, bio, city, points, created_at, last_seen_at, postal_code").eq("id", userId).maybeSingle(),
      supabase.from("stray_reports").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("place_reviews").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("place_submissions").select("id", { count: "exact", head: true }).eq("submitted_by", userId).eq("status", "approved"),
      supabase.from("pets").select("id, name, species, breed, avatar_url, birth_date, sex, bio, color, size_class, is_vaccinated, is_sterilized, is_microchipped").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("place_submissions").select("id, name, city, address, category, subcategory, status, created_at, reviewed_at, phone, website, accepts_dogs, accepts_cats, dogs_on_leash_only, outdoor_seating, water_bowl_provided").eq("submitted_by", userId).eq("status", "approved").order("reviewed_at", { ascending: false }).limit(10),
      supabase.from("stray_reports").select("id, species, breed, city, created_at").eq("user_id", userId).gte("created_at", sevenDaysAgo).order("created_at", { ascending: false }),
      (supabase as any).from("lost_pets").select("id, pet_name, breed, color, status, last_seen_address, created_at").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("place_reviews").select("id, place_id, rating, body, created_at").eq("user_id", userId).eq("is_hidden", false).order("created_at", { ascending: false }).limit(5),
    ]).then(async ([
      { data: prof },
      { count: strays },
      { count: revCount },
      { count: approvedSubs },
      { data: petsData },
      { data: subsData },
      { data: straysData },
      { data: lostPetsData },
      { data: reviewsRaw },
    ]) => {
      setProfile(prof as UserProfile);
      setStrayCount(strays || 0);
      setReviewCount(revCount || 0);
      setApprovedSubCount(approvedSubs || 0);
      const petsArr = (petsData as Pet[]) || [];
      setPets(petsArr);
      setRecentStrays((straysData as StrayReport[]) || []);
      setLostPets((lostPetsData as LostPet[]) || []);

      // Load pet photos
      if (petsArr.length > 0) {
        const petIds = petsArr.map(p => p.id);
        const { data: photosRaw } = await (supabase as any)
          .from("pet_photos")
          .select("id, url, pet_id")
          .in("pet_id", petIds)
          .order("created_at", { ascending: false });
        const byPet: Record<string, Array<{ id: string; url: string }>> = {};
        for (const photo of (photosRaw as any[]) || []) {
          if (!byPet[photo.pet_id]) byPet[photo.pet_id] = [];
          byPet[photo.pet_id].push({ id: photo.id, url: photo.url });
        }
        setPetPhotos(byPet);
      }

      // Enrich approved submissions with photo + rating from pet_friendly_places
      const rawSubs = (subsData as any[]) || [];
      const approvedIds = rawSubs.map(s => s.id);
      let linkedMap: Record<string, { id: string; photo_url: string | null; rating: number | null; latitude: number | null; longitude: number | null }> = {};
      if (approvedIds.length > 0) {
        const { data: linked } = await supabase
          .from("pet_friendly_places")
          .select("id, photo_url, rating, source_id, latitude, longitude")
          .eq("source", "user_submission")
          .in("source_id", approvedIds);
        for (const p of (linked as any[]) || []) linkedMap[p.source_id] = { id: p.id, photo_url: p.photo_url, rating: p.rating, latitude: p.latitude, longitude: p.longitude };
      }
      setSubmittedPlaces(rawSubs.map(s => ({
        ...s,
        linked_place_id:  linkedMap[s.id]?.id ?? null,
        linked_photo_url: linkedMap[s.id]?.photo_url ?? null,
        linked_rating:    linkedMap[s.id]?.rating ?? null,
        linked_lat:       linkedMap[s.id]?.latitude ?? null,
        linked_lng:       linkedMap[s.id]?.longitude ?? null,
      })));

      // Enrich reviews with place name + photo
      const rawReviews = (reviewsRaw as any[]) || [];
      if (rawReviews.length > 0) {
        const placeIds = rawReviews.map(r => r.place_id);
        const { data: places } = await supabase.from("pet_friendly_places").select("id, name, photo_url").in("id", placeIds);
        const placeMap: Record<string, { name: string; photo_url: string | null }> = {};
        for (const p of (places as any[]) || []) placeMap[p.id] = p;
        setReviews(rawReviews.map(r => ({
          ...r,
          place_name:  placeMap[r.place_id]?.name ?? null,
          place_photo: placeMap[r.place_id]?.photo_url ?? null,
        })));
      } else {
        setReviews([]);
      }

      setLoading(false);
    });
  }, [userId]);

  // Drag handlers (same pattern as MessagesPanel)
  const handleDragStart = (e: React.TouchEvent) => {
    isDragging.current = true;
    dragStartY.current = e.touches[0].clientY;
    dragStartTime.current = Date.now();
    setDragDelta(0);
  };
  const handleDragMove = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    setDragDelta(e.touches[0].clientY - dragStartY.current);
  };
  const handleDragEnd = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    const delta = e.changedTouches[0].clientY - dragStartY.current;
    const elapsed = Date.now() - dragStartTime.current;
    const velocity = delta / elapsed;
    if (snap === "full") {
      if (delta > 80 || velocity > SNAP_VELOCITY) setSnap("half");
    } else {
      if (delta < -80 || velocity < -SNAP_VELOCITY) setSnap("full");
      else if (delta > 80 || velocity > SNAP_VELOCITY) { setDragDelta(0); onClose(); return; }
    }
    setDragDelta(0);
  };

  const currentOffset = (() => {
    const base = snap === "full" ? 0 : HALF;
    const delta = dragDelta / (window.innerHeight * (1 - 56 / window.innerHeight));
    return Math.max(0, Math.min(100, base + delta * 100));
  })();

  const handleMessage = async () => {
    if (!me) { toast.error("Connectez-vous pour envoyer un message"); window.dispatchEvent(new CustomEvent("open-auth-modal")); return; }
    if (!userId || !profile) return;
    setStarting(true);
    try {
      const [u1, u2] = [me.id, userId].sort();
      await supabase.from("conversations").insert({ user1_id: u1, user2_id: u2 });
      const { data: conv } = await supabase
        .from("conversations")
        .select("id")
        .or(`and(user1_id.eq.${u1},user2_id.eq.${u2}),and(user1_id.eq.${u2},user2_id.eq.${u1})`)
        .maybeSingle();
      if (!conv) throw new Error("Impossible de créer la conversation");
      onOpenChat((conv as any).id, { id: profile.id, display_name: profile.display_name, avatar_url: profile.avatar_url });
      onClose();
    } catch (err: any) {
      toast.error("Erreur : " + err.message);
    } finally {
      setStarting(false);
    }
  };

  if (!mounted) return null;

  const points = profile?.points ?? 0;
  const level = getLevel(points);
  const progress = getLevelProgress(points);
  const nextLevel = LEVELS[LEVELS.indexOf(level) + 1];
  const badges = getBadges(reviewCount, strayCount, approvedSubCount, points);
  const seenBadge = lastSeenBadge(profile?.last_seen_at);
  const activeLostPets = lostPets.filter(p => p.status === "active");

  return createPortal(
    <>
      {/* Scrim */}
      <div
        className="fixed inset-x-0 bottom-0 z-[699]"
        style={{
          top: 0,
          background: "rgba(0,0,0,0.45)",
          opacity: visible ? 1 : 0,
          transition: "opacity 0.3s ease",
          pointerEvents: visible ? "auto" : "none",
          touchAction: "none",
        }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="fixed left-0 right-0 bottom-0 z-[700] bg-card rounded-t-2xl shadow-2xl flex flex-col"
        style={{
          top: 0,
          paddingTop: snap === "full" ? "env(safe-area-inset-top)" : 0,
          transform: `translateY(${visible ? currentOffset : 100}%)`,
          transition: isDragging.current ? "none" : "transform 0.3s cubic-bezier(0.4,0,0.2,1), padding-top 0.3s cubic-bezier(0.4,0,0.2,1)",
          willChange: "transform",
        }}
      >
        {/* Drag handle + header */}
        <div
          className="flex flex-col items-center pt-2.5 pb-1 shrink-0 cursor-grab active:cursor-grabbing select-none"
          style={{ touchAction: "none" }}
          onTouchStart={handleDragStart}
          onTouchMove={handleDragMove}
          onTouchEnd={handleDragEnd}
        >
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30 mb-2" />
          <div className="w-full flex items-center justify-between px-4 pb-2">
            <div className="flex items-center gap-1">
              {onBack && (
                <button onClick={onBack} className="p-1.5 rounded-full hover:bg-muted transition-colors mr-1">
                  <ArrowLeft className="w-5 h-5 text-muted-foreground" />
                </button>
              )}
              <span className="font-bold text-foreground text-sm">Profil</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setSnap(s => s === "half" ? "full" : "half")}
                className="p-1.5 rounded-full hover:bg-muted transition-colors"
              >
                <ChevronUp className={`w-5 h-5 text-muted-foreground transition-transform duration-300 ${snap === "full" ? "rotate-180" : ""}`} />
              </button>
              <button onClick={onClose} className="p-1.5 rounded-full hover:bg-muted transition-colors">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
          </div>
        </div>

        <div className="w-full h-px bg-border shrink-0" />

        {/* Scrollable content */}
        <div
          className="flex-1 min-h-0 overflow-y-auto"
          style={{ overflowY: "auto", touchAction: "pan-y" }}
        >
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : !profile ? (
            <p className="text-center text-muted-foreground text-sm py-16">Profil introuvable</p>
          ) : (
            <div className="p-5 space-y-6 pb-8">

              {/* ── Profile header ── */}
              <div className="flex items-center gap-4">
                <button
                  onClick={() => profile.avatar_url && setAvatarZoomed(true)}
                  className={`w-16 h-16 rounded-full bg-muted shrink-0 overflow-hidden border-2 border-border flex items-center justify-center ${profile.avatar_url ? "cursor-pointer active:scale-95 transition-transform" : "cursor-default"}`}
                >
                  {profile.avatar_url
                    ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                    : <User className="w-8 h-8 text-muted-foreground" />
                  }
                </button>
                <div className="min-w-0 flex-1">
                  <h2 className="font-bold text-foreground text-xl truncate">{profile.display_name || "Utilisateur"}</h2>
                  {(profile.city || profile.postal_code) && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="truncate">{[profile.postal_code, profile.city].filter(Boolean).join(" ")}</span>
                    </div>
                  )}
                  {profile.created_at && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                      <Calendar className="w-3 h-3 shrink-0" />
                      <span>{memberSince(profile.created_at)}</span>
                    </div>
                  )}
                  <span className={`inline-block mt-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full ${seenBadge.color}`}>
                    {seenBadge.label}
                  </span>
                </div>
              </div>

              {/* ── Level + progress bar ── */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{level.emoji}</span>
                    <div>
                      <p className="font-semibold text-foreground text-sm">{level.label}</p>
                      {nextLevel && (
                        <p className="text-[10px] text-muted-foreground">
                          {nextLevel.min - points} pts pour {nextLevel.emoji} {nextLevel.label}
                        </p>
                      )}
                    </div>
                  </div>
                  <p className="text-xs font-bold text-foreground">{points} pts</p>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-700"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* ── Stats ── */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { value: points,           label: "Points" },
                  { value: reviewCount,      label: "Avis" },
                  { value: approvedSubCount, label: "Lieux" },
                  { value: strayCount,       label: "Signalements" },
                ].map(({ value, label }) => (
                  <div key={label} className="bg-muted rounded-xl p-2 text-center">
                    <p className="text-lg font-bold text-foreground">{value}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{label}</p>
                  </div>
                ))}
              </div>

              {/* ── Bio ── */}
              {profile.bio && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">À propos</p>
                  <p className="text-sm text-foreground leading-relaxed italic border-l-2 border-primary/30 pl-3">{profile.bio}</p>
                </div>
              )}

              {/* ── Badges ── */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Badges</p>
                <div className="grid grid-cols-3 gap-2">
                  {badges.map(b => (
                    <div
                      key={b.id}
                      className={`rounded-xl p-2.5 text-center ${b.unlocked ? "bg-muted opacity-100" : "bg-muted/40 opacity-40"}`}
                    >
                      <p className="text-xl">{b.emoji}</p>
                      <p className="text-[10px] font-medium text-foreground mt-0.5 leading-tight">{b.label}</p>
                      {!b.unlocked && <p className="text-[9px] text-muted-foreground">{b.tip}</p>}
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Pets ── */}
              {pets.length > 0 && (
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Animaux de compagnie · {pets.length}
                  </p>
                  <div className="space-y-3">
                    {pets.map(pet => {
                      const age = (() => {
                        if (!pet.birth_date) return null;
                        const months = Math.floor((Date.now() - new Date(pet.birth_date).getTime()) / (1000 * 60 * 60 * 24 * 30));
                        if (months < 1) return "< 1 mois";
                        if (months < 12) return `${months} mois`;
                        const y = Math.floor(months / 12);
                        return `${y} an${y > 1 ? "s" : ""}`;
                      })();
                      const photos = petPhotos[pet.id] ?? [];
                      return (
                        <div
                          key={pet.id}
                          className="rounded-2xl border border-border overflow-hidden bg-card cursor-pointer hover:border-primary/40 active:scale-[0.99] transition-all"
                          onClick={() => { window.dispatchEvent(new CustomEvent("open-pet-profile", { detail: { petId: pet.id } })); onClose(); }}
                        >
                          {/* Hero photo */}
                          <div className="relative w-full h-32 bg-muted">
                            {pet.avatar_url
                              ? <img src={pet.avatar_url} alt={pet.name} className="w-full h-full object-cover" />
                              : <div className="w-full h-full flex items-center justify-center text-5xl">{speciesEmoji(pet.species)}</div>
                            }
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                            {/* Species badge top-left */}
                            <span className="absolute top-2 left-2 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-black/40 text-white backdrop-blur-sm">
                              {speciesEmoji(pet.species)} {pet.species}
                            </span>
                            {/* Album count badge top-right */}
                            {photos.length > 0 && (
                              <span className="absolute top-2 right-2 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-black/40 text-white backdrop-blur-sm">
                                📷 {photos.length}
                              </span>
                            )}
                            {/* Name + sex overlay bottom */}
                            <div className="absolute bottom-2 left-3 right-3 flex items-end justify-between gap-2">
                              <p className="font-bold text-white text-base leading-tight drop-shadow">{pet.name}</p>
                              <div className="flex gap-1 shrink-0">
                                {pet.sex === "M" && <span className="text-[10px] bg-blue-500/80 text-white px-1.5 py-0.5 rounded-full font-medium backdrop-blur-sm">♂ Mâle</span>}
                                {pet.sex === "F" && <span className="text-[10px] bg-pink-500/80 text-white px-1.5 py-0.5 rounded-full font-medium backdrop-blur-sm">♀ Femelle</span>}
                              </div>
                            </div>
                          </div>

                          {/* Info */}
                          <div className="px-3 pt-2.5 pb-2 space-y-1.5">
                            {(pet.breed || pet.color || age || pet.size_class) && (
                              <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                                {pet.breed && <span>{pet.breed}</span>}
                                {pet.color && <span className="before:content-['·'] before:mr-1">{pet.color}</span>}
                                {age && <span className="before:content-['·'] before:mr-1">{age}</span>}
                                {pet.size_class && <span className="before:content-['·'] before:mr-1">{({ petit: "Petit", moyen: "Moyen", grand: "Grand", tres_grand: "Très grand" } as Record<string, string>)[pet.size_class] ?? pet.size_class}</span>}
                              </div>
                            )}
                            {(pet.is_vaccinated || pet.is_sterilized || pet.is_microchipped) && (
                              <div className="flex gap-1.5 flex-wrap">
                                {pet.is_vaccinated   && <span className="text-[9px] bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 px-1.5 py-0.5 rounded-full font-medium">💉 Vacciné</span>}
                                {pet.is_sterilized   && <span className="text-[9px] bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 px-1.5 py-0.5 rounded-full font-medium">✂️ Stérilisé</span>}
                                {pet.is_microchipped && <span className="text-[9px] bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 px-1.5 py-0.5 rounded-full font-medium">📡 Pucé</span>}
                              </div>
                            )}
                            {pet.bio && (
                              <p className="text-xs text-muted-foreground italic line-clamp-2">"{pet.bio}"</p>
                            )}
                          </div>

                          {/* Album strip */}
                          {photos.length > 0 && (
                            <div className="px-3 pb-3">
                              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Album</p>
                              <div className="flex gap-1.5" style={{ overflowX: "auto", scrollbarWidth: "none" }}>
                                {photos.slice(0, 7).map(photo => (
                                  <img
                                    key={photo.id}
                                    src={photo.url}
                                    alt=""
                                    className="w-14 h-14 shrink-0 rounded-lg object-cover border border-border"
                                  />
                                ))}
                                {photos.length > 7 && (
                                  <div className="w-14 h-14 shrink-0 rounded-lg bg-muted border border-border flex flex-col items-center justify-center gap-0.5">
                                    <span className="text-sm font-bold text-muted-foreground">+{photos.length - 7}</span>
                                    <span className="text-[9px] text-muted-foreground">photos</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Footer CTA */}
                          <div className="px-3 pb-2.5 flex items-center justify-end">
                            <span className="text-[10px] font-semibold text-primary">Voir le profil →</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Reviews / Comments ── */}
              {reviews.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Avis récents ({reviewCount})</p>
                  <div className="space-y-2">
                    {reviews.map(r => (
                      <button
                        key={r.id}
                        onClick={() => { window.dispatchEvent(new CustomEvent("global-search-open-place", { detail: { placeId: r.place_id } })); (onNavigateAway ?? onClose)(); }}
                        className="w-full text-left rounded-xl border border-border bg-card hover:bg-muted/60 active:scale-[0.99] transition-all overflow-hidden"
                      >
                        <div className="flex gap-3 p-3">
                          {r.place_photo ? (
                            <img src={r.place_photo} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0 border border-border" />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-muted shrink-0 border border-border flex items-center justify-center text-xl">📍</div>
                          )}
                          <div className="flex-1 min-w-0">
                            {r.place_name && <p className="font-medium text-foreground text-sm truncate">{r.place_name}</p>}
                            <div className="flex items-center gap-0.5 mt-0.5">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star key={i} className={`w-3 h-3 ${i < r.rating ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"}`} />
                              ))}
                              <span className="text-[10px] text-muted-foreground ml-1.5">
                                {new Date(r.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                              </span>
                            </div>
                            {r.body && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{r.body}</p>}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Submitted places ── */}
              {submittedPlaces.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Lieux ajoutés ({approvedSubCount})</p>
                  <div className="space-y-2.5">
                    {submittedPlaces.map(place => {
                      const isApproved = place.status === "approved";
                      const isPending  = place.status === "pending";
                      const statusBadge = isApproved
                        ? { label: "✅ Approuvé",   cls: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" }
                        : isPending
                        ? { label: "⏳ En attente", cls: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300" }
                        : { label: "❌ Refusé",      cls: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" };
                      const isClickable = isApproved && !!place.linked_place_id;

                      return (
                        <div
                          key={place.id}
                          onClick={isClickable ? () => {
                            if (place.linked_lat != null && place.linked_lng != null) {
                              window.dispatchEvent(new CustomEvent("map-jump-to-frozen", { detail: { lat: place.linked_lat, lng: place.linked_lng } }));
                            }
                            window.dispatchEvent(new CustomEvent("global-search-open-place", { detail: { placeId: place.linked_place_id } }));
                            (onNavigateAway ?? onClose)();
                          } : undefined}
                          className={`rounded-xl border border-border overflow-hidden bg-card ${isClickable ? "hover:bg-muted/60 active:scale-[0.99] cursor-pointer transition-all" : ""}`}
                        >
                          <div className="flex gap-3 p-3">
                            <div className="w-14 h-14 rounded-lg overflow-hidden shrink-0 bg-muted border border-border">
                              {place.linked_photo_url
                                ? <img src={place.linked_photo_url} alt={place.name} className="w-full h-full object-cover" />
                                : <div className="w-full h-full flex items-center justify-center text-2xl">{categoryLabel(place.category).split(" ")[0]}</div>
                              }
                            </div>
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="flex items-start justify-between gap-2">
                                <p className="font-semibold text-foreground text-sm leading-tight truncate">{place.name}</p>
                                <span className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${statusBadge.cls}`}>{statusBadge.label}</span>
                              </div>
                              <p className="text-[10px] text-muted-foreground">{categoryLabel(place.category)}</p>
                              {(place.city || place.address) && (
                                <p className="text-[10px] text-muted-foreground truncate">📍 {[place.address, place.city].filter(Boolean).join(", ")}</p>
                              )}
                              {place.linked_rating != null && (
                                <p className="text-[10px] text-yellow-500 font-medium">★ {place.linked_rating.toFixed(1)}</p>
                              )}
                            </div>
                          </div>
                          {(place.accepts_dogs || place.accepts_cats || place.dogs_on_leash_only || place.outdoor_seating || place.water_bowl_provided) && (
                            <div className="px-3 pb-2 flex gap-1.5 flex-wrap">
                              {place.accepts_dogs       && <span className="text-[9px] bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">🐕 Chiens</span>}
                              {place.accepts_cats       && <span className="text-[9px] bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">🐈 Chats</span>}
                              {place.dogs_on_leash_only && <span className="text-[9px] bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">🪢 Laisse</span>}
                              {place.outdoor_seating    && <span className="text-[9px] bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">🌿 Terrasse</span>}
                              {place.water_bowl_provided && <span className="text-[9px] bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">🥤 Gamelle</span>}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Signalements récents ── */}
              {(activeLostPets.length > 0 || recentStrays.length > 0) && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Signalements récents</p>

                  {activeLostPets.map(pet => (
                    <button
                      key={pet.id}
                      onClick={() => { window.dispatchEvent(new CustomEvent("open-lost-pet", { detail: { petId: pet.id } })); onClose(); }}
                      className="w-full text-left p-3 rounded-xl border border-border hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-foreground text-sm">{pet.pet_name}</p>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">🆘 Perdu</span>
                      </div>
                      <div className="flex gap-2 text-xs text-muted-foreground flex-wrap mt-0.5">
                        {pet.breed && <span>{pet.breed}</span>}
                        {pet.color && <span>· {pet.color}</span>}
                      </div>
                      {pet.last_seen_address && <p className="text-xs text-muted-foreground truncate mt-0.5">📍 {pet.last_seen_address}</p>}
                    </button>
                  ))}

                  {recentStrays.map(r => (
                    <button
                      key={r.id}
                      className="w-full text-left p-3 rounded-xl border border-border bg-muted/50 hover:bg-muted active:scale-[0.99] transition-all"
                      onClick={() => { window.dispatchEvent(new CustomEvent("open-stray", { detail: { strayId: r.id } })); onClose(); }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">{speciesEmoji(r.species)}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground leading-tight">
                            Animal errant signalé{r.species ? ` — ${r.species}` : ""}
                          </p>
                          {(r.breed || r.city) && (
                            <p className="text-[10px] text-muted-foreground truncate">{[r.breed, r.city].filter(Boolean).join(" · ")}</p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* ── Animaux retrouvés (own profile) ── */}
              {me?.id === userId && lostPets.filter(p => p.status !== "active").length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Animaux retrouvés</p>
                  {lostPets.filter(p => p.status !== "active").map(pet => (
                    <button
                      key={pet.id}
                      onClick={() => { window.dispatchEvent(new CustomEvent("open-lost-pet", { detail: { petId: pet.id } })); onClose(); }}
                      className="w-full text-left p-3 rounded-xl border border-border hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold text-foreground text-sm">{pet.pet_name}</p>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">✅ Retrouvé</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* ── Message button ── */}
              {me && me.id !== userId && (
                <Button onClick={handleMessage} disabled={starting} className="w-full gap-2">
                  {starting ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
                  Envoyer un message
                </Button>
              )}

            </div>
          )}
        </div>
      </div>

      {/* Avatar zoom lightbox */}
      {avatarZoomed && profile?.avatar_url && createPortal(
        <div
          className="fixed inset-0 z-[900] bg-black/90 flex items-center justify-center p-8"
          onClick={() => setAvatarZoomed(false)}
        >
          <img
            src={profile.avatar_url}
            alt=""
            className="rounded-full object-cover shadow-2xl border-4 border-white/20"
            style={{ width: 260, height: 260 }}
            onClick={e => e.stopPropagation()}
          />
        </div>,
        document.body
      )}
    </>,
    document.body
  );
}
