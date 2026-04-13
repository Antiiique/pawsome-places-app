/// <reference types="google.maps" />
import heroImage from "@/assets/hero-pet-friendly.jpg";
import { Search, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useRef, useEffect, useCallback } from "react";

interface HeroSectionProps {
  onSearch: (query: string) => void;
}

interface Prediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
  types?: string[];
}

function getIconForTypes(types?: string[]): string {
  if (!types) return "📍";
  if (types.some(t => ["restaurant", "cafe", "bar", "food"].includes(t))) return "🍽️";
  if (types.some(t => ["lodging"].includes(t))) return "🏨";
  if (types.some(t => ["supermarket", "store", "shopping_mall"].includes(t))) return "🛒";
  if (types.some(t => ["park", "campground", "natural_feature"].includes(t))) return "🌿";
  if (types.some(t => ["hospital", "pharmacy", "doctor"].includes(t))) return "🏥";
  if (types.some(t => ["airport", "train_station", "transit_station"].includes(t))) return "🚉";
  if (types.some(t => ["locality", "administrative_area_level_1", "administrative_area_level_2"].includes(t))) return "🏙️";
  return "📍";
}

const HeroSection = ({ onSearch }: HeroSectionProps) => {
  const [query, setQuery] = useState("");
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const handleSearch = () => {
    if (query.trim()) {
      onSearch(query.trim());
      setShowDropdown(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
    if (e.key === "Escape") setShowDropdown(false);
  };

  const fetchPredictions = useCallback((input: string) => {
    if (!input.trim() || !window.google?.maps?.places) { setPredictions([]); setShowDropdown(false); return; }
    const service = new google.maps.places.AutocompleteService();
    service.getPlacePredictions({ input, language: "fr" }, (results, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && results) {
        setPredictions(results.slice(0, 5) as unknown as Prediction[]);
        setShowDropdown(true);
      } else {
        setPredictions([]);
        setShowDropdown(false);
      }
    });
  }, []);

  const handleInput = (text: string) => {
    setQuery(text);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => fetchPredictions(text), 300);
  };

  const handleSelect = (pred: Prediction) => {
    setQuery(pred.structured_formatting.main_text);
    setShowDropdown(false);
    onSearch(pred.structured_formatting.main_text);
  };

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <section className="relative min-h-[85vh] flex items-center overflow-hidden">
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt="Voyager avec son animal de compagnie"
          width={1920}
          height={1080}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 hero-gradient" />
      </div>

      <div className="relative container px-4 pt-20">
        <div className="max-w-2xl animate-fade-in">
          <h1 className="text-4xl md:text-6xl font-heading font-bold text-primary-foreground leading-tight mb-4">
            Voyagez partout avec votre compagnon
          </h1>
          <p className="text-lg md:text-xl text-primary-foreground/90 mb-8 font-body">
            Découvrez les meilleurs restaurants, hôtels, parcs et lieux de loisirs qui accueillent vos animaux à travers le monde.
          </p>

          <div ref={containerRef} className="relative max-w-xl">
            <div className="flex flex-col sm:flex-row gap-3 bg-card/95 backdrop-blur-sm rounded-xl p-3 shadow-xl">
              <div className="flex items-center gap-2 flex-1 px-3">
                <MapPin className="w-5 h-5 text-pet-coral shrink-0" />
                <input
                  type="text"
                  placeholder="Rechercher une ville ou un lieu..."
                  value={query}
                  onChange={(e) => handleInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => { if (predictions.length > 0) setShowDropdown(true); }}
                  className="hero-search-input w-full py-2 bg-transparent text-foreground placeholder:text-muted-foreground outline-none text-sm"
                />
              </div>
              <Button
                onClick={handleSearch}
                className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 gap-2"
              >
                <Search className="w-4 h-4" />
                Rechercher
              </Button>
            </div>

            {showDropdown && predictions.length > 0 && (
              <div className="absolute z-50 left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
                {predictions.map((pred) => (
                  <button
                    key={pred.place_id}
                    onClick={() => handleSelect(pred)}
                    className="w-full text-left px-4 py-2.5 hover:bg-muted transition-colors flex items-start gap-3"
                  >
                    <span className="text-lg mt-0.5">{getIconForTypes(pred.types)}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{pred.structured_formatting.main_text}</p>
                      <p className="text-xs text-muted-foreground truncate">{pred.structured_formatting.secondary_text}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 mt-6">
            {["Paris", "Barcelone", "Amsterdam", "Lisbonne"].map((city) => (
              <span
                key={city}
                onClick={() => {
                  setQuery(city);
                  onSearch(city);
                }}
                className="px-3 py-1.5 rounded-full bg-primary-foreground/20 text-primary-foreground text-sm font-medium backdrop-blur-sm cursor-pointer hover:bg-primary-foreground/30 transition-colors"
              >
                {city}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
