-- LE RENDU BIBLIOGRAPHIQUE LIT LA BASE, D'UN SEUL TENANT (charte § 35.6.1).
-- 5 septembre 2026.
--
-- Cinq colonnes que le modèle n'avait pas et qu'une référence savante demande :
-- la FORME de la notice (monographie, article de périodique, contribution à un
-- collectif, entrée de dictionnaire), le titre de l'ouvrage HÔTE ou du périodique,
-- la TOMAISON, les PAGES de la contribution dans son hôte, et la DATE telle qu'elle
-- s'affiche quand l'année ne suffit pas (« juin 1837 »). Toutes nullables : une
-- monographie ordinaire n'en renseigne aucune. ⛔ Aucune n'est composée : ce sont des
-- données, la ponctuation vient du rendu.
--
-- Et UNE vue, v_references_bibliographiques, qui réunit pour chaque ouvrage ce que
-- le moteur de rendu lit : les champs de la notice, les éditeurs liés (par rang et
-- rôle) résolus sur editeurs_valeur, les contributeurs résolus sur auteurs_valeur
-- (prénom, nom de famille) et sur auteurs (les anciens). En security_barrier, comme
-- v_bible_editorial_bibliography_entries : un lecteur ne peut lire ni auteurs_valeur
-- ni ouvrages_bibliographiques_editeurs (RLS admin), et la vue ne lui donne que
-- l'identité bibliographique — aucun score, aucun statut d'évaluation, aucune note.
--
-- ⚠️ `edition` n'est pas exposée : sur les 82 lignes qui la portent, c'est une note
-- d'atelier (« Après le 28 août 1494 ; GW M47578 ; ISTC it00452000. »), non une
-- mention d'édition, et la composer imprimerait ces notes dans la référence.

alter table public.ouvrages_bibliographiques
  add column if not exists forme_notice text,
  add column if not exists titre_hote text,
  add column if not exists tomaison text,
  add column if not exists pages text,
  add column if not exists date_affichee text;

alter table public.ouvrages_bibliographiques
  drop constraint if exists ouvrages_bibliographiques_forme_notice_chk;
alter table public.ouvrages_bibliographiques
  add constraint ouvrages_bibliographiques_forme_notice_chk
  check (forme_notice is null or forme_notice = any (array[
    'monographie', 'article_periodique', 'contribution_collectif', 'entree_dictionnaire'
  ]));

comment on column public.ouvrages_bibliographiques.forme_notice is
  'Forme bibliographique de la notice : monographie (défaut quand null), article_periodique, contribution_collectif, entree_dictionnaire. Décide de la composition (guillemets, « dans », titre hôte), non de la valeur scientifique, qui est type_ouvrage.';
comment on column public.ouvrages_bibliographiques.titre_hote is
  'Titre du périodique ou de l’ouvrage collectif qui accueille la contribution. Vide pour une monographie.';
comment on column public.ouvrages_bibliographiques.tomaison is
  'Tome, série, section, partie de l’hôte, tels qu’ils s’affichent : « 1re section, t. XI ».';
comment on column public.ouvrages_bibliographiques.pages is
  'Pages de la contribution dans son hôte : « 282-292 ». Le rendu écrit « p. 282–292 ». ⛔ Jamais la pagination d’un exemplaire (charte § 35.6.1).';
comment on column public.ouvrages_bibliographiques.date_affichee is
  'Date telle qu’elle s’affiche quand l’année ne suffit pas : « juin 1837 ». annee reste la clé de tri.';

create or replace view public.v_references_bibliographiques
with (security_barrier = true) as
select
  o.id as ouvrage_id,
  o.type_ouvrage,
  o.forme_notice,
  o.titre,
  o.sous_titre,
  o.titre_hote,
  o.tomaison,
  o.pages,
  o.date_affichee,
  o.annee,
  o.lieu,
  coalesce(cv.nom, o.collection) as collection,
  o.numero_collection,
  coalesce(o.langue_normalisee, o.langue) as langue,
  o.auteurs as auteurs_texte,
  o.directeurs as directeurs_texte,
  o.traducteurs as traducteurs_texte,
  coalesce(ev.nom, o.editeur) as editeur,
  coalesce((
    select jsonb_agg(jsonb_build_object('rang', e.rang, 'role', e.role, 'nom', v.nom) order by e.rang, e.role)
    from public.ouvrages_bibliographiques_editeurs e
    join public.editeurs_valeur v on v.id = e.editeur_id
    where e.ouvrage_id = o.id
  ), '[]'::jsonb) as editeurs_lies,
  coalesce((
    select jsonb_agg(jsonb_build_object(
      'ordre', c.ordre,
      'role', c.role_contributeur,
      'nature', c.nature_personne,
      'nom_affiche', c.nom_affiche,
      'prenom', av.prenom,
      'nom_famille', av.nom_famille,
      'pseudonyme', av.pseudonyme,
      'nom_autorite', coalesce(av.nom, a.nom),
      'auteur_id', c.auteur_id
    ) order by c.ordre, c.id)
    from public.ouvrage_contributeurs_scientifiques c
    left join public.auteurs_valeur av on av.id = c.auteur_valeur_id
    left join public.auteurs a on a.id_auteur = c.auteur_id
    where c.ouvrage_id = o.id
  ), '[]'::jsonb) as contributeurs
from public.ouvrages_bibliographiques o
left join public.editeurs_valeur ev on ev.id = o.editeur_valeur_id
left join public.collections_valeur cv on cv.id = o.collection_valeur_id;

comment on view public.v_references_bibliographiques is
  'Ce que le moteur de rendu bibliographique lit, une ligne par ouvrage : champs de la notice, éditeurs liés et contributeurs résolus sur leurs autorités. Identité bibliographique seulement, aucune évaluation. Toujours fraîche : corriger une autorité se voit au prochain affichage.';

grant select on public.v_references_bibliographiques to anon, authenticated, service_role;
