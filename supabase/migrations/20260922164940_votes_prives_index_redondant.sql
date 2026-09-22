-- Votes sur les commentaires : chacun ne lit plus que SA ligne ; index redondant retiré.
-- 2026-09-22, suite de 20260922155227_volet_peres_audit.
--
-- 1. `commentaires_likes` : la lecture (« Lecture publique des likes », using true) se
--    restreint à `auth.uid() = user_id`. Les totaux passent par `totaux_votes_commentaires`
--    (DEFINER, déjà posée) ; les réactions reçues sur SES commentaires, dont les
--    notifications ont besoin (qui a voté, et dans quel sens), par
--    `reactions_a_mes_commentaires(bigint[])` ci-dessous. Aucun autre lecteur dans le dépôt
--    (grep du 2026-09-22) ; la vue `classement_utilisateurs`, qui compte les likes reçus, est
--    DEFINER (propriétaire postgres) et n'est donc pas touchée par la politique.
-- 2. Politique UPDATE `auth.uid() = user_id` : il n'y en avait aucune, et l'upsert qui change
--    un vote (j'aime vers je n'aime pas) échouait sans bruit. L'upsert redevient la voie
--    unique, sur les deux onglets de commentaires.
-- 3. `liens_bib_canon_chapitre_idx` (canon_livre, canon_chapitre) est un préfixe exact de
--    `liens_bib_canon_chapitre_id_idx` (canon_livre, canon_chapitre, id) : toute requête qui
--    s'en servait (égalité sur livre et chapitre, ou sur le livre seul) se sert du second au
--    même coût de parcours. EXPLAIN ANALYZE sous `authenticated` le 2026-09-22 : le temps est
--    celui de la RLS évaluée ligne à ligne, pas celui de l'index.

set local lock_timeout = '5s';

-- 1. Lecture restreinte à sa propre ligne
drop policy if exists "Lecture publique des likes" on public.commentaires_likes;
drop policy if exists likes_lecture_proprietaire on public.commentaires_likes;
create policy likes_lecture_proprietaire on public.commentaires_likes
  as permissive for select to authenticated
  using ((select auth.uid()) = user_id);

-- 2. Changement de vote
drop policy if exists likes_modification on public.commentaires_likes;
create policy likes_modification on public.commentaires_likes
  as permissive for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Les réactions des AUTRES sur MES commentaires (notifications). DEFINER, parce que la
-- lecture de la table est désormais fermée ; appelée une fois par chargement, jamais
-- ligne à ligne.
create or replace function public.reactions_a_mes_commentaires(p_ids bigint[])
returns table (id_commentaire bigint, user_id uuid, valeur smallint)
language sql
stable
security definer
set search_path = ''
as $$
  select l.id_commentaire, l.user_id, l.valeur
  from public.commentaires_likes l
  join public.commentaires c on c.id = l.id_commentaire
  where l.id_commentaire = any (p_ids[1:1000])
    and c.user_id = (select auth.uid())
    and l.user_id is distinct from (select auth.uid())
$$;
comment on function public.reactions_a_mes_commentaires(bigint[]) is
  'Notifications : qui a réagi (et comment) aux commentaires du lecteur connecté, parmi les identifiants donnés. DEFINER, 2026-09-22.';
revoke all on function public.reactions_a_mes_commentaires(bigint[]) from public, anon;
grant execute on function public.reactions_a_mes_commentaires(bigint[]) to authenticated, service_role;

-- 3. Index redondant
drop index if exists public.liens_bib_canon_chapitre_idx;
