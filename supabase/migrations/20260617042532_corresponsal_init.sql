-- =========================================================
-- App Corresponsal Bancolombia - Multidiagnosticos AS
-- Esquema aislado con prefijo corr_ dentro del proyecto compartido con el taller.
-- =========================================================

-- ---------- PROFILES (rol admin/operador) ----------
create table if not exists public.corr_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null,
  rol text not null default 'operador' check (rol in ('admin','operador')),
  activo boolean not null default true,
  created_at timestamptz not null default now()
);

create or replace function public.corr_is_admin()
returns boolean language sql security definer set search_path = public stable as $$
  select exists (
    select 1 from public.corr_profiles p
    where p.id = auth.uid() and p.rol = 'admin' and p.activo
  );
$$;

create or replace function public.corr_my_role()
returns text language sql security definer set search_path = public stable as $$
  select rol from public.corr_profiles where id = auth.uid();
$$;

-- ---------- CONSIGNACIONES DE LUIS ----------
create table if not exists public.corr_consignaciones_luis (
  id uuid primary key default gen_random_uuid(),
  fecha date not null default current_date,
  monto bigint not null check (monto > 0),
  hora time,
  nota text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists corr_consig_luis_fecha_idx on public.corr_consignaciones_luis(fecha);

-- ---------- CUADRE DIARIO ----------
create table if not exists public.corr_cuadres (
  id uuid primary key default gen_random_uuid(),
  fecha date not null unique,
  total_tirilla bigint not null default 0,
  efectivo_consignaciones bigint not null default 0,
  retiros_cash bigint not null default 0,
  nequis bigint not null default 0,
  prestamos_consignaciones bigint not null default 0,
  ret_real bigint not null default 0,
  compensado bigint not null default 0,
  sr_luis bigint not null default 0,
  saldo_final bigint not null default 0,
  saldo_luis_cierre bigint not null default 0,
  estado text not null default 'abierto' check (estado in ('abierto','cerrado')),
  nota text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists corr_cuadres_fecha_idx on public.corr_cuadres(fecha);

-- ---------- DEUDAS / PRESTAMOS ----------
create table if not exists public.corr_deudas (
  id uuid primary key default gen_random_uuid(),
  persona text not null,
  monto bigint not null check (monto > 0),
  descripcion text,
  fecha date not null default current_date,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists corr_deudas_persona_idx on public.corr_deudas(persona);

create table if not exists public.corr_abonos (
  id uuid primary key default gen_random_uuid(),
  deuda_id uuid not null references public.corr_deudas(id) on delete cascade,
  monto bigint not null check (monto > 0),
  fecha date not null default current_date,
  nota text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists corr_abonos_deuda_idx on public.corr_abonos(deuda_id);

-- ---------- updated_at trigger ----------
create or replace function public.corr_touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists corr_cuadres_touch on public.corr_cuadres;
create trigger corr_cuadres_touch before update on public.corr_cuadres
for each row execute function public.corr_touch_updated_at();

-- ---------- RLS ----------
alter table public.corr_profiles enable row level security;
alter table public.corr_consignaciones_luis enable row level security;
alter table public.corr_cuadres enable row level security;
alter table public.corr_deudas enable row level security;
alter table public.corr_abonos enable row level security;

-- profiles
create policy corr_profiles_select on public.corr_profiles for select to authenticated
  using (id = auth.uid() or public.corr_is_admin());
create policy corr_profiles_update on public.corr_profiles for update to authenticated
  using (id = auth.uid() or public.corr_is_admin()) with check (id = auth.uid() or public.corr_is_admin());
create policy corr_profiles_insert on public.corr_profiles for insert to authenticated
  with check (public.corr_is_admin());

-- consignaciones luis  (operador puede borrar una mal digitada)
create policy corr_cl_select on public.corr_consignaciones_luis for select to authenticated using (true);
create policy corr_cl_insert on public.corr_consignaciones_luis for insert to authenticated with check (true);
create policy corr_cl_update on public.corr_consignaciones_luis for update to authenticated using (true) with check (true);
create policy corr_cl_delete on public.corr_consignaciones_luis for delete to authenticated using (true);

-- cuadres  (borrar solo admin)
create policy corr_cu_select on public.corr_cuadres for select to authenticated using (true);
create policy corr_cu_insert on public.corr_cuadres for insert to authenticated with check (true);
create policy corr_cu_update on public.corr_cuadres for update to authenticated using (true) with check (true);
create policy corr_cu_delete on public.corr_cuadres for delete to authenticated using (public.corr_is_admin());

-- deudas  (borrar solo admin)
create policy corr_de_select on public.corr_deudas for select to authenticated using (true);
create policy corr_de_insert on public.corr_deudas for insert to authenticated with check (true);
create policy corr_de_update on public.corr_deudas for update to authenticated using (true) with check (true);
create policy corr_de_delete on public.corr_deudas for delete to authenticated using (public.corr_is_admin());

-- abonos  (borrar solo admin)
create policy corr_ab_select on public.corr_abonos for select to authenticated using (true);
create policy corr_ab_insert on public.corr_abonos for insert to authenticated with check (true);
create policy corr_ab_update on public.corr_abonos for update to authenticated using (true) with check (true);
create policy corr_ab_delete on public.corr_abonos for delete to authenticated using (public.corr_is_admin());

-- las funciones de rol no deben ser ejecutables por anon
revoke execute on function public.corr_is_admin() from anon, public;
revoke execute on function public.corr_my_role() from anon, public;
grant execute on function public.corr_is_admin() to authenticated;
grant execute on function public.corr_my_role() to authenticated;
