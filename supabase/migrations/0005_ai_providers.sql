-- =========================================================================
-- AI Providers — modelos de IA conectados por organización.
-- Cada org puede tener múltiples providers (OpenAI + Claude + Gemini, etc.).
-- Se separa por rol: generation (respuesta al cliente), classification
-- (intención/triage) y embedding (RAG sobre knowledge_cards).
-- Un provider puede marcarse como default para su rol — lo selecciona la
-- capa de inferencia cuando resuelve un mensaje.
-- `secrets` vive en JSONB y NO debe ser seleccionada desde código que llegue
-- al cliente. Las server actions que lean esta tabla para UI tienen que
-- usar la versión "safe" (sin secrets).
-- =========================================================================

create table if not exists public.textos_ai_providers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.textos_orgs(id) on delete cascade,
  nickname text not null,
  provider text not null check (provider in (
    'vercel_gateway','openai','anthropic','google','groq','mistral','ollama','custom'
  )),
  model text not null,
  role text not null default 'generation'
    check (role in ('generation','classification','embedding')),
  is_default boolean not null default false,
  is_active boolean not null default true,
  priority int not null default 100,
  config jsonb not null default '{}'::jsonb,
  secrets jsonb not null default '{}'::jsonb,
  last_tested_at timestamptz,
  last_test_ok boolean,
  last_test_latency_ms int,
  last_test_error text,
  last_test_sample text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists textos_ai_providers_default_uidx
  on public.textos_ai_providers(org_id, role)
  where is_default and is_active;

create index if not exists textos_ai_providers_org_idx
  on public.textos_ai_providers(org_id);

create index if not exists textos_ai_providers_active_idx
  on public.textos_ai_providers(org_id, role, is_active, priority);

drop trigger if exists textos_ai_providers_touch on public.textos_ai_providers;
create trigger textos_ai_providers_touch
  before update on public.textos_ai_providers
  for each row execute function public.textos_set_updated_at();

alter table public.textos_ai_providers enable row level security;

drop policy if exists textos_ai_providers_anon_all on public.textos_ai_providers;
create policy textos_ai_providers_anon_all on public.textos_ai_providers
  for all to anon using (true) with check (true);

drop policy if exists textos_ai_providers_auth_all on public.textos_ai_providers;
create policy textos_ai_providers_auth_all on public.textos_ai_providers
  for all to authenticated using (true) with check (true);

comment on table public.textos_ai_providers is
  'Conexiones a modelos de IA por organización. `secrets` jamás debe llegar al cliente.';
comment on column public.textos_ai_providers.role is
  'generation = respuesta al cliente; classification = triage; embedding = RAG';
comment on column public.textos_ai_providers.config is
  'temperature, max_tokens, top_p, base_url, timeout_ms, zdr (zero-data-retention)';
comment on column public.textos_ai_providers.secrets is
  'api_key, project_id. NUNCA exponer al cliente.';
