/**
 * L'INVENTAIRE des couleurs écrites en dur — un registre de dette, pas une palette.
 *
 * La règle de la charte est simple : aucune couleur d'interface ne s'écrit en dur, on
 * emploie le jeton. Elle a été tenue par deux passes d'harmonie (1 033 valeurs rabattues
 * sur les jetons), et pourtant il en restait 353 le 2026-08-23, dont plusieurs illisibles
 * sur le sol du Cuir. La raison n'est pas la négligence : c'est qu'AUCUNE GARDE ne
 * vérifiait la règle. Le corps de texte a la sienne (`echelleTypographique.test.ts`),
 * les rayons d'angle la leur (`formes.test.ts`), les titres de page aussi — et sur ces
 * trois axes l'ordre règne. La couleur n'en avait pas, et c'est le seul axe qui dérive.
 *
 * Ce fichier gèle donc l'état du 2026-08-23. `couleursEnDur.test.ts` refuse toute teinte
 * NOUVELLE, et exige qu'une teinte transposée soit RETIRÉE d'ici. La liste ne peut donc
 * que décroître, et chaque diff montre de combien.
 *
 * ⛔ Il n'y a VOLONTAIREMENT pas de script pour regénérer ce fichier. Une regénération
 * automatique permettrait de re-geler la dette d'un geste, ce qui viderait la garde de
 * son sens : on retire une ligne quand on a transposé la couleur, à la main, en le
 * sachant.
 *
 * Hors inventaire, par décision de la charte : `globals.css` (c'est là que les jetons
 * sont DÉFINIS), `EssaiPDF.tsx` (PDFKit ne résout aucune custom property),
 * `couverturesEssai.ts` (contraste testé à part), `app/quiz/` (chantier Holy Guessr,
 * palette d'illustration propre) et les fichiers de test.
 *
 * Hors inventaire par NATURE : un noir ou un blanc TRANSLUCIDE — `rgba(0,0,0,0.4)` —
 * est une ombre ou un calque, forme que la charte prescrit et qui ne se transpose pas.
 * Un noir ou un blanc OPAQUE, lui, reste au registre : c'est une encre, et une encre
 * se transpose.
 */
