-- RETROUVER LE COMPTE D'UN DONATEUR — la seule requête que le rattachement demande.
--
-- PayPal ne rend qu'un nom et une adresse électronique, et rien qui pointe vers un
-- compte du site. Le rapprochement se fait donc à la main, dans l'administration, et il
-- lui faut chercher sur les TROIS noms sous lesquels un lecteur peut se présenter : son
-- pseudonyme, l'adresse de sa connexion, et celle qu'il affiche sur sa page.
--
-- ⛔ L'adresse de connexion vit dans `auth.users`, hors de portée de PostgREST. C'est la
-- raison d'être de cette fonction, et la raison pour laquelle elle est SECURITY DEFINER.
-- ⚠️ Elle est donc RETIRÉE à tout le monde et rendue à la seule clé de service : sans
-- ces révocations, `authenticated` y lirait l'adresse de connexion de n'importe qui, ce
-- qu'aucune table du site n'expose. La route qui l'appelle vérifie en outre l'admin.
create or replace function public.admin_chercher_comptes(terme text)
returns table (id uuid, pseudo text, email text, contact_email text, mecene_depuis date)
language sql
security definer
set search_path to 'public'
as $$
  select p.id, p.pseudo, u.email::text, p.contact_email, p.mecene_depuis
  from public.profils p
  join auth.users u on u.id = p.id
  where btrim(terme) <> ''
    and (p.pseudo ilike '%' || btrim(terme) || '%'
      or u.email ilike '%' || btrim(terme) || '%'
      or p.contact_email ilike '%' || btrim(terme) || '%')
  order by p.pseudo
  limit 20
$$;

revoke all on function public.admin_chercher_comptes(text) from public;
revoke all on function public.admin_chercher_comptes(text) from anon;
revoke all on function public.admin_chercher_comptes(text) from authenticated;
grant execute on function public.admin_chercher_comptes(text) to service_role;
