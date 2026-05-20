import { useEffect, useRef, useState } from "react";
import { X, Clock, User, Trash2, Loader2, ChevronUp } from "lucide-react";
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

  // ── Bottom sheet state (same pattern as LostPetModal) ──
  const [visible, setVisible] = useState(false);
  const [snapState, setSnapState] = useState<"half" | "full">("half");
  const [dragging, setDragging] = useState(false);
  const [dragDelta, setDragDelta] = useState(0);
  const isDragging    = useRef(false);
  const dragStartY    = useRef(0);
  const lastTouchY    = useRef(0);
  const lastTouchTime = useRef(0);
  const lastVelocity  = useRef(0);

  // Entry animation
  useEffect(() => {
    setSnapState("half");
    setDragDelta(0);
    setTimeout(() => setVisible(true), 10);
  }, [report?.id]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 300);
  };

  const handleDragStart = (e: React.TouchEvent) => {
    isDragging.current = true;
    dragStartY.current = e.touches[0].clientY;
    lastTouchY.current = e.touches[0].clientY;
    lastTouchTime.current = Date.now();
    lastVelocity.current = 0;
    setDragging(true);
    setDragDelta(0);
  };

  const handleDragMove = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    const y = e.touches[0].clientY;
    const now = Date.now();
    const dt = now - lastTouchTime.current;
    if (dt > 0) lastVelocity.current = (y - lastTouchY.current) / dt;
    lastTouchY.current = y;
    lastTouchTime.current = now;
    setDragDelta(y - dragStartY.current);
  };

  const handleDragEnd = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    setDragging(false);
    const h = window.innerHeight - 56;
    const deltaPct = h > 0 ? (dragDelta / h) * 100 : 0;
    const vel = lastVelocity.current;
    if (snapState === "half") {
      if (vel < -0.3 || deltaPct < -15) setSnapState("full");
      else if (vel > 0.3 || deltaPct > 15) handleClose();
    } else {
      if (vel > 0.5 || deltaPct > 25) setSnapState("half");
    }
    setDragDelta(0);
  };

  useEffect(() => {
    if (!report?.user_id) { setPoster(null); return; }
    supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("id", report.user_id)
      .maybeSingle()
      .then(({ data }) => setPoster(data));
  }, [report?.user_id]);

  useEffect(() => {
    if (!report) return;
    window.dispatchEvent(new Event("map-freeze"));
    return () => { window.dispatchEvent(new Event("map-unfreeze")); };
  }, [report?.id]);

  if (!report) return null;

  const isOwner = user?.id === report.user_id;
  const date = new Date(report.created_at).toLocaleDateString("fr-FR", {
    day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  const handleDelete = async () => {
    if (!isOwner) return;
    setDeleting(true);
    try {
      if (report.photo_url) {
        const path = report.photo_url.split("/stray-photos/")[1];
        if (path) await supabase.storage.from("stray-photos").remove([path]);
      }
      const { error } = await supabase.from("stray_reports").delete().eq("id", report.id).eq("user_id", user!.id);
      if (error) throw error;
      toast.success("Signalement supprimé");
      onDeleted();
      handleClose();
    } catch (err: any) {
      toast.error(`Erreur : ${err.message}`);
    } finally {
      setDeleting(false);
    }
  };

  const snapBase = snapState === "full" ? 0 : 55;
  const h = window.innerHeight - 56;
  const dragPct = dragging && h > 0 ? (dragDelta / h) * 100 : 0;
  const currentPct = Math.max(0, Math.min(100, snapBase + dragPct));

  return (
    <>
      {/* Scrim */}
      <div
        className="fixed inset-0 z-[599] bg-black/50"
        style={{ opacity: visible ? 1 : 0, transition: "opacity 0.3s ease", touchAction: "none" }}
        onClick={handleClose}
      />

      {/* Panel */}
      <div
        className="fixed left-0 right-0 bottom-0 z-[600] bg-card rounded-t-2xl shadow-2xl flex flex-col"
        style={{
          top: 0,
          paddingTop: snapState === "full" ? "env(safe-area-inset-top)" : 0,
          transform: `translateY(${visible ? currentPct + "%" : "100%"})`,
          transition: dragging ? "none" : "transform 0.3s cubic-bezier(0.4,0,0.2,1), padding-top 0.3s cubic-bezier(0.4,0,0.2,1)",
        }}
      >
        {/* Drag handle */}
        <div
          className="shrink-0 flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing"
          onTouchStart={handleDragStart}
          onTouchMove={handleDragMove}
          onTouchEnd={handleDragEnd}
          style={{ touchAction: "none" }}
        >
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div
          className="flex items-center justify-between px-5 pt-3 pb-3 border-b border-border shrink-0"
          onTouchStart={handleDragStart}
          onTouchMove={handleDragMove}
          onTouchEnd={handleDragEnd}
          style={{ touchAction: "none" }}
        >
          <div>
            <h2 className="font-bold text-lg text-foreground">🐾 Animal signalé</h2>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
              <Clock className="w-3 h-3" />
              <span>{date}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => setSnapState(s => s === "half" ? "full" : "half")} className="p-1.5 rounded-full hover:bg-muted transition-colors">
              <ChevronUp className={`w-5 h-5 text-muted-foreground transition-transform duration-300 ${snapState === "full" ? "rotate-180" : ""}`} />
            </button>
            <button onClick={handleClose} className="p-1.5 rounded-full hover:bg-muted transition-colors">
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-5 space-y-4 pb-24" style={{ overflowY: "auto", touchAction: "pan-y" }}>

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
      </div>
    </>
  );
}
