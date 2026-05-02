import { X, MapPin, Heart, Search, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import type { FavoritePlace } from "@/hooks/useFavorites";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { useHandedness } from "@/contexts/HandednessContext";

const CATEGORY_FILTERS = [
  { key: null,              label: "Tous",           emoji: "🐾" },
  { key: "veterinaire",    label: "Vétos",          emoji: "🏥" },
  { key: "restaurant",     label: "Restaurants",    emoji: "🍽️" },
  { key: "hotel",          label: "Hôtels",         emoji: "🛏️" },
  { key: "outdoor",        label: "Parcs",          emoji: "🌿" },
  { key: "parc_chiens",    label: "Parcs chiens",   emoji: "🐕" },
  { key: "shop",           label: "Shops",          emoji: "🛒" },
  { key: "pension",        label: "Pension",        emoji: "🏠" },
  { key: "toiletteur",     label: "Toiletteurs",    emoji: "🛁" },
  { key: "educateur",      label: "Éducateurs",     emoji: "🎓" },
  { key: "osteopathe",     label: "Ostéopathes",    emoji: "🦴" },
  { key: "masseur",        label: "Masseurs",       emoji: "💆" },
  { key: "pet_sitter",     label: "Pet Sitters",    emoji: "🏡" },
  { key: "dog_walker",     label: "Dog Walkers",    emoji: "🦮" },
  { key: "camping",        label: "Camping",        emoji: "⛺" },
  { key: "plage",          label: "Plages",         emoji: "🏖️" },
  { key: "loisir",         label: "Loisirs",        emoji: "🎯" },
  { key: "refuge",         label: "Refuges",        emoji: "🏚️" },
  { key: "spa",            label: "SPA",            emoji: "🐾" },
  { key: "cafe_animalier", label: "Cafés animaux",  emoji: "☕" },
  { key: "aeroport",       label: "Aéroports",      emoji: "✈️" },
  { key: "aire_repos",     label: "Aires repos",    emoji: "🛣️" },
  { key: "transport",      label: "Transport",      emoji: "🚇" },
  { key: "evenement",      label: "Événements",     emoji: "📅" },
  { key: "other",          label: "Autres",         emoji: "📍" },
];

interface MyPlace {
  id: string;
  name: string;
  city: string | null;
  category: string;
  address: string | null;
  photo_url: string | null;
  rating: number | null;
  latitude: number;
  longitude: number;
  submitted_at: string | null;
}

interface FavoritesPanelProps {
  open: boolean;
  favorites: FavoritePlace[];
  onClose: () => void;
  onRemove: (id: string) => void;
  onViewOnMap: (lat: number, lng: number) => void;
  onSetOrigin: (fav: FavoritePlace) => void;
  onSetDestination: (fav: FavoritePlace) => void;
  dragProgress?: number;
}

export default function FavoritesPanel({ open, favorites, onClose, onRemove, onViewOnMap, onSetOrigin, onSetDestination }: FavoritesPanelProps) {
  const { user } = useAuthContext();
  const { isLeftHanded } = useHandedness();
  const [activeTab, setActiveTab] = useState<"favorites" | "myplaces">("favorites");
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<string | null>(null);
  const [myPlaces, setMyPlaces] = useState<MyPlace[]>([]);
  const [loadingMyPlaces, setLoadingMyPlaces] = useState(false);

  // Bottom sheet snap
  const [snapState, setSnapState] = useState<"half" | "full">("half");
  const [dragging, setDragging] = useState(false);
  const [dragDelta, setDragDelta] = useState(0);
  const isDragging    = useRef(false);
  const dragStartY    = useRef(0);
  const lastTouchY    = useRef(0);
  const lastTouchTime = useRef(0);
  const lastVelocity  = useRef(0);

  useEffect(() => {
    if (!open) setSnapState("half");
  }, [open]);

  useEffect(() => {
    if (!open || !user) return;
    setLoadingMyPlaces(true);
    supabase
      .from("place_submissions" as any)
      .select("id, name, city, category, created_at")
      .eq("submitted_by", user.id)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .then(async ({ data: subs }) => {
        const rawSubs = (subs as any[]) || [];
        if (rawSubs.length === 0) { setMyPlaces([]); setLoadingMyPlaces(false); return; }

        const ids = rawSubs.map((s: any) => s.id);
        const { data: places } = await supabase
          .from("pet_friendly_places")
          .select("id, name, city, category, address, photo_url, rating, latitude, longitude, source_id")
          .eq("source", "user_submission")
          .in("source_id", ids);

        const placeMap: Record<string, any> = {};
        for (const p of (places as any[]) || []) placeMap[p.source_id] = p;

        const enriched: MyPlace[] = rawSubs
          .map((s: any) => {
            const p = placeMap[s.id];
            if (!p) return null;
            return {
              id: p.id,
              name: p.name,
              city: p.city,
              category: p.category,
              address: p.address,
              photo_url: p.photo_url,
              rating: p.rating,
              latitude: p.latitude,
              longitude: p.longitude,
              submitted_at: s.created_at,
            } as MyPlace;
          })
          .filter(Boolean) as MyPlace[];

        setMyPlaces(enriched);
        setLoadingMyPlaces(false);
      });
  }, [open, user]);

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
    isDragging.current = false;
    setDragging(false);
    const vel = lastVelocity.current;
    const h = window.innerHeight - 56;
    const deltaPct = h > 0 ? (dragDelta / h) * 100 : 0;
    if (snapState === "half") {
      if (vel < -0.3 || deltaPct < -15) setSnapState("full");
      else if (vel > 0.5 || deltaPct > 25) onClose();
    } else {
      if (vel > 0.3 || deltaPct > 15) setSnapState("half");
    }
    setDragDelta(0);
  };

  const snapBase = snapState === "full" ? 0 : 55;
  const h = typeof window !== "undefined" ? window.innerHeight - 56 : 600;
  const dragPct = dragging && h > 0 ? (dragDelta / h) * 100 : 0;
  const currentPct = Math.max(0, Math.min(100, snapBase + dragPct));

  const filteredFavs = favorites.filter((f) => {
    if (catFilter && f.category !== catFilter) return false;
    if (search.trim() && !f.name.toLowerCase().includes(search.toLowerCase()) && !f.city?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const openPlace = (id: string) =>
    window.dispatchEvent(new CustomEvent("open-community-reviews", { detail: { placeId: id } }));

  return (
    <div
      data-panel
      className="fixed z-[600] inset-x-0 bottom-0 bg-card shadow-2xl flex flex-col rounded-t-2xl"
      style={{
        top: 56,
        transform: `translateY(${open ? currentPct : 100}%)`,
        transition: dragging ? "none" : "transform 0.3s cubic-bezier(0.4,0,0.2,1)",
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
        className={`flex items-center justify-between px-4 pb-3 border-b border-border shrink-0 ${isLeftHanded ? "flex-row-reverse" : ""}`}
        onTouchStart={handleDragStart}
        onTouchMove={handleDragMove}
        onTouchEnd={handleDragEnd}
        style={{ touchAction: "none" }}
      >
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-destructive fill-destructive" />
          <h2 className="font-bold text-foreground text-sm">Mes lieux</h2>
        </div>
        <div className={`flex items-center gap-1 ${isLeftHanded ? "flex-row-reverse" : ""}`}>
          <button
            onClick={() => setSnapState(s => s === "half" ? "full" : "half")}
            className="p-1.5 rounded-full hover:bg-muted transition-colors"
          >
            <ChevronUp className={`w-5 h-5 text-muted-foreground transition-transform duration-300 ${snapState === "full" ? "rotate-180" : ""}`} />
          </button>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-muted transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* ── Scrollable content ── */}
      <div className="flex-1 min-h-0 overflow-y-auto" style={{ overflowY: snapState === "full" ? "auto" : "hidden" }}>

        {/* FAVORIS tab content */}
        {activeTab === "favorites" && (
          <div className="p-3 space-y-3">
            {filteredFavs.length === 0 && (
              <div className="text-center py-12 space-y-2">
                <Heart className="w-12 h-12 text-muted-foreground/30 mx-auto" />
                <p className="text-sm text-muted-foreground">
                  {favorites.length === 0
                    ? "Aucun lieu sauvegardé\nAppuyez sur ❤️ sur une fiche lieu pour le retrouver ici"
                    : "Aucun résultat pour cette recherche"}
                </p>
              </div>
            )}
            {filteredFavs.map((fav) => (
              <div key={fav.id} className="bg-card border border-border rounded-xl p-3 shadow-sm space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground text-sm truncate">🐾 {fav.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{fav.category} • {fav.city || "—"}</p>
                  </div>
                  <Heart className="w-4 h-4 text-destructive fill-destructive shrink-0 mt-0.5" />
                </div>
                {fav.address && <p className="text-xs text-muted-foreground">📍 {fav.address}</p>}
                {fav.phone && <p className="text-xs text-muted-foreground">📞 {fav.phone}</p>}
                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => { onViewOnMap(fav.lat, fav.lng); onClose(); }}>
                    📍 Voir sur carte
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => { onSetOrigin(fav); onClose(); }}>
                    🟢 Départ
                  </Button>
                  <Button variant="outline" size="sm" className="text-xs" onClick={() => { onSetDestination(fav); onClose(); }}>
                    🔴 Arrivée
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs text-destructive hover:bg-destructive/10"
                    onClick={() => { onRemove(fav.id); toast("💔 Retiré des favoris"); }}
                  >
                    ❌ Retirer
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* MES LIEUX PUBLIÉS tab content */}
        {activeTab === "myplaces" && (
          <div className="p-3 space-y-3">
            {loadingMyPlaces ? (
              <p className="text-sm text-muted-foreground text-center py-12">Chargement…</p>
            ) : !user ? (
              <div className="text-center py-12 space-y-2">
                <p className="text-3xl">🔒</p>
                <p className="text-sm text-muted-foreground">Connectez-vous pour voir vos lieux publiés</p>
              </div>
            ) : myPlaces.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <p className="text-3xl">📍</p>
                <p className="text-sm text-muted-foreground">Aucun lieu publié pour l'instant</p>
                <p className="text-xs text-muted-foreground">Vos lieux approuvés par l'équipe apparaîtront ici</p>
              </div>
            ) : (
              myPlaces.map((place) => (
                <div
                  key={place.id}
                  onClick={() => { openPlace(place.id); onClose(); }}
                  className="bg-card border border-border rounded-xl overflow-hidden cursor-pointer hover:bg-muted active:scale-[0.985] transition-all shadow-sm hover:shadow-md"
                >
                  <div className="flex gap-3 p-3">
                    {place.photo_url ? (
                      <img src={place.photo_url} alt={place.name} className="w-16 h-16 rounded-lg object-cover shrink-0 border border-border" />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-muted shrink-0 border border-border flex items-center justify-center text-2xl">🐾</div>
                    )}
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <p className="font-semibold text-foreground text-sm leading-tight truncate">{place.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {place.category}{place.city ? ` · ${place.city}` : ""}
                      </p>
                      {place.address && <p className="text-xs text-muted-foreground truncate">📍 {place.address}</p>}
                      {place.rating != null && (
                        <p className="text-xs text-yellow-500 font-medium">★ {place.rating.toFixed(1)}</p>
                      )}
                      {place.submitted_at && (
                        <p className="text-[10px] text-muted-foreground">
                          Publié le {new Date(place.submitted_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                        </p>
                      )}
                      <p className="text-[10px] text-primary font-semibold">Voir sur la carte →</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* ── Bottom fixed section ── */}
      <div className="shrink-0 border-t border-border">

        {/* Chips (only in favorites tab) */}
        {activeTab === "favorites" && (
          <div className="px-3 pt-3 pb-1 flex gap-1.5 overflow-x-auto scrollbar-hide">
            {CATEGORY_FILTERS.map((cf) => (
              <button
                key={cf.label}
                onClick={() => setCatFilter(cf.key)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  catFilter === cf.key ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                }`}
              >
                {cf.emoji} {cf.label}
              </button>
            ))}
          </div>
        )}

        {/* Search bar (only in favorites tab) */}
        {activeTab === "favorites" && (
          <div className="px-3 py-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher dans mes favoris…"
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-background text-foreground text-sm outline-none"
              />
            </div>
          </div>
        )}

        {/* Tabs bar */}
        <div className="flex border-t border-border">
          <button
            onClick={() => setActiveTab("favorites")}
            className={`flex-1 py-3 text-xs font-semibold transition-colors relative ${
              activeTab === "favorites" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            ❤️ Favoris ({favorites.length})
            {activeTab === "favorites" && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-0.5 bg-primary rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("myplaces")}
            className={`flex-1 py-3 text-xs font-semibold transition-colors relative ${
              activeTab === "myplaces" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            📍 Publiés ({myPlaces.length})
            {activeTab === "myplaces" && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-0.5 bg-primary rounded-full" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
