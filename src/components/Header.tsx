import { Navigation, Heart, UserCircle, Bell, MessageCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import AuthModal from "@/components/AuthModal";
import SubmitPlaceModal from "@/components/SubmitPlaceModal";
import NotificationPanel from "@/components/NotificationPanel";
import StreakBanner from "@/components/StreakBanner";
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
  const { user, profile } = useAuthContext();
  const { unreadCount } = useUserNotifications();
  const { unreadCount: unreadMessages } = useUnreadMessages();
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
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
    background: "color-mix(in srgb, var(--card) 92%, transparent)",
    border: "1.5px solid color-mix(in srgb, var(--border) 90%, transparent)",
    boxShadow: "0 2px 6px rgba(0,0,0,0.22), 0 6px 24px rgba(0,0,0,0.14)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-transparent border-none" style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}>
      <div className="flex items-center justify-end h-14 px-4 gap-2">

        <button
          onClick={onFavoritesClick}
          title="Mes favoris"
          className="w-11 h-11 rounded-full flex items-center justify-center active:scale-95 transition-all duration-150"
          style={fabStyle}
        >
          <Heart className="w-5 h-5 text-primary" />
        </button>

        <button
          onClick={onItineraryClick}
          title="Itinéraire Pet-Friendly"
          className="w-11 h-11 rounded-full flex items-center justify-center active:scale-95 transition-all duration-150"
          style={fabStyle}
        >
          <Navigation className="w-5 h-5 text-primary" />
        </button>

        {user && (
          <button
            onClick={onMessagesClick}
            title="Messages"
            className="relative w-11 h-11 rounded-full flex items-center justify-center active:scale-95 transition-all duration-150"
            style={fabStyle}
          >
            <MessageCircle className="w-5 h-5 text-primary" />
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
              <Bell className="w-5 h-5 text-primary" />
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
            {createPortal(<StreakBanner />, document.body)}
          </div>
        )}

        {user && !isMobile && (
          <button
            onClick={onProfileClick}
            title="Mon profil"
            className="w-11 h-11 rounded-full flex items-center justify-center active:scale-95 transition-all duration-150 text-sm font-bold"
            style={{ ...fabStyle, backgroundColor: "hsl(var(--primary))", color: "hsl(var(--primary-foreground))" }}
          >
            {initial}
          </button>
        )}

        {!user && (
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
