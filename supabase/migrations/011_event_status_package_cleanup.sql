-- Migration 011: Event status (active/inactive/scheduled), package pricing, auto-cleanup

-- 1. Add status column (replaces is_active)
ALTER TABLE events ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'
  CHECK (status IN ('active', 'inactive', 'scheduled'));

-- Migrate existing data from is_active
UPDATE events SET status = CASE WHEN is_active THEN 'active' ELSE 'inactive' END;

-- 2. Add scheduling and package pricing
ALTER TABLE events ADD COLUMN IF NOT EXISTS scheduled_at timestamptz;
ALTER TABLE events ADD COLUMN IF NOT EXISTS package_price_cents int;

-- 3. Update search function to use status + return package_price_cents
DROP FUNCTION IF EXISTS public.search_faces_by_embedding;

CREATE OR REPLACE FUNCTION public.search_faces_by_embedding(
  query_embedding vector(512),
  similarity_threshold float default 0.4,
  max_results int default 50,
  filter_event_id uuid default null
)
RETURNS TABLE (
  photo_id uuid,
  similarity float,
  storage_path text,
  watermark_path text,
  event_id uuid,
  event_title text,
  photographer_name text,
  price_cents int,
  package_price_cents int
)
LANGUAGE sql STABLE
AS $$
  SELECT
    p.id as photo_id,
    (1 - (fe.embedding <=> query_embedding))::float as similarity,
    p.storage_path,
    p.watermark_path,
    e.id as event_id,
    e.title as event_title,
    pr.full_name as photographer_name,
    p.price_cents,
    e.package_price_cents
  FROM public.face_embeddings fe
  JOIN public.photos p ON p.id = fe.photo_id
  JOIN public.events e ON e.id = p.event_id
  JOIN public.profiles pr ON pr.id = p.photographer_id
  WHERE 1 - (fe.embedding <=> query_embedding) > similarity_threshold
    AND p.status = 'ready'
    AND e.status = 'active'
    AND (filter_event_id IS NULL OR e.id = filter_event_id)
  ORDER BY similarity DESC
  LIMIT max_results;
$$;

GRANT EXECUTE ON FUNCTION public.search_faces_by_embedding TO anon, authenticated;
