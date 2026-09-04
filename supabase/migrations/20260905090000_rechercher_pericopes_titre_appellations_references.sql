-- ═══════════════════════════════════════════════════════════════════════════════
-- LA RECHERCHE DE PÉRICOPES SE LIMITE AU TITRE, AUX APPELLATIONS ET À LA RÉFÉRENCE
-- Demande de l'auteur, 2026-09-04 : « Limiter la recherche dans les péricopes au
-- titre, appellations, références. »
--
-- ⛔ CE QUI SORT — LA BRANCHE « RESSEMBLANCE ».
-- L'ancienne condition retenait un nom dès que `similarity(nom, q) >= 0.22` (0,30
-- sous quatre signes), c'est-à-dire sur une simple parenté de trigrammes. Ce n'est
-- ni le titre, ni une appellation, ni une référence : c'est une ressemblance, et
-- elle rendait des péricopes qui ne portent pas un seul mot de ce qu'on a tapé.
-- Mesuré le 2026-09-04 sur vingt termes courants (82 résultats) : 5 ne contenaient
-- pas le terme cherché, et le PIRE d'entre eux se glissait sous les vrais — score
-- maximal du bruit 188, score minimal d'une vraie trouvaille 587. Exemples :
--   « noces »  → « Nativité » (par « Noël »), « Le Déluge » (par « Noé ») ;
--   « brebis perdue » → « La drachme perdue », « Pais mes brebis » ;
--   « samaritaine »   → « Le bon Samaritain ».
--
-- ⚠️ ELLE SURVIT EN SECOURS, ET SEULEMENT LÀ. Elle rattrape une faute de frappe
-- (« nocse de cana » → « Noces de Cana », « multiplicaton des pains » →
-- « Multiplication des pains »), ce que l'auteur n'a pas demandé de retirer. Elle
-- ne s'exécute donc QUE si la recherche stricte ne rend RIEN : tant qu'un seul nom
-- porte le terme, elle est éteinte, et la largeur qu'on lui reproche disparaît.
--
-- ✅ CE QUI ENTRE — LA RÉFÉRENCE, qui est nommée par l'auteur et qui manquait.
-- La barre de recherche ne savait pas trouver une péricope par « Mt 5 » ou
-- « Jean 4 » : c'était le seul des trois termes de la consigne que le RPC ne
-- servait pas du tout, alors que le catalogue (`filtrerCatalogue`) le sert depuis
-- toujours. Trois paramètres facultatifs — `p_livre`, `p_chapitre`, `p_verset` —
-- portent la référence DÉJÀ COMPRISE par `analyserRequetePericope`
-- (`app/lib/pericopesRecherche.ts`, pur et testé).
--
-- ⛔ On ne recopie PAS ici la table des noms et des abréviations de livres : elle
-- vit dans `app/lib/bible.ts`, et une seconde liste divergerait au premier ajout.
-- La base ne reçoit qu'un code de livre et deux nombres.
--
-- ⛔ Une référence chiffrée ÉCARTE la recherche par nom : on ne montre que le
-- passage demandé, comme le catalogue. C'est la règle de `filtrerCatalogue`, et les
-- deux surfaces doivent la dire de la même façon.
--
-- ⚠️ DROP puis CREATE, et non `create or replace` : la signature gagne trois
-- paramètres, si bien qu'un `create or replace` poserait une SURCHARGE. Les deux
-- fonctions accepteraient alors `('x', 8)` et PostgreSQL refuserait l'appel
-- (« function is not unique »). Les droits sont reposés à l'identique — EXECUTE
-- pour `authenticated` et `service_role`, jamais pour `anon` (le RPC est réservé
-- aux comptes, cf. AGENTS.md § « Recherche de péricopes »).
-- ═══════════════════════════════════════════════════════════════════════════════

drop function if exists public.rechercher_pericopes(text, integer);

create function public.rechercher_pericopes(
  p_requete  text,
  p_limite   integer default 12,
  p_livre    text    default null,
  p_chapitre integer default null,
  p_verset   integer default null
)
returns table(
  pericope_id text,
  titre text,
  categorie text,
  est_collection boolean,
  correspondance text,
  correspondance_visible boolean,
  usage_recherche text,
  poids_recherche smallint,
  preuve_directe boolean,
  score integer,
  notice text,
  notice_contexte text,
  nb_occurrences integer,
  occurrences jsonb
)
language sql
stable
set search_path to 'pg_catalog', 'public', 'extensions'
as $function$
with params as (
  select
    btrim(regexp_replace(
      lower(extensions.unaccent(left(btrim(coalesce(p_requete, '')), 100))),
      '[^[:alnum:]]+',
      ' ',
      'g'
    )) as q,
    greatest(1, least(coalesce(p_limite, 12), 50)) as limite,
    nullif(btrim(coalesce(p_livre, '')), '') as livre,
    p_chapitre as ch,
    p_verset   as v
),
noms as (
  select
    r.*,
    btrim(regexp_replace(
      lower(extensions.unaccent(r.nom)),
      '[^[:alnum:]]+',
      ' ',
      'g'
    )) as nom_recherche
  from public.pericope_noms_recherche r
  where r.actif_recherche
),

