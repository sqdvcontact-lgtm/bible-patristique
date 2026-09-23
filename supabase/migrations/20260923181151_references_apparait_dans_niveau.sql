-- Charte § 47.8, étape 1 : colonnes ajoutées, rien de retiré.
-- Toute référence existante paraît dans la bibliographie ; le catalogue y entrera à l'étape 3.
set local lock_timeout = '5s';

alter table public.ouvrages_bibliographiques
  add column apparait_dans text[] not null default array['bibliographie']::text[],
  add column niveau text,
  add column oeuvre_ouvrage_id bigint;

alter table public.ouvrages_bibliographiques
  add constraint ouvrages_bibliographiques_apparait_dans_valide
    check (cardinality(apparait_dans) >= 1 and apparait_dans <@ array['catalogue','bibliographie']::text[]),
  add constraint ouvrages_bibliographiques_niveau_valide
    check (niveau is null or niveau in ('oeuvre','edition')),
  add constraint ouvrages_bibliographiques_oeuvre_pas_soi
    check (oeuvre_ouvrage_id is null or oeuvre_ouvrage_id <> id),
  add constraint ouvrages_bibliographiques_oeuvre_ouvrage_id_fkey
    foreign key (oeuvre_ouvrage_id) references public.ouvrages_bibliographiques(id)
    on update cascade on delete restrict;

create index ouvrages_bibliographiques_oeuvre_ouvrage_id_idx
  on public.ouvrages_bibliographiques (oeuvre_ouvrage_id) where oeuvre_ouvrage_id is not null;
create index ouvrages_bibliographiques_apparait_dans_idx
  on public.ouvrages_bibliographiques using gin (apparait_dans);

comment on column public.ouvrages_bibliographiques.apparait_dans is
  'Charte § 47.8 : surfaces où la référence paraît (catalogue = page Bibliothèque ; bibliographie = outil d''« Aller plus loin »).';
comment on column public.ouvrages_bibliographiques.niveau is
  'Charte § 47.8 : oeuvre (l''œuvre elle-même) ou edition (une édition ou traduction). Nul tant que non établi.';
comment on column public.ouvrages_bibliographiques.oeuvre_ouvrage_id is
  'Charte § 47.8 : pour une édition, la référence de l''œuvre dont elle relève.';
