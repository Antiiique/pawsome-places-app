import { useEffect, useState } from "react";
import { X, User, MessageCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import ChatPanel from "./ChatPanel";

interface Conversation {
  id: string;
  other: { id: string; display_name: string | null; avatar_url: string | null };
  lastMessage: string | null;
  lastAt: string | null;
  unread: number;
}

interface MessagesPanelProps {
  open: boolean;
  onClose: () => void;
  initialConvId?: string | null;
  initialOtherUser?: { id: string; display_name: string | null; avatar_url: string | null } | null;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "À l'instant";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}j`;
}

export default function MessagesPanel({ open, onClose, initialConvId, initialOtherUser }: MessagesPanelProps) {
  const { user } = useAuthContext();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<{ id: string; other: { id: string; display_name: string | null; avatar_url: string | null } } | null>(null);

  const loadConversations = async () => {
    if (!user) return;
    const { data: convs } = await supabase
      .from("conversations")
      .select("id, user1_id, user2_id, created_at")
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .order("created_at", { ascending: false });
    if (!convs?.length) { setConversations([]); return; }

    const results: Conversation[] = await Promise.all(
      convs.map(async (conv) => {
        const otherId = conv.user1_id === user.id ? conv.user2_id : conv.user1_id;

        const [{ data: prof }, { data: lastMsg }, { count: unread }] = await Promise.all([
          supabase.from("profiles").select("id, display_name, avatar_url").eq("id", otherId).maybeSingle(),
          supabase.from("messages").select("body, created_at").eq("conversation_id", conv.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
          supabase.from("messages").select("id", { count: "exact", head: true }).eq("conversation_id", conv.id).neq("sender_id", user.id).is("read_at", null),
        ]);

        return {
          id: conv.id,
          other: prof as any || { id: otherId, display_name: null, avatar_url: null },
          lastMessage: lastMsg?.body || null,
          lastAt: lastMsg?.created_at || conv.created_at,
          unread: unread || 0,
        };
      })
    );

    results.sort((a, b) => new Date(b.lastAt!).getTime() - new Date(a.lastAt!).getTime());
    setConversations(results);
  };

  useEffect(() => {
    if (!open || !user) return;
    loadConversations();

    const channel = supabase
      .channel("messages-panel")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, loadConversations)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [open, user]);

  // Auto-open conversation if passed from UserProfilePanel
  useEffect(() => {
    if (open && initialConvId && initialOtherUser) {
      setActiveConv({ id: initialConvId, other: initialOtherUser });
    }
  }, [open, initialConvId, initialOtherUser]);

  if (!open) return null;

  if (activeConv) {
    return (
      <ChatPanel
        conversationId={activeConv.id}
        otherUser={activeConv.other}
        onBack={() => { setActiveConv(null); loadConversations(); }}
      />
    );
  }

  return (
    <>
      <button
        onClick={onClose}
        className="fixed bottom-8 right-4 z-[701] p-3 bg-card/90 backdrop-blur-sm rounded-full shadow-lg border border-border hover:bg-muted transition-colors"
      >
        <X className="w-5 h-5 text-foreground" />
      </button>

      <div className="fixed bottom-0 left-0 right-0 z-[700] bg-card rounded-t-2xl shadow-2xl flex flex-col" style={{ top: 56 }}>
        <div className="flex items-center gap-2 px-5 py-4 border-b border-border shrink-0">
          <MessageCircle className="w-5 h-5 text-primary" />
          <h2 className="font-bold text-foreground">Messages</h2>
        </div>

        <ScrollArea className="flex-1 min-h-0">
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-8 space-y-3">
              <MessageCircle className="w-12 h-12 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">Aucun message pour le moment</p>
              <p className="text-xs text-muted-foreground">Visitez le profil d'un utilisateur pour lui envoyer un message</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => setActiveConv({ id: conv.id, other: conv.other })}
                  className="w-full flex items-center gap-3 px-5 py-4 hover:bg-muted transition-colors text-left"
                >
                  <div className="relative shrink-0">
                    <div className="w-11 h-11 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                      {conv.other.avatar_url
                        ? <img src={conv.other.avatar_url} alt="" className="w-full h-full object-cover" />
                        : <User className="w-5 h-5 text-muted-foreground" />
                      }
                    </div>
                    {conv.unread > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[10px] font-bold w-4.5 h-4.5 min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1">
                        {conv.unread}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <p className={`text-sm truncate ${conv.unread > 0 ? "font-bold text-foreground" : "font-medium text-foreground"}`}>
                        {conv.other.display_name || "Utilisateur"}
                      </p>
                      {conv.lastAt && (
                        <span className="text-xs text-muted-foreground shrink-0 ml-2">{timeAgo(conv.lastAt)}</span>
                      )}
                    </div>
                    <p className={`text-xs truncate mt-0.5 ${conv.unread > 0 ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                      {conv.lastMessage || "Démarrez la conversation…"}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </>
  );
}
