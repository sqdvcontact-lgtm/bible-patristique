-- Charte § 52 et § 40 (11 septembre 2026) : la modération tient ses colonnes ; les
-- vues et les chiffres publics suivent la règle de publication.

-- 1. Essais : « À revoir » et « Refusé » deviennent de vrais états ; la date de
--    validation et la note de la modération ne s'écrivent que par la modération.
alter table public.essais drop constraint if exists essais_statut_check;
alter table public.essais add constraint essais_statut_check
  check (statut in ('brouillon', 'en_attente', 'publie', 'a_reviser', 'refuse'));

create or replace function public.forcer_statut_essai()
returns trigger language plpgsql set search_path = public as $$
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
    return new;
  end if;

  -- UPDATE. Colonnes de la modération : figées.
  new.publie_at := old.publie_at;
  new.note_admin := old.note_admin;
  -- « À revoir » et « Refusé » se reçoivent de la modération ; un auteur ne les pose pas.
  if new.statut in ('a_reviser', 'refuse') and new.statut is distinct from old.statut then
    new.statut := old.statut;
  end if;
  if new.statut = 'publie' then
    if old.statut = 'publie' then
      -- Toujours publié : une retouche du contenu repasse par la modération.
      if new.contenu is distinct from old.contenu then
        new.statut := 'en_attente';
      end if;
    elsif old.statut = 'brouillon' and old.publie_at is not null
          and new.contenu is not distinct from old.contenu then
      -- Republication par son auteur d'un essai validé qu'il avait retiré, à contenu inchangé.
      null;
    else
      -- Jamais validé, en attente, à revoir ou refusé : la publication n'est pas à lui.
      new.statut := old.statut;
    end if;
  end if;
  return new;
end $$;

-- 2. Commentaires d'essai : le verrou que les commentaires ont reçu le 30 juillet.
create or replace function public.forcer_moderation_commentaire_essai()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user in ('service_role', 'postgres', 'supabase_admin') or public.is_admin() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.valide := false;
  else
    new.valide := old.valide;
  end if;
  return new;
end $$;
drop trigger if exists trg_forcer_moderation_commentaire_essai on public.essais_commentaires;
create trigger trg_forcer_moderation_commentaire_essai
  before insert or update on public.essais_commentaires
  for each row execute function public.forcer_moderation_commentaire_essai();
revoke execute on function public.forcer_moderation_commentaire_essai() from public, anon, authenticated;

-- 3. Commentaires : le message de la modération n'appartient qu'à elle.
create or replace function public.forcer_moderation_commentaire()
returns trigger language plpgsql set search_path = public as $$
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
  end if;
  return new;
end $$;
alter table public.commentaires alter column valide set not null;

-- 4. Propositions d'œuvre : une liste fermée, et l'auteur ne change pas le statut.
alter table public.propositions_oeuvres drop constraint if exists propositions_oeuvres_statut_check;
alter table public.propositions_oeuvres add constraint propositions_oeuvres_statut_check
  check (statut in ('en_attente', 'en_cours', 'acceptee', 'refusee'));
alter policy propositions_modif_en_attente on public.propositions_oeuvres
  using (((select auth.uid()) = user_id) and statut = 'en_attente')
  with check (((select auth.uid()) = user_id) and statut = 'en_attente');

-- 5. Fonctions à droits de propriétaire sans usage pour un compte ordinaire (charte § 17.1) :
--    on fige d'abord le droit du service, puis on retire les autres.
grant execute on function public.controle_tableau_bord() to service_role;
grant execute on function public.increment_nb_vues(integer) to service_role;
grant execute on function public.rafraichir_lexique_grec() to service_role;
revoke execute on function public.controle_tableau_bord() from public, anon, authenticated;
revoke execute on function public.increment_nb_vues(integer) from public, anon, authenticated;
revoke execute on function public.incrementer_vues_essai(bigint) from public, anon, authenticated;
revoke execute on function public.rafraichir_lexique_grec() from public, anon, authenticated;

-- 6. La fiche d'une traduction se lit sous les droits du lecteur. Elle l'était depuis le
--    28 août ; la migration du 4 septembre l'a recréée par `create or replace view` sans
--    répéter l'option, qui s'est perdue en silence.
alter view public.v_traductions_page set (security_invoker = true);

