CREATE OR REPLACE FUNCTION public.mark_review_helpful(review_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF EXISTS (
    SELECT 1 FROM place_reviews WHERE id = review_id AND user_id = auth.uid()
  ) THEN RAISE EXCEPTION 'Cannot vote on your own review'; END IF;

  PERFORM set_config('app.bypass_review_guard', 'true', true);
  UPDATE place_reviews
    SET helpful_count = helpful_count + 1
    WHERE id = review_id AND is_hidden = false;
END;
$$;

CREATE OR REPLACE FUNCTION public.flag_review(review_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  PERFORM set_config('app.bypass_review_guard', 'true', true);
  UPDATE place_reviews
    SET is_reported = true
    WHERE id = review_id AND user_id != auth.uid() AND is_hidden = false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_review_helpful(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.flag_review(uuid) TO authenticated;