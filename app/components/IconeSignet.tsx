/** Signet de prélèvement — vide, plein, ou « prélevé ailleurs ».
 *
 *  Un même dessin dans les trois états. Auparavant, le passage enregistré
 *  n'affichait plus de signet du tout mais une croix « ✕ » : le bouton cessait
 *  de dire l'état pour ne montrer que l'action de retrait, si bien qu'on ne
 *  pouvait pas voir d'un coup d'œil ce qu'on avait prélevé. Le signet se
 *  remplit désormais, comme un bouton « j'aime », et la croix disparaît —
 *  recliquer retire, l'infobulle le dit.
 *
 *  ⛔ LE TROISIÈME ÉTAT (2026-09-23) : le verset est prélevé, mais dans une AUTRE
 *  traduction (en lecture en regard, l'autre langue). Demande de l'auteur : « un
 *  logo de signet intermédiaire, pas tout à fait plein, avec les contours gras ».
 *  Le contour s'épaissit et le fond ne se remplit qu'à un quart : on voit que le
 *  verset est déjà mis de côté, et que CE texte-ci ne l'est pas.
 *
 *  Le tracé est identique dans les trois cas ; seuls le trait et le remplissage
 *  changent, ce qui garantit que les états occupent exactement la même place.
 */
export default function IconeSignet({ plein = false, ailleurs = false, taille }: {
  plein?: boolean
  /** Prélevé dans une autre traduction : contour gras, fond à peine teinté. Sans effet
   *  quand `plein` est vrai. */
  ailleurs?: boolean
  taille?: string
}) {
  const intermediaire = ailleurs && !plein
  return (
    <svg width="13" height="14" viewBox="0 0 12 13" aria-hidden="true" style={{ display: 'block', ...(taille ? { width: taille, height: 'auto' } : null) }}
      fill={plein || intermediaire ? 'currentColor' : 'none'}
      fillOpacity={intermediaire ? 0.28 : undefined}
      data-etat={plein ? 'plein' : intermediaire ? 'ailleurs' : 'vide'}>
      <path d="M3 2.2C3 1.75 3.35 1.4 3.8 1.4H8.2C8.65 1.4 9 1.75 9 2.2V11L6 9.15L3 11V2.2Z"
        stroke="currentColor" strokeWidth={intermediaire ? 1.9 : 1.25} strokeLinejoin="round" />
    </svg>
  )
}
