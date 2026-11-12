-- Rollback de 20260617062819. OJO: borra la tabla de soportes. El bucket solo
-- se borra si ya no tiene fotos adentro; si tiene, hay que vaciarlo primero.
drop policy if exists "corr_soportes_obj_select" on storage.objects;
drop policy if exists "corr_soportes_obj_insert" on storage.objects;
drop policy if exists "corr_soportes_obj_delete" on storage.objects;
drop table if exists public.corr_soportes;
delete from storage.buckets where id = 'corr-soportes'
  and not exists (select 1 from storage.objects where bucket_id = 'corr-soportes');
