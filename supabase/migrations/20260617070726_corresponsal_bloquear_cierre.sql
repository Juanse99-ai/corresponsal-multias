-- 20260617070726 · El operador no puede editar un dia ya CERRADO; solo el admin.
-- Rollback: 20260617070726_corresponsal_bloquear_cierre.down.sql
drop policy if exists corr_cu_update on public.corr_cuadres;
create policy corr_cu_update on public.corr_cuadres for update to authenticated
  using (public.corr_is_admin() or estado <> 'cerrado')
  with check (true);
