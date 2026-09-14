-- De dónde sale la plata con la que se abona un préstamo ("Taller", "Perfumes"...).
-- Es solo una etiqueta: no entra ni a la tirilla ni al arqueo.
alter table public.corr_abonos
  add column if not exists origen text
  check (origen is null or char_length(origen) between 1 and 40);
