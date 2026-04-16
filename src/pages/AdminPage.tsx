import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Trash2, Pencil, ExternalLink } from "lucide-react";

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

interface ValidatedPlace {
  id: string;
  name: string;
  category: string;
  subcategory: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  latitude: number;
  longitude: number;
  phone: string | null;
  website: string | null;
  description: string | null;
  accepts_dogs: boolean;
  accepts_cats: boolean;
  dogs_on_leash_only: boolean;
  outdoor_seating: boolean;
  water_bowl_provided: boolean;
  opening_hours: string | null;
  verified: boolean;
  source: string | null;
  photo_url: string | null;
  created_at: string;
  rating: number | null;
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
  const [validatedPlaces, setValidatedPlaces] = useState<ValidatedPlace[]>([]);

  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  const [rejectNote, setRejectNote] = useState("");
  const [approveDialog, setApproveDialog] = useState<{ open: boolean; sub: Submission | null }>({ open: false, sub: null });
  const [approveNote, setApproveNote] = useState("");

  const [editDialog, setEditDialog] = useState<{ open: boolean; place: ValidatedPlace | null }>({ open: false, place: null });
  const [editForm, setEditForm] = useState<Partial<ValidatedPlace>>({});
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; place: ValidatedPlace | null }>({ open: false, place: null });

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

  const fetchValidatedPlaces = useCallback(async () => {
    const { data } = await supabase
      .from("pet_friendly_places")
      .select("id, name, category, subcategory, address, city, country, latitude, longitude, phone, website, description, accepts_dogs, accepts_cats, dogs_on_leash_only, outdoor_seating, water_bowl_provided, opening_hours, verified, source, photo_url, created_at, rating")
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) setValidatedPlaces(data as ValidatedPlace[]);
  }, []);

  useEffect(() => {
    fetchCounts();
    fetchNotifications();
    fetchSubmissions();
    fetchReports();
    fetchValidatedPlaces();
    const interval = setInterval(fetchCounts, 30000);
    return () => clearInterval(interval);
  }, [fetchCounts, fetchNotifications, fetchSubmissions, fetchReports, fetchValidatedPlaces]);

  const markNotifRead = async (id: string) => {
    await supabase.from("admin_notifications").update({ is_read: true }).eq("id", id);
    fetchNotifications();
    fetchCounts();
  };

  const approveSubmission = async (sub: Submission, note: string) => {
    const { data: newPlace } = await supabase.from("pet_friendly_places").insert({
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
      verified: true,
      source: "user_submission",
    }).select("id").single();

    if (newPlace) {
      const { data: photo } = await supabase
        .from("submission_photos")
        .select("url")
        .eq("submission_id", sub.id)
        .limit(1)
        .maybeSingle();
      if (photo?.url) {
        await supabase.from("pet_friendly_places").update({ photo_url: photo.url }).eq("id", newPlace.id);
      }
    }

    await supabase.from("place_submissions").update({
      status: "approved",
      admin_note: note || null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user?.id,
    }).eq("id", sub.id);

    toast.success(`✅ "${sub.name}" approuvé et publié sur la carte !`);
    setSubmissions(prev => prev.filter(s => s.id !== sub.id));
    fetchCounts();
    fetchValidatedPlaces();
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

  const openEditDialog = (place: ValidatedPlace) => {
    setEditForm({ ...place });
    setEditDialog({ open: true, place });
  };

  const saveEdit = async () => {
    if (!editDialog.place) return;
    const { error } = await supabase.from("pet_friendly_places").update({
      name: editForm.name,
      category: editForm.category,
      subcategory: editForm.subcategory,
      address: editForm.address,
      city: editForm.city,
      country: editForm.country,
      phone: editForm.phone,
      website: editForm.website,
      description: editForm.description,
      opening_hours: editForm.opening_hours,
      accepts_dogs: editForm.accepts_dogs,
      accepts_cats: editForm.accepts_cats,
      dogs_on_leash_only: editForm.dogs_on_leash_only,
      outdoor_seating: editForm.outdoor_seating,
      water_bowl_provided: editForm.water_bowl_provided,
      verified: editForm.verified,
    }).eq("id", editDialog.place.id);

    if (error) {
      toast.error("Erreur lors de la mise à jour");
      return;
    }
    toast.success(`✅ "${editForm.name}" mis à jour`);
    setEditDialog({ open: false, place: null });
    fetchValidatedPlaces();
  };

  const deletePlace = async () => {
    if (!deleteDialog.place) return;
    const { error } = await supabase.from("pet_friendly_places").delete().eq("id", deleteDialog.place.id);
    if (error) {
      toast.error("Erreur lors de la suppression");
      return;
    }
    toast.success(`🗑️ "${deleteDialog.place.name}" supprimé`);
    setDeleteDialog({ open: false, place: null });
    fetchValidatedPlaces();
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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="notifications">🔔 Notifs</TabsTrigger>
            <TabsTrigger value="submissions">📍 À valider</TabsTrigger>
            <TabsTrigger value="reports">⚠️ Signalements</TabsTrigger>
            <TabsTrigger value="places">🗺️ Lieux</TabsTrigger>
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
                    <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => setApproveDialog({ open: true, sub })}>
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

          {/* Validated Places */}
          <TabsContent value="places" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">Les 50 derniers lieux ajoutés (tous confondus)</p>
            {validatedPlaces.length === 0 && <p className="text-muted-foreground text-center py-8">Aucun lieu</p>}
            {validatedPlaces.map(place => (
              <Card key={place.id}>
                <CardContent className="pt-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground truncate">{place.name}</h3>
                        {place.verified && <Badge className="bg-green-600 text-white text-[10px] shrink-0">Vérifié</Badge>}
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant="secondary">{place.category}</Badge>
                        {place.subcategory && <Badge variant="outline" className="text-[10px]">{place.subcategory}</Badge>}
                        {place.source && <span className="text-[10px] text-muted-foreground">Source: {place.source}</span>}
                      </div>
                    </div>
                    {place.photo_url && (
                      <img src={place.photo_url} alt="" className="w-14 h-14 rounded-lg object-cover shrink-0" />
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {place.address && <p>📍 {place.address}</p>}
                    {place.city && <p>🏙️ {place.city}{place.country ? `, ${place.country}` : ""}</p>}
                    {place.phone && <p>📞 {place.phone}</p>}
                    {place.opening_hours && <p>🕐 {place.opening_hours}</p>}
                    <p>📐 {place.latitude.toFixed(5)}, {place.longitude.toFixed(5)}</p>
                    {place.rating && <p>⭐ {place.rating}</p>}
                  </div>

                  {place.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">{place.description}</p>
                  )}

                  <div className="flex gap-2 flex-wrap">
                    {place.accepts_dogs && <Badge variant="outline" className="text-[10px]">🐕 Chiens</Badge>}
                    {place.accepts_cats && <Badge variant="outline" className="text-[10px]">🐈 Chats</Badge>}
                    {place.outdoor_seating && <Badge variant="outline" className="text-[10px]">🌿 Terrasse</Badge>}
                    {place.water_bowl_provided && <Badge variant="outline" className="text-[10px]">🥣 Gamelle</Badge>}
                    {place.dogs_on_leash_only && <Badge variant="outline" className="text-[10px]">🦮 Laisse</Badge>}
                  </div>

                  <p className="text-[10px] text-muted-foreground">
                    Ajouté le {new Date(place.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                  </p>

                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => openEditDialog(place)}>
                      <Pencil className="w-3.5 h-3.5" /> Modifier
                    </Button>
                    <Button size="sm" variant="outline" className="gap-1.5 text-destructive border-destructive hover:bg-destructive/10" onClick={() => setDeleteDialog({ open: true, place })}>
                      <Trash2 className="w-3.5 h-3.5" /> Supprimer
                    </Button>
                    {place.website && (
                      <a href={place.website} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="ghost" className="gap-1.5">
                          <ExternalLink className="w-3.5 h-3.5" /> Site
                        </Button>
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>

      {/* Approve dialog */}
      <Dialog open={approveDialog.open} onOpenChange={(v) => { if (!v) { setApproveDialog({ open: false, sub: null }); setApproveNote(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>✅ Approuver ce lieu</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Ajouter un message de remerciement (optionnel)</p>
          <Textarea
            placeholder="Ex: Merci pour cette super contribution !"
            value={approveNote}
            onChange={(e) => setApproveNote(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setApproveDialog({ open: false, sub: null }); setApproveNote(""); }}>Annuler</Button>
            <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => { if (approveDialog.sub) approveSubmission(approveDialog.sub, approveNote); setApproveDialog({ open: false, sub: null }); setApproveNote(""); }}>Approuver</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      {/* Edit dialog */}
      <Dialog open={editDialog.open} onOpenChange={(v) => { if (!v) setEditDialog({ open: false, place: null }); }}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>✏️ Modifier le lieu</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-foreground">Nom</label>
              <Input value={editForm.name || ""} onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-foreground">Catégorie</label>
                <Input value={editForm.category || ""} onChange={(e) => setEditForm(f => ({ ...f, category: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground">Sous-catégorie</label>
                <Input value={editForm.subcategory || ""} onChange={(e) => setEditForm(f => ({ ...f, subcategory: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Adresse</label>
              <Input value={editForm.address || ""} onChange={(e) => setEditForm(f => ({ ...f, address: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-foreground">Ville</label>
                <Input value={editForm.city || ""} onChange={(e) => setEditForm(f => ({ ...f, city: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground">Pays</label>
                <Input value={editForm.country || ""} onChange={(e) => setEditForm(f => ({ ...f, country: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-foreground">Téléphone</label>
                <Input value={editForm.phone || ""} onChange={(e) => setEditForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-foreground">Site web</label>
                <Input value={editForm.website || ""} onChange={(e) => setEditForm(f => ({ ...f, website: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Horaires</label>
              <Input value={editForm.opening_hours || ""} onChange={(e) => setEditForm(f => ({ ...f, opening_hours: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Description</label>
              <Textarea value={editForm.description || ""} onChange={(e) => setEditForm(f => ({ ...f, description: e.target.value }))} rows={3} />
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={editForm.accepts_dogs ?? false} onChange={(e) => setEditForm(f => ({ ...f, accepts_dogs: e.target.checked }))} />
                🐕 Chiens
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={editForm.accepts_cats ?? false} onChange={(e) => setEditForm(f => ({ ...f, accepts_cats: e.target.checked }))} />
                🐈 Chats
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={editForm.outdoor_seating ?? false} onChange={(e) => setEditForm(f => ({ ...f, outdoor_seating: e.target.checked }))} />
                🌿 Terrasse
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={editForm.water_bowl_provided ?? false} onChange={(e) => setEditForm(f => ({ ...f, water_bowl_provided: e.target.checked }))} />
                🥣 Gamelle
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={editForm.dogs_on_leash_only ?? false} onChange={(e) => setEditForm(f => ({ ...f, dogs_on_leash_only: e.target.checked }))} />
                🦮 Laisse obligatoire
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={editForm.verified ?? false} onChange={(e) => setEditForm(f => ({ ...f, verified: e.target.checked }))} />
                ✅ Vérifié
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog({ open: false, place: null })}>Annuler</Button>
            <Button onClick={saveEdit}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(v) => { if (!v) setDeleteDialog({ open: false, place: null }); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>🗑️ Supprimer ce lieu ?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Es-tu sûr de vouloir supprimer <strong>"{deleteDialog.place?.name}"</strong> ? Cette action est irréversible.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, place: null })}>Annuler</Button>
            <Button variant="destructive" onClick={deletePlace}>Supprimer définitivement</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPage;
