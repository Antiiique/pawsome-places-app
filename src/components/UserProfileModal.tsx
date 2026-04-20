import { useState, useEffect, useRef, useCallback } from "react";
import { X, Upload, Trash2, Star, Plus, ChevronLeft, Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

interface UserProfileModalProps {
  open: boolean;
  onClose: () => void;
}

interface ProfileData {
  display_name: string;
  avatar_url: string | null;
  bio: string;
  age: number | null;
  city: string;
  points: number;
}

interface Pet {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  birth_date: string | null;
  sex: string | null;
  avatar_url: string | null;
  bio: string | null;
}

interface PetPhoto {
  id: string;
  pet_id: string;
  url: string;
  caption: string | null;
}

type PetView = "list" | "form" | "album";

const SPECIES_OPTIONS = [
  { value: "dog", label: "Chien", emoji: "🐶" },
  { value: "cat", label: "Chat", emoji: "🐱" },
  { value: "rabbit", label: "Lapin", emoji: "🐰" },
  { value: "bird", label: "Oiseau", emoji: "🐦" },
  { value: "reptile", label: "Reptile", emoji: "🦎" },
  { value: "other", label: "Autre", emoji: "🐾" },
];

function getAge(birthDate: string | null): string {
  if (!birthDate) return "";
  const birth = new Date(birthDate);
  const now = new Date();
  const totalMonths = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  if (totalMonths < 1) return "< 1 mois";
  if (totalMonths < 12) return `${totalMonths} mois`;
  const years = Math.floor(totalMonths / 12);
  return `${years} an${years > 1 ? "s" : ""}`;
}

function getSpeciesEmoji(species: string): string {
  return SPECIES_OPTIONS.find(s => s.value === species)?.emoji || "🐾";
}

function getSpeciesLabel(species: string): string {
  return SPECIES_OPTIONS.find(s => s.value === species)?.label || "Autre";
}

const EMPTY_PET_FORM = { name: "", species: "dog", breed: "", birth_date: "", sex: "", bio: "" };

export default function UserProfileModal({ open, onClose }: UserProfileModalProps) {
  const { user } = useAuthContext();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [profile, setProfile] = useState<ProfileData>({
    display_name: "", avatar_url: null, bio: "", age: null, city: "", points: 0,
  });

  const [pets, setPets] = useState<Pet[]>([]);
  const [petView, setPetView] = useState<PetView>("list");
  const [editingPet, setEditingPet] = useState<Pet | null>(null);
  const [petForm, setPetForm] = useState(EMPTY_PET_FORM);
  const [savingPet, setSavingPet] = useState(false);
  const [uploadingPetAvatar, setUploadingPetAvatar] = useState(false);
  const [albumPet, setAlbumPet] = useState<Pet | null>(null);
  const [album, setAlbum] = useState<PetPhoto[]>([]);
  const [loadingAlbum, setLoadingAlbum] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const petAvatarInputRef = useRef<HTMLInputElement>(null);
  const albumInputRef = useRef<HTMLInputElement>(null);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: prof }, { data: petData }] = await Promise.all([
      supabase.from("profiles").select("display_name, avatar_url, bio, age, city, points").eq("id", user.id).maybeSingle(),
      supabase.from("pets" as any).select("*").eq("user_id", user.id).order("created_at", { ascending: true }),
    ]);
    if (prof) {
      setProfile({
        display_name: prof.display_name || "",
        avatar_url: prof.avatar_url,
        bio: (prof as any).bio || "",
        age: (prof as any).age ?? null,
        city: (prof as any).city || "",
        points: (prof as any).points ?? 0,
      });
    }
    if (petData) setPets(petData as any);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (open) { fetchAll(); setPetView("list"); setEditingPet(null); setAlbumPet(null); setAlbum([]); }
  }, [open, fetchAll]);

  // ── Profile ──
  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      display_name: profile.display_name || null,
      bio: profile.bio || null,
      age: profile.age,
      city: profile.city || null,
    } as any).eq("id", user.id);
    setSaving(false);
    if (error) { toast.error("Erreur : " + error.message); return; }
    toast.success("Profil mis à jour ✨");
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Photo trop lourde (max 5 Mo)"); return; }
    setUploadingAvatar(true);
    const path = `${user.id}/avatar-${Date.now()}.${file.name.split(".").pop() || "jpg"}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (upErr) { setUploadingAvatar(false); toast.error("Upload échoué"); return; }
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", user.id);
    setUploadingAvatar(false);
    setProfile(p => ({ ...p, avatar_url: publicUrl }));
    toast.success("Photo de profil mise à jour 📸");
    if (avatarInputRef.current) avatarInputRef.current.value = "";
  };

  // ── Pets ──
  const openCreatePet = () => { setEditingPet(null); setPetForm(EMPTY_PET_FORM); setPetView("form"); };
  const openEditPet = (pet: Pet) => {
    setEditingPet(pet);
    setPetForm({ name: pet.name, species: pet.species, breed: pet.breed || "", birth_date: pet.birth_date || "", sex: pet.sex || "", bio: pet.bio || "" });
    setPetView("form");
  };

  const openAlbum = async (pet: Pet) => {
    setAlbumPet(pet);
    setPetView("album");
    setLoadingAlbum(true);
    const { data } = await supabase.from("pet_photos" as any).select("*").eq("pet_id", pet.id).order("created_at", { ascending: false });
    setAlbum((data as any) || []);
    setLoadingAlbum(false);
  };

  const handleSavePet = async () => {
    if (!user || !petForm.name.trim()) { toast.error("Le nom est requis"); return; }
    setSavingPet(true);
    const payload = {
      name: petForm.name,
      species: petForm.species,
      breed: petForm.breed || null,
      birth_date: petForm.birth_date || null,
      sex: petForm.sex || null,
      bio: petForm.bio || null,
    };
    if (editingPet) {
      const { error } = await supabase.from("pets" as any).update(payload).eq("id", editingPet.id);
      setSavingPet(false);
      if (error) { toast.error("Erreur : " + error.message); return; }
      setPets(prev => prev.map(p => p.id === editingPet.id ? { ...p, ...payload } : p));
      toast.success("Animal mis à jour 🐾");
    } else {
      const { data, error } = await supabase.from("pets" as any).insert({ user_id: user.id, ...payload }).select("*").single();
      setSavingPet(false);
      if (error) { toast.error("Erreur : " + error.message); return; }
      if (data) setPets(prev => [...prev, data as any]);
      toast.success("Animal ajouté 🎉");
    }
    setPetView("list");
  };

  const handleDeletePet = async (pet: Pet) => {
    if (!confirm(`Supprimer ${pet.name} ? Cette action est irréversible.`)) return;
    const { error } = await supabase.from("pets" as any).delete().eq("id", pet.id);
    if (error) { toast.error("Erreur : " + error.message); return; }
    setPets(prev => prev.filter(p => p.id !== pet.id));
    toast.success(`${pet.name} supprimé`);
  };

  const handleUploadPetAvatar = async (e: React.ChangeEvent<HTMLInputElement>, pet: Pet) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Photo trop lourde (max 5 Mo)"); return; }
    setUploadingPetAvatar(true);
    const path = `${user.id}/${pet.id}-${Date.now()}.${file.name.split(".").pop() || "jpg"}`;
    const { error: upErr } = await supabase.storage.from("pet-avatars").upload(path, file, { upsert: true });
    if (upErr) { setUploadingPetAvatar(false); toast.error("Upload échoué"); return; }
    const { data: { publicUrl } } = supabase.storage.from("pet-avatars").getPublicUrl(path);
    await supabase.from("pets" as any).update({ avatar_url: publicUrl }).eq("id", pet.id);
    setUploadingPetAvatar(false);
    setPets(prev => prev.map(p => p.id === pet.id ? { ...p, avatar_url: publicUrl } : p));
    if (albumPet?.id === pet.id) setAlbumPet(prev => prev ? { ...prev, avatar_url: publicUrl } : prev);
    toast.success("Photo de profil mise à jour 📸");
    if (petAvatarInputRef.current) petAvatarInputRef.current.value = "";
  };

  const handleAddAlbumPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !albumPet) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("Photo trop lourde (max 10 Mo)"); return; }
    setUploadingPhoto(true);
    const path = `${user.id}/${albumPet.id}-${Date.now()}.${file.name.split(".").pop() || "jpg"}`;
    const { error: upErr } = await supabase.storage.from("pet-photos").upload(path, file);
    if (upErr) { setUploadingPhoto(false); toast.error("Upload échoué"); return; }
    const { data: { publicUrl } } = supabase.storage.from("pet-photos").getPublicUrl(path);
    const { data: inserted, error: insErr } = await supabase.from("pet_photos" as any).insert({
      pet_id: albumPet.id, user_id: user.id, url: publicUrl,
    }).select("*").single();
    setUploadingPhoto(false);
    if (insErr) { toast.error("Erreur : " + insErr.message); return; }
    if (inserted) setAlbum(prev => [inserted as any, ...prev]);
    toast.success("Photo ajoutée 🐾");
    if (albumInputRef.current) albumInputRef.current.value = "";
  };

  const handleDeleteAlbumPhoto = async (photo: PetPhoto) => {
    const { error } = await supabase.from("pet_photos" as any).delete().eq("id", photo.id);
    if (error) { toast.error("Erreur"); return; }
    setAlbum(prev => prev.filter(p => p.id !== photo.id));
    toast.success("Photo supprimée");
  };

  if (!open) return null;

  const initial = (profile.display_name?.[0] || user?.email?.[0] || "?").toUpperCase();

  return (
    <div
      className="fixed top-[56px] right-0 z-[500] flex flex-col overflow-hidden border-l border-border bg-card animate-slide-in-right"
      style={{ width: 400, maxWidth: "95vw", height: "calc(100dvh - 56px)", borderBottomLeftRadius: 14 }}
    >
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="text-sm font-bold text-foreground">👤 Mon compte</span>
        <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid grid-cols-2 mx-4 mt-4">
            <TabsTrigger value="profile">Mon profil</TabsTrigger>
            <TabsTrigger value="pets">Mes animaux{pets.length > 0 ? ` (${pets.length})` : ""}</TabsTrigger>
          </TabsList>

          {/* ── PROFIL ── */}
          <TabsContent value="profile" className="p-4 space-y-4">
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-8">Chargement…</p>
            ) : (
              <>
                <div className="flex flex-col items-center gap-3">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt="Avatar" className="w-24 h-24 rounded-full object-cover border-2 border-border" />
                  ) : (
                    <div className="w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-bold" style={{ backgroundColor: "#FF6B35" }}>
                      {initial}
                    </div>
                  )}
                  <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                  <Button variant="outline" size="sm" className="gap-2" disabled={uploadingAvatar} onClick={() => avatarInputRef.current?.click()}>
                    <Upload className="w-3.5 h-3.5" />
                    {uploadingAvatar ? "Envoi…" : "Changer la photo"}
                  </Button>
                </div>

                <div className="flex flex-col items-center gap-1 p-4 rounded-xl bg-secondary border border-border">
                  <div className="flex items-center gap-2">
                    <Star className="w-7 h-7 text-warning fill-warning" />
                    <span className="text-3xl font-extrabold text-foreground">{profile.points}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">points de contribution</p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-foreground">Nom affiché</label>
                    <Input value={profile.display_name} onChange={(e) => setProfile(p => ({ ...p, display_name: e.target.value }))} placeholder="Ton prénom" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-foreground">Ville</label>
                      <Input value={profile.city} onChange={(e) => setProfile(p => ({ ...p, city: e.target.value }))} placeholder="Paris…" />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-foreground">Âge</label>
                      <Input type="number" min={0} value={profile.age ?? ""} onChange={(e) => setProfile(p => ({ ...p, age: e.target.value === "" ? null : Number(e.target.value) }))} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-foreground">Bio</label>
                    <Textarea value={profile.bio} onChange={(e) => setProfile(p => ({ ...p, bio: e.target.value }))} rows={3} placeholder="Parle un peu de toi et de tes compagnons…" />
                  </div>
                </div>

                <Button className="w-full bg-primary text-primary-foreground hover:opacity-90" disabled={saving} onClick={handleSave}>
                  {saving ? "Enregistrement…" : "💾 Enregistrer"}
                </Button>
              </>
            )}
          </TabsContent>

          {/* ── ANIMAUX ── */}
          <TabsContent value="pets" className="p-4">

            {/* VUE LISTE */}
            {petView === "list" && (
              <div className="space-y-3">
                <Button onClick={openCreatePet} className="w-full gap-2 bg-primary text-primary-foreground">
                  <Plus className="w-4 h-4" /> Ajouter un animal
                </Button>

                {loading && <p className="text-sm text-muted-foreground text-center py-8">Chargement…</p>}

                {!loading && pets.length === 0 && (
                  <div className="text-center py-12 space-y-2">
                    <p className="text-4xl">🐾</p>
                    <p className="text-sm text-muted-foreground">Aucun animal pour le moment</p>
                    <p className="text-xs text-muted-foreground">Ajoute ton premier compagnon !</p>
                  </div>
                )}

                {pets.map(pet => (
                  <div key={pet.id} className="bg-secondary border border-border rounded-xl p-3 flex items-center gap-3">
                    <div className="shrink-0">
                      {pet.avatar_url ? (
                        <img src={pet.avatar_url} alt={pet.name} className="w-14 h-14 rounded-full object-cover border border-border" />
                      ) : (
                        <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center text-2xl border border-border">
                          {getSpeciesEmoji(pet.species)}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground text-sm truncate">{pet.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {getSpeciesEmoji(pet.species)} {getSpeciesLabel(pet.species)}
                        {pet.breed ? ` · ${pet.breed}` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {pet.sex === "M" ? "♂ Mâle" : pet.sex === "F" ? "♀ Femelle" : ""}
                        {pet.sex && pet.birth_date ? " · " : ""}
                        {getAge(pet.birth_date)}
                      </p>
                      {pet.bio && <p className="text-xs text-muted-foreground italic truncate mt-0.5">"{pet.bio}"</p>}
                    </div>

                    <div className="flex flex-col gap-1 shrink-0">
                      <button onClick={() => openAlbum(pet)} className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg hover:bg-muted transition-colors">📷 Album</button>
                      <button onClick={() => openEditPet(pet)} className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg hover:bg-muted transition-colors">✏️ Modifier</button>
                      <button onClick={() => handleDeletePet(pet)} className="text-xs text-destructive hover:bg-destructive/10 px-2 py-1 rounded-lg transition-colors">🗑️ Suppr.</button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* VUE FORMULAIRE */}
            {petView === "form" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <button onClick={() => setPetView("list")} className="text-muted-foreground hover:text-foreground transition-colors">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <h3 className="font-semibold text-foreground text-sm">
                    {editingPet ? `Modifier · ${editingPet.name}` : "Nouvel animal"}
                  </h3>
                </div>

                {editingPet && (
                  <div className="flex flex-col items-center gap-2">
                    {pets.find(p => p.id === editingPet.id)?.avatar_url ? (
                      <img src={pets.find(p => p.id === editingPet.id)!.avatar_url!} alt={editingPet.name} className="w-20 h-20 rounded-full object-cover border-2 border-border" />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center text-3xl border-2 border-border">
                        {getSpeciesEmoji(editingPet.species)}
                      </div>
                    )}
                    <input ref={petAvatarInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleUploadPetAvatar(e, editingPet)} />
                    <Button variant="outline" size="sm" className="gap-2 text-xs" disabled={uploadingPetAvatar} onClick={() => petAvatarInputRef.current?.click()}>
                      <Camera className="w-3 h-3" />
                      {uploadingPetAvatar ? "Envoi…" : "Changer la photo"}
                    </Button>
                  </div>
                )}

                <div>
                  <label className="text-xs font-medium text-foreground">Nom *</label>
                  <Input value={petForm.name} onChange={(e) => setPetForm(f => ({ ...f, name: e.target.value }))} placeholder="Rex, Luna, Noisette…" />
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground mb-2 block">Espèce *</label>
                  <div className="grid grid-cols-3 gap-2">
                    {SPECIES_OPTIONS.map(s => (
                      <button
                        key={s.value}
                        onClick={() => setPetForm(f => ({ ...f, species: s.value }))}
                        className={`py-2 px-3 rounded-lg border text-xs font-medium transition-colors flex flex-col items-center gap-1 ${
                          petForm.species === s.value
                            ? "bg-primary/10 border-primary text-primary"
                            : "border-border text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        <span className="text-lg">{s.emoji}</span>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-foreground">Race</label>
                    <Input value={petForm.breed} onChange={(e) => setPetForm(f => ({ ...f, breed: e.target.value }))} placeholder="Golden, Siamois…" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-foreground mb-2 block">Sexe</label>
                    <div className="flex gap-2">
                      {[{ v: "M", l: "♂ Mâle" }, { v: "F", l: "♀ Femelle" }].map(s => (
                        <button
                          key={s.v}
                          onClick={() => setPetForm(f => ({ ...f, sex: f.sex === s.v ? "" : s.v }))}
                          className={`flex-1 py-2 text-xs rounded-lg border font-medium transition-colors ${
                            petForm.sex === s.v
                              ? "bg-primary/10 border-primary text-primary"
                              : "border-border text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          {s.l}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground">Date de naissance</label>
                  <Input
                    type="date"
                    value={petForm.birth_date}
                    onChange={(e) => setPetForm(f => ({ ...f, birth_date: e.target.value }))}
                    max={new Date().toISOString().split("T")[0]}
                  />
                  {petForm.birth_date && (
                    <p className="text-xs text-primary mt-1">🎂 {getAge(petForm.birth_date)}</p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground">Bio</label>
                  <Textarea
                    value={petForm.bio}
                    onChange={(e) => setPetForm(f => ({ ...f, bio: e.target.value }))}
                    rows={2}
                    placeholder="Adore les terrasses, craint les orages…"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <Button variant="outline" className="flex-1" onClick={() => setPetView("list")}>Annuler</Button>
                  <Button className="flex-1 bg-primary text-primary-foreground" disabled={savingPet} onClick={handleSavePet}>
                    {savingPet ? "Enregistrement…" : editingPet ? "✅ Mettre à jour" : "✅ Ajouter"}
                  </Button>
                </div>
              </div>
            )}

            {/* VUE ALBUM */}
            {petView === "album" && albumPet && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <button onClick={() => { setPetView("list"); setAlbumPet(null); setAlbum([]); }} className="text-muted-foreground hover:text-foreground transition-colors">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <div className="flex items-center gap-2">
                    {albumPet.avatar_url ? (
                      <img src={albumPet.avatar_url} alt={albumPet.name} className="w-8 h-8 rounded-full object-cover border border-border" />
                    ) : (
                      <span className="text-xl">{getSpeciesEmoji(albumPet.species)}</span>
                    )}
                    <h3 className="font-semibold text-foreground text-sm">Album · {albumPet.name}</h3>
                  </div>
                </div>

                <div className="flex gap-2">
                  <input ref={petAvatarInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleUploadPetAvatar(e, albumPet)} />
                  <input ref={albumInputRef} type="file" accept="image/*" className="hidden" onChange={handleAddAlbumPhoto} />
                  <Button variant="outline" size="sm" className="flex-1 gap-1 text-xs" disabled={uploadingPetAvatar} onClick={() => petAvatarInputRef.current?.click()}>
                    <Camera className="w-3 h-3" />
                    {uploadingPetAvatar ? "Envoi…" : "Photo de profil"}
                  </Button>
                  <Button size="sm" className="flex-1 gap-1 text-xs bg-primary text-primary-foreground" disabled={uploadingPhoto} onClick={() => albumInputRef.current?.click()}>
                    <Plus className="w-3 h-3" />
                    {uploadingPhoto ? "Envoi…" : "Ajouter une photo"}
                  </Button>
                </div>

                {loadingAlbum && <p className="text-sm text-muted-foreground text-center py-6">Chargement…</p>}

                {!loadingAlbum && album.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">Aucune photo dans l'album 📷</p>
                )}

                {album.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {album.map(photo => (
                      <div key={photo.id} className="relative group rounded-xl overflow-hidden border border-border aspect-square bg-muted">
                        <img src={photo.url} alt="Photo animal" className="w-full h-full object-cover" />
                        <button
                          onClick={() => handleDeleteAlbumPhoto(photo)}
                          className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-destructive/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
