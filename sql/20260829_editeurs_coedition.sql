-- ⛔ « A ; B » n’est pas une maison : c’est une COÉDITION.
-- 29 août 2026.
--
-- Le « ; » d’une mention d’éditeur dit que deux maisons ont travaillé au même ouvrage :
-- c’est la norme du catalogage, et ce n’est donc jamais le nom d’une maison. Une forme
-- composée n’a pas sa place parmi les autorités : elle se TRAITE — on ouvre ou l’on
-- réemploie chaque maison, puis la fiche composée disparaît.
--
-- ⚠️ Une VARIANTE composée reste licite, et la distinction porte : « Veuve Jean Camusat ;
-- Pierre Le Petit » est une graphie d’une maison UNIQUE, dont l’enseigne associe deux
-- noms. Le verrou ne regarde donc que le NOM.
--
-- ⛔ Il ne porte que sur `editeurs`. `editeurs_valeur` compte les mêmes 50 formes
-- composées, mais aucun écran n’offre encore de quoi les séparer, et l’on ne ferme pas
-- une porte dont on n’a pas donné la clé. À poser le jour où l’écran des autorités saura
-- les traiter. ⚠️ Trois notices y sont d’ailleurs rattachées à une coédition, ce qui pose
-- une question de modèle : `ouvrages_bibliographiques` ne porte qu’UN `editeur_valeur_id`,
-- quand une coédition en demande deux.
--
-- Le déclencheur est réécrit ENTIER, la garde s’ajoutant en tête de
-- `sql/20260829_fusion_autorites_editeurs.sql`. ⛔ Elle est réécrite une fois de plus par
-- `20260829_editeurs_marque_de_validation.sql`, qui fait foi sur cette fonction.

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
  new.nom_complet := btrim(new.nom_complet);
  new.variantes   := public.editeurs_variantes_propres(new.nom_complet, new.variantes);

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

-- Ce qui reste à séparer : une forme composée par ligne, avec ses maisons et le nombre de
-- celles qui sont déjà répertoriées. Contrôle de clôture de la rubrique « Coéditions à
-- séparer » de l’écran d’administration.
create or replace function public.coeditions_editeurs_a_separer()
returns table (id bigint, forme text, maisons text[], deja_repertoriees int)
language sql
stable
set search_path to 'public', 'pg_temp'
as $fn$
  with composees as (
    select e.id, e.nom_complet, btrim(p.part) as maison
    from public.editeurs e,
         lateral unnest(string_to_array(e.nom_complet, ';')) as p(part)
    where e.nom_complet like '%;%' and btrim(p.part) <> ''
  ), simples as (
    select public.cle_editeur(nom_complet) as k from public.editeurs where nom_complet not like '%;%'
    union
    select public.cle_editeur(v.forme)
    from public.editeurs e cross join lateral unnest(e.variantes) as v(forme)
  )
  select c.id, c.nom_complet, array_agg(c.maison),
         count(*) filter (where exists (select 1 from simples s where s.k = public.cle_editeur(c.maison)))::int
  from composees c
  group by c.id, c.nom_complet
  order by c.nom_complet
$fn$;

comment on function public.coeditions_editeurs_a_separer() is
  'Formes composées encore rangées parmi les éditeurs : deux maisons pour un ouvrage, jamais une autorité.';
