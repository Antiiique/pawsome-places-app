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
  source_id: string | null;
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

interface AdminPet {
  id: string;
  user_id: string;
  name: string;
  species: string;
  breed: string | null;
  birth_date: string | null;
  sex: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  owner_name?: string | null;
  owner_avatar?: string | null;
  photo_count?: number;
}

interface AdminPetPhoto {
  id: string;
  pet_id: string;
  url: string;
  caption: string | null;
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

function ReportGroups({ reports, onEdit, onReview, onDismiss, onDelete, onDeletePlace }: {
  reports: Report[];
  onEdit: (placeId: string) => void;
  onReview: (placeId: string | null, ids: string[]) => void;
  onDismiss: (placeId: string | null, ids: string[]) => void;
  onDelete: (ids: string[]) => void;
  onDeletePlace: (placeId: string, placeName: string, reportIds: string[]) => void;
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
              <div className="flex flex-wrap gap-2">
                {hasPlace && (
                  <Button size="sm" variant="outline" className="text-xs h-9" onClick={() => onEdit(group.place_id!)}>
                    ✏️ Corriger
                  </Button>
                )}
                <Button size="sm" className="text-xs h-9 bg-green-600 hover:bg-green-700 text-white" onClick={() => onReview(group.place_id, ids)}>
                  ✅ Traité
                </Button>
                <Button size="sm" variant="outline" className="text-xs h-9" onClick={() => onDismiss(group.place_id, ids)}>
                  🚫 Infondé
                </Button>
                <Button size="sm" variant="outline" className="text-xs h-9 border-destructive/40 text-destructive hover:bg-destructive/10" onClick={() => onDelete(ids)}>
                  🗑 Signalements
                </Button>
                {hasPlace && (
                  <Button size="sm" className="text-xs h-9 bg-destructive hover:bg-destructive/90 text-white" onClick={() => onDeletePlace(group.place_id!, group.place_name || "Lieu inconnu", ids)}>
                    🗑️ Supprimer le lieu
                  </Button>
                )}
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
  const [placesTotalCount, setPlacesTotalCount] = useState(0);
  const [userPlaces, setUserPlaces] = useState<PublishedPlace[]>([]);
  const [userPlacesLoading, setUserPlacesLoading] = useState(false);
  const [userPlacesPage, setUserPlacesPage] = useState(0);
  const [userPlacesTotalCount, setUserPlacesTotalCount] = useState(0);
  const [userPlacesSearch, setUserPlacesSearch] = useState("");
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; place: PublishedPlace | null }>({ open: false, place: null });
  const [deleteFromReportDialog, setDeleteFromReportDialog] = useState<{ open: boolean; placeId: string; placeName: string; reportIds: string[] }>({ open: false, placeId: "", placeName: "", reportIds: [] });
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
  const [placesFilter, setPlacesFilter] = useState({ flagged: false, unverified: false, noPhoto: false, noPhone: false, noWebsite: false, noHours: false, source: "", country: "", category: "" });
  const [selectedPlaces, setSelectedPlaces] = useState<Set<string>>(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [banDialog, setBanDialog] = useState<{ open: boolean; userId: string | null; name: string }>({ open: false, userId: null, name: "" });
  const [banReason, setBanReason] = useState("");
  const [banDuration, setBanDuration] = useState("permanent");

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

  const [completenessData, setCompletenessData] = useState<Array<{ id: string; name: string; city: string | null; category: string; score: number; missing: string[] }>>([]);
  const [completenessLoading, setCompletenessLoading] = useState(false);
  const [completenessThreshold, setCompletenessThreshold] = useState(80);

  const [duplicates, setDuplicates] = useState<Array<{ aId: string; aName: string; aCity: string | null; bId: string; bName: string; distM: number }>>([]);
  const [duplicatesLoading, setDuplicatesLoading] = useState(false);

  const [coverageData, setCoverageData] = useState<Array<{ dept: string; count: number }>>([]);
  const [coverageLoading, setCoverageLoading] = useState(false);

  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<Record<string, string>[]>([]);
  const [csvImporting, setCsvImporting] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const [exportCategory, setExportCategory] = useState("");
  const [exportCountry, setExportCountry] = useState("");
  const [exportOnlyVerified, setExportOnlyVerified] = useState(false);

  const [globalSearch, setGlobalSearch] = useState("");
  const [globalResults, setGlobalResults] = useState<{
    places: Array<{ id: string; name: string; city: string | null; category: string }>;
    users: Array<{ id: string; display_name: string | null; email: string | null }>;
    submissions: Array<{ id: string; name: string; city: string | null }>;
  } | null>(null);
  const [globalSearching, setGlobalSearching] = useState(false);
  const globalSearchRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState("dashboard");
  const [submissionCursor, setSubmissionCursor] = useState(0);

  const [savedFilters, setSavedFilters] = useState<Array<{ name: string; filter: typeof placesFilter }>>(() => {
    try { return JSON.parse(localStorage.getItem("admin_saved_filters") || "[]"); } catch { return []; }
  });
  const [saveFilterName, setSaveFilterName] = useState("");

  const [adminReviews, setAdminReviews] = useState<any[]>([]);
  const [adminReviewsLoading, setAdminReviewsLoading] = useState(false);
  const [reviewsFilter, setReviewsFilter] = useState<"all" | "reported" | "hidden">("all");
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const [editRating, setEditRating] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [processedSubmissions, setProcessedSubmissions] = useState<any[]>([]);
  const [processedReports, setProcessedReports] = useState<any[]>([]);
  const [dismissedReports, setDismissedReports] = useState<any[]>([]);
  const [showProcessedSubs, setShowProcessedSubs] = useState(false);
  const [showProcessedReports, setShowProcessedReports] = useState(false);
  const [showDismissedReports, setShowDismissedReports] = useState(false);

  // Animaux
  const [adminPets, setAdminPets] = useState<AdminPet[]>([]);
  const [adminPetsLoading, setAdminPetsLoading] = useState(false);
  const [petSearchQuery, setPetSearchQuery] = useState("");
  const [petSpeciesFilter, setPetSpeciesFilter] = useState("all");
  const [albumDialogPet, setAlbumDialogPet] = useState<AdminPet | null>(null);
  const [albumDialogPhotos, setAlbumDialogPhotos] = useState<AdminPetPhoto[]>([]);
  const [albumDialogLoading, setAlbumDialogLoading] = useState(false);

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

  const placesQueryRef = useRef({ page: 0, filter: { flagged: false, unverified: false, noPhoto: false, noPhone: false, noWebsite: false, noHours: false, source: "", country: "", category: "" }, search: "" });

  const fetchPlaces = useCallback(async () => {
    const { page, filter, search } = placesQueryRef.current;
    setPlacesLoading(true);
    const COLS = "id, name, category, subcategory, address, city, country, latitude, longitude, phone, website, opening_hours, description, accepts_dogs, accepts_cats, dogs_on_leash_only, outdoor_seating, water_bowl_provided, rating, photo_url, verified, is_flagged, report_count, source, source_id, last_updated, google_place_id, created_at";
    let q = supabase.from("pet_friendly_places").select(COLS, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(page * PLACES_PER_PAGE, (page + 1) * PLACES_PER_PAGE - 1);
    if (search) q = q.or(`name.ilike.%${search}%,city.ilike.%${search}%,category.ilike.%${search}%,address.ilike.%${search}%`);
    if (filter.flagged) q = q.eq("is_flagged", true);
    if (filter.unverified) q = q.eq("verified", false);
    if (filter.noPhoto) q = q.is("photo_url", null);
    if (filter.noPhone) q = q.is("phone", null);
    if (filter.noWebsite) q = q.is("website", null);
    if (filter.noHours) q = q.is("opening_hours", null);
    if (filter.source) q = q.eq("source", filter.source);
    if (filter.country) q = q.eq("country", filter.country);
    if (filter.category) q = q.eq("category", filter.category);
    const { data, count } = await q;
    if (data) setPlaces(data as PublishedPlace[]);
    setPlacesTotalCount(count ?? 0);
    setPlacesLoading(false);
  }, []);

  const fetchUserPlaces = useCallback(async () => {
    setUserPlacesLoading(true);
    const { page, search } = { page: userPlacesPage, search: userPlacesSearch };
    const COLS = "id, name, category, subcategory, address, city, country, latitude, longitude, phone, website, opening_hours, description, accepts_dogs, accepts_cats, dogs_on_leash_only, outdoor_seating, water_bowl_provided, rating, photo_url, verified, is_flagged, report_count, source, source_id, last_updated, google_place_id, created_at";
    let q = supabase.from("pet_friendly_places").select(COLS, { count: "exact" })
      .eq("source", "user_submission")
      .order("created_at", { ascending: false })
      .range(page * PLACES_PER_PAGE, (page + 1) * PLACES_PER_PAGE - 1);
    if (search) q = q.or(`name.ilike.%${search}%,city.ilike.%${search}%,category.ilike.%${search}%`);
    const { data, count } = await q;
    if (data) setUserPlaces(data as PublishedPlace[]);
    setUserPlacesTotalCount(count ?? 0);
    setUserPlacesLoading(false);
  }, [userPlacesPage, userPlacesSearch]);

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
      redirectTo: `${window.location.origin}/reset-password`,
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

  const fetchAdminPets = useCallback(async () => {
    setAdminPetsLoading(true);
    const { data: pets } = await supabase.from("pets" as any).select("*, pet_photos(id, url)").order("created_at", { ascending: false });
    if (!pets) { setAdminPetsLoading(false); return; }
    const userIds = [...new Set((pets as any[]).map((p: any) => p.user_id))];
    const { data: profiles } = userIds.length
      ? await supabase.from("profiles").select("id, display_name, avatar_url").in("id", userIds)
      : { data: [] };
    const profileMap = Object.fromEntries((profiles || []).map((p: any) => [p.id, p]));
    setAdminPets((pets as any[]).map((pet: any) => ({
      ...pet,
      owner_name: profileMap[pet.user_id]?.display_name ?? null,
      owner_avatar: profileMap[pet.user_id]?.avatar_url ?? null,
      photo_count: pet.pet_photos?.length ?? 0,
    })));
    setAdminPetsLoading(false);
  }, []);

  useEffect(() => {
    fetchCounts();
    fetchNotifications();
    fetchSubmissions();
    fetchReports();
    fetchUsers();
    fetchDashboardStats();
    fetchAdminReviews();
    fetchAdminPets();
    const interval = setInterval(fetchCounts, 30000);
    return () => clearInterval(interval);
  }, [fetchCounts, fetchNotifications, fetchSubmissions, fetchReports, fetchUsers, fetchDashboardStats, fetchAdminPets]);

  // Re-fetch places whenever page, filter or search changes
  useEffect(() => {
    placesQueryRef.current = { page: placesPage, filter: placesFilter, search: placesSearch };
    fetchPlaces();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placesPage, placesFilter, placesSearch]);

  // Re-fetch user places whenever page or search changes
  useEffect(() => {
    fetchUserPlaces();
  }, [fetchUserPlaces]);

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
      verified: true, source: "user_submission", source_id: sub.id,
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

    // Notification envoyée automatiquement par le trigger DB on_submission_review

    toast.success(`✅ "${sub.name}" approuvé et publié sur la carte !`);
    setSubmissions(prev => prev.filter(s => s.id !== sub.id));
    setEnrichedData(null);
    fetchCounts();
    fetchPlaces();
  };

  const rejectSubmission = async () => {
    if (!rejectDialog.id) return;
    const { error } = await supabase.from("place_submissions").update({
      status: "rejected",
      admin_note: rejectNote || null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: user?.id,
    }).eq("id", rejectDialog.id);
    if (error) { toast.error("Erreur lors du rejet"); return; }
    const { data: linkedPlace } = await supabase
      .from("pet_friendly_places")
      .select("id")
      .eq("source_id", rejectDialog.id)
      .maybeSingle();
    if (linkedPlace) {
      await supabase.from("pet_friendly_places").delete().eq("id", linkedPlace.id);
    }
    toast.success("Soumission rejetée — notification envoyée à l'utilisateur");
    setRejectDialog({ open: false, id: null });
    setRejectNote("");
    await fetchSubmissions();
    fetchCounts();
  };

  const deleteSubmission = async (id: string) => {
    const { error } = await supabase.from("place_submissions").delete().eq("id", id);
    if (error) { toast.error("Erreur lors de la suppression"); return; }
    const { data: linkedPlace } = await supabase
      .from("pet_friendly_places")
      .select("id")
      .eq("source_id", id)
      .maybeSingle();
    if (linkedPlace) {
      await supabase.from("pet_friendly_places").delete().eq("id", linkedPlace.id);
    }
    toast.success("Soumission supprimée définitivement");
    await fetchSubmissions();
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
      const { data } = await supabase.from("pet_friendly_places").select("id, name, category, subcategory, address, city, country, latitude, longitude, phone, website, opening_hours, description, accepts_dogs, accepts_cats, dogs_on_leash_only, outdoor_seating, water_bowl_provided, rating, photo_url, verified, is_flagged, report_count, source, source_id, last_updated, google_place_id, created_at").eq("id", placeId).maybeSingle();
      if (data) found = data as PublishedPlace;
    }
    if (found) openEdit(found);
    else toast.error("Lieu introuvable");
  };

  const reviewGroup = async (placeId: string | null, reportIds: string[]) => {
    const { error } = await supabase.from("place_reports")
      .update({ status: "reviewed", reviewed_at: new Date().toISOString(), reviewed_by: user?.id })
      .in("id", reportIds);
    if (error) { toast.error("Erreur lors du traitement"); return; }
    if (placeId) await supabase.from("pet_friendly_places").update({ is_flagged: true }).eq("id", placeId);
    toast.success("✅ Signalement(s) traité(s) — notification envoyée");
    setReports(prev => prev.filter(r => !reportIds.includes(r.id)));
    fetchCounts();
  };

  const dismissGroup = async (placeId: string | null, reportIds: string[]) => {
    const { error } = await supabase.from("place_reports")
      .update({ status: "dismissed", reviewed_at: new Date().toISOString(), reviewed_by: user?.id })
      .in("id", reportIds);
    if (error) { toast.error("Erreur lors du rejet"); return; }
    if (placeId) await supabase.from("pet_friendly_places").update({ report_count: 0, is_flagged: false }).eq("id", placeId);
    toast.success("🚫 Signalement(s) marqué(s) infondé(s) — notification envoyée");
    setReports(prev => prev.filter(r => !reportIds.includes(r.id)));
    fetchCounts();
  };

  const deleteReportGroup = async (reportIds: string[]) => {
    const { error } = await supabase.from("place_reports").delete().in("id", reportIds);
    if (error) { toast.error("Erreur lors de la suppression"); return; }
    toast.success("🗑 Signalement(s) supprimé(s) définitivement");
    setReports(prev => prev.filter(r => !reportIds.includes(r.id)));
    fetchCounts();
  };

  const deletePlaceFromReport = async () => {
    const { placeId, placeName, reportIds } = deleteFromReportDialog;
    if (!placeId) return;
    const { error } = await supabase.from("pet_friendly_places").delete().eq("id", placeId);
    if (error) { toast.error("Erreur suppression : " + error.message); return; }
    await supabase.from("place_reports")
      .update({ status: "reviewed", reviewed_at: new Date().toISOString(), reviewed_by: user?.id })
      .in("id", reportIds);
    toast.success(`🗑️ "${placeName}" supprimé définitivement de la base`);
    setDeleteFromReportDialog({ open: false, placeId: "", placeName: "", reportIds: [] });
    setReports(prev => prev.filter(r => !reportIds.includes(r.id)));
    setPlaces(prev => prev.filter(p => p.id !== placeId));
    fetchCounts();
  };

  const fetchProcessedSubmissions = async () => {
    const { data } = await supabase
      .from("place_submissions")
      .select("id, name, city, status, admin_note, created_at, reviewed_at, submitted_by")
      .in("status", ["approved", "rejected"])
      .order("reviewed_at", { ascending: false })
      .limit(100);
    setProcessedSubmissions(data || []);
  };

  const fetchProcessedReports = async () => {
    const { data } = await supabase.from("place_reports")
      .select("*, pet_friendly_places(name)")
      .eq("status", "reviewed")
      .order("reviewed_at", { ascending: false })
      .limit(100);
    setProcessedReports(data || []);
  };

  const fetchDismissedReports = async () => {
    const { data } = await supabase.from("place_reports")
      .select("*, pet_friendly_places(name)")
      .eq("status", "dismissed")
      .order("reviewed_at", { ascending: false })
      .limit(100);
    setDismissedReports(data || []);
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
        if (sub.submitted_by) {
          await supabase.from("user_notifications").insert({
            user_id: sub.submitted_by,
            type: "submission_approved",
            title: "🎉 Votre lieu a été publié !",
            message: `"${sub.name}" a été validé et est maintenant visible sur la carte.`,
            related_id: newPlace.id,
          });
        }
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
      const bulkSub = submissions.find(s => s.id === id);
      await supabase.from("place_submissions").update({
        status: "rejected", admin_note: bulkRejectNote || null,
        reviewed_at: new Date().toISOString(), reviewed_by: user?.id,
      }).eq("id", id);
      if (bulkSub?.submitted_by) {
        await supabase.from("user_notifications").insert({
          user_id: bulkSub.submitted_by,
          type: "submission_rejected",
          title: "📋 Résultat de votre soumission",
          message: `Votre proposition "${bulkSub.name}" n'a pas pu être publiée.${bulkRejectNote ? ` Motif : "${bulkRejectNote}"` : ""}`,
          related_id: id,
        });
      }
    }
    toast.success(`${selectedSubmissions.size} soumission(s) rejetée(s)`);
    setSubmissions(prev => prev.filter(s => !selectedSubmissions.has(s.id)));
    setSelectedSubmissions(new Set());
    setBulkRejectDialog(false);
    setBulkRejectNote("");
    fetchCounts();
  };

