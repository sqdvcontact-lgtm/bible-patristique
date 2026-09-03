-- LE DON QUI S'INSCRIT SEUL — ce dont la notification PayPal a besoin en base.
--
-- La notification (webhook) rend un nom, une adresse électronique et une référence de
-- transaction. Le rattachement au compte se fait sur l'ADRESSE, et l'adresse de
-- connexion vit dans `auth.users`, hors de portée de PostgREST : c'est la même raison
-- que pour `admin_chercher_comptes`, et c'est pourquoi cette fonction lui ressemble.
--
-- ⛔ Elle en diffère sur un point qui compte : celle-là CHERCHE, pour un humain qui
-- arbitrera ; celle-ci DÉCIDE, sans personne derrière. Elle ne rend donc un compte que
-- s'il est le SEUL à porter l'adresse, et jamais le premier d'une liste : deux lecteurs
-- peuvent avoir déclaré la même adresse de contact, et la marque irait au mauvais.
-- L'égalité est exacte, aux blancs et à la casse près ; aucune approximation.
create or replace function public.compte_par_courriel(courriel text)
returns uuid
language sql
security definer
set search_path to 'public'
as $$
  with terme as (select lower(btrim(courriel)) as c),
  -- L'adresse de CONNEXION d'abord : c'est celle que le lecteur a prouvée.
  connexion as (
    select p.id
    from public.profils p
    join auth.users u on u.id = p.id, terme
    where terme.c <> '' and lower(u.email) = terme.c
  ),
  -- Puis celle qu'il affiche sur sa page publique, s'il n'y en a qu'une.
  affichee as (
    select p.id
    from public.profils p, terme
    where terme.c <> '' and lower(btrim(p.contact_email)) = terme.c
  )
  select coalesce(
    case when (select count(*) from connexion) = 1 then (select id from connexion) end,
    case when (select count(*) from affichee)  = 1 then (select id from affichee)  end
  )
$$;

revoke all on function public.compte_par_courriel(text) from public;
revoke all on function public.compte_par_courriel(text) from anon;
revoke all on function public.compte_par_courriel(text) from authenticated;
grant execute on function public.compte_par_courriel(text) to service_role;

-- ── LE SILENCE DOIT SE VOIR ──────────────────────────────────────────────────
--
-- ⚠️ Une réception automatique qui s'arrête ne dit RIEN : plus aucun don n'arrive, et
-- c'est exactement ce que rend un site où personne ne donne. Le dépôt a déjà payé ce
-- défaut deux fois — la sauvegarde quotidienne échouée vingt et une nuits de suite, la
-- balise d'audience redirigée en 307. La route note donc la date de la dernière
-- notification VÉRIFIÉE, et l'administration l'affiche.
--
-- `parametres` porte déjà la charte et les spécifications : une clé de plus ne coûte
-- rien, et la table n'est lisible ni par `anon` ni par `authenticated`.
insert into public.parametres (cle, valeur, mis_a_jour)
values ('paypal_webhook_dernier', '', now())
on conflict (cle) do nothing;
