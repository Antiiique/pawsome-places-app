import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useNavigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuthContext } from "@/contexts/AuthContext";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import AdminPage from "./pages/AdminPage.tsx";
import { Button } from "@/components/ui/button";

const queryClient = new QueryClient();

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: "" };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen gap-4 text-center bg-background">
          <span className="text-5xl">🐾</span>
          <h1 className="text-2xl font-bold text-foreground">Une erreur est survenue</h1>
          <p className="text-muted-foreground">{this.state.error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
          >
            Recharger la page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const AdminGuard = () => {
  const { user, profile, loading } = useAuthContext();
  const navigate = useNavigate();

  if (loading) return <div className="flex items-center justify-center h-screen text-muted-foreground">Chargement…</div>;
  if (!user) return <Navigate to="/" replace />;
  if (!profile?.is_admin) return (
    <div className="flex flex-col items-center justify-center h-screen gap-4 text-center">
      <span className="text-5xl">🚫</span>
      <h1 className="text-2xl font-bold text-foreground">Accès refusé</h1>
      <p className="text-muted-foreground">Vous n'avez pas les droits administrateur.</p>
      <Button onClick={() => navigate("/")}>Retour à l'accueil</Button>
    </div>
  );
  return <AdminPage />;
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/admin" element={<AdminGuard />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
