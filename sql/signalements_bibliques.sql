-- Signalements bibliques : permettre un signalement rattache a un verset
-- meme lorsqu'il ne concerne aucun segment patristique.

alter table public.signalements
  add column if not exists id_verset text;

alter table public.signalements
  alter column id_segment drop not null;

alter table public.signalements
  drop constraint if exists signalements_cible_check;

alter table public.signalements
  add constraint signalements_cible_check
  check (id_segment is not null or id_verset is not null);

create index if not exists idx_signalements_id_verset
  on public.signalements(id_verset)
  where id_verset is not null;
