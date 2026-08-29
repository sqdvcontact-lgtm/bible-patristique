-- RETOUR EN ARRIÈRE — la nature `vers` rendue au vocabulaire (2026-08-29).
--
-- Ce que la migration a fait : les 2 325 segments qui portaient `nature = 'vers'` ont
-- reçu `segment_metadata.forme = 'vers'` et la nature de leurs FRÈRES — `texte` dans
-- le corps, `introduction` dans l'espace d'introduction —, puis `chk_segments_nature`
-- a perdu `vers`.
--
--   · 1 213 vers de Boèce, Ceriziers 1646   (TXT_A0064O0001_FR_1646_CERIZIERS)
--   · 1 092 vers de Boèce, Mirandol 1861    (TXT_A0064O0001_FR_1861_MIRANDOL)
--   ·    20 vers de Dhuoda, Bondurand 1887  (TXT_A0176O0001_1887_BONDURAND)
--
-- ⚠️ Rejouer ce fichier ne suffit PAS à revenir en arrière : le code ne lit plus la
-- nature. `estEnVers` (`app/lib/compositionVers.ts`) ne juge que sur la forme, et la
-- forme est laissée en place ci-dessous — les segments porteraient donc les DEUX
-- écritures, ce que la migration existait précisément pour défaire. Un vrai retour
-- demande de rétablir aussi la branche de nature dans le prédicat.
--
-- ⚠️ Il faut en outre reposer le verrou de Boèce si l'on veut le rétablir :
--
--     create trigger trg_guard_boece_source_immutability_v3
--       before update or delete on public.segments
--       for each row execute function internal.guard_boece_source_immutability_v3();
--
-- Sauvegarde : internal.backup_vers_forme_20260829 (lignes entières, 2 325).

begin;

-- 1. Rendre `vers` à la contrainte, sinon l'UPDATE échoue.
alter table public.segments
  drop constraint if exists chk_segments_nature;

alter table public.segments
  add constraint chk_segments_nature
  check (nature = any (array[
    'texte', 'citation', 'verset', 'lemme', 'vers', 'rubrique', 'dialogue',
    'signature', 'separateur', 'apparat_critique', 'apparat_auteur',
    'apparat_editeur', 'texte absent', 'introduction'
  ]));

-- 2. Rendre la nature d'origine. ⚠️ La forme reste posée : voir l'avertissement.
update segments s
   set nature = b.nature
  from internal.backup_vers_forme_20260829 b
 where b.id = s.id;

-- Contrôle : 2 325 segments doivent reprendre la nature `vers`.
select nature, count(*) from segments where nature = 'vers' group by 1;

commit;
