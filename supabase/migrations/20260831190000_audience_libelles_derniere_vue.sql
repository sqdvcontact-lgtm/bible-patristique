-- Audience : trois corrections de la fonction de tableau de bord (2026-08-31).
--
-- 1. ⛔ « visiteurs sur la période » ÉTAIT FAUX, et le défaut venait du parti même
--    de la mesure. L'empreinte change chaque jour : un lecteur qui revient trente
--    jours de suite produit trente empreintes, et un `count(distinct)` sur toute la
--    période comptait donc des VISITEURS-JOURS sous le nom de visiteurs. Ce n'est
--    pas réparable sans défaire l'anonymat, reconnaître quelqu'un d'un jour à
--    l'autre étant précisément ce que le sel tournant interdit. Le chiffre est donc
--    remplacé par une MOYENNE QUOTIDIENNE, qui a un sens et qu'on peut nommer.
--    ⚠️ Le compte par jour, lui, était juste et ne bouge pas.
--
-- 2. La page montrait des chemins bruts (« /oeuvre/A0010O0001 »). C'était manquer
--    l'argument qui a décidé de la mesure maison : les vues vivent dans la même
--    base que les œuvres, les auteurs et les péricopes, on peut donc les NOMMER.
--
-- 3. Rien ne distinguait une panne de collecte d'une absence de visiteurs, les deux
--    rendant des zéros. `derniere_vue` donne de quoi le voir.

begin;

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
-- Les vingt-cinq pages les plus vues, avec de quoi les nommer. Le découpage du
-- chemin se fait ICI, une fois, sur vingt-cinq lignes : la famille est la première
-- pièce du chemin, la clé la seconde.
-- ⚠️ « chemin » peut porter les coordonnées de la page Bible (« /?livre=GEN… ») :
-- on découpe donc sur la partie nue, sinon la famille vaudrait « ?livre=GEN ».
pages_brutes as (
  select v.chemin,
         count(*)                                              as vues,
         split_part(split_part(v.chemin, '?', 1), '/', 2)      as famille,
         split_part(split_part(v.chemin, '?', 1), '/', 3)      as cle
  from vues_pages v, bornes b
  where v.vu_le >= b.depuis
  group by 1
  order by 2 desc
  limit 25
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
  -- ⚠️ À l'HORODATAGE, non à la date : le témoin de panne se lit en heures autant
  -- qu'en jours, et une date seule ferait passer la nuit dernière pour hier.
  'derniere_vue', (select max(vu_le) from vues_pages),

  'resume', jsonb_build_object(
    'vues_jour',        (select count(*) from vues_pages where vu_le::date = current_date),
    'vues_veille',      (select count(*) from vues_pages where vu_le::date = current_date - 1),
    'vues_periode',     (select count(*) from vues_pages v, bornes b where v.vu_le >= b.depuis),
    'visiteurs_jour',   (select count(distinct empreinte) from vues_pages where vu_le::date = current_date),
    -- La moyenne porte sur TOUS les jours de la période, jours creux compris : c'est
    -- ce qui en fait un « jour ordinaire » et non la moyenne des bons jours.
    'visiteurs_moyens', (
      select round(coalesce(avg(n), 0), 1)
      from (
        select coalesce(v.visiteurs, 0) as n
        from calendrier c left join vues_jour v on v.jour = c.jour
      ) z
    ),
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

  -- ⚠️ La colonne « visiteurs » a QUITTÉ ce classement : elle portait le même défaut
  -- que le total de la période (des visiteurs-jours sous un autre nom), et « vues »
  -- suffit à ranger des pages. Le libellé la remplace utilement.
  'pages', coalesce((
    select jsonb_agg(jsonb_build_object(
      'chemin', p.chemin,
      'vues',   p.vues,
      'libelle', case p.famille
        when 'oeuvre'    then case when a.nom is not null then a.nom || ', ' || o.titre else o.titre end
        when 'auteur'    then au.nom
        when 'pericopes' then pe.nom
        when 'essais'    then es.titre
      end
    ) order by p.vues desc)
    from pages_brutes p
    -- ⚠️ Les jointures sont gardées par la FAMILLE : sans elle, une clé d'œuvre
    -- irait se chercher parmi les auteurs, et deux identifiants qui se ressemblent
    -- rendraient un nom faux.
    left join oeuvres   o  on p.famille = 'oeuvre'    and o.id_oeuvre  = p.cle
    left join auteurs   a  on a.id_auteur = o.id_auteur
    left join auteurs   au on p.famille = 'auteur'    and au.id_auteur = p.cle
    left join pericopes pe on p.famille = 'pericopes' and pe.id        = p.cle
    -- ⛔ Comparaison en TEXTE : « essais.id » est un bigint, et convertir une clé
    -- qui n'est pas un nombre (« /essais/nouveau ») ferait échouer la requête entière.
    left join essais    es on p.famille = 'essais'    and es.id::text  = p.cle
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
    'liste_attente',            (select count(*) from inscriptions_attente),
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

-- `create or replace` conserve les droits en place ; on les repose tout de même,
-- pour que la migration dise seule à qui la fonction appartient.
revoke all on function public.audience_tableau_bord(integer) from public;
grant execute on function public.audience_tableau_bord(integer) to service_role;

commit;
