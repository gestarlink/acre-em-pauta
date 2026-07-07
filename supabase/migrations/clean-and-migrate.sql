-- ============================================================
-- LIMPEZA + MIGRAÇÃO COMPLETA - Acre em Pauta
-- Isso APAGA e RECRIA todos os objetos do zero
-- ============================================================

-- 0. Drop functions e triggers que dependem dos tipos
drop function if exists public.handle_new_user() cascade;
drop function if exists public.is_staff(uuid) cascade;
drop function if exists public.has_role(uuid, public.app_role) cascade;

-- 1. Drop enums (CASCADE derruba tudo que depende deles)
drop type if exists public.ai_relevance cascade;
drop type if exists public.queue_status cascade;
drop type if exists public.source_type cascade;
drop type if exists public.post_status cascade;
drop type if exists public.app_role cascade;

-- 2. Enums (recriados)
create type public.app_role as enum ('admin', 'editor', 'viewer');
create type public.post_status as enum ('rascunho', 'em_revisao', 'agendado', 'publicado');
create type public.source_type as enum ('rss', 'site', 'blog', 'portal', 'oficial', 'manual');
create type public.queue_status as enum ('novo', 'analisado', 'aprovado', 'descartado', 'reescrito', 'publicado');
create type public.ai_relevance as enum ('alta', 'media', 'baixa', 'descartavel', 'checagem');

-- 3. Drop tabelas (para recriar do zero com CREATE IF NOT EXISTS)
drop table if exists public.push_subscriptions cascade;
drop table if exists public.post_views cascade;
drop table if exists public.generated_video_scripts cascade;
drop table if exists public.generated_social_posts cascade;
drop table if exists public.generated_rewrites cascade;
drop table if exists public.ai_analysis cascade;
drop table if exists public.ai_news_queue cascade;
drop table if exists public.ads cascade;
drop table if exists public.advertisers cascade;
drop table if exists public.submitted_tips cascade;
drop table if exists public.settings cascade;
drop table if exists public.posts cascade;
drop table if exists public.sources cascade;
drop table if exists public.categories cascade;
drop table if exists public.user_roles cascade;
drop table if exists public.profiles cascade;

