-- 20260909143347 · Copia de prestamos y abonos antes de vaciarlos (9 sep 2026).
-- RLS activo y sin politicas: nadie los lee por la API, solo por SQL.
-- Rollback: 20260909143347_corr_respaldo_deudas_abonos.down.sql
create table if not exists public.corr_deudas_respaldo_20260909 as select * from public.corr_deudas;
create table if not exists public.corr_abonos_respaldo_20260909 as select * from public.corr_abonos;

alter table public.corr_deudas_respaldo_20260909 enable row level security;
alter table public.corr_abonos_respaldo_20260909 enable row level security;

comment on table public.corr_deudas_respaldo_20260909 is
  'Copia de corr_deudas antes del borrado del 2026-09-09. Borrar cuando ya no haga falta.';
comment on table public.corr_abonos_respaldo_20260909 is
  'Copia de corr_abonos antes del borrado del 2026-09-09. Borrar cuando ya no haga falta.';
