import Header from "@/components/Header";
import MapSection from "@/components/MapSection";
import ItineraryPanel from "@/components/itinerary/ItineraryPanel";
import UserProfileModal from "@/components/UserProfileModal";
import FavoritesPanel from "@/components/FavoritesPanel";
import UserProfilePanel from "@/components/UserProfilePanel";
import PetProfilePanel from "@/components/PetProfilePanel";
import MessagesPanel from "@/components/MessagesPanel";
import type { PickMode } from "@/components/itinerary/ItineraryPanel";
import { useState, useCallback, useEffect, useRef } from "react";
import type { ItineraryMapData } from "@/components/itinerary/types";
import { useFavorites } from "@/hooks/useFavorites";

type PanelName = "itinerary" | "favorites" | "profile" | null;

const EDGE_ZONE = 44;
const SNAP_THRESHOLD = 0.25;
const VELOCITY_THRESHOLD = 0.3; // px/ms

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activePanel, setActivePanel] = useState<PanelName>(null);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [showMessages, setShowMessages] = useState(false);
  const [pendingChat, setPendingChat] = useState<{ convId: string; other: { id: string; display_name: string | null; avatar_url: string | null } } | null>(null);
  const [petProfileId, setPetProfileId] = useState<string | null>(null);
  const [itineraryData, setItineraryData] = useState<ItineraryMapData | null>(null);
  const [pickMode, setPickMode] = useState<PickMode>(null);
  const [panelDrag, setPanelDrag] = useState<{ panel: "itinerary" | "favorites" | "profile"; progress: number } | null>(null);

  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const activePanelRef = useRef<PanelName>(null);
  const velPrevX = useRef<number | null>(null);
  const velPrevT = useRef<number | null>(null);
  const velCurrX = useRef<number | null>(null);
  const velCurrT = useRef<number | null>(null);
  const prevShouldFreezeRef = useRef(false);

  useEffect(() => { activePanelRef.current = activePanel; }, [activePanel]);

  useEffect(() => {
    const handler = (e: Event) => {
      const userId = (e as CustomEvent).detail?.userId;
      if (userId) setProfileUserId(userId);
    };
    window.addEventListener("open-user-profile", handler);
    return () => window.removeEventListener("open-user-profile", handler);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const petId = (e as CustomEvent).detail?.petId;
      if (petId) setPetProfileId(petId);
    };
    window.addEventListener("open-pet-profile", handler);
    return () => window.removeEventListener("open-pet-profile", handler);
  }, []);

  // Freeze map whenever a panel is open OR being dragged — only dispatch on actual state change
  useEffect(() => {
    const shouldFreeze = activePanel !== null || panelDrag !== null;
    if (shouldFreeze === prevShouldFreezeRef.current) return;
    prevShouldFreezeRef.current = shouldFreeze;
    window.dispatchEvent(new Event(shouldFreeze ? "map-freeze" : "map-unfreeze"));
  }, [activePanel, panelDrag]);

  const { favorites, isFavorite, toggleFavorite, removeFavorite, count: favCount } = useFavorites();

  const openPanel = useCallback((panel: PanelName) => {
    setActivePanel((prev) => (prev === panel ? null : panel));
    if (panel !== "itinerary") setPickMode(null);
  }, []);

  // ── Shared move/end handlers (used by both strips and outer div) ──
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!panelDrag || touchStartX.current === null) return;
    const x = e.touches[0].clientX;
    const dx = x - touchStartX.current;
    const dy = e.touches[0].clientY - (touchStartY.current ?? 0);
    if (Math.abs(dy) > Math.abs(dx) + 10) return;

    velPrevX.current = velCurrX.current;
    velPrevT.current = velCurrT.current;
    velCurrX.current = x;
    velCurrT.current = Date.now();

    const screenW = window.innerWidth;
    const current = activePanelRef.current;
    if (panelDrag.panel === "itinerary") {
      const base = current === "itinerary" ? 1 : 0;
      setPanelDrag({ panel: "itinerary", progress: Math.max(0, Math.min(1, base + dx / screenW)) });
    } else {
      const base = current === "profile" ? 1 : 0;
      setPanelDrag({ panel: "profile", progress: Math.max(0, Math.min(1, base - dx / screenW)) });
    }
  };

  const handleTouchEnd = () => {
    if (!panelDrag) return;
    const { panel, progress } = panelDrag;

    const vel =
      velPrevX.current !== null && velCurrX.current !== null &&
      velPrevT.current !== null && velCurrT.current !== null &&
      velCurrT.current > velPrevT.current
        ? (velCurrX.current - velPrevX.current) / (velCurrT.current - velPrevT.current)
        : 0;

    setPanelDrag(null);
    touchStartX.current = null; touchStartY.current = null;
    velPrevX.current = null; velPrevT.current = null;
    velCurrX.current = null; velCurrT.current = null;

    if (panel === "itinerary") {
      const flickClose = vel < -VELOCITY_THRESHOLD;
      const flickOpen  = vel >  VELOCITY_THRESHOLD;
      if (flickClose || (!flickOpen && progress < SNAP_THRESHOLD)) {
        setActivePanel(null); setPickMode(null);
      } else {
        setActivePanel("itinerary");
      }
    } else {
      const flickClose = vel >  VELOCITY_THRESHOLD;
      const flickOpen  = vel < -VELOCITY_THRESHOLD;
      if (flickClose || (!flickOpen && progress < SNAP_THRESHOLD)) {
        setActivePanel(null);
      } else {
        setActivePanel(panel as PanelName);
      }
    }
  };

  // ── Strip handler: called when touch starts on a dedicated edge strip ──
  // The strip sits ABOVE the map canvas (z-20 > canvas z-0), so Mapbox never
  // receives the touchstart — all subsequent touchmoves also go to the strip.
  const handleStripStart = (panel: "itinerary" | "favorites" | "profile") => (e: React.TouchEvent) => {
    e.stopPropagation(); // Don't bubble to outer div
    // Freeze map synchronously — before any setState/re-render — so the canvas
    // has pointer-events:none before the first touchmove fires.
    window.dispatchEvent(new Event("map-freeze"));
    prevShouldFreezeRef.current = true; // prevent double dispatch from [activePanel, panelDrag] effect
    const x = e.touches[0].clientX;
    touchStartX.current = x;
    touchStartY.current = e.touches[0].clientY;
    velPrevX.current = null; velPrevT.current = null;
    velCurrX.current = x; velCurrT.current = Date.now();
    setPanelDrag({ panel, progress: 0 });
  };

  // ── Outer div handler: only fires when a panel is already open ──
  // (touch is on the panel/scrim, NOT on the canvas)
  const handleOuterStart = (e: React.TouchEvent) => {
    const current = activePanelRef.current;
    if (!current) return;
    // Panel is already frozen (activePanel !== null), no need to dispatch again
    const x = e.touches[0].clientX;
    touchStartX.current = x;
    touchStartY.current = e.touches[0].clientY;
    velPrevX.current = null; velPrevT.current = null;
    velCurrX.current = x; velCurrT.current = Date.now();
    setPanelDrag({ panel: current, progress: 1 });
  };

  const handleViewStep = useCallback((lat: number, lng: number) => {
    window.dispatchEvent(new CustomEvent("map-pan-to", { detail: { lat, lng } }));
  }, []);

  const handleFavViewOnMap = useCallback((lat: number, lng: number) => {
    window.dispatchEvent(new CustomEvent("map-pan-to", { detail: { lat, lng } }));
  }, []);

  const handleFavSetOrigin = useCallback((fav: any) => {
    setActivePanel("itinerary");
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("marker-set-itinerary", {
        detail: { type: "origin", location: { lat: fav.lat, lng: fav.lng }, text: fav.name },
      }));
    }, 300);
  }, []);

  const handleFavSetDest = useCallback((fav: any) => {
    setActivePanel("itinerary");
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("marker-set-itinerary", {
        detail: { type: "destination", location: { lat: fav.lat, lng: fav.lng }, text: fav.name },
      }));
    }, 300);
  }, []);

  return (
    <div
      className="h-screen overflow-hidden flex flex-col bg-background"
      onTouchStart={handleOuterStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <Header
        onItineraryClick={() => openPanel("itinerary")}
        onFavoritesClick={() => openPanel("favorites")}
        onProfileClick={() => openPanel("profile")}
        onMessagesClick={() => { setShowMessages(true); setPendingChat(null); }}
        favoritesCount={favCount}
      />
      <MapSection
        searchQuery={searchQuery}
        itineraryData={itineraryData}
        onStepClick={handleViewStep}
        pickMode={pickMode}
        isFavorite={isFavorite}
        onToggleFavorite={toggleFavorite}
        onOpenItinerary={() => setActivePanel("itinerary")}
        frozen={!!panelDrag || activePanel !== null || showMessages || !!profileUserId || !!petProfileId}
      />

      {/*
        Edge strips — transparent divs physically positioned above the map canvas (z-20).
        When the user touches the left/right edge, the touch target is the STRIP,
        not the Mapbox canvas. Mapbox never sees the touchstart, so it can't pan.
        All subsequent touchmove events are locked to the strip (browser behaviour).
        Hidden when a panel is open (panel/scrim cover the whole screen anyway).
      */}
      {!activePanel && (
        <>
          <div
            className="fixed bottom-0 left-0 z-20"
            style={{ top: "calc(56px + env(safe-area-inset-top, 0px))", width: EDGE_ZONE, touchAction: "none" }}
            onTouchStart={handleStripStart("itinerary")}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          />
          <div
            className="fixed bottom-0 right-0 z-20"
            style={{ top: "calc(56px + env(safe-area-inset-top, 0px))", width: EDGE_ZONE, touchAction: "none" }}
            onTouchStart={handleStripStart("profile")}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          />
        </>
      )}

      {/* Scrim — covers map while panel is open/dragging, catches touch-to-close */}
      {(panelDrag || activePanel) && (
        <div
          className="fixed inset-0 z-[550]"
          style={{
            background: "rgba(0,0,0,0.45)",
            opacity: panelDrag ? panelDrag.progress : 1,
            transition: panelDrag ? "none" : "opacity 0.3s ease",
            touchAction: "none",
          }}
          onClick={() => { if (!panelDrag) { setActivePanel(null); setPickMode(null); } }}
        />
      )}

      <ItineraryPanel
        open={activePanel === "itinerary"}
        onClose={() => { setActivePanel(null); setPickMode(null); }}
        onRouteCalculated={setItineraryData}
        onViewStep={handleViewStep}
        pickMode={pickMode}
        onPickModeChange={setPickMode}
        dragProgress={panelDrag?.panel === "itinerary" ? panelDrag.progress : undefined}
      />

      <FavoritesPanel
        open={activePanel === "favorites"}
        favorites={favorites}
        onClose={() => setActivePanel(null)}
        onRemove={removeFavorite}
        onViewOnMap={handleFavViewOnMap}
        onSetOrigin={handleFavSetOrigin}
        onSetDestination={handleFavSetDest}
        dragProgress={panelDrag?.panel === "favorites" ? panelDrag.progress : undefined}
      />

      <UserProfileModal
        open={activePanel === "profile"}
        onClose={() => setActivePanel(null)}
        dragProgress={panelDrag?.panel === "profile" ? panelDrag.progress : undefined}
      />

      <UserProfilePanel
        userId={profileUserId}
        onClose={() => setProfileUserId(null)}
        onOpenChat={(convId, other) => {
          setPendingChat({ convId, other });
          setShowMessages(true);
        }}
      />

      <PetProfilePanel
        petId={petProfileId}
        onClose={() => setPetProfileId(null)}
      />

      <MessagesPanel
        open={showMessages}
        onClose={() => { setShowMessages(false); setPendingChat(null); }}
        initialConvId={pendingChat?.convId ?? null}
        initialOtherUser={pendingChat?.other ?? null}
      />
    </div>
  );
};

export default Index;
