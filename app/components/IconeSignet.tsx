/** Signet de prélèvement — vide ou plein.
 *
 *  Un même dessin dans les deux états. Auparavant, le passage enregistré
 *  n'affichait plus de signet du tout mais une croix « ✕ » : le bouton cessait
 *  de dire l'état pour ne montrer que l'action de retrait, si bien qu'on ne
 *  pouvait pas voir d'un coup d'œil ce qu'on avait prélevé. Le signet se
 *  remplit désormais, comme un bouton « j'aime », et la croix disparaît —
 *  recliquer retire, l'infobulle le dit.
 *
 *  Le tracé est identique dans les deux cas ; seul le remplissage change, ce
 *  qui garantit que les deux états occupent exactement la même place.
 */
export default function IconeSignet({ plein = false }: { plein?: boolean }) {
  return (
    <svg width="11" height="12" viewBox="0 0 12 13" aria-hidden="true" style={{ display: 'block' }}
      fill={plein ? 'currentColor' : 'none'}>
      <path d="M3 2.2C3 1.75 3.35 1.4 3.8 1.4H8.2C8.65 1.4 9 1.75 9 2.2V11L6 9.15L3 11V2.2Z"
        stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" />
    </svg>
  )
}
