-- INFORMATIONS COMPLÉMENTAIRES D'UNE ÉDITION — les manuscrits, les sigles, les
-- abréviations, tout ce qu'une édition savante déclare pour qu'on la lise.
--
-- Demande de l'auteur, 12 septembre 2026 : « une rubrique “Informations complémentaires”
-- qui s'affichera quand elle est remplie ; ça aura par exemple fonction pour nommer les
-- manuscrits, les abréviations, etc., d'une édition. »
--
-- ⛔ ELLE VIT SUR LE TEXTE, NON SUR L'ŒUVRE. Les manuscrits de Knöll — B, P, Q, S — sont
-- ceux de SON édition du latin, non des « Confessions » : la traduction d'Arnauld
-- d'Andilly, qui vit sous la même œuvre, n'en a aucun. Une colonne d'œuvre forcerait à
-- n'en garder qu'une pour les deux, et la Consolation de Boèce, qui porte deux éditions
-- françaises et un latin, le dirait trois fois plus mal.
--
-- ⛔ NULLABLE ET SANS CONTRAINTE : c'est de la prose éditoriale, comme
-- `oeuvres.commentaire_traduction`. Le vide veut dire « rien à déclarer », et la rubrique
-- ne paraît pas — c'est la règle demandée.
--
-- ⚠️ ELLE EST PUBLIQUE, et c'est ce qui la distingue d'une note d'atelier : la fiche
-- « À propos de cette édition » la rend à tout lecteur. Ce qui ne se montre pas vit dans
-- `oeuvres_commentaires_prives`, hors de portée de PostgREST (charte § 5.7).
alter table public.oeuvre_textes
  add column if not exists informations_complementaires text;

comment on column public.oeuvre_textes.informations_complementaires is
  'Prose éditoriale PUBLIQUE propre à cette édition : manuscrits et sigles employés, abréviations, conventions de transcription. Rendue sous la rubrique « Informations complémentaires » de la fiche « À propos de cette édition », et seulement si elle est remplie. Charte § 5.6.';

-- ⚠️ Aucun GRANT à poser : `oeuvre_textes` est déjà lue par le site sous la session du
-- lecteur, et la politique de publication (charte § 52) décide seule de ce qu'elle rend.
-- ⚠️ Aucun index : la colonne ne se filtre ni ne se trie, elle se lit avec sa ligne.
