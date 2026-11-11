-- Clave de caja, ajustes de la revisión de seguridad:
-- 1. El bloqueo ya no se desborda: 2^(n-5) con n alto lanzaba "value out of
--    range" y deshacía la función, así que se podía probar sin límite.
-- 2. Tras 10 claves malas seguidas la clave queda bloqueada hasta que el
--    administrador la borre (antes: 60 min una y otra vez, unos 24 intentos
--    diarios para siempre).
-- 3. Cambiar la clave pide la actual (corr_caja_cambiar_clave): quien encuentre
--    abierta la sesión de otro no se la puede cambiar. Las claves malas al
--    cambiarla cuentan para el mismo bloqueo. Reemplaza a corr_caja_poner_clave,
--    que queda sin permiso de ejecución.
-- 4. search_path vacío: todo va con su esquema escrito.

create or replace function public.corr_caja_verificar(p_equipo_hash text, p_user uuid, p_clave text)
returns jsonb
language plpgsql
security definer
set search_path = ''
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
  if c.bloqueada_hasta = 'infinity'::timestamptz then
    return jsonb_build_object('ok', false, 'motivo', 'bloqueada_siempre');
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
  hasta := case
    when n >= 10 then 'infinity'::timestamptz
    when n >= 5 then ahora + make_interval(mins => least(60, 5 * power(2, least(n - 5, 4)))::integer)
  end;
  hasta_e := case
    when ne >= 15 then ahora + make_interval(mins => least(60, 5 * power(2, least(ne - 15, 4)))::integer)
  end;
  update public.corr_claves set intentos = n, bloqueada_hasta = hasta where user_id = p_user;
  update public.corr_equipos set intentos = ne, bloqueado_hasta = hasta_e where id = e.id;
  if n >= 10 then
    return jsonb_build_object('ok', false, 'motivo', 'bloqueada_siempre');
  end if;
  return jsonb_build_object('ok', false, 'motivo', 'mala', 'quedan', greatest(0, 5 - n), 'hasta', hasta);
end;
$$;

-- Poner o cambiar la clave. Si ya tiene una, hay que dar la actual.
create or replace function public.corr_caja_cambiar_clave(p_user uuid, p_actual text, p_nueva text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.corr_claves%rowtype;
  ahora timestamptz := now();
  n integer;
  hasta timestamptz;
begin
  if p_nueva !~ '^\d{6}$' then
    return jsonb_build_object('ok', false, 'motivo', 'invalida');
  end if;

  select * into c from public.corr_claves where user_id = p_user for update;
  if found then
    if c.bloqueada_hasta = 'infinity'::timestamptz then
      return jsonb_build_object('ok', false, 'motivo', 'bloqueada_siempre');
    end if;
    if c.bloqueada_hasta > ahora then
      return jsonb_build_object('ok', false, 'motivo', 'bloqueada', 'hasta', c.bloqueada_hasta);
    end if;
    if coalesce(p_actual, '') !~ '^\d{6}$' or extensions.crypt(p_actual, c.clave_hash) <> c.clave_hash then
      n := c.intentos + 1;
      hasta := case
        when n >= 10 then 'infinity'::timestamptz
        when n >= 5 then ahora + make_interval(mins => least(60, 5 * power(2, least(n - 5, 4)))::integer)
      end;
      update public.corr_claves set intentos = n, bloqueada_hasta = hasta where user_id = p_user;
      if n >= 10 then
        return jsonb_build_object('ok', false, 'motivo', 'bloqueada_siempre');
      end if;
      return jsonb_build_object('ok', false, 'motivo', 'actual_mala', 'quedan', greatest(0, 5 - n), 'hasta', hasta);
    end if;
    update public.corr_claves
      set clave_hash = extensions.crypt(p_nueva, extensions.gen_salt('bf', 10)),
          intentos = 0, bloqueada_hasta = null, actualizada = ahora
      where user_id = p_user;
  else
    insert into public.corr_claves (user_id, clave_hash, intentos, bloqueada_hasta, actualizada)
    values (p_user, extensions.crypt(p_nueva, extensions.gen_salt('bf', 10)), 0, null, ahora);
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

-- La de poner sin pedir la actual queda sin permiso para nadie (no se borra:
-- borrar pedía una confirmación aparte).
revoke all on function public.corr_caja_poner_clave(uuid, text) from public, anon, authenticated, service_role;
revoke all on function public.corr_caja_verificar(text, uuid, text) from public, anon, authenticated;
revoke all on function public.corr_caja_cambiar_clave(uuid, text, text) from public, anon, authenticated;
grant execute on function public.corr_caja_verificar(text, uuid, text) to service_role;
grant execute on function public.corr_caja_cambiar_clave(uuid, text, text) to service_role;
