-- Update search function to return watermark_path
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
  watermark_path text,
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
    p.watermark_path,
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

grant execute on function public.search_faces_by_embedding to anon, authenticated;
