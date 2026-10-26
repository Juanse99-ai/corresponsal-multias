-- Rollback de 20260617070726. Vuelve a dejar que cualquiera edite un dia cerrado.
drop policy if exists corr_cu_update on public.corr_cuadres;
create policy corr_cu_update on public.corr_cuadres for update to authenticated
  using (true) with check (true);
