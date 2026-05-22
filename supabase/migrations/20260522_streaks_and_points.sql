-- ═══════════════════════════════════════════════════════════════
-- STREAKS + POINTS SYSTEM
-- ═══════════════════════════════════════════════════════════════

-- 1. Add streak columns to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS streak_current           INT          DEFAULT 0,
  ADD COLUMN IF NOT EXISTS streak_max               INT          DEFAULT 0,
  ADD COLUMN IF NOT EXISTS streak_last_date         DATE,
  ADD COLUMN IF NOT EXISTS streak_shield_available  BOOLEAN      DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS streak_shield_used_at    TIMESTAMPTZ;

-- ─── 2. Central streak + points function ─────────────────────────────────────
CREATE OR REPLACE FUNCTION handle_user_action(p_user_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_current   INT;
  v_max       INT;
  v_last      DATE;
  v_shield    BOOLEAN;
  v_shield_at TIMESTAMPTZ;
  today       DATE  := CURRENT_DATE;
  yesterday   DATE  := CURRENT_DATE - 1;
  two_ago     DATE  := CURRENT_DATE - 2;
  mult        FLOAT := 1.0;
  new_streak  INT;
  pts         INT;
BEGIN
  SELECT streak_current, streak_max, streak_last_date,
         streak_shield_available, streak_shield_used_at
  INTO   v_current, v_max, v_last, v_shield, v_shield_at
  FROM   profiles WHERE id = p_user_id;

  -- Auto-reset shield after 7 days
  IF v_shield = FALSE AND v_shield_at IS NOT NULL
     AND NOW() > v_shield_at + INTERVAL '7 days' THEN
    v_shield := TRUE;
    UPDATE profiles SET streak_shield_available = TRUE WHERE id = p_user_id;
  END IF;

  -- Already acted today → just award pts with current multiplier
  IF v_last = today THEN
    v_current := COALESCE(v_current, 0);
    IF    v_current >= 100 THEN mult := 3.0;
    ELSIF v_current >= 30  THEN mult := 2.0;
    ELSIF v_current >= 7   THEN mult := 1.5; END IF;
    UPDATE profiles SET points = points + GREATEST(1, CEIL(mult)::INT)
    WHERE id = p_user_id;
    RETURN;
  END IF;

  -- Determine new streak
  IF v_last = yesterday THEN
    new_streak := COALESCE(v_current, 0) + 1;

  ELSIF v_last = two_ago AND v_shield = TRUE THEN
    -- Missed 1 day → auto-use shield to protect streak
    new_streak := COALESCE(v_current, 0) + 1;
    UPDATE profiles
    SET streak_shield_available = FALSE, streak_shield_used_at = NOW()
    WHERE id = p_user_id;
    INSERT INTO user_notifications (user_id, type, title, message)
    VALUES (p_user_id, 'zone_alert', '🛡️ Bouclier activé !',
      'Ton bouclier a protégé ta série de ' || COALESCE(v_current, 0)
      || ' jours. Prochain bouclier dans 7 jours.');

  ELSE
    -- Streak broken
    new_streak := 1;
  END IF;

  -- Multiplier based on new streak
  IF    new_streak >= 100 THEN mult := 3.0;
  ELSIF new_streak >= 30  THEN mult := 2.0;
  ELSIF new_streak >= 7   THEN mult := 1.5; END IF;
  pts := GREATEST(1, CEIL(mult)::INT);

  UPDATE profiles SET
    streak_current   = new_streak,
    streak_max       = GREATEST(COALESCE(v_max, 0), new_streak),
    streak_last_date = today,
    points           = points + pts
  WHERE id = p_user_id;

  -- Milestone notifications (non-repeatable: check streak_max was below threshold)
  IF new_streak IN (7, 30, 100, 365) AND COALESCE(v_max, 0) < new_streak THEN
    INSERT INTO user_notifications (user_id, type, title, message)
    VALUES (p_user_id, 'zone_alert',
      '🔥 ' || new_streak || ' jours de série !',
      'Incroyable ! Tu contribues depuis ' || new_streak
      || ' jours consécutifs. Badge débloqué ! 🏅');
  END IF;
END;
$$;

-- ─── 3. Per-table action triggers ─────────────────────────────────────────────

-- place_reviews
CREATE OR REPLACE FUNCTION trg_action_on_review()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN PERFORM handle_user_action(NEW.user_id); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS on_review_streak ON place_reviews;
CREATE TRIGGER on_review_streak
  AFTER INSERT ON place_reviews FOR EACH ROW EXECUTE FUNCTION trg_action_on_review();

-- place_submissions
CREATE OR REPLACE FUNCTION trg_action_on_submission()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN PERFORM handle_user_action(NEW.submitted_by); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS on_submission_streak ON place_submissions;
CREATE TRIGGER on_submission_streak
  AFTER INSERT ON place_submissions FOR EACH ROW EXECUTE FUNCTION trg_action_on_submission();

-- stray_reports
CREATE OR REPLACE FUNCTION trg_action_on_stray()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN PERFORM handle_user_action(NEW.user_id); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS on_stray_streak ON stray_reports;
CREATE TRIGGER on_stray_streak
  AFTER INSERT ON stray_reports FOR EACH ROW EXECUTE FUNCTION trg_action_on_stray();

-- lost_pets
CREATE OR REPLACE FUNCTION trg_action_on_lost_pet()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN PERFORM handle_user_action(NEW.user_id); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS on_lost_pet_streak ON lost_pets;
CREATE TRIGGER on_lost_pet_streak
  AFTER INSERT ON lost_pets FOR EACH ROW EXECUTE FUNCTION trg_action_on_lost_pet();

-- ─── 4. Approval bonus (+3 pts, replaces old +10) ────────────────────────────
CREATE OR REPLACE FUNCTION award_points_on_approval()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    UPDATE profiles SET points = points + 3 WHERE id = NEW.submitted_by;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_points_approval ON place_submissions;
CREATE TRIGGER trg_points_approval
  AFTER UPDATE ON place_submissions FOR EACH ROW EXECUTE FUNCTION award_points_on_approval();
