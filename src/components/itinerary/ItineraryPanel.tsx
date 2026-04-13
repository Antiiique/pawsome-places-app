/// <reference types="google.maps" />
import { useState, useRef, useEffect, useCallback } from "react";
import { X, ArrowUpDown, Loader2, MapPin, ExternalLink, Share2, Save, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ItineraryMapData, ItineraryStep, PlaceSelection } from "./types";

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

interface ItineraryPanelProps {
  onClose: () => void;
  onRouteCalculated: (data: ItineraryMapData | null) => void;
  onViewStep: (lat: number, lng: number) => void;
}

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number; name: string }> {
  const geocoder = new google.maps.Geocoder();
  return new Promise((resolve, reject) => {
    geocoder.geocode({ address }, (results, status) => {
      if (status === "OK" && results?.[0]) {
        resolve({
          lat: results[0].geometry.location.lat(),
          lng: results[0].geometry.location.lng(),
          name: results[0].formatted_address,
        });
      } else {
        reject(new Error("Adresse introuvable : " + address));
      }
    });
  });
}

function setupAutocomplete(
  container: HTMLDivElement | null,
  onSelect: (location: { lat: number; lng: number }, text: string) => void,
  onTextChange: (text: string) => void
) {
  if (!container || !window.google?.maps?.places) return;
  try {
    const ac = new google.maps.places.PlaceAutocompleteElement({});
    (ac as any).style.cssText = "width:100%;border:none;outline:none;";
    container.innerHTML = "";
    container.appendChild(ac as unknown as Node);

    // Listen for text input changes for fallback
    const observer = new MutationObserver(() => {
      const input = container.querySelector("input");
      if (input) {
        input.addEventListener("input", () => onTextChange(input.value));
        observer.disconnect();
      }
    });
    observer.observe(container, { childList: true, subtree: true });

    // @ts-ignore - gmp-select is the correct event for new API
    ac.addEventListener("gmp-select", async (e: any) => {
      try {
        const place = e.placePrediction?.toPlace();
        if (!place) return;
        await place.fetchFields({ fields: ["location", "displayName"] });
        const loc = place.location;
        if (loc) {
          onSelect({ lat: loc.lat(), lng: loc.lng() }, place.displayName || "");
        }
      } catch (err) {
        console.warn("gmp-select handler error, will use geocoding fallback", err);
      }
    });
  } catch (err) {
    console.warn("PlaceAutocompleteElement setup failed", err);
  }
}

