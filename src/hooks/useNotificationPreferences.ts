import { useState, useEffect, useCallback } from "react";
import { useAuthContext } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export interface NotifPrefs {
  // Zone d'alerte (géographique)
  notif_new_place_zone: boolean;
  notif_place_updated_zone: boolean;
  notif_lost_pet_zone: boolean;
  notif_new_stray_zone: boolean;
  // Personnel
  notif_messages: boolean;
  notif_submission_approved: boolean;
  notif_submission_rejected: boolean;
  notif_new_review_on_my_place: boolean;
  // Admin uniquement
  notif_admin_new_review: boolean;
  notif_admin_new_place: boolean;
  notif_admin_new_stray: boolean;
  notif_admin_lost_pet: boolean;
  notif_admin_new_user: boolean;
  notif_admin_profile_complete: boolean;
}

export const DEFAULT_PREFS: NotifPrefs = {
  notif_new_place_zone: true,
  notif_place_updated_zone: false,
  notif_lost_pet_zone: true,
  notif_new_stray_zone: true,
  notif_messages: true,
  notif_submission_approved: true,
  notif_submission_rejected: true,
  notif_new_review_on_my_place: true,
  notif_admin_new_review: true,
  notif_admin_new_place: true,
  notif_admin_new_stray: true,
  notif_admin_lost_pet: true,
  notif_admin_new_user: true,
  notif_admin_profile_complete: false,
};

export function useNotificationPreferences() {
  const { user } = useAuthContext();
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT_PREFS);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchPrefs = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("notification_preferences" as any)
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) setPrefs({ ...DEFAULT_PREFS, ...(data as any) });
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchPrefs(); }, [fetchPrefs]);

  const updatePref = async (key: keyof NotifPrefs, value: boolean) => {
    if (!user) return;
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    setSaving(true);
    await supabase.from("notification_preferences" as any).upsert({
      user_id: user.id,
      ...next,
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
  };

  return { prefs, loading, saving, updatePref };
}
