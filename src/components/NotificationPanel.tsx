import { useUserNotifications } from "@/hooks/useUserNotifications";
import { Skeleton } from "@/components/ui/skeleton";
import { X } from "lucide-react";
import { useRef, useEffect } from "react";

interface NotificationPanelProps {
  open: boolean;
  onClose: () => void;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `il y a ${days}j`;
  return new Date(dateStr).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

const typeConfig: Record<string, { icon: string; borderColor: string; bgColor: string }> = {
  submission_approved: { icon: "✅", borderColor: "border-l-green-500", bgColor: "bg-green-100 dark:bg-green-900/30" },
  submission_rejected: { icon: "❌", borderColor: "border-l-red-500", bgColor: "bg-red-100 dark:bg-red-900/30" },
  report_reviewed: { icon: "✅", borderColor: "border-l-green-500", bgColor: "bg-green-100 dark:bg-green-900/30" },
  report_dismissed: { icon: "💬", borderColor: "border-l-muted", bgColor: "bg-muted/50" },
  new_review: { icon: "💬", borderColor: "border-l-primary", bgColor: "bg-primary/10" },
  mention: { icon: "🔖", borderColor: "border-l-violet-500", bgColor: "bg-violet-100 dark:bg-violet-900/30" },
  lost_pet: { icon: "​🆘", borderColor: "border-l-amber-500", bgColor: "bg-amber-100 dark:bg-amber-900/30" },
  new_stray: { icon: "🚨", borderColor: "border-l-red-500", bgColor: "bg-red-100 dark:bg-red-900/30" },
  new_place: { icon: "📍", borderColor: "border-l-primary", bgColor: "bg-primary/10" },
  new_user:  { icon: "👤", borderColor: "border-l-violet-500", bgColor: "bg-violet-100 dark:bg-violet-900/30" },
};

export default function NotificationPanel({ open, onClose }: NotificationPanelProps) {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useUserNotifications();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    };
    setTimeout(() => document.addEventListener("mousedown", handler), 0);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const handleNotificationClick = (n: (typeof notifications)[number]) => {
    if (!n.is_read) markAsRead(n.id);
    onClose();
    if (n.type === "new_review" && n.related_id) {
      window.dispatchEvent(new CustomEvent("global-search-open-place", { detail: { placeId: n.related_id } }));
    } else if (n.type === "lost_pet" && n.related_id) {
      window.dispatchEvent(new CustomEvent("open-lost-pet", { detail: { petId: n.related_id } }));
    } else if (n.type === "new_stray" && n.related_id) {
      window.dispatchEvent(new CustomEvent("open-stray", { detail: { strayId: n.related_id } }));
    } else if (n.type === "new_place" && n.related_id) {
      window.dispatchEvent(new CustomEvent("global-search-open-place", { detail: { placeId: n.related_id } }));
    } else if (n.type === "new_user" && n.related_id) {
      window.dispatchEvent(new CustomEvent("open-user-profile", { detail: { userId: n.related_id } }));
    }
  };

  return (
    <>
      <div
        ref={panelRef}
        data-panel="notifications"
        className="fixed top-[60px] left-1/2 -translate-x-1/2 z-[9999] flex flex-col overflow-hidden rounded-xl shadow-2xl"
        style={{
          width: "min(360px, calc(100vw - 16px))",
          maxHeight: "min(520px, calc(100dvh - 120px))",
          background: "color-mix(in srgb, var(--card) 60%, transparent)",
          border: "1px solid color-mix(in srgb, var(--border) 50%, transparent)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <span className="font-bold text-sm text-foreground">🔔 Notifications</span>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button onClick={markAllAsRead} className="text-xs text-primary hover:underline">
                Tout marquer comme lu
              </button>
            )}
            <button onClick={onClose} className="p-1 rounded hover:bg-muted transition-colors">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 space-y-3">
              <Skeleton className="h-[72px] w-full rounded-lg" />
              <Skeleton className="h-[72px] w-full rounded-lg" />
              <Skeleton className="h-[72px] w-full rounded-lg" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-4">
              <span className="text-4xl opacity-30">🔔</span>
              <p className="text-sm text-muted-foreground mt-3">Aucune notification pour le moment</p>
              <p className="text-xs text-muted-foreground mt-1">Tu seras notifié ici quand tes soumissions seront examinées</p>
            </div>
          ) : (
            notifications.map((n) => {
              const cfg = typeConfig[n.type] || typeConfig.report_dismissed;
              const isClickable = !!n.related_id && ["new_review", "lost_pet", "new_stray", "new_place", "new_user"].includes(n.type);
              return (
                <button
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`w-full text-left px-4 py-3 border-l-[3px] ${cfg.borderColor} transition-colors hover:bg-muted/50 ${
                    !n.is_read ? "bg-primary/5" : ""
                  } ${isClickable ? "cursor-pointer" : "cursor-default"}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 ${cfg.bgColor}`}>
                      {cfg.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground leading-tight">{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-[10px] text-muted-foreground">{timeAgo(n.created_at)}</p>
                        {n.type === "new_review" && isClickable && <span className="text-[10px] text-primary font-medium">→ Voir les avis</span>}
                        {n.type === "lost_pet" && isClickable && <span className="text-[10px] text-amber-600 font-medium">→ Voir l'annonce</span>}
                        {n.type === "new_stray" && isClickable && <span className="text-[10px] text-red-600 font-medium">→ Voir le signalement</span>}
                        {n.type === "new_place" && isClickable && <span className="text-[10px] text-primary font-medium">→ Ouvrir le lieu</span>}
                        {n.type === "new_user" && isClickable && <span className="text-[10px] text-violet-600 font-medium">→ Voir le profil</span>}
                      </div>
                    </div>
                    {!n.is_read && <span className="w-2 h-2 rounded-full bg-primary shrink-0 mt-1.5" />}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}

