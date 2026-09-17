-- Drop ivfflat index (requires minimum rows, bad for testing)
drop index if exists face_embeddings_embedding_idx;

-- Use hnsw index instead (works with any number of rows)
create index face_embeddings_embedding_idx on public.face_embeddings
  using hnsw (embedding vector_cosine_ops);

-- Recreate search function with proper types
drop function if exists public.search_faces_by_embedding;

create or replace function public.search_faces_by_embedding(
  query_embedding vector(128),
  similarity_threshold float default 0.5,
  max_results int default 50
)
returns table (
  photo_id uuid,
  similarity float,
  storage_path text,
  event_id uuid,
  event_title text,
  photographer_name text,
  price_cents int
)
language sql stable
as $$
  select
    p.id as photo_id,
    (1 - (fe.embedding <=> query_embedding))::float as similarity,
    p.storage_path,
    e.id as event_id,
    e.title as event_title,
    pr.full_name as photographer_name,
    p.price_cents
  from public.face_embeddings fe
  join public.photos p on p.id = fe.photo_id
  join public.events e on e.id = p.event_id
  join public.profiles pr on pr.id = p.photographer_id
  where 1 - (fe.embedding <=> query_embedding) > similarity_threshold
    and p.status = 'ready'
    and e.is_active = true
  order by similarity desc
  limit max_results;
$$;

-- Allow anyone to call the search function
grant execute on function public.search_faces_by_embedding to anon, authenticated;

-- Also ensure face_embeddings insert policy exists for authenticated users
do $$
begin
  if not exists (
    select 1 from pg_policies where tablename = 'face_embeddings' and policyname = 'Authenticated users can insert embeddings'
  ) then
    create policy "Authenticated users can insert embeddings"
      on public.face_embeddings for insert
      to authenticated
      with check (true);
  end if;
end $$;
