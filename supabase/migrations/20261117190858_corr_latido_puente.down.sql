-- Rollback de 20261117190858_corr_latido_puente: quita el vigía y lo que guardó.
select cron.unschedule('corr_latido_puente');
delete from public.corr_app_config where key in ('puente_latido', 'puente_caido_avisado', 'puente_reintento');
