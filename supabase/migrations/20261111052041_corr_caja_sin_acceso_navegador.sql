-- Segunda barrera: además de RLS sin políticas, sin permisos de tabla para el
-- navegador (anon y authenticated).
revoke all on table public.corr_claves from anon, authenticated;
revoke all on table public.corr_equipos from anon, authenticated;
