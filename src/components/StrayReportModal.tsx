import { useState, useRef, useEffect } from "react";
import { Camera, Loader2, MapPin, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuthContext } from "@/contexts/AuthContext";

interface StrayReportModalProps {
  open: boolean;
  onClose: () => void;
  onReported: () => void;
}

const SPECIES = [
  { value: "chien",  label: "🐶 Chien" },
  { value: "chat",   label: "🐱 Chat" },
  { value: "autre",  label: "🐾 Autre" },
];

export default function StrayReportModal({ open, onClose, onReported }: StrayReportModalProps) {
  const { user } = useAuthContext();
  const fileRef = useRef<HTMLInputElement>(null);

  const [species, setSpecies]         = useState("chien");
  const [description, setDescription] = useState("");
  const [photo, setPhoto]             = useState<File | null>(null);
  const [preview, setPreview]         = useState<string | null>(null);
  const [coords, setCoords]           = useState<{ lat: number; lng: number } | null>(null);
  const [city, setCity]               = useState<string>("");
  const [locating, setLocating]       = useState(false);
  const [loading, setLoading]         = useState(false);

  useEffect(() => {
    if (!open) return;
    setSpecies("chien");
    setDescription("");
    setPhoto(null);
    setPreview(null);
    setCoords(null);
    setCity("");
    setLocating(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCoords({ lat, lng });
        try {
          const res = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?types=place&access_token=pk.eyJ1IjoiZWx2aW5hZ2QiLCJhIjoiY21vNzlzaTZ5MDUxMTJxc2V1Ym5sZzVxNyJ9.QVzHhHQIH-DsrHzfi-STRA&language=fr`
          );
          const data = await res.json();
          setCity(data.features?.[0]?.text || "");
        } catch {}
        setLocating(false);
      },
      () => { setLocating(false); toast.error("Impossible d'obtenir votre position"); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [open]);

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!coords) { toast.error("Position GPS requise"); return; }
    if (!user)   { toast.error("Connectez-vous pour signaler"); return; }

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

      const { error } = await supabase.from("stray_reports").insert({
        user_id:     user.id,
        species,
        description: description.trim() || null,
        photo_url,
        lat:         coords.lat,
        lng:         coords.lng,
        city:        city || null,
        status:      "active",
      });

      if (error) throw error;

      toast.success("🐾 Signalement envoyé ! Merci pour votre aide.");
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
      <div className="relative w-full max-w-lg bg-card rounded-t-2xl shadow-2xl p-5 space-y-4 animate-in slide-in-from-bottom-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-foreground text-lg">🐾 Signaler un animal errant</h2>
            <p className="text-xs text-muted-foreground">Visible par tous les utilisateurs sur la carte</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-muted">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* GPS */}
        <div className="flex items-center gap-2 text-sm bg-muted rounded-lg px-3 py-2">
          {locating ? (
            <><Loader2 className="w-4 h-4 animate-spin text-primary" /><span className="text-muted-foreground">Localisation en cours…</span></>
          ) : coords ? (
            <><MapPin className="w-4 h-4 text-primary" /><span className="text-foreground font-medium">{city || `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`}</span></>
          ) : (
            <><MapPin className="w-4 h-4 text-destructive" /><span className="text-destructive">Position non disponible</span></>
          )}
        </div>

        {/* Species */}
        <div className="flex gap-2">
          {SPECIES.map((s) => (
            <button
              key={s.value}
              onClick={() => setSpecies(s.value)}
              className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${
                species === s.value
                  ? "bg-destructive text-white border-destructive"
                  : "bg-muted text-foreground border-border"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Photo */}
        <div>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} />
          {preview ? (
            <div className="relative">
              <img src={preview} alt="Photo" className="w-full h-40 object-cover rounded-xl" />
              <button onClick={() => { setPhoto(null); setPreview(null); }}
                className="absolute top-2 right-2 bg-black/60 rounded-full p-1">
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          ) : (
            <button onClick={() => fileRef.current?.click()}
              className="w-full h-32 border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center gap-2 text-muted-foreground hover:bg-muted transition-colors">
              <Camera className="w-8 h-8" />
              <span className="text-sm">Ajouter une photo</span>
            </button>
          )}
        </div>

        {/* Description */}
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description : couleur, comportement, état de santé…"
          rows={3}
          className="w-full border border-border rounded-xl px-3 py-2 text-sm bg-background text-foreground outline-none resize-none"
        />

        {/* Submit */}
        <Button
          onClick={handleSubmit}
          disabled={loading || locating || !coords}
          className="w-full bg-destructive hover:bg-destructive/90 text-white font-semibold"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "🐾 "}
          Signaler sur la carte
        </Button>
      </div>
    </div>
  );
}
