-- Conservation des messages de contact : douze mois, tenus par la base.
--
-- `messages_contact` reçoit le formulaire de contact et les propositions d'œuvre,
-- avec le courriel de qui écrit. Rien ne les purgeait : la page Confidentialité
-- promettait une conservation bornée à la mesure d'audience seulement. Même
-- dispositif que `purger_vues_pages` : une fonction, un travail cron le 1er du
-- mois, un `delete` sur une date, et rien ne s'exécute quand il n'y a rien à faire.
-- La durée se change ICI, en un seul endroit.

create or replace function public.purger_messages_contact() returns integer
language plpgsql security definer set search_path to 'public' as $$
declare
  supprimees integer;
begin
  delete from public.messages_contact where cree_le < now() - interval '12 months';
  get diagnostics supprimees = row_count;
  return supprimees;
end $$;

revoke execute on function public.purger_messages_contact() from public, anon, authenticated;
-- La purge d'audience s'exécutait encore par tout compte connecté ; même règle.
revoke execute on function public.purger_vues_pages() from public, anon, authenticated;

select cron.schedule('purger_contact', '0 3 1 * *', 'select public.purger_messages_contact();');
