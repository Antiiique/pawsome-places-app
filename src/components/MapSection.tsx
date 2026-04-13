/// <reference types="google.maps" />
import { useState, useEffect, useRef, useCallback } from "react";
import { MapPin, Loader2, Locate } from "lucide-react";
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

const CATEGORY_EMOJIS: Record<string, string> = {
  restaurant: "🍽️",
  hotel: "🛏️",
  outdoor: "🌿",
  services: "❤️",
  shop: "🐾",
  other: "📍",
};

function createMarkerContent(category: string, acceptsDogs: boolean): HTMLElement {
  const color = acceptsDogs
    ? (CATEGORY_MARKER_COLORS[category] || "#4CAF50")
    : "#9E9E9E";
  const emoji = CATEGORY_EMOJIS[category] || "📍";

  const div = document.createElement("div");
  div.style.cssText = `
    width: 40px; height: 46px; position: relative; cursor: pointer;
  `;
  div.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="46" viewBox="0 0 44 52">
      <filter id="s" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-opacity="0.3"/></filter>
      <path filter="url(#s)" d="M22 50 C22 50 4 34 4 20 A18 18 0 0 1 40 20 C40 34 22 50 22 50Z" fill="${color}" stroke="white" stroke-width="2"/>
      <text x="22" y="24" text-anchor="middle" font-size="18" dominant-baseline="central">${emoji}</text>
    </svg>
  `;
  return div;
}

function waitForGoogleMaps(): Promise<void> {
  return new Promise((resolve) => {
    const check = () => {
      if (window.google?.maps?.Map && window.google?.maps?.marker?.AdvancedMarkerElement && window.google?.maps?.places && window.google?.maps?.geometry) {
        resolve();
      } else {
        setTimeout(check, 100);
      }
    };
    check();
  });
}

function loadGoogleMapsScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.maps?.Map && window.google?.maps?.marker?.AdvancedMarkerElement && window.google?.maps?.places && window.google?.maps?.geometry) {
      resolve();
      return;
    }
    const existing = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existing) {
      waitForGoogleMaps().then(resolve);
      return;
    }
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,marker,geometry&loading=async&v=beta`;
    script.async = true;
    script.defer = true;
    script.onload = () => waitForGoogleMaps().then(resolve);
    script.onerror = () => reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(script);
  });
}

import type { ItineraryMapData } from "./itinerary/types";
import type { PickMode } from "./itinerary/ItineraryPanel";

interface MapSectionProps {
  searchQuery?: string;
  itineraryData?: ItineraryMapData | null;
  onStepClick?: (lat: number, lng: number) => void;
  pickMode?: PickMode;
}

