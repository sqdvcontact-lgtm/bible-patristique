-- ⛔ La clé d’un éditeur perdait ses capitales accentuées.
-- 29 août 2026.
--
-- `public.cle_editeur` translittérait AVANT de passer en minuscules. Le jeu de départ
-- ne portant que des minuscules accentuées, une capitale accentuée traversait la
-- translittération intacte, puis tombait sous « [^a-z0-9] » et DISPARAISSAIT :
-- « Éditions du Cerf » avait pour clé « ditions du cerf ».
--
-- Deux conséquences. La clé SQL ne s’accordait plus avec `cleEditeur`
-- (`app/lib/editeursNormalisation.ts`), qui décompose en NFD et rend « editions du
-- cerf » ; et deux graphies d’une même maison, l’une accentuée et l’autre non, ne se
-- rejoignaient pas — ce qui est précisément l’office d’une clé.
--
-- 71 noms atteints dans chaque référentiel. Mesuré AVANT application : la correction
-- ne confond aucune fiche et n’ouvre aucune fusion nouvelle. Aucun index ni aucune vue
-- ne dépend de cette fonction ; seuls en dépendent `resoudre_editeur` et les
-- déclencheurs de fusion, qui s’en trouvent corrigés du même coup.
--
-- ⚠️ `internal.normaliser_cle_bibliographique`, qui calcule `editeurs_valeur.cle_normalisee`,
-- ne portait pas le défaut : elle nomme les deux casses dans son jeu de départ.

create or replace function public.cle_editeur(brut text)
returns text
language sql
immutable
set search_path to 'public', 'pg_temp'
as $fn$
  select trim(regexp_replace(
    translate(lower(coalesce(brut, '')),
      'àâäáãçéèêëíìîïñóòôöõúùûüýÿ',
      'aaaaaceeeeiiiinooooouuuuyy'),
    '[^a-z0-9]+', ' ', 'g'))
$fn$;

comment on function public.cle_editeur(text) is
  'Clé de comparaison d’une graphie d’éditeur : minuscule, sans accents ni ponctuation. Doit rendre exactement ce que rend `cleEditeur` côté TypeScript.';
