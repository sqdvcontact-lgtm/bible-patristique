-- `vers` SORT DU VOCABULAIRE DES NATURES (2026-08-29).
--
-- La poésie ne se déclare plus que d'une façon : `segment_metadata.forme = 'vers'`.
--
-- ⛔ Ce n'est pas un retrait de fonction, c'est la fin d'une SECONDE ÉCRITURE. Un
-- segment d'apparat vaut `apparat_critique` — c'est par là qu'il est SÉLECTIONNÉ —
-- et il ne peut pas dire en plus qu'il est en vers : il fallait donc un axe qui dise
-- la MATIÈRE sans toucher à la nature, exactement comme le paratexte biblique le fait
-- depuis toujours avec son couple `kind` × `form`. Une fois cet axe posé, garder la
-- nature en parallèle laissait deux façons de dire le même fait — et deux façons de
-- dire un même fait finissent toujours par diverger.
--
-- ⚠️ Elles avaient DÉJÀ divergé. Trois lecteurs du site jugeaient le vers sur la seule
-- nature, sans passer par le prédicat `estEnVers` : la lecture bilingue
-- (`bilingueAlignement.ts`) et deux endroits des traductions parallèles
-- (`ComparaisonTraductions.tsx`). Ils sont recâblés dans le même commit.
--
-- LES DONNÉES : 2 325 segments ont migré, sans qu'aucun change de composition.
-- La nature retombe sur celle de ses FRÈRES — ce que porte, dans le même espace, un
-- bloc de même fonction :
--
--   · 1 213 vers de Boèce, Ceriziers 1646  → `texte`        (espace `corps`)
--   ·  1 092 vers de Boèce, Mirandol 1861  → `texte`        (espace `corps`)
--   ·     20 vers de Dhuoda, Bondurand 1887 → `introduction` (espace `introduction`)
--
-- Sauvegarde : `internal.backup_vers_forme_20260829` (lignes entières).
-- Retour en arrière : `sql/rollback_vers_forme_20260829.sql`.
--
-- ⚠️ Cette migration a demandé la levée préalable du verrou d'immutabilité de Boèce
-- (`20260829140000_boece_verrou_leve.sql`), qui gelait `nature` sur `A0064O0001`.

begin;

alter table public.segments
  drop constraint if exists chk_segments_nature;

alter table public.segments
  add constraint chk_segments_nature
  check (nature = any (array[
    'texte', 'citation', 'verset', 'lemme', 'rubrique', 'dialogue',
    'signature', 'separateur', 'apparat_critique', 'apparat_auteur',
    'apparat_editeur', 'texte absent', 'introduction'
  ]));

commit;
