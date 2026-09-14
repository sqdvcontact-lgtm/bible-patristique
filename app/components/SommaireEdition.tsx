'use client'

// ── Le SOMMAIRE d'une édition biblique commentée ───────────────────────────────
//
// Les pièces liminaires d'une édition savante — page de titre, imprimatur,
// dédicace, avant-propos, tableau de transcription, abréviations, introduction
// générale, introduction du Testament et du groupe de livres — rangées sous la
// portée qu'elles coiffent. Il vit dans le volet de lecture de la Bible, sous
// l'onglet « Sommaire » (`NavLivres`).
//
// ⛔ SES ENTRÉES SE COMPOSENT COMME LES LIVRES DE L'ONGLET VOISIN (décision de
// l'auteur, 14 septembre 2026 : « pour le sommaire de l'apparat critique, utilise
// exactement la même police que le sommaire utilisé pour “Genèse”, “Matthieu”, etc. »).
// Le 28 août, elles avaient pris la composition du sommaire d'une ŒUVRE, à onze pixels
// et demi, quand les livres de l'onglet « Livres » en font treize et demi : deux listes
// d'un même volet, à un clic l'une de l'autre, ne se ressemblaient pas. La typographie
// de l'entrée vit dans `styleEntreeListeVolet` (`stylesVoletLecture.ts`), et les deux
// listes la lisent : elle ne peut plus diverger.
// ⚠️ L'entrée ouverte prend la pastille du livre qu'on lit, et l'entrée déborde son bloc
// de six pixels de chaque côté, comme une rangée de livre : sans cela son texte
// paraîtrait rentré par rapport à la portée qui la coiffe.
//
// ⚠️ Les rangs s'apparient par la FONCTION, non par la profondeur : la pièce est
// ce qu'on ouvre ; la portée ne s'ouvre pas, elle coiffe, et prend le rang des
// rubriques du volet (« Apparat critique », « Sommaire »), en petit, espacé et pâle.
// Le premier essai les avait pris pour un niveau 1 et un niveau 2 : les pièces,
// seul contenu de l'onglet, s'y lisaient comme des sous-entrées.
//
// ⛔ Pas de capitales sur la portée : la barre d'onglets qui la surmonte a
// perdu les siennes le même jour, et un volet de lecture n'a rien à crier.
//
// ⚠️ Composant à part, et non un fragment de `NavLivres` : il ne connaît ni la
// navigation ni l'adresse d'une pièce, si bien qu'une planche de contrôle peut
// le rendre hors session.

import { Fragment } from 'react'
import { styleEntreeListeVolet } from '@/app/lib/stylesVoletLecture'
import { COMPOSITION_INTITULE } from '@/app/lib/titres'

/** Une entrée du sommaire, telle que le volet la montre. */
export type PieceSommaireBible = {
  cle: string
  titre: string
  /** « Bible », « Ancien Testament », « Pentateuque » : ce que la pièce coiffe. */
  portee: string | null
  scopeKind: string
}

export default function SommaireEdition({ pieces, pieceActive, onOuvrir }: {
  pieces: readonly PieceSommaireBible[]
  pieceActive: string | null
  onOuvrir: (cle: string) => void
}) {
  return (
    <div style={{ overflowY: 'auto', flex: 1, minHeight: 0, padding: '6px 10px 20px' }}>
      {pieces.map((piece, rang) => {
        const actif = piece.cle === pieceActive
        const nouvellePortee = piece.portee && piece.portee !== pieces[rang - 1]?.portee
        return (
          <Fragment key={piece.cle}>
            {/* La portée coiffe ses pièces au lieu de se répéter sur chaque
                ligne : « Bible », puis « Ancien Testament », puis « Pentateuque ». */}
            {nouvellePortee && (
              <div style={{
                padding: rang === 0 ? '2px 0 4px' : '13px 0 4px', fontSize: '0.5625rem',
                fontWeight: 600, letterSpacing: '0.09em', color: 'var(--cs-texte-faible)',
              }}>
                {piece.portee}
              </div>
            )}
            <button type="button" aria-current={actif ? 'page' : undefined}
              onClick={() => onOuvrir(piece.cle)}
              style={{
                ...styleEntreeListeVolet({ actif }),
                display: 'block', width: 'calc(100% + 12px)', margin: '0 -6px', boxSizing: 'border-box',
                textAlign: 'left', border: 'none', cursor: actif ? 'default' : 'pointer',
                ...COMPOSITION_INTITULE,
              }}>
              {piece.titre}
            </button>
          </Fragment>
        )
      })}
    </div>
  )
}
