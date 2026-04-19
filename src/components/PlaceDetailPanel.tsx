import { X, Star, Phone, Globe, MapPin, Navigation, Dog, Cat, TreePine, Home, Heart, ChevronLeft, ThumbsUp, Flag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
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
  distance_km?: number;
  google_place_id?: string | null;
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
  onBack?: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  onReport?: () => void;
}

const PlaceDetailPanel = ({ place, onClose, onBack, isFavorite, onToggleFavorite, onReport }: PlaceDetailPanelProps) => {
  if (!place) return null;

  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`;

  return (
    <div className="fixed top-0 right-0 h-full w-full sm:w-[400px] bg-card z-50 shadow-2xl overflow-y-auto animate-slide-in-right">
      <div className="sticky top-0 bg-card z-10 flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          {onBack && (
            <button onClick={onBack} className="p-1.5 rounded-full hover:bg-muted transition-colors shrink-0" title="Retour">
              <ChevronLeft className="w-5 h-5 text-muted-foreground" />
            </button>
          )}
          <h2 className="text-lg font-heading font-bold text-foreground truncate">{place.name}</h2>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {onToggleFavorite && (
            <button
              onClick={onToggleFavorite}
              className="p-1.5 rounded-full hover:bg-muted transition-all active:scale-125"
            >
              <Heart
                className={`w-5 h-5 transition-colors ${isFavorite ? "text-destructive fill-destructive" : "text-muted-foreground"}`}
              />
            </button>
          )}
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-muted transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {place.photo_url && (
        <img src={place.photo_url} alt={place.name} className="w-full h-48 object-cover" />
      )}

      <div className="p-5 space-y-5">
        <Badge className={`${categoryBgColors[place.category] || "bg-gray-500"} text-white`}>
          {categoryLabels[place.category] || place.category}
        </Badge>

        <div className="rounded-lg border-2 border-green-300 bg-green-50 dark:bg-green-950/30 dark:border-green-800 p-3 space-y-2">
          <p className="text-sm font-bold text-green-700 dark:text-green-400 flex items-center gap-2">
            ✅ Lieu vérifié pet-friendly
          </p>
          <div className="flex flex-wrap gap-2">
            {place.accepts_dogs && (
              <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 gap-1">
                <Dog className="w-3.5 h-3.5" /> 🐕 Chiens acceptés
              </Badge>
            )}
            {place.accepts_cats && (
              <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 gap-1">
                <Cat className="w-3.5 h-3.5" /> 🐱 Chats acceptés
              </Badge>
            )}
            {place.outdoor_seating && (
              <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 gap-1">
                <TreePine className="w-3.5 h-3.5" /> Terrasse extérieure
              </Badge>
            )}
            {!place.outdoor_seating && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300 gap-1">
                <Home className="w-3.5 h-3.5" /> Animaux OK en intérieur
              </Badge>
            )}
            {place.dogs_on_leash_only && (
              <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300 gap-1">
                🐕‍🦺 Laisse obligatoire
              </Badge>
            )}
          </div>
        </div>

        {place.rating && (
          <div className="flex items-center gap-2">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className={`w-4 h-4 ${i < Math.round(place.rating!) ? "text-amber-400 fill-amber-400" : "text-muted"}`} />
            ))}
            <span className="text-sm font-semibold text-foreground">{place.rating}</span>
          </div>
        )}

        {place.opening_hours && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Horaires</p>
            <p className="text-sm text-foreground">{place.opening_hours}</p>
          </div>
        )}

        {place.address && (
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-sm text-foreground">{place.address}</p>
          </div>
        )}

        {place.phone && (
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
            <a href={`tel:${place.phone}`} className="text-sm text-primary hover:underline">{place.phone}</a>
          </div>
        )}

        {place.website && (
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
            <a href={place.website} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline truncate">{place.website}</a>
          </div>
        )}

        {place.description && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Description</p>
            <p className="text-sm text-foreground leading-relaxed">{place.description}</p>
          </div>
        )}

        {onReport && (
          <button
            onClick={onReport}
            className="w-full text-xs h-9 rounded-xl font-semibold flex items-center justify-center gap-1.5 border border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100 dark:bg-orange-950/30 dark:text-orange-300 dark:border-orange-800 transition-colors"
          >
            ⚠️ Signaler un problème
          </button>
        )}

        <Button className="w-full gap-2" onClick={() => window.open(directionsUrl, "_blank")}>
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
