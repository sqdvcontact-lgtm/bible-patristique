-- Le chapitre d'un lien biblique se filtre par DEUX COLONNES ENGENDRÉES, jamais par
-- `like` sur `canon_id` (2026-09-05)
--
-- ⛔ Sous la RLS, `like` n'est pas « leakproof » (`textlike`, pg_proc.proleakproof =
-- false) : Postgres doit évaluer la politique de lecture, un EXISTS sur
-- segments ⋈ oeuvre_textes ⋈ oeuvres, sur CHAQUE ligne de la table AVANT d'appliquer
-- le motif, et aucun index ne peut servir de condition. Mesuré le 5 septembre 2026,
-- rôle `authenticated`, `canon_id like 'GEN.1.%'` : l'index parcouru en entier,
-- 66 236 lignes sondées par la politique pour 2 741 rendues, 2 337 ms au repos, et
-- le délai de huit secondes sous charge (quatorze réponses 500 le 4 septembre, sur
-- les métadonnées de la page Bible et d'une péricope, chacune à huit secondes).
--
-- `=` sur `text` et `integer` EST leakproof : posé sur deux colonnes dérivées de
-- `canon_id`, il devient une condition d'index et la politique ne s'évalue plus que
-- sur les lignes du chapitre. Colonnes ENGENDRÉES : rien n'est recopié à la main,
-- elles ne peuvent pas diverger de `canon_id`. Un lien AU CHAPITRE (`canon_id` nul,
-- `livre` + `chapitre` posés) les laisse nulles et garde son propre filtre.
-- Mesuré avant application : les 66 236 `canon_id` ont tous la forme
-- LIVRE.chapitre.verset, aucun chapitre non numérique.
--
-- ⚠️ Additive : le code déployé, qui filtre encore par `like`, n'est pas touché ; le
-- code neuf (`segmentsLiesAuChapitre`, `segmentsLiesAPlage`,
-- `chargerReferencesPatristiquesPericope`, `chargerPresencePatristique*`) lit les
-- colonnes. Contrôles : supabase/controles/20260905163625_liens_bibliques_canon_livre_chapitre_controles.sql.

alter table public.liens_bibliques
  add column canon_livre text
    generated always as (split_part(canon_id, '.', 1)) stored,
  add column canon_chapitre integer
    generated always as (nullif(split_part(canon_id, '.', 2), '')::integer) stored;

comment on column public.liens_bibliques.canon_livre is
  'Livre de canon_id (LIVRE.chapitre.verset), engendré. Avec canon_chapitre, le filtre leakproof d''un chapitre sous la RLS ; nul pour un lien au chapitre entier. Voir AGENTS.md (2026-09-05).';
comment on column public.liens_bibliques.canon_chapitre is
  'Chapitre de canon_id, engendré. Avec canon_livre, la condition d''index par laquelle on lit les liens d''un chapitre.';

create index liens_bib_canon_chapitre_idx
  on public.liens_bibliques (canon_livre, canon_chapitre);

notify pgrst, 'reload schema';