  const quickVerify = async (placeId: string) => {
    await supabase.from("pet_friendly_places").update({ verified: true }).eq("id", placeId);
    setPlaces(prev => prev.map(p => p.id === placeId ? { ...p, verified: true } : p));
    toast.success("Lieu vérifié ✅");
  };

  const bulkVerify = async () => {
    if (selectedPlaces.size === 0) return;
    setBulkActionLoading(true);
    const ids = [...selectedPlaces];
    await supabase.from("pet_friendly_places").update({ verified: true }).in("id", ids);
    setPlaces(prev => prev.map(p => ids.includes(p.id) ? { ...p, verified: true } : p));
    setSelectedPlaces(new Set());
    setBulkActionLoading(false);
    toast.success(`✅ ${ids.length} lieux vérifiés`);
  };

  const bulkDelete = async () => {
    if (selectedPlaces.size === 0) return;
    if (!confirm(`Supprimer définitivement ${selectedPlaces.size} lieu(x) ?`)) return;
    setBulkActionLoading(true);
    const ids = [...selectedPlaces];
    await supabase.from("pet_friendly_places").delete().in("id", ids);
    setPlaces(prev => prev.filter(p => !ids.includes(p.id)));
    setSelectedPlaces(new Set());
    setBulkActionLoading(false);
    toast.success(`🗑️ ${ids.length} lieux supprimés`);
  };

