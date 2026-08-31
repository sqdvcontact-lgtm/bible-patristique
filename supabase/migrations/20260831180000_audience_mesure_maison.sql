-- Mesure d'audience maison (2026-08-31).
--
-- Pourquoi une table plutôt que Google Analytics. GA4 n'était chargé qu'après
-- acceptation du bandeau : il ne comptait donc que les visiteurs consentants, et
-- l'écart n'était ni connu ni corrigeable. Son API demande un compte de service
-- Google Cloud, une clé JSON et l'identifiant numérique de la propriété. Enfin il
-- efface ses données détaillées au bout de deux mois, quatorze au maximum. Un
-- compteur maison est exact, gratuit, et vit dans la même base que les œuvres, les
-- versets et les comptes, ce qui permet de croiser une fréquentation avec ce qui
-- est lu. Aucun outil externe ne le permet, ses chiffres étant dans un autre silo.
--
-- ⛔ Aucune donnée nominative. L'adresse IP n'est JAMAIS écrite : elle sert à
-- calculer une empreinte hachée avec un sel qui change chaque jour, si bien qu'un
-- même visiteur se reconnaît sur la journée et redevient inconnu le lendemain.
-- C'est la condition qui rend la mesure dispensée de consentement au titre de la
-- mesure d'audience strictement limitée au site (recommandation CNIL), et c'est ce
-- que déclare déjà la page Confidentialité pour les compteurs de versets.

begin;

create table if not exists public.vues_pages (
  id         bigserial   primary key,
  vu_le      timestamptz not null default now(),
  chemin     text        not null,
  rubrique   text,
  referent   text,
  pays       text,
  appareil   text,
  empreinte  text        not null,
  connecte   boolean     not null default false,
  constraint vues_pages_appareil_connu check (appareil is null or appareil in ('mobile', 'bureau'))
);

comment on table public.vues_pages is
  'Mesure d''audience maison. Agrégats seuls : aucune adresse IP, aucun identifiant de compte. « empreinte » est un hachage salé dont le sel tourne chaque jour.';
comment on column public.vues_pages.rubrique is
  'Famille de page déduite du chemin (bible, oeuvre, essai…). Écrite à la collecte pour ne pas avoir à redécouper des chaînes à chaque lecture.';
comment on column public.vues_pages.referent is
  'Hôte du référent seulement, jamais l''URL entière : une URL entière porterait la requête tapée par le visiteur.';
comment on column public.vues_pages.connecte is
  'Vrai si la vue vient d''une session ouverte. On ne note PAS de quel compte : c''est le seul partage qui nous intéresse, et il reste anonyme.';

-- ⚠️ Pas d'index sur « vu_le::date » : la conversion d'un timestamptz en date
-- dépend du fuseau de la session, elle est donc STABLE et non IMMUTABLE, et
-- PostgreSQL refuse l'index (42P17). Ce n'est pas une perte : toutes les
-- interrogations bornent d'abord la période par « vu_le >= depuis », et c'est
-- l'index ci-dessous qui les sert. Le regroupement par jour se fait ensuite sur
-- les seules lignes retenues.
create index if not exists vues_pages_vu_le_idx  on public.vues_pages (vu_le desc);
create index if not exists vues_pages_chemin_idx on public.vues_pages (chemin);

-- Rien ne lit ni n'écrit cette table depuis le navigateur. L'écriture passe par
-- /api/audience/vue (rôle de service), la lecture par la page d'administration.
-- RLS active sans AUCUNE politique : le rôle de service la contourne, tous les
-- autres se voient refuser jusqu'au comptage.
alter table public.vues_pages enable row level security;
revoke all on table public.vues_pages from anon, authenticated;
revoke all on sequence public.vues_pages_id_seq from anon, authenticated;

