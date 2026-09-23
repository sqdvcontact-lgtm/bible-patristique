-- DEUX SUITES DE L'AUDIT DU 2026-09-22.
--
-- 1. UN VOTE NE CHANGE PAS DE COMMENTAIRE. La politique `likes_modification`
--    (20260922164940) ne garde que le propriétaire : `id_commentaire` restait modifiable,
--    et un lecteur pouvait déplacer son vote d'un commentaire vers un autre — donc voter
--    deux fois sur le second, ou retirer un vote du premier sans passer par le retrait.
--    Une politique ne sait pas comparer à l'ANCIENNE ligne (pas d'`old` dans `with check`) :
--    c'est donc un trigger. ⚠️ Il ne gêne pas l'upsert : celui-ci réécrit `id_commentaire`
--    avec la MÊME valeur (c'est la clé du conflit), et `is distinct from` est alors faux.
--    `user_id` est gelé par la même occasion, pour la même raison.
--    Éprouvé en transaction annulée le 2026-09-22 : upsert du changement de sens accepté,
--    déplacement vers un autre commentaire refusé (42501).
--
-- 2. DROITS `anon` SUR LES TROIS FONCTIONS POSÉES LE 2026-09-22.
--    `presence_patristique_plage` est INVOKER : la politique de lecture du visiteur
--    s'applique, rien ne peut fuir. L'exécution lui est donc accordée — mesuré sous le rôle
--    `anon` en transaction annulée : l'appel s'arrête sur « permission denied for table
--    segments », zéro ligne rendue.
--    ⚠️ Cela ne fait pas taire le journal : tant qu'`anon` n'a aucun droit de lecture sur
--    `segments` et `liens_bibliques` (ouverture SEO, chantier à part), le visiteur sans
--    session verra son 42501 se déplacer de la fonction vers la table. Le silence se gagne
--    côté appelant (ne pas demander la présence patristique sans session) ou le jour de
--    l'ouverture ; la porte, elle, est désormais ouverte du bon côté.
--    `totaux_votes_commentaires` reste FERMÉE : elle est DEFINER, elle compte des votes
--    devenus privés le 2026-09-22, et l'accorder à `anon` rendrait publics par une fonction
--    les totaux que la politique de ligne vient de fermer.
--    `longueur_texte(segments)` reste FERMÉE : c'est une colonne calculée de `segments`,
--    que `anon` ne peut pas lire ; l'accorder n'ouvrirait rien et ferait croire le
--    contraire. Elle suivra les droits de la table, le jour où ils s'ouvriront.

set local lock_timeout = '5s';

-- 1. La cible d'un vote est gelée
create or replace function public.vote_commentaire_cible_gelee()
 returns trigger
 language plpgsql
 set search_path to ''
as $function$
begin
  if new.id_commentaire is distinct from old.id_commentaire then
    raise exception 'Un vote ne change pas de commentaire.' using errcode = '42501';
  end if;
  if new.user_id is distinct from old.user_id then
    raise exception 'Un vote ne change pas de lecteur.' using errcode = '42501';
  end if;
  return new;
end;
$function$;
comment on function public.vote_commentaire_cible_gelee() is
  'Gèle id_commentaire et user_id d''un vote : la politique likes_modification ne garde que le propriétaire, et un update pouvait déplacer le vote. 2026-09-22.';

drop trigger if exists commentaires_likes_cible_gelee on public.commentaires_likes;
create trigger commentaires_likes_cible_gelee
  before update on public.commentaires_likes
  for each row execute function public.vote_commentaire_cible_gelee();

-- 2. Droits anon
grant execute on function public.presence_patristique_plage(text, integer, integer, integer, integer) to anon;
revoke execute on function public.totaux_votes_commentaires(bigint[]) from anon;
revoke execute on function public.longueur_texte(public.segments) from anon;
