/**
 * LES RANGS DE PAGE QUI NE SONT PAS SUR L'ÉCHELLE — état gelé du 9 septembre 2026.
 *
 * Vingt-deux rangs dans dix-sept fichiers, sur les cinquante et un que le site écrit
 * en chiffres : le reste tombe déjà sur l'un des onze rangs de `empilement.ts`.
 *
 * ⛔ CETTE LISTE NE PEUT QUE DÉCROÎTRE. `empilement.test.ts` refuse un rang de page
 * qui ne serait ni sur l'échelle ni ici, et refuse aussi une entrée qui n'existe plus :
 * la dette devient visible dans chaque diff, et l'on ne peut pas la re-geler d'un
 * geste. C'est exactement le parti de `couleursEnDurInventaire.ts`, et pour la même
 * raison — aucun script ne regénère ce fichier, on en retire une ligne quand on a
 * rangé la valeur, à la main, en le sachant.
 *
 * ⚠️ Chaque valeur a une raison d'être aujourd'hui ; ce qui lui manque est une PLACE
 * dans une échelle. Les trois questions qui commandent ce rangement sont écrites en
 * pied de `empilement.ts`, et elles relèvent d'un arbitrage, non d'un nettoyage.
 */
export const RANGS_HORS_ECHELLE: Record<string, readonly number[]> = {
  'admin/SectionBibliotheque.tsx': [1000, 2100],
  'admin/SectionTraductions.tsx': [2000],
  'components/BibleLayout.tsx': [1250, 1300, 2500],
  'components/CitationPreferee.tsx': [2600],
  'components/ModalLienBiblique.tsx': [5000],
  'components/ModaleAuteur.tsx': [2100],
  'components/ModaleCompteRequis.tsx': [2600],
  'components/ModaleLivreAbsent.tsx': [2600],
  'components/ModaleMessagerie.tsx': [2100],
  'components/Navbar.tsx': [3090, 3100],
  'components/VoletNotifications.tsx': [2500],
  'compte/ModalesPortrait.tsx': [1300],
  'essais/EditeurEssai.tsx': [2000],
  'globals.css': [3100],
  'oeuvre/[id]/OeuvreClient.tsx': [2500],
  'polyglotte/page.tsx': [2000, 3001],
  'recherche/RechercheClient.tsx': [1000],
}
