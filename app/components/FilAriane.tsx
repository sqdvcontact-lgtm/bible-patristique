/**
 * LE FIL D'ARIANE VISIBLE (audit ergonomique, 2026-09-21).
 *
 * Il n'était déclaré qu'aux moteurs (`donneesFilAriane`, JSON-LD) : arrivé sur une
 * œuvre par la recherche ou par un passage des Pères, le lecteur ne savait ni où il
 * était dans la bibliothèque ni comment remonter à l'auteur. Une ligne discrète, avec
 * des liens réels, et les MÊMES éléments que ceux qu'on déclare aux moteurs.
 *
 * `retour` ajoute, au fer à droite, le chemin vers le verset d'où l'on vient
 * (`?depuis=`, voir `app/lib/retourLecture.ts`).
 *
 * ⛔ Aucun crochet : le composant se rend au serveur comme au navigateur.
 */

import Link from 'next/link'
import type { RetourLecture } from '@/app/lib/retourLecture'

export type ElementFilAriane = { nom: string; url: string }

const STYLE_LIGNE: React.CSSProperties = {
  display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between',
  gap: '0.25rem 1rem', margin: '0 auto', padding: '0.875rem 0 0',
  fontSize: '0.6875rem', lineHeight: 1.4, color: 'var(--cs-texte-second)',
}

const STYLE_LIEN: React.CSSProperties = { color: 'var(--cs-texte-second)' }

export default function FilAriane({ elements, retour = null, style }: {
  elements: readonly ElementFilAriane[]
  retour?: RetourLecture | null
  style?: React.CSSProperties
}) {
  if (elements.length === 0 && !retour) return null
  return (
    <div style={{ ...STYLE_LIGNE, ...style }}>
      {elements.length > 0 && (
        <nav aria-label="Fil d’Ariane" style={{ minWidth: 0 }}>
          <ol style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: '0 0.375rem', listStyle: 'none', margin: 0, padding: 0 }}>
            {elements.map((e, i) => {
              const dernier = i === elements.length - 1
              return (
                <li key={e.url} style={{ display: 'inline-flex', alignItems: 'baseline', gap: '0.375rem', minWidth: 0 }}>
                  {dernier
                    ? <span aria-current="page">{e.nom}</span>
                    : <Link href={e.url} className="cs-fiche-lien" style={STYLE_LIEN}>{e.nom}</Link>}
                  {!dernier && <span aria-hidden="true" style={{ opacity: 0.6 }}>›</span>}
                </li>
              )
            })}
          </ol>
        </nav>
      )}
      {retour && (
        <Link href={retour.href} className="cs-fiche-lien" style={{ ...STYLE_LIEN, whiteSpace: 'nowrap' }}>
          <span aria-hidden="true">← </span>{retour.libelle}
        </Link>
      )}
    </div>
  )
}
