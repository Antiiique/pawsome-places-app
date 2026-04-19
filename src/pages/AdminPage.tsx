import { useState, useEffect, useCallback, useRef } from "react";
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
  photos?: string[];
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

interface DashboardStats {
  totalPlaces: number;
  verifiedPlaces: number;
  flaggedPlaces: number;
  placesThisMonth: number;
  totalUsers: number;
  newUsersThisMonth: number;
  avgRating: number | null;
  recentSubmissions: number;
  recentReports: number;
  byCategory: Record<string, number>;
  bySource: Record<string, number>;
  topCities: Array<{ city: string; count: number }>;
  topUsers: Array<{ display_name: string | null; email: string | null; points: number; avatar_url: string | null }>;
  placesWithPhoto: number;
  placesWithHours: number;
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

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function ReportGroups({ reports, onEdit, onUnpublish, onReview, onDismiss }: {
  reports: Report[];
  onEdit: (placeId: string) => void;
  onUnpublish: (placeId: string, ids: string[]) => void;
  onReview: (placeId: string | null, ids: string[]) => void;
  onDismiss: (placeId: string | null, ids: string[]) => void;
}) {
  const groups: Record<string, { place_id: string | null; place_name: string | undefined; reports: Report[] }> = {};
  for (const r of reports) {
    const key = r.place_id || `no-place-${r.id}`;
    if (!groups[key]) groups[key] = { place_id: r.place_id, place_name: r.place_name, reports: [] };
    groups[key].reports.push(r);
  }
  return (
    <>
      {Object.entries(groups).map(([key, group]) => {
        const ids = group.reports.map(r => r.id);
        const hasPlace = !!group.place_id;
        return (
          <Card key={key} className="border-orange-300 dark:border-orange-700">
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-foreground">{group.place_name || "Lieu inconnu"}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{group.reports.length} signalement{group.reports.length > 1 ? "s" : ""}</p>
                </div>
                {group.reports.length > 1 && <Badge className="bg-orange-500 text-white shrink-0">{group.reports.length}</Badge>}
              </div>
              <div className="space-y-2">
                {group.reports.map(report => (
                  <div key={report.id} className="rounded-lg bg-secondary border border-border p-3 space-y-1">
                    <Badge variant="outline" className="text-xs">{reasonLabels[report.reason] || report.reason}</Badge>
                    {report.comment && <p className="text-sm text-muted-foreground">"{report.comment}"</p>}
                    <p className="text-xs text-muted-foreground">{timeAgo(report.created_at || "")}</p>
                  </div>
                ))}
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-2">
                {hasPlace && (
                  <Button size="sm" variant="outline" className="text-xs h-9" onClick={() => onEdit(group.place_id!)}>
                    ✏️ Corriger le lieu
                  </Button>
                )}
                {hasPlace && (
                  <Button size="sm" variant="outline" className="text-xs h-9 border-orange-400 text-orange-700 hover:bg-orange-50 dark:text-orange-400 dark:border-orange-700" onClick={() => onUnpublish(group.place_id!, ids)}>
                    🔒 Dépublier temporairement
                  </Button>
                )}
                <Button size="sm" className="text-xs h-9 bg-green-600 hover:bg-green-700 text-white" onClick={() => onReview(group.place_id, ids)}>
                  ✅ Marquer traité{ids.length > 1 ? "s" : ""}
                </Button>
                <Button size="sm" variant="outline" className="text-xs h-9" onClick={() => onDismiss(group.place_id, ids)}>
                  🚫 Infondé{ids.length > 1 ? "s" : ""}
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </>
  );
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
  const [approveDialog, setApproveDialog] = useState<{ open: boolean; sub: Submission | null }>({ open: false, sub: null });
  const [approveNote, setApproveNote] = useState("");

  const [places, setPlaces] = useState<PublishedPlace[]>([]);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [placesSearch, setPlacesSearch] = useState("");
  const [placesPage, setPlacesPage] = useState(0);
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; place: PublishedPlace | null }>({ open: false, place: null });
  const [editDialog, setEditDialog] = useState<{ open: boolean; place: PublishedPlace | null }>({ open: false, place: null });
  const [editForm, setEditForm] = useState<Partial<PublishedPlace>>({});

  // Users tab
  const [users, setUsers] = useState<Array<{
    id: string;
    email: string | null;
    display_name: string | null;
    avatar_url: string | null;
    city: string | null;
    points: number;
    is_admin: boolean;
    is_banned: boolean;
    created_at: string | null;
  }>>([]);
  const [usersSearch, setUsersSearch] = useState("");
  const [userSort, setUserSort] = useState<"points" | "created_at" | "is_admin">("points");
  const [userDetailDialog, setUserDetailDialog] = useState<{ open: boolean; userId: string | null; userName: string }>({ open: false, userId: null, userName: "" });
  const [userDetail, setUserDetail] = useState<{
    totalSubmissions: number;
    approvedSubmissions: number;
    rejectedSubmissions: number;
    pendingSubmissions: number;
    recentSubmissions: Array<{ id: string; name: string; status: string; created_at: string }>;
  } | null>(null);
  const [userDetailLoading, setUserDetailLoading] = useState(false);
  const [userEditDialog, setUserEditDialog] = useState<{ open: boolean; user: typeof users[0] | null }>({ open: false, user: null });
  const [userEditForm, setUserEditForm] = useState<{ display_name: string; city: string; points: number; is_admin: boolean; is_banned: boolean }>({ display_name: "", city: "", points: 0, is_admin: false, is_banned: false });

  const [selectedSubmissions, setSelectedSubmissions] = useState<Set<string>>(new Set());
  const [submissionsFilter, setSubmissionsFilter] = useState({ category: "", city: "", dateRange: "all" });
  const [submissionMapOpen, setSubmissionMapOpen] = useState<string | null>(null);
  const [bulkRejectDialog, setBulkRejectDialog] = useState(false);
  const [bulkRejectNote, setBulkRejectNote] = useState("");

  const [enriching, setEnriching] = useState(false);
  const [enrichedData, setEnrichedData] = useState<{
    photo_url?: string;
    rating?: number;
    opening_hours?: string;
    phone?: string;
    website?: string;
    google_place_id?: string;
  } | null>(null);
  const placesServiceRef = useRef<any>(null);
  const placesServiceDivRef = useRef<HTMLDivElement>(null);

  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(false);

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
      const subIds = data.map(s => s.id);
      let photoMap: Record<string, string[]> = {};
      if (subIds.length) {
        const { data: photos } = await supabase.from("submission_photos").select("submission_id, url").in("submission_id", subIds);
        if (photos) {
          for (const p of photos) {
            if (!p.submission_id) continue;
            if (!photoMap[p.submission_id]) photoMap[p.submission_id] = [];
            photoMap[p.submission_id].push(p.url);
          }
        }
      }
      setSubmissions(data.map(s => ({
        ...s,
        submitter_email: s.submitted_by ? profileMap[s.submitted_by] || "" : "",
        photos: photoMap[s.id] || [],
      })));
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

  const fetchUsers = useCallback(async () => {
    const { data } = await supabase
      .from("profiles")
      .select("id, email, display_name, avatar_url, city, points, is_admin, is_banned, created_at")
      .limit(200);
    if (data) setUsers(data as any);
  }, []);

  const fetchUserDetail = async (userId: string) => {
    setUserDetailLoading(true);
    setUserDetail(null);
    const { data } = await supabase
      .from("place_submissions")
      .select("id, name, status, created_at")
      .eq("submitted_by", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    const submissions = data || [];
    setUserDetail({
      totalSubmissions: submissions.length,
      approvedSubmissions: submissions.filter(s => s.status === "approved").length,
      rejectedSubmissions: submissions.filter(s => s.status === "rejected").length,
      pendingSubmissions: submissions.filter(s => s.status === "pending").length,
      recentSubmissions: submissions.slice(0, 10) as any,
    });
    setUserDetailLoading(false);
  };

  const toggleSuspendUser = async (userId: string, currentBanned: boolean) => {
    const { error } = await supabase
      .from("profiles")
      .update({ is_banned: !currentBanned })
      .eq("id", userId);
    if (error) { toast.error("Erreur : " + error.message); return; }
    toast.success(currentBanned ? "✅ Compte réactivé" : "🚫 Compte suspendu");
    fetchUsers();
  };

  const resetUserPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/`,
    });
    if (error) { toast.error("Erreur : " + error.message); return; }
    toast.success(`📧 Email de réinitialisation envoyé à ${email}`);
  };

  const fetchDashboardStats = useCallback(async () => {
    setDashboardLoading(true);
    const monthAgo = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [
      totalRes, verifiedRes, flaggedRes, monthRes,
      totalUsersRes, newUsersRes, subWeekRes, repWeekRes,
      statsRes, topUsersRes, photoRes, hoursRes,
    ] = await Promise.all([
      supabase.from("pet_friendly_places").select("*", { count: "exact", head: true }),
      supabase.from("pet_friendly_places").select("*", { count: "exact", head: true }).eq("verified", true),
      supabase.from("pet_friendly_places").select("*", { count: "exact", head: true }).eq("is_flagged", true),
      supabase.from("pet_friendly_places").select("*", { count: "exact", head: true }).gte("created_at", monthAgo),
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("profiles").select("*", { count: "exact", head: true }).gte("created_at", monthAgo),
      supabase.from("place_submissions").select("*", { count: "exact", head: true }).gte("created_at", weekAgo),
      supabase.from("place_reports").select("*", { count: "exact", head: true }).gte("created_at", weekAgo),
      supabase.from("pet_friendly_places").select("category, source, city, rating").limit(10000),
      supabase.from("profiles").select("display_name, email, points, avatar_url").order("points", { ascending: false }).limit(5),
      supabase.from("pet_friendly_places").select("*", { count: "exact", head: true }).not("photo_url", "is", null),
      supabase.from("pet_friendly_places").select("*", { count: "exact", head: true }).not("opening_hours", "is", null),
    ]);

    const rows = statsRes.data || [];
    const byCategory: Record<string, number> = {};
    const bySource: Record<string, number> = {};
    const cityCount: Record<string, number> = {};
    const ratings: number[] = [];

    rows.forEach(p => {
      byCategory[p.category] = (byCategory[p.category] || 0) + 1;
      const src = p.source || "unknown";
      bySource[src] = (bySource[src] || 0) + 1;
      if (p.city) cityCount[p.city] = (cityCount[p.city] || 0) + 1;
      if (p.rating) ratings.push(p.rating);
    });

    const topCities = Object.entries(cityCount)
      .sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([city, count]) => ({ city, count }));

    const avgRating = ratings.length
      ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
      : null;

    setDashboardStats({
      totalPlaces: totalRes.count ?? 0,
      verifiedPlaces: verifiedRes.count ?? 0,
      flaggedPlaces: flaggedRes.count ?? 0,
      placesThisMonth: monthRes.count ?? 0,
      totalUsers: totalUsersRes.count ?? 0,
      newUsersThisMonth: newUsersRes.count ?? 0,
      avgRating,
      recentSubmissions: subWeekRes.count ?? 0,
      recentReports: repWeekRes.count ?? 0,
      byCategory,
      bySource,
      topCities,
      topUsers: topUsersRes.data || [],
      placesWithPhoto: photoRes.count ?? 0,
      placesWithHours: hoursRes.count ?? 0,
    });
    setDashboardLoading(false);
  }, []);

  useEffect(() => {
    fetchCounts();
    fetchNotifications();
    fetchSubmissions();
    fetchReports();
    fetchPlaces();
    fetchUsers();
    fetchDashboardStats();
    const interval = setInterval(fetchCounts, 30000);
    return () => clearInterval(interval);
  }, [fetchCounts, fetchNotifications, fetchSubmissions, fetchReports, fetchPlaces, fetchUsers, fetchDashboardStats]);

  const markNotifRead = async (id: string) => {
    await supabase.from("admin_notifications").update({ is_read: true }).eq("id", id);
    fetchNotifications();
    fetchCounts();
  };

  const approveSubmission = async (sub: Submission, note: string) => {
    const { data: newPlace, error: insertError } = await supabase.from("pet_friendly_places").insert({
      name: sub.name, category: sub.category, subcategory: sub.subcategory,
      address: sub.address, city: sub.city, country: sub.country || "France",
      latitude: sub.latitude, longitude: sub.longitude,
      phone: enrichedData?.phone || sub.phone,
      website: enrichedData?.website || sub.website,
      description: sub.description,
      accepts_dogs: sub.accepts_dogs ?? true, accepts_cats: sub.accepts_cats ?? false,
      dogs_on_leash_only: sub.dogs_on_leash_only ?? false, outdoor_seating: sub.outdoor_seating ?? false,
      water_bowl_provided: sub.water_bowl_provided ?? false,
      opening_hours: enrichedData?.opening_hours || sub.opening_hours,
      rating: enrichedData?.rating || null,
      google_place_id: enrichedData?.google_place_id || null,
      verified: true, source: "user_submission",
    }).select("id").single();

    if (insertError || !newPlace) {
      toast.error(`Erreur lors de la publication : ${insertError?.message || "Insertion échouée"}`);
      return;
    }

    {
      const { data: photo } = await supabase.from("submission_photos").select("url").eq("submission_id", sub.id).limit(1).maybeSingle();
      const photoUrl = photo?.url || enrichedData?.photo_url;
      if (photoUrl) await supabase.from("pet_friendly_places").update({ photo_url: photoUrl }).eq("id", newPlace.id);
    }

    await supabase.from("place_submissions").update({
      status: "approved", admin_note: note || null,
      reviewed_at: new Date().toISOString(), reviewed_by: user?.id,
    }).eq("id", sub.id);

    toast.success(`✅ "${sub.name}" approuvé et publié sur la carte !`);
    setSubmissions(prev => prev.filter(s => s.id !== sub.id));
    setEnrichedData(null);
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

  const openEditFromReport = async (placeId: string) => {
    let found = places.find(p => p.id === placeId);
    if (!found) {
      const { data } = await supabase.from("pet_friendly_places").select("id, name, category, subcategory, address, city, country, latitude, longitude, phone, website, opening_hours, description, accepts_dogs, accepts_cats, dogs_on_leash_only, outdoor_seating, water_bowl_provided, rating, photo_url, verified, is_flagged, report_count, source, last_updated, google_place_id, created_at").eq("id", placeId).maybeSingle();
      if (data) found = data as PublishedPlace;
    }
    if (found) openEdit(found);
    else toast.error("Lieu introuvable");
  };

  const unpublishFromReport = async (placeId: string, reportIds: string[]) => {
    await supabase.from("pet_friendly_places").update({ verified: false, is_flagged: true }).eq("id", placeId);
    await Promise.all(reportIds.map(id => supabase.from("place_reports").update({ status: "reviewed" }).eq("id", id)));
    toast.success("🔒 Lieu dépublié temporairement");
    setReports(prev => prev.filter(r => !reportIds.includes(r.id)));
    setPlaces(prev => prev.map(p => p.id === placeId ? { ...p, verified: false, is_flagged: true } : p));
    fetchCounts();
  };

  const reviewGroup = async (placeId: string | null, reportIds: string[]) => {
    await Promise.all(reportIds.map(id => supabase.from("place_reports").update({ status: "reviewed" }).eq("id", id)));
    if (placeId) await supabase.from("pet_friendly_places").update({ is_flagged: true }).eq("id", placeId);
    toast.success("✅ Signalements traités");
    setReports(prev => prev.filter(r => !reportIds.includes(r.id)));
    fetchCounts();
  };

  const dismissGroup = async (placeId: string | null, reportIds: string[]) => {
    await Promise.all(reportIds.map(id => supabase.from("place_reports").update({ status: "dismissed" }).eq("id", id)));
    if (placeId) await supabase.from("pet_friendly_places").update({ report_count: 0, is_flagged: false }).eq("id", placeId);
    toast.success("🚫 Signalements marqués comme infondés");
    setReports(prev => prev.filter(r => !reportIds.includes(r.id)));
    fetchCounts();
  };

  const getPlacesService = () => {
    const g = (window as any).google;
    if (!g?.maps?.places || !placesServiceDivRef.current) return null;
    if (!placesServiceRef.current) {
      placesServiceRef.current = new g.maps.places.PlacesService(placesServiceDivRef.current);
    }
    return placesServiceRef.current;
  };

  const fetchGoogleEnrichment = (sub: Submission) => {
    setEnriching(true);
    setEnrichedData(null);
    const svc = getPlacesService();
    if (!svc) { setEnriching(false); return; }
    const g = (window as any).google;
    const query = `${sub.name}${sub.city ? ` ${sub.city}` : ""}`;
    svc.textSearch(
      { query, location: new g.maps.LatLng(sub.latitude, sub.longitude), radius: 300 },
      (results: any[], status: string) => {
        if (status !== "OK" || !results?.[0]?.place_id) { setEnriching(false); return; }
        svc.getDetails(
          { placeId: results[0].place_id, fields: ["photos", "rating", "opening_hours", "formatted_phone_number", "website", "place_id"] },
          (detail: any, dStatus: string) => {
            if (dStatus === "OK" && detail) {
              setEnrichedData({
                photo_url: detail.photos?.[0]?.getUrl({ maxWidth: 800 }) || undefined,
                rating: detail.rating || undefined,
                opening_hours: detail.opening_hours?.weekday_text?.slice(0, 3).join(" • ") || undefined,
                phone: detail.formatted_phone_number || undefined,
                website: detail.website || undefined,
                google_place_id: detail.place_id || undefined,
              });
            }
            setEnriching(false);
          }
        );
      }
    );
  };

  const findNearbyDuplicates = (sub: Submission) =>
    places.filter(p => haversineKm(sub.latitude, sub.longitude, p.latitude, p.longitude) < 0.1);

  const toggleSelectSubmission = (id: string) => {
    setSelectedSubmissions(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const bulkApprove = async () => {
    const toApprove = submissions.filter(s => selectedSubmissions.has(s.id));
    let count = 0;
    for (const sub of toApprove) {
      const { data: newPlace, error } = await supabase.from("pet_friendly_places").insert({
        name: sub.name, category: sub.category, subcategory: sub.subcategory,
        address: sub.address, city: sub.city, country: sub.country || "France",
        latitude: sub.latitude, longitude: sub.longitude, phone: sub.phone,
        website: sub.website, description: sub.description,
        accepts_dogs: sub.accepts_dogs ?? true, accepts_cats: sub.accepts_cats ?? false,
        dogs_on_leash_only: sub.dogs_on_leash_only ?? false, outdoor_seating: sub.outdoor_seating ?? false,
        water_bowl_provided: sub.water_bowl_provided ?? false, opening_hours: sub.opening_hours,
        verified: true, source: "user_submission",
      }).select("id").single();
      if (!error && newPlace) {
        const { data: photo } = await supabase.from("submission_photos").select("url").eq("submission_id", sub.id).limit(1).maybeSingle();
        if (photo?.url) await supabase.from("pet_friendly_places").update({ photo_url: photo.url }).eq("id", newPlace.id);
        await supabase.from("place_submissions").update({ status: "approved", reviewed_at: new Date().toISOString(), reviewed_by: user?.id }).eq("id", sub.id);
        count++;
      }
    }
    toast.success(`✅ ${count} lieu(x) approuvé(s) et publiés !`);
    setSubmissions(prev => prev.filter(s => !selectedSubmissions.has(s.id)));
    setSelectedSubmissions(new Set());
    fetchCounts();
    fetchPlaces();
  };

  const bulkReject = async () => {
    for (const id of selectedSubmissions) {
      await supabase.from("place_submissions").update({
        status: "rejected", admin_note: bulkRejectNote || null,
        reviewed_at: new Date().toISOString(), reviewed_by: user?.id,
      }).eq("id", id);
    }
    toast.success(`${selectedSubmissions.size} soumission(s) rejetée(s)`);
    setSubmissions(prev => prev.filter(s => !selectedSubmissions.has(s.id)));
    setSelectedSubmissions(new Set());
    setBulkRejectDialog(false);
    setBulkRejectNote("");
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

  const openUserEdit = (u: typeof users[0]) => {
    setUserEditForm({
      display_name: u.display_name || "",
      city: u.city || "",
      points: u.points ?? 0,
      is_admin: !!u.is_admin,
      is_banned: !!u.is_banned,
    });
    setUserEditDialog({ open: true, user: u });
  };

  const saveUserEdit = async () => {
    if (!userEditDialog.user) return;
    const { error } = await supabase.from("profiles").update({
      display_name: userEditForm.display_name,
      city: userEditForm.city,
      points: userEditForm.points,
      is_admin: userEditForm.is_admin,
      is_banned: userEditForm.is_banned,
    }).eq("id", userEditDialog.user.id);
    if (error) { toast.error("Erreur : " + error.message); return; }
    toast.success("Profil mis à jour");
    setUserEditDialog({ open: false, user: null });
    fetchUsers();
  };

  const uniqueCategories = [...new Set(submissions.map(s => s.category))].filter(Boolean);

  const filteredSubmissions = submissions.filter(sub => {
    if (submissionsFilter.category && sub.category !== submissionsFilter.category) return false;
    if (submissionsFilter.city && !sub.city?.toLowerCase().includes(submissionsFilter.city.toLowerCase())) return false;
    if (submissionsFilter.dateRange === "7d" && Date.now() - new Date(sub.created_at).getTime() > 7 * 86400000) return false;
    if (submissionsFilter.dateRange === "30d" && Date.now() - new Date(sub.created_at).getTime() > 30 * 86400000) return false;
    return true;
  });

  const filteredPlaces = places.filter(p => {
    if (!placesSearch) return true;
    const q = placesSearch.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.city?.toLowerCase().includes(q) || p.category.toLowerCase().includes(q) || p.address?.toLowerCase().includes(q);
  });

  const filteredUsers = users.filter(u => {
    if (!usersSearch) return true;
    const q = usersSearch.toLowerCase();
    return (u.display_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q) || u.city?.toLowerCase().includes(q));
  });

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    if (userSort === "points") return (b.points ?? 0) - (a.points ?? 0);
    if (userSort === "created_at") return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    if (userSort === "is_admin") return (b.is_admin ? 1 : 0) - (a.is_admin ? 1 : 0);
    return 0;
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

        <Tabs defaultValue="dashboard">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="dashboard">📊 Stats</TabsTrigger>
            <TabsTrigger value="notifications">🔔 Notifs</TabsTrigger>
            <TabsTrigger value="submissions">📍 À valider</TabsTrigger>
            <TabsTrigger value="reports">⚠️ Signalements</TabsTrigger>
            <TabsTrigger value="places">🗺️ Lieux</TabsTrigger>
            <TabsTrigger value="users">👥 Utilisateurs</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="space-y-6 mt-4">
            {dashboardLoading && <p className="text-muted-foreground text-center py-8">Chargement des statistiques…</p>}
            {!dashboardLoading && dashboardStats && (
              <>
                {/* KPIs principaux */}
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Vue d'ensemble</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      { value: dashboardStats.totalPlaces.toLocaleString("fr-FR"), label: "🗺️ Lieux total", sub: null, color: "text-primary", bg: "bg-primary/5 border-primary/20" },
                      { value: dashboardStats.verifiedPlaces.toLocaleString("fr-FR"), label: "✅ Lieux vérifiés", sub: `${dashboardStats.totalPlaces > 0 ? Math.round(dashboardStats.verifiedPlaces / dashboardStats.totalPlaces * 100) : 0}% du total`, color: "text-green-600", bg: "bg-green-500/5 border-green-500/20" },
                      { value: dashboardStats.totalUsers.toLocaleString("fr-FR"), label: "👥 Utilisateurs", sub: `+${dashboardStats.newUsersThisMonth} ce mois`, color: "text-blue-600", bg: "bg-blue-500/5 border-blue-500/20" },
                      { value: `+${dashboardStats.placesThisMonth}`, label: "📅 Lieux ce mois", sub: null, color: "text-amber-600", bg: "bg-amber-500/5 border-amber-500/20" },
                      { value: dashboardStats.avgRating?.toString() ?? "—", label: "⭐ Note moyenne", sub: null, color: "text-yellow-600", bg: "bg-yellow-500/5 border-yellow-500/20" },
                      { value: dashboardStats.flaggedPlaces.toString(), label: "⚠️ Lieux signalés", sub: null, color: "text-orange-600", bg: "bg-orange-500/5 border-orange-500/20" },
                    ].map((kpi, i) => (
                      <Card key={i} className={kpi.bg}>
                        <CardContent className="pt-4 pb-4">
                          <p className={`text-3xl font-extrabold ${kpi.color}`}>{kpi.value}</p>
                          <p className="text-xs text-muted-foreground mt-1">{kpi.label}</p>
                          {kpi.sub && <p className={`text-xs font-medium mt-0.5 ${kpi.color}`}>{kpi.sub}</p>}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Qualité des données */}
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Qualité des données</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: dashboardStats.placesWithPhoto, label: "📷 Avec photo", color: "bg-purple-500" },
                      { value: dashboardStats.placesWithHours, label: "🕐 Avec horaires", color: "bg-indigo-500" },
                    ].map((item, i) => {
                      const pct = dashboardStats.totalPlaces > 0 ? Math.round(item.value / dashboardStats.totalPlaces * 100) : 0;
                      return (
                        <Card key={i}>
                          <CardContent className="pt-4 pb-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-foreground">{item.label}</span>
                              <span className="text-sm font-bold text-foreground">{pct}%</span>
                            </div>
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                              <div className={`h-full rounded-full ${item.color}`} style={{ width: `${pct}%` }} />
                            </div>
                            <p className="text-xs text-muted-foreground">{item.value.toLocaleString("fr-FR")} lieux</p>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>

                {/* Activité 7j */}
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">⚡ Activité — 7 derniers jours</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <Card>
                      <CardContent className="pt-4 pb-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-lg shrink-0">📍</div>
                        <div>
                          <p className="text-2xl font-bold text-foreground">{dashboardStats.recentSubmissions}</p>
                          <p className="text-xs text-muted-foreground">Soumissions reçues</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4 pb-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-lg shrink-0">⚠️</div>
                        <div>
                          <p className="text-2xl font-bold text-foreground">{dashboardStats.recentReports}</p>
                          <p className="text-xs text-muted-foreground">Signalements reçus</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {/* Répartition catégories */}
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">🏷️ Répartition par catégorie</h3>
                  <Card>
                    <CardContent className="pt-4 pb-4 space-y-3">
                      {Object.entries(dashboardStats.byCategory).sort((a, b) => b[1] - a[1]).map(([cat, count]) => {
                        const categoryTotal = Object.values(dashboardStats.byCategory).reduce((a, b) => a + b, 0);
                        const pct = categoryTotal > 0 ? Math.round(count / categoryTotal * 100) : 0;
                        const catEmojis: Record<string, string> = { restaurant: "🍽️", hotel: "🛏️", outdoor: "🌿", services: "❤️", shop: "🐾", other: "📍" };
                        const catColors: Record<string, string> = { restaurant: "bg-orange-500", hotel: "bg-blue-500", outdoor: "bg-green-500", services: "bg-red-500", shop: "bg-purple-500", other: "bg-gray-400" };
                        return (
                          <div key={cat} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-foreground font-medium">{catEmojis[cat] || "📍"} {cat.charAt(0).toUpperCase() + cat.slice(1)}</span>
                              <span className="text-muted-foreground">{count.toLocaleString("fr-FR")} <span className="text-xs opacity-70">({pct}%)</span></span>
                            </div>
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                              <div className={`h-full rounded-full transition-all ${catColors[cat] || "bg-gray-400"}`} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                </div>

                {/* Sources */}
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">🔗 Sources des données</h3>
                  <Card>
                    <CardContent className="pt-4 pb-4 space-y-3">
                      {Object.entries(dashboardStats.bySource).sort((a, b) => b[1] - a[1]).map(([src, count]) => {
                        const sourceTotal = Object.values(dashboardStats.bySource).reduce((a, b) => a + b, 0);
                        const pct = sourceTotal > 0 ? Math.round(count / sourceTotal * 100) : 0;
                        const srcLabels: Record<string, string> = { csv_import: "📂 Import CSV", user_submission: "👤 Soumission utilisateur", openstreetmap: "🗺️ OpenStreetMap", unknown: "❓ Inconnu" };
                        return (
                          <div key={src} className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-foreground">{srcLabels[src] || `📄 ${src}`}</span>
                              <span className="text-muted-foreground">{count.toLocaleString("fr-FR")} ({pct}%)</span>
                            </div>
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                              <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                </div>

                {/* Top villes + Top contributeurs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">🏙️ Top 5 villes</h3>
                    <Card>
                      <CardContent className="pt-4 pb-4 space-y-2">
                        {dashboardStats.topCities.length === 0 ? (
                          <p className="text-xs text-muted-foreground">Aucune donnée</p>
                        ) : dashboardStats.topCities.map(({ city, count }, i) => (
                          <div key={city} className="flex items-center gap-2">
                            <span className="text-sm font-bold text-muted-foreground w-5">{i + 1}.</span>
                            <span className="text-sm text-foreground flex-1 truncate">{city}</span>
                            <Badge variant="secondary">{count.toLocaleString("fr-FR")}</Badge>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </div>
                  <div>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">🏆 Top contributeurs</h3>
                    <Card>
                      <CardContent className="pt-4 pb-4 space-y-2">
                        {dashboardStats.topUsers.length === 0 ? (
                          <p className="text-xs text-muted-foreground">Aucune donnée</p>
                        ) : dashboardStats.topUsers.map((u, i) => {
                          const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];
                          const initial = (u.display_name?.[0] || u.email?.[0] || "?").toUpperCase();
                          return (
                            <div key={i} className="flex items-center gap-2">
                              <span className="text-base w-5">{medals[i]}</span>
                              {u.avatar_url ? (
                                <img src={u.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover border border-border shrink-0" />
                              ) : (
                                <div className="w-7 h-7 rounded-full bg-primary/15 text-primary flex items-center justify-center text-xs font-bold shrink-0">{initial}</div>
                              )}
                              <span className="text-sm text-foreground flex-1 truncate">{u.display_name || u.email || "Anonyme"}</span>
                              <Badge variant="secondary">⭐ {u.points ?? 0}</Badge>
                            </div>
                          );
                        })}
                      </CardContent>
                    </Card>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button variant="outline" size="sm" onClick={fetchDashboardStats} className="gap-2 text-xs">
                    🔄 Actualiser les statistiques
                  </Button>
                </div>
              </>
            )}
          </TabsContent>

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
                  <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => { setApproveDialog({ open: true, sub }); fetchGoogleEnrichment(sub); }}>✅ Approuver</Button>
                  <Button size="sm" variant="outline" className="text-destructive border-destructive" onClick={() => setRejectDialog({ open: true, id: sub.id })}>❌ Rejeter</Button>
                </div>
              </CardContent></Card>
            ))}
          </TabsContent>

          <TabsContent value="reports" className="space-y-4 mt-4">
            {reports.length === 0 && <p className="text-muted-foreground text-center py-8">Aucun signalement en attente</p>}
            {reports.length > 0 && <ReportGroups reports={reports} onEdit={openEditFromReport} onUnpublish={unpublishFromReport} onReview={reviewGroup} onDismiss={dismissGroup} />}
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
                        {place.source === "openstreetmap" && (
                          <Badge variant="outline" className="bg-muted text-muted-foreground border-border text-[10px]">OSM</Badge>
                        )}
                        {place.source === "user_submission" && !place.verified && (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 text-[10px]">Soumis</Badge>
                        )}
                        {place.source === "user_submission" && place.verified && (
                          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 text-[10px]">✅ Validé</Badge>
                        )}
                        {place.source && place.source !== "openstreetmap" && place.source !== "user_submission" && (
                          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{place.source}</span>
                        )}
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

          <TabsContent value="users" className="space-y-3 mt-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par nom, email, ville…"
                  value={usersSearch}
                  onChange={(e) => setUsersSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <select
                value={userSort}
                onChange={(e) => setUserSort(e.target.value as any)}
                className="h-10 px-3 rounded-md border border-input bg-background text-sm text-foreground"
              >
                <option value="points">⭐ Trier par points</option>
                <option value="created_at">📅 Trier par inscription</option>
                <option value="is_admin">👑 Admins en premier</option>
              </select>
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>{filteredUsers.length} utilisateur{filteredUsers.length > 1 ? "s" : ""}</span>
              <span>•</span>
              <span className="text-orange-500">{users.filter(u => u.is_banned).length} suspendu{users.filter(u => u.is_banned).length > 1 ? "s" : ""}</span>
              <span>•</span>
              <span className="text-primary">{users.filter(u => u.is_admin).length} admin{users.filter(u => u.is_admin).length > 1 ? "s" : ""}</span>
            </div>

            {sortedUsers.length === 0 && (
              <p className="text-muted-foreground text-center py-8">Aucun utilisateur trouvé</p>
            )}

            {sortedUsers.map(u => {
              const initial = (u.display_name?.[0] || u.email?.[0] || "?").toUpperCase();
              return (
                <Card key={u.id} className={u.is_banned ? "border-destructive/40 bg-destructive/5" : ""}>
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <div className="relative shrink-0">
                        {u.avatar_url ? (
                          <img src={u.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover border border-border" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-sm">
                            {initial}
                          </div>
                        )}
                        {u.is_banned && (
                          <span className="absolute -bottom-1 -right-1 text-xs">🚫</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-foreground truncate">{u.display_name || "Sans nom"}</p>
                          {u.is_admin && <Badge className="bg-primary/15 text-primary border-primary/30 text-[10px]">👑 Admin</Badge>}
                          {u.is_banned && <Badge variant="destructive" className="text-[10px]">🚫 Suspendu</Badge>}
                          <Badge variant="outline" className="text-[10px]">⭐ {u.points ?? 0}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{u.email || "—"}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          {u.city && <p className="text-xs text-muted-foreground">📍 {u.city}</p>}
                          {u.created_at && <p className="text-xs text-muted-foreground">📅 {new Date(u.created_at).toLocaleDateString("fr-FR")}</p>}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-1.5 mt-3 flex-wrap">
                      <Button
                        size="sm" variant="outline" className="h-7 gap-1 text-xs"
                        onClick={() => { openUserEdit(u); }}
                      >
                        <Pencil className="w-3 h-3" /> Modifier
                      </Button>
                      <Button
                        size="sm" variant="outline" className="h-7 gap-1 text-xs"
                        onClick={() => {
                          setUserDetailDialog({ open: true, userId: u.id, userName: u.display_name || u.email || "Utilisateur" });
                          fetchUserDetail(u.id);
                        }}
                      >
                        📊 Contributions
                      </Button>
                      <Button
                        size="sm" variant="outline"
                        className={`h-7 gap-1 text-xs ${u.is_banned ? "text-green-600 border-green-500 hover:bg-green-50" : "text-orange-600 border-orange-400 hover:bg-orange-50"}`}
                        onClick={() => toggleSuspendUser(u.id, u.is_banned)}
                      >
                        {u.is_banned ? "✅ Réactiver" : "🚫 Suspendre"}
                      </Button>
                      {u.email && (
                        <Button
                          size="sm" variant="outline" className="h-7 gap-1 text-xs text-blue-600 border-blue-400 hover:bg-blue-50"
                          onClick={() => resetUserPassword(u.email!)}
                        >
                          🔑 Reset MDP
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={approveDialog.open} onOpenChange={(v) => { if (!v) { setApproveDialog({ open: false, sub: null }); setApproveNote(""); setEnrichedData(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>✅ Approuver ce lieu</DialogTitle></DialogHeader>

          {enriching && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary border border-border text-sm text-muted-foreground">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
              Recherche des données Google en cours…
            </div>
          )}

          {!enriching && enrichedData && (
            <div className="rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-300 dark:border-green-800 p-3 space-y-2">
              <p className="text-xs font-bold text-green-700 dark:text-green-400">✅ Données Google trouvées — fusionnées automatiquement</p>
              <div className="flex gap-3">
                {enrichedData.photo_url && (
                  <img src={enrichedData.photo_url} alt="" className="w-16 h-16 rounded-lg object-cover border border-border shrink-0" />
                )}
                <div className="space-y-1 text-xs text-muted-foreground min-w-0">
                  {enrichedData.rating && <p>⭐ Note : {enrichedData.rating}/5</p>}
                  {enrichedData.phone && <p>📞 {enrichedData.phone}</p>}
                  {enrichedData.website && <p className="truncate">🌐 {enrichedData.website}</p>}
                  {enrichedData.opening_hours && <p>🕐 {enrichedData.opening_hours}</p>}
                </div>
              </div>
            </div>
          )}

          {!enriching && !enrichedData && (
            <div className="p-3 rounded-lg bg-secondary border border-border text-xs text-muted-foreground">
              ℹ️ Aucune donnée Google trouvée — le lieu sera publié avec les informations soumises uniquement
            </div>
          )}

          <p className="text-sm text-muted-foreground">Message de remerciement (optionnel)</p>
          <Textarea placeholder="Ex: Merci pour cette super contribution !" value={approveNote} onChange={(e) => setApproveNote(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setApproveDialog({ open: false, sub: null }); setApproveNote(""); setEnrichedData(null); }}>Annuler</Button>
            <Button className="bg-green-600 hover:bg-green-700 text-white" disabled={enriching} onClick={() => { if (approveDialog.sub) approveSubmission(approveDialog.sub, approveNote); setApproveDialog({ open: false, sub: null }); setApproveNote(""); }}>
              {enriching ? "Enrichissement…" : "Approuver & Publier"}
            </Button>
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

      <Dialog open={userEditDialog.open} onOpenChange={(v) => { if (!v) setUserEditDialog({ open: false, user: null }); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>✏️ Modifier le profil</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-foreground">Email</label>
              <Input value={userEditDialog.user?.email || ""} disabled className="bg-muted" />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Nom affiché</label>
              <Input
                value={userEditForm.display_name}
                onChange={(e) => setUserEditForm(f => ({ ...f, display_name: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Ville</label>
              <Input
                value={userEditForm.city}
                onChange={(e) => setUserEditForm(f => ({ ...f, city: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Points ⭐</label>
              <Input
                type="number"
                value={userEditForm.points}
                onChange={(e) => setUserEditForm(f => ({ ...f, points: Number(e.target.value) || 0 }))}
              />
            </div>
            <div className="flex items-center justify-between pt-1">
              <label className="text-sm text-foreground">👑 Administrateur</label>
              <Switch
                checked={userEditForm.is_admin}
                onCheckedChange={(v) => setUserEditForm(f => ({ ...f, is_admin: v }))}
              />
            </div>
            <div className="flex items-center justify-between pt-1">
              <label className="text-sm text-foreground">🚫 Compte suspendu</label>
              <Switch
                checked={userEditForm.is_banned}
                onCheckedChange={(v) => setUserEditForm(f => ({ ...f, is_banned: v }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserEditDialog({ open: false, user: null })}>Annuler</Button>
            <Button onClick={saveUserEdit}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={userDetailDialog.open} onOpenChange={(v) => { if (!v) { setUserDetailDialog({ open: false, userId: null, userName: "" }); setUserDetail(null); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>📊 Contributions — {userDetailDialog.userName}</DialogTitle>
          </DialogHeader>
          {userDetailLoading && <p className="text-muted-foreground text-center py-6">Chargement…</p>}
          {!userDetailLoading && userDetail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: userDetail.totalSubmissions, label: "Total soumis", color: "text-foreground", bg: "bg-muted" },
                  { value: userDetail.approvedSubmissions, label: "✅ Approuvés", color: "text-green-600", bg: "bg-green-500/10" },
                  { value: userDetail.rejectedSubmissions, label: "❌ Rejetés", color: "text-destructive", bg: "bg-destructive/10" },
                  { value: userDetail.pendingSubmissions, label: "⏳ En attente", color: "text-amber-600", bg: "bg-amber-500/10" },
                ].map((stat, i) => (
                  <div key={i} className={`rounded-lg p-3 ${stat.bg} text-center`}>
                    <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
                  </div>
                ))}
              </div>
              {userDetail.recentSubmissions.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Dernières soumissions</p>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {userDetail.recentSubmissions.map(s => (
                      <div key={s.id} className="flex items-center justify-between gap-2 text-xs p-2 rounded bg-muted/50">
                        <span className="truncate text-foreground font-medium">{s.name}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge variant={s.status === "approved" ? "default" : s.status === "rejected" ? "destructive" : "secondary"} className="text-[10px] px-1.5 py-0">
                            {s.status === "approved" ? "✅" : s.status === "rejected" ? "❌" : "⏳"}
                          </Badge>
                          <span className="text-muted-foreground">{new Date(s.created_at).toLocaleDateString("fr-FR")}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {userDetail.totalSubmissions === 0 && (
                <p className="text-center text-muted-foreground text-sm py-2">Aucune soumission pour cet utilisateur</p>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setUserDetailDialog({ open: false, userId: null, userName: "" }); setUserDetail(null); }}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div ref={placesServiceDivRef} style={{ display: "none" }} />
    </div>
  );
};

export default AdminPage;
