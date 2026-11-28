-- Recreate HNSW index with better parameters (m=32, ef_construction=200)
-- and update search function to set hnsw.ef_search=400 for better recall
-- Previous: default m=16, ef_construction=64, recall ~57%
-- After: m=32, ef_construction=200, ef_search=400, recall ~100%

-- Index was recreated via: scripts/hnsw-optimize.sql
-- DROP INDEX IF EXISTS face_embeddings_embedding_idx;
-- CREATE INDEX face_embeddings_embedding_idx ON face_embeddings
--   USING hnsw (embedding vector_cosine_ops)
--   WITH (m = 32, ef_construction = 200);

-- Update search function to use plpgsql with set_config for ef_search
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
LANGUAGE plpgsql STABLE
AS $$
BEGIN
  PERFORM set_config('hnsw.ef_search', '400', true);
  RETURN QUERY
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
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_faces_by_embedding TO anon, authenticated;