-- 7. « Les versets les plus cités » ne comptent que ce que le lecteur peut ouvrir.
--    ⚠️ L'option se répète : `create or replace view` remplace aussi les options.
create or replace view public.versets_plus_cites with (security_invoker = false) as
 WITH par_oeuvre_type AS (
         SELECT l.canon_id,
            s.id_oeuvre,
            l.type,
            bool_or(l.fiabilite <> 'à constituer'::text) AS fiable
           FROM liens_bibliques l
             JOIN segments s ON s.id = l.segment_id
             JOIN oeuvre_textes t ON t.id_texte = s.id_texte AND t.is_public
             JOIN oeuvres o ON o.id_oeuvre = s.id_oeuvre AND o.acces_public
          WHERE l.canon_id IS NOT NULL
          GROUP BY l.canon_id, s.id_oeuvre, l.type
        ), agg AS (
         SELECT par_oeuvre_type.canon_id,
            count(*) FILTER (WHERE par_oeuvre_type.type = 1)::integer AS nb_citations,
            count(*) FILTER (WHERE par_oeuvre_type.type = 3)::integer AS nb_commentaires,
            count(*) FILTER (WHERE par_oeuvre_type.type = 4)::integer AS nb_allusions,
            count(DISTINCT par_oeuvre_type.id_oeuvre)::integer AS nb_oeuvres,
            round(sum(
                CASE par_oeuvre_type.type
                    WHEN 3 THEN 3
                    WHEN 1 THEN 2
                    WHEN 4 THEN 1
                    ELSE 1
                END::numeric *
                CASE
                    WHEN par_oeuvre_type.fiable THEN 1::numeric
                    ELSE 0.5
                END))::integer AS score
           FROM par_oeuvre_type
          GROUP BY par_oeuvre_type.canon_id
        )
 SELECT a.canon_id,
    vc.livre,
    vc.ch_canon AS chapitre,
    vc.v_canon AS verset,
    a.score,
    a.nb_citations,
    a.nb_commentaires,
    a.nb_allusions,
    a.nb_oeuvres,
    v2.texte AS "TR0002"
   FROM agg a
     LEFT JOIN versets_canon vc ON vc.id = a.canon_id
     LEFT JOIN LATERAL ( SELECT versets_v2.texte
           FROM versets_v2
          WHERE versets_v2.canon_id = a.canon_id AND versets_v2.trad_id = 'TR0002'::text
          ORDER BY versets_v2.ordre_slot
         LIMIT 1) v2 ON true;
refresh materialized view public.versets_plus_cites_mat;

-- 8. Le lexique grec ne recueille que ce qui se lit.
create or replace function public.rafraichir_lexique_grec()
returns integer language plpgsql security definer set search_path = public as $$
declare nb integer;
begin
  truncate public.concordance_lexique_grec;

  insert into public.concordance_lexique_grec (mot, mot_norm, cle_latine, freq)
  with brut as (
    select regexp_split_to_table(v."TR0005", '[^[:alnum:]]+') as mot
      from public.versets_lecture v
     where coalesce(v."TR0005", '') <> ''
    union all
    -- ⛔ Charte § 52 : seul ce qui se lit entre au lexique.
    select regexp_split_to_table(s.segment_texte, '[^[:alnum:]]+')
      from public.segments s
      join public.oeuvre_textes t on t.id_texte = s.id_texte and t.is_public
      join public.oeuvres o on o.id_oeuvre = s.id_oeuvre and o.acces_public
     where t.langue ilike '%grec%' and coalesce(s.segment_texte, '') <> ''
    union all
    select regexp_split_to_table(s.texte_original, '[^[:alnum:]]+')
      from public.segments s
      join public.oeuvre_textes t on t.id_texte = s.id_texte and t.is_public
      join public.oeuvres o on o.id_oeuvre = s.id_oeuvre and o.acces_public
     where coalesce(s.texte_original, '') <> ''
  ),
  normes as (
    select mot, public.norm_gr(mot) as norm from brut where length(mot) >= 2
  ),
  grecs as (
    select mot, norm from normes
     where norm ~ '^[αβγδεζηθικλμνξοπρστυφχψω]{2,}$'
  ),
  par_forme as (
    select mot, norm, count(*)::int as occurrences from grecs group by mot, norm
  ),
  par_groupe as (
    select norm,
           (array_agg(mot order by occurrences desc, mot))[1] as forme,
           sum(occurrences)::int as total
      from par_forme group by norm
  )
  select forme, norm, public.cle_grec_latine(forme), total from par_groupe;

  get diagnostics nb = row_count;
  analyze public.concordance_lexique_grec;
  return nb;
end $$;
revoke execute on function public.rafraichir_lexique_grec() from public, anon, authenticated;
grant execute on function public.rafraichir_lexique_grec() to service_role;

-- 9. Les œuvres qui deviennent lisibles aujourd'hui reçoivent leur date de mise en ligne.
update public.oeuvres set date_mise_en_ligne = now()
 where acces_public and date_mise_en_ligne is null;
