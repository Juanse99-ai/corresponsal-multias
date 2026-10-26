-- 20260617051859 · Compensacion del sistema a Luis ese dia (reporte y arrastre).
-- Rollback: 20260617051859_corresponsal_compensacion_luis.down.sql
alter table public.corr_cuadres
  add column if not exists compensacion bigint not null default 0;
