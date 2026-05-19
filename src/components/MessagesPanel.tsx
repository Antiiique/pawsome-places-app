import { useEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { X, MessageCircle, User, Search, ArrowLeft, Send, Loader2, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { useHandedness } from "@/contexts/HandednessContext";

/* ── Types ──────────────────────────────────────────────────────────────── */

interface OtherUser {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface Conversation {
  id: string;
  other: OtherUser;
  lastMessage: string | null;
  lastAt: string | null;
  unread: number;
}

interface Message {
  id: string;
  sender_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
}

interface MsgMatch {
  convId: string;
  snippet: string;
}

interface MessagesPanelProps {
  open: boolean;
  onClose: () => void;
  initialConvId?: string | null;
  initialOtherUser?: OtherUser | null;
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "À l'instant";
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}j`;
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

function highlight(text: string, query: string) {
  if (!query.trim()) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  const start = Math.max(0, idx - 20);
  const end = Math.min(text.length, idx + query.length + 30);
  const snippet = (start > 0 ? "…" : "") + text.slice(start, end) + (end < text.length ? "…" : "");
  return snippet;
}

/* ── Avatar helper ───────────────────────────────────────────────────────── */

function Avatar({ user: u, size = 44 }: { user: OtherUser; size?: number }) {
  return (
    <div
      className="rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0 border border-border"
      style={{ width: size, height: size }}
    >
      {u.avatar_url
        ? <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
        : <User className="w-4 h-4 text-muted-foreground" />
      }
    </div>
  );
}

/* ── Main Component ──────────────────────────────────────────────────────── */

const HALF = 55; // translateY % for half snap
const SNAP_VELOCITY = 0.4;

export default function MessagesPanel({ open, onClose, initialConvId, initialOtherUser }: MessagesPanelProps) {
  const { user } = useAuthContext();
  const { isLeftHanded } = useHandedness();

  /* Snap / drag state */
  const [snap, setSnap] = useState<"half" | "full">("half");
  const [dragDelta, setDragDelta] = useState(0);
  const isDragging = useRef(false);
  const dragStartY = useRef(0);
  const dragStartTime = useRef(0);

  /* Swipe-right state (for going back in chat or closing list) */
  const swipeStartX = useRef(0);
  const swipeStartY = useRef(0);
  const [swipeDeltaX, setSwipeDeltaX] = useState(0);
  const isSwiping = useRef(false);

  /* Visibility / animation */
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    if (open) {
      setMounted(true);
      setSnap("half");
      requestAnimationFrame(() => setVisible(true));
    } else {
      setVisible(false);
      const t = setTimeout(() => setMounted(false), 350);
      return () => clearTimeout(t);
    }
  }, [open]);

  /* Data */
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(false);
  const [activeConv, setActiveConv] = useState<{ id: string; other: OtherUser } | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const chatChannel = useRef<ReturnType<typeof supabase.channel> | null>(null);

  /* Search */
  const [search, setSearch] = useState("");
  const [searchUsers, setSearchUsers] = useState<OtherUser[]>([]);
  const [msgMatches, setMsgMatches] = useState<MsgMatch[]>([]);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();

  /* ── Load conversations ── */
  const loadConversations = useCallback(async () => {
    if (!user) return;
    setLoadingConvs(true);
    const { data: convs } = await supabase
      .from("conversations")
      .select("id, user1_id, user2_id, created_at")
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (!convs?.length) { setConversations([]); setLoadingConvs(false); return; }

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
          other: (prof as any) || { id: otherId, display_name: null, avatar_url: null },
          lastMessage: lastMsg?.body || null,
          lastAt: lastMsg?.created_at || conv.created_at,
          unread: unread || 0,
        };
      })
    );
    results.sort((a, b) => new Date(b.lastAt!).getTime() - new Date(a.lastAt!).getTime());
    setConversations(results);
    setLoadingConvs(false);
  }, [user]);

  useEffect(() => {
    if (!open || !user) return;
    loadConversations();
    const channel = supabase
      .channel("messages-panel-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, loadConversations)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [open, user, loadConversations]);

  /* Auto-open initial conversation */
  useEffect(() => {
    if (open && initialConvId && initialOtherUser) {
      setActiveConv({ id: initialConvId, other: initialOtherUser });
      setSnap("full");
    }
  }, [open, initialConvId, initialOtherUser]);

  /* ── Load messages for active conversation ── */
  const loadMessages = useCallback(async (convId: string) => {
    const { data } = await supabase
      .from("messages")
      .select("id, sender_id, body, read_at, created_at")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });
    if (data) setMessages(data as Message[]);
  }, []);

  const markRead = useCallback(async (convId: string) => {
    if (!user) return;
    await supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("conversation_id", convId)
      .neq("sender_id", user.id)
      .is("read_at", null);
  }, [user]);

  useEffect(() => {
    if (!activeConv) { setMessages([]); chatChannel.current && supabase.removeChannel(chatChannel.current); return; }
    loadMessages(activeConv.id).then(() => markRead(activeConv.id));
    setSnap("full");

    chatChannel.current = supabase
      .channel(`chat-${activeConv.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${activeConv.id}` }, (payload) => {
        setMessages(prev => [...prev, payload.new as Message]);
        if ((payload.new as Message).sender_id !== user?.id) markRead(activeConv.id);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${activeConv.id}` }, (payload) => {
        setMessages(prev => prev.map(m => m.id === (payload.new as Message).id ? payload.new as Message : m));
      })
      .subscribe();
    return () => { chatChannel.current && supabase.removeChannel(chatChannel.current); };
  }, [activeConv?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ── Send message ── */
  const handleSend = async () => {
    if (!text.trim() || !user || sending || !activeConv) return;
    setSending(true);
    const body = text.trim();
    setText("");
    await supabase.from("messages").insert({ conversation_id: activeConv.id, sender_id: user.id, body });
    setSending(false);
  };

  /* ── Start new conversation ── */
  const startConversation = async (other: OtherUser) => {
    if (!user) return;
    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .or(`and(user1_id.eq.${user.id},user2_id.eq.${other.id}),and(user1_id.eq.${other.id},user2_id.eq.${user.id})`)
      .maybeSingle();
    let convId = (existing as any)?.id;
    if (!convId) {
      const { data: newConv } = await supabase
        .from("conversations")
        .insert({ user1_id: user.id, user2_id: other.id })
        .select("id")
        .single();
      convId = (newConv as any)?.id;
    }
    if (convId) {
      setSearch("");
      setActiveConv({ id: convId, other });
    }
  };

  /* ── Search ── */
  useEffect(() => {
    if (!search.trim() || !user) { setSearchUsers([]); setMsgMatches([]); return; }
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      const [{ data: users }, { data: msgs }] = await Promise.all([
        supabase.from("profiles").select("id, display_name, avatar_url").ilike("display_name", `%${search}%`).neq("id", user.id).limit(8),
        conversations.length > 0
          ? supabase.from("messages").select("conversation_id, body, created_at")
              .in("conversation_id", conversations.map(c => c.id))
              .ilike("body", `%${search}%`)
              .order("created_at", { ascending: false })
              .limit(30)
          : Promise.resolve({ data: [] }),
      ]);
      setSearchUsers((users as any[]) || []);
      const matchMap: Record<string, string> = {};
      for (const m of (msgs as any[]) || []) {
        if (!matchMap[m.conversation_id]) matchMap[m.conversation_id] = m.body;
      }
      setMsgMatches(Object.entries(matchMap).map(([convId, snippet]) => ({ convId, snippet })));
    }, 300);
  }, [search, user, conversations]);

  const existingUserIds = new Set(conversations.map(c => c.other.id));
  const filteredConvs = search.trim()
    ? conversations.filter(c =>
        c.other.display_name?.toLowerCase().includes(search.toLowerCase()) ||
        msgMatches.some(m => m.convId === c.id)
      )
    : conversations;
  const newUsers = searchUsers.filter(u => !existingUserIds.has(u.id));

  /* ── Drag handle (vertical snap) ── */
  const handleDragStart = (e: React.TouchEvent) => {
    isDragging.current = true;
    dragStartY.current = e.touches[0].clientY;
    dragStartTime.current = Date.now();
    setDragDelta(0);
  };
  const handleDragMove = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    setDragDelta(e.touches[0].clientY - dragStartY.current);
  };
  const handleDragEnd = (e: React.TouchEvent) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    const delta = e.changedTouches[0].clientY - dragStartY.current;
    const elapsed = Date.now() - dragStartTime.current;
    const velocity = delta / elapsed;
    if (snap === "full") {
      if (delta > 80 || velocity > SNAP_VELOCITY) setSnap("half");
    } else {
      if (delta < -80 || velocity < -SNAP_VELOCITY) setSnap("full");
      else if (delta > 80 || velocity > SNAP_VELOCITY) { setDragDelta(0); onClose(); return; }
    }
    setDragDelta(0);
  };

  /* ── Swipe right (back / close) ── */
  const handleSwipeStart = (e: React.TouchEvent) => {
    swipeStartX.current = e.touches[0].clientX;
    swipeStartY.current = e.touches[0].clientY;
    isSwiping.current = false;
    setSwipeDeltaX(0);
  };
  const handleSwipeMove = (e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - swipeStartX.current;
    const dy = e.touches[0].clientY - swipeStartY.current;
    if (!isSwiping.current && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      isSwiping.current = Math.abs(dx) > Math.abs(dy) * 1.2;
    }
    if (isSwiping.current && dx > 0) setSwipeDeltaX(dx);
  };
  const handleSwipeEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - swipeStartX.current;
    setSwipeDeltaX(0);
    isSwiping.current = false;
    if (dx > 60) {
      if (activeConv) { setActiveConv(null); loadConversations(); }
      else onClose();
    }
  };

  const currentOffset = (() => {
    const base = snap === "full" ? 0 : HALF;
    const delta = dragDelta / (window.innerHeight * (1 - 56 / window.innerHeight));
    return Math.max(0, Math.min(100, base + delta * 100));
  })();

  if (!mounted) return null;

  /* ── Render ── */
  return createPortal(
    <>
      {/* Scrim */}
      <div
        className="fixed inset-0 z-[690]"
        style={{
          background: "rgba(0,0,0,0.4)",
          opacity: open ? 1 : 0,
          transition: "opacity 0.3s ease",
          pointerEvents: open ? "auto" : "none",
        }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className="fixed left-0 right-0 bottom-0 z-[691] bg-card rounded-t-2xl shadow-2xl flex flex-col"
        style={{
          top: 0,
          transform: `translateY(${visible ? currentOffset : 100}%)`,
          transition: isDragging.current ? "none" : "transform 0.3s cubic-bezier(0.4,0,0.2,1)",
          willChange: "transform",
        }}
      >
        {/* Drag handle */}
        <div
          className="flex flex-col items-center pt-2.5 pb-1 shrink-0 cursor-grab active:cursor-grabbing select-none"
          style={{ touchAction: "none" }}
          onTouchStart={handleDragStart}
          onTouchMove={handleDragMove}
          onTouchEnd={handleDragEnd}
        >
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30 mb-2" />
          {/* Header */}
          <div className={`w-full flex items-center justify-between px-4 pb-2 ${isLeftHanded ? "flex-row-reverse" : ""}`}>
            <div className="flex items-center gap-2">
              {activeConv ? (
                <button
                  onClick={() => { setActiveConv(null); loadConversations(); }}
                  className="p-1.5 rounded-full hover:bg-muted transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-muted-foreground" />
                </button>
              ) : (
                <MessageCircle className="w-5 h-5 text-primary" />
              )}
              {activeConv ? (
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent("open-user-profile", { detail: { userId: activeConv.other.id } }))}
                  className="flex items-center gap-2 hover:opacity-75 transition-opacity"
                >
                  <Avatar user={activeConv.other} size={28} />
                  <span className="font-bold text-foreground text-sm">{activeConv.other.display_name || "Conversation"}</span>
                </button>
              ) : (
                <h2 className="font-bold text-foreground text-sm">Messages</h2>
              )}
            </div>
            <div className={`flex items-center gap-1 ${isLeftHanded ? "flex-row-reverse" : ""}`}>
              <button
                onClick={() => setSnap(s => s === "half" ? "full" : "half")}
                className="p-1.5 rounded-full hover:bg-muted transition-colors"
              >
                <ChevronUp className={`w-5 h-5 text-muted-foreground transition-transform ${snap === "full" ? "rotate-180" : ""}`} />
              </button>
              <button onClick={onClose} className="p-1.5 rounded-full hover:bg-muted transition-colors">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
          </div>
        </div>

        <div className="w-full h-px bg-border shrink-0" />

        {/* ── LIST VIEW ── */}
        {!activeConv && (
          <>
            {/* Scrollable conversations */}
            <div
              className="flex-1 overflow-y-auto"
              style={{ touchAction: "pan-y" }}
              onTouchStart={handleSwipeStart}
              onTouchMove={handleSwipeMove}
              onTouchEnd={handleSwipeEnd}
            >
              {loadingConvs ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
                </div>
              ) : (
                <>
                  {/* Existing conversations */}
                  {filteredConvs.length > 0 && (
                    <div className="divide-y divide-border">
                      {filteredConvs.map((conv) => {
                        const match = msgMatches.find(m => m.convId === conv.id);
                        return (
                          <div
                            key={conv.id}
                            onClick={() => setActiveConv({ id: conv.id, other: conv.other })}
                            className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/60 transition-colors cursor-pointer"
                          >
                            <button
                              onClick={e => { e.stopPropagation(); window.dispatchEvent(new CustomEvent("open-user-profile", { detail: { userId: conv.other.id } })); }}
                              className="relative shrink-0"
                            >
                              <Avatar user={conv.other} />
                              {conv.unread > 0 && (
                                <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1">
                                  {conv.unread}
                                </span>
                              )}
                            </button>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-baseline">
                                <p className={`text-sm truncate ${conv.unread > 0 ? "font-bold text-foreground" : "font-medium text-foreground"}`}>
                                  {conv.other.display_name || "Utilisateur"}
                                </p>
                                {conv.lastAt && <span className="text-xs text-muted-foreground shrink-0 ml-2">{timeAgo(conv.lastAt)}</span>}
                              </div>
                              <p className={`text-xs truncate mt-0.5 ${conv.unread > 0 ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                                {match && search.trim()
                                  ? `🔍 ${highlight(match.snippet, search)}`
                                  : conv.lastMessage || "Démarrez la conversation…"}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* New users from search */}
                  {search.trim() && newUsers.length > 0 && (
                    <div>
                      <p className="px-4 pt-4 pb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Trouver un utilisateur</p>
                      <div className="divide-y divide-border">
                        {newUsers.map(u => (
                          <button
                            key={u.id}
                            onClick={() => startConversation(u)}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/60 transition-colors text-left"
                          >
                            <Avatar user={u} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">{u.display_name || "Utilisateur"}</p>
                              <p className="text-xs text-primary">Envoyer un message →</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Empty state */}
                  {!search.trim() && filteredConvs.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 text-center px-8 space-y-3">
                      <MessageCircle className="w-12 h-12 text-muted-foreground/30" />
                      <p className="text-sm text-muted-foreground">Aucun message pour le moment</p>
                      <p className="text-xs text-muted-foreground">Recherche un utilisateur ci-dessous pour démarrer</p>
                    </div>
                  )}
                  {search.trim() && filteredConvs.length === 0 && newUsers.length === 0 && (
                    <div className="text-center py-12">
                      <p className="text-sm text-muted-foreground">Aucun résultat pour « {search} »</p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Search bar — centered at bottom */}
            <div className="shrink-0 px-4 py-3 border-t border-border">
              <div className="relative flex items-center">
                <Search className="absolute left-3.5 w-4 h-4 text-muted-foreground pointer-events-none" />
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Rechercher un contact ou un message…"
                  className="w-full pl-10 pr-10 py-2.5 rounded-full bg-muted text-foreground text-sm outline-none placeholder:text-muted-foreground"
                />
                {search && (
                  <button
                    onClick={() => { setSearch(""); setSearchUsers([]); setMsgMatches([]); }}
                    className="absolute right-3.5"
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                )}
              </div>
            </div>
          </>
        )}

        {/* ── CHAT VIEW ── */}
        {activeConv && (
          <>
            {/* Messages */}
            <div
              className="flex-1 overflow-y-auto px-4 py-3 space-y-1"
              style={{
                touchAction: "pan-y",
                transform: swipeDeltaX > 0 ? `translateX(${Math.min(swipeDeltaX * 0.4, 60)}px)` : undefined,
                transition: swipeDeltaX === 0 ? "transform 0.2s ease" : "none",
              }}
              onTouchStart={handleSwipeStart}
              onTouchMove={handleSwipeMove}
              onTouchEnd={handleSwipeEnd}
            >
              {(() => {
                let lastDay = "";
                return messages.map((msg) => {
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
                      <div className={`flex ${isMine ? "justify-end" : "justify-start"} mb-1 items-end gap-1.5`}>
                        {!isMine && (
                          <button
                            onClick={() => window.dispatchEvent(new CustomEvent("open-user-profile", { detail: { userId: activeConv.other.id } }))}
                            className="shrink-0 mb-1"
                          >
                            <Avatar user={activeConv.other} size={24} />
                          </button>
                        )}
                        <div className={`max-w-[72%] ${isMine ? "items-end" : "items-start"} flex flex-col`}>
                          <div className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed ${
                            isMine
                              ? "bg-primary text-primary-foreground rounded-br-sm"
                              : "bg-muted text-foreground rounded-bl-sm"
                          }`}>
                            {msg.body}
                          </div>
                          <div className="flex items-center gap-1 mt-0.5 px-1">
                            <span className="text-[10px] text-muted-foreground">{formatTime(msg.created_at)}</span>
                            {isMine && <span className="text-[10px] text-muted-foreground">{msg.read_at ? "✓✓ Vu" : "✓"}</span>}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
              <div ref={bottomRef} />
            </div>

            {/* Message input at bottom */}
            <div className="shrink-0 px-4 py-3 border-t border-border flex items-center gap-2">
              <input
                type="text"
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()}
                placeholder="Votre message…"
                className="flex-1 bg-muted rounded-full px-4 py-2.5 text-sm text-foreground outline-none"
              />
              <button
                onClick={handleSend}
                disabled={!text.trim() || sending}
                className="w-10 h-10 bg-primary rounded-full flex items-center justify-center shrink-0 disabled:opacity-40 transition-opacity"
              >
                {sending
                  ? <Loader2 className="w-4 h-4 text-white animate-spin" />
                  : <Send className="w-4 h-4 text-white" />
                }
              </button>
            </div>
          </>
        )}
      </div>
    </>,
    document.body
  );
}
