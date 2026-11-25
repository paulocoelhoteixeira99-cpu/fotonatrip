-- Add index on face_embeddings.photo_id
-- FK does NOT create index automatically in PostgreSQL
-- Without this, queries that JOIN/filter face_embeddings by photo_id
-- (e.g. event gallery page) do sequential scan on 28K+ rows per photo
CREATE INDEX IF NOT EXISTS face_embeddings_photo_id_idx
ON public.face_embeddings (photo_id);
