-- Retour en arrière de l'uniformisation des strophes de Boèce (2026-08-23)
--
-- CE QUI A ÉTÉ FAIT. Les deux éditions de la Consolation encodaient la strophe de
-- deux façons irréconciliables : Ceriziers 1646 portait `stanza_before` sur ses
-- 1 213 vers (81 à `true`) et laissait `paragraphe` à 1 partout ; Mirandol 1861,
-- l'édition PAR DÉFAUT, ne portait aucune métadonnée et rangeait ses strophes de
-- douze vers dans `paragraphe`. La colonne Mirandol coulait donc d'un seul bloc
-- dans les traductions parallèles, sans une respiration, en regard d'un Ceriziers
-- qui respirait.
--
-- Les 1 092 vers de Mirandol ont reçu `stanza_before` (booléen), dérivé du
-- changement de `paragraphe` À L'INTÉRIEUR d'un même mètre — 34 strophes ouvertes
-- pour 41 blocs de vers —, plus `stanza_before_source: 'derive_paragraphe'` qui
-- dit que la valeur est CALCULÉE et non lue sur la page. Ceriziers n'a pas été
-- touché : contrôlé ligne à ligne contre la sauvegarde, zéro écart.
--
-- SAUVEGARDE. `internal.backup_vers_stanza_20260823` porte les 2 305 lignes de vers
-- des deux éditions telles qu'elles étaient avant l'écriture (id, id_texte,
-- segment_numero, paragraphe, rang, nature, ref_niv1, ref_niv2, segment_metadata).
--
-- ⚠️ Le schéma `internal` n'est accessible ni à `anon` ni à `authenticated` : cette
-- reprise se joue avec la clé de service.

begin;

-- Contrôle préalable : la sauvegarde couvre-t-elle bien ce qu'on va rendre ?
do $$
declare manquants integer;
begin
  select count(*) into manquants
  from segments s
  where s.id_texte in ('TXT_A0064O0001_FR_1861_MIRANDOL', 'TXT_A0064O0001_FR_1646_CERIZIERS')
    and s.nature = 'vers'
    and not exists (select 1 from internal.backup_vers_stanza_20260823 b where b.id = s.id);
  if manquants > 0 then
    raise exception 'Reprise refusée : % vers ne figurent pas dans la sauvegarde.', manquants;
  end if;
end $$;

-- Rendu à l'identique : on repose la métadonnée ENTIÈRE, on ne retire pas des clés
-- une par une. Une reprise qui bricole les clés laisse toujours quelque chose.
update segments s
set segment_metadata = b.segment_metadata
from internal.backup_vers_stanza_20260823 b
where s.id = b.id
  and s.segment_metadata is distinct from b.segment_metadata;

-- Contrôle final : plus aucun écart avec la sauvegarde.
do $$
declare ecarts integer;
begin
  select count(*) into ecarts
  from segments s
  join internal.backup_vers_stanza_20260823 b on b.id = s.id
  where s.segment_metadata is distinct from b.segment_metadata;
  if ecarts > 0 then
    raise exception 'Reprise incomplète : % lignes diffèrent encore.', ecarts;
  end if;
end $$;

commit;

-- La sauvegarde n'est PAS supprimée par ce script : on ne détruit pas la preuve
-- dans le geste qui s'en sert. La retirer à la main, une fois la reprise vérifiée.
-- drop table internal.backup_vers_stanza_20260823;
