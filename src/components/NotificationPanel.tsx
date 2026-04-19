import { useUserNotifications } from "@/hooks/useUserNotifications";
import { Skeleton } from "@/components/ui/skeleton";
import { X } from "lucide-react";

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
};

export default function NotificationPanel({ open, onClose }: NotificationPanelProps) {
  const { notifications, unreadCount, loading, markAsRead, markAllAsRead } = useUserNotifications();

  if (!open) return null;

  const handleNotificationClick = (n: (typeof notifications)[number]) => {
    if (!n.is_read) markAsRead(n.id);
    if (n.type === "new_review" && n.related_id) {
      window.dispatchEvent(new CustomEvent("open-community-reviews", { detail: { placeId: n.related_id } }));
      onClose();
    }
  };

  return (
    <>
      {/* Mobile overlay to close on outside tap */}
      <div
        className="fixed inset-0 z-[199] bg-black/30 sm:hidden"
        onClick={onClose}
      />

      <div
        data-panel="notifications"
        className="fixed sm:absolute top-[56px] sm:top-full right-0 sm:mt-1 w-screen sm:w-[360px] max-h-[calc(100dvh-56px)] sm:max-h-[480px] bg-card border border-border sm:rounded-xl shadow-xl z-[200] flex flex-col overflow-hidden"
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
              const isClickable = n.type === "new_review" && !!n.related_id;
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
                        {isClickable && (
                          <span className="text-[10px] text-primary font-medium">→ Voir les avis</span>
                        )}
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
