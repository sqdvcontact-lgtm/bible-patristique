-- Retour en arrière assumé sur la migration précédente. En `security_invoker`, la
-- politique de `segments` et celle de `liens_bibliques` se réévaluent à l'intérieur de
-- l'agrégat : le plan passe de quelques centaines de millisecondes à 2,4 s cache chaud,
-- et dépasse le délai d'attente à froid. La page /statistiques renvoyait une 500.
-- Le contenu de cette vue est un décompte de citations, sans donnée personnelle : la
-- lecture élargie qu'elle autorise est un moindre mal devant une page cassée.
-- La vraie réponse est une vue MATÉRIALISÉE rafraîchie sur demande, sur le modèle de
-- `oeuvres_controle_stats_mat` ; tant qu'elle n'existe pas, on garde le DEFINER.
alter view public.versets_plus_cites set (security_invoker = false);
