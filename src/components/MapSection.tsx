import { MapPin, Star, Phone, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  },
];

const MapSection = () => {
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

        {/* Map Placeholder */}
        <div className="relative rounded-2xl overflow-hidden mb-10 bg-pet-green-light border border-border h-[400px] flex items-center justify-center">
          <div className="text-center p-8">
            <MapPin className="w-16 h-16 text-primary mx-auto mb-4 animate-bounce" />
            <h3 className="font-heading font-bold text-xl text-foreground mb-2">
              Carte interactive
            </h3>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto mb-4">
              La carte Google Maps sera intégrée ici pour afficher tous les lieux pet-friendly du monde
            </p>
            <Button variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
              Activer la carte
            </Button>
          </div>
          {/* Decorative pins */}
          {[
            { top: "20%", left: "15%" },
            { top: "35%", left: "65%" },
            { top: "60%", left: "40%" },
            { top: "25%", left: "80%" },
            { top: "70%", left: "20%" },
          ].map((pos, i) => (
            <div
              key={i}
              className="absolute w-4 h-4 bg-pet-coral rounded-full shadow-lg animate-pulse"
              style={{ top: pos.top, left: pos.left, animationDelay: `${i * 300}ms` }}
            />
          ))}
        </div>

        {/* Place Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {samplePlaces.map((place, i) => (
            <div
              key={place.id}
              className="bg-card rounded-xl overflow-hidden card-hover animate-fade-in"
              style={{ animationDelay: `${i * 120}ms` }}
            >
              <div className="relative h-48">
                <img
                  src={place.image}
                  alt={place.name}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
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
