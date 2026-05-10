import React, { useState, useEffect, useRef } from "react";
import { Heart, X, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "sonner";
import PublicProfileModal from "@/components/PublicProfileModal";

export interface PlaceReview {
  author: string;
  avatar?: string | null;
  rating: number;
  text: string;
  time: string;
}

export interface CommunityReview {
  id: string;
  user_id: string;
  rating: number;
  body: string | null;
  visited_with_pet: boolean;
  helpful_count: number;
  is_reported: boolean;
  created_at: string;
  photo_url: string | null;
  has_been_edited: boolean;
  profiles?: { display_name: string | null; avatar_url: string | null };
  review_pets?: { pet_id: string; pets: { id: string; name: string; species: string; avatar_url: string | null } | null }[];
}

interface UserPet {
  id: string;
  name: string;
  species: string;
  avatar_url: string | null;
}

interface MentionSuggestion {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface UniversalPlace {
  name: string;
  address?: string;
  lat: number;
  lng: number;
  category?: string;
  city?: string;
  phone?: string;
  opening_hours?: string;
  rating?: number;
  reviewsTotal?: number;
  website?: string;
  isPetFriendly: boolean;
  types?: string[];
  placeId?: string;
  photos?: string[];
  reviews?: PlaceReview[];
}

function getSafeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const { protocol } = new URL(url);
    return protocol === "http:" || protocol === "https:" ? url : null;
  } catch { return null; }
}

function getSafePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  return /^[0-9\s+\-().]+$/.test(phone.trim()) ? phone.trim() : null;
}

const ADMIN_EMAILS = ["elvin.agd@gmail.com", "artistfx.mp4@gmail.com"];

const isAdminEmail = (email: string | null | undefined) =>
  ADMIN_EMAILS.includes(email?.trim().toLowerCase() ?? "");

const CATEGORY_OPTIONS = [
  { value: "veterinaire", label: "Vétérinaire 🏥" },
  { value: "animalerie", label: "Animalerie 🐾" },
  { value: "parc", label: "Parc & Nature 🌿" },
  { value: "refuge", label: "Refuge 🏠" },
  { value: "toiletteur", label: "Toiletteur ✂️" },
  { value: "pension", label: "Pension 🏡" },
  { value: "educateur", label: "Éducateur canin 🦮" },
  { value: "masseur", label: "Masseur / Ostéo 💆" },
  { value: "pet_sitter", label: "Pet Sitter 🏡" },
  { value: "dog_walker", label: "Dog Walker 🦮" },
  { value: "restaurant", label: "Restaurant 🍽️" },
  { value: "hotel", label: "Hôtel 🛏️" },
  { value: "cafe", label: "Café ☕" },
  { value: "camping", label: "Camping ⛺" },
  { value: "bar", label: "Bar 🍺" },
  { value: "commerce", label: "Commerce 🛍️" },
  { value: "plage", label: "Plage 🏖️" },
  { value: "outdoor", label: "Outdoor 🏕️" },
  { value: "services", label: "Services ❤️" },
  { value: "animalerie", label: "Animalerie 🐾" },
  { value: "other", label: "Autre 📍" },
];

function getPlaceEmoji(place: UniversalPlace): string {
  if (place.isPetFriendly) return "🐾";
  const types = place.types || [];
  if (types.includes("point_on_map")) return "📍";
  if (types.some(t => ["locality", "administrative_area_level_1", "administrative_area_level_2", "sublocality"].includes(t))) return "🏙️";
  if (types.some(t => ["restaurant", "bar", "cafe", "food", "meal_delivery", "meal_takeaway"].includes(t))) return "🍽️";
  if (types.some(t => ["supermarket", "grocery_or_supermarket", "store", "shopping_mall", "clothing_store", "convenience_store"].includes(t))) return "🛒";
  if (types.some(t => ["lodging", "hotel"].includes(t))) return "🏨";
  if (types.some(t => ["hospital", "pharmacy", "doctor", "health"].includes(t))) return "🏥";
  if (types.some(t => ["airport", "train_station", "transit_station", "bus_station"].includes(t))) return "✈️";
  if (types.some(t => ["gas_station"].includes(t))) return "⛽";
  if (types.some(t => ["museum", "tourist_attraction", "church", "park", "amusement_park", "zoo"].includes(t))) return "🏛️";
  return "📍";
}

