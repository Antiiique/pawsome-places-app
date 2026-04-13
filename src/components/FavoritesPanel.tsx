import { X, MapPin, Heart, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useState } from "react";
import type { FavoritePlace } from "@/hooks/useFavorites";
import { toast } from "sonner";

const CATEGORY_FILTERS = [
  { key: null, label: "Tous", emoji: "🐾" },
  { key: "restaurant", label: "Restaurants", emoji: "🍽️" },
  { key: "hotel", label: "Hôtels", emoji: "🛏️" },
  { key: "outdoor", label: "Parcs", emoji: "🌿" },
  { key: "services", label: "Vétos", emoji: "❤️" },
  { key: "shop", label: "Shops", emoji: "🐾" },
  { key: "transport", label: "Transport", emoji: "🚉" },
  { key: "other", label: "Autres", emoji: "📍" },
];

interface FavoritesPanelProps {
  open: boolean;
  favorites: FavoritePlace[];
  onClose: () => void;
  onRemove: (id: string) => void;
  onViewOnMap: (lat: number, lng: number) => void;
  onSetOrigin: (fav: FavoritePlace) => void;
  onSetDestination: (fav: FavoritePlace) => void;
}

export default function FavoritesPanel({ open, favorites, onClose, onRemove, onViewOnMap, onSetOrigin, onSetDestination }: FavoritesPanelProps) {
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"date" | "name" | "category">("date");

  let filtered = favorites.filter((f) => {
    if (catFilter && f.category !== catFilter) return false;
    if (search.trim() && !f.name.toLowerCase().includes(search.toLowerCase()) && !f.city?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  filtered = [...filtered].sort((a, b) => {
    if (sortBy === "name") return a.name.localeCompare(b.name);
    if (sortBy === "category") return a.category.localeCompare(b.category);
    return new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime();
  });

  return (
    <>
      {/* Mobile backdrop - only when open */}
      <div
        className={`fixed inset-0 bg-black/30 z-40 md:hidden transition-opacity duration-300 ${open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />

      {/* Side panel */}
      <div
        className={`fixed z-50 top-16 bottom-0 right-0 w-[380px] max-w-[90vw] bg-card border-l border-border shadow-xl flex flex-col transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-destructive fill-destructive" />
            <h2 className="font-heading font-bold text-foreground">Mes lieux favoris ({favorites.length})</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-5 h-5" /></Button>
        </div>

        <div className="p-3 space-y-3 border-b border-border shrink-0">
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
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
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
          <div className="flex gap-2">
            {(["date", "name", "category"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSortBy(s)}
                className={`text-xs px-2 py-1 rounded ${sortBy === s ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground"}`}
              >
                {s === "date" ? "📅 Date" : s === "name" ? "🔤 Nom" : "📂 Catégorie"}
              </button>
            ))}
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-3 space-y-3">
            {filtered.length === 0 && (
              <div className="text-center py-12 space-y-2">
                <Heart className="w-12 h-12 text-muted-foreground/30 mx-auto" />
                <p className="text-sm text-muted-foreground">
                  {favorites.length === 0
                    ? "Aucun lieu sauvegardé\nAppuyez sur ❤️ sur une fiche lieu pour le retrouver ici"
                    : "Aucun résultat pour cette recherche"}
                </p>
              </div>
            )}
            {filtered.map((fav) => (
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
                    onClick={() => {
                      onRemove(fav.id);
                      toast("💔 Retiré des favoris");
                    }}
                  >
                    ❌ Retirer
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </>
  );
}
