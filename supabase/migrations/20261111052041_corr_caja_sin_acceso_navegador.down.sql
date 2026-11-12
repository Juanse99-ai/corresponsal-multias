-- Rollback de 20261111052041_corr_caja_sin_acceso_navegador: devuelve los
-- permisos de tabla que Supabase da por defecto. Las tablas siguen con RLS y
-- sin políticas, así que el navegador igual no ve filas.
grant select, insert, update, delete on table public.corr_claves to anon, authenticated;
grant select, insert, update, delete on table public.corr_equipos to anon, authenticated;
