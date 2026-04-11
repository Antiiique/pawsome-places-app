import { useState, useCallback } from "react";
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from "@react-google-maps/api";
import { MapPin, Star, Phone, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

const GOOGLE_MAPS_API_KEY = "AIzaSyDP4zY29gT-tXDxcszWHBWSC8_14AEmiYg";

const mapContainerStyle = {
  width: "100%",
  height: "100%",
};

const defaultCenter = { lat: 48.8566, lng: 2.3522 }; // Paris

const samplePlaces = [
  {
    id: 1,
    name: "Le Café des Amis",
    category: "Restaurant",
    address: "12 Rue de Rivoli, 75001 Paris",
    rating: 4.6,
    reviews: 234,
    phone: "+33 1 42 36 00 00",
    image: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400&h=300&fit=crop",
    petTypes: ["Chiens", "Chats"],
    position: { lat: 48.8566, lng: 2.3522 },
  },
  {
    id: 2,
    name: "Hôtel Le Marais Pet",
    category: "Hôtel",
    address: "45 Rue des Archives, 75003 Paris",
    rating: 4.8,
    reviews: 512,
    phone: "+33 1 48 87 00 00",
    image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=300&fit=crop",
    petTypes: ["Chiens"],
    position: { lat: 48.8631, lng: 2.3574 },
  },
  {
    id: 3,
    name: "Parc Monceau",
    category: "Parc",
    address: "35 Bd de Courcelles, 75008 Paris",
    rating: 4.7,
    reviews: 1823,
    phone: "",
    image: "https://images.unsplash.com/photo-1585938389612-a552a28d6914?w=400&h=300&fit=crop",
    petTypes: ["Chiens", "Chats", "NAC"],
    position: { lat: 48.8795, lng: 2.3089 },
  },
];

const mapStyles = [
  { featureType: "poi.park", elementType: "geometry.fill", stylers: [{ color: "#c8e6c9" }] },
  { featureType: "water", elementType: "geometry.fill", stylers: [{ color: "#bbdefb" }] },
  { featureType: "road", elementType: "geometry.fill", stylers: [{ color: "#fafafa" }] },
];

const MapSection = () => {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
  });

  const [selectedPlace, setSelectedPlace] = useState<(typeof samplePlaces)[0] | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
  }, []);

  const categoryColors: Record<string, string> = {
    Restaurant: "#E57373",
    Hôtel: "#64B5F6",
    Parc: "#81C784",
    Transport: "#FFB74D",
    Camping: "#A1887F",
    Loisirs: "#BA68C8",
  };

  return (
    <section id="explore" className="py-16 bg-secondary/50">
      <div className="container px-4">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-heading font-bold text-foreground mb-3">
            Lieux populaires près de vous
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Découvrez les endroits les mieux notés par notre communauté
          </p>
        </div>

        {/* Google Map */}
        <div className="relative rounded-2xl overflow-hidden mb-10 border border-border h-[450px]">
          {loadError && (
            <div className="flex items-center justify-center h-full bg-muted">
              <p className="text-destructive">Erreur de chargement de la carte</p>
            </div>
          )}
          {!isLoaded && !loadError && (
            <div className="flex items-center justify-center h-full bg-muted animate-pulse">
              <MapPin className="w-12 h-12 text-primary animate-bounce" />
            </div>
          )}
          {isLoaded && (
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={defaultCenter}
              zoom={13}
              onLoad={onLoad}
              options={{
                styles: mapStyles,
                disableDefaultUI: false,
                zoomControl: true,
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: true,
              }}
            >
              {samplePlaces.map((place) => (
                <Marker
                  key={place.id}
                  position={place.position}
                  onClick={() => setSelectedPlace(place)}
                  icon={{
                    path: google.maps.SymbolPath.CIRCLE,
                    fillColor: categoryColors[place.category] || "#4CAF50",
                    fillOpacity: 1,
                    strokeColor: "#fff",
                    strokeWeight: 2,
                    scale: 10,
                  }}
                />
              ))}

              {selectedPlace && (
                <InfoWindow
                  position={selectedPlace.position}
                  onCloseClick={() => setSelectedPlace(null)}
                >
                  <div className="max-w-[240px] font-sans">
                    <img
                      src={selectedPlace.image}
                      alt={selectedPlace.name}
                      className="w-full h-28 object-cover rounded-md mb-2"
                    />
                    <h3 className="font-bold text-sm mb-0.5">{selectedPlace.name}</h3>
                    <p className="text-xs text-gray-500 mb-1">{selectedPlace.address}</p>
                    <div className="flex items-center gap-1 mb-1">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      <span className="text-xs font-semibold">{selectedPlace.rating}</span>
                      <span className="text-xs text-gray-400">({selectedPlace.reviews} avis)</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {selectedPlace.petTypes.map((t) => (
                        <span key={t} className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
                          🐾 {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
          )}
        </div>

        {/* Place Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {samplePlaces.map((place, i) => (
            <div
              key={place.id}
              className="bg-card rounded-xl overflow-hidden card-hover animate-fade-in cursor-pointer"
              style={{ animationDelay: `${i * 120}ms` }}
              onClick={() => {
                setSelectedPlace(place);
                map?.panTo(place.position);
                map?.setZoom(15);
                window.scrollTo({ top: document.getElementById("explore")?.offsetTop ?? 0, behavior: "smooth" });
              }}
            >
              <div className="relative h-48">
                <img src={place.image} alt={place.name} loading="lazy" className="w-full h-full object-cover" />
                <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                  {place.category}
                </span>
              </div>
              <div className="p-5">
                <h3 className="font-heading font-bold text-lg text-foreground mb-1">{place.name}</h3>
                <p className="text-sm text-muted-foreground flex items-center gap-1 mb-3">
                  <MapPin className="w-3.5 h-3.5" />
                  {place.address}
                </p>
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-pet-warm fill-pet-warm" />
                    <span className="font-semibold text-sm text-foreground">{place.rating}</span>
                    <span className="text-xs text-muted-foreground">({place.reviews} avis)</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {place.petTypes.map((type) => (
                    <span key={type} className="px-2 py-0.5 rounded-full bg-pet-green-light text-primary text-xs font-medium">
                      🐾 {type}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  {place.phone && (
                    <Button variant="outline" size="sm" className="text-xs gap-1 border-border text-muted-foreground hover:text-primary">
                      <Phone className="w-3.5 h-3.5" />
                      Appeler
                    </Button>
                  )}
                  <Button variant="outline" size="sm" className="text-xs gap-1 border-border text-muted-foreground hover:text-primary">
                    <ExternalLink className="w-3.5 h-3.5" />
                    Détails
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default MapSection;
