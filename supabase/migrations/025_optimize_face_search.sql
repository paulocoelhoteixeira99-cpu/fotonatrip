-- Optimize search_faces_by_embedding to use HNSW index
-- Previous version did ORDER BY alias (similarity DESC) which prevented HNSW usage
-- New version uses CTE with ORDER BY embedding <=> query_embedding to force index scan
-- Also reduces JOINs in the hot path and avoids computing distance twice

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
  WITH candidates AS (
    SELECT
      fe.photo_id,
      fe.embedding <=> query_embedding AS distance
    FROM public.face_embeddings fe
    JOIN public.photos p ON p.id = fe.photo_id
    WHERE p.status = 'ready'
      AND (filter_event_id IS NULL OR p.event_id = filter_event_id)
    ORDER BY fe.embedding <=> query_embedding
    LIMIT 500
  )
  SELECT
    c.photo_id,
    (1 - c.distance)::float AS similarity,
    p.storage_path,
    p.watermark_path,
    e.id AS event_id,
    e.title AS event_title,
    pr.full_name AS photographer_name,
    p.price_cents,
    e.package_price_cents
  FROM candidates c
  JOIN public.photos p ON p.id = c.photo_id
  JOIN public.events e ON e.id = p.event_id
  JOIN public.profiles pr ON pr.id = p.photographer_id
  WHERE (1 - c.distance) > similarity_threshold
    AND e.status = 'active'
  ORDER BY c.distance
  LIMIT max_results;
$$;

GRANT EXECUTE ON FUNCTION public.search_faces_by_embedding TO anon, authenticated;
