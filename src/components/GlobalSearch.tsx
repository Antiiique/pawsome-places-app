import { useState, useRef, useEffect, useCallback, MutableRefObject } from "react";
import { Search, X, Loader2, User } from "lucide-react";
import { useGlobalSearch, type SearchResult, type SearchFilters } from "@/hooks/useGlobalSearch";

/* ── Constants ─────────────────────────────────────────── */

const FAB     = 48;
const OPEN_W  = "min(calc(100vw - 32px), 420px)";
const ANIM_MS = 300;

const CATEGORY_FILTERS: { value: string | null; label: string; emoji: string }[] = [
  { value: null,          label: "Tous",        emoji: "🗺️" },
  { value: "veterinaire", label: "Vétérinaire", emoji: "🏥" },
  { value: "shop",        label: "Animalerie",  emoji: "🐾" },
  { value: "parc_chiens", label: "Parc chiens", emoji: "🐕" },
  { value: "refuge",      label: "Refuge",      emoji: "🏚️" },
  { value: "restaurant",  label: "Restaurant",  emoji: "🍽️" },
  { value: "hotel",       label: "Hôtel",       emoji: "🏨" },
  { value: "cafe",        label: "Café",        emoji: "☕" },
  { value: "spa",         label: "Spa",         emoji: "🛁" },
  { value: "loisir",      label: "Loisir",      emoji: "🎯" },
  { value: "outdoor",     label: "Outdoor",     emoji: "🌿" },
  { value: "plage",       label: "Plage",       emoji: "🏖️" },
  { value: "camping",     label: "Camping",     emoji: "⛺" },
  { value: "__strays__",  label: "Errants",     emoji: "🚨" },
  { value: "__lost__",    label: "Perdus",      emoji: "🆘" },
];

const CATEGORY_ICONS: Record<string, string> = Object.fromEntries(
  CATEGORY_FILTERS.filter(c => c.value).map(c => [c.value as string, c.emoji])
);
const catIcon = (c: string) => CATEGORY_ICONS[c] || "📍";

function deriveFilters(activeCategory: string | null, city: string | null): SearchFilters {
  if (activeCategory === "__strays__") return { category: null, types: ["stray"],    city };
  if (activeCategory === "__lost__")   return { category: null, types: ["lost_pet"], city };
  if (activeCategory !== null)         return { category: activeCategory, types: ["place"], city };
  return { category: null, types: ["place", "user", "stray", "lost_pet"], city };
}

/* ── Sub-components ─────────────────────────────────────── */

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="px-4 pt-2.5 pb-1 flex items-center gap-2">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest shrink-0">{label}</p>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

/* ── Props ───────────────────────────────────────────────── */

interface GlobalSearchProps {
  mapRef: MutableRefObject<any>;
  activeCategory: string | null;
  onCategoryChange: (cat: string | null) => void;
}

/* ── Component ───────────────────────────────────────────── */

