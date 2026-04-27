import logo from "@/assets/logo-wpf.png";
import { Navigation, Heart, UserCircle, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { useState, useEffect } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import AuthModal from "@/components/AuthModal";
import SubmitPlaceModal from "@/components/SubmitPlaceModal";
import NotificationPanel from "@/components/NotificationPanel";
import UserProfileModal from "@/components/UserProfileModal";
import { useUserNotifications } from "@/hooks/useUserNotifications";
import { toast } from "sonner";

interface HeaderProps {
  onItineraryClick?: () => void;
  onFavoritesClick?: () => void;
  favoritesCount?: number;
}

const Header = ({ onItineraryClick, onFavoritesClick, favoritesCount = 0 }: HeaderProps) => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitCoords, setSubmitCoords] = useState<{ lat: number; lng: number; address?: string } | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const { user, profile, signOut } = useAuthContext();
  const { unreadCount } = useUserNotifications();

  const handleSignOut = async () => {
    await signOut();
    toast("À bientôt ! 👋");
  };

  const initial = profile?.display_name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "?";

  useEffect(() => {
    const handler = () => setShowAuthModal(true);
    window.addEventListener("open-auth-modal", handler);
    return () => window.removeEventListener("open-auth-modal", handler);
  }, []);

  useEffect(() => {
    if (user) setShowAuthModal(false);
  }, [user]);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { lat: number; lng: number; address?: string };
      if (user) { setSubmitCoords(detail); setShowSubmitModal(true); }
      else setShowAuthModal(true);
    };
    window.addEventListener("open-submit-modal", handler);
    return () => window.removeEventListener("open-submit-modal", handler);
  }, [user]);


  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-b border-border" style={{ height: 56 }}>
      <div className="container flex items-center justify-between h-14 px-4">
        <div className="flex items-center gap-2">
          <img src={logo} alt="World Pet Friendly" width={40} height={40} className="w-10 h-10" />
          <span className="font-heading font-bold text-base text-foreground">
            World Pet <span className="text-primary">Friendly</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="relative text-foreground hover:bg-accent-soft" onClick={onFavoritesClick} title="Mes favoris">
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

          {user && (
            <div className="relative">
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

          {user ? (
            <Popover open={profileMenuOpen} onOpenChange={setProfileMenuOpen}>
              <PopoverTrigger asChild>
                <button
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-ring"
                  style={{ backgroundColor: "#FF6B35" }}
                  title={profile?.display_name || "Mon compte"}
                >
                  {initial}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2 z-[9999]" align="end">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">👤 {profile?.display_name || "Utilisateur"}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <Separator className="my-1" />
                <button className="w-full text-left px-2 py-1.5 text-sm hover:bg-muted rounded-sm transition-colors" onClick={() => { setProfileMenuOpen(false); setShowSubmitModal(true); }}>
                  ➕ Ajouter un lieu
                </button>
                <button className="w-full text-left px-2 py-1.5 text-sm hover:bg-muted rounded-sm transition-colors" onClick={() => { setProfileMenuOpen(false); setShowProfileModal(true); }}>
                  👤 Mon profil
                </button>
                <button className="w-full text-left px-2 py-1.5 text-sm hover:bg-muted rounded-sm transition-colors" onClick={() => { setProfileMenuOpen(false); onFavoritesClick?.(); }}>
                  ❤️ Mes favoris
                </button>
                <button className="w-full text-left px-2 py-1.5 text-sm hover:bg-muted rounded-sm transition-colors" onClick={() => { setProfileMenuOpen(false); onItineraryClick?.(); }}>
                  🗺️ Mes itinéraires
                </button>
                {profile?.is_admin && (
                  <>
                    <Separator className="my-1" />
                    <button className="w-full text-left px-2 py-1.5 text-sm hover:bg-muted rounded-sm transition-colors" onClick={() => { setProfileMenuOpen(false); window.location.href = "/admin"; }}>
                      ⚙️ Administration
                    </button>
                  </>
                )}
                <Separator className="my-1" />
                <button className="w-full text-left px-2 py-1.5 text-sm text-destructive hover:bg-muted rounded-sm transition-colors" onClick={() => { setProfileMenuOpen(false); handleSignOut(); }}>
                  Se déconnecter
                </button>
              </PopoverContent>
            </Popover>
          ) : (
            <Button variant="outline" className="gap-2 text-sm" onClick={() => setShowAuthModal(true)}>
              <UserCircle className="w-4 h-4" />
              Se connecter
            </Button>
          )}
        </div>
      </div>


<AuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} />
      <SubmitPlaceModal open={showSubmitModal} onClose={() => { setShowSubmitModal(false); setSubmitCoords(null); }} onLoginRequired={() => { setShowSubmitModal(false); setShowAuthModal(true); }} initialCoords={submitCoords ?? undefined} />
      <UserProfileModal open={showProfileModal} onClose={() => setShowProfileModal(false)} />
    </header>
  );
};

export default Header;
