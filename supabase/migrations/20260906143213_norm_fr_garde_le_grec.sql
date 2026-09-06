-- ⛔ LA NORMALISATION DE RECHERCHE EFFAÇAIT TOUT LE GREC (2026-09-06).
--
-- norm_fr finissait sur un « regexp_replace(…, '[^a-z0-9]+', ' ') » : tout ce qui n'est
-- pas une lettre ASCII ou un chiffre disparaît. Le français et le latin y survivent,
-- f_unaccent les ayant déjà rendus à l'ASCII ; le GREC, lui, était intégralement supprimé.
--
-- Conséquence mesurée le 2026-09-06 : versets_recherche porte 26 731 lignes pour la
-- Septante, dont 26 349 avec un texte_norm VIDE — les 382 autres ne gardent qu'un résidu
-- de chiffres et de lettres latines. La Septante n'était donc PAS cherchable : le mot
-- grec de « Dieu » rendait zéro, quand la colonne du texte le porte dans 225 versets.
-- Le défaut était invisible parce qu'il ne fait rien échouer : la recherche répond, elle
-- répond « aucun résultat ».
--
-- ⚠️ Le commentaire de recherche_segments_v2_corresp décrivait déjà ce défaut sans le
-- nommer — « le grec en a besoin, et λόγος disparaîtrait de la normalisation
-- française » — et l'avait contourné sur le seul texte_original des segments.
--
-- ── Ce qui change, et ce qui ne change pas ──────────────────────────────────
-- Trois ajouts, tous bornés au grec :
--   le sigma FINAL se ramène au sigma ordinaire (lower ne connaît pas la règle
--     contextuelle du grec, et deux formes d'un même mot doivent partager leur préfixe) ;
--   une passe NFD retire les signes combinants que f_unaccent a laissés, esprits,
--     iota souscrit et tréma compris ; sur du texte déjà rendu à l'ASCII, elle est
--     l'identité, et elle ne touche donc ni le français ni le latin ;
--   la classe finale garde les vingt-quatre lettres grecques, écrites en toutes
--     lettres — une plage de α à ω dépendrait de l'ordre de la collation.
--
-- ⛔ MESURÉ SUR TOUT LE CORPUS AVANT D'ÊTRE APPLIQUÉ, et c'est la seule chose qui
-- autorise à toucher au cœur de la recherche :
--   versets_lecture : TR0001 35 718 · TR0002 31 170 · TR0003 35 588 · TR0004 35 722 —
--     ZÉRO différence, pas un verset de Sacy, Segond, Crampon ni de la Vulgate ;
--     TR0005 26 731 lignes changent, TOUTES expliquées par le seul grec rendu.
--   segments : 109 125 lignes, 1 193 diffèrent, et les 1 193 s'expliquent entièrement
--     par le grec — retirer les lettres grecques du nouveau résultat redonne l'ancien
--     au caractère près. Ce sont les segments grecs et les français qui citent un mot
--     grec dans leur fil.
--
-- ⚠️ LE NOM RESTE norm_fr, et il est devenu un abus de langage : c'est la normalisation
-- de RECHERCHE du site, et elle sert trois langues. Le renommer toucherait une colonne
-- engendrée de 109 125 lignes, une vue matérialisée et cinq fonctions ; on garde le nom
-- et on écrit ce qu'il fait.
--
-- ⚠️ APRÈS CETTE MIGRATION, deux gestes sont nécessaires et ne sont pas dedans (l'un
-- écrit des lignes, l'autre ne peut pas vivre dans une transaction) :
--   update public.segments set segment_texte = segment_texte
--    where texte_norm is distinct from public.norm_fr(segment_texte);
--   refresh materialized view concurrently public.versets_recherche;
-- Les deux ont été joués le 2026-09-06 ; contrôle : plus aucun segment désaccordé, et
-- la Septante rend 1 378 versets pour « Dieu », 3 056 pour « Seigneur », 231 pour
-- « Parole », en 33 ms.
--
-- Retour en arrière : sql/rollback_norm_fr_garde_le_grec_20260906.sql
create or replace function public.norm_fr(t text)
 returns text language sql immutable parallel safe
 set search_path to 'public', 'extensions', 'pg_temp'
as $function$
select trim(regexp_replace(
  regexp_replace(
  regexp_replace(
  regexp_replace(
  regexp_replace(
  regexp_replace(
  regexp_replace(
  regexp_replace(
    regexp_replace(
      normalize(translate(f_unaccent(lower(coalesce(t,''))), 'ς', 'σ'), NFD),
      '[' || chr(768) || '-' || chr(879) || ']', '', 'g'),
    '(conn|reconn|par|appar|compar|acc|croi|dec|empl|nett)oi(t|tr|ss)', '\1ai\2', 'g'), -- connoître, paroissoit…
    '([a-z]{2,})oit(s?)\y', '\1ait\2', 'g'),        -- étoit, avoit, disoit → était…
    '([a-z]{2,})oient\y', '\1aient', 'g'),          -- étoient → étaient
    '\yfoibl', 'faibl', 'g'),
    '\ytems\y', 'temps', 'g'),
    '\yenfans\y', 'enfants', 'g'),
    '\yscav', 'sav', 'g'),                          -- sçavoir (ç déjà plié en c)
  '[^a-z0-9αβγδεζηθικλμνξοπρστυφχψω]+', ' ', 'g'));
$function$;
