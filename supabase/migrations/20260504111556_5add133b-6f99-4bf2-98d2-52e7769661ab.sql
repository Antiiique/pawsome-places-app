
CREATE OR REPLACE FUNCTION public.protect_review_system_columns()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF current_setting('app.bypass_review_guard', true) IS DISTINCT FROM 'true' THEN
    NEW.is_hidden     := OLD.is_hidden;
    NEW.helpful_count := OLD.helpful_count;
    NEW.is_reported   := OLD.is_reported;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_review_cols ON public.place_reviews;
CREATE TRIGGER trg_protect_review_cols
  BEFORE UPDATE ON public.place_reviews
  FOR EACH ROW EXECUTE FUNCTION public.protect_review_system_columns();

CREATE OR REPLACE FUNCTION public.mark_review_helpful(review_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  PERFORM set_config('app.bypass_review_guard', 'true', true);
  UPDATE place_reviews
    SET helpful_count = helpful_count + 1
    WHERE id = review_id AND is_hidden = FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.flag_review(review_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  PERFORM set_config('app.bypass_review_guard', 'true', true);
  UPDATE place_reviews
    SET is_reported = TRUE
    WHERE id = review_id
      AND user_id != auth.uid()
      AND is_hidden = FALSE;
END;
$$;