export const COULEURS_EN_DUR: Record<string, readonly string[]> = {
  'admin/controleQualite.ts': ['#8a541d', '#c7832f'],
  // ⛔ Ces cinq valeurs NE PEUVENT PAS être des jetons, et c'est le principe même de
  // la page : la planche des illustrations montre chaque gravure sur les fonds du site
  // au CHOIX de l'administrateur, y compris le Cuir pendant qu'il regarde en Clair. Un
  // jeton rendrait toujours le thème courant, c'est-à-dire un seul des quatre fonds
  // d'épreuve, et l'on ne pourrait plus juger une gravure sur le sol où elle jure.
  // Même cas que la gamme des couvertures : une valeur DESSINÉE, non une teinte
  // d'interface. Elles recopient `globals.css` et se remesurent s'il change.
  'admin/illustrations/PlancheIllustrations.tsx': ['#1c1813', '#2f2a22', '#e6ded0', '#f7f4ef', '#ffffff'],
  'admin/SectionBibliotheque.tsx': ['#4a4038', '#5a5650', '#5f5952', '#7a6a48', '#8a5a00', '#9a6a3e', '#a85a44', '#b06a54', '#b0a480', '#b14b38', '#b3261e', '#b44a34', '#b8ccc0', '#c07a4a', '#c0836a', '#c0a86a', '#c6a08c', '#cfc8e6', '#d8b48f', '#e5a99b', 'rgba(150,110,70,0.035)'],
  'admin/SectionConstituerLiens.tsx': ['#9a6a3e', '#d8b48f'],
  'admin/SectionControleOeuvres.tsx': ['#5b3a7a', '#6f2a19', '#8aa185', '#c3aed6', '#c7832f', '#e2b9aa'],
  'admin/SectionEvenements.tsx': ['#b7a06a', '#e7d3b8'],
  'admin/SectionFiabilite.tsx': ['#6f8a3e'],
  'admin/SectionModeration.tsx': ['#3d5a6b', '#573f86', '#6b4fa0', '#6b5fa0', '#8a1f1f', '#9a6650', '#b0442a', '#d8c9ec', '#db988c', '#e2b9aa', '#e6ab95', '#ece3f8'],
  'admin/SectionPropositions.tsx': ['#5a6b9a'],
  'admin/SectionRemplacerSegments.tsx': ['#8a4a1a', '#9a6a3a', '#a0b8aa', '#e4c4a0'],
  'admin/SectionTraductions.tsx': ['#a0b8aa'],
  'admin/SectionValidationNotices.tsx': ['#6f8a3e'],
  'admin/SectionVerifications.tsx': ['rgba(60,50,30,0.06)'],
  'bibliotheque/BibliothequeClient.tsx': ['#7a8a6a', '#b87a30', '#b88a45'],
  'chantier/page.tsx': ['#bca877'],
  // Les deux cartons de l'accueil sont une GAMME DESSINÉE, non des teintes
  // d'interface : leur contraste est arrêté à la main, thème par thème, et un jeton
  // s'y retournerait (charte, « Encre contre aplat »). Ils restent donc au registre,
  // avec leur raison. ⚠️ La liste a DIMINUÉ le 2026-08-31 : trois teintes sont parties
  // avec la carte « Communauté », et quatre autres ont été remplacées quand le bronze
  // décoloré de la Patristique a cédé la place au maroquin rouge.
  'components/AccueilCards.tsx': ['#1e2e24', '#2a3d30', '#3a3125', '#3e1a17', '#4a3d2d', '#4e2823', '#5a2a26', '#6a3a31', 'rgba(10,18,8,0.30)', 'rgba(20,30,16,0.34)'],
  'components/Bulle.tsx': ['#6a9a7a', 'rgba(242,237,230,0.55)'],
  'components/EtoileFavori.tsx': ['#c8933a'],
  'components/ModalLienBiblique.tsx': ['#b07b65'],
  // ⬇ DIX teintes retirées le 2026-08-28, avec le passage de la recherche rapide aux
  //    familles de corpus : le bleu de la Bible (#3a5a8c et ses trois translucides), le
  //    violet de la chronologie (#6d5a86 et ses deux), et les trois ocres des
  //    publications. Toutes vivaient dans la table DOMAINE, laquelle contredisait la
  //    page de résultats. Elles passent aux jetons --cs-ecriture / --cs-peres /
  //    --cs-communaute, et les fonds se dérivent par color-mix.
  // `#f0b4a8` : l'encre maroquin de l'administration dans le panneau mobile (2026-09-22).
  // Aucun jeton ne la porte dans les deux thèmes : --cs-peres est sombre en Clair, et
  // le panneau reste vert ou cuir en toutes circonstances. 4,80 sur le vert, 7,36 sur le cuir.
  'components/Navbar.tsx': ['#fff', '#f0b4a8'],
  // Les trois écritures d'une CARTE DE COMMENTAIRE ont perdu leurs teintes le 2026-09-08,
  // en même temps que leur bandeau de gauche et leur boîte dans la boîte : le rouge du
  // contrôle — onze valeurs de rgba(176,58,42,…), plus #b0392b et #6f3d35 — passe par
  // --cs-danger-fond, --cs-danger-bord et --cs-danger-fonce, qui se retournent en Cuir.
  // Le dessin vit désormais dans app/lib/styleCommentaire.ts, qui n'écrit que des jetons,
  // et deux entrées disparaissent entièrement du registre.
  // L'or écrit en composantes de la pastille de période est parti le 2026-09-14 : le volet
  // de filtres des Pères parle l'or par jetons (`stylePastilleFiltre`).
  // 'compte/page.tsx' : retiré le 2026-09-01. La page unique de 978 lignes a été
  // découpée en rubriques, et ses trois teintes ont été transposées au passage :
  // #3d7a3d → --cs-vert-aplat-fonce, #c8c0b8 → --cs-texte-faible, #c8d8cc → --cs-bord.
  'essais/[id]/EssaiClient.tsx': ['#e4c4a0'],
  'essais/EditeurEssai.tsx': ['#a8564d', '#e8d5a0'],
  'essais/EssaisListeClient.tsx': ['rgba(0,0,0,0)', 'rgba(255,255,255,0)', 'rgba(40,30,15,0.18)', 'rgba(40,30,15,0.22)', 'rgba(40,30,15,0.40)', 'rgba(40,30,15,0.48)'],
  'histoire/HistoireClient.tsx': ['rgba(183,160,106,0.38)'],
  // ⛔ Un dégradé et une encre posés SUR UNE PHOTOGRAPHIE, non sur le sol du site.
  // Un jeton se retourne avec le thème ; une image, non. `var(--cs-fond)` valait le
  // crème au Clair et devenait le brun sombre en Cuir, c'est-à-dire du brun écrit sur
  // une photo sombre : le titre de la traduction y disparaissait (relevé le
  // 2026-08-23). Et le brun 26 19 12 n'est pas un noir : un noir neutre posé sur une
  // peinture ancienne la refroidit. Ces valeurs ne se transposent donc pas — elles
  // sont ici pour mémoire, non comme dette.
  'lib/bandeauTraduction.ts': ['#f7f4ef', 'rgba(26,19,12,0)', 'rgba(26,19,12,0.06)', 'rgba(26,19,12,0.24)', 'rgba(26,19,12,0.50)', 'rgba(26,19,12,0.68)', 'rgba(247,244,239,0.7)', 'rgba(247,244,239,0.82)'],
  'lib/frise.ts': ['#6d7d43', '#746187', '#83a06a', '#8a7440', '#b54d3f', '#c19a3e', '#c79a3a'],
  'lib/NoteTooltip.tsx': ['#c0a878', 'rgba(185,165,120,0.35)', 'rgba(255,248,235,0.7)'],
  'librairies/page.tsx': ['#153f78', '#5d3a6e', '#5e3a1c', 'rgba(124,88,47,0.38)', 'rgba(151,30,37,0.36)', 'rgba(22,63,125,0.32)', 'rgba(31,90,90,0.34)', 'rgba(93,58,110,0.34)'],
  'manuscrits/bible-899/bible899.module.css': ['#4c4942', '#4f5e54', '#514a42', '#5e574e', '#5f503d', '#73664f', '#765718', '#777168', '#7d746a', '#8d432e', '#b57735', '#c9c1b6', '#f2e7c9', 'rgba(255,253,248,0.97)', 'rgba(53,44,32,0.1)', 'rgba(58,48,35,0.08)'],
  // Les CALQUES de fenêtre écrits en brun translucide (0,32 à 0,55 selon l'écran) lisent
  // tous --cs-calque-modale depuis le 2026-09-23 : la polyglotte, la recherche, la
  // bibliothèque, le sélecteur de citation, la messagerie, le lien biblique, le compte requis.
  // Polyglotte et sélecteur de citation sortent ce jour-là du registre.
  'profil/[pseudo]/page.tsx': ['#e2ca91', '#e4cc91', '#e4d7b6', 'rgba(198,169,100,.42)', 'rgba(222,190,111,.18)', 'rgba(222,190,111,.20)', 'rgba(222,190,111,.34)', 'rgba(233,204,136,.24)', 'rgba(233,204,136,.28)', 'rgba(233,204,136,.30)', 'rgba(235,218,175,.46)', 'rgba(235,218,175,.7)'],
  // ⬇ Trois teintes retirées le 2026-08-28, avec la refonte des résultats de recherche :
  //    #4a453f (nom d'auteur d'une ligne de répartition) est passé à --cs-texte ;
  //    #f6cfca et #8a1710 étaient le surlignage ROUGE, que plus rien n'appelait depuis
  //    que la ligne d'en-tête dit où le mot se trouve. Partis avec lui.
  // ⚠️ #6f8f7b, #7a1d16 et #a9bcb0 en sont sortis le 2026-09-04 : c'étaient les trois
  // teintes de la copie de la Polyglotte, laquelle est passée aux jetons de la page de
  // lecture (voir globals.css, « La colonne de la Polyglotte »).
  // La recherche en sort entièrement le 2026-09-23 (calque, bouton inactif, pastille, infobulle).
  'soutenir/page.tsx': ['#fff'],
}