export default function ItineraryPanel({ onClose, onRouteCalculated, onViewStep }: ItineraryPanelProps) {
  const [origin, setOrigin] = useState<PlaceSelection | null>(null);
  const [destination, setDestination] = useState<PlaceSelection | null>(null);
  const [maxStepDistance, setMaxStepDistance] = useState(100);
  const [filters, setFilters] = useState<Record<string, boolean>>({
    outdoor: true, restaurant: true, hotel: true, services: true, shop: false,
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ItineraryMapData | null>(null);
  const [autoKey, setAutoKey] = useState(0);
  const [originText, setOriginText] = useState("");
  const [destText, setDestText] = useState("");
  const [errors, setErrors] = useState<{ origin?: string; dest?: string }>({});

  const originContainerRef = useRef<HTMLDivElement>(null);
  const destContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setupAutocomplete(
      originContainerRef.current,
      (loc, text) => { setOrigin({ location: loc, text }); setOriginText(text); setErrors((e) => ({ ...e, origin: undefined })); },
      (text) => { setOriginText(text); if (origin) setOrigin(null); }
    );
    setupAutocomplete(
      destContainerRef.current,
      (loc, text) => { setDestination({ location: loc, text }); setDestText(text); setErrors((e) => ({ ...e, dest: undefined })); },
      (text) => { setDestText(text); if (destination) setDestination(null); }
    );
  }, [autoKey]);

  const handleSwap = () => {
    const temp = origin;
    setOrigin(destination);
    setDestination(temp);
    setAutoKey((k) => k + 1);
  };

  const toggleFilter = (key: string) => {
    setFilters((f) => ({ ...f, [key]: !f[key] }));
  };

  const calculate = useCallback(async () => {
    const newErrors: { origin?: string; dest?: string } = {};

    // Get input text from containers for fallback
    const originInput = originContainerRef.current?.querySelector("input");
    const destInput = destContainerRef.current?.querySelector("input");
    const originVal = originInput?.value || originText;
    const destVal = destInput?.value || destText;

    if (!origin && !originVal.trim()) {
      newErrors.origin = "Veuillez saisir un point de départ";
    }
    if (!destination && !destVal.trim()) {
      newErrors.dest = "Veuillez saisir un point d'arrivée";
    }
    if (originVal.trim() && destVal.trim() && originVal.trim() === destVal.trim()) {
      toast.error("Le départ et l'arrivée doivent être différents");
      return;
    }
    if (newErrors.origin || newErrors.dest) {
      setErrors(newErrors);
      return;
    }

    if (!window.google?.maps?.DirectionsService) {
      toast.error("Google Maps n'est pas encore chargé.");
      return;
    }

    setLoading(true);
    setResult(null);
    setErrors({});
    onRouteCalculated(null);

    try {
      // Use selected place coords, or fallback to geocoding
      let originLoc = origin?.location;
      let destLoc = destination?.location;
      let originName = origin?.text || originVal;
      let destName = destination?.text || destVal;

      if (!originLoc) {
        const geo = await geocodeAddress(originVal);
        originLoc = { lat: geo.lat, lng: geo.lng };
        originName = geo.name;
        setOrigin({ location: originLoc, text: originName });
      }
      if (!destLoc) {
        const geo = await geocodeAddress(destVal);
        destLoc = { lat: geo.lat, lng: geo.lng };
        destName = geo.name;
        setDestination({ location: destLoc, text: destName });
      }

      // Step 1: Get directions
      const directionsService = new google.maps.DirectionsService();
      const dirResult = await directionsService.route({
        origin: originLoc,
        destination: destLoc,
        travelMode: google.maps.TravelMode.DRIVING,
      });

      const route = dirResult.routes[0];
      if (!route?.legs?.[0]) throw new Error("Aucun itinéraire trouvé");

      const leg = route.legs[0];
      const path = route.overview_path;

      // Step 2: Sample checkpoints along the route
      let cumDist = 0;
      const pathWithDist: { point: google.maps.LatLng; dist: number }[] = [
        { point: path[0], dist: 0 },
      ];
      for (let i = 1; i < path.length; i++) {
        cumDist += google.maps.geometry.spherical.computeDistanceBetween(path[i - 1], path[i]);
        pathWithDist.push({ point: path[i], dist: cumDist });
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

      // Step 3: Query Supabase for each checkpoint
      const selectedCategories = Object.entries(filters)
        .filter(([, v]) => v)
        .map(([k]) => k);

      const allPlaces: ItineraryStep[] = [];
      for (const cp of checkpoints) {
        for (const cat of selectedCategories) {
          const { data } = await supabase.rpc("get_nearby_pet_places", {
            user_lat: cp.lat,
            user_lon: cp.lng,
            radius_km: 15,
            cat_filter: cat,
            dogs_only: false,
          });
          if (data) {
            const mapped = data.slice(0, 3).map((d: any) => ({
              ...d,
              id: d.id as string,
              distance_from_start_km: cp.dist,
            }));
            allPlaces.push(...mapped);
          }
        }
      }

      // Step 4: Deduplicate and sort
      const seen = new Set<string>();
      const unique = allPlaces.filter((p) => {
        if (seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      });
      unique.sort((a, b) => a.distance_from_start_km - b.distance_from_start_km);
      const steps = unique.slice(0, 8);

      // Pause points every ~160km (approx 2h)
      const pausePoints: { lat: number; lng: number; distance_km: number }[] = [];
      let nextPause = 160000;
      for (const pd of pathWithDist) {
        if (pd.dist >= nextPause) {
          pausePoints.push({
            lat: pd.point.lat(),
            lng: pd.point.lng(),
            distance_km: pd.dist / 1000,
          });
          nextPause += 160000;
        }
      }

      const routePath = path.map((p) => ({ lat: p.lat(), lng: p.lng() }));
      const itineraryResult: ItineraryMapData = {
        routePath,
        origin: originLoc,
        destination: destLoc,
        steps,
        pausePoints,
        totalDistance: leg.distance?.text || "",
        totalDuration: leg.duration?.text || "",
      };

      setResult(itineraryResult);
      onRouteCalculated(itineraryResult);
    } catch (err: any) {
      console.error("Route calculation error:", err);
      toast.error(err.message || "Adresse non reconnue. Essayez avec une ville ou un code postal.");
    } finally {
      setLoading(false);
    }
  }, [origin, destination, originText, destText, maxStepDistance, filters, onRouteCalculated]);

  const handleShare = () => {
    if (!result) return;
    const params = new URLSearchParams({
      from: `${result.origin.lat},${result.origin.lng}`,
      to: `${result.destination.lat},${result.destination.lng}`,
    });
    const url = `${window.location.origin}${window.location.pathname}?itinerary=${params.toString()}`;
    navigator.clipboard.writeText(url);
    toast.success("Lien copié dans le presse-papier !");
  };

  const handleSave = () => {
    if (!result) return;
    localStorage.setItem("saved_itinerary", JSON.stringify(result));
    toast.success("Itinéraire sauvegardé !");
  };

  const handleOpenGoogleMaps = () => {
    if (!result) return;
    const waypoints = result.steps.map((s) => `${s.latitude},${s.longitude}`).join("/");
    const url = `https://www.google.com/maps/dir/${result.origin.lat},${result.origin.lng}/${waypoints}/${result.destination.lat},${result.destination.lng}`;
    window.open(url, "_blank");
  };

  const handleStepGoogleMaps = (step: ItineraryStep) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${step.latitude},${step.longitude}`, "_blank");
  };

  return (
    <>
      {/* Backdrop on mobile */}
      <div className="fixed inset-0 bg-black/30 z-40 md:hidden" onClick={onClose} />

      <div className="fixed z-50 bg-card border-border shadow-xl flex flex-col
        bottom-0 left-0 right-0 h-[75vh] rounded-t-2xl border-t
        md:top-16 md:bottom-0 md:left-0 md:right-auto md:w-[380px] md:h-auto md:rounded-none md:border-r md:border-t-0 md:rounded-t-none">

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <Navigation className="w-5 h-5 text-primary" />
            <h2 className="font-heading font-bold text-foreground">Itinéraire Pet-Friendly</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {/* Origin */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Départ</label>
              <div
                key={`origin-${autoKey}`}
                ref={originContainerRef}
                className="rounded-lg border border-border bg-background text-foreground text-sm overflow-hidden [&_input]:w-full [&_input]:pl-4 [&_input]:pr-4 [&_input]:py-2.5 [&_input]:bg-transparent [&_input]:text-sm [&_input]:outline-none [&_input]:border-none"
              />
              {origin && <span className="text-xs text-primary mt-1 block">✓ {origin.text}</span>}
            </div>

            {/* Swap button */}
            <div className="flex justify-center">
              <Button variant="outline" size="icon" onClick={handleSwap} className="rounded-full">
                <ArrowUpDown className="w-4 h-4" />
              </Button>
            </div>

            {/* Destination */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Arrivée</label>
              <div
                key={`dest-${autoKey}`}
                ref={destContainerRef}
                className="rounded-lg border border-border bg-background text-foreground text-sm overflow-hidden [&_input]:w-full [&_input]:pl-4 [&_input]:pr-4 [&_input]:py-2.5 [&_input]:bg-transparent [&_input]:text-sm [&_input]:outline-none [&_input]:border-none"
              />
              {destination && <span className="text-xs text-primary mt-1 block">✓ {destination.text}</span>}
            </div>

            {/* Max step distance */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Distance max entre étapes</label>
              <div className="flex gap-2">
                {STEP_DISTANCE_OPTIONS.map((d) => (
                  <button
                    key={d}
                    onClick={() => setMaxStepDistance(d)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                      maxStepDistance === d
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground hover:bg-muted/80"
                    }`}
                  >
                    {d} km
                  </button>
                ))}
              </div>
            </div>

            {/* Category filters */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Types d'étapes</label>
              <div className="space-y-2">
                {CATEGORY_FILTERS.map((cf) => (
                  <label key={cf.key} className="flex items-center gap-3 cursor-pointer">
                    <Checkbox
                      checked={filters[cf.key]}
                      onCheckedChange={() => toggleFilter(cf.key)}
                    />
                    <span className="text-sm">{cf.emoji} {cf.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Calculate button */}
            <Button
              onClick={calculate}
              disabled={loading}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Calcul en cours…
                </>
              ) : (
                <>
                  <Navigation className="w-4 h-4" />
                  Calculer l'itinéraire
                </>
              )}
            </Button>

            {/* Loading state */}
            {loading && (
              <div className="space-y-3">
                <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: "60%" }} />
                </div>
                <p className="text-sm text-center text-muted-foreground animate-pulse">
                  Calcul de votre itinéraire pet-friendly… 🐾
                </p>
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-xl" />
                ))}
              </div>
            )}

            {/* Results */}
            {result && !loading && (
              <div className="space-y-4">
                {/* Summary header */}
                <div className="bg-muted/50 rounded-xl p-4 text-center space-y-1">
                  <div className="flex items-center justify-center gap-4 text-lg font-bold text-foreground">
                    <span>{result.totalDistance}</span>
                    <span className="text-muted-foreground">•</span>
                    <span>{result.totalDuration}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {result.steps.length} étape{result.steps.length !== 1 ? "s" : ""} pet-friendly trouvée{result.steps.length !== 1 ? "s" : ""}
                  </p>
                </div>

                {/* No results message */}
                {result.steps.length === 0 && (
                  <div className="bg-amber-50 dark:bg-amber-950/30 rounded-xl p-4 text-center">
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      Aucune étape trouvée sur ce trajet — pensez à prévoir de l'eau et des pauses pour votre animal 🐾
                    </p>
                  </div>
                )}

                {/* Step cards */}
                {result.steps.map((step, i) => {
                  const color = CATEGORY_COLORS[step.category] || "#9E9E9E";
                  return (
                    <div key={step.id}>
                      {i > 0 && (
                        <div className="flex justify-center py-1">
                          <span className="text-muted-foreground text-lg">🐾</span>
                        </div>
                      )}
                      <div className="bg-card border border-border rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow space-y-2">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                            style={{ backgroundColor: color }}
                          >
                            {i + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-xs text-muted-foreground">Étape {i + 1} — à {Math.round(step.distance_from_start_km)} km</span>
                          </div>
                        </div>
                        <div>
                          <p className="font-semibold text-foreground flex items-center gap-1.5">
                            <MapPin className="w-4 h-4 shrink-0 text-primary" />
                            {step.name}
                          </p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {step.category}{step.outdoor_seating ? " • Terrasse" : ""}
                          </p>
                        </div>
                        {step.phone && (
                          <p className="text-xs text-muted-foreground">📞 {step.phone}</p>
                        )}
                        {step.opening_hours && (
                          <p className="text-xs text-muted-foreground">🕐 {step.opening_hours}</p>
                        )}
                        {step.rating && (
                          <p className="text-xs text-muted-foreground">⭐ {step.rating}</p>
                        )}
                        <div className="flex gap-2 pt-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs flex-1"
                            onClick={() => onViewStep(step.latitude, step.longitude)}
                          >
                            Voir sur carte
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs flex-1"
                            onClick={() => handleStepGoogleMaps(step)}
                          >
                            <ExternalLink className="w-3 h-3" />
                            Itinéraire
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Footer actions */}
                <div className="space-y-2 pt-2 border-t border-border">
                  <Button variant="outline" className="w-full text-sm" onClick={handleShare}>
                    <Share2 className="w-4 h-4" />
                    Partager l'itinéraire
                  </Button>
                  <Button variant="outline" className="w-full text-sm" onClick={handleSave}>
                    <Save className="w-4 h-4" />
                    Sauvegarder
                  </Button>
                  <Button className="w-full text-sm bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleOpenGoogleMaps}>
                    <ExternalLink className="w-4 h-4" />
                    Ouvrir dans Google Maps
                  </Button>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </>
  );
}
