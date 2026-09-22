-- 20260907192847 · Guarda lo que se leyo de la foto del comprobante para no
-- volver a pagar la lectura de la misma imagen.
-- Rollback: 20260907192847_corr_soportes_datos_leidos.down.sql
alter table public.corr_soportes add column if not exists datos jsonb;

comment on column public.corr_soportes.datos is
  'Lectura automatica del comprobante: monto, fecha, hora, titular, recibo. Null = sin leer.';
