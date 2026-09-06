-- OÙ LES PÈRES PARLENT, chapitre par chapitre.
--
-- 37 % du canon porte au moins un renvoi patristique, et la page biblique n'en laissait
-- rien voir : le lecteur cliquait un verset et découvrait, ou ne découvrait pas (audit des
-- liens, 2026-09-06). Cette vue donne au volet de navigation de quoi teinter ses cases de
-- chapitre.
--
-- ⛔ ELLE NE RECALCULE RIEN. Elle s'appuie sur `versets_plus_cites_mat`, le cache que le
-- centre de contrôle rafraîchit déjà (`rafraichir_versets_plus_cites`) et dont le score
-- est la mesure MAISON de ce qu'un verset a reçu : un commentaire pèse plus qu'une
-- citation, une citation plus qu'une allusion, et un lien à constituer compte pour moitié.
-- Une seconde mesure, calculée autrement, ferait dire deux choses au même corpus.
--
-- ⛔ LE CRAN EST UN RANG, JAMAIS UNE VALEUR. Mesuré le 2026-09-06 : 1 221 chapitres sur
-- 1 334 portent quelque chose, la médiane est à 22 renvois et le maximum à 2 773. Une
-- échelle linéaire donnerait un chapitre en feu et douze cents éteints ; `ntile` découpe
-- les chapitres POURVUS en cinq groupes de taille égale (244 · 244 · 243 · 243 · 243), et
-- le cinquième s'ouvre sur Genèse 1, Matthieu 5 et Genèse 3.
--
-- ⛔ ET LE RANG SE PREND SUR TOUT LE CANON, jamais dans le livre ouvert. Matthieu paraît
-- alors presque uniformément vif, ce qui est VRAI ; un rang relatif au livre dirait que le
-- meilleur chapitre de Nahum vaut Genèse 1, ce qui est faux.
--
-- ⚠️ Un chapitre sans aucun renvoi n'a PAS de ligne : l'absence de teinte est un état, et
-- non un sixième cran.
create or replace view public.densite_patristique_chapitres
with (security_invoker = true) as
with par_chapitre as (
  select livre,
         chapitre,
         count(*)::integer as versets_commentes,
         sum(score)::integer as score
  from public.versets_plus_cites_mat
  group by livre, chapitre
)
select livre,
       chapitre,
       versets_commentes,
       score,
       ntile(5) over (order by score)::integer as cran
from par_chapitre;

comment on view public.densite_patristique_chapitres is
  'Densité patristique par chapitre, tirée de versets_plus_cites_mat. `cran` est un RANG sur cinq, découpé sur les chapitres pourvus, jamais un seuil de valeur.';

grant select on public.densite_patristique_chapitres to anon, authenticated, service_role;
