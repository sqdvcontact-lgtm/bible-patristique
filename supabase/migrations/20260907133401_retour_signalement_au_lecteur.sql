-- Le retour du modérateur au lecteur qui a signalé (2026-09-07)
--
-- « Traité et remercier » écrit `message_admin` sur le signalement, et le volet des
-- notifications le lit avec LA SESSION DU LECTEUR (app/lib/notificationsClient.ts).
-- Or la seule politique de lecture était `is_admin()` : la requête ne rendait jamais
-- rien, sans la moindre erreur — RLS filtre, elle ne se plaint pas —, et le
-- remerciement n'atteignait personne. Une ligne en portait un depuis juillet, jamais
-- affichée.
--
-- On ouvre donc la lecture de SA PROPRE ligne, et d'elle seule. Rien d'autrui n'y
-- entre : un signalement ne porte que ce que son auteur a écrit et la réponse qui lui
-- est destinée.
create policy "signalements_lecture_propre" on public.signalements
  as permissive for select to authenticated
  using (user_id = (select auth.uid()));

-- Un signalement se fait à visage connu (charte, « Compte requis pour interagir »).
-- La politique d'insertion acceptait `user_id is null` : un compte connecté pouvait
-- déposer un signalement NON SIGNÉ en écrivant en direct, hors de la route — laquelle
-- exige une session et renseigne toujours l'auteur. On ferme la porte, pour que
-- « signalé par » ne puisse plus valoir « Anonyme ». La route d'API passe par la clé
-- de service et n'est pas concernée par cette politique.
drop policy if exists "signalements_insertion" on public.signalements;
create policy "signalements_insertion" on public.signalements
  as permissive for insert to authenticated
  with check (user_id = (select auth.uid()));
