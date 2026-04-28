/// <reference types="google.maps" />
import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, X, ArrowLeft, Camera } from "lucide-react";
import { useAuthContext } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ── Type groups (5 icon circles) ──────────────────────────────────────────
const TYPE_GROUPS = [
  {
    icon: "🏠", label: "Hébergement",
    subcats: [
      { value: "hotel",      label: "🛏️ Hôtel / Hébergement" },
      { value: "pension",    label: "🏠 Pension / Garderie" },
      { value: "camping",    label: "⛺ Camping" },
      { value: "pet_sitter", label: "🏡 Pet Sitter" },
      { value: "aire_repos", label: "🛣️ Aire de repos" },
    ],
  },
  {
    icon: "🐕", label: "Activités",
    subcats: [
      { value: "parc_chiens", label: "🐕 Parc à chiens" },
      { value: "dog_walker",  label: "🦮 Dog Walker" },
      { value: "educateur",   label: "🎓 Éducateur / Dressage" },
      { value: "loisir",      label: "🎯 Loisirs / Activités" },
      { value: "evenement",   label: "📅 Événement" },
    ],
  },
  {
    icon: "🌿", label: "Nature",
    subcats: [
      { value: "outdoor", label: "🌿 Parc / Nature / Forêt" },
      { value: "plage",   label: "🏖️ Plage / Lac" },
    ],
  },
  {
    icon: "💝", label: "Soins",
    subcats: [
      { value: "veterinaire",        label: "🏥 Vétérinaire" },
      { value: "toiletteur",         label: "🛁 Toiletteur / Grooming" },
      { value: "osteopathe",         label: "🦴 Ostéopathe animalier" },
      { value: "masseur",            label: "💆 Masseur animalier" },
      { value: "comportementaliste", label: "🧠 Comportementaliste" },
      { value: "refuge",             label: "🛡️ Refuge / Association" },
    ],
  },
  {
    icon: "🍽️", label: "Resto & Commerce",
    subcats: [
      { value: "restaurant",     label: "🍽️ Restaurant / Café / Bar" },
      { value: "cafe_animalier", label: "☕ Café animalier" },
      { value: "shop",           label: "🛒 Pet Shop / Animalerie" },
      { value: "transport",      label: "🚇 Transport pet-friendly" },
      { value: "aeroport",       label: "✈️ Aéroport" },
      { value: "other",          label: "📍 Autre lieu" },
    ],
  },
];

const ACCESSIBILITY_OPTIONS = [
  { key: "accepts_dogs",       label: "🐕 Chiens acceptés" },
  { key: "accepts_cats",       label: "🐈 Chats acceptés" },
  { key: "dogs_on_leash_only", label: "🐕‍🦺 Chien en laisse uniquement" },
  { key: "category_dogs",      label: "🦮 Chiens de catégorie acceptés" },
  { key: "multiple_dogs",      label: "🐕🐕 Plusieurs chiens acceptés" },
  { key: "water_bowl",         label: "💧 Point d'eau / gamelle fournie" },
  { key: "outdoor_seating",    label: "🌿 Terrasse / espace extérieur" },
];

interface SubmitPlaceModalProps {
  open: boolean;
  onClose: () => void;
  onLoginRequired: () => void;
  initialCoords?: { lat: number; lng: number; address?: string };
}

