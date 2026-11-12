-- 20260617065301 · Concepto/categoria del prestamo o deuda.
-- Rollback: 20260617065301_corresponsal_deuda_concepto.down.sql
alter table public.corr_deudas add column if not exists concepto text;
