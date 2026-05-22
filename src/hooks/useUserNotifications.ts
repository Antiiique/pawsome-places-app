import { useState, useEffect, useCallback, useRef } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

// Register service worker once at module level
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch(() => {});
  // Forward notification-click messages from SW to the app
  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data?.type === "notification-click") {
      const { data } = event.data;
      if (data.type === "lost_pet" && data.related_id)
        window.dispatchEvent(new CustomEvent("open-lost-pet", { detail: { petId: data.related_id } }));
      else if (data.type === "new_stray" && data.related_id)
        window.dispatchEvent(new CustomEvent("open-stray", { detail: { strayId: data.related_id } }));
      else if (data.related_id)
        window.dispatchEvent(new CustomEvent("global-search-open-place", { detail: { placeId: data.related_id } }));
    }
  });
}

const NATIVE_PUSH_TYPES = new Set(["lost_pet", "new_stray", "zone_alert"]);

export interface UserNotification {
  id: string;
  type: "submission_approved" | "submission_rejected" | "report_reviewed" | "report_dismissed" | "new_review" | "mention" | "lost_pet" | "new_stray" | "new_place" | "new_user" | "new_message" | "zone_alert";
  title: string;
  message: string;
  related_id: string | null;
  is_read: boolean;
  created_at: string;
}

export function useUserNotifications() {
  const { user } = useAuthContext();
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const mountedRef = useRef(true);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("user_notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) setNotifications(data as unknown as UserNotification[]);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }
    fetchNotifications();

    const channelName = "user-notifs-" + user.id;
    // Remove any existing channel with the same name first
    const existing = supabase.getChannels().find((c) => c.topic === `realtime:${channelName}`);
    if (existing) supabase.removeChannel(existing);

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "user_notifications",
          filter: "user_id=eq." + user.id,
        },
        (payload) => {
          const notif = payload.new as UserNotification;
          setNotifications((prev) => [notif, ...prev]);
          // Show native browser notification for high-priority types when app is in focus
          if (
            NATIVE_PUSH_TYPES.has(notif.type) &&
            typeof Notification !== "undefined" &&
            Notification.permission === "granted" &&
            document.visibilityState === "visible"
          ) {
            new Notification(notif.title, {
              body: notif.message,
              icon: "/favicon.ico",
              tag: notif.type,
              silent: false,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchNotifications]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markAsRead = async (id: string) => {
    await supabase.from("user_notifications").update({ is_read: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  };

  const markAllAsRead = async () => {
    if (!user) return;
    await supabase
      .from("user_notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  return { notifications, unreadCount, loading, markAsRead, markAllAsRead };
}
