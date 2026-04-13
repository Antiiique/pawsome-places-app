import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import MapSection from "@/components/MapSection";
import Footer from "@/components/Footer";
import ItineraryPanel from "@/components/itinerary/ItineraryPanel";
import FavoritesPanel from "@/components/FavoritesPanel";
import type { PickMode } from "@/components/itinerary/ItineraryPanel";
import { useState, useCallback } from "react";
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
        onSearchClick={() => {
          document.querySelector(".hero-search-input")?.scrollIntoView({ behavior: "smooth" });
          setTimeout(() => {
            (document.querySelector(".hero-search-input") as HTMLInputElement)?.focus();
          }, 500);
        }}
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
      />
      <Footer />

      {/* Itinerary panel - always mounted, slides in/out */}
      <ItineraryPanel
        open={activePanel === "itinerary"}
        onClose={() => { setActivePanel(null); setPickMode(null); }}
        onRouteCalculated={setItineraryData}
        onViewStep={handleViewStep}
        pickMode={pickMode}
        onPickModeChange={setPickMode}
      />

      {/* Favorites panel - always mounted, slides in/out */}
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
