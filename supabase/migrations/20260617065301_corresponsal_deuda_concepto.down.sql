-- Rollback de 20260617065301. OJO: borra la columna y lo que tenga guardado.
alter table public.corr_deudas drop column if exists concepto;
