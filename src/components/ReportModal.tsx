import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuthContext } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

  const handleClose = () => {
    setReason("");
    setComment("");
    setError(null);
    onClose();
  };

  const handleSubmit = async () => {
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
    if (err) {
      setError(err.message);
      return;
    }
    toast.success("✅ Signalement envoyé ! L'administrateur va examiner votre demande.");
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="sm:max-w-md">
        {!user ? (
          <div className="flex flex-col items-center text-center gap-4 py-4">
            <span className="text-5xl">⚠️</span>
            <DialogTitle className="text-lg font-bold">Connexion requise</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Rejoins la communauté World Pet Friendly pour signaler les informations incorrectes et aider les autres voyageurs avec leurs animaux.
            </p>
            <Button className="w-full" onClick={() => { onClose(); onLoginRequired(); }}>
              Créer un compte / Se connecter
            </Button>
            <Button variant="outline" className="w-full" onClick={handleClose}>
              Annuler
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>⚠️ Signaler un problème — {placeName}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Type de signalement *</label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un motif…" />
                  </SelectTrigger>
                  <SelectContent>
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
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button className="w-full" onClick={handleSubmit} disabled={!reason || loading}>
                {loading ? "Envoi…" : "Envoyer le signalement"}
              </Button>
              <Button variant="outline" className="w-full" onClick={handleClose}>
                Annuler
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
