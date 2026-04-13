import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import MapSection from "@/components/MapSection";
import Footer from "@/components/Footer";
import ItineraryPanel from "@/components/itinerary/ItineraryPanel";
import FavoritesPanel from "@/components/FavoritesPanel";
import type { PickMode } from "@/components/itinerary/ItineraryPanel";
import { useState, useCallback, useEffect } from "react";
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
    <div className="min-h-screen bg-background">
      <Header
        onItineraryClick={() => openPanel("itinerary")}
        onFavoritesClick={() => openPanel("favorites")}
        favoritesCount={favCount}
      />
      <HeroSection onSearch={handleSearch} />
      <MapSection
        searchQuery={searchQuery}
        itineraryData={itineraryData}
        onStepClick={handleViewStep}
        pickMode={pickMode}
        isFavorite={isFavorite}
        onToggleFavorite={toggleFavorite}
        onOpenItinerary={() => openPanel("itinerary")}
      />
      <Footer />

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
