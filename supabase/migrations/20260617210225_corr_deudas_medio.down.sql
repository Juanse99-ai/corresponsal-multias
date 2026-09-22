-- Rollback de 20260617210225. OJO: borra la columna y lo que tenga guardado.
alter table public.corr_deudas drop column if exists medio;
