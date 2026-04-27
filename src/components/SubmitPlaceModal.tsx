/// <reference types="google.maps" />
import { useState, useRef, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuthContext } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { X } from "lucide-react";

const CATEGORIES = [
  { value: "restaurant", label: "🍽️ Restaurant / Café" },
  { value: "hotel", label: "🛏️ Hôtel / Hébergement" },
  { value: "outdoor", label: "🌿 Parc / Nature / Camping" },
  { value: "shop", label: "🐾 Pet Shop / Animalerie" },
  { value: "services", label: "❤️ Vétérinaire / Services" },
  { value: "other", label: "📍 Autre" },
];

interface SubmitPlaceModalProps {
  open: boolean;
  onClose: () => void;
  onLoginRequired: () => void;
  initialCoords?: { lat: number; lng: number; address?: string };
}

export default function SubmitPlaceModal({ open, onClose, onLoginRequired, initialCoords }: SubmitPlaceModalProps) {
  const { user } = useAuthContext();

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [address, setAddress] = useState("");
  const [addressCoords, setAddressCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [acceptsDogs, setAcceptsDogs] = useState(true);
  const [acceptsCats, setAcceptsCats] = useState(false);
  const [dogsOnLeash, setDogsOnLeash] = useState(false);
  const [outdoorSeating, setOutdoorSeating] = useState(false);
  const [waterBowl, setWaterBowl] = useState(false);
  const [openingHours, setOpeningHours] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const autocompleteRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && window.google?.maps?.places) {
      autocompleteRef.current = new google.maps.places.AutocompleteService();
    }
    if (open && initialCoords) {
      setAddressCoords({ lat: initialCoords.lat, lng: initialCoords.lng });
      if (initialCoords.address) setAddress(initialCoords.address);
    }
  }, [open]);

  const resetForm = () => {
    setName(""); setCategory(""); setAddress(""); setAddressCoords(null); setCity("");
    setPhone(""); setWebsite(""); setDescription(""); setAcceptsDogs(true); setAcceptsCats(false);
    setDogsOnLeash(false); setOutdoorSeating(false); setWaterBowl(false); setOpeningHours("");
    setPhotos([]); setLoading(false); setSuccess(false); setError(null); setSuggestions([]);
  };

  const handleClose = () => { resetForm(); onClose(); };

  const handleAddressChange = useCallback((val: string) => {
    setAddress(val);
    setAddressCoords(null);
    if (!val.trim() || !autocompleteRef.current) { setSuggestions([]); return; }
    autocompleteRef.current.getPlacePredictions({ input: val, types: ["establishment", "geocode"] }, (preds) => {
      setSuggestions(preds || []);
    });
  }, []);

  const handleSelectSuggestion = (prediction: google.maps.places.AutocompletePrediction) => {
    setAddress(prediction.description);
    setSuggestions([]);
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ placeId: prediction.place_id }, (results, status) => {
      if (status === "OK" && results?.[0]) {
        const loc = results[0].geometry.location;
        setAddressCoords({ lat: loc.lat(), lng: loc.lng() });
        const cityComp = results[0].address_components.find(c => c.types.includes("locality"));
        if (cityComp) setCity(cityComp.long_name);
      }
    });
  };

  const handlePhotosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = 5 - photos.length;
    setPhotos(prev => [...prev, ...files.slice(0, remaining)]);
    e.target.value = "";
  };

  const removePhoto = (index: number) => setPhotos(prev => prev.filter((_, i) => i !== index));

  const handleSubmit = async () => {
    if (!user) return;
    if (!name.trim() || !category) { setError("Nom et catégorie sont requis."); return; }
    if (!addressCoords) { setError("Veuillez sélectionner une adresse dans la liste."); return; }

    setLoading(true); setError(null);

    const { data: submission, error: insertErr } = await supabase
      .from("place_submissions")
      .insert({
        submitted_by: user.id, name: name.trim(), category, address: address.trim(),
        city: city.trim() || null, latitude: addressCoords.lat, longitude: addressCoords.lng,
        phone: phone.trim() || null, website: website.trim() || null,
        description: description.trim() || null, accepts_dogs: acceptsDogs, accepts_cats: acceptsCats,
        dogs_on_leash_only: dogsOnLeash, outdoor_seating: outdoorSeating,
        water_bowl_provided: waterBowl, opening_hours: openingHours.trim() || null,
      })
      .select("id")
      .single();

    if (insertErr) { setError(insertErr.message); setLoading(false); return; }

    // Upload photos
    if (photos.length > 0 && submission) {
      for (const file of photos) {
        const path = `${user.id}/${submission.id}/${Date.now()}_${file.name}`;
        const { error: uploadErr } = await supabase.storage.from("place-photos").upload(path, file);
        if (uploadErr) { console.error("Upload error:", uploadErr); continue; }
        const { data: urlData } = supabase.storage.from("place-photos").getPublicUrl(path);
        await supabase.from("submission_photos").insert({
          submission_id: submission.id, storage_path: path, url: urlData.publicUrl, uploaded_by: user.id,
        });
      }
    }

    setLoading(false);
    setSuccess(true);
    toast.success("📍 Lieu soumis avec succès !");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="w-[92vw] sm:max-w-lg max-h-[90vh] p-0 overflow-hidden rounded-2xl">
        {!user ? (
          <div className="flex flex-col items-center text-center gap-4 p-6">
            <span className="text-6xl">📍</span>
            <DialogTitle className="text-lg font-bold">Rejoins la communauté !</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Connecte-toi pour ajouter de nouveaux lieux pet-friendly et aider les voyageurs avec leurs animaux de compagnie.
            </p>
            <Button className="w-full" onClick={() => { onClose(); onLoginRequired(); }}>Se connecter / Créer un compte</Button>
            <Button variant="outline" className="w-full" onClick={handleClose}>Annuler</Button>
          </div>
        ) : success ? (
          <div className="flex flex-col items-center text-center gap-4 p-6">
            <span className="text-6xl text-green-500">✅</span>
            <DialogTitle className="text-lg font-bold">Lieu soumis avec succès !</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Merci pour ta contribution ! 🐾 Ton lieu est en cours d'examen par notre équipe. Il apparaîtra sur la carte après validation, généralement sous 48h.
            </p>
            <Button className="w-full" onClick={handleClose}>Fermer</Button>
          </div>
        ) : (
          <>
            <DialogHeader className="p-4 pb-0">
              <DialogTitle>📍 Ajouter un nouveau lieu</DialogTitle>
              <p className="text-xs text-muted-foreground">Ton lieu sera vérifié par notre équipe avant publication.</p>
            </DialogHeader>
            <ScrollArea className="px-4 pb-4" style={{ maxHeight: "70vh" }}>
              <div className="space-y-5 py-2">
                {/* Informations générales */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold">Informations générales</h4>
                  <div>
                    <label className="text-xs font-medium mb-1 block">Nom du lieu *</label>
                    <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Café des Artistes" />
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">Catégorie *</label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger><SelectValue placeholder="Choisir une catégorie" /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="relative">
                    <label className="text-xs font-medium mb-1 block">Adresse *</label>
                    <Input
                      value={address}
                      onChange={e => handleAddressChange(e.target.value)}
                      placeholder="Tapez pour rechercher…"
                      className={addressCoords ? "border-green-500" : address.trim() && !addressCoords ? "border-destructive" : ""}
                    />
                    {suggestions.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {suggestions.map((s) => (
                          <button key={s.place_id} className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors" onClick={() => handleSelectSuggestion(s)}>
                            {s.description}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-medium mb-1 block">Ville</label>
                    <Input value={city} onChange={e => setCity(e.target.value)} placeholder="Rempli automatiquement" />
                  </div>
                </div>

                {/* Contact */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold">Contact</h4>
                  <Input value={phone} onChange={e => setPhone(e.target.value)} type="tel" placeholder="+33 1 23 45 67 89" />
                  <Input value={website} onChange={e => setWebsite(e.target.value)} type="url" placeholder="https://..." />
                  <Input value={openingHours} onChange={e => setOpeningHours(e.target.value)} placeholder="Ex: Lu-Ve 9h-18h, Sa 10h-17h" />
                </div>

                {/* Animaux */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold">🐾 Animaux acceptés</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between"><span className="text-sm">🐕 Chiens acceptés</span><Switch checked={acceptsDogs} onCheckedChange={setAcceptsDogs} /></div>
                    <div className="flex items-center justify-between"><span className="text-sm">🐈 Chats acceptés</span><Switch checked={acceptsCats} onCheckedChange={setAcceptsCats} /></div>
                    {acceptsDogs && <div className="flex items-center justify-between"><span className="text-sm">🐕‍🦺 Chiens en laisse uniquement</span><Switch checked={dogsOnLeash} onCheckedChange={setDogsOnLeash} /></div>}
                    <div className="flex items-center justify-between"><span className="text-sm">🌿 Terrasse / espace extérieur</span><Switch checked={outdoorSeating} onCheckedChange={setOutdoorSeating} /></div>
                    <div className="flex items-center justify-between"><span className="text-sm">💧 Gamelle d'eau fournie</span><Switch checked={waterBowl} onCheckedChange={setWaterBowl} /></div>
                  </div>
                </div>

                {/* Description & Photos */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold">Description & Photos</h4>
                  <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Décrivez l'ambiance, les services pour animaux, les particularités du lieu..." rows={3} />
                  <div>
                    <Button type="button" variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()} disabled={photos.length >= 5}>
                      📸 Ajouter des photos ({photos.length}/5)
                    </Button>
                    <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotosChange} />
                    <p className="text-[10px] text-muted-foreground mt-1">Formats acceptés : JPG, PNG, WebP — Max 5 Mo par photo</p>
                    {photos.length > 0 && (
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {photos.map((f, i) => (
                          <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-border">
                            <img src={URL.createObjectURL(f)} className="w-full h-full object-cover" alt="" />
                            <button onClick={() => removePhoto(i)} className="absolute top-0 right-0 bg-black/60 rounded-bl-lg p-0.5">
                              <X className="w-3 h-3 text-white" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <Button className="w-full" onClick={handleSubmit} disabled={!name.trim() || !category || !addressCoords || loading}>
                  {loading ? "Envoi en cours…" : "📍 Soumettre ce lieu"}
                </Button>
              </div>
            </ScrollArea>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
