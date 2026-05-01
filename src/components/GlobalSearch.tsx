import { useState, useRef, useEffect, MutableRefObject } from "react";
import { Search, X, Loader2, User } from "lucide-react";
import { useGlobalSearch, type SearchResult } from "@/hooks/useGlobalSearch";

const CATEGORY_ICONS: Record<string, string> = {
  veterinaire: "🏥", shop: "🐾", parc_chiens: "🐕", refuge: "🏚️", spa: "🛁",
  restaurant: "🍽️", hotel: "🏨", cafe: "☕", loisir: "🎯", outdoor: "🌿",
  parc: "🌳", plage: "🏖️", camping: "⛺", transport: "🚌", autre: "📍",
};

function catIcon(cat: string) {
  return CATEGORY_ICONS[cat] || "📍";
}

interface GlobalSearchProps {
  mapRef: MutableRefObject<any>;
}

export default function GlobalSearch({ mapRef }: GlobalSearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { results, loading, search, clear } = useGlobalSearch();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { search(query); }, [query, search]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const close = () => {
    setOpen(false);
    setQuery("");
    clear();
    inputRef.current?.blur();
  };

  const openSearch = () => {
    setOpen(true);
    // Small delay so the input is mounted/visible before focusing
    setTimeout(() => inputRef.current?.focus(), 50);
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
      if (result.last_seen_lat && result.last_seen_lng) {
        mapRef.current?.flyTo({ center: [result.last_seen_lng, result.last_seen_lat], zoom: 15, duration: 900 });
      }
      window.dispatchEvent(new CustomEvent("open-lost-pet", { detail: { petId: result.id } }));
    }
  };

  const showDropdown = open && query.length > 0 && (results.length > 0 || loading);
  const places   = results.filter(r => r.type === "place")    as Extract<SearchResult, { type: "place" }>[];
  const users    = results.filter(r => r.type === "user")     as Extract<SearchResult, { type: "user" }>[];
  const strays   = results.filter(r => r.type === "stray")    as Extract<SearchResult, { type: "stray" }>[];
  const lostPets = results.filter(r => r.type === "lost_pet") as Extract<SearchResult, { type: "lost_pet" }>[];

  return (
    /* Aligned with the stray report FAB: bottom-24 left-4 */
    <div ref={containerRef} className="absolute bottom-24 left-4 z-20">

      {/* Expanded search bar + dropdown (renders above) */}
      {open && (
        <div className="absolute bottom-0 left-0" style={{ width: "calc(100vw - 96px)", maxWidth: 420 }}>

          {/* Dropdown */}
          {showDropdown && (
            <div className="mb-2 bg-card/97 backdrop-blur-md border border-border rounded-2xl shadow-2xl overflow-hidden max-h-[55vh] overflow-y-auto">

              {loading && results.length === 0 && (
                <div className="flex items-center gap-2 px-4 py-3.5 text-sm text-muted-foreground">
                  <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                  Recherche en cours…
                </div>
              )}

              {places.length > 0 && (
                <section>
                  <p className="px-4 pt-3 pb-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">📍 Lieux</p>
                  {places.map(r => (
                    <button key={r.id} onClick={() => handleResult(r)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/60 transition-colors text-left">
                      <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0 overflow-hidden border border-border">
                        {r.photo_url
                          ? <img src={r.photo_url} className="w-full h-full object-cover" alt="" />
                          : <span className="text-base">{catIcon(r.category)}</span>}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{r.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{r.category}{r.city ? ` · ${r.city}` : ""}</p>
                      </div>
                    </button>
                  ))}
                </section>
              )}

              {users.length > 0 && (
                <section>
                  <p className="px-4 pt-3 pb-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">👤 Utilisateurs</p>
                  {users.map(r => (
                    <button key={r.id} onClick={() => handleResult(r)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/60 transition-colors text-left">
                      <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0 overflow-hidden border border-border">
                        {r.avatar_url
                          ? <img src={r.avatar_url} className="w-full h-full object-cover" alt="" />
                          : <User className="w-4 h-4 text-muted-foreground" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{r.display_name || "Utilisateur"}</p>
                        {r.city && <p className="text-xs text-muted-foreground">{r.city}</p>}
                      </div>
                    </button>
                  ))}
                </section>
              )}

              {strays.length > 0 && (
                <section>
                  <p className="px-4 pt-3 pb-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">🚨 Animaux errants</p>
                  {strays.map(r => (
                    <button key={r.id} onClick={() => handleResult(r)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/60 transition-colors text-left">
                      <div className="w-9 h-9 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0 text-lg">🚨</div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground">Animal errant signalé</p>
                        {r.city && <p className="text-xs text-muted-foreground">{r.city}</p>}
                      </div>
                    </button>
                  ))}
                </section>
              )}

              {lostPets.length > 0 && (
                <section>
                  <p className="px-4 pt-3 pb-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">🆘 Animaux perdus</p>
                  {lostPets.map(r => (
                    <button key={r.id} onClick={() => handleResult(r)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/60 transition-colors text-left">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-lg ${
                        r.status === "active" ? "bg-amber-100 dark:bg-amber-900/30" : "bg-green-100 dark:bg-green-900/30"
                      }`}>
                        {r.status === "active" ? "🆘" : "✅"}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {r.pet_name}{r.breed ? ` · ${r.breed}` : ""}
                        </p>
                        {r.city && <p className="text-xs text-muted-foreground">{r.city}</p>}
                      </div>
                    </button>
                  ))}
                </section>
              )}

              {!loading && results.length === 0 && query.length >= 2 && (
                <p className="px-4 py-5 text-sm text-muted-foreground text-center">
                  Aucun résultat pour &ldquo;{query}&rdquo;
                </p>
              )}

              <div className="h-1.5" />
            </div>
          )}

          {/* Expanded input bar */}
          <div className="flex items-center gap-2 bg-card/95 backdrop-blur-md border border-border rounded-full shadow-lg px-3 py-2">
            {loading && query
              ? <Loader2 className="w-4 h-4 text-muted-foreground shrink-0 animate-spin" />
              : <Search className="w-4 h-4 text-muted-foreground shrink-0" />}
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Lieu, ville, utilisateur…"
              className="flex-1 bg-transparent text-foreground placeholder:text-muted-foreground outline-none min-w-0"
              /* font-size 16px prevents iOS auto-zoom on input focus */
              style={{ fontSize: 16 }}
            />
            <button
              onClick={close}
              className="p-1 rounded-full hover:bg-muted transition-colors shrink-0 text-muted-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* FAB button — always visible, matches the other FABs style */}
      {!open && (
        <button
          onClick={openSearch}
          className="p-3 bg-card/90 backdrop-blur-sm rounded-full shadow-lg border border-border hover:bg-muted transition-colors"
          title="Rechercher"
        >
          <Search className="w-5 h-5 text-primary" />
        </button>
      )}
    </div>
  );
}
