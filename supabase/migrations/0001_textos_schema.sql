-- =========================================================================
-- TextOS — Complete database schema
-- =========================================================================
-- Este archivo crea TODA la estructura que TextOS necesita en un proyecto
-- Supabase limpio. Se puede ejecutar tal cual desde el MCP de Supabase o
-- desde el SQL editor. Es idempotente: se puede correr más de una vez sin
-- romper nada existente.
--
-- Diseñado para: Postgres 15+, Supabase con auth.users y publicación
-- `supabase_realtime` (default).
--
-- Todas las tablas viven en `public` con prefijo `textos_` para poder
-- convivir con otras apps si hace falta. El cliente (@supabase/ssr) las
-- consume sin configuración adicional.
-- =========================================================================

create extension if not exists "pgcrypto";

-- -------------------------------------------------------------------------
-- 1. ORGS (tenant root + AI config combinados)
-- -------------------------------------------------------------------------
create table if not exists public.textos_orgs (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid,
  name text not null,
  logo_url text,
  industry text,
  owner_display_name text,
  tagline text,
  tone text default 'casual',
  timezone text default 'America/Argentina/Buenos_Aires',
  languages text[] default array['es'],
  never_promise text[] default '{}',
  must_escalate text[] default '{}',
  business_hours jsonb default '{}'::jsonb,
  threshold_auto numeric default 0.85,     -- >= => IA auto-envía (verde)
  threshold_suggest numeric default 0.55,  -- >= => IA sugiere (amber); < => humano (rojo)
  shadow_mode boolean default false,
  demo boolean default false,
  onboarding_completed boolean default false,
  onboarding_data jsonb default '{}'::jsonb,
  coverage_estimate numeric default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- -------------------------------------------------------------------------
-- 2. ORG MEMBERS (multi-user por org)
-- -------------------------------------------------------------------------
create table if not exists public.textos_org_members (
  org_id uuid not null references public.textos_orgs(id) on delete cascade,
  user_id uuid not null,
  role text not null default 'admin' check (role in ('admin','agent','readonly')),
  created_at timestamptz default now(),
  primary key (org_id, user_id)
);

-- -------------------------------------------------------------------------
-- 3. CHANNELS conectados (WhatsApp, Instagram, etc.)
-- -------------------------------------------------------------------------
create table if not exists public.textos_channels (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.textos_orgs(id) on delete cascade,
  type text not null check (type in ('whatsapp','instagram','messenger','email','webchat')),
  status text not null default 'pending' check (status in ('connected','pending','disconnected')),
  label text,
  created_at timestamptz default now()
);

-- -------------------------------------------------------------------------
-- 4. STAGES (columnas del kanban CRM, ordenadas por org)
-- -------------------------------------------------------------------------
create table if not exists public.textos_stages (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.textos_orgs(id) on delete cascade,
  name text not null,
  color text default '#64748B',
  position int not null default 0,
  created_at timestamptz default now(),
  unique(org_id, name)
);

-- -------------------------------------------------------------------------
-- 5. TAG CATALOG (tags reutilizables por org)
-- -------------------------------------------------------------------------
create table if not exists public.textos_tag_catalog (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.textos_orgs(id) on delete cascade,
  name text not null,
  color text default '#64748B',
  created_at timestamptz default now(),
  unique(org_id, name)
);

-- -------------------------------------------------------------------------
-- 6. CONTACTS (leads / clientes del CRM)
-- -------------------------------------------------------------------------
create table if not exists public.textos_contacts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.textos_orgs(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  avatar_url text,
  channel text,                         -- canal principal donde llegó
  stage text default 'Nuevo lead',
  tags text[] default '{}',
  value numeric default 0,              -- valor estimado del contacto
  source text,
  owner_user_id uuid,
  last_interaction_at timestamptz,
  notes text,
  custom jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- -------------------------------------------------------------------------
-- 7. CONVERSATIONS (hilo uno por contacto+canal)
-- -------------------------------------------------------------------------
create table if not exists public.textos_conversations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.textos_orgs(id) on delete cascade,
  contact_id uuid references public.textos_contacts(id) on delete cascade,
  channel text,
  last_message text,
  last_message_at timestamptz,
  unread_count int default 0,
  semaphore text default 'amber' check (semaphore in ('green','amber','red')),
  ai_mode text default 'suggest' check (ai_mode in ('auto','suggest','off')),
  assigned_to uuid,
  status text default 'open' check (status in ('open','closed','snoozed')),
  snooze_until timestamptz,
  current_flow_node text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- -------------------------------------------------------------------------
-- 8. MESSAGES (uno por mensaje in/out)
-- -------------------------------------------------------------------------
create table if not exists public.textos_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.textos_conversations(id) on delete cascade,
  org_id uuid not null references public.textos_orgs(id) on delete cascade,
  direction text not null check (direction in ('in','out')),
  author text not null default 'contact' check (author in ('contact','human','ai','system')),
  body text not null,
  attachments jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

-- -------------------------------------------------------------------------
-- 9. SUGGESTIONS (alimenta la Bandeja Swipe)
-- -------------------------------------------------------------------------
create table if not exists public.textos_suggestions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.textos_orgs(id) on delete cascade,
  conversation_id uuid not null references public.textos_conversations(id) on delete cascade,
  message_id uuid references public.textos_messages(id) on delete cascade,
  proposed_text text,
  confidence numeric default 0,                    -- 0..1
  semaphore text not null default 'amber' check (semaphore in ('green','amber','red')),
  reason text,                                     -- explicación en lenguaje humano
  status text not null default 'pending' check (status in (
    'pending','sent','auto_sent','dismissed','escalated','snoozed','scope_gap_learned'
  )),
  resolved_at timestamptz,
  snooze_until timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- -------------------------------------------------------------------------
-- 10. KNOWLEDGE CARDS (memoria visible de la IA)
-- -------------------------------------------------------------------------
create table if not exists public.textos_knowledge_cards (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.textos_orgs(id) on delete cascade,
  topic text not null,
  question text not null,
  variants text[] default '{}',
  answer text not null,
  confidence numeric default 0.6,
  origin text not null default 'manual' check (origin in ('onboarding','learned','manual')),
  usage_count int default 0,
  needs_review boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- -------------------------------------------------------------------------
-- 11. SCOPE GAPS (temas recurrentes sin respuesta, para "enseñar" a la IA)
-- -------------------------------------------------------------------------
create table if not exists public.textos_scope_gaps (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.textos_orgs(id) on delete cascade,
  topic text not null,
  sample_question text,
  count int default 1,
  last_seen timestamptz default now(),
  resolved_card_id uuid references public.textos_knowledge_cards(id),
  created_at timestamptz default now()
);

-- -------------------------------------------------------------------------
-- 12. FLOWS (workflow builder visual: nodos + edges en JSONB)
-- -------------------------------------------------------------------------
create table if not exists public.textos_flows (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.textos_orgs(id) on delete cascade,
  name text not null,
  description text,
  active boolean default false,
  nodes jsonb default '[]'::jsonb,
  edges jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- -------------------------------------------------------------------------
-- 13. CAMPAIGNS (broadcasts)
-- -------------------------------------------------------------------------
create table if not exists public.textos_campaigns (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.textos_orgs(id) on delete cascade,
  name text not null,
  status text default 'draft' check (status in ('draft','scheduled','sending','completed','paused')),
  audience jsonb default '{}'::jsonb,
  message text,
  scheduled_at timestamptz,
  recurrence text,
  stats jsonb default '{"delivered":0,"read":0,"replied":0}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- -------------------------------------------------------------------------
-- 14. ALERTS (reglas if-this-then-notify)
-- -------------------------------------------------------------------------
create table if not exists public.textos_alerts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.textos_orgs(id) on delete cascade,
  name text,
  condition jsonb default '{}'::jsonb,
  notify jsonb default '{}'::jsonb,
  enabled boolean default true,
  created_at timestamptz default now()
);

-- -------------------------------------------------------------------------
-- 15. AUTOSEND FEEDBACK (👎 sobre lo que la IA mandó sola)
-- -------------------------------------------------------------------------
create table if not exists public.textos_autosend_feedback (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.textos_orgs(id) on delete cascade,
  suggestion_id uuid references public.textos_suggestions(id) on delete cascade,
  feedback text default 'bad' check (feedback in ('bad','good')),
  note text,
  created_at timestamptz default now()
);

-- -------------------------------------------------------------------------
-- 16. QUICK REPLIES (plantillas /)
-- -------------------------------------------------------------------------
create table if not exists public.textos_quick_replies (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.textos_orgs(id) on delete cascade,
  shortcut text,
  body text not null,
  created_at timestamptz default now()
);

-- -------------------------------------------------------------------------
-- 17. NOTES (notas internas de contactos)
-- -------------------------------------------------------------------------
create table if not exists public.textos_notes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.textos_orgs(id) on delete cascade,
  contact_id uuid not null references public.textos_contacts(id) on delete cascade,
  author_id uuid,
  body text not null,
  created_at timestamptz default now()
);

-- =========================================================================
-- INDEXES
-- =========================================================================
create index if not exists textos_contacts_org_idx
  on public.textos_contacts(org_id);
create index if not exists textos_contacts_stage_idx
  on public.textos_contacts(org_id, stage);
create index if not exists textos_contacts_last_interaction_idx
  on public.textos_contacts(org_id, last_interaction_at desc);

create index if not exists textos_conv_org_idx
  on public.textos_conversations(org_id);
create index if not exists textos_conv_semaphore_idx
  on public.textos_conversations(org_id, semaphore) where status = 'open';
create index if not exists textos_conv_last_message_idx
  on public.textos_conversations(org_id, last_message_at desc);

create index if not exists textos_messages_conv_idx
  on public.textos_messages(conversation_id, created_at desc);

create index if not exists textos_suggestions_pending_idx
  on public.textos_suggestions(org_id, status, created_at desc) where status = 'pending';
create index if not exists textos_suggestions_autosent_idx
  on public.textos_suggestions(org_id, status, created_at desc) where status = 'auto_sent';

create index if not exists textos_kcards_org_idx
  on public.textos_knowledge_cards(org_id);
create index if not exists textos_kcards_usage_idx
  on public.textos_knowledge_cards(org_id, usage_count desc);

create index if not exists textos_scope_org_idx
  on public.textos_scope_gaps(org_id, last_seen desc);

-- =========================================================================
-- ROW LEVEL SECURITY
-- =========================================================================
-- En esta versión del producto el aislamiento por organización se hace en la
-- capa de aplicación (cookie `textos_org_id` + server actions). Las políticas
-- son permisivas para anon/authenticated porque la app corre sin auth de
-- usuario todavía (demo mode). El service_role bypasea RLS de todas formas.
--
-- TODO producción: cuando se conecte auth.users, cambiar estas policies
-- a scope por organization_members.

alter table public.textos_orgs                enable row level security;
alter table public.textos_org_members         enable row level security;
alter table public.textos_channels            enable row level security;
alter table public.textos_stages              enable row level security;
alter table public.textos_tag_catalog         enable row level security;
alter table public.textos_contacts            enable row level security;
alter table public.textos_conversations       enable row level security;
alter table public.textos_messages            enable row level security;
alter table public.textos_suggestions         enable row level security;
alter table public.textos_knowledge_cards     enable row level security;
alter table public.textos_scope_gaps          enable row level security;
alter table public.textos_flows               enable row level security;
alter table public.textos_campaigns           enable row level security;
alter table public.textos_alerts              enable row level security;
alter table public.textos_autosend_feedback   enable row level security;
alter table public.textos_quick_replies       enable row level security;
alter table public.textos_notes               enable row level security;

do $$
declare t text;
begin
  for t in
    select tablename from pg_tables
    where schemaname = 'public' and tablename like 'textos_%'
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

-- =========================================================================
-- REALTIME — habilitar broadcast en las tablas que la UI escucha
-- =========================================================================
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'textos_suggestions'
  ) then
    alter publication supabase_realtime add table
      public.textos_suggestions,
      public.textos_messages,
      public.textos_conversations,
      public.textos_knowledge_cards;
  end if;
end $$;

-- =========================================================================
-- TRIGGERS updated_at
-- =========================================================================
create or replace function public.textos_set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  for t in values
    ('textos_orgs'),
    ('textos_contacts'),
    ('textos_conversations'),
    ('textos_suggestions'),
    ('textos_knowledge_cards'),
    ('textos_flows'),
    ('textos_campaigns')
  loop
    execute format('drop trigger if exists %I on public.%I', t || '_touch', t);
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.textos_set_updated_at()',
      t || '_touch', t
    );
  end loop;
end $$;

-- =========================================================================
-- Done. Confirmá con: select tablename from pg_tables where schemaname='public' and tablename like 'textos_%' order by tablename;
-- =========================================================================
