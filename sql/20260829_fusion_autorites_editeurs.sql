-- § 35.6.4 — Une variante ne laisse pas debout l’autorité qu’elle remplace.
-- 29 août 2026.
--
-- Le mal : on inscrivait « Veuve Jean Camusat ; Pierre Le Petit » parmi les variantes
-- de « Veuve Jean Camusat et Pierre Le Petit », et l’ancienne graphie continuait de
-- figurer dans la liste des autorités, comme si deux maisons portaient ce nom.
--
-- Déclarer une variante, c’est FUSIONNER : la graphie descend au rang d’alias, les
-- rattachements passent à l’autorité retenue, la ligne redondante disparaît.
-- ⛔ On ne filtre pas l’affichage — les références resteraient accrochées à une entrée
-- fantôme. ⛔ On ne réécrit jamais la donnée source (`oeuvres.editeur`,
-- `ouvrages_bibliographiques.editeur`, `catalogue_notices`) : elle est la provenance.
--
-- La règle vaut pour les DEUX référentiels, chacun avec son vocabulaire :
-- `editeurs.variantes` (maisons des éditions primaires) et `editeurs_valeur.aliases`
-- (autorités bibliographiques, celles que les notices désignent par un renvoi).
--
-- Le verrou est en base et non dans le code de l’écran : une graphie qui remonterait
-- en autorité par un script ou par une requête doit échouer là aussi — même parti que
-- le verrou de modération, où la RLS ne suffisait pas.

-- ── Clés de comparaison ─────────────────────────────────────────────────────
-- `public.cle_editeur` existe déjà : minuscule, sans accents ni ponctuation.

create or replace function public.editeurs_cles(p_formes text[])
returns text[]
language sql
immutable
set search_path to 'public', 'pg_temp'
as $fn$
  select coalesce(
    (select array_agg(distinct public.cle_editeur(f))
     from unnest(coalesce(p_formes, '{}'::text[])) f
     where public.cle_editeur(f) <> ''),
    '{}'::text[])
$fn$;

comment on function public.editeurs_cles(text[]) is
  'Clés de comparaison d’une liste de graphies, pour rapprocher variantes et noms d’autorité.';

-- Variantes propres : sans vide, sans doublon de clé (la première graphie l’emporte),
-- et sans la fiche elle-même — une autorité ne se cite pas parmi ses propres variantes.
create or replace function public.editeurs_variantes_propres(p_nom text, p_formes text[])
returns text[]
language sql
immutable
set search_path to 'public', 'pg_temp'
as $fn$
  with brutes as (
    select btrim(f) as forme, rang
    from unnest(coalesce(p_formes, '{}'::text[])) with ordinality as t(f, rang)
  ), gardees as (
    select distinct on (public.cle_editeur(forme)) forme, rang
    from brutes
    where public.cle_editeur(forme) <> ''
      and public.cle_editeur(forme) <> public.cle_editeur(p_nom)
    order by public.cle_editeur(forme), rang
  )
  select coalesce((select array_agg(forme order by rang) from gardees), '{}'::text[])
$fn$;

comment on function public.editeurs_variantes_propres(text, text[]) is
  'Variantes nettoyées : ni vide, ni doublon de clé, ni renvoi de la fiche à elle-même.';

-- ── `editeurs` : maisons des éditions primaires ─────────────────────────────

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

  -- Les autorités que cette fiche absorbe : celles dont le NOM est l’une de ses variantes.
  select coalesce(array_agg(o.id), '{}'::bigint[]) into v_absorbes
  from public.editeurs o
  where o.id is distinct from new.id
    and public.cle_editeur(o.nom_complet) = any (public.editeurs_cles(new.variantes));

  -- Une forme déjà déclarée variante d’une autre maison ne remonte pas en autorité.
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

  -- Une variante n’appartient qu’à une seule autorité.
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

  -- Fusion : la fiche absorbée lègue ses variantes, et ses rubriques là où celle-ci est muette.
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

-- La suppression des absorbées attend l’APRÈS : à l’insertion, la ligne d’accueil
-- n’existe pas encore, et rien ne pourrait s’y rattacher.
create or replace function internal.trg_editeurs_absorber()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'internal', 'pg_temp'
as $fn$
begin
  delete from public.editeurs o
  where o.id <> new.id
    and public.cle_editeur(o.nom_complet) = any (public.editeurs_cles(new.variantes));
  return null;
end
$fn$;

