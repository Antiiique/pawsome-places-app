/// <reference types="google.maps" />
import { useState, useEffect, useRef, useCallback } from "react";
import { MapPin, Loader2, Locate } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { MarkerClusterer } from "@googlemaps/markerclusterer";
import PlaceDetailPanel, { type PetPlace } from "./PlaceDetailPanel";
import MarkerPopup, { type UniversalPlace } from "./MarkerPopup";
import ReportModal from "./ReportModal";
import { toast } from "sonner";
import type { FavoritePlace } from "@/hooks/useFavorites";
import { detectCategoryFromTypes } from "@/hooks/useFavorites";

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
  const color = acceptsDogs ? (CATEGORY_MARKER_COLORS[category] || "#4CAF50") : "#9E9E9E";
  const emoji = CATEGORY_EMOJIS[category] || "📍";
  const div = document.createElement("div");
  div.style.cssText = `width: 40px; height: 46px; position: relative; cursor: pointer;`;
  div.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="46" viewBox="0 0 44 52">
      <filter id="s" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-opacity="0.3"/></filter>
      <path filter="url(#s)" d="M22 50 C22 50 4 34 4 20 A18 18 0 0 1 40 20 C40 34 22 50 22 50Z" fill="${color}" stroke="white" stroke-width="2"/>
      <text x="22" y="24" text-anchor="middle" font-size="18" dominant-baseline="central">${emoji}</text>
    </svg>`;
  return div;
}

function waitForGoogleMaps(): Promise<void> {
  return new Promise((resolve) => {
    const check = () => {
      if (window.google?.maps?.Map && window.google?.maps?.marker?.AdvancedMarkerElement && window.google?.maps?.places && window.google?.maps?.geometry) resolve();
      else setTimeout(check, 100);
    };
    check();
  });
}

function loadGoogleMapsScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.maps?.Map && window.google?.maps?.marker?.AdvancedMarkerElement && window.google?.maps?.places && window.google?.maps?.geometry) { resolve(); return; }
    const existing = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existing) { waitForGoogleMaps().then(resolve); return; }
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
  isFavorite?: (id: string) => boolean;
  onToggleFavorite?: (place: Omit<FavoritePlace, "savedAt">) => boolean;
  onOpenItinerary?: () => void;
}

const MapSection = ({ searchQuery, itineraryData, onStepClick, pickMode, isFavorite, onToggleFavorite, onOpenItinerary }: MapSectionProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const itineraryPolylineRef = useRef<google.maps.Polyline | null>(null);
  const itineraryMarkersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const pickMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const originMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const destMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const previewLineRef = useRef<google.maps.Polyline | null>(null);
  const markerClickedRef = useRef(false);

  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [places, setPlaces] = useState<PetPlace[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<PetPlace | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [radiusKm, setRadiusKm] = useState(20);
  const [center, setCenter] = useState<{ lat: number; lng: number }>({ lat: 48.8566, lng: 2.3522 });
  const [popupData, setPopupData] = useState<{ place: UniversalPlace; position: { x: number; y: number }; petPlace?: PetPlace } | null>(null);
  const [originPoint, setOriginPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [destPoint, setDestPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [reportModal, setReportModal] = useState<{ open: boolean; placeId: string | null; placeName: string }>({ open: false, placeId: null, placeName: "" });

  // Load Google Maps
  useEffect(() => {
    loadGoogleMapsScript().then(() => setIsLoaded(true)).catch(() => setLoadError(true));
  }, []);

  // Listen for map-pan-to events
  useEffect(() => {
    const handler = (e: CustomEvent<{ lat: number; lng: number }>) => {
      const map = mapInstanceRef.current;
      if (map) { map.panTo(e.detail); map.setZoom(15); }
    };
    window.addEventListener("map-pan-to" as any, handler as any);
    return () => window.removeEventListener("map-pan-to" as any, handler as any);
  }, []);

  // Init map
  useEffect(() => {
    if (!isLoaded || !mapRef.current || mapInstanceRef.current) return;

    const map = new google.maps.Map(mapRef.current, {
      center, zoom: 13, mapId: "DEMO_MAP_ID",
      disableDefaultUI: false, zoomControl: true, mapTypeControl: false, streetViewControl: false, fullscreenControl: true,
    });
    mapInstanceRef.current = map;

    clustererRef.current = new MarkerClusterer({
      map, markers: [],
      renderer: {
        render: ({ count, position }) => {
          const el = document.createElement("div");
          el.style.cssText = `background: hsl(var(--primary)); color: white; border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);`;
          el.textContent = String(count);
          return new google.maps.marker.AdvancedMarkerElement({ position, content: el });
        },
      },
    });

    // Drag end → reload
    map.addListener("dragend", () => {
      const c = map.getCenter();
      if (c) setCenter({ lat: c.lat(), lng: c.lng() });
    });

    // Click on POI or empty area
    map.addListener("click", (event: google.maps.MapMouseEvent & { placeId?: string }) => {
      console.log("🗺️ Clic carte:", event);
      if (pickMode) return;
      if (markerClickedRef.current) return;
      
      if (event.placeId) {
        (event as any).stop?.();
        console.log("🔍 Clic POI détecté, placeId:", event.placeId);
        const service = new google.maps.places.PlacesService(map);
        service.getDetails({
          placeId: event.placeId,
          fields: ["name", "geometry", "formatted_address", "types", "rating", "user_ratings_total", "opening_hours", "formatted_phone_number", "website", "reviews", "photos"],
        }, (place, status) => {
          console.log('--- DIAGNOSTIC PLACES API ---');
          console.log('Status:', status);
          console.log('Nom du lieu:', place?.name);
          console.log('Nombre de photos:', place?.photos?.length ?? 0);
          console.log('Nombre d\'avis:', place?.reviews?.length ?? 0);
          console.log('Premier avis:', place?.reviews?.[0] ?? 'aucun');
          console.log('Première photo URL:', place?.photos?.[0]?.getUrl({ maxWidth: 400 }) ?? 'aucune');
          console.log('-----------------------------');
          if (status === 'REQUEST_DENIED') {
            console.error('❌ Places API non activée ou clé API invalide');
          }
          if (status === 'OVER_QUERY_LIMIT') {
            console.error('❌ Quota dépassé');
          }
          if (status === google.maps.places.PlacesServiceStatus.OK && place?.geometry?.location) {
            const photos = place.photos
              ? place.photos.slice(0, 5).map(p => p.getUrl({ maxWidth: 400, maxHeight: 300 }))
              : [];
            const reviews = place.reviews
              ? place.reviews.slice(0, 5).map(r => ({
                  author: r.author_name || "Anonyme",
                  avatar: r.profile_photo_url || null,
                  rating: r.rating,
                  text: r.text || "",
                  time: r.relative_time_description || "",
                }))
              : [];
            const universalPlace: UniversalPlace = {
              name: place.name || "Lieu",
              address: place.formatted_address || "",
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
              types: place.types || [],
              rating: place.rating,
              reviewsTotal: (place as any).user_ratings_total || 0,
              phone: place.formatted_phone_number || undefined,
              website: place.website || undefined,
              opening_hours: place.opening_hours?.isOpen?.()
                ? "🟢 Ouvert maintenant"
                : place.opening_hours?.weekday_text?.join(" • ") || undefined,
              isPetFriendly: false,
              photos,
              reviews,
            };
            const pixel = event.latLng ? getPixelFromLatLng(map, event.latLng) : { x: window.innerWidth / 2, y: window.innerHeight / 2 };
            setPopupData({ place: universalPlace, position: pixel });
          } else {
            console.error("❌ Erreur Places API:", status);
          }
        });
      } else if (event.latLng) {
        // Empty area click
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ location: event.latLng }, (results, status) => {
          if (status === "OK" && results?.[0]) {
            const universalPlace: UniversalPlace = {
              name: results[0].formatted_address,
              address: results[0].formatted_address,
              lat: event.latLng!.lat(),
              lng: event.latLng!.lng(),
              types: ["point_on_map"],
              isPetFriendly: false,
            };
            const pixel = getPixelFromLatLng(map, event.latLng!);
            setPopupData({ place: universalPlace, position: pixel });
          }
        });
      }
    });

    // Right-click for point selection
    map.addListener("rightclick", (event: google.maps.MapMouseEvent) => {
      if (!event.latLng) return;
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ location: event.latLng }, (results, status) => {
        if (status === "OK" && results?.[0]) {
          const universalPlace: UniversalPlace = {
            name: results[0].formatted_address,
            address: results[0].formatted_address,
            lat: event.latLng!.lat(),
            lng: event.latLng!.lng(),
            types: ["point_on_map"],
            isPetFriendly: false,
          };
          const pixel = getPixelFromLatLng(map, event.latLng!);
          setPopupData({ place: universalPlace, position: pixel });
        }
      });
    });

    // Geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setCenter(loc); map.panTo(loc);
        },
        () => loadPlaces(center.lat, center.lng, radiusKm, activeCategory)
      );
    } else {
      loadPlaces(center.lat, center.lng, radiusKm, activeCategory);
    }

  }, [isLoaded]);

  // Helper to convert LatLng to pixel
  function getPixelFromLatLng(map: google.maps.Map, latLng: google.maps.LatLng): { x: number; y: number } {
    const mapDiv = map.getDiv();
    const rect = mapDiv.getBoundingClientRect();
    const proj = map.getProjection();
    if (!proj) return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    const topRight = proj.fromLatLngToPoint(map.getBounds()!.getNorthEast()!);
    const bottomLeft = proj.fromLatLngToPoint(map.getBounds()!.getSouthWest()!);
    const point = proj.fromLatLngToPoint(latLng);
    if (!topRight || !bottomLeft || !point) return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    const scale = Math.pow(2, map.getZoom()!);
    const x = rect.left + (point.x - bottomLeft.x) * scale;
    const y = rect.top + (point.y - topRight.y) * scale;
    return { x, y };
  }

  // React to center/radius/category changes
  useEffect(() => {
    if (isLoaded && mapInstanceRef.current) loadPlaces(center.lat, center.lng, radiusKm, activeCategory);
  }, [center, radiusKm, activeCategory, isLoaded]);

  // React to external search query
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
    itineraryPolylineRef.current?.setMap(null);
    itineraryMarkersRef.current.forEach((m) => (m.map = null));
    itineraryMarkersRef.current = [];
    if (!itineraryData) return;

    const map = mapInstanceRef.current;
    const polyline = new google.maps.Polyline({ path: itineraryData.routePath, strokeColor: "#FF6B35", strokeWeight: 5, strokeOpacity: 0.8, map });
    itineraryPolylineRef.current = polyline;

    const markers: google.maps.marker.AdvancedMarkerElement[] = [];
    const startEl = document.createElement("div");
    startEl.innerHTML = `<div style="background:#4CAF50;color:white;padding:6px 12px;border-radius:20px;font-weight:700;font-size:13px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)">🏁 Départ</div>`;
    markers.push(new google.maps.marker.AdvancedMarkerElement({ position: itineraryData.origin, content: startEl, map }));

    const endEl = document.createElement("div");
    endEl.innerHTML = `<div style="background:#E53935;color:white;padding:6px 12px;border-radius:20px;font-weight:700;font-size:13px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)">🏁 Arrivée</div>`;
    markers.push(new google.maps.marker.AdvancedMarkerElement({ position: itineraryData.destination, content: endEl, map }));

    const catColors: Record<string, string> = { restaurant: "#FF6B35", hotel: "#4285F4", outdoor: "#4CAF50", services: "#E53935", shop: "#9C27B0" };
    itineraryData.steps.forEach((step, i) => {
      const color = catColors[step.category] || "#9E9E9E";
      const el = document.createElement("div");
      el.innerHTML = `<div style="background:${color};color:white;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:15px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3);cursor:pointer" title="${step.name}">${i + 1}</div>`;
      const marker = new google.maps.marker.AdvancedMarkerElement({ position: { lat: step.latitude, lng: step.longitude }, content: el, map });
      marker.addEventListener("gmp-click", () => onStepClick?.(step.latitude, step.longitude));
      markers.push(marker);
    });

    itineraryData.pausePoints.forEach((pp) => {
      const el = document.createElement("div");
      el.innerHTML = `<div style="background:#FFF;color:#FF6B35;padding:4px 8px;border-radius:12px;font-size:11px;border:2px solid #FF6B35;box-shadow:0 2px 4px rgba(0,0,0,0.2)" title="Pause conseillée">🐾 Pause</div>`;
      markers.push(new google.maps.marker.AdvancedMarkerElement({ position: pp, content: el, map }));
    });

    itineraryMarkersRef.current = markers;
    const bounds = new google.maps.LatLngBounds();
    itineraryData.routePath.forEach((p) => bounds.extend(p));
    map.fitBounds(bounds, 50);
  }, [itineraryData, isLoaded, onStepClick]);

  // Pick mode
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !isLoaded) return;

    if (pickMode) {
      map.setOptions({ draggableCursor: "crosshair" });
    } else {
      map.setOptions({ draggableCursor: undefined });
      if (pickMarkerRef.current) { pickMarkerRef.current.map = null; pickMarkerRef.current = null; }
      return;
    }

    const listener = map.addListener("click", (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      const latLng = { lat: e.latLng.lat(), lng: e.latLng.lng() };
      if (pickMarkerRef.current) pickMarkerRef.current.map = null;
      if (pickMode === "origin") setOriginPoint(latLng);
      else setDestPoint(latLng);

      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ location: latLng }, (results, status) => {
        const address = status === "OK" && results?.[0] ? results[0].formatted_address : `${latLng.lat.toFixed(4)}, ${latLng.lng.toFixed(4)}`;
        window.dispatchEvent(new CustomEvent("itinerary-pick", { detail: { location: latLng, text: address } }));
      });
    });

    return () => { google.maps.event.removeListener(listener); map.setOptions({ draggableCursor: undefined }); };
  }, [pickMode, isLoaded]);

  const clearMarkers = useCallback(() => {
    markersRef.current.forEach((m) => (m.map = null));
    markersRef.current = [];
    clustererRef.current?.clearMarkers();
  }, []);

  const loadPlaces = useCallback(async (lat: number, lng: number, radius: number, category: string | null) => {
    setSearching(true);
    const { data, error } = await supabase.rpc("get_nearby_pet_places", { user_lat: lat, user_lon: lng, radius_km: radius, cat_filter: category, dogs_only: false });
    if (error) { console.error("Supabase RPC error:", error); setSearching(false); return; }

    const results: PetPlace[] = (data || []).map((d: any) => ({ ...d, id: d.id as string }));
    setPlaces(results);
    clearMarkers();

    const map = mapInstanceRef.current;
    if (!map) { setSearching(false); return; }

    const newMarkers: google.maps.marker.AdvancedMarkerElement[] = [];
    results.forEach((place) => {
      const content = createMarkerContent(place.category, place.accepts_dogs);
      const marker = new google.maps.marker.AdvancedMarkerElement({
        position: { lat: place.latitude, lng: place.longitude }, title: place.name, content,
      });
      content.addEventListener("mousedown", () => { markerClickedRef.current = true; });
      marker.addEventListener("gmp-click", () => {
        markerClickedRef.current = true;
        setTimeout(() => { markerClickedRef.current = false; }, 300);
        const googlePlaceId = place.google_place_id || null;
        
        const fallbackPlace: UniversalPlace = {
          name: place.name,
          address: place.address || place.city || "",
          lat: place.latitude,
          lng: place.longitude,
          category: place.category,
          city: place.city || undefined,
          phone: place.phone || undefined,
          opening_hours: place.opening_hours || undefined,
          rating: place.rating || undefined,
          website: place.website || undefined,
          isPetFriendly: true,
        };

        map.panTo({ lat: place.latitude, lng: place.longitude });

        if (googlePlaceId && map) {
          // Fetch enriched data from Places API
          const service = new google.maps.places.PlacesService(map);
          service.getDetails({
            placeId: googlePlaceId,
            fields: ["name", "geometry", "formatted_address", "types", "rating", "user_ratings_total", "opening_hours", "formatted_phone_number", "website", "reviews", "photos"],
          }, (gPlace, status) => {
            console.log('--- DIAGNOSTIC PLACES API (pet-friendly) ---');
            console.log('Status:', status);
            console.log('Photos:', gPlace?.photos?.length ?? 0);
            console.log('Avis:', gPlace?.reviews?.length ?? 0);
            console.log('--------------------------------------------');

            if (status === google.maps.places.PlacesServiceStatus.OK && gPlace) {
              const photos = gPlace.photos
                ? gPlace.photos.slice(0, 5).map(p => p.getUrl({ maxWidth: 400, maxHeight: 300 }))
                : [];
              const reviews = gPlace.reviews
                ? gPlace.reviews.slice(0, 5).map(r => ({
                    author: r.author_name || "Anonyme",
                    avatar: r.profile_photo_url || null,
                    rating: r.rating,
                    text: r.text || "",
                    time: r.relative_time_description || "",
                  }))
                : [];
              const enriched: UniversalPlace = {
                ...fallbackPlace,
                rating: gPlace.rating || fallbackPlace.rating,
                reviewsTotal: (gPlace as any).user_ratings_total || 0,
                phone: gPlace.formatted_phone_number || fallbackPlace.phone,
                website: gPlace.website || fallbackPlace.website,
                opening_hours: gPlace.opening_hours?.isOpen?.()
                  ? "🟢 Ouvert maintenant"
                  : gPlace.opening_hours?.weekday_text?.join(" • ") || fallbackPlace.opening_hours,
                photos,
                reviews,
                placeId: googlePlaceId,
              };
              setPopupData({ place: enriched, position: { x: window.innerWidth / 2, y: window.innerHeight / 2 }, petPlace: place });
            } else {
              // Fallback to DB data
              setPopupData({ place: fallbackPlace, position: { x: window.innerWidth / 2, y: window.innerHeight / 2 }, petPlace: place });
            }
          });
        } else {
          // No placeId — show DB data directly
          setPopupData({ place: fallbackPlace, position: { x: window.innerWidth / 2, y: window.innerHeight / 2 }, petPlace: place });
        }
      });
      newMarkers.push(marker);
    });

    markersRef.current = newMarkers;
    clustererRef.current?.addMarkers(newMarkers);

    // Load flagged places
    const existingIds = results.map(p => p.id);
    if (existingIds.length > 0) {
      const { data: flaggedData } = await supabase
        .from("pet_friendly_places")
        .select("id, name, latitude, longitude, report_count")
        .eq("is_flagged", true)
        .not("id", "in", `(${existingIds.join(",")})`);

      if (flaggedData && flaggedData.length > 0 && map) {
        const flaggedMarkers: google.maps.marker.AdvancedMarkerElement[] = [];
        flaggedData.forEach((fp) => {
          const el = document.createElement("div");
          el.style.cssText = "position:relative;cursor:pointer;";
          el.innerHTML = `
            <div style="font-size:28px;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.3))">⚠️</div>
            <div style="position:absolute;top:-4px;right:-6px;background:#E53935;color:white;font-size:9px;font-weight:700;width:16px;height:16px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:1.5px solid white">${fp.report_count || 0}</div>
          `;
          const marker = new google.maps.marker.AdvancedMarkerElement({
            position: { lat: fp.latitude, lng: fp.longitude }, content: el, map,
          });
          marker.addEventListener("gmp-click", () => {
            toast.warning(`⚠️ Ce lieu a été signalé ${fp.report_count || 0} fois par la communauté comme potentiellement non pet-friendly.`);
          });
          flaggedMarkers.push(marker);
        });
        markersRef.current.push(...flaggedMarkers);
        clustererRef.current?.addMarkers(flaggedMarkers);
      }
    }

    setSearching(false);
  }, [clearMarkers]);

  // Manage A/B markers and dashed preview line
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !isLoaded) return;

    if (originMarkerRef.current) originMarkerRef.current.map = null;
    if (originPoint) {
      const el = document.createElement("div");
      el.innerHTML = `<div style="background:#4CAF50;color:white;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);animation:pulse 2s infinite">A</div>`;
      originMarkerRef.current = new google.maps.marker.AdvancedMarkerElement({ position: originPoint, content: el, map });
    }

    if (destMarkerRef.current) destMarkerRef.current.map = null;
    if (destPoint) {
      const el = document.createElement("div");
      el.innerHTML = `<div style="background:#F44336;color:white;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);animation:pulse 2s infinite">B</div>`;
      destMarkerRef.current = new google.maps.marker.AdvancedMarkerElement({ position: destPoint, content: el, map });
    }

    previewLineRef.current?.setMap(null);
    if (originPoint && destPoint) {
      previewLineRef.current = new google.maps.Polyline({
        path: [originPoint, destPoint], strokeColor: "#FF6B35", strokeWeight: 3, strokeOpacity: 0,
        icons: [{ icon: { path: "M 0,-1 0,1", strokeOpacity: 0.6, scale: 3 }, offset: "0", repeat: "15px" }], map,
      });
    }
  }, [originPoint, destPoint, isLoaded]);

  useEffect(() => {
    if (itineraryData) previewLineRef.current?.setMap(null);
  }, [itineraryData]);

  const handleLocateMe = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setCenter(loc); mapInstanceRef.current?.panTo(loc); mapInstanceRef.current?.setZoom(14);
    });
  };

  const handleToggleFav = (place: PetPlace) => {
    if (!onToggleFavorite) return;
    const added = onToggleFavorite({
      id: place.id,
      name: place.name,
      category: place.category,
      subcategory: place.subcategory,
      address: place.address,
      city: place.city,
      lat: place.latitude,
      lng: place.longitude,
      phone: place.phone,
      website: place.website,
      accepts_dogs: place.accepts_dogs,
      accepts_cats: place.accepts_cats,
    });
    toast(added ? `❤️ ${place.name} ajouté aux favoris` : `💔 ${place.name} retiré des favoris`);
  };

  return (
    <section id="explore" className="py-8 bg-secondary/50">
      <div className="container px-4">
        <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide mb-2">
          {CATEGORY_FILTERS.map((f) => (
            <button
              key={f.label}
              onClick={() => setActiveCategory(f.key)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                activeCategory === f.key ? "bg-primary text-primary-foreground" : "bg-card border border-border text-foreground hover:bg-muted"
              }`}
            >
              {f.emoji} {f.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4 mb-4 px-1">
          <span className="text-xs text-muted-foreground whitespace-nowrap">Rayon :</span>
          <Slider min={5} max={50} step={5} value={[radiusKm]} onValueChange={(v) => setRadiusKm(v[0])} className="flex-1 max-w-xs" />
          <span className="text-sm font-semibold text-foreground w-14 text-right">{radiusKm} km</span>
        </div>

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
          <div ref={mapRef} className="w-full h-full" style={{ display: isLoaded && !loadError ? "block" : "none" }} />

          <button onClick={handleLocateMe} className="absolute bottom-4 right-4 z-10 p-3 bg-card rounded-full shadow-lg border border-border hover:bg-muted transition-colors" title="Ma position">
            <Locate className="w-5 h-5 text-primary" />
          </button>
        </div>

        <p className="text-center text-sm text-muted-foreground mb-6">
          <span className="font-semibold text-foreground">{places.length}</span> lieu{places.length !== 1 ? "x" : ""} pet-friendly trouvé{places.length !== 1 ? "s" : ""} dans un rayon de <span className="font-semibold text-foreground">{radiusKm} km</span>
        </p>
      </div>

      {popupData && (
        <MarkerPopup
          place={popupData.place}
          position={popupData.position}
          onClose={() => setPopupData(null)}

          onSetOrigin={() => {
            const p = popupData.place;
            setOriginPoint({ lat: p.lat, lng: p.lng });
            window.dispatchEvent(new CustomEvent("marker-set-itinerary", {
              detail: { type: "origin", location: { lat: p.lat, lng: p.lng }, text: p.name },
            }));
            toast.success(`✓ Départ : ${p.name}`);
            setPopupData(null);
            onOpenItinerary?.();
          }}
          onSetDestination={() => {
            const p = popupData.place;
            setDestPoint({ lat: p.lat, lng: p.lng });
            window.dispatchEvent(new CustomEvent("marker-set-itinerary", {
              detail: { type: "destination", location: { lat: p.lat, lng: p.lng }, text: p.name },
            }));
            toast.success(`✓ Arrivée : ${p.name}`);
            setPopupData(null);
            onOpenItinerary?.();
          }}
          onShowInfo={popupData.petPlace ? () => {
            setSelectedPlace(popupData.petPlace!);
            setPopupData(null);
          } : undefined}
          isFavorite={isFavorite?.(popupData.petPlace?.id || popupData.place.placeId || `custom_${popupData.place.lat}_${popupData.place.lng}`)}
          onToggleFavorite={() => {
            if (!onToggleFavorite) return;
            const p = popupData.place;
            const id = popupData.petPlace?.id || p.placeId || `custom_${p.lat}_${p.lng}`;
            const category = popupData.petPlace?.category || detectCategoryFromTypes(p.types);
            const added = onToggleFavorite({
              id,
              name: p.name,
              category,
              address: p.address || null,
              city: p.city || null,
              lat: p.lat,
              lng: p.lng,
              phone: p.phone || null,
              website: p.website || null,
              accepts_dogs: p.isPetFriendly,
              rating: p.rating || null,
              placeId: p.placeId || null,
              isPetFriendly: p.isPetFriendly,
              source: p.isPetFriendly ? "supabase" : "google_maps",
            });
            toast(added ? `❤️ ${p.name} ajouté aux favoris` : `💔 ${p.name} retiré des favoris`);
          }}
          onAddWaypoint={() => {
            const p = popupData.place;
            // Smart add: if no origin → set as origin, if no dest → set as dest, else → waypoint
            if (!originPoint) {
              setOriginPoint({ lat: p.lat, lng: p.lng });
              window.dispatchEvent(new CustomEvent("marker-set-itinerary", {
                detail: { type: "origin", location: { lat: p.lat, lng: p.lng }, text: p.name },
              }));
              toast.success(`🚩 Départ : ${p.name}`);
            } else if (!destPoint) {
              setDestPoint({ lat: p.lat, lng: p.lng });
              window.dispatchEvent(new CustomEvent("marker-set-itinerary", {
                detail: { type: "destination", location: { lat: p.lat, lng: p.lng }, text: p.name },
              }));
              toast.success(`🏁 Arrivée : ${p.name}`);
            } else {
              window.dispatchEvent(new CustomEvent("itinerary-add-waypoint", {
                detail: { name: p.name, lat: p.lat, lng: p.lng, category: popupData.petPlace?.category || detectCategoryFromTypes(p.types), isPetFriendly: p.isPetFriendly },
              }));
              toast.success(`⛳ Étape : ${p.name}`);
            }
            setPopupData(null);
            onOpenItinerary?.();
          }}
          isInDatabase={!!popupData.petPlace}
          onReport={popupData.petPlace ? () => setReportModal({ open: true, placeId: popupData.petPlace!.id, placeName: popupData.place.name }) : undefined}
        />
      )}

      {selectedPlace && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setSelectedPlace(null)} />
          <PlaceDetailPanel
            place={selectedPlace}
            onClose={() => setSelectedPlace(null)}
            isFavorite={isFavorite?.(selectedPlace.id)}
            onToggleFavorite={() => handleToggleFav(selectedPlace)}
            onReport={() => setReportModal({ open: true, placeId: selectedPlace.id, placeName: selectedPlace.name })}
          />
        </>
      )}

      <ReportModal
        open={reportModal.open}
        onClose={() => setReportModal({ open: false, placeId: null, placeName: "" })}
        placeId={reportModal.placeId}
        placeName={reportModal.placeName}
        onLoginRequired={() => {
          setReportModal({ open: false, placeId: null, placeName: "" });
          window.dispatchEvent(new CustomEvent("open-auth-modal"));
        }}
      />
    </section>
  );
};

export default MapSection;
