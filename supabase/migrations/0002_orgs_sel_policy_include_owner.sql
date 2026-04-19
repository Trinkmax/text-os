-- =========================================================================
-- Fix: permitir al creador de la org leer su propia fila recién insertada.
--
-- El flujo de onboarding inserta textos_orgs con RETURNING id. PostgreSQL
-- chequea la policy SELECT sobre la fila retornada. La policy previa sólo
-- concedía acceso si el usuario ya era miembro (textos_is_org_member), pero
-- el AFTER INSERT trigger que lo agrega como miembro corre demasiado tarde
-- para que el SELECT de RETURNING lo vea, y el INSERT falla con 42501.
--
-- Agregamos `owner_user_id = auth.uid()` como segunda vía: el BEFORE INSERT
-- trigger ya setea owner_user_id desde auth.uid(), así que el creador puede
-- leer su org incluso antes de que se complete el bootstrap de membresía.
-- =========================================================================

drop policy if exists textos_orgs_sel on public.textos_orgs;
create policy textos_orgs_sel on public.textos_orgs
  for select to authenticated
  using (owner_user_id = auth.uid() or public.textos_is_org_member(id));