drop trigger if exists editeurs_fusion_variantes on public.editeurs;
create trigger editeurs_fusion_variantes
  before insert or update on public.editeurs
  for each row execute function internal.trg_editeurs_fusion_variantes();

drop trigger if exists editeurs_absorber on public.editeurs;
create trigger editeurs_absorber
  after insert or update on public.editeurs
  for each row execute function internal.trg_editeurs_absorber();

-- ── `editeurs_valeur` : autorités bibliographiques ──────────────────────────

create or replace function internal.trg_editeurs_valeur_fusion_aliases()
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
  new.nom     := btrim(new.nom);
  new.aliases := public.editeurs_variantes_propres(new.nom, new.aliases);

  select coalesce(array_agg(o.id), '{}'::bigint[]) into v_absorbes
  from public.editeurs_valeur o
  where o.id is distinct from new.id
    and public.cle_editeur(o.nom) = any (public.editeurs_cles(new.aliases));

  select o.nom into v_autre
  from public.editeurs_valeur o
  where o.id is distinct from new.id
    and not (o.id = any (v_absorbes))
    and public.cle_editeur(new.nom) = any (public.editeurs_cles(o.aliases))
  limit 1;
  if v_autre is not null then
    raise exception 'La graphie « % » est déjà un alias de « % » : elle ne peut pas être en même temps une autorité distincte.',
      new.nom, v_autre using errcode = 'ZE001';
  end if;

  select o.nom into v_autre
  from public.editeurs_valeur o
  where o.id is distinct from new.id
    and not (o.id = any (v_absorbes))
    and exists (select 1 from unnest(new.aliases) a
                where public.cle_editeur(a) = any (public.editeurs_cles(o.aliases)))
  limit 1;
  if v_autre is not null then
    raise exception 'Un de ces alias appartient déjà à « % » : une graphie ne se rattache qu’à une autorité.',
      v_autre using errcode = 'ZE001';
  end if;

  -- L’évaluation académique ne se perd pas : si l’autorité retenue n’est pas notée et
  -- que l’absorbée l’était, la note et son statut la suivent, avec leur provenance.
  for r in select * from public.editeurs_valeur where id = any (v_absorbes) loop
    new.aliases := public.editeurs_variantes_propres(new.nom, new.aliases || r.aliases);
    new.note    := coalesce(new.note, r.note);
    if new.score is null and r.score is not null then
      new.score                := r.score;
      new.statut_usage         := r.statut_usage;
      new.confiance_evaluation := r.confiance_evaluation;
      -- ⛔ Une note qui change de fiche EMPORTE sa provenance : un score et la
      -- source qui le justifie ne se séparent pas (charte § 14.2).
      new.source_evaluation    := r.source_evaluation;
      new.evalue_par           := r.evalue_par;
      new.evalue_at            := r.evalue_at;
    end if;
  end loop;

  return new;
end
$fn$;

-- Fusion VRAIE : les notices et les collections passent à l’autorité retenue AVANT
-- que la ligne redondante ne disparaisse. Aucune référence ne reste orpheline.
create or replace function internal.trg_editeurs_valeur_absorber()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'internal', 'pg_temp'
as $fn$
declare
  v_absorbes bigint[];
begin
  select coalesce(array_agg(o.id), '{}'::bigint[]) into v_absorbes
  from public.editeurs_valeur o
  where o.id <> new.id
    and public.cle_editeur(o.nom) = any (public.editeurs_cles(new.aliases));

  if cardinality(v_absorbes) = 0 then return null; end if;

  update public.ouvrages_bibliographiques
     set editeur_valeur_id = new.id
   where editeur_valeur_id = any (v_absorbes);

  -- La clé primaire est (collection, éditeur) : on ne transporte que ce qui ne ferait
  -- pas doublon, le reste s’efface avec la ligne absorbée.
  update public.collections_editeurs c
     set editeur_id = new.id
   where c.editeur_id = any (v_absorbes)
     and not exists (select 1 from public.collections_editeurs d
                     where d.collection_id = c.collection_id and d.editeur_id = new.id);

  delete from public.editeurs_valeur where id = any (v_absorbes);
  return null;
end
$fn$;

drop trigger if exists editeurs_valeur_fusion_aliases on public.editeurs_valeur;
create trigger editeurs_valeur_fusion_aliases
  before insert or update on public.editeurs_valeur
  for each row execute function internal.trg_editeurs_valeur_fusion_aliases();

