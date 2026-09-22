-- Rollback de 20260620210639. OJO: borra las suscripciones push y la tabla de
-- configuracion (VAPID y secreto del cron). Habria que volver a cargarlos.
drop function if exists public.corr_cron_delete_sub(text, text);
drop function if exists public.corr_cron_targets(text);
drop table if exists public.corr_push_subscriptions;
drop table if exists public.corr_app_config;
