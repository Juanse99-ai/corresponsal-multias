-- 20260617043443 · Ajustes de permisos y borrado de consignaciones de Luis.
-- Aplicada en la base el 17 jun 2026; se trae al repo el 22 sep 2026.
-- Rollback: 20260617043443_corresponsal_hardening.down.sql
create or replace function public.corr_touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

revoke execute on function public.corr_is_admin() from anon, public;
revoke execute on function public.corr_my_role() from anon, public;
grant execute on function public.corr_is_admin() to authenticated;
grant execute on function public.corr_my_role() to authenticated;

-- El operador puede borrar una consignacion de Luis mal digitada.
drop policy if exists corr_cl_delete on public.corr_consignaciones_luis;
create policy corr_cl_delete on public.corr_consignaciones_luis for delete to authenticated using (true);
