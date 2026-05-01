import { useState, useRef, useEffect, MutableRefObject } from "react";
import { Search, X, Loader2, User } from "lucide-react";
import { useGlobalSearch, type SearchResult } from "@/hooks/useGlobalSearch";

const CATEGORY_ICONS: Record<string, string> = {
  veterinaire: "🏥", shop: "🐾", parc_chiens: "🐕", refuge: "🏚️", spa: "🛁",
  restaurant: "🍽️", hotel: "🏨", cafe: "☕", loisir: "🎯", outdoor: "🌿",
  parc: "🌳", plage: "🏖️", camping: "⛺", transport: "🚌", autre: "📍",
};
function catIcon(cat: string) { return CATEGORY_ICONS[cat] || "📍"; }

interface GlobalSearchProps { mapRef: MutableRefObject<any>; }

export default function GlobalSearch({ mapRef }: GlobalSearchProps) {
  const [open, setOpen]   = useState(false);
  const [query, setQuery] = useState("");
  const { results, loading, search, clear } = useGlobalSearch();
  const inputRef    = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { search(query); }, [query, search]);

  // Close on outside tap/click
  useEffect(() => {
    const h = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", h);
    document.addEventListener("touchstart", h, { passive: true });
    return () => { document.removeEventListener("mousedown", h); document.removeEventListener("touchstart", h); };
  }, []);

  const openSearch = () => {
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 320); // after bar finishes expanding
  };

  const close = () => {
    inputRef.current?.blur();
    setQuery("");
    clear();
    setOpen(false);
  };

  const handleResult = (result: SearchResult) => {
    close();
    if (result.type === "place") {
      mapRef.current?.flyTo({ center: [result.lng, result.lat], zoom: 16, duration: 900 });
      window.dispatchEvent(new CustomEvent("global-search-open-place", { detail: { placeId: result.id } }));
    } else if (result.type === "user") {
      window.dispatchEvent(new CustomEvent("open-user-profile", { detail: { userId: result.id } }));
    } else if (result.type === "stray") {
      mapRef.current?.flyTo({ center: [result.lng, result.lat], zoom: 15, duration: 900 });
      window.dispatchEvent(new CustomEvent("open-stray", { detail: { strayId: result.id } }));
    } else if (result.type === "lost_pet") {
      if (result.last_seen_lat && result.last_seen_lng)
        mapRef.current?.flyTo({ center: [result.last_seen_lng, result.last_seen_lat], zoom: 15, duration: 900 });
      window.dispatchEvent(new CustomEvent("open-lost-pet", { detail: { petId: result.id } }));
    }
  };

  const showDropdown = open && query.length > 0 && (results.length > 0 || loading);
  const places   = results.filter(r => r.type === "place")    as Extract<SearchResult, { type: "place" }>[];
  const users    = results.filter(r => r.type === "user")     as Extract<SearchResult, { type: "user" }>[];
  const strays   = results.filter(r => r.type === "stray")    as Extract<SearchResult, { type: "stray" }>[];
  const lostPets = results.filter(r => r.type === "lost_pet") as Extract<SearchResult, { type: "lost_pet" }>[];

  /* ── dimensions ── */
  const CLOSED_W = 48;   // circle size
  const OPEN_W   = "min(calc(100vw - 96px), 440px)";

  return (
    <div ref={containerRef} className="absolute bottom-24 left-4 z-20">

      {/* ── Dropdown (always in DOM for exit animation) ── */}
      <div
        style={{
          position: "absolute",
          bottom: "calc(100% + 10px)",
          left: 0,
          width: OPEN_W,
          maxHeight: showDropdown ? "58vh" : 0,
          opacity: showDropdown ? 1 : 0,
          transform: showDropdown ? "translateY(0)" : "translateY(10px)",
          pointerEvents: showDropdown ? "auto" : "none",
          transition: "max-height 0.35s cubic-bezier(0.4,0,0.2,1), opacity 0.25s ease, transform 0.25s ease",
          overflowY: "auto",
          overflowX: "hidden",
          WebkitOverflowScrolling: "touch",
          borderRadius: 16,
          background: "var(--card)",
          border: "1px solid var(--border)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
          backdropFilter: "blur(16px)",
        } as React.CSSProperties}
      >
        {loading && results.length === 0 && (
          <div className="flex items-center gap-2 px-4 py-4 text-sm text-muted-foreground">
            <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" /> Recherche en cours…
          </div>
        )}

        {places.length > 0 && (
          <section>
            <p className="px-4 pt-3 pb-1 text-[10px] font-bold text-muted-foreground uppercase tracking-widest sticky top-0 bg-card/95 backdrop-blur-sm">📍 Lieux</p>
            {places.map(r => (
              <button key={r.id} onClick={() => handleResult(r)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/60 active:bg-muted transition-colors text-left">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0 overflow-hidden border border-border">
                  {r.photo_url ? <img src={r.photo_url} className="w-full h-full object-cover" alt="" /> : <span className="text-lg">{catIcon(r.category)}</span>}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{r.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{r.category}{r.city ? ` · ${r.city}` : ""}</p>
                </div>
              </button>
            ))}
          </section>
        )}

        {users.length > 0 && (
          <section>
            <p className="px-4 pt-3 pb-1 text-[10px] font-bold text-muted-foreground uppercase tracking-widest sticky top-0 bg-card/95 backdrop-blur-sm">👤 Utilisateurs</p>
            {users.map(r => (
              <button key={r.id} onClick={() => handleResult(r)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/60 active:bg-muted transition-colors text-left">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center shrink-0 overflow-hidden border border-border">
                  {r.avatar_url ? <img src={r.avatar_url} className="w-full h-full object-cover" alt="" /> : <User className="w-4 h-4 text-muted-foreground" />}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{r.display_name || "Utilisateur"}</p>
                  {r.city && <p className="text-xs text-muted-foreground">{r.city}</p>}
                </div>
              </button>
            ))}
          </section>
        )}

        {strays.length > 0 && (
          <section>
            <p className="px-4 pt-3 pb-1 text-[10px] font-bold text-muted-foreground uppercase tracking-widest sticky top-0 bg-card/95 backdrop-blur-sm">🚨 Animaux errants</p>
            {strays.map(r => (
              <button key={r.id} onClick={() => handleResult(r)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/60 active:bg-muted transition-colors text-left">
                <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0 text-xl">🚨</div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">Animal errant signalé</p>
                  {r.city && <p className="text-xs text-muted-foreground">{r.city}</p>}
                </div>
              </button>
            ))}
          </section>
        )}

        {lostPets.length > 0 && (
          <section>
            <p className="px-4 pt-3 pb-1 text-[10px] font-bold text-muted-foreground uppercase tracking-widest sticky top-0 bg-card/95 backdrop-blur-sm">🆘 Animaux perdus</p>
            {lostPets.map(r => (
              <button key={r.id} onClick={() => handleResult(r)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/60 active:bg-muted transition-colors text-left">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-xl ${r.status === "active" ? "bg-amber-100 dark:bg-amber-900/30" : "bg-green-100 dark:bg-green-900/30"}`}>
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

        <div className="h-2" />
      </div>

      {/* ── Animated search bar (expands from circle → pill) ── */}
      <div
        style={{
          width: open ? OPEN_W : CLOSED_W,
          height: CLOSED_W,
          transition: "width 0.32s cubic-bezier(0.4, 0, 0.2, 1)",
          overflow: "hidden",
          borderRadius: 9999,
          display: "flex",
          alignItems: "center",
          background: "var(--card)",
          border: "1px solid var(--border)",
          boxShadow: open ? "0 4px 24px rgba(0,0,0,0.15)" : "0 2px 8px rgba(0,0,0,0.12)",
          backdropFilter: "blur(12px)",
          cursor: open ? "default" : "pointer",
        } as React.CSSProperties}
        onClick={() => { if (!open) openSearch(); }}
      >
        {/* Search / loader icon — always visible */}
        <div className="w-12 h-12 flex items-center justify-center shrink-0">
          {loading && query
            ? <Loader2 className="w-5 h-5 text-primary animate-spin" />
            : <Search className="w-5 h-5 text-primary" />}
        </div>

        {/* Input — fades in after bar expands */}
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Lieu, ville, utilisateur…"
          className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground outline-none min-w-0 pr-2"
          style={{
            fontSize: 16,            // prevents iOS viewport zoom
            opacity: open ? 1 : 0,
            transition: "opacity 0.18s ease",
            transitionDelay: open ? "0.18s" : "0s",
            pointerEvents: open ? "auto" : "none",
          }}
        />

        {/* Close button — fades in with the input */}
        <button
          onClick={e => { e.stopPropagation(); close(); }}
          className="w-10 h-10 flex items-center justify-center shrink-0 text-muted-foreground hover:text-foreground transition-colors rounded-full hover:bg-muted"
          style={{
            opacity: open ? 1 : 0,
            transition: "opacity 0.18s ease",
            transitionDelay: open ? "0.22s" : "0s",
            pointerEvents: open ? "auto" : "none",
          }}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
