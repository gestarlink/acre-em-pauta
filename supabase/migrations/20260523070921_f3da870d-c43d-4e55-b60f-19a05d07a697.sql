
-- Enums
create type public.app_role as enum ('admin', 'editor', 'viewer');
create type public.post_status as enum ('rascunho', 'em_revisao', 'agendado', 'publicado');
create type public.source_type as enum ('rss', 'site', 'blog', 'portal', 'oficial', 'manual');
create type public.queue_status as enum ('novo', 'analisado', 'aprovado', 'descartado', 'reescrito', 'publicado');
create type public.ai_relevance as enum ('alta', 'media', 'baixa', 'descartavel', 'checagem');

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  avatar_url text,
  bio text,
  created_at timestamptz not null default now()
);

-- User roles (separate table for security)
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique(user_id, role)
);

-- Role check function
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists(select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.is_staff(_user_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists(select 1 from public.user_roles where user_id = _user_id and role in ('admin','editor'))
$$;

-- Auto-create profile + viewer role on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)));
  insert into public.user_roles (user_id, role) values (new.id, 'viewer');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Categories
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  color text,
  display_order int not null default 0,
  created_at timestamptz not null default now()
);

-- Sources
create table public.sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  url text not null,
  source_type source_type not null default 'site',
  category_id uuid references public.categories(id),
  frequency_minutes int not null default 60,
  active boolean not null default true,
  credibility int not null default 80,
  notes text,
  last_fetched_at timestamptz,
  created_at timestamptz not null default now()
);

-- Posts (notícias publicadas)
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  subtitle text,
  body text not null,
  excerpt text,
  cover_image_url text,
  category_id uuid references public.categories(id),
  author_id uuid references auth.users(id),
  author_name text,
  source_id uuid references public.sources(id),
  source_url text,
  status post_status not null default 'rascunho',
  tags text[] default '{}',
  meta_title text,
  meta_description text,
  is_breaking boolean not null default false,
  is_featured boolean not null default false,
  views_count int not null default 0,
  published_at timestamptz,
  scheduled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index posts_status_published_idx on public.posts(status, published_at desc);
create index posts_category_idx on public.posts(category_id, published_at desc);

-- AI news queue
create table public.ai_news_queue (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.sources(id) on delete set null,
  source_name text,
  original_title text not null,
  original_url text,
  original_summary text,
  original_image_url text,
  suggested_category_id uuid references public.categories(id),
  relevance ai_relevance,
  relevance_score int,
  urgency_score int,
  status queue_status not null default 'novo',
  fetched_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- AI analysis
create table public.ai_analysis (
  id uuid primary key default gen_random_uuid(),
  queue_item_id uuid references public.ai_news_queue(id) on delete cascade,
  local_relevance int,
  engagement_potential int,
  public_importance int,
  urgency int,
  fake_news_risk int,
  sensationalism int,
  suggested_category text,
  social_potential boolean,
  reasoning text,
  raw_response jsonb,
  created_at timestamptz not null default now()
);

-- Generated content (rewrite)
create table public.generated_rewrites (
  id uuid primary key default gen_random_uuid(),
  queue_item_id uuid references public.ai_news_queue(id) on delete cascade,
  title text,
  subtitle text,
  body text,
  excerpt text,
  tags text[],
  meta_title text,
  meta_description text,
  slug text,
  whatsapp_text text,
  instagram_caption text,
  telegram_text text,
  card_headline text,
  raw_response jsonb,
  created_at timestamptz not null default now()
);

-- Generated social posts
create table public.generated_social_posts (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.posts(id) on delete cascade,
  format text not null,
  headline text,
  body_text text,
  caption text,
  cta text,
  variant text,
  created_at timestamptz not null default now()
);

-- Generated video scripts
create table public.generated_video_scripts (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.posts(id) on delete cascade,
  title text,
  narration text,
  scenes jsonb,
  caption text,
  cover_suggestion text,
  created_at timestamptz not null default now()
);

-- Advertisers
create table public.advertisers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_email text,
  contact_phone text,
  created_at timestamptz not null default now()
);

