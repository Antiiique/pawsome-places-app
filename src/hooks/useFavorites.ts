import { useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "petfriendly_favorites";

export interface FavoritePlace {
  id: string;
  name: string;
  category: string;
  subcategory?: string | null;
  address?: string | null;
  city?: string | null;
  lat: number;
  lng: number;
  phone?: string | null;
  website?: string | null;
  accepts_dogs: boolean;
  accepts_cats?: boolean;
  rating?: number | null;
  placeId?: string | null;
  isPetFriendly?: boolean;
  source?: string;
  savedAt: string;
}

function detectCategoryFromTypes(types?: string[]): string {
  if (!types) return "other";
  if (types.some(t => ["restaurant", "cafe", "bar", "food", "meal_delivery", "meal_takeaway"].includes(t))) return "restaurant";
  if (types.some(t => ["lodging", "hotel"].includes(t))) return "hotel";
  if (types.some(t => ["supermarket", "grocery_or_supermarket", "store", "shopping_mall", "clothing_store", "convenience_store"].includes(t))) return "animalerie";
  if (types.some(t => ["campground"].includes(t))) return "camping";
  if (types.some(t => ["park", "natural_feature"].includes(t))) return "outdoor";
  if (types.some(t => ["hospital", "veterinary_care", "pharmacy", "doctor"].includes(t))) return "services";
  if (types.some(t => ["transit_station", "airport", "train_station", "bus_station"].includes(t))) return "transport";
  return "other";
}

export { detectCategoryFromTypes };

function loadFavorites(): FavoritePlace[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoritePlace[]>(loadFavorites);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  }, [favorites]);

  const isFavorite = useCallback((id: string) => favorites.some((f) => f.id === id), [favorites]);

  const toggleFavorite = useCallback((place: Omit<FavoritePlace, "savedAt">) => {
    setFavorites((prev) => {
      const exists = prev.some((f) => f.id === place.id);
      if (exists) {
        return prev.filter((f) => f.id !== place.id);
      }
      return [...prev, { ...place, savedAt: new Date().toISOString() }];
    });
    return !favorites.some((f) => f.id === place.id);
  }, [favorites]);

  const removeFavorite = useCallback((id: string) => {
    setFavorites((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const clearAll = useCallback(() => setFavorites([]), []);

  return { favorites, isFavorite, toggleFavorite, removeFavorite, clearAll, count: favorites.length };
}
