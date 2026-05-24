import { useState, useEffect, useRef, useCallback } from "react";
import { X, Upload, Trash2, Star, Plus, ChevronLeft, Camera, Bell, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { useHandedness } from "@/contexts/HandednessContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useNotificationPreferences, type NotifPrefs } from "@/hooks/useNotificationPreferences";

const ADMIN_EMAILS = ["elvin.agd@gmail.com", "artistfx.mp4@gmail.com"];

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

interface UserProfileModalProps {
  open: boolean;
  onClose: () => void;
  dragProgress?: number;
}

interface ProfileData {
  display_name: string;
  avatar_url: string | null;
  bio: string;
  age: number | null;
  city: string;
  points: number;
  alert_radius_km: number | null;
  streak_current: number;
  streak_max: number;
  streak_last_date: string | null;
  streak_shield_available: boolean;
}

interface LeaderEntry {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  points: number;
}

interface Pet {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  birth_date: string | null;
  sex: string | null;
  avatar_url: string | null;
  bio: string | null;
  color: string | null;
  size_class: string | null;
  personality_tags: string[] | null;
  is_vaccinated: boolean | null;
  is_sterilized: boolean | null;
  is_microchipped: boolean | null;
}

interface PetPhoto {
  id: string;
  pet_id: string;
  url: string;
  caption: string | null;
}

type PetView = "list" | "form" | "album" | "visited";

interface UserSubmission {
  id: string;
  name: string;
  category: string;
  city: string | null;
  address: string | null;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  admin_note: string | null;
  linked_place?: {
    id: string;
    photo_url: string | null;
    rating: number | null;
  } | null;
}

const SIZE_OPTIONS = [
  { value: "petit",      label: "Petit",     sub: "< 10 kg",   emoji: "🐩" },
  { value: "moyen",      label: "Moyen",     sub: "10–25 kg",  emoji: "🐕" },
  { value: "grand",      label: "Grand",     sub: "25–45 kg",  emoji: "🦮" },
  { value: "tres_grand", label: "Très grand", sub: "> 45 kg",  emoji: "🐻" },
];

const PERSONALITY_OPTIONS = [
  "Joueur 🎾", "Câlin 🤗", "Timide 🙈", "Actif 🏃", "Calme 😌",
  "Sociable 🐶", "Gourmand 🍖", "Sportif 💪", "Paresseux 😴", "Curieux 👀", "Protecteur 🛡️", "Fidèle 💛",
];

const LEVELS = [
  { min: 0,    max: 99,   label: "Explorateur",  emoji: "🌱", color: "text-green-600 dark:text-green-400",  bg: "bg-green-100 dark:bg-green-900/30",  bar: "bg-green-500" },
  { min: 100,  max: 299,  label: "Aventurier",   emoji: "🗺️", color: "text-blue-600 dark:text-blue-400",   bg: "bg-blue-100 dark:bg-blue-900/30",    bar: "bg-blue-500" },
  { min: 300,  max: 699,  label: "Contributeur", emoji: "⭐", color: "text-yellow-600 dark:text-yellow-400", bg: "bg-yellow-100 dark:bg-yellow-900/30", bar: "bg-yellow-500" },
  { min: 700,  max: 1499, label: "Expert",       emoji: "🏆", color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-100 dark:bg-orange-900/30", bar: "bg-orange-500" },
  { min: 1500, max: Infinity, label: "Ambassadeur", emoji: "🦁", color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-100 dark:bg-purple-900/30", bar: "bg-purple-500" },
];

function getLevel(points: number) {
  return LEVELS.find(l => points >= l.min && points <= l.max) || LEVELS[0];
}

function getLevelProgress(points: number) {
  const lvl = getLevel(points);
  if (lvl.max === Infinity) return 100;
  return Math.round(((points - lvl.min) / (lvl.max + 1 - lvl.min)) * 100);
}

const ALERT_RADIUS_OPTIONS = [
  { value: null, label: "Off" },
  { value: 10,  label: "10 km" },
  { value: 15,  label: "15 km" },
  { value: 20,  label: "20 km" },
  { value: 30,  label: "30 km" },
  { value: 40,  label: "40 km" },
  { value: 50,  label: "50 km" },
];

const SPECIES_OPTIONS = [
  { value: "dog", label: "Chien", emoji: "🐶" },
  { value: "cat", label: "Chat", emoji: "🐱" },
  { value: "rabbit", label: "Lapin", emoji: "🐰" },
  { value: "bird", label: "Oiseau", emoji: "🐦" },
  { value: "reptile", label: "Reptile", emoji: "🦎" },
  { value: "other", label: "Autre", emoji: "🐾" },
];

function getAge(birthDate: string | null): string {
  if (!birthDate) return "";
  const birth = new Date(birthDate);
  const now = new Date();
  const totalMonths = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  if (totalMonths < 1) return "< 1 mois";
  if (totalMonths < 12) return `${totalMonths} mois`;
  const years = Math.floor(totalMonths / 12);
  return `${years} an${years > 1 ? "s" : ""}`;
}

function getSpeciesEmoji(species: string): string {
  return SPECIES_OPTIONS.find(s => s.value === species)?.emoji || "🐾";
}

function getSpeciesLabel(species: string): string {
  return SPECIES_OPTIONS.find(s => s.value === species)?.label || "Autre";
}

const EMPTY_PET_FORM = {
  name: "", species: "dog", breed: "", birth_date: "", sex: "", bio: "",
  color: "", size_class: "", personality_tags: [] as string[],
  is_vaccinated: false, is_sterilized: false, is_microchipped: false,
};

// ─── Sub-tabs for Mes lieux ──────────────────────────────────────────────────

const STATUS_TABS = [
  { key: "approved", label: "Approuvés", color: "text-green-600 dark:text-green-400", activeBar: "bg-green-500" },
  { key: "pending",  label: "En attente", color: "text-yellow-600 dark:text-yellow-400", activeBar: "bg-yellow-500" },
] as const;

type StatusKey = typeof STATUS_TABS[number]["key"];

function PlaceCard({ sub, onClose }: { sub: UserSubmission; onClose?: () => void }) {
  const isClickable = sub.status === "approved" && !!sub.linked_place?.id;

  const handleClick = () => {
    if (isClickable) {
      onClose?.();
      window.dispatchEvent(new CustomEvent("global-search-open-place", { detail: { placeId: sub.linked_place!.id } }));
    }
  };

  return (
    <div
      onClick={isClickable ? handleClick : undefined}
      role={isClickable ? "button" : undefined}
      className={`border border-border rounded-xl overflow-hidden transition-all duration-150
        ${isClickable
          ? "bg-secondary hover:bg-muted active:scale-[0.985] cursor-pointer shadow-sm hover:shadow-md"
          : "bg-secondary"
        }`}
    >
      <div className="flex gap-3 p-3">
        {sub.linked_place?.photo_url ? (
          <img src={sub.linked_place.photo_url} alt={sub.name} className="w-16 h-16 rounded-lg object-cover shrink-0 border border-border" />
        ) : (
          <div className="w-16 h-16 rounded-lg bg-muted shrink-0 border border-border flex items-center justify-center text-2xl">🐾</div>
        )}
        <div className="flex-1 min-w-0 space-y-0.5">
          <p className="font-semibold text-foreground text-sm leading-tight truncate">{sub.name}</p>
          <p className="text-xs text-muted-foreground">
            {sub.category}{sub.city ? ` · ${sub.city}` : ""}{sub.address ? ` · ${sub.address}` : ""}
          </p>
          {sub.linked_place?.rating != null && (
            <p className="text-xs text-yellow-500 font-medium">★ {sub.linked_place.rating.toFixed(1)}</p>
          )}
          <p className="text-[10px] text-muted-foreground">
            Soumis le {new Date(sub.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
          </p>
          {isClickable && (
            <p className="text-[10px] text-primary font-semibold">Voir sur la carte →</p>
          )}
        </div>
      </div>
      {sub.status === "rejected" && sub.admin_note && (
        <div className="px-3 pb-3">
          <p className="text-xs text-muted-foreground bg-muted rounded-lg px-2.5 py-2 italic">💬 {sub.admin_note}</p>
        </div>
      )}
    </div>
  );
}

function PlacesSubTabs({ submissions, onClose }: { submissions: UserSubmission[]; onClose?: () => void }) {
  const [activeStatus, setActiveStatus] = useState<StatusKey>("approved");
  const [approvedCollapsed, setApprovedCollapsed] = useState(false);

  const visibleByStatus: Record<StatusKey, UserSubmission[]> = {
    approved: submissions.filter(s => s.status === "approved" && !!s.linked_place?.id),
    pending:  submissions.filter(s => s.status === "pending"),
  };

  const filtered = visibleByStatus[activeStatus];

  const emptyLabel: Record<StatusKey, string> = {
    approved: "Aucun lieu approuvé visible sur la carte",
    pending:  "Aucun lieu en attente",
  };

  const emptyEmoji: Record<StatusKey, string> = {
    approved: "✅",
    pending:  "⏳",
  };

  return (
    <div className="space-y-3">
      {/* Sub-tab bar */}
      <div className="flex rounded-xl overflow-hidden border border-border">
        {STATUS_TABS.map((tab, i) => {
          const isActive = activeStatus === tab.key;
          const count = visibleByStatus[tab.key].length;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveStatus(tab.key)}
              className={`flex-1 py-2.5 text-center transition-all ${i > 0 ? "border-l border-border" : ""} ${isActive ? "bg-muted" : "bg-background hover:bg-muted/40"}`}
            >
              <p className={`text-lg font-bold leading-none ${isActive ? tab.color : "text-muted-foreground"}`}>
                {count}
              </p>
              <p className={`text-[9px] mt-0.5 leading-tight font-medium ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                {tab.label}
              </p>
              <div className={`h-0.5 mt-1.5 mx-auto rounded-full transition-all duration-200 ${isActive ? `w-8 ${tab.activeBar}` : "w-0 bg-transparent"}`} />
            </button>
          );
        })}
      </div>

      {/* Collapse toggle for approved tab */}
      {activeStatus === "approved" && filtered.length > 0 && (
        <button
          onClick={() => setApprovedCollapsed(c => !c)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-xs font-semibold text-foreground"
        >
          <span>✅ {filtered.length} lieu{filtered.length > 1 ? "x" : ""} sur la carte</span>
          <span className={`transition-transform duration-200 ${approvedCollapsed ? "rotate-0" : "rotate-180"}`}>▲</span>
        </button>
      )}

      {/* Isolated content per tab */}
      {filtered.length === 0 ? (
        <div className="text-center py-10 space-y-1.5">
          <p className="text-4xl">{emptyEmoji[activeStatus]}</p>
          <p className="text-sm text-muted-foreground">{emptyLabel[activeStatus]}</p>
        </div>
      ) : (
        !(activeStatus === "approved" && approvedCollapsed) && (
          <div className="space-y-2">
            {filtered.map(sub => <PlaceCard key={sub.id} sub={sub} onClose={onClose} />)}
          </div>
        )
      )}
    </div>
  );
}

function NotifToggleRow({
  icon, label, desc, enabled, onToggle, variant,
}: {
  icon: string; label: string; desc: string; enabled: boolean;
  onToggle: () => void; variant: "user" | "admin";
}) {
  return (
    <div className={`flex items-center justify-between py-3 px-4 rounded-xl border ${
      variant === "admin"
        ? "bg-violet-50 dark:bg-violet-950/20 border-violet-200 dark:border-violet-800"
        : "bg-secondary border-border"
    }`}>
      <div className="flex items-center gap-3 flex-1 min-w-0 pr-3">
        <span className="text-lg shrink-0">{icon}</span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground leading-tight">{label}</p>
          <p className="text-xs text-muted-foreground leading-tight">{desc}</p>
        </div>
      </div>
      <button
        onClick={onToggle}
        className={`relative w-10 h-6 rounded-full transition-colors duration-200 shrink-0 ${
          enabled
            ? variant === "admin" ? "bg-violet-600" : "bg-primary"
            : "bg-muted-foreground/30"
        }`}
        aria-label={enabled ? "Désactiver" : "Activer"}
      >
        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${enabled ? "translate-x-5" : "translate-x-1"}`} />
      </button>
    </div>
  );
}

const glassStyle: React.CSSProperties = {
  background: "color-mix(in srgb, var(--card) 55%, transparent)",
  border: "1px solid color-mix(in srgb, var(--border) 50%, transparent)",
  boxShadow: "0 4px 24px rgba(0,0,0,0.10)",
  backdropFilter: "blur(24px)",
  WebkitBackdropFilter: "blur(24px)",
  touchAction: "manipulation",
};

export default function UserProfileModal({ open, onClose, dragProgress }: UserProfileModalProps) {
  const { user, profile: authProfile, signOut } = useAuthContext();
  const { isLeftHanded, setIsLeftHanded } = useHandedness();
  const isAdmin = authProfile?.is_admin === true || ADMIN_EMAILS.includes(user?.email ?? "");
  const { prefs, loading: prefsLoading, saving: prefsSaving, updatePref } = useNotificationPreferences();

  const [activeMainTab, setActiveMainTab] = useState("profile");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const skipAutoSave = useRef(true);
  const [profile, setProfile] = useState<ProfileData>({
    display_name: "", avatar_url: null, bio: "", age: null, city: "", points: 0, alert_radius_km: null,
    streak_current: 0, streak_max: 0, streak_last_date: null, streak_shield_available: true,
  });
  const [reviewCount, setReviewCount] = useState(0);
  const [strayCount, setStrayCount] = useState(0);
  const [approvedSubCount, setApprovedSubCount] = useState(0);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderEntry[]>([]);
  const [loadingLeader, setLoadingLeader] = useState(false);

  const [pets, setPets] = useState<Pet[]>([]);
  const [petView, setPetView] = useState<PetView>("list");
  const [editingPet, setEditingPet] = useState<Pet | null>(null);
  const [petForm, setPetForm] = useState(EMPTY_PET_FORM);
  const [savingPet, setSavingPet] = useState(false);
  const [uploadingPetAvatar, setUploadingPetAvatar] = useState(false);
  const [albumPet, setAlbumPet] = useState<Pet | null>(null);
  const [album, setAlbum] = useState<PetPhoto[]>([]);
  const [loadingAlbum, setLoadingAlbum] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [visitedPet, setVisitedPet] = useState<Pet | null>(null);
  const [visitedPlaces, setVisitedPlaces] = useState<Array<{ id: string; name: string; city: string | null; photo_url: string | null; category: string }>>([]);
  const [loadingVisited, setLoadingVisited] = useState(false);
  const [newPetAvatar, setNewPetAvatar] = useState<File | null>(null);
  const [newPetAvatarPreview, setNewPetAvatarPreview] = useState<string | null>(null);
  const newPetAvatarInputRef = useRef<HTMLInputElement>(null);

  const [submissions, setSubmissions] = useState<UserSubmission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const petAvatarInputRef = useRef<HTMLInputElement>(null);
  const albumInputRef = useRef<HTMLInputElement>(null);
  const petVisitedInputRef = useRef<HTMLInputElement>(null);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setLoadingSubmissions(true);
    const [{ data: prof }, { data: petData }, { data: subData }, { count: revCount }, { count: strayC }] = await Promise.all([
      supabase.from("profiles").select("display_name, avatar_url, bio, age, city, points, alert_radius_km, streak_current, streak_max, streak_last_date, streak_shield_available").eq("id", user.id).maybeSingle(),
      supabase.from("pets" as any).select("*").eq("user_id", user.id).order("created_at", { ascending: true }),
      supabase.from("place_submissions" as any).select("id, name, category, city, address, status, created_at, admin_note").eq("submitted_by", user.id).order("created_at", { ascending: false }),
      supabase.from("place_reviews").select("id", { count: "exact" }).eq("user_id", user.id),
      supabase.from("stray_reports").select("id", { count: "exact" }).eq("user_id", user.id),
    ]);
    if (prof) {
      skipAutoSave.current = true;
      setProfile({
        display_name: prof.display_name || "",
        avatar_url: prof.avatar_url,
        bio: (prof as any).bio || "",
        age: (prof as any).age ?? null,
        city: (prof as any).city || "",
        points: (prof as any).points ?? 0,
        alert_radius_km: (prof as any).alert_radius_km ?? null,
        streak_current: (prof as any).streak_current ?? 0,
        streak_max: (prof as any).streak_max ?? 0,
        streak_last_date: (prof as any).streak_last_date ?? null,
        streak_shield_available: (prof as any).streak_shield_available ?? true,
      });
      setTimeout(() => { skipAutoSave.current = false; }, 100);
    }
    setReviewCount(revCount || 0);
    setStrayCount(strayC || 0);
    if (petData) setPets(petData as any);

    if (subData && (subData as any[]).length > 0) {
      const approvedSubs = (subData as any[]).filter(s => s.status === "approved");
      const approvedIds = approvedSubs.map(s => s.id);
      let linkedMap: Record<string, { id: string; photo_url: string | null; rating: number | null }> = {};

      if (approvedIds.length > 0) {
        // Pass 1: match via source_id (set when admin uses the approval workflow)
        const { data: bySourceId } = await supabase
          .from("pet_friendly_places")
          .select("id, name, city, photo_url, rating, source_id")
          .eq("source", "user_submission")
          .in("source_id", approvedIds);
        for (const p of (bySourceId as any[]) || []) {
          linkedMap[p.source_id] = { id: p.id, photo_url: p.photo_url, rating: p.rating };
        }

        // Pass 2: fallback — match by name + city for submissions not yet linked
        const unmatched = approvedSubs.filter(s => !linkedMap[s.id]);
        if (unmatched.length > 0) {
          const names = [...new Set(unmatched.map((s: any) => s.name))];
          const { data: byName } = await supabase
            .from("pet_friendly_places")
            .select("id, name, city, photo_url, rating")
            .in("name", names);
          for (const p of (byName as any[]) || []) {
            const sub = unmatched.find((s: any) =>
              s.name === p.name && (!s.city || !p.city || s.city === p.city)
            );
            if (sub && !linkedMap[sub.id]) {
              linkedMap[sub.id] = { id: p.id, photo_url: p.photo_url, rating: p.rating };
            }
          }
        }
      }

      const merged: UserSubmission[] = (subData as any[]).map(s => ({
        ...s,
        linked_place: linkedMap[s.id] || null,
      }));
      setSubmissions(merged);
    } else {
      setSubmissions([]);
    }
    setApprovedSubCount((subData as any[] | null)?.filter((s: any) => s.status === "approved").length || 0);
    setLoadingSubmissions(false);
    setLoading(false);
  }, [user]);

  const fetchLeaderboard = useCallback(async () => {
    setLoadingLeader(true);
    const { data } = await supabase.from("profiles").select("id, display_name, avatar_url, points").order("points", { ascending: false }).limit(20);
    setLeaderboard((data as LeaderEntry[]) || []);
    setLoadingLeader(false);
  }, []);

  useEffect(() => {
    if (open) {
      skipAutoSave.current = true;
      setActiveMainTab("profile");
      fetchAll(); setPetView("list"); setEditingPet(null); setAlbumPet(null); setAlbum([]); setSubmissions([]); setNewPetAvatar(null); setNewPetAvatarPreview(null); setShowLeaderboard(false); setLeaderboard([]);
    } else {
      skipAutoSave.current = true;
      clearTimeout(saveTimerRef.current);
    }
  }, [open, fetchAll]);

  // ── Auto-save profile on field change (debounced 800ms) ──
  useEffect(() => {
    if (skipAutoSave.current || !user) return;
    clearTimeout(saveTimerRef.current);
    setSaving(true);
    saveTimerRef.current = setTimeout(async () => {
      const { error } = await supabase.from("profiles").update({
        display_name: profile.display_name || null,
        bio: profile.bio || null,
        age: profile.age,
        city: profile.city || null,
        alert_radius_km: profile.alert_radius_km,
      } as any).eq("id", user.id);
      setSaving(false);
      if (error) toast.error("Erreur de sauvegarde : " + error.message);
    }, 800);
    return () => clearTimeout(saveTimerRef.current);
  }, [profile.display_name, profile.bio, profile.age, profile.city, profile.alert_radius_km, user]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) { toast.error("Format non supporté (JPEG, PNG, WebP)"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Photo trop lourde (max 5 Mo)"); return; }
    setUploadingAvatar(true);
    const path = `${user.id}/avatar-${Date.now()}.${file.name.split(".").pop() || "jpg"}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (upErr) { setUploadingAvatar(false); toast.error("Upload échoué"); return; }
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", user.id);
    setUploadingAvatar(false);
    setProfile(p => ({ ...p, avatar_url: publicUrl }));
    toast.success("Photo de profil mise à jour 📸");
    if (avatarInputRef.current) avatarInputRef.current.value = "";
  };

  // ── Pets ──
  const openCreatePet = () => { setEditingPet(null); setPetForm(EMPTY_PET_FORM); setNewPetAvatar(null); setNewPetAvatarPreview(null); setPetView("form"); };
  const openEditPet = async (pet: Pet) => {
    setEditingPet(pet);
    setAlbumPet(pet);
    setPetForm({
      name: pet.name, species: pet.species, breed: pet.breed || "",
      birth_date: pet.birth_date || "", sex: pet.sex || "", bio: pet.bio || "",
      color: pet.color || "", size_class: pet.size_class || "",
      personality_tags: pet.personality_tags || [],
      is_vaccinated: pet.is_vaccinated || false,
      is_sterilized: pet.is_sterilized || false,
      is_microchipped: pet.is_microchipped || false,
    });
    setNewPetAvatar(null); setNewPetAvatarPreview(null);
    setPetView("form");
    setLoadingAlbum(true);
    const { data } = await supabase.from("pet_photos" as any).select("*").eq("pet_id", pet.id).order("created_at", { ascending: false });
    setAlbum((data as any) || []);
    setLoadingAlbum(false);
  };

  const openVisited = async (pet: Pet) => {
    setVisitedPet(pet);
    setPetView("visited");
    setLoadingVisited(true);
    const { data } = await supabase
      .from("review_pets" as any)
      .select("place_reviews(place_id, pet_friendly_places(id, name, city, photo_url, category))")
      .eq("pet_id", pet.id);
    const places: any[] = [];
    const seen = new Set<string>();
    for (const row of (data as any) || []) {
      const place = row.place_reviews?.pet_friendly_places;
      if (place && !seen.has(place.id)) { seen.add(place.id); places.push(place); }
    }
    setVisitedPlaces(places);
    setLoadingVisited(false);
  };

  const openAlbum = async (pet: Pet) => {
    setAlbumPet(pet);
    setPetView("album");
    setLoadingAlbum(true);
    const { data } = await supabase.from("pet_photos" as any).select("*").eq("pet_id", pet.id).order("created_at", { ascending: false });
    setAlbum((data as any) || []);
    setLoadingAlbum(false);
  };

  const handleSavePet = async () => {
    if (!user || !petForm.name.trim()) { toast.error("Le nom est requis"); return; }
    setSavingPet(true);
    const payload = {
      name: petForm.name,
      species: petForm.species,
      breed: petForm.breed || null,
      birth_date: petForm.birth_date || null,
      sex: petForm.sex || null,
      bio: petForm.bio || null,
      color: petForm.color || null,
      size_class: petForm.size_class || null,
      personality_tags: petForm.personality_tags.length ? petForm.personality_tags : null,
      is_vaccinated: petForm.is_vaccinated,
      is_sterilized: petForm.is_sterilized,
      is_microchipped: petForm.is_microchipped,
    };
    if (editingPet) {
      const { error } = await supabase.from("pets" as any).update(payload).eq("id", editingPet.id);
      if (error) { setSavingPet(false); toast.error("Erreur : " + error.message); return; }
      setPets(prev => prev.map(p => p.id === editingPet.id ? { ...p, ...payload } : p));
      toast.success("Animal mis à jour 🐾");
    } else {
      const { data, error } = await supabase.from("pets" as any).insert({ user_id: user.id, ...payload }).select("*").single();
      if (error) { setSavingPet(false); toast.error("Erreur : " + error.message); return; }
      // Upload avatar if selected during creation
      if (data && newPetAvatar) {
        const petId = (data as any).id;
        const path = `${user.id}/${petId}-${Date.now()}.${newPetAvatar.name.split(".").pop() || "jpg"}`;
        const { error: upErr } = await supabase.storage.from("pet-avatars").upload(path, newPetAvatar, { upsert: true });
        if (!upErr) {
          const { data: { publicUrl } } = supabase.storage.from("pet-avatars").getPublicUrl(path);
          await supabase.from("pets" as any).update({ avatar_url: publicUrl }).eq("id", petId);
          setPets(prev => [...prev, { ...(data as any), avatar_url: publicUrl }]);
        } else {
          setPets(prev => [...prev, data as any]);
        }
      } else if (data) {
        setPets(prev => [...prev, data as any]);
      }
      toast.success("Animal ajouté 🎉");
    }
    setSavingPet(false);
    setNewPetAvatar(null); setNewPetAvatarPreview(null);
    setAlbumPet(null); setAlbum([]);
    setPetView("list");
  };

  const handleDeletePet = async (pet: Pet) => {
    if (!confirm(`Supprimer ${pet.name} ? Cette action est irréversible.`)) return;
    const { error } = await supabase.from("pets" as any).delete().eq("id", pet.id);
    if (error) { toast.error("Erreur : " + error.message); return; }
    setPets(prev => prev.filter(p => p.id !== pet.id));
    toast.success(`${pet.name} supprimé`);
  };

  const handleUploadPetAvatar = async (e: React.ChangeEvent<HTMLInputElement>, pet: Pet) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) { toast.error("Format non supporté (JPEG, PNG, WebP)"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Photo trop lourde (max 5 Mo)"); return; }
    setUploadingPetAvatar(true);
    const path = `${user.id}/${pet.id}-${Date.now()}.${file.name.split(".").pop() || "jpg"}`;
    const { error: upErr } = await supabase.storage.from("pet-avatars").upload(path, file, { upsert: true });
    if (upErr) { setUploadingPetAvatar(false); toast.error("Upload échoué"); return; }
    const { data: { publicUrl } } = supabase.storage.from("pet-avatars").getPublicUrl(path);
    await supabase.from("pets" as any).update({ avatar_url: publicUrl }).eq("id", pet.id);
    setUploadingPetAvatar(false);
    setPets(prev => prev.map(p => p.id === pet.id ? { ...p, avatar_url: publicUrl } : p));
    if (albumPet?.id === pet.id) setAlbumPet(prev => prev ? { ...prev, avatar_url: publicUrl } : prev);
    toast.success("Photo de profil mise à jour 📸");
    if (petAvatarInputRef.current) petAvatarInputRef.current.value = "";
  };

  const handleAddAlbumPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !albumPet) return;
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) { toast.error("Format non supporté (JPEG, PNG, WebP)"); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("Photo trop lourde (max 10 Mo)"); return; }
    setUploadingPhoto(true);
    const path = `${user.id}/${albumPet.id}-${Date.now()}.${file.name.split(".").pop() || "jpg"}`;
    const { error: upErr } = await supabase.storage.from("pet-photos").upload(path, file);
    if (upErr) { setUploadingPhoto(false); toast.error("Upload échoué"); return; }
    const { data: { publicUrl } } = supabase.storage.from("pet-photos").getPublicUrl(path);
    const { data: inserted, error: insErr } = await supabase.from("pet_photos" as any).insert({
      pet_id: albumPet.id, user_id: user.id, url: publicUrl,
    }).select("*").single();
    setUploadingPhoto(false);
    if (insErr) { toast.error("Erreur : " + insErr.message); return; }
    if (inserted) setAlbum(prev => [inserted as any, ...prev]);
    toast.success("Photo ajoutée 🐾");
    if (albumInputRef.current) albumInputRef.current.value = "";
  };

  const handleDeleteAlbumPhoto = async (photo: PetPhoto) => {
    const { error } = await supabase.from("pet_photos" as any).delete().eq("id", photo.id);
    if (error) { toast.error("Erreur"); return; }
    setAlbum(prev => prev.filter(p => p.id !== photo.id));
    toast.success("Photo supprimée");
  };

  const initial = open ? (profile.display_name?.[0] || user?.email?.[0] || "?").toUpperCase() : "?";

  return (
    <>
    <div
      data-panel
      className="fixed z-[600] inset-0 bg-card shadow-2xl flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] rounded-l-2xl"
      style={{
        overflow: "hidden",
        ...(dragProgress !== undefined
          ? { transform: `translateX(${(1 - dragProgress) * 100}%)`, transition: "none" }
          : { transform: open ? "translateX(0%)" : "translateX(100%)" }),
      }}
    >
      <div className={`flex-shrink-0 flex items-center justify-end px-4 py-3 border-b border-border ${isLeftHanded ? "flex-row-reverse" : ""}`}>
        <button onClick={onClose} className="p-1.5 rounded-full hover:bg-muted transition-colors">
          <X className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      <Tabs value={activeMainTab} onValueChange={setActiveMainTab} className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <div className="flex-1 min-h-0 overflow-y-auto" style={{ touchAction: "pan-y" }}>

          {/* ── PROFIL ── */}
          <TabsContent value="profile" className="p-4 space-y-4">
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-8">Chargement…</p>
            ) : showLeaderboard ? (
              /* ── LEADERBOARD ── */
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowLeaderboard(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <h3 className="font-semibold text-foreground text-sm">🏆 Classement des contributeurs</h3>
                </div>
                {loadingLeader ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Chargement…</p>
                ) : (
                  <div className="space-y-2">
                    {leaderboard.map((entry, i) => {
                      const lvl = getLevel(entry.points);
                      const isMe = entry.id === user?.id;
                      return (
                        <div key={entry.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${isMe ? "bg-primary/5 border-primary/30" : "bg-secondary border-border"}`}>
                          <span className={`text-sm font-bold w-6 text-center shrink-0 ${i === 0 ? "text-yellow-500" : i === 1 ? "text-slate-400" : i === 2 ? "text-amber-600" : "text-muted-foreground"}`}>
                            {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}
                          </span>
                          <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0 border border-border">
                            {entry.avatar_url ? <img src={entry.avatar_url} alt="" className="w-full h-full object-cover" /> : <span className="text-base">{lvl.emoji}</span>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{entry.display_name || "Utilisateur"}{isMe ? " (moi)" : ""}</p>
                            <p className={`text-[10px] font-medium ${lvl.color}`}>{lvl.emoji} {lvl.label}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-bold text-foreground">{entry.points}</p>
                            <p className="text-[10px] text-muted-foreground">pts</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Avatar */}
                <div className="flex flex-col items-center gap-3">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt="Avatar" className="w-24 h-24 rounded-full object-cover border-2 border-border" />
                  ) : (
                    <div className="w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-bold" style={{ backgroundColor: "#FF6B35" }}>
                      {initial}
                    </div>
                  )}
                  <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                  <Button variant="outline" size="sm" className="gap-2" disabled={uploadingAvatar} onClick={() => avatarInputRef.current?.click()}>
                    <Upload className="w-3.5 h-3.5" />
                    {uploadingAvatar ? "Envoi…" : "Changer la photo"}
                  </Button>
                </div>

                {/* Niveau & progression */}
                {(() => {
                  const lvl = getLevel(profile.points);
                  const progress = getLevelProgress(profile.points);
                  const nextLvl = LEVELS[LEVELS.indexOf(lvl) + 1];
                  return (
                    <div className={`p-4 rounded-xl border ${lvl.bg} border-border space-y-3`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className={`text-lg font-extrabold ${lvl.color}`}>{lvl.emoji} {lvl.label}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                            <span className="text-sm font-bold text-foreground">{profile.points} pts</span>
                            {nextLvl && <span className="text-xs text-muted-foreground">/ {nextLvl.min} pour {nextLvl.emoji} {nextLvl.label}</span>}
                          </div>
                        </div>
                        <button
                          onClick={() => { setShowLeaderboard(true); if (leaderboard.length === 0) fetchLeaderboard(); }}
                          className="flex flex-col items-center gap-0.5 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <Trophy className="w-5 h-5 text-yellow-500" />
                          <span className="text-[9px] text-muted-foreground">Classement</span>
                        </button>
                      </div>
                      {nextLvl && (
                        <div className="space-y-1">
                          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all ${lvl.bar}`} style={{ width: `${progress}%` }} />
                          </div>
                          <p className="text-[10px] text-muted-foreground text-right">{progress}%</p>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Streak widget */}
                {profile.streak_current > 0 && (() => {
                  const today = new Date().toISOString().slice(0, 10);
                  const streakToday = profile.streak_last_date === today;
                  const mult = profile.streak_current >= 100 ? "x3 🔥" : profile.streak_current >= 30 ? "x2 🔥" : profile.streak_current >= 7 ? "x1.5 🔥" : null;
                  return (
                    <div className="rounded-xl overflow-hidden border border-border">
                      <div className="px-4 py-3 flex items-center gap-3" style={{ background: "linear-gradient(135deg,#FF6B35 0%,#FF3D00 100%)" }}>
                        <div className="relative shrink-0">
                          <span className="text-3xl" style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,.3))" }}>🔥</span>
                          {mult && <span className="absolute -bottom-1 -right-2 text-[8px] font-black bg-yellow-400 text-yellow-900 px-1 rounded-full leading-tight whitespace-nowrap">{mult}</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-extrabold text-sm">{profile.streak_current} jour{profile.streak_current > 1 ? "s" : ""} de série{streakToday ? " ✓" : ""}</p>
                          <p className="text-white/70 text-[10px] mt-0.5">Record : {profile.streak_max}j{profile.streak_shield_available ? "  •  🛡️ Bouclier disponible" : ""}</p>
                        </div>
                        {!streakToday && <span className="text-[10px] font-bold bg-white/20 text-white px-2 py-1 rounded-full shrink-0 animate-pulse">En danger !</span>}
                      </div>
                      <div className="bg-muted/60 px-4 py-2 flex items-center gap-3">
                        {[7, 30, 100, 365].map(m => (
                          <div key={m} className="flex items-center gap-1">
                            <div className={`w-2 h-2 rounded-full ${profile.streak_max >= m ? "bg-orange-500" : "bg-border"}`} />
                            <span className={`text-[9px] font-semibold ${profile.streak_max >= m ? "text-orange-500" : "text-muted-foreground"}`}>{m}j</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Badges */}
                {(() => {
                  const allBadges = [
                    { label: "Premier avis",  emoji: "🐾", desc: "1 avis",            unlocked: reviewCount >= 1,       cat: "Action" },
                    { label: "Critique",       emoji: "📝", desc: "10 avis",           unlocked: reviewCount >= 10,      cat: "Action" },
                    { label: "Connaisseur",    emoji: "🗺️", desc: "50 avis",           unlocked: reviewCount >= 50,      cat: "Action" },
                    { label: "Bâtisseur",      emoji: "📍", desc: "1 lieu approuvé",   unlocked: approvedSubCount >= 1,  cat: "Action" },
                    { label: "Architecte",     emoji: "🏛️", desc: "5 lieux",           unlocked: approvedSubCount >= 5,  cat: "Action" },
                    { label: "Veilleur",       emoji: "🆘", desc: "1 signalement",      unlocked: strayCount >= 1,        cat: "Action" },
                    { label: "Aventurier",     emoji: "🌟", desc: "500 pts",           unlocked: profile.points >= 500,  cat: "Points" },
                    { label: "Héros",          emoji: "🦁", desc: "1 000 pts",         unlocked: profile.points >= 1000, cat: "Points" },
                    { label: "Légende",        emoji: "💎", desc: "1 500 pts",         unlocked: profile.points >= 1500, cat: "Points" },
                    { label: "Régulier",       emoji: "🔥",  desc: "Série 7j",         unlocked: profile.streak_max >= 7,   cat: "Série" },
                    { label: "Assidu",         emoji: "🔥🔥",desc: "Série 30j",        unlocked: profile.streak_max >= 30,  cat: "Série" },
                    { label: "Inarrêtable",    emoji: "💫", desc: "Série 100j",        unlocked: profile.streak_max >= 100, cat: "Série" },
                    { label: "Légendaire",     emoji: "👑", desc: "Série 365j",        unlocked: profile.streak_max >= 365, cat: "Série" },
                  ];
                  return (
                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Badges</p>
                      {(["Action", "Points", "Série"] as const).map(cat => (
                        <div key={cat} className="space-y-1.5">
                          <p className="text-[10px] font-semibold text-muted-foreground/70 uppercase tracking-wider">{cat}</p>
                          <div className="grid grid-cols-4 gap-1.5">
                            {allBadges.filter(b => b.cat === cat).map(b => (
                              <div key={b.label} className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-center transition-all ${b.unlocked ? "bg-gradient-to-b from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-amber-200/60 dark:border-amber-700/40" : "opacity-35 bg-muted border-transparent"}`}>
                                <span className="text-xl leading-none">{b.emoji}</span>
                                <p className="text-[9px] font-semibold text-foreground leading-tight">{b.label}</p>
                                <p className="text-[8px] text-muted-foreground leading-tight">{b.desc}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {/* Champs profil */}
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-foreground">Nom affiché</label>
                    <Input value={profile.display_name} onChange={(e) => setProfile(p => ({ ...p, display_name: e.target.value }))} placeholder="Ton prénom" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-foreground">Ville</label>
                      <Input value={profile.city} onChange={(e) => setProfile(p => ({ ...p, city: e.target.value }))} placeholder="Paris…" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-foreground">Âge</label>
                      <Input type="number" min={0} value={profile.age ?? ""} onChange={(e) => setProfile(p => ({ ...p, age: e.target.value === "" ? null : Number(e.target.value) }))} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-foreground">Bio</label>
                    <Textarea value={profile.bio} onChange={(e) => setProfile(p => ({ ...p, bio: e.target.value }))} rows={3} placeholder="Parle un peu de toi et de tes compagnons…" />
                  </div>
                </div>

                {/* Préférence de main */}
                <div className="p-4 rounded-xl bg-secondary border border-border space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🖐️</span>
                    <p className="text-xs font-semibold text-foreground">Main dominante</p>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">Si tu es gaucher, les boutons d'action (recherche, ajout de lieu, signalement…) se déplacent sur le côté gauche de l'écran.</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsLeftHanded(false)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border text-xs font-semibold transition-colors ${
                        !isLeftHanded ? "bg-primary/10 border-primary text-primary" : "border-border text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      🤚 Droitier
                    </button>
                    <button
                      onClick={() => setIsLeftHanded(true)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border text-xs font-semibold transition-colors ${
                        isLeftHanded ? "bg-primary/10 border-primary text-primary" : "border-border text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      🤚 Gaucher
                    </button>
                  </div>
                </div>

                {/* Alertes de zone — accès rapide vers l'onglet Notifications */}
                <button
                  onClick={() => setActiveMainTab("notifications")}
                  className="w-full p-4 rounded-xl bg-secondary border border-border text-left hover:bg-muted transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-primary" />
                      <p className="text-xs font-semibold text-foreground">Alertes de zone</p>
                    </div>
                    <span className="text-xs text-primary font-medium">
                      {profile.alert_radius_km ? `${profile.alert_radius_km} km →` : "Configurer →"}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {profile.alert_radius_km
                      ? `Notifications activées dans un rayon de ${profile.alert_radius_km} km`
                      : "Configure ton rayon d'alerte dans l'onglet Notifications"}
                  </p>
                </button>

                {saving && (
                  <p className="text-center text-[11px] text-muted-foreground animate-pulse">💾 Sauvegarde…</p>
                )}

                {/* ── Déconnexion + Admin ── */}
                <div className="pt-4 border-t border-border space-y-2 mt-4">
                  {isAdmin && (
                    <button
                      onClick={() => { window.location.href = "/admin"; }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border hover:bg-muted transition-colors text-sm font-medium text-foreground"
                    >
                      <span>⚙️</span> Administration
                    </button>
                  )}
                  <button
                    onClick={async () => { await signOut(); onClose(); }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl border border-destructive/30 text-destructive hover:bg-destructive/5 transition-colors text-sm font-medium"
                  >
                    Se déconnecter
                  </button>
                </div>
              </>
            )}
          </TabsContent>

          {/* ── ANIMAUX ── */}
          <TabsContent value="pets" className="p-4">

            {/* VUE LISTE */}
            {petView === "list" && (
              <div className="space-y-3">
                {loading && <p className="text-sm text-muted-foreground text-center py-8">Chargement…</p>}

                {!loading && pets.length === 0 && (
                  <div className="text-center py-12 space-y-2">
                    <p className="text-4xl">🐾</p>
                    <p className="text-sm text-muted-foreground">Aucun animal pour le moment</p>
                    <p className="text-xs text-muted-foreground">Ajoute ton premier compagnon !</p>
                  </div>
                )}

                {pets.map(pet => (
                  <div key={pet.id} className="bg-secondary border border-border rounded-xl p-3 space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="shrink-0">
                        {pet.avatar_url ? (
                          <img src={pet.avatar_url} alt={pet.name} className="w-14 h-14 rounded-full object-cover border border-border" />
                        ) : (
                          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center text-2xl border border-border">
                            {getSpeciesEmoji(pet.species)}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-semibold text-foreground text-sm truncate">{pet.name}</p>
                          {pet.size_class && (
                            <span className="text-sm">{SIZE_OPTIONS.find(s => s.value === pet.size_class)?.emoji}</span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {getSpeciesEmoji(pet.species)} {getSpeciesLabel(pet.species)}
                          {pet.breed ? ` · ${pet.breed}` : ""}
                          {pet.color ? ` · ${pet.color}` : ""}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {pet.sex === "M" ? "♂ Mâle" : pet.sex === "F" ? "♀ Femelle" : ""}
                          {pet.sex && pet.birth_date ? " · " : ""}
                          {getAge(pet.birth_date)}
                        </p>
                        {(pet.is_vaccinated || pet.is_sterilized || pet.is_microchipped) && (
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {pet.is_vaccinated && <span className="text-[9px] bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 px-1.5 py-0.5 rounded-full font-medium">💉 Vacciné</span>}
                            {pet.is_sterilized && <span className="text-[9px] bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 px-1.5 py-0.5 rounded-full font-medium">✂️ Stérilisé</span>}
                            {pet.is_microchipped && <span className="text-[9px] bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 px-1.5 py-0.5 rounded-full font-medium">📡 Pucé</span>}
                          </div>
                        )}
                        {pet.personality_tags && pet.personality_tags.length > 0 && (
                          <div className="flex gap-1 mt-1 flex-wrap">
                            {pet.personality_tags.slice(0, 3).map(tag => (
                              <span key={tag} className="text-[9px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">{tag}</span>
                            ))}
                            {pet.personality_tags.length > 3 && (
                              <span className="text-[9px] text-muted-foreground">+{pet.personality_tags.length - 3}</span>
                            )}
                          </div>
                        )}
                        {pet.bio && <p className="text-xs text-muted-foreground italic truncate mt-0.5">"{pet.bio}"</p>}
                      </div>
                    </div>
                    <div className="flex gap-1.5 pt-0.5">
                      <button onClick={() => openVisited(pet)} className="flex-1 text-xs text-muted-foreground hover:text-foreground py-1.5 rounded-lg hover:bg-muted transition-colors text-center">🗺️ Visités</button>
                      <button onClick={() => openAlbum(pet)} className="flex-1 text-xs text-muted-foreground hover:text-foreground py-1.5 rounded-lg hover:bg-muted transition-colors text-center">📷 Album</button>
                      <button onClick={() => openEditPet(pet)} className="flex-1 text-xs text-muted-foreground hover:text-foreground py-1.5 rounded-lg hover:bg-muted transition-colors text-center">✏️ Modifier</button>
                      <button onClick={() => handleDeletePet(pet)} className="flex-1 text-xs text-destructive hover:bg-destructive/10 py-1.5 rounded-lg transition-colors text-center">🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* VUE FORMULAIRE */}
            {petView === "form" && (
              <div className="space-y-4" style={{ touchAction: "pan-y" }}>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPetView("list")} className="text-muted-foreground hover:text-foreground transition-colors">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <h3 className="font-semibold text-foreground text-sm">
                    {editingPet ? `Modifier · ${editingPet.name}` : "Nouvel animal"}
                  </h3>
                </div>

                {/* Avatar */}
                <div className="flex flex-col items-center gap-2">
                  {editingPet ? (
                    <>
                      {pets.find(p => p.id === editingPet.id)?.avatar_url ? (
                        <img src={pets.find(p => p.id === editingPet.id)!.avatar_url!} alt={editingPet.name} className="w-20 h-20 rounded-full object-cover border-2 border-border" />
                      ) : (
                        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center text-3xl border-2 border-border">
                          {getSpeciesEmoji(editingPet.species)}
                        </div>
                      )}
                      <input ref={petAvatarInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleUploadPetAvatar(e, editingPet)} />
                      <Button variant="outline" size="sm" className="gap-2 text-xs" disabled={uploadingPetAvatar} onClick={() => petAvatarInputRef.current?.click()}>
                        <Camera className="w-3 h-3" />
                        {uploadingPetAvatar ? "Envoi…" : "Changer la photo"}
                      </Button>
                    </>
                  ) : (
                    <>
                      {newPetAvatarPreview ? (
                        <img src={newPetAvatarPreview} alt="Aperçu" className="w-20 h-20 rounded-full object-cover border-2 border-primary" />
                      ) : (
                        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center text-3xl border-2 border-dashed border-border">
                          {getSpeciesEmoji(petForm.species)}
                        </div>
                      )}
                      <input ref={newPetAvatarInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (!ALLOWED_IMAGE_TYPES.includes(file.type)) { toast.error("Format non supporté (JPEG, PNG, WebP)"); return; }
                        if (file.size > 5 * 1024 * 1024) { toast.error("Photo trop lourde (max 5 Mo)"); return; }
                        setNewPetAvatar(file);
                        setNewPetAvatarPreview(URL.createObjectURL(file));
                      }} />
                      <Button variant="outline" size="sm" className="gap-2 text-xs" onClick={() => newPetAvatarInputRef.current?.click()}>
                        <Camera className="w-3 h-3" />
                        {newPetAvatarPreview ? "Changer" : "Ajouter une photo"}
                      </Button>
                    </>
                  )}
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground">Nom *</label>
                  <Input value={petForm.name} onChange={(e) => setPetForm(f => ({ ...f, name: e.target.value }))} placeholder="Rex, Luna, Noisette…" />
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground mb-2 block">Espèce *</label>
                  <div className="grid grid-cols-3 gap-2">
                    {SPECIES_OPTIONS.map(s => (
                      <button
                        key={s.value}
                        onClick={() => setPetForm(f => ({ ...f, species: s.value }))}
                        className={`py-2 px-3 rounded-lg border text-xs font-medium transition-colors flex flex-col items-center gap-1 ${
                          petForm.species === s.value
                            ? "bg-primary/10 border-primary text-primary"
                            : "border-border text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        <span className="text-lg">{s.emoji}</span>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-foreground">Race</label>
                    <Input value={petForm.breed} onChange={(e) => setPetForm(f => ({ ...f, breed: e.target.value }))} placeholder="Golden, Siamois…" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-foreground mb-2 block">Sexe</label>
                    <div className="flex gap-2">
                      {[{ v: "M", l: "♂ Mâle" }, { v: "F", l: "♀ Femelle" }].map(s => (
                        <button
                          key={s.v}
                          onClick={() => setPetForm(f => ({ ...f, sex: f.sex === s.v ? "" : s.v }))}
                          className={`flex-1 py-2 text-xs rounded-lg border font-medium transition-colors ${
                            petForm.sex === s.v
                              ? "bg-primary/10 border-primary text-primary"
                              : "border-border text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          {s.l}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground">Date de naissance</label>
                  <Input
                    type="date"
                    value={petForm.birth_date}
                    onChange={(e) => setPetForm(f => ({ ...f, birth_date: e.target.value }))}
                    max={new Date().toISOString().split("T")[0]}
                  />
                  {petForm.birth_date && (
                    <p className="text-xs text-primary mt-1">🎂 {getAge(petForm.birth_date)}</p>
                  )}
                </div>

                {/* Taille */}
                <div>
                  <label className="text-xs font-medium text-foreground mb-2 block">Taille</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {SIZE_OPTIONS.map(s => (
                      <button
                        key={s.value}
                        onClick={() => setPetForm(f => ({ ...f, size_class: f.size_class === s.value ? "" : s.value }))}
                        className={`py-2 px-1 rounded-lg border text-center transition-colors flex flex-col items-center gap-0.5 ${
                          petForm.size_class === s.value
                            ? "bg-primary/10 border-primary text-primary"
                            : "border-border text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        <span className="text-base">{s.emoji}</span>
                        <span className="text-[9px] font-semibold leading-none">{s.label}</span>
                        <span className="text-[8px] text-muted-foreground leading-none">{s.sub}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Couleur */}
                <div>
                  <label className="text-xs font-medium text-foreground">Couleur / robe</label>
                  <Input value={petForm.color} onChange={(e) => setPetForm(f => ({ ...f, color: e.target.value }))} placeholder="Fauve, noir et blanc, tigré…" />
                </div>

                {/* Personnalité */}
                <div>
                  <label className="text-xs font-medium text-foreground mb-2 block">Personnalité</label>
                  <div className="flex flex-wrap gap-1.5">
                    {PERSONALITY_OPTIONS.map(tag => (
                      <button
                        key={tag}
                        onClick={() => setPetForm(f => ({
                          ...f,
                          personality_tags: f.personality_tags.includes(tag)
                            ? f.personality_tags.filter(t => t !== tag)
                            : [...f.personality_tags, tag],
                        }))}
                        className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                          petForm.personality_tags.includes(tag)
                            ? "bg-primary/10 border-primary text-primary font-medium"
                            : "border-border text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Santé */}
                <div>
                  <label className="text-xs font-medium text-foreground mb-2 block">Santé</label>
                  <div className="grid grid-cols-3 gap-2">
                    {([
                      { key: "is_vaccinated" as const, label: "Vacciné", emoji: "💉", active: "bg-green-100 border-green-500 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
                      { key: "is_sterilized" as const, label: "Stérilisé", emoji: "✂️", active: "bg-blue-100 border-blue-500 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
                      { key: "is_microchipped" as const, label: "Pucé", emoji: "📡", active: "bg-purple-100 border-purple-500 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" },
                    ] as const).map(item => (
                      <button
                        key={item.key}
                        onClick={() => setPetForm(f => ({ ...f, [item.key]: !f[item.key] }))}
                        className={`py-2.5 px-2 rounded-lg border text-center transition-colors flex flex-col items-center gap-0.5 ${
                          petForm[item.key] ? item.active : "border-border text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        <span className="text-base">{item.emoji}</span>
                        <span className="text-[10px] font-semibold">{item.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground">Bio</label>
                  <Textarea
                    value={petForm.bio}
                    onChange={(e) => setPetForm(f => ({ ...f, bio: e.target.value }))}
                    rows={2}
                    placeholder="Adore les terrasses, craint les orages…"
                  />
                </div>

                {/* Album photos — uniquement en mode édition */}
                {editingPet && (
                  <div className="space-y-3 pt-3 border-t border-border">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-foreground">📷 Album photos</label>
                      <button
                        disabled={uploadingPhoto}
                        onClick={() => albumInputRef.current?.click()}
                        className="flex items-center gap-1 text-xs text-primary font-semibold px-3 py-1.5 rounded-full border border-primary/40 hover:bg-primary/10 transition-colors disabled:opacity-50"
                      >
                        <Plus className="w-3 h-3" />
                        {uploadingPhoto ? "Envoi…" : "Ajouter"}
                      </button>
                      <input ref={albumInputRef} type="file" accept="image/*" className="hidden" onChange={handleAddAlbumPhoto} />
                    </div>

                    {loadingAlbum ? (
                      <p className="text-xs text-muted-foreground text-center py-3">Chargement…</p>
                    ) : album.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-3">Aucune photo dans l'album — appuyez sur Ajouter ↗</p>
                    ) : (
                      <div className="grid grid-cols-3 gap-1.5">
                        {album.map(photo => (
                          <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden border border-border bg-muted">
                            <img src={photo.url} alt="" className="w-full h-full object-cover" />
                            <button
                              onClick={() => handleDeleteAlbumPhoto(photo)}
                              className="absolute top-1 right-1 w-6 h-6 rounded-full bg-destructive/90 text-white flex items-center justify-center"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" className="flex-1" onClick={() => { setPetView("list"); setAlbumPet(null); setAlbum([]); }}>Annuler</Button>
                  <Button className="flex-1 bg-primary text-primary-foreground" disabled={savingPet} onClick={handleSavePet}>
                    {savingPet ? "Enregistrement…" : editingPet ? "✅ Mettre à jour" : "✅ Ajouter"}
                  </Button>
                </div>
              </div>
            )}

            {/* VUE ALBUM */}
            {petView === "album" && albumPet && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <button onClick={() => { setPetView("list"); setAlbumPet(null); setAlbum([]); }} className="text-muted-foreground hover:text-foreground transition-colors">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="flex items-center gap-2">
                    {albumPet.avatar_url ? (
                      <img src={albumPet.avatar_url} alt={albumPet.name} className="w-8 h-8 rounded-full object-cover border border-border" />
                    ) : (
                      <span className="text-xl">{getSpeciesEmoji(albumPet.species)}</span>
                    )}
                    <h3 className="font-semibold text-foreground text-sm">Album · {albumPet.name}</h3>
                  </div>
                </div>

                <div className="flex gap-2">
                  <input ref={petAvatarInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleUploadPetAvatar(e, albumPet)} />
                  <input ref={albumInputRef} type="file" accept="image/*" className="hidden" onChange={handleAddAlbumPhoto} />
                  <Button variant="outline" size="sm" className="flex-1 gap-1 text-xs" disabled={uploadingPetAvatar} onClick={() => petAvatarInputRef.current?.click()}>
                    <Camera className="w-3 h-3" />
                    {uploadingPetAvatar ? "Envoi…" : "Photo de profil"}
                  </Button>
                  <Button size="sm" className="flex-1 gap-1 text-xs bg-primary text-primary-foreground" disabled={uploadingPhoto} onClick={() => albumInputRef.current?.click()}>
                    <Plus className="w-3 h-3" />
                    {uploadingPhoto ? "Envoi…" : "Ajouter une photo"}
                  </Button>
                </div>

                {loadingAlbum && <p className="text-sm text-muted-foreground text-center py-6">Chargement…</p>}

                {!loadingAlbum && album.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">Aucune photo dans l'album 📷</p>
                )}

                {album.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {album.map(photo => (
                      <div key={photo.id} className="relative group rounded-xl overflow-hidden border border-border aspect-square bg-muted">
                        <img src={photo.url} alt="Photo animal" className="w-full h-full object-cover" />
                        <button
                          onClick={() => handleDeleteAlbumPhoto(photo)}
                          className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-destructive/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* VUE LIEUX VISITÉS */}
            {petView === "visited" && visitedPet && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <button onClick={() => { setPetView("list"); setVisitedPet(null); setVisitedPlaces([]); }} className="text-muted-foreground hover:text-foreground transition-colors">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="flex items-center gap-2">
                    {visitedPet.avatar_url ? (
                      <img src={visitedPet.avatar_url} alt={visitedPet.name} className="w-8 h-8 rounded-full object-cover border border-border" />
                    ) : (
                      <span className="text-xl">{getSpeciesEmoji(visitedPet.species)}</span>
                    )}
                    <h3 className="font-semibold text-foreground text-sm">Lieux visités · {visitedPet.name}</h3>
                  </div>
                </div>

                {loadingVisited && <p className="text-sm text-muted-foreground text-center py-8">Chargement…</p>}

                {!loadingVisited && visitedPlaces.length === 0 && (
                  <div className="text-center py-12 space-y-2">
                    <p className="text-4xl">🗺️</p>
                    <p className="text-sm text-muted-foreground">Aucun lieu visité pour le moment</p>
                    <p className="text-xs text-muted-foreground">Tague {visitedPet.name} dans tes avis pour voir les lieux ici !</p>
                  </div>
                )}

                {visitedPlaces.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">{visitedPlaces.length} lieu{visitedPlaces.length > 1 ? "x" : ""} visité{visitedPlaces.length > 1 ? "s" : ""}</p>
                    {visitedPlaces.map(place => (
                      <button
                        key={place.id}
                        onClick={() => window.dispatchEvent(new CustomEvent("open-community-reviews", { detail: { placeId: place.id } }))}
                        className="w-full text-left flex gap-3 items-center bg-secondary border border-border rounded-xl p-3 hover:bg-muted transition-colors"
                      >
                        {place.photo_url ? (
                          <img src={place.photo_url} alt={place.name} className="w-14 h-14 rounded-xl object-cover shrink-0 border border-border" />
                        ) : (
                          <div className="w-14 h-14 rounded-xl bg-muted shrink-0 border border-border flex items-center justify-center text-2xl">🐾</div>
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground text-sm truncate">{place.name}</p>
                          <p className="text-xs text-muted-foreground">{place.category}{place.city ? ` · ${place.city}` : ""}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

          </TabsContent>

          {/* ── MES LIEUX ── */}
          <TabsContent value="places" className="p-4 space-y-3">
            {loadingSubmissions ? (
              <p className="text-sm text-muted-foreground text-center py-8">Chargement…</p>
            ) : submissions.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <p className="text-4xl">🗺️</p>
                <p className="text-sm text-muted-foreground">Aucun lieu soumis pour le moment</p>
                <p className="text-xs text-muted-foreground">Contribue à la communauté en ajoutant un lieu pet-friendly !</p>
              </div>
            ) : (
              <PlacesSubTabs submissions={submissions} onClose={onClose} />
            )}
          </TabsContent>

          {/* ── NOTIFICATIONS ── */}
          <TabsContent value="notifications" className="p-4 space-y-5">
            {prefsLoading ? (
              <p className="text-sm text-muted-foreground text-center py-8">Chargement…</p>
            ) : (
              <>
                {/* ── Zone d'alerte ── */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">🌍 Zone d'alerte</p>
                  <div className="p-3 rounded-xl bg-secondary border border-border space-y-3">
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Reçois des notifications pour les événements autour de toi.
                      Appuie sur <span className="font-semibold text-foreground">Localiser</span> sur la carte pour définir ton centre.
                    </p>
                    {/* Rayon */}
                    <div>
                      <p className="text-xs font-semibold text-foreground mb-2">Rayon</p>
                      <div className="flex flex-wrap gap-1.5">
                        {ALERT_RADIUS_OPTIONS.map(opt => (
                          <button
                            key={String(opt.value)}
                            onClick={() => setProfile(p => ({ ...p, alert_radius_km: opt.value }))}
                            className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors ${
                              profile.alert_radius_km === opt.value
                                ? "bg-primary/10 border-primary text-primary"
                                : "border-border text-muted-foreground hover:bg-muted"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                      {profile.alert_radius_km
                        ? <p className="text-[10px] text-primary font-medium mt-1.5">✅ Zone active — {profile.alert_radius_km} km à la ronde</p>
                        : <p className="text-[10px] text-muted-foreground mt-1.5">Alertes de zone désactivées</p>
                      }
                    </div>
                    {/* Toggles événements — seulement si rayon actif */}
                    {profile.alert_radius_km && (
                      <div className="space-y-1.5 pt-1 border-t border-border">
                        <p className="text-xs font-semibold text-foreground pt-1">M'alerter pour :</p>
                        {([
                          { key: "notif_new_place_zone",     icon: "📍", label: "Nouveau lieu publié",   desc: `Dans un rayon de ${profile.alert_radius_km} km` },
                          { key: "notif_place_updated_zone", icon: "✏️", label: "Lieu modifié",           desc: `Dans un rayon de ${profile.alert_radius_km} km` },
                          { key: "notif_lost_pet_zone",      icon: "🆘", label: "Animal perdu",           desc: `Dans un rayon de ${profile.alert_radius_km} km` },
                          { key: "notif_new_stray_zone",     icon: "🚨", label: "Animal errant",          desc: `Dans un rayon de ${profile.alert_radius_km} km` },
                        ] as const).map(({ key, icon, label, desc }) => (
                          <NotifToggleRow
                            key={key}
                            icon={icon} label={label} desc={desc}
                            enabled={prefs[key]}
                            onToggle={() => updatePref(key, !prefs[key])}
                            variant="user"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Notifications personnelles ── */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Mes notifications</p>
                  {([
                    { key: "notif_messages",               icon: "💬", label: "Messages",          desc: "Nouveaux messages reçus" },
                    { key: "notif_submission_approved",    icon: "✅", label: "Lieu approuvé",      desc: "Un de mes lieux est validé" },
                    { key: "notif_submission_rejected",    icon: "❌", label: "Lieu refusé",         desc: "Un de mes lieux est rejeté" },
                    { key: "notif_new_review_on_my_place", icon: "⭐", label: "Avis sur mes lieux", desc: "Quelqu'un commente un lieu soumis" },
                  ] as const).map(({ key, icon, label, desc }) => (
                    <NotifToggleRow
                      key={key}
                      icon={icon} label={label} desc={desc}
                      enabled={prefs[key]}
                      onToggle={() => updatePref(key, !prefs[key])}
                      variant="user"
                    />
                  ))}
                </div>

                {/* Section admin */}
                {isAdmin && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wide">⚙️ Administration</p>
                    {([
                      { key: "notif_admin_new_review",        icon: "💬", label: "Nouvel avis posté",        desc: "Un utilisateur publie un commentaire" },
                      { key: "notif_admin_new_place",         icon: "📍", label: "Nouveau lieu soumis",      desc: "Un utilisateur soumet un lieu" },
                      { key: "notif_admin_new_stray",         icon: "🚨", label: "Signalement errant",       desc: "Un animal errant est signalé" },
                      { key: "notif_admin_lost_pet",          icon: "🆘", label: "Animal perdu",             desc: "Un animal perdu est signalé" },
                      { key: "notif_admin_new_user",          icon: "👤", label: "Nouvelle inscription",     desc: "Un nouvel utilisateur crée un compte" },
                      { key: "notif_admin_profile_complete",  icon: "✨", label: "Profil complété",          desc: "Un utilisateur remplit son profil" },
                    ] as const).map(({ key, icon, label, desc }) => (
                      <NotifToggleRow
                        key={key}
                        icon={icon} label={label} desc={desc}
                        enabled={prefs[key]}
                        onToggle={() => updatePref(key, !prefs[key])}
                        variant="admin"
                      />
                    ))}
                  </div>
                )}

                {prefsSaving && (
                  <p className="text-center text-[11px] text-muted-foreground animate-pulse">💾 Sauvegarde…</p>
                )}
              </>
            )}
          </TabsContent>
        </div>

        {/* ── Bouton Ajouter un animal — visible uniquement en vue liste de l'onglet Mes Animaux ── */}
        {activeMainTab === "pets" && petView === "list" && (
          <div className="shrink-0 px-4 pt-2 pb-1 border-t border-border">
            <Button onClick={openCreatePet} className="w-full gap-2 bg-primary text-primary-foreground">
              <Plus className="w-4 h-4" /> Ajouter un animal
            </Button>
          </div>
        )}

        {/* ── Onglets fixes en bas ── */}
        <div className="shrink-0 border-t border-border px-2 py-3">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="profile" className="text-[10px] px-1">Profil</TabsTrigger>
            <TabsTrigger value="pets" className="text-[10px] px-1">Animaux{pets.length > 0 ? ` (${pets.length})` : ""}</TabsTrigger>
            <TabsTrigger value="places" className="text-[10px] px-1">Lieux{submissions.filter(s => s.status === "approved" && !!s.linked_place?.id).length > 0 ? ` (${submissions.filter(s => s.status === "approved" && !!s.linked_place?.id).length})` : ""}</TabsTrigger>
            <TabsTrigger value="notifications" className="text-[10px] px-1">🔔 Notifs</TabsTrigger>
          </TabsList>
        </div>
      </Tabs>
    </div>
    </>
  );
}