-- Ads
create table public.ads (
  id uuid primary key default gen_random_uuid(),
  advertiser_id uuid references public.advertisers(id) on delete set null,
  name text not null,
  placement text not null,
  image_url text,
  link_url text,
  active boolean not null default true,
  start_at timestamptz,
  end_at timestamptz,
  created_at timestamptz not null default now()
);

-- Submitted tips (pautas recebidas)
create table public.submitted_tips (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  whatsapp text,
  email text,
  city text,
  neighborhood text,
  category_id uuid references public.categories(id),
  description text not null,
  media_url text,
  allow_contact boolean not null default true,
  status text not null default 'novo',
  created_at timestamptz not null default now()
);

-- Settings
create table public.settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

-- Post views log (simple counter)
create table public.post_views (
  id bigserial primary key,
  post_id uuid references public.posts(id) on delete cascade,
  viewed_at timestamptz not null default now()
);

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.categories enable row level security;
alter table public.sources enable row level security;
alter table public.posts enable row level security;
alter table public.ai_news_queue enable row level security;
alter table public.ai_analysis enable row level security;
alter table public.generated_rewrites enable row level security;
alter table public.generated_social_posts enable row level security;
alter table public.generated_video_scripts enable row level security;
alter table public.advertisers enable row level security;
alter table public.ads enable row level security;
alter table public.submitted_tips enable row level security;
alter table public.settings enable row level security;
alter table public.post_views enable row level security;

-- Public read policies
create policy "Categories são públicas" on public.categories for select using (true);
create policy "Posts publicados são públicos" on public.posts for select using (status = 'publicado' or public.is_staff(auth.uid()));
create policy "Ads ativos são públicos" on public.ads for select using (active = true or public.is_staff(auth.uid()));
create policy "Perfis públicos são visíveis" on public.profiles for select using (true);

-- Staff write policies
create policy "Staff gerencia categorias" on public.categories for all using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
create policy "Staff gerencia posts" on public.posts for all using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
create policy "Staff gerencia sources" on public.sources for all using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
create policy "Staff vê tudo na fila" on public.ai_news_queue for all using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
create policy "Staff vê análises" on public.ai_analysis for all using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
create policy "Staff vê rewrites" on public.generated_rewrites for all using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
create policy "Staff vê social posts" on public.generated_social_posts for all using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
create policy "Staff vê video scripts" on public.generated_video_scripts for all using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
create policy "Staff gerencia advertisers" on public.advertisers for all using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
create policy "Staff gerencia ads" on public.ads for all using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
create policy "Staff vê tips" on public.submitted_tips for all using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
create policy "Staff vê settings" on public.settings for all using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));
create policy "Staff vê views" on public.post_views for all using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

-- Tips: qualquer um pode enviar
create policy "Pública pode enviar pautas" on public.submitted_tips for insert with check (true);

-- Profiles: user vê/edita o próprio (além de leitura pública acima)
create policy "User atualiza próprio perfil" on public.profiles for update using (auth.uid() = id);

-- User roles
create policy "User vê próprios roles" on public.user_roles for select using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));
create policy "Admin gerencia roles" on public.user_roles for all using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- Seed categorias
insert into public.categories (slug, name, color, display_order) values
  ('politica','Política','#7c5e2a',1),
  ('cidades','Cidades','#3d6b3a',2),
  ('policia','Polícia','#8b2e2e',3),
  ('economia','Economia','#a07a1f',4),
  ('esporte','Esporte','#2c5f4f',5),
  ('cultura','Cultura','#9b6b3f',6),
  ('amazonia','Amazônia','#2f6b3c',7),
  ('opiniao','Opinião','#6b5a3d',8),
  ('videos','Vídeos','#5c4a2e',9),
  ('plantao','Plantão','#b54834',10);
