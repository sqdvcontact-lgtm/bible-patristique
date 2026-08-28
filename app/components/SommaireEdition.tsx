'use client'

// ── Le SOMMAIRE d'une édition biblique commentée ───────────────────────────────
//
// Les pièces liminaires d'une édition savante — page de titre, imprimatur,
// dédicace, avant-propos, tableau de transcription, abréviations, introduction
// générale, introduction du Testament et du groupe de livres — rangées sous la
// portée qu'elles coiffent. Il vit dans le volet de lecture de la Bible, sous
// l'onglet « Sommaire » (`NavLivres`).
//
// ⛔ Sa mise en forme est celle du SOMMAIRE D'UNE ŒUVRE (`OeuvreClient`),
// décision de l'auteur : c'est le même objet, la table des matières d'un livre,
// et il n'avait pas à se présenter de deux façons. Le sérif sur pastille verte
// qu'il portait était emprunté à la liste des LIVRES, laquelle n'est pas une
// table des matières mais un index.
//
// ⚠️ Les rangs s'apparient par la FONCTION, non par la profondeur : la pièce est
// ce qu'on ouvre, elle prend donc le rang du NIVEAU 1 du sommaire d'une œuvre
// (le corps ordinaire, vert et demi-gras quand il est ouvert) ; la portée ne
// s'ouvre pas, elle coiffe, et prend le rang des rubriques du volet (« Apparat
// critique », « Sommaire »), en petit, espacé et pâle. Le premier essai les
// avait pris pour un niveau 1 et un niveau 2 : les pièces, seul contenu de
// l'onglet, s'y lisaient comme des sous-entrées.
//
// ⛔ Pas de capitales sur la portée : la barre d'onglets qui la surmonte a
// perdu les siennes le même jour, et un volet de lecture n'a rien à crier.
//
// ⚠️ Composant à part, et non un fragment de `NavLivres` : il ne connaît ni la
// navigation ni l'adresse d'une pièce, si bien qu'une planche de contrôle peut
// le rendre hors session.

import { Fragment } from 'react'
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
                display: 'block', width: '100%', textAlign: 'left', background: 'none',
                border: 'none', cursor: actif ? 'default' : 'pointer', padding: '3px 0',
                fontSize: '0.71875rem', lineHeight: 1.35, fontWeight: actif ? 600 : 400,
                color: actif ? 'var(--cs-vert)' : 'var(--cs-texte)',
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
