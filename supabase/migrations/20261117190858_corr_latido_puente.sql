-- Vigía del puente de WhatsApp (17 nov 2026, lo pidió el dueño): cada 5
-- minutos Supabase llama a /api/cron/latido, que revisa si el puente de
-- OpenClaw sigue mandando su latido y, si no, avisa con una notificación de la
-- app. El secreto sale de corr_app_config en el momento: no queda en el job.
-- No crea tablas (el latido se guarda en corr_app_config, ya con RLS y sin
-- políticas).
select cron.schedule(
  'corr_latido_puente',
  '*/5 * * * *',
  $$
  select net.http_get(
    url := 'https://corresponsal-multias.vercel.app/api/cron/latido',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (select value from public.corr_app_config where key = 'cron_secret')
    ),
    timeout_milliseconds := 30000
  );
  $$
);
