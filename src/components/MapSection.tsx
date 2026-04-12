/// <reference types="google.maps" />
import { useState, useEffect, useRef, useCallback } from "react";
import { MapPin, Loader2, Locate, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { MarkerClusterer } from "@googlemaps/markerclusterer";
import PlaceDetailPanel, { type PetPlace } from "./PlaceDetailPanel";

const GOOGLE_MAPS_API_KEY = "AIzaSyDP4zY29gT-tXDxcszWHBWSC8_14AEmiYg";

const CATEGORY_FILTERS = [
  { key: null, label: "Tous", emoji: "🐾" },
  { key: "restaurant", label: "Restaurants", emoji: "🍽️" },
  { key: "hotel", label: "Hôtels", emoji: "🛏️" },
  { key: "outdoor", label: "Parcs & Nature", emoji: "🌿" },
  { key: "services", label: "Vétérinaires", emoji: "❤️" },
  { key: "shop", label: "Pet Shops", emoji: "🐾" },
] as const;

const CATEGORY_MARKER_COLORS: Record<string, string> = {
  restaurant: "#FF6B35",
  hotel: "#4285F4",
  outdoor: "#4CAF50",
  services: "#E53935",
  shop: "#9C27B0",
  other: "#9E9E9E",
};

function createCategoryMarkerSvg(category: string, acceptsDogs: boolean): string {
  const color = acceptsDogs
    ? (CATEGORY_MARKER_COLORS[category] || "#4CAF50")
    : "#9E9E9E";

  const iconPaths: Record<string, string> = {
    restaurant: `<path d="M7 2v8h2V2h2v8h2V2h2v8c0 1.1-.9 2-2 2h-1v6h-2v-6H9c-1.1 0-2-.9-2-2V2h2z" fill="white" transform="translate(8,8) scale(0.7)"/>`,
    hotel: `<path d="M7 13c1.66 0 3-1.34 3-3S8.66 7 7 7s-3 1.34-3 3 1.34 3 3 3zm12-6h-8v8H3V5H1v15h2v-3h18v3h2V10c0-2.21-1.79-4-4-4z" fill="white" transform="translate(6,8) scale(0.6)"/>`,
    outdoor: `<path d="M17 12h-2l-3-4-3 4H7l5-7 5 7zm-5 8c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" fill="white" transform="translate(8,7) scale(0.7)"/>`,
    services: `<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="white" transform="translate(8,7) scale(0.6)"/>`,
    shop: `<g transform="translate(11,10) scale(0.028)" fill="white"><ellipse cx="120" cy="80" rx="45" ry="55"/><ellipse cx="320" cy="80" rx="45" ry="55"/><ellipse cx="50" cy="220" rx="42" ry="50"/><ellipse cx="390" cy="220" rx="42" ry="50"/><path d="M100 340 Q140 260 220 250 Q300 260 340 340 Q340 420 220 420 Q100 420 100 340Z"/></g>`,
  };

  const icon = iconPaths[category] || iconPaths.shop;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="46" viewBox="0 0 40 46">
      <filter id="s" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-opacity="0.3"/></filter>
      <path filter="url(%23s)" d="M20 44 C20 44 4 30 4 18 A16 16 0 0 1 36 18 C36 30 20 44 20 44Z" fill="${color}" stroke="white" stroke-width="2"/>
      ${icon}
    </svg>`
  )}`;
}

function loadGoogleMapsScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.maps?.places) { resolve(); return; }
    const existing = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existing) {
      existing.addEventListener("load", () => resolve());
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
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const autocompleteInputRef = useRef<HTMLInputElement>(null);

  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [places, setPlaces] = useState<PetPlace[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<PetPlace | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [radiusKm, setRadiusKm] = useState(20);
  const [center, setCenter] = useState<{ lat: number; lng: number }>({ lat: 48.8566, lng: 2.3522 });

  // Load Google Maps
  useEffect(() => {
    loadGoogleMapsScript()
      .then(() => setIsLoaded(true))
      .catch(() => setLoadError(true));
  }, []);

  // Init map
  useEffect(() => {
    if (!isLoaded || !mapRef.current || mapInstanceRef.current) return;

    const map = new google.maps.Map(mapRef.current, {
      center,
      zoom: 13,
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      styles: [
        { featureType: "poi", stylers: [{ visibility: "off" }] },
        { featureType: "transit", stylers: [{ visibility: "off" }] },
        { featureType: "poi.park", elementType: "geometry.fill", stylers: [{ visibility: "on" }, { color: "#c8e6c9" }] },
        { featureType: "water", elementType: "geometry.fill", stylers: [{ color: "#bbdefb" }] },
        { featureType: "road", elementType: "geometry.fill", stylers: [{ color: "#fafafa" }] },
      ],
    });
    mapInstanceRef.current = map;
    clustererRef.current = new MarkerClusterer({ map, markers: [] });

    // Drag end → reload
    map.addListener("dragend", () => {
      const c = map.getCenter();
      if (c) {
        const newCenter = { lat: c.lat(), lng: c.lng() };
        setCenter(newCenter);
      }
    });

    // Geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setCenter(loc);
          map.panTo(loc);
        },
        () => {
          // denied → stay on Paris, load data
          loadPlaces(center.lat, center.lng, radiusKm, activeCategory);
        }
      );
    } else {
      loadPlaces(center.lat, center.lng, radiusKm, activeCategory);
    }

    // Setup autocomplete
    if (autocompleteInputRef.current) {
      const autocomplete = new google.maps.places.Autocomplete(autocompleteInputRef.current, {
        types: ["(cities)"],
      });
      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (place.geometry?.location) {
          const loc = { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() };
          setCenter(loc);
          map.panTo(loc);
          map.setZoom(13);
        }
      });
    }
  }, [isLoaded]);

  // React to center/radius/category changes
  useEffect(() => {
    if (isLoaded && mapInstanceRef.current) {
      loadPlaces(center.lat, center.lng, radiusKm, activeCategory);
    }
  }, [center, radiusKm, activeCategory, isLoaded]);

  // React to external search query (from HeroSection)
  useEffect(() => {
    if (!searchQuery?.trim() || !isLoaded || !mapInstanceRef.current) return;
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: searchQuery.trim() }, (results, status) => {
      if (status === "OK" && results?.[0]) {
        const loc = results[0].geometry.location;
        const newCenter = { lat: loc.lat(), lng: loc.lng() };
        setCenter(newCenter);
        mapInstanceRef.current?.panTo(loc);
        mapInstanceRef.current?.setZoom(13);
        document.getElementById("explore")?.scrollIntoView({ behavior: "smooth" });
      }
    });
  }, [searchQuery, isLoaded]);

  const clearMarkers = useCallback(() => {
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    clustererRef.current?.clearMarkers();
  }, []);

  const loadPlaces = useCallback(
    async (lat: number, lng: number, radius: number, category: string | null) => {
      setSearching(true);
      const { data, error } = await supabase.rpc("get_nearby_pet_places", {
        user_lat: lat,
        user_lon: lng,
        radius_km: radius,
        cat_filter: category,
        dogs_only: false,
      });

      if (error) {
        console.error("Supabase RPC error:", error);
        setSearching(false);
        return;
      }

      const results: PetPlace[] = (data || []).map((d: any) => ({
        ...d,
        id: d.id as string,
      }));

      setPlaces(results);
      clearMarkers();

      const map = mapInstanceRef.current;
      if (!map) { setSearching(false); return; }

      const newMarkers: google.maps.Marker[] = [];
      results.forEach((place) => {
        const marker = new google.maps.Marker({
          position: { lat: place.latitude, lng: place.longitude },
          title: place.name,
          icon: {
            url: createCategoryMarkerSvg(place.category, place.accepts_dogs),
            scaledSize: new google.maps.Size(40, 46),
            anchor: new google.maps.Point(20, 46),
          },
        });
        marker.addListener("click", () => {
          setSelectedPlace(place);
          map.panTo({ lat: place.latitude, lng: place.longitude });
        });
        newMarkers.push(marker);
      });

      markersRef.current = newMarkers;
      clustererRef.current?.addMarkers(newMarkers);
      setSearching(false);
    },
    [clearMarkers]
  );

  const handleLocateMe = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setCenter(loc);
      mapInstanceRef.current?.panTo(loc);
      mapInstanceRef.current?.setZoom(14);
    });
  };

  return (
    <section id="explore" className="py-8 bg-secondary/50">
      <div className="container px-4">
        {/* Search bar with Google Places Autocomplete */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              ref={autocompleteInputRef}
              type="text"
              placeholder="Rechercher une ville ou adresse…"
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-card text-foreground text-sm outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        {/* Category filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide mb-2">
          {CATEGORY_FILTERS.map((f) => (
            <button
              key={f.label}
              onClick={() => setActiveCategory(f.key)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                activeCategory === f.key
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border text-foreground hover:bg-muted"
              }`}
            >
              {f.emoji} {f.label}
            </button>
          ))}
        </div>

        {/* Radius slider */}
        <div className="flex items-center gap-4 mb-4 px-1">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Rayon :</span>
          <Slider
            min={5}
            max={50}
            step={5}
            value={[radiusKm]}
            onValueChange={(v) => setRadiusKm(v[0])}
            className="flex-1 max-w-xs"
          />
          <span className="text-sm font-semibold text-foreground w-14 text-right">{radiusKm} km</span>
        </div>

        {/* Map */}
        <div className="relative rounded-2xl overflow-hidden mb-4 border border-border h-[450px]">
          {loadError && (
            <div className="flex items-center justify-center h-full bg-muted">
              <p className="text-destructive">Erreur de chargement de la carte.</p>
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
                <span className="text-sm font-medium text-foreground">Recherche…</span>
              </div>
            </div>
          )}
          <div
            ref={mapRef}
            className="w-full h-full"
            style={{ display: isLoaded && !loadError ? "block" : "none" }}
          />

          {/* Locate me button */}
          <button
            onClick={handleLocateMe}
            className="absolute bottom-4 right-4 z-10 p-3 bg-card rounded-full shadow-lg border border-border hover:bg-muted transition-colors"
            title="Ma position"
          >
            <Locate className="w-5 h-5 text-primary" />
          </button>
        </div>

        {/* Result counter */}
        <p className="text-center text-sm text-muted-foreground mb-6">
          <span className="font-semibold text-foreground">{places.length}</span> lieu{places.length !== 1 ? "x" : ""} pet-friendly trouvé{places.length !== 1 ? "s" : ""} dans un rayon de <span className="font-semibold text-foreground">{radiusKm} km</span>
        </p>
      </div>

      {/* Side panel */}
      {selectedPlace && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setSelectedPlace(null)} />
          <PlaceDetailPanel place={selectedPlace} onClose={() => setSelectedPlace(null)} />
        </>
      )}
    </section>
  );
};

export default MapSection;
