import { X, MapPin, Clock } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export interface StrayReport {
  id: string;
  lat: number;
  lng: number;
  species: string;
  description: string | null;
  condition: string | null;
  behavior: string | null;
  color: string | null;
  breed: string | null;
  photo_url: string | null;
  city: string | null;
  created_at: string;
}

interface StrayDetailPanelProps {
  report: StrayReport | null;
  onClose: () => void;
}

const CONDITION_COLORS: Record<string, string> = {
  Normal:    "bg-green-100 text-green-800",
  Apeuré:   "bg-yellow-100 text-yellow-800",
  Blessé:   "bg-red-100 text-red-800",
  Agressif: "bg-orange-100 text-orange-800",
  Épuisé:  "bg-purple-100 text-purple-800",
};

export default function StrayDetailPanel({ report, onClose }: StrayDetailPanelProps) {
  if (!report) return null;

  const date = new Date(report.created_at).toLocaleDateString("fr-FR", {
    day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  const mapsUrl = `https://www.google.com/maps?q=${report.lat},${report.lng}`;

  return (
    <>
      {/* Floating close */}
      <button
        onClick={onClose}
        className="fixed bottom-8 right-4 z-[601] p-3 bg-card/90 backdrop-blur-sm rounded-full shadow-lg border border-border hover:bg-muted transition-colors"
      >
        <X className="w-5 h-5 text-foreground" />
      </button>

      <div
        className="fixed z-[600] inset-x-0 bottom-0 bg-card shadow-2xl flex flex-col rounded-t-2xl"
        style={{ top: 56 }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border shrink-0">
          <div className="w-10 h-10 bg-destructive/10 rounded-full flex items-center justify-center">
            <span className="text-xl">🐾</span>
          </div>
          <div className="min-w-0">
            <h2 className="font-bold text-foreground text-base">Animal signalé</h2>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>{date}</span>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 min-h-0">
          <div className="p-5 space-y-4">

            {/* Photo */}
            {report.photo_url && (
              <img
                src={report.photo_url}
                alt="Animal signalé"
                className="w-full h-52 object-cover rounded-xl"
              />
            )}

            {/* Localisation */}
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-muted rounded-xl px-4 py-3 hover:bg-muted/80 transition-colors"
            >
              <MapPin className="w-4 h-4 text-primary shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Localisation</p>
                <p className="text-sm font-medium text-foreground truncate">
                  {report.city || `${report.lat.toFixed(4)}, ${report.lng.toFixed(4)}`}
                </p>
              </div>
              <span className="ml-auto text-xs text-primary">Voir →</span>
            </a>

            {/* Tags */}
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
          </div>
        </ScrollArea>
      </div>
    </>
  );
}
