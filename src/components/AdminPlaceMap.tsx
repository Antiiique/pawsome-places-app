import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { X, MapPin } from "lucide-react";

const MAPBOX_TOKEN =
  (import.meta.env.VITE_MAPBOX_TOKEN as string) ||
  "pk.eyJ1IjoiZWx2aW5hZ2QiLCJhIjoiY21vcjMwNHU5MmFodzJxc2FnOTc1bHVsYiJ9.zkIqku9ZIn5_h674NQLX3w";

export interface MapAdminPlace {
  id: string;
  name: string;
  category: string;
  city: string | null;
  address: string | null;
  latitude: number;
  longitude: number;
  verified: boolean;
  is_flagged: boolean;
}

interface AdminPlaceMapProps {
  places: MapAdminPlace[];
  focusPlace?: MapAdminPlace | null;
  onClose: () => void;
}

export default function AdminPlaceMap({ places, focusPlace, onClose }: AdminPlaceMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapRef.current || places.length === 0) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const initialCenter: [number, number] = focusPlace
      ? [focusPlace.longitude, focusPlace.latitude]
      : [2.3522, 46.8];

    const map = new mapboxgl.Map({
      container: mapRef.current,
      style: "mapbox://styles/mapbox/streets-v12",
      center: initialCenter,
      zoom: focusPlace ? 14 : 5,
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    map.on("load", () => {
      places.forEach((place) => {
        const isFocus = focusPlace?.id === place.id;
        const color = place.is_flagged
          ? "#f97316"
          : place.verified
          ? "#22c55e"
          : "#6366f1";

        const el = document.createElement("div");
        const size = isFocus ? 20 : 12;
        el.style.cssText = [
          `width:${size}px`,
          `height:${size}px`,
          "border-radius:50%",
          `background:${color}`,
          "border:2px solid white",
          "box-shadow:0 1px 6px rgba(0,0,0,0.35)",
          "cursor:pointer",
          "transition:transform 0.15s",
        ].join(";");
        el.onmouseenter = () => (el.style.transform = "scale(1.4)");
        el.onmouseleave = () => (el.style.transform = "scale(1)");

        const popup = new mapboxgl.Popup({ offset: 16, closeButton: false, maxWidth: "220px" })
          .setHTML(`
            <div style="font-family:system-ui,sans-serif;padding:2px">
              <p style="font-weight:700;font-size:13px;margin:0 0 3px;color:#111">${place.name}</p>
              <p style="font-size:11px;color:#6b7280;margin:0">${place.category}${place.city ? ` · ${place.city}` : ""}</p>
              ${place.address ? `<p style="font-size:11px;color:#9ca3af;margin:3px 0 0">${place.address}</p>` : ""}
              <div style="display:flex;gap:6px;margin-top:4px">
                ${place.verified ? '<span style="font-size:10px;color:#22c55e;background:#f0fdf4;padding:1px 6px;border-radius:99px">✅ Vérifié</span>' : ""}
                ${place.is_flagged ? '<span style="font-size:10px;color:#f97316;background:#fff7ed;padding:1px 6px;border-radius:99px">⚠️ Signalé</span>' : ""}
              </div>
            </div>
          `);

        new mapboxgl.Marker(el)
          .setLngLat([place.longitude, place.latitude])
          .setPopup(popup)
          .addTo(map);

        // Auto-open popup for focused place
        if (isFocus) {
          const marker = new mapboxgl.Marker(el)
            .setLngLat([place.longitude, place.latitude])
            .setPopup(popup)
            .addTo(map);
          marker.togglePopup();
        }
      });

      // Fit all markers if no focus place
      if (!focusPlace && places.length > 1) {
        const bounds = new mapboxgl.LngLatBounds();
        places.forEach((p) => bounds.extend([p.longitude, p.latitude]));
        map.fitBounds(bounds, { padding: 70, maxZoom: 14 });
      }
    });

    return () => map.remove();
  }, []);

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-3 sm:p-6"
      onClick={onClose}
    >
      <div
        className="relative bg-card rounded-2xl overflow-hidden shadow-2xl w-full max-w-5xl"
        style={{ height: "82vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="absolute top-3 left-3 z-10 bg-card/90 backdrop-blur-sm px-3 py-2 rounded-xl border border-border shadow-sm">
          <p className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-primary" />
            {focusPlace ? focusPlace.name : `${places.length} lieu${places.length > 1 ? "x" : ""} sur la carte`}
          </p>
          {focusPlace && (
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {focusPlace.category}{focusPlace.city ? ` · ${focusPlace.city}` : ""}
            </p>
          )}
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-1.5">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Vérifié
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" /> Non vérifié
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-orange-500 inline-block" /> Signalé
            </span>
          </div>
        </div>

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 p-2 rounded-full bg-card/90 backdrop-blur-sm border border-border hover:bg-muted transition-colors shadow-sm"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* Map */}
        <div ref={mapRef} className="w-full h-full" />
      </div>
    </div>
  );
}
