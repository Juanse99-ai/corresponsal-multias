-- Rollback de 20261111052936_corr_caja_clave_endurecer: vuelve la verificación
-- de 20261111051846, quita cambiar la clave y devuelve poner_clave al servidor.

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

drop function if exists public.corr_caja_cambiar_clave(uuid, text, text);

revoke all on function public.corr_caja_verificar(text, uuid, text) from public, anon, authenticated;
grant execute on function public.corr_caja_verificar(text, uuid, text) to service_role;
grant execute on function public.corr_caja_poner_clave(uuid, text) to service_role;
