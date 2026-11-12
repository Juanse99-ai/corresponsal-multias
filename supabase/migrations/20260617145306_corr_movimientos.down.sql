-- Rollback de 20260617145306. OJO: borra la tabla y todos los movimientos.
drop table if exists public.corr_movimientos;
alter table public.corr_cuadres drop column if exists bancolombia;
