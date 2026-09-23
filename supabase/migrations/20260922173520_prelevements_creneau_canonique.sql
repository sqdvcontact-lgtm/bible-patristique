-- LE CRÉNEAU CANONIQUE D'UN PRÉLÈVEMENT BIBLIQUE (audit de la lecture, 2026-09-22)
--
-- ⛔ UN NUMÉRO DE VERSET NE DÉSIGNE PAS UNE LIGNE. La clé d'affichage était le seul
-- `ref_verset`, or 701 créneaux de `versets_lecture` portent le même numéro que leur
-- voisin : un verset « 8 » et la ligne propre à une édition « 8+ » (DAN 13, LJE, PSA…).
-- Le signet de l'un paraissait donc plein sur l'autre, et le retrait par
-- `in('ref_verset', …)` supprimait les deux.
--
-- ⚠️ MIGRATION NON DESTRUCTIVE : `ref_verset` reste, et reste écrit. La colonne neuve ne
-- fait que DISTINGUER ce que le numéro confond ; les lecteurs qui ne la connaissent pas
-- (Polyglotte, péricopes, page des prélèvements) continuent de lire le numéro.
alter table public.prelevements add column if not exists canon_id text;

comment on column public.prelevements.canon_id is
  'Le créneau canonique du verset prélevé (« GEN.1.8 », « DAN.13.44+ »), tel que le porte versets_lecture.id_verset. Nul sur un prélèvement patristique, et sur un prélèvement biblique antérieur au 2026-09-22 qu''on n''a pas su replacer : l''affichage retombe alors sur ref_verset.';

-- Le signet d'un chapitre se lit par lecteur, livre et chapitre ; le créneau n'est qu'une
-- colonne de plus sur cette lecture. Un index partiel suffit à servir le retrait par
-- créneau sans peser sur les prélèvements patristiques, qui n'en portent pas.
create index if not exists prelevements_user_canon_idx
  on public.prelevements (user_id, canon_id)
  where canon_id is not null;

-- Remplissage AU MIEUX des lignes déjà en place : le code du livre se cherche dans
-- `livres.nom_fr` (« Genèse »), puis dans les alias (« Gn », et le cas où `ref_livre`
-- porte lui-même l'abréviation). Une ligne dont le créneau n'existe pas dans
-- `versets_lecture` reste nulle : on ne fabrique pas une référence qu'on ne sait pas.
with codes as (
  select p.id, coalesce(
    (select l.code from public.livres l where l.nom_fr = p.ref_livre),
    (select a.canon_code from public.livres_alias a where a.alias = p.ref_livre_abr order by a.id limit 1),
    (select a.canon_code from public.livres_alias a where a.alias = p.ref_livre order by a.id limit 1)
  ) as code
  from public.prelevements p
  where p.type = 'biblique'
    and p.canon_id is null
    and p.ref_chapitre is not null
    and p.ref_verset is not null
)
update public.prelevements p
set canon_id = c.code || '.' || p.ref_chapitre || '.' || p.ref_verset
from codes c
where c.id = p.id
  and c.code is not null
  and exists (
    select 1 from public.versets_lecture v
    where v.id_verset = c.code || '.' || p.ref_chapitre || '.' || p.ref_verset
  );
