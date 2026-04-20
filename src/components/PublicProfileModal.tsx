import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface PublicProfileModalProps {
  userId: string;
  onClose: () => void;
}

interface PublicProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  city: string | null;
  points: number;
  created_at: string | null;
}

interface Pet {
  id: string;
  name: string;
  species: string;
  avatar_url: string | null;
}

function petEmoji(species: string): string {
  const map: Record<string, string> = { dog: "🐶", cat: "🐱", rabbit: "🐰", bird: "🐦" };
  return map[species] ?? "🐾";
}

function memberSince(dateStr: string | null): string {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

export default function PublicProfileModal({ userId, onClose }: PublicProfileModalProps) {
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [pets, setPets] = useState<Pet[]>([]);
  const [reviewCount, setReviewCount] = useState(0);
  const [placesCount, setPlacesCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [profileRes, petsRes, reviewsRes, placesRes] = await Promise.all([
        supabase.from("profiles").select("id, display_name, avatar_url, bio, city, points, created_at").eq("id", userId).single(),
        supabase.from("pets" as any).select("id, name, species, avatar_url").eq("user_id", userId),
        supabase.from("place_reviews").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("is_hidden", false),
        supabase.from("place_submissions").select("id", { count: "exact", head: true }).eq("submitted_by", userId).eq("status", "approved"),
      ]);
      if (profileRes.data) setProfile(profileRes.data as unknown as PublicProfile);
      if (petsRes.data) setPets(petsRes.data as unknown as Pet[]);
      setReviewCount(reviewsRes.count ?? 0);
      setPlacesCount(placesRes.count ?? 0);
      setLoading(false);
    }
    load();
  }, [userId]);

  return (
    <div className="fixed inset-0 z-[10001] bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="text-sm font-bold text-foreground">Profil public</span>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Chargement…</div>
        ) : !profile ? (
          <div className="p-8 text-center text-sm text-muted-foreground">Utilisateur introuvable</div>
        ) : (
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} className="w-16 h-16 rounded-full object-cover border-2 border-primary/20 flex-shrink-0" alt="" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-2xl font-bold text-muted-foreground border-2 border-border flex-shrink-0">
                  {(profile.display_name?.[0] ?? "?").toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="font-bold text-foreground text-base truncate">{profile.display_name ?? "Anonyme"}</p>
                {profile.city && <p className="text-xs text-muted-foreground">📍 {profile.city}</p>}
                {profile.created_at && (
                  <p className="text-xs text-muted-foreground">Membre depuis {memberSince(profile.created_at)}</p>
                )}
              </div>
            </div>

            {profile.bio && (
              <p className="text-xs text-muted-foreground italic leading-relaxed border-l-2 border-primary/30 pl-2">{profile.bio}</p>
            )}

            <div className="grid grid-cols-3 gap-2">
              <div className="bg-secondary rounded-xl p-2.5 text-center border border-border">
                <p className="text-lg font-extrabold text-primary">{profile.points}</p>
                <p className="text-[10px] text-muted-foreground">Points</p>
              </div>
              <div className="bg-secondary rounded-xl p-2.5 text-center border border-border">
                <p className="text-lg font-extrabold text-foreground">{reviewCount}</p>
                <p className="text-[10px] text-muted-foreground">Avis</p>
              </div>
              <div className="bg-secondary rounded-xl p-2.5 text-center border border-border">
                <p className="text-lg font-extrabold text-foreground">{placesCount}</p>
                <p className="text-[10px] text-muted-foreground">Lieux</p>
              </div>
            </div>

            {pets.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-2">Animaux</p>
                <div className="flex flex-wrap gap-2">
                  {pets.map(pet => (
                    <div key={pet.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs text-primary">
                      {pet.avatar_url
                        ? <img src={pet.avatar_url} className="w-5 h-5 rounded-full object-cover" alt="" />
                        : <span>{petEmoji(pet.species)}</span>
                      }
                      {pet.name}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
