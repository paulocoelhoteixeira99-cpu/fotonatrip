-- Migration 014: Auto-activate scheduled events via RPC
-- Called from client pages to activate events whose scheduled_at has passed

CREATE OR REPLACE FUNCTION public.activate_scheduled_events()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE events
  SET status = 'active', scheduled_at = NULL
  WHERE status = 'scheduled'
  AND scheduled_at <= now();
$$;

GRANT EXECUTE ON FUNCTION public.activate_scheduled_events TO anon, authenticated;
