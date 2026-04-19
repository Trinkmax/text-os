-- =========================================================================
-- Channels: connection config + secrets separation for multitenant linking.
-- Each org connects its own channels (WhatsApp numbers, IG accounts, FB
-- pages, web widgets, email inboxes). Non-secret config goes to `config`;
-- access tokens and app secrets stay in `secrets` and are NEVER selected
-- in code paths that reach the client.
-- =========================================================================

alter table public.textos_channels
  add column if not exists config jsonb not null default '{}'::jsonb,
  add column if not exists secrets jsonb not null default '{}'::jsonb,
  add column if not exists external_id text,
  add column if not exists verified_at timestamptz,
  add column if not exists last_error text,
  add column if not exists updated_at timestamptz not null default now();

-- Allow multiple channel instances of the same type per org (e.g. two WhatsApp
-- numbers), but unique external_id per (org, type) so the same phone/page can't
-- be connected twice.
create unique index if not exists textos_channels_org_type_extid_uidx
  on public.textos_channels(org_id, type, external_id)
  where external_id is not null;

create index if not exists textos_channels_org_idx
  on public.textos_channels(org_id);

-- Meta webhook verification uses a per-channel token stored in secrets.verify_token.
create index if not exists textos_channels_verify_token_idx
  on public.textos_channels((secrets->>'verify_token'))
  where secrets ? 'verify_token';

-- Webchat lookups by the generated widget key.
create index if not exists textos_channels_widget_key_idx
  on public.textos_channels((config->>'widget_key'))
  where config ? 'widget_key';

drop trigger if exists textos_channels_touch on public.textos_channels;
create trigger textos_channels_touch
  before update on public.textos_channels
  for each row execute function public.textos_set_updated_at();
