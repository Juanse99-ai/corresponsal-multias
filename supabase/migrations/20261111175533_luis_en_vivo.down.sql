-- Rollback de 20261111175533_luis_en_vivo: saca las tablas de Realtime.
do $$
declare
  t text;
begin
  foreach t in array array['corr_consignaciones_luis', 'corr_compensaciones_luis', 'corr_soportes'] loop
    if exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime drop table public.%I', t);
    end if;
  end loop;
end $$;
