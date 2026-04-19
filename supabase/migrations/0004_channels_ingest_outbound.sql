-- =========================================================================
-- Ingesta e envío por canal — identificadores externos + idempotencia.
-- =========================================================================

alter table public.textos_contacts
  add column if not exists external_id text;

create unique index if not exists textos_contacts_org_channel_extid_uidx
  on public.textos_contacts(org_id, channel, external_id)
  where external_id is not null;

alter table public.textos_messages
  add column if not exists external_id text,
  add column if not exists channel_id uuid references public.textos_channels(id) on delete set null,
  add column if not exists delivery_status text
    check (delivery_status in ('queued','sent','delivered','failed')),
  add column if not exists delivery_error text;

create unique index if not exists textos_messages_conv_extid_uidx
  on public.textos_messages(conversation_id, external_id)
  where external_id is not null;

alter table public.textos_conversations
  add column if not exists channel_id uuid references public.textos_channels(id) on delete set null;

create index if not exists textos_messages_org_created_idx
  on public.textos_messages(org_id, created_at desc);
