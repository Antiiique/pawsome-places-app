/// <reference types="google.maps" />
import { useState, useRef, useEffect, useCallback } from "react";
import { X, ArrowUpDown, Loader2, MapPin, ExternalLink, Share2, Save, Navigation, Check, Trash2, Play, GripVertical, Plus, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ItineraryMapData, ItineraryStep, PlaceSelection, Waypoint } from "./types";
import { useSavedItineraries, type SavedItinerary } from "@/hooks/useSavedItineraries";

const GOOGLE_MAPS_API_KEY = "AIzaSyDP4zY29gT-tXDxcszWHBWSC8_14AEmiYg";

const STEP_DISTANCE_OPTIONS = [50, 100, 150];

const CATEGORY_FILTERS = [
  { key: "outdoor", label: "Parcs & aires de repos", emoji: "🌿", default: true },
  { key: "restaurant", label: "Restaurants & cafés", emoji: "🍽️", default: true },
  { key: "hotel", label: "Hôtels & campings", emoji: "🛏️", default: true },
  { key: "services", label: "Vétérinaires", emoji: "❤️", default: true },
  { key: "shop", label: "Pet shops", emoji: "🐾", default: false },
];

const CATEGORY_COLORS: Record<string, string> = {
  restaurant: "#FF6B35",
  hotel: "#4285F4",
  outdoor: "#4CAF50",
  services: "#E53935",
  shop: "#9C27B0",
};

export type PickMode = "origin" | "destination" | null;

interface ItineraryPanelProps {
  onClose: () => void;
  onRouteCalculated: (data: ItineraryMapData | null) => void;
  onViewStep: (lat: number, lng: number) => void;
  pickMode: PickMode;
  onPickModeChange: (mode: PickMode) => void;
}

interface Prediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

// Global active dropdown tracking
let activeDropdownId: string | null = null;
const dropdownChangeListeners = new Set<() => void>();

function notifyDropdownChange() {
  dropdownChangeListeners.forEach((fn) => fn());
}

