import logo from "@/assets/logo-wpf.png";
import { Heart } from "lucide-react";

const Footer = () => {
  return (
    <footer id="about" className="bg-card border-t border-border py-12">
      <div className="container px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img src={logo} alt="World Pet Friendly" width={36} height={36} className="w-9 h-9" loading="lazy" />
            <div>
              <span className="font-heading font-bold text-foreground">World Pet Friendly</span>
              <p className="text-xs text-muted-foreground">Application gratuite et libre de droit</p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground flex items-center gap-1">
            Fait avec <Heart className="w-4 h-4 text-pet-coral fill-pet-coral" /> pour les amoureux des animaux
          </p>

          <div className="flex gap-4 text-sm text-muted-foreground">
            <a href="#" className="hover:text-primary transition-colors">Mentions légales</a>
            <a href="#" className="hover:text-primary transition-colors">Contact</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
