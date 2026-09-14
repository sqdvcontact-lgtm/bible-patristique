/** L'échange de deux colonnes : une flèche à double sens.
 *
 *  ⛔ Elle remplace la phrase « Échange avec la position de … » que portait, dans le menu
 *  de la Polyglotte, une traduction déjà affichée dans une autre colonne (décision de
 *  l'auteur, 14 septembre 2026 : « simplement mettre une flèche à double sens entre les
 *  deux noms des traductions »). La ligne se lit alors « Sacy ↔ Segond » : on choisit la
 *  première, et les deux colonnes s'échangent.
 *
 *  ⚠️ Sa taille est RELATIVE au texte qu'elle sépare (`taille`, en `em`) : un dessin posé
 *  en pixels rapetisserait à mesure que la police racine grandit. Le trait est en
 *  `currentColor` et prend donc l'encre de la ligne, grisée comme elle.
 */
export default function IconeEchange({ taille = '1.1em' }: { taille?: string }) {
  return (
    <svg viewBox="0 0 16 10" aria-hidden="true" fill="none"
      style={{ display: 'block', width: taille, height: `calc(${taille} * 10 / 16)` }}>
      <path d="M1.75 5H14.25M4.5 2.25L1.75 5L4.5 7.75M11.5 2.25L14.25 5L11.5 7.75"
        stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
