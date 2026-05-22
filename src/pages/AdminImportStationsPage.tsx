import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";

const BATCH = 100;

export default function AdminImportStationsPage() {
  const { user, profile } = useAuthContext();
  const [log, setLog] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  const addLog = (msg: string) => setLog(prev => [...prev, msg]);

  const runImport = async () => {
    setRunning(true);
    setLog([]);
    setDone(false);

    addLog("Chargement du fichier JSON...");
    let data: any[];
    try {
      const resp = await fetch("/import/stations_carburant.json");
      data = await resp.json();
      addLog(`✓ ${data.length} stations chargées`);
    } catch (e) {
      addLog(`✗ Erreur chargement : ${e}`);
      setRunning(false);
      return;
    }

    addLog("Suppression des anciennes stations OSM/gov...");
    await supabase.from("pet_friendly_places" as any)
      .delete()
      .eq("category", "station_carburant")
      .eq("source", "prix_carburants_gouv");

    addLog("Import par lots de 100...");
    let inserted = 0;
    let errors = 0;
    const total = data.length;

    for (let i = 0; i < Math.ceil(total / BATCH); i++) {
      const chunk = data.slice(i * BATCH, (i + 1) * BATCH);
      const { error } = await supabase.from("pet_friendly_places" as any).insert(chunk);
      if (error) {
        errors++;
        addLog(`✗ Lot ${i + 1} : ${error.message.slice(0, 80)}`);
      } else {
        inserted += chunk.length;
        if ((i + 1) % 10 === 0 || inserted >= total - BATCH) {
          addLog(`✓ ${inserted}/${total} insérées`);
        }
      }
      await new Promise(r => setTimeout(r, 100));
    }

    addLog(`\n══════════════════════════`);
    addLog(`Terminé : ${inserted} stations importées, ${errors} erreurs`);
    setRunning(false);
    setDone(true);
  };

  if (!user || !profile?.is_admin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Accès réservé aux administrateurs.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">⛽ Import Stations Essence</h1>
      <p className="text-muted-foreground text-sm mb-6">
        Importe les stations-service françaises depuis prix-carburants.gouv.fr (~11 000 entrées).
      </p>

      <button
        onClick={runImport}
        disabled={running || done}
        className="px-6 py-3 rounded-xl bg-yellow-500 text-white font-semibold disabled:opacity-50 mb-6"
      >
        {running ? "Import en cours..." : done ? "✓ Import terminé" : "Lancer l'import"}
      </button>

      {log.length > 0 && (
        <div className="rounded-xl border border-border bg-muted/30 p-4 font-mono text-xs space-y-0.5 max-h-[500px] overflow-y-auto">
          {log.map((line, i) => (
            <div key={i} className={
              line.startsWith("✗") ? "text-red-500" :
              line.startsWith("✓") ? "text-green-600" :
              "text-foreground"
            }>
              {line}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
