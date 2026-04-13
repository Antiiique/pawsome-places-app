import logo from "@/assets/logo-wpf.png";
import { Menu, Navigation, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface HeaderProps {
  onItineraryClick?: () => void;
  onFavoritesClick?: () => void;
  favoritesCount?: number;
}

const Header = ({ onItineraryClick, onFavoritesClick, favoritesCount = 0 }: HeaderProps) => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-b border-border" style={{ height: 56 }}>
      <div className="container flex items-center justify-between h-14 px-4">
        <div className="flex items-center gap-2">
          <img src={logo} alt="World Pet Friendly" width={40} height={40} className="w-10 h-10" />
          <span className="font-heading font-bold text-base text-foreground">
            World Pet <span className="text-primary">Friendly</span>
          </span>
        </div>

        <nav className="hidden md:flex items-center gap-6">
          <a href="#explore" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Explorer</a>
          <a href="#categories" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Catégories</a>
          <a href="#about" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">À propos</a>
        </nav>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="text-foreground hover:bg-accent-soft" onClick={onFavoritesClick} title="Mes favoris">
            <Heart className="w-5 h-5" />
            {favoritesCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {favoritesCount > 99 ? "99+" : favoritesCount}
              </span>
            )}
          </Button>
          <Button variant="ghost" size="icon" className="text-foreground hover:bg-accent-soft" onClick={onItineraryClick} title="Itinéraire Pet-Friendly">
            <Navigation className="w-5 h-5" />
          </Button>
          <Button className="hidden md:flex bg-primary text-primary-foreground hover:bg-accent-hover text-sm">
            Ajouter un lieu
          </Button>
          <Button variant="ghost" size="icon" className="md:hidden text-foreground" onClick={() => setMenuOpen(!menuOpen)}>
            <Menu className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden bg-card border-b border-border px-4 py-4 space-y-3">
          <a href="#explore" className="block text-sm font-medium text-foreground">Explorer</a>
          <a href="#categories" className="block text-sm font-medium text-foreground">Catégories</a>
          <a href="#about" className="block text-sm font-medium text-foreground">À propos</a>
          <Button className="w-full bg-primary text-primary-foreground" onClick={onFavoritesClick}>
            ❤️ Mes favoris ({favoritesCount})
          </Button>
          <Button className="w-full bg-primary text-primary-foreground" onClick={onItineraryClick}>
            🐾 Itinéraire Pet-Friendly
          </Button>
          <Button className="w-full bg-primary text-primary-foreground">Ajouter un lieu</Button>
        </div>
      )}
    </header>
  );
};

export default Header;
