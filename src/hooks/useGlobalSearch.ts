import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SearchResult =
  | { type: "place"; id: string; name: string; city: string | null; category: string; lat: number; lng: number; photo_url: string | null }
  | { type: "user"; id: string; display_name: string | null; avatar_url: string | null; city: string | null }
  | { type: "stray"; id: string; city: string | null; lat: number; lng: number; photo_url: string | null }
  | { type: "lost_pet"; id: string; pet_name: string; breed: string | null; city: string | null; last_seen_lat: number | null; last_seen_lng: number | null; status: string };

export function useGlobalSearch() {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const search = useCallback((query: string) => {
    clearTimeout(timerRef.current);
    if (!query.trim()) { setResults([]); setLoading(false); return; }

    setLoading(true);
    timerRef.current = setTimeout(async () => {
      const ilike = `%${query.trim()}%`;

      const [places, users, strays, lostPets] = await Promise.all([
        supabase
          .from("pet_friendly_places")
          .select("id, name, city, category, latitude, longitude, photo_url")
          .or(`name.ilike.${ilike},city.ilike.${ilike}`)
          .limit(5),
        supabase
          .from("profiles")
          .select("id, display_name, avatar_url, city")
          .ilike("display_name", ilike)
          .limit(4),
        supabase
          .from("stray_reports")
          .select("id, city, lat, lng, photo_url")
          .or(`city.ilike.${ilike},description.ilike.${ilike}`)
          .eq("status", "active")
          .limit(3),
        supabase
          .from("lost_pets" as any)
          .select("id, pet_name, breed, city, last_seen_lat, last_seen_lng, status, last_seen_address")
          .or(`pet_name.ilike.${ilike},breed.ilike.${ilike},last_seen_address.ilike.${ilike}`)
          .limit(3),
      ]);

      const merged: SearchResult[] = [
        ...((places.data || []) as any[]).map(p => ({
          type: "place" as const, id: p.id, name: p.name, city: p.city,
          category: p.category, lat: p.latitude, lng: p.longitude, photo_url: p.photo_url,
        })),
        ...((users.data || []) as any[]).map(u => ({
          type: "user" as const, id: u.id, display_name: u.display_name,
          avatar_url: u.avatar_url, city: u.city,
        })),
        ...((strays.data || []) as any[]).map(s => ({
          type: "stray" as const, id: s.id, city: s.city,
          lat: s.lat, lng: s.lng, photo_url: s.photo_url,
        })),
        ...((lostPets.data || []) as any[]).map(p => ({
          type: "lost_pet" as const, id: p.id, pet_name: p.pet_name, breed: p.breed,
          city: p.city, last_seen_lat: p.last_seen_lat, last_seen_lng: p.last_seen_lng, status: p.status,
        })),
      ];

      setResults(merged);
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
