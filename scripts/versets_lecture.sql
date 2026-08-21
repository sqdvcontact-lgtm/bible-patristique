-- VUE MATÉRIALISÉE versets_lecture — définition de référence
--
-- Elle sert le texte de la page Bible, PIVOTÉ : une colonne par traduction. C'est
-- pourquoi elle doit être refaite à chaque traduction nouvelle — sans quoi la
-- traduction s'affiche dans le menu (qui lit la table `traductions`) mais ne rend
-- rien. C'est exactement ce qui est arrivé à la Vulgate (TR0004) et à la Septante
-- (TR0005), importées les 24/07/2026 sans que la vue soit reprise.
--
-- Refaite le 24/07/2026 pour ajouter TR0004 et TR0005.
-- Propriétaire postgres ; droits à authenticated et service_role ; deux index.
--
--   psql < scripts/versets_lecture.sql       (ou via exec_sql)
--
-- Après tout import ou réalignement de versets :
--   refresh materialized view concurrently versets_lecture;
-- (CONCURRENTLY est possible grâce à l'index UNIQUE sur id_verset.)

drop materialized view if exists versets_lecture;

create materialized view versets_lecture as
with v2 as (
  select v.*,
         count(v.canon_id) over (
           partition by v.trad_id, v.livre
           order by v.ch_orig, v.v_orig, coalesce(v.v_orig_suffixe, '')
           rows unbounded preceding) as palier
  from versets_v2 v
  where v.texte is not null
), ancree as (
  select v2.*,
         first_value(v2.canon_id) over (
           partition by v2.trad_id, v2.livre, v2.palier
           order by v2.ch_orig, v2.v_orig, coalesce(v2.v_orig_suffixe, '')) as ancre
  from v2
), textes as (
  select ancree.canon_id, ancree.trad_id,
         string_agg(ancree.texte, ' '
           order by ancree.ch_orig, ancree.v_orig, coalesce(ancree.v_orig_suffixe, '')) as texte,
         string_agg(ancree.ch_orig || ', ' || ancree.v_orig ||
           case when ancree.trad_id = 'TR0004' then '' else coalesce(ancree.v_orig_suffixe, '') end, ' · '
           order by ancree.ch_orig, ancree.v_orig, coalesce(ancree.v_orig_suffixe, '')) as num_origine
  from ancree
  where ancree.canon_id is not null
  group by ancree.canon_id, ancree.trad_id
), surnum as (
  select ancree.livre, ancree.ch_orig, ancree.v_orig,
         min(ancree.ancre) as ancre,
         max(ancree.texte) filter (where ancree.trad_id = 'TR0001') as t1,
         max(ancree.texte) filter (where ancree.trad_id = 'TR0002') as t2,
         max(ancree.texte) filter (where ancree.trad_id = 'TR0003') as t3,
         max(ancree.texte) filter (where ancree.trad_id = 'TR0004') as t4,
         max(ancree.texte) filter (where ancree.trad_id = 'TR0005') as t5
  from ancree
  where ancree.canon_id is null
  group by ancree.livre, ancree.ch_orig, ancree.v_orig
)
select c.id as id_verset,
       c.livre,
       c.ch_canon as chapitre,
       c.v_canon as verset,
       c.livre || ' ' || c.ch_canon || ':' || c.v_canon as ref,
       c.est_suscription,
       false as est_surnumeraire,
       c.ordre * 1000 as ordre,
       max(t.texte)       filter (where t.trad_id = 'TR0001') as "TR0001",
       max(t.texte)       filter (where t.trad_id = 'TR0002') as "TR0002",
       max(t.texte)       filter (where t.trad_id = 'TR0003') as "TR0003",
       max(t.texte)       filter (where t.trad_id = 'TR0004') as "TR0004",
       max(t.texte)       filter (where t.trad_id = 'TR0005') as "TR0005",
       max(t.num_origine) filter (where t.trad_id = 'TR0001') as "num_TR0001",
       max(t.num_origine) filter (where t.trad_id = 'TR0002') as "num_TR0002",
       max(t.num_origine) filter (where t.trad_id = 'TR0003') as "num_TR0003",
       max(t.num_origine) filter (where t.trad_id = 'TR0004') as "num_TR0004",
       max(t.num_origine) filter (where t.trad_id = 'TR0005') as "num_TR0005"
from versets_canon c
left join textes t on t.canon_id = c.id
group by c.id, c.livre, c.ch_canon, c.v_canon, c.est_suscription, c.ordre
union all
select s.livre || '.' || s.ch_orig || '.' || s.v_orig || '+' as id_verset,
       s.livre,
       s.ch_orig as chapitre,
       s.v_orig as verset,
       s.livre || ' ' || s.ch_orig || ':' || s.v_orig as ref,
       false as est_suscription,
       true as est_surnumeraire,
       coalesce(a.ordre * 1000, 0::bigint) + 1 as ordre,
       s.t1 as "TR0001",
       s.t2 as "TR0002",
       s.t3 as "TR0003",
       s.t4 as "TR0004",
       s.t5 as "TR0005",
       s.ch_orig || ', ' || s.v_orig as "num_TR0001",
       s.ch_orig || ', ' || s.v_orig as "num_TR0002",
       s.ch_orig || ', ' || s.v_orig as "num_TR0003",
       s.ch_orig || ', ' || s.v_orig as "num_TR0004",
       s.ch_orig || ', ' || s.v_orig as "num_TR0005"
from surnum s
left join versets_canon a on a.id = s.ancre;

create unique index versets_lecture_id_idx   on public.versets_lecture using btree (id_verset);
create index        versets_lecture_chap_idx on public.versets_lecture using btree (livre, chapitre, ordre);

grant all on versets_lecture to authenticated, service_role;
