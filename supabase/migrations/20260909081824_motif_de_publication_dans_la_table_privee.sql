-- LE MOTIF D'UNE PUBLICATION QUITTE « oeuvres » (1/2 — la colonne et les notes)
--
-- ⛔ `oeuvres.acces_public_note` porte le motif d'une décision de publication : « Import
-- de préparation privé ; aucune publication autorisée par ce paquet. », « Édition en cours
-- de reprise éditoriale interne ». C'est une note d'ATELIER, et elle vit dans une table que
-- la page publique de l'œuvre lit en `select('*')` SOUS LA SESSION DU LECTEUR : trente
-- notes étaient donc servies à tout compte connecté. La doctrine du dépôt le dit depuis le
-- 2026-08-20 — « une donnée privée ne s'ajoute pas en colonne d'une table lue en
-- select('*') » — et nomme le modèle : `oeuvres_commentaires_prives`, RLS sans aucune
-- politique, droits révoqués, atteinte par la seule clé de service.
--
-- ⚠️ DEUX PROSES, ET ELLES NE DISENT PAS LA MÊME CHOSE. `commentaire` est le carnet de
-- travail (état de l'import, doutes sur l'édition) ; `note_acces_public` dit pourquoi
-- l'œuvre est offerte ou retenue. On ne les fond pas : onze œuvres portent les deux.
--
-- ⚠️ CETTE MIGRATION EST ADDITIVE, et c'est voulu. La base est PARTAGÉE avec le site en
-- ligne : retirer la colonne d'`oeuvres` avant que le correctif soit déployé casserait la
-- planche d'administration, qui la demande encore. La suppression est en 2/2, après le
-- déploiement — c'est la règle du dépôt, payée une fois par `oeuvres_auteurs`.
--
-- Appliquée le 2026-09-09. Contrôle : 30 notes reportées à l'identique, 21 carnets de
-- travail intacts, table passée de 21 à 40 lignes, aucun droit pour anon ni authenticated.

alter table public.oeuvres_commentaires_prives
  add column if not exists note_acces_public text;

comment on column public.oeuvres_commentaires_prives.note_acces_public is
  'Motif d''une publication ou d''une retenue. Vivait dans oeuvres.acces_public_note jusqu''au 2026-09-09, où la page publique de l''œuvre le servait à tout compte connecté par son select(*). Ne pas confondre avec « commentaire », qui est le carnet de travail.';

-- ── Les trente notes déménagent ───────────────────────────────────────────────
-- Sauvegarde d'abord, dans `internal`, où ni anon ni authenticated n'ont même le droit de
-- parcourir le schéma.
create table if not exists internal.backup_oeuvres_acces_public_note_20260909 as
  select id_oeuvre, acces_public_note, acces_public_modifie_le
  from public.oeuvres where acces_public_note is not null;

-- ⚠️ Un upsert, parce que onze de ces œuvres ont DÉJÀ une ligne de carnet : on ne crée
-- que ce qui manque, et l'on ne touche jamais à « commentaire ».
insert into public.oeuvres_commentaires_prives (id_oeuvre, note_acces_public, modifie_le)
select o.id_oeuvre, o.acces_public_note, coalesce(o.acces_public_modifie_le, now())
from public.oeuvres o
where o.acces_public_note is not null
on conflict (id_oeuvre) do update set
  note_acces_public = excluded.note_acces_public;

-- ⛔ Le contrôle lève si une seule note s'est perdue en route : on compare le TEXTE, non
-- le compte. Une migration de prose qui ne vérifie que des lignes ne vérifie rien.
do $$
declare manquantes int;
begin
  select count(*) into manquantes
  from public.oeuvres o
  left join public.oeuvres_commentaires_prives c on c.id_oeuvre = o.id_oeuvre
  where o.acces_public_note is not null
    and c.note_acces_public is distinct from o.acces_public_note;
  if manquantes > 0 then
    raise exception 'Report incomplet : % note(s) ne se retrouvent pas à l''identique.', manquantes;
  end if;
end $$;
