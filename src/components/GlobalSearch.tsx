import { useState, useRef, useEffect, useCallback, MutableRefObject } from "react";
import { Search, X, Loader2, User, SlidersHorizontal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useGlobalSearch, type SearchResult, type ResultType, type SearchFilters } from "@/hooks/useGlobalSearch";

/* ── Constants ─────────────────────────────────────────── */

const FAB     = 48;
const OPEN_W  = "min(calc(100vw - 96px), 440px)";
const ANIM_MS = 320;

const ALL_TYPES: ResultType[] = ["place", "user", "stray", "lost_pet"];

const CATEGORY_FILTERS: { value: string | null; label: string; emoji: string }[] = [
  { value: null,           label: "Tous",        emoji: "🗺️" },
  { value: "veterinaire",  label: "Vétérinaire", emoji: "🏥" },
  { value: "shop",         label: "Animalerie",  emoji: "🐾" },
  { value: "parc_chiens",  label: "Parc chiens", emoji: "🐕" },
  { value: "refuge",       label: "Refuge",      emoji: "🏚️" },
  { value: "restaurant",   label: "Restaurant",  emoji: "🍽️" },
  { value: "hotel",        label: "Hôtel",       emoji: "🏨" },
  { value: "cafe",         label: "Café",        emoji: "☕" },
  { value: "spa",          label: "Spa",         emoji: "🛁" },
  { value: "loisir",       label: "Loisir",      emoji: "🎯" },
  { value: "outdoor",      label: "Outdoor",     emoji: "🌿" },
  { value: "plage",        label: "Plage",       emoji: "🏖️" },
  { value: "camping",      label: "Camping",     emoji: "⛺" },
  { value: "__strays__",   label: "Errants",     emoji: "🚨" },
  { value: "__lost__",     label: "Perdus",      emoji: "🆘" },
];

const CATEGORY_ICONS: Record<string, string> = Object.fromEntries(
  CATEGORY_FILTERS.filter(c => c.value).map(c => [c.value as string, c.emoji])
);
const catIcon = (c: string) => CATEGORY_ICONS[c] || "📍";

/* ── Derive search filters from activeCategory ─────────── */
function deriveFilters(activeCategory: string | null, city: string | null): SearchFilters {
  if (activeCategory === "__strays__") return { category: null, types: ["stray"],    city };
  if (activeCategory === "__lost__")   return { category: null, types: ["lost_pet"], city };
  if (activeCategory !== null)         return { category: activeCategory, types: ["place"], city };
  return { category: null, types: ALL_TYPES, city };
}

/* ── Sub-components ─────────────────────────────────────── */

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="px-4 pt-2.5 pb-1.5 flex items-center gap-2">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest shrink-0">{label}</p>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

/* ── Main component ─────────────────────────────────────── */

interface GlobalSearchProps {
  mapRef: MutableRefObject<any>;
  activeCategory: string | null;
  onCategoryChange: (cat: string | null) => void;
}

