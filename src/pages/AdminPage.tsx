import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  related_id: string | null;
}

interface Submission {
  id: string;
  name: string;
  category: string;
  subcategory: string | null;
  city: string | null;
  description: string | null;
  accepts_dogs: boolean | null;
  accepts_cats: boolean | null;
  outdoor_seating: boolean | null;
  latitude: number;
  longitude: number;
  address: string | null;
  country: string | null;
  phone: string | null;
  website: string | null;
  dogs_on_leash_only: boolean | null;
  water_bowl_provided: boolean | null;
  opening_hours: string | null;
  created_at: string;
  submitted_by: string | null;
  submitter_email?: string;
}

interface Report {
  id: string;
  place_id: string | null;
  reason: string;
  comment: string | null;
  status: string | null;
  created_at: string;
  place_name?: string;
}

const reasonLabels: Record<string, string> = {
  not_pet_friendly: "🚫 Non pet-friendly",
  closed: "🔒 Fermé définitivement",
  wrong_info: "✏️ Informations incorrectes",
  no_longer_exists: "❌ N'existe plus",
  other: "💬 Autre",
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "à l'instant";
  if (mins < 60) return `il y a ${mins}min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days}j`;
}

const AdminPage = () => {
  const navigate = useNavigate();
  const { user } = useAuthContext();

  const [pendingCount, setPendingCount] = useState(0);
  const [reportsCount, setReportsCount] = useState(0);
  const [notifCount, setNotifCount] = useState(0);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [reports, setReports] = useState<Report[]>([]);

  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  const [rejectNote, setRejectNote] = useState("");

  const fetchCounts = useCallback(async () => {
    const [s, r, n] = await Promise.all([
      supabase.from("place_submissions").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("place_reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("admin_notifications").select("id", { count: "exact", head: true }).eq("is_read", false),
    ]);
    setPendingCount(s.count ?? 0);
    setReportsCount(r.count ?? 0);
    setNotifCount(n.count ?? 0);
  }, []);

  const fetchNotifications = useCallback(async () => {
    const { data } = await supabase
      .from("admin_notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setNotifications(data);
  }, []);

  const fetchSubmissions = useCallback(async () => {
    const { data } = await supabase
      .from("place_submissions")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    if (data) {
      // Fetch submitter emails
      const userIds = data.map(s => s.submitted_by).filter(Boolean) as string[];
      let profileMap: Record<string, string> = {};
      if (userIds.length) {
        const { data: profiles } = await supabase.from("profiles").select("id, email").in("id", userIds);
        if (profiles) profileMap = Object.fromEntries(profiles.map(p => [p.id, p.email || ""]));
      }
      setSubmissions(data.map(s => ({ ...s, submitter_email: s.submitted_by ? profileMap[s.submitted_by] || "" : "" })));
    }
  }, []);

  const fetchReports = useCallback(async () => {
    const { data } = await supabase
      .from("place_reports")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    if (data) {
      const placeIds = data.map(r => r.place_id).filter(Boolean) as string[];
      let placeMap: Record<string, string> = {};
      if (placeIds.length) {
        const { data: places } = await supabase.from("pet_friendly_places").select("id, name").in("id", placeIds);
        if (places) placeMap = Object.fromEntries(places.map(p => [p.id, p.name]));
      }
      setReports(data.map(r => ({ ...r, place_name: r.place_id ? placeMap[r.place_id] || "Inconnu" : "Inconnu" })));
    }
  }, []);

  useEffect(() => {
    fetchCounts();
    fetchNotifications();
    fetchSubmissions();
    fetchReports();
    const interval = setInterval(fetchCounts, 30000);
    return () => clearInterval(interval);
  }, [fetchCounts, fetchNotifications, fetchSubmissions, fetchReports]);

  const markNotifRead = async (id: string) => {
    await supabase.from("admin_notifications").update({ is_read: true }).eq("id", id);
    fetchNotifications();
    fetchCounts();
  };

  const approveSubmission = async (sub: Submission) => {
    // Insert into pet_friendly_places
    await supabase.from("pet_friendly_places").insert({
      name: sub.name,
      category: sub.category,
      subcategory: sub.subcategory,
      address: sub.address,
      city: sub.city,
      country: sub.country || "France",
      latitude: sub.latitude,
      longitude: sub.longitude,
      phone: sub.phone,
      website: sub.website,
      description: sub.description,
      accepts_dogs: sub.accepts_dogs ?? true,
      accepts_cats: sub.accepts_cats ?? false,
      dogs_on_leash_only: sub.dogs_on_leash_only ?? false,
      outdoor_seating: sub.outdoor_seating ?? false,
      water_bowl_provided: sub.water_bowl_provided ?? false,
      opening_hours: sub.opening_hours,
      verified: false,
      source: "user_submission",
    });
    await supabase.from("place_submissions").update({
      status: "approved",
      reviewed_at: new Date().toISOString(),
      reviewed_by: user?.id,
    }).eq("id", sub.id);
    toast.success(`"${sub.name}" approuvé !`);
    setSubmissions(prev => prev.filter(s => s.id !== sub.id));
    fetchCounts();
  };

  const rejectSubmission = async () => {
    if (!rejectDialog.id) return;
    await supabase.from("place_submissions").update({
      status: "rejected",
      admin_note: rejectNote || null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user?.id,
    }).eq("id", rejectDialog.id);
    toast.success("Soumission rejetée");
    setSubmissions(prev => prev.filter(s => s.id !== rejectDialog.id));
    setRejectDialog({ open: false, id: null });
    setRejectNote("");
    fetchCounts();
  };

  const handleReport = async (report: Report, action: "reviewed" | "dismissed") => {
    await supabase.from("place_reports").update({ status: action }).eq("id", report.id);
    if (action === "reviewed" && report.reason === "not_pet_friendly" && report.place_id) {
      await supabase.from("pet_friendly_places").update({ is_flagged: true }).eq("id", report.place_id);
    }
    if (action === "dismissed" && report.place_id) {
      await supabase.from("pet_friendly_places").update({ report_count: 0, is_flagged: false }).eq("id", report.place_id);
    }
    toast.success(action === "reviewed" ? "Signalement traité" : "Signalement ignoré");
    setReports(prev => prev.filter(r => r.id !== report.id));
    fetchCounts();
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate("/")}>← Retour</Button>
          <h1 className="text-xl font-bold text-foreground flex-1">⚙️ Administration — World Pet Friendly</h1>
          {notifCount > 0 && (
            <Badge className="bg-orange-500 text-white">{notifCount}</Badge>
          )}
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold text-foreground">{pendingCount}</p>
              <p className="text-sm text-muted-foreground mt-1">📍 Lieux en attente</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold text-foreground">{reportsCount}</p>
              <p className="text-sm text-muted-foreground mt-1">⚠️ Signalements</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-3xl font-bold text-foreground">{notifCount}</p>
              <p className="text-sm text-muted-foreground mt-1">🔔 Notifications</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="notifications">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="notifications">🔔 Notifications</TabsTrigger>
            <TabsTrigger value="submissions">📍 Lieux à valider</TabsTrigger>
            <TabsTrigger value="reports">⚠️ Signalements</TabsTrigger>
          </TabsList>

          {/* Notifications */}
          <TabsContent value="notifications" className="space-y-2 mt-4">
            {notifications.length === 0 && <p className="text-muted-foreground text-center py-8">Aucune notification</p>}
            {notifications.map(n => (
              <div
                key={n.id}
                onClick={() => !n.is_read && markNotifRead(n.id)}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  n.is_read ? "bg-card" : "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
                }`}
              >
                <div className="flex items-start gap-2">
                  <span>{n.type === "new_submission" ? "📍" : "⚠️"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-foreground">{n.title}</span>
                      {!n.is_read && <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Nouveau</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
                    <p className="text-xs text-muted-foreground mt-1">{timeAgo(n.created_at)}</p>
                  </div>
                </div>
              </div>
            ))}
          </TabsContent>

          {/* Submissions */}
          <TabsContent value="submissions" className="space-y-4 mt-4">
            {submissions.length === 0 && <p className="text-muted-foreground text-center py-8">Aucun lieu en attente</p>}
            {submissions.map(sub => (
              <Card key={sub.id}>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-foreground">{sub.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary">{sub.category}</Badge>
                        {sub.city && <span className="text-sm text-muted-foreground">{sub.city}</span>}
                      </div>
                    </div>
                  </div>
                  {sub.description && (
                    <p className="text-sm text-muted-foreground">
                      {sub.description.length > 100 ? sub.description.slice(0, 100) + "…" : sub.description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Soumis le {new Date(sub.created_at).toLocaleDateString("fr-FR")}
                    {sub.submitter_email && ` par ${sub.submitter_email}`}
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    {sub.accepts_dogs && <Badge variant="outline">🐕 Chiens</Badge>}
                    {sub.accepts_cats && <Badge variant="outline">🐈 Chats</Badge>}
                    {sub.outdoor_seating && <Badge variant="outline">🌿 Terrasse</Badge>}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => approveSubmission(sub)}>
                      ✅ Approuver
                    </Button>
                    <Button size="sm" variant="outline" className="text-destructive border-destructive" onClick={() => setRejectDialog({ open: true, id: sub.id })}>
                      ❌ Rejeter
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Reports */}
          <TabsContent value="reports" className="space-y-4 mt-4">
            {reports.length === 0 && <p className="text-muted-foreground text-center py-8">Aucun signalement en attente</p>}
            {reports.map(report => (
              <Card key={report.id}>
                <CardContent className="pt-4 space-y-3">
                  <h3 className="font-semibold text-foreground">{report.place_name}</h3>
                  <Badge variant="outline">{reasonLabels[report.reason] || report.reason}</Badge>
                  {report.comment && <p className="text-sm text-muted-foreground">"{report.comment}"</p>}
                  <p className="text-xs text-muted-foreground">{timeAgo(report.created_at || "")}</p>
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleReport(report, "reviewed")}>
                      ✅ Traité
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleReport(report, "dismissed")}>
                      🚫 Ignorer
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>

      {/* Reject dialog */}
      <Dialog open={rejectDialog.open} onOpenChange={(v) => { if (!v) { setRejectDialog({ open: false, id: null }); setRejectNote(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Motif du refus</DialogTitle>
          </DialogHeader>
          <Textarea
            placeholder="Motif du refus (optionnel)"
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectDialog({ open: false, id: null }); setRejectNote(""); }}>Annuler</Button>
            <Button variant="destructive" onClick={rejectSubmission}>Rejeter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPage;
