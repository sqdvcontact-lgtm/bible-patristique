-- Une marque de TRAVAIL sur le référentiel des éditeurs.
-- 29 août 2026.
--
-- Elle dit ce que l’auteur a déjà examiné, et rien d’autre. ⛔ Purement informative : elle
-- ne commande ni la résolution, ni l’affichage, ni la fusion, et n’a donc aucune
-- contrainte — on la pose, on la retire.
--
-- ⛔ Ce fichier porte la version FINALE de `internal.trg_editeurs_fusion_variantes`, que
-- `20260829_fusion_autorites_editeurs.sql` puis `20260829_editeurs_coedition.sql` ont
-- écrite avant lui. C’est celui-ci qui fait foi.

alter table public.editeurs
  add column if not exists valide boolean not null default false,
  add column if not exists valide_le timestamptz;

comment on column public.editeurs.valide is
  'Marque de travail : la fiche a été examinée. Purement informative, elle ne commande rien.';
comment on column public.editeurs.valide_le is
  'Quand la marque a été posée. Null dès qu’elle est retirée.';

-- ⛔ Poser une marque ne peut rien casser : ce verrou-ci ne regarde que le NOM et les
-- VARIANTES, et il sort d’emblée quand ni l’un ni l’autre ne change. Sans cette sortie,
-- deux fiches qui se disputent une graphie — « Jacques-Paul Migne » et « Migne » se
-- disputent « J.-P. Migne » — n’auraient pu être ni marquées, ni même pourvues d’une
-- ville, tant que le litige n’est pas tranché. Une écriture qui ne touche pas à
-- l’invariant n’a pas à en répondre.
create or replace function internal.trg_editeurs_fusion_variantes()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'internal', 'pg_temp'
as $fn$
declare
  v_absorbes bigint[];
  v_autre    text;
  r          record;
begin
  if tg_op = 'UPDATE'
     and new.nom_complet is not distinct from old.nom_complet
     and new.variantes is not distinct from old.variantes then
    return new;
  end if;

  new.nom_complet := btrim(new.nom_complet);
  new.variantes   := public.editeurs_variantes_propres(new.nom_complet, new.variantes);

  -- ⛔ « A ; B » dit que deux maisons ont coédité : ce n’est pas le nom d’une maison.
  if new.nom_complet like '%;%' then
    raise exception 'Le point-virgule sépare deux maisons qui ont coédité : « % » n’est pas le nom d’un éditeur. Ouvrez chaque maison séparément.',
      new.nom_complet using errcode = 'ZE002';
  end if;

  select coalesce(array_agg(o.id), '{}'::bigint[]) into v_absorbes
  from public.editeurs o
  where o.id is distinct from new.id
    and public.cle_editeur(o.nom_complet) = any (public.editeurs_cles(new.variantes));

  select o.nom_complet into v_autre
  from public.editeurs o
  where o.id is distinct from new.id
    and not (o.id = any (v_absorbes))
    and public.cle_editeur(new.nom_complet) = any (public.editeurs_cles(o.variantes))
  limit 1;
  if v_autre is not null then
    raise exception 'La graphie « % » est déjà une variante de « % » : elle ne peut pas être en même temps une autorité distincte.',
      new.nom_complet, v_autre using errcode = 'ZE001';
  end if;

  select o.nom_complet into v_autre
  from public.editeurs o
  where o.id is distinct from new.id
    and not (o.id = any (v_absorbes))
    and exists (select 1 from unnest(new.variantes) v
                where public.cle_editeur(v) = any (public.editeurs_cles(o.variantes)))
  limit 1;
  if v_autre is not null then
    raise exception 'Une de ces variantes appartient déjà à « % » : une graphie ne se rattache qu’à une autorité.',
      v_autre using errcode = 'ZE001';
  end if;

  for r in select * from public.editeurs where id = any (v_absorbes) loop
    new.variantes   := public.editeurs_variantes_propres(new.nom_complet, new.variantes || r.variantes);
    new.ville       := coalesce(new.ville, r.ville);
    new.annee_debut := coalesce(new.annee_debut, r.annee_debut);
    new.annee_fin   := coalesce(new.annee_fin, r.annee_fin);
    new.notes       := coalesce(new.notes, r.notes);
  end loop;

  return new;
end
$fn$;
