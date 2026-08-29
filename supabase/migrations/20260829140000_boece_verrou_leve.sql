-- LE VERROU D'IMMUTABILITÉ DE BOÈCE EST LEVÉ (2026-08-29).
--
-- `trg_guard_boece_source_immutability_v3` gelait la structure source de la
-- *Consolation de la philosophie* (`A0064O0001`) sur vingt-six champs : identité,
-- texte, les cinq niveaux de référence et leurs intitulés, `source_unit_id`,
-- `espace_textuel`, les offsets, `join_before`, `paragraphe`, `rang`, `page`,
-- `texte_original` — et `nature`. Il refusait aussi toute suppression.
--
-- ⛔ Il n'était consigné NULLE PART : ni dans la charte, ni dans AGENTS.md, ni au
-- centre de contrôle. C'est en butant dessus, le 29 août 2026, qu'on l'a découvert.
-- Sa levée est une décision de l'auteur, prise le même jour : « le verrou de Boèce ne
-- tient plus ».
--
-- ⚠️ **La FONCTION est conservée**, et seul le déclencheur tombe. Reposer le verrou
-- ne demande donc qu'une ligne :
--
--     create trigger trg_guard_boece_source_immutability_v3
--       before update or delete on public.segments
--       for each row execute function internal.guard_boece_source_immutability_v3();
--
-- Ce qu'il bloquait, et qui se fait maintenant : la migration des 2 305 vers de Boèce
-- vers `segment_metadata.forme = 'vers'`, pour que le vers ne se déclare plus que
-- d'une seule façon (charte § 7.4).

begin;

drop trigger if exists trg_guard_boece_source_immutability_v3 on public.segments;

comment on function internal.guard_boece_source_immutability_v3() is
  'Gelait la structure source de Boèce (A0064O0001) sur vingt-six champs, nature comprise. Déclencheur RETIRÉ le 2026-08-29 sur décision de l''auteur ; la fonction reste pour qu''on puisse le reposer d''une ligne.';

commit;