function PlaceInput({
  id, label, value, selection, error, onSelect, onChange,
}: {
  id: string; label: string; value: string; selection: PlaceSelection | null; error?: string;
  onSelect: (sel: PlaceSelection) => void; onChange: (text: string) => void;
}) {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const listener = () => { if (activeDropdownId !== id) setShowDropdown(false); };
    dropdownChangeListeners.add(listener);
    return () => { dropdownChangeListeners.delete(listener); };
  }, [id]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
        if (activeDropdownId === id) activeDropdownId = null;
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setShowDropdown(false); activeDropdownId = null; notifyDropdownChange(); }
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => { document.removeEventListener("mousedown", handleClick); document.removeEventListener("keydown", handleKey); };
  }, [id]);

  const openMyDropdown = () => {
    if (activeDropdownId !== id) { activeDropdownId = id; notifyDropdownChange(); }
    setShowDropdown(true);
  };

  const fetchPredictions = useCallback((input: string) => {
    if (!input.trim() || !window.google?.maps?.places) { setPredictions([]); setShowDropdown(false); return; }
    const service = new google.maps.places.AutocompleteService();
    service.getPlacePredictions({ input, language: "fr" }, (results, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && results) {
        setPredictions(results.slice(0, 5) as unknown as Prediction[]);
        openMyDropdown();
      } else { setPredictions([]); setShowDropdown(false); }
    });
  }, [id]);

  const handleInput = (text: string) => {
    onChange(text);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => fetchPredictions(text), 300);
  };

  const handleSelect = (pred: Prediction) => {
    setShowDropdown(false);
    activeDropdownId = null;
    onChange(pred.description);
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ placeId: pred.place_id }, (results, status) => {
      if (status === "OK" && results?.[0]) {
        onSelect({ location: { lat: results[0].geometry.location.lat(), lng: results[0].geometry.location.lng() }, text: results[0].formatted_address });
      }
    });
  };

  const handleFocus = () => {
    activeDropdownId = id;
    notifyDropdownChange();
    if (predictions.length > 0) setShowDropdown(true);
  };

  return (
    <div ref={containerRef} className="relative">
      <label className="text-xs font-medium text-muted-foreground mb-1 block">{label}</label>
      <div className="relative">
        <input
          type="text" value={value} onChange={(e) => handleInput(e.target.value)} onFocus={handleFocus}
          placeholder="Saisissez une adresse ou ville"
          className={`w-full pl-4 pr-10 py-2.5 rounded-lg border bg-background text-foreground text-sm outline-none transition-colors ${
            error ? "border-destructive" : selection ? "border-primary" : "border-border"
          }`}
        />
        {selection && <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />}
      </div>
      {error && <span className="text-xs text-destructive mt-1 block">{error}</span>}
      {selection && <span className="text-xs text-primary mt-1 block">✓ {selection.text}</span>}
      {showDropdown && predictions.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
          {predictions.map((pred) => (
            <button key={pred.place_id} onClick={() => handleSelect(pred)} className="w-full text-left px-3 py-2.5 hover:bg-muted transition-colors flex items-start gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{pred.structured_formatting.main_text}</p>
                <p className="text-xs text-muted-foreground truncate">{pred.structured_formatting.secondary_text}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Compact waypoint search input
function WaypointSearchInput({ onSelect, onCancel }: { onSelect: (wp: Omit<Waypoint, "id">) => void; onCancel: () => void }) {
  const [text, setText] = useState("");
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchPredictions = useCallback((input: string) => {
    if (!input.trim() || !window.google?.maps?.places) { setPredictions([]); setShowDropdown(false); return; }
    const service = new google.maps.places.AutocompleteService();
    service.getPlacePredictions({ input, language: "fr" }, (results, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && results) {
        setPredictions(results.slice(0, 5) as unknown as Prediction[]);
        setShowDropdown(true);
      } else { setPredictions([]); setShowDropdown(false); }
    });
  }, []);

  const handleInput = (val: string) => {
    setText(val);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => fetchPredictions(val), 300);
  };

  const handleSelect = (pred: Prediction) => {
    setShowDropdown(false);
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ placeId: pred.place_id }, (results, status) => {
      if (status === "OK" && results?.[0]) {
        onSelect({
          name: pred.structured_formatting.main_text,
          lat: results[0].geometry.location.lat(),
          lng: results[0].geometry.location.lng(),
          category: "other",
          isPetFriendly: false,
        });
      }
    });
  };

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setShowDropdown(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div className="flex gap-1.5">
        <input
          type="text" value={text} onChange={(e) => handleInput(e.target.value)} autoFocus
          placeholder="Rechercher un lieu…"
          className="flex-1 pl-3 pr-3 py-2 rounded-lg border border-border bg-background text-foreground text-xs outline-none"
          onKeyDown={(e) => { if (e.key === "Escape") onCancel(); }}
        />
        <Button variant="ghost" size="sm" className="text-xs px-2 h-auto" onClick={onCancel}>✕</Button>
      </div>
      {showDropdown && predictions.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
          {predictions.map((pred) => (
            <button key={pred.place_id} onClick={() => handleSelect(pred)} className="w-full text-left px-3 py-2 hover:bg-muted transition-colors flex items-start gap-2">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{pred.structured_formatting.main_text}</p>
                <p className="text-[11px] text-muted-foreground truncate">{pred.structured_formatting.secondary_text}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ItineraryPanel({ onClose, onRouteCalculated, onViewStep, pickMode, onPickModeChange }: ItineraryPanelProps) {
  const [origin, setOrigin] = useState<PlaceSelection | null>(null);
  const [destination, setDestination] = useState<PlaceSelection | null>(null);
  const [originText, setOriginText] = useState("");
  const [destText, setDestText] = useState("");
  const [maxStepDistance, setMaxStepDistance] = useState(100);
  const [filters, setFilters] = useState<Record<string, boolean>>({ outdoor: true, restaurant: true, hotel: true, services: true, shop: false });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ItineraryMapData | null>(null);
  const [errors, setErrors] = useState<{ origin?: string; dest?: string }>({});
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [activeTab, setActiveTab] = useState("new");
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [showWaypointSearch, setShowWaypointSearch] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const { itineraries, save, remove, count: savedCount } = useSavedItineraries();

  // Listen for waypoint add events from map popup
  useEffect(() => {
    const handler = (e: CustomEvent<{ name: string; lat: number; lng: number; category: string; isPetFriendly: boolean }>) => {
      const { name, lat, lng, category, isPetFriendly } = e.detail;
      setWaypoints((prev) => [...prev, { id: `wp_${Date.now()}_${Math.random()}`, name, lat, lng, category, isPetFriendly }]);
    };
    window.addEventListener("itinerary-add-waypoint" as any, handler as any);
    return () => window.removeEventListener("itinerary-add-waypoint" as any, handler as any);
  }, []);

  // Listen for map picks
  useEffect(() => {
    const handler = (e: CustomEvent<{ location: { lat: number; lng: number }; text: string }>) => {
      const sel: PlaceSelection = e.detail;
      if (pickMode === "origin") {
        setOrigin(sel); setOriginText(sel.text); setErrors((prev) => ({ ...prev, origin: undefined }));
        toast.success(`✓ Point de départ défini : ${sel.text}`);
      } else if (pickMode === "destination") {
        setDestination(sel); setDestText(sel.text); setErrors((prev) => ({ ...prev, dest: undefined }));
        toast.success(`✓ Point d'arrivée défini : ${sel.text}`);
      }
      onPickModeChange(null);
    };
    window.addEventListener("itinerary-pick" as any, handler as any);
    return () => window.removeEventListener("itinerary-pick" as any, handler as any);
  }, [pickMode, onPickModeChange]);

  // Listen for marker-set-itinerary events
  useEffect(() => {
    const handler = (e: CustomEvent<{ type: "origin" | "destination"; location: { lat: number; lng: number }; text: string }>) => {
      const { type, location, text } = e.detail;
      const sel: PlaceSelection = { location, text };
      if (type === "origin") {
        setOrigin(sel); setOriginText(text); setErrors((prev) => ({ ...prev, origin: undefined }));
        toast.success(`✓ Départ : ${text}`);
      } else {
        setDestination(sel); setDestText(text); setErrors((prev) => ({ ...prev, dest: undefined }));
        toast.success(`✓ Arrivée : ${text}`);
      }
    };
    window.addEventListener("marker-set-itinerary" as any, handler as any);
    return () => window.removeEventListener("marker-set-itinerary" as any, handler as any);
  }, []);

  const handleSwap = () => {
    const tmpO = origin, tmpT = originText;
    setOrigin(destination); setOriginText(destText);
    setDestination(tmpO); setDestText(tmpT);
  };

  const toggleFilter = (key: string) => setFilters((f) => ({ ...f, [key]: !f[key] }));

  const handleOriginSelect = (sel: PlaceSelection) => { setOrigin(sel); setOriginText(sel.text); setErrors((e) => ({ ...e, origin: undefined })); };
  const handleDestSelect = (sel: PlaceSelection) => { setDestination(sel); setDestText(sel.text); setErrors((e) => ({ ...e, dest: undefined })); };
  const handleOriginChange = (text: string) => { setOriginText(text); if (origin) setOrigin(null); };
  const handleDestChange = (text: string) => { setDestText(text); if (destination) setDestination(null); };

  const removeWaypoint = (id: string) => setWaypoints((prev) => prev.filter((w) => w.id !== id));

  const addWaypoint = (wp: Omit<Waypoint, "id">) => {
    setWaypoints((prev) => [...prev, { ...wp, id: `wp_${Date.now()}_${Math.random()}` }]);
    setShowWaypointSearch(false);
  };

  const [dropTargetIdx, setDropTargetIdx] = useState<number | null>(null);

  const handleDragStart = (idx: number) => setDragIdx(idx);
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDropTargetIdx(idx);
  };
  const handleDragLeave = () => setDropTargetIdx(null);
  const handleDrop = (e: React.DragEvent, toIdx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === toIdx) { setDragIdx(null); setDropTargetIdx(null); return; }
    setWaypoints((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
    setDragIdx(null);
    setDropTargetIdx(null);
    toast.success(`✓ Étape déplacée en position ${toIdx + 1}`);
  };
  const handleDragEnd = () => { setDragIdx(null); setDropTargetIdx(null); };

  const canCalculate = !loading && (!!origin || originText.trim().length > 0) && (!!destination || destText.trim().length > 0);

  const [legs, setLegs] = useState<Array<{ distanceKm: number; durationMin: number; startName: string; endName: string }>>([]);

  const calculate = useCallback(async () => {
    const newErrors: { origin?: string; dest?: string } = {};
    if (!origin && !originText.trim()) newErrors.origin = "Veuillez saisir un lieu de départ";
    else if (!origin && originText.trim()) newErrors.origin = "Sélectionnez une ville dans la liste";
    if (!destination && !destText.trim()) newErrors.dest = "Veuillez saisir un lieu d'arrivée";
    else if (!destination && destText.trim()) newErrors.dest = "Sélectionnez une ville dans la liste";
    if (newErrors.origin || newErrors.dest) { setErrors(newErrors); return; }

    setLoading(true); setResult(null); setErrors({}); setLegs([]); onRouteCalculated(null);

    try {
      const originLoc = origin!.location;
      const destLoc = destination!.location;

      const body: any = {
        origin: { location: { latLng: { latitude: parseFloat(String(originLoc.lat)), longitude: parseFloat(String(originLoc.lng)) } } },
        destination: { location: { latLng: { latitude: parseFloat(String(destLoc.lat)), longitude: parseFloat(String(destLoc.lng)) } } },
        travelMode: "DRIVE",
        languageCode: "fr-FR",
        units: "METRIC",
        computeAlternativeRoutes: false,
        routeModifiers: { avoidTolls: false, avoidHighways: false, avoidFerries: false },
      };

      const fieldMaskParts = [
        "routes.duration",
        "routes.distanceMeters",
        "routes.polyline.encodedPolyline",
        "routes.legs.duration",
        "routes.legs.distanceMeters",
        "routes.legs.startLocation",
        "routes.legs.endLocation",
      ];

      if (waypoints.length > 0) {
        body.intermediates = waypoints.map((wp) => ({
          location: { latLng: { latitude: parseFloat(String(wp.lat)), longitude: parseFloat(String(wp.lng)) } },
        }));
        body.optimizeWaypointOrder = true;
      }

      const response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": GOOGLE_MAPS_API_KEY,
          "X-Goog-FieldMask": fieldMaskParts.join(","),
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Routes API error:", errorData);
        throw new Error(errorData.error?.message || `Erreur API Routes: ${response.status}`);
      }

      const routeData = await response.json();
      if (!routeData.routes || routeData.routes.length === 0) throw new Error("Aucun itinéraire trouvé entre ces points");

      const route = routeData.routes[0];
      const distanceKm = Math.round((route.distanceMeters || 0) / 1000);
      const durationSec = parseInt((route.duration || "0s").replace("s", ""));
      const hours = Math.floor(durationSec / 3600);
      const mins = Math.floor((durationSec % 3600) / 60);

      // Build leg-by-leg summary
      const legNames = [originText.split(",")[0], ...waypoints.map((w) => w.name), destText.split(",")[0]];
      const legsSummary = (route.legs || []).map((leg: any, i: number) => {
        const legDist = Math.round((leg.distanceMeters || 0) / 1000);
        const legDurSec = parseInt((leg.duration || "0s").replace("s", ""));
        const legDurMin = Math.round(legDurSec / 60);
        return {
          distanceKm: legDist,
          durationMin: legDurMin,
          startName: legNames[i] || `Point ${i + 1}`,
          endName: legNames[i + 1] || `Point ${i + 2}`,
        };
      });
      setLegs(legsSummary);

      const decodedPath = google.maps.geometry.encoding.decodePath(route.polyline.encodedPolyline);

      let cumDist = 0;
      const pathWithDist: { point: google.maps.LatLng; dist: number }[] = [{ point: decodedPath[0], dist: 0 }];
      for (let i = 1; i < decodedPath.length; i++) {
        cumDist += google.maps.geometry.spherical.computeDistanceBetween(decodedPath[i - 1], decodedPath[i]);
        pathWithDist.push({ point: decodedPath[i], dist: cumDist });
      }

      const stepDistanceM = maxStepDistance * 1000;
      const checkpoints: { lat: number; lng: number; dist: number }[] = [];
      let nextCheckDist = stepDistanceM;
      for (const pd of pathWithDist) {
        if (pd.dist >= nextCheckDist) {
          checkpoints.push({ lat: pd.point.lat(), lng: pd.point.lng(), dist: pd.dist / 1000 });
          nextCheckDist += stepDistanceM;
        }
      }

      const selectedCategories = Object.entries(filters).filter(([, v]) => v).map(([k]) => k);
      const allPlaces: ItineraryStep[] = [];
      for (const cp of checkpoints) {
        for (const cat of selectedCategories) {
          const { data } = await supabase.rpc("get_nearby_pet_places", { user_lat: cp.lat, user_lon: cp.lng, radius_km: 15, cat_filter: cat, dogs_only: false });
          if (data) allPlaces.push(...data.slice(0, 3).map((d: any) => ({ ...d, id: d.id as string, distance_from_start_km: cp.dist })));
        }
      }

      const seen = new Set<string>();
      const unique = allPlaces.filter((p) => { if (seen.has(p.id)) return false; seen.add(p.id); return true; });
      unique.sort((a, b) => a.distance_from_start_km - b.distance_from_start_km);
      const steps = unique.slice(0, 8);

      const pausePoints: { lat: number; lng: number; distance_km: number }[] = [];
      let nextPause = 160000;
      for (const pd of pathWithDist) {
        if (pd.dist >= nextPause) {
          pausePoints.push({ lat: pd.point.lat(), lng: pd.point.lng(), distance_km: pd.dist / 1000 });
          nextPause += 160000;
        }
      }

      const routePath = decodedPath.map((p) => ({ lat: p.lat(), lng: p.lng() }));
      const totalDistanceText = `${distanceKm} km`;
      const totalDurationText = hours > 0 ? `${hours}h${mins.toString().padStart(2, "0")}` : `${mins} min`;

      const itineraryResult: ItineraryMapData = { routePath, origin: originLoc, destination: destLoc, steps, pausePoints, totalDistance: totalDistanceText, totalDuration: totalDurationText };
      setResult(itineraryResult);
      onRouteCalculated(itineraryResult);
    } catch (err: any) {
      console.error("Route calculation error:", err);
      toast.error(err.message || "Erreur lors du calcul.");
    } finally {
      setLoading(false);
    }
  }, [origin, destination, originText, destText, maxStepDistance, filters, waypoints, onRouteCalculated]);

  const handleShare = () => {
    if (!result) return;
    const params = new URLSearchParams({ from: `${result.origin.lat},${result.origin.lng}`, to: `${result.destination.lat},${result.destination.lng}` });
    navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}?itinerary=${params.toString()}`);
    toast.success("Lien copié dans le presse-papier !");
  };

  const handleSaveClick = () => {
    if (!result) return;
    const defaultName = `${originText.split(",")[0]} → ${destText.split(",")[0]}`;
    setSaveName(defaultName);
    setShowSaveDialog(true);
  };

  const handleSaveConfirm = () => {
    if (!result || !origin || !destination) return;
    save({
      name: saveName || "Itinéraire sans nom",
      depart: { name: originText.split(",")[0], address: originText, lat: origin.location.lat, lng: origin.location.lng },
      arrivee: { name: destText.split(",")[0], address: destText, lat: destination.location.lat, lng: destination.location.lng },
      distance: result.totalDistance,
      duration: result.totalDuration,
      stopsCount: result.steps.length,
    });
    setShowSaveDialog(false);
    toast.success("💾 Itinéraire sauvegardé !");
  };

  const handleRelaunch = (saved: SavedItinerary) => {
    const oSel: PlaceSelection = { location: { lat: saved.depart.lat, lng: saved.depart.lng }, text: saved.depart.address };
    const dSel: PlaceSelection = { location: { lat: saved.arrivee.lat, lng: saved.arrivee.lng }, text: saved.arrivee.address };
    setOrigin(oSel); setOriginText(saved.depart.address);
    setDestination(dSel); setDestText(saved.arrivee.address);
    setActiveTab("new");
    toast.info("Itinéraire rechargé — cliquez Calculer pour relancer");
  };

  const handleOpenGoogleMaps = () => {
    if (!result) return;
    const waypoints = result.steps.map((s) => `${s.latitude},${s.longitude}`).join("/");
    window.open(`https://www.google.com/maps/dir/${result.origin.lat},${result.origin.lng}/${waypoints}/${result.destination.lat},${result.destination.lng}`, "_blank");
  };

  const handleStepGoogleMaps = (step: ItineraryStep) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${step.latitude},${step.longitude}`, "_blank");
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40 md:hidden" onClick={onClose} />

      <div className="fixed z-50 bg-card border-border shadow-xl flex flex-col
        bottom-0 left-0 right-0 h-[75vh] rounded-t-2xl border-t
        md:top-16 md:bottom-0 md:left-0 md:right-auto md:w-[380px] md:h-auto md:rounded-none md:border-r md:border-t-0 md:rounded-t-none">

        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <Navigation className="w-5 h-5 text-primary" />
            <h2 className="font-heading font-bold text-foreground">Itinéraire Pet-Friendly</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-5 h-5" /></Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
          <TabsList className="mx-4 mt-2 shrink-0">
            <TabsTrigger value="new" className="flex-1">🗺️ Nouvel itinéraire</TabsTrigger>
            <TabsTrigger value="saved" className="flex-1">📋 Mes itinéraires ({savedCount})</TabsTrigger>
          </TabsList>

          <TabsContent value="new" className="flex-1 min-h-0 m-0">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-4">
                {/* Map pick mode buttons */}
                <div className="flex gap-2">
                  <Button variant={pickMode === "origin" ? "default" : "outline"} size="sm"
                    className={`flex-1 text-xs ${pickMode === "origin" ? "bg-primary text-primary-foreground" : ""}`}
                    onClick={() => onPickModeChange(pickMode === "origin" ? null : "origin")}>
                    🟢 Définir départ sur carte
                  </Button>
                  <Button variant={pickMode === "destination" ? "default" : "outline"} size="sm"
                    className={`flex-1 text-xs ${pickMode === "destination" ? "bg-destructive text-destructive-foreground" : ""}`}
                    onClick={() => onPickModeChange(pickMode === "destination" ? null : "destination")}>
                    🔴 Définir arrivée sur carte
                  </Button>
                </div>

                <PlaceInput id="origin" label="Départ" value={originText} selection={origin} error={errors.origin} onSelect={handleOriginSelect} onChange={handleOriginChange} />

                <div className="flex justify-center">
                  <Button variant="outline" size="icon" onClick={handleSwap} className="rounded-full"><ArrowUpDown className="w-4 h-4" /></Button>
                </div>

                <PlaceInput id="destination" label="Arrivée" value={destText} selection={destination} error={errors.dest} onSelect={handleDestSelect} onChange={handleDestChange} />

                {/* Waypoints section */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">🗺️ Étapes intermédiaires</label>
                  {waypoints.length > 0 && (
                    <div className="space-y-1.5 mb-2">
                      {waypoints.map((wp, idx) => (
                        <div
                          key={wp.id}
                          draggable
                          onDragStart={() => handleDragStart(idx)}
                          onDragOver={(e) => handleDragOver(e, idx)}
                          onDragEnd={handleDragEnd}
                          className={`flex items-center gap-2 bg-muted/50 rounded-lg px-2 py-1.5 text-sm cursor-grab active:cursor-grabbing transition-opacity ${dragIdx === idx ? "opacity-50" : ""}`}
                        >
                          <GripVertical className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ backgroundColor: wp.isPetFriendly ? "#4CAF50" : "#FF9800" }}>
                            {idx + 1}
                          </span>
                          <span className="flex-1 truncate text-xs text-foreground">{wp.name}</span>
                          {wp.isPetFriendly && <span className="text-[10px]">🐾</span>}
                          <button onClick={() => removeWaypoint(wp.id)} className="text-muted-foreground hover:text-destructive transition-colors shrink-0">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {showWaypointSearch ? (
                    <WaypointSearchInput onSelect={addWaypoint} onCancel={() => setShowWaypointSearch(false)} />
                  ) : (
                    <button
                      onClick={() => setShowWaypointSearch(true)}
                      className="w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground py-2 rounded-lg border border-dashed border-border hover:border-primary/50 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" /> Ajouter une étape
                    </button>
                  )}
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">Distance max entre étapes</label>
                  <div className="flex gap-2">
                    {STEP_DISTANCE_OPTIONS.map((d) => (
                      <button key={d} onClick={() => setMaxStepDistance(d)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${maxStepDistance === d ? "bg-primary text-primary-foreground" : "bg-muted text-foreground hover:bg-muted/80"}`}>
                        {d} km
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">Types d'étapes</label>
                  <div className="space-y-2">
                    {CATEGORY_FILTERS.map((cf) => (
                      <label key={cf.key} className="flex items-center gap-3 cursor-pointer">
                        <Checkbox checked={filters[cf.key]} onCheckedChange={() => toggleFilter(cf.key)} />
                        <span className="text-sm">{cf.emoji} {cf.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <Button onClick={calculate} disabled={!canCalculate} className="w-full font-semibold">
                  {loading ? (<><Loader2 className="w-4 h-4 animate-spin" />Calcul en cours…</>) : (<><Navigation className="w-4 h-4" />Calculer l'itinéraire</>)}
                </Button>

                {loading && (
                  <div className="space-y-3">
                    <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: "60%" }} />
                    </div>
                    <p className="text-sm text-center text-muted-foreground animate-pulse">Calcul de votre itinéraire pet-friendly… 🐾</p>
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
                  </div>
                )}

                {result && !loading && (
                  <div className="space-y-4">
                    <div className="bg-muted/50 rounded-xl p-4 text-center space-y-1">
                      <div className="flex items-center justify-center gap-4 text-lg font-bold text-foreground">
                        <span>{result.totalDistance}</span>
                        <span className="text-muted-foreground">•</span>
                        <span>{result.totalDuration}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {result.steps.length} étape{result.steps.length !== 1 ? "s" : ""} pet-friendly
                        {waypoints.length > 0 && ` + ${waypoints.length} étape${waypoints.length !== 1 ? "s" : ""} perso`}
                      </p>
                    </div>

                    {result.steps.length === 0 && waypoints.length === 0 && (
                      <div className="bg-amber-50 dark:bg-amber-950/30 rounded-xl p-4 text-center">
                        <p className="text-sm text-amber-700 dark:text-amber-300">
                          Aucune étape trouvée sur ce trajet — pensez à prévoir de l'eau et des pauses pour votre animal 🐾
                        </p>
                      </div>
                    )}

                    {/* Waypoint steps */}
                    {waypoints.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-muted-foreground">⛳ Étapes personnalisées</p>
                        {waypoints.map((wp, i) => (
                          <div key={wp.id} className="bg-card border border-border rounded-xl p-3 shadow-sm space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: "#FF9800" }}>{i + 1}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-foreground truncate">{wp.name}</p>
                                <div className="flex gap-1">
                                  {wp.isPetFriendly ? (
                                    <span className="text-[10px] bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 px-1.5 py-0.5 rounded-full">🐾 Pet-friendly</span>
                                  ) : (
                                    <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">📍 Lieu</span>
                                  )}
                                  <span className="text-[10px] bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300 px-1.5 py-0.5 rounded-full">⛳ Étape perso</span>
                                </div>
                              </div>
                              <button onClick={() => removeWaypoint(wp.id)} className="text-muted-foreground hover:text-destructive"><X className="w-4 h-4" /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Pet-friendly steps */}
                    {result.steps.map((step, i) => {
                      const color = CATEGORY_COLORS[step.category] || "#9E9E9E";
                      return (
                        <div key={step.id}>
                          {i > 0 && <div className="flex justify-center py-1"><span className="text-muted-foreground text-lg">🐾</span></div>}
                          <div className="bg-card border border-border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow space-y-2">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0" style={{ backgroundColor: color }}>{i + 1}</div>
                              <div className="flex-1 min-w-0">
                                <span className="text-xs text-muted-foreground">Étape {i + 1} — à {Math.round(step.distance_from_start_km)} km</span>
                              </div>
                              <span className="text-[10px] bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 px-1.5 py-0.5 rounded-full shrink-0">🐾 Pet-friendly</span>
                            </div>
                            <div>
                              <p className="font-semibold text-foreground flex items-center gap-1.5">
                                <MapPin className="w-4 h-4 shrink-0 text-primary" />{step.name}
                              </p>
                              <p className="text-xs text-muted-foreground capitalize">{step.category}{step.outdoor_seating ? " • Terrasse" : ""}</p>
                            </div>
                            {step.phone && <p className="text-xs text-muted-foreground">📞 {step.phone}</p>}
                            {step.opening_hours && <p className="text-xs text-muted-foreground">🕐 {step.opening_hours}</p>}
                            {step.rating && <p className="text-xs text-muted-foreground">⭐ {step.rating}</p>}
                            <div className="flex gap-2 pt-1">
                              <Button variant="outline" size="sm" className="text-xs flex-1" onClick={() => onViewStep(step.latitude, step.longitude)}>Voir sur carte</Button>
                              <Button variant="outline" size="sm" className="text-xs flex-1" onClick={() => handleStepGoogleMaps(step)}>
                                <ExternalLink className="w-3 h-3" />Itinéraire
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    <div className="space-y-2 pt-2 border-t border-border">
                      <Button variant="outline" className="w-full text-sm" onClick={handleSaveClick}>
                        <Save className="w-4 h-4" />💾 Sauvegarder cet itinéraire
                      </Button>
                      <Button variant="outline" className="w-full text-sm" onClick={handleShare}>
                        <Share2 className="w-4 h-4" />Partager l'itinéraire
                      </Button>
                      <Button className="w-full text-sm" onClick={handleOpenGoogleMaps}>
                        <ExternalLink className="w-4 h-4" />Ouvrir dans Google Maps
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="saved" className="flex-1 min-h-0 m-0">
            <ScrollArea className="h-full">
              <div className="p-4 space-y-3">
                {itineraries.length === 0 && (
                  <div className="text-center py-12 space-y-2">
                    <Navigation className="w-12 h-12 text-muted-foreground/30 mx-auto" />
                    <p className="text-sm text-muted-foreground">🗺️ Aucun itinéraire sauvegardé</p>
                    <p className="text-xs text-muted-foreground">Calculez un itinéraire et sauvegardez-le pour le retrouver ici</p>
                  </div>
                )}
                {itineraries.map((it) => (
                  <div key={it.id} className="bg-card border border-border rounded-xl p-4 shadow-sm space-y-2">
                    <p className="font-semibold text-foreground text-sm">🗺️ {it.name}</p>
                    <p className="text-xs text-muted-foreground">{it.distance} • {it.duration} • {it.stopsCount} étapes 🐾</p>
                    <p className="text-xs text-muted-foreground">Sauvegardé le {new Date(it.savedAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}</p>
                    <div className="flex gap-2 pt-1">
                      <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => handleRelaunch(it)}>
                        <Play className="w-3 h-3" />Relancer
                      </Button>
                      <Button variant="outline" size="sm" className="text-xs text-destructive hover:bg-destructive/10"
                        onClick={() => { remove(it.id); toast("🗑️ Itinéraire supprimé"); }}>
                        <Trash2 className="w-3 h-3" />Supprimer
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>

      {/* Save dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>💾 Sauvegarder l'itinéraire</DialogTitle>
          </DialogHeader>
          <div>
            <label className="text-sm font-medium text-foreground mb-1 block">Nom</label>
            <input
              type="text" value={saveName} onChange={(e) => setSaveName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm outline-none"
              placeholder="Mon itinéraire"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>Annuler</Button>
            <Button onClick={handleSaveConfirm}>Sauvegarder</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
