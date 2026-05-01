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
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const { results, loading, search, clear } = useGlobalSearch();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { search(query); }, [query, search]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleResult = (result: SearchResult) => {
    setQuery(""); clear(); setFocused(false); inputRef.current?.blur();

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

  const showDropdown = focused && query.length > 0 && (results.length > 0 || loading);
  const places   = results.filter(r => r.type === "place")    as Extract<SearchResult, { type: "place" }>[];
  const users    = results.filter(r => r.type === "user")     as Extract<SearchResult, { type: "user" }>[];
  const strays   = results.filter(r => r.type === "stray")    as Extract<SearchResult, { type: "stray" }>[];
  const lostPets = results.filter(r => r.type === "lost_pet") as Extract<SearchResult, { type: "lost_pet" }>[];

  return (
    <div
      ref={containerRef}
      className="absolute bottom-6 left-4 z-20"
      style={{ right: 76 }}
    >
      {/* Dropdown — above the bar */}
      {showDropdown && (
        <div className="mb-2 bg-card/95 backdrop-blur-md border border-border rounded-2xl shadow-2xl overflow-hidden max-h-[60vh] overflow-y-auto">

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

          <div className="h-2" />
        </div>
      )}

      {/* Search pill */}
      <div className={`flex items-center gap-2.5 rounded-full border shadow-lg px-4 py-2.5 transition-all duration-200 ${
        focused
          ? "bg-card border-primary/60 shadow-primary/10 shadow-xl"
          : "bg-card/80 backdrop-blur-md border-white/20 shadow-black/20"
      }`}>
        {loading && query
          ? <Loader2 className="w-4 h-4 text-muted-foreground shrink-0 animate-spin" />
          : <Search className="w-4 h-4 text-muted-foreground shrink-0" />}
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          placeholder="Rechercher un lieu, un utilisateur…"
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none min-w-0"
        />
        {query && (
          <button
            onClick={() => { setQuery(""); clear(); inputRef.current?.focus(); }}
            className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
