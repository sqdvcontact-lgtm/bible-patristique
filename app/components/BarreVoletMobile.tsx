'use client'

import type { Ref } from 'react'
import IconeChevron from '@/app/components/IconeChevron'
import { Z_TIROIR } from '@/app/lib/empilement'
import { HAUTEUR_BARRE_VOLET, HAUTEUR_NAVBAR } from '@/app/lib/mesures'

/**
 * LA BARRE FIXE D’UN VOLET SUR TÉLÉPHONE, et elle ne disparaît jamais.
 *
 * ⛔ Elle reste posée tiroir OUVERT comme tiroir FERMÉ (relevé de l’auteur,
 * 2026-09-09) : le tiroir se glisse dessous, et c’est elle qui referme. Elle
 * disparaissait jusque-là au profit d’un en-tête de tiroir dont la flèche regardait
 * à GAUCHE, c’est-à-dire vers le rail du BUREAU, qui n’existe pas sur un téléphone —
 * « on ne sait pas où fermer ou comment revenir ».
 *
 * ⛔ LE LIBELLÉ EST CENTRÉ, ET LE CHEVRON EST DOUBLÉ pour cela, le double invisible.
 * C’est le procédé que la charte prescrit depuis le menu des bibles (§ « Un CHEVRON
 * n’entre pas dans le centrage du libellé qu’il accompagne ») : centrer chevron
 * compris pose le mot à côté de l’axe, et l’écart se voit.
 *
 * ⚠️ Le chevron désigne le MOUVEMENT du tiroir, non un côté : vers le bas quand la
 * barre du haut va s’ouvrir, vers le haut quand elle va se refermer, et l’inverse
 * en pied. Une seule écriture pour toutes les barres, faute de quoi elles divergent :
 * le sommaire et le volet d'une œuvre, les commentaires d'une publication (sortie
 * d'`OeuvreClient` le 2026-09-22 pour cela).
 */
export default function BarreVoletMobile({ cote, ouvert, libelle, titre, onBasculer, refBouton }: {
  cote: 'haut' | 'bas'
  ouvert: boolean
  libelle: string
  titre: string
  onBasculer: () => void
  refBouton?: Ref<HTMLButtonElement>
}) {
  const haut = cote === 'haut'
  const dir: 'up' | 'down' = haut ? (ouvert ? 'up' : 'down') : (ouvert ? 'down' : 'up')
  const marque = (invisible: boolean) => (
    <span aria-hidden style={{ display: 'inline-flex', flexShrink: 0, color: 'var(--cs-texte-doux)', visibility: invisible ? 'hidden' : undefined }}>
      <IconeChevron dir={dir} size={14} strokeWidth={1.5} />
    </span>
  )
  return (
    <button ref={refBouton} onClick={onBasculer} title={titre} aria-expanded={ouvert}
      style={{
        // ⛔ `Z_TIROIR`, le rang de son PROPRE tiroir, et non celui d'une fenêtre de
        // page. Le voile du tiroir est posé en `inset: 0` à 2400 : à 1200, la barre
        // passait DESSOUS dès que son tiroir s'ouvrait, donc voilée de 34 % de noir,
        // et le tap qui devait la fermer tombait sur le voile. Le résultat était le
        // même par accident, l'affordance non : la charte veut que la barre reste
        // POSÉE quand son tiroir s'ouvre, et que ce soit ELLE qui ferme.
        position: 'fixed', left: 0, right: 0, width: '100%', zIndex: Z_TIROIR,
        ...(haut
          ? { top: HAUTEUR_NAVBAR, borderBottom: '1px solid var(--cs-bord)', boxShadow: 'var(--cs-ombre-posee)', background: 'var(--cs-fond-clair)' }
          : { bottom: 0, borderTop: '1px solid var(--cs-bord)', boxShadow: 'var(--cs-ombre-posee-haut)', background: 'var(--cs-surface)' }),
        height: HAUTEUR_BARRE_VOLET, border: 'none', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '9px', padding: '0 1rem',
      }}>
      {marque(true)}
      <span style={{ fontSize: '0.8125rem', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600, color: 'var(--cs-texte-second)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{libelle}</span>
      {marque(false)}
    </button>
  )
}
