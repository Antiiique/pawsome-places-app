import { useEffect, useRef, useState } from "react";
import { WifiOff, Wifi } from "lucide-react";

const RECONNECTED_DISPLAY_MS = 2600;

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  const [showReconnected, setShowReconnected] = useState(false);
  const wasOffline = useRef(false);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const handleOffline = () => {
      clearTimeout(reconnectTimer.current);
      wasOffline.current = true;
      setShowReconnected(false);
      setIsOnline(false);
    };
    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline.current) {
        setShowReconnected(true);
        reconnectTimer.current = setTimeout(() => {
          setShowReconnected(false);
          wasOffline.current = false;
        }, RECONNECTED_DISPLAY_MS);
      }
    };
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
      clearTimeout(reconnectTimer.current);
    };
  }, []);

  const visible = !isOnline || showReconnected;
  if (!visible) return null;

  return (
    <div
      className="fixed left-1/2 z-[9995] -translate-x-1/2 pointer-events-none"
      style={{ top: "calc(var(--header-h) + 8px)" }}
    >
      <style>{`
        @keyframes offline-pill-in {
          from { opacity: 0; transform: translate(-50%, -14px) scale(0.94); }
          to   { opacity: 1; transform: translate(-50%, 0)     scale(1);    }
        }
        @keyframes offline-ring-ping {
          0%   { transform: scale(1);   opacity: 0.5; }
          100% { transform: scale(2.4); opacity: 0;   }
        }
        @keyframes offline-icon-blink {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0.4; }
        }
      `}</style>

      <div
        key={isOnline ? "online" : "offline"}
        className={`pointer-events-auto flex items-center gap-2 rounded-full border shadow-lg backdrop-blur-xl px-4 py-2 ${
          isOnline ? "bg-success border-success" : "bg-warning border-warning"
        }`}
        style={{ animation: "offline-pill-in 0.35s cubic-bezier(0.4,0,0.2,1)" }}
      >
        <span className="relative flex items-center justify-center w-5 h-5 shrink-0">
          {!isOnline && (
            <span
              className="absolute inset-0 rounded-full bg-white/60"
              style={{ animation: "offline-ring-ping 1.7s ease-out infinite" }}
            />
          )}
          {isOnline ? (
            <Wifi className="w-4 h-4 text-white relative" />
          ) : (
            <WifiOff
              className="w-4 h-4 text-white relative"
              style={{ animation: "offline-icon-blink 1.7s ease-in-out infinite" }}
            />
          )}
        </span>
        <span className="text-xs font-semibold text-white whitespace-nowrap">
          {isOnline ? "De retour en ligne" : "Vous êtes hors ligne"}
        </span>
      </div>
    </div>
  );
}
