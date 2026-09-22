-- 20260617062819 · Bucket privado de soportes (tirillas del datafono, etc.)
-- y la tabla con los datos de cada foto.
-- Rollback: 20260617062819_corr_soportes.down.sql
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'corr-soportes', 'corr-soportes', false, 10485760,
  array['image/jpeg','image/png','image/webp','image/heic','image/heif','application/pdf']
)
on conflict (id) do nothing;

-- Politicas de Storage acotadas a este bucket (no toca el bucket del taller).
create policy "corr_soportes_obj_select" on storage.objects for select to authenticated
  using (bucket_id = 'corr-soportes');
create policy "corr_soportes_obj_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'corr-soportes');
create policy "corr_soportes_obj_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'corr-soportes');

create table if not exists public.corr_soportes (
  id uuid primary key default gen_random_uuid(),
  fecha date not null,
  tipo text not null default 'tirilla',
  path text not null,
  nombre text,
  mime text,
  tamano bigint,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists corr_soportes_fecha_idx on public.corr_soportes(fecha);

alter table public.corr_soportes enable row level security;
create policy corr_sop_select on public.corr_soportes for select to authenticated using (true);
create policy corr_sop_insert on public.corr_soportes for insert to authenticated with check (true);
create policy corr_sop_delete on public.corr_soportes for delete to authenticated using (true);
