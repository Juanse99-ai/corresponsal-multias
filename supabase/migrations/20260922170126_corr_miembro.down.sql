-- Rollback de 20260922170126_corr_miembro.sql: deja políticas, permisos y
-- search_path exactamente como estaban el 22 sep 2026 antes de aplicarla.
-- Los EXECUTE se devuelven según el ACL real que tenían (pg_proc.proacl):
--  · corr_audit, corr_protect_rol, corr_touch_updated_at, rls_auto_enable y las
--    4 de consulta: PUBLIC, anon y authenticated;
--  · corr_my_role: solo authenticated.

begin;
set local lock_timeout = '2s';

alter policy corr_ab_select on public.corr_abonos using (true);
alter policy corr_ab_insert on public.corr_abonos with check (true);
alter policy corr_ab_update on public.corr_abonos using (true) with check (true);

alter policy corr_compl_select on public.corr_compensaciones_luis using (true);
alter policy corr_compl_insert on public.corr_compensaciones_luis with check (true);
alter policy corr_compl_update on public.corr_compensaciones_luis using (true) with check (true);
alter policy corr_compl_delete on public.corr_compensaciones_luis using (true);

alter policy corr_cl_select on public.corr_consignaciones_luis using (true);
alter policy corr_cl_insert on public.corr_consignaciones_luis with check (true);
alter policy corr_cl_update on public.corr_consignaciones_luis using (true) with check (true);
alter policy corr_cl_delete on public.corr_consignaciones_luis using (true);

alter policy corr_cu_select on public.corr_cuadres using (true);
alter policy corr_cu_insert on public.corr_cuadres with check (true);
alter policy corr_cu_update on public.corr_cuadres
  using (public.corr_is_admin() or (estado <> 'cerrado'))
  with check (true);

alter policy corr_de_select on public.corr_deudas using (true);
alter policy corr_de_insert on public.corr_deudas with check (true);
alter policy corr_de_update on public.corr_deudas using (true) with check (true);

alter policy corr_movs_select on public.corr_movimientos using (true);
alter policy corr_movs_insert on public.corr_movimientos with check (true);
alter policy corr_movs_update on public.corr_movimientos using (true) with check (true);
alter policy corr_movs_delete on public.corr_movimientos using (true);

alter policy corr_sop_select on public.corr_soportes using (true);
alter policy corr_sop_insert on public.corr_soportes with check (true);
alter policy corr_sop_delete on public.corr_soportes using (true);
drop policy if exists corr_sop_update on public.corr_soportes;

alter policy corr_push_own_insert on public.corr_push_subscriptions with check (auth.uid() = user_id);

alter policy corr_soportes_obj_select on storage.objects using (bucket_id = 'corr-soportes');
alter policy corr_soportes_obj_insert on storage.objects with check (bucket_id = 'corr-soportes');
alter policy corr_soportes_obj_delete on storage.objects using (bucket_id = 'corr-soportes');

grant execute on function public.corr_audit(), public.corr_protect_rol(), public.corr_touch_updated_at(),
  public.rls_auto_enable()
to public, anon, authenticated;
grant execute on function public.corr_my_role() to authenticated;

grant execute on function public.corr_header_resumen(), public.corr_saldo_luis(date, boolean),
  public.corr_luis_historial(), public.corr_deudas_saldos()
to public, anon, authenticated;
alter function public.corr_header_resumen() reset search_path;
alter function public.corr_saldo_luis(date, boolean) reset search_path;
alter function public.corr_luis_historial() reset search_path;
alter function public.corr_deudas_saldos() reset search_path;

-- Al final: ya ninguna política la usa.
drop function if exists public.corr_es_miembro();

commit;
