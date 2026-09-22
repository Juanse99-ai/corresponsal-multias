-- Rollback de 20260617233645. OJO: borra columnas y datos. Falla si ya hay
-- movimientos de tipo 'recaudo' (primero habria que cambiarlos o borrarlos).
alter table public.corr_movimientos drop constraint if exists corr_movimientos_tipo_check;
alter table public.corr_movimientos
  add constraint corr_movimientos_tipo_check
  check (tipo = any (array['consignacion_nequi'::text, 'consignacion_bancolombia'::text, 'retiro'::text]));
alter table public.corr_movimientos drop column if exists convenio;
alter table public.corr_cuadres drop column if exists recaudos;
