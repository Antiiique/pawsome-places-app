import { Heart } from "lucide-react";

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
  website?: string;
  isPetFriendly: boolean;
  types?: string[];
  placeId?: string;
}

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
}

export default function MarkerPopup({
  place, position, onSetOrigin, onSetDestination, onShowInfo, onAddWaypoint, onToggleFavorite, isFavorite, onClose,
}: MarkerPopupProps) {
  const emoji = getPlaceEmoji(place);
  const typeLabel = getPlaceTypeLabel(place);
  const isPointOnMap = place.types?.includes("point_on_map");

  return (
    <>
      <div className="fixed inset-0 z-50" onClick={onClose} />
      <div
        className="fixed z-50 bg-card border border-border rounded-xl p-3"
        style={{
          left: Math.min(position.x, window.innerWidth - 300),
          top: Math.min(position.y - 10, window.innerHeight - 220),
          transform: "translate(-50%, -100%)",
          width: 290,
          boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
        }}
      >
        <div className="space-y-2">
          <div>
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold text-foreground text-sm flex items-center gap-1.5 min-w-0">
                {emoji} <span className="truncate">{place.name}</span>
              </p>
              {place.rating && (
                <span className="text-xs text-muted-foreground whitespace-nowrap">⭐ {place.rating}</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{typeLabel}{place.city ? ` • ${place.city}` : ""}</p>
            {place.address && !isPointOnMap && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">📍 {place.address}</p>
            )}
            {isPointOnMap && (
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{place.address}</p>
            )}
            {place.opening_hours && (
              <p className="text-xs text-muted-foreground mt-0.5">🕐 {place.opening_hours}</p>
            )}
          </div>
          <div className="flex gap-1.5">
            <button
              className="flex-1 text-xs h-8 rounded-lg font-medium text-white flex items-center justify-center gap-1"
              style={{ backgroundColor: "#4CAF50" }}
              onClick={(e) => { e.stopPropagation(); onSetOrigin(); }}
            >
              📍 Départ
            </button>
            <button
              className="flex-1 text-xs h-8 rounded-lg font-medium text-white flex items-center justify-center gap-1"
              style={{ backgroundColor: "#F44336" }}
              onClick={(e) => { e.stopPropagation(); onSetDestination(); }}
            >
              🏁 Arrivée
            </button>
            {onToggleFavorite && (
              <button
                className={`text-xs h-8 w-8 rounded-lg font-medium flex items-center justify-center border transition-all active:scale-110 ${
                  isFavorite ? "bg-destructive/10 border-destructive/30 text-destructive" : "bg-muted border-border text-muted-foreground hover:text-destructive"
                }`}
                onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
                title={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
              >
                <Heart className={`w-4 h-4 ${isFavorite ? "fill-current" : ""}`} />
              </button>
            )}
            {onAddWaypoint && (
              <button
                className="text-xs h-8 w-8 rounded-lg font-medium flex items-center justify-center border border-border bg-muted text-foreground hover:bg-accent transition-colors"
                onClick={(e) => { e.stopPropagation(); onAddWaypoint(); }}
                title="Ajouter comme étape"
              >
                ⛳
              </button>
            )}
            {place.isPetFriendly && onShowInfo && (
              <button
                className="text-xs h-8 w-8 rounded-lg font-medium flex items-center justify-center border border-border bg-muted text-foreground hover:bg-accent transition-colors"
                onClick={(e) => { e.stopPropagation(); onShowInfo(); }}
                title="Détails"
              >
                ℹ️
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
