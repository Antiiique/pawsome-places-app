import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";

export function useUnreadMessages() {
  const { user } = useAuthContext();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchCount = async () => {
    if (!user) { setUnreadCount(0); return; }
    const { data: convs } = await supabase
      .from("conversations")
      .select("id")
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);
    if (!convs?.length) { setUnreadCount(0); return; }

    const { count } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .in("conversation_id", convs.map((c) => c.id))
      .neq("sender_id", user.id)
      .is("read_at", null);

    setUnreadCount(count || 0);
  };

  useEffect(() => {
    fetchCount();
    if (!user) return;

    const channel = supabase
      .channel("unread-messages")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, fetchCount)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  return { unreadCount };
}
