-- INTÉGRATION DES GRAVURES DE FILLION — les 208, master et web.
--
-- ⛔ AUCUNE GRAVURE N'ATTEIGNAIT LE LECTEUR, et pas seulement les 165 neuves.
--    Les 43 servies depuis le 25 août portaient `metadata.test_only = true`, et
--    `bible_technical_publication_allowed` refuse précisément cela : c'était un
--    essai destiné à GPT (`test_audience: "GPT"`), et le drapeau faisait son
--    office. Mesuré en évaluant le prédicat de la politique lui-même : 0 actif,
--    0 fichier visibles, quand le rôle de service en voyait 208.
--
-- Ce que la publication demande, et qui se lit dans la politique :
--   actif   : is_public ET bible_technical_publication_allowed(statut, metadata)
--   fichier : is_public ET validation_status = 'validated' ET son actif public
--
-- ⚠️ LES DEUX AFFIRMATIONS NE SONT PAS DE MÊME NATURE, et le schéma le sait.
--    Le FICHIER passe en `validated` : c'est une affirmation TECHNIQUE, et elle
--    est vérifiée — octets, empreinte et dimensions du seau confrontés à la base
--    sur les 208, rapport fichier/affichage de médiane 2,00, et chaque gravure
--    regardée à sa taille d'affichage sur les deux sols.
--    L'ACTIF, lui, reste en `review` et passe par la voie explicite que la base
--    ouvre pour cela : `technical_publication_override` avec
--    `editorial_validation_claimed = false`. Les ancres canoniques et les
--    légendes sont le travail de GPT ; je n'ai contrôlé que le rendu, et l'on
--    n'écrit pas qu'on a validé ce qu'on n'a pas relu (charte § 11.7).
--
-- ⚠️ `derivatives_created` valait `false` sur les 165 : les dérivés existent, et
--    un champ qui ment est pire qu'un champ absent.
--
-- Sauvegarde : internal.backup_bible_edition_publication_20260831
-- Retour en arrière : sql/rollback_integration_gravures_fillion_20260831.sql

create table if not exists internal.backup_bible_edition_publication_20260831 as
select a.id as asset_id, a.asset_key, a.is_public as asset_is_public,
       a.validation_status as asset_validation_status, a.metadata as asset_metadata,
       f.id as file_id, f.variant_role, f.is_public as file_is_public,
       f.validation_status as file_validation_status
from public.bible_edition_assets a
left join public.bible_edition_asset_files f on f.asset_id = a.id;

-- ⛔ L'ORDRE COMPTE, et une garde SQL l'impose : « Une illustration publique
--    exige un dérivé web validé et public. » Le DÉRIVÉ passe donc en premier,
--    l'actif ensuite. C'est bien vu : une illustration déclarée publique sans
--    fichier servi serait une promesse en l'air.

update public.bible_edition_asset_files f
set is_public = true, validation_status = 'validated', updated_at = now()
where f.variant_role = 'web'
  and exists (select 1 from public.bible_edition_families fam
              where fam.id = f.family_id and fam.family_code = 'fillion-bible');

update public.bible_edition_assets a
set is_public = true,
    metadata = (
      coalesce(a.metadata, '{}'::jsonb)
        - 'test_only' - 'test_scope' - 'test_audience' - 'illustration_workstream_status'
    ) || jsonb_build_object(
      'technical_publication_override', true,
      'editorial_validation_claimed', false,
      'derivatives_created', true,
      'publication_source', 'integration_20260831',
      'publication_motif', 'Intégration demandée par l’auteur. Rendu contrôlé gravure par gravure ; ancres et légendes non relues.'
    ),
    updated_at = now()
-- ⚠️ La portée est NOMMÉE, et la base l'exige : elle refuse un UPDATE sans WHERE.
--    On la borne à la famille éditoriale par son CODE, non par un identifiant
--    recopié, qui ne dirait pas de quoi il s'agit.
where exists (select 1 from public.bible_edition_families fam
              where fam.id = a.family_id and fam.family_code = 'fillion-bible');

-- ⛔ Le MASTER reste privé : son seau n'est pas public, et une adresse publique
--    sur un fichier qui ne l'est pas serait une promesse en l'air.
update public.bible_edition_asset_files f
set is_public = false, updated_at = now()
where f.variant_role = 'master' and f.is_public
  and exists (select 1 from public.bible_edition_families fam
              where fam.id = f.family_id and fam.family_code = 'fillion-bible');

do $$
declare n_actifs int; n_fic int; n_master_public int; n_test int;
begin
  select count(*) into n_actifs from public.bible_edition_assets a
    where a.is_public and public.bible_technical_publication_allowed(a.validation_status, a.metadata)
      and exists (select 1 from public.bible_edition_families f
                  join public.bible_edition_member_sources ms on ms.family_id = f.id and ms.id = a.member_source_id
                  join public.bible_text_sources s on s.id = a.source_id
                  where f.id = a.family_id and f.status = 'published' and ms.status = 'published' and s.status = 'published');
  select count(*) into n_fic from public.bible_edition_asset_files x
    where x.is_public and x.validation_status = 'validated' and x.variant_role = 'web'
      and exists (select 1 from public.bible_edition_assets a where a.id = x.asset_id and a.is_public
                  and public.bible_technical_publication_allowed(a.validation_status, a.metadata));
  select count(*) into n_master_public from public.bible_edition_asset_files where variant_role = 'master' and is_public;
  select count(*) into n_test from public.bible_edition_assets where metadata ? 'test_only';
  if n_actifs <> 208 then raise exception 'seuls % actifs sur 208 passent la politique', n_actifs; end if;
  if n_fic <> 208 then raise exception 'seuls % fichiers web sur 208 passent la politique', n_fic; end if;
  if n_master_public <> 0 then raise exception '% masters déclarés publics', n_master_public; end if;
  if n_test <> 0 then raise exception '% actifs portent encore test_only', n_test; end if;
  raise notice '208 actifs et 208 fichiers web visibles au lecteur ; aucun master public ; aucun test_only';
end $$;
