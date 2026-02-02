
-- =====================================================================================
-- INITIALISATION SUPABASE - PIXEL EN ROUTE (PROD)
-- Auteur: Senior Architect
-- Objectif: Stockage persistant sécurisé pour toute l'application
-- =====================================================================================

-- 1. ACTIVATION DES EXTENSIONS
create extension if not exists "uuid-ossp";
create extension if not exists "vector"; -- Pour le futur RAG

-- 2. TABLE UTILISATEURS (PROFILES)
-- Étend la table auth.users de Supabase
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  name text,
  avatar_url text,
  role text default 'COLLABORATOR', -- 'ADMIN', 'COLLABORATOR', 'VIEWER'
  allowed_views text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Trigger pour créer le profil automatiquement à l'inscription
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, name, role)
  values (new.id, new.email, new.raw_user_meta_data->>'name', 'COLLABORATOR');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 3. TABLE SYSTEM SETTINGS (Configuration globale)
create table public.system_settings (
  id uuid default uuid_generate_v4() primary key,
  config jsonb not null default '{}'::jsonb, -- Stocke tout l'objet SystemSettings
  updated_at timestamptz default now(),
  updated_by uuid references auth.users(id)
);

-- Insérer une config par défaut si vide
insert into public.system_settings (config) 
select '{"appMode": "production", "branding": {"name": "Pixel En Route"}}'::jsonb
where not exists (select 1 from public.system_settings);

-- 4. TABLE CLIENTS
create table public.clients (
  id uuid default uuid_generate_v4() primary key,
  notion_page_id text unique, -- Gardé pour compatibilité legacy
  spreadsheet_row integer,
  name text not null,
  company_name text,
  email text,
  lead_status text default 'Lead',
  service_type text,
  contact_date date,
  is_contacted boolean default false,
  comments text,
  postal_address text,
  youtube_channel text,
  instagram_account text,
  is_archived boolean default false,
  last_synced_at timestamptz default now(),
  created_at timestamptz default now(),
  user_id uuid references auth.users(id) -- Propriétaire/Créateur
);

-- 5. TABLE PROJECTS
create table public.projects (
  id uuid default uuid_generate_v4() primary key,
  client_id uuid references public.clients(id) on delete cascade,
  title text not null,
  status text default 'À faire',
  type text default 'Autre',
  price numeric(10, 2),
  start_date date,
  end_date date,
  delivery_url text,
  raw_files_url text,
  comments text,
  notion_page_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 6. TABLE INVOICES (Factures)
create table public.invoices (
  id uuid default uuid_generate_v4() primary key,
  number text not null unique,
  client_id uuid references public.clients(id),
  amount_ht numeric(10, 2) not null,
  status text default 'draft', -- draft, sent, paid, overdue
  items jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  due_date date
);

-- 7. TABLE CONTRACTS
create table public.contracts (
  id uuid default uuid_generate_v4() primary key,
  client_id uuid references public.clients(id),
  template_id text,
  content_snapshot text,
  status text default 'DRAFT', -- DRAFT, SIGNED, ARCHIVED
  created_at timestamptz default now(),
  signed_at timestamptz
);

-- 8. TABLE MEDIA_GENERATIONS (Historique IA)
create table public.media_generations (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id),
  job_id text,
  type text not null, -- image, video
  prompt text,
  public_url text,
  thumbnail_url text,
  width integer,
  height integer,
  duration integer,
  tags text[],
  is_favorite boolean default false,
  created_at timestamptz default now()
);

-- 9. TABLE AUDIT_LOGS (Sécurité & Traçabilité)
create table public.audit_logs (
  id uuid default uuid_generate_v4() primary key,
  actor_id uuid references auth.users(id),
  actor_name text,
  action text not null,
  target_id text,
  metadata jsonb,
  level text default 'info',
  created_at timestamptz default now()
);

-- =====================================================================================
-- SECURITÉ RLS (Row Level Security)
-- =====================================================================================

alter table public.profiles enable row level security;
alter table public.system_settings enable row level security;
alter table public.clients enable row level security;
alter table public.projects enable row level security;
alter table public.invoices enable row level security;
alter table public.contracts enable row level security;
alter table public.media_generations enable row level security;
alter table public.audit_logs enable row level security;

-- POLITIQUES (Simple: Tout utilisateur authentifié peut lire/écrire pour l'instant)
-- En production multi-tenant, il faudrait filtrer par 'organization_id'.

create policy "Users can read all profiles" on public.profiles for select using (auth.role() = 'authenticated');
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

create policy "Auth users can read settings" on public.system_settings for select using (auth.role() = 'authenticated');
create policy "Auth users can update settings" on public.system_settings for update using (auth.role() = 'authenticated');

create policy "Auth users access clients" on public.clients for all using (auth.role() = 'authenticated');
create policy "Auth users access projects" on public.projects for all using (auth.role() = 'authenticated');
create policy "Auth users access invoices" on public.invoices for all using (auth.role() = 'authenticated');
create policy "Auth users access contracts" on public.contracts for all using (auth.role() = 'authenticated');
create policy "Auth users access media" on public.media_generations for all using (auth.role() = 'authenticated');

create policy "Auth users can read logs" on public.audit_logs for select using (auth.role() = 'authenticated');
create policy "Auth users can insert logs" on public.audit_logs for insert with check (auth.role() = 'authenticated');

-- =====================================================================================
-- STOCKAGE (STORAGE BUCKETS)
-- =====================================================================================
-- Nécessite d'activer le Storage dans le dashboard Supabase.
-- Bucket 'assets' pour les images/vidéos générées.
insert into storage.buckets (id, name, public) values ('assets', 'assets', true)
on conflict do nothing;

create policy "Public Access Assets" on storage.objects for select using ( bucket_id = 'assets' );
create policy "Auth Upload Assets" on storage.objects for insert with check ( bucket_id = 'assets' and auth.role() = 'authenticated' );
