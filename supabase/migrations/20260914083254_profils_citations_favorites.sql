-- UNE CITATION FAVORITE PAR CORPUS : UNE DE L'ÉCRITURE, UNE DES PÈRES.
--
-- Demande de l'auteur, 2026-09-14 : « Sur "Ma page" n'afficher que les citations
-- favorites (une bible, une pères). » Le lecteur n'en portait qu'UNE, natures
-- confondues, dans `profils.citation_preferee` : désigner un verset défaisait le passage
-- des Pères, et la page publique ne pouvait pas en montrer deux. Deux colonnes, une par
-- corpus ; en choisir une ne touche jamais à l'autre (charte § 34.2).
--
-- ⛔ LA BASE EST PARTAGÉE AVEC LE SITE EN LIGNE : cette migration n'AJOUTE que. Le code
-- qui lit les deux colonnes se déploie ensuite, et `citation_preferee` ne se retire
-- qu'une fois ce déploiement servi, par une seconde migration qui recopie d'abord ce
-- qu'elle porte.
alter table public.profils
  add column if not exists citation_favorite_biblique jsonb,
  add column if not exists citation_favorite_patristique jsonb;

comment on column public.profils.citation_favorite_biblique is
  'La citation favorite du lecteur prise dans l''Écriture : { id, ids?, type: "biblique", texte, ref?, traduction? }, écrite par favoritePourEcriture (app/lib/citationsFavorites.ts). id désigne le prélèvement qui l''identifie, ids ceux du groupe de versets. La page publique la recompose depuis ces prélèvements : une favorite dont le prélèvement a disparu ne paraît pas.';

comment on column public.profils.citation_favorite_patristique is
  'La citation favorite du lecteur prise chez les Pères : { id, ids?, type: "patristique", texte, auteur?, titre_oeuvre? }. Même écriture et même règle, plus une : une favorite dont l''œuvre n''est plus publiée ne paraît pas.';

-- ⛔ LA FORME SE GARDE EN BASE, parce que c'est le NAVIGATEUR du lecteur qui écrit, sur sa
-- propre ligne. La politique de `profils` borne la LIGNE qu'un compte modifie, jamais la
-- VALEUR qu'il y écrit : sans ces contraintes, un compte y déposerait un document de
-- plusieurs mégaoctets, ou une citation de l'Écriture dans la place des Pères.
--
-- ⚠️ Elles REFUSENT, là où la garde de `visites_faites` RANGE : une citation mal formée
-- n'a pas de forme rangée, et aucune écriture du site n'en produit, `favoritePourEcriture`
-- bornant déjà tout ce qu'elle écrit. Le refus ne peut tomber que sur une écriture qui ne
-- vient pas du site.
--
-- ⛔ CHAQUE TEST PASSE PAR `coalesce(…, false)`, et ce n'est pas un ornement : une
-- contrainte CHECK est SATISFAITE quand son expression vaut NULL. Une clé absente rend
-- NULL à `->>` comme à `jsonb_typeof`, si bien que, sans lui, un objet sans `type` ni `id`
-- passerait la garde qui existe pour le refuser.
--
-- ⚠️ Le plafond de 32 768 octets borne un abus, il ne mesure pas une citation. Le pire cas
-- que le code puisse écrire (deux cents identifiants, deux mille signes de trois octets
-- pièce, les mentions à leur borne) pèse 15 628 octets, mesuré au contrôle 5 : le plafond
-- en laisse plus du double.
--
-- ⚠️ Retirer une favorite écrit `null` par PostgREST, que `json_to_record` rend en NULL SQL
-- et non en jsonb `null` (vérifié en base le 2026-09-14). Le jsonb `null` n'est produit
-- par rien, et il est refusé comme tout ce qui n'est pas un objet.
alter table public.profils drop constraint if exists profils_citation_favorite_biblique_forme;
alter table public.profils add constraint profils_citation_favorite_biblique_forme check (
  citation_favorite_biblique is null
  or (jsonb_typeof(citation_favorite_biblique) = 'object'
      and coalesce(citation_favorite_biblique ->> 'type' = 'biblique', false)
      and coalesce(jsonb_typeof(citation_favorite_biblique -> 'id') = 'string', false)
      and coalesce(jsonb_typeof(citation_favorite_biblique -> 'texte') = 'string', false)
      and octet_length(citation_favorite_biblique::text) <= 32768)
);

alter table public.profils drop constraint if exists profils_citation_favorite_patristique_forme;
alter table public.profils add constraint profils_citation_favorite_patristique_forme check (
  citation_favorite_patristique is null
  or (jsonb_typeof(citation_favorite_patristique) = 'object'
      and coalesce(citation_favorite_patristique ->> 'type' = 'patristique', false)
      and coalesce(jsonb_typeof(citation_favorite_patristique -> 'id') = 'string', false)
      and coalesce(jsonb_typeof(citation_favorite_patristique -> 'texte') = 'string', false)
      and octet_length(citation_favorite_patristique::text) <= 32768)
);

-- RETOUR EN ARRIÈRE
--
-- ⚠️ Seulement avant la seconde migration, et en redéployant d'abord le code d'avant : le
-- code servi lit ces deux colonnes, et les retirer mettrait en erreur la page publique de
-- chaque lecteur.
--   alter table public.profils drop constraint profils_citation_favorite_patristique_forme;
--   alter table public.profils drop constraint profils_citation_favorite_biblique_forme;
--   alter table public.profils drop column citation_favorite_patristique;
--   alter table public.profils drop column citation_favorite_biblique;
