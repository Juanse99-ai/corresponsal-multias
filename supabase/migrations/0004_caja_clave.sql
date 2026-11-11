-- Entrada con clave de caja (app/caja): clave de 6 dígitos por persona, solo
-- en equipos que autorizó un administrador.
--
-- Las dos tablas tienen RLS activo y NINGUNA política: desde el navegador no se
-- pueden leer ni escribir. Solo el servidor las toca, con la llave de servicio
-- (lib/supabase/admin.ts). Sin trigger de auditoría a propósito: los hashes no
-- deben quedar en la bitácora.

create table if not exists public.corr_claves (
  user_id uuid primary key references auth.users(id) on delete cascade,
  clave_hash text not null,
  intentos integer not null default 0,
  bloqueada_hasta timestamptz,
  actualizada timestamptz not null default now()
);
alter table public.corr_claves enable row level security;

create table if not exists public.corr_equipos (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  nombre text not null,
  autorizado_por uuid references auth.users(id) on delete set null,
  creado timestamptz not null default now(),
  ultimo_uso timestamptz,
  intentos integer not null default 0,
  bloqueado_hasta timestamptz,
  activo boolean not null default true
);
alter table public.corr_equipos enable row level security;
