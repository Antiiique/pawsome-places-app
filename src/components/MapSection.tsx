import { useState, useEffect, useRef, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import Supercluster from "supercluster";
import { Loader2, Locate } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import PlaceDetailPanel, { type PetPlace } from "./PlaceDetailPanel";
import MarkerPopup, { type UniversalPlace } from "./MarkerPopup";
import ReportModal from "./ReportModal";
import { toast } from "sonner";
import type { FavoritePlace } from "@/hooks/useFavorites";
import { detectCategoryFromTypes } from "@/hooks/useFavorites";
import type { ItineraryMapData } from "./itinerary/types";
import type { PickMode } from "./itinerary/ItineraryPanel";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string;
const GOOGLE_API_KEY = "AIzaSyDP4zY29gT-tXDxcszWHBWSC8_14AEmiYg";

const CATEGORY_FILTERS = [
  { key: null, label: "Tous", emoji: "🐾" },
  { key: "restaurant", label: "Restaurants", emoji: "🍽️" },
  { key: "hotel", label: "Hôtels", emoji: "🛏️" },
  { key: "outdoor", label: "Parcs & Nature", emoji: "🌿" },
  { key: "services", label: "Vétérinaires", emoji: "❤️" },
  { key: "shop", label: "Pet Shops", emoji: "🐾" },
] as const;

const CATEGORY_COLORS: Record<string, string> = {
  restaurant: "#FF6B35", hotel: "#4285F4", outdoor: "#4CAF50",
  services: "#E53935", shop: "#9C27B0", other: "#9E9E9E",
};

const CATEGORY_EMOJIS: Record<string, string> = {
  restaurant: "🍽️", hotel: "🛏️", outdoor: "🌿", services: "❤️", shop: "🐾", other: "📍",
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
}

const MapSection = ({ searchQuery, itineraryData, onStepClick, pickMode, isFavorite, onToggleFavorite, onOpenItinerary }: MapSectionProps) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const itineraryMarkersRef = useRef<mapboxgl.Marker[]>([]);
  const originMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const destMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const scRef = useRef(new Supercluster<{ id: string; placeIndex: number; category: string; accepts_dogs: boolean }>({ radius: 60, maxZoom: 16 }));
  const markerClickedRef = useRef(false);
  const prevPopupDataRef = useRef<{ place: UniversalPlace; position: { x: number; y: number }; petPlace?: PetPlace } | null>(null);
  const pickListenerRef = useRef<((e: mapboxgl.MapMouseEvent) => void) | null>(null);

  const [isLoaded, setIsLoaded] = useState(false);
  const [places, setPlaces] = useState<PetPlace[]>([]);
  const [center, setCenter] = useState({ lat: 48.8566, lng: 2.3522 });
  const [searching, setSearching] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<PetPlace | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [radiusKm, setRadiusKm] = useState(20);
  const [popupData, setPopupData] = useState<{ place: UniversalPlace; position: { x: number; y: number }; petPlace?: PetPlace } | null>(null);
  const [originPoint, setOriginPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [destPoint, setDestPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [reportModal, setReportModal] = useState<{ open: boolean; placeId: string | null; placeName: string }>({ open: false, placeId: null, placeName: "" });

  // ── Render clusters ──
  const renderClusters = useCallback((currentPlaces: PetPlace[]) => {
    const map = mapRef.current;
    if (!map) return;
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
        el.style.cssText = "display:flex;flex-direction:column;align-items:center;cursor:pointer;";
        el.innerHTML = `<div style="width:40px;height:40px;border-radius:50%;background:${color};border:2.5px solid white;box-shadow:0 2px 8px rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;font-size:20px;line-height:1;">${emoji}</div><div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:8px solid ${color};margin-top:-1px;"></div>`;
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

          map.panTo([place.longitude, place.latitude]);
          setPopupData({ place: fallback, position, petPlace: place });

          const googlePlaceId = (place as any).google_place_id;
          if (googlePlaceId) {
            supabase.functions.invoke("google-places", { body: { placeId: googlePlaceId } }).then(({ data }) => {
              if (!data?.result) return;
              const g = data.result;
              const photos = g.photos
                ? g.photos.slice(0, 5).map((p: any) => `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${p.photo_reference}&key=${GOOGLE_API_KEY}`)
                : (place.photo_url ? [place.photo_url] : []);
              const reviews = g.reviews
                ? g.reviews.slice(0, 5).map((r: any) => ({ author: r.author_name || "Anonyme", avatar: r.profile_photo_url || null, rating: r.rating, text: r.text || "", time: r.relative_time_description || "" }))
                : [];
              setPopupData((prev) => prev ? { ...prev, place: { ...prev.place, rating: g.rating || prev.place.rating, reviewsTotal: g.user_ratings_total || 0, phone: g.formatted_phone_number || prev.place.phone, website: g.website || prev.place.website, opening_hours: g.opening_hours?.weekday_text?.join(" • ") || prev.place.opening_hours, photos, reviews, placeId: googlePlaceId } } : prev);
            });
          }
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
  const loadPlaces = useCallback(async (lat: number, lng: number, radius: number, category: string | null) => {
    setSearching(true);
    const { data, error } = await supabase.rpc("get_nearby_pet_places", { user_lat: lat, user_lon: lng, radius_km: radius, cat_filter: category, dogs_only: false });
    if (error) { setSearching(false); return; }

    const results: PetPlace[] = (data || []).map((d: any) => ({ ...d, id: d.id as string }));
    setPlaces(results);
    clearPlaceMarkers();

    const points = results.map((p, i) => ({
      type: "Feature" as const,
      properties: { cluster: false as const, id: p.id, placeIndex: i, category: p.category, accepts_dogs: p.accepts_dogs },
      geometry: { type: "Point" as const, coordinates: [p.longitude, p.latitude] as [number, number] },
    }));
    scRef.current.load(points);
    renderClusters(results);

    // Flagged places
    const existingIds = results.map((p) => p.id);
    if (existingIds.length > 0 && mapRef.current) {
      const { data: flagged } = await supabase.from("pet_friendly_places").select("id, name, latitude, longitude, report_count").eq("is_flagged", true).not("id", "in", `(${existingIds.join(",")})`);
      (flagged as any[] || []).forEach((fp) => {
        const el = document.createElement("div");
        el.style.cssText = "position:relative;cursor:pointer;";
        el.innerHTML = `<span style="font-size:28px;filter:drop-shadow(0 2px 4px rgba(0,0,0,.3))">⚠️</span><span style="position:absolute;top:-4px;right:-6px;background:#E53935;color:white;font-size:9px;font-weight:700;width:16px;height:16px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:1.5px solid white">${fp.report_count || 0}</span>`;
        el.addEventListener("click", (e) => { e.stopPropagation(); toast.warning(`⚠️ Ce lieu a été signalé ${fp.report_count || 0} fois par la communauté.`); });
        const m = new mapboxgl.Marker({ element: el, anchor: "center" }).setLngLat([fp.longitude, fp.latitude]).addTo(mapRef.current!);
        markersRef.current.set(`flagged-${fp.id}`, m);
      });
    }

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
    });

    map.on("load", () => {
      POI_LAYERS.forEach((layer) => { try { map.setLayoutProperty(layer, "visibility", "none"); } catch {} });
      setIsLoaded(true);

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            map.panTo([loc.lng, loc.lat]);
            setCenter(loc);
            loadPlaces(loc.lat, loc.lng, 20, null);
          },
          () => loadPlaces(48.8566, 2.3522, 20, null)
        );
      } else {
        loadPlaces(48.8566, 2.3522, 20, null);
      }
    });

    map.on("moveend", () => {
      const c = map.getCenter();
      setCenter({ lat: c.lat, lng: c.lng });
      renderClusters(places);
    });

    map.on("click", (e) => {
      setTimeout(() => {
        if (markerClickedRef.current) return;
        const rect = mapContainerRef.current?.getBoundingClientRect();
        const px = { x: (rect?.left || 0) + e.point.x, y: (rect?.top || 0) + e.point.y };
        fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${e.lngLat.lng},${e.lngLat.lat}.json?access_token=${MAPBOX_TOKEN}`)
          .then((r) => r.json())
          .then((data) => {
            const address = data.features?.[0]?.place_name || "";
            setPopupData({ place: { name: address || "Ce lieu", address, lat: e.lngLat.lat, lng: e.lngLat.lng, types: ["point_on_map"], isPetFriendly: false }, position: px });
          });
      }, 50);
    });

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
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
    if (isLoaded) loadPlaces(center.lat, center.lng, radiusKm, activeCategory);
  }, [center, radiusKm, activeCategory, isLoaded, loadPlaces]);

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

  // ── Helpers ──
  const handleLocateMe = () => {
    navigator.geolocation?.getCurrentPosition((pos) => {
      const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setCenter(loc);
      mapRef.current?.flyTo({ center: [loc.lng, loc.lat], zoom: 14 });
    });
  };

  const handleToggleFav = (place: PetPlace) => {
    if (!onToggleFavorite) return;
    const added = onToggleFavorite({ id: place.id, name: place.name, category: place.category, subcategory: place.subcategory, address: place.address, city: place.city, lat: place.latitude, lng: place.longitude, phone: place.phone, website: place.website, accepts_dogs: place.accepts_dogs, accepts_cats: place.accepts_cats });
    toast(added ? `❤️ ${place.name} ajouté aux favoris` : `💔 ${place.name} retiré des favoris`);
  };

  // ── Render ──
  return (
    <section id="explore" className="py-8 bg-secondary/50">
      <div className="container px-4">
        <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide mb-2">
          {CATEGORY_FILTERS.map((f) => (
            <button key={f.label} onClick={() => setActiveCategory(f.key)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${activeCategory === f.key ? "bg-primary text-primary-foreground" : "bg-card border border-border text-foreground hover:bg-muted"}`}>
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
          {searching && (
            <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-10 flex items-center justify-center">
              <div className="flex items-center gap-3 bg-card px-6 py-3 rounded-full shadow-lg">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
                <span className="text-sm font-medium text-foreground">Recherche…</span>
              </div>
            </div>
          )}
          {!MAPBOX_TOKEN ? (
            <div className="flex items-center justify-center h-full bg-muted">
              <p className="text-destructive text-sm text-center px-4">Token Mapbox manquant — ajoutez <code>VITE_MAPBOX_TOKEN</code></p>
            </div>
          ) : (
            <div ref={mapContainerRef} className="w-full h-full" />
          )}
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
          place={popupData.place} position={popupData.position} onClose={() => setPopupData(null)}
          onSetOrigin={() => { const p = popupData.place; setOriginPoint({ lat: p.lat, lng: p.lng }); window.dispatchEvent(new CustomEvent("marker-set-itinerary", { detail: { type: "origin", location: { lat: p.lat, lng: p.lng }, text: p.name } })); toast.success(`✓ Départ : ${p.name}`); setPopupData(null); onOpenItinerary?.(); }}
          onSetDestination={() => { const p = popupData.place; setDestPoint({ lat: p.lat, lng: p.lng }); window.dispatchEvent(new CustomEvent("marker-set-itinerary", { detail: { type: "destination", location: { lat: p.lat, lng: p.lng }, text: p.name } })); toast.success(`✓ Arrivée : ${p.name}`); setPopupData(null); onOpenItinerary?.(); }}
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
            if (!originPoint) { setOriginPoint({ lat: p.lat, lng: p.lng }); window.dispatchEvent(new CustomEvent("marker-set-itinerary", { detail: { type: "origin", location: { lat: p.lat, lng: p.lng }, text: p.name } })); toast.success(`🚩 Départ : ${p.name}`); }
            else if (!destPoint) { setDestPoint({ lat: p.lat, lng: p.lng }); window.dispatchEvent(new CustomEvent("marker-set-itinerary", { detail: { type: "destination", location: { lat: p.lat, lng: p.lng }, text: p.name } })); toast.success(`🏁 Arrivée : ${p.name}`); }
            else { window.dispatchEvent(new CustomEvent("itinerary-add-waypoint", { detail: { name: p.name, lat: p.lat, lng: p.lng, category: popupData.petPlace?.category || detectCategoryFromTypes(p.types), isPetFriendly: p.isPetFriendly } })); toast.success(`⛳ Étape : ${p.name}`); }
            setPopupData(null); onOpenItinerary?.();
          }}
          isInDatabase={!!popupData.petPlace} dbId={popupData.petPlace?.id}
          onReport={popupData.petPlace ? () => setReportModal({ open: true, placeId: popupData.petPlace!.id, placeName: popupData.place.name }) : undefined}
        />
      )}

      {selectedPlace && (
        <>
          <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setSelectedPlace(null)} />
          <PlaceDetailPanel
            place={selectedPlace}
            onClose={() => { setSelectedPlace(null); prevPopupDataRef.current = null; }}
            onBack={prevPopupDataRef.current ? () => { setSelectedPlace(null); setPopupData(prevPopupDataRef.current); prevPopupDataRef.current = null; } : undefined}
            isFavorite={isFavorite?.(selectedPlace.id)}
            onToggleFavorite={() => handleToggleFav(selectedPlace)}
            onReport={() => setReportModal({ open: true, placeId: selectedPlace.id, placeName: selectedPlace.name })}
          />
        </>
      )}

      <ReportModal open={reportModal.open} onClose={() => setReportModal({ open: false, placeId: null, placeName: "" })} placeId={reportModal.placeId} placeName={reportModal.placeName}
        onLoginRequired={() => { setReportModal({ open: false, placeId: null, placeName: "" }); window.dispatchEvent(new CustomEvent("open-auth-modal")); }} />
    </section>
  );
};

export default MapSection;