// ── Checkbox component ────────────────────────────────────────────────────
function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-3 py-2.5 cursor-pointer select-none" onClick={() => onChange(!checked)}>
      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${checked ? "bg-primary border-primary" : "border-border bg-background"}`}>
        {checked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
      </div>
      <span className="text-sm text-foreground">{label}</span>
    </label>
  );
}

export default function SubmitPlaceModal({ open, onClose, onLoginRequired, initialCoords }: SubmitPlaceModalProps) {
  const { user } = useAuthContext();

  // Bottom sheet state
  const [visible, setVisible] = useState(false);
  const [dragging, setDragging] = useState(false);
  const isDragging = useRef(false);
  const dragStartY = useRef(0);
  const lastVelocity = useRef(0);
  const lastTouchY = useRef(0);
  const lastTouchTime = useRef(0);
  const [dragDelta, setDragDelta] = useState(0);

  // Form state
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);
  const [category, setCategory] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [description, setDescription] = useState("");
  const [openingHours, setOpeningHours] = useState("");
  const [address, setAddress] = useState("");
  const [addressCoords, setAddressCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [city, setCity] = useState("");
  const [accessibility, setAccessibility] = useState<Record<string, boolean>>({
    accepts_dogs: true,
    accepts_cats: false,
    dogs_on_leash_only: false,
    category_dogs: false,
    multiple_dogs: false,
    water_bowl: false,
    outdoor_seating: false,
  });
  const [photos, setPhotos] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [showSubcatDropdown, setShowSubcatDropdown] = useState(false);

  const autocompleteRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Open/close animation — double RAF so browser paints initial frame first
  useEffect(() => {
    if (open) {
      let raf1: number, raf2: number;
      raf1 = requestAnimationFrame(() => { raf2 = requestAnimationFrame(() => setVisible(true)); });
      return () => { cancelAnimationFrame(raf1); cancelAnimationFrame(raf2); };
    } else {
      setVisible(false);
    }
  }, [open]);

  useEffect(() => {
    if (open && (window as any).google?.maps?.places) {
      autocompleteRef.current = new google.maps.places.AutocompleteService();
    }
    if (open && initialCoords) {
      setAddressCoords({ lat: initialCoords.lat, lng: initialCoords.lng });
      if (initialCoords.address) setAddress(initialCoords.address);
    }
  }, [open, initialCoords]);

  function handleClose() {
    setVisible(false);
    setTimeout(() => {
      resetForm();
      onClose();
    }, 300);
  }

  function resetForm() {
    setSelectedGroup(null); setCategory(""); setName(""); setPhone(""); setWebsite("");
    setDescription(""); setOpeningHours(""); setAddress(""); setAddressCoords(null); setCity("");
    setAccessibility({ accepts_dogs: true, accepts_cats: false, dogs_on_leash_only: false, category_dogs: false, multiple_dogs: false, water_bowl: false, outdoor_seating: false });
    setPhotos([]); setLoading(false); setSuccess(false); setError(null); setSuggestions([]);
    setDragDelta(0);
  }

  // Drag handle
  function handleDragStart(e: React.TouchEvent) {
    isDragging.current = true;
    setDragging(true);
    dragStartY.current = e.touches[0].clientY;
    lastVelocity.current = 0;
    lastTouchY.current = e.touches[0].clientY;
    lastTouchTime.current = Date.now();
  }
  function handleDragMove(e: React.TouchEvent) {
    if (!isDragging.current) return;
    const dy = e.touches[0].clientY - dragStartY.current;
    const now = Date.now(); const dt = now - lastTouchTime.current;
    if (dt > 0) lastVelocity.current = (e.touches[0].clientY - lastTouchY.current) / dt;
    lastTouchY.current = e.touches[0].clientY; lastTouchTime.current = now;
    setDragDelta(Math.max(0, dy));
  }
  function handleDragEnd() {
    isDragging.current = false;
    setDragging(false);
    const pct = (dragDelta / window.innerHeight) * 100;
    if (lastVelocity.current > 0.5 || pct > 40) { handleClose(); } else { setDragDelta(0); }
  }

  const currentOffset = dragDelta > 0 ? (dragDelta / window.innerHeight) * 100 : 0;

  // Address autocomplete
  const handleAddressChange = useCallback((val: string) => {
    setAddress(val); setAddressCoords(null);
    if (!val.trim() || !autocompleteRef.current) { setSuggestions([]); return; }
    autocompleteRef.current.getPlacePredictions({ input: val, types: ["establishment", "geocode"] }, (preds) => {
      setSuggestions(preds || []);
    });
  }, []);

  const handleSelectSuggestion = (prediction: google.maps.places.AutocompletePrediction) => {
    setAddress(prediction.description); setSuggestions([]);
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

  // Photos
  const handlePhotosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setPhotos(prev => [...prev, ...files.slice(0, 5 - prev.length)]);
    e.target.value = "";
  };

  // Submit
  const hasLocation = !!addressCoords || !!initialCoords;
  const canSubmit = name.trim().length > 0 && hasLocation && !loading;

  const handleSubmit = async () => {
    if (!user) { onLoginRequired(); return; }
    if (!name.trim()) { setError("Le nom du lieu est requis."); return; }
    const coords = addressCoords || (initialCoords ? { lat: initialCoords.lat, lng: initialCoords.lng } : null);
    if (!coords) { setError("Veuillez indiquer une localisation."); return; }

    setLoading(true); setError(null);
    const { data: submission, error: insertErr } = await supabase
      .from("place_submissions")
      .insert({
        submitted_by: user.id,
        name: name.trim(),
        category: category || "other",
        address: address.trim() || null,
        city: city.trim() || null,
        latitude: coords.lat,
        longitude: coords.lng,
        phone: phone.trim() || null,
        website: website.trim() || null,
        description: description.trim() || null,
        accepts_dogs: accessibility.accepts_dogs,
        accepts_cats: accessibility.accepts_cats,
        dogs_on_leash_only: accessibility.dogs_on_leash_only,
        outdoor_seating: accessibility.outdoor_seating,
        water_bowl_provided: accessibility.water_bowl,
        opening_hours: openingHours.trim() || null,
      })
      .select("id").single();

    if (insertErr) { setError(insertErr.message); setLoading(false); return; }

    if (photos.length > 0 && submission) {
      for (const file of photos) {
        const path = `${user.id}/${submission.id}/${Date.now()}_${file.name}`;
        const { error: uploadErr } = await supabase.storage.from("place-photos").upload(path, file);
        if (uploadErr) continue;
        const { data: urlData } = supabase.storage.from("place-photos").getPublicUrl(path);
        await supabase.from("submission_photos").insert({ submission_id: submission.id, storage_path: path, url: urlData.publicUrl, uploaded_by: user.id });
      }
    }

    setLoading(false); setSuccess(true);
    toast.success("📍 Lieu soumis avec succès !");
  };

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[700]"
      style={{
        backgroundColor: `rgba(0,0,0,${visible ? 0.45 : 0})`,
        transition: dragging ? "none" : "background-color 0.3s ease",
        pointerEvents: open ? "auto" : "none",
      }}
    >
      {/* Bottom sheet */}
      <div
        className="absolute bottom-0 left-0 right-0 bg-card rounded-t-2xl shadow-2xl flex flex-col"
        style={{
          height: "calc(100vh - 48px)",
          transform: `translateY(${!visible ? 100 : currentOffset}%)`,
          transition: dragging ? "none" : "transform 0.32s cubic-bezier(0.4,0,0.2,1)",
          willChange: "transform",
        }}
      >
        {/* Drag handle */}
        <div
          className="flex-shrink-0 pt-2.5 pb-1 flex flex-col items-center cursor-grab active:cursor-grabbing"
          onTouchStart={handleDragStart}
          onTouchMove={handleDragMove}
          onTouchEnd={handleDragEnd}
        >
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <div className="flex-shrink-0 flex items-center px-4 py-3 border-b border-border gap-3">
          <button onClick={handleClose} className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h2 className="text-base font-bold text-foreground flex-1">Ajouter un lieu</h2>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {!user ? (
            <div className="flex flex-col items-center text-center gap-4 p-8">
              <span className="text-6xl">📍</span>
              <p className="text-base font-bold">Rejoins la communauté !</p>
              <p className="text-sm text-muted-foreground">Connecte-toi pour ajouter de nouveaux lieux pet-friendly.</p>
              <button className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm" onClick={() => { onClose(); onLoginRequired(); }}>
                Se connecter / Créer un compte
              </button>
              <button className="w-full py-3 rounded-xl border border-border text-sm font-semibold text-muted-foreground" onClick={handleClose}>Annuler</button>
            </div>
          ) : success ? (
            <div className="flex flex-col items-center text-center gap-4 p-8">
              <span className="text-6xl">✅</span>
              <p className="text-base font-bold text-foreground">Lieu soumis avec succès !</p>
              <p className="text-sm text-muted-foreground">Merci pour ta contribution 🐾 Ton lieu sera examiné et apparaîtra sur la carte après validation (moins de 48h).</p>
              <button className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm" onClick={handleClose}>Fermer</button>
            </div>
          ) : (
            <div className="px-4 pt-4 pb-8 space-y-6">

              {/* Type de lieu */}
              <section>
                <h3 className="text-sm font-bold text-foreground mb-3">Type de lieu</h3>

                {/* Group filter icons */}
                <div className="flex justify-between gap-1.5 mb-3">
                  {TYPE_GROUPS.map((g, i) => (
                    <button
                      key={i}
                      onClick={() => { setSelectedGroup(i === selectedGroup ? null : i); setCategory(""); setShowSubcatDropdown(false); }}
                      className={`flex-1 flex flex-col items-center gap-1 py-2 rounded-xl border-2 transition-all ${selectedGroup === i ? "border-primary bg-primary/10" : "border-border bg-background"}`}
                    >
                      <span className="text-lg">{g.icon}</span>
                      <span className="text-[8px] font-medium text-center leading-tight text-muted-foreground">{g.label}</span>
                    </button>
                  ))}
                </div>

                {/* Category dropdown — always visible, filtered by selected group */}
                <div className="relative">
                  <button
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl border border-border bg-background text-sm text-left"
                    onClick={() => setShowSubcatDropdown(p => !p)}
                  >
                    <span className={category ? "text-foreground" : "text-muted-foreground"}>
                      {category
                        ? TYPE_GROUPS.flatMap(g => g.subcats).find(s => s.value === category)?.label
                        : selectedGroup !== null ? `Sous-type — ${TYPE_GROUPS[selectedGroup].label}…` : "Tous les types de lieux…"}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform flex-shrink-0 ${showSubcatDropdown ? "rotate-180" : ""}`} />
                  </button>
                  {showSubcatDropdown && (
                    <div className="absolute z-10 left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-xl overflow-hidden max-h-64 overflow-y-auto">
                      {(selectedGroup !== null ? TYPE_GROUPS[selectedGroup].subcats : TYPE_GROUPS.flatMap(g => g.subcats)).map(s => (
                        <button
                          key={s.value}
                          className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${category === s.value ? "bg-primary/10 text-primary font-semibold" : "hover:bg-muted text-foreground"}`}
                          onClick={() => { setCategory(s.value); setShowSubcatDropdown(false); }}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                )}
              </section>

              <div className="h-px bg-border" />

              {/* Informations */}
              <section className="space-y-3">
                <h3 className="text-sm font-bold text-foreground">Informations</h3>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Nom du lieu *"
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="Téléphone"
                    type="tel"
                    className="px-3 py-2.5 rounded-xl border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <input
                    value={website}
                    onChange={e => setWebsite(e.target.value)}
                    placeholder="Site internet"
                    type="url"
                    className="px-3 py-2.5 rounded-xl border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </section>

              <div className="h-px bg-border" />

              {/* Description */}
              <section>
                <h3 className="text-sm font-bold text-foreground mb-3">Description</h3>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Dis-nous en plus ce lieu :)"
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </section>

              <div className="h-px bg-border" />

              {/* Horaires */}
              <section>
                <h3 className="text-sm font-bold text-foreground mb-3">Horaires</h3>
                <input
                  value={openingHours}
                  onChange={e => setOpeningHours(e.target.value)}
                  placeholder="Exemple : Lun. - Sam. : 08h - 19h"
                  className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </section>

              <div className="h-px bg-border" />

              {/* Accessibilité */}
              <section>
                <h3 className="text-sm font-bold text-foreground mb-1">Accessibilité</h3>
                <div className="divide-y divide-border">
                  {ACCESSIBILITY_OPTIONS.map(opt => (
                    <Checkbox
                      key={opt.key}
                      checked={accessibility[opt.key]}
                      onChange={v => setAccessibility(prev => ({ ...prev, [opt.key]: v }))}
                      label={opt.label}
                    />
                  ))}
                </div>
              </section>

              <div className="h-px bg-border" />

              {/* Localisation */}
              <section>
                <h3 className="text-sm font-bold text-foreground mb-3">
                  Localisation {!hasLocation && <span className="text-destructive">*</span>}
                </h3>
                {initialCoords && !addressCoords && (
                  <div className="mb-2 px-3 py-2 bg-success/10 border border-success/30 rounded-xl text-xs text-success font-medium">
                    📍 Position depuis la carte : {initialCoords.lat.toFixed(5)}, {initialCoords.lng.toFixed(5)}
                  </div>
                )}
                <div className="relative">
                  <input
                    value={address}
                    onChange={e => handleAddressChange(e.target.value)}
                    placeholder="Rechercher une adresse…"
                    className={`w-full px-3 py-2.5 rounded-xl border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary ${addressCoords ? "border-success" : "border-border"}`}
                  />
                  {suggestions.length > 0 && (
                    <div className="absolute z-10 left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto">
                      {suggestions.map(s => (
                        <button key={s.place_id} className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors" onClick={() => handleSelectSuggestion(s)}>
                          {s.description}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </section>

              <div className="h-px bg-border" />

              {/* Photos */}
              <section>
                <h3 className="text-sm font-bold text-foreground mb-3">Photos <span className="font-normal text-muted-foreground text-xs">({photos.length}/5)</span></h3>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={photos.length >= 5}
                  className="w-full py-3 rounded-xl border-2 border-dashed border-border flex items-center justify-center gap-2 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors disabled:opacity-40"
                >
                  <Camera className="w-4 h-4" />
                  Ajouter des photos
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePhotosChange} />
                {photos.length > 0 && (
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {photos.map((f, i) => (
                      <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border border-border">
                        <img src={URL.createObjectURL(f)} className="w-full h-full object-cover" alt="" />
                        <button onClick={() => setPhotos(p => p.filter((_, j) => j !== i))} className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center">
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Error */}
              {error && <p className="text-sm text-destructive bg-destructive/10 rounded-xl px-3 py-2">{error}</p>}

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="w-full py-4 rounded-2xl bg-[#FF6B35] text-white font-bold text-base disabled:opacity-40 transition-opacity active:scale-[0.98]"
              >
                {loading ? "Envoi en cours…" : "Enregistrer"}
              </button>

              <p className="text-center text-xs text-muted-foreground">
                Seuls le nom et la localisation sont requis. Ton lieu sera vérifié avant publication.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
