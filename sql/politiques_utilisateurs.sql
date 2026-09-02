-- Politiques RLS et droits des tables d’utilisateurs, TELS QUE LA BASE LES APPLIQUE.
-- Relevé par `node --env-file=.env.local scripts/audit-droits-lecteur.mjs --politiques`.
-- Ce fichier est un MIROIR : on ne l’édite pas, on change la base par migration puis on le relève.
-- Relevé du 2026-09-02.

-- profils : RLS activée
--   authenticated : DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
create policy "profils_suppression" on public.profils as permissive for delete to public
  using ((( SELECT auth.uid() AS uid) = id));
create policy "profils_creation" on public.profils as permissive for insert to public
  with check ((( SELECT auth.uid() AS uid) = id));
create policy "profils_lecture" on public.profils as permissive for select to public
  using ((( SELECT auth.uid() AS uid) = id));
create policy "profils_modification" on public.profils as permissive for update to public
  using ((( SELECT auth.uid() AS uid) = id));

-- admin_users : RLS activée ; aucun droit pour anon ni authenticated
-- (aucune politique : table fermée à l’API, clé de service seulement)

-- commentaires : RLS activée
--   authenticated : DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
create policy "commentaires_suppression" on public.commentaires as permissive for delete to public
  using (( SELECT is_admin() AS is_admin));
create policy "commentaires_insertion" on public.commentaires as permissive for insert to public
  with check (((( SELECT auth.uid() AS uid) = user_id) OR ( SELECT is_admin() AS is_admin)));
create policy "commentaires_lecture" on public.commentaires as permissive for select to public
  using (((valide = true) OR (( SELECT auth.uid() AS uid) = user_id) OR ( SELECT is_admin() AS is_admin)));
create policy "commentaires_modification" on public.commentaires as permissive for update to public
  using (((( SELECT auth.uid() AS uid) = user_id) OR ( SELECT is_admin() AS is_admin)))
  with check (((( SELECT auth.uid() AS uid) = user_id) OR ( SELECT is_admin() AS is_admin)));

-- commentaires_likes : RLS activée
--   authenticated : DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
create policy "likes_retrait" on public.commentaires_likes as permissive for delete to public
  using ((( SELECT auth.uid() AS uid) = user_id));
create policy "likes_ajout" on public.commentaires_likes as permissive for insert to public
  with check ((( SELECT auth.uid() AS uid) = user_id));
create policy "Lecture publique des likes" on public.commentaires_likes as permissive for select to public
  using (true);

-- essais : RLS activée
--   authenticated : DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
create policy "essais_ecriture_auteur" on public.essais as permissive for insert to public
  with check ((( SELECT auth.uid() AS uid) = user_id));
create policy "essais_lecture_publique" on public.essais as permissive for select to public
  using (((statut = 'publie'::text) OR (( SELECT auth.uid() AS uid) = user_id)));
create policy "essais_modification_auteur" on public.essais as permissive for update to public
  using ((( SELECT auth.uid() AS uid) = user_id));

-- essais_commentaires : RLS activée
--   authenticated : DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
create policy "essais_commentaires_ecriture" on public.essais_commentaires as permissive for insert to public
  with check ((( SELECT auth.uid() AS uid) = user_id));
create policy "essais_commentaires_lecture" on public.essais_commentaires as permissive for select to public
  using (((valide = true) OR (( SELECT auth.uid() AS uid) = user_id) OR ( SELECT is_admin() AS is_admin)));
create policy "essais_commentaires_suppression_propre" on public.essais_commentaires as permissive for update to public
  using ((( SELECT auth.uid() AS uid) = user_id));

-- essais_appreciations : RLS activée
--   authenticated : DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
create policy "essais_appreciations_suppression" on public.essais_appreciations as permissive for delete to public
  using ((( SELECT auth.uid() AS uid) = user_id));
create policy "essais_appreciations_ecriture" on public.essais_appreciations as permissive for insert to public
  with check ((( SELECT auth.uid() AS uid) = user_id));
create policy "essais_appreciations_lecture" on public.essais_appreciations as permissive for select to public
  using (true);

-- catalogue_votes : RLS activée
--   authenticated : DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
create policy "votes_delete" on public.catalogue_votes as permissive for delete to authenticated
  using ((( SELECT auth.uid() AS uid) = user_id));
create policy "votes_insert" on public.catalogue_votes as permissive for insert to authenticated
  with check ((( SELECT auth.uid() AS uid) = user_id));
create policy "votes_public_read" on public.catalogue_votes as permissive for select to anon, authenticated
  using (true);

-- favoris : RLS activée
--   authenticated : DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
create policy "favoris_proprietaire" on public.favoris as permissive for all to public
  using ((( SELECT auth.uid() AS uid) = user_id))
  with check ((( SELECT auth.uid() AS uid) = user_id));

-- prelevements : RLS activée
--   authenticated : DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
create policy "prelevements_suppression" on public.prelevements as permissive for delete to public
  using ((( SELECT auth.uid() AS uid) = user_id));
create policy "prelevements_insertion" on public.prelevements as permissive for insert to public
  with check ((( SELECT auth.uid() AS uid) = user_id));
create policy "prelevements_lecture" on public.prelevements as permissive for select to public
  using ((( SELECT auth.uid() AS uid) = user_id));

