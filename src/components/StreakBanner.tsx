import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";

interface StreakInfo {
  streak_current: number;
  streak_last_date: string | null;
  streak_shield_available: boolean;
}

function getMultiplierLabel(streak: number) {
  if (streak >= 100) return "x3";
  if (streak >= 30)  return "x2";
  if (streak >= 7)   return "x1.5";
  return null;
}

export default function StreakBanner() {
  const { user } = useAuthContext();
  const [info, setInfo] = useState<StreakInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!user) return;

    const check = async () => {
      const now = new Date();
      // Only show after 20h local time
      if (now.getHours() < 20) return;

      const { data } = await (supabase as any)
        .from("profiles")
        .select("streak_current, streak_last_date, streak_shield_available")
        .eq("id", user.id)
        .maybeSingle();

      if (!data || !data.streak_current || data.streak_current < 1) return;

      const today = new Date().toISOString().slice(0, 10);
      if (data.streak_last_date === today) return; // already contributed

      setInfo(data as StreakInfo);
    };

    check();
  }, [user]);

  if (!user || !info || dismissed) return null;

  const mult = getMultiplierLabel(info.streak_current);

  return (
    <div
      className="fixed top-16 left-1/2 z-[9990] -translate-x-1/2 w-[calc(100vw-24px)] max-w-sm"
      style={{ animation: "slideDown 0.35s cubic-bezier(0.4,0,0.2,1)" }}
    >
      <style>{`
        @keyframes slideDown {
          from { opacity:0; transform:translate(-50%,-16px); }
          to   { opacity:1; transform:translate(-50%,0); }
        }
      `}</style>

      <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-border/60"
        style={{
          background: "linear-gradient(135deg, #FF6B35 0%, #FF3D00 100%)",
        }}
      >
        {/* Dismiss */}
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
        >
          <X className="w-3.5 h-3.5 text-white" />
        </button>

        <div className="px-4 py-3.5 pr-9 flex items-center gap-3">
          {/* Flame */}
          <div className="relative shrink-0">
            <span className="text-4xl" style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))" }}>🔥</span>
            {mult && (
              <span className="absolute -bottom-1 -right-1 text-[9px] font-black bg-yellow-400 text-yellow-900 px-1 rounded-full leading-tight">
                {mult}
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-white font-extrabold text-sm leading-tight">
              Série de {info.streak_current} jour{info.streak_current > 1 ? "s" : ""} en danger !
            </p>
            <p className="text-white/80 text-xs mt-0.5 leading-tight">
              {info.streak_shield_available
                ? "Contribue maintenant ou ton bouclier s'activera automatiquement."
                : "Contribue avant minuit pour ne pas perdre ta série !"}
            </p>
          </div>
        </div>

        {/* CTA strip */}
        <button
          onClick={() => {
            setDismissed(true);
            window.dispatchEvent(new CustomEvent("open-submit-modal", { detail: {} }));
          }}
          className="w-full py-2 text-xs font-bold text-orange-900 bg-yellow-400 hover:bg-yellow-300 active:bg-yellow-500 transition-colors"
        >
          Ajouter un lieu maintenant →
        </button>
      </div>
    </div>
  );
}
