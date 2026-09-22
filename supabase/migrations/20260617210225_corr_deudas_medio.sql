-- 20260617210225 · Medio del prestamo: efectivo (sale de la caja) o
-- transferencia (sale de la cuenta y va en la tirilla).
-- La migracion original traia ademas un arreglo puntual de tres prestamos de
-- ese dia; eso era dato de operacion y no se guarda aqui.
-- Rollback: 20260617210225_corr_deudas_medio.down.sql
alter table public.corr_deudas
  add column if not exists medio text not null default 'efectivo'
  check (medio in ('efectivo', 'transferencia'));
