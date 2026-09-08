-- `auth.uid()` UNE FOIS, PAS UNE FOIS PAR LIGNE.
--
-- Écrit nu dans une politique, `auth.uid()` est réévalué pour CHAQUE ligne
-- examinée : le planificateur le tient pour volatil et ne peut pas le sortir de la
-- boucle. Enveloppé dans un `select`, il devient un InitPlan — calculé une fois,
-- puis comparé. Le résultat est identique, le coût ne l'est pas, et l'écart croît
-- avec la table.
--
-- Les quatre politiques de `polyglotte_notes` étaient les dernières du schéma dans
-- ce cas (les autres tables ont déjà la forme `( SELECT auth.uid() AS uid)`).

alter policy notes_select_own on public.polyglotte_notes using ((select auth.uid()) = user_id);
alter policy notes_delete_own on public.polyglotte_notes using ((select auth.uid()) = user_id);
alter policy notes_insert_own on public.polyglotte_notes with check ((select auth.uid()) = user_id);
alter policy notes_update_own on public.polyglotte_notes
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
