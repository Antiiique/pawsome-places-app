import { useState } from "react";
import { Heart, X, ExternalLink, ChevronLeft, ChevronRight, Star } from "lucide-react";

export interface PlaceReview {
  author: string;
  avatar?: string | null;
  rating: number;
  text: string;
  time: string;
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
}

export default function MarkerPopup({
  place, position, onSetOrigin, onSetDestination, onShowInfo, onAddWaypoint, onToggleFavorite, isFavorite, onClose, onReport, isInDatabase,
}: MarkerPopupProps) {
  const emoji = getPlaceEmoji(place);
  const typeLabel = getPlaceTypeLabel(place);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [expandedReviews, setExpandedReviews] = useState<Record<number, boolean>>({});
  const [fullPhoto, setFullPhoto] = useState<string | null>(null);

  const photos = place.photos || [];
  const reviews = place.reviews || [];

  const toggleReviewExpand = (i: number) => {
    setExpandedReviews(prev => ({ ...prev, [i]: !prev[i] }));
  };

  return (
    <>
      {/* Full photo overlay */}
      {fullPhoto && (
        <div
          className="fixed inset-0 z-[20000] bg-black/92 flex items-center justify-center cursor-pointer"
          onClick={() => setFullPhoto(null)}
        >
          <img src={fullPhoto} className="max-w-[95vw] max-h-[92vh] object-contain rounded-xl shadow-2xl" />
          <div className="absolute top-4 right-5 text-white text-2xl cursor-pointer">✕</div>
        </div>
      )}

      {/* Side panel */}
      <div
        data-panel="place-detail"
        className="fixed top-[56px] right-0 z-[500] flex flex-col overflow-hidden border-l border-border bg-card animate-slide-in-right"
        style={{
          width: 380,
          maxWidth: "95vw",
          height: "calc(100dvh - 56px)",
          borderBottomLeftRadius: 14,
        }}
      >
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-sm font-bold text-foreground">📌 Détails du lieu</span>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden" style={{ scrollbarWidth: "thin", scrollbarColor: "hsl(var(--border)) transparent" }}>
          {/* Photo carousel */}
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
            {/* Header */}
            <div>
              <div className="flex items-start gap-2">
                <span className="text-2xl">{emoji}</span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-foreground text-lg leading-tight">{place.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{typeLabel}{place.city ? ` • ${place.city}` : ""}</p>
                </div>
              </div>
              {place.isPetFriendly && (
                <span className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded-full bg-success/20 text-success text-xs font-semibold">
                  🐾 Pet-friendly
                </span>
              )}
            </div>

            {/* Rating block */}
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

            {/* Details */}
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
                  <a href={`tel:${place.phone}`} className="text-xs text-primary hover:underline">{place.phone}</a>
                </div>
              )}
              {place.website && (
                <div className="flex gap-2 items-center p-2.5 rounded-lg bg-secondary border border-border">
                  <span className="text-base flex-shrink-0">🌐</span>
                  <a href={place.website} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline break-all">
                    Site web
                  </a>
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="space-y-2 pt-1">
              {onAddWaypoint && (
                <button
                  className="w-full text-xs h-10 rounded-xl font-bold text-white flex items-center justify-center gap-1.5 transition-opacity hover:opacity-90 bg-primary"
                  onClick={(e) => { e.stopPropagation(); onAddWaypoint(); }}
                >
                  ⛳ Ajouter à l'itinéraire
                </button>
              )}

              <button
                className={`w-full text-xs h-10 rounded-xl font-bold flex items-center justify-center gap-1.5 border transition-all ${
                  isFavorite
                    ? "bg-destructive/20 border-destructive/40 text-destructive"
                    : "bg-warning/20 border-warning/40 text-warning hover:bg-warning/30"
                }`}
                onClick={(e) => { e.stopPropagation(); onToggleFavorite?.(); }}
              >
                <Heart className={`w-4 h-4 ${isFavorite ? "fill-current" : ""}`} />
                {isFavorite ? "Retirer des favoris" : "❤️ Ajouter aux favoris"}
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  className="text-xs h-9 rounded-xl font-semibold text-white flex items-center justify-center gap-1.5 transition-opacity hover:opacity-90 bg-success"
                  onClick={(e) => { e.stopPropagation(); onSetOrigin(); }}
                >
                  🚩 Départ
                </button>
                <button
                  className="text-xs h-9 rounded-xl font-semibold text-white flex items-center justify-center gap-1.5 transition-opacity hover:opacity-90 bg-destructive"
                  onClick={(e) => { e.stopPropagation(); onSetDestination(); }}
                >
                  🏁 Arrivée
                </button>
              </div>

              {place.isPetFriendly && onShowInfo && (
                <button
                  className="w-full text-xs h-9 rounded-xl font-semibold flex items-center justify-center gap-1.5 border border-border bg-surface text-foreground hover:bg-card transition-colors"
                  onClick={(e) => { e.stopPropagation(); onShowInfo(); }}
                >
                  ℹ️ Voir les détails
                </button>
              )}

              {isInDatabase && (
                <button
                  onClick={(e) => { e.stopPropagation(); onReport?.(); }}
                  className="w-full text-xs h-9 rounded-xl font-semibold flex items-center justify-center gap-1.5 border border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100 dark:bg-orange-950/30 dark:text-orange-300 dark:border-orange-800 transition-colors"
                >
                  ⚠️ Signaler un problème
                </button>
              )}
            </div>

            {/* Reviews section */}
            {reviews.length > 0 && (
              <div className="pt-2 border-t border-border">
                <h4 className="text-sm font-bold text-foreground mb-3">💬 Avis Google</h4>
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
              </div>
            )}

            {reviews.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-2">Aucun avis disponible</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
