-- 20260617142222 · Bitacora: queda registrado quien cambio que y cuando en
-- todas las tablas de dinero. Ademas, un operador no puede cambiarse el rol.
-- Rollback: 20260617142222_corr_bitacora.down.sql
create table if not exists public.corr_audit_log (
  id uuid primary key default gen_random_uuid(),
  tabla text not null,
  accion text not null,            -- INSERT | UPDATE | DELETE
  registro_id uuid,
  fecha_dato date,
  actor_id uuid,
  antes jsonb,
  despues jsonb,
  created_at timestamptz not null default now()
);
create index if not exists corr_audit_created_idx on public.corr_audit_log(created_at desc);
create index if not exists corr_audit_tabla_idx on public.corr_audit_log(tabla);

alter table public.corr_audit_log enable row level security;
create policy corr_audit_select on public.corr_audit_log for select to authenticated
  using (public.corr_is_admin());

create or replace function public.corr_audit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_fecha date;
  v_src jsonb;
begin
  v_src := case when TG_OP = 'DELETE' then to_jsonb(OLD) else to_jsonb(NEW) end;
  begin v_id := (v_src->>'id')::uuid; exception when others then v_id := null; end;
  begin v_fecha := (v_src->>'fecha')::date; exception when others then v_fecha := null; end;

  insert into public.corr_audit_log (tabla, accion, registro_id, fecha_dato, actor_id, antes, despues)
  values (
    TG_TABLE_NAME, TG_OP, v_id, v_fecha, auth.uid(),
    case when TG_OP = 'INSERT' then null else to_jsonb(OLD) end,
    case when TG_OP = 'DELETE' then null else to_jsonb(NEW) end
  );

  if TG_OP = 'DELETE' then return OLD; else return NEW; end if;
end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'corr_cuadres','corr_consignaciones_luis','corr_compensaciones_luis',
    'corr_deudas','corr_abonos','corr_general','corr_mov_propios','corr_soportes'
  ] loop
    execute format('drop trigger if exists %I_audit on public.%I', t, t);
    execute format('create trigger %I_audit after insert or update or delete on public.%I for each row execute function public.corr_audit()', t, t);
  end loop;
end $$;

create or replace function public.corr_protect_rol()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if NEW.rol is distinct from OLD.rol and not public.corr_is_admin() then
    raise exception 'No autorizado: solo un admin puede cambiar el rol.';
  end if;
  if NEW.activo is distinct from OLD.activo and not public.corr_is_admin() then
    NEW.activo := OLD.activo;
  end if;
  return NEW;
end $$;

drop trigger if exists corr_profiles_protect on public.corr_profiles;
create trigger corr_profiles_protect before update on public.corr_profiles
for each row execute function public.corr_protect_rol();
