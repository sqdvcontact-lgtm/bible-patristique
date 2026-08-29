-- La bibliothèque écoutait une table qui n'émettait rien (2026-08-29).
--
-- `BibliothequeClient.tsx` s'abonne en temps réel à trois tables pour se rafraîchir
-- quand le catalogue bouge : `auteurs`, `oeuvres` et `oeuvres_auteurs`. Les deux
-- premières appartiennent à la publication `supabase_realtime` ; la troisième, non.
-- Cet abonnement-là n'a donc JAMAIS rien reçu — sans erreur, sans avertissement, sans
-- que rien ne distingue à l'écran une écoute muette d'une écoute silencieuse.
--
-- La conséquence était réelle quoique discrète : changer la signature d'une œuvre à
-- deux auteurs ne rafraîchissait pas la bibliothèque ouverte, alors que changer son
-- titre le faisait.
--
-- ⚠️ Le coût est nul, ou presque : la table de liaison porte UNE ligne et a reçu trois
-- écritures dans toute son existence. Ce n'est pas elle qui alourdira le décodage du
-- WAL.
--
-- ⛔ On complète la publication plutôt que de retirer l'abonnement : c'est l'intention
-- du code qui fait foi, et elle est juste. Une œuvre signée à deux se lit sous les deux
-- noms partout ailleurs sur le site.

begin;

do $$
begin
  if not exists (
    select 1
    from pg_publication_rel pr
    join pg_publication p on p.oid = pr.prpubid
    join pg_class c on c.oid = pr.prrelid
    where p.pubname = 'supabase_realtime' and c.relname = 'oeuvres_auteurs'
  ) then
    alter publication supabase_realtime add table public.oeuvres_auteurs;
  end if;
end
$$;

commit;
