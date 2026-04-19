-- =========================================================================
-- AI Pipeline: pgvector + hybrid search + traces + idempotency.
-- - Vectoriza textos_knowledge_cards en textos_kcard_chunks (vector(1536)).
-- - Función textos_match_knowledge(p_org, p_embedding, p_query_text, p_limit)
--   devuelve top-K combinando coseno (0.7) + trigrama (0.3).
-- - Cada inferencia (embed/classify/generate/ground/retrieve) deja una traza
--   en textos_ai_traces con costo y latencia.
-- - textos_ai_runs agrupa la corrida por mensaje (factor breakdown JSONB).
-- - textos_message_processing es el lock de idempotencia (PK = message_id).
-- - textos_ai_rate_state es el rate-limit por org (ventana móvil de 60s).
-- =========================================================================

create extension if not exists vector;
create extension if not exists pg_trgm;

-- ---------------- Knowledge cards: estado de embedding -------------------
alter table public.textos_knowledge_cards
  add column if not exists embedding_state text not null default 'no_provider'
    check (embedding_state in ('fresh','stale','indexing','failed','no_provider')),
  add column if not exists embedding_model text,
  add column if not exists embedding_provider_id uuid,
  add column if not exists embedding_dim int,
  add column if not exists embedding_updated_at timestamptz,
  add column if not exists embedding_error text;

create index if not exists textos_kcards_embedding_state_idx
  on public.textos_knowledge_cards(org_id, embedding_state)
  where embedding_state in ('stale','indexing','failed');

-- ---------------- Chunks (1-por-card por ahora) --------------------------
create table if not exists public.textos_kcard_chunks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.textos_orgs(id) on delete cascade,
  card_id uuid not null references public.textos_knowledge_cards(id) on delete cascade,
  chunk_idx int not null default 0,
  text text not null,
  embedding vector(1536),
  dim int,
  token_count int,
  created_at timestamptz default now()
);

create index if not exists textos_kchunks_org_idx
  on public.textos_kcard_chunks(org_id);
create index if not exists textos_kchunks_card_idx
  on public.textos_kcard_chunks(card_id);
create index if not exists textos_kchunks_text_trgm_idx
  on public.textos_kcard_chunks
  using gin (text gin_trgm_ops);
create index if not exists textos_kchunks_emb_hnsw_idx
  on public.textos_kcard_chunks
  using hnsw (embedding vector_cosine_ops);

-- ---------------- Trazas por inferencia ---------------------------------
create table if not exists public.textos_ai_traces (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.textos_orgs(id) on delete cascade,
  run_id uuid,
  suggestion_id uuid references public.textos_suggestions(id) on delete set null,
  kind text not null check (kind in ('embed','classify','generate','ground','retrieve','rerank')),
  provider_id uuid,
  provider text,
  model text,
  latency_ms int,
  input_tokens int,
  output_tokens int,
  cost_usd numeric default 0,
  error text,
  created_at timestamptz default now()
);

create index if not exists textos_ai_traces_org_created_idx
  on public.textos_ai_traces(org_id, created_at desc);
create index if not exists textos_ai_traces_run_idx
  on public.textos_ai_traces(run_id);
create index if not exists textos_ai_traces_suggestion_idx
  on public.textos_ai_traces(suggestion_id) where suggestion_id is not null;

-- ---------------- Run por mensaje (con factores) -------------------------
create table if not exists public.textos_ai_runs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.textos_orgs(id) on delete cascade,
  message_id uuid not null references public.textos_messages(id) on delete cascade,
  suggestion_id uuid references public.textos_suggestions(id) on delete set null,
  started_at timestamptz default now(),
  ended_at timestamptz,
  status text not null default 'running'
    check (status in ('running','done','failed','skipped')),
  semaphore text check (semaphore in ('green','amber','red')),
  confidence numeric,
  factors jsonb,
  reason text,
  error text
);

create index if not exists textos_ai_runs_org_started_idx
  on public.textos_ai_runs(org_id, started_at desc);
