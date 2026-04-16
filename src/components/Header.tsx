import logo from "@/assets/logo-wpf.png";
import { Menu, Navigation, Heart, UserCircle, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { useState, useEffect, useRef } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import AuthModal from "@/components/AuthModal";
import SubmitPlaceModal from "@/components/SubmitPlaceModal";
import NotificationPanel from "@/components/NotificationPanel";
import { useUserNotifications } from "@/hooks/useUserNotifications";
import { toast } from "sonner";

interface HeaderProps {
  onItineraryClick?: () => void;
  onFavoritesClick?: () => void;
  favoritesCount?: number;
}

const Header = ({ onItineraryClick, onFavoritesClick, favoritesCount = 0 }: HeaderProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const { user, profile, signOut } = useAuthContext();
  const { unreadCount } = useUserNotifications();
  const notifRef = useRef<HTMLDivElement>(null);

  const handleSignOut = async () => {
    await signOut();
    toast({ title: "À bientôt ! 👋" });
  };

  const initial = profile?.display_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "?";

  useEffect(() => {
    const handler = () => setShowAuthModal(true);
    window.addEventListener("open-auth-modal", handler);
    return () => window.removeEventListener("open-auth-modal", handler);
  }, []);

  // Close notification panel on outside click
  useEffect(() => {
    if (!showNotifications) return;
    const handler = (e: MouseEvent) => {
      const panel = document.querySelector('[data-panel="notifications"]');
      const target = e.target as Node;
      if (panel && !panel.contains(target) && notifRef.current && !notifRef.current.contains(target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showNotifications]);

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

          {user && (
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-full hover:bg-muted transition-colors"
                title="Notifications"
              >
                <Bell className="w-5 h-5 text-foreground" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 bg-destructive text-destructive-foreground text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
              <NotificationPanel open={showNotifications} onClose={() => setShowNotifications(false)} />
            </div>
          )}

          <Button variant="ghost" size="icon" className="text-foreground hover:bg-accent-soft" onClick={onItineraryClick} title="Itinéraire Pet-Friendly">
            <Navigation className="w-5 h-5" />
          </Button>

          {user ? (
            <>
              <Button className="hidden md:flex bg-primary text-primary-foreground hover:bg-accent-hover text-sm" onClick={() => user ? setShowSubmitModal(true) : setShowAuthModal(true)}>
                Ajouter un lieu
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-ring"
                    style={{ backgroundColor: "#FF6B35" }}
                    title={profile?.display_name || "Mon compte"}
                  >
                    {initial}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-56 p-2" align="end">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">👤 {profile?.display_name || "Utilisateur"}</p>
                    <p className="text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <Separator className="my-1" />
                  <button className="w-full text-left px-2 py-1.5 text-sm hover:bg-muted rounded-sm transition-colors" onClick={onFavoritesClick}>
                    ❤️ Mes favoris
                  </button>
                  <button className="w-full text-left px-2 py-1.5 text-sm hover:bg-muted rounded-sm transition-colors" onClick={onItineraryClick}>
                    🗺️ Mes itinéraires
                  </button>
                  {profile?.is_admin && (
                    <>
                      <Separator className="my-1" />
                      <button className="w-full text-left px-2 py-1.5 text-sm hover:bg-muted rounded-sm transition-colors" onClick={() => { window.location.href = "/admin"; }}>
                        ⚙️ Administration
                      </button>
                    </>
                  )}
                  <Separator className="my-1" />
                  <button className="w-full text-left px-2 py-1.5 text-sm text-destructive hover:bg-muted rounded-sm transition-colors" onClick={handleSignOut}>
                    Se déconnecter
                  </button>
                </PopoverContent>
              </Popover>
            </>
          ) : (
            <Button variant="outline" className="hidden md:flex gap-2 text-sm" onClick={() => setShowAuthModal(true)}>
              <UserCircle className="w-4 h-4" />
              Se connecter
            </Button>
          )}

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
          {user ? (
            <>
              <Button className="w-full bg-primary text-primary-foreground" onClick={() => { setMenuOpen(false); user ? setShowSubmitModal(true) : setShowAuthModal(true); }}>Ajouter un lieu</Button>
              <Button variant="destructive" className="w-full" onClick={handleSignOut}>Se déconnecter</Button>
            </>
          ) : (
            <Button variant="outline" className="w-full gap-2" onClick={() => { setMenuOpen(false); setShowAuthModal(true); }}>
              <UserCircle className="w-4 h-4" />
              Se connecter
            </Button>
          )}
        </div>
      )}

      <AuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} />
      <SubmitPlaceModal open={showSubmitModal} onClose={() => setShowSubmitModal(false)} onLoginRequired={() => { setShowSubmitModal(false); setShowAuthModal(true); }} />
    </header>
  );
};

export default Header;
