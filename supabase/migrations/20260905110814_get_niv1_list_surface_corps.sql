begin;

-- Le sommaire du lecteur est une projection du CORPS. `ref_niv1` est partagé
-- entre les surfaces : sa seule présence ne suffit donc pas à faire entrer une
-- division dans le sommaire.
create or replace function public.get_niv1_list(
  p_id_oeuvre text,
  p_id_texte text
)
returns table(ref_niv1 text)
language sql
stable
security invoker
set search_path = ''
as $function$
  select niveaux.ref_niv1
  from (
    select s.ref_niv1, min(s.segment_numero) as premier
    from public.segments s
    where s.id_oeuvre = p_id_oeuvre
      and s.id_texte = p_id_texte
      and s.ref_niv1 is not null
      and s.ref_niv1 <> ''
      -- Miroir SQL de NATURES_CORPS dans app/lib/oeuvreSelects.ts.
      and s.nature = any(array[
        'texte', 'introduction', 'citation', 'lemme', 'dialogue',
        'texte absent', 'verset', 'rubrique', 'signature', 'apparat_auteur'
      ])
      -- L'espace explicite l'emporte sur la nature, notamment pour les
      -- signatures éditoriales et les données historiques reclassées.
      and s.espace_textuel is distinct from 'apparat_critique'
    group by s.ref_niv1
  ) niveaux
  order by niveaux.premier
$function$;

comment on function public.get_niv1_list(text, text) is
  'Niveaux 1 du corps uniquement, dans l ordre du premier segment; exclut toujours la surface apparat_critique.';

-- L'administration des styles doit continuer à pouvoir ouvrir toutes les
-- divisions, y compris celles qui n'existent que dans l'apparat. Cette RPC
-- conserve explicitement l'ancien contrat global sans l'exposer au lecteur.
create or replace function public.get_niv1_list_global(
  p_id_oeuvre text,
  p_id_texte text
)
returns table(ref_niv1 text)
language sql
stable
security invoker
set search_path = ''
as $function$
  select niveaux.ref_niv1
  from (
    select s.ref_niv1, min(s.segment_numero) as premier
    from public.segments s
    where s.id_oeuvre = p_id_oeuvre
      and s.id_texte = p_id_texte
      and s.ref_niv1 is not null
      and s.ref_niv1 <> ''
      and s.nature <> 'separateur'
    group by s.ref_niv1
  ) niveaux
  order by niveaux.premier
$function$;

comment on function public.get_niv1_list_global(text, text) is
  'Niveaux 1 de toutes les surfaces, réservés aux outils d administration.';

revoke execute on function public.get_niv1_list_global(text, text)
  from public, anon, authenticated;
grant execute on function public.get_niv1_list_global(text, text)
  to service_role;

commit;