-- ── Le tableau de bord, en un seul appel ────────────────────────────────────
--
-- ⚠️ SECURITY INVOKER (le défaut), et c'est délibéré. La page appelle avec le rôle
-- de service, qui contourne déjà la RLS : un SECURITY DEFINER n'apporterait rien et
-- ouvrirait une fonction à privilèges. On lui retire quand même EXECUTE à PUBLIC,
-- que PostgreSQL accorde d'office (voir la migration du 2026-08-29).
--
-- ⚠️ Les comptes se comptent dans « profils », pas dans « auth.users » : le rôle de
-- service n'a PAS le droit de lire auth.users (vérifié le 2026-08-31), et il faudrait
-- un SECURITY DEFINER pour le contourner. Un profil est de toute façon la notion de
-- membre qu'emploie le site partout ailleurs.
create or replace function public.audience_tableau_bord(p_jours integer default 30)
returns jsonb
language sql
stable
set search_path = public
as $$
with bornes as (
  select
    least(greatest(coalesce(p_jours, 30), 1), 365)                                     as jours,
    (current_date - (least(greatest(coalesce(p_jours, 30), 1), 365) - 1))::date        as depuis
),
calendrier as (
  select d::date as jour from bornes, generate_series(bornes.depuis, current_date, interval '1 day') d
),
vues_jour as (
  select v.vu_le::date as jour, count(*) as vues, count(distinct v.empreinte) as visiteurs
  from vues_pages v, bornes b
  where v.vu_le >= b.depuis
  group by 1
),
comptes_jour as (
  select p.created_at::date as jour, count(*) as n
  from profils p, bornes b
  where p.created_at >= b.depuis
  group by 1
),
livres_jour as (
  select l.lu_le::date as jour, count(*) as n
  from progression_lecture l, bornes b
  where l.lu_le >= b.depuis
  group by 1
),
-- Toute trace datée qu'un compte laisse. Sert aux « actifs », que la seule table
-- des vues ne saurait pas donner : une vue ne porte pas de quel compte elle vient.
activite as (
  select user_id, lu_le      as le from progression_lecture where user_id is not null
  union all select user_id, created_at from favoris        where user_id is not null
  union all select user_id, created_at from prelevements   where user_id is not null
  union all select user_id, created_at from commentaires   where user_id is not null
  union all select user_id, created_at from essais         where user_id is not null
)
select jsonb_build_object(
  'genere_le',   now(),
  'jours',       (select jours from bornes),
  'depuis',      (select depuis from bornes),
  'premiere_vue', (select min(vu_le)::date from vues_pages),

  'resume', jsonb_build_object(
    'vues_jour',        (select count(*) from vues_pages where vu_le::date = current_date),
    'vues_veille',      (select count(*) from vues_pages where vu_le::date = current_date - 1),
    'vues_periode',     (select count(*) from vues_pages v, bornes b where v.vu_le >= b.depuis),
    'visiteurs_jour',   (select count(distinct empreinte) from vues_pages where vu_le::date = current_date),
    'visiteurs_periode',(select count(distinct v.empreinte) from vues_pages v, bornes b where v.vu_le >= b.depuis),
    'part_connectee',   (select count(*) filter (where v.connecte) from vues_pages v, bornes b where v.vu_le >= b.depuis),
    'comptes_total',    (select count(*) from profils),
    'comptes_periode',  (select count(*) from profils p, bornes b where p.created_at >= b.depuis),
    'livres_periode',   (select count(*) from progression_lecture l, bornes b where l.lu_le >= b.depuis),
    'liste_attente',    (select count(*) from inscriptions_attente)
  ),

  'serie', coalesce((
    select jsonb_agg(jsonb_build_object(
      'jour',      c.jour,
      'vues',      coalesce(v.vues, 0),
      'visiteurs', coalesce(v.visiteurs, 0),
      'comptes',   coalesce(p.n, 0),
      'livres',    coalesce(l.n, 0)
    ) order by c.jour)
    from calendrier c
    left join vues_jour    v on v.jour = c.jour
    left join comptes_jour p on p.jour = c.jour
    left join livres_jour  l on l.jour = c.jour
  ), '[]'::jsonb),

  'pages', coalesce((
    select jsonb_agg(x order by x.vues desc)
    from (
      select v.chemin, count(*) as vues, count(distinct v.empreinte) as visiteurs
      from vues_pages v, bornes b
      where v.vu_le >= b.depuis
      group by 1 order by 2 desc limit 25
    ) x
  ), '[]'::jsonb),

  'rubriques', coalesce((
    select jsonb_agg(x order by x.vues desc)
    from (
      select coalesce(v.rubrique, 'autre') as rubrique, count(*) as vues
      from vues_pages v, bornes b
      where v.vu_le >= b.depuis
      group by 1 order by 2 desc
    ) x
  ), '[]'::jsonb),

  'referents', coalesce((
    select jsonb_agg(x order by x.vues desc)
    from (
      select coalesce(v.referent, 'accès direct') as referent, count(*) as vues
      from vues_pages v, bornes b
      where v.vu_le >= b.depuis
      group by 1 order by 2 desc limit 15
    ) x
  ), '[]'::jsonb),

  'pays', coalesce((
    select jsonb_agg(x order by x.vues desc)
    from (
      select coalesce(v.pays, '??') as pays, count(*) as vues
      from vues_pages v, bornes b
      where v.vu_le >= b.depuis
      group by 1 order by 2 desc limit 15
    ) x
  ), '[]'::jsonb),

  'appareils', coalesce((
    select jsonb_agg(x order by x.vues desc)
    from (
      select coalesce(v.appareil, 'inconnu') as appareil, count(*) as vues
      from vues_pages v, bornes b
      where v.vu_le >= b.depuis
      group by 1 order by 2 desc
    ) x
  ), '[]'::jsonb),

  'comptes', jsonb_build_object(
    'total',      (select count(*) from profils),
    'avec_essai', (select count(distinct user_id) from essais where user_id is not null),
    'actifs_7j',  (select count(distinct user_id) from activite where le >= now() - interval '7 days'),
    'actifs_30j', (select count(distinct user_id) from activite where le >= now() - interval '30 days'),
    'derniers', coalesce((
      select jsonb_agg(x order by x.created_at desc)
      from (select pseudo, created_at from profils order by created_at desc limit 10) x
    ), '[]'::jsonb),
    'liste_attente',        (select count(*) from inscriptions_attente),
    'liste_attente_a_prevenir', (select count(*) from inscriptions_attente where prevenu_le is null)
  ),

  'lectures', jsonb_build_object(
    'livres_total',       (select count(*) from progression_lecture),
    'favoris_periode',    (select count(*) from favoris f, bornes b      where f.created_at >= b.depuis),
    'prelevements_periode',(select count(*) from prelevements p, bornes b where p.created_at >= b.depuis),
    'commentaires_periode',(select count(*) from commentaires c, bornes b where c.created_at >= b.depuis),
    'essais_publies',     (select count(*) from essais where statut = 'publie'),
    'livres', coalesce((
      select jsonb_agg(x order by x.lectures desc)
      from (
        select livre_code, count(*) as lectures, count(distinct user_id) as lecteurs
        from progression_lecture group by 1 order by 2 desc limit 15
      ) x
    ), '[]'::jsonb),
    'versets', coalesce((
      select jsonb_agg(x order by x.nb_lectures desc)
      from (select id_verset, nb_lectures from lectures_versets order by nb_lectures desc limit 15) x
    ), '[]'::jsonb),
    'essais', coalesce((
      select jsonb_agg(x order by x.nb_vues desc)
      from (
        select titre, nb_vues from essais
        where statut = 'publie' order by nb_vues desc nulls last limit 10
      ) x
    ), '[]'::jsonb)
  )
);
$$;

revoke all on function public.audience_tableau_bord(integer) from public;
grant execute on function public.audience_tableau_bord(integer) to service_role;

comment on function public.audience_tableau_bord(integer) is
  'Tableau de bord d''audience, en un seul appel, pour /admin/audience. Agrégats seuls. Réservé au rôle de service.';

commit;
