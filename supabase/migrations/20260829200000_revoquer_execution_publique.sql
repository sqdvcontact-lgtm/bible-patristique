-- Des fonctions à privilèges étaient exécutables par n'importe qui (2026-08-29).
--
-- PostgreSQL accorde `EXECUTE TO PUBLIC` à toute fonction nouvellement créée. Sur une
-- fonction `SECURITY DEFINER`, cela veut dire : n'importe quel visiteur, sans session,
-- peut la déclencher AVEC LES DROITS DE SON PROPRIÉTAIRE. Le verrou du site ne protège
-- que les TABLES ; il ne dit rien des fonctions.
--
-- ⛔ `rafraichir_versets_lecture` — LA PLUS GRAVE, et elle est de mon fait, posée le
-- jour même. Un appel à `POST /rest/v1/rpc/rafraichir_versets_lecture` avec la seule
-- clé publique reconstruisait 33 Mo de vue matérialisée, cinq secondes de calcul, sans
-- authentification et autant de fois qu'on veut. C'est exactement le travail qu'on
-- venait de retirer à la minute pour rendre sa marge à l'instance, remis entre les
-- mains du premier venu. Le rafraîchissement est une opération de MAINTENANCE : seuls
-- le travail cron et l'administration ont à l'appeler.
--
-- ⚠️ Les trois autres sont des FONCTIONS DE DÉCLENCHEUR (`returns trigger`). Un
-- déclencheur s'exécute au nom du propriétaire de la table, jamais par une permission
-- `EXECUTE` : leur retirer ce droit ne peut rien casser, et les appeler directement
-- n'avait aucun sens — au mieux une erreur, au pire une écriture non voulue.
--
-- ⚠️ On ne touche PAS à `statistiques_accueil`, qui porte un `grant` EXPLICITE à `anon` :
-- la page d'accueil publie ces chiffres, c'est une décision, pas un oubli.
--
-- ⚠️ Onze autres fonctions `SECURITY DEFINER` restent ouvertes à `anon` (recherche
-- bible/AELF, compteurs de vues, votes). Elles appartiennent au domaine des données et
-- se revoient une par une : signalées dans le rapport d'audit, pas touchées ici.

begin;

-- La maintenance ne s'appelle pas depuis le navigateur.
revoke execute on function public.rafraichir_versets_lecture(boolean) from public;
revoke execute on function public.rafraichir_versets_lecture(boolean) from anon, authenticated;

-- Des fonctions de déclencheur n'ont pas d'appelant.
revoke execute on function public.oeuvres_auteurs_refuser_doublon() from public;
revoke execute on function public.oeuvres_auteurs_refuser_doublon() from anon, authenticated;

revoke execute on function public.verifier_texte_alignement_membre() from public;
revoke execute on function public.verifier_texte_alignement_membre() from anon, authenticated;

revoke execute on function public.sync_aelf_reference_from_entry() from public;
revoke execute on function public.sync_aelf_reference_from_entry() from anon, authenticated;

commit;
