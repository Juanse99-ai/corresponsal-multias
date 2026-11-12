-- Rollback de 20260617140317. OJO: borra las columnas y lo que tengan guardado.
alter table public.corr_cuadres
  drop column if exists fondo_caja,
  drop column if exists efectivo_contado;
