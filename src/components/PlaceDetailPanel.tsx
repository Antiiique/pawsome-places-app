import { X, Star, Phone, Globe, MapPin, Navigation, Dog, Cat, TreePine, Home, Heart, ChevronLeft, ThumbsUp, Flag, Trash2, Pencil, ChevronUp, ChevronDown, Save, CheckCircle, Camera, Tag, EyeOff, ShieldCheck, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface PetPlace {
  id: string;
  name: string;
  category: string;
  subcategory: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  latitude: number;
  longitude: number;
  phone: string | null;
  website: string | null;
  opening_hours: string | null;
  accepts_dogs: boolean;
  accepts_cats: boolean;
  dogs_on_leash_only: boolean;
  outdoor_seating: boolean;
  rating: number | null;
  description: string | null;
  photo_url: string | null;
  verified: boolean;
  is_flagged?: boolean;
  distance_km?: number;
  google_place_id?: string | null;
}

export interface PlaceReview {
  id: string;
  place_id: string;
  user_id: string;
  rating: number;
  body: string | null;
  visited_with_pet: boolean;
  helpful_count: number;
  is_hidden: boolean;
  is_reported: boolean;
  created_at: string;
  photos: string[] | null;
  profiles?: { display_name: string | null; avatar_url: string | null };
}

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5 Mo

function getSafeUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const { protocol } = new URL(url);
    return protocol === "http:" || protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

function getSafePhone(phone: string | null): string | null {
  if (!phone) return null;
  return /^[0-9\s+\-().]+$/.test(phone.trim()) ? phone.trim() : null;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "À l'instant";
  if (m < 60) return `Il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Il y a ${h}h`;
  const d = Math.floor(h / 24);
  return `Il y a ${d}j`;
}

const categoryLabels: Record<string, string> = {
  restaurant: "Restaurant 🍽️", hotel: "Hôtel 🛏️", outdoor: "Parc & Nature 🌿",
  services: "Services ❤️", animalerie: "Animalerie 🐾", other: "Autre",
};

const categoryBgColors: Record<string, string> = {
  restaurant: "bg-orange-500", hotel: "bg-blue-500", outdoor: "bg-green-500",
  services: "bg-red-500", animalerie: "bg-purple-500", other: "bg-gray-500",
};

const KNOWN_CATEGORIES = [
  "veterinaire","restaurant","hotel","outdoor","parc_chiens","animalerie","pension",
  "toiletteur","educateur","masseur","pet_sitter","dog_walker","camping","plage",
  "loisir","refuge","spa","cafe_animalier","aeroport","aire_repos","transport","evenement","other",
];


const VELOCITY_THRESHOLD = 0.4; // px/ms

interface PlaceDetailPanelProps {
  place: PetPlace | null;
  onClose: () => void;
  onBack?: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onReport?: () => void;
  isClosing?: boolean;
}

const ADMIN_EMAILS = ["elvin.agd@gmail.com", "artistfx.mp4@gmail.com"];

const isAdminEmail = (email: string | null | undefined) =>
  ADMIN_EMAILS.includes(email?.trim().toLowerCase() ?? "");

const CATS = [
  { value: "veterinaire",    label: "Vétérinaires 🏥" },
  { value: "restaurant",     label: "Restaurants 🍽️" },
  { value: "hotel",          label: "Hôtels 🛏️" },
  { value: "outdoor",        label: "Parcs & Nature 🌿" },
  { value: "parc_chiens",    label: "Parcs à chiens 🐕" },
  { value: "animalerie",     label: "Animalerie 🐾" },
  { value: "pension",        label: "Pension 🏠" },
  { value: "toiletteur",     label: "Toiletteurs 🛁" },
  { value: "educateur",      label: "Éducateurs 🎓" },
  { value: "masseur",        label: "Masseurs / Ostéo 💆" },
  { value: "pet_sitter",     label: "Pet Sitters 🏡" },
  { value: "dog_walker",     label: "Dog Walkers 🦮" },
  { value: "camping",        label: "Camping ⛺" },
  { value: "plage",          label: "Plages 🏖️" },
  { value: "loisir",         label: "Loisirs 🎯" },
  { value: "refuge",         label: "Refuges 🏚️" },
  { value: "spa",            label: "SPA 🐾" },
  { value: "cafe_animalier", label: "Cafés animaux ☕" },
  { value: "aeroport",       label: "Aéroports ✈️" },
  { value: "aire_repos",     label: "Aires de repos 🛣️" },
  { value: "transport",      label: "Transport 🚇" },
  { value: "evenement",      label: "Événements 📅" },
  { value: "other",          label: "Autres 📍" },
];

const PlaceDetailPanel = ({ place, onClose, onBack, isFavorite, onToggleFavorite, onReport, isClosing }: PlaceDetailPanelProps) => {
  const { user, profile } = useAuthContext();
  const [isAdmin, setIsAdmin] = useState(false);
  const [localCategory, setLocalCategory] = useState(place?.category ?? "");
  const [savingCategory, setSavingCategory] = useState(false);
  const [localName, setLocalName] = useState(place?.name ?? "");
  const [savingName, setSavingName] = useState(false);
  const [localVerified, setLocalVerified] = useState(place?.verified ?? false);
  const [localFlagged, setLocalFlagged] = useState(place?.is_flagged ?? false);
  const [savingMeta, setSavingMeta] = useState(false);

  useEffect(() => {
    const contextIsAdmin = isAdminEmail(user?.email) || profile?.is_admin === true;
    if (contextIsAdmin) { setIsAdmin(true); return; }
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setIsAdmin(isAdminEmail(data.session?.user?.email));
    }).catch(() => { if (mounted) setIsAdmin(false); });
    return () => { mounted = false; };
  }, [user?.email, profile?.is_admin]);

  useEffect(() => {
    setLocalCategory(place?.category ?? "");
    setLocalName(place?.name ?? "");
    setLocalVerified(place?.verified ?? false);
    setLocalFlagged(place?.is_flagged ?? false);
  }, [place?.id]);

  const quickSaveCategory = async (val: string) => {
    if (!place || val === localCategory) return;
    setSavingCategory(true);
    const { error } = await supabase.from("pet_friendly_places").update({ category: val }).eq("id", place.id);
    setSavingCategory(false);
    if (error) { toast.error("Erreur : " + error.message); return; }
    setLocalCategory(val);
    toast.success("Catégorie modifiée ✓");
  };

  const saveNameInline = async () => {
    const trimmed = localName.trim();
    if (!place || !trimmed || trimmed === place.name) return;
    setSavingName(true);
    const { error } = await supabase.from("pet_friendly_places").update({ name: trimmed }).eq("id", place.id);
    setSavingName(false);
    if (error) { toast.error("Erreur : " + error.message); setLocalName(place.name); return; }
    toast.success("Nom modifié ✓");
  };

  const toggleVerified = async () => {
    if (!place || savingMeta) return;
    setSavingMeta(true);
    const newVal = !localVerified;
    const { error } = await supabase.from("pet_friendly_places").update({ verified: newVal }).eq("id", place.id);
    setSavingMeta(false);
    if (error) { toast.error("Erreur : " + error.message); return; }
    setLocalVerified(newVal);
    toast.success(newVal ? "Lieu marqué vérifié ✓" : "Vérification retirée");
  };

  const toggleFlagged = async () => {
    if (!place || savingMeta) return;
    setSavingMeta(true);
    const newVal = !localFlagged;
    const { error } = await supabase.from("pet_friendly_places").update({ is_flagged: newVal }).eq("id", place.id);
    setSavingMeta(false);
    if (error) { toast.error("Erreur : " + error.message); return; }
    setLocalFlagged(newVal);
    toast.success(newVal ? "Lieu signalé" : "Signalement retiré");
  };

  const handleAdminDelete = async () => {
    if (!place || !window.confirm(`Supprimer "${place.name}" définitivement ?`)) return;
    const { error } = await supabase.from("pet_friendly_places").delete().eq("id", place.id);
    if (error) { toast.error("Erreur : " + error.message); return; }
    toast.success("Lieu supprimé");
    onClose();
  };

  const hideReview = async (reviewId: string) => {
    const { error } = await supabase.from("place_reviews").update({ is_hidden: true }).eq("id", reviewId);
    if (error) { toast.error("Erreur lors du masquage"); return; }
    toast.success("Avis masqué");
    await loadReviews();
  };

  // ── Bottom sheet snap state ──
  const [snap, setSnap] = useState<"half" | "full">("half");
  const [dragDelta, setDragDelta] = useState(0); // percentage offset during drag
  // Refs mirror state so handleDragEnd always reads the latest value,
  // avoiding stale-closure bugs with React 18 batched updates.
  const snapRef = useRef<"half" | "full">("half");
  const dragDeltaRef = useRef(0);
  const isDragging = useRef(false);
  const touchStartY = useRef<number | null>(null);
  const velPrevY = useRef<number | null>(null);
  const velPrevT = useRef<number | null>(null);
  const velCurrY = useRef<number | null>(null);
  const velCurrT = useRef<number | null>(null);

  const setSnapState = (s: "half" | "full") => { snapRef.current = s; setSnap(s); };

  // Reset to half-snap whenever a new place opens
  const [entered, setEntered] = useState(false);
  useEffect(() => {
    snapRef.current = "half"; setSnap("half");
    dragDeltaRef.current = 0; setDragDelta(0);
    setEntered(false);
    const t = setTimeout(() => setEntered(true), 10);
    return () => clearTimeout(t);
  }, [place?.id]);

  useEffect(() => {
    window.dispatchEvent(new Event("map-freeze"));
    return () => { window.dispatchEvent(new Event("map-unfreeze")); };
  }, []);

  const baseOffset = snap === "half" ? 55 : 0; // % translateY
  const currentOffset = isClosing ? 100 : entered ? Math.max(0, baseOffset + dragDelta) : 100;

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

    // Read from refs to guarantee latest values regardless of React batch timing
    const currentSnap = snapRef.current;
    const base = currentSnap === "half" ? 52 : 0;
    const finalOffset = base + dragDeltaRef.current;
    dragDeltaRef.current = 0;
    setDragDelta(0);
    touchStartY.current = null;

    if (vel > VELOCITY_THRESHOLD) {
      // Flick down
      if (currentSnap === "full") setSnapState("half");
      else onClose();
    } else if (vel < -VELOCITY_THRESHOLD) {
      // Flick up
      setSnapState("full");
    } else {
      // Snap by position
      if (finalOffset > 70) onClose();
      else if (finalOffset > 26) setSnapState("half");
      else setSnapState("full");
    }
  };

  // ── Place data state ──
  const [activeTab, setActiveTab] = useState<"google" | "community">("google");
  const [reviews, setReviews] = useState<PlaceReview[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [newRating, setNewRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [newBody, setNewBody] = useState("");
  const [visitedWithPet, setVisitedWithPet] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [adminEditOpen, setAdminEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editForm, setEditForm] = useState<{
    name: string; category: string; subcategory: string; address: string; city: string;
    country: string; phone: string; website: string; opening_hours: string;
    description: string; photo_url: string;
    accepts_dogs: boolean; accepts_cats: boolean; dogs_on_leash_only: boolean;
    outdoor_seating: boolean; water_bowl_provided: boolean; verified: boolean;
  }>({
    name: "", category: "", subcategory: "", address: "", city: "",
    country: "", phone: "", website: "", opening_hours: "",
    description: "", photo_url: "",
    accepts_dogs: false, accepts_cats: false, dogs_on_leash_only: false,
    outdoor_seating: false, water_bowl_provided: false, verified: false,
  });
  const [publisher, setPublisher] = useState<{display_name: string | null; avatar_url: string | null; id: string} | null>(null);

  const userReview = reviews.find(r => r.user_id === user?.id);
  const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  useEffect(() => {
    setActiveTab("google"); setReviews([]); setNewRating(0);
    setNewBody(""); setVisitedWithPet(false); setAdminEditOpen(false);
    setPhotoFiles([]); setPhotoPreviews([]);
  }, [place?.id]);

  useEffect(() => {
    if (!place || !adminEditOpen) return;
    setEditForm({
      name: place.name ?? "", category: place.category ?? "", subcategory: place.subcategory ?? "",
      address: place.address ?? "", city: place.city ?? "", country: place.country ?? "",
      phone: place.phone ?? "", website: place.website ?? "", opening_hours: place.opening_hours ?? "",
      description: place.description ?? "", photo_url: place.photo_url ?? "",
      accepts_dogs: place.accepts_dogs ?? false, accepts_cats: place.accepts_cats ?? false,
      dogs_on_leash_only: place.dogs_on_leash_only ?? false, outdoor_seating: place.outdoor_seating ?? false,
      water_bowl_provided: (place as any).water_bowl_provided ?? false, verified: place.verified ?? false,
    });
    setPublisher(null);
    supabase.from("place_submissions")
      .select("submitted_by, profiles!submitted_by(id, display_name, avatar_url)")
      .ilike("name", place.name)
      .maybeSingle()
      .then(({ data }) => {
        const p = (data as any)?.profiles;
        if (p) setPublisher(p);
      });
  }, [adminEditOpen]);

  async function saveAdminEdit() {
    if (!place) return;
    setEditSaving(true);
    const { error } = await supabase.from("pet_friendly_places").update({
      name: editForm.name, category: editForm.category, subcategory: editForm.subcategory || null,
      address: editForm.address || null, city: editForm.city || null, country: editForm.country || null,
      phone: editForm.phone || null, website: editForm.website || null,
      opening_hours: editForm.opening_hours || null, description: editForm.description || null,
      photo_url: editForm.photo_url || null, accepts_dogs: editForm.accepts_dogs,
      accepts_cats: editForm.accepts_cats, dogs_on_leash_only: editForm.dogs_on_leash_only,
      outdoor_seating: editForm.outdoor_seating, water_bowl_provided: editForm.water_bowl_provided,
      verified: editForm.verified, last_updated: new Date().toISOString(),
    }).eq("id", place.id);
    setEditSaving(false);
    if (error) { toast.error("Erreur : " + error.message); return; }
    toast.success(`✅ "${editForm.name}" mis à jour`);
    setAdminEditOpen(false);
  }

  async function loadReviews() {
    if (!place) return;
    setLoadingReviews(true);
    const { data } = await supabase.from("place_reviews")
      .select("*, profiles(display_name, avatar_url)")
      .eq("place_id", place.id).eq("is_hidden", false)
      .order("created_at", { ascending: false });
    setReviews((data as PlaceReview[]) || []);
    setLoadingReviews(false);
  }

  useEffect(() => { if (activeTab === "community") loadReviews(); }, [activeTab, place?.id]);
  useEffect(() => {
    if (userReview) {
      setNewRating(userReview.rating);
      setNewBody(userReview.body ?? "");
      setVisitedWithPet(userReview.visited_with_pet);
      setPhotoPreviews(userReview.photos ?? []);
      setPhotoFiles([]);
    }
  }, [userReview?.id]);

  async function uploadPhotos(files: File[]): Promise<string[]> {
    const urls: string[] = [];
    for (const file of files) {
      const ext = file.name.split('.').pop() ?? 'jpg';
      const path = `${user!.id}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from('review-photos').upload(path, file);
      if (!error) {
        const { data } = supabase.storage.from('review-photos').getPublicUrl(path);
        urls.push(data.publicUrl);
      }
    }
    return urls;
  }

  async function submitReview() {
    if (!user) { toast.error("Connecte-toi pour laisser un avis"); return; }
    if (newRating === 0) { toast.error("Choisis une note"); return; }
    if (!place) return;
    setSubmitting(true);
    const existingUrls = photoPreviews.filter(p => p.startsWith('http'));
    const uploadedUrls = photoFiles.length > 0 ? await uploadPhotos(photoFiles) : [];
    const allPhotos = [...existingUrls, ...uploadedUrls];
    const payload = { place_id: place.id, user_id: user.id, rating: newRating, body: newBody || null, visited_with_pet: visitedWithPet, photos: allPhotos };
    const { error } = userReview
      ? await supabase.from("place_reviews").update({ rating: newRating, body: newBody || null, visited_with_pet: visitedWithPet, photos: allPhotos }).eq("id", userReview.id).eq("user_id", user.id)
      : await supabase.from("place_reviews").insert(payload);
    if (error) toast.error("Erreur : " + error.message);
    else { toast.success(userReview ? "Avis mis à jour !" : "Avis publié !"); setPhotoFiles([]); await loadReviews(); }
    setSubmitting(false);
  }

  async function deleteReview(reviewId: string) {
    if (!user) return;
    const query = isAdmin
      ? supabase.from("place_reviews").delete().eq("id", reviewId)
      : supabase.from("place_reviews").delete().eq("id", reviewId).eq("user_id", user.id);
    const { error } = await query;
    if (error) { toast.error("Erreur lors de la suppression"); return; }
    toast.success("Avis supprimé");
    await loadReviews();
  }
  async function markHelpful(reviewId: string) {
    await supabase.rpc("mark_review_helpful", { review_id: reviewId });
    await loadReviews();
  }
  async function reportReview(reviewId: string) {
    await supabase.rpc("flag_review", { review_id: reviewId });
    toast.success("Signalement envoyé, merci !"); await loadReviews();
  }

  if (!place) return null;

  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 bg-card rounded-t-2xl shadow-2xl flex flex-col"
      style={{
        height: "100dvh",
        paddingTop: snap === "full" ? "env(safe-area-inset-top)" : 0,
        transform: `translateY(${currentOffset}%)`,
        transition: (isDragging.current && !isClosing) ? "none" : "transform 0.3s cubic-bezier(0.4,0,0.2,1), padding-top 0.3s cubic-bezier(0.4,0,0.2,1)",
        willChange: "transform",
      }}
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

      {/* Header */}
      <div
        className="flex items-center justify-between px-5 pt-3 pb-3 border-b border-border shrink-0"
        onTouchStart={handleDragStart}
        onTouchMove={handleDragMove}
        onTouchEnd={handleDragEnd}
        style={{ touchAction: "none" }}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
          {onBack && (
            <button onClick={onBack} className="p-1.5 rounded-full hover:bg-muted transition-colors shrink-0">
              <ChevronLeft className="w-5 h-5 text-muted-foreground" />
            </button>
          )}
          {isAdmin ? (
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <input
                value={localName}
                onChange={e => setLocalName(e.target.value)}
                onBlur={saveNameInline}
                onKeyDown={e => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                className="font-bold text-lg bg-transparent border-b-2 border-violet-400 focus:outline-none text-foreground w-full min-w-0 focus:border-violet-600"
              />
              {savingName && <div className="w-3 h-3 border-2 border-violet-500 border-t-transparent rounded-full animate-spin shrink-0" />}
            </div>
          ) : (
            <h2 className="font-bold text-lg text-foreground truncate">{place.name}</h2>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {onToggleFavorite && (
            <button onClick={onToggleFavorite} className="p-1.5 rounded-full hover:bg-muted transition-all active:scale-125">
              <Heart className={`w-5 h-5 transition-colors ${isFavorite ? "text-destructive fill-destructive" : "text-muted-foreground"}`} />
            </button>
          )}
          <button onClick={() => setSnapState(snap === "half" ? "full" : "half")} className="p-1.5 rounded-full hover:bg-muted transition-colors">
            <ChevronUp className={`w-5 h-5 text-muted-foreground transition-transform duration-300 ${snap === "full" ? "rotate-180" : ""}`} />
          </button>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-muted transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* ── Barre admin — toujours visible même en half-snap ── */}
      {isAdmin && (
        <div className="shrink-0 border-b border-violet-200 dark:border-violet-800 bg-violet-50 dark:bg-violet-950/30">
          {/* Ligne 1 : Catégorie */}
          <div className="flex items-center gap-2 px-4 pt-2 pb-1">
            <span className="text-xs font-bold text-violet-700 dark:text-violet-300 shrink-0">🏷️</span>
            <select
              value={localCategory}
              disabled={savingCategory}
              onChange={e => quickSaveCategory(e.target.value)}
              className="flex-1 text-xs font-semibold bg-white dark:bg-violet-900/40 border border-violet-300 dark:border-violet-600 rounded-lg px-2 py-1 text-violet-900 dark:text-violet-100 focus:outline-none"
            >
              {CATS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              {!CATS.find(c => c.value === localCategory) && localCategory && (
                <option value={localCategory}>{localCategory}</option>
              )}
            </select>
            {savingCategory && <div className="w-3.5 h-3.5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin shrink-0" />}
          </div>
          {/* Ligne 2 : Vérifié / Signalé / Modifier / Supprimer */}
          <div className="flex items-center gap-1.5 px-4 pb-2">
            <button
              onClick={toggleVerified}
              disabled={savingMeta}
              className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg border font-medium transition-colors ${
                localVerified
                  ? "bg-green-100 border-green-300 text-green-700 dark:bg-green-900/30 dark:border-green-700 dark:text-green-300"
                  : "bg-white border-violet-200 text-violet-500 dark:bg-transparent dark:border-violet-700 dark:text-violet-400 hover:bg-violet-50"
              }`}
            >
              <ShieldCheck className="w-3 h-3" />
              {localVerified ? "Vérifié" : "À vérifier"}
            </button>
            <button
              onClick={toggleFlagged}
              disabled={savingMeta}
              className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg border font-medium transition-colors ${
                localFlagged
                  ? "bg-orange-100 border-orange-300 text-orange-700 dark:bg-orange-900/30 dark:border-orange-700 dark:text-orange-300"
                  : "bg-white border-violet-200 text-violet-500 dark:bg-transparent dark:border-violet-700 dark:text-violet-400 hover:bg-violet-50"
              }`}
            >
              <ShieldAlert className="w-3 h-3" />
              {localFlagged ? "Signalé ⚠️" : "Non signalé"}
            </button>
            {savingMeta && <div className="w-3 h-3 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />}
            <button
              onClick={() => { const next = !adminEditOpen; setAdminEditOpen(next); if (next) setSnapState("full"); }}
              className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg border font-medium transition-colors ${
                adminEditOpen
                  ? "bg-violet-600 border-violet-600 text-white"
                  : "bg-white border-violet-200 text-violet-600 dark:bg-transparent dark:border-violet-700 dark:text-violet-400 hover:bg-violet-50"
              }`}
            >
              <Pencil className="w-3 h-3" />{adminEditOpen ? "Fermer" : "Modifier"}
            </button>
            <button
              onClick={handleAdminDelete}
              className="ml-auto flex items-center gap-1 text-xs px-2 py-1 rounded-lg border border-red-200 bg-white text-red-500 hover:bg-red-50 font-medium transition-colors dark:bg-transparent dark:border-red-800 dark:text-red-400"
            >
              <Trash2 className="w-3 h-3" /> Supprimer
            </button>
          </div>
        </div>
      )}

      {/* Scrollable content — scroll uniquement en mode full comme les autres panels */}
      <div className="flex-1" style={{ overflowY: snap === "full" ? "auto" : "hidden", touchAction: "pan-y" }}>
        {adminEditOpen ? (
          <div className="p-4 space-y-4">
            {publisher ? (
              <button
                onClick={() => window.dispatchEvent(new CustomEvent("open-user-profile", { detail: { userId: publisher.id } }))}
                className="flex items-center gap-3 w-full text-left p-3 rounded-xl bg-violet-100 dark:bg-violet-900/30 hover:bg-violet-200 dark:hover:bg-violet-800/40 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-muted overflow-hidden shrink-0">
                  {publisher.avatar_url
                    ? <img src={publisher.avatar_url} className="w-full h-full object-cover" />
                    : <span className="w-full h-full flex items-center justify-center text-xs font-bold text-muted-foreground">{publisher.display_name?.[0]?.toUpperCase() ?? "?"}</span>}
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Publié par</p>
                  <p className="text-sm font-semibold text-foreground">{publisher.display_name ?? "Utilisateur"}</p>
                </div>
              </button>
            ) : (
              <p className="text-xs text-muted-foreground italic">Publiant inconnu (import OSM ou non tracé)</p>
            )}
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground block">Nom</label>
              <Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} className="h-8 text-sm" />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-muted-foreground mb-0.5 block">Catégorie</label>
                  <select value={editForm.category} onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))} className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm">
                    {CATS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    {!CATS.find(c => c.value === editForm.category) && editForm.category && <option value={editForm.category}>{editForm.category}</option>}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-0.5 block">Sous-catégorie</label>
                  <Input value={editForm.subcategory} onChange={e => setEditForm(f => ({ ...f, subcategory: e.target.value }))} className="h-8 text-sm" placeholder="Optionnel" />
                </div>
              </div>
              <textarea value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} rows={3} className="w-full text-sm rounded-md border border-input bg-background px-3 py-1.5 resize-none focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Description…" />
              <Input value={editForm.address} onChange={e => setEditForm(f => ({ ...f, address: e.target.value }))} className="h-8 text-sm" placeholder="Adresse" />
              <div className="grid grid-cols-2 gap-2">
                <Input value={editForm.city} onChange={e => setEditForm(f => ({ ...f, city: e.target.value }))} className="h-8 text-sm" placeholder="Ville" />
                <Input value={editForm.country} onChange={e => setEditForm(f => ({ ...f, country: e.target.value }))} className="h-8 text-sm" placeholder="Pays" />
              </div>
              <Input value={editForm.phone} onChange={e => setEditForm(f => ({ ...f, phone: e.target.value }))} className="h-8 text-sm" placeholder="Téléphone" />
              <Input value={editForm.website} onChange={e => setEditForm(f => ({ ...f, website: e.target.value }))} className="h-8 text-sm" placeholder="Site web" />
              <Input value={editForm.opening_hours} onChange={e => setEditForm(f => ({ ...f, opening_hours: e.target.value }))} className="h-8 text-sm" placeholder="Horaires" />
              <Input value={editForm.photo_url} onChange={e => setEditForm(f => ({ ...f, photo_url: e.target.value }))} className="h-8 text-sm" placeholder="URL photo" />
              <div className="grid grid-cols-2 gap-y-2 gap-x-4 pt-1">
                {([
                  { key: "accepts_dogs", label: "🐕 Chiens" },
                  { key: "accepts_cats", label: "🐈 Chats" },
                  { key: "outdoor_seating", label: "🌿 Terrasse" },
                  { key: "water_bowl_provided", label: "🥣 Gamelle" },
                  { key: "dogs_on_leash_only", label: "🦮 Laisse" },
                ] as const).map(({ key, label }) => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer text-xs">
                    <input type="checkbox" checked={editForm[key]} onChange={e => setEditForm(f => ({ ...f, [key]: e.target.checked }))} className="rounded accent-primary w-4 h-4" />
                    {label}
                  </label>
                ))}
                <label className="flex items-center gap-2 cursor-pointer text-xs col-span-2">
                  <input type="checkbox" checked={editForm.verified} onChange={e => setEditForm(f => ({ ...f, verified: e.target.checked }))} className="rounded accent-green-500 w-4 h-4" />
                  <CheckCircle className="w-3.5 h-3.5 text-green-500" /> ✅ Vérifié
                </label>
              </div>
            </div>
            <Button onClick={saveAdminEdit} disabled={editSaving || !editForm.name.trim()} className="w-full gap-2 bg-violet-600 hover:bg-violet-700 text-white">
              <Save className="w-4 h-4" />{editSaving ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </div>
        ) : (
        <>
        {place.photo_url && (
          <img src={place.photo_url} alt={place.name} className="w-full h-40 object-cover" />
        )}

        <div className="p-4 space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={`${categoryBgColors[place.category] || "bg-gray-500"} text-white`}>
              {categoryLabels[place.category] || place.category}
            </Badge>
            {localVerified && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-semibold border border-green-300 dark:border-green-700">
                ✅ Vérifié
              </span>
            )}
          </div>

          {localVerified && <div className="rounded-lg border-2 border-green-300 bg-green-50 dark:bg-green-950/30 dark:border-green-800 p-3 space-y-2">
            <p className="text-sm font-bold text-green-700 dark:text-green-400 flex items-center gap-2">✅ Lieu vérifié pet-friendly</p>
            <div className="flex flex-wrap gap-2">
              {place.accepts_dogs && <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 gap-1"><Dog className="w-3.5 h-3.5" /> 🐕 Chiens acceptés</Badge>}
              {place.accepts_cats && <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 gap-1"><Cat className="w-3.5 h-3.5" /> 🐱 Chats acceptés</Badge>}
              {place.outdoor_seating && <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 gap-1"><TreePine className="w-3.5 h-3.5" /> Terrasse extérieure</Badge>}
              {!place.outdoor_seating && <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 gap-1"><Home className="w-3.5 h-3.5" /> Animaux OK en intérieur</Badge>}
              {place.dogs_on_leash_only && <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300 gap-1">🐕‍🦺 Laisse obligatoire</Badge>}
            </div>
          </div>}

          {/* Tabs */}
          <div className="flex rounded-xl border border-border overflow-hidden">
            <button onClick={() => setActiveTab("google")}
              className={`flex-1 py-2 text-xs font-semibold transition-colors ${activeTab === "google" ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300" : "text-muted-foreground hover:bg-muted"}`}>
              ⭐ Google{place.rating ? ` · ${place.rating}` : ""}
            </button>
            <button onClick={() => setActiveTab("community")}
              className={`flex-1 py-2 text-xs font-semibold transition-colors ${activeTab === "community" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}>
              💬 Communauté{reviews.length > 0 ? ` · ${reviews.length}` : ""}
            </button>
          </div>

          {activeTab === "google" && (
            place.rating ? (
              <div className="flex items-center gap-2">
                {[...Array(5)].map((_, i) => <Star key={i} className={`w-4 h-4 ${i < Math.round(place.rating!) ? "text-amber-400 fill-amber-400" : "text-muted"}`} />)}
                <span className="text-sm font-semibold text-foreground">{place.rating}</span>
                <span className="text-xs text-muted-foreground">(Google)</span>
              </div>
            ) : <p className="text-xs text-muted-foreground italic">Aucune note Google disponible.</p>
          )}

          {activeTab === "community" && (
            <div className="space-y-4">
              {reviews.length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="flex">{[...Array(5)].map((_, i) => <Star key={i} className={`w-4 h-4 ${i < Math.round(avgRating) ? "text-primary fill-primary" : "text-muted"}`} />)}</div>
                  <span className="text-sm font-semibold">{avgRating.toFixed(1)}</span>
                  <span className="text-xs text-muted-foreground">({reviews.length} avis)</span>
                </div>
              )}
              {loadingReviews ? <p className="text-xs text-muted-foreground text-center py-2">Chargement…</p>
                : reviews.length === 0 ? <p className="text-xs text-muted-foreground italic text-center py-2">Aucun avis. Sois le premier !</p>
                : <div className="space-y-3">
                  {reviews.map(r => (
                    <div key={r.id} className="rounded-xl border border-border bg-muted/40 p-3 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {r.profiles?.avatar_url
                            ? <img src={r.profiles.avatar_url} className="w-6 h-6 rounded-full object-cover" />
                            : <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">{(r.profiles?.display_name?.[0] ?? "?").toUpperCase()}</div>
                          }
                          <span className="text-xs font-semibold">{r.profiles?.display_name ?? "Anonyme"}</span>
                        </div>
                        <div className="flex">{[...Array(5)].map((_, i) => <Star key={i} className={`w-3 h-3 ${i < r.rating ? "text-amber-400 fill-amber-400" : "text-muted"}`} />)}</div>
                      </div>
                      {r.visited_with_pet && <span className="text-xs bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 px-1.5 py-0.5 rounded-full">🐾 Visité avec mon animal</span>}
                      {r.body && <p className="text-xs text-foreground leading-relaxed">{r.body}</p>}
                      {r.photos && r.photos.length > 0 && (
                        <div className="flex gap-1.5 flex-wrap pt-0.5">
                          {r.photos.map((url, i) => (
                            <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                              <img src={url} alt="" className="w-16 h-16 rounded-lg object-cover border border-border hover:opacity-80 transition-opacity" />
                            </a>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-xs text-muted-foreground">{timeAgo(r.created_at)}</span>
                        <div className="flex items-center gap-2">
                          <button onClick={() => markHelpful(r.id)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
                            <ThumbsUp className="w-3 h-3" />{r.helpful_count > 0 && r.helpful_count}
                          </button>
                          {user && user.id !== r.user_id && !r.is_reported && !isAdmin && (
                            <button onClick={() => reportReview(r.id)} className="text-xs text-muted-foreground hover:text-orange-500" title="Signaler"><Flag className="w-3 h-3" /></button>
                          )}
                          {user && (user.id === r.user_id || isAdmin) && (
                            <button onClick={() => deleteReview(r.id)} className="text-xs text-muted-foreground hover:text-destructive" title="Supprimer"><Trash2 className="w-3 h-3" /></button>
                          )}
                          {isAdmin && (
                            <button onClick={() => hideReview(r.id)} className="text-xs text-muted-foreground hover:text-amber-500" title="Masquer l'avis"><EyeOff className="w-3 h-3" /></button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              }
              {user ? (
                <div className="border border-border rounded-xl p-3 space-y-3 bg-background">
                  <p className="text-xs font-semibold">{userReview ? "Modifier ton avis" : "Laisser un avis"}</p>
                  <div className="flex gap-1">
                    {[1,2,3,4,5].map(star => (
                      <button key={star} onMouseEnter={() => setHoverRating(star)} onMouseLeave={() => setHoverRating(0)} onClick={() => setNewRating(star)}>
                        <Star className={`w-6 h-6 transition-colors ${star <= (hoverRating || newRating) ? "text-amber-400 fill-amber-400" : "text-muted"}`} />
                      </button>
                    ))}
                  </div>
                  <textarea value={newBody} onChange={e => setNewBody(e.target.value)} placeholder="Décris ton expérience (optionnel)…" rows={3}
                    className="w-full text-xs rounded-lg border border-border bg-muted/40 p-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary" />
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Photos ({photoPreviews.length}/3)</span>
                      {photoPreviews.length < 3 && (
                        <label className="flex items-center gap-1 text-xs text-primary cursor-pointer hover:text-primary/80 transition-colors">
                          <Camera className="w-3.5 h-3.5" /> Ajouter une photo
                          <input type="file" accept="image/*" multiple className="hidden" onChange={e => {
                            const files = Array.from(e.target.files ?? []);
                            const remaining = 3 - photoPreviews.length;
                            const valid = files.filter(f => {
                              if (!ALLOWED_IMAGE_TYPES.includes(f.type)) { toast.error(`${f.name} : format non supporté (JPEG, PNG, WebP)`); return false; }
                              if (f.size > MAX_PHOTO_SIZE) { toast.error(`${f.name} : trop volumineux (max 5 Mo)`); return false; }
                              return true;
                            }).slice(0, remaining);
                            setPhotoFiles(prev => [...prev, ...valid]);
                            setPhotoPreviews(prev => [...prev, ...valid.map(f => URL.createObjectURL(f))]);
                            e.target.value = "";
                          }} />
                        </label>
                      )}
                    </div>
                    {photoPreviews.length > 0 && (
                      <div className="flex gap-2 flex-wrap">
                        {photoPreviews.map((src, i) => (
                          <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-border">
                            <img src={src} alt="" className="w-full h-full object-cover" />
                            <button type="button" onClick={() => {
                              const isExisting = src.startsWith('http');
                              if (!isExisting) URL.revokeObjectURL(src);
                              setPhotoPreviews(prev => prev.filter((_, j) => j !== i));
                              if (!isExisting) {
                                const blobIdx = photoPreviews.filter(p => !p.startsWith('http')).indexOf(src);
                                if (blobIdx >= 0) setPhotoFiles(prev => prev.filter((_, j) => j !== blobIdx));
                              }
                            }} className="absolute top-0.5 right-0.5 w-4 h-4 bg-black/60 rounded-full flex items-center justify-center">
                              <X className="w-2.5 h-2.5 text-white" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input type="checkbox" checked={visitedWithPet} onChange={e => setVisitedWithPet(e.target.checked)} className="rounded" />
                    🐾 J'y suis allé(e) avec mon animal
                  </label>
                  <button onClick={submitReview} disabled={submitting || newRating === 0}
                    className="w-full py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50 hover:bg-primary/90 transition-colors">
                    {submitting ? "Publication…" : userReview ? "Mettre à jour" : "Publier l'avis"}
                  </button>
                </div>
              ) : <p className="text-xs text-muted-foreground italic text-center">Connecte-toi pour laisser un avis.</p>}
            </div>
          )}

          {place.opening_hours && <div><p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Horaires</p><p className="text-sm">{place.opening_hours}</p></div>}
          {place.address && <div className="flex items-start gap-2"><MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" /><p className="text-sm">{place.address}</p></div>}
          {place.phone && <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-muted-foreground shrink-0" />{getSafePhone(place.phone) ? <a href={`tel:${getSafePhone(place.phone)}`} className="text-sm text-primary hover:underline">{place.phone}</a> : <span className="text-sm text-muted-foreground">{place.phone}</span>}</div>}
          {getSafeUrl(place.website) && <div className="flex items-center gap-2"><Globe className="w-4 h-4 text-muted-foreground shrink-0" /><a href={getSafeUrl(place.website)!} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline truncate">{place.website}</a></div>}
          {place.description && <div><p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Description</p><p className="text-sm leading-relaxed">{place.description}</p></div>}

          {onReport && (
            <button onClick={onReport} className="w-full text-xs h-9 rounded-xl font-semibold flex items-center justify-center gap-1.5 border border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100 dark:bg-orange-950/30 dark:text-orange-300 dark:border-orange-800 transition-colors">
              ⚠️ Signaler un problème
            </button>
          )}

          <Button className="w-full gap-2" onClick={() => window.open(directionsUrl, "_blank")}>
            <Navigation className="w-4 h-4" /> Itinéraire
          </Button>

          {place.distance_km !== undefined && (
            <p className="text-xs text-center text-muted-foreground">À {place.distance_km.toFixed(1)} km de votre position</p>
          )}
        </div>
        </>
        )}
      </div>
    </div>
  );
};

export default PlaceDetailPanel;