  const exportCSV = () => {
    const headers = ["Nom","Catégorie","Ville","Pays","Adresse","Téléphone","Site web","Horaires","Note","Chiens","Chats","Vérifié","Source","Lat","Lng"];
    const rows = filteredPlaces.map(p => [
      p.name, p.category, p.city||"", p.country||"", p.address||"",
      p.phone||"", p.website||"", p.opening_hours||"", p.rating||"",
      p.accepts_dogs?"Oui":"Non", p.accepts_cats?"Oui":"Non",
      p.verified?"Oui":"Non", p.source||"", p.latitude, p.longitude
    ].map(v => `"${String(v).replace(/"/g,'""')}"`).join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob(["\uFEFF"+csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `lieux-wpf-${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast.success(`✅ ${filteredPlaces.length} lieux exportés`);
  };

  const banUser = async () => {
    if (!banDialog.userId) return;
    await supabase.from("profiles").update({ is_banned: true }).eq("id", banDialog.userId);
    toast.success(`🔒 ${banDialog.name} suspendu`);
    setBanDialog({ open: false, userId: null, name: "" });
    setBanReason(""); setBanDuration("permanent");
    fetchUsers();
  };

  const unbanUser = async (userId: string) => {
    await supabase.from("profiles").update({ is_banned: false }).eq("id", userId);
    toast.success("✅ Compte réactivé");
    fetchUsers();
  };

  const deletePlace = async (place: PublishedPlace) => {
    const { error, count } = await supabase
      .from("pet_friendly_places")
      .delete({ count: "exact" })
      .eq("id", place.id);
    if (error) { toast.error("Erreur suppression : " + error.message); return; }
    if (!count || count === 0) {
      toast.error("⛔ Suppression bloquée — droits insuffisants ou lieu introuvable.");
      return;
    }
    toast.success(`🗑️ "${place.name}" supprimé définitivement`);
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
    if (editDialog.place?.source === "user_submission" && editDialog.place?.source_id) {
      const { data: origSub } = await supabase.from("place_submissions").select("submitted_by").eq("id", editDialog.place.source_id).maybeSingle();
      if (origSub?.submitted_by) {
        await supabase.from("user_notifications").insert({
          user_id: origSub.submitted_by,
          type: "place_updated",
          title: "✏️ Votre lieu a été mis à jour",
          message: `Notre équipe a modifié les informations de "${editForm.name || editDialog.place.name}". Consultez la fiche pour voir les changements.`,
          related_id: editDialog.place.id,
        });
      }
    }
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
  }).sort((a, b) => {
    const score = (s: Submission) => (s.photos?.length ? 10 : 0) + (s.accepts_dogs ? 1 : 0) + (s.accepts_cats ? 1 : 0) + (s.outdoor_seating ? 1 : 0);
    if (score(b) !== score(a)) return score(b) - score(a);
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  // Filters are now server-side — places already contains the current page results
  const filteredPlaces = places;
  const uniqueSources: string[] = [];
  const uniqueCountries: string[] = [];
  const uniquePlaceCategories: string[] = [];

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
  const totalPages = Math.ceil(placesTotalCount / PLACES_PER_PAGE);
  const paginatedPlaces = places; // server-side paginated — already the right page
  const userPlacesTotalPages = Math.ceil(userPlacesTotalCount / PLACES_PER_PAGE);

  const computeCompleteness = async () => {
    setCompletenessLoading(true);
    const { data } = await supabase
      .from("pet_friendly_places")
      .select("id, name, city, category, address, phone, website, opening_hours, description, photo_url, accepts_dogs, accepts_cats, outdoor_seating")
      .eq("verified", true)
      .limit(10000);
    if (data) {
      const scored = data.map(p => {
        const checks = [
          { label: "Adresse", ok: !!p.address },
          { label: "Ville", ok: !!p.city },
          { label: "Téléphone", ok: !!p.phone },
          { label: "Site web", ok: !!p.website },
          { label: "Horaires", ok: !!p.opening_hours },
          { label: "Description", ok: !!p.description },
          { label: "Photo", ok: !!p.photo_url },
          { label: "Chiens/chats", ok: !!(p.accepts_dogs || p.accepts_cats) },
          { label: "Terrasse", ok: p.outdoor_seating !== null },
        ];
        const score = Math.round(checks.filter(c => c.ok).length / checks.length * 100);
        const missing = checks.filter(c => !c.ok).map(c => c.label);
        return { id: p.id, name: p.name, city: p.city, category: p.category, score, missing };
      });
      setCompletenessData(scored.sort((a, b) => a.score - b.score));
    }
    setCompletenessLoading(false);
  };

  const detectDuplicates = async () => {
    setDuplicatesLoading(true);
    const { data } = await supabase
      .from("pet_friendly_places")
      .select("id, name, city, latitude, longitude")
      .eq("verified", true)
      .limit(5000);
    if (data) {
      const found: Array<{ aId: string; aName: string; aCity: string | null; bId: string; bName: string; distM: number }> = [];
      for (let i = 0; i < data.length; i++) {
        for (let j = i + 1; j < data.length; j++) {
          const d = haversineKm(data[i].latitude, data[i].longitude, data[j].latitude, data[j].longitude) * 1000;
          if (d < 100) {
            const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
            const na = norm(data[i].name), nb = norm(data[j].name);
            if (na === nb || na.includes(nb) || nb.includes(na))
              found.push({ aId: data[i].id, aName: data[i].name, aCity: data[i].city, bId: data[j].id, bName: data[j].name, distM: Math.round(d) });
          }
        }
      }
      setDuplicates(found);
    }
    setDuplicatesLoading(false);
  };

  const deleteById = async (id: string) => {
    await supabase.from("pet_friendly_places").delete().eq("id", id);
    setDuplicates(prev => prev.filter(d => d.aId !== id && d.bId !== id));
    toast.success("Lieu supprimé");
  };

  const fetchCoverage = async () => {
    setCoverageLoading(true);
    const { data } = await supabase
      .from("pet_friendly_places")
      .select("department, region")
      .eq("verified", true);
    if (data) {
      const byDept: Record<string, number> = {};
      for (const p of data) {
        const key = p.department || p.region || "Inconnu";
        byDept[key] = (byDept[key] || 0) + 1;
      }
      setCoverageData(Object.entries(byDept).map(([dept, count]) => ({ dept, count })).sort((a, b) => b.count - a.count));
    }
    setCoverageLoading(false);
  };

  const parseCsvText = (text: string): Record<string, string>[] => {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return [];
    const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
    return lines.slice(1).map(line => {
      const values = line.split(",").map(v => v.trim().replace(/^"|"$/g, ""));
      return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""]));
    });
  };

  const handleCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);
    const reader = new FileReader();
    reader.onload = ev => setCsvPreview(parseCsvText(ev.target?.result as string).slice(0, 5));
    reader.readAsText(file, "utf-8");
  };

  const importCsv = async () => {
    if (!csvFile) return;
    setCsvImporting(true);
    const reader = new FileReader();
    reader.onload = async ev => {
      const rows = parseCsvText(ev.target?.result as string);
      const toInsert = rows.map(r => ({
        name: r.name || r.Name || "",
        category: r.category || "other",
        latitude: parseFloat(r.latitude || r.lat || "0"),
        longitude: parseFloat(r.longitude || r.lon || r.lng || "0"),
        city: r.city || r.ville || null,
        address: r.address || r.adresse || null,
        country: r.country || r.pays || "France",
        source: "csv_import",
        verified: false,
        accepts_dogs: true,
      })).filter(r => r.name && r.latitude !== 0 && r.longitude !== 0);
      if (!toInsert.length) { toast.error("Aucune ligne valide (name + latitude + longitude requis)"); setCsvImporting(false); return; }
      const { error } = await supabase.from("pet_friendly_places").insert(toInsert);
      if (error) toast.error("Erreur import : " + error.message);
      else toast.success(`✅ ${toInsert.length} lieux importés (statut : non-vérifiés)`);
      setCsvImporting(false); setCsvFile(null); setCsvPreview([]);
      if (csvInputRef.current) csvInputRef.current.value = "";
    };
    reader.readAsText(csvFile, "utf-8");
  };

  const handleExport = async () => {
    const filters: Record<string, string | boolean> = {};
    if (exportCategory) filters.category = exportCategory;
    if (exportCountry) filters.country = exportCountry;
    if (exportOnlyVerified) filters.verified = true;
    let q: any = supabase.from("pet_friendly_places")
      .select("name,category,subcategory,address,city,postcode,country,latitude,longitude,phone,website,opening_hours,accepts_dogs,accepts_cats,outdoor_seating,verified,source,description");
    for (const [k, v] of Object.entries(filters)) q = q.eq(k, v);
    const { data, error } = await q.limit(50000);
    if (error || !data?.length) { toast.error("Aucune donnée à exporter"); return; }
    const headers = Object.keys(data[0]);
    const csv = [headers.join(","), ...data.map((row: any) => headers.map(h => { const v = String(row[h] ?? ""); return v.includes(",") ? `"${v}"` : v; }).join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `pawsome_export_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success(`✅ ${data.length.toLocaleString("fr-FR")} lieux exportés`);
  };

  const runGlobalSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setGlobalResults(null); return; }
    setGlobalSearching(true);
    const [p, u, s] = await Promise.all([
      supabase.from("pet_friendly_places").select("id, name, city, category").ilike("name", `%${q}%`).limit(5),
      supabase.from("profiles").select("id, display_name, email").or(`display_name.ilike.%${q}%,email.ilike.%${q}%`).limit(5),
      supabase.from("place_submissions").select("id, name, city").ilike("name", `%${q}%`).eq("status", "pending").limit(5),
    ]);
    setGlobalResults({ places: p.data || [], users: u.data || [], submissions: s.data || [] });
    setGlobalSearching(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => { if (globalSearch) runGlobalSearch(globalSearch); else setGlobalResults(null); }, 350);
    return () => clearTimeout(t);
  }, [globalSearch, runGlobalSearch]);

