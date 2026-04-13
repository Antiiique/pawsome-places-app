import { Heart, X, ExternalLink } from "lucide-react";

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

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-[9999] bg-black/40 cursor-pointer"
        onClick={onClose}
      />
      {/* Centered modal */}
      <div
        className="fixed z-[10000] bg-card border border-border rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        style={{
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 340,
          maxWidth: "92vw",
          maxHeight: "85vh",
          overflowY: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.35)",
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-background/80 backdrop-blur flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-5 space-y-4">
          {/* Header */}
          <div>
            <div className="flex items-start gap-2 pr-8">
              <span className="text-2xl">{emoji}</span>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-foreground text-base leading-tight">{place.name}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{typeLabel}{place.city ? ` • ${place.city}` : ""}</p>
              </div>
            </div>

            {place.isPetFriendly && (
              <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                🐾 Pet-friendly
              </span>
            )}
          </div>

          {/* Details */}
          <div className="space-y-1.5">
            {place.address && (
              <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                <span>📍</span> <span>{place.address}</span>
              </p>
            )}
            {place.opening_hours && (
              <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                <span>🕐</span> <span>{place.opening_hours}</span>
              </p>
            )}
            {place.rating && (
              <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                <span>⭐</span> <span>{place.rating}/5</span>
              </p>
            )}
            {place.phone && (
              <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                <span>📞</span> <span>{place.phone}</span>
              </p>
            )}
            {place.website && (
              <a
                href={place.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline flex items-center gap-1.5"
              >
                <ExternalLink className="w-3 h-3" /> Voir le site web
              </a>
            )}
          </div>

          {/* Action buttons */}
          <div className="space-y-2 pt-1">
            <div className="grid grid-cols-2 gap-2">
              <button
                className="text-xs h-9 rounded-lg font-semibold text-white flex items-center justify-center gap-1.5 transition-opacity hover:opacity-90"
                style={{ backgroundColor: "#4CAF50" }}
                onClick={(e) => { e.stopPropagation(); onSetOrigin(); }}
              >
                🚩 Départ
              </button>
              <button
                className="text-xs h-9 rounded-lg font-semibold text-white flex items-center justify-center gap-1.5 transition-opacity hover:opacity-90"
                style={{ backgroundColor: "#F44336" }}
                onClick={(e) => { e.stopPropagation(); onSetDestination(); }}
              >
                🏁 Arrivée
              </button>
            </div>

            {onAddWaypoint && (
              <button
                className="w-full text-xs h-9 rounded-lg font-semibold text-white flex items-center justify-center gap-1.5 transition-opacity hover:opacity-90"
                style={{ backgroundColor: "#3b82f6" }}
                onClick={(e) => { e.stopPropagation(); onAddWaypoint(); }}
              >
                ⛳ Ajouter à l'itinéraire
              </button>
            )}

            <button
              className={`w-full text-xs h-9 rounded-lg font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                isFavorite
                  ? "bg-destructive/10 border-destructive/30 text-destructive"
                  : "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100"
              }`}
              onClick={(e) => { e.stopPropagation(); onToggleFavorite?.(); }}
            >
              <Heart className={`w-4 h-4 ${isFavorite ? "fill-current" : ""}`} />
              {isFavorite ? "Retirer des favoris" : "❤️ Ajouter aux favoris"}
            </button>

            {place.isPetFriendly && onShowInfo && (
              <button
                className="w-full text-xs h-9 rounded-lg font-semibold flex items-center justify-center gap-1.5 border border-border bg-muted text-foreground hover:bg-accent transition-colors"
                onClick={(e) => { e.stopPropagation(); onShowInfo(); }}
              >
                ℹ️ Voir les détails
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
