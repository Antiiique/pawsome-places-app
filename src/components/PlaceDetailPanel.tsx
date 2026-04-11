import { X, Star, Phone, Globe, MapPin, Navigation, Dog, Cat, TreePine, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

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
  distance_km?: number;
}

const categoryLabels: Record<string, string> = {
  restaurant: "Restaurant 🍽️",
  hotel: "Hôtel 🛏️",
  outdoor: "Parc & Nature 🌿",
  services: "Services ❤️",
  shop: "Pet Shop 🐾",
  other: "Autre",
};

const categoryBgColors: Record<string, string> = {
  restaurant: "bg-orange-500",
  hotel: "bg-blue-500",
  outdoor: "bg-green-500",
  services: "bg-red-500",
  shop: "bg-purple-500",
  other: "bg-gray-500",
};

interface PlaceDetailPanelProps {
  place: PetPlace | null;
  onClose: () => void;
}

const PlaceDetailPanel = ({ place, onClose }: PlaceDetailPanelProps) => {
  if (!place) return null;

  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`;

  return (
    <div
      className="fixed top-0 right-0 h-full w-full sm:w-[400px] bg-card z-50 shadow-2xl overflow-y-auto animate-slide-in-right"
    >
      <div className="sticky top-0 bg-card z-10 flex items-center justify-between p-4 border-b border-border">
        <h2 className="text-lg font-heading font-bold text-foreground truncate pr-4">{place.name}</h2>
        <button onClick={onClose} className="p-1.5 rounded-full hover:bg-muted transition-colors shrink-0">
          <X className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      {place.photo_url && (
        <img src={place.photo_url} alt={place.name} className="w-full h-48 object-cover" />
      )}

      <div className="p-5 space-y-5">
        {/* Category badge */}
        <Badge className={`${categoryBgColors[place.category] || "bg-gray-500"} text-white`}>
          {categoryLabels[place.category] || place.category}
        </Badge>

        {/* Pet badges */}
        <div className="flex flex-wrap gap-2">
          {place.accepts_dogs && (
            <Badge variant="secondary" className="bg-green-100 text-green-800 gap-1">
              <Dog className="w-3.5 h-3.5" /> Chiens acceptés
            </Badge>
          )}
          {place.accepts_cats && (
            <Badge variant="secondary" className="bg-green-100 text-green-800 gap-1">
              <Cat className="w-3.5 h-3.5" /> Chats acceptés
            </Badge>
          )}
          {place.outdoor_seating && (
            <Badge variant="secondary" className="bg-green-100 text-green-800 gap-1">
              <TreePine className="w-3.5 h-3.5" /> Terrasse
            </Badge>
          )}
          {!place.outdoor_seating && (
            <Badge variant="secondary" className="bg-blue-100 text-blue-800 gap-1">
              <Home className="w-3.5 h-3.5" /> Intérieur OK
            </Badge>
          )}
          {place.dogs_on_leash_only && (
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 gap-1">
              🐕‍🦺 Laisse obligatoire
            </Badge>
          )}
        </div>

        {/* Rating */}
        {place.rating && (
          <div className="flex items-center gap-2">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={`w-4 h-4 ${i < Math.round(place.rating!) ? "text-amber-400 fill-amber-400" : "text-muted"}`}
              />
            ))}
            <span className="text-sm font-semibold text-foreground">{place.rating}</span>
          </div>
        )}

        {/* Opening hours */}
        {place.opening_hours && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Horaires</p>
            <p className="text-sm text-foreground">{place.opening_hours}</p>
          </div>
        )}

        {/* Address */}
        {place.address && (
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-sm text-foreground">{place.address}</p>
          </div>
        )}

        {/* Phone */}
        {place.phone && (
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
            <a href={`tel:${place.phone}`} className="text-sm text-primary hover:underline">
              {place.phone}
            </a>
          </div>
        )}

        {/* Website */}
        {place.website && (
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
            <a href={place.website} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline truncate">
              {place.website}
            </a>
          </div>
        )}

        {/* Description */}
        {place.description && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Description</p>
            <p className="text-sm text-foreground leading-relaxed">{place.description}</p>
          </div>
        )}

        {/* Directions button */}
        <Button
          className="w-full gap-2"
          onClick={() => window.open(directionsUrl, "_blank")}
        >
          <Navigation className="w-4 h-4" />
          Itinéraire
        </Button>

        {place.distance_km !== undefined && (
          <p className="text-xs text-center text-muted-foreground">
            À {place.distance_km.toFixed(1)} km de votre position
          </p>
        )}
      </div>
    </div>
  );
};

export default PlaceDetailPanel;
