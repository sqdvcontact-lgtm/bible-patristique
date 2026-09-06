-- `livres_par_traduction` fait FOI pour l'absence d'un livre dans une bible : c'est elle
-- que `BibleLayout` interroge avant d'ouvrir « ce livre n'est pas dans cette édition ».
-- Elle ne comptait que `versets_v2`, si bien que les écrits sans créneau canonique y
-- étaient absents de TOUTES les traductions, y compris de celle qui les porte. Ils
-- viennent de recevoir un chemin de lecture ; ils doivent maintenant se déclarer, sans
-- quoi la Septante ouvrirait 1 Esdras sur un avis d'absence.
--
-- ⚠️ L'union est REGROUPÉE et non simplement concaténée : aujourd'hui aucun couple
-- (traduction, livre) n'existe des deux côtés, mais une addition future ne doit pas
-- rendre deux lignes pour un même livre.
create or replace view public.livres_par_traduction
with (security_invoker = true) as
select trad_id, livre, sum(nb)::bigint as nb_versets
from (
  select trad_id, livre, count(*) as nb
  from public.versets_v2
  where texte is not null and texte <> ''
  group by trad_id, livre
  union all
  select trad_id, livre, count(*) as nb
  from public.versets_apocryphes
  where texte is not null and texte <> ''
  group by trad_id, livre
) tout
group by trad_id, livre;

comment on view public.livres_par_traduction is
  'Livres réellement portés par chaque bible, ossature et écrits non canoniques réunis. Fait foi pour l''absence.';

grant select on public.livres_par_traduction to authenticated, service_role;
