-- `profils.citation_preferee` SE RETIRE : SA MATIÈRE VIT DANS LES DEUX COLONNES DE CORPUS.
--
-- La migration 20260914083254 a ajouté `citation_favorite_biblique` et
-- `citation_favorite_patristique`, et le code qui les lit est servi depuis le déploiement
-- du commit 41d3cc9c (Ready le 2026-09-14). Plus rien ne lit ni n'écrit l'ancienne
-- colonne : ni le site (relu dans `app/`), ni une fonction, ni une vue (relu dans le
-- catalogue le jour même).
--
-- ⛔ ON RECOPIE AVANT DE RETIRER, ET L'ON REFUSE DE RETIRER CE QU'ON N'A PAS SU RECOPIER.
-- Une favorite de l'ancien modèle rejoint la colonne de son corpus si elle en a la forme
-- et si la place est libre. Une valeur qui ne se range nulle part fait ÉCHOUER la
-- migration au lieu de disparaître avec la colonne. ⚠️ Au 2026-09-14 aucun profil n'en
-- porte : la recopie ne trouve rien, mais la garde vaut pour la base qui jouera ce
-- fichier, non pour celle qu'on a mesurée.
--
-- ⛔ LE VERROU SE BORNE. Retirer une colonne demande un verrou EXCLUSIF sur `profils`, et
-- un verrou exclusif EN ATTENTE fait patienter derrière lui toutes les lectures de la
-- table, c'est-à-dire presque chaque page du site. Le 2026-09-14, un premier essai a
-- attendu deux minutes derrière la sauvegarde quotidienne, un `pg_dump` qui tient toutes
-- les tables le temps de son passage. Cinq secondes au plus : si la table n'est pas libre,
-- la migration échoue sans avoir rien bloqué, et se rejoue plus tard.
set local lock_timeout = '5s';

create table if not exists internal.backup_profils_citation_preferee_20260914 as
  select id, citation_preferee, now() as sauvegarde_le
    from public.profils
   where citation_preferee is not null;

update public.profils p
   set citation_favorite_biblique = p.citation_preferee
 where p.citation_preferee is not null
   and p.citation_favorite_biblique is null
   and jsonb_typeof(p.citation_preferee) = 'object'
   and p.citation_preferee ->> 'type' = 'biblique'
   and jsonb_typeof(p.citation_preferee -> 'id') = 'string'
   and jsonb_typeof(p.citation_preferee -> 'texte') = 'string'
   and octet_length(p.citation_preferee::text) <= 32768;

update public.profils p
   set citation_favorite_patristique = p.citation_preferee
 where p.citation_preferee is not null
   and p.citation_favorite_patristique is null
   and jsonb_typeof(p.citation_preferee) = 'object'
   and p.citation_preferee ->> 'type' = 'patristique'
   and jsonb_typeof(p.citation_preferee -> 'id') = 'string'
   and jsonb_typeof(p.citation_preferee -> 'texte') = 'string'
   and octet_length(p.citation_preferee::text) <= 32768;

do $$
declare
  orphelines integer;
begin
  select count(*) into orphelines
    from public.profils p
   where p.citation_preferee is not null
     and p.citation_preferee is distinct from p.citation_favorite_biblique
     and p.citation_preferee is distinct from p.citation_favorite_patristique;
  if orphelines > 0 then
    raise exception '% citation(s) favorite(s) de l''ancien modèle ne se rangent dans aucune colonne de corpus : rien n''est retiré (voir internal.backup_profils_citation_preferee_20260914).', orphelines;
  end if;
end $$;

alter table public.profils drop column citation_preferee;

-- RETOUR EN ARRIÈRE
--
-- ⚠️ La colonne revient VIDE, et ce qu'elle portait est dans la sauvegarde. Le code d'avant
-- le commit 41d3cc9c doit être redéployé d'abord : celui d'aujourd'hui ne la lit plus.
--   alter table public.profils add column citation_preferee jsonb;
--   update public.profils p set citation_preferee = b.citation_preferee
--     from internal.backup_profils_citation_preferee_20260914 b where b.id = p.id;
