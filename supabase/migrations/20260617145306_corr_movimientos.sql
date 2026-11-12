-- 20260617145306 · Libro de movimientos del dia (cada operacion, una por una).
-- Rollback: 20260617145306_corr_movimientos.down.sql
create table if not exists public.corr_movimientos (
  id uuid primary key default gen_random_uuid(),
  fecha date not null default current_date,
  tipo text not null check (tipo in ('consignacion','retiro','nequi','bancolombia')),
  monto bigint not null check (monto > 0),
  hora time,
  cliente text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists corr_movimientos_fecha_idx on public.corr_movimientos(fecha);

alter table public.corr_movimientos enable row level security;
create policy corr_movs_select on public.corr_movimientos for select to authenticated using (true);
create policy corr_movs_insert on public.corr_movimientos for insert to authenticated with check (true);
create policy corr_movs_update on public.corr_movimientos for update to authenticated using (true) with check (true);
create policy corr_movs_delete on public.corr_movimientos for delete to authenticated using (true);

drop trigger if exists corr_movimientos_audit on public.corr_movimientos;
create trigger corr_movimientos_audit after insert or update or delete on public.corr_movimientos
for each row execute function public.corr_audit();

-- Bancolombia como canal propio en el cuadre (electronico, como Nequi).
alter table public.corr_cuadres add column if not exists bancolombia bigint not null default 0;