function getPlaceTypeLabel(place: UniversalPlace): string {
  if (place.isPetFriendly) return `${place.category || "Lieu"} pet-friendly`;
  const types = place.types || [];
  if (types.includes("point_on_map")) return "Point sur la carte";
  if (types.some(t => ["locality"].includes(t))) return "Ville";
  if (types.some(t => ["restaurant"].includes(t))) return "Restaurant";
  if (types.some(t => ["cafe"].includes(t))) return "Café";
  if (types.some(t => ["bar"].includes(t))) return "Bar";
  if (types.some(t => ["supermarket", "grocery_or_supermarket"].includes(t))) return "Supermarché";
  if (types.some(t => ["store", "shopping_mall"].includes(t))) return "Commerce";
  if (types.some(t => ["lodging", "hotel"].includes(t))) return "Hôtel";
  if (types.some(t => ["hospital"].includes(t))) return "Hôpital";
  if (types.some(t => ["pharmacy"].includes(t))) return "Pharmacie";
  if (types.some(t => ["airport"].includes(t))) return "Aéroport";
  if (types.some(t => ["train_station", "transit_station"].includes(t))) return "Gare";
  if (types.some(t => ["gas_station"].includes(t))) return "Station service";
  if (types.some(t => ["museum"].includes(t))) return "Musée";
  if (types.some(t => ["tourist_attraction"].includes(t))) return "Attraction";
  if (types.some(t => ["park"].includes(t))) return "Parc";
  return "Lieu";
}

interface MarkerPopupProps {
  place: UniversalPlace;
  position: { x: number; y: number };
  onSetOrigin: () => void;
  onSetDestination: () => void;
  onShowInfo?: () => void;
  onAddWaypoint?: () => void;
  onToggleFavorite?: () => void;
  isFavorite?: boolean;
  onClose: () => void;
  onReport?: () => void;
  isInDatabase?: boolean;
  dbId?: string;
}

