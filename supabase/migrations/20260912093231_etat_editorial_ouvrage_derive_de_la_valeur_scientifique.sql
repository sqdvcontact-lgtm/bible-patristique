-- ═══════════════════════════════════════════════════════════════════════════
-- L'état éditorial d'un ouvrage bibliographique se DÉDUIT de sa valeur
-- scientifique ; il ne se saisit plus à la main.
--
-- Pourquoi. Le catalogue comptait 1 347 titres et 0 « validé » : l'écran
-- proposait un bouton que la base refusait toujours, la contrainte
-- `validation_coherente` exigeant `garantie_scientifique <> 'a_verifier'`
-- alors que 925 notices portent encore la valeur par défaut. Valider à la
-- main un corpus de cette taille n'est pas un travail éditorial, c'est un
-- péage. La valeur scientifique, elle, est DÉJÀ calculée par la base
-- (éditeur, collection, contributeurs, ou décision manuelle inscrite dans
-- `statut_scientifique_override`). Cette décision-là suffit : l'état
-- éditorial n'est que sa traduction, comme la publication est dérivée des
-- états de validation depuis la charte § 52.
--
-- La loi, en trois lignes :
--   · exclu                 → rejeté
--   · retenu | secondaire   → validé
--   · à vérifier            → à revoir
--
-- ⛔ Le SEUL levier humain reste `statut_scientifique_override` (motivé quand
--    il exclut). Écrire `statut_editorial` à la main n'a plus d'effet : le
--    déclencheur le récrit.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── La loi, écrite une fois ────────────────────────────────────────────────
create or replace function internal.etat_editorial_ouvrage(p_statut_scientifique text)
returns text
language sql
immutable
set search_path to ''
as $$
  select case p_statut_scientifique
    when 'exclu'      then 'rejete'
    when 'retenu'     then 'valide'
    when 'secondaire' then 'valide'
    else                   'a_revoir'
  end;
$$;

comment on function internal.etat_editorial_ouvrage(text) is
  'Traduit la valeur scientifique calculée d''un ouvrage en état éditorial. Source unique de la règle : ne pas la réécrire ailleurs.';

-- ── Le rafraîchissement écrit désormais les DEUX colonnes ──────────────────
-- `valide_par` / `valide_at` gardent leur rôle de trace : qui a conclu, quand.
-- Pour une conclusion dérivée, c'est « calcul » — ou l'évaluateur nommé, quand
-- une décision manuelle a été consignée. La date du premier passage au vert se
-- conserve : un recalcul qui ne change rien ne réécrit pas l'histoire.
create or replace function internal.rafraichir_statut_scientifique_ouvrage(p_ouvrage_id bigint)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_statut text;
  v_etat   text;
begin
  v_statut := internal.calculer_statut_scientifique_ouvrage(p_ouvrage_id);
  v_etat   := internal.etat_editorial_ouvrage(v_statut);

  update public.ouvrages_bibliographiques
  set statut_scientifique = v_statut,
      statut_editorial    = v_etat,
      valide_par = case when v_etat = 'valide'
                        then coalesce(nullif(btrim(evalue_par_scientifique), ''), 'calcul')
                        else null end,
      valide_at  = case when v_etat = 'valide'
                        then coalesce(valide_at, now())
                        else null end
  where id = p_ouvrage_id
    and (statut_scientifique is distinct from v_statut
         or statut_editorial is distinct from v_etat);
end;
$function$;

-- ── Les cascades passent par le même chemin ────────────────────────────────
-- Elles écrivaient `statut_scientifique` en direct : l'état éditorial y serait
-- resté en arrière. Elles appellent maintenant le rafraîchissement, seul
-- endroit où les deux colonnes se tiennent.
create or replace function internal.trg_rafraichir_ouvrages_editeur()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_editeur_id bigint;
  r record;
begin
  v_editeur_id := case when tg_op = 'DELETE' then old.id else new.id end;
  for r in
    select o.id from public.ouvrages_bibliographiques o
    where o.editeur_valeur_id = v_editeur_id
  loop
    perform internal.rafraichir_statut_scientifique_ouvrage(r.id);
  end loop;
  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$function$;

create or replace function internal.trg_rafraichir_ouvrages_collection()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_collection_id bigint;
  r record;
begin
  v_collection_id := case when tg_op = 'DELETE' then old.id else new.id end;
  for r in
    select o.id from public.ouvrages_bibliographiques o
    where o.collection_valeur_id = v_collection_id
  loop
    perform internal.rafraichir_statut_scientifique_ouvrage(r.id);
  end loop;
  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$function$;

create or replace function internal.trg_rafraichir_ouvrages_auteur()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_auteur_id bigint;
  r record;
begin
  v_auteur_id := case when tg_op = 'DELETE' then old.id else new.id end;
  for r in
    select distinct oc.ouvrage_id as id
    from public.ouvrage_contributeurs_scientifiques oc
    where oc.auteur_valeur_id = v_auteur_id
  loop
    perform internal.rafraichir_statut_scientifique_ouvrage(r.id);
  end loop;
  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$function$;

-- ── Le déclencheur suit maintenant TOUT ce qui fonde le calcul ─────────────
-- Il ne veillait ni sur `statut_scientifique` ni sur `statut_editorial` : une
-- écriture directe de l'état éditorial passait donc sans être reprise.
drop trigger if exists ouvrages_bibliographiques_refresh_scientifique on public.ouvrages_bibliographiques;
create trigger ouvrages_bibliographiques_refresh_scientifique
after insert or update of editeur_valeur_id, collection_valeur_id,
                          statut_scientifique_override, garantie_scientifique,
                          statut_scientifique, statut_editorial
on public.ouvrages_bibliographiques
for each row execute function internal.trg_rafraichir_ouvrage_courant();

-- ── La contrainte ne réclame plus une garantie saisie à la main ────────────
-- `garantie_scientifique` est un champ ancien, laissé à sa valeur par défaut
-- sur les deux tiers du catalogue ; il entrait déjà dans le calcul de la
-- valeur scientifique (une garantie « à vérifier » y impose « à vérifier »,
-- sauf décision manuelle). L'exiger une seconde fois ici revenait à refuser
-- toute validation. Reste ce qui importe : un ouvrage validé porte sa trace.
alter table public.ouvrages_bibliographiques
  drop constraint if exists ouvrages_bibliographiques_validation_coherente;
alter table public.ouvrages_bibliographiques
  add constraint ouvrages_bibliographiques_validation_coherente
  check (statut_editorial <> 'valide'
         or (valide_par is not null and valide_at is not null));

comment on column public.ouvrages_bibliographiques.statut_editorial is
  'DÉRIVÉ de statut_scientifique par internal.etat_editorial_ouvrage(). ⛔ Ne pas écrire : le déclencheur le récrit. Pour trancher, passer par statut_scientifique_override.';

-- ── Reprise du catalogue existant ──────────────────────────────────────────
-- Une ligne à la fois : chaque écriture réveille les cascades qui tiennent le
-- statut francophone des péricopes.
do $$
declare r record;
begin
  for r in select id from public.ouvrages_bibliographiques order by id loop
    perform internal.rafraichir_statut_scientifique_ouvrage(r.id);
  end loop;
end $$;
