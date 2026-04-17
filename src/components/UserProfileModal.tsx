import { useState, useEffect, useRef, useCallback } from "react";
import { X, Upload, Trash2, Star } from "lucide-react";
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

interface PetPhoto {
  id: string;
  url: string;
  pet_name: string | null;
}

export default function UserProfileModal({ open, onClose }: UserProfileModalProps) {
  const { user } = useAuthContext();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingPet, setUploadingPet] = useState(false);
  const [profile, setProfile] = useState<ProfileData>({
    display_name: "",
    avatar_url: null,
    bio: "",
    age: null,
    city: "",
    points: 0,
  });
  const [pets, setPets] = useState<PetPhoto[]>([]);
  const [pendingPetFile, setPendingPetFile] = useState<File | null>(null);
  const [pendingPetName, setPendingPetName] = useState("");

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const petInputRef = useRef<HTMLInputElement>(null);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: prof }, { data: petData }] = await Promise.all([
      supabase.from("profiles")
        .select("display_name, avatar_url, bio, age, city, points")
        .eq("id", user.id)
        .maybeSingle(),
      supabase.from("pet_photos" as any)
        .select("id, url, pet_name")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
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
    if (open) fetchAll();
  }, [open, fetchAll]);

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
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (upErr) { setUploadingAvatar(false); toast.error("Upload échoué : " + upErr.message); return; }
    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    const { error: updErr } = await supabase.from("profiles").update({ avatar_url: publicUrl }).eq("id", user.id);
    setUploadingAvatar(false);
    if (updErr) { toast.error("Erreur : " + updErr.message); return; }
    setProfile(p => ({ ...p, avatar_url: publicUrl }));
    toast.success("Photo de profil mise à jour 📸");
    if (avatarInputRef.current) avatarInputRef.current.value = "";
  };

  const handlePetFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Photo trop lourde (max 5 Mo)"); return; }
    setPendingPetFile(file);
    setPendingPetName("");
  };

  const handlePetUpload = async () => {
    if (!pendingPetFile || !user) return;
    setUploadingPet(true);
    const ext = pendingPetFile.name.split(".").pop() || "jpg";
    const path = `${user.id}/pet-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("pet-photos").upload(path, pendingPetFile);
    if (upErr) { setUploadingPet(false); toast.error("Upload échoué : " + upErr.message); return; }
    const { data: { publicUrl } } = supabase.storage.from("pet-photos").getPublicUrl(path);
    const { data: inserted, error: insErr } = await supabase.from("pet_photos" as any).insert({
      user_id: user.id,
      url: publicUrl,
      pet_name: pendingPetName || null,
    } as any).select("id, url, pet_name").single();
    setUploadingPet(false);
    if (insErr) { toast.error("Erreur : " + insErr.message); return; }
    if (inserted) setPets(prev => [inserted as any, ...prev]);
    setPendingPetFile(null);
    setPendingPetName("");
    if (petInputRef.current) petInputRef.current.value = "";
    toast.success("Photo ajoutée 🐾");
  };

  const handlePetDelete = async (pet: PetPhoto) => {
    const { error } = await supabase.from("pet_photos" as any).delete().eq("id", pet.id);
    if (error) { toast.error("Erreur : " + error.message); return; }
    setPets(prev => prev.filter(p => p.id !== pet.id));
    toast.success("Photo supprimée");
  };

  if (!open) return null;

  const initial = (profile.display_name?.[0] || user?.email?.[0] || "?").toUpperCase();

  return (
    <div
      className="fixed top-[56px] right-0 z-[500] flex flex-col overflow-hidden border-l border-border bg-card animate-slide-in-right"
      style={{
        width: 400,
        maxWidth: "95vw",
        height: "calc(100dvh - 56px)",
        borderBottomLeftRadius: 14,
      }}
    >
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="text-sm font-bold text-foreground">👤 Mon compte</span>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          aria-label="Fermer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid grid-cols-2 mx-4 mt-4">
            <TabsTrigger value="profile">Mon profil</TabsTrigger>
            <TabsTrigger value="pets">Mes animaux</TabsTrigger>
          </TabsList>

          {/* Profile tab */}
          <TabsContent value="profile" className="p-4 space-y-4">
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-8">Chargement…</p>
            ) : (
              <>
                {/* Avatar */}
                <div className="flex flex-col items-center gap-3">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt="Avatar"
                      className="w-24 h-24 rounded-full object-cover border-2 border-border"
                    />
                  ) : (
                    <div
                      className="w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-bold"
                      style={{ backgroundColor: "#FF6B35" }}
                    >
                      {initial}
                    </div>
                  )}
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    disabled={uploadingAvatar}
                    onClick={() => avatarInputRef.current?.click()}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    {uploadingAvatar ? "Envoi…" : "Changer la photo"}
                  </Button>
                </div>

                {/* Points */}
                <div className="flex flex-col items-center gap-1 p-4 rounded-xl bg-secondary border border-border">
                  <div className="flex items-center gap-2">
                    <Star className="w-7 h-7 text-warning fill-warning" />
                    <span className="text-3xl font-extrabold text-foreground">{profile.points}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">points de contribution</p>
                </div>

                {/* Fields */}
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-foreground">Nom affiché</label>
                    <Input
                      value={profile.display_name}
                      onChange={(e) => setProfile(p => ({ ...p, display_name: e.target.value }))}
                      placeholder="Ton prénom"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-foreground">Ville</label>
                      <Input
                        value={profile.city}
                        onChange={(e) => setProfile(p => ({ ...p, city: e.target.value }))}
                        placeholder="Paris…"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-foreground">Âge</label>
                      <Input
                        type="number"
                        min={0}
                        value={profile.age ?? ""}
                        onChange={(e) => setProfile(p => ({ ...p, age: e.target.value === "" ? null : Number(e.target.value) }))}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-foreground">Bio</label>
                    <Textarea
                      value={profile.bio}
                      onChange={(e) => setProfile(p => ({ ...p, bio: e.target.value }))}
                      rows={3}
                      placeholder="Parle un peu de toi et de tes compagnons…"
                    />
                  </div>
                </div>

                <Button
                  className="w-full bg-primary text-primary-foreground hover:opacity-90"
                  disabled={saving}
                  onClick={handleSave}
                >
                  {saving ? "Enregistrement…" : "💾 Enregistrer"}
                </Button>
              </>
            )}
          </TabsContent>

          {/* Pets tab */}
          <TabsContent value="pets" className="p-4 space-y-4">
            <input
              ref={petInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePetFileSelect}
            />

            {pendingPetFile ? (
              <div className="space-y-3 p-3 rounded-xl border border-border bg-secondary">
                <p className="text-xs font-semibold text-foreground">Nouvelle photo : {pendingPetFile.name}</p>
                <Input
                  placeholder="Nom de l'animal (optionnel)"
                  value={pendingPetName}
                  onChange={(e) => setPendingPetName(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 bg-primary text-primary-foreground"
                    disabled={uploadingPet}
                    onClick={handlePetUpload}
                  >
                    {uploadingPet ? "Envoi…" : "✅ Ajouter"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setPendingPetFile(null); setPendingPetName(""); if (petInputRef.current) petInputRef.current.value = ""; }}
                  >
                    Annuler
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => petInputRef.current?.click()}
              >
                <Upload className="w-4 h-4" />
                Ajouter une photo
              </Button>
            )}

            {pets.length === 0 && !pendingPetFile && (
              <p className="text-sm text-muted-foreground text-center py-8">
                Aucune photo pour le moment 🐾
              </p>
            )}

            {pets.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                {pets.map(pet => (
                  <div key={pet.id} className="relative group rounded-xl overflow-hidden border border-border bg-secondary">
                    <img src={pet.url} alt={pet.pet_name || "Animal"} className="w-full aspect-square object-cover" />
                    <button
                      onClick={() => handlePetDelete(pet)}
                      className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-destructive/90 text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Supprimer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    {pet.pet_name && (
                      <p className="px-2 py-1.5 text-xs font-semibold text-foreground truncate text-center">
                        {pet.pet_name}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
