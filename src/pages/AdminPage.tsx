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
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Pencil, Trash2, MapPin, Phone, Globe, Clock, ChevronLeft, ChevronRight, AlertTriangle, CheckCircle, Search } from "lucide-react";

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

interface PublishedPlace {
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
  opening_hours: string | null;
  description: string | null;
  accepts_dogs: boolean;
  accepts_cats: boolean;
  dogs_on_leash_only: boolean;
  outdoor_seating: boolean;
  water_bowl_provided: boolean;
  rating: number | null;
  photo_url: string | null;
  verified: boolean;
  is_flagged: boolean | null;
  report_count: number | null;
  source: string | null;
  last_updated: string | null;
  google_place_id: string | null;
  created_at: string;
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

const PLACES_PER_PAGE = 15;

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
  const [approveDialog, setApproveDialog] = useState<{ open: boolean; sub: Submission | null }>({ open: false, sub: null });
  const [approveNote, setApproveNote] = useState("");

  const [places, setPlaces] = useState<PublishedPlace[]>([]);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [publishedPlaces, setPublishedPlaces] = useState<Array<{
    id: string; name: string; category: string; city: string | null;
    created_at: string; verified: boolean; source: string | null;
  }>>([]);
  const [placesSearch, setPlacesSearch] = useState("");
  const [placesPage, setPlacesPage] = useState(0);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; place: PublishedPlace | null }>({ open: false, place: null });
  const [editDialog, setEditDialog] = useState<{ open: boolean; place: PublishedPlace | null }>({ open: false, place: null });
  const [editForm, setEditForm] = useState<Partial<PublishedPlace>>({});

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

  const fetchPlaces = useCallback(async () => {
    setPlacesLoading(true);
    const { data } = await supabase
      .from("pet_friendly_places")
      .select("id, name, category, subcategory, address, city, country, latitude, longitude, phone, website, opening_hours, description, accepts_dogs, accepts_cats, dogs_on_leash_only, outdoor_seating, water_bowl_provided, rating, photo_url, verified, is_flagged, report_count, source, last_updated, google_place_id, created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (data) setPlaces(data as PublishedPlace[]);
    setPlacesLoading(false);
  }, []);

  const fetchPublishedPlaces = useCallback(async () => {
    const { data } = await supabase
      .from("pet_friendly_places")
      .select("id, name, category, city, created_at, verified, source")
      .eq("source", "user_submission")
      .order("created_at", { ascending: false })
      .limit(50);
    if (data) setPublishedPlaces(data);
  }, []);

  useEffect(() => {
    fetchCounts();
    fetchNotifications();
    fetchSubmissions();
    fetchReports();
    fetchPlaces();
    fetchPublishedPlaces();
    const interval = setInterval(fetchCounts, 30000);
    return () => clearInterval(interval);
  }, [fetchCounts, fetchNotifications, fetchSubmissions, fetchReports, fetchPlaces, fetchPublishedPlaces]);

  const markNotifRead = async (id: string) => {
    await supabase.from("admin_notifications").update({ is_read: true }).eq("id", id);
    fetchNotifications();
    fetchCounts();
  };

  const approveSubmission = async (sub: Submission, note: string) => {
    const { data: newPlace, error: insertError } = await supabase.from("pet_friendly_places").insert({
      name: sub.name, category: sub.category, subcategory: sub.subcategory,
      address: sub.address, city: sub.city, country: sub.country || "France",
      latitude: sub.latitude, longitude: sub.longitude, phone: sub.phone,
      website: sub.website, description: sub.description,
      accepts_dogs: sub.accepts_dogs ?? true, accepts_cats: sub.accepts_cats ?? false,
      dogs_on_leash_only: sub.dogs_on_leash_only ?? false, outdoor_seating: sub.outdoor_seating ?? false,
      water_bowl_provided: sub.water_bowl_provided ?? false, opening_hours: sub.opening_hours,
      verified: true, source: "user_submission",
    }).select("id").single();

    if (insertError || !newPlace) {
      toast.error(`Erreur lors de la publication : ${insertError?.message || "Insertion échouée"}`);
      return;
    }

    {
      const { data: photo } = await supabase.from("submission_photos").select("url").eq("submission_id", sub.id).limit(1).maybeSingle();
      if (photo?.url) await supabase.from("pet_friendly_places").update({ photo_url: photo.url }).eq("id", newPlace.id);
    }

    await supabase.from("place_submissions").update({
      status: "approved", admin_note: note || null,
      reviewed_at: new Date().toISOString(), reviewed_by: user?.id,
    }).eq("id", sub.id);

    toast.success(`✅ "${sub.name}" approuvé et publié sur la carte !`);
    setSubmissions(prev => prev.filter(s => s.id !== sub.id));
    fetchCounts();
    fetchPlaces();
  };

  const rejectSubmission = async () => {
    if (!rejectDialog.id) return;
    await supabase.from("place_submissions").update({
      status: "rejected", admin_note: rejectNote || null,
      reviewed_at: new Date().toISOString(), reviewed_by: user?.id,
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

  const deletePlace = async (place: PublishedPlace) => {
    const { error } = await supabase.from("pet_friendly_places").delete().eq("id", place.id);
    if (error) { toast.error("Erreur : " + error.message); return; }
    toast.success(`🗑️ "${place.name}" supprimé`);
    setDeleteDialog({ open: false, place: null });
    setPlaces(prev => prev.filter(p => p.id !== place.id));
    fetchCounts();
  };

  const openEdit = (place: PublishedPlace) => {
    setEditForm({ ...place });
    setEditDialog({ open: true, place });
  };

  const saveEdit = async () => {
    if (!editDialog.place) return;
    const { error } = await supabase.from("pet_friendly_places").update({
      name: editForm.name, category: editForm.category,
      subcategory: editForm.subcategory || null, address: editForm.address || null,
      city: editForm.city || null, country: editForm.country || null,
      phone: editForm.phone || null, website: editForm.website || null,
      opening_hours: editForm.opening_hours || null, description: editForm.description || null,
      accepts_dogs: editForm.accepts_dogs ?? true, accepts_cats: editForm.accepts_cats ?? false,
      dogs_on_leash_only: editForm.dogs_on_leash_only ?? false, outdoor_seating: editForm.outdoor_seating ?? false,
      water_bowl_provided: editForm.water_bowl_provided ?? false, verified: editForm.verified ?? true,
      is_flagged: editForm.is_flagged ?? false, photo_url: editForm.photo_url || null,
      last_updated: new Date().toISOString(),
    }).eq("id", editDialog.place.id);
    if (error) { toast.error("Erreur : " + error.message); return; }
    toast.success(`✅ "${editForm.name}" mis à jour`);
    setPlaces(prev => prev.map(p => p.id === editDialog.place!.id ? { ...p, ...editForm } as PublishedPlace : p));
    setEditDialog({ open: false, place: null });
  };

  const filteredPlaces = places.filter(p => {
    if (!placesSearch) return true;
    const q = placesSearch.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.city?.toLowerCase().includes(q) || p.category.toLowerCase().includes(q) || p.address?.toLowerCase().includes(q);
  });
  const totalPages = Math.ceil(filteredPlaces.length / PLACES_PER_PAGE);
  const paginatedPlaces = filteredPlaces.slice(placesPage * PLACES_PER_PAGE, (placesPage + 1) * PLACES_PER_PAGE);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate("/")}>← Retour</Button>
          <h1 className="text-xl font-bold text-foreground flex-1">⚙️ Administration — World Pet Friendly</h1>
          {notifCount > 0 && <Badge className="bg-orange-500 text-white">{notifCount}</Badge>}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card><CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-foreground">{pendingCount}</p>
            <p className="text-sm text-muted-foreground mt-1">📍 En attente</p>
          </CardContent></Card>
          <Card><CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-foreground">{reportsCount}</p>
            <p className="text-sm text-muted-foreground mt-1">⚠️ Signalements</p>
          </CardContent></Card>
          <Card><CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-foreground">{notifCount}</p>
            <p className="text-sm text-muted-foreground mt-1">🔔 Notifications</p>
          </CardContent></Card>
          <Card><CardContent className="pt-6 text-center">
            <p className="text-3xl font-bold text-foreground">{places.length}</p>
            <p className="text-sm text-muted-foreground mt-1">🗺️ Lieux publiés</p>
          </CardContent></Card>
        </div>

        <Tabs defaultValue="notifications">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="notifications">🔔 Notifs</TabsTrigger>
            <TabsTrigger value="submissions">📍 À valider</TabsTrigger>
            <TabsTrigger value="reports">⚠️ Signalements</TabsTrigger>
            <TabsTrigger value="places">🗺️ Lieux</TabsTrigger>
          </TabsList>

          <TabsContent value="notifications" className="space-y-2 mt-4">
            {notifications.length === 0 && <p className="text-muted-foreground text-center py-8">Aucune notification</p>}
            {notifications.map(n => (
              <div key={n.id} onClick={() => !n.is_read && markNotifRead(n.id)}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${n.is_read ? "bg-card" : "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"}`}>
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

          <TabsContent value="submissions" className="space-y-4 mt-4">
            {submissions.length === 0 && <p className="text-muted-foreground text-center py-8">Aucun lieu en attente</p>}
            {submissions.map(sub => (
              <Card key={sub.id}><CardContent className="pt-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-foreground">{sub.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary">{sub.category}</Badge>
                      {sub.city && <span className="text-sm text-muted-foreground">{sub.city}</span>}
                    </div>
                  </div>
                </div>
                {sub.description && <p className="text-sm text-muted-foreground">{sub.description.length > 100 ? sub.description.slice(0, 100) + "…" : sub.description}</p>}
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
                  <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => setApproveDialog({ open: true, sub })}>✅ Approuver</Button>
                  <Button size="sm" variant="outline" className="text-destructive border-destructive" onClick={() => setRejectDialog({ open: true, id: sub.id })}>❌ Rejeter</Button>
                </div>
              </CardContent></Card>
            ))}
          </TabsContent>

          <TabsContent value="reports" className="space-y-4 mt-4">
            {reports.length === 0 && <p className="text-muted-foreground text-center py-8">Aucun signalement en attente</p>}
            {reports.map(report => (
              <Card key={report.id}><CardContent className="pt-4 space-y-3">
                <h3 className="font-semibold text-foreground">{report.place_name}</h3>
                <Badge variant="outline">{reasonLabels[report.reason] || report.reason}</Badge>
                {report.comment && <p className="text-sm text-muted-foreground">"{report.comment}"</p>}
                <p className="text-xs text-muted-foreground">{timeAgo(report.created_at || "")}</p>
                <div className="flex gap-2 pt-2">
                  <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => handleReport(report, "reviewed")}>✅ Traité</Button>
                  <Button size="sm" variant="outline" onClick={() => handleReport(report, "dismissed")}>🚫 Ignorer</Button>
                </div>
              </CardContent></Card>
            ))}
          </TabsContent>

          <TabsContent value="places" className="space-y-4 mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom, ville, catégorie…"
                value={placesSearch}
                onChange={(e) => { setPlacesSearch(e.target.value); setPlacesPage(0); }}
                className="pl-9"
              />
            </div>

            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{filteredPlaces.length} lieu{filteredPlaces.length > 1 ? "x" : ""} trouvé{filteredPlaces.length > 1 ? "s" : ""}</span>
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button size="icon" variant="ghost" disabled={placesPage === 0} onClick={() => setPlacesPage(p => p - 1)} className="h-8 w-8">
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-xs">{placesPage + 1} / {totalPages}</span>
                  <Button size="icon" variant="ghost" disabled={placesPage >= totalPages - 1} onClick={() => setPlacesPage(p => p + 1)} className="h-8 w-8">
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            {placesLoading && <p className="text-muted-foreground text-center py-8">Chargement…</p>}

            {!placesLoading && paginatedPlaces.length === 0 && (
              <p className="text-muted-foreground text-center py-8">Aucun lieu trouvé</p>
            )}

            {paginatedPlaces.map(place => (
              <Card key={place.id} className={place.is_flagged ? "border-orange-400 dark:border-orange-700" : ""}>
                <CardContent className="pt-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-foreground">{place.name}</h3>
                        {place.verified && <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />}
                        {place.is_flagged && <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0" />}
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant="secondary">{place.category}</Badge>
                        {place.subcategory && <Badge variant="outline" className="text-[10px]">{place.subcategory}</Badge>}
                        {place.source && <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{place.source}</span>}
                      </div>
                    </div>
                    {place.photo_url && (
                      <img src={place.photo_url} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0 border border-border" />
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {place.address && <p className="flex items-center gap-1"><MapPin className="w-3 h-3 shrink-0" /> {place.address}</p>}
                    {place.city && <p>🏙️ {place.city}{place.country ? `, ${place.country}` : ""}</p>}
                    {place.phone && <p className="flex items-center gap-1"><Phone className="w-3 h-3 shrink-0" /> {place.phone}</p>}
                    {place.opening_hours && <p className="flex items-center gap-1"><Clock className="w-3 h-3 shrink-0" /> {place.opening_hours}</p>}
                    <p>📐 {place.latitude.toFixed(4)}, {place.longitude.toFixed(4)}</p>
                    {place.rating != null && <p>⭐ {place.rating}</p>}
                    {(place.report_count ?? 0) > 0 && <p className="text-orange-500">⚠️ {place.report_count} signalement(s)</p>}
                    {place.google_place_id && <p className="truncate">🔗 Google: {place.google_place_id.slice(0, 12)}…</p>}
                  </div>

                  {place.description && <p className="text-xs text-muted-foreground line-clamp-2">{place.description}</p>}

                  <div className="flex gap-1.5 flex-wrap">
                    {place.accepts_dogs && <Badge variant="outline" className="text-[10px] py-0">🐕 Chiens</Badge>}
                    {place.accepts_cats && <Badge variant="outline" className="text-[10px] py-0">🐈 Chats</Badge>}
                    {place.outdoor_seating && <Badge variant="outline" className="text-[10px] py-0">🌿 Terrasse</Badge>}
                    {place.water_bowl_provided && <Badge variant="outline" className="text-[10px] py-0">🥣 Gamelle</Badge>}
                    {place.dogs_on_leash_only && <Badge variant="outline" className="text-[10px] py-0">🦮 Laisse</Badge>}
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-muted-foreground">
                      Ajouté le {new Date(place.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                      {place.last_updated && ` • MAJ ${timeAgo(place.last_updated)}`}
                    </p>
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => openEdit(place)}>
                        <Pencil className="w-3 h-3" /> Modifier
                      </Button>
                      <Button size="sm" variant="outline" className="h-7 gap-1 text-xs text-destructive border-destructive hover:bg-destructive/10" onClick={() => setDeleteDialog({ open: true, place })}>
                        <Trash2 className="w-3 h-3" /> Supprimer
                      </Button>
                      {place.website && (
                        <a href={place.website} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs"><Globe className="w-3 h-3" /></Button>
                        </a>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <Button size="sm" variant="outline" disabled={placesPage === 0} onClick={() => setPlacesPage(p => p - 1)}>
                  <ChevronLeft className="w-4 h-4 mr-1" /> Précédent
                </Button>
                <span className="text-sm text-muted-foreground">{placesPage + 1} / {totalPages}</span>
                <Button size="sm" variant="outline" disabled={placesPage >= totalPages - 1} onClick={() => setPlacesPage(p => p + 1)}>
                  Suivant <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={approveDialog.open} onOpenChange={(v) => { if (!v) { setApproveDialog({ open: false, sub: null }); setApproveNote(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>✅ Approuver ce lieu</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Ajouter un message de remerciement (optionnel)</p>
          <Textarea placeholder="Ex: Merci pour cette super contribution !" value={approveNote} onChange={(e) => setApproveNote(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setApproveDialog({ open: false, sub: null }); setApproveNote(""); }}>Annuler</Button>
            <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={() => { if (approveDialog.sub) approveSubmission(approveDialog.sub, approveNote); setApproveDialog({ open: false, sub: null }); setApproveNote(""); }}>Approuver</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectDialog.open} onOpenChange={(v) => { if (!v) { setRejectDialog({ open: false, id: null }); setRejectNote(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Motif du refus</DialogTitle></DialogHeader>
          <Textarea placeholder="Motif du refus (optionnel)" value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRejectDialog({ open: false, id: null }); setRejectNote(""); }}>Annuler</Button>
            <Button variant="destructive" onClick={rejectSubmission}>Rejeter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialog.open} onOpenChange={(v) => { if (!v) setEditDialog({ open: false, place: null }); }}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader><DialogTitle>✏️ Modifier le lieu</DialogTitle></DialogHeader>
          <ScrollArea className="flex-1 pr-4">
            <div className="space-y-3 pb-2">
              <div>
                <label className="text-xs font-medium text-foreground">Nom</label>
                <Input value={editForm.name || ""} onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-foreground">Catégorie</label>
                  <Input value={editForm.category || ""} onChange={(e) => setEditForm(f => ({ ...f, category: e.target.value }))} /></div>
                <div><label className="text-xs font-medium text-foreground">Sous-catégorie</label>
                  <Input value={editForm.subcategory || ""} onChange={(e) => setEditForm(f => ({ ...f, subcategory: e.target.value }))} /></div>
              </div>
              <div><label className="text-xs font-medium text-foreground">Adresse</label>
                <Input value={editForm.address || ""} onChange={(e) => setEditForm(f => ({ ...f, address: e.target.value }))} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-foreground">Ville</label>
                  <Input value={editForm.city || ""} onChange={(e) => setEditForm(f => ({ ...f, city: e.target.value }))} /></div>
                <div><label className="text-xs font-medium text-foreground">Pays</label>
                  <Input value={editForm.country || ""} onChange={(e) => setEditForm(f => ({ ...f, country: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-medium text-foreground">Téléphone</label>
                  <Input value={editForm.phone || ""} onChange={(e) => setEditForm(f => ({ ...f, phone: e.target.value }))} /></div>
                <div><label className="text-xs font-medium text-foreground">Site web</label>
                  <Input value={editForm.website || ""} onChange={(e) => setEditForm(f => ({ ...f, website: e.target.value }))} /></div>
              </div>
              <div><label className="text-xs font-medium text-foreground">Horaires</label>
                <Input value={editForm.opening_hours || ""} onChange={(e) => setEditForm(f => ({ ...f, opening_hours: e.target.value }))} /></div>
              <div><label className="text-xs font-medium text-foreground">URL photo</label>
                <Input value={editForm.photo_url || ""} onChange={(e) => setEditForm(f => ({ ...f, photo_url: e.target.value }))} /></div>
              <div><label className="text-xs font-medium text-foreground">Description</label>
                <Textarea value={editForm.description || ""} onChange={(e) => setEditForm(f => ({ ...f, description: e.target.value }))} rows={3} /></div>
              <Separator />
              <div className="space-y-3">
                {([
                  ["accepts_dogs", "🐕 Accepte les chiens"],
                  ["accepts_cats", "🐈 Accepte les chats"],
                  ["outdoor_seating", "🌿 Terrasse extérieure"],
                  ["water_bowl_provided", "🥣 Gamelle d'eau"],
                  ["dogs_on_leash_only", "🦮 Laisse obligatoire"],
                  ["verified", "✅ Vérifié"],
                  ["is_flagged", "⚠️ Signalé"],
                ] as const).map(([key, label]) => (
                  <div key={key} className="flex items-center justify-between">
                    <label className="text-sm text-foreground">{label}</label>
                    <Switch
                      checked={!!editForm[key]}
                      onCheckedChange={(v) => setEditForm(f => ({ ...f, [key]: v }))}
                    />
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialog({ open: false, place: null })}>Annuler</Button>
            <Button onClick={saveEdit}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialog.open} onOpenChange={(v) => { if (!v) setDeleteDialog({ open: false, place: null }); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>🗑️ Supprimer ce lieu ?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Es-tu sûr de vouloir supprimer <strong>"{deleteDialog.place?.name}"</strong> ? Cette action est irréversible.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, place: null })}>Annuler</Button>
            <Button variant="destructive" onClick={() => deleteDialog.place && deletePlace(deleteDialog.place)}>Supprimer définitivement</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPage;
