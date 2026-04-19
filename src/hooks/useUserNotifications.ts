import { useState, useEffect, useCallback } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export interface UserNotification {
  id: string;
  type: "submission_approved" | "submission_rejected" | "report_reviewed" | "report_dismissed" | "new_review";
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
          setNotifications((prev) => [payload.new as UserNotification, ...prev]);
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
