-- La surface explicite d'un segment prime sur sa nature.
--
-- Un `apparat_editeur` peut être une introduction de lecture (Avis au lecteur)
-- ou appartenir à l'apparat (Approbation, Privilège). Les RPC du sommaire doivent
-- appliquer le même contrat que `app/lib/oeuvreSelects.ts`.

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
            'texte absent', 'verset', 'rubrique', 'signature', 'apparat_auteur'
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
          'texte absent', 'verset', 'rubrique', 'signature', 'apparat_auteur'
        ])
      )
    )
  group by s.ref_niv1
$function$;