-- ═══ VOIE 1 — LA RÉFÉRENCE ═══════════════════════════════════════════════════
-- Les bornes d'une occurrence sont deux points canoniques « XXX.ch.v ». Elles sont
-- lues par une expression rationnelle plutôt que par `split_part` : une borne mal
-- formée rend alors NULL et l'occurrence est écartée, au lieu de faire échouer la
-- requête entière sur un cast. (Les 376 occurrences sont bien formées au
-- 2026-09-04 ; la garde vaut pour celles à venir.)
bornes as (
  select
    o.pericope_id,
    (regexp_match(o.canon_id_debut, '^[^.]+[.]([0-9]+)[.]([0-9]+)$'))[1]::int as ch1,
    (regexp_match(o.canon_id_debut, '^[^.]+[.]([0-9]+)[.]([0-9]+)$'))[2]::int as v1,
    (regexp_match(o.canon_id_fin,   '^[^.]+[.]([0-9]+)[.]([0-9]+)$'))[1]::int as ch2,
    (regexp_match(o.canon_id_fin,   '^[^.]+[.]([0-9]+)[.]([0-9]+)$'))[2]::int as v2
  from public.pericope_occurrences o
  cross join params x
  where x.livre is not null
    and x.ch is not null
    and o.livre = x.livre
),
touchees as (
  select
    b.pericope_id,
    min(b.ch1 * 1000 + b.v1) as ordre_canon
  from bornes b
  cross join params x
  where b.ch1 is not null and b.ch2 is not null
    and x.ch between b.ch1 and b.ch2
    and (
      x.v is null
      or ((x.ch > b.ch1 or x.v >= b.v1) and (x.ch < b.ch2 or x.v <= b.v2))
    )
  group by b.pericope_id
),
-- ⚠️ On rend le nom PRINCIPAL : une péricope trouvée par sa référence n'a pas été
-- trouvée par une appellation, et la ligne « Correspond à … » ne doit donc pas
-- paraître (`correspondanceVisible` la tait quand la correspondance EST le titre).
par_reference as (
  select
    n.*,
    1000::integer as score_calcule,
    t.ordre_canon::integer as ordre_canon
  from touchees t
  join noms n on n.pericope_id = t.pericope_id and n.est_principal
),

-- ═══ VOIE 2 — LE TITRE ET LES APPELLATIONS ═══════════════════════════════════
par_nom_strict as (
  select
    n.*,
    (
      case
        when n.nom_recherche = x.q then 1200
        when n.nom_recherche like x.q || '%' then 850
        when (' ' || n.nom_recherche) like '% ' || x.q || '%' then 650
        else 500
      end
      + n.poids_recherche
      + round(extensions.similarity(n.nom_recherche, x.q) * 250)::integer
      + case when n.est_principal then 20 else 0 end
      + case when n.visible_public then 10 else 0 end
    )::integer as score_calcule,
    null::integer as ordre_canon
  from noms n
  cross join params x
  where (x.livre is null or x.ch is null)
    and length(x.q) >= 2
    and n.nom_recherche like '%' || x.q || '%'
),

-- ═══ SECOURS — la ressemblance, et seulement si rien n'a été trouvé ══════════
par_nom_flou as (
  select
    n.*,
    (
      n.poids_recherche
      + round(extensions.similarity(n.nom_recherche, x.q) * 250)::integer
      + case when n.est_principal then 20 else 0 end
      + case when n.visible_public then 10 else 0 end
    )::integer as score_calcule,
    null::integer as ordre_canon
  from noms n
  cross join params x
  where (x.livre is null or x.ch is null)
    and length(x.q) >= 2
    and not exists (select 1 from par_nom_strict)
    and extensions.similarity(n.nom_recherche, x.q) >=
        case when length(x.q) <= 3 then 0.30 else 0.22 end
),

candidats as (
  select * from par_reference
  union all
  select * from par_nom_strict
  union all
  select * from par_nom_flou
),
meilleurs as (
  select
    c.*,
    row_number() over (
      partition by c.pericope_id
      order by
        c.score_calcule desc,
        c.est_principal desc,
        c.visible_public desc,
        c.ordre,
        c.id
    ) as rang
  from candidats c
)
select
  m.pericope_id,
  p.nom as titre,
  p.categorie,
  p.est_collection,
  m.nom as correspondance,
  m.visible_public as correspondance_visible,
  m.usage_recherche,
  m.poids_recherche,
  m.preuve_directe,
  m.score_calcule as score,
  p.notice,
  p.notice_contexte,
  (
    select count(*)::integer
    from public.pericope_occurrences o
    where o.pericope_id = m.pericope_id
  ) as nb_occurrences,
  coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', o.id,
        'livre', o.livre,
        'debut', o.canon_id_debut,
        'fin', o.canon_id_fin,
        'principale', o.est_principale,
        'niveau', o.niveau,
        'fiabilite', o.fiabilite
      )
      order by o.est_principale desc, o.niveau, o.id
    )
    from public.pericope_occurrences o
    where o.pericope_id = m.pericope_id
  ), '[]'::jsonb) as occurrences
from meilleurs m
join public.pericopes p on p.id = m.pericope_id
where m.rang = 1
-- Une référence se lit dans l'ORDRE DU LIVRE, un nom dans l'ordre de pertinence.
-- Les deux voies ne coexistent jamais : `ordre_canon` vaut NULL dès qu'on cherche
-- par nom, et le classement retombe alors sur le score, comme auparavant.
order by coalesce(m.ordre_canon, 0) asc, m.score_calcule desc, lower(p.nom), m.pericope_id
limit (select limite from params);
$function$;

revoke execute on function public.rechercher_pericopes(text, integer, text, integer, integer) from public;
grant execute on function public.rechercher_pericopes(text, integer, text, integer, integer) to authenticated;
grant execute on function public.rechercher_pericopes(text, integer, text, integer, integer) to service_role;
