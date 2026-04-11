import { UtensilsCrossed, Hotel, TreePine, Bus, Tent, Gamepad2 } from "lucide-react";
import { useState } from "react";

const categories = [
  { id: "restaurant", label: "Restaurants", icon: UtensilsCrossed, count: 12450 },
  { id: "hotel", label: "Hôtels", icon: Hotel, count: 8320 },
  { id: "park", label: "Parcs", icon: TreePine, count: 15600 },
  { id: "transport", label: "Transports", icon: Bus, count: 4200 },
  { id: "camping", label: "Campings", icon: Tent, count: 6100 },
  { id: "leisure", label: "Loisirs", icon: Gamepad2, count: 9800 },
];

const CategoryFilters = () => {
  const [active, setActive] = useState<string | null>(null);

  return (
    <section id="categories" className="py-16 bg-background">
      <div className="container px-4">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-heading font-bold text-foreground mb-3">
            Explorez par catégorie
          </h2>
          <p className="text-muted-foreground max-w-md mx-auto">
            Trouvez le lieu idéal pour vous et votre compagnon à quatre pattes
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map((cat, i) => {
            const Icon = cat.icon;
            const isActive = active === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActive(isActive ? null : cat.id)}
                className={`flex flex-col items-center gap-3 p-5 rounded-xl transition-all duration-300 category-shadow animate-fade-in ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-card text-foreground hover:bg-secondary"
                }`}
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <Icon className={`w-8 h-8 ${isActive ? "text-primary-foreground" : "text-pet-coral"}`} />
                <span className="font-heading font-semibold text-sm">{cat.label}</span>
                <span className={`text-xs ${isActive ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                  {cat.count.toLocaleString("fr-FR")} lieux
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default CategoryFilters;
