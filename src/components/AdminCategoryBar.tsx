import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ADMIN_EMAILS = ["elvin.agd@gmail.com", "artistfx.mp4@gmail.com"];

const isAdminEmail = (email: string | null | undefined) =>
  ADMIN_EMAILS.includes(email?.trim().toLowerCase() ?? "");

const CATS = [
  { value: "veterinaire",    label: "Vétérinaires 🏥" },
  { value: "restaurant",     label: "Restaurants 🍽️" },
  { value: "hotel",          label: "Hôtels 🛏️" },
  { value: "outdoor",        label: "Parcs & Nature 🌿" },
  { value: "parc_chiens",    label: "Parcs à chiens 🐕" },
  { value: "animalerie",     label: "Animalerie 🐾" },
  { value: "pension",        label: "Pension 🏠" },
  { value: "toiletteur",     label: "Toiletteurs 🛁" },
  { value: "educateur",      label: "Éducateurs 🎓" },
  { value: "masseur",        label: "Masseurs / Ostéo 💆" },
  { value: "pet_sitter",     label: "Pet Sitters 🏡" },
  { value: "dog_walker",     label: "Dog Walkers 🦮" },
  { value: "camping",        label: "Camping ⛺" },
  { value: "plage",          label: "Plages 🏖️" },
  { value: "loisir",         label: "Loisirs 🎯" },
  { value: "refuge",         label: "Refuges 🏚️" },
  { value: "spa",            label: "SPA 🐾" },
  { value: "cafe_animalier", label: "Cafés animaux ☕" },
  { value: "aeroport",       label: "Aéroports ✈️" },
  { value: "aire_repos",     label: "Aires de repos 🛣️" },
  { value: "transport",      label: "Transport 🚇" },
  { value: "evenement",      label: "Événements 📅" },
  { value: "other",          label: "Autres 📍" },
];

interface AdminCategoryBarProps {
  placeId: string;
  category: string;
}

export default function AdminCategoryBar({ placeId, category }: AdminCategoryBarProps) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [saving, setSaving] = useState(false);
  const [current, setCurrent] = useState(category);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setIsAdmin(isAdminEmail(data.session?.user?.email));
    }).catch(() => setIsAdmin(false));
  }, []);

  useEffect(() => {
    setCurrent(category);
  }, [category, placeId]);

  if (!isAdmin) return null;

  const save = async (val: string) => {
    if (val === current) return;
    setSaving(true);
    const { error } = await supabase
      .from("pet_friendly_places")
      .update({ category: val })
      .eq("id", placeId);
    setSaving(false);
    if (error) { toast.error("Erreur : " + error.message); return; }
    setCurrent(val);
    toast.success("Catégorie modifiée ✓");
  };

  return (
    <div
      className="fixed left-4 right-4 z-[60] bg-violet-600 text-white rounded-2xl px-4 py-2.5 shadow-xl flex items-center gap-3"
      style={{ bottom: "calc(45dvh + 12px)" }}
    >
      <span className="text-sm font-bold shrink-0">🏷 Catégorie :</span>
      <select
        value={current}
        disabled={saving}
        onChange={e => save(e.target.value)}
        className="flex-1 bg-violet-700 text-white text-sm font-semibold rounded-xl px-3 py-1.5 border border-violet-400 focus:outline-none cursor-pointer"
      >
        {CATS.map(c => (
          <option key={c.value} value={c.value}>{c.label}</option>
        ))}
        {!CATS.find(c => c.value === current) && current && (
          <option value={current}>{current}</option>
        )}
      </select>
      {saving && (
        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
      )}
    </div>
  );
}
