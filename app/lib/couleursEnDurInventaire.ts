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
  'admin/AdminClient.tsx': ['#6a8074', '#a2564a'],
  'admin/controleQualite.ts': ['#8a541d', '#c7832f'],
  // ⛔ Ces cinq valeurs NE PEUVENT PAS être des jetons, et c'est le principe même de
  // la page : la planche des illustrations montre chaque gravure sur les fonds du site
  // au CHOIX de l'administrateur, y compris le Cuir pendant qu'il regarde en Clair. Un
  // jeton rendrait toujours le thème courant, c'est-à-dire un seul des quatre fonds
  // d'épreuve, et l'on ne pourrait plus juger une gravure sur le sol où elle jure.
  // Même cas que la gamme des couvertures : une valeur DESSINÉE, non une teinte
  // d'interface. Elles recopient `globals.css` et se remesurent s'il change.
  'admin/illustrations/PlancheIllustrations.tsx': ['#1c1813', '#2f2a22', '#e6ded0', '#f7f4ef', '#ffffff'],
  'admin/SectionAjouterOeuvre.tsx': ['#c8c3bc'],
  'admin/SectionBibliotheque.tsx': ['#4a4038', '#5a5650', '#5f5952', '#7a6a48', '#8a5a00', '#9a6a3e', '#a85a44', '#b06a54', '#b0a480', '#b14b38', '#b3261e', '#b44a34', '#b8ccc0', '#c07a4a', '#c0836a', '#c0a86a', '#c2bcb2', '#c6a08c', '#c8d8ce', '#cbe0d4', '#cfc8e6', '#cfe0d5', '#d8b48f', '#e5a99b', 'rgba(150,110,70,0.035)', 'rgba(30,26,22,0.55)'],
  'admin/SectionConstituerLiens.tsx': ['#9a6a3e', '#d8b48f'],
  'admin/SectionControleOeuvres.tsx': ['#5b3a7a', '#6f2a19', '#8aa185', '#c3aed6', '#c7832f', '#e2b9aa'],
  'admin/SectionEssaisAdmin.tsx': ['#4a4540'],
  'admin/SectionEvenements.tsx': ['#b7a06a', '#e7d3b8'],
  'admin/SectionFiabilite.tsx': ['#6f8a3e'],
  'admin/SectionModeration.tsx': ['#3d5a6b', '#573f86', '#6b4fa0', '#6b5fa0', '#7a746c', '#8a1f1f', '#9a6650', '#b0442a', '#b8ccbd', '#d8c9ec', '#db988c', '#e2b9aa', '#e6ab95', '#ece3f8'],
  'admin/SectionPropositions.tsx': ['#5a6b9a'],
  'admin/SectionRemplacerSegments.tsx': ['#8a4a1a', '#9a6a3a', '#a0b8aa', '#e4c4a0'],
  'admin/SectionTraductions.tsx': ['#a0b8aa'],
  'admin/SectionValidationNotices.tsx': ['#6f8a3e'],
  'admin/SectionVerifications.tsx': ['rgba(60,50,30,0.06)'],
  'bibliotheque/BibliothequeClient.tsx': ['#3d5a6b', '#4a4030', '#4a6070', '#7a6040', '#7a6a48', '#7a6a50', '#7a8a6a', '#8a7a5a', '#a2564a', '#b0442a', '#b87a30', '#b88a45', '#b8a888', '#cfe0d5', 'rgba(139,107,60,0.05)', 'rgba(139,107,60,0.07)', 'rgba(139,107,60,0.08)', 'rgba(139,107,60,0.22)', 'rgba(30,26,20,0.42)', 'rgba(30,26,20,0.55)', 'rgba(61,90,107,0.07)', 'rgba(61,90,107,0.22)'],
  'bienvenue/page.tsx': ['#7a7068'],
  'chantier/page.tsx': ['#bca877', 'rgba(180,50,40,0.06)', 'rgba(180,50,40,0.18)'],
  // Les deux cartons de l'accueil sont une GAMME DESSINÉE, non des teintes
  // d'interface : leur contraste est arrêté à la main, thème par thème, et un jeton
  // s'y retournerait (charte, « Encre contre aplat »). Ils restent donc au registre,
  // avec leur raison. ⚠️ La liste a DIMINUÉ le 2026-08-31 : trois teintes sont parties
  // avec la carte « Communauté », et quatre autres ont été remplacées quand le bronze
  // décoloré de la Patristique a cédé la place au maroquin rouge.
  'components/AccueilCards.tsx': ['#1e2e24', '#2a3d30', '#3a3125', '#3e1a17', '#4a3d2d', '#4e2823', '#5a2a26', '#6a3a31', 'rgba(10,18,8,0.30)', 'rgba(20,30,16,0.34)'],
  'components/BibleLayout.tsx': ['#b0a088', 'rgba(198,184,158,0.62)', 'rgba(250,246,237,0.86)'],
  'components/Bulle.tsx': ['#6a9a7a', 'rgba(242,237,230,0.55)'],
  'components/EtoileFavori.tsx': ['#8a7a5e', '#a07028', '#c8933a'],
  'components/LectureBilingueBible.tsx': ['#b0a088'],
  'components/ModaleAuteur.tsx': ['#b7a06a', '#c9c1b4', '#d2c69f', 'rgba(30,26,20,0.42)'],
  'components/ModaleCompteRequis.tsx': ['rgba(30,26,20,0.5)'],
  'components/ModaleMessagerie.tsx': ['rgba(30,26,20,0.42)', 'rgba(40,30,15,0.26)'],
  'components/ModalLienBiblique.tsx': ['#5f574d', '#8b7a5c', '#b05638', '#b07b65', 'rgba(20,25,20,0.32)'],
  'components/ModalSignalement.tsx': ['#5a1010', '#6b1010', '#7a2f18', '#7b0000', '#a06060', '#a85c3a', '#b5764a', '#c09a86', '#c53030', '#efd8c6', '#f0a0a0', 'rgba(30,26,20,0.5)'],
  // ⬇ DIX teintes retirées le 2026-08-28, avec le passage de la recherche rapide aux
  //    familles de corpus : le bleu de la Bible (#3a5a8c et ses trois translucides), le
  //    violet de la chronologie (#6d5a86 et ses deux), et les trois ocres des
  //    publications. Toutes vivaient dans la table DOMAINE, laquelle contredisait la
  //    page de résultats. Elles passent aux jetons --cs-ecriture / --cs-peres /
  //    --cs-communaute, et les fonds se dérivent par color-mix.
  'components/Navbar.tsx': ['#fff'],
  'components/NavLivres.tsx': ['#a9b6a6', 'rgba(122,96,64,0.08)', 'rgba(198,184,158,0.08)'],
  'components/PanneauPatristique.tsx': ['rgba(122,96,64,0.08)', 'rgba(154,126,61,0.16)', 'rgba(176,58,42,0)', 'rgba(176,58,42,0.06)', 'rgba(176,58,42,0.07)', 'rgba(176,58,42,0.09)', 'rgba(176,58,42,0.20)', 'rgba(176,58,42,0.26)', 'rgba(176,58,42,0.30)', 'rgba(176,58,42,0.82)', 'rgba(198,184,158,0.08)'],
  'components/TexteBible.tsx': ['#b0a088'],
  // 'compte/page.tsx' : retiré le 2026-09-01. La page unique de 978 lignes a été
  // découpée en rubriques, et ses trois teintes ont été transposées au passage :
  // #3d7a3d → --cs-vert-aplat-fonce, #c8c0b8 → --cs-texte-faible, #c8d8cc → --cs-bord.
  'conditions-utilisation/page.tsx': ['#4133'],
  'contact/page.tsx': ['#566150'],
  'essais/[id]/EssaiClient.tsx': ['#e4c4a0'],
  'essais/[id]/EssaiCommentaires.tsx': ['#6f3d35', '#b0392b', 'rgba(176,58,42,0)', 'rgba(176,58,42,0.06)', 'rgba(176,58,42,0.07)', 'rgba(176,58,42,0.09)', 'rgba(176,58,42,0.10)', 'rgba(176,58,42,0.20)', 'rgba(176,58,42,0.26)', 'rgba(176,58,42,0.30)', 'rgba(176,58,42,0.82)'],
  'essais/EditeurEssai.tsx': ['#5b544c', '#7a5a30', '#a8564d', '#e8d5a0'],
  'essais/EssaisListeClient.tsx': ['#c8d8cc', '#fff', 'rgba(0,0,0,0)', 'rgba(120,110,96,0.06)', 'rgba(255,255,255,0)', 'rgba(40,30,15,0.18)', 'rgba(40,30,15,0.22)', 'rgba(40,30,15,0.40)', 'rgba(40,30,15,0.48)'],
  'histoire/HistoireClient.tsx': ['#5a5044', '#7a6f61', '#7a746d', '#b0a088', '#b7a06a', 'rgba(183,160,106,0.38)'],
  // ⛔ Un dégradé et une encre posés SUR UNE PHOTOGRAPHIE, non sur le sol du site.
  // Un jeton se retourne avec le thème ; une image, non. `var(--cs-fond)` valait le
  // crème au Clair et devenait le brun sombre en Cuir, c'est-à-dire du brun écrit sur
  // une photo sombre : le titre de la traduction y disparaissait (relevé le
  // 2026-08-23). Et le brun 26 19 12 n'est pas un noir : un noir neutre posé sur une
  // peinture ancienne la refroidit. Ces valeurs ne se transposent donc pas — elles
  // sont ici pour mémoire, non comme dette.
  'lib/bandeauTraduction.ts': ['#f7f4ef', 'rgba(26,19,12,0)', 'rgba(26,19,12,0.06)', 'rgba(26,19,12,0.24)', 'rgba(26,19,12,0.50)', 'rgba(26,19,12,0.68)', 'rgba(247,244,239,0.58)', 'rgba(247,244,239,0.7)', 'rgba(247,244,239,0.82)'],
  'lib/frise.ts': ['#6d7d43', '#746187', '#83a06a', '#8a7440', '#b54d3f', '#c19a3e', '#c79a3a'],
  'lib/NoteTooltip.tsx': ['#c0a878', 'rgba(10,8,4,0.06)', 'rgba(10,8,4,0.13)', 'rgba(185,165,120,0.35)', 'rgba(255,248,235,0.7)'],
  'lib/SelecteurCitation.tsx': ['#cddbd1', 'rgba(30,26,22,0.45)'],
  'librairies/page.tsx': ['#153f78', '#5d3a6e', '#5e3a1c', 'rgba(124,88,47,0.38)', 'rgba(151,30,37,0.36)', 'rgba(22,63,125,0.32)', 'rgba(31,90,90,0.34)', 'rgba(93,58,110,0.34)'],
  'manuscrits/bible-899/bible899.module.css': ['#4c4942', '#4f5e54', '#514a42', '#5e574e', '#5f503d', '#73664f', '#765718', '#777168', '#7d746a', '#8d432e', '#b57735', '#c9c1b6', '#f2e7c9', 'rgba(255,253,248,0.97)', 'rgba(53,44,32,0.1)', 'rgba(58,48,35,0.08)'],
  'messagerie/[pseudo]/page.tsx': ['#c87070'],
  'oeuvre/[id]/appelNote.tsx': ['#b0a08a'],
  'oeuvre/[id]/AssocierVerset.tsx': ['#b8cdc0'],
  'oeuvre/[id]/ComparaisonStatut.tsx': ['#7a5a2d', 'rgba(142,102,38,0.32)', 'rgba(190,145,66,0.09)'],
  'oeuvre/[id]/ComparaisonTraductions.tsx': ['#b0a08a'],
  // Le CALQUE d'une modale : une forme que la charte prescrit, et qui ne se
  // transpose pas. ⚠️ Le brun très sombre plutôt qu'un noir neutre, qui refroidirait
  // la page qu'il assombrit — le site est chaud jusque dans son ombre.
  'oeuvre/[id]/FicheEdition.tsx': ['rgba(30,26,20,0.42)'],
  'oeuvre/[id]/OeuvreClient.tsx': ['#9a958d', 'rgba(122,96,64,0.08)', 'rgba(198,184,158,0.08)', 'rgba(198,184,158,0.62)', 'rgba(250,246,237,0.86)'],
  'oeuvre/[id]/OngletCommentaires.tsx': ['#6f3d35', '#b0392b', 'rgba(176,58,42,0)', 'rgba(176,58,42,0.06)', 'rgba(176,58,42,0.07)', 'rgba(176,58,42,0.09)', 'rgba(176,58,42,0.10)', 'rgba(176,58,42,0.20)', 'rgba(176,58,42,0.26)', 'rgba(176,58,42,0.30)', 'rgba(176,58,42,0.82)'],
  'polyglotte/page.tsx': ['rgba(90,75,156,0.22)'],
  'profil/[pseudo]/page.tsx': ['#7a8a6e', '#c8a858', '#c8c0b8', '#e2c98d', '#e2ca91', '#e4cc91', '#e4d7b6', '#ead9a9', 'rgba(198,169,100,.42)', 'rgba(222,190,111,.18)', 'rgba(222,190,111,.20)', 'rgba(222,190,111,.34)', 'rgba(233,204,136,.24)', 'rgba(233,204,136,.28)', 'rgba(233,204,136,.30)', 'rgba(235,218,175,.46)', 'rgba(235,218,175,.7)'],
  // ⬇ Trois teintes retirées le 2026-08-28, avec la refonte des résultats de recherche :
  //    #4a453f (nom d'auteur d'une ligne de répartition) est passé à --cs-texte ;
  //    #f6cfca et #8a1710 étaient le surlignage ROUGE, que plus rien n'appelait depuis
  //    que la ligne d'en-tête dit où le mot se trouve. Partis avec lui.
  'recherche/RechercheClient.tsx': ['#5a5248', '#6a8474', '#6f8f7b', '#7a1d16', '#7a5a10', '#a9bcb0', '#b6ccbd', '#c8c0b8', '#e8c96a', 'rgba(30,28,24,0.38)'],
  'soutenir/page.tsx': ['#b0a088', '#cfc6b6', '#fff'],
}
