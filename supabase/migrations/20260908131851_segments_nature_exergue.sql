-- La nature `exergue` — le verset posé en SEUIL d'une pièce, et sa traduction.
--
-- Un `lemme` est la phrase qu'un commentaire explique à sa place et se lit dans le fil
-- (charte § 3.8, décision de l'auteur du 20 août 2026) ; un exergue annonce la pièce
-- entière et se compose en retrait du quart de la mesure. Les trente-huit segments des
-- Catéchèses baptismales de Cyrille de Jérusalem (A0044O0003) portaient la première
-- nature faute de la seconde.
--
-- ⛔ La contrainte est le MIROIR EXACT de `NATURE_VALIDES` (app/lib/naturesSegments.ts),
-- que `naturesSegments.test.ts` recopie à la main pour l'exiger.

alter table public.segments drop constraint if exists chk_segments_nature;

alter table public.segments add constraint chk_segments_nature check (
  nature = any (array[
    'texte', 'citation', 'verset', 'lemme', 'rubrique', 'dialogue',
    'signature', 'separateur', 'apparat_critique', 'apparat_auteur',
    'apparat_editeur', 'texte absent', 'introduction', 'exergue'
  ])
);

-- ⛔ Les deux RPC du sommaire portent le miroir SQL de `NATURES_CORPS`
-- (app/lib/oeuvreSelects.ts), et `oeuvreSelects.test.ts` relit la DERNIÈRE migration
-- qui les définit pour exiger l'égalité. Une nature ajoutée au corps et oubliée ici ne
-- serait pas mal composée : sa division n'entrerait pas au sommaire, en silence.

create or replace function public.get_niv1_list(p_id_oeuvre text, p_id_texte text)
returns table(ref_niv1 text)
language sql
stable
set search_path to ''
as $function$
  select niveaux.ref_niv1
  from (
    select s.ref_niv1, min(s.segment_numero) as premier
    from public.segments s
    where s.id_oeuvre = p_id_oeuvre
      and s.id_texte = p_id_texte
      and s.ref_niv1 is not null
      and s.ref_niv1 <> ''
      and (
        s.espace_textuel in ('corps', 'introduction')
        or (
          s.espace_textuel is null
          and s.nature = any(array[
            'texte', 'introduction', 'citation', 'lemme', 'dialogue',
            'texte absent', 'verset', 'rubrique', 'signature', 'apparat_auteur',
            'exergue'
          ])
        )
      )
    group by s.ref_niv1
  ) niveaux
  order by niveaux.premier
$function$;

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
    and s.ref_niv1 is not null
    and s.ref_niv1 <> ''
    and (
      s.espace_textuel in ('corps', 'introduction')
      or (
        s.espace_textuel is null
        and s.nature = any(array[
          'texte', 'introduction', 'citation', 'lemme', 'dialogue',
          'texte absent', 'verset', 'rubrique', 'signature', 'apparat_auteur',
          'exergue'
        ])
      )
    )
  group by s.ref_niv1
$function$;