export default function GlobalSearch({ mapRef, activeCategory, onCategoryChange }: GlobalSearchProps) {
  /* open/close state */
  const [open,    setOpen]    = useState(false);
  const [closing, setClosing] = useState(false);

  /* text query */
  const [query, setQuery] = useState("");

  /* city filter (local) */
  const [filterCity,      setFilterCity]      = useState<string | null>(null);
  const [cityInput,       setCityInput]       = useState("");
  const [citySuggestions, setCitySuggestions] = useState<string[]>([]);

  const { results, loading, search, clear } = useGlobalSearch();
  const inputRef      = useRef<HTMLInputElement>(null);
  const cityInputRef  = useRef<HTMLInputElement>(null);
  const containerRef  = useRef<HTMLDivElement>(null);
  const closeTimer    = useRef<ReturnType<typeof setTimeout>>();

  /* ── Active filter count for badge ── */
  const activeFilterCount = (activeCategory !== null ? 1 : 0) + (filterCity ? 1 : 0);

  /* ── Build filters object ── */
  const filters = deriveFilters(activeCategory, filterCity);

  /* ── Re-search on query or filter change ── */
  useEffect(() => {
    search(query, filters);
  }, [query, activeCategory, filterCity]);    // eslint-disable-line

  /* ── City autocomplete ── */
  useEffect(() => {
    if (cityInput.length < 2) { setCitySuggestions([]); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("pet_friendly_places")
        .select("city")
        .ilike("city", `%${cityInput}%`)
        .not("city", "is", null)
        .limit(6);
      const cities = [...new Set((data || []).map((r: any) => r.city).filter(Boolean))] as string[];
      setCitySuggestions(cities);
    }, 200);
    return () => clearTimeout(t);
  }, [cityInput]);

  /* ── Outside tap closes ── */
  useEffect(() => {
    const h = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) startClose();
    };
    document.addEventListener("mousedown", h);
    document.addEventListener("touchstart", h, { passive: true });
    return () => { document.removeEventListener("mousedown", h); document.removeEventListener("touchstart", h); };
  }, [open]);   // eslint-disable-line

  /* ── Open / Close ── */
  const openSearch = () => {
    clearTimeout(closeTimer.current);
    setClosing(false);
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), ANIM_MS);
  };

  const startClose = () => {
    if (!open) return;
    inputRef.current?.blur();
    cityInputRef.current?.blur();
    setClosing(true);
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => {
      setOpen(false);
      setClosing(false);
      setQuery("");
      setCityInput("");
      setCitySuggestions([]);
      clear();
    }, ANIM_MS);
  };

  const clearAllFilters = useCallback(() => {
    onCategoryChange(null);
    setFilterCity(null);
    setCityInput("");
    setCitySuggestions([]);
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

  /* ── Derived ── */
  const isExpanded   = open && !closing;
  const showDropdown = isExpanded;

  const places   = results.filter(r => r.type === "place")    as Extract<SearchResult, { type: "place" }>[];
  const users    = results.filter(r => r.type === "user")     as Extract<SearchResult, { type: "user" }>[];
  const strays   = results.filter(r => r.type === "stray")    as Extract<SearchResult, { type: "stray" }>[];
  const lostPets = results.filter(r => r.type === "lost_pet") as Extract<SearchResult, { type: "lost_pet" }>[];
  const hasResults = results.length > 0;

  const hasActiveSearch = !!(query || filterCity || activeCategory);

  /* ══════════════════════════════════════════════════════ */
  return (
    <div ref={containerRef} className="absolute bottom-24 left-4 z-20">

      {/* ══ Dropdown panel ══ */}
      <div
        style={{
          position: "absolute",
          bottom: FAB + 10,
          left: 0,
          width: OPEN_W,
          opacity: showDropdown ? 1 : 0,
          visibility: showDropdown ? "visible" : "hidden",
          transform: showDropdown ? "translateY(0)" : "translateY(10px)",
          transition: `opacity ${ANIM_MS}ms cubic-bezier(0.4,0,0.2,1), transform ${ANIM_MS}ms cubic-bezier(0.4,0,0.2,1), visibility 0s linear ${showDropdown ? "0s" : `${ANIM_MS}ms`}`,
          borderRadius: 16,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          maxHeight: "58vh",
          background: "var(--card)",
          border: "1px solid var(--border)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        } as React.CSSProperties}
      >

        {/* ── FILTER HEADER (fixed, never scrolls) ── */}
        <div style={{ flexShrink: 0, borderBottom: "1px solid var(--border)" }}>

          {/* Header title + clear */}
          <div className="flex items-center justify-between px-4 pt-3 pb-1.5">
            <div className="flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-muted-foreground" />
              <p className="text-xs font-semibold text-muted-foreground">Filtres</p>
              {activeFilterCount > 0 && (
                <span className="text-[10px] font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full leading-none">
                  {activeFilterCount}
                </span>
              )}
            </div>
            {activeFilterCount > 0 && (
              <button onClick={clearAllFilters} className="text-[11px] text-primary font-medium hover:underline">
                Tout effacer
              </button>
            )}
          </div>

          {/* Category chips (Tous + all categories + strays + lost) */}
          <div className="flex gap-1.5 px-3 pb-2 overflow-x-auto scrollbar-hide">
            {CATEGORY_FILTERS.map(c => (
              <button
                key={c.value ?? "__all__"}
                onClick={() => onCategoryChange(c.value === activeCategory ? null : c.value)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full border text-xs font-medium whitespace-nowrap transition-colors shrink-0 ${
                  activeCategory === c.value
                    ? "bg-primary/10 border-primary text-primary"
                    : c.value === null && activeCategory === null
                    ? "bg-primary/10 border-primary text-primary"
                    : "bg-muted/50 border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                {c.emoji} {c.label}
              </button>
            ))}
          </div>

          {/* City filter */}
          <div className="px-3 pb-3">
            {filterCity ? (
              <div className="flex items-center gap-1.5">
                <div className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/30 rounded-full px-3 py-1.5">
                  <span className="text-xs font-medium text-primary">📍 {filterCity}</span>
                  <button
                    onClick={() => { setFilterCity(null); setCityInput(""); setCitySuggestions([]); }}
                    className="text-primary/70 hover:text-primary transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative">
                <input
                  ref={cityInputRef}
                  value={cityInput}
                  onChange={e => setCityInput(e.target.value)}
                  placeholder="Filtrer par ville…"
                  style={{ fontSize: 16 }}
                  className="w-full bg-muted/50 border border-border rounded-full px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-primary/50 transition-colors"
                />
                {citySuggestions.length > 0 && (
                  <div className="absolute bottom-full mb-1 left-0 right-0 bg-card border border-border rounded-xl shadow-xl overflow-hidden z-20">
                    {citySuggestions.map(city => (
                      <button
                        key={city}
                        onClick={() => { setFilterCity(city); setCityInput(city); setCitySuggestions([]); }}
                        className="w-full text-left px-3 py-2.5 text-sm hover:bg-muted active:bg-muted/80 transition-colors"
                      >
                        📍 {city}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ── RESULTS (scrollable) ── */}
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
          {loading && results.length === 0 && hasActiveSearch && (
            <div className="flex items-center gap-2 px-4 py-4 text-sm text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" /> Recherche en cours…
            </div>
          )}

          {/* Empty state */}
          {!loading && !hasResults && !hasActiveSearch && (
            <div className="px-4 py-6 text-center">
              <p className="text-sm text-muted-foreground">Tapez un nom, une ville</p>
              <p className="text-xs text-muted-foreground mt-1">ou sélectionnez une catégorie ci-dessus</p>
            </div>
          )}

          {/* No results */}
          {!loading && !hasResults && hasActiveSearch && (
            <p className="px-4 py-6 text-sm text-muted-foreground text-center">
              Aucun résultat pour cette recherche
            </p>
          )}

          {/* Places */}
          {places.length > 0 && (
            <section>
              <SectionHeader label={`📍 Lieux (${places.length})`} />
              {places.map(r => (
                <button key={r.id} onClick={() => handleResult(r)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/60 active:bg-muted/80 transition-colors text-left">
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

          {/* Users */}
          {users.length > 0 && (
            <section>
              <SectionHeader label={`👤 Membres (${users.length})`} />
              {users.map(r => (
                <button key={r.id} onClick={() => handleResult(r)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/60 active:bg-muted/80 transition-colors text-left">
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

          <div className="h-3" />
        </div>
      </div>

      {/* ══ Animated bar ══ */}
      <div
        style={{
          width: isExpanded ? OPEN_W : FAB,
          height: FAB,
          transition: `width ${ANIM_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
          overflow: "hidden",
          borderRadius: 9999,
          display: "flex",
          alignItems: "center",
          background: "var(--card)",
          border: "1px solid var(--border)",
          boxShadow: isExpanded ? "0 4px 20px rgba(0,0,0,0.15)" : "0 2px 8px rgba(0,0,0,0.12)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        } as React.CSSProperties}
      >
        {/* Icon button — exact 48×48 hit target */}
        <button
          onClick={() => { if (!open || closing) openSearch(); }}
          style={{
            position: "relative",
            width: FAB, height: FAB, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "transparent", border: "none",
            cursor: isExpanded ? "default" : "pointer",
            borderRadius: 9999,
            pointerEvents: "auto",
          }}
        >
          {loading && hasActiveSearch
            ? <Loader2 className="w-5 h-5 text-primary animate-spin" />
            : <Search className="w-5 h-5 text-primary" />}

          {/* Active filter badge */}
          {activeFilterCount > 0 && !open && (
            <span style={{
              position: "absolute", top: 9, right: 9,
              width: 9, height: 9, borderRadius: "50%",
              background: "var(--primary)",
              border: "1.5px solid var(--card)",
            }} />
          )}
        </button>

        {/* Input */}
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Lieu, ville, type…"
          style={{
            fontSize: 16,
            opacity: isExpanded ? 1 : 0,
            transition: `opacity 0.15s ease ${isExpanded ? "0.18s" : "0s"}`,
            pointerEvents: isExpanded ? "auto" : "none",
            flex: 1, background: "transparent", outline: "none",
            color: "var(--foreground)", minWidth: 0,
          }}
        />

        {/* Close */}
        <button
          onClick={e => { e.stopPropagation(); startClose(); }}
          style={{
            width: 40, height: 40, flexShrink: 0, marginRight: 4,
            opacity: isExpanded ? 1 : 0,
            transition: `opacity 0.15s ease ${isExpanded ? "0.22s" : "0s"}`,
            pointerEvents: isExpanded ? "auto" : "none",
            display: "flex", alignItems: "center", justifyContent: "center",
            borderRadius: 9999, color: "var(--muted-foreground)",
            background: "transparent", border: "none", cursor: "pointer",
          }}
          className="hover:bg-muted transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
