-- Perché: il menu componibile creato per un gruppo non era legato alla prenotazione,
-- quindi dalla scheda prenotazione non si ritrovava. Collegamento 1 prenotazione -> menu.
alter table public.menu_componibile
  add column if not exists prenotazione_id bigint references public.prenotazioni_tavoli(id) on delete set null;
comment on column public.menu_componibile.prenotazione_id is 'Prenotazione (prenotazioni_tavoli) a cui il menu è collegato; null = menu libero';
create index if not exists idx_menu_componibile_prenotazione on public.menu_componibile(prenotazione_id);
update public.menu_componibile set prenotazione_id = 136
where id = '8358ac0f-b5ef-408c-9871-e3d379bbfd7b' and prenotazione_id is null;
