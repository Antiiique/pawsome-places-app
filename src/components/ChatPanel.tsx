import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Send, Loader2, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";

interface Message {
  id: string;
  sender_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
}

interface OtherUser {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface ChatPanelProps {
  conversationId: string;
  otherUser: OtherUser;
  onBack: () => void;
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function formatDay(dateStr: string) {
  const d = new Date(dateStr);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Aujourd'hui";
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Hier";
  return d.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
}

export default function ChatPanel({ conversationId, otherUser, onBack }: ChatPanelProps) {
  const { user } = useAuthContext();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadMessages = async () => {
    const { data } = await supabase
      .from("messages")
      .select("id, sender_id, body, read_at, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    if (data) setMessages(data as Message[]);
  };

  // Mark incoming messages as read
  const markRead = async () => {
    if (!user) return;
    await supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId)
      .neq("sender_id", user.id)
      .is("read_at", null);
  };

  useEffect(() => {
    loadMessages().then(markRead);

    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        setMessages((prev) => [...prev, payload.new as Message]);
        if ((payload.new as Message).sender_id !== user?.id) markRead();
      })
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        setMessages((prev) => prev.map((m) => m.id === (payload.new as Message).id ? payload.new as Message : m));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const MAX_MSG = 1000;

  const handleSend = async () => {
    if (!text.trim() || !user || sending) return;
    const body = text.trim();
    if (body.length > MAX_MSG) return;
    setSending(true);
    setText("");
    await supabase.from("messages").insert({ conversation_id: conversationId, sender_id: user.id, body });
    setSending(false);
  };

  // Group messages by day
  let lastDay = "";

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[750] bg-card flex flex-col" style={{ top: "var(--header-h, 56px)" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border shrink-0">
        <button onClick={onBack} className="p-1.5 rounded-full hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
          {otherUser.avatar_url
            ? <img src={otherUser.avatar_url} alt="" className="w-full h-full object-cover" />
            : <User className="w-4 h-4 text-muted-foreground" />
          }
        </div>
        <div>
          <p className="font-semibold text-foreground text-sm">{otherUser.display_name || "Utilisateur"}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
        {messages.map((msg) => {
          const isMine = msg.sender_id === user?.id;
          const day = formatDay(msg.created_at);
          const showDay = day !== lastDay;
          lastDay = day;

          return (
            <div key={msg.id}>
              {showDay && (
                <div className="flex justify-center my-3">
                  <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">{day}</span>
                </div>
              )}
              <div className={`flex ${isMine ? "justify-end" : "justify-start"} mb-1`}>
                <div className={`max-w-[78%] ${isMine ? "items-end" : "items-start"} flex flex-col`}>
                  <div className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed ${
                    isMine
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm"
                  }`}>
                    {msg.body}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5 px-1">
                    <span className="text-[10px] text-muted-foreground">{formatTime(msg.created_at)}</span>
                    {isMine && (
                      <span className="text-[10px] text-muted-foreground">
                        {msg.read_at ? "✓✓ Vu" : "✓"}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 px-4 py-3 border-t border-border">
        {text.length > 800 && (
          <p className={`text-[10px] text-right mb-1 ${text.length >= MAX_MSG ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
            {text.length}/{MAX_MSG}
          </p>
        )}
        <div className="flex items-center gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, MAX_MSG))}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder="Votre message…"
          maxLength={MAX_MSG}
          className="flex-1 bg-muted rounded-full px-4 py-2.5 text-sm text-foreground outline-none"
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || sending}
          className="w-10 h-10 bg-primary rounded-full flex items-center justify-center shrink-0 disabled:opacity-40 transition-opacity"
        >
          {sending ? <Loader2 className="w-4 h-4 text-white animate-spin" /> : <Send className="w-4 h-4 text-white" />}
        </button>
        </div>
      </div>
    </div>
  );
}
