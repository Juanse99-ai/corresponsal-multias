-- 20260617052048 · Compensaciones de Luis como lista (igual que consignaciones).
-- Rollback: 20260617052048_corr_compensaciones_tabla.down.sql
alter table public.corr_cuadres drop column if exists compensacion;

create table if not exists public.corr_compensaciones_luis (
  id uuid primary key default gen_random_uuid(),
  fecha date not null default current_date,
  monto bigint not null check (monto > 0),
  hora time,
  nota text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists corr_comp_luis_fecha_idx on public.corr_compensaciones_luis(fecha);

alter table public.corr_compensaciones_luis enable row level security;
create policy corr_compl_select on public.corr_compensaciones_luis for select to authenticated using (true);
create policy corr_compl_insert on public.corr_compensaciones_luis for insert to authenticated with check (true);
create policy corr_compl_update on public.corr_compensaciones_luis for update to authenticated using (true) with check (true);
create policy corr_compl_delete on public.corr_compensaciones_luis for delete to authenticated using (true);
