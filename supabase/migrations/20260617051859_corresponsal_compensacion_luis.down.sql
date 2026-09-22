-- Rollback de 20260617051859. OJO: borra la columna y lo que tenga guardado.
alter table public.corr_cuadres drop column if exists compensacion;