export default function MarkerPopup({
  place, position, onSetOrigin, onSetDestination, onShowInfo, onAddWaypoint, onToggleFavorite, isFavorite, onClose, onReport, isInDatabase, dbId,
}: MarkerPopupProps) {
  const emoji = getPlaceEmoji(place);
  const typeLabel = getPlaceTypeLabel(place);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [expandedReviews, setExpandedReviews] = useState<Record<number, boolean>>({});
  const [fullPhoto, setFullPhoto] = useState<string | null>(null);
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);
  const { user, profile } = useAuthContext();
  const [reviewTab, setReviewTab] = useState<"google" | "community">("google");
  const [communityReviews, setCommunityReviews] = useState<CommunityReview[]>([]);
  const [loadingCR, setLoadingCR] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [localCategory, setLocalCategory] = useState(place.category ?? "other");
  const [savingCategory, setSavingCategory] = useState(false);
  const [newRating, setNewRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [newBody, setNewBody] = useState("");
  const [visitedWithPet, setVisitedWithPet] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [userPets, setUserPets] = useState<UserPet[]>([]);
  const [selectedPetIds, setSelectedPetIds] = useState<string[]>([]);
  const [publicProfileUserId, setPublicProfileUserId] = useState<string | null>(null);
  const [mentionSuggestions, setMentionSuggestions] = useState<MentionSuggestion[]>([]);
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [snap, setSnap] = useState<"half" | "full">("full");
  const [dragDelta, setDragDelta] = useState(0);
  const [visible, setVisible] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const userReview = communityReviews.find(r => r.user_id === user?.id);
  const avgCR = communityReviews.length > 0 ? communityReviews.reduce((s, r) => s + r.rating, 0) / communityReviews.length : 0;

  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const contextIsAdmin = isAdminEmail(user?.email) || profile?.is_admin === true;
    if (contextIsAdmin) {
      setIsAdmin(true);
      return;
    }

    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setIsAdmin(isAdminEmail(data.session?.user?.email));
    }).catch(() => {
      if (mounted) setIsAdmin(false);
    });

    return () => { mounted = false; };
  }, [user?.email, profile?.is_admin]);

  useEffect(() => {
    setLocalCategory(place.category ?? "other");
  }, [place.placeId, place.name, place.category]);

  async function quickSaveCategory(val: string) {
    if (!dbId || val === localCategory) return;
    setSavingCategory(true);
    const { error } = await supabase.from("pet_friendly_places").update({ category: val }).eq("id", dbId);
    setSavingCategory(false);
    if (error) { toast.error("Erreur : " + error.message); return; }
    setLocalCategory(val);
    toast.success("Catégorie modifiée ✓");
  }

  function handleClose() {
    setVisible(false);
    setTimeout(onClose, 320);
  }

  useEffect(() => { setReviewTab(hasGoogleData ? "google" : "community"); setCommunityReviews([]); setNewRating(0); setNewBody(""); setVisitedWithPet(false); setSelectedPetIds([]); setSnap("half"); setDragDelta(0); }, [dbId]);
  useEffect(() => { if (userReview) { setNewRating(userReview.rating); setNewBody(userReview.body ?? ""); setVisitedWithPet(userReview.visited_with_pet); } }, [userReview?.id]);

  useEffect(() => {
    if (user && reviewTab === "community") {
      supabase.from("pets" as any).select("id, name, species, avatar_url").eq("user_id", user.id).order("created_at", { ascending: true })
        .then(({ data }) => { if (data) setUserPets(data as unknown as UserPet[]); });
    }
  }, [user, reviewTab]);

  async function loadCommunityReviews() {
    if (!dbId) return;
    setLoadingCR(true);
    const { data } = await supabase.from("place_reviews")
      .select("*, profiles(display_name, avatar_url), review_pets(pet_id, pets(id, name, species, avatar_url))")
      .eq("place_id", dbId).eq("is_hidden", false).order("created_at", { ascending: false });
    setCommunityReviews((data as CommunityReview[]) || []);
    setLoadingCR(false);
  }
  useEffect(() => { if (reviewTab === "community") loadCommunityReviews(); }, [reviewTab, dbId]);

  async function submitCR() {
    if (!user || !dbId) { toast.error("Connecte-toi pour laisser un avis"); return; }
    if (newRating === 0) { toast.error("Choisis une note"); return; }
    setSubmitting(true);
    let uploadedPhotoUrl: string | null = userReview?.photo_url || null;
    if (photoFile) {
      const ext = photoFile.name.split(".").pop();
      const path = `${dbId}/${user.id}/${Date.now()}.${ext}`;
      const { data: uploadData, error: uploadError } = await supabase.storage.from("review-photos").upload(path, photoFile, { upsert: true });
      if (!uploadError && uploadData) {
        const { data: urlData } = supabase.storage.from("review-photos").getPublicUrl(uploadData.path);
        uploadedPhotoUrl = urlData.publicUrl;
      }
    }
    const isEditing = !!userReview;
    if (isEditing) {
      const { error } = await supabase.from("place_reviews").update({ rating: newRating, body: newBody || null, visited_with_pet: visitedWithPet, photo_url: uploadedPhotoUrl, has_been_edited: true }).eq("id", userReview.id).eq("user_id", user.id);
      if (error) { toast.error("Erreur lors de la publication"); setSubmitting(false); return; }
      await supabase.from("review_pets" as any).delete().eq("review_id", userReview.id);
      if (selectedPetIds.length > 0) {
        await supabase.from("review_pets" as any).insert(selectedPetIds.map(petId => ({ review_id: userReview.id, pet_id: petId })));
      }
    } else {
      const { data: newReview, error } = await supabase.from("place_reviews").insert({ place_id: dbId, user_id: user.id, rating: newRating, body: newBody || null, visited_with_pet: visitedWithPet, photo_url: uploadedPhotoUrl }).select("id").single();
      if (error) { toast.error("Erreur lors de la publication"); setSubmitting(false); return; }
      if (newReview && selectedPetIds.length > 0) {
        await supabase.from("review_pets" as any).insert(selectedPetIds.map(petId => ({ review_id: newReview.id, pet_id: petId })));
      }
      if (newReview && newBody) await processMentions(newReview.id, newBody);
    }
    {
      toast.success(isEditing ? "Avis mis à jour !" : "Avis publié !");
      setShowEditForm(false);
      setPhotoFile(null);
      setPhotoPreview(null);
      setSelectedPetIds([]);
      await loadCommunityReviews();
    }
    setSubmitting(false);
  }
  async function deleteCR(id: string) {
    if (!user) return;
    await supabase.from("place_reviews").delete().eq("id", id).eq("user_id", user.id);
    toast.success("Avis supprimé");
    await loadCommunityReviews();
  }
  async function markHelpfulCR(id: string, _n: number, ownerId: string) {
    if (user?.id === ownerId) return;
    await supabase.rpc("mark_review_helpful", { review_id: id });
    await loadCommunityReviews();
  }
  async function reportCR(id: string) {
    await supabase.rpc("flag_review", { review_id: id });
    toast.success("Signalement envoyé !");
    await loadCommunityReviews();
  }
  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!ALLOWED.includes(file.type)) { toast.error("Format non supporté (JPEG, PNG, WebP)"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Photo trop lourde (max 5 Mo)"); return; }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function processMentions(reviewId: string, body: string) {
    const matches = body.match(/@(\S+)/g);
    if (!matches) return;
    const pseudos = [...new Set(matches.map(m => m.slice(1)))];
    for (const pseudo of pseudos) {
      const { data } = await supabase.from("profiles").select("id, display_name").eq("display_name", pseudo).maybeSingle();
      if (!data || data.id === user?.id) continue;
      await supabase.from("review_mentions" as any).insert({ review_id: reviewId, mentioned_user_id: data.id });
      await supabase.from("user_notifications" as any).insert({
        user_id: data.id,
        type: "mention",
        title: "Tu as été mentionné(e) 🔖",
        message: `Quelqu'un t'a cité dans un avis`,
        related_id: reviewId,
      });
    }
  }

  function handleBodyChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value;
    setNewBody(val);
    const cursor = e.target.selectionStart ?? val.length;
    const textBefore = val.slice(0, cursor);
    const match = textBefore.match(/@(\S*)$/);
    if (match) {
      const q = match[1];
      setShowMentionDropdown(true);
      if (q.length >= 1) {
        supabase.from("profiles").select("id, display_name, avatar_url").ilike("display_name", `${q}%`).limit(5)
          .then(({ data }) => { if (data) setMentionSuggestions(data as MentionSuggestion[]); });
      } else {
        setMentionSuggestions([]);
      }
    } else {
      setShowMentionDropdown(false);
      setMentionSuggestions([]);
    }
  }

  function insertMention(suggestion: MentionSuggestion) {
    const cursor = textareaRef.current?.selectionStart ?? newBody.length;
    const textBefore = newBody.slice(0, cursor);
    const textAfter = newBody.slice(cursor);
    const newText = textBefore.replace(/@(\S*)$/, `@${suggestion.display_name} `) + textAfter;
    setNewBody(newText);
    setShowMentionDropdown(false);
    setMentionSuggestions([]);
    setTimeout(() => textareaRef.current?.focus(), 0);
  }

  function renderMentions(text: string): React.ReactNode {
    const parts = text.split(/(@\S+)/g);
    return parts.map((part, i) =>
      part.startsWith("@") ? (
        <span
          key={i}
          className="text-primary font-semibold cursor-pointer hover:underline"
          onClick={() => {
            const pseudo = part.slice(1);
            supabase.from("profiles").select("id").eq("display_name", pseudo).maybeSingle()
              .then(({ data }) => { if (data) setPublicProfileUserId(data.id); });
          }}
        >{part}</span>
      ) : <span key={i}>{part}</span>
    );
  }

  function timeSince(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "À l'instant";
    if (m < 60) return `Il y a ${m} min`;
    const h = Math.floor(m / 60);
    if (h < 24) return `Il y a ${h}h`;
    return `Il y a ${Math.floor(h / 24)}j`;
  }

  const photos = place.photos || [];
  const reviews = place.reviews || [];
  const hasGoogleData = reviews.length > 0 || !!place.rating;

  const toggleReviewExpand = (i: number) => {
    setExpandedReviews(prev => ({ ...prev, [i]: !prev[i] }));
  };

  const swipeStartX = useRef<number | null>(null);
  const isDragging = useRef(false);
  const dragStartY = useRef(0);
  const dragStartDelta = useRef(0);
  const lastVelocity = useRef(0);
  const lastTouchTime = useRef(0);
  const lastTouchY = useRef(0);

  const baseOffset = snap === "half" ? 52 : 0;
  const currentOffset = Math.max(0, baseOffset + dragDelta);

  function handleDragStart(e: React.TouchEvent) {
    isDragging.current = true;
    dragStartY.current = e.touches[0].clientY;
    dragStartDelta.current = dragDelta;
    lastVelocity.current = 0;
    lastTouchY.current = e.touches[0].clientY;
    lastTouchTime.current = Date.now();
  }

  function handleDragMove(e: React.TouchEvent) {
    if (!isDragging.current) return;
    const dy = e.touches[0].clientY - dragStartY.current;
    const panelH = window.innerHeight - 56;
    const deltaPercent = (dy / panelH) * 100;
    const now = Date.now();
    const dt = now - lastTouchTime.current;
    if (dt > 0) {
      const dyV = e.touches[0].clientY - lastTouchY.current;
      lastVelocity.current = dyV / dt;
    }
    lastTouchY.current = e.touches[0].clientY;
    lastTouchTime.current = now;
    setDragDelta(Math.max(-baseOffset, dragStartDelta.current + deltaPercent));
  }

  function handleDragEnd() {
    isDragging.current = false;
    const velocity = lastVelocity.current;
    const total = baseOffset + dragDelta;
    if (velocity > 0.5) {
      handleClose();
    } else if (velocity < -0.5) {
      setSnap("full"); setDragDelta(0);
    } else {
      if (total > 75) { handleClose(); }
      else if (total > 26) { setSnap("half"); setDragDelta(0); }
      else { setSnap("full"); setDragDelta(0); }
    }
    if (velocity <= 0.5) setDragDelta(0);
  }

  return (
    <>
      {publicProfileUserId && (
        <PublicProfileModal userId={publicProfileUserId} onClose={() => setPublicProfileUserId(null)} />
      )}

      {lightboxPhoto && (
        <div
          className="fixed inset-0 z-[20001] bg-black/85 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setLightboxPhoto(null)}
        >
          <img
            src={lightboxPhoto}
            className="max-w-[92vw] max-h-[88vh] object-contain rounded-xl shadow-2xl"
            onClick={e => e.stopPropagation()}
          />
          <button
            className="absolute top-4 right-5 w-9 h-9 rounded-full bg-white/20 hover:bg-white/40 text-white text-lg flex items-center justify-center transition-colors"
            onClick={() => setLightboxPhoto(null)}
          >✕</button>
        </div>
      )}

      {fullPhoto && (
        <div
          className="fixed inset-0 z-[20000] bg-black/92 flex items-center justify-center cursor-pointer"
          onClick={() => setFullPhoto(null)}
        >
          <img src={fullPhoto} className="max-w-[95vw] max-h-[92vh] object-contain rounded-xl shadow-2xl" />
          <div className="absolute top-4 right-5 text-white text-2xl cursor-pointer">✕</div>
        </div>
      )}

      {/* Bottom sheet */}
      <div
        data-panel="place-detail"
        className="fixed bottom-0 left-0 right-0 z-[500] flex flex-col bg-card rounded-t-2xl shadow-2xl"
        style={{
          height: "calc(100dvh - var(--header-h, 56px))",
          transform: `translateY(${!visible ? 100 : currentOffset}%)`,
          transition: isDragging.current ? "none" : "transform 0.32s cubic-bezier(0.4,0,0.2,1)",
          willChange: "transform",
        }}
      >
        {/* Drag handle + header */}
        <div
          className="flex-shrink-0 cursor-grab active:cursor-grabbing"
          style={{ touchAction: "none" }}
          onTouchStart={handleDragStart}
          onTouchMove={handleDragMove}
          onTouchEnd={handleDragEnd}
        >
          <div className="flex justify-center pt-2.5 pb-1">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
          </div>
          <div className="flex items-center justify-between px-4 py-2 border-b border-border">
            <span className="text-sm font-bold text-foreground">📌 Détails du lieu</span>
            <div className="flex items-center gap-1 shrink-0">
              <button
                className={`flex items-center gap-1.5 px-3 h-7 rounded-full text-xs font-semibold border transition-all ${
                  isFavorite
                    ? "bg-destructive/20 border-destructive/40 text-destructive"
                    : "bg-warning/10 border-warning/40 text-warning hover:bg-warning/20"
                }`}
                onClick={(e) => { e.stopPropagation(); onToggleFavorite?.(); }}
              >
                <Heart className={`w-3.5 h-3.5 ${isFavorite ? "fill-current" : ""}`} />
              </button>
              <button
                onClick={() => setSnap(s => s === "half" ? "full" : "half")}
                className="p-1.5 rounded-full hover:bg-muted transition-colors"
              >
                <ChevronUp className={`w-5 h-5 text-muted-foreground transition-transform duration-300 ${snap === "full" ? "rotate-180" : ""}`} />
              </button>
              <button onClick={handleClose} className="p-1.5 rounded-full hover:bg-muted transition-colors">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
          </div>
        </div>

        {isAdmin && dbId && (
          <div className="shrink-0 flex items-center gap-2 px-4 py-2 border-b border-border bg-primary text-primary-foreground">
            <span className="text-xs font-bold shrink-0">🏷️ Catégorie :</span>
            <select
              value={localCategory}
              disabled={savingCategory}
              onChange={e => quickSaveCategory(e.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-primary-foreground/30 bg-primary-foreground/15 px-2 py-1 text-xs font-semibold text-primary-foreground focus:outline-none disabled:opacity-60"
            >
              {CATEGORY_OPTIONS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              {!CATEGORY_OPTIONS.find(c => c.value === localCategory) && localCategory && (
                <option value={localCategory}>{localCategory}</option>
              )}
            </select>
            {savingCategory && (
              <div className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
            )}
          </div>
        )}

        {/* Scrollable body */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden" style={{ scrollbarWidth: "thin", scrollbarColor: "hsl(var(--border)) transparent" }}>

          {/* 1. Titre du lieu */}
          <div className="px-4 pt-4 pb-2">
            <div className="flex items-start gap-2">
              <span className="text-2xl">{emoji}</span>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-foreground text-lg leading-tight">{place.name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{typeLabel}{place.city ? ` • ${place.city}` : ""}</p>
              </div>
            </div>
          </div>

          {/* 2. Photo carousel */}
          {photos.length > 0 && (
            <div className="relative w-full h-[180px]">
              <img
                src={photos[photoIndex]}
                className="w-full h-full object-cover cursor-pointer"
                onClick={() => setFullPhoto(photos[photoIndex])}
                alt={place.name}
              />
              {photos.length > 1 && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); setPhotoIndex((photoIndex - 1 + photos.length) % photos.length); }}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center text-white"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setPhotoIndex((photoIndex + 1) % photos.length); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center text-white"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {photos.map((_, i) => (
                      <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === photoIndex ? "bg-accent" : "bg-white/30"}`} />
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          <div className="p-4 space-y-4">
            {/* 3. Badge pet-friendly */}
            {place.isPetFriendly && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success/20 text-success text-xs font-semibold">
                🐾 Pet-friendly
              </span>
            )}

            {/* 4. Note Google */}
            {place.rating && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary border border-border">
                <span className="text-2xl font-extrabold text-warning">{place.rating}</span>
                <div>
                  <div className="text-warning text-lg tracking-wide">
                    {"★".repeat(Math.round(place.rating))}{"☆".repeat(5 - Math.round(place.rating))}
                  </div>
                  {place.reviewsTotal ? (
                    <p className="text-xs text-muted-foreground">{place.reviewsTotal.toLocaleString("fr-FR")} avis</p>
                  ) : null}
                </div>
              </div>
            )}

            {/* 5. Infos */}
            <div className="space-y-2">
              {place.opening_hours && (
                <div className="flex gap-2 items-start p-2.5 rounded-lg bg-secondary border border-border">
                  <span className="text-base flex-shrink-0">🕐</span>
                  <span className={`text-xs leading-relaxed ${place.opening_hours.startsWith("🟢") ? "text-success" : "text-muted-foreground"}`}>{place.opening_hours}</span>
                </div>
              )}
              {place.address && (
                <div className="flex gap-2 items-start p-2.5 rounded-lg bg-secondary border border-border">
                  <span className="text-base flex-shrink-0">📍</span>
                  <span className="text-xs text-muted-foreground leading-relaxed">{place.address}</span>
                </div>
              )}
              {place.phone && (
                <div className="flex gap-2 items-center p-2.5 rounded-lg bg-secondary border border-border">
                  <span className="text-base flex-shrink-0">📞</span>
                  {getSafePhone(place.phone)
                    ? <a href={`tel:${getSafePhone(place.phone)}`} className="text-xs text-primary hover:underline">{place.phone}</a>
                    : <span className="text-xs text-muted-foreground">{place.phone}</span>
                  }
                </div>
              )}
              {getSafeUrl(place.website) && (
                <div className="flex gap-2 items-center p-2.5 rounded-lg bg-secondary border border-border">
                  <span className="text-base flex-shrink-0">🌐</span>
                  <a href={getSafeUrl(place.website)!} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline break-all">
                    Site web
                  </a>
                </div>
              )}
            </div>

            {/* 6. Avis — onglets Google / Communauté */}
            <div
              className="pt-2 border-t border-border space-y-3"
              onTouchStart={(e) => { swipeStartX.current = e.touches[0].clientX; }}
              onTouchEnd={(e) => {
                if (swipeStartX.current == null) return;
                const dx = e.changedTouches[0].clientX - swipeStartX.current;
                swipeStartX.current = null;
                if (Math.abs(dx) < 40) return;
                if (dx < 0 && reviewTab === "google" && dbId) setReviewTab("community");
                else if (dx > 0 && reviewTab === "community") setReviewTab("google");
              }}
            >
              {(hasGoogleData || !!dbId) && (
                <div className="flex gap-2 p-1 rounded-xl bg-muted">
                  {hasGoogleData && (
                    <button
                      onClick={() => setReviewTab("google")}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                        reviewTab === "google"
                          ? "bg-amber-400 text-white shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      ⭐ Google{place.rating ? ` · ${place.rating}` : ""}
                    </button>
                  )}
                  {!!dbId && (
                    <button
                      onClick={() => setReviewTab("community")}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                        reviewTab === "community"
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      💬 Communauté{communityReviews.length > 0 ? ` · ${communityReviews.length}` : ""}
                    </button>
                  )}
                </div>
              )}

              {reviewTab === "google" && (reviews.length > 0 ? (
                <div className="space-y-2.5">
                  {reviews.map((r, i) => (
                    <div key={i} className="bg-secondary rounded-xl p-3 border border-border">
                      <div className="flex items-center gap-2 mb-2">
                        {r.avatar ? (
                          <img src={r.avatar} className="w-8 h-8 rounded-full object-cover flex-shrink-0" alt={r.author} />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-sm font-bold flex-shrink-0">
                            {r.author.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">{r.author}</p>
                          <div className="flex items-center gap-1.5">
                            <span className="text-warning text-xs">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                            <span className="text-[10px] text-muted-foreground">{r.time}</span>
                          </div>
                        </div>
                      </div>
                      {r.text && (
                        <p className="text-xs text-muted-foreground leading-relaxed break-words">
                          {r.text.length > 200 && !expandedReviews[i] ? (
                            <>
                              {r.text.substring(0, 200)}...
                              <button onClick={() => toggleReviewExpand(i)} className="text-primary font-semibold ml-1">Lire plus</button>
                            </>
                          ) : (
                            <>
                              {r.text}
                              {r.text.length > 200 && (
                                <button onClick={() => toggleReviewExpand(i)} className="text-primary font-semibold ml-1">Réduire</button>
                              )}
                            </>
                          )}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : <p className="text-xs text-muted-foreground text-center py-2">Aucun avis Google disponible</p>)}

              {reviewTab === "community" && dbId && (
                <div className="space-y-3">
                  {communityReviews.length > 0 && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-warning">{"★".repeat(Math.round(avgCR))}{"☆".repeat(5 - Math.round(avgCR))}</span>
                      <span className="font-semibold text-foreground">{avgCR.toFixed(1)}</span>
                      <span className="text-muted-foreground">({communityReviews.length} avis)</span>
                    </div>
                  )}
                  {loadingCR ? (
                    <p className="text-xs text-muted-foreground text-center py-2">Chargement…</p>
                  ) : communityReviews.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-2">Aucun avis communauté. Sois le premier !</p>
                  ) : (
                    <div className="space-y-2.5">
                      {communityReviews.map(r => (
                        <div key={r.id} className="bg-secondary rounded-xl p-3 border border-border space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              {r.profiles?.avatar_url ? (
                                <img src={r.profiles.avatar_url} className="w-7 h-7 rounded-full object-cover flex-shrink-0" alt="" />
                              ) : (
                                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground text-xs font-bold flex-shrink-0">
                                  {(r.profiles?.display_name?.[0] ?? "?").toUpperCase()}
                                </div>
                              )}
                              <p
                                className="text-xs font-semibold text-foreground truncate cursor-pointer hover:text-primary transition-colors"
                                onClick={() => setPublicProfileUserId(r.user_id)}
                              >{r.profiles?.display_name ?? "Anonyme"}</p>
                            </div>
                            <span className="text-warning text-xs flex-shrink-0">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                          </div>
                          {r.review_pets && r.review_pets.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              {r.review_pets.map(rp => rp.pets && (
                                <span key={rp.pet_id} className="flex items-center gap-1 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                                  {rp.pets.avatar_url
                                    ? <img src={rp.pets.avatar_url} className="w-3.5 h-3.5 rounded-full object-cover" alt="" />
                                    : <span>{rp.pets.species === "dog" ? "🐶" : rp.pets.species === "cat" ? "🐱" : rp.pets.species === "rabbit" ? "🐰" : rp.pets.species === "bird" ? "🐦" : "🐾"}</span>
                                  }
                                  {rp.pets.name}
                                </span>
                              ))}
                            </div>
                          )}
                          {r.visited_with_pet && (!r.review_pets || r.review_pets.length === 0) && (
                            <p className="text-[10px] text-success">🐾 Avec animal</p>
                          )}
                          {r.body && <p className="text-xs text-muted-foreground leading-relaxed break-words">{renderMentions(r.body)}</p>}
                          {r.photo_url && (
                            <img
                              src={r.photo_url}
                              className="w-full object-contain rounded-lg mt-1 cursor-zoom-in max-h-72 bg-muted/20"
                              onClick={() => setLightboxPhoto(r.photo_url!)}
                              alt=""
                            />
                          )}
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[10px] text-muted-foreground">{timeSince(r.created_at)}{r.has_been_edited && " · modifié"}</span>
                            <div className="flex items-center gap-2">
                              <button onClick={() => markHelpfulCR(r.id, r.helpful_count, r.user_id)} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-primary">👍{r.helpful_count > 0 && ` ${r.helpful_count}`}</button>
                              {user && user.id !== r.user_id && r.profiles?.display_name && (
                                <button
                                  onClick={() => {
                                    const pseudo = r.profiles!.display_name!;
                                    setNewBody(prev => `@${pseudo} ${prev}`.trim() + " ");
                                    textareaRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                                    setTimeout(() => textareaRef.current?.focus(), 300);
                                  }}
                                  className="text-[10px] text-muted-foreground hover:text-primary"
                                >💬 Répondre</button>
                              )}
                              {user && user.id !== r.user_id && !r.is_reported && (
                                <button onClick={() => reportCR(r.id)} className="text-[10px] text-muted-foreground hover:text-orange-500">🚩</button>
                              )}
                              {user && user.id === r.user_id && (
                                <button onClick={() => deleteCR(r.id)} className="text-[10px] text-muted-foreground hover:text-destructive">🗑</button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {user ? (
                    <>
                      {userReview && !userReview.has_been_edited && !showEditForm && (
                        <button
                          onClick={() => setShowEditForm(true)}
                          className="w-full py-2 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors"
                        >
                          ✏️ Modifier mon avis (une seule fois)
                        </button>
                      )}
                      {(!userReview || showEditForm) && (
                        <div className="border border-border rounded-xl p-3 space-y-2.5 bg-card">
                          <p className="text-xs font-semibold">{userReview ? "Modifier ton avis (dernière fois)" : "Laisser un avis"}</p>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map(s => (
                              <button key={s} onMouseEnter={() => setHoverRating(s)} onMouseLeave={() => setHoverRating(0)} onClick={() => setNewRating(s)}>
                                <span className={`text-xl ${s <= (hoverRating || newRating) ? "text-warning" : "text-muted-foreground"}`}>★</span>
                              </button>
                            ))}
                          </div>
                          <div className="relative">
                            <textarea
                              ref={textareaRef}
                              value={newBody}
                              onChange={handleBodyChange}
                              placeholder="Ton expérience… utilise @pseudo pour mentionner quelqu'un"
                              rows={2}
                              className="w-full text-xs rounded-lg border border-border bg-muted/40 p-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                            {showMentionDropdown && mentionSuggestions.length > 0 && (
                              <div className="absolute left-0 right-0 top-full mt-1 z-10 bg-card border border-border rounded-xl shadow-xl overflow-hidden">
                                {mentionSuggestions.map(s => (
                                  <button
                                    key={s.id}
                                    type="button"
                                    onMouseDown={e => { e.preventDefault(); insertMention(s); }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-muted transition-colors text-left"
                                  >
                                    {s.avatar_url
                                      ? <img src={s.avatar_url} className="w-6 h-6 rounded-full object-cover flex-shrink-0" alt="" />
                                      : <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground flex-shrink-0">{(s.display_name?.[0] ?? "?").toUpperCase()}</div>
                                    }
                                    <span className="font-semibold text-foreground">{s.display_name}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          <label className="flex items-center gap-2 text-xs cursor-pointer">
                            <input type="checkbox" checked={visitedWithPet} onChange={e => setVisitedWithPet(e.target.checked)} className="rounded" />
                            🐾 Visité avec mon animal
                          </label>
                          {userPets.length > 0 && (
                            <div>
                              <p className="text-xs text-muted-foreground mb-1.5">Avec quels animaux ?</p>
                              <div className="flex flex-wrap gap-1.5">
                                {userPets.map(pet => (
                                  <button
                                    key={pet.id}
                                    type="button"
                                    onClick={() => setSelectedPetIds(prev => prev.includes(pet.id) ? prev.filter(id => id !== pet.id) : [...prev, pet.id])}
                                    className={`flex items-center gap-1 px-2 py-1 rounded-full border text-xs transition-colors ${
                                      selectedPetIds.includes(pet.id) ? "bg-primary/10 border-primary text-primary" : "border-border text-muted-foreground hover:bg-muted"
                                    }`}
                                  >
                                    {pet.avatar_url
                                      ? <img src={pet.avatar_url} className="w-4 h-4 rounded-full object-cover" alt="" />
                                      : <span className="text-xs">{pet.species === "dog" ? "🐶" : pet.species === "cat" ? "🐱" : pet.species === "rabbit" ? "🐰" : pet.species === "bird" ? "🐦" : "🐾"}</span>
                                    }
                                    {pet.name}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                          <div className="space-y-1.5">
                            <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
                              <span className="px-2.5 py-1.5 rounded-lg border border-border bg-muted hover:bg-muted/80 transition-colors">📷 Ajouter une photo</span>
                              <input type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
                            </label>
                            {photoPreview && (
                              <div className="relative w-full rounded-lg overflow-hidden border border-border bg-muted/20">
                                <img src={photoPreview} className="w-full object-contain max-h-64" alt="" />
                                <button onClick={() => { setPhotoFile(null); setPhotoPreview(null); }} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white text-xs flex items-center justify-center">✕</button>
                              </div>
                            )}
                            {!photoPreview && userReview?.photo_url && (
                              <div className="relative w-full rounded-lg overflow-hidden border border-border opacity-60 bg-muted/20">
                                <img src={userReview.photo_url} className="w-full object-contain max-h-48" alt="" />
                                <span className="absolute bottom-1 left-1 text-[10px] bg-black/50 text-white px-1.5 py-0.5 rounded">Photo actuelle</span>
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2">
                            {showEditForm && (
                              <button onClick={() => { setShowEditForm(false); setPhotoFile(null); setPhotoPreview(null); }} className="flex-1 py-2 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:bg-muted transition-colors">
                                Annuler
                              </button>
                            )}
                            <button onClick={submitCR} disabled={submitting || newRating === 0} className="flex-1 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50 hover:bg-primary/90 transition-colors">
                              {submitting ? "Publication…" : userReview ? "Confirmer la modification" : "Publier"}
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : <p className="text-xs text-muted-foreground italic text-center">Connecte-toi pour laisser un avis.</p>}
                </div>
              )}
            </div>

          </div>

          {/* 7. Boutons itinéraire */}
          <div className="px-4 pt-3 pb-2 space-y-2 border-t border-border">
            <div className="grid grid-cols-2 gap-2">
              <button
                className="text-xs h-9 rounded-xl font-semibold text-white flex items-center justify-center gap-1.5 transition-opacity hover:opacity-90 bg-success"
                onClick={(e) => { e.stopPropagation(); onSetOrigin(); }}
              >
                🚩 Point de départ
              </button>
              <button
                className="text-xs h-9 rounded-xl font-semibold text-white flex items-center justify-center gap-1.5 transition-opacity hover:opacity-90 bg-destructive"
                onClick={(e) => { e.stopPropagation(); onSetDestination(); }}
              >
                🏁 Point d'arrivée
              </button>
            </div>
            {onAddWaypoint && (
              <button
                className="w-full text-xs h-10 rounded-xl font-bold text-white flex items-center justify-center gap-1.5 transition-opacity hover:opacity-90 bg-primary"
                onClick={(e) => { e.stopPropagation(); onAddWaypoint(); }}
              >
                ⛳ Ajouter comme étape
              </button>
            )}
          </div>

          {/* 8. Signaler un problème */}
          {onReport && (
            <div className="px-4 pb-4 pt-1">
              <button
                onClick={(e) => { e.stopPropagation(); onReport?.(); }}
                className="w-full text-xs h-9 rounded-xl font-semibold flex items-center justify-center gap-1.5 border border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100 dark:bg-orange-950/30 dark:text-orange-300 dark:border-orange-800 transition-colors"
              >
                ⚠️ Signaler un problème
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

