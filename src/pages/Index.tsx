import Header from "@/components/Header";
import MapSection from "@/components/MapSection";
import ItineraryPanel from "@/components/itinerary/ItineraryPanel";
import FavoritesPanel from "@/components/FavoritesPanel";
import type { PickMode } from "@/components/itinerary/ItineraryPanel";
import { useState, useCallback, useEffect, useRef } from "react";
import type { ItineraryMapData } from "@/components/itinerary/types";
import { useFavorites } from "@/hooks/useFavorites";

type PanelName = "itinerary" | "favorites" | null;

const EDGE_ZONE = 44;       // px depuis le bord pour démarrer le swipe
const SNAP_THRESHOLD = 0.35; // 35% de l'écran = snap open

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activePanel, setActivePanel] = useState<PanelName>(null);
  const [itineraryData, setItineraryData] = useState<ItineraryMapData | null>(null);
  const [pickMode, setPickMode] = useState<PickMode>(null);
  const [panelDrag, setPanelDrag] = useState<{ panel: "itinerary" | "favorites"; progress: number } | null>(null);

  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const activePanelRef = useRef<PanelName>(null);

  // Keep ref in sync so touch handlers always see latest value
  useEffect(() => { activePanelRef.current = activePanel; }, [activePanel]);

  const { favorites, isFavorite, toggleFavorite, removeFavorite, count: favCount } = useFavorites();

  const openPanel = useCallback((panel: PanelName) => {
    setActivePanel((prev) => (prev === panel ? null : panel));
    if (panel !== "itinerary") setPickMode(null);
  }, []);

  // ── Touch handlers ──
  const handleTouchStart = (e: React.TouchEvent) => {
    const x = e.touches[0].clientX;
    const screenW = window.innerWidth;
    touchStartX.current = x;
    touchStartY.current = e.touches[0].clientY;

    const current = activePanelRef.current;
    if (current === "itinerary") {
      setPanelDrag({ panel: "itinerary", progress: 1 });
    } else if (current === "favorites") {
      setPanelDrag({ panel: "favorites", progress: 1 });
    } else if (x <= EDGE_ZONE) {
      setPanelDrag({ panel: "itinerary", progress: 0 });
    } else if (x >= screenW - EDGE_ZONE) {
      setPanelDrag({ panel: "favorites", progress: 0 });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!panelDrag || touchStartX.current === null) return;
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = e.touches[0].clientY - (touchStartY.current ?? 0);
    // Ignore mostly-vertical gestures
    if (Math.abs(dy) > Math.abs(dx) + 10) return;
    const screenW = window.innerWidth;
    const current = activePanelRef.current;
    if (panelDrag.panel === "itinerary") {
      const base = current === "itinerary" ? 1 : 0;
      setPanelDrag({ panel: "itinerary", progress: Math.max(0, Math.min(1, base + dx / screenW)) });
    } else {
      const base = current === "favorites" ? 1 : 0;
      setPanelDrag({ panel: "favorites", progress: Math.max(0, Math.min(1, base - dx / screenW)) });
    }
  };

  const handleTouchEnd = () => {
    if (!panelDrag) return;
    const { panel, progress } = panelDrag;
    setPanelDrag(null);
    touchStartX.current = null;
    touchStartY.current = null;
    if (panel === "itinerary") {
      if (progress >= SNAP_THRESHOLD) setActivePanel("itinerary");
      else { setActivePanel(null); setPickMode(null); }
    } else {
      if (progress >= SNAP_THRESHOLD) setActivePanel("favorites");
      else setActivePanel(null);
    }
  };

  // Close panel on click outside (desktop)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!activePanel) return;
      const target = e.target as HTMLElement;
      if (target.closest('[data-panel]') || target.closest('header')) return;
      setActivePanel(null);
      setPickMode(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [activePanel]);

  const handleViewStep = useCallback((lat: number, lng: number) => {
    window.dispatchEvent(new CustomEvent("map-pan-to", { detail: { lat, lng } }));
  }, []);

  const handleFavViewOnMap = useCallback((lat: number, lng: number) => {
    window.dispatchEvent(new CustomEvent("map-pan-to", { detail: { lat, lng } }));
  }, []);

  const handleFavSetOrigin = useCallback((fav: any) => {
    setActivePanel("itinerary");
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("marker-set-itinerary", {
        detail: { type: "origin", location: { lat: fav.lat, lng: fav.lng }, text: fav.name },
      }));
    }, 300);
  }, []);

  const handleFavSetDest = useCallback((fav: any) => {
    setActivePanel("itinerary");
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("marker-set-itinerary", {
        detail: { type: "destination", location: { lat: fav.lat, lng: fav.lng }, text: fav.name },
      }));
    }, 300);
  }, []);

  return (
    <div
      className="h-screen overflow-hidden flex flex-col bg-background"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <Header
        onItineraryClick={() => openPanel("itinerary")}
        onFavoritesClick={() => openPanel("favorites")}
        favoritesCount={favCount}
      />
      <MapSection
        searchQuery={searchQuery}
        itineraryData={itineraryData}
        onStepClick={handleViewStep}
        pickMode={pickMode}
        isFavorite={isFavorite}
        onToggleFavorite={toggleFavorite}
        onOpenItinerary={() => setActivePanel("itinerary")}
      />

      {/* Bloque les events touch sur Mapbox pendant un swipe de panel */}
      {panelDrag && (
        <div className="fixed inset-0 z-[45]" style={{ touchAction: "none" }} />
      )}

      <ItineraryPanel
        open={activePanel === "itinerary"}
        onClose={() => { setActivePanel(null); setPickMode(null); }}
        onRouteCalculated={setItineraryData}
        onViewStep={handleViewStep}
        pickMode={pickMode}
        onPickModeChange={setPickMode}
        dragProgress={panelDrag?.panel === "itinerary" ? panelDrag.progress : undefined}
      />

      <FavoritesPanel
        open={activePanel === "favorites"}
        favorites={favorites}
        onClose={() => setActivePanel(null)}
        onRemove={removeFavorite}
        onViewOnMap={handleFavViewOnMap}
        onSetOrigin={handleFavSetOrigin}
        onSetDestination={handleFavSetDest}
        dragProgress={panelDrag?.panel === "favorites" ? panelDrag.progress : undefined}
      />
    </div>
  );
};

export default Index;
