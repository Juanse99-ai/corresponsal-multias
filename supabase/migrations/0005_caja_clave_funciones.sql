-- Clave de caja: poner y verificar la clave DENTRO de Postgres.
--
-- Verificar bloquea las filas del equipo y de la persona (FOR UPDATE) mientras
-- revisa, así varios intentos al mismo tiempo esperan su turno y cuentan uno
-- por uno: no se puede saltar el bloqueo mandando muchas claves en paralelo.
-- La clave se guarda con bcrypt (pgcrypto). Solo la llave de servicio puede
-- llamarlas (app/caja/actions.ts).
--
-- Bloqueo: tras 5 claves malas seguidas la persona queda bloqueada 5 minutos,
-- y se dobla con cada mala de más (10, 20, 40) hasta 60. El equipo, igual
-- desde 15 malas sumando personas. La misma regla está escrita en lib/caja.ts
-- (bloqueoTras) y probada en test/caja.test.ts.

create or replace function public.corr_caja_poner_clave(p_user uuid, p_clave text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if p_clave !~ '^\d{6}$' then
    raise exception 'La clave son 6 números.';
  end if;
  insert into public.corr_claves (user_id, clave_hash, intentos, bloqueada_hasta, actualizada)
  values (p_user, extensions.crypt(p_clave, extensions.gen_salt('bf', 10)), 0, null, now())
  on conflict (user_id) do update
    set clave_hash = excluded.clave_hash, intentos = 0, bloqueada_hasta = null, actualizada = now();
end;
$$;

create or replace function public.corr_caja_verificar(p_equipo_hash text, p_user uuid, p_clave text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  e public.corr_equipos%rowtype;
  c public.corr_claves%rowtype;
  ahora timestamptz := now();
  n integer;
  ne integer;
  hasta timestamptz;
  hasta_e timestamptz;
begin
  select * into e from public.corr_equipos where token_hash = p_equipo_hash and activo for update;
  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'equipo');
  end if;
  if e.bloqueado_hasta > ahora then
    return jsonb_build_object('ok', false, 'motivo', 'equipo_bloqueado', 'hasta', e.bloqueado_hasta);
  end if;

  select * into c from public.corr_claves where user_id = p_user for update;
  if not found then
    return jsonb_build_object('ok', false, 'motivo', 'sin_clave');
  end if;
  if c.bloqueada_hasta > ahora then
    return jsonb_build_object('ok', false, 'motivo', 'bloqueada', 'hasta', c.bloqueada_hasta);
  end if;

  if p_clave ~ '^\d{6}$' and extensions.crypt(p_clave, c.clave_hash) = c.clave_hash then
    update public.corr_claves set intentos = 0, bloqueada_hasta = null where user_id = p_user;
    update public.corr_equipos set intentos = 0, bloqueado_hasta = null, ultimo_uso = ahora where id = e.id;
    return jsonb_build_object('ok', true);
  end if;

  n := c.intentos + 1;
  ne := e.intentos + 1;
  hasta := case when n >= 5 then ahora + make_interval(mins => least(60, 5 * power(2, n - 5))::integer) end;
  hasta_e := case when ne >= 15 then ahora + make_interval(mins => least(60, 5 * power(2, ne - 15))::integer) end;
  update public.corr_claves set intentos = n, bloqueada_hasta = hasta where user_id = p_user;
  update public.corr_equipos set intentos = ne, bloqueado_hasta = hasta_e where id = e.id;
  return jsonb_build_object('ok', false, 'motivo', 'mala', 'quedan', greatest(0, 5 - n), 'hasta', hasta);
end;
$$;

revoke all on function public.corr_caja_poner_clave(uuid, text) from public, anon, authenticated;
revoke all on function public.corr_caja_verificar(text, uuid, text) from public, anon, authenticated;
grant execute on function public.corr_caja_poner_clave(uuid, text) to service_role;
grant execute on function public.corr_caja_verificar(text, uuid, text) to service_role;

-- Segunda barrera: además de RLS sin políticas, sin permisos de tabla para el
-- navegador (anon y authenticated).
revoke all on table public.corr_claves from anon, authenticated;
revoke all on table public.corr_equipos from anon, authenticated;
