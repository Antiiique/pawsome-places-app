import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ADMIN_EMAILS = ["elvin.agd@gmail.com", "artistfx.mp4@gmail.com"];

const CATS = [
  { value: "veterinaire", label: "Vétérinaire 🏥" },
  { value: "animalerie", label: "Animalerie 🐾" },
  { value: "parc", label: "Parc & Nature 🌿" },
  { value: "refuge", label: "Refuge 🏠" },
  { value: "toiletteur", label: "Toiletteur ✂️" },
  { value: "pension", label: "Pension 🏡" },
  { value: "educateur", label: "Éducateur canin 🦮" },
  { value: "restaurant", label: "Restaurant 🍽️" },
  { value: "hotel", label: "Hôtel 🛏️" },
  { value: "cafe", label: "Café ☕" },
  { value: "camping", label: "Camping ⛺" },
  { value: "bar", label: "Bar 🍺" },
  { value: "commerce", label: "Commerce 🛍️" },
  { value: "plage", label: "Plage 🏖️" },
  { value: "outdoor", label: "Outdoor 🏕️" },
  { value: "services", label: "Services ❤️" },
  { value: "shop", label: "Pet Shop 🛍️" },
  { value: "other", label: "Autre 📍" },
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
    supabase.auth.getUser().then(({ data }) => {
      setIsAdmin(ADMIN_EMAILS.includes(data.user?.email ?? ""));
    });
  }, []);

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
