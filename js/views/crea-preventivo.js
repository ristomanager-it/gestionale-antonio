create table public.preventivi_ricette (
  id bigint generated always as identity not null,
  preventivo_id bigint not null,
  ricetta_id bigint null,
  nome_piatto text not null,
  quantita integer null default 1,
  costo_unitario numeric(10, 2) null default 0,
  costo_totale numeric(10, 2) null default 0,
  ricetta_completa boolean null default true,
  azienda_id uuid not null,
  constraint preventivi_ricette_pkey primary key (id),
  constraint preventivi_ricette_preventivo_id_fkey foreign KEY (preventivo_id) references preventivi (id) on delete CASCADE,
  constraint preventivi_ricette_ricetta_id_fkey foreign KEY (ricetta_id) references ricette (id) on delete set null
) TABLESPACE pg_default;
