CREATE OR REPLACE FUNCTION public.validate_user_notification_type()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.type NOT IN ('submission_approved', 'submission_rejected', 'report_reviewed', 'report_dismissed', 'place_updated') THEN
    RAISE EXCEPTION 'Invalid user notification type: %', NEW.type;
  END IF;
  RETURN NEW;
END;
$function$;