-- Correctifs de sécurité (audit du 2026-09-21).
-- Onze défauts de droits et de déclencheurs. Aucun texte, aucune donnée de corpus
-- n'est touché : seulement des droits, des gardes et des fonctions.

set local lock_timeout = '5s';

-- 1. v_aelf_bible_search_translations : DEFINER et modifiable, écriture ouverte à
--    authenticated. Elle ne montre que sept traductions publiques (est_privee = false) :
--    security_invoker ne lui retire rien, et la RLS de traductions s'applique.
alter view public.v_aelf_bible_search_translations set (security_invoker = true);
revoke insert, update, delete, truncate on public.v_aelf_bible_search_translations from anon, authenticated, public;

-- 2. Commentaires : un non-admin ne change ni la cible ni la date, et un texte réécrit
--    (hors suppression, qui l'efface) repasse en modération.
create or replace function public.forcer_moderation_commentaire()
 returns trigger
 language plpgsql
 set search_path to 'public'
as $function$
begin
  if current_user in ('service_role', 'postgres', 'supabase_admin') then
    return new;
  end if;
  if public.is_admin() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.valide := false;
    new.certifie := false;
    new.message_admin := null;
    new.message_admin_at := null;
  else -- UPDATE : un non-admin ne valide pas, ne certifie pas, ne parle pas au nom de la modération.
    new.valide := old.valide;
    new.certifie := old.certifie;
    new.message_admin := old.message_admin;
    new.message_admin_at := old.message_admin_at;
    -- La cible, l'auteur et la date ne se déplacent pas.
    new.id_segment := old.id_segment;
    new.id_verset := old.id_verset;
    new.reponse_a := old.reponse_a;
    new.user_id := old.user_id;
    new.created_at := old.created_at;
    -- Un texte réécrit repasse en modération ; la suppression (qui l'efface) n'en est pas une.
    if new.texte is distinct from old.texte
       and not (new.supprime is true and old.supprime is not true) then
      new.valide := false;
      new.certifie := false;
    end if;
  end if;
  return new;
end $function$;

create or replace function public.forcer_moderation_commentaire_essai()
 returns trigger
 language plpgsql
 set search_path to 'public'
as $function$
begin
  if current_user in ('service_role', 'postgres', 'supabase_admin') or public.is_admin() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.valide := false;
  else
    new.valide := old.valide;
    -- La cible, l'auteur et la date ne se déplacent pas.
    new.id_essai := old.id_essai;
    new.reponse_a := old.reponse_a;
    new.user_id := old.user_id;
    new.created_at := old.created_at;
    -- Un texte ou un passage cité réécrit (hors suppression) repasse en modération.
    if (new.texte is distinct from old.texte or new.passage_cite is distinct from old.passage_cite)
       and not (new.supprime is true and old.supprime is not true) then
      new.valide := false;
    end if;
  end if;
  return new;
end $function$;

-- 3. Essais : toute colonne publique modifiée sur un essai publié le renvoie en
--    modération, et la republication d'un essai retiré exige qu'aucune ne change.
--    nb_vues et created_at sont figés pour un non-admin. Le compteur de vues passe
--    par une fonction SECURITY DEFINER possédée par postgres : current_user y vaut
--    postgres, et la sortie en tête le laisse passer.
create or replace function public.forcer_statut_essai()
 returns trigger
 language plpgsql
 set search_path to 'public'
as $function$
declare
  modifie boolean;
begin
  -- Routes serveur et rôles d'administration base : aucune contrainte.
  if current_user in ('service_role', 'postgres', 'supabase_admin') then
    return new;
  end if;
  -- Administrateurs applicatifs : aucune contrainte.
  if public.is_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    -- Un non-admin ne crée qu'un brouillon ou une soumission ; la date de validation et
    -- la note de la modération ne sont pas les siennes.
    if new.statut is null or new.statut not in ('brouillon', 'en_attente') then
      new.statut := 'brouillon';
    end if;
    new.publie_at := null;
    new.note_admin := null;
    new.nb_vues := 0;
    new.created_at := now();
    return new;
  end if;

  -- UPDATE. Colonnes de la modération et compteurs : figés.
  new.publie_at := old.publie_at;
  new.note_admin := old.note_admin;
  new.nb_vues := old.nb_vues;
  new.created_at := old.created_at;

  -- Ce que le lecteur voit d'un essai publié (vue essais_publies).
  modifie := (new.titre, new.sous_titre, new.resume, new.categories, new.contenu,
              new.couverture, new.embleme, new.verset_en_tete)
             is distinct from
             (old.titre, old.sous_titre, old.resume, old.categories, old.contenu,
              old.couverture, old.embleme, old.verset_en_tete);

  -- « À revoir » et « Refusé » se reçoivent de la modération ; un auteur ne les pose pas.
  if new.statut in ('a_reviser', 'refuse') and new.statut is distinct from old.statut then
    new.statut := old.statut;
  end if;
  if new.statut = 'publie' then
    if old.statut = 'publie' then
      -- Toujours publié : une retouche de ce qui se lit repasse par la modération.
      if modifie then
        new.statut := 'en_attente';
      end if;
    elsif old.statut = 'brouillon' and old.publie_at is not null and not modifie then
      -- Republication par son auteur d'un essai validé qu'il avait retiré, inchangé.
      null;
    else
      -- Jamais validé, en attente, à revoir ou refusé : la publication n'est pas à lui.
      new.statut := old.statut;
    end if;
  end if;
  return new;
end $function$;

-- Le compteur de vues ne compte que les essais publiés.
create or replace function public.increment_nb_vues(p_id integer)
 returns void
 language sql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
  UPDATE essais SET nb_vues = COALESCE(nb_vues, 0) + 1 WHERE id = p_id AND statut = 'publie';
$function$;

create or replace function public.incrementer_vues_essai(p_id bigint)
 returns void
 language sql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
  update essais set nb_vues = nb_vues + 1 where id = p_id and statut = 'publie';
$function$;

-- 4. Messages : le destinataire ne peut écrire que « lu ».
revoke update on public.messages from authenticated;
grant update (lu) on public.messages to authenticated;

-- 5. Signalements : un point par signalement, au plus cinq par jour (jour de Paris).
--    Un signalement daté d'avant le jour ne rapporte rien, pour qu'on ne contourne pas
--    le plafond par la date.
create or replace function public.points_signalements()
 returns trigger
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  debut_jour timestamptz := date_trunc('day', now() at time zone 'Europe/Paris') at time zone 'Europe/Paris';
  deja int;
begin
  if tg_op = 'INSERT' then
    if new.user_id is not null and new.created_at >= debut_jour then
      select count(*) into deja
        from signalements s
       where s.user_id = new.user_id
         and s.id <> new.id
         and s.created_at >= debut_jour;
      if deja < 5 then
        update profils set points = points + 1 where id = new.user_id;
      end if;
    end if;
    return new;
  end if;
  if new.user_id is not null then
    if new.decision = 'accepté' and coalesce(old.decision,'') <> 'accepté' then
      update profils set points = points + 10 where id = new.user_id;
    elsif coalesce(old.decision,'') = 'accepté' and coalesce(new.decision,'') <> 'accepté' then
      update profils set points = greatest(0, points - 10) where id = new.user_id;
    end if;
  end if;
  return new;
end $function$;

-- 6. Le rafraîchissement de la Polyglotte Fillion n'est appelé que par un script
--    d'atelier, avec la clé de service.
revoke execute on function public.rafraichir_polyglotte_fillion() from public, anon, authenticated;

-- 7. Le compteur de lectures ne compte que les versets que la page lit, et seule la
--    route serveur (clé de service) l'appelle.
create or replace function public.incrementer_lecture(p_id_verset text)
 returns void
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
begin
  if not exists (select 1 from versets_lecture where id_verset = p_id_verset) then
    return;
  end if;
  insert into lectures_versets (id_verset, nb_lectures)
  values (p_id_verset, 1)
  on conflict (id_verset) do update set nb_lectures = lectures_versets.nb_lectures + 1;
end;
$function$;
revoke execute on function public.incrementer_lecture(text) from public, anon, authenticated;

-- 8. Propositions d'œuvres : un non-admin ne propose qu'en attente.
create or replace function public.forcer_statut_proposition()
 returns trigger
 language plpgsql
 set search_path to 'public', 'pg_temp'
as $function$
begin
  if current_user in ('service_role', 'postgres', 'supabase_admin') or public.is_admin() then
    return new;
  end if;
  new.statut := 'en_attente';
  return new;
end $function$;

drop trigger if exists trg_forcer_statut_proposition on public.propositions_oeuvres;
create trigger trg_forcer_statut_proposition
  before insert on public.propositions_oeuvres
  for each row execute function public.forcer_statut_proposition();

-- 9. commentaires.auteur_mail : NON TRAITÉ ICI. Deux composants insèrent avec
--    .select() (RETURNING *) sous la session du lecteur ; des droits par colonne
--    les casseraient. À faire une fois le code passé à une liste de colonnes.

-- 10. Bible 899 : le site est une bêta fermée, anon ne lit rien. Aucune page ne lit
--     ces objets sans session.
revoke select on
  public.v_bible899_verse_recomposed_lecture,
  public.v_bible899_aelf_polyglotte_lecture,
  public.bible899_expanded_typography_overrides,
  public.bible899_alignment_spine_public,
  public.bible899_verse_recomposed_public,
  public.v_bible899_aelf_polyglotte_public,
  public.bible899_aelf_polyglotte_public_snapshot,
  public.v_bible899_aelf_polyglotte
from anon;

-- PUBLIC portait l'exécution : on la retire à PUBLIC et à anon ; authenticated et
-- service_role gardent leur droit explicite.
revoke execute on function public.bible899_typographie_developpee_sure_v1(text) from public, anon;
revoke execute on function public.bible899_capitaliser_ponctuation_forte_sure_v1(text) from public, anon;
revoke execute on function public.bible899_capitaliser_initiale_v1(text) from public, anon;
revoke execute on function public.bible899_capitaliser_points_revus_v1(text) from public, anon;
revoke execute on function public.bible899_typographie_fragment_v1(text, text, integer, boolean, text, text, jsonb, boolean) from public, anon;
revoke execute on function public.bible899_normaliser_chiffres_romains_simples_v1(text) from public, anon;

alter policy "Bible899 typography overrides readable" on public.bible899_expanded_typography_overrides to authenticated;
alter policy "Bible899 public alignment mappings readable" on public.bible899_alignment_spine_public to authenticated;
alter policy "Bible899 public recomposed readable" on public.bible899_verse_recomposed_public to authenticated;
alter policy "Bible899 public polyglotte snapshot readable" on public.bible899_aelf_polyglotte_public_snapshot to authenticated;

-- 11. Seaux d'images : types et poids bornés. traductions accepte les quatre formats
--     que sa route d'administration admet.
update storage.buckets
   set allowed_mime_types = array['image/jpeg'],
       file_size_limit = 5242880
 where id = 'auteurs';
update storage.buckets
   set allowed_mime_types = array['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
       file_size_limit = 5242880
 where id = 'traductions';

-- 12. Deux fonctions de déclencheur sans search_path fixe (corps entièrement qualifiés).
alter function public.hauts_faits_famille_unique() set search_path = public, pg_temp;
alter function public.bible_style_semantique_connu() set search_path = public, pg_temp;
