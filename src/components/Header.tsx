import { Navigation, Heart, UserCircle, Bell, MessageCircle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import AuthModal from "@/components/AuthModal";
import SubmitPlaceModal from "@/components/SubmitPlaceModal";
import NotificationPanel from "@/components/NotificationPanel";
import { useUserNotifications } from "@/hooks/useUserNotifications";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { toast } from "sonner";

interface HeaderProps {
  onItineraryClick?: () => void;
  onFavoritesClick?: () => void;
  onProfileClick?: () => void;
  onMessagesClick?: () => void;
  favoritesCount?: number;
}

const Header = ({ onItineraryClick, onFavoritesClick, onProfileClick, onMessagesClick, favoritesCount = 0 }: HeaderProps) => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitCoords, setSubmitCoords] = useState<{ lat: number; lng: number; address?: string } | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const { user, profile, signOut } = useAuthContext();
  const { unreadCount } = useUserNotifications();
  const { unreadCount: unreadMessages } = useUnreadMessages();

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


  const fabStyle = {
    background: "color-mix(in srgb, var(--card) 55%, transparent)",
    border: "1px solid color-mix(in srgb, var(--border) 50%, transparent)",
    boxShadow: "0 4px 24px rgba(0,0,0,0.10)",
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-transparent border-none" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
      <div className="flex items-center justify-end h-14 px-4 gap-2">

        <button
          onClick={onFavoritesClick}
          title="Mes favoris"
          className="relative w-11 h-11 rounded-full flex items-center justify-center active:scale-95 transition-all duration-150"
          style={fabStyle}
        >
          <Heart className="w-5 h-5 text-foreground" />
          {favoritesCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
              {favoritesCount > 99 ? "99+" : favoritesCount}
            </span>
          )}
        </button>

        <button
          onClick={onItineraryClick}
          title="Itinéraire Pet-Friendly"
          className="w-11 h-11 rounded-full flex items-center justify-center active:scale-95 transition-all duration-150"
          style={fabStyle}
        >
          <Navigation className="w-5 h-5 text-foreground" />
        </button>

        {user && (
          <button
            onClick={onMessagesClick}
            title="Messages"
            className="relative w-11 h-11 rounded-full flex items-center justify-center active:scale-95 transition-all duration-150"
            style={fabStyle}
          >
            <MessageCircle className="w-5 h-5 text-foreground" />
            {unreadMessages > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1">
                {unreadMessages > 9 ? "9+" : unreadMessages}
              </span>
            )}
          </button>
        )}

        {user && (
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              title="Notifications"
              className="relative w-11 h-11 rounded-full flex items-center justify-center active:scale-95 transition-all duration-150"
              style={fabStyle}
            >
              <Bell className="w-5 h-5 text-foreground" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-destructive text-destructive-foreground text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
            {createPortal(
              <NotificationPanel open={showNotifications} onClose={() => setShowNotifications(false)} />,
              document.body
            )}
          </div>
        )}

        {user ? (
          <Popover open={profileMenuOpen} onOpenChange={setProfileMenuOpen}>
            <PopoverTrigger asChild>
              <button
                className="w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-bold focus:outline-none"
                style={{ backgroundColor: "#FF6B35", boxShadow: "0 4px 24px rgba(0,0,0,0.10)" }}
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
                <button className="w-full text-left px-2 py-1.5 text-sm hover:bg-muted rounded-sm transition-colors" onClick={() => { setProfileMenuOpen(false); onProfileClick?.(); }}>
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
            <button
              onClick={() => setShowAuthModal(true)}
              className="flex items-center gap-1.5 h-11 px-4 rounded-full text-sm font-semibold text-foreground active:scale-95 transition-all duration-150"
              style={fabStyle}
            >
              <UserCircle className="w-4 h-4" />
              Connexion
            </button>
          )}
      </div>


<AuthModal open={showAuthModal} onClose={() => setShowAuthModal(false)} />
      <SubmitPlaceModal open={showSubmitModal} onClose={() => { setShowSubmitModal(false); setSubmitCoords(null); }} onLoginRequired={() => { setShowSubmitModal(false); setShowAuthModal(true); }} initialCoords={submitCoords ?? undefined} />
    </header>
  );
};

export default Header;
