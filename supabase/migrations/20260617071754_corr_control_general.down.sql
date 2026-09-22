-- Rollback de 20260617071754. OJO: borra las dos tablas y todo lo que tengan.
drop table if exists public.corr_general;
drop table if exists public.corr_mov_propios;
alter table public.corr_soportes drop column if exists contexto;
