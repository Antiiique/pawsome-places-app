import Header from "@/components/Header";
import MapSection from "@/components/MapSection";
import ItineraryPanel from "@/components/itinerary/ItineraryPanel";
import FavoritesPanel from "@/components/FavoritesPanel";
import type { PickMode } from "@/components/itinerary/ItineraryPanel";
import { useState, useCallback, useEffect, useRef } from "react";
import type { ItineraryMapData } from "@/components/itinerary/types";
import { useFavorites } from "@/hooks/useFavorites";
import { toast } from "sonner";

type PanelName = "itinerary" | "favorites" | null;

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activePanel, setActivePanel] = useState<PanelName>(null);
  const [itineraryData, setItineraryData] = useState<ItineraryMapData | null>(null);
  const [pickMode, setPickMode] = useState<PickMode>(null);

  const { favorites, isFavorite, toggleFavorite, removeFavorite, count: favCount } = useFavorites();
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - (touchStartY.current ?? 0);
    touchStartX.current = null;
    touchStartY.current = null;
    if (Math.abs(dy) > Math.abs(dx) || Math.abs(dx) < 70) return;
    if (dx < 0) {
      if (activePanel === "favorites") setActivePanel(null);
      else openPanel("itinerary");
    } else {
      if (activePanel === "itinerary") { setActivePanel(null); setPickMode(null); }
      else openPanel("favorites");
    }
  };

  const handleSearch = (query: string) => setSearchQuery(query);

  const openPanel = useCallback((panel: PanelName) => {
    setActivePanel((prev) => (prev === panel ? null : panel));
    if (panel !== "itinerary") setPickMode(null);
  }, []);

  // Close panel on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!activePanel) return;
      const target = e.target as HTMLElement;
      // Don't close if clicking inside a panel or header
      if (target.closest('[data-panel]') || target.closest('header')) return;
      setActivePanel(null);
      setPickMode(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [activePanel]);

  const handleViewStep = useCallback((lat: number, lng: number) => {
    document.getElementById("explore")?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const handleFavViewOnMap = useCallback((lat: number, lng: number) => {
    document.getElementById("explore")?.scrollIntoView({ behavior: "smooth" });
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
    <div className="h-screen overflow-hidden flex flex-col bg-background" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
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

      <ItineraryPanel
        open={activePanel === "itinerary"}
        onClose={() => { setActivePanel(null); setPickMode(null); }}
        onRouteCalculated={setItineraryData}
        onViewStep={handleViewStep}
        pickMode={pickMode}
        onPickModeChange={setPickMode}
      />

      <FavoritesPanel
        open={activePanel === "favorites"}
        favorites={favorites}
        onClose={() => setActivePanel(null)}
        onRemove={removeFavorite}
        onViewOnMap={handleFavViewOnMap}
        onSetOrigin={handleFavSetOrigin}
        onSetDestination={handleFavSetDest}
      />
    </div>
  );
};

export default Index;
