-- Vue d'agrégats de liens par œuvre, pour l'admin (« Contrôle des œuvres ») :
-- combien de liens, et quand ils ont été modifiés pour la dernière fois.
-- Les liens sont rattachés au SEGMENT (liens_bibliques.segment_id), jamais
-- directement à l'œuvre : on remonte à l'œuvre par une jointure sur segments.
-- Jointure INTERNE : une œuvre sans lien n'apparaît pas (le front affiche alors
-- « aucun lien »). Agrégat léger, lu en une seule requête.

CREATE OR REPLACE VIEW public.oeuvres_liens_stats AS
SELECT s.id_oeuvre,
       COUNT(l.id)          AS nb_liens,
       MAX(l.updated_at)    AS derniere_maj,
       MAX(l.created_at)    AS dernier_ajout
FROM public.segments s
JOIN public.liens_bibliques l ON l.segment_id = s.id
GROUP BY s.id_oeuvre;

GRANT SELECT ON public.oeuvres_liens_stats TO anon, authenticated;
