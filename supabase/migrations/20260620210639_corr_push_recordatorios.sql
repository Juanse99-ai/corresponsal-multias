-- 20260620210639 · Recordatorios push: suscripciones por usuario, tabla de
-- configuracion privada (VAPID + secreto del cron) y las dos funciones que usa
-- el cron. Los valores de corr_app_config se cargan a mano, nunca en el repo.
-- Rollback: 20260620210639_corr_push_recordatorios.down.sql
create table if not exists public.corr_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth_key text not null,
  created_at timestamptz not null default now()
);
alter table public.corr_push_subscriptions enable row level security;

create policy "corr_push_own_select" on public.corr_push_subscriptions
  for select using (auth.uid() = user_id);
create policy "corr_push_own_insert" on public.corr_push_subscriptions
  for insert with check (auth.uid() = user_id);
create policy "corr_push_own_delete" on public.corr_push_subscriptions
  for delete using (auth.uid() = user_id);

-- RLS habilitado y SIN politicas: nadie la lee por la API.
create table if not exists public.corr_app_config (
  key text primary key,
  value text not null
);
alter table public.corr_app_config enable row level security;

create or replace function public.corr_cron_targets(p_secret text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_secret text;
  v_today date;
  v_estado text;
  v_saldo numeric;
begin
  select value into v_secret from corr_app_config where key = 'cron_secret';
  if v_secret is null or p_secret is distinct from v_secret then
    return jsonb_build_object('ok', false);
  end if;

  v_today := (now() at time zone 'America/Bogota')::date;
  select estado, saldo_final into v_estado, v_saldo from corr_cuadres where fecha = v_today;

  return jsonb_build_object(
    'ok', true,
    'today', v_today,
    'cuadre', case when v_estado is null then null
                   else jsonb_build_object('estado', v_estado, 'saldo_final', v_saldo) end,
    'vapid_public', (select value from corr_app_config where key = 'vapid_public'),
    'vapid_private', (select value from corr_app_config where key = 'vapid_private'),
    'subs', coalesce(
      (select jsonb_agg(jsonb_build_object('endpoint', endpoint, 'p256dh', p256dh, 'auth', auth_key))
       from corr_push_subscriptions), '[]'::jsonb)
  );
end;
$$;

-- Borra una suscripcion muerta (404/410). Requiere el secreto.
create or replace function public.corr_cron_delete_sub(p_secret text, p_endpoint text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_secret text;
begin
  select value into v_secret from corr_app_config where key = 'cron_secret';
  if v_secret is null or p_secret is distinct from v_secret then return; end if;
  delete from corr_push_subscriptions where endpoint = p_endpoint;
end;
$$;

revoke all on function public.corr_cron_targets(text) from public;
grant execute on function public.corr_cron_targets(text) to anon, authenticated;
revoke all on function public.corr_cron_delete_sub(text, text) from public;
grant execute on function public.corr_cron_delete_sub(text, text) to anon, authenticated;