-- 4. Tabelas
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  avatar_url text,
  bio text,
  created_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique(user_id, role)
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  color text,
  display_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.sources (
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

create table if not exists public.posts (
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

create index if not exists posts_status_published_idx on public.posts(status, published_at desc);
create index if not exists posts_category_idx on public.posts(category_id, published_at desc);

create table if not exists public.ai_news_queue (
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

create table if not exists public.ai_analysis (
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

create table if not exists public.generated_rewrites (
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

create table if not exists public.generated_social_posts (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.posts(id) on delete cascade,
  format text not null,
  headline text,
  body_text text,
  caption text,
  cta text,
  variant text,
  image_url text,
  video_url text,
  image_prompt text,
  created_at timestamptz not null default now()
);

create table if not exists public.generated_video_scripts (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.posts(id) on delete cascade,
  title text,
  narration text,
  scenes jsonb,
  caption text,
  cover_suggestion text,
  created_at timestamptz not null default now()
);

create table if not exists public.advertisers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_email text,
  contact_phone text,
  created_at timestamptz not null default now()
);

create table if not exists public.ads (
  id uuid primary key default gen_random_uuid(),
  advertiser_id uuid references public.advertisers(id) on delete set null,
  name text not null,
  placement text not null,
  image_url text,
  image_url_mobile text,
  link_url text,
  active boolean not null default true,
  start_at timestamptz,
  end_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.submitted_tips (
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

create table if not exists public.settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.post_views (
  id bigserial primary key,
  post_id uuid references public.posts(id) on delete cascade,
  viewed_at timestamptz not null default now()
);

create table if not exists public.push_subscriptions (
  id uuid not null default gen_random_uuid() primary key,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

-- 5. Functions
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

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  has_admin boolean;
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)));

  select exists(select 1 from public.user_roles where role = 'admin') into has_admin;

  if has_admin then
    insert into public.user_roles (user_id, role) values (new.id, 'viewer');
  else
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
    insert into public.user_roles (user_id, role) values (new.id, 'editor');
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 6. Revoke
revoke execute on function public.has_role(uuid, public.app_role) from public, anon, authenticated;
revoke execute on function public.is_staff(uuid) from public, anon, authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- 7. RLS
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
alter table public.push_subscriptions enable row level security;

-- 8. Policies
drop policy if exists "Categorias publicas" on public.categories;
create policy "Categorias publicas" on public.categories for select using (true);

drop policy if exists "Posts publicados sao publicos" on public.posts;
create policy "Posts publicados sao publicos" on public.posts for select using (status = 'publicado' or public.is_staff(auth.uid()));

drop policy if exists "Ads ativos sao publicos" on public.ads;
create policy "Ads ativos sao publicos" on public.ads for select using (active = true or public.is_staff(auth.uid()));

drop policy if exists "User ve proprio perfil" on public.profiles;
create policy "User ve proprio perfil" on public.profiles for select using (auth.uid() = id or public.is_staff(auth.uid()));

drop policy if exists "User ve proprios roles" on public.user_roles;
create policy "User ve proprios roles" on public.user_roles for select using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));

drop policy if exists "Staff gerencia categorias" on public.categories;
create policy "Staff gerencia categorias" on public.categories for all using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

drop policy if exists "Staff gerencia posts" on public.posts;
create policy "Staff gerencia posts" on public.posts for all using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

drop policy if exists "Staff gerencia sources" on public.sources;
create policy "Staff gerencia sources" on public.sources for all using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

drop policy if exists "Staff ve tudo na fila" on public.ai_news_queue;
create policy "Staff ve tudo na fila" on public.ai_news_queue for all using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

drop policy if exists "Staff ve analises" on public.ai_analysis;
create policy "Staff ve analises" on public.ai_analysis for all using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

drop policy if exists "Staff ve rewrites" on public.generated_rewrites;
create policy "Staff ve rewrites" on public.generated_rewrites for all using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

drop policy if exists "Staff ve social posts" on public.generated_social_posts;
create policy "Staff ve social posts" on public.generated_social_posts for all using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

drop policy if exists "Staff ve video scripts" on public.generated_video_scripts;
create policy "Staff ve video scripts" on public.generated_video_scripts for all using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

drop policy if exists "Staff gerencia advertisers" on public.advertisers;
create policy "Staff gerencia advertisers" on public.advertisers for all using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

drop policy if exists "Staff gerencia ads" on public.ads;
create policy "Staff gerencia ads" on public.ads for all using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

drop policy if exists "Staff ve tips" on public.submitted_tips;
create policy "Staff ve tips" on public.submitted_tips for all using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

drop policy if exists "Staff ve settings" on public.settings;
create policy "Staff ve settings" on public.settings for all using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

drop policy if exists "Staff ve views" on public.post_views;
create policy "Staff ve views" on public.post_views for all using (public.is_staff(auth.uid())) with check (public.is_staff(auth.uid()));

drop policy if exists "Staff gerencia subscriptions" on public.push_subscriptions;
create policy "Staff gerencia subscriptions" on public.push_subscriptions for all using (is_staff(auth.uid())) with check (is_staff(auth.uid()));

drop policy if exists "Admin gerencia roles" on public.user_roles;
create policy "Admin gerencia roles" on public.user_roles for all using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

drop policy if exists "Publica pode enviar pautas" on public.submitted_tips;
create policy "Publica pode enviar pautas" on public.submitted_tips for insert with check (true);

drop policy if exists "Qualquer um registra view" on public.post_views;
create policy "Qualquer um registra view" on public.post_views for insert with check (post_id is not null);

drop policy if exists "Qualquer um pode se inscrever push" on public.push_subscriptions;
create policy "Qualquer um pode se inscrever push" on public.push_subscriptions for insert with check (true);

drop policy if exists "User atualiza proprio perfil" on public.profiles;
create policy "User atualiza proprio perfil" on public.profiles for update using (auth.uid() = id);

-- 9. Grants
grant insert on public.post_views to anon, authenticated;
grant usage, select on sequence public.post_views_id_seq to anon, authenticated;
grant insert on public.push_subscriptions to anon;
grant insert on public.push_subscriptions to authenticated;
grant all on public.push_subscriptions to service_role;

-- 10. Storage bucket
insert into storage.buckets (id, name, public)
values ('social-media', 'social-media', true)
on conflict (id) do nothing;

drop policy if exists "Social media publicamente visivel" on storage.objects;
create policy "Social media publicamente visivel"
on storage.objects for select
using (bucket_id = 'social-media');

drop policy if exists "Staff gerencia social-media" on storage.objects;
create policy "Staff gerencia social-media"
on storage.objects for all
using (bucket_id = 'social-media' and public.is_staff(auth.uid()))
with check (bucket_id = 'social-media' and public.is_staff(auth.uid()));

-- 11. Seed categories
insert into public.categories (slug, name, color, display_order) values
  ('politica','Politica','#7c5e2a',1),
  ('cidades','Cidades','#3d6b3a',2),
  ('policia','Policia','#8b2e2e',3),
  ('economia','Economia','#a07a1f',4),
  ('esporte','Esporte','#2c5f4f',5),
  ('cultura','Cultura','#9b6b3f',6),
  ('amazonia','Amazonia','#2f6b3c',7),
  ('opiniao','Opiniao','#6b5a3d',8),
  ('videos','Videos','#5c4a2e',9),
  ('plantao','Plantao','#b54834',10)
on conflict (slug) do nothing;
