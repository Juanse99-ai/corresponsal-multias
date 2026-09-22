-- 20260922170126 · Corresponsal: solo entra quien tiene perfil activo.
-- Rollback: 20260922170126_corr_miembro.down.sql
--
-- Antes todas las políticas de corr_* decían `to authenticated using (true)`:
-- cualquier cuenta de auth.users (compartido con otras apps) leía y escribía
-- movimientos, deudas, consignaciones y fotos. Ahora exigen corr_es_miembro()
-- (perfil activo en corr_profiles). Para los usuarios reales no cambia nada.
--
-- También:
--  · corr_soportes gana su política de UPDATE (antes no tenía y guardar lo que
--    se leyó de la foto no hacía nada, sin avisar);
--  · alta de suscripciones push solo para miembros;
--  · EXECUTE fuera de funciones que solo usan triggers o nadie, y anon fuera de
--    las 4 de consulta, con search_path fijo.
-- corr_is_admin() sigue ejecutable por authenticated: las políticas corren con
-- el usuario. corr_cron_* siguen igual hasta que el cron use clave de servidor.

begin;
set local lock_timeout = '2s';

create or replace function public.corr_es_miembro() returns boolean
  language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.corr_profiles p where p.id = auth.uid() and p.activo) $$;
revoke execute on function public.corr_es_miembro() from public, anon;
grant execute on function public.corr_es_miembro() to authenticated;

-- ===== Políticas: de "true" a "miembro" =====
alter policy corr_ab_select on public.corr_abonos using (public.corr_es_miembro());
alter policy corr_ab_insert on public.corr_abonos with check (public.corr_es_miembro());
alter policy corr_ab_update on public.corr_abonos using (public.corr_es_miembro()) with check (public.corr_es_miembro());

alter policy corr_compl_select on public.corr_compensaciones_luis using (public.corr_es_miembro());
alter policy corr_compl_insert on public.corr_compensaciones_luis with check (public.corr_es_miembro());
alter policy corr_compl_update on public.corr_compensaciones_luis using (public.corr_es_miembro()) with check (public.corr_es_miembro());
alter policy corr_compl_delete on public.corr_compensaciones_luis using (public.corr_es_miembro());

alter policy corr_cl_select on public.corr_consignaciones_luis using (public.corr_es_miembro());
alter policy corr_cl_insert on public.corr_consignaciones_luis with check (public.corr_es_miembro());
alter policy corr_cl_update on public.corr_consignaciones_luis using (public.corr_es_miembro()) with check (public.corr_es_miembro());
alter policy corr_cl_delete on public.corr_consignaciones_luis using (public.corr_es_miembro());

alter policy corr_cu_select on public.corr_cuadres using (public.corr_es_miembro());
alter policy corr_cu_insert on public.corr_cuadres with check (public.corr_es_miembro());
alter policy corr_cu_update on public.corr_cuadres
  using (public.corr_is_admin() or (public.corr_es_miembro() and estado <> 'cerrado'))
  with check (public.corr_es_miembro());

alter policy corr_de_select on public.corr_deudas using (public.corr_es_miembro());
alter policy corr_de_insert on public.corr_deudas with check (public.corr_es_miembro());
alter policy corr_de_update on public.corr_deudas using (public.corr_es_miembro()) with check (public.corr_es_miembro());

alter policy corr_movs_select on public.corr_movimientos using (public.corr_es_miembro());
alter policy corr_movs_insert on public.corr_movimientos with check (public.corr_es_miembro());
alter policy corr_movs_update on public.corr_movimientos using (public.corr_es_miembro()) with check (public.corr_es_miembro());
alter policy corr_movs_delete on public.corr_movimientos using (public.corr_es_miembro());

alter policy corr_sop_select on public.corr_soportes using (public.corr_es_miembro());
alter policy corr_sop_insert on public.corr_soportes with check (public.corr_es_miembro());
alter policy corr_sop_delete on public.corr_soportes using (public.corr_es_miembro());
-- Faltaba: luis/actions.ts guarda lo que se leyó de la foto (columna datos).
create policy corr_sop_update on public.corr_soportes for update to authenticated
  using (public.corr_es_miembro()) with check (public.corr_es_miembro());

-- Cada quien sigue viendo y borrando solo las suyas; darse de alta pide ser miembro.
alter policy corr_push_own_insert on public.corr_push_subscriptions
  with check ((auth.uid() = user_id) and public.corr_es_miembro());

alter policy corr_soportes_obj_select on storage.objects
  using (bucket_id = 'corr-soportes' and public.corr_es_miembro());
alter policy corr_soportes_obj_insert on storage.objects
  with check (bucket_id = 'corr-soportes' and public.corr_es_miembro());
alter policy corr_soportes_obj_delete on storage.objects
  using (bucket_id = 'corr-soportes' and public.corr_es_miembro());

-- ===== Funciones =====
-- Solo las usan triggers (el trigger no revisa EXECUTE al dispararse) o nadie.
revoke execute on function public.corr_audit(), public.corr_protect_rol(), public.corr_touch_updated_at(),
  public.rls_auto_enable(), public.corr_my_role()
from public, anon, authenticated;

-- De consulta (security invoker): las pide la app con el usuario. Todas
-- califican public., así que el search_path vacío no las rompe.
revoke execute on function public.corr_header_resumen(), public.corr_saldo_luis(date, boolean),
  public.corr_luis_historial(), public.corr_deudas_saldos()
from public, anon;
grant execute on function public.corr_header_resumen(), public.corr_saldo_luis(date, boolean),
  public.corr_luis_historial(), public.corr_deudas_saldos()
to authenticated;
alter function public.corr_header_resumen() set search_path = '';
alter function public.corr_saldo_luis(date, boolean) set search_path = '';
alter function public.corr_luis_historial() set search_path = '';
alter function public.corr_deudas_saldos() set search_path = '';

commit;
