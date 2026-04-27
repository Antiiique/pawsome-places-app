/// <reference types="google.maps" />
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
    <section className="relative flex items-center justify-center overflow-hidden py-10 pt-24 bg-background">
      <div className="relative container px-4">
        <div className="max-w-xl mx-auto animate-fade-in">
          <div ref={containerRef} className="relative">
            <div className="flex flex-col sm:flex-row gap-3 bg-card rounded-xl p-3 border border-border shadow-md">
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
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
