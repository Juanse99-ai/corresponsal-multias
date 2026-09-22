-- Rollback de 20260909143347. NO lo corras sin pensarlo: estas tablas son la
-- unica copia de los prestamos y abonos anteriores al 9 sep 2026.
-- drop table if exists public.corr_deudas_respaldo_20260909;
-- drop table if exists public.corr_abonos_respaldo_20260909;
select 'rollback deshabilitado a proposito: son el respaldo' as nota;
