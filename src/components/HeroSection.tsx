import heroImage from "@/assets/hero-pet-friendly.jpg";
import { Search, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";

const HeroSection = () => {
  return (
    <section className="relative min-h-[85vh] flex items-center overflow-hidden">
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt="Voyager avec son animal de compagnie"
          width={1920}
          height={1080}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 hero-gradient" />
      </div>

      <div className="relative container px-4 pt-20">
        <div className="max-w-2xl animate-fade-in">
          <h1 className="text-4xl md:text-6xl font-heading font-bold text-primary-foreground leading-tight mb-4">
            Voyagez partout avec votre compagnon
          </h1>
          <p className="text-lg md:text-xl text-primary-foreground/90 mb-8 font-body">
            Découvrez les meilleurs restaurants, hôtels, parcs et lieux de loisirs qui accueillent vos animaux à travers le monde.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 bg-card/95 backdrop-blur-sm rounded-xl p-3 shadow-xl max-w-xl">
            <div className="flex items-center gap-2 flex-1 px-3">
              <MapPin className="w-5 h-5 text-pet-coral shrink-0" />
              <input
                type="text"
                placeholder="Rechercher une ville ou un lieu..."
                className="w-full py-2 bg-transparent text-foreground placeholder:text-muted-foreground outline-none text-sm"
              />
            </div>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 gap-2">
              <Search className="w-4 h-4" />
              Rechercher
            </Button>
          </div>

          <div className="flex flex-wrap gap-2 mt-6">
            {["Paris", "Barcelone", "Amsterdam", "Lisbonne"].map((city) => (
              <span
                key={city}
                className="px-3 py-1.5 rounded-full bg-primary-foreground/20 text-primary-foreground text-sm font-medium backdrop-blur-sm cursor-pointer hover:bg-primary-foreground/30 transition-colors"
              >
                {city}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
