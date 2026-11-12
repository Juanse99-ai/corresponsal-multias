-- Rollback de 20261111051846_corr_caja_clave_funciones.
drop function if exists public.corr_caja_verificar(text, uuid, text);
drop function if exists public.corr_caja_poner_clave(uuid, text);
