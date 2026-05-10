import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ResultType = "place" | "user" | "stray" | "lost_pet";

export type SearchResult =
  | { type: "place"; id: string; name: string; city: string | null; category: string; lat: number; lng: number; photo_url: string | null }
  | { type: "user"; id: string; display_name: string | null; avatar_url: string | null; city: string | null }
  | { type: "stray"; id: string; city: string | null; lat: number; lng: number; photo_url: string | null }
  | { type: "lost_pet"; id: string; pet_name: string; breed: string | null; city: string | null; last_seen_lat: number | null; last_seen_lng: number | null; status: string };

export interface SearchFilters {
  category: string | null;
  types: ResultType[];
  city: string | null;
}

const ALL_TYPES: ResultType[] = ["place", "user", "stray", "lost_pet"];

// Maps typed keywords to DB category values
const CATEGORY_MAP: Record<string, string> = {
  "vétérinaire": "veterinaire", "veterinaire": "veterinaire", "véto": "veterinaire", "veto": "veterinaire", "clinique": "veterinaire",
  "animalerie": "animalerie", "boutique": "animalerie", "shop": "animalerie",
  "parc": "parc_chiens", "parcs": "parc_chiens",
  "restaurant": "restaurant", "resto": "restaurant", "brasserie": "restaurant",
  "hôtel": "hotel", "hotel": "hotel", "hébergement": "hotel",
  "café": "cafe", "cafe": "cafe", "coffee": "cafe", "bar": "cafe",
  "refuge": "refuge", "association": "refuge",
  "spa": "spa", "camping": "camping", "plage": "plage",
  "outdoor": "outdoor", "loisir": "loisir",
};

function detectCategoryFromQuery(words: string[]): { category: string | null; remaining: string[] } {
  for (const word of words) {
    const cat = CATEGORY_MAP[word.toLowerCase()];
    if (cat) return { category: cat, remaining: words.filter(w => w.toLowerCase() !== word.toLowerCase()) };
  }
  return { category: null, remaining: words };
}

export function useGlobalSearch() {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const search = useCallback((query: string, filters: SearchFilters) => {
    clearTimeout(timerRef.current);

    const q          = query.trim();
    const words      = q.split(/\s+/).filter(Boolean);
    const hasQuery   = q.length > 0;
    const hasFilters = filters.category || filters.city || filters.types.length < ALL_TYPES.length;

    // Nothing to search
    if (!hasQuery && !hasFilters) { setResults([]); setLoading(false); return; }

    setLoading(true);
    timerRef.current = setTimeout(async () => {

      // ── Detect category/city from typed query (only if no explicit filter) ──
      const { category: detectedCat, remaining } = detectCategoryFromQuery(words);
      const effectiveCat  = filters.category || detectedCat;
      const effectiveCity = filters.city;
      const textForSearch = filters.category ? q : (remaining.join(" ") || q);
      const tIlike  = textForSearch ? `%${textForSearch}%` : null;
      const qIlike  = q ? `%${q}%` : null;
      const cityIlike = effectiveCity ? `%${effectiveCity}%` : null;

      const showPlaces   = filters.types.includes("place");
      const showUsers    = filters.types.includes("user");
      const showStrays   = filters.types.includes("stray");
      const showLostPets = filters.types.includes("lost_pet");

      // ── Build places query ──
      const buildPlaces = async () => {
        if (!showPlaces) return [];
        let q2 = supabase.from("pet_friendly_places")
          .select("id, name, city, category, latitude, longitude, photo_url");

        // Category filter
        if (effectiveCat) q2 = q2.eq("category", effectiveCat);

        // City filter
        if (cityIlike) q2 = q2.ilike("city", cityIlike);

        // Text filter — if there's remaining text, filter by name or city
        if (tIlike) {
          if (effectiveCat && cityIlike) {
            q2 = q2.ilike("name", tIlike);              // both locked → name only
          } else if (effectiveCat && !cityIlike) {
            q2 = q2.or(`name.ilike.${tIlike},city.ilike.${tIlike}`);
          } else if (!effectiveCat && cityIlike) {
            q2 = q2.ilike("name", tIlike);              // city locked → name only
          } else {
            q2 = q2.or(`name.ilike.${tIlike},city.ilike.${tIlike}`);
          }
        }

        const { data } = await q2.order("name").limit(20);
        return ((data || []) as any[]).map(p => ({
          type: "place" as const, id: p.id, name: p.name, city: p.city,
          category: p.category, lat: p.latitude, lng: p.longitude, photo_url: p.photo_url,
        }));
      };

      // ── Build users query ──
      const buildUsers = async () => {
        if (!showUsers) return [];
        if (!hasQuery && !effectiveCity) return []; // need at least some signal
        let q2 = supabase.from("profiles").select("id, display_name, avatar_url, city");
        if (qIlike)   q2 = q2.ilike("display_name", qIlike);
        if (cityIlike) q2 = q2.ilike("city", cityIlike);
        if (!qIlike && !cityIlike) return [];
        const { data } = await q2.limit(10);
        return ((data || []) as any[]).map(u => ({
          type: "user" as const, id: u.id, display_name: u.display_name,
          avatar_url: u.avatar_url, city: u.city,
        }));
      };

      // ── Build strays query ──
      const buildStrays = async () => {
        if (!showStrays) return [];
        let q2 = supabase.from("stray_reports")
          .select("id, city, lat, lng, photo_url").eq("status", "active");
        if (cityIlike) q2 = q2.ilike("city", cityIlike);
        else if (qIlike) q2 = q2.or(`city.ilike.${qIlike},description.ilike.${qIlike}`);
        else if (!filters.types.includes("stray") || showStrays) { /* show all if stray type is selected alone */ }
        const { data } = await q2.limit(8);
        return ((data || []) as any[]).map(s => ({
          type: "stray" as const, id: s.id, city: s.city,
          lat: s.lat, lng: s.lng, photo_url: s.photo_url,
        }));
      };

      // ── Build lost pets query ──
      const buildLostPets = async () => {
        if (!showLostPets) return [];
        let q2 = supabase.from("lost_pets" as any)
          .select("id, pet_name, breed, city, last_seen_lat, last_seen_lng, status, last_seen_address");
        if (cityIlike) q2 = (q2 as any).ilike("city", cityIlike);
        else if (qIlike) q2 = (q2 as any).or(`pet_name.ilike.${qIlike},breed.ilike.${qIlike},last_seen_address.ilike.${qIlike}`);
        const { data } = await (q2 as any).limit(8);
        return ((data || []) as any[]).map(p => ({
          type: "lost_pet" as const, id: p.id, pet_name: p.pet_name, breed: p.breed,
          city: p.city, last_seen_lat: p.last_seen_lat, last_seen_lng: p.last_seen_lng, status: p.status,
        }));
      };

      const [places, users, strays, lostPets] = await Promise.all([
        buildPlaces(), buildUsers(), buildStrays(), buildLostPets(),
      ]);

      setResults([...places, ...users, ...strays, ...lostPets] as SearchResult[]);
      setLoading(false);
    }, 300);
  }, []);

  const clear = useCallback(() => {
    clearTimeout(timerRef.current);
    setResults([]);
    setLoading(false);
  }, []);

  return { results, loading, search, clear };
}