  useEffect(() => {
    if (activeTab !== "submissions") return;
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        setSubmissionCursor(c => Math.min(c + 1, filteredSubmissions.length - 1));
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        setSubmissionCursor(c => Math.max(c - 1, 0));
      }
      if ((e.key === "a" || e.key === "A") && !approveDialog.open && !rejectDialog.open) {
        const sub = filteredSubmissions[submissionCursor];
        if (sub) setApproveDialog({ open: true, sub });
      }
      if ((e.key === "r" || e.key === "R") && !approveDialog.open && !rejectDialog.open) {
        const sub = filteredSubmissions[submissionCursor];
        if (sub) setRejectDialog({ open: true, id: sub.id });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [activeTab, filteredSubmissions, submissionCursor, approveDialog.open, rejectDialog.open]);

  const saveFilter = () => {
    if (!saveFilterName.trim()) return;
    const updated = [...savedFilters, { name: saveFilterName.trim(), filter: { ...placesFilter } }];
    setSavedFilters(updated);
    localStorage.setItem("admin_saved_filters", JSON.stringify(updated));
    setSaveFilterName("");
    toast.success(`Preset "${saveFilterName.trim()}" sauvegardé`);
  };

  const loadFilter = (f: typeof placesFilter) => { setPlacesFilter(f); setPlacesPage(0); };

  const deleteFilter = (i: number) => {
    const updated = savedFilters.filter((_, idx) => idx !== i);
    setSavedFilters(updated);
    localStorage.setItem("admin_saved_filters", JSON.stringify(updated));
  };

  const openPetAlbumAdmin = async (pet: AdminPet) => {
    setAlbumDialogPet(pet);
    setAlbumDialogLoading(true);
    const { data } = await supabase.from("pet_photos" as any).select("*").eq("pet_id", pet.id).order("created_at", { ascending: false });
    setAlbumDialogPhotos((data as unknown as AdminPetPhoto[]) || []);
    setAlbumDialogLoading(false);
  };

  const adminDeletePet = async (pet: AdminPet) => {
    if (!confirm(`Supprimer définitivement "${pet.name}" ? Ses photos seront aussi supprimées.`)) return;
    const { error } = await supabase.from("pets" as any).delete().eq("id", pet.id);
    if (error) { toast.error("Erreur : " + error.message); return; }
    setAdminPets(prev => prev.filter(p => p.id !== pet.id));
    toast.success(`${pet.name} supprimé`);
  };

  const adminDeletePetPhoto = async (photo: AdminPetPhoto) => {
    const { error } = await supabase.from("pet_photos" as any).delete().eq("id", photo.id);
    if (error) { toast.error("Erreur"); return; }
    setAlbumDialogPhotos(prev => prev.filter(p => p.id !== photo.id));
    setAdminPets(prev => prev.map(p => p.id === albumDialogPet?.id ? { ...p, photo_count: Math.max(0, (p.photo_count || 1) - 1) } : p));
    toast.success("Photo supprimée");
  };

  async function fetchAdminReviews() {
    setAdminReviewsLoading(true);
    const { data, count } = await supabase
      .from("place_reviews")
      .select("*, profiles(display_name, email, avatar_url), pet_friendly_places(name)", { count: "exact" })
      .order("created_at", { ascending: false });
    setAdminReviews(data || []);
    setReviewCount(count || 0);
    setAdminReviewsLoading(false);
  }

  async function hideReview(id: string, currentlyHidden: boolean) {
    await supabase.from("place_reviews").update({ is_hidden: !currentlyHidden }).eq("id", id);
    toast.success(currentlyHidden ? "Avis restauré" : "Avis masqué");
    fetchAdminReviews();
  }

  async function adminDeleteReview(id: string) {
    await supabase.from("place_reviews").delete().eq("id", id);
    toast.success("Avis supprimé");
    fetchAdminReviews();
  }

  async function adminEditReview(id: string) {
    if (editRating === 0) { toast.error("Note requise"); return; }
    const { error } = await supabase
      .from("place_reviews")
      .update({ body: editBody || null, rating: editRating })
      .eq("id", id);
    if (error) toast.error("Erreur lors de la modification");
    else { toast.success("Avis modifié"); setEditingReviewId(null); fetchAdminReviews(); }
  }

  async function adminDeleteReviewPhoto(id: string, photoUrl: string) {
    const path = photoUrl.split("/review-photos/")[1];
    if (path) await supabase.storage.from("review-photos").remove([path]);
    await supabase.from("place_reviews").update({ photo_url: null }).eq("id", id);
    toast.success("Photo supprimée");
    fetchAdminReviews();
  }


  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate("/")}>← Retour</Button>
          <h1 className="text-xl font-bold text-foreground flex-1">⚙️ Administration — World Pet Friendly</h1>
          {notifCount > 0 && <Badge className="bg-orange-500 text-white">{notifCount}</Badge>}
        </div>