-- progression_lecture : RLS activée
--   authenticated : DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
create policy "progression_lecture_delete" on public.progression_lecture as permissive for delete to public
  using ((( SELECT auth.uid() AS uid) = user_id));
create policy "progression_lecture_insert" on public.progression_lecture as permissive for insert to public
  with check ((( SELECT auth.uid() AS uid) = user_id));
create policy "progression_lecture_select" on public.progression_lecture as permissive for select to public
  using ((( SELECT auth.uid() AS uid) = user_id));

-- hauts_faits_obtenus : RLS activée
--   authenticated : DELETE, INSERT, SELECT, UPDATE
create policy "hauts_faits_obtenus_lecture" on public.hauts_faits_obtenus as permissive for select to authenticated
  using ((( SELECT auth.uid() AS uid) = user_id));

-- messages : RLS activée
--   authenticated : DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
create policy "messages_insert" on public.messages as permissive for insert to authenticated
  with check ((( SELECT auth.uid() AS uid) = expediteur_id));
create policy "messages_select" on public.messages as permissive for select to authenticated
  using (((( SELECT auth.uid() AS uid) = expediteur_id) OR (( SELECT auth.uid() AS uid) = destinataire_id)));
create policy "messages_update" on public.messages as permissive for update to authenticated
  using ((( SELECT auth.uid() AS uid) = destinataire_id))
  with check (((( SELECT auth.uid() AS uid) = destinataire_id) AND (lu = true)));

-- signalements : RLS activée
--   authenticated : DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
create policy "signalements_admin_suppr" on public.signalements as permissive for delete to authenticated
  using (is_admin());
create policy "signalements_insertion" on public.signalements as permissive for insert to authenticated
  with check (((user_id IS NULL) OR (user_id = ( SELECT auth.uid() AS uid))));
create policy "signalements_admin_lecture" on public.signalements as permissive for select to authenticated
  using (is_admin());
create policy "signalements_admin_maj" on public.signalements as permissive for update to authenticated
  using (is_admin())
  with check (is_admin());

-- lectures_versets : RLS activée
--   authenticated : DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
create policy "Lecture publique des compteurs" on public.lectures_versets as permissive for select to public
  using (true);

-- messages_contact : RLS activée ; aucun droit pour anon ni authenticated
-- (aucune politique : table fermée à l’API, clé de service seulement)

-- inscriptions_attente : RLS activée ; aucun droit pour anon ni authenticated
-- (aucune politique : table fermée à l’API, clé de service seulement)

-- polyglotte_notes : RLS activée
--   authenticated : DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
create policy "notes_delete_own" on public.polyglotte_notes as permissive for delete to public
  using ((auth.uid() = user_id));
create policy "notes_insert_own" on public.polyglotte_notes as permissive for insert to public
  with check ((auth.uid() = user_id));
create policy "notes_select_own" on public.polyglotte_notes as permissive for select to public
  using ((auth.uid() = user_id));
create policy "notes_update_own" on public.polyglotte_notes as permissive for update to public
  using ((auth.uid() = user_id))
  with check ((auth.uid() = user_id));

-- propositions_oeuvres : RLS activée
--   authenticated : DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
create policy "propositions_insertion_propre" on public.propositions_oeuvres as permissive for insert to public
  with check ((( SELECT auth.uid() AS uid) = user_id));
create policy "propositions_lecture_propre" on public.propositions_oeuvres as permissive for select to public
  using ((( SELECT auth.uid() AS uid) = user_id));
create policy "propositions_modif_en_attente" on public.propositions_oeuvres as permissive for update to public
  using (((( SELECT auth.uid() AS uid) = user_id) AND (statut = 'en_attente'::text)));

-- monetisation_votes : RLS activée
--   authenticated : DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
create policy "vote_retrait" on public.monetisation_votes as permissive for delete to public
  using ((( SELECT auth.uid() AS uid) = user_id));
create policy "vote_utilisateur" on public.monetisation_votes as permissive for insert to public
  with check ((( SELECT auth.uid() AS uid) = user_id));
create policy "vote_lecture_propre" on public.monetisation_votes as permissive for select to public
  using ((( SELECT auth.uid() AS uid) = user_id));

-- oeuvres_personnelles_segments : RLS activée
--   authenticated : DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE
create policy "Supprimer ses segments personnels" on public.oeuvres_personnelles_segments as permissive for delete to authenticated
  using (((( SELECT auth.uid() AS uid) = user_id) OR is_admin()));
create policy "Ajouter ses segments personnels" on public.oeuvres_personnelles_segments as permissive for insert to authenticated
  with check (((( SELECT auth.uid() AS uid) = user_id) OR is_admin()));
create policy "Lire ses segments personnels" on public.oeuvres_personnelles_segments as permissive for select to authenticated
  using (((( SELECT auth.uid() AS uid) = user_id) OR is_admin()));
create policy "Modifier ses segments personnels" on public.oeuvres_personnelles_segments as permissive for update to authenticated
  using (((( SELECT auth.uid() AS uid) = user_id) OR is_admin()))
  with check (((( SELECT auth.uid() AS uid) = user_id) OR is_admin()));

-- vues_pages : RLS activée ; aucun droit pour anon ni authenticated
-- (aucune politique : table fermée à l’API, clé de service seulement)
