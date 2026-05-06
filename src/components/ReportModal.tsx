import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuthContext } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { X } from "lucide-react";

const REASONS = [
  { value: "not_pet_friendly", label: "🚫 Ce lieu n'accepte pas les animaux" },
  { value: "closed", label: "🔒 Ce lieu est fermé définitivement" },
  { value: "wrong_info", label: "✏️ Les informations sont incorrectes (adresse, téléphone, horaires)" },
  { value: "no_longer_exists", label: "❌ Ce lieu n'existe plus" },
  { value: "other", label: "💬 Autre problème" },
];

interface ReportModalProps {
  open: boolean;
  onClose: () => void;
  placeId: string | null;
  placeName: string;
  onLoginRequired: () => void;
}

export default function ReportModal({ open, onClose, placeId, placeName, onLoginRequired }: ReportModalProps) {
  const { user } = useAuthContext();
  const [reason, setReason] = useState("");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      const raf = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(raf);
    } else {
      setVisible(false);
    }
  }, [open]);

  function handleClose() {
    setVisible(false);
    setTimeout(() => {
      setReason("");
      setComment("");
      setError(null);
      onClose();
    }, 220);
  }

  async function handleSubmit() {
    if (!user || !reason) return;
    if (!placeId) {
      setError("Ce lieu n'est pas encore dans notre base de données. Utilisez 'Ajouter un lieu' pour le soumettre.");
      return;
    }
    setLoading(true);
    setError(null);
    const { error: err } = await supabase.from("place_reports").insert({
      place_id: placeId,
      reported_by: user.id,
      reason,
      comment: comment.trim() || null,
    });
    setLoading(false);
    if (err) { setError(err.message); return; }
    toast.success("✅ Signalement envoyé ! L'administrateur va examiner votre demande.");
    handleClose();
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4"
      style={{
        backgroundColor: `rgba(0,0,0,${visible ? 0.55 : 0})`,
        transition: "background-color 0.22s ease",
      }}
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-md bg-card rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{
          maxHeight: "85dvh",
          opacity: visible ? 1 : 0,
          transform: visible ? "scale(1) translateY(0)" : "scale(0.96) translateY(12px)",
          transition: "opacity 0.22s ease, transform 0.22s ease",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <h2 className="text-base font-bold text-foreground">⚠️ Signaler un problème</h2>
          <button
            onClick={handleClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {!user ? (
            <div className="flex flex-col items-center text-center gap-4 py-2">
              <span className="text-5xl">⚠️</span>
              <p className="text-base font-bold text-foreground">Connexion requise</p>
              <p className="text-sm text-muted-foreground">
                Rejoins la communauté World Pet Friendly pour signaler les informations incorrectes et aider les autres voyageurs avec leurs animaux.
              </p>
              <button
                className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
                onClick={() => { onClose(); onLoginRequired(); }}
              >
                Créer un compte / Se connecter
              </button>
              <button
                className="w-full py-2.5 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors"
                onClick={handleClose}
              >
                Annuler
              </button>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Signaler un problème pour <span className="font-semibold text-foreground">{placeName}</span>
              </p>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Type de signalement *</label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Sélectionner un motif…" />
                  </SelectTrigger>
                  <SelectContent className="z-[1100]">
                    {REASONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Précisions (optionnel)</label>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Décrivez le problème rencontré..."
                  rows={3}
                  className="rounded-xl resize-none"
                />
              </div>

              {error && (
                <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2">{error}</p>
              )}

              <button
                className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 hover:bg-primary/90 transition-colors"
                onClick={handleSubmit}
                disabled={!reason || loading}
              >
                {loading ? "Envoi…" : "Envoyer le signalement"}
              </button>

              <button
                className="w-full py-2.5 rounded-xl border border-border text-sm font-semibold text-muted-foreground hover:bg-muted transition-colors"
                onClick={handleClose}
              >
                Annuler
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
