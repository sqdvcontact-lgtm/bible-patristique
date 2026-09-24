'use client'

// ── LE BOUTON QUI SUPPRIME UN COMMENTAIRE, ET QUI DIT SON ÉCHEC ───────────────
//
// ⛔ UN SEUL BOUTON POUR LES DEUX SURFACES (2026-09-22). Le volet d'un verset s'était
// donné l'éclat d'échec, l'annonce vivante et le libellé qui invite à réessayer ; la page
// d'une œuvre gardait le bouton d'avant, dont le refus ne partait qu'à la console — le
// commentaire restait là sans un mot, et l'on recliquait. Le dessin, le libellé et la
// conduite vivent donc ici, une fois.
//
// ⚠️ `onSupprimer` rend `false` quand la base a refusé. Une question annulée rend `true` :
// il ne s'est rien passé, ce n'est pas un échec.

import { useState } from 'react'
import { avecHoteEclat } from '@/app/components/EclatCopie'
import { EclatEchec, STYLE_HOTE_ECHEC, useEclatEchec } from '@/app/components/EclatEchec'
import { ACTION_COMMENTAIRE } from '@/app/lib/styleCommentaire'

export default function BoutonSupprimerCommentaire({ libelle, titre, couleur, marge, onSupprimer }: {
  libelle: string
  titre: string
  couleur: string
  marge: string | number
  /** Rend `false` si la suppression a échoué. */
  onSupprimer: () => Promise<boolean>
}) {
  const { echec, signaler } = useEclatEchec()
  const [enCours, setEnCours] = useState(false)
  return (
    <button disabled={enCours} className={avecHoteEclat()}
      onClick={async () => {
        setEnCours(true)
        const ok = await onSupprimer().catch(() => false)
        setEnCours(false)
        if (!ok) signaler('La suppression a échoué.')
      }}
      title={echec ? 'La suppression a échoué\u00A0: réessayer' : titre}
      style={{ ...ACTION_COMMENTAIRE, color: echec ? 'var(--cs-danger)' : couleur, marginLeft: marge, ...(echec ? STYLE_HOTE_ECHEC : null) }}>
      {enCours ? '…' : echec ? 'Échec\u00A0: réessayer' : libelle}
      <EclatEchec echec={echec} />
    </button>
  )
}
