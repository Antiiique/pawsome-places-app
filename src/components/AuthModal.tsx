import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuthContext } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

const AuthModal = ({ open, onClose }: AuthModalProps) => {
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, signInWithApple } = useAuthContext();
  const [tab, setTab] = useState<string>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setDisplayName("");
    setError(null);
    setSuccess(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await signInWithEmail(email, password);
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      toast({ title: "Bienvenue ! 🐾" });
      resetForm();
      onClose();
    }
  };

  const passwordRules = [
    { test: (p: string) => p.length >= 8,          label: "8 caractères minimum" },
    { test: (p: string) => /[A-Z]/.test(p),        label: "1 majuscule" },
    { test: (p: string) => /[a-z]/.test(p),        label: "1 minuscule" },
    { test: (p: string) => /[0-9]/.test(p),        label: "1 chiffre" },
    { test: (p: string) => /[^a-zA-Z0-9]/.test(p), label: "1 caractère spécial (!@#…)" },
  ];

  const passwordStrength = passwordRules.filter(r => r.test(password)).length;

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const failed = passwordRules.find(r => !r.test(password));
    if (failed) { setError(`Mot de passe trop faible — requis : ${failed.label}`); return; }
    setLoading(true);
    const { error } = await signUpWithEmail(email, password, displayName);
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSuccess("Vérifie ton email pour confirmer ton compte 📧");
    }
  };

  const handleGoogle = async () => {
    setError(null);
    const { error } = await signInWithGoogle();
    if (error) setError(String(error));
  };

  const handleApple = async () => {
    setError(null);
    const { error } = await signInWithApple();
    if (error) setError(String(error));
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { resetForm(); onClose(); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-lg font-heading">
            🐾 Rejoins la communauté
          </DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => { setTab(v); setError(null); setSuccess(null); }}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Connexion</TabsTrigger>
            <TabsTrigger value="signup">Inscription</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <Input id="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="ton@email.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">Mot de passe</Label>
                <Input id="login-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Connexion…" : "Se connecter"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={handleSignup} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="signup-name">Prénom ou pseudo</Label>
                <Input id="signup-name" type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required placeholder="Max" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input id="signup-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="ton@email.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">Mot de passe</Label>
                <Input id="signup-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Min. 8 car., maj., chiffre, symbole" />
                {password.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex gap-1">
                      {[1,2,3,4,5].map(i => (
                        <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${
                          i <= passwordStrength
                            ? passwordStrength <= 2 ? "bg-destructive"
                              : passwordStrength <= 3 ? "bg-warning"
                              : passwordStrength <= 4 ? "bg-blue-400"
                              : "bg-success"
                            : "bg-muted"
                        }`} />
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                      {passwordRules.map(r => (
                        <span key={r.label} className={`text-[10px] ${r.test(password) ? "text-success" : "text-muted-foreground"}`}>
                          {r.test(password) ? "✓" : "○"} {r.label}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              {success && <p className="text-sm text-green-500 font-medium">{success}</p>}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Création…" : "Créer mon compte"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <div className="flex items-center gap-3 my-2">
          <Separator className="flex-1" />
          <span className="text-xs text-muted-foreground">ou continuer avec</span>
          <Separator className="flex-1" />
        </div>

        <div className="flex flex-col gap-3">
          <Button variant="outline" className="w-full gap-3 border-border bg-background hover:bg-muted" onClick={handleGoogle}>
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continuer avec Google
          </Button>

          <Button className="w-full gap-3 bg-black text-white hover:bg-black/90" onClick={handleApple}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
              <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
            </svg>
            Continuer avec Apple
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;
