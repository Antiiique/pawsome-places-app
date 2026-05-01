import { useState, useRef, useEffect, MutableRefObject } from "react";
import { Search, X, Loader2, User } from "lucide-react";
import { useGlobalSearch, type SearchResult } from "@/hooks/useGlobalSearch";

const CATEGORY_ICONS: Record<string, string> = {
  veterinaire: "🏥", shop: "🐾", parc_chiens: "🐕", refuge: "🏚️", spa: "🛁",
  restaurant: "🍽️", hotel: "🏨", cafe: "☕", loisir: "🎯", outdoor: "🌿",
  parc: "🌳", plage: "🏖️", camping: "⛺", transport: "🚌", autre: "📍",
};
const catIcon = (c: string) => CATEGORY_ICONS[c] || "📍";

interface GlobalSearchProps { mapRef: MutableRefObject<any>; }

/* ── Section header inside the scroll area ── */
function SectionHeader({ label }: { label: string }) {
  return (
    <div className="px-4 pt-3 pb-1.5 flex items-center gap-2">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{label}</p>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

export default function GlobalSearch({ mapRef }: GlobalSearchProps) {
  const [open,  setOpen]  = useState(false);
  const [query, setQuery] = useState("");
  const { results, loading, search, clear } = useGlobalSearch();
  const inputRef     = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { search(query); }, [query, search]);

  /* Close on outside tap */
  useEffect(() => {
    const h = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", h);
    document.addEventListener("touchstart", h, { passive: true });
    return () => { document.removeEventListener("mousedown", h); document.removeEventListener("touchstart", h); };
  }, []);

  const close = () => { inputRef.current?.blur(); setQuery(""); clear(); setOpen(false); };

  const openSearch = () => {
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 330);
  };

  const handleResult = (r: SearchResult) => {
    close();
    if (r.type === "place") {
      mapRef.current?.flyTo({ center: [r.lng, r.lat], zoom: 16, duration: 900 });
      window.dispatchEvent(new CustomEvent("global-search-open-place", { detail: { placeId: r.id } }));
    } else if (r.type === "user") {
      window.dispatchEvent(new CustomEvent("open-user-profile", { detail: { userId: r.id } }));
    } else if (r.type === "stray") {
      mapRef.current?.flyTo({ center: [r.lng, r.lat], zoom: 15, duration: 900 });
      window.dispatchEvent(new CustomEvent("open-stray", { detail: { strayId: r.id } }));
    } else if (r.type === "lost_pet") {
      if (r.last_seen_lat && r.last_seen_lng)
        mapRef.current?.flyTo({ center: [r.last_seen_lng, r.last_seen_lat], zoom: 15, duration: 900 });
      window.dispatchEvent(new CustomEvent("open-lost-pet", { detail: { petId: r.id } }));
    }
  };

  const places   = results.filter(r => r.type === "place")    as Extract<SearchResult, { type: "place" }>[];
  const users    = results.filter(r => r.type === "user")     as Extract<SearchResult, { type: "user" }>[];
  const strays   = results.filter(r => r.type === "stray")    as Extract<SearchResult, { type: "stray" }>[];
  const lostPets = results.filter(r => r.type === "lost_pet") as Extract<SearchResult, { type: "lost_pet" }>[];

  const hasResults  = results.length > 0;
  const showDropdown = open && query.length > 0 && (hasResults || loading);

  /* Shared FAB size */
  const FAB = 48;

  return (
    <div ref={containerRef} className="absolute bottom-24 left-4 z-20">

      {/* ── Dropdown — positioned above, NOT inside the animated bar ── */}
      {/*   Visibility toggle (not conditional render) for smooth exit   */}
      <div
        style={{
          position: "absolute",
          bottom: FAB + 10,
          left: 0,
          width: `min(calc(100vw - 96px), 440px)`,
          /* Only opacity + transform animated — keeps scroll stable */
          opacity: showDropdown ? 1 : 0,
          visibility: showDropdown ? "visible" : "hidden",
          transform: showDropdown ? "translateY(0)" : "translateY(10px)",
          transition: "opacity 0.22s ease, transform 0.22s ease, visibility 0s linear " + (showDropdown ? "0s" : "0.22s"),
          borderRadius: 16,
          overflow: "hidden",
          background: "var(--card)",
          border: "1px solid var(--border)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        } as React.CSSProperties}
      >
        {/* ── Scrollable results area ── stable height, never animates ── */}
        <div
          style={{
            maxHeight: "54vh",
            overflowY: "scroll",          // "scroll" more reliable than "auto" on mobile
            overflowX: "hidden",
            WebkitOverflowScrolling: "touch",  // iOS momentum scroll
            overscrollBehavior: "contain",     // prevent scroll chaining to map
            touchAction: "pan-y",
          } as React.CSSProperties}
        >
          {loading && results.length === 0 && (
            <div className="flex items-center gap-2 px-4 py-4 text-sm text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" /> Recherche en cours…
            </div>
          )}

          {/* ── LIEUX ── */}
          {places.length > 0 && (
            <section>
              <SectionHeader label={`📍 Lieux (${places.length})`} />
              {places.map(r => (
                <button key={r.id} onClick={() => handleResult(r)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/60 active:bg-muted/80 transition-colors text-left">
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0 overflow-hidden border border-border">
                    {r.photo_url
                      ? <img src={r.photo_url} className="w-full h-full object-cover" alt="" />
                      : <span className="text-lg">{catIcon(r.category)}</span>}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{r.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{r.category}{r.city ? ` · ${r.city}` : ""}</p>
                  </div>
                </button>
              ))}
            </section>
          )}

          {/* ── UTILISATEURS ── */}
          {users.length > 0 && (
            <section>
              <SectionHeader label={`👤 Utilisateurs (${users.length})`} />
              {users.map(r => (
                <button key={r.id} onClick={() => handleResult(r)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/60 active:bg-muted/80 transition-colors text-left">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0 overflow-hidden border border-border">
                    {r.avatar_url
                      ? <img src={r.avatar_url} className="w-full h-full object-cover" alt="" />
                      : <User className="w-4 h-4 text-muted-foreground" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{r.display_name || "Utilisateur"}</p>
                    {r.city && <p className="text-xs text-muted-foreground">{r.city}</p>}
                  </div>
                </button>
              ))}
            </section>
          )}

          {/* ── ERRANTS ── */}
          {strays.length > 0 && (
            <section>
              <SectionHeader label={`🚨 Animaux errants (${strays.length})`} />
              {strays.map(r => (
                <button key={r.id} onClick={() => handleResult(r)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/60 active:bg-muted/80 transition-colors text-left">
                  <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0 text-xl">🚨</div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">Animal errant signalé</p>
                    {r.city && <p className="text-xs text-muted-foreground">{r.city}</p>}
                  </div>
                </button>
              ))}
            </section>
          )}

          {/* ── PERDUS ── */}
          {lostPets.length > 0 && (
            <section>
              <SectionHeader label={`🆘 Animaux perdus (${lostPets.length})`} />
              {lostPets.map(r => (
                <button key={r.id} onClick={() => handleResult(r)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/60 active:bg-muted/80 transition-colors text-left">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-xl
                    ${r.status === "active" ? "bg-amber-100 dark:bg-amber-900/30" : "bg-green-100 dark:bg-green-900/30"}`}>
                    {r.status === "active" ? "🆘" : "✅"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{r.pet_name}{r.breed ? ` · ${r.breed}` : ""}</p>
                    {r.city && <p className="text-xs text-muted-foreground">{r.city}</p>}
                  </div>
                </button>
              ))}
            </section>
          )}

          {!loading && results.length === 0 && query.length >= 2 && (
            <p className="px-4 py-6 text-sm text-muted-foreground text-center">
              Aucun résultat pour &ldquo;{query}&rdquo;
            </p>
          )}

          <div className="h-3" />
        </div>
      </div>

      {/* ── Animated bar: circle → pill ── */}
      <div
        style={{
          width: open ? `min(calc(100vw - 96px), 440px)` : FAB,
          height: FAB,
          transition: "width 0.32s cubic-bezier(0.4, 0, 0.2, 1)",
          overflow: "hidden",
          borderRadius: 9999,
          display: "flex",
          alignItems: "center",
          background: open ? "var(--card)" : "color-mix(in srgb, var(--card) 90%, transparent)",
          border: "1px solid var(--border)",
          boxShadow: open ? "0 4px 20px rgba(0,0,0,0.14)" : "0 2px 8px rgba(0,0,0,0.12)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          cursor: open ? "default" : "pointer",
        } as React.CSSProperties}
        onClick={() => { if (!open) openSearch(); }}
      >
        {/* Icon — always at fixed position */}
        <div style={{ width: FAB, height: FAB, flexShrink: 0 }}
          className="flex items-center justify-center">
          {loading && query
            ? <Loader2 className="w-5 h-5 text-primary animate-spin" />
            : <Search className="w-5 h-5 text-primary" />}
        </div>

        {/* Input */}
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Lieu, ville, type…"
          style={{
            fontSize: 16,          // prevents iOS auto-zoom
            opacity: open ? 1 : 0,
            transition: "opacity 0.16s ease",
            transitionDelay: open ? "0.19s" : "0s",
            pointerEvents: open ? "auto" : "none",
            flex: 1,
            background: "transparent",
            outline: "none",
            color: "var(--foreground)",
            minWidth: 0,
            paddingRight: 4,
          }}
          // Prevent scroll-to-input bounce on iOS
          onFocus={e => e.target.scrollIntoView?.({ block: "nearest" })}
        />

        {/* Close */}
        <button
          onClick={e => { e.stopPropagation(); close(); }}
          style={{
            width: 40, height: 40, flexShrink: 0,
            opacity: open ? 1 : 0,
            transition: "opacity 0.16s ease",
            transitionDelay: open ? "0.23s" : "0s",
            pointerEvents: open ? "auto" : "none",
            display: "flex", alignItems: "center", justifyContent: "center",
            borderRadius: 9999,
            marginRight: 4,
            color: "var(--muted-foreground)",
          } as React.CSSProperties}
          className="hover:bg-muted transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
