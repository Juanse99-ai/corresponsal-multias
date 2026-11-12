-- Cuenta del Sr. Luis en vivo (11 nov 2026, lo pidió el dueño): las
-- consignaciones que entran solas desde el grupo de WhatsApp tienen que
-- aparecer sin recargar. components/luis/luis-en-vivo.tsx escucha estos
-- cambios con Supabase Realtime; Realtime respeta el RLS de cada tabla (solo
-- ven los cambios quienes ya pueden leer la fila).
--
-- Solo agrega tablas corr_ a la publicación; no toca las del taller.
do $$
declare
  t text;
begin
  foreach t in array array['corr_consignaciones_luis', 'corr_compensaciones_luis', 'corr_soportes'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
