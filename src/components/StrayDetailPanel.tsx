import { useEffect, useState } from "react";
import { X, MapPin, Clock, User, Trash2, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface StrayReport {
  id: string;
  user_id: string | null;
  lat: number;
  lng: number;
  species: string;
  description: string | null;
  condition: string | null;
  behavior: string | null;
  color: string | null;
  breed: string | null;
  photo_url: string | null;
  address: string | null;
  city: string | null;
  created_at: string;
}

interface StrayDetailPanelProps {
  report: StrayReport | null;
  onClose: () => void;
  onDeleted: () => void;
}

const CONDITION_COLORS: Record<string, string> = {
  Normal:    "bg-green-100 text-green-800",
  Apeuré:   "bg-yellow-100 text-yellow-800",
  Blessé:   "bg-red-100 text-red-800",
  Agressif: "bg-orange-100 text-orange-800",
  Épuisé:  "bg-purple-100 text-purple-800",
};

export default function StrayDetailPanel({ report, onClose, onDeleted }: StrayDetailPanelProps) {
  const { user } = useAuthContext();
  const [poster, setPoster] = useState<{ display_name: string | null; avatar_url: string | null } | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!report?.user_id) { setPoster(null); return; }
    supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", report.user_id)
      .maybeSingle()
      .then(({ data }) => setPoster(data));
  }, [report?.user_id]);

  if (!report) return null;

  const isOwner = user?.id === report.user_id;
  const date = new Date(report.created_at).toLocaleDateString("fr-FR", {
    day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
  const mapsUrl = `https://www.google.com/maps?q=${report.lat},${report.lng}`;
  const locationLabel = report.address || report.city || `${report.lat.toFixed(5)}, ${report.lng.toFixed(5)}`;

  const handleDelete = async () => {
    if (!isOwner) return;
    setDeleting(true);
    try {
      if (report.photo_url) {
        const path = report.photo_url.split("/stray-photos/")[1];
        if (path) await supabase.storage.from("stray-photos").remove([path]);
      }
      const { error } = await supabase.from("stray_reports").delete().eq("id", report.id);
      if (error) throw error;
      toast.success("Signalement supprimé");
      onDeleted();
      onClose();
    } catch (err: any) {
      toast.error(`Erreur : ${err.message}`);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      {/* FAB close — same position as locate-me */}
      <button
        onClick={onClose}
        className="fixed bottom-8 right-4 z-[601] p-3 bg-card/90 backdrop-blur-sm rounded-full shadow-lg border border-border hover:bg-muted transition-colors"
      >
        <X className="w-5 h-5 text-foreground" />
      </button>

      <div
        className="fixed bottom-0 left-0 right-0 z-[600] bg-card rounded-t-2xl shadow-2xl flex flex-col"
        style={{ top: 56 }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border shrink-0">
          <div className="w-10 h-10 bg-destructive/10 rounded-full flex items-center justify-center shrink-0">
            <span className="text-xl">🐾</span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-foreground text-base">Animal signalé</h2>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>{date}</span>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 min-h-0">
          <div className="p-5 space-y-4 pb-8">

            {/* Photo */}
            {report.photo_url && (
              <img
                src={report.photo_url}
                alt="Animal signalé"
                className="w-full h-52 object-cover rounded-xl"
              />
            )}

            {/* Poster */}
            <div className="flex items-center gap-3 bg-muted rounded-xl px-4 py-3">
              <div className="w-9 h-9 rounded-full bg-border flex items-center justify-center overflow-hidden shrink-0">
                {poster?.avatar_url
                  ? <img src={poster.avatar_url} alt="" className="w-full h-full object-cover" />
                  : <User className="w-4 h-4 text-muted-foreground" />
                }
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Signalé par</p>
                <button
                  className="text-sm font-semibold text-primary hover:underline truncate"
                  onClick={() => window.dispatchEvent(new CustomEvent("open-user-profile", { detail: { userId: report.user_id } }))}
                >
                  {poster?.display_name || "Utilisateur"}
                </button>
              </div>
            </div>

            {/* Localisation */}
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-2 bg-muted rounded-xl px-4 py-3 hover:bg-muted/80 transition-colors"
            >
              <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted-foreground">Localisation</p>
                <p className="text-sm font-medium text-foreground leading-snug">{locationLabel}</p>
              </div>
              <span className="text-xs text-primary shrink-0 mt-0.5">Voir →</span>
            </a>

            {/* Tags état / couleur / race */}
            <div className="flex flex-wrap gap-2">
              {report.condition && (
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${CONDITION_COLORS[report.condition] || "bg-muted text-foreground"}`}>
                  {report.condition}
                </span>
              )}
              {report.color && (
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-muted text-foreground">
                  🎨 {report.color}
                </span>
              )}
              {report.breed && (
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-muted text-foreground">
                  🐕 {report.breed}
                </span>
              )}
            </div>

            {/* Comportement */}
            {report.behavior && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Comportement</p>
                <p className="text-sm text-foreground">{report.behavior}</p>
              </div>
            )}

            {/* Description */}
            {report.description && (
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Description</p>
                <p className="text-sm text-foreground leading-relaxed">{report.description}</p>
              </div>
            )}

            {!report.photo_url && !report.description && !report.behavior && !report.color && !report.breed && !report.condition && (
              <p className="text-sm text-muted-foreground text-center py-4">Aucun détail renseigné</p>
            )}

            {/* Delete — owner only */}
            {isOwner && (
              <Button
                variant="outline"
                className="w-full text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
                Supprimer mon signalement
              </Button>
            )}
          </div>
        </ScrollArea>
      </div>
    </>
  );
}
