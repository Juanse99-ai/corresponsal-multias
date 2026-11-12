-- Rollback de 20260617043443. Deja los permisos como antes (anon y public
-- podian ejecutar las funciones de rol) y quita el borrado de consignaciones.
grant execute on function public.corr_is_admin() to anon, public;
grant execute on function public.corr_my_role() to anon, public;
drop policy if exists corr_cl_delete on public.corr_consignaciones_luis;
alter function public.corr_touch_updated_at() reset search_path;