        <div ref={globalSearchRef} className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Recherche globale — lieux, utilisateurs, soumissions…"
            value={globalSearch}
            onChange={e => setGlobalSearch(e.target.value)}
            onBlur={() => setTimeout(() => setGlobalResults(null), 200)}
            className="pl-9"
          />
          {globalSearching && <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />}
          {globalResults && (globalResults.places.length > 0 || globalResults.users.length > 0 || globalResults.submissions.length > 0) && (
            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-xl shadow-lg overflow-hidden">
              {globalResults.places.length > 0 && (
                <div>
                  <p className="px-3 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">🗺️ Lieux</p>
                  {globalResults.places.map(p => (
                    <button key={p.id} className="w-full text-left px-3 py-2 hover:bg-muted transition-colors" onClick={() => { setActiveTab("places"); setPlacesSearch(p.name); setGlobalSearch(""); setGlobalResults(null); }}>
                      <span className="text-sm font-medium text-foreground">{p.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">{p.city || "—"} · {p.category}</span>
                    </button>
                  ))}
                </div>
              )}
              {globalResults.users.length > 0 && (
                <div>
                  <p className="px-3 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">👥 Utilisateurs</p>
                  {globalResults.users.map(u => (
                    <button key={u.id} className="w-full text-left px-3 py-2 hover:bg-muted transition-colors" onClick={() => { setActiveTab("users"); setUsersSearch(u.display_name || u.email || ""); setGlobalSearch(""); setGlobalResults(null); }}>
                      <span className="text-sm font-medium text-foreground">{u.display_name || "Sans nom"}</span>
                      <span className="text-xs text-muted-foreground ml-2">{u.email}</span>
                    </button>
                  ))}
                </div>
              )}
              {globalResults.submissions.length > 0 && (
                <div>
                  <p className="px-3 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">📍 Soumissions en attente</p>
                  {globalResults.submissions.map(s => (
                    <button key={s.id} className="w-full text-left px-3 py-2 hover:bg-muted transition-colors" onClick={() => { setActiveTab("submissions"); setGlobalSearch(""); setGlobalResults(null); }}>
                      <span className="text-sm font-medium text-foreground">{s.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">{s.city || "—"}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {globalResults && globalResults.places.length === 0 && globalResults.users.length === 0 && globalResults.submissions.length === 0 && (
            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-xl shadow-lg px-4 py-3">
              <p className="text-sm text-muted-foreground">Aucun résultat pour "{globalSearch}"</p>
            </div>
          )}
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

        <Tabs defaultValue="dashboard" value={activeTab} onValueChange={v => { setActiveTab(v); setSubmissionCursor(0); }}>
          <TabsList className="h-auto w-full bg-muted/40 border border-border rounded-2xl p-3 flex flex-col gap-3">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest px-1 mb-2">🧭 Gestion</p>
              <div className="flex flex-wrap gap-1.5">
                <TabsTrigger value="dashboard" className="rounded-xl px-3 py-2 text-sm font-medium">📊 Statistiques</TabsTrigger>
                <TabsTrigger value="notifications" className="rounded-xl px-3 py-2 text-sm font-medium">🔔 Notifications</TabsTrigger>
                <TabsTrigger value="submissions" className="rounded-xl px-3 py-2 text-sm font-medium">📍 À valider</TabsTrigger>
                <TabsTrigger value="reports" className="rounded-xl px-3 py-2 text-sm font-medium">⚠️ Signalements</TabsTrigger>
                <TabsTrigger value="places" className="rounded-xl px-3 py-2 text-sm font-medium">🗺️ Lieux publiés</TabsTrigger>
                <TabsTrigger value="user_places" className="rounded-xl px-3 py-2 text-sm font-medium">👤 Soumis par utilisateurs</TabsTrigger>
                <TabsTrigger value="users" className="rounded-xl px-3 py-2 text-sm font-medium">👥 Utilisateurs</TabsTrigger>
                <TabsTrigger value="reviews" className="rounded-xl px-3 py-2 text-sm font-medium">💬 Avis</TabsTrigger>
                <TabsTrigger value="pets" className="rounded-xl px-3 py-2 text-sm font-medium">🐾 Animaux</TabsTrigger>
              </div>
            </div>
            <div className="border-t border-border/50 pt-2">
              <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest px-1 mb-2">🔧 Outils</p>
              <div className="flex flex-wrap gap-1.5">
                <TabsTrigger value="completeness" className="rounded-xl px-3 py-2 text-sm font-medium">✅ Complétude</TabsTrigger>
                <TabsTrigger value="duplicates" className="rounded-xl px-3 py-2 text-sm font-medium">🔍 Doublons</TabsTrigger>
                <TabsTrigger value="coverage" className="rounded-xl px-3 py-2 text-sm font-medium">📡 Couverture</TabsTrigger>
                <TabsTrigger value="import" className="rounded-xl px-3 py-2 text-sm font-medium">📥 Import CSV</TabsTrigger>
                <TabsTrigger value="export" className="rounded-xl px-3 py-2 text-sm font-medium">📤 Export</TabsTrigger>
              </div>
            </div>
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
                    <div className="rounded-xl border border-border bg-card p-4 space-y-1">
                      <p className="text-xs font-semibold text-muted-foreground uppercase">Avis communauté</p>
                      <p className="text-2xl font-bold text-foreground">{reviewCount}</p>
                      <p className="text-xs text-muted-foreground">avis publiés au total</p>
                    </div>
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
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/60 border border-border text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">⌨️ Raccourcis :</span>
              <kbd className="px-1.5 py-0.5 rounded bg-background border border-border font-mono">A</kbd><span>Approuver</span>
              <kbd className="px-1.5 py-0.5 rounded bg-background border border-border font-mono">R</kbd><span>Rejeter</span>
              <kbd className="px-1.5 py-0.5 rounded bg-background border border-border font-mono">→</kbd><span>Suivant</span>
              <kbd className="px-1.5 py-0.5 rounded bg-background border border-border font-mono">←</kbd><span>Précédent</span>
              {filteredSubmissions.length > 0 && <span className="ml-auto text-primary font-medium">{submissionCursor + 1} / {filteredSubmissions.length}</span>}
            </div>

            {/* Filtres */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <select
                value={submissionsFilter.category}
                onChange={(e) => setSubmissionsFilter(f => ({ ...f, category: e.target.value }))}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
              >
                <option value="">Toutes catégories</option>
                {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <Input
                placeholder="Filtrer par ville…"
                value={submissionsFilter.city}
                onChange={(e) => setSubmissionsFilter(f => ({ ...f, city: e.target.value }))}
                className="h-9"
              />
              <select
                value={submissionsFilter.dateRange}
                onChange={(e) => setSubmissionsFilter(f => ({ ...f, dateRange: e.target.value }))}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground col-span-2 sm:col-span-1"
              >
                <option value="all">Toutes les dates</option>
                <option value="7d">7 derniers jours</option>
                <option value="30d">30 derniers jours</option>
              </select>
            </div>

            {/* Barre d'actions en masse */}
            {selectedSubmissions.size > 0 && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/30 flex-wrap">
                <span className="text-sm font-semibold text-foreground flex-1">{selectedSubmissions.size} sélectionné(s)</span>
                <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white h-8 text-xs" onClick={bulkApprove}>✅ Tout approuver</Button>
                <Button size="sm" variant="outline" className="text-destructive border-destructive h-8 text-xs" onClick={() => setBulkRejectDialog(true)}>❌ Tout rejeter</Button>
                <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setSelectedSubmissions(new Set())}>Annuler</Button>
              </div>
            )}

            {/* Sélectionner tout */}
            {filteredSubmissions.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={selectedSubmissions.size === filteredSubmissions.length}
                  onChange={(e) => setSelectedSubmissions(e.target.checked ? new Set(filteredSubmissions.map(s => s.id)) : new Set())}
                  className="rounded"
                />
                <span>Tout sélectionner ({filteredSubmissions.length} résultat{filteredSubmissions.length > 1 ? "s" : ""})</span>
              </div>
            )}

            {filteredSubmissions.length === 0 && (
              <p className="text-muted-foreground text-center py-8">
                {submissions.length === 0 ? "Aucun lieu en attente" : "Aucun résultat pour ces filtres"}
              </p>
            )}

            {filteredSubmissions.map(sub => {
              const nearbyPlaces = findNearbyDuplicates(sub);
              const isSelected = selectedSubmissions.has(sub.id);
              const mapOpen = submissionMapOpen === sub.id;
              return (
                <Card key={sub.id} className={isSelected ? "border-primary" : filteredSubmissions[submissionCursor]?.id === sub.id ? "border-blue-400 ring-1 ring-blue-400 shadow-sm" : ""}>
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectSubmission(sub.id)}
                        className="mt-1 rounded shrink-0"
                      />
                      <div className="flex-1 min-w-0 space-y-2">
                        <div>
                          <h3 className="font-semibold text-foreground">{sub.name}</h3>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge variant="secondary">{sub.category}</Badge>
                            {sub.city && <span className="text-sm text-muted-foreground">{sub.city}</span>}
                          </div>
                        </div>

                        {nearbyPlaces.length > 0 && (
                          <div className="p-2.5 rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-300 dark:border-orange-700">
                            <p className="text-xs font-semibold text-orange-700 dark:text-orange-400">
                              ⚠️  {nearbyPlaces.length} lieu(x) similaire(s) à moins de 100m :
                            </p>
                            <ul className="mt-1 space-y-0.5">
                              {nearbyPlaces.slice(0, 3).map(p => (
                                <li key={p.id} className="text-xs text-orange-600 dark:text-orange-400">
                                  • {p.name} ({(haversineKm(sub.latitude, sub.longitude, p.latitude, p.longitude) * 1000).toFixed(0)}m)
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {sub.photos && sub.photos.length > 0 && (
                          <div className="flex gap-2 overflow-x-auto pb-1">
                            {sub.photos.map((url, i) => (
                              <img key={i} src={url} alt="" className="w-20 h-20 rounded-lg object-cover shrink-0 border border-border cursor-pointer hover:opacity-90" onClick={() => window.open(url, "_blank")} />
                            ))}
                          </div>
                        )}

                        {sub.description && (
                          <p className="text-sm text-muted-foreground">
                            {sub.description.length > 120 ? sub.description.slice(0, 120) + "…" : sub.description}
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

                        {mapOpen && (
                          <div className="rounded-lg overflow-hidden border border-border">
                            <iframe
                              title={`map-${sub.id}`}
                              src={`https://www.openstreetmap.org/export/embed.html?bbox=${sub.longitude - 0.004},${sub.latitude - 0.003},${sub.longitude + 0.004},${sub.latitude + 0.003}&layer=mapnik&marker=${sub.latitude},${sub.longitude}`}
                              className="w-full h-44 border-0"
                              loading="lazy"
                            />
                          </div>
                        )}

                        <div className="flex gap-2 flex-wrap pt-1">
                          <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => { setApproveDialog({ open: true, sub }); fetchGoogleEnrichment(sub); }}>✅ Approuver</Button>
                          <Button size="sm" variant="outline" className="text-destructive border-destructive" onClick={() => setRejectDialog({ open: true, id: sub.id })}>❌ Rejeter</Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-muted-foreground border-border h-8 text-xs hover:bg-destructive/10 hover:text-destructive hover:border-destructive/40 transition-colors"
                            onClick={() => {
                              if (window.confirm("Supprimer définitivement cette soumission sans notification ?")) {
                                deleteSubmission(sub.id);
                              }
                            }}
                          >
                            🗑 Supprimer
                          </Button>
                          <Button size="sm" variant="ghost" className="text-xs h-9 text-muted-foreground" onClick={() => setSubmissionMapOpen(mapOpen ? null : sub.id)}>
                            {mapOpen ? "🗺️  Masquer" : "🗺️  Carte"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {/* Historique des soumissions traitées */}
            <div className="mt-6 border-t border-border pt-4">
              <button
                onClick={() => { setShowProcessedSubs(v => !v); if (!showProcessedSubs) fetchProcessedSubmissions(); }}
                className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                {showProcessedSubs ? "▼" : "▶"} Soumissions déjà traitées
              </button>
              {showProcessedSubs && (
                <div className="mt-3 space-y-2">
                  {processedSubmissions.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic text-center py-4">Aucune soumission traitée.</p>
                  ) : (
                    processedSubmissions.map(s => (
                      <div key={s.id} className={`rounded-xl border p-3 flex items-start justify-between gap-3 ${s.status === "approved" ? "border-green-300 bg-green-50 dark:bg-green-950/20" : "border-destructive/30 bg-destructive/5"}`}>
                        <div className="space-y-0.5 min-w-0">
                          <p className="text-sm font-semibold truncate">{s.name}{s.city ? ` — ${s.city}` : ""}</p>
                          {s.admin_note && <p className="text-xs text-muted-foreground italic">Motif : {s.admin_note}</p>}
                          <p className="text-xs text-muted-foreground">
                            {s.reviewed_at ? new Date(s.reviewed_at).toLocaleDateString("fr-FR") : new Date(s.created_at).toLocaleDateString("fr-FR")}
                          </p>
                        </div>
                        <span className={`shrink-0 text-xs font-bold px-2 py-1 rounded-full ${s.status === "approved" ? "bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-100" : "bg-destructive/20 text-destructive"}`}>
                          {s.status === "approved" ? "✅ Approuvé" : "❌ Rejeté"}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="reports" className="space-y-4 mt-4">
            {reports.length === 0 && <p className="text-muted-foreground text-center py-8">Aucun signalement en attente</p>}
            {reports.length > 0 && <ReportGroups reports={reports} onEdit={openEditFromReport} onReview={reviewGroup} onDismiss={dismissGroup} onDelete={deleteReportGroup} onDeletePlace={(placeId, placeName, reportIds) => setDeleteFromReportDialog({ open: true, placeId, placeName, reportIds })} />}

            {/* Historique — Signalements traités */}
            <div className="mt-6 border-t border-border pt-4 space-y-3">
              <button
                onClick={() => { setShowProcessedReports(v => !v); if (!showProcessedReports) fetchProcessedReports(); }}
                className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                {showProcessedReports ? "▼" : "▶"} ✅ Signalements traités
              </button>
              {showProcessedReports && (
                <div className="space-y-2">
                  {processedReports.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic text-center py-4">Aucun signalement traité.</p>
                  ) : processedReports.map(r => (
                    <div key={r.id} className="rounded-xl border border-green-300 bg-green-50 dark:bg-green-950/20 p-3 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold">{r.pet_friendly_places?.name ?? "Lieu inconnu"}</p>
                          <p className="text-xs text-muted-foreground capitalize">{r.reason?.replace(/_/g, " ")}</p>
                          {r.comment && <p className="text-xs text-muted-foreground italic">"{r.comment}"</p>}
                        </div>
                        <span className="text-xs bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-100 px-2 py-0.5 rounded-full shrink-0">✅ Traité</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Traité le {r.reviewed_at ? new Date(r.reviewed_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Historique — Signalements infondés */}
            <div className="mt-4 border-t border-border pt-4 space-y-3">
              <button
                onClick={() => { setShowDismissedReports(v => !v); if (!showDismissedReports) fetchDismissedReports(); }}
                className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
              >
                {showDismissedReports ? "▼" : "▶"} 🚫 Signalements infondés
              </button>
              {showDismissedReports && (
                <div className="space-y-2">
                  {dismissedReports.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic text-center py-4">Aucun signalement infondé.</p>
                  ) : dismissedReports.map(r => (
                    <div key={r.id} className="rounded-xl border border-muted bg-muted/30 p-3 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold">{r.pet_friendly_places?.name ?? "Lieu inconnu"}</p>
                          <p className="text-xs text-muted-foreground capitalize">{r.reason?.replace(/_/g, " ")}</p>
                          {r.comment && <p className="text-xs text-muted-foreground italic">"{r.comment}"</p>}
                        </div>
                        <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full shrink-0">🚫 Infondé</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Rejeté le {r.reviewed_at ? new Date(r.reviewed_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="places" className="space-y-4 mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Rechercher par nom, ville, catégorie…" value={placesSearch} onChange={(e) => { setPlacesSearch(e.target.value); setPlacesPage(0); }} className="pl-9" />
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setPlacesFilter(f => ({ ...f, flagged: !f.flagged }))} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${placesFilter.flagged ? "bg-orange-500 text-white border-orange-500" : "bg-background border-border text-muted-foreground hover:border-orange-400"}`}>⚠️ Signalés</button>
              <button onClick={() => setPlacesFilter(f => ({ ...f, unverified: !f.unverified }))} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${placesFilter.unverified ? "bg-destructive text-white border-destructive" : "bg-background border-border text-muted-foreground hover:border-destructive"}`}>❌ Non vérifiés</button>
              <button onClick={() => setPlacesFilter(f => ({ ...f, noPhoto: !f.noPhoto }))} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${placesFilter.noPhoto ? "bg-primary text-white border-primary" : "bg-background border-border text-muted-foreground hover:border-primary"}`}>📷 Sans photo</button>
              <button onClick={() => setPlacesFilter(f => ({ ...f, noPhone: !f.noPhone }))} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${placesFilter.noPhone ? "bg-primary text-white border-primary" : "bg-background border-border text-muted-foreground hover:border-primary"}`}>📞 Sans tél.</button>
              <button onClick={() => setPlacesFilter(f => ({ ...f, noWebsite: !f.noWebsite }))} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${placesFilter.noWebsite ? "bg-primary text-white border-primary" : "bg-background border-border text-muted-foreground hover:border-primary"}`}>🌐 Sans site</button>
              <button onClick={() => setPlacesFilter(f => ({ ...f, noHours: !f.noHours }))} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${placesFilter.noHours ? "bg-primary text-white border-primary" : "bg-background border-border text-muted-foreground hover:border-primary"}`}>🕐 Sans horaires</button>
              <select value={placesFilter.category} onChange={(e) => { setPlacesFilter(f => ({ ...f, category: e.target.value })); setPlacesPage(0); }} className="h-8 rounded-lg border border-input bg-background px-2 text-xs text-foreground">
                <option value="">Toutes catégories</option>
                {uniquePlaceCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={placesFilter.source} onChange={(e) => setPlacesFilter(f => ({ ...f, source: e.target.value }))} className="h-8 rounded-lg border border-input bg-background px-2 text-xs text-foreground">
                <option value="">Toutes sources</option>
                {uniqueSources.map(s => <option key={String(s)} value={String(s)}>{String(s)}</option>)}
              </select>
              <select value={placesFilter.country} onChange={(e) => setPlacesFilter(f => ({ ...f, country: e.target.value }))} className="h-8 rounded-lg border border-input bg-background px-2 text-xs text-foreground">
                <option value="">Tous pays</option>
                {uniqueCountries.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {(placesFilter.flagged || placesFilter.unverified || placesFilter.noPhoto || placesFilter.noPhone || placesFilter.noWebsite || placesFilter.noHours || placesFilter.source || placesFilter.country || placesFilter.category) && (
                <button onClick={() => { setPlacesFilter({ flagged: false, unverified: false, noPhoto: false, noPhone: false, noWebsite: false, noHours: false, source: "", country: "", category: "" }); setPlacesPage(0); }} className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-border text-muted-foreground hover:bg-muted">✕ Réinitialiser</button>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Nom du preset…"
                  value={saveFilterName}
                  onChange={e => setSaveFilterName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && saveFilter()}
                  className="h-8 text-xs flex-1"
                />
                <Button size="sm" variant="outline" className="h-8 text-xs shrink-0" onClick={saveFilter} disabled={!saveFilterName.trim()}>
                  💾 Sauvegarder le filtre actuel
                </Button>
              </div>
              {savedFilters.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {savedFilters.map((sf, i) => (
                    <div key={i} className="flex items-center gap-0.5 rounded-lg border border-border bg-background overflow-hidden">
                      <button className="px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted transition-colors" onClick={() => loadFilter(sf.filter)}>
                        🏷️ {sf.name}
                      </button>
                      <button className="px-1.5 py-1 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors" onClick={() => deleteFilter(i)}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {places.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {Object.entries(
                  places.reduce((acc, p) => { acc[p.category] = (acc[p.category] || 0) + 1; return acc; }, {} as Record<string, number>)
                ).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([cat, count]) => (
                  <button key={cat} onClick={() => { setPlacesFilter(f => ({ ...f, category: f.category === cat ? "" : cat })); setPlacesPage(0); }}
                    className={`text-left px-3 py-2 rounded-lg border text-xs transition-colors ${placesFilter.category === cat ? "bg-primary text-white border-primary" : "bg-muted/50 border-border hover:bg-muted"}`}>
                    <span className="font-semibold">{count.toLocaleString("fr-FR")}</span>
                    <span className="text-[10px] block truncate opacity-80">{cat}</span>
                  </button>
                ))}
              </div>
            )}

            {selectedPlaces.size > 0 && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/10 border border-primary/30">
                <span className="text-xs font-semibold text-primary flex-1">{selectedPlaces.size} lieu(x) sélectionné(s)</span>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={bulkVerify} disabled={bulkActionLoading}>✅ Vérifier tout</Button>
                <Button size="sm" variant="outline" className="h-7 text-xs text-destructive border-destructive hover:bg-destructive/10" onClick={bulkDelete} disabled={bulkActionLoading}>🗑️ Supprimer tout</Button>
                <button className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setSelectedPlaces(new Set())}>✕</button>
              </div>
            )}

            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span>{placesTotalCount.toLocaleString("fr-FR")} lieu{placesTotalCount > 1 ? "x" : ""} trouvé{placesTotalCount > 1 ? "s" : ""}</span>
                <button onClick={exportCSV} className="px-2.5 py-1 rounded-lg text-xs font-semibold border border-border bg-background text-muted-foreground hover:bg-muted transition-colors">⬇️ Export CSV</button>
              </div>
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
              <Card key={place.id} className={`${place.is_flagged ? "border-orange-400 dark:border-orange-700" : ""} ${selectedPlaces.has(place.id) ? "ring-2 ring-primary" : ""}`}>
                <CardContent className="pt-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      <input type="checkbox" checked={selectedPlaces.has(place.id)} onChange={e => {
                        setSelectedPlaces(prev => { const s = new Set(prev); e.target.checked ? s.add(place.id) : s.delete(place.id); return s; });
                      }} className="mt-1 shrink-0 accent-primary" />
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
                      {!place.verified && (
                        <Button size="sm" variant="outline" className="h-7 gap-1 text-xs text-green-600 border-green-400 hover:bg-green-50 dark:hover:bg-green-900/20" onClick={() => quickVerify(place.id)}>
                          ✅ Vérifier
                        </Button>
                      )}
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

          <TabsContent value="user_places" className="space-y-4 mt-4">
            <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <span className="text-blue-600 dark:text-blue-400 font-semibold text-sm">👤 Lieux publiés soumis par des utilisateurs</span>
              <span className="text-xs text-muted-foreground ml-auto">{userPlacesTotalCount.toLocaleString("fr-FR")} lieux</span>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Rechercher par nom, ville, catégorie…" value={userPlacesSearch} onChange={(e) => { setUserPlacesSearch(e.target.value); setUserPlacesPage(0); }} className="pl-9" />
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>{userPlacesTotalCount.toLocaleString("fr-FR")} lieu{userPlacesTotalCount > 1 ? "x" : ""}</span>
              {userPlacesTotalPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button size="icon" variant="ghost" disabled={userPlacesPage === 0} onClick={() => setUserPlacesPage(p => p - 1)} className="h-8 w-8"><ChevronLeft className="w-4 h-4" /></Button>
                  <span className="text-xs">{userPlacesPage + 1} / {userPlacesTotalPages}</span>
                  <Button size="icon" variant="ghost" disabled={userPlacesPage >= userPlacesTotalPages - 1} onClick={() => setUserPlacesPage(p => p + 1)} className="h-8 w-8"><ChevronRight className="w-4 h-4" /></Button>
                </div>
              )}
            </div>
            {userPlacesLoading && <p className="text-muted-foreground text-center py-8">Chargement…</p>}
            {!userPlacesLoading && userPlaces.length === 0 && <p className="text-muted-foreground text-center py-8">Aucun lieu soumis par utilisateur</p>}
            {userPlaces.map(place => (
              <Card key={place.id} className={place.is_flagged ? "border-orange-400 dark:border-orange-700" : ""}>
                <CardContent className="pt-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-foreground">{place.name}</h3>
                        {place.verified ? <CheckCircle className="w-4 h-4 text-green-500 shrink-0" /> : <span className="text-[10px] bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 px-2 py-0.5 rounded-full">En attente de vérification</span>}
                        {place.is_flagged && <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0" />}
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant="secondary">{place.category}</Badge>
                        {place.city && <span className="text-xs text-muted-foreground">🏙️ {place.city}{place.country ? `, ${place.country}` : ""}</span>}
                        {place.address && <span className="text-xs text-muted-foreground"><MapPin className="w-3 h-3 inline mr-0.5" />{place.address}</span>}
                      </div>
                    </div>
                    {place.photo_url && <img src={place.photo_url} alt="" className="w-16 h-16 rounded-lg object-cover shrink-0 border border-border" />}
                  </div>
                  <div className="flex gap-1.5 flex-wrap text-xs text-muted-foreground">
                    {place.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{place.phone}</span>}
                    {place.website && <span className="flex items-center gap-1"><Globe className="w-3 h-3" />Site web</span>}
                    {place.opening_hours && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{place.opening_hours}</span>}
                    {(place.report_count ?? 0) > 0 && <span className="text-orange-500">⚠️ {place.report_count} signalement(s)</span>}
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-muted-foreground">Ajouté le {new Date(place.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}</p>
                    <div className="flex gap-1.5">
                      {!place.verified && (
                        <Button size="sm" variant="outline" className="h-7 gap-1 text-xs text-green-600 border-green-400 hover:bg-green-50 dark:hover:bg-green-900/20" onClick={() => quickVerify(place.id)}>✅ Vérifier</Button>
                      )}
                      <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => openEdit(place)}><Pencil className="w-3 h-3" /> Modifier</Button>
                      <Button size="sm" variant="outline" className="h-7 gap-1 text-xs text-destructive border-destructive hover:bg-destructive/10" onClick={() => setDeleteDialog({ open: true, place })}><Trash2 className="w-3 h-3" /> Supprimer</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {userPlacesTotalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <Button size="sm" variant="outline" disabled={userPlacesPage === 0} onClick={() => setUserPlacesPage(p => p - 1)}><ChevronLeft className="w-4 h-4 mr-1" /> Précédent</Button>
                <span className="text-sm text-muted-foreground">{userPlacesPage + 1} / {userPlacesTotalPages}</span>
                <Button size="sm" variant="outline" disabled={userPlacesPage >= userPlacesTotalPages - 1} onClick={() => setUserPlacesPage(p => p + 1)}>Suivant <ChevronRight className="w-4 h-4 ml-1" /></Button>
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
                      {u.is_banned ? (
                        <Button size="sm" variant="outline" className="h-7 text-xs text-green-600 border-green-400 hover:bg-green-50 dark:hover:bg-green-950/30" onClick={() => unbanUser(u.id)}>✅ Réactiver</Button>
                      ) : (
                        <Button size="sm" variant="outline" className="h-7 text-xs text-destructive border-destructive hover:bg-destructive/10" onClick={() => setBanDialog({ open: true, userId: u.id, name: u.display_name || u.email || "" })}>🔒 Suspendre</Button>
                      )}
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
          <TabsContent value="completeness" className="space-y-4 mt-4">
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={computeCompleteness} disabled={completenessLoading}>
                {completenessLoading ? "Analyse en cours…" : "🔍 Analyser la complétude"}
              </Button>
              {completenessData.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Seuil max :</span>
                  <select
                    value={completenessThreshold}
                    onChange={(e) => setCompletenessThreshold(Number(e.target.value))}
                    className="h-8 px-2 rounded border border-input bg-background text-xs text-foreground"
                  >
                    <option value={40}>≤ 40% (très incomplets)</option>
                    <option value={60}>≤ 60% (incomplets)</option>
                    <option value={80}>≤ 80% (partiels)</option>
                    <option value={100}>Tous</option>
                  </select>
                  <Badge variant="secondary">
                    {completenessData.filter(p => p.score <= completenessThreshold).length} lieux
                  </Badge>
                </div>
              )}
            </div>

            {completenessData.length > 0 && (
              <ScrollArea className="h-[60vh] rounded-md border border-border">
                <div className="space-y-2 p-2">
                  {completenessData.filter(p => p.score <= completenessThreshold).map(p => (
                    <Card key={p.id}>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-foreground truncate">{p.name}</p>
                            <p className="text-xs text-muted-foreground">{p.city || "—"} · {p.category}</p>
                            {p.missing.length > 0 && (
                              <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">Manque : {p.missing.join(", ")}</p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span className={`text-lg font-bold ${p.score < 40 ? "text-destructive" : p.score < 70 ? "text-amber-600" : "text-green-600"}`}>
                              {p.score}%
                            </span>
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => {
                              const place = places.find(pl => pl.id === p.id);
                              if (place) openEdit(place);
                            }}>
                              <Pencil className="w-3 h-3 mr-1" /> Modifier
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
            {completenessData.length === 0 && !completenessLoading && (
              <p className="text-muted-foreground text-center py-8">Clique sur "Analyser" pour voir le score de complétude des lieux vérifiés.</p>
            )}
          </TabsContent>

          <TabsContent value="duplicates" className="space-y-4 mt-4">
            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={detectDuplicates} disabled={duplicatesLoading}>
                {duplicatesLoading ? "Analyse en cours…" : "🔍 Détecter les doublons"}
              </Button>
              {duplicates.length > 0 && (
                <Badge variant="secondary">
                  {duplicates.length} paire{duplicates.length > 1 ? "s" : ""} trouvée{duplicates.length > 1 ? "s" : ""}
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">Limite : 5 000 lieux vérifiés — distance &lt; 100m + nom similaire</span>
            </div>

            {duplicates.length > 0 && (
              <ScrollArea className="h-[60vh] rounded-md border border-border">
                <div className="space-y-2 p-2">
                  {duplicates.map((dup, i) => (
                    <Card key={i} className="border-orange-300 dark:border-orange-700">
                      <CardContent className="pt-4 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs text-muted-foreground">{dup.aCity || "Ville inconnue"} · {dup.distM}m d'écart</p>
                          <Badge variant="outline" className="text-orange-600 border-orange-400">⚠️ Doublon potentiel</Badge>
                        </div>
                        {[{ id: dup.aId, name: dup.aName }, { id: dup.bId, name: dup.bName }].map(p => (
                          <div key={p.id} className="flex items-center justify-between gap-2 p-2 rounded bg-muted/50">
                            <p className="font-medium text-foreground text-sm truncate">{p.name}</p>
                            <Button size="sm" variant="outline" className="h-7 text-xs text-destructive border-destructive shrink-0" onClick={() => deleteById(p.id)}>
                              🗑️ Supprimer
                            </Button>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
            {duplicates.length === 0 && !duplicatesLoading && (
              <p className="text-muted-foreground text-center py-8">Clique sur "Détecter" pour analyser les doublons potentiels parmi les lieux vérifiés.</p>
            )}
          </TabsContent>

          <TabsContent value="coverage" className="space-y-4 mt-4">
            <Button onClick={fetchCoverage} disabled={coverageLoading}>
              {coverageLoading ? "Chargement…" : "📡 Calculer la couverture"}
            </Button>
            {coverageData.length > 0 && (
              <ScrollArea className="h-[60vh] rounded-md border border-border">
                <div className="space-y-1 p-2">
                  {coverageData.map(c => {
                    const max = coverageData[0].count;
                    const pct = Math.round((c.count / max) * 100);
                    return (
                      <div key={c.dept} className="flex items-center gap-3 p-2 rounded hover:bg-muted/50">
                        <span className="text-sm text-foreground w-40 truncate">{c.dept}</span>
                        <div className="flex-1 h-5 bg-muted rounded overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs font-semibold text-foreground w-16 text-right">{c.count.toLocaleString("fr-FR")}</span>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
            {coverageData.length === 0 && !coverageLoading && (
              <p className="text-muted-foreground text-center py-8">Clique sur "Calculer" pour voir la répartition des lieux vérifiés par département/région.</p>
            )}
          </TabsContent>

          <TabsContent value="import" className="space-y-4 mt-4">
            <Card>
              <CardContent className="pt-4 space-y-3">
                <p className="text-sm text-foreground">
                  📥 Import en masse de lieux via fichier CSV. Colonnes attendues : <code className="text-xs bg-muted px-1 rounded">name, latitude, longitude</code> (obligatoires) + <code className="text-xs bg-muted px-1 rounded">category, city, address, country, phone, website</code> (optionnelles).
                </p>
                <p className="text-xs text-muted-foreground">⚠️ Les lieux importés sont marqués comme <strong>non-vérifiés</strong> et devront être validés manuellement.</p>
                <input
                  ref={csvInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleCsvFile}
                  className="block w-full text-sm text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                />
                {csvFile && (
                  <p className="text-xs text-muted-foreground">
                    📄 {csvFile.name} — {(csvFile.size / 1024).toFixed(1)} Ko
                  </p>
                )}
              </CardContent>
            </Card>

            {csvPreview.length > 0 && (
              <Card>
                <CardContent className="pt-4 space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">Aperçu (5 premières lignes)</p>
                  <div className="overflow-x-auto">
                    <table className="text-xs w-full border-collapse">
                      <thead>
                        <tr className="border-b border-border">
                          {Object.keys(csvPreview[0]).map(h => (
                            <th key={h} className="text-left p-1.5 font-semibold text-foreground">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {csvPreview.map((row, i) => (
                          <tr key={i} className="border-b border-border/50">
                            {Object.keys(csvPreview[0]).map(h => (
                              <td key={h} className="p-1.5 text-muted-foreground">{row[h]}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Button onClick={importCsv} disabled={csvImporting} className="w-full">
                    {csvImporting ? "Import en cours…" : `📥 Importer ${csvPreview.length >= 5 ? "tout le fichier" : `les ${csvPreview.length} ligne(s)`}`}
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="export" className="space-y-4 mt-4">
            <Card>
              <CardContent className="pt-4 space-y-3">
                <p className="text-sm text-foreground">📤 Exporter la base de lieux au format CSV (UTF-8 avec BOM).</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-foreground">Catégorie</label>
                    <Input placeholder="Toutes (laisser vide)" value={exportCategory} onChange={(e) => setExportCategory(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-foreground">Pays</label>
                    <Input placeholder="Tous (laisser vide)" value={exportCountry} onChange={(e) => setExportCountry(e.target.value)} />
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <label className="text-sm text-foreground">✅ Lieux vérifiés uniquement</label>
                  <Switch checked={exportOnlyVerified} onCheckedChange={setExportOnlyVerified} />
                </div>
                <Button onClick={handleExport} className="w-full">📤 Lancer l'export</Button>
                <p className="text-xs text-muted-foreground">Limite : 50 000 lignes par export.</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reviews" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Modération des avis</h2>
              <div className="flex gap-2">
                {(["all", "reported", "hidden"] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setReviewsFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${reviewsFilter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                  >
                    {f === "all" ? "Tous" : f === "reported" ? "⚠️ Signalés" : "🙈 Masqués"}
                  </button>
                ))}
              </div>
            </div>

            {adminReviewsLoading ? (
              <p className="text-sm text-muted-foreground text-center py-8">Chargement…</p>
            ) : (
              <div className="space-y-3">
                {adminReviews
                  .filter(r => {
                    if (reviewsFilter === "reported") return r.is_reported;
                    if (reviewsFilter === "hidden") return r.is_hidden;
                    return true;
                  })
                  .map(r => (
                    <div key={r.id} className={`rounded-xl border p-4 space-y-3 ${r.is_hidden ? "opacity-50 border-dashed" : r.is_reported ? "border-orange-400 bg-orange-50 dark:bg-orange-950/20" : "border-border bg-card"}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <p className="text-sm font-semibold">{r.pet_friendly_places?.name ?? "Lieu inconnu"}</p>
                          <div className="flex items-center gap-2">
                            {r.profiles?.avatar_url && <img src={r.profiles.avatar_url} className="w-5 h-5 rounded-full object-cover"/>}
                            <p className="text-xs text-muted-foreground">{r.profiles?.display_name ?? r.profiles?.email ?? "Utilisateur inconnu"}</p>
                          </div>
                          <div className="flex">
                            {[...Array(5)].map((_,i) => (
                              <span key={i} className={`text-xs ${i < r.rating ? "text-amber-400" : "text-muted-foreground"}`}>★</span>
                            ))}
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 shrink-0 items-end">
                          {r.is_reported && <span className="text-xs bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 px-2 py-0.5 rounded-full">⚠️ Signalé</span>}
                          {r.is_hidden && <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">Masqué</span>}
                          {r.has_been_edited && <span className="text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 px-2 py-0.5 rounded-full">Édité</span>}
                        </div>
                      </div>

                      {r.photo_url && (
                        <div className="relative w-full h-36 rounded-lg overflow-hidden border border-border">
                          <img src={r.photo_url} className="w-full h-full object-cover"/>
                          <button
                            onClick={() => adminDeleteReviewPhoto(r.id, r.photo_url)}
                            className="absolute top-2 right-2 px-2 py-1 rounded-lg bg-destructive/90 text-white text-xs font-semibold hover:bg-destructive transition-colors"
                          >
                            🗑 Supprimer la photo
                          </button>
                        </div>
                      )}

                      {editingReviewId === r.id ? (
                        <div className="space-y-2">
                          <div className="flex gap-1">
                            {[1,2,3,4,5].map(s => (
                              <button key={s} onClick={() => setEditRating(s)}>
                                <span className={`text-lg ${s <= editRating ? "text-amber-400" : "text-muted-foreground"}`}>★</span>
                              </button>
                            ))}
                          </div>
                          <textarea
                            value={editBody}
                            onChange={e => setEditBody(e.target.value)}
                            rows={3}
                            className="w-full text-sm rounded-lg border border-border bg-muted/40 p-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                          />
                          <div className="flex gap-2">
                            <button onClick={() => setEditingReviewId(null)} className="flex-1 py-1.5 rounded-lg border border-border text-xs font-semibold text-muted-foreground hover:bg-muted">Annuler</button>
                            <button onClick={() => adminEditReview(r.id)} className="flex-1 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90">Enregistrer</button>
                          </div>
                        </div>
                      ) : (
                        r.body && <p className="text-sm text-foreground leading-relaxed border-l-2 border-muted pl-3">{r.body}</p>
                      )}

                      {r.visited_with_pet && <p className="text-xs text-green-600 dark:text-green-400">🐾 Visité avec animal</p>}

                      <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
                        <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("fr-FR")}</span>
                        <div className="flex gap-2 flex-wrap">
                          <button
                            onClick={() => { setEditingReviewId(r.id); setEditBody(r.body ?? ""); setEditRating(r.rating); }}
                            className="text-xs px-2.5 py-1 rounded-lg border border-blue-300 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-colors"
                          >
                            ✏️ Éditer
                          </button>
                          <button
                            onClick={() => hideReview(r.id, r.is_hidden)}
                            className="text-xs px-2.5 py-1 rounded-lg border border-border hover:bg-muted transition-colors"
                          >
                            {r.is_hidden ? "Restaurer" : "Masquer"}
                          </button>
                          <button
                            onClick={() => adminDeleteReview(r.id)}
                            className="text-xs px-2.5 py-1 rounded-lg border border-destructive/40 text-destructive hover:bg-destructive/10 transition-colors"
                          >
                            Supprimer
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                {adminReviews.filter(r => reviewsFilter === "reported" ? r.is_reported : reviewsFilter === "hidden" ? r.is_hidden : true).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">Aucun avis dans cette catégorie.</p>
                )}
              </div>
            )}
          </TabsContent>
          {/* ── ANIMAUX ── */}
          <TabsContent value="pets" className="space-y-4 mt-4">
            {/* Stats */}
            {(() => {
              const speciesCounts = adminPets.reduce((acc, p) => { acc[p.species] = (acc[p.species] || 0) + 1; return acc; }, {} as Record<string, number>);
              const speciesEmojis: Record<string, string> = { dog: "🐶", cat: "🐱", rabbit: "🐰", bird: "🐦", reptile: "🦎", other: "🐾" };
              const speciesLabels: Record<string, string> = { dog: "Chiens", cat: "Chats", rabbit: "Lapins", bird: "Oiseaux", reptile: "Reptiles", other: "Autres" };
              const totalPhotos = adminPets.reduce((s, p) => s + (p.photo_count || 0), 0);
              return (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-extrabold text-foreground">{adminPets.length}</p><p className="text-xs text-muted-foreground mt-1">Animaux total</p></CardContent></Card>
                  <Card><CardContent className="pt-4 text-center"><p className="text-2xl font-extrabold text-foreground">{totalPhotos}</p><p className="text-xs text-muted-foreground mt-1">Photos total</p></CardContent></Card>
                  <Card><CardContent className="pt-4 space-y-1">
                    {Object.entries(speciesCounts).sort((a,b) => b[1]-a[1]).map(([sp, n]) => (
                      <div key={sp} className="flex items-center justify-between text-xs">
                        <span>{speciesEmojis[sp]} {speciesLabels[sp] || sp}</span>
                        <Badge variant="outline">{n}</Badge>
                      </div>
                    ))}
                  </CardContent></Card>
                  <Card><CardContent className="pt-4 text-center">
                    <p className="text-2xl font-extrabold text-foreground">{new Set(adminPets.map(p => p.user_id)).size}</p>
                    <p className="text-xs text-muted-foreground mt-1">Propriétaires</p>
                  </CardContent></Card>
                </div>
              );
            })()}

            {/* Filtres */}
            <div className="flex gap-2 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher par nom, race, propriétaire…"
                  value={petSearchQuery}
                  onChange={e => setPetSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <select
                value={petSpeciesFilter}
                onChange={e => setPetSpeciesFilter(e.target.value)}
                className="border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground"
              >
                <option value="all">Toutes espèces</option>
                <option value="dog">🐶 Chiens</option>
                <option value="cat">🐱 Chats</option>
                <option value="rabbit">🐰 Lapins</option>
                <option value="bird">🐦 Oiseaux</option>
                <option value="reptile">🦎 Reptiles</option>
                <option value="other">🐾 Autres</option>
              </select>
              <Button variant="outline" size="sm" onClick={fetchAdminPets}>🔄 Actualiser</Button>
            </div>

            {/* Liste */}
            {adminPetsLoading ? (
              <div className="text-center py-12 text-muted-foreground">Chargement…</div>
            ) : (() => {
              const q = petSearchQuery.toLowerCase();
              const filtered = adminPets.filter(p =>
                (petSpeciesFilter === "all" || p.species === petSpeciesFilter) &&
                (!q || p.name.toLowerCase().includes(q) || (p.breed || "").toLowerCase().includes(q) || (p.owner_name || "").toLowerCase().includes(q))
              );
              const speciesEmojis: Record<string, string> = { dog: "🐶", cat: "🐱", rabbit: "🐰", bird: "🐦", reptile: "🦎", other: "🐾" };
              const speciesLabels: Record<string, string> = { dog: "Chien", cat: "Chat", rabbit: "Lapin", bird: "Oiseau", reptile: "Reptile", other: "Autre" };
              function petAge(bd: string | null) {
                if (!bd) return "";
                const m = (new Date().getFullYear() - new Date(bd).getFullYear()) * 12 + new Date().getMonth() - new Date(bd).getMonth();
                if (m < 12) return `${m} mois`;
                return `${Math.floor(m/12)} an${Math.floor(m/12) > 1 ? "s" : ""}`;
              }
              if (filtered.length === 0) return <div className="text-center py-12 text-muted-foreground">Aucun animal trouvé</div>;
              return (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">{filtered.length} animal{filtered.length > 1 ? "x" : ""}</p>
                  {filtered.map(pet => (
                    <Card key={pet.id}>
                      <CardContent className="pt-4">
                        <div className="flex items-center gap-4">
                          {/* Avatar animal */}
                          {pet.avatar_url ? (
                            <img src={pet.avatar_url} alt={pet.name} className="w-16 h-16 rounded-full object-cover border border-border shrink-0" />
                          ) : (
                            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-3xl border border-border shrink-0">
                              {speciesEmojis[pet.species] || "🐾"}
                            </div>
                          )}

                          {/* Infos */}
                          <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-foreground">{pet.name}</span>
                              <Badge variant="outline" className="text-xs">{speciesEmojis[pet.species]} {speciesLabels[pet.species] || pet.species}</Badge>
                              {pet.sex && <Badge variant="outline" className="text-xs">{pet.sex === "M" ? "♂ Mâle" : "♀ Femelle"}</Badge>}
                            </div>
                            {pet.breed && <p className="text-xs text-muted-foreground">Race : {pet.breed}</p>}
                            {pet.birth_date && <p className="text-xs text-muted-foreground">🎂 {petAge(pet.birth_date)}</p>}
                            {pet.bio && <p className="text-xs text-muted-foreground italic truncate">"{pet.bio}"</p>}
                            <div className="flex items-center gap-2 pt-1">
                              {pet.owner_avatar ? (
                                <img src={pet.owner_avatar} alt="" className="w-5 h-5 rounded-full object-cover" />
                              ) : (
                                <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px]">👤</div>
                              )}
                              <span className="text-xs text-muted-foreground">{pet.owner_name || "Utilisateur inconnu"}</span>
                              <span className="text-xs text-muted-foreground">· {new Date(pet.created_at).toLocaleDateString("fr-FR")}</span>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex flex-col gap-2 shrink-0">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs gap-1"
                              onClick={() => openPetAlbumAdmin(pet)}
                            >
                              📷 Album {pet.photo_count ? `(${pet.photo_count})` : ""}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs text-destructive hover:bg-destructive/10 gap-1"
                              onClick={() => adminDeletePet(pet)}
                            >
                              <Trash2 className="w-3 h-3" /> Supprimer
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              );
            })()}
          </TabsContent>

        </Tabs>
      </div>

      {/* Dialog album animal (admin) */}
      <Dialog open={!!albumDialogPet} onOpenChange={v => { if (!v) { setAlbumDialogPet(null); setAlbumDialogPhotos([]); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              📷 Album · {albumDialogPet?.name}
              {albumDialogPet && (
                <span className="ml-2 text-sm text-muted-foreground font-normal">
                  ({albumDialogPet.owner_name || "Utilisateur inconnu"})
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          {albumDialogLoading ? (
            <p className="text-sm text-muted-foreground text-center py-6">Chargement…</p>
          ) : albumDialogPhotos.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Aucune photo dans cet album</p>
          ) : (
            <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto">
              {albumDialogPhotos.map(photo => (
                <div key={photo.id} className="relative group rounded-xl overflow-hidden border border-border aspect-square bg-muted">
                  <img src={photo.url} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => adminDeletePetPhoto(photo)}
                    className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-destructive/90 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Supprimer cette photo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAlbumDialogPet(null); setAlbumDialogPhotos([]); }}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

      <Dialog open={deleteFromReportDialog.open} onOpenChange={(v) => { if (!v) setDeleteFromReportDialog({ open: false, placeId: "", placeName: "", reportIds: [] }); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>🗑️ Supprimer ce lieu de la base ?</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Tu es sur le point de supprimer <strong>"{deleteFromReportDialog.placeName}"</strong> définitivement de la base de données.
            </p>
            <div className="rounded-lg bg-destructive/10 border border-destructive/30 px-3 py-2.5 text-sm text-destructive space-y-1">
              <p className="font-semibold">⚠️ Cette action est irréversible :</p>
              <p>• Le lieu disparaîtra de la carte immédiatement</p>
              <p>• Tous les avis associés seront supprimés</p>
              <p>• Les signalements seront clôturés</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteFromReportDialog({ open: false, placeId: "", placeName: "", reportIds: [] })}>Annuler</Button>
            <Button variant="destructive" onClick={deletePlaceFromReport}>Supprimer définitivement</Button>
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

      <Dialog open={bulkRejectDialog} onOpenChange={(v) => { if (!v) { setBulkRejectDialog(false); setBulkRejectNote(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>❌ Rejeter {selectedSubmissions.size} soumission(s)</DialogTitle></DialogHeader>
          <Textarea placeholder="Motif du refus commun (optionnel)" value={bulkRejectNote} onChange={(e) => setBulkRejectNote(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setBulkRejectDialog(false); setBulkRejectNote(""); }}>Annuler</Button>
            <Button variant="destructive" onClick={bulkReject}>Tout rejeter</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={banDialog.open} onOpenChange={(v) => { if (!v) { setBanDialog({ open: false, userId: null, name: "" }); setBanReason(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>🔒 Suspendre {banDialog.name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-foreground">Motif (pour référence)</label>
              <Textarea placeholder="Ex: spam, comportement inapproprié…" value={banReason} onChange={(e) => setBanReason(e.target.value)} rows={2} />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Durée</label>
              <select value={banDuration} onChange={(e) => setBanDuration(e.target.value)} className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground mt-1">
                <option value="7d">7 jours</option>
                <option value="30d">30 jours</option>
                <option value="permanent">Permanent</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setBanDialog({ open: false, userId: null, name: "" }); setBanReason(""); }}>Annuler</Button>
            <Button variant="destructive" onClick={banUser}>Suspendre le compte</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div ref={placesServiceDivRef} style={{ display: "none" }} />
    </div>
  );
};

export default AdminPage;
