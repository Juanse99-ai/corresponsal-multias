-- Rollback de 20260914173131. OJO: borra la etiqueta de origen de cada abono.
alter table public.corr_abonos drop column if exists origen;
