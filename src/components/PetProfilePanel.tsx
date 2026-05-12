import { useEffect, useState, useRef } from "react";
import { X, ChevronLeft, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Pet {
  id: string;
  user_id: string;
  name: string;
  species: string;
  breed: string | null;
  birth_date: string | null;
  sex: string | null;
  avatar_url: string | null;
  bio: string | null;
  color: string | null;
  size_class: string | null;
  is_vaccinated: boolean | null;
  is_sterilized: boolean | null;
  is_microchipped: boolean | null;
}

interface PetPhoto {
  id: string;
  url: string;
  caption: string | null;
  created_at: string;
}

interface PhotoComment {
  id: string;
  body: string;
  created_at: string;
  user_id: string;
  profiles: { display_name: string | null; avatar_url: string | null } | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function speciesEmoji(s: string | null): string {
  if (!s) return "🐾";
  const l = s.toLowerCase();
  if (l.includes("chien") || l.includes("dog")) return "🐕";
  if (l.includes("chat") || l.includes("cat")) return "🐈";
  if (l.includes("lapin") || l.includes("rabbit")) return "🐇";
  if (l.includes("oiseau") || l.includes("bird")) return "🦜";
  return "🐾";
}

function petAge(birthDate: string | null): string | null {
  if (!birthDate) return null;
  const months = Math.floor((Date.now() - new Date(birthDate).getTime()) / (1000 * 60 * 60 * 24 * 30));
  if (months < 1) return "< 1 mois";
  if (months < 12) return `${months} mois`;
  const y = Math.floor(months / 12);
  return `${y} an${y > 1 ? "s" : ""}`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins}min`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `il y a ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `il y a ${d}j`;
  return new Date(dateStr).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface PetProfilePanelProps {
  petId: string | null;
  onClose: () => void;
}

// ─── Photo detail view ────────────────────────────────────────────────────────

function PhotoDetail({
  photo,
  petName,
  onBack,
}: {
  photo: PetPhoto;
  petName: string;
  onBack: () => void;
}) {
  const { user } = useAuthContext();
  const [comments, setComments] = useState<PhotoComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadingComments(true);
      const { data } = await supabase
        .from("pet_photo_comments" as any)
        .select("id, body, created_at, user_id, profiles(display_name, avatar_url)")
        .eq("photo_id", photo.id)
        .order("created_at", { ascending: true });
      if (!cancelled && data) setComments(data as unknown as PhotoComment[]);
      setLoadingComments(false);
    }
    load();
    return () => { cancelled = true; };
  }, [photo.id]);

  const send = async () => {
    if (!user || !body.trim()) return;
    setSending(true);
    const { data, error } = await supabase
      .from("pet_photo_comments" as any)
      .insert({ photo_id: photo.id, user_id: user.id, body: body.trim() })
      .select("id, body, created_at, user_id, profiles(display_name, avatar_url)")
      .single();
    if (error) {
      toast.error("Impossible d'envoyer le commentaire");
    } else if (data) {
      setComments(prev => [...prev, data as unknown as PhotoComment]);
      setBody("");
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
    setSending(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border shrink-0">
        <button
          onClick={onBack}
          className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-bold text-foreground flex-1 truncate">
          Photo de {petName}
        </span>
      </div>

      {/* Photo */}
      <div className="relative bg-black shrink-0" style={{ maxHeight: "45vh" }}>
        <img
          src={photo.url}
          alt={photo.caption ?? ""}
          className="w-full object-contain"
          style={{ maxHeight: "45vh" }}
        />
      </div>

      {photo.caption && (
        <div className="px-4 py-2 text-xs text-muted-foreground border-b border-border italic shrink-0">
          {photo.caption}
        </div>
      )}

      {/* Comments */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {loadingComments ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8 text-xs text-muted-foreground">
            <span className="text-2xl opacity-30">💬</span>
            <p className="mt-2">Aucun commentaire — soyez le premier !</p>
          </div>
        ) : (
          comments.map(c => (
            <div key={c.id} className="flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
                {c.profiles?.avatar_url
                  ? <img src={c.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                  : <span className="text-xs font-bold text-muted-foreground">{(c.profiles?.display_name?.[0] ?? "?").toUpperCase()}</span>
                }
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-semibold text-foreground truncate">
                    {c.profiles?.display_name ?? "Anonyme"}
                  </span>
                  <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(c.created_at)}</span>
                </div>
                <p className="text-xs text-foreground mt-0.5 leading-relaxed">{c.body}</p>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {user ? (
        <div className="shrink-0 border-t border-border px-4 py-3 flex items-center gap-2">
          <input
            value={body}
            onChange={e => setBody(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Ajouter un commentaire…"
            maxLength={500}
            className="flex-1 text-sm bg-muted rounded-full px-3 py-1.5 outline-none placeholder:text-muted-foreground"
          />
          <button
            onClick={send}
            disabled={!body.trim() || sending}
            className="w-8 h-8 rounded-full bg-primary flex items-center justify-center disabled:opacity-40 transition-opacity"
          >
            {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin text-primary-foreground" /> : <Send className="w-3.5 h-3.5 text-primary-foreground" />}
          </button>
        </div>
      ) : (
        <div className="shrink-0 border-t border-border px-4 py-3 text-xs text-muted-foreground text-center">
          Connecte-toi pour commenter
        </div>
      )}
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────


export default function PetProfilePanel({ petId, onClose }: PetProfilePanelProps) {
  const [pet, setPet] = useState<Pet | null>(null);
  const [photos, setPhotos] = useState<PetPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<PetPhoto | null>(null);

  useEffect(() => {
    if (!petId) {
      setPet(null);
      setPhotos([]);
      setSelectedPhoto(null);
      return;
    }
    let cancelled = false;
    async function load() {
      setLoading(true);
      setSelectedPhoto(null);
      const [petRes, photosRes] = await Promise.all([
        supabase
          .from("pets" as any)
          .select("id, user_id, name, species, breed, birth_date, sex, avatar_url, bio, color, size_class, is_vaccinated, is_sterilized, is_microchipped")
          .eq("id", petId)
          .single(),
        supabase
          .from("pet_photos" as any)
          .select("id, url, caption, created_at")
          .eq("pet_id", petId)
          .order("created_at", { ascending: false }),
      ]);
      if (!cancelled) {
        setPet((petRes.data ?? null) as unknown as Pet | null);
        setPhotos((photosRes.data ?? []) as unknown as PetPhoto[]);
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [petId]);

  const isOpen = !!petId;
  const age = pet ? petAge(pet.birth_date) : null;

  return (
    <>
      {/* Overlay — identique à SubmitPlaceModal / StrayReportModal */}
      <div
        className="fixed inset-0 z-[700] bg-black/50"
        style={{ opacity: isOpen ? 1 : 0, transition: "opacity 0.3s ease", pointerEvents: isOpen ? "auto" : "none" }}
        onClick={onClose}
      />

      {/* Panel — bottom sheet identique à SubmitPlaceModal */}
      <div
        className="fixed left-0 right-0 bottom-0 z-[701] bg-card rounded-t-2xl shadow-2xl flex flex-col"
        style={{
          maxHeight: "85dvh",
          transform: isOpen ? "translateY(0)" : "translateY(100%)",
          transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        {selectedPhoto && pet ? (
          <PhotoDetail
            photo={selectedPhoto}
            petName={pet.name}
            onBack={() => setSelectedPhoto(null)}
          />
        ) : (
          <>
            {/* Drag handle */}
            <div className="shrink-0 flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border shrink-0">
              <span className="text-sm font-bold text-foreground">
                {pet ? `${speciesEmoji(pet.species)} ${pet.name}` : "Profil animal"}
              </span>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center items-center py-16">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : !pet ? (
                <div className="p-8 text-center text-sm text-muted-foreground">Animal introuvable</div>
              ) : (
                <div className="space-y-0">
                  {/* Hero */}
                  <div className="relative w-full bg-muted" style={{ height: 160 }}>
                    {pet.avatar_url
                      ? <img src={pet.avatar_url} alt={pet.name} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center text-7xl">{speciesEmoji(pet.species)}</div>
                    }
                    {/* Species overlay */}
                    <span className="absolute top-3 right-3 text-xs font-semibold px-2.5 py-1 rounded-full bg-black/50 text-white backdrop-blur-sm">
                      {speciesEmoji(pet.species)} {pet.species}
                    </span>
                    {pet.sex === "M" && (
                      <span className="absolute top-3 left-3 text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-500/80 text-white backdrop-blur-sm">♂ Mâle</span>
                    )}
                    {pet.sex === "F" && (
                      <span className="absolute top-3 left-3 text-xs font-semibold px-2.5 py-1 rounded-full bg-pink-500/80 text-white backdrop-blur-sm">♀ Femelle</span>
                    )}
                  </div>

                  {/* Info */}
                  <div className="px-4 py-4 space-y-3 border-b border-border">
                    <h2 className="text-xl font-extrabold text-foreground">{pet.name}</h2>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      {pet.breed && <span>{pet.breed}</span>}
                      {pet.color && <span>· {pet.color}</span>}
                      {age && <span>· {age}</span>}
                      {pet.size_class && (
                        <span>· {({ petit: "Petit", moyen: "Moyen", grand: "Grand", tres_grand: "Très grand" } as Record<string,string>)[pet.size_class] ?? pet.size_class}</span>
                      )}
                    </div>

                    {pet.bio && (
                      <p className="text-sm text-muted-foreground italic leading-relaxed border-l-2 border-primary/30 pl-3">"{pet.bio}"</p>
                    )}

                    {(pet.is_vaccinated || pet.is_sterilized || pet.is_microchipped) && (
                      <div className="flex gap-1.5 flex-wrap">
                        {pet.is_vaccinated  && <span className="text-[10px] bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 px-2 py-0.5 rounded-full font-medium">💉 Vacciné</span>}
                        {pet.is_sterilized  && <span className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 px-2 py-0.5 rounded-full font-medium">✂️ Stérilisé</span>}
                        {pet.is_microchipped && <span className="text-[10px] bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 px-2 py-0.5 rounded-full font-medium">📡 Pucé</span>}
                      </div>
                    )}
                  </div>

                  {/* Photo album */}
                  <div className="px-4 py-4">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                      Album · {photos.length} photo{photos.length !== 1 ? "s" : ""}
                    </p>

                    {photos.length === 0 ? (
                      <div className="text-center py-10 text-muted-foreground">
                        <span className="text-4xl opacity-30">📷</span>
                        <p className="text-xs mt-2">Aucune photo dans l'album</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-1">
                        {photos.map(photo => (
                          <button
                            key={photo.id}
                            onClick={() => setSelectedPhoto(photo)}
                            className="relative aspect-square overflow-hidden rounded-lg bg-muted hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-primary"
                          >
                            <img
                              src={photo.url}
                              alt={photo.caption ?? ""}
                              className="w-full h-full object-cover"
                            />
                            {photo.caption && (
                              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-1.5 py-1">
                                <p className="text-[9px] text-white line-clamp-1">{photo.caption}</p>
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
