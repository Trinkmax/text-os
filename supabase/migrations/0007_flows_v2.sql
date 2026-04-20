-- =========================================================================
-- 0007_flows_v2.sql
-- Rediseño del módulo Flujos: autosave + versioning + simulador persistido.
-- Migración ADITIVA — no rompe tipos ni filas existentes.
-- =========================================================================

-- ---------------- textos_flows: nuevas columnas -------------------------
alter table public.textos_flows
  add column if not exists version int not null default 1,
  add column if not exists published_version_id uuid,
  add column if not exists viewport jsonb not null default '{"x":0,"y":0,"zoom":1}'::jsonb,
  add column if not exists archived_at timestamptz;

-- Sólo un flujo activo (no archivado) por org.
-- Si hoy hay múltiples rows active=true (improbable), este index falla al crearse.
-- Para estar seguros en instalaciones con data legacy, desactivamos duplicados primero.
do $$
begin
  update public.textos_flows f
  set active = false
  where active = true
    and exists (
      select 1
      from public.textos_flows f2
      where f2.org_id = f.org_id
        and f2.active = true
        and f2.created_at > f.created_at
    );
end $$;

create unique index if not exists textos_flows_one_active_per_org
  on public.textos_flows(org_id)
  where active = true and archived_at is null;

create index if not exists textos_flows_org_updated_idx
  on public.textos_flows(org_id, updated_at desc);

-- ---------------- textos_flow_versions ----------------------------------
-- Snapshots inmutables publicados. La pipeline runtime SIEMPRE lee la
-- versión publicada, nunca el draft de textos_flows.{nodes,edges}.
create table if not exists public.textos_flow_versions (
  id uuid primary key default gen_random_uuid(),
  flow_id uuid not null references public.textos_flows(id) on delete cascade,
  org_id uuid not null references public.textos_orgs(id) on delete cascade,
  version int not null,
  nodes jsonb not null default '[]'::jsonb,
  edges jsonb not null default '[]'::jsonb,
  viewport jsonb not null default '{"x":0,"y":0,"zoom":1}'::jsonb,
  note text,
  published_by uuid,
  published_at timestamptz default now(),
  unique (flow_id, version)
);
create index if not exists textos_flow_versions_flow_idx
  on public.textos_flow_versions(flow_id, version desc);
create index if not exists textos_flow_versions_org_idx
  on public.textos_flow_versions(org_id, published_at desc);

-- FK de published_version_id después de crear la tabla (circular safe).
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public'
      and table_name = 'textos_flows'
      and constraint_name = 'textos_flows_published_version_fk'
  ) then
    alter table public.textos_flows
      add constraint textos_flows_published_version_fk
      foreign key (published_version_id)
      references public.textos_flow_versions(id)
      on delete set null;
  end if;
end $$;

-- ---------------- textos_flow_sim_runs ----------------------------------
-- Transcripts del simulador para replay/debug. No afecta producción.
create table if not exists public.textos_flow_sim_runs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.textos_orgs(id) on delete cascade,
  flow_id uuid not null references public.textos_flows(id) on delete cascade,
  version int,
  current_node_id text,
  variables jsonb not null default '{}'::jsonb,
  transcript jsonb not null default '[]'::jsonb,
  ended_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists textos_flow_sim_runs_flow_idx
  on public.textos_flow_sim_runs(flow_id, created_at desc);
create index if not exists textos_flow_sim_runs_org_idx
  on public.textos_flow_sim_runs(org_id, created_at desc);

-- ---------------- RLS ---------------------------------------------------
alter table public.textos_flow_versions enable row level security;
alter table public.textos_flow_sim_runs enable row level security;

-- Policies: mismo patrón permisivo que el schema 0001 (RLS permisiva hasta
-- que producción lo endurezca — aislamiento real vía org_id en actions).
do $$
declare t text;
begin
  for t in values ('textos_flow_versions'), ('textos_flow_sim_runs')
  loop
    execute format('drop policy if exists %I on public.%I', t || '_anon_all', t);
    execute format(
      'create policy %I on public.%I for all to anon using (true) with check (true)',
      t || '_anon_all', t
    );
    execute format('drop policy if exists %I on public.%I', t || '_auth_all', t);
    execute format(
      'create policy %I on public.%I for all to authenticated using (true) with check (true)',
      t || '_auth_all', t
    );
  end loop;
end $$;

-- ---------------- Triggers updated_at -----------------------------------
drop trigger if exists textos_flow_sim_runs_touch on public.textos_flow_sim_runs;
create trigger textos_flow_sim_runs_touch
  before update on public.textos_flow_sim_runs
  for each row execute function public.textos_set_updated_at();

-- ---------------- Realtime opcional (P2: presence multi-usuario) --------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'textos_flows'
  ) then
    alter publication supabase_realtime add table
      public.textos_flows,
      public.textos_flow_versions;
  end if;
end $$;
