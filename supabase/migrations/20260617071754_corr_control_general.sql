-- 20260617071754 · Control general (foto diaria del negocio) y movimientos
-- propios del dueno. Ambas tablas son SOLO ADMIN.
-- Rollback: 20260617071754_corr_control_general.down.sql
create table if not exists public.corr_general (
  id uuid primary key default gen_random_uuid(),
  fecha date not null unique,
  saldo_luis bigint not null default 0,
  saldo_cristian bigint not null default 0,
  cupo_disponible bigint not null default 0,
  efectivo bigint not null default 0,
  nequis bigint not null default 0,
  monedas bigint not null default 0,
  deudas_terceros bigint not null default 0,
  nota text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists corr_general_fecha_idx on public.corr_general(fecha);

drop trigger if exists corr_general_touch on public.corr_general;
create trigger corr_general_touch before update on public.corr_general
for each row execute function public.corr_touch_updated_at();

alter table public.corr_general enable row level security;
create policy corr_gen_all on public.corr_general for all to authenticated
  using (public.corr_is_admin()) with check (public.corr_is_admin());

create table if not exists public.corr_mov_propios (
  id uuid primary key default gen_random_uuid(),
  fecha date not null default current_date,
  tipo text not null check (tipo in ('compensacion','retiro')),
  monto bigint not null check (monto > 0),
  nota text,
  soporte_path text,
  soporte_nombre text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists corr_mov_propios_fecha_idx on public.corr_mov_propios(fecha);

alter table public.corr_mov_propios enable row level security;
create policy corr_mov_all on public.corr_mov_propios for all to authenticated
  using (public.corr_is_admin()) with check (public.corr_is_admin());

-- Contexto en soportes para separar cuadre / general.
alter table public.corr_soportes add column if not exists contexto text not null default 'cuadre';
