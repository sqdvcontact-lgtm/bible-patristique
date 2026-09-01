-- LA BORNE DE LA NOTICE, RECTIFIÉE (1er septembre 2026)
--
-- ⚠️ La migration précédente bornait à 128 signes sur une mesure FAUSSE. Le panneau
-- du navigateur rendait la planche à sa propre largeur — cinquante pixels par carte,
-- soit la disposition téléphone poussée à l'absurde — et j'en avais tiré une capacité
-- de 130 signes. Mesurée à la largeur RÉELLE, la carte fait 191 px sur 148 et tient
-- 292 signes de mots longs, qui est le pire cas ; environ 235 sur un téléphone.
--
-- La borne passe donc à 180, qui garde une marge franche sous la mesure la plus
-- basse sans corseter la prose.
--
-- ⛔ ELLE NE DISPARAÎT PAS pour autant. L'explication paraît au SURVOL, à même la
-- carte, sous `overflow: hidden` : une notice trop longue serait coupée en silence,
-- et le référentiel se corrige librement en base, sans déploiement. Une règle qui ne
-- vivrait que dans un commentaire ne tiendrait pas la main de qui édite une ligne
-- six mois plus tard.
--
-- ⚠️ Les deux notices raccourcies ne sont PAS rétablies : elles étaient de moi et non
-- de l'auteur, et leur version courte se lit mieux. C'est le seul point où la fausse
-- mesure a laissé une trace, et elle est bénigne.
--
-- Corollaire de méthode, qui vaut au-delà d'ici : une mesure au navigateur se
-- contrôle par la LARGEUR DE SA BOÎTE avant d'être crue. Trois relevés successifs
-- ont dit trois choses différentes parce que le panneau servait tantôt un instantané
-- périmé, tantôt une fenêtre de cinquante pixels.

begin;

alter table public.hauts_faits drop constraint if exists hauts_faits_notice_non_vide;
alter table public.hauts_faits add constraint hauts_faits_notice_non_vide
  check (length(btrim(notice)) between 1 and 180);

commit;
