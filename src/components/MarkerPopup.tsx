import { MapPin, Navigation, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PetPlace } from "./PlaceDetailPanel";

interface MarkerPopupProps {
  place: PetPlace;
  position: { x: number; y: number };
  onSetOrigin: () => void;
  onSetDestination: () => void;
  onShowInfo: () => void;
  onClose: () => void;
}

export default function MarkerPopup({ place, position, onSetOrigin, onSetDestination, onShowInfo, onClose }: MarkerPopupProps) {
  return (
    <>
      <div className="fixed inset-0 z-50" onClick={onClose} />
      <div
        className="fixed z-50 bg-card border border-border rounded-xl shadow-xl p-3 w-64"
        style={{
          left: Math.min(position.x, window.innerWidth - 280),
          top: Math.min(position.y - 10, window.innerHeight - 200),
          transform: "translate(-50%, -100%)",
        }}
      >
        <div className="space-y-2">
          <div>
            <p className="font-semibold text-foreground text-sm flex items-center gap-1.5">
              🐾 {place.name}
            </p>
            <p className="text-xs text-muted-foreground capitalize">
              {place.category}{place.city ? ` • ${place.city}` : ""}
            </p>
          </div>
          <div className="flex gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs h-8"
              onClick={(e) => { e.stopPropagation(); onSetOrigin(); }}
            >
              📍 Départ
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 text-xs h-8"
              onClick={(e) => { e.stopPropagation(); onSetDestination(); }}
            >
              🏁 Arrivée
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8 px-2"
              onClick={(e) => { e.stopPropagation(); onShowInfo(); }}
            >
              ℹ️
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
