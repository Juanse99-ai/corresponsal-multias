-- Rollback de 20260907192847. OJO: borra la columna y las lecturas guardadas.
alter table public.corr_soportes drop column if exists datos;
