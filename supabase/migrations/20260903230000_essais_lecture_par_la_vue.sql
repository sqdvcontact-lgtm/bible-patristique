-- SECOND TEMPS de « publier sans nom » (voir 20260903220000_essais_anonymes.sql),
-- à n'appliquer qu'une fois le site déployé sur `essais_publies` : à partir d'ici, la
-- table `essais` ne se lit plus qu'en propriétaire ou en administrateur, et le public
-- passe par la vue, qui tait `user_id` quand la publication est anonyme.
--
-- ⚠️ La politique d'avant était « publié, ou le sien » : un administrateur ne voyait
-- donc pas les essais en attente des autres par l'API, et le compteur de la barre
-- (`in('statut', ['en_attente', …])`) ne comptait que les siens. `is_admin()` le répare.
drop policy if exists essais_lecture_publique on public.essais;
drop policy if exists essais_lecture_auteur on public.essais;
create policy essais_lecture_auteur on public.essais
  for select to authenticated
  using ((select auth.uid()) = user_id or (select public.is_admin()));

revoke select on public.essais from anon;
