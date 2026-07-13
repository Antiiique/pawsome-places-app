import { useState, useRef, useEffect, useCallback, MutableRefObject } from "react";
import { Search, X, Loader2, User, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useGlobalSearch, type SearchResult, type SearchFilters } from "@/hooks/useGlobalSearch";
import { useHandedness } from "@/contexts/HandednessContext";
import { CategoryIcon } from "@/lib/categoryIcons";

/* ── Constants ─────────────────────────────────────────── */

const FAB     = 48;
const OPEN_W  = "min(calc(100vw - 32px), 420px)";
const ANIM_MS = 300;
const KM20    = 0.18; // ~20 km in degrees lat

const CATEGORY_FILTERS: { value: string | null; label: string; emoji: string }[] = [
  { value: null,          label: "Tous",        emoji: "🗺️" },
  { value: "veterinaire", label: "Vétérinaire", emoji: "🏥" },
  { value: "animalerie",  label: "Animalerie",  emoji: "🐾" },
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

function deriveFilters(activeCategory: string | null): SearchFilters {
  if (activeCategory === "__strays__") return { category: null, types: ["stray"],    city: null };
  if (activeCategory === "__lost__")   return { category: null, types: ["lost_pet"], city: null };
  if (activeCategory !== null)         return { category: activeCategory, types: ["place"], city: null };
  return { category: null, types: ["place", "user", "stray", "lost_pet"], city: null };
}

type NearbyPlace = { id: string; name: string; city: string | null; category: string; latitude: number; longitude: number; photo_url: string | null };

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
  const [open,         setOpen]         = useState(false);
  const [closing,      setClosing]      = useState(false);
  const [query,        setQuery]        = useState("");
  const [nearbyPlaces, setNearbyPlaces] = useState<NearbyPlace[]>([]);
  const [nearbyLoading,setNearbyLoading]= useState(false);

  const { results, loading, search, clear } = useGlobalSearch();
  const inputRef   = useRef<HTMLInputElement>(null);
  const barRef     = useRef<HTMLDivElement>(null);
  const panelRef   = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>();
  const nearbyTimer= useRef<ReturnType<typeof setTimeout>>();
  // Prevents a synthetic click from firing on a result row after a horizontal chip scroll
  const chipScrolling = useRef(false);
  const chipTouchStartX = useRef(0);

  const isExpanded = open && !closing;
  const { isLeftHanded } = useHandedness();
  const showPanel  = open;
  const hasFilter  = activeCategory !== null;
  const hasSearch  = !!(query || activeCategory);
  const noResults  = !loading && hasSearch && results.length === 0;

  /* ── Main search ── */
  useEffect(() => {
    search(query, deriveFilters(activeCategory));
  }, [query, activeCategory]); // eslint-disable-line

  /* ── 20 km fallback when no results ── */
  useEffect(() => {
    clearTimeout(nearbyTimer.current);
    if (!noResults) { setNearbyPlaces([]); return; }

    const mapCenter = mapRef.current?.getCenter?.();
    if (!mapCenter) return;

    setNearbyLoading(true);
    nearbyTimer.current = setTimeout(async () => {
      const { lat, lng } = mapCenter;
      const lonDelta = KM20 / Math.cos((lat * Math.PI) / 180);

      let q = supabase
        .from("pet_friendly_places")
        .select("id, name, city, category, latitude, longitude, photo_url")
        .gte("latitude",  lat - KM20)
        .lte("latitude",  lat + KM20)
        .gte("longitude", lng - lonDelta)
        .lte("longitude", lng + lonDelta);

      // Keep category filter if active (excluding special types)
      if (activeCategory && activeCategory !== "__strays__" && activeCategory !== "__lost__") {
        q = q.eq("category", activeCategory);
      }

      const { data } = await q.order("name").limit(10);
      setNearbyPlaces((data || []) as NearbyPlace[]);
      setNearbyLoading(false);
    }, 400);

    return () => clearTimeout(nearbyTimer.current);
  }, [noResults, activeCategory]); // eslint-disable-line

  /* ── Outside tap ── */
  useEffect(() => {
    const h = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node;
      if (!barRef.current?.contains(t) && !panelRef.current?.contains(t)) startClose();
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
      setNearbyPlaces([]);
      clear();
    }, ANIM_MS);
  };

  const toggleSearch = () => (!open || closing) ? openSearch() : startClose();

  const clearCategory = useCallback(() => onCategoryChange(null), [onCategoryChange]);

  /* ── Result click ── */
  const handleResult = (id: string, type: string, lat?: number | null, lng?: number | null) => {
    startClose();
    if (type === "place" && lat && lng) {
      mapRef.current?.flyTo({ center: [lng, lat], zoom: 16, duration: 900 });
      window.dispatchEvent(new CustomEvent("global-search-open-place", { detail: { placeId: id } }));
    } else if (type === "user") {
      window.dispatchEvent(new CustomEvent("open-user-profile", { detail: { userId: id } }));
    } else if (type === "stray" && lat && lng) {
      mapRef.current?.flyTo({ center: [lng, lat], zoom: 15, duration: 900 });
      window.dispatchEvent(new CustomEvent("open-stray", { detail: { strayId: id } }));
    } else if (type === "lost_pet") {
      if (lat && lng) mapRef.current?.flyTo({ center: [lng, lat], zoom: 15, duration: 900 });
      window.dispatchEvent(new CustomEvent("open-lost-pet", { detail: { petId: id } }));
    }
  };

  const handleSearchResult = (r: SearchResult) => {
    if (r.type === "place")    handleResult(r.id, "place", r.lat, r.lng);
    else if (r.type === "user")    handleResult(r.id, "user");
    else if (r.type === "stray")   handleResult(r.id, "stray", r.lat, r.lng);
    else if (r.type === "lost_pet") handleResult(r.id, "lost_pet", r.last_seen_lat, r.last_seen_lng);
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
          bottom: "18rem",   /* bottom-72: above add(bottom-56)→lostpet(bottom-40)→stray(bottom-24)→locate(bottom-8) */
          ...(isLeftHanded ? { left: "1rem" } : { right: "1rem" }),
          zIndex: 30,
          /* ── The bar uses position:relative so the icon button can be
             absolutely anchored to the right edge — guaranteeing a full
             48×48 hit zone regardless of the animated width. ── */
          
          width: isExpanded ? OPEN_W : FAB,
          height: FAB,
          transition: `width ${ANIM_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
          overflow: "hidden",
          borderRadius: 9999,
          background: "color-mix(in srgb, var(--card) 55%, transparent)",
          border: "1px solid color-mix(in srgb, var(--border) 50%, transparent)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.10)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
        } as React.CSSProperties}
      >
        {/* Input — fills space opposite to icon */}
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Lieu, ville, catégorie…"
          style={{
            position: "absolute",
            top: 0, bottom: 0,
            ...(isLeftHanded ? { left: FAB, right: 0, paddingLeft: 12, paddingRight: 16 } : { left: 0, right: FAB, paddingLeft: 16 }),
            fontSize: 16,
            background: "transparent",
            outline: "none",
            color: "var(--foreground)",
            opacity: isExpanded ? 1 : 0,
            transition: `opacity 0.15s ease ${isExpanded ? "0.16s" : "0s"}`,
            pointerEvents: isExpanded ? "auto" : "none",
          }}
        />

        {/* Icon — absolutely pinned to the edge matching handedness */}
        <button
          onClick={toggleSearch}
          style={{
            position: "absolute",
            top: 0, ...(isLeftHanded ? { left: 0 } : { right: 0 }),
            width: FAB, height: FAB,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "transparent", border: "none",
            cursor: "pointer", borderRadius: 9999,
            zIndex: 1, touchAction: "manipulation",
          }}
        >
          {loading && hasSearch
            ? <Loader2 className="w-5 h-5 text-primary animate-spin" />
            : isExpanded
            ? <X className="w-5 h-5 text-muted-foreground" />
            : <Search className="w-5 h-5 text-primary" />}

          {/* Filter badge (closed state) */}
          {hasFilter && !open && (
            <span style={{
              position: "absolute", top: 10, ...(isLeftHanded ? { left: 10 } : { right: 10 }),
              width: 8, height: 8, borderRadius: "50%",
              background: "var(--primary)",
              border: "1.5px solid var(--card)",
            }} />
          )}
        </button>
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
          maxHeight: "62dvh",
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
        {/* ── Category chips ── */}
        <div style={{ flexShrink: 0, borderBottom: "1px solid var(--border)", paddingBottom: 10, paddingTop: 10 }}>
          <div
            className="flex gap-1.5 px-3 overflow-x-auto scrollbar-hide"
            onTouchStart={e => { chipTouchStartX.current = e.touches[0].clientX; }}
            onTouchEnd={e => {
              const dx = Math.abs(e.changedTouches[0].clientX - chipTouchStartX.current);
              if (dx > 8) {
                chipScrolling.current = true;
                setTimeout(() => { chipScrolling.current = false; }, 400);
              }
            }}
          >
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
                  <CategoryIcon category={c.value} className="w-4 h-4" />
                  {c.label}
                </button>
              );
            })}
          </div>

          {activeCategory !== null && (
            <div className="flex items-center px-3 mt-2">
              <div className="inline-flex items-center gap-1.5 bg-primary/10 border border-primary/30 rounded-full px-3 py-1">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
                  <CategoryIcon category={activeCategory} className="w-3.5 h-3.5" />
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

          {/* Empty state — no search yet */}
          {!loading && results.length === 0 && !hasSearch && (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-muted-foreground">Tapez un lieu, une ville ou un type</p>
              <p className="text-xs text-muted-foreground mt-1">ou sélectionnez une catégorie ci-dessus</p>
            </div>
          )}

          {/* Places */}
          {places.length > 0 && (
            <section>
              <SectionHeader label={`📍 Lieux (${places.length})`} />
              {places.map(r => (
                <button key={r.id} onClick={() => { if (chipScrolling.current) return; handleSearchResult(r); }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/60 active:bg-muted/80 transition-colors text-left">
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0 overflow-hidden border border-border">
                    {r.photo_url
                      ? <img src={r.photo_url} className="w-full h-full object-cover" alt="" />
                      : <span className="text-primary"><CategoryIcon category={r.category} className="w-5 h-5" /></span>}
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
                <button key={r.id} onClick={() => { if (chipScrolling.current) return; handleSearchResult(r); }}
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
                <button key={r.id} onClick={() => { if (chipScrolling.current) return; handleSearchResult(r); }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/60 active:bg-muted/80 transition-colors text-left">
                  <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0 text-destructive"><CategoryIcon category="__strays__" className="w-5 h-5" /></div>
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
                <button key={r.id} onClick={() => { if (chipScrolling.current) return; handleSearchResult(r); }}
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

          {/* ── 20 km fallback ── */}
          {noResults && (
            <>
              <div className="px-4 pt-5 pb-2 text-center">
                <p className="text-sm font-medium text-foreground">Aucun résultat trouvé</p>
                <p className="text-xs text-muted-foreground mt-0.5">Voici des lieux à proximité (20 km)</p>
              </div>

              {nearbyLoading && (
                <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
                  <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" /> Recherche à proximité…
                </div>
              )}

              {!nearbyLoading && nearbyPlaces.length === 0 && (
                <p className="px-4 py-4 text-xs text-muted-foreground text-center">
                  Aucun lieu trouvé dans un rayon de 20 km
                </p>
              )}

              {!nearbyLoading && nearbyPlaces.length > 0 && (
                <section>
                  <SectionHeader label={`📍 À proximité (${nearbyPlaces.length})`} />
                  {nearbyPlaces.map(p => (
                    <button
                      key={p.id}
                      onClick={() => { if (chipScrolling.current) return; handleResult(p.id, "place", p.latitude, p.longitude); }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/60 active:bg-muted/80 transition-colors text-left"
                    >
                      <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0 overflow-hidden border border-border">
                        {p.photo_url
                          ? <img src={p.photo_url} className="w-full h-full object-cover" alt="" />
                          : <span className="text-primary"><CategoryIcon category={p.category} className="w-5 h-5" /></span>}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{p.name}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                          <p className="text-xs text-muted-foreground truncate">{p.city || p.category}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </section>
              )}
            </>
          )}

          <div className="h-3" />
        </div>
      </div>
    </>
  );
}
