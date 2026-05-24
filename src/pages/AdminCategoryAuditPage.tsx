import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "sonner";

const CATS = [
  { value: "veterinaire", label: "Vétérinaires 🏥" },
  { value: "restaurant", label: "Restaurants 🍽️" },
  { value: "hotel", label: "Hôtels 🛏️" },
  { value: "outdoor", label: "Parcs & Nature 🌿" },
  { value: "parc_chiens", label: "Parcs à chiens 🐕" },
  { value: "animalerie", label: "Animalerie 🐾" },
  { value: "pension", label: "Pension 🏠" },
  { value: "toiletteur", label: "Toiletteurs 🛁" },
  { value: "educateur", label: "Éducateurs 🎓" },
  { value: "masseur", label: "Masseurs / Ostéo 💆" },
  { value: "pet_sitter", label: "Pet Sitters 🏡" },
  { value: "dog_walker", label: "Dog Walkers 🦮" },
  { value: "camping", label: "Camping ⛺" },
  { value: "plage", label: "Plages 🏖️" },
  { value: "loisir", label: "Loisirs 🎯" },
  { value: "refuge", label: "Refuges 🏚️" },
  { value: "spa", label: "SPA 🐾" },
  { value: "cafe_animalier", label: "Cafés animaux ☕" },
  { value: "aeroport", label: "Aéroports ✈️" },
  { value: "aire_repos", label: "Aires de repos 🛣️" },
  { value: "station_carburant", label: "Stations essence ⛽" },
  { value: "transport", label: "Transport 🚇" },
  { value: "evenement", label: "Événements 📅" },
  { value: "commerce", label: "Commerce 🏪" },
  { value: "other", label: "Autres 📍" },
];

interface Place {
  id: string;
  name: string;
  category: string;
  subcategory: string | null;
  city: string | null;
  address: string | null;
}

export default function AdminCategoryAuditPage() {
  const { user, profile } = useAuthContext();
  const [filterCategory, setFilterCategory] = useState("animalerie");
  const [search, setSearch] = useState("");
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("pet_friendly_places" as any)
      .select("id, name, category, subcategory, city, address")
      .eq("category", filterCategory)
      .order("city", { ascending: true })
      .order("name", { ascending: true })
      .limit(500);
    setLoading(false);
    if (error) { toast.error("Erreur : " + error.message); return; }
    setPlaces((data as Place[]) ?? []);
  }, [filterCategory]);

  useEffect(() => { load(); }, [load]);

  const updateCategory = async (id: string, newCat: string) => {
    setSaving(s => ({ ...s, [id]: true }));
    const { error } = await supabase
      .from("pet_friendly_places" as any)
      .update({ category: newCat })
      .eq("id", id);
    setSaving(s => ({ ...s, [id]: false }));
    if (error) { toast.error("Erreur : " + error.message); return; }
    setPlaces(ps => ps.map(p => p.id === id ? { ...p, category: newCat } : p));
    toast.success("Catégorie mise à jour ✓");
  };

  const updateSubcategory = async (id: string, val: string, original: string | null) => {
    const trimmed = val.trim();
    if (trimmed === (original ?? "")) return;
    setSaving(s => ({ ...s, [`sub_${id}`]: true }));
    const { error } = await supabase
      .from("pet_friendly_places" as any)
      .update({ subcategory: trimmed || null })
      .eq("id", id);
    setSaving(s => ({ ...s, [`sub_${id}`]: false }));
    if (error) { toast.error("Erreur : " + error.message); return; }
    setPlaces(ps => ps.map(p => p.id === id ? { ...p, subcategory: trimmed || null } : p));
    toast.success("Type modifié ✓");
  };

  if (!user || !profile?.is_admin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Accès réservé aux administrateurs.</p>
      </div>
    );
  }

  const filtered = search.trim()
    ? places.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.city ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : places;

  const recategorized = places.filter(p => p.category !== filterCategory).length;

  return (
    <div className="min-h-screen bg-background p-4 max-w-3xl mx-auto">
      <div className="mb-4">
        <h1 className="text-xl font-bold mb-1">🔍 Audit catégories</h1>
        <p className="text-sm text-muted-foreground">
          Recatégorisez rapidement les lieux mal classés. Chaque changement est sauvegardé immédiatement.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <select
          value={filterCategory}
          onChange={(e) => { setFilterCategory(e.target.value); setSearch(""); }}
          className="text-sm rounded-lg border border-border bg-background px-3 py-2 font-medium focus:outline-none"
        >
          {CATS.map(c => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filtrer par nom ou ville…"
          className="flex-1 min-w-[180px] text-sm rounded-lg border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          onClick={load}
          className="text-sm px-3 py-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
        >
          ↺ Recharger
        </button>
      </div>

      <div className="text-xs text-muted-foreground mb-3">
        {loading ? "Chargement…" : `${filtered.length} lieux affichés${recategorized > 0 ? ` · ${recategorized} recatégorisés cette session` : ""}`}
      </div>

      <div className="space-y-2">
        {filtered.map(place => (
          <div
            key={place.id}
            className={`rounded-xl border p-3 space-y-2 transition-colors ${
              place.category !== filterCategory
                ? "border-green-300 bg-green-50 dark:bg-green-950/20"
                : "border-border bg-card"
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm truncate">{place.name}</p>
                <p className="text-xs text-muted-foreground">
                  {[place.city, place.address].filter(Boolean).join(" · ")}
                </p>
              </div>
              {saving[place.id] && (
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0 mt-0.5" />
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <select
                value={place.category}
                onChange={(e) => updateCategory(place.id, e.target.value)}
                disabled={!!saving[place.id]}
                className="text-xs rounded-lg border border-border bg-background px-2 py-1 font-medium focus:outline-none focus:ring-1 focus:ring-ring"
              >
                {CATS.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>

              <input
                defaultValue={place.subcategory ?? ""}
                onBlur={(e) => updateSubcategory(place.id, e.target.value, place.subcategory)}
                onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                placeholder="Type de commerce…"
                className="flex-1 min-w-[140px] text-xs rounded-lg border border-border bg-background px-2 py-1 focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
          </div>
        ))}
        {!loading && filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">Aucun lieu trouvé.</p>
        )}
      </div>
    </div>
  );
}
