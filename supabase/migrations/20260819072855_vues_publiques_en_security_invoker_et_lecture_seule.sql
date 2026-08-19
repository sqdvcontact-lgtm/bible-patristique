-- Dix vues du schéma public tournaient en SECURITY DEFINER : elles lisaient leurs
-- tables avec les droits de leur propriétaire, donc SANS la RLS de l'appelant. Le
-- rôle `authenticated` détenait de surcroît INSERT/UPDATE/DELETE sur plusieurs
-- d'entre elles, sans usage (une vue de jointure n'est de toute façon pas modifiable).

-- 1. Une vue de lecture ne s'écrit pas.
revoke insert, update, delete, truncate, references, trigger on
  public.oeuvres_controle_stats,
  public.oeuvres_liens_stats,
  public.versets_plus_cites,
  public.avancement_liens,
  public.classement_utilisateurs,
  public.livres_par_traduction,
  public.v_chronologie_auteurs_dates,
  public.v_bible899_verse_recomposed,
  public.v_frise_generale_base,
  public.v_chronologie_auteurs
from authenticated, anon;

-- 2. La RLS de l'appelant s'applique désormais. Vérifié table par table avant bascule :
--    auteurs et versets_v2 sont en lecture libre, evenements filtre sur `est_publie`,
--    segments / oeuvres / liens_bibliques filtrent sur les œuvres publiques ou rendent
--    tout à un administrateur (`is_admin()`).
alter view public.oeuvres_controle_stats     set (security_invoker = true);
alter view public.oeuvres_liens_stats        set (security_invoker = true);
alter view public.versets_plus_cites         set (security_invoker = true);
alter view public.avancement_liens           set (security_invoker = true);
alter view public.livres_par_traduction      set (security_invoker = true);
alter view public.v_chronologie_auteurs      set (security_invoker = true);
alter view public.v_chronologie_auteurs_dates set (security_invoker = true);
alter view public.v_frise_generale_base      set (security_invoker = true);

-- `classement_utilisateurs` et `v_bible899_verse_recomposed` restent en DEFINER,
-- volontairement : la première lit `profils`, dont la politique de lecture est
-- « soi-même » — en invoker, le panneau patristique et les essais ne pourraient plus
-- afficher le score des AUTRES lecteurs. La seconde sert le chantier Bible 899 en
-- cours, dont les segmentations non publiées disparaîtraient de la vue.
