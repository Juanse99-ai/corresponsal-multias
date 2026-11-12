-- Rollback de 20261111051025_corr_caja_clave: borra las tablas de la clave de caja.
-- Antes hay que deshacer las migraciones de la clave posteriores (funciones).
drop table if exists public.corr_equipos;
drop table if exists public.corr_claves;
