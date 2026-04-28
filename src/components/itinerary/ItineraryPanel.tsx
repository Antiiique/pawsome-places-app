import { useState, useRef, useEffect, useCallback } from "react";
import { X, ArrowUpDown, Loader2, MapPin, ExternalLink, Share2, Save, Navigation, Check, Trash2, Play, GripVertical, Plus, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ItineraryMapData, ItineraryStep, PlaceSelection, Waypoint } from "./types";
import { useSavedItineraries, type SavedItinerary } from "@/hooks/useSavedItineraries";

const GOOGLE_MAPS_API_KEY = "AIzaSyDP4zY29gT-tXDxcszWHBWSC8_14AEmiYg";
const MAPBOX_TOKEN = (import.meta.env.VITE_MAPBOX_TOKEN as string) || "pk.eyJ1IjoiZWx2aW5hZ2QiLCJhIjoiY21vNzlzaTZ5MDUxMTJxc2V1Ym5sZzVxNyJ9.QVzHhHQIH-DsrHzfi-STRA";

function decodePolyline(encoded: string): { lat: number; lng: number }[] {
  const pts: { lat: number; lng: number }[] = [];
  let i = 0, lat = 0, lng = 0;
  while (i < encoded.length) {
    let r = 0, s = 0, b: number;
    do { b = encoded.charCodeAt(i++) - 63; r |= (b & 0x1f) << s; s += 5; } while (b >= 0x20);
    lat += r & 1 ? ~(r >> 1) : r >> 1;
    r = 0; s = 0;
    do { b = encoded.charCodeAt(i++) - 63; r |= (b & 0x1f) << s; s += 5; } while (b >= 0x20);
    lng += r & 1 ? ~(r >> 1) : r >> 1;
    pts.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  return pts;
}

function distanceBetween(p1: { lat: number; lng: number }, p2: { lat: number; lng: number }): number {
  const R = 6371000;
  const dLat = (p2.lat - p1.lat) * Math.PI / 180;
  const dLng = (p2.lng - p1.lng) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const ROUTE_CATEGORIES = ["restaurant", "hotel", "outdoor", "parc_chiens", "veterinaire", "cafe_animalier", "shop", "aire_repos"];

const CATEGORY_COLORS: Record<string, string> = {
  restaurant: "#FF6B35",
  hotel: "#4285F4",
  outdoor: "#4CAF50",
  services: "#E53935",
  shop: "#9C27B0",
};

export type PickMode = "origin" | "destination" | null;

interface ItineraryPanelProps {
  open: boolean;
  onClose: () => void;
  onRouteCalculated: (data: ItineraryMapData | null) => void;
  onViewStep: (lat: number, lng: number) => void;
  pickMode: PickMode;
  onPickModeChange: (mode: PickMode) => void;
  dragProgress?: number;
}

interface Prediction {
  id: string;
  place_name: string;
  text: string;
  context?: Array<{ text: string }>;
  center: [number, number];
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
    if (!input.trim()) { setPredictions([]); setShowDropdown(false); return; }
    fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(input)}.json?access_token=${MAPBOX_TOKEN}&language=fr&limit=5`)
      .then((r) => r.json())
      .then((data) => {
        if (data.features?.length) {
          setPredictions(data.features);
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
    onChange(pred.place_name);
    onSelect({ location: { lat: pred.center[1], lng: pred.center[0] }, text: pred.place_name });
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
            <button key={pred.id} onClick={() => handleSelect(pred)} className="w-full text-left px-3 py-2.5 hover:bg-muted transition-colors flex items-start gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{pred.text}</p>
                <p className="text-xs text-muted-foreground truncate">{pred.context?.map((c) => c.text).join(", ")}</p>
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
    if (!input.trim()) { setPredictions([]); setShowDropdown(false); return; }
    fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(input)}.json?access_token=${MAPBOX_TOKEN}&language=fr&limit=5`)
      .then((r) => r.json())
      .then((data) => {
        if (data.features?.length) { setPredictions(data.features); setShowDropdown(true); }
        else { setPredictions([]); setShowDropdown(false); }
      });
  }, []);

  const handleInput = (val: string) => {
    setText(val);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => fetchPredictions(val), 300);
  };

  const handleSelect = (pred: Prediction) => {
    setShowDropdown(false);
    onSelect({ name: pred.text, lat: pred.center[1], lng: pred.center[0], category: "other", isPetFriendly: false });
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
            <button key={pred.id} onClick={() => handleSelect(pred)} className="w-full text-left px-3 py-2 hover:bg-muted transition-colors flex items-start gap-2">
              <MapPin className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{pred.text}</p>
                <p className="text-[11px] text-muted-foreground truncate">{pred.context?.map((c) => c.text).join(", ")}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ItineraryPanel({ open, onClose, onRouteCalculated, onViewStep, pickMode, onPickModeChange, dragProgress }: ItineraryPanelProps) {
  const [origin, setOrigin] = useState<PlaceSelection | null>(null);
  const [destination, setDestination] = useState<PlaceSelection | null>(null);
  const [originText, setOriginText] = useState("");
  const [destText, setDestText] = useState("");
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

  const clearRoute = () => {
    setResult(null); setLegs([]); onRouteCalculated(null);
  };

  const clearOrigin = () => { setOrigin(null); setOriginText(""); clearRoute(); };
  const clearDestination = () => { setDestination(null); setDestText(""); clearRoute(); };
  const clearAll = () => { clearOrigin(); clearDestination(); setWaypoints([]); clearRoute(); toast("🗑️ Itinéraire effacé"); };


  const handleOriginSelect = (sel: PlaceSelection) => { setOrigin(sel); setOriginText(sel.text); setErrors((e) => ({ ...e, origin: undefined })); };
  const handleDestSelect = (sel: PlaceSelection) => { setDestination(sel); setDestText(sel.text); setErrors((e) => ({ ...e, dest: undefined })); };
  const handleOriginChange = (text: string) => { setOriginText(text); if (origin) setOrigin(null); };
  const handleDestChange = (text: string) => { setDestText(text); if (destination) setDestination(null); };

  const removeWaypoint = (id: string) => { setWaypoints((prev) => prev.filter((w) => w.id !== id)); clearRoute(); };

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
        "routes.legs",
      ];

      if (waypoints.length > 0) {
        body.intermediates = waypoints.map((wp) => ({
          location: { latLng: { latitude: parseFloat(String(wp.lat)), longitude: parseFloat(String(wp.lng)) } },
        }));
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

      const decodedPath = decodePolyline(route.polyline.encodedPolyline);

      let cumDist = 0;
      const pathWithDist: { point: { lat: number; lng: number }; dist: number }[] = [{ point: decodedPath[0], dist: 0 }];
      for (let i = 1; i < decodedPath.length; i++) {
        cumDist += distanceBetween(decodedPath[i - 1], decodedPath[i]);
        pathWithDist.push({ point: decodedPath[i], dist: cumDist });
      }

      // Adaptive checkpoints: 1 every ~15 km, minimum 4, maximum 25
      const totalDistKm = cumDist / 1000;
      const numCheckpoints = Math.min(25, Math.max(4, Math.ceil(totalDistKm / 15)));
      const stepDistM = cumDist / (numCheckpoints + 1);

      const checkpoints: { lat: number; lng: number; dist: number }[] = [];
      let nextCheckDist = stepDistM;
      for (const pd of pathWithDist) {
        if (pd.dist >= nextCheckDist && checkpoints.length < numCheckpoints) {
          checkpoints.push({ lat: pd.point.lat, lng: pd.point.lng, dist: pd.dist / 1000 });
          nextCheckDist += stepDistM;
        }
      }

      // Search corridor radius: tighter on short routes, wider on long ones
      const corridorKm = Math.min(15, Math.max(5, totalDistKm * 0.08));

      const allPlaces: ItineraryStep[] = [];
      for (const cp of checkpoints) {
        const { data } = await supabase.rpc("get_nearby_pet_places", {
          user_lat: cp.lat, user_lon: cp.lng,
          radius_km: corridorKm,
          cat_filter: null,
          dogs_only: false,
        });
        if (data) {
          allPlaces.push(...data.slice(0, 5).map((d: any) => ({
            ...d, id: d.id as string,
            distance_from_start_km: cp.dist,
          })));
        }
      }

      // Deduplicate, then sort by position along route
      const seen = new Set<string>();
      const unique = allPlaces.filter((p) => { if (seen.has(p.id)) return false; seen.add(p.id); return true; });
      unique.sort((a, b) => a.distance_from_start_km - b.distance_from_start_km);
      const steps = unique.slice(0, 20);

      const pausePoints: { lat: number; lng: number; distance_km: number }[] = [];
      let nextPause = 160000;
      for (const pd of pathWithDist) {
        if (pd.dist >= nextPause) {
          pausePoints.push({ lat: pd.point.lat, lng: pd.point.lng, distance_km: pd.dist / 1000 });
          nextPause += 160000;
        }
      }

      const routePath = decodedPath.map((p) => ({ lat: p.lat, lng: p.lng }));
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
  }, [origin, destination, originText, destText, waypoints, onRouteCalculated]);

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
    const origin = `${result.origin.lat},${result.origin.lng}`;
    const destination = `${result.destination.lat},${result.destination.lng}`;
    let url = 'https://www.google.com/maps/dir/?api=1';
    url += '&origin=' + encodeURIComponent(origin);
    url += '&destination=' + encodeURIComponent(destination);
    url += '&travelmode=driving';
    if (waypoints.length > 0) {
      const waypointsStr = waypoints
        .slice(0, 9)
        .map(wp => `${wp.lat},${wp.lng}`)
        .join('|');
      url += '&waypoints=' + encodeURIComponent(waypointsStr);
    }
    window.open(url, '_blank');
  };

  const handleStepGoogleMaps = (step: ItineraryStep) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${step.latitude},${step.longitude}`, "_blank");
  };

  return (
    <>
      {/* Mobile backdrop */}
      <div data-panel className={`fixed z-[600] inset-x-0 bottom-0 bg-card shadow-xl flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
        open ? "translate-x-0" : "-translate-x-full"
      }`} style={{
        top: 56,
        ...(dragProgress !== undefined ? { transform: `translateX(${-(1 - dragProgress) * 100}%)`, transition: "none" } : {}),
      }}>

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

                <div className="relative">
                  <PlaceInput id="origin" label="Départ" value={originText} selection={origin} error={errors.origin} onSelect={handleOriginSelect} onChange={handleOriginChange} />
                  {(origin || originText) && (
                    <button onClick={clearOrigin} className="absolute top-0 right-0 text-muted-foreground hover:text-destructive transition-colors p-1" title="Effacer le départ">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Étapes intermédiaires — entre Départ et Arrivée */}
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
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, idx)}
                          onDragEnd={handleDragEnd}
                           className={`flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm cursor-grab active:cursor-grabbing transition-all ${
                            dragIdx === idx ? "opacity-40 scale-[0.98]" : ""
                          } ${dropTargetIdx === idx && dragIdx !== idx ? "border-primary bg-primary/5" : "bg-muted/50"} border border-transparent`}
                        >
                          <GripVertical className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                          <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ backgroundColor: wp.isPetFriendly ? "#4CAF50" : "#FF9800" }}>
                            {idx + 1}
                          </span>
                          <span className="flex-1 min-w-0 text-xs text-foreground break-words whitespace-normal leading-snug">{wp.name}</span>
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

                <div className="flex justify-center">
                  <Button variant="outline" size="icon" onClick={handleSwap} className="rounded-full"><ArrowUpDown className="w-4 h-4" /></Button>
                </div>

                <div className="relative">
                  <PlaceInput id="destination" label="Arrivée" value={destText} selection={destination} error={errors.dest} onSelect={handleDestSelect} onChange={handleDestChange} />
                  {(destination || destText) && (
                    <button onClick={clearDestination} className="absolute top-0 right-0 text-muted-foreground hover:text-destructive transition-colors p-1" title="Effacer l'arrivée">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <Button onClick={calculate} disabled={!canCalculate} className="w-full font-semibold">
                  {loading ? (<><Loader2 className="w-4 h-4 animate-spin" />Calcul en cours…</>) : (<><Navigation className="w-4 h-4" />Calculer l'itinéraire</>)}
                </Button>

                {(origin || destination || waypoints.length > 0 || result) && (
                  <Button variant="outline" className="w-full text-sm text-muted-foreground hover:text-destructive" onClick={clearAll}>
                    <Trash2 className="w-4 h-4" />🗑️ Effacer tout
                  </Button>
                )}

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

                    {/* Leg-by-leg summary */}
                    {legs.length > 1 && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground mb-1">📋 Détail par tronçon</p>
                        {legs.map((leg, i) => {
                          const legH = Math.floor(leg.durationMin / 60);
                          const legM = leg.durationMin % 60;
                          const durStr = legH > 0 ? `${legH}h${legM.toString().padStart(2, "0")}` : `${legM} min`;
                          return (
                            <div key={i} className="flex items-center gap-2 text-xs bg-muted/30 rounded-lg px-3 py-2">
                              <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">{i + 1}</span>
                              <span className="flex-1 min-w-0 break-words whitespace-normal text-foreground">{leg.startName} → {leg.endName}</span>
                              <span className="text-muted-foreground shrink-0">{leg.distanceKm} km • {durStr}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}

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
                                <p className="text-sm font-semibold text-foreground break-words whitespace-normal">{wp.name}</p>
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
