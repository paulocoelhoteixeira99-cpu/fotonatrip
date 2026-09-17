-- Enable pgvector extension for facial embeddings
create extension if not exists vector;

-- Profiles (extends Supabase Auth users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  avatar_url text,
  role text not null default 'client' check (role in ('client', 'photographer', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone"
  on public.profiles for select using (true);

create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);

-- Photographers (extra info for photographer users)
create table public.photographers (
  id uuid references public.profiles on delete cascade primary key,
  business_name text,
  bio text,
  phone text,
  city text,
  state text,
  mercado_pago_id text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.photographers enable row level security;

create policy "Photographers are viewable by everyone"
  on public.photographers for select using (true);

create policy "Photographers can update own data"
  on public.photographers for update using (auth.uid() = id);

create policy "Photographers can insert own data"
  on public.photographers for insert with check (auth.uid() = id);

-- Events
create table public.events (
  id uuid default gen_random_uuid() primary key,
  photographer_id uuid references public.photographers on delete cascade not null,
  title text not null,
  description text,
  location text,
  city text,
  state text,
  event_date date,
  cover_url text,
  is_active boolean not null default true,
  photo_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.events enable row level security;

create policy "Events are viewable by everyone"
  on public.events for select using (true);

create policy "Photographers can manage own events"
  on public.events for all using (auth.uid() = photographer_id);

-- Photos
create table public.photos (
  id uuid default gen_random_uuid() primary key,
  event_id uuid references public.events on delete cascade not null,
  photographer_id uuid references public.photographers on delete cascade not null,
  storage_path text not null,
  thumbnail_path text,
  watermark_path text,
  original_filename text,
  width int,
  height int,
  file_size bigint,
  price_cents int not null default 1500,
  status text not null default 'processing' check (status in ('processing', 'ready', 'failed')),
  processed_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.photos enable row level security;

create policy "Photos are viewable by everyone"
  on public.photos for select using (true);

create policy "Photographers can manage own photos"
  on public.photos for all using (auth.uid() = photographer_id);

-- Face embeddings (for facial recognition search)
create table public.face_embeddings (
  id uuid default gen_random_uuid() primary key,
  photo_id uuid references public.photos on delete cascade not null,
  embedding vector(512) not null,
  bbox_x float,
  bbox_y float,
  bbox_w float,
  bbox_h float,
  created_at timestamptz not null default now()
);

alter table public.face_embeddings enable row level security;

create policy "Face embeddings are searchable by everyone"
  on public.face_embeddings for select using (true);

-- Index for fast similarity search
create index on public.face_embeddings
  using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- Orders
create table public.orders (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references public.profiles on delete set null,
  client_email text not null,
  status text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'refunded')),
  total_cents int not null default 0,
  platform_fee_cents int not null default 0,
  payment_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.orders enable row level security;

create policy "Users can view own orders"
  on public.orders for select using (auth.uid() = client_id);

-- Order items
create table public.order_items (
  id uuid default gen_random_uuid() primary key,
  order_id uuid references public.orders on delete cascade not null,
  photo_id uuid references public.photos on delete set null not null,
  photographer_id uuid references public.photographers on delete set null not null,
  price_cents int not null,
  created_at timestamptz not null default now()
);

alter table public.order_items enable row level security;

create policy "Users can view own order items"
  on public.order_items for select using (
    exists (
      select 1 from public.orders
      where orders.id = order_items.order_id
      and orders.client_id = auth.uid()
    )
  );

create policy "Photographers can view their sold items"
  on public.order_items for select using (auth.uid() = photographer_id);

-- Function to auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'role', 'client')
  );

  -- If photographer, also create photographer record
  if coalesce(new.raw_user_meta_data->>'role', 'client') = 'photographer' then
    insert into public.photographers (id)
    values (new.id);
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- Trigger on auth.users
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Function to update photo_count on events
create or replace function public.update_event_photo_count()
returns trigger as $$
begin
  if TG_OP = 'INSERT' then
    update public.events set photo_count = photo_count + 1 where id = NEW.event_id;
  elsif TG_OP = 'DELETE' then
    update public.events set photo_count = photo_count - 1 where id = OLD.event_id;
  end if;
  return null;
end;
$$ language plpgsql security definer;

create trigger on_photo_change
  after insert or delete on public.photos
  for each row execute procedure public.update_event_photo_count();
