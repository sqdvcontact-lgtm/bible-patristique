/**
 * LES RANGS DE PAGE QUI NE SONT PAS SUR L'ÉCHELLE — état du 9 septembre 2026.
 *
 * Dix rangs dans six fichiers, sur les cinquante et un que le site écrit en chiffres.
 * ⚠️ Ils étaient vingt-deux dans dix-sept fichiers le matin même : les douze qui en
 * sont sortis étaient TOUS des fenêtres modales, éparpillées de 1000 à 5000 selon
 * l'écran qui les avait écrites, et elles vivent maintenant à `Z_MODALE`.
 *
 * ⛔ CETTE LISTE NE PEUT QUE DÉCROÎTRE. `empilement.test.ts` refuse un rang de page
 * qui ne serait ni sur l'échelle ni ici, et refuse aussi une entrée qui n'existe plus :
 * la dette devient visible dans chaque diff, et l'on ne peut pas la re-geler d'un
 * geste. C'est exactement le parti de `couleursEnDurInventaire.ts`, et pour la même
 * raison — aucun script ne regénère ce fichier, on en retire une ligne quand on a
 * rangé la valeur, à la main, en le sachant.
 *
 * ⚠️ CE QUI RESTE N'EST PLUS DE LA MÊME FAMILLE que ce qui en est sorti, et c'est
 * pourquoi il n'a pas suivi. Deux groupes, et deux arbitrages distincts :
 *
 *  — le CHROME DE PAGE (1250, 1300) : les deux barres fixes de la lecture biblique sur
 *    téléphone. Ce ne sont ni des fenêtres ni des tiroirs ; ils accompagnent la page et
 *    se comparent d'abord entre eux.
 *    ✅ La PASTILLE DES VOLETS en est sortie le 2026-09-10, et elle y était pour une
 *    mauvaise raison : on l'avait rangée avec les barres fixes parce qu'elle est fixe
 *    elle aussi. Or elle n'accompagne pas la page, elle FLOTTE au-dessus de la colonne
 *    de lecture — c'est-à-dire qu'elle est de la famille de la cellule d'actions, dont
 *    elle prend désormais le sol, l'ombre et le rang (`Z_FLOTTANT`). Elle descend donc
 *    de 2 500 à 1 100, et c'est un progrès : à 2 500 elle passait par-dessus les
 *    fenêtres et les tiroirs, qu'un contrôle de confort n'a aucune raison de couvrir.
 *    ⚠️ Le 2 500 de `VoletNotifications.tsx` n'a rien à voir et n'a pas bougé.
 *  — les rangs INTERNES DE LA BARRE (3001, 3090, 3100) : ils ne se comparent qu'à
 *    `Z_BARRE`, qu'ils doivent dépasser d'un cran pour se poser dessus. Les faire
 *    entrer dans l'échelle demanderait de nommer « au-dessus de la barre » trois fois.
 */
export const RANGS_HORS_ECHELLE: Record<string, readonly number[]> = {
  'components/BibleLayout.tsx': [1250, 1300],
  'components/Navbar.tsx': [3090, 3100],
  'components/VoletNotifications.tsx': [2500],
  'globals.css': [3100],
  'polyglotte/page.tsx': [3001],
}
