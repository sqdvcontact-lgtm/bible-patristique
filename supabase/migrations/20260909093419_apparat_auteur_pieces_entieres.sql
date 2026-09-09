-- L'APPARAT DE L'AUTEUR PARAÎT AUSSI DANS LA VUE D'APPARAT, MAIS PAR PIÈCES ENTIÈRES.
--
-- Décision de l'auteur du 9 septembre 2026 : la vue d'apparat doit montrer les DEUX
-- apparats, celui de l'auteur et celui de l'éditeur, distingués l'un de l'autre. ⛔ Le
-- premier ne quitte pas le corps pour autant : il continue de se lire à sa place dans
-- le fil du texte, et c'est la SEULE matière du site qui paraisse sur deux surfaces.
-- Son retrait du corps avait fait disparaître le « Prologue de Rufin aux livres X et
-- XI » le 18 août 2026 : l'écho AJOUTE une surface, il n'en retire aucune.
--
-- ⛔ Une PIÈCE, et non un fragment. Sur les 190 segments d'`apparat_auteur` du corpus,
-- 38 ne sont pas des pièces autonomes : dix paragraphes pris au milieu du « Livre I »
-- d'Eusèbe (209 segments), trois dans le « Livre cinquième » de la Cité de Dieu, un
-- seul dans la « Procatéchèse » de Cyrille. Répétés dans l'apparat, ils y paraîtraient
-- sans le texte qui les entoure, c'est-à-dire tronqués. Cette fonction ne rend donc que
-- les divisions dont TOUT le corps est de la main de l'auteur : neuf au 9 septembre
-- 2026, 152 segments. ⚠️ Le compte se refait à chaque affichage, et il le faut : onze
-- segments du « Prologue de Rufin » sont entrés dans le texte de Seyssel le jour même
-- où cette fonction s'écrivait.
--
-- ⚠️ `is distinct from 'apparat_critique'` et non `in ('corps', 'introduction')` : ce
-- qui infirme la pureté d'une division, c'est un segment d'une AUTRE nature sur la
-- MÊME surface, y compris une ligne héritée sans espace textuel. Un `in` la laisserait
-- hors du compte et rendrait pure une division qui ne l'est pas.

create or replace function public.get_niv1_apparat_auteur(p_id_oeuvre text, p_id_texte text)
returns table(ref_niv1 text)
language sql
stable
set search_path to ''
as $function$
  select s.ref_niv1
  from public.segments s
  where s.id_oeuvre = p_id_oeuvre
    and s.id_texte = p_id_texte
    and s.ref_niv1 is not null
    and s.ref_niv1 <> ''
    and s.espace_textuel is distinct from 'apparat_critique'
  group by s.ref_niv1
  having count(*) filter (where s.nature <> 'apparat_auteur') = 0
$function$;

-- Les mêmes droits que les deux RPC de sommaire : le rôle anonyme n'entre pas.
revoke execute on function public.get_niv1_apparat_auteur(text, text) from public, anon;
grant execute on function public.get_niv1_apparat_auteur(text, text) to authenticated, service_role;
