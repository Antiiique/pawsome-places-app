/// <reference types="google.maps" />
import { useState, useEffect, useRef, useCallback } from "react";
import { MapPin, Star, Phone, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const GOOGLE_MAPS_API_KEY = "AIzaSyDP4zY29gT-tXDxcszWHBWSC8_14AEmiYg";

const petFriendlyKeywords = [
  "pet friendly restaurant",
  "dog friendly restaurant",
  "pet friendly hotel",
  "pet friendly cafe",
  "dog friendly cafe",
  "dog park",
  "pet friendly camping",
  "pet friendly leisure",
  "veterinary clinic",
];

const createPawMarkerIcon = (color: string): google.maps.Icon => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="46" viewBox="0 0 40 46">
    <filter id="s" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-opacity="0.3"/></filter>
    <path filter="url(%23s)" d="M20 44 C20 44 4 30 4 18 A16 16 0 0 1 36 18 C36 30 20 44 20 44Z" fill="${color}" stroke="white" stroke-width="2"/>
    <g transform="translate(11,10) scale(0.038)" fill="white">
      <ellipse cx="120" cy="80" rx="45" ry="55"/>
      <ellipse cx="320" cy="80" rx="45" ry="55"/>
      <ellipse cx="50" cy="220" rx="42" ry="50"/>
      <ellipse cx="390" cy="220" rx="42" ry="50"/>
      <path d="M100 340 Q140 260 220 250 Q300 260 340 340 Q340 420 220 420 Q100 420 100 340Z"/>
    </g>
  </svg>`;
  return {
    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg),
    scaledSize: new google.maps.Size(40, 46),
    anchor: new google.maps.Point(20, 46),
  };
};

const categoryFromTypes = (types: string[]): string => {
  if (types.includes("restaurant") || types.includes("cafe") || types.includes("food")) return "Restaurant";
  if (types.includes("lodging")) return "Hôtel";
  if (types.includes("park") || types.includes("campground")) return "Parc";
  if (types.includes("veterinary_care")) return "Vétérinaire";
  return "Loisirs";
};

const categoryColors: Record<string, string> = {
  Restaurant: "#E57373",
  Hôtel: "#64B5F6",
  Parc: "#81C784",
  Vétérinaire: "#FFB74D",
  Loisirs: "#BA68C8",
};

export type PlaceResult = {
  id: string;
  name: string;
  category: string;
  address: string;
  rating: number;
  reviews: number;
  phone: string;
  photo: string;
  position: google.maps.LatLngLiteral;
  placeId: string;
};

function loadGoogleMapsScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.maps?.places) {
      resolve();
      return;
    }
    const existing = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Script failed")));
      if (window.google?.maps?.places) resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(script);
  });
}

interface MapSectionProps {
  searchQuery?: string;
}

const MapSection = ({ searchQuery }: MapSectionProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const serviceRef = useRef<google.maps.places.PlacesService | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);

  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [places, setPlaces] = useState<PlaceResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null);
  const [currentCity, setCurrentCity] = useState("Paris");

  // Load Google Maps script
  useEffect(() => {
    loadGoogleMapsScript()
      .then(() => setIsLoaded(true))
      .catch(() => setLoadError(true));
  }, []);

  // Init map once loaded
  useEffect(() => {
    if (!isLoaded || !mapRef.current || mapInstanceRef.current) return;

    const map = new google.maps.Map(mapRef.current, {
      center: { lat: 48.8566, lng: 2.3522 },
      zoom: 13,
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      styles: [
        { featureType: "poi.park", elementType: "geometry.fill", stylers: [{ color: "#c8e6c9" }] },
        { featureType: "water", elementType: "geometry.fill", stylers: [{ color: "#bbdefb" }] },
        { featureType: "road", elementType: "geometry.fill", stylers: [{ color: "#fafafa" }] },
      ],
    });

    mapInstanceRef.current = map;
    infoWindowRef.current = new google.maps.InfoWindow();
    serviceRef.current = new google.maps.places.PlacesService(map);
    geocoderRef.current = new google.maps.Geocoder();

    // Search default city
    searchCity("Paris");
  }, [isLoaded]);

  // React to external search query
  useEffect(() => {
    if (searchQuery && searchQuery.trim() && isLoaded && mapInstanceRef.current) {
      searchCity(searchQuery.trim());
    }
  }, [searchQuery, isLoaded]);

  const clearMarkers = useCallback(() => {
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
  }, []);

  const addMarker = useCallback((place: PlaceResult) => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const color = categoryColors[place.category] || "#4CAF50";
    const marker = new google.maps.Marker({
      position: place.position,
      map,
      icon: createPawMarkerIcon(color),
      title: place.name,
    });

    marker.addListener("click", () => {
      setSelectedPlace(place);
      showInfoWindow(place, marker);
    });

    markersRef.current.push(marker);
    return marker;
  }, []);

  const showInfoWindow = useCallback((place: PlaceResult, marker: google.maps.Marker) => {
    if (!infoWindowRef.current || !mapInstanceRef.current) return;
    const photoHtml = place.photo
      ? `<img src="${place.photo}" alt="${place.name}" style="width:100%;height:100px;object-fit:cover;border-radius:8px;margin-bottom:8px" />`
      : "";
    infoWindowRef.current.setContent(`
      <div style="max-width:240px;font-family:sans-serif">
        ${photoHtml}
        <h3 style="font-weight:700;font-size:14px;margin:0 0 4px">${place.name}</h3>
        <p style="font-size:12px;color:#888;margin:0 0 4px">${place.address}</p>
        <div style="display:flex;align-items:center;gap:4px">
          <span style="color:#f59e0b">★</span>
          <span style="font-size:12px;font-weight:600">${place.rating || "N/A"}</span>
          <span style="font-size:11px;color:#aaa">(${place.reviews || 0} avis)</span>
        </div>
        <span style="display:inline-block;margin-top:6px;font-size:10px;background:#e8f5e9;color:#2e7d32;padding:2px 8px;border-radius:12px">🐾 ${place.category}</span>
      </div>
    `);
    infoWindowRef.current.open(mapInstanceRef.current, marker);
  }, []);

  const searchNearby = useCallback(
    (location: google.maps.LatLng): Promise<PlaceResult[]> => {
      return new Promise((resolve) => {
        if (!serviceRef.current) {
          resolve([]);
          return;
        }

        const allResults: PlaceResult[] = [];
        let completed = 0;

        petFriendlyKeywords.forEach((keyword) => {
          const request: google.maps.places.TextSearchRequest = {
            location,
            radius: 5000,
            query: keyword,
          };

          serviceRef.current!.textSearch(request, (results, status) => {
            completed++;
            if (status === google.maps.places.PlacesServiceStatus.OK && results) {
              results.slice(0, 5).forEach((r) => {
                if (!allResults.find((ar) => ar.placeId === r.place_id)) {
                  allResults.push({
                    id: r.place_id || String(Math.random()),
                    name: r.name || "Lieu inconnu",
                    category: categoryFromTypes(r.types || []),
                    address: r.formatted_address || "",
                    rating: r.rating || 0,
                    reviews: r.user_ratings_total || 0,
                    phone: "",
                    photo: r.photos?.[0]?.getUrl({ maxWidth: 400, maxHeight: 300 }) || "",
                    position: {
                      lat: r.geometry!.location!.lat(),
                      lng: r.geometry!.location!.lng(),
                    },
                    placeId: r.place_id || "",
                  });
                }
              });
            }
            if (completed === petFriendlyKeywords.length) {
              resolve(allResults);
            }
          });
        });
      });
    },
    []
  );

  const searchCity = useCallback(
    async (city: string) => {
      if (!geocoderRef.current || !mapInstanceRef.current) return;
      setSearching(true);
      setCurrentCity(city);

      geocoderRef.current.geocode({ address: city }, async (results, status) => {
        if (status === "OK" && results && results[0]) {
          const location = results[0].geometry.location;
          mapInstanceRef.current!.panTo(location);
          mapInstanceRef.current!.setZoom(13);

          clearMarkers();
          const foundPlaces = await searchNearby(location);
          setPlaces(foundPlaces);
          foundPlaces.forEach((p) => addMarker(p));
          setSearching(false);

          // Scroll to map
          document.getElementById("explore")?.scrollIntoView({ behavior: "smooth" });
        } else {
          setSearching(false);
        }
      });
    },
    [clearMarkers, searchNearby, addMarker]
  );

  const handleCardClick = useCallback(
    (place: PlaceResult) => {
      setSelectedPlace(place);
      const map = mapInstanceRef.current;
      if (map) {
        map.panTo(place.position);
        map.setZoom(16);
      }
      const idx = markersRef.current.findIndex(
        (m) => m.getTitle() === place.name
      );
      if (idx >= 0) {
        showInfoWindow(place, markersRef.current[idx]);
      }
    },
    [showInfoWindow]
  );

  return (
    <section id="explore" className="py-16 bg-secondary/50">
      <div className="container px-4">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-heading font-bold text-foreground mb-3">
            Lieux pet-friendly à {currentCity}
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Résultats en temps réel via Google Places — restaurants, hôtels, parcs et plus
          </p>
        </div>

        {/* Map */}
        <div className="relative rounded-2xl overflow-hidden mb-10 border border-border h-[450px]">
          {loadError && (
            <div className="flex items-center justify-center h-full bg-muted">
              <p className="text-destructive">Erreur de chargement de la carte. Vérifiez la clé API.</p>
            </div>
          )}
          {!isLoaded && !loadError && (
            <div className="flex items-center justify-center h-full bg-muted animate-pulse">
              <MapPin className="w-12 h-12 text-primary animate-bounce" />
            </div>
          )}
          {searching && (
            <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-10 flex items-center justify-center">
              <div className="flex items-center gap-3 bg-card px-6 py-3 rounded-full shadow-lg">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
                <span className="text-sm font-medium text-foreground">Recherche en cours…</span>
              </div>
            </div>
          )}
          <div
            ref={mapRef}
            className="w-full h-full"
            style={{ display: isLoaded && !loadError ? "block" : "none" }}
          />
        </div>

        {/* Place cards */}
        {places.length > 0 && (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {places.slice(0, 12).map((place, i) => (
              <div
                key={place.id}
                className={`bg-card rounded-xl overflow-hidden card-hover animate-fade-in cursor-pointer border-2 transition-colors ${
                  selectedPlace?.id === place.id ? "border-primary" : "border-transparent"
                }`}
                style={{ animationDelay: `${i * 80}ms` }}
                onClick={() => handleCardClick(place)}
              >
                {place.photo ? (
                  <div className="relative h-48">
                    <img
                      src={place.photo}
                      alt={place.name}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                    <span
                      className="absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-semibold text-white"
                      style={{ backgroundColor: categoryColors[place.category] || "#4CAF50" }}
                    >
                      {place.category}
                    </span>
                  </div>
                ) : (
                  <div className="relative h-32 bg-muted flex items-center justify-center">
                    <MapPin className="w-8 h-8 text-muted-foreground" />
                    <span
                      className="absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-semibold text-white"
                      style={{ backgroundColor: categoryColors[place.category] || "#4CAF50" }}
                    >
                      {place.category}
                    </span>
                  </div>
                )}
                <div className="p-5">
                  <h3 className="font-heading font-bold text-lg text-foreground mb-1 line-clamp-1">
                    {place.name}
                  </h3>
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mb-3 line-clamp-1">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    {place.address}
                  </p>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-pet-warm fill-pet-warm" />
                      <span className="font-semibold text-sm text-foreground">
                        {place.rating || "—"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({place.reviews} avis)
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs gap-1 border-border text-muted-foreground hover:text-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(
                          `https://www.google.com/maps/place/?q=place_id:${place.placeId}`,
                          "_blank"
                        );
                      }}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Google Maps
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!searching && places.length === 0 && isLoaded && (
          <p className="text-center text-muted-foreground">
            Aucun résultat. Essayez de rechercher une ville dans la barre ci-dessus.
          </p>
        )}
      </div>
    </section>
  );
};

export default MapSection;
