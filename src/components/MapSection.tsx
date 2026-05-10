import { useState, useEffect, useRef, useCallback } from "react";
import AdminCategoryBar from "./AdminCategoryBar";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import Supercluster from "supercluster";
import { Camera, Loader2, Locate, Plus, SlidersHorizontal, X, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import PlaceDetailPanel, { type PetPlace } from "./PlaceDetailPanel";
import MarkerPopup, { type UniversalPlace } from "./MarkerPopup";
import ReportModal from "./ReportModal";
import StrayReportModal from "./StrayReportModal";
import StrayDetailPanel, { type StrayReport } from "./StrayDetailPanel";
import LostPetModal from "./LostPetModal";
import LostPetDetailPanel, { type LostPet } from "./LostPetDetailPanel";
import { toast } from "sonner";
import { useAuthContext } from "@/contexts/AuthContext";
import { useHandedness } from "@/contexts/HandednessContext";
import type { FavoritePlace } from "@/hooks/useFavorites";
import { detectCategoryFromTypes } from "@/hooks/useFavorites";
import type { ItineraryMapData } from "./itinerary/types";
import type { PickMode } from "./itinerary/ItineraryPanel";

const MAPBOX_TOKEN = (import.meta.env.VITE_MAPBOX_TOKEN as string) || "pk.eyJ1IjoiZWx2aW5hZ2QiLCJhIjoiY21vcjMwNHU5MmFodzJxc2FnOTc1bHVsYiJ9.zkIqku9ZIn5_h674NQLX3w";
const GOOGLE_API_KEY = (import.meta.env.VITE_GOOGLE_API_KEY as string) || "AIzaSyDP4zY29gT-tXDxcszWHBWSC8_14AEmiYg";

// Charge la lib Google Places une seule fois (lazy, sans afficher de carte Google)
let googlePlacesLoading = false;
function loadGooglePlacesLib(): Promise<void> {
  return new Promise((resolve) => {
    if ((window as any).google?.maps?.places) { resolve(); return; }
    if (googlePlacesLoading) {
      const wait = setInterval(() => {
        if ((window as any).google?.maps?.places) { clearInterval(wait); resolve(); }
      }, 100);
      return;
    }
    googlePlacesLoading = true;
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_API_KEY}&libraries=places`;
    script.async = true;
    // Wait for places lib to be truly ready, not just the script tag to load
    script.onload = () => {
      const wait = setInterval(() => {
        if ((window as any).google?.maps?.places) { clearInterval(wait); resolve(); }
      }, 50);
    };
    document.head.appendChild(script);
  });
}

type GooglePlaceResult = { photos: string[]; reviews: any[]; rating?: number; reviewsTotal?: number; phone?: string; website?: string; opening_hours?: string };

function extractPlaceResult(place: any): GooglePlaceResult {
  const g = (window as any).google;
  const photos = place.photos ? place.photos.slice(0, 5).map((p: any) => p.getUrl({ maxWidth: 400, maxHeight: 300 })) : [];
  const reviews = place.reviews ? place.reviews.slice(0, 5).map((r: any) => ({ author: r.author_name || "Anonyme", avatar: r.profile_photo_url || null, rating: r.rating, text: r.text || "", time: r.relative_time_description || "" })) : [];
  return {
    photos, reviews,
    rating: place.rating,
    reviewsTotal: place.user_ratings_total,
    phone: place.formatted_phone_number,
    website: place.website,
    opening_hours: place.opening_hours?.isOpen?.() ? "🟢 Ouvert maintenant" : place.opening_hours?.weekday_text?.join(" • "),
  };
}

function fetchGooglePlaceDetails(placeId: string): Promise<GooglePlaceResult> {
  return loadGooglePlacesLib().then(() => new Promise((resolve) => {
    const div = document.createElement("div");
    document.body.appendChild(div);
    const g = (window as any).google;
    const service = new g.maps.places.PlacesService(div);
    service.getDetails(
      { placeId, fields: ["rating", "user_ratings_total", "opening_hours", "formatted_phone_number", "website", "reviews", "photos"] },
      (place: any, status: string) => {
        document.body.removeChild(div);
        if (status !== g.maps.places.PlacesServiceStatus.OK || !place) { resolve({ photos: [], reviews: [] }); return; }
        resolve(extractPlaceResult(place));
      }
    );
  }));
}

function fetchGooglePlaceByLocation(lat: number, lng: number, name: string): Promise<GooglePlaceResult> {
  return loadGooglePlacesLib().then(() => new Promise((resolve) => {
    const div = document.createElement("div");
    document.body.appendChild(div);
    const g = (window as any).google;
    const service = new g.maps.places.PlacesService(div);
    service.nearbySearch({ location: { lat, lng }, radius: 80, keyword: name }, (results: any[], status: string) => {
      if (status !== g.maps.places.PlacesServiceStatus.OK || !results?.[0]?.place_id) {
        document.body.removeChild(div);
        resolve({ photos: [], reviews: [] });
        return;
      }
      const placeId = results[0].place_id;
      service.getDetails(
        { placeId, fields: ["rating", "user_ratings_total", "opening_hours", "formatted_phone_number", "website", "reviews", "photos"] },
        (place: any, detailStatus: string) => {
          document.body.removeChild(div);
          if (detailStatus !== g.maps.places.PlacesServiceStatus.OK || !place) { resolve({ photos: [], reviews: [] }); return; }
          resolve(extractPlaceResult(place));
        }
      );
    });
  }));
}

const PANEL_EDGE_ZONE = 44; // px from screen edge that triggers panel swipe

const CATEGORY_FILTERS = [
  { key: null,              label: "Tous",              emoji: "🐾" },
  { key: "__strays__",      label: "Animaux errants",   emoji: "🚨" },
  { key: "__lost__",        label: "Animaux perdus",    emoji: "🆘" },
  { key: "veterinaire",    label: "Vétérinaires",      emoji: "🏥" },
  { key: "restaurant",     label: "Restaurants",    emoji: "🍽️" },
  { key: "hotel",          label: "Hôtels",         emoji: "🛏️" },
  { key: "outdoor",        label: "Parcs & Nature", emoji: "🌿" },
  { key: "parc_chiens",    label: "Parcs à chiens", emoji: "🐕" },
  { key: "shop",           label: "Pet Shops",      emoji: "🛒" },
  { key: "pension",        label: "Pension",        emoji: "🏠" },
  { key: "toiletteur",     label: "Toiletteurs",    emoji: "🛁" },
  { key: "educateur",      label: "Éducateurs",     emoji: "🎓" },
  { key: "masseur",        label: "Masseurs / Ostéo", emoji: "💆" },
  { key: "pet_sitter",     label: "Pet Sitters",    emoji: "🏡" },
  { key: "dog_walker",     label: "Dog Walkers",    emoji: "🦮" },
  { key: "camping",        label: "Camping",        emoji: "⛺" },
  { key: "plage",          label: "Plages",         emoji: "🏖️" },
  { key: "loisir",         label: "Loisirs",        emoji: "🎯" },
  { key: "refuge",         label: "Refuges",        emoji: "🏚️" },
  { key: "spa",            label: "SPA",            emoji: "🐾" },
  { key: "cafe_animalier", label: "Cafés animaux",  emoji: "☕" },
  { key: "aeroport",       label: "Aéroports",      emoji: "✈️" },
  { key: "aire_repos",     label: "Aires de repos", emoji: "🛣️" },
  { key: "transport",      label: "Transport",      emoji: "🚇" },
  { key: "evenement",      label: "Événements",     emoji: "📅" },
  { key: "other",          label: "Autres",         emoji: "📍" },
];

const CATEGORY_COLORS: Record<string, string> = {
  veterinaire:    "#E53935",
  restaurant:     "#FF6B35",
  hotel:          "#4285F4",
  outdoor:        "#4CAF50",
  parc_chiens:    "#8BC34A",
  shop:           "#9C27B0",
  pension:        "#3F51B5",
  toiletteur:     "#00BCD4",
  educateur:      "#FF9800",
  masseur:        "#E91E63",
  pet_sitter:     "#607D8B",
  dog_walker:     "#009688",
  camping:        "#33691E",
  plage:          "#0288D1",
  loisir:         "#F57C00",
  refuge:         "#5D4037",
  spa:            "#E65100",
  cafe_animalier: "#6D4C41",
  aeroport:       "#455A64",
  aire_repos:     "#546E7A",
  transport:      "#1565C0",
  comportementaliste: "#5C6BC0",
  evenement:      "#7B1FA2",
  other:          "#9E9E9E",
};

const CATEGORY_EMOJIS: Record<string, string> = {
  veterinaire:    "🏥",
  restaurant:     "🍽️",
  hotel:          "🛏️",
  outdoor:        "🌿",
  parc_chiens:    "🐕",
  shop:           "🛒",
  pension:        "🏠",
  toiletteur:     "🛁",
  educateur:      "🎓",
  masseur:        "💆",
  pet_sitter:     "🏡",
  dog_walker:     "🦮",
  camping:        "⛺",
  plage:          "🏖️",
  loisir:         "🎯",
  refuge:         "🏚️",
  spa:            "🐾",
  cafe_animalier: "☕",
  comportementaliste: "🧠",
  aeroport:       "✈️",
  aire_repos:     "🛣️",
  transport:      "🚇",
  evenement:      "📅",
  other:          "📍",
};

const POI_LAYERS = ["poi-label", "transit-label", "poi-scalerank1", "poi-scalerank2", "poi-scalerank3", "poi-scalerank4"];

interface MapSectionProps {
  searchQuery?: string;
  itineraryData?: ItineraryMapData | null;
  onStepClick?: (lat: number, lng: number) => void;
  pickMode?: PickMode;
  isFavorite?: (id: string) => boolean;
  onToggleFavorite?: (place: Omit<FavoritePlace, "savedAt">) => boolean;
  onOpenItinerary?: () => void;
  frozen?: boolean;
}

const MapSection = ({ searchQuery, itineraryData, onStepClick, pickMode, isFavorite, onToggleFavorite, onOpenItinerary, frozen }: MapSectionProps) => {
  const { user } = useAuthContext();
  const isMapAdmin = ["elvin.agd@gmail.com", "artistfx.mp4@gmail.com"].includes(user?.email ?? "");
  const { isLeftHanded } = useHandedness();
  const fabSide    = isLeftHanded ? "left-4"  : "right-4";
  const filterSide = isLeftHanded ? "right-4" : "left-4";
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const strayMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const lostPetMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const itineraryMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const originMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const destMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const scRef = useRef(new Supercluster<{ id: string; placeIndex: number; category: string; accepts_dogs: boolean }>({ radius: 50, maxZoom: 16, minPoints: 3 }));
  const scLoadedRef = useRef(false);
  const markerClickedRef = useRef(false);
  const prevPopupDataRef = useRef<{ place: UniversalPlace; position: { x: number; y: number }; petPlace?: PetPlace } | null>(null);
  const selectedPlaceRef = useRef<PetPlace | null>(null);
  const closePanelRef = useRef<() => void>(() => {});
  const pickListenerRef = useRef<((e: mapboxgl.MapMouseEvent) => void) | null>(null);

  const [isLoaded, setIsLoaded] = useState(false);
  const [places, setPlaces] = useState<PetPlace[]>([]);
  const [center, setCenter] = useState({ lat: 48.8566, lng: 2.3522 });
  const [searching, setSearching] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<PetPlace | null>(null);
  const [activeCategories, setActiveCategories] = useState<string[]>([]);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [filterSnap, setFilterSnap] = useState<"half" | "full">("half");
  const [filterDragging, setFilterDragging] = useState(false);
  const [filterDragDelta, setFilterDragDelta] = useState(0);
  const filterIsDragging    = useRef(false);
  const filterDragStartY    = useRef(0);
  const filterLastTouchY    = useRef(0);
  const filterLastTouchTime = useRef(0);
  const filterLastVelocity  = useRef(0);

  // Freeze map while filter sheet is open; reset snap to "half" on each open
  useEffect(() => {
    if (showFilterSheet) {
      setFilterSnap("half");
      setFilterDragDelta(0);
      window.dispatchEvent(new Event("map-freeze"));
    } else {
      window.dispatchEvent(new Event("map-unfreeze"));
    }
  }, [showFilterSheet]);
  const [radiusKm, setRadiusKm] = useState(20);
  const [popupData, setPopupData] = useState<{ place: UniversalPlace; position: { x: number; y: number }; petPlace?: PetPlace } | null>(null);
  const [originPoint, setOriginPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [destPoint, setDestPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [reportModal, setReportModal] = useState<{ open: boolean; placeId: string | null; placeName: string }>({ open: false, placeId: null, placeName: "" });
  const [strayModal, setStrayModal] = useState(false);
  const [strayReports, setStrayReports] = useState<StrayReport[]>([]);
  const [selectedStray, setSelectedStray] = useState<StrayReport | null>(null);
  const [lostPetModal, setLostPetModal] = useState(false);
  const [lostPets, setLostPets] = useState<LostPet[]>([]);
  const [selectedLostPet, setSelectedLostPet] = useState<LostPet | null>(null);
  const [locating, setLocating] = useState(false);
  const [closingPanel, setClosingPanel] = useState(false);
  const [panelVisible, setPanelVisible] = useState(false);
  const [showLegend, setShowLegend] = useState(false);

  // Freeze map camera while panels are open/dragging.
  // Two-layer defence:
  //   1. disable() Mapbox handlers on freeze (prevents most panning)
  //   2. onMove compensation: if camera still moves, jumpTo saved position instantly.
  //      isResetting flag prevents the jumpTo from triggering another reset loop
  //      (jumpTo fires 'move' synchronously, so isResetting is still true when it fires).
  useEffect(() => {
    if (!isLoaded) return;
    const map = mapRef.current;
    if (!map) return;

    const state = {
      frozen:      false,
      isResetting: false,
      center:      map.getCenter(),
      zoom:        map.getZoom(),
      bearing:     map.getBearing(),
      pitch:       map.getPitch(),
    };

    const onFreeze = () => {
      state.frozen  = true;
      state.center  = map.getCenter();
      state.zoom    = map.getZoom();
      state.bearing = map.getBearing();
      state.pitch   = map.getPitch();
      // pointer-events: none is the most reliable block — no events reach the canvas
      // regardless of Mapbox's internal handler state
      map.getCanvas().style.pointerEvents = "none";
      map.dragPan.disable();
      map.dragRotate.disable();
      map.touchZoomRotate.disable();
      map.doubleClickZoom.disable();
      map.scrollZoom.disable();
    };

    const onUnfreeze = () => {
      state.frozen = false;
      map.getCanvas().style.pointerEvents = "";
      map.dragPan.enable();
      map.dragRotate.enable();
      map.touchZoomRotate.enable();
      map.doubleClickZoom.enable();
      map.scrollZoom.enable();
    };

    const onMove = () => {
      if (!state.frozen || state.isResetting) return;
      state.isResetting = true;
      map.stop();
      map.jumpTo({
        center:  state.center,
        zoom:    state.zoom,
        bearing: state.bearing,
        pitch:   state.pitch,
      });
      state.isResetting = false;
    };

    window.addEventListener("map-freeze",   onFreeze);
    window.addEventListener("map-unfreeze", onUnfreeze);
    map.on("move", onMove);

    return () => {
      window.removeEventListener("map-freeze",   onFreeze);
      window.removeEventListener("map-unfreeze", onUnfreeze);
      map.off("move", onMove);
    };
  }, [isLoaded]);

  // Freeze map while MarkerPopup is open so the camera never drifts during panel animation or drag
  useEffect(() => {
    if (!isLoaded) return;
    if (popupData) {
      window.dispatchEvent(new Event("map-freeze"));
    } else {
      window.dispatchEvent(new Event("map-unfreeze"));
    }
  }, [popupData, isLoaded]);

  // ── Render clusters ──
  const renderClusters = useCallback((currentPlaces: PetPlace[]) => {
    const map = mapRef.current;
    if (!map) return;
    if (!scLoadedRef.current) return;
    const bounds = map.getBounds();
    if (!bounds) return;
    const zoom = Math.floor(map.getZoom());

    const clusters = scRef.current.getClusters(
      [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()],
      zoom
    );

    const visible = new Set<string>();

    clusters.forEach((cluster: any) => {
      const [lng, lat] = cluster.geometry.coordinates;
      const id = cluster.properties.cluster
        ? `cluster-${cluster.properties.cluster_id}`
        : `place-${cluster.properties.id}`;
      visible.add(id);

      if (markersRef.current.has(id)) return;

      const el = document.createElement("div");

      if (cluster.properties.cluster) {
        el.style.cssText = "background:hsl(var(--primary));color:white;border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,.3);cursor:pointer;";
        el.textContent = String(cluster.properties.point_count);
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          const z = scRef.current.getClusterExpansionZoom(cluster.properties.cluster_id);
          map.flyTo({ center: [lng, lat], zoom: z });
        });
      } else {
        const place = currentPlaces[cluster.properties.placeIndex];
        if (!place) return;
        const color = place.accepts_dogs ? (CATEGORY_COLORS[place.category] || "#4CAF50") : "#9E9E9E";
        const emoji = CATEGORY_EMOJIS[place.category] || "📍";
        el.style.cssText = "display:flex;flex-direction:column;align-items:center;cursor:pointer;filter:drop-shadow(0 3px 6px rgba(0,0,0,.35));";
        el.innerHTML = `<div style="width:36px;height:36px;border-radius:50%;background:${color};border:2.5px solid white;display:flex;align-items:center;justify-content:center;font-size:18px;line-height:1;">${emoji}</div><div style="width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:12px solid ${color};margin-top:-1px;"></div>`;
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          markerClickedRef.current = true;
          setTimeout(() => { markerClickedRef.current = false; }, 300);
          const rect = mapContainerRef.current?.getBoundingClientRect();
          const pt = map.project([place.longitude, place.latitude]);
          const position = { x: (rect?.left || 0) + pt.x, y: (rect?.top || 0) + pt.y };

          const fallback: UniversalPlace = {
            name: place.name, address: place.address || place.city || "",
            lat: place.latitude, lng: place.longitude, category: place.category,
            city: place.city || undefined, phone: place.phone || undefined,
            opening_hours: place.opening_hours || undefined,
            rating: (place as any).google_rating || place.rating || undefined,
            website: place.website || undefined, isPetFriendly: true,
            photos: place.photo_url ? [place.photo_url] : [], reviews: [],
          };

          setPopupData({ place: fallback, position, petPlace: place });

          const googlePlaceId = (place as any).google_place_id;
          const enrichPromise = googlePlaceId
            ? fetchGooglePlaceDetails(googlePlaceId)
            : fetchGooglePlaceByLocation(place.latitude, place.longitude, place.name);
          enrichPromise.then((details) => {
            if (!details.reviews.length && !details.photos.length) return;
            setPopupData((prev) => prev ? {
              ...prev,
              place: {
                ...prev.place,
                rating: details.rating ?? prev.place.rating,
                reviewsTotal: details.reviewsTotal ?? prev.place.reviewsTotal,
                phone: details.phone || prev.place.phone,
                website: details.website || prev.place.website,
                opening_hours: details.opening_hours || prev.place.opening_hours,
                photos: details.photos.length ? details.photos : prev.place.photos,
                reviews: details.reviews,
                placeId: googlePlaceId,
              },
            } : prev);
          });
        });
      }

      const anchor = cluster.properties.cluster ? "center" : "bottom";
      const marker = new mapboxgl.Marker({ element: el, anchor }).setLngLat([lng, lat]).addTo(map);
      markersRef.current.set(id, marker);
    });

    // Remove invisible markers
    markersRef.current.forEach((marker, id) => {
      if (!visible.has(id)) { marker.remove(); markersRef.current.delete(id); }
    });
  }, []);

  const clearPlaceMarkers = useCallback(() => {
    markersRef.current.forEach((m) => m.remove());
    markersRef.current.clear();
  }, []);

  // ── Load places ──
  const loadPlaces = useCallback(async (lat: number, lng: number, radius: number, categories: string[]) => {
    setSearching(true);
    // Single category → pass to RPC; multiple → fetch all then filter client-side
    const rpcCat = categories.length === 1 ? categories[0] : null;
    const { data, error } = await supabase.rpc("get_nearby_pet_places", { user_lat: lat, user_lon: lng, radius_km: radius, cat_filter: rpcCat, dogs_only: false });
    if (error) { setSearching(false); return; }

    let results: PetPlace[] = (data || []).map((d: any) => ({ ...d, id: d.id as string }));
    if (categories.length > 1) results = results.filter(p => categories.includes(p.category));
    setPlaces(results);
    clearPlaceMarkers();

    const points = results.map((p, i) => ({
      type: "Feature" as const,
      properties: { cluster: false as const, id: p.id, placeIndex: i, category: p.category, accepts_dogs: p.accepts_dogs },
      geometry: { type: "Point" as const, coordinates: [p.longitude, p.latitude] as [number, number] },
    }));
    scRef.current.load(points);
    scLoadedRef.current = true;
    renderClusters(results);

    setSearching(false);
  }, [clearPlaceMarkers, renderClusters]);

  // ── Map init ──
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    if (!MAPBOX_TOKEN) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: [2.3522, 48.8566],
      zoom: 13,
      failIfMajorPerformanceCaveat: false,
      preserveDrawingBuffer: false,
      antialias: false,
    });

    map.on("load", () => {
      POI_LAYERS.forEach((layer) => { try { map.setLayoutProperty(layer, "visibility", "none"); } catch {} });
      setIsLoaded(true);

      // ── User location dot ──
      map.addSource("user-location", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
      map.addLayer({
        id: "user-location-halo",
        type: "circle",
        source: "user-location",
        paint: {
          "circle-radius": 22,
          "circle-color": "#2196F3",
          "circle-opacity": 0.18,
          "circle-stroke-width": 0,
        },
      });
      map.addLayer({
        id: "user-location-dot",
        type: "circle",
        source: "user-location",
        paint: {
          "circle-radius": 9,
          "circle-color": "#2196F3",
          "circle-stroke-width": 3,
          "circle-stroke-color": "#ffffff",
          "circle-opacity": 1,
        },
      });

      const updateUserDot = (pos: GeolocationPosition) => {
        const { latitude, longitude } = pos.coords;
        const src = map.getSource("user-location") as mapboxgl.GeoJSONSource;
        src?.setData({
          type: "FeatureCollection",
          features: [{ type: "Feature", geometry: { type: "Point", coordinates: [longitude, latitude] }, properties: {} }],
        });
      };

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            updateUserDot(pos);
            const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            map.panTo([loc.lng, loc.lat]);
            setCenter(loc);
            loadPlaces(loc.lat, loc.lng, 20, []);
          },
          () => loadPlaces(48.8566, 2.3522, 20, [])
        );
        watchIdRef.current = navigator.geolocation.watchPosition(
          updateUserDot,
          () => {},
          { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
        );
      } else {
        loadPlaces(48.8566, 2.3522, 20, []);
      }
    });

    map.on("moveend", () => {
      const c = map.getCenter();
      const bounds = map.getBounds();
      if (bounds) {
        const ne = bounds.getNorthEast();
        const R = 6371;
        const dLat = (ne.lat - c.lat) * Math.PI / 180;
        const dLng = (ne.lng - c.lng) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(c.lat * Math.PI / 180) * Math.cos(ne.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
        const km = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        setRadiusKm(Math.min(Math.max(Math.ceil(km), 1), 150));
      }
      setCenter({ lat: c.lat, lng: c.lng });
      renderClusters(places);
    });

    map.on("click", () => {
      if (markerClickedRef.current) return;
      if (selectedPlaceRef.current) closePanelRef.current();
      setPopupData(null);
    });

    // Long press (mobile) + right-click (desktop) → add a place
    let lpTimer: ReturnType<typeof setTimeout> | null = null;

    const triggerAddPlace = (lat: number, lng: number) => {
      fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&language=fr`)
        .then((r) => r.json())
        .then((data) => {
          const address = data.features?.[0]?.place_name || "";
          window.dispatchEvent(new CustomEvent("open-submit-modal", { detail: { lat, lng, address } }));
        });
    };

    map.on("touchstart", (e) => {
      if (e.originalEvent.touches.length !== 1) return;
      const { lat, lng } = e.lngLat;
      lpTimer = setTimeout(() => { lpTimer = null; triggerAddPlace(lat, lng); }, 600);
    });
    map.on("touchend", () => { if (lpTimer) { clearTimeout(lpTimer); lpTimer = null; } });
    map.on("touchmove", () => { if (lpTimer) { clearTimeout(lpTimer); lpTimer = null; } });
    map.on("contextmenu", (e) => {
      if (lpTimer) { clearTimeout(lpTimer); lpTimer = null; }
      triggerAddPlace(e.lngLat.lat, e.lngLat.lng);
    });

    mapRef.current = map;
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Re-render clusters when places change after moveend
  const placesRef = useRef(places);
  useEffect(() => { placesRef.current = places; }, [places]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoaded) return;
    const handler = () => renderClusters(placesRef.current);
    map.on("moveend", handler);
    return () => { map.off("moveend", handler); };
  }, [isLoaded, renderClusters]);

  // ── Pick mode ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoaded) return;

    if (pickListenerRef.current) {
      map.off("click", pickListenerRef.current);
      pickListenerRef.current = null;
      map.getCanvas().style.cursor = "";
    }

    if (pickMode) {
      map.getCanvas().style.cursor = "crosshair";
      const listener = (e: mapboxgl.MapMouseEvent) => {
        const latLng = { lat: e.lngLat.lat, lng: e.lngLat.lng };
        if (pickMode === "origin") setOriginPoint(latLng);
        else setDestPoint(latLng);
        fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${e.lngLat.lng},${e.lngLat.lat}.json?access_token=${MAPBOX_TOKEN}`)
          .then((r) => r.json())
          .then((data) => {
            const address = data.features?.[0]?.place_name || `${latLng.lat.toFixed(4)}, ${latLng.lng.toFixed(4)}`;
            window.dispatchEvent(new CustomEvent("itinerary-pick", { detail: { location: latLng, text: address } }));
          });
      };
      pickListenerRef.current = listener;
      map.on("click", listener);
    }
  }, [pickMode, isLoaded]);

  // ── pan-to event ──
  useEffect(() => {
    const handler = (e: CustomEvent<{ lat: number; lng: number }>) => {
      mapRef.current?.flyTo({ center: [e.detail.lng, e.detail.lat], zoom: 15 });
    };
    window.addEventListener("map-pan-to" as any, handler as any);
    return () => window.removeEventListener("map-pan-to" as any, handler as any);
  }, []);

  // ── community reviews event ──
  useEffect(() => {
    const handler = (e: Event) => {
      const placeId = (e as CustomEvent).detail?.placeId;
      if (!placeId) return;
      supabase.from("pet_friendly_places").select("id, name, category, subcategory, address, city, country, latitude, longitude, phone, website, opening_hours, accepts_dogs, accepts_cats, dogs_on_leash_only, outdoor_seating, rating, description, photo_url, verified, google_place_id").eq("id", placeId).maybeSingle().then(({ data }) => { if (data) setSelectedPlace(data as any); });
    };
    window.addEventListener("open-community-reviews", handler);
    return () => window.removeEventListener("open-community-reviews", handler);
  }, []);

  // ── Reload when center/radius/category changes ──
  useEffect(() => {
    if (!isLoaded) return;
    const hasSpecial = activeCategories.some(c => c === "__strays__" || c === "__lost__");
    if (hasSpecial) {
      setPlaces([]); clearPlaceMarkers(); scLoadedRef.current = false; setSearching(false); return;
    }
    loadPlaces(center.lat, center.lng, radiusKm, activeCategories);
  }, [center, radiusKm, activeCategories, isLoaded, loadPlaces]);

  // ── Search query geocoding ──
  useEffect(() => {
    if (!searchQuery?.trim() || !isLoaded) return;
    fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery.trim())}.json?access_token=${MAPBOX_TOKEN}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.features?.[0]) {
          const [lng, lat] = data.features[0].center;
          setCenter({ lat, lng });
          mapRef.current?.flyTo({ center: [lng, lat], zoom: 13 });
          document.getElementById("explore")?.scrollIntoView({ behavior: "smooth" });
        }
      });
  }, [searchQuery, isLoaded]);

  // ── A/B markers ──
  useEffect(() => {
    originMarkerRef.current?.remove();
    originMarkerRef.current = null;
    if (originPoint && mapRef.current) {
      const el = document.createElement("div");
      el.innerHTML = `<div style="background:#4CAF50;color:white;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.3)">A</div>`;
      originMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: "center" }).setLngLat([originPoint.lng, originPoint.lat]).addTo(mapRef.current);
    }
  }, [originPoint]);

  useEffect(() => {
    destMarkerRef.current?.remove();
    destMarkerRef.current = null;
    if (destPoint && mapRef.current) {
      const el = document.createElement("div");
      el.innerHTML = `<div style="background:#F44336;color:white;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.3)">B</div>`;
      destMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: "center" }).setLngLat([destPoint.lng, destPoint.lat]).addTo(mapRef.current);
    }
  }, [destPoint]);

  // ── Preview line A→B ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoaded) return;
    try {
      if (map.getLayer("preview-line")) map.removeLayer("preview-line");
      if (map.getSource("preview")) map.removeSource("preview");
    } catch {}
    if (originPoint && destPoint && !itineraryData) {
      try {
        map.addSource("preview", { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [[originPoint.lng, originPoint.lat], [destPoint.lng, destPoint.lat]] } } });
        map.addLayer({ id: "preview-line", type: "line", source: "preview", paint: { "line-color": "#FF6B35", "line-width": 2, "line-dasharray": [3, 3] } });
      } catch {}
    }
  }, [originPoint, destPoint, itineraryData, isLoaded]);

  // ── Itinerary ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoaded) return;

    itineraryMarkersRef.current.forEach((m) => m.remove());
    itineraryMarkersRef.current = [];
    try {
      if (map.getLayer("route-line")) map.removeLayer("route-line");
      if (map.getSource("route")) map.removeSource("route");
    } catch {}

    if (!itineraryData) return;

    // Route line
    try {
      map.addSource("route", { type: "geojson", data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: itineraryData.routePath.map((p) => [p.lng, p.lat]) } } });
      map.addLayer({ id: "route-line", type: "line", source: "route", paint: { "line-color": "#FF6B35", "line-width": 5, "line-opacity": 0.8 } });
    } catch {}

    const catColors: Record<string, string> = { restaurant: "#FF6B35", hotel: "#4285F4", outdoor: "#4CAF50", services: "#E53935", shop: "#9C27B0" };
    const markers: mapboxgl.Marker[] = [];

    const mkLabel = (text: string, bg: string) => {
      const el = document.createElement("div");
      el.innerHTML = `<div style="background:${bg};color:white;padding:6px 12px;border-radius:20px;font-weight:700;font-size:13px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,.3);white-space:nowrap">${text}</div>`;
      return el;
    };

    markers.push(new mapboxgl.Marker({ element: mkLabel("🏁 Départ", "#4CAF50"), anchor: "center" }).setLngLat([itineraryData.origin.lng, itineraryData.origin.lat]).addTo(map));
    markers.push(new mapboxgl.Marker({ element: mkLabel("🏁 Arrivée", "#E53935"), anchor: "center" }).setLngLat([itineraryData.destination.lng, itineraryData.destination.lat]).addTo(map));

    itineraryData.steps.forEach((step, i) => {
      const color = catColors[step.category] || "#9E9E9E";
      const el = document.createElement("div");
      el.innerHTML = `<div style="background:${color};color:white;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:15px;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,.3);cursor:pointer">${i + 1}</div>`;
      el.addEventListener("click", () => onStepClick?.(step.latitude, step.longitude));
      markers.push(new mapboxgl.Marker({ element: el, anchor: "center" }).setLngLat([step.longitude, step.latitude]).addTo(map));
    });

    itineraryData.pausePoints.forEach((pp) => {
      const el = document.createElement("div");
      el.innerHTML = `<div style="background:white;color:#FF6B35;padding:4px 8px;border-radius:12px;font-size:11px;border:2px solid #FF6B35;box-shadow:0 2px 4px rgba(0,0,0,.2)">🐾 Pause</div>`;
      markers.push(new mapboxgl.Marker({ element: el, anchor: "center" }).setLngLat([pp.lng, pp.lat]).addTo(map));
    });

    itineraryMarkersRef.current = markers;

    // Fit bounds
    const lngs = itineraryData.routePath.map((p) => p.lng);
    const lats = itineraryData.routePath.map((p) => p.lat);
    if (lngs.length) map.fitBounds([[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]], { padding: 50 });
  }, [itineraryData, isLoaded, onStepClick]);

  // ── Floating search ──

  // ── Stray reports ──
  const loadStrayReports = useCallback(async () => {
    const { data } = await supabase
      .from("stray_reports")
      .select("id, user_id, lat, lng, species, description, condition, behavior, color, breed, photo_url, address, city, created_at")
      .eq("status", "active")
      .order("created_at", { ascending: false });
    if (data) setStrayReports(data as any);
  }, []);

  useEffect(() => { loadStrayReports(); }, [loadStrayReports]);

  // ── Lost pets ──
  const loadLostPets = useCallback(async () => {
    const { data } = await supabase
      .from("lost_pets" as any)
      .select("id, user_id, pet_name, species, breed, color, age_description, description, last_seen_address, last_seen_lat, last_seen_lng, last_seen_date, contact_phone, contact_email, status, created_at")
      .eq("status", "active")
      .order("created_at", { ascending: false });
    if (data) setLostPets(data as any);
  }, []);

  useEffect(() => { loadLostPets(); }, [loadLostPets]);

  // ── Listen for open-lost-pet event (from notifications) ──
  useEffect(() => {
    const handler = async (e: Event) => {
      const petId = (e as CustomEvent).detail?.petId;
      if (!petId) return;
      const { data } = await supabase.from("lost_pets" as any).select("*").eq("id", petId).maybeSingle();
      if (data) setSelectedLostPet(data as any);
    };
    window.addEventListener("open-lost-pet", handler);
    return () => window.removeEventListener("open-lost-pet", handler);
  }, []);

  // ── Listen for open-lost-pet-modal event (from UserProfilePanel) ──
  useEffect(() => {
    const handler = () => setLostPetModal(true);
    window.addEventListener("open-lost-pet-modal", handler);
    return () => window.removeEventListener("open-lost-pet-modal", handler);
  }, []);

  // ── Global search: open place by id ──
  useEffect(() => {
    const handler = async (e: Event) => {
      const placeId = (e as CustomEvent).detail?.placeId;
      if (!placeId) return;
      const { data } = await supabase.from("pet_friendly_places").select("id, name, category, subcategory, address, city, country, latitude, longitude, phone, website, opening_hours, accepts_dogs, accepts_cats, dogs_on_leash_only, outdoor_seating, rating, description, photo_url, verified, google_place_id").eq("id", placeId).maybeSingle();
      if (data) setSelectedPlace(data as any);
    };
    window.addEventListener("global-search-open-place", handler);
    return () => window.removeEventListener("global-search-open-place", handler);
  }, []);

  // ── Global search: open stray by id ──
  useEffect(() => {
    const handler = async (e: Event) => {
      const strayId = (e as CustomEvent).detail?.strayId;
      if (!strayId) return;
      const { data } = await supabase.from("stray_reports").select("*").eq("id", strayId).maybeSingle();
      if (data) setSelectedStray(data as any);
    };
    window.addEventListener("open-stray", handler);
    return () => window.removeEventListener("open-stray", handler);
  }, []);

  // ── Render lost pet markers ──
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoaded) return;

    // Inject animation CSS once
    if (!document.getElementById("lost-pet-marker-style")) {
      const style = document.createElement("style");
      style.id = "lost-pet-marker-style";
      style.textContent = `
        @keyframes lostPulse {
          0%, 100% { transform: scale(1);   box-shadow: 0 0 0 0 rgba(245,158,11,0.7); }
          50%       { transform: scale(1.15); box-shadow: 0 0 0 10px rgba(245,158,11,0); }
        }
        .lost-pet-marker { animation: lostPulse 1.8s ease-in-out infinite; }
      `;
      document.head.appendChild(style);
    }

    lostPetMarkersRef.current.forEach(m => m.remove());
    lostPetMarkersRef.current = [];

    const show = activeCategories.length === 0 || activeCategories.includes("__lost__");
    if (!show) return;

    lostPets.forEach(pet => {
      if (!pet.last_seen_lat || !pet.last_seen_lng) return;
      const el = document.createElement("div");
      el.innerHTML = `<div class="lost-pet-marker" style="background:#D97706;color:white;width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:22px;border:3px solid white;box-shadow:0 2px 8px rgba(217,119,6,.5);cursor:pointer">🆘</div>`;
      const marker = new mapboxgl.Marker({ element: el, anchor: "center" })
        .setLngLat([pet.last_seen_lng, pet.last_seen_lat])
        .addTo(map);
      el.addEventListener("click", () => setSelectedLostPet(pet));
      lostPetMarkersRef.current.push(marker);
    });
  }, [lostPets, isLoaded, activeCategories]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isLoaded) return;

    // Inject paw blink animation once
    if (!document.getElementById("stray-marker-style")) {
      const style = document.createElement("style");
      style.id = "stray-marker-style";
      style.textContent = `
        @keyframes pawPulse {
          0%, 100% { transform: scale(1);   box-shadow: 0 0 0 0 rgba(220,38,38,0.6); }
          50%       { transform: scale(1.15); box-shadow: 0 0 0 8px rgba(220,38,38,0); }
        }
        .stray-marker { animation: pawPulse 1.6s ease-in-out infinite; }
      `;
      document.head.appendChild(style);
    }

    strayMarkersRef.current.forEach((m) => m.remove());
    strayMarkersRef.current = [];

    if (activeCategories.length > 0 && !activeCategories.includes("__strays__")) return;

    strayReports.forEach((report) => {
      const el = document.createElement("div");
      el.innerHTML = `<div class="stray-marker" style="background:#DC2626;color:white;width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:20px;border:3px solid white;box-shadow:0 2px 8px rgba(220,38,38,.5);cursor:pointer">🐾</div>`;
      const marker = new mapboxgl.Marker({ element: el, anchor: "center" })
        .setLngLat([report.lng, report.lat])
        .addTo(map);
      el.addEventListener("click", () => {
        setSelectedStray(report);
      });
      strayMarkersRef.current.push(marker);
    });
  }, [strayReports, isLoaded, activeCategories]);

  // ── Helpers ──
  const closePanel = useCallback(() => {
    setPanelVisible(false);
    setClosingPanel(true);
    setTimeout(() => {
      setSelectedPlace(null);
      setClosingPanel(false);
      prevPopupDataRef.current = null;
    }, 320);
  }, []);

  useEffect(() => { selectedPlaceRef.current = selectedPlace; }, [selectedPlace]);
  useEffect(() => { closePanelRef.current = closePanel; }, [closePanel]);
  useEffect(() => {
    if (selectedPlace) setTimeout(() => setPanelVisible(true), 10);
    else setPanelVisible(false);
  }, [selectedPlace?.id]);

  const handleLocateMe = () => {
    if (locating) return;
    setLocating(true);
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCenter(loc);
        mapRef.current?.flyTo({ center: [loc.lng, loc.lat], zoom: 15, speed: 3, curve: 1, essential: true });
        setLocating(false);
        if (user) {
          supabase.from("profiles").update({
            location_lat: loc.lat,
            location_lng: loc.lng,
            location_updated_at: new Date().toISOString(),
          } as any).eq("id", user.id).then(() => {});
        }
      },
      () => setLocating(false),
      { maximumAge: 60000, timeout: 6000, enableHighAccuracy: false }
    );
  };

  const handleToggleFav = (place: PetPlace) => {
    if (!onToggleFavorite) return;
    const added = onToggleFavorite({ id: place.id, name: place.name, category: place.category, subcategory: place.subcategory, address: place.address, city: place.city, lat: place.latitude, lng: place.longitude, phone: place.phone, website: place.website, accepts_dogs: place.accepts_dogs, accepts_cats: place.accepts_cats });
    toast(added ? `❤️ ${place.name} ajouté aux favoris` : `💔 ${place.name} retiré des favoris`);
  };

  // ── Filter sheet drag handlers (même pattern que LostPetDetailPanel) ──
  const handleFilterDragStart = (e: React.TouchEvent) => {
    filterIsDragging.current = true;
    filterDragStartY.current = e.touches[0].clientY;
    filterLastTouchY.current = e.touches[0].clientY;
    filterLastTouchTime.current = Date.now();
    filterLastVelocity.current = 0;
    setFilterDragging(true);
    setFilterDragDelta(0);
  };
  const handleFilterDragMove = (e: React.TouchEvent) => {
    if (!filterIsDragging.current) return;
    const y = e.touches[0].clientY;
    const now = Date.now();
    const dt = now - filterLastTouchTime.current;
    if (dt > 0) filterLastVelocity.current = (y - filterLastTouchY.current) / dt;
    filterLastTouchY.current = y;
    filterLastTouchTime.current = now;
    setFilterDragDelta(y - filterDragStartY.current);
  };
  const handleFilterDragEnd = () => {
    if (!filterIsDragging.current) return;
    filterIsDragging.current = false;
    setFilterDragging(false);
    const h = window.innerHeight;
    const deltaPct = h > 0 ? (filterDragDelta / h) * 100 : 0;
    const vel = filterLastVelocity.current;
    if (filterSnap === "half") {
      if (vel < -0.3 || deltaPct < -15) setFilterSnap("full");
      else if (vel > 0.3 || deltaPct > 15) setShowFilterSheet(false);
    } else {
      if (vel > 0.5 || deltaPct > 20) setFilterSnap("half");
    }
    setFilterDragDelta(0);
  };

  // Position % du filter sheet
  const filterSnapBase = filterSnap === "full" ? 0 : 40;
  const filterDragPct  = filterDragging && window.innerHeight > 0
    ? (filterDragDelta / window.innerHeight) * 100
    : 0;
  const filterCurrentPct = Math.max(0, Math.min(100, filterSnapBase + filterDragPct));

  // ── Render ──
  return (
    <section id="explore" className="relative flex-1 min-h-0">
      {/* Map base */}
      {!MAPBOX_TOKEN ? (
        <div className="flex items-center justify-center h-full bg-muted">
          <p className="text-destructive text-sm text-center px-4">Token Mapbox manquant — ajoutez <code>VITE_MAPBOX_TOKEN</code></p>
        </div>
      ) : (
        <div ref={mapContainerRef} className="w-full h-full" />
      )}

      {/* Touch-blocker overlay: covers the canvas when a panel is open or being dragged.
          Positioned above the canvas (z-10) but below all UI controls (z-20+).
          pointer-events captures any touch that would otherwise reach the Mapbox canvas,
          preventing pan/zoom even if Mapbox handlers are still technically enabled. */}
      {frozen && (
        <div
          className="absolute inset-0 z-10"
          style={{ touchAction: "none" }}
        />
      )}

      {/* Loading */}
      {searching && (
        <div className="absolute inset-0 bg-background/20 z-10 flex items-center justify-center pointer-events-none">
          <div className="flex items-center gap-3 bg-card px-6 py-3 rounded-full shadow-lg pointer-events-auto">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
            <span className="text-sm font-medium text-foreground">Recherche…</span>
          </div>
        </div>
      )}

      {/* Filter FAB — opposite side from main FABs */}
      {(() => {
        const activeCf = activeCategories.length === 1
          ? CATEGORY_FILTERS.find(cf => cf.key === activeCategories[0])
          : null;
        const hasFilter = activeCategories.length > 0;
        return (
          <button
            onClick={() => setShowFilterSheet(true)}
            className={`absolute ${filterSide} z-40 h-12 px-4 rounded-full flex items-center gap-2 active:scale-95 transition-all duration-150`}
            style={{
              bottom: "calc(2rem + var(--safe-bottom, 0px))",
              ...(hasFilter ? {
                backgroundColor: "var(--primary)",
                boxShadow: "0 4px 24px rgba(0,0,0,0.20)",
                touchAction: "manipulation",
              } : {
                background: "color-mix(in srgb, var(--card) 55%, transparent)",
                border: "1px solid color-mix(in srgb, var(--border) 50%, transparent)",
                boxShadow: "0 4px 24px rgba(0,0,0,0.10)",
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
                touchAction: "manipulation",
              }),
            } as React.CSSProperties}
            title="Filtrer par catégorie"
          >
            <SlidersHorizontal className={`w-4 h-4 ${hasFilter ? "text-primary-foreground" : "text-foreground"}`} />
            <span className={`text-sm font-semibold ${hasFilter ? "text-primary-foreground" : "text-foreground"}`}>
              {activeCategories.length === 0
                ? "Filtrer"
                : activeCategories.length === 1
                  ? activeCf?.emoji
                  : `${activeCategories.length} filtres`}
            </span>
          </button>
        );
      })()}

      {/* Filter bottom sheet — même pattern de swipe que LostPetDetailPanel */}
      <>
        {/* Scrim */}
        <div
          className="fixed inset-0 z-[490] bg-black/40"
          style={{
            opacity: showFilterSheet ? 1 : 0,
            transition: "opacity 0.3s ease",
            pointerEvents: showFilterSheet ? "auto" : "none",
          }}
          onClick={() => setShowFilterSheet(false)}
        />
        {/* Sheet */}
        <div
          className="fixed inset-x-0 bottom-0 z-[495] rounded-t-2xl flex flex-col"
          style={{
            top: "var(--header-h, 56px)",
            transform: `translateY(${showFilterSheet ? filterCurrentPct + "%" : "100%"})`,
            transition: filterDragging ? "none" : "transform 0.3s cubic-bezier(0.4,0,0.2,1)",
            background: "color-mix(in srgb, var(--card) 55%, transparent)",
            border: "1px solid color-mix(in srgb, var(--border) 50%, transparent)",
            borderBottom: "none",
            boxShadow: "0 -4px 24px rgba(0,0,0,0.10)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
          } as React.CSSProperties}
        >
          {/* Zone header complète = drag handle + titre + boutons — un seul bloc draggable */}
          <div
            className="shrink-0 cursor-grab active:cursor-grabbing border-b border-border"
            style={{ touchAction: "none" }}
            onTouchStart={handleFilterDragStart}
            onTouchMove={handleFilterDragMove}
            onTouchEnd={handleFilterDragEnd}
          >
            {/* Pill */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-border" />
            </div>
            {/* Titre + boutons */}
            <div className="flex items-center justify-between gap-2 px-4 pb-3">
              <h3 className="font-bold text-foreground text-base flex-1">Filtrer par catégorie</h3>
              <button
                onTouchStart={e => e.stopPropagation()}
                onClick={() => setActiveCategories([])}
                className="text-xs text-primary font-semibold px-2 py-1 rounded-md hover:bg-muted transition-colors"
              >
                Effacer tout
              </button>
              <button
                onTouchStart={e => e.stopPropagation()}
                onClick={() => setFilterSnap(s => s === "full" ? "half" : "full")}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
                title={filterSnap === "full" ? "Réduire" : "Agrandir"}
                aria-label={filterSnap === "full" ? "Réduire" : "Agrandir"}
              >
                <ChevronUp className={`w-5 h-5 text-muted-foreground transition-transform duration-300 ${filterSnap === "full" ? "rotate-180" : ""}`} />
              </button>
              <button
                onTouchStart={e => e.stopPropagation()}
                onClick={() => setShowFilterSheet(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
                title="Fermer"
                aria-label="Fermer"
              >
                <X className="w-4 h-4 text-foreground" />
              </button>
            </div>
          </div>
          {/* Scrollable grid */}
          <div className="overflow-y-auto flex-1 px-3 pt-3 pb-2">
            <button
              onClick={() => setActiveCategories([])}
              className={`w-full mb-3 py-3 rounded-xl font-semibold text-sm transition-all active:scale-[0.98] ${
                activeCategories.length === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
              }`}
            >
              🐾 Tous les lieux
            </button>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORY_FILTERS.filter(cf => cf.key !== null).map((cf) => {
                const active = activeCategories.includes(cf.key!);
                return (
                  <button
                    key={cf.key}
                    onClick={() => {
                      setActiveCategories(prev =>
                        prev.includes(cf.key!) ? prev.filter(c => c !== cf.key) : [...prev, cf.key!]
                      );
                    }}
                    className={`py-3 px-1 rounded-xl flex flex-col items-center gap-1.5 transition-all active:scale-95 ${
                      active ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                    }`}
                  >
                    <span className="text-2xl leading-none">{cf.emoji}</span>
                    <span className="text-[10px] font-medium leading-tight text-center">{cf.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="shrink-0 px-4 pt-3 border-t border-border" style={{ paddingBottom: "calc(1.5rem + var(--safe-bottom, 0px))" }}>
            <button
              onClick={() => setShowFilterSheet(false)}
              className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm active:scale-[0.98] transition-all"
            >
              {activeCategories.length === 0
                ? "Fermer"
                : `Appliquer · ${activeCategories.length} filtre${activeCategories.length > 1 ? "s" : ""}`}
            </button>
          </div>
        </div>
      </>

      {/* Add place FAB — between search and SOS */}
      <button
        onClick={() => {
          const center = mapRef.current?.getCenter?.();
          window.dispatchEvent(new CustomEvent("open-submit-modal", {
            detail: { lat: center?.lat ?? 48.8566, lng: center?.lng ?? 2.3522 },
          }));
        }}
        className={`absolute ${fabSide} z-30 w-12 h-12 rounded-full flex items-center justify-center active:scale-95 transition-all duration-150`}
        style={{ bottom: "calc(14rem + var(--safe-bottom, 0px))", background: "color-mix(in srgb, var(--card) 55%, transparent)", border: "1px solid color-mix(in srgb, var(--border) 50%, transparent)", boxShadow: "0 4px 24px rgba(0,0,0,0.10)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", touchAction: "manipulation" } as React.CSSProperties}
        title="Ajouter un lieu"
      >
        <Plus className="w-5 h-5 text-primary" />
      </button>

      {/* Lost pet FAB */}
      <button
        onClick={() => {
          if (!user) { toast.error("Connectez-vous pour publier une annonce"); window.dispatchEvent(new CustomEvent("open-auth-modal")); return; }
          setLostPetModal(true);
        }}
        className={`absolute ${fabSide} z-30 w-12 h-12 rounded-full flex items-center justify-center active:scale-95 transition-all duration-150`}
        style={{ bottom: "calc(10rem + var(--safe-bottom, 0px))", background: "color-mix(in srgb, var(--card) 55%, transparent)", border: "1px solid color-mix(in srgb, var(--border) 50%, transparent)", boxShadow: "0 4px 24px rgba(0,0,0,0.10)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", touchAction: "manipulation" } as React.CSSProperties}
        title="Signaler un animal perdu"
      >
        <span style={{ fontSize: 20, lineHeight: 1 }}>🆘</span>
      </button>

      {/* Stray report FAB */}
      <button
        onClick={() => {
          if (!user) { toast.error("Connectez-vous pour signaler un animal errant"); window.dispatchEvent(new CustomEvent("open-auth-modal")); return; }
          setStrayModal(true);
        }}
        className={`absolute ${fabSide} z-30 w-12 h-12 rounded-full flex items-center justify-center active:scale-95 transition-all duration-150`}
        style={{ bottom: "calc(6rem + var(--safe-bottom, 0px))", background: "color-mix(in srgb, var(--card) 55%, transparent)", border: "1px solid color-mix(in srgb, var(--border) 50%, transparent)", boxShadow: "0 4px 24px rgba(0,0,0,0.10)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", touchAction: "manipulation" } as React.CSSProperties}
        title="Signaler un animal errant"
      >
        <Camera className="w-5 h-5 text-destructive" />
      </button>

      {/* Locate me — hidden when place detail panel is open */}
      {!selectedPlace && <div className={`absolute ${fabSide} z-40`} style={{ bottom: "calc(2rem + var(--safe-bottom, 0px))" }}>
        {locating && (
          <span className="absolute inset-0 rounded-full animate-ping bg-primary/30" />
        )}
        <button
          onClick={handleLocateMe}
          disabled={locating}
          className="relative w-12 h-12 rounded-full flex items-center justify-center active:scale-90 transition-transform duration-100"
          style={{ background: "color-mix(in srgb, var(--card) 55%, transparent)", border: "1px solid color-mix(in srgb, var(--border) 50%, transparent)", boxShadow: "0 4px 24px rgba(0,0,0,0.10)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", touchAction: "manipulation" } as React.CSSProperties}
          title="Ma position"
        >
          {locating
            ? <Loader2 className="w-5 h-5 text-primary animate-spin" />
            : <Locate className="w-5 h-5 text-primary" />}
        </button>
      </div>}

      {/* Touch-blocker: captures ALL touches on the map while MarkerPopup is open.
          z-[499] = just below the panel (z-[500]) so the panel still receives its own touches.
          touchAction:none tells the browser not to interpret gestures as scroll/pan at all. */}
      {popupData && (
        <div
          className="fixed inset-0 z-[499]"
          style={{ touchAction: "none" }}
          onClick={() => setPopupData(null)}
        />
      )}

      {popupData && (
        <MarkerPopup
          place={popupData.place} position={popupData.position} onClose={() => setPopupData(null)}
          onSetOrigin={() => { const p = popupData.place; setOriginPoint({ lat: p.lat, lng: p.lng }); window.dispatchEvent(new CustomEvent("marker-set-itinerary", { detail: { type: "origin", location: { lat: p.lat, lng: p.lng }, text: p.name } })); toast.success(`✓ Départ enregistré : ${p.name} — retrouvez-le dans l'itinéraire`); setPopupData(null); }}
          onSetDestination={() => { const p = popupData.place; setDestPoint({ lat: p.lat, lng: p.lng }); window.dispatchEvent(new CustomEvent("marker-set-itinerary", { detail: { type: "destination", location: { lat: p.lat, lng: p.lng }, text: p.name } })); toast.success(`✓ Arrivée enregistrée : ${p.name} — retrouvez-la dans l'itinéraire`); setPopupData(null); }}
          onShowInfo={popupData.petPlace ? () => { prevPopupDataRef.current = popupData; setSelectedPlace(popupData.petPlace!); setPopupData(null); } : undefined}
          isFavorite={isFavorite?.(popupData.petPlace?.id || popupData.place.placeId || `custom_${popupData.place.lat}_${popupData.place.lng}`)}
          onToggleFavorite={() => {
            if (!onToggleFavorite) return;
            const p = popupData.place;
            const id = popupData.petPlace?.id || p.placeId || `custom_${p.lat}_${p.lng}`;
            const category = popupData.petPlace?.category || detectCategoryFromTypes(p.types);
            const added = onToggleFavorite({ id, name: p.name, category, address: p.address || null, city: p.city || null, lat: p.lat, lng: p.lng, phone: p.phone || null, website: p.website || null, accepts_dogs: p.isPetFriendly, rating: p.rating || null, placeId: p.placeId || null, isPetFriendly: p.isPetFriendly, source: p.isPetFriendly ? "supabase" : "mapbox" });
            toast(added ? `❤️ ${p.name} ajouté aux favoris` : `💔 ${p.name} retiré des favoris`);
          }}
          onAddWaypoint={() => {
            const p = popupData.place;
            if (!originPoint) { setOriginPoint({ lat: p.lat, lng: p.lng }); window.dispatchEvent(new CustomEvent("marker-set-itinerary", { detail: { type: "origin", location: { lat: p.lat, lng: p.lng }, text: p.name } })); toast.success(`🚩 Départ enregistré : ${p.name}`); }
            else if (!destPoint) { setDestPoint({ lat: p.lat, lng: p.lng }); window.dispatchEvent(new CustomEvent("marker-set-itinerary", { detail: { type: "destination", location: { lat: p.lat, lng: p.lng }, text: p.name } })); toast.success(`🏁 Arrivée enregistrée : ${p.name}`); }
            else { window.dispatchEvent(new CustomEvent("itinerary-add-waypoint", { detail: { name: p.name, lat: p.lat, lng: p.lng, category: popupData.petPlace?.category || detectCategoryFromTypes(p.types), isPetFriendly: p.isPetFriendly } })); toast.success(`⛳ Étape enregistrée : ${p.name}`); }
            setPopupData(null);
          }}
          isInDatabase={!!popupData.petPlace} dbId={popupData.petPlace?.id}
          onReport={popupData.petPlace ? () => setReportModal({ open: true, placeId: popupData.petPlace!.id, placeName: popupData.place.name }) : undefined}
        />
      )}

      {selectedPlace && (
        <>
          <div
            className="fixed inset-0 z-[49] bg-black/50"
            style={{ opacity: panelVisible ? 1 : 0, transition: "opacity 0.3s ease" }}
            onClick={closePanel}
          />
          <PlaceDetailPanel
            place={selectedPlace}
            isClosing={closingPanel}
            onClose={closePanel}
            onBack={prevPopupDataRef.current ? () => { setSelectedPlace(null); setPopupData(prevPopupDataRef.current); prevPopupDataRef.current = null; } : undefined}
            isFavorite={isFavorite?.(selectedPlace.id)}
            onToggleFavorite={() => handleToggleFav(selectedPlace)}
            onReport={() => setReportModal({ open: true, placeId: selectedPlace.id, placeName: selectedPlace.name })}
          />
        </>
      )}

      <ReportModal open={reportModal.open} onClose={() => setReportModal({ open: false, placeId: null, placeName: "" })} placeId={reportModal.placeId} placeName={reportModal.placeName}
        onLoginRequired={() => { setReportModal({ open: false, placeId: null, placeName: "" }); window.dispatchEvent(new CustomEvent("open-auth-modal")); }} />

      <StrayReportModal
        open={strayModal}
        onClose={() => setStrayModal(false)}
        onReported={loadStrayReports}
      />

      <StrayDetailPanel
        report={selectedStray}
        onClose={() => setSelectedStray(null)}
        onDeleted={loadStrayReports}
      />

      <LostPetModal
        open={lostPetModal}
        onClose={() => setLostPetModal(false)}
        onPublished={loadLostPets}
      />

      <LostPetDetailPanel
        lostPet={selectedLostPet}
        onClose={() => setSelectedLostPet(null)}
        onStatusChanged={loadLostPets}
      />
    </section>
  );
};

export default MapSection;
