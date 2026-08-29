-- Retour arrière de la réparation du 29 août 2026 : la variante coupée par la virgule.
--
-- Le champ « Variantes » se saisissait séparé par des VIRGULES, et
-- « J.-P. Migne (Patrologia Latina, t. 63) » y avait été enregistrée en DEUX graphies,
-- « J.-P. Migne (Patrologia Latina » et « t. 63) », dont ni l’une ni l’autre ne veut rien
-- dire. Le champ se saisit désormais UNE GRAPHIE PAR LIGNE ; ce fichier rend l’état d’avant.
--
-- ⚠️ Les déclencheurs de fusion refuseraient de rendre une graphie à son autorité, et
-- réabsorberaient aussitôt les deux fiches restaurées : on les écarte le temps de la
-- restauration.

begin;
alter table public.editeurs disable trigger editeurs_fusion_variantes;
alter table public.editeurs disable trigger editeurs_absorber;
alter table public.editeurs_valeur disable trigger editeurs_valeur_fusion_aliases;
alter table public.editeurs_valeur disable trigger editeurs_valeur_absorber;

update public.editeurs
   set variantes = array[
     'J.-P. Migne', 'Éditions J.-P. Migne', 'Éditions Jacques-Paul Migne', 'Éditions Migne',
     'J.-P. Migne (Patrologia Latina', 't. 63)', 'Migne', 'réimpression Migne'
   ]::text[]
 where id = 14;

update public.editeurs_valeur
   set aliases = array[
     'J.-P. Migne', 'Éditions J.-P. Migne', 'Éditions Jacques-Paul Migne', 'Éditions Migne',
     'J.-P. Migne (Patrologia Latina', 't. 63)', 'Migne', 'réimpression Migne'
   ]::text[]
 where id = 453;

insert into public.editeurs (id, nom_complet, variantes, ville, annee_debut, annee_fin, notes, created_at, valide, valide_le)
overriding system value values (
  486, 'J.-P. Migne (Patrologia Latina, t. 63)', '{}'::text[], null, null, null,
  'Synchronisé depuis editeurs_valeur — statut a_verifier — mission [EDITEURS|referentiel-visible-20260829].',
  '2026-08-29 09:29:05.453201+00', false, null)
on conflict (id) do nothing;

insert into public.editeurs_valeur (id, nom, aliases, score, statut_usage, confiance_evaluation, source_evaluation, evalue_par, evalue_at, note, created_at, updated_at)
overriding system value values (
  487, 'J.-P. Migne (Patrologia Latina, t. 63)', '{}'::text[], null, 'a_verifier', 'faible',
  'Inventaire exhaustif des champs éditeur/publisher de la base — forme brute à normaliser. Occurrences : 1. Sources : catalogue_notices.editeur.',
  'gpt-5.6-sol', '2026-08-29 09:25:09.615061+00', null,
  '2026-08-29 09:25:09.615061+00', '2026-08-29 09:25:09.615061+00')
on conflict (id) do nothing;

alter table public.editeurs enable trigger editeurs_fusion_variantes;
alter table public.editeurs enable trigger editeurs_absorber;
alter table public.editeurs_valeur enable trigger editeurs_valeur_fusion_aliases;
alter table public.editeurs_valeur enable trigger editeurs_valeur_absorber;
commit;
