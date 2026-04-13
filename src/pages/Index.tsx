import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import MapSection from "@/components/MapSection";
import Footer from "@/components/Footer";
import ItineraryPanel from "@/components/itinerary/ItineraryPanel";
import type { PickMode } from "@/components/itinerary/ItineraryPanel";
import { useState, useCallback } from "react";
import type { ItineraryMapData } from "@/components/itinerary/types";

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [itineraryOpen, setItineraryOpen] = useState(false);
  const [itineraryData, setItineraryData] = useState<ItineraryMapData | null>(null);
  const [pickMode, setPickMode] = useState<PickMode>(null);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleViewStep = useCallback((lat: number, lng: number) => {
    document.getElementById("explore")?.scrollIntoView({ behavior: "smooth" });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header onItineraryClick={() => setItineraryOpen(true)} />
      <HeroSection onSearch={handleSearch} />
      <MapSection
        searchQuery={searchQuery}
        itineraryData={itineraryData}
        onStepClick={handleViewStep}
        pickMode={pickMode}
      />
      <Footer />

      {itineraryOpen && (
        <ItineraryPanel
          onClose={() => {
            setItineraryOpen(false);
            setItineraryData(null);
            setPickMode(null);
          }}
          onRouteCalculated={setItineraryData}
          onViewStep={handleViewStep}
          pickMode={pickMode}
          onPickModeChange={setPickMode}
        />
      )}
    </div>
  );
};

export default Index;