const MapSection = ({ searchQuery, itineraryData, onStepClick, pickMode }: MapSectionProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const autocompleteContainerRef = useRef<HTMLDivElement>(null);
  const itineraryPolylineRef = useRef<google.maps.Polyline | null>(null);
  const itineraryMarkersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const pickMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);

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
      mapId: "DEMO_MAP_ID",
      disableDefaultUI: false,
      zoomControl: true,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
    });
    mapInstanceRef.current = map;

    clustererRef.current = new MarkerClusterer({
      map,
      markers: [],
      renderer: {
        render: ({ count, position }) => {
          const el = document.createElement("div");
          el.style.cssText = `
            background: hsl(var(--primary)); color: white; border-radius: 50%;
            width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;
            font-weight: 700; font-size: 13px; border: 2px solid white;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          `;
          el.textContent = String(count);
          return new google.maps.marker.AdvancedMarkerElement({
            position,
            content: el,
          });
        },
      },
    });

    // Drag end → reload
    map.addListener("dragend", () => {
      const c = map.getCenter();
      if (c) {
        setCenter({ lat: c.lat(), lng: c.lng() });
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
          loadPlaces(center.lat, center.lng, radiusKm, activeCategory);
        }
      );
    } else {
      loadPlaces(center.lat, center.lng, radiusKm, activeCategory);
    }

    // Setup PlaceAutocompleteElement
    if (autocompleteContainerRef.current) {
      try {
        const placeAutocomplete = new google.maps.places.PlaceAutocompleteElement({
          componentRestrictions: { country: [] },
        });
        
        // Style the element
        (placeAutocomplete as any).style.cssText = `
          width: 100%; border: none; outline: none;
        `;
        
        autocompleteContainerRef.current.innerHTML = "";
        autocompleteContainerRef.current.appendChild(placeAutocomplete as unknown as Node);

        // @ts-ignore - gmp-select event
        placeAutocomplete.addEventListener("gmp-select", async (event: any) => {
          const placePrediction = event.placePrediction;
          if (!placePrediction) return;
          const place = placePrediction.toPlace();
          await place.fetchFields({ fields: ["location"] });
          const location = place.location;
          if (location) {
            const loc = { lat: location.lat(), lng: location.lng() };
            setCenter(loc);
            map.panTo(loc);
            map.setZoom(13);
          }
        });
      } catch (e) {
        console.warn("PlaceAutocompleteElement not available, falling back to input", e);
      }
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

  // Render itinerary on map
  useEffect(() => {
    if (!mapInstanceRef.current || !isLoaded) return;

    // Clean up previous itinerary
    itineraryPolylineRef.current?.setMap(null);
    itineraryMarkersRef.current.forEach((m) => (m.map = null));
    itineraryMarkersRef.current = [];

    if (!itineraryData) return;

    const map = mapInstanceRef.current;

    // Draw polyline
    const polyline = new google.maps.Polyline({
      path: itineraryData.routePath,
      strokeColor: "#FF6B35",
      strokeWeight: 5,
      strokeOpacity: 0.8,
      map,
    });
    itineraryPolylineRef.current = polyline;

    const markers: google.maps.marker.AdvancedMarkerElement[] = [];

    // Start marker
    const startEl = document.createElement("div");
    startEl.innerHTML = `<div style="background:#4CAF50;color:white;padding:6px 12px;border-radius:20px;font-weight:700;font-size:13px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)">🏁 Départ</div>`;
    markers.push(new google.maps.marker.AdvancedMarkerElement({ position: itineraryData.origin, content: startEl, map }));

    // End marker
    const endEl = document.createElement("div");
    endEl.innerHTML = `<div style="background:#E53935;color:white;padding:6px 12px;border-radius:20px;font-weight:700;font-size:13px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)">🏁 Arrivée</div>`;
    markers.push(new google.maps.marker.AdvancedMarkerElement({ position: itineraryData.destination, content: endEl, map }));

    // Step markers
    const catColors: Record<string, string> = { restaurant: "#FF6B35", hotel: "#4285F4", outdoor: "#4CAF50", services: "#E53935", shop: "#9C27B0" };
    itineraryData.steps.forEach((step, i) => {
      const color = catColors[step.category] || "#9E9E9E";
      const el = document.createElement("div");
      el.innerHTML = `<div style="background:${color};color:white;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:15px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);cursor:pointer" title="${step.name} — ${step.category}">${i + 1}</div>`;
      const marker = new google.maps.marker.AdvancedMarkerElement({
        position: { lat: step.latitude, lng: step.longitude },
        content: el,
        map,
      });
      marker.addListener("click", () => onStepClick?.(step.latitude, step.longitude));
      markers.push(marker);
    });

    // Pause markers
    itineraryData.pausePoints.forEach((pp) => {
      const el = document.createElement("div");
      el.innerHTML = `<div style="background:#FFF;color:#FF6B35;padding:4px 8px;border-radius:12px;font-size:11px;border:2px solid #FF6B35;box-shadow:0 2px 4px rgba(0,0,0,0.2)" title="Pause conseillée ici">🐾 Pause</div>`;
      markers.push(new google.maps.marker.AdvancedMarkerElement({ position: pp, content: el, map }));
    });

    itineraryMarkersRef.current = markers;

    // Fit bounds
    const bounds = new google.maps.LatLngBounds();
    itineraryData.routePath.forEach((p) => bounds.extend(p));
    map.fitBounds(bounds, 50);
  }, [itineraryData, isLoaded, onStepClick]);

  const clearMarkers = useCallback(() => {
    markersRef.current.forEach((m) => (m.map = null));
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

      const newMarkers: google.maps.marker.AdvancedMarkerElement[] = [];
      results.forEach((place) => {
        const content = createMarkerContent(place.category, place.accepts_dogs);
        const marker = new google.maps.marker.AdvancedMarkerElement({
          position: { lat: place.latitude, lng: place.longitude },
          title: place.name,
          content,
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
        {/* Search bar with PlaceAutocompleteElement */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div
            ref={autocompleteContainerRef}
            className="relative flex-1 rounded-lg border border-border bg-card text-foreground text-sm overflow-hidden [&_gmp-place-autocomplete]:w-full [&_gmp-place-autocomplete]:border-none [&_gmp-place-autocomplete]:outline-none [&_input]:w-full [&_input]:pl-4 [&_input]:pr-4 [&_input]:py-2.5 [&_input]:bg-transparent [&_input]:text-sm [&_input]:outline-none [&_input]:border-none"
          />
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
