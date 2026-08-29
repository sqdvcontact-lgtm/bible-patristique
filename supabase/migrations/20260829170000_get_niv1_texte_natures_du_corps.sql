-- `get_niv1_texte` portait une QUATRIÈME copie de la liste des natures du corps (2026-08-29).
--
-- La fonction dit quels niveaux 1 ont du texte : c'est elle qui décide qu'une division
-- entre au sommaire de lecture, ou qu'elle n'existe pas pour le lecteur. Elle jugeait
-- sur sa propre liste, écrite en dur, et cette liste avait divergé de `NATURES_CORPS`
-- sur les deux bords à la fois :
--
--   · elle IGNORAIT `lemme`, `verset`, `signature` et `apparat_auteur` ;
--   · elle nommait encore `vers`, retirée du vocabulaire le jour même
--     (`20260829150000_segments_nature_vers_retiree.sql`), donc morte.
--
-- CE QUE CELA COÛTAIT : une division dont tout le texte est d'une nature ignorée
-- disparaissait du sommaire ET des flèches ‹ ›. Quatre œuvres PUBLIÉES y perdaient leur
-- ouverture, quatre-vingt-trois segments d'`apparat_auteur` en tout — c'est-à-dire la
-- préface de l'auteur lui-même, celle que la charte range expressément au corps :
--
--   · « Préface »  du Commentaire sur Isaïe de Chrysostome  (A0014O0049) — 25 segments
--   · « Prologue » du Commentaire sur Jonas de Jérôme       (A0051O0022) — 22 segments
--   · « Prologue » du Commentaire sur Abdias                (A0051O0045) — 20 segments
--   · « Prologue » du Commentaire sur Joël                  (A0051O0043) — 16 segments
--
-- ⛔ La liste doit rester le MIROIR EXACT de `NATURES_CORPS` (`app/lib/oeuvreSelects.ts`).
-- Une garde la relit désormais depuis ce fichier (`oeuvreSelects.test.ts`) : la modifier
-- ici sans l'y modifier fait échouer les tests, ce qui est le seul moment où l'on peut
-- encore y penser. C'est la TROISIÈME fois qu'une liste de natures recopiée coûte du
-- texte au lecteur, et la première où la copie vivait en base.

begin;

create or replace function public.get_niv1_texte(p_id_oeuvre text, p_id_texte text)
returns table(ref_niv1 text, ref_niv1_texte text)
language sql
stable
set search_path to 'public', 'pg_temp'
as $function$
  select s.ref_niv1,
         (array_agg(s.ref_niv1_texte order by s.segment_numero)
            filter (where s.ref_niv1_texte is not null and s.ref_niv1_texte <> ''))[1]
  from public.segments s
  where s.id_oeuvre = p_id_oeuvre
    and s.id_texte = p_id_texte
    and s.ref_niv1 is not null and s.ref_niv1 <> ''
    -- ⛔ MIROIR de `NATURES_CORPS` : voir l'en-tête de cette migration.
    and s.nature = any(array[
      'texte', 'introduction', 'citation', 'lemme', 'dialogue', 'texte absent',
      'verset', 'rubrique', 'signature', 'apparat_auteur'
    ])
  group by s.ref_niv1
$function$;

commit;
