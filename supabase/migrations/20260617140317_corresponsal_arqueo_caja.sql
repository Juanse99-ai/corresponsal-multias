-- 20260617140317 · Arqueo de caja fisica: fondo base y efectivo contado al cerrar.
-- Rollback: 20260617140317_corresponsal_arqueo_caja.down.sql
alter table public.corr_cuadres
  add column if not exists fondo_caja bigint not null default 0,
  add column if not exists efectivo_contado bigint not null default 0;
