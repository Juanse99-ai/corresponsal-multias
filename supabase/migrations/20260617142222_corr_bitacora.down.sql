-- Rollback de 20260617142222. OJO: borra la bitacora entera y deja de
-- registrar cambios; tambien quita el candado del rol.
do $$
declare t text;
begin
  foreach t in array array[
    'corr_cuadres','corr_consignaciones_luis','corr_compensaciones_luis',
    'corr_deudas','corr_abonos','corr_general','corr_mov_propios','corr_soportes',
    'corr_movimientos'
  ] loop
    execute format('drop trigger if exists %I_audit on public.%I', t, t);
  end loop;
end $$;
drop trigger if exists corr_profiles_protect on public.corr_profiles;
drop function if exists public.corr_protect_rol();
drop function if exists public.corr_audit();
drop table if exists public.corr_audit_log;