create unique index if not exists textos_ai_runs_msg_uidx
  on public.textos_ai_runs(message_id);

-- ---------------- Idempotencia por mensaje -------------------------------
create table if not exists public.textos_message_processing (
  message_id uuid primary key references public.textos_messages(id) on delete cascade,
  org_id uuid not null references public.textos_orgs(id) on delete cascade,
  claimed_at timestamptz default now(),
  completed_at timestamptz,
  status text not null default 'claimed' check (status in ('claimed','done','failed','skipped')),
  reason text
);

-- ---------------- Rate-limit por org -------------------------------------
create table if not exists public.textos_ai_rate_state (
  org_id uuid primary key references public.textos_orgs(id) on delete cascade,
  window_started_at timestamptz not null default now(),
  count int not null default 0,
  updated_at timestamptz not null default now()
);

-- ---------------- RLS permisiva (mismo patrón) ---------------------------
alter table public.textos_kcard_chunks         enable row level security;
alter table public.textos_ai_traces            enable row level security;
alter table public.textos_ai_runs              enable row level security;
alter table public.textos_message_processing   enable row level security;
alter table public.textos_ai_rate_state        enable row level security;

do $$
declare t text;
begin
  for t in values
    ('textos_kcard_chunks'),
    ('textos_ai_traces'),
    ('textos_ai_runs'),
    ('textos_message_processing'),
    ('textos_ai_rate_state')
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

-- ---------------- Trigger: stale al editar la card ----------------------
create or replace function public.textos_kcard_mark_stale()
returns trigger language plpgsql as $$
begin
  if (
    new.question is distinct from old.question
    or new.answer is distinct from old.answer
    or new.topic is distinct from old.topic
    or new.variants is distinct from old.variants
  ) then
    if new.embedding_state <> 'no_provider' then
      new.embedding_state = 'stale';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists textos_kcard_stale_on_update on public.textos_knowledge_cards;
create trigger textos_kcard_stale_on_update
  before update on public.textos_knowledge_cards
  for each row execute function public.textos_kcard_mark_stale();

-- ---------------- Hybrid match: vector + trigram ------------------------
-- Devuelve top-N chunks ranqueados por (0.7 * cos + 0.3 * trgm).
-- Si p_embedding es null, sólo el componente léxico participa.
create or replace function public.textos_match_knowledge(
  p_org_id uuid,
  p_embedding vector(1536),
  p_query_text text,
  p_limit int default 5
)
returns table (
  chunk_id uuid,
  card_id uuid,
  chunk_text text,
  topic text,
  question text,
  answer text,
  usage_count int,
  card_confidence numeric,
  semantic_score numeric,
  lexical_score numeric,
  combined_score numeric
)
language plpgsql
stable
as $$
begin
  return query
  select
    c.id as chunk_id,
    c.card_id,
    c.text as chunk_text,
    k.topic,
    k.question,
    k.answer,
    k.usage_count,
    k.confidence as card_confidence,
    case
      when c.embedding is not null and p_embedding is not null
      then (1 - (c.embedding <=> p_embedding))::numeric
      else 0::numeric
    end as semantic_score,
    similarity(c.text, coalesce(p_query_text, ''))::numeric as lexical_score,
    (
      0.7 * case
        when c.embedding is not null and p_embedding is not null
        then (1 - (c.embedding <=> p_embedding))
        else 0
      end
      + 0.3 * similarity(c.text, coalesce(p_query_text, ''))
    )::numeric as combined_score
  from public.textos_kcard_chunks c
  join public.textos_knowledge_cards k on k.id = c.card_id
  where c.org_id = p_org_id
  order by combined_score desc
  limit p_limit;
end;
$$;

-- ---------------- Realtime: nuevos broadcasts --------------------------
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'textos_ai_runs'
  ) then
    alter publication supabase_realtime add table public.textos_ai_runs;
  end if;
end $$;
