-- L'adresse d'un auteur de commentaire ne se lit plus depuis l'API :
-- le rôle authenticated perd la lecture de la table et reçoit celle
-- de chaque colonne, auteur_mail exceptée. anon n'avait aucun droit.
-- Préalable déployé : ad709d0f (plus de select() implicite à l'insertion).
set local lock_timeout = '5s';
revoke select, truncate, references, trigger on public.commentaires from authenticated;
grant select (id, texte, auteur_nom, valide, created_at, id_segment, id_verset, user_id,
  reponse_a, demande_validation, certifie, supprime, message_admin, message_admin_at)
  on public.commentaires to authenticated;
