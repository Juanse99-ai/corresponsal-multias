-- Rollback de 20260825191623. La app dejaria de cargar el resumen del encabezado
-- y los paneles: solo tiene sentido junto con la version vieja del codigo.
drop function if exists public.corr_header_resumen();
drop function if exists public.corr_saldo_luis(date, boolean);
drop function if exists public.corr_luis_historial();
drop function if exists public.corr_deudas_saldos();
