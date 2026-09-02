-- Lexique de ce que le site n'admet ni dans un pseudonyme ni dans un commentaire
-- (décision de l'auteur, 2026-09-03 : « simplement les insultes », liste permissive).
--
-- ⛔ La liste est la MÊME que `app/lib/moderationLexique.ts`, mot pour mot et dans
-- le même ordre : `moderationLexique.test.ts` relit cette migration et le vérifie.
-- Un mot s'ajoute des deux côtés, par une migration nouvelle qui refait l'insert.
--
-- Deux déclencheurs l'appliquent pour tout écrivain qui n'est ni la clé de service
-- ni un administrateur : le pseudonyme de `profils`, le texte de `commentaires` et
-- d'`essais_commentaires`. Code d'erreur ZL001, message écrit pour être lu.

create table if not exists public.moderation_lexique (
  mot text primary key,
  entier boolean not null default false
);
alter table public.moderation_lexique enable row level security;
revoke all on public.moderation_lexique from anon, authenticated;

truncate public.moderation_lexique;
insert into public.moderation_lexique (mot, entier) values
  ('connard', false), ('connasse', false), ('conard', false), ('conasse', false),
  ('salope', false), ('salaud', false), ('salopard', false), ('enculé', false), ('enculer', false),
  ('bâtard', false), ('pute', true), ('fils de pute', false), ('fdp', true), ('ntm', true),
  ('nique', true), ('niquer', true), ('trou du cul', false), ('ta gueule', false), ('tg', true),
  ('abruti', true), ('crétin', true),
  ('bite', true), ('couille', true), ('couilles', true),
  ('pd', true), ('pédé', true), ('tapette', true), ('tarlouze', false), ('gouine', false),
  ('nègre', true), ('négro', true), ('bougnoule', false), ('youpin', false), ('bicot', true),
  ('chintok', false), ('bamboula', false), ('nazi', true), ('hitler', false),
  ('fuck', false), ('bitch', true), ('asshole', false), ('nigger', false), ('faggot', false),
  ('cunt', true), ('shit', true), ('dick', true), ('whore', false), ('slut', true);

-- Même repli que `replierTexte` côté site : bas de casse, sans accent, tout ce qui
-- n'est pas lettre ou chiffre devient une espace, une lettre répétée trois fois ou
-- plus retombe à deux. ⚠️ Pas à une seule : « nigger » replié à « niger »
-- condamnerait le Niger. STABLE et non IMMUTABLE : unaccent dépend d'un dictionnaire.
create or replace function public.replier_texte(t text) returns text
language sql stable set search_path to 'public', 'extensions' as $$
  select btrim(regexp_replace(regexp_replace(regexp_replace(
    lower(extensions.unaccent(coalesce(t, ''))), '[^a-z0-9]+', ' ', 'g'),
    '(.)\1{2,}', '\1\1', 'g'), ' +', ' ', 'g'))
$$;

-- Le terme interdit que porte le texte, ou null. Pour un pseudonyme, un mot non
-- « entier » se cherche comme sous-chaîne, séparateurs ôtés (« connard42 ») ; dans
-- un commentaire, tout mot se cherche entier, pluriel compris.
-- ⚠️ SECURITY DEFINER, et ce n'est pas un choix : les déclencheurs l'appellent avec
-- les droits de l'écrivain, et `moderation_lexique` est fermée à `authenticated`.
-- Sans cela, tout pseudonyme et tout commentaire tombaient en 42501 (vu à l'épreuve).
create or replace function public.terme_interdit(t text, pour_pseudo boolean) returns text
language plpgsql stable security definer set search_path to 'public' as $$
declare
  l record;
  r text;
  colle text;
  m text;
begin
  r := public.replier_texte(t);
  -- Pour un pseudonyme, les séparateurs s'ôtent AVANT de replier les répétitions :
  -- « Con-NNNard » doit donner « connard », non « con nnard ».
  colle := regexp_replace(replace(r, ' ', ''), '(.)\1{2,}', '\1\1', 'g');
  for l in select mot, entier from public.moderation_lexique loop
    m := public.replier_texte(l.mot);
    if pour_pseudo then
      if (l.entier and (' ' || r || ' ') like ('% ' || m || ' %'))
         or (not l.entier and position(replace(m, ' ', '') in colle) > 0) then
        return l.mot;
      end if;
    elsif (' ' || r || ' ') like ('% ' || m || ' %') or (' ' || r || ' ') like ('% ' || m || 's %') then
      return l.mot;
    end if;
  end loop;
  return null;
end $$;

create or replace function public.garde_lexique_commentaire() returns trigger
language plpgsql set search_path to 'public' as $$
begin
  if current_user in ('service_role', 'postgres', 'supabase_admin') or public.is_admin() then
    return new;
  end if;
  if public.terme_interdit(new.texte, false) is not null then
    raise exception 'Le commentaire contient un terme que le site n’admet pas.' using errcode = 'ZL001';
  end if;
  return new;
end $$;

drop trigger if exists trg_garde_lexique on public.commentaires;
create trigger trg_garde_lexique before insert or update of texte on public.commentaires
  for each row execute function public.garde_lexique_commentaire();
drop trigger if exists trg_garde_lexique on public.essais_commentaires;
create trigger trg_garde_lexique before insert or update of texte on public.essais_commentaires
  for each row execute function public.garde_lexique_commentaire();

-- Le pseudonyme : la garde du 2026-09-02, complétée du lexique.
create or replace function public.profils_garde_colonnes() returns trigger
language plpgsql set search_path to 'public' as $$
declare
  reserves constant text[] := array['admin','administrateur','moderateur','superadmin',
                                    'corpus','scriptura','system','support','contact','aide'];
begin
  if current_user in ('service_role', 'postgres', 'supabase_admin') then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.est_admin := false;
    new.acces_beta := false;
    new.points := 0;
  else
    new.est_admin := old.est_admin;
    new.acces_beta := old.acces_beta;
    new.points := old.points;
  end if;
  if new.pseudo is not null and (tg_op = 'INSERT' or new.pseudo is distinct from old.pseudo) then
    if new.pseudo !~ '^[a-zA-Z0-9_-]{3,30}$' then
      raise exception 'Le pseudo doit contenir entre 3 et 30 caractères (lettres, chiffres, tirets, underscores).'
        using errcode = 'check_violation';
    end if;
    if lower(new.pseudo) = any (reserves) then
      raise exception 'Ce pseudo est réservé.' using errcode = 'check_violation';
    end if;
    if public.terme_interdit(new.pseudo, true) is not null then
      raise exception 'Ce pseudonyme n’est pas admis.' using errcode = 'ZL001';
    end if;
  end if;
  return new;
end $$;
