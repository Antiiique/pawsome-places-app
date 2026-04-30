import { useState, useRef, useEffect } from "react";
import { Camera, FolderOpen, Loader2, MapPin, X, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuthContext } from "@/contexts/AuthContext";

const MAPBOX_TOKEN = "pk.eyJ1IjoiZWx2aW5hZ2QiLCJhIjoiY21vNzlzaTZ5MDUxMTJxc2V1Ym5sZzVxNyJ9.QVzHhHQIH-DsrHzfi-STRA";

const CONDITIONS = ["Normal", "Apeuré", "Blessé", "Agressif", "Épuisé"];

interface StrayReportModalProps {
  open: boolean;
  onClose: () => void;
  onReported: () => void;
}

type Step = "source" | "form";

export default function StrayReportModal({ open, onClose, onReported }: StrayReportModalProps) {
  const { user } = useAuthContext();
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const [step, setStep]               = useState<Step>("source");
  const [photo, setPhoto]             = useState<File | null>(null);
  const [preview, setPreview]         = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [condition, setCondition]     = useState("");
  const [behavior, setBehavior]       = useState("");
  const [color, setColor]             = useState("");
  const [breed, setBreed]             = useState("");
  const [coords, setCoords]           = useState<{ lat: number; lng: number } | null>(null);
  const [city, setCity]               = useState("");
  const [address, setAddress]         = useState("");
  const [locating, setLocating]       = useState(false);
  const [loading, setLoading]         = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep("source");
    setPhoto(null);
    setPreview(null);
    setDescription("");
    setCondition("");
    setBehavior("");
    setColor("");
    setBreed("");
    setCoords(null);
    setCity("");
    setAddress("");
    setLocating(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCoords({ lat, lng });
        try {
          const res = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?types=address,neighborhood,place&access_token=${MAPBOX_TOKEN}&language=fr`
          );
          const data = await res.json();
          const feature = data.features?.[0];
          if (feature) {
            setAddress(feature.place_name || "");
            const cityCtx = feature.context?.find((c: any) => c.id?.startsWith("place."));
            setCity(cityCtx?.text || feature.text || "");
          }
        } catch {}
        setLocating(false);
      },
      () => { setLocating(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [open]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
    setStep("form");
  };

  const handleSubmit = async () => {
    if (!coords) { toast.error("Position GPS requise"); return; }
    if (!user)   { toast.error("Connectez-vous pour signaler"); window.dispatchEvent(new CustomEvent("open-auth-modal")); return; }

    setLoading(true);
    try {
      let photo_url: string | null = null;

      if (photo) {
        const ext  = photo.name.split(".").pop() || "jpg";
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("stray-photos")
          .upload(path, photo, { upsert: false });
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("stray-photos").getPublicUrl(path);
        photo_url = urlData.publicUrl;
      }

      const { data: inserted, error } = await supabase.from("stray_reports").insert({
        user_id:     user.id,
        species:     "chien",
        description: description.trim() || null,
        condition:   condition || null,
        behavior:    behavior.trim() || null,
        color:       color.trim() || null,
        breed:       breed.trim() || null,
        photo_url,
        lat:         coords.lat,
        lng:         coords.lng,
        address:     address || null,
        city:        city || null,
        status:      "active",
      }).select("id").single();
      if (error) throw error;

      if (inserted?.id) {
        supabase.rpc("notify_nearby_users_stray" as any, { p_stray_id: inserted.id }).then(() => {});
      }

      toast.success("🐾 Signalement publié sur la carte !");
      onReported();
      onClose();
    } catch (err: any) {
      toast.error(`Erreur : ${err.message || "réessayez"}`);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[700] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-card rounded-t-2xl shadow-2xl animate-in slide-in-from-bottom-4">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border">
          <div>
            <h2 className="font-bold text-foreground text-lg">🐾 Signaler un chien errant</h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              {locating ? (
                <><Loader2 className="w-3 h-3 animate-spin text-muted-foreground" /><span className="text-xs text-muted-foreground">Localisation…</span></>
              ) : coords ? (
                <><MapPin className="w-3 h-3 text-primary" /><span className="text-xs text-muted-foreground">{city || `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`}</span></>
              ) : (
                <><MapPin className="w-3 h-3 text-destructive" /><span className="text-xs text-destructive">Position non disponible</span></>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-muted">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Step 1 — Source choice */}
        {step === "source" && (
          <div className="p-5 space-y-3">
            <p className="text-sm text-muted-foreground text-center mb-4">Comment souhaitez-vous ajouter une photo ?</p>

            <input ref={cameraRef}  type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
            <input ref={galleryRef} type="file" accept="image/*"                       className="hidden" onChange={handleFile} />

            <button
              onClick={() => cameraRef.current?.click()}
              className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-border hover:border-destructive hover:bg-destructive/5 transition-colors"
            >
              <div className="w-12 h-12 bg-destructive/10 rounded-xl flex items-center justify-center shrink-0">
                <Camera className="w-6 h-6 text-destructive" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-foreground">Ouvrir la caméra</p>
                <p className="text-xs text-muted-foreground">Prendre une photo maintenant</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
            </button>

            <button
              onClick={() => galleryRef.current?.click()}
              className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-colors"
            >
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                <FolderOpen className="w-6 h-6 text-primary" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-foreground">Importer depuis le téléphone</p>
                <p className="text-xs text-muted-foreground">Choisir une photo existante</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto" />
            </button>

            <button
              onClick={() => setStep("form")}
              className="w-full text-center text-xs text-muted-foreground pt-2 hover:text-foreground transition-colors"
            >
              Continuer sans photo →
            </button>
          </div>
        )}

        {/* Step 2 — Form */}
        {step === "form" && (
          <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">

            {/* Photo preview / change */}
            {preview ? (
              <div className="relative">
                <img src={preview} alt="Photo" className="w-full h-44 object-cover rounded-xl" />
                <button
                  onClick={() => { setPhoto(null); setPreview(null); setStep("source"); }}
                  className="absolute top-2 right-2 bg-black/60 rounded-full p-1.5"
                >
                  <X className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setStep("source")}
                className="w-full h-20 border-2 border-dashed border-border rounded-xl flex items-center justify-center gap-2 text-muted-foreground hover:bg-muted transition-colors text-sm"
              >
                <Camera className="w-5 h-5" /> Ajouter une photo
              </button>
            )}

            {/* Couleur */}
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Couleur</label>
              <input
                type="text"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="Ex : fauve, noir, blanc et marron…"
                className="w-full mt-1 border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground outline-none"
              />
            </div>

            {/* Race */}
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Race (si connue)</label>
              <input
                type="text"
                value={breed}
                onChange={(e) => setBreed(e.target.value)}
                placeholder="Ex : Labrador, Berger allemand…"
                className="w-full mt-1 border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground outline-none"
              />
            </div>

            {/* État */}
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">État de l'animal</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {CONDITIONS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCondition(condition === c ? "" : c)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      condition === c ? "bg-destructive text-white border-destructive" : "bg-muted text-foreground border-border"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Comportement */}
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Comportement</label>
              <input
                type="text"
                value={behavior}
                onChange={(e) => setBehavior(e.target.value)}
                placeholder="Ex : cherche de la nourriture, se cache…"
                className="w-full mt-1 border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground outline-none"
              />
            </div>

            {/* Description */}
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Description complémentaire</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tout autre détail utile pour l'identifier…"
                rows={3}
                className="w-full mt-1 border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground outline-none resize-none"
              />
            </div>

            <Button
              onClick={handleSubmit}
              disabled={loading || locating || !coords}
              className="w-full bg-destructive hover:bg-destructive/90 text-white font-semibold"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              🐾 Publier le signalement
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
