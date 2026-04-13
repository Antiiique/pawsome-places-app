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

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [itineraryOpen, setItineraryOpen] = useState(false);
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const [itineraryData, setItineraryData] = useState<ItineraryMapData | null>(null);
  const [pickMode, setPickMode] = useState<PickMode>(null);

  const { favorites, isFavorite, toggleFavorite, removeFavorite, count: favCount } = useFavorites();

  const handleSearch = (query: string) => setSearchQuery(query);

  const handleViewStep = useCallback((lat: number, lng: number) => {
    document.getElementById("explore")?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const handleFavViewOnMap = useCallback((lat: number, lng: number) => {
    document.getElementById("explore")?.scrollIntoView({ behavior: "smooth" });
    // Pan the map via a custom event
    window.dispatchEvent(new CustomEvent("map-pan-to", { detail: { lat, lng } }));
  }, []);

  const handleFavSetOrigin = useCallback((fav: any) => {
    if (!itineraryOpen) setItineraryOpen(true);
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("marker-set-itinerary", {
        detail: { type: "origin", location: { lat: fav.lat, lng: fav.lng }, text: fav.name },
      }));
    }, 300);
  }, [itineraryOpen]);

  const handleFavSetDest = useCallback((fav: any) => {
    if (!itineraryOpen) setItineraryOpen(true);
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("marker-set-itinerary", {
        detail: { type: "destination", location: { lat: fav.lat, lng: fav.lng }, text: fav.name },
      }));
    }, 300);
  }, [itineraryOpen]);

  return (
    <div className="min-h-screen bg-background">
      <Header
        onItineraryClick={() => setItineraryOpen(true)}
        onFavoritesClick={() => setFavoritesOpen(true)}
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

      <div className={itineraryOpen ? "" : "hidden"}>
        <ItineraryPanel
          onClose={() => { setItineraryOpen(false); setPickMode(null); }}
          onRouteCalculated={setItineraryData}
          onViewStep={handleViewStep}
          pickMode={pickMode}
          onPickModeChange={setPickMode}
        />
      </div>

      {favoritesOpen && (
        <FavoritesPanel
          favorites={favorites}
          onClose={() => setFavoritesOpen(false)}
          onRemove={removeFavorite}
          onViewOnMap={handleFavViewOnMap}
          onSetOrigin={handleFavSetOrigin}
          onSetDestination={handleFavSetDest}
        />
      )}
    </div>
  );
};

export default Index;