export default function GlobalSearch({ mapRef, activeCategory, onCategoryChange }: GlobalSearchProps) {
  const [open,    setOpen]    = useState(false);
  const [closing, setClosing] = useState(false);
  const [query,   setQuery]   = useState("");

  const { results, loading, search, clear } = useGlobalSearch();
  const inputRef    = useRef<HTMLInputElement>(null);
  const barRef      = useRef<HTMLDivElement>(null);
  const panelRef    = useRef<HTMLDivElement>(null);
  const closeTimer  = useRef<ReturnType<typeof setTimeout>>();

  const isExpanded    = open && !closing;
  const showPanel     = open;
  const hasFilter     = activeCategory !== null;
  const hasSearch     = !!(query || activeCategory);

  /* ── Search on query/category change ── */
  useEffect(() => {
    search(query, deriveFilters(activeCategory, null));
  }, [query, activeCategory]); // eslint-disable-line

  /* ── Outside tap ── */
  useEffect(() => {
    const h = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node;
      const inBar   = barRef.current?.contains(t);
      const inPanel = panelRef.current?.contains(t);
      if (!inBar && !inPanel) startClose();
    };
    document.addEventListener("mousedown", h);
    document.addEventListener("touchstart", h, { passive: true });
    return () => {
      document.removeEventListener("mousedown", h);
      document.removeEventListener("touchstart", h);
    };
  }, [open]); // eslint-disable-line

  /* ── Open / close ── */
  const openSearch = () => {
    clearTimeout(closeTimer.current);
    setClosing(false);
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), ANIM_MS);
  };

  const startClose = () => {
    if (!open) return;
    inputRef.current?.blur();
    setClosing(true);
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => {
      setOpen(false);
      setClosing(false);
      setQuery("");
      clear();
    }, ANIM_MS);
  };

  const toggleSearch = () => {
    if (!open || closing) openSearch();
    else startClose();
  };

  const clearCategory = useCallback(() => {
    onCategoryChange(null);
  }, [onCategoryChange]);

  /* ── Result click ── */
  const handleResult = (r: SearchResult) => {
    startClose();
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

  /* ══════════════════════════════════════════════════════ */
  return (
    <>
      {/* ══ FAB + animated bar (bottom-right, above SOS) ══ */}
      <div
        ref={barRef}
        style={{
          position: "absolute",
          bottom: "14rem",   /* above lost-pet FAB (bottom-40) and stray FAB (bottom-24) */
          right: "1rem",
          zIndex: 20,
          display: "flex",
          flexDirection: "row-reverse",  /* icon on RIGHT, input grows LEFT */
          alignItems: "center",
          width: isExpanded ? OPEN_W : FAB,
          height: FAB,
          transition: `width ${ANIM_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
          overflow: "hidden",
          borderRadius: 9999,
          background: "var(--card)",
          border: "1px solid var(--border)",
          boxShadow: isExpanded
            ? "0 4px 20px rgba(0,0,0,0.15)"
            : "0 2px 8px rgba(0,0,0,0.12)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        } as React.CSSProperties}
      >
        {/* Icon — always on the RIGHT */}
        <button
          onClick={toggleSearch}
          style={{
            width: FAB, height: FAB, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            position: "relative",
            background: "transparent", border: "none",
            cursor: "pointer", borderRadius: 9999,
          }}
        >
          {loading && hasSearch
            ? <Loader2 className="w-5 h-5 text-primary animate-spin" />
            : isExpanded
            ? <X className="w-5 h-5 text-muted-foreground" />
            : <Search className="w-5 h-5 text-primary" />}

          {/* Filter badge when closed */}
          {hasFilter && !open && (
            <span style={{
              position: "absolute", top: 10, right: 10,
              width: 8, height: 8, borderRadius: "50%",
              background: "var(--primary)",
              border: "1.5px solid var(--card)",
            }} />
          )}
        </button>

        {/* Input — grows to the LEFT */}
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Lieu, ville, catégorie…"
          style={{
            fontSize: 16,
            flex: 1,
            minWidth: 0,
            paddingLeft: 16,
            background: "transparent",
            outline: "none",
            color: "var(--foreground)",
            opacity: isExpanded ? 1 : 0,
            transition: `opacity 0.15s ease ${isExpanded ? "0.16s" : "0s"}`,
            pointerEvents: isExpanded ? "auto" : "none",
          }}
        />
      </div>

      {/* ══ Results panel — fixed centered ══ */}
      <div
        ref={panelRef}
        style={{
          position: "fixed",
          top: 68,
          left: "50%",
          transform: `translateX(-50%) translateY(${showPanel && !closing ? 0 : -8}px)`,
          width: "min(420px, calc(100vw - 32px))",
          maxHeight: "62vh",
          zIndex: 9990,
          display: "flex",
          flexDirection: "column",
          borderRadius: 16,
          overflow: "hidden",
          background: "var(--card)",
          border: "1px solid var(--border)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          opacity: showPanel && !closing ? 1 : 0,
          visibility: showPanel ? "visible" : "hidden",
          transition: `opacity ${ANIM_MS}ms cubic-bezier(0.4,0,0.2,1), transform ${ANIM_MS}ms cubic-bezier(0.4,0,0.2,1), visibility 0s linear ${showPanel && !closing ? "0s" : `${ANIM_MS}ms`}`,
          pointerEvents: showPanel && !closing ? "auto" : "none",
        } as React.CSSProperties}
      >
        {/* ── Category chips header ── */}
        <div style={{ flexShrink: 0, borderBottom: "1px solid var(--border)", paddingBottom: 10, paddingTop: 10 }}>
          <div className="flex gap-1.5 px-3 overflow-x-auto scrollbar-hide">
            {CATEGORY_FILTERS.map(c => {
              const active = activeCategory === c.value || (c.value === null && activeCategory === null);
              return (
                <button
                  key={c.value ?? "__all__"}
                  onClick={() => onCategoryChange(c.value === activeCategory && c.value !== null ? null : c.value)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full border text-xs font-medium whitespace-nowrap transition-colors shrink-0 ${
                    active
                      ? "bg-primary/10 border-primary text-primary"
                      : "bg-muted/50 border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {c.emoji} {c.label}
                </button>
              );
            })}
          </div>

          {/* Active category pill + clear */}
          {activeCategory !== null && (
            <div className="flex items-center px-3 mt-2">
              <div className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/30 rounded-full px-3 py-1">
                <span className="text-xs font-medium text-primary">
                  {CATEGORY_FILTERS.find(c => c.value === activeCategory)?.emoji}{" "}
                  {CATEGORY_FILTERS.find(c => c.value === activeCategory)?.label}
                </span>
                <button onClick={clearCategory} className="text-primary/70 hover:text-primary">
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ── Results (scrollable) ── */}
        <div
          style={{
            flex: 1,
            overflowY: "scroll",
            overflowX: "hidden",
            WebkitOverflowScrolling: "touch",
            overscrollBehavior: "contain",
            touchAction: "pan-y",
          } as React.CSSProperties}
        >
          {/* Loading */}
          {loading && results.length === 0 && hasSearch && (
            <div className="flex items-center gap-2 px-4 py-5 text-sm text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" /> Recherche en cours…
            </div>
          )}

          {/* Empty state */}
          {!loading && results.length === 0 && !hasSearch && (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-muted-foreground">Tapez un lieu, une ville ou un type</p>
              <p className="text-xs text-muted-foreground mt-1">ou sélectionnez une catégorie ci-dessus</p>
            </div>
          )}

          {/* No results */}
          {!loading && results.length === 0 && hasSearch && (
            <p className="px-4 py-8 text-sm text-muted-foreground text-center">Aucun résultat</p>
          )}

          {/* Places */}
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

          {/* Users */}
          {users.length > 0 && (
            <section>
              <SectionHeader label={`👤 Membres (${users.length})`} />
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

          {/* Strays */}
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

          {/* Lost pets */}
          {lostPets.length > 0 && (
            <section>
              <SectionHeader label={`🆘 Animaux perdus (${lostPets.length})`} />
              {lostPets.map(r => (
                <button key={r.id} onClick={() => handleResult(r)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/60 active:bg-muted/80 transition-colors text-left">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-xl ${
                    r.status === "active" ? "bg-amber-100 dark:bg-amber-900/30" : "bg-green-100 dark:bg-green-900/30"
                  }`}>
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

          <div className="h-3" />
        </div>
      </div>
    </>
  );
}
