import { useEffect, useState } from "react";
import { X, MapPin, User, Calendar, MessageCircle, Loader2, AlertTriangle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface UserProfile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  city: string | null;
  points: number;
  created_at: string | null;
}

function timeAgo(dateStr: string): string {
  const months = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24 * 30));
  if (months < 1) return "Ce mois-ci";
  if (months < 12) return `Membre depuis ${months} mois`;
  const years = Math.floor(months / 12);
  return `Membre depuis ${years} an${years > 1 ? "s" : ""}`;
}

interface UserProfilePanelProps {
  userId: string | null;
  onClose: () => void;
  onOpenChat: (convId: string, other: { id: string; display_name: string | null; avatar_url: string | null }) => void;
}

export default function UserProfilePanel({ userId, onClose, onOpenChat }: UserProfilePanelProps) {
  const { user: me } = useAuthContext();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [strayCount, setStrayCount] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [lostPets, setLostPets] = useState<Array<{ id: string; pet_name: string; breed: string | null; color: string | null; status: string; last_seen_address: string | null; created_at: string }>>([]);

  const handleMessage = async () => {
    if (!me) { toast.error("Connectez-vous pour envoyer un message"); window.dispatchEvent(new CustomEvent("open-auth-modal")); return; }
    if (!userId || !profile) return;
    setStarting(true);
    try {
      const [u1, u2] = [me.id, userId].sort();
      await supabase.from("conversations").insert({ user1_id: u1, user2_id: u2 });
      const { data: conv } = await supabase
        .from("conversations")
        .select("id")
        .or(`and(user1_id.eq.${u1},user2_id.eq.${u2}),and(user1_id.eq.${u2},user2_id.eq.${u1})`)
        .maybeSingle();
      if (!conv) throw new Error("Impossible de créer la conversation");
      onOpenChat(conv.id, { id: profile.id, display_name: profile.display_name, avatar_url: profile.avatar_url });
      onClose();
    } catch (err: any) {
      toast.error("Erreur : " + err.message);
    } finally {
      setStarting(false);
    }
  };

  useEffect(() => {
    if (!userId) { setProfile(null); return; }
    setLoading(true);

    Promise.all([
      supabase.from("profiles").select("id, display_name, avatar_url, bio, city, points, created_at").eq("id", userId).maybeSingle(),
      supabase.from("stray_reports").select("id", { count: "exact" }).eq("user_id", userId).eq("status", "active"),
      supabase.from("place_reviews").select("id", { count: "exact" }).eq("user_id", userId),
      supabase.from("lost_pets" as any).select("id, pet_name, breed, color, status, last_seen_address, created_at").eq("user_id", userId).order("created_at", { ascending: false }),
    ]).then(([{ data: prof }, { count: strays }, { count: reviews }, { data: pets }]) => {
      setProfile(prof as UserProfile);
      setStrayCount(strays || 0);
      setReviewCount(reviews || 0);
      setLostPets((pets as any) || []);
      setLoading(false);
    });
  }, [userId]);

  if (!userId) return null;

  return (
    <>
      {/* FAB close */}
      <button
        onClick={onClose}
        className="fixed bottom-8 right-4 z-[701] p-3 bg-card/90 backdrop-blur-sm rounded-full shadow-lg border border-border hover:bg-muted transition-colors"
      >
        <X className="w-5 h-5 text-foreground" />
      </button>

      <div
        className="fixed bottom-0 left-0 right-0 z-[700] bg-card rounded-t-2xl shadow-2xl flex flex-col"
        style={{ top: 56 }}
      >
        {/* Header */}
        <div className="px-5 pt-6 pb-4 border-b border-border shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0 border-2 border-border">
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                : <User className="w-8 h-8 text-muted-foreground" />
              }
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-foreground text-xl truncate">
                {loading ? "…" : profile?.display_name || "Utilisateur"}
              </h2>
              {profile?.city && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                  <MapPin className="w-3 h-3" />
                  <span>{profile.city}</span>
                </div>
              )}
              {profile?.created_at && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                  <Calendar className="w-3 h-3" />
                  <span>{timeAgo(profile.created_at)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 min-h-0">
          <div className="p-5 space-y-5">

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-muted rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-foreground">{profile?.points ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Points</p>
              </div>
              <div className="bg-muted rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-foreground">{strayCount}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Signalements</p>
              </div>
              <div className="bg-muted rounded-xl p-3 text-center">
                <p className="text-2xl font-bold text-foreground">{reviewCount}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Avis</p>
              </div>
            </div>

            {/* Bio */}
            {profile?.bio && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">À propos</p>
                <p className="text-sm text-foreground leading-relaxed">{profile.bio}</p>
              </div>
            )}

            {/* Lost pets section */}
            {(lostPets.length > 0 || (me && me.id === userId)) && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">🆘 Animaux perdus</p>
                  {me && me.id === userId && (
                    <button
                      onClick={() => window.dispatchEvent(new CustomEvent("open-lost-pet-modal"))}
                      className="text-xs text-amber-600 dark:text-amber-400 font-semibold hover:underline"
                    >
                      + Signaler
                    </button>
                  )}
                </div>
                {lostPets.length === 0 && me && me.id === userId && (
                  <p className="text-xs text-muted-foreground italic">Aucun signalement actif</p>
                )}
                {lostPets.map(pet => (
                  <button
                    key={pet.id}
                    onClick={() => window.dispatchEvent(new CustomEvent("open-lost-pet", { detail: { petId: pet.id } }))}
                    className="w-full text-left p-3 rounded-xl border border-border hover:bg-muted transition-colors space-y-0.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-foreground text-sm">{pet.pet_name}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${pet.status === "active" ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" : "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"}`}>
                        {pet.status === "active" ? "🆘 Perdu" : "✅ Retrouvé"}
                      </span>
                    </div>
                    <div className="flex gap-2 text-xs text-muted-foreground flex-wrap">
                      {pet.breed && <span>{pet.breed}</span>}
                      {pet.color && <span>· {pet.color}</span>}
                    </div>
                    {pet.last_seen_address && (
                      <p className="text-xs text-muted-foreground truncate">📍 {pet.last_seen_address}</p>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Message button — only for other users */}
            {me && me.id !== userId && profile && (
              <Button
                onClick={handleMessage}
                disabled={starting}
                className="w-full gap-2"
              >
                {starting ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageCircle className="w-4 h-4" />}
                Envoyer un message
              </Button>
            )}

            {!loading && !profile && (
              <p className="text-center text-muted-foreground text-sm py-8">Profil introuvable</p>
            )}
          </div>
        </ScrollArea>
      </div>
    </>
  );
}
