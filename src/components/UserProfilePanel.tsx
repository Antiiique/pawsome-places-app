import { useEffect, useState } from "react";
import { X, MapPin, User, Calendar, MessageCircle, Loader2, ChevronUp } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  description: string | null;
  phone: string | null;
  website: string | null;
  accepts_dogs: boolean | null;
  accepts_cats: boolean | null;
  dogs_on_leash_only: boolean | null;
  outdoor_seating: boolean | null;
  water_bowl_provided: boolean | null;
  // enriched from pet_friendly_places join
  linked_place_id: string | null;
  linked_photo_url: string | null;
  linked_rating: number | null;
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

// ─── Badges ───────────────────────────────────────────────────────────────────

function getBadges(reviewCount: number, strayCount: number, approvedSubCount: number, points: number) {
  return [
    { id: "first_review",  emoji: "🐾", label: "Premier pas",  unlocked: reviewCount >= 1,       tip: "1 avis" },
    { id: "critic",        emoji: "📝", label: "Critique",     unlocked: reviewCount >= 10,      tip: "10 avis" },
    { id: "explorer",      emoji: "🗺️", label: "Explorateur",  unlocked: reviewCount >= 50,      tip: "50 avis" },
    { id: "rescuer1",      emoji: "🆘", label: "Secouriste",   unlocked: strayCount >= 1,        tip: "1 signalement" },
    { id: "watcher",       emoji: "🐕", label: "Veilleur",     unlocked: strayCount >= 5,        tip: "5 signalements" },
    { id: "rescuer10",     emoji: "🏆", label: "Sauveteur",    unlocked: strayCount >= 10,       tip: "10 signalements" },
    { id: "pioneer",       emoji: "📍", label: "Pionnier",     unlocked: approvedSubCount >= 1,  tip: "1 lieu ajouté" },
    { id: "ambassador",    emoji: "🌟", label: "Ambassadeur",  unlocked: points >= 500,          tip: "500 points" },
    { id: "legend",        emoji: "💎", label: "Légende",      unlocked: points >= 1500,         tip: "1500 points" },
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
  if (diffDays < 1)   return { label: "🟢 En ligne aujourd'hui",      color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" };
  if (diffDays < 7)   return { label: "🟡 Actif cette semaine",        color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300" };
  if (diffDays < 30)  return { label: "🟠 Actif ce mois-ci",           color: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300" };
  if (diffDays < 90)  return { label: "🔴 Peu actif",                  color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" };
  return                       { label: "⚫ Absent depuis longtemps",   color: "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400" };
}

function speciesEmoji(s: string | null): string {
  if (!s) return "🐾";
  const l = s.toLowerCase();
  if (l.includes("chien") || l.includes("dog"))  return "🐕";
  if (l.includes("chat") || l.includes("cat"))   return "🐈";
  if (l.includes("lapin") || l.includes("rabbit")) return "🐇";
  if (l.includes("oiseau") || l.includes("bird")) return "🦜";
  return "🐾";
}

function categoryLabel(cat: string): string {
  const map: Record<string, string> = {
    restaurant: "🍽️ Restaurant", hotel: "🏨 Hôtel", shop: "🛍️ Commerce",
    park: "🌳 Parc", vet: "🏥 Vétérinaire", cafe: "☕ Café", other: "📍 Autre",
  };
  return map[cat] ?? `📍 ${cat}`;
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface UserProfilePanelProps {
  userId: string | null;
  onClose: () => void;
  onOpenChat: (convId: string, other: { id: string; display_name: string | null; avatar_url: string | null }) => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

const glassStyle: React.CSSProperties = {
  background: "color-mix(in srgb, var(--card) 55%, transparent)",
  border: "1px solid color-mix(in srgb, var(--border) 50%, transparent)",
  boxShadow: "0 4px 24px rgba(0,0,0,0.10)",
  backdropFilter: "blur(24px)",
  WebkitBackdropFilter: "blur(24px)",
  touchAction: "manipulation",
};

export default function UserProfilePanel({ userId, onClose, onOpenChat }: UserProfilePanelProps) {
  const { user: me } = useAuthContext();
  const [compact, setCompact] = useState(true);
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
      onOpenChat(conv.id, { id: profile.id, display_name: profile.display_name, avatar_url: profile.avatar_url });
      onClose();
    } catch (err: any) {
      toast.error("Erreur : " + err.message);
    } finally {
      setStarting(false);
    }
  };

  useEffect(() => {
    if (!userId) { setProfile(null); setCompact(false); return; }
    setLoading(true);

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    Promise.all([
      (supabase as any).from("profiles").select("id, display_name, avatar_url, bio, city, points, created_at, last_seen_at, postal_code").eq("id", userId).maybeSingle(),
      supabase.from("stray_reports").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("place_reviews").select("id", { count: "exact", head: true }).eq("user_id", userId),
      supabase.from("place_submissions").select("id", { count: "exact", head: true }).eq("submitted_by", userId).eq("status", "approved"),
      supabase.from("pets").select("id, name, species, breed, avatar_url, birth_date, sex, bio, color, size_class, is_vaccinated, is_sterilized, is_microchipped").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("place_submissions").select("id, name, city, address, category, subcategory, status, created_at, reviewed_at, description, phone, website, accepts_dogs, accepts_cats, dogs_on_leash_only, outdoor_seating, water_bowl_provided").eq("submitted_by", userId).eq("status", "approved").order("reviewed_at", { ascending: false }).limit(10),
      supabase.from("stray_reports").select("id, species, breed, city, created_at").eq("user_id", userId).gte("created_at", sevenDaysAgo).order("created_at", { ascending: false }),
      (supabase as any).from("lost_pets").select("id, pet_name, breed, color, status, last_seen_address, created_at").eq("user_id", userId).order("created_at", { ascending: false }),
    ]).then(async ([
      { data: prof },
      { count: strays },
      { count: reviews },
      { count: approvedSubs },
      { data: petsData },
      { data: subsData },
      { data: straysData },
      { data: lostPetsData },
    ]) => {
      setProfile(prof as UserProfile);
      setStrayCount(strays || 0);
      setReviewCount(reviews || 0);
      setApprovedSubCount(approvedSubs || 0);
      setPets((petsData as Pet[]) || []);
      setRecentStrays((straysData as StrayReport[]) || []);
      setLostPets((lostPetsData as LostPet[]) || []);

      // Enrich approved submissions with linked pet_friendly_places data
      const rawSubs = (subsData as any[]) || [];
      const approvedIds = rawSubs.filter(s => s.status === "approved").map(s => s.id);
      let linkedMap: Record<string, { id: string; photo_url: string | null; rating: number | null }> = {};
      if (approvedIds.length > 0) {
        const { data: linked } = await supabase
          .from("pet_friendly_places")
          .select("id, photo_url, rating, source_id")
          .eq("source", "user_submission")
          .in("source_id", approvedIds);
        for (const p of (linked as any[]) || []) {
          linkedMap[p.source_id] = { id: p.id, photo_url: p.photo_url, rating: p.rating };
        }
      }
      const enriched: SubmittedPlace[] = rawSubs.map(s => ({
        ...s,
        linked_place_id: linkedMap[s.id]?.id ?? null,
        linked_photo_url: linkedMap[s.id]?.photo_url ?? null,
        linked_rating: linkedMap[s.id]?.rating ?? null,
      }));
      setSubmittedPlaces(enriched);
      setLoading(false);
    });
  }, [userId]);

  if (!userId) return null;

  const points = profile?.points ?? 0;
  const level = getLevel(points);
  const progress = getLevelProgress(points);
  const nextLevel = LEVELS[LEVELS.indexOf(level) + 1];
  const badges = getBadges(reviewCount, strayCount, approvedSubCount, points);
  const seenBadge = lastSeenBadge(profile?.last_seen_at);
  const activeLostPets = lostPets.filter(p => p.status === "active");

  return (
    <>
      <div
        className="fixed bottom-0 left-0 right-0 z-[700] bg-card rounded-t-2xl shadow-2xl flex flex-col"
        style={{
          top: 0,
          transform: compact ? "translateY(55%)" : "translateY(0%)",
          transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        {/* Control bar */}
        <div className="flex items-center justify-end px-3 py-2 border-b border-border shrink-0 gap-1">
          <button onClick={() => setCompact(c => !c)} className="p-1.5 rounded-full hover:bg-muted transition-colors" title={compact ? "Agrandir" : "Réduire"}>
            <ChevronUp className={`w-5 h-5 text-muted-foreground transition-transform duration-300 ${compact ? "rotate-180" : ""}`} />
          </button>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-muted transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Header */}
        <div className="px-5 pt-4 pb-4 border-b border-border shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0 border-2 border-border">
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                : <User className="w-8 h-8 text-muted-foreground" />
              }
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-bold text-foreground text-xl truncate">
                {loading ? "…" : profile?.display_name || "Utilisateur"}
              </h2>
              {(profile?.city || profile?.postal_code) && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span className="truncate">
                    {[profile.postal_code, profile.city].filter(Boolean).join(" ")}
                  </span>
                </div>
              )}
              {profile?.created_at && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                  <Calendar className="w-3 h-3 shrink-0" />
                  <span>{memberSince(profile.created_at)}</span>
                </div>
              )}
              {!loading && profile && (
                <span className={`inline-block mt-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full ${seenBadge.color}`}>
                  {seenBadge.label}
                </span>
              )}
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 min-h-0">
          <div className="p-5 space-y-6">

            {/* Level + progress */}
            {!loading && profile && (
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
            )}

            {/* Stats grid */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { value: points,          label: "Points" },
                { value: strayCount,      label: "Signalements" },
                { value: reviewCount,     label: "Avis" },
                { value: approvedSubCount, label: "Lieux" },
              ].map(({ value, label }) => (
                <div key={label} className="bg-muted rounded-xl p-2 text-center">
                  <p className="text-lg font-bold text-foreground">{loading ? "–" : value}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{label}</p>
                </div>
              ))}
            </div>

            {/* Badges */}
            {!loading && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Badges</p>
                <div className="grid grid-cols-3 gap-2">
                  {badges.map(b => (
                    <div
                      key={b.id}
                      className={`rounded-xl p-2.5 text-center transition-opacity ${b.unlocked ? "bg-muted opacity-100" : "bg-muted/40 opacity-40"}`}
                    >
                      <p className="text-xl">{b.emoji}</p>
                      <p className="text-[10px] font-medium text-foreground mt-0.5 leading-tight">{b.label}</p>
                      {!b.unlocked && <p className="text-[9px] text-muted-foreground">{b.tip}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bio */}
            {profile?.bio && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">À propos</p>
                <p className="text-sm text-foreground leading-relaxed">{profile.bio}</p>
              </div>
            )}

            {/* Pets */}
            {!loading && pets.length > 0 && (
              <div className="space-y-2.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Animaux de compagnie</p>
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

                    return (
                      <div
                        key={pet.id}
                        className="rounded-2xl border border-border overflow-hidden bg-card cursor-pointer hover:border-primary/50 transition-colors"
                        onClick={() => window.dispatchEvent(new CustomEvent("open-pet-profile", { detail: { petId: pet.id } }))}
                      >
                        {/* Photo banner */}
                        <div className="relative w-full h-36 bg-muted">
                          {pet.avatar_url
                            ? <img src={pet.avatar_url} alt={pet.name} className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center text-5xl">{speciesEmoji(pet.species)}</div>
                          }
                          {/* Species badge */}
                          <span className="absolute top-2 right-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-black/40 text-white backdrop-blur-sm">
                            {speciesEmoji(pet.species)} {pet.species}
                          </span>
                        </div>

                        {/* Info */}
                        <div className="p-3 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-bold text-foreground text-base">{pet.name}</p>
                            <div className="flex gap-1">
                              {pet.sex === "M" && <span className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 px-1.5 py-0.5 rounded-full font-medium">♂ Mâle</span>}
                              {pet.sex === "F" && <span className="text-[10px] bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300 px-1.5 py-0.5 rounded-full font-medium">♀ Femelle</span>}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                            {pet.breed && <span>{pet.breed}</span>}
                            {pet.color && <span>· {pet.color}</span>}
                            {age && <span>· {age}</span>}
                            {pet.size_class && <span>· {({ petit: "Petit", moyen: "Moyen", grand: "Grand", tres_grand: "Très grand" } as Record<string,string>)[pet.size_class] ?? pet.size_class}</span>}
                          </div>

                          {pet.bio && (
                            <p className="text-xs text-muted-foreground italic leading-relaxed">"{pet.bio}"</p>
                          )}

                          {(pet.is_vaccinated || pet.is_sterilized || pet.is_microchipped) && (
                            <div className="flex gap-1.5 flex-wrap">
                              {pet.is_vaccinated  && <span className="text-[9px] bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 px-1.5 py-0.5 rounded-full font-medium">💉 Vacciné</span>}
                              {pet.is_sterilized  && <span className="text-[9px] bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 px-1.5 py-0.5 rounded-full font-medium">✂️ Stérilisé</span>}
                              {pet.is_microchipped && <span className="text-[9px] bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 px-1.5 py-0.5 rounded-full font-medium">📡 Pucé</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Submitted places */}
            {!loading && submittedPlaces.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Lieux ajoutés</p>
                <div className="space-y-2.5">
                  {submittedPlaces.map(place => {
                    const isApproved = place.status === "approved";
                    const isPending  = place.status === "pending";
                    const isRejected = place.status === "rejected";
                    const statusBadge = isApproved
                      ? { label: "✅ Approuvé",    cls: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" }
                      : isPending
                      ? { label: "⏳ En attente",  cls: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300" }
                      : { label: "❌ Refusé",       cls: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" };

                    const isClickable = isApproved && !!place.linked_place_id;
                    const handleClick = () => {
                      if (isClickable) window.dispatchEvent(new CustomEvent("open-community-reviews", { detail: { placeId: place.linked_place_id } }));
                    };

                    return (
                      <div
                        key={place.id}
                        onClick={isClickable ? handleClick : undefined}
                        role={isClickable ? "button" : undefined}
                        className={`w-full text-left rounded-xl border border-border overflow-hidden bg-card ${isClickable ? "hover:bg-muted/60 active:scale-[0.99] transition-all cursor-pointer" : ""}`}
                      >
                        {/* Photo + header */}
                        <div className="flex gap-3 p-3">
                          <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-muted border border-border">
                            {place.linked_photo_url
                              ? <img src={place.linked_photo_url} alt={place.name} className="w-full h-full object-cover" />
                              : <div className="w-full h-full flex items-center justify-center text-2xl">{categoryLabel(place.category).split(" ")[0]}</div>
                            }
                          </div>
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-semibold text-foreground text-sm leading-tight truncate">{place.name}</p>
                              <span className={`shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${statusBadge.cls}`}>
                                {statusBadge.label}
                              </span>
                            </div>
                            <p className="text-[10px] text-muted-foreground">{categoryLabel(place.category)}{place.subcategory ? ` · ${place.subcategory}` : ""}</p>
                            {(place.city || place.address) && (
                              <p className="text-[10px] text-muted-foreground truncate">
                                📍 {[place.address, place.city].filter(Boolean).join(", ")}
                              </p>
                            )}
                            {place.linked_rating != null && (
                              <p className="text-[10px] text-yellow-500 font-medium">★ {place.linked_rating.toFixed(1)}</p>
                            )}
                          </div>
                        </div>

                        {/* Amenities row */}
                        {(place.accepts_dogs || place.accepts_cats || place.dogs_on_leash_only || place.outdoor_seating || place.water_bowl_provided) && (
                          <div className="px-3 pb-2 flex gap-1.5 flex-wrap">
                            {place.accepts_dogs      && <span className="text-[9px] bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">🐕 Chiens</span>}
                            {place.accepts_cats      && <span className="text-[9px] bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">🐈 Chats</span>}
                            {place.dogs_on_leash_only && <span className="text-[9px] bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">🪢 Laisse</span>}
                            {place.outdoor_seating   && <span className="text-[9px] bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">🌿 Terrasse</span>}
                            {place.water_bowl_provided && <span className="text-[9px] bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground">🥤 Gamelle</span>}
                          </div>
                        )}

                        {/* Contact + dates */}
                        <div className="px-3 pb-3 space-y-0.5">
                          {place.phone && <p className="text-[10px] text-muted-foreground">📞 {place.phone}</p>}
                          {place.website && (
                            <p className="text-[10px] text-primary truncate">🌐 {place.website.replace(/^https?:\/\//, "")}</p>
                          )}
                          <div className="flex gap-3 pt-0.5">
                            <p className="text-[9px] text-muted-foreground">
                              Soumis le {new Date(place.created_at!).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                            </p>
                            {place.reviewed_at && isApproved && (
                              <p className="text-[9px] text-green-600 dark:text-green-400">
                                Approuvé le {new Date(place.reviewed_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                              </p>
                            )}
                          </div>
                          {isApproved && place.linked_place_id && (
                            <p className="text-[9px] text-primary font-medium mt-0.5">Appuyer pour voir sur la carte →</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recent activity */}
            {!loading && (activeLostPets.length > 0 || recentStrays.length > 0) && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Activité récente</p>

                {activeLostPets.map(pet => (
                  <button
                    key={pet.id}
                    onClick={() => window.dispatchEvent(new CustomEvent("open-lost-pet", { detail: { petId: pet.id } }))}
                    className="w-full text-left p-3 rounded-xl border border-border hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-foreground text-sm">{pet.pet_name}</p>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                        🆘 Perdu
                      </span>
                    </div>
                    <div className="flex gap-2 text-xs text-muted-foreground flex-wrap mt-0.5">
                      {pet.breed && <span>{pet.breed}</span>}
                      {pet.color && <span>· {pet.color}</span>}
                    </div>
                    {pet.last_seen_address && (
                      <p className="text-xs text-muted-foreground truncate mt-0.5">📍 {pet.last_seen_address}</p>
                    )}
                  </button>
                ))}

                {recentStrays.map(r => (
                  <div key={r.id} className="p-3 rounded-xl border border-border bg-muted/50">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{speciesEmoji(r.species)}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground leading-tight">
                          Animal errant signalé
                          {r.species ? ` — ${r.species}` : ""}
                        </p>
                        {(r.breed || r.city) && (
                          <p className="text-[10px] text-muted-foreground truncate">
                            {[r.breed, r.city].filter(Boolean).join(" · ")}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Lost pets (all, for own profile) */}
            {!loading && lostPets.length > 0 && me?.id === userId && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">🆘 Mes animaux perdus</p>
                  <button
                    onClick={() => window.dispatchEvent(new CustomEvent("open-lost-pet-modal"))}
                    className="text-xs text-amber-600 dark:text-amber-400 font-semibold hover:underline"
                  >
                    + Signaler
                  </button>
                </div>
                {lostPets.filter(p => p.status !== "active").map(pet => (
                  <button
                    key={pet.id}
                    onClick={() => window.dispatchEvent(new CustomEvent("open-lost-pet", { detail: { petId: pet.id } }))}
                    className="w-full text-left p-3 rounded-xl border border-border hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-foreground text-sm">{pet.pet_name}</p>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                        ✅ Retrouvé
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Message button — only for other users */}
            {me && me.id !== userId && profile && (
              <Button onClick={handleMessage} disabled={starting} className="w-full gap-2">
                {starting ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
                Envoyer un message
              </Button>
            )}

            {!loading && !profile && (
              <p className="text-center text-muted-foreground text-sm py-8">Profil introuvable</p>
            )}
          </div>
        </ScrollArea>
      </div>
    </>
  );
}
