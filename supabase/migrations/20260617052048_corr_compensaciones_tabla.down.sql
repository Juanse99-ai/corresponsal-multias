-- Rollback de 20260617052048. OJO: borra la tabla y todas las compensaciones.
drop table if exists public.corr_compensaciones_luis;
alter table public.corr_cuadres add column if not exists compensacion bigint not null default 0;