drop trigger if exists editeurs_valeur_absorber on public.editeurs_valeur;
create trigger editeurs_valeur_absorber
  after insert or update on public.editeurs_valeur
  for each row execute function internal.trg_editeurs_valeur_absorber();

-- ── Contrôle de clôture ─────────────────────────────────────────────────────
-- Ce qui resterait à fusionner, les deux référentiels ensemble et l’un contre l’autre.
-- Une passe bibliographique n’est achevée que si cette liste est vide (charte § 35.6.4).

create or replace function public.autorites_editeurs_a_fusionner()
returns table (referentiel text, id bigint, forme text, autorite text, ou text)
language sql
stable
set search_path to 'public', 'pg_temp'
as $fn$
  select 'editeurs', e.id, e.nom_complet, o.nom_complet, 'editeurs'
  from public.editeurs e join public.editeurs o
    on o.id <> e.id and public.cle_editeur(e.nom_complet) = any (public.editeurs_cles(o.variantes))
  union all
  select 'editeurs', e.id, e.nom_complet, v.nom, 'editeurs_valeur'
  from public.editeurs e join public.editeurs_valeur v
    on public.cle_editeur(e.nom_complet) = any (public.editeurs_cles(v.aliases))
  union all
  select 'editeurs_valeur', v.id, v.nom, o.nom, 'editeurs_valeur'
  from public.editeurs_valeur v join public.editeurs_valeur o
    on o.id <> v.id and public.cle_editeur(v.nom) = any (public.editeurs_cles(o.aliases))
  union all
  select 'editeurs_valeur', v.id, v.nom, e.nom_complet, 'editeurs'
  from public.editeurs_valeur v join public.editeurs e
    on public.cle_editeur(v.nom) = any (public.editeurs_cles(e.variantes))
  order by 1, 3
$fn$;

comment on function public.autorites_editeurs_a_fusionner() is
  'Formes encore listées comme autorités alors qu’une autre fiche les déclare variante. Doit rester vide.';

-- ── Plan d’une passe de normalisation ───────────────────────────────────────
-- Ces deux fonctions existent pour que ni script ni écran ne recode la clé d’un éditeur.

-- Une graphie revendiquée par DEUX autorités distinctes : la machine ne tranche pas.
create or replace function public.variantes_editeurs_disputees()
returns table (graphie text, autorites text[])
language sql
stable
set search_path to 'public', 'pg_temp'
as $fn$
  with revendications as (
    select public.cle_editeur(x) as k, x as forme, e.nom_complet as autorite
    from public.editeurs e, unnest(e.variantes) x
    where public.cle_editeur(x) <> public.cle_editeur(e.nom_complet)
    union all
    select public.cle_editeur(x), x, w.nom
    from public.editeurs_valeur w, unnest(w.aliases) x
    where public.cle_editeur(x) <> public.cle_editeur(w.nom)
  )
  select min(forme), array_agg(distinct autorite)
  from revendications
  group by k
  having count(distinct public.cle_editeur(autorite)) > 1
  order by 1
$fn$;

comment on function public.variantes_editeurs_disputees() is
  'Graphies revendiquées par deux autorités : une décision humaine, jamais une fusion automatique.';

-- Une graphie déclarée variante dans un référentiel, encore autorité dans l’autre :
-- la déclaration se propage, et le déclencheur de fusion fait le reste.
create or replace function public.propagation_editeurs_a_faire()
returns table (referentiel text, autorite_id bigint, autorite text, graphie text)
language sql
stable
set search_path to 'public', 'pg_temp'
as $fn$
  select 'editeurs_valeur', w.id, w.nom, v.nom
  from public.editeurs_valeur v
  join public.editeurs e on public.cle_editeur(v.nom) = any (public.editeurs_cles(e.variantes))
  join public.editeurs_valeur w on public.cle_editeur(w.nom) = public.cle_editeur(e.nom_complet)
  where public.cle_editeur(v.nom) <> public.cle_editeur(e.nom_complet)
  union
  select 'editeurs', o.id, o.nom_complet, e.nom_complet
  from public.editeurs e
  join public.editeurs_valeur v on public.cle_editeur(e.nom_complet) = any (public.editeurs_cles(v.aliases))
  join public.editeurs o on public.cle_editeur(o.nom_complet) = public.cle_editeur(v.nom)
  where public.cle_editeur(v.nom) <> public.cle_editeur(e.nom_complet)
  order by 1, 3
$fn$;

comment on function public.propagation_editeurs_a_faire() is
  'Graphies à descendre en variante dans l’autre référentiel pour que les deux listes disent la même chose.';
