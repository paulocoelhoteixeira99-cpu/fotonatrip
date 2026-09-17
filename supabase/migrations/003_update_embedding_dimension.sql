-- Drop existing index and column, recreate with 128 dimensions for face-api.js
drop index if exists face_embeddings_embedding_idx;
alter table public.face_embeddings drop column if exists embedding;
alter table public.face_embeddings add column embedding vector(128) not null;

-- Recreate index for 128 dimensions
create index on public.face_embeddings
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);
