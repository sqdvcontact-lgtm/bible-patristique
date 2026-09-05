'use client'
// Le bandeau qui dit au lecteur ce que la page n’a pas pu charger.
//
// Une couche SECONDAIRE qui manque (notes, renvois bibliques, versets cités, original
// en regard) ne ferme plus la page : le texte se lit, et ce bandeau nomme ce qui
// manque, sous le frontispice, avec de quoi recharger. ⛔ Il n’est pas décoratif :
// c’est lui qui fait qu’une page servie incomplète ne se donne pas pour complète
// (charte § 18, `app/lib/chargementTolerant.ts`). L’administrateur y lit en plus le
// détail technique de chaque manque.
//
// ⚠️ Aucune couleur en dur, aucun corps hors de l’échelle : les rangs sont ceux de
// `app/error.tsx`, l’encre est `--cs-attente` (un état de file, ni danger ni or).

import type { DegradationChargement } from '@/app/lib/chargementTolerant'

const AUCUNE: DegradationChargement[] = []

/** « a », « a et b », « a, b et c ». */
function enumerer(elements: string[]): string {
  if (elements.length <= 1) return elements[0] ?? ''
  return `${elements.slice(0, -1).join(', ')} et ${elements[elements.length - 1]}`
}

export default function BandeauDegradations({
  degradations = AUCUNE,
  estAdmin,
}: {
  degradations?: DegradationChargement[]
  estAdmin: boolean
}) {
  const publiques = [...new Set(degradations.filter(d => d.publique).map(d => d.quoi))]
  const details = estAdmin ? degradations : []
  if (publiques.length === 0 && details.length === 0) return null

  return (
    <aside
      role="status"
      aria-live="polite"
      style={{
        margin: '0 0 1.5rem',
        padding: '0.75rem 1rem',
        borderTop: '1px solid var(--cs-bord)',
        borderBottom: '1px solid var(--cs-bord)',
        textAlign: 'center',
        fontFamily: 'var(--font-source-serif), Georgia, serif',
        fontSize: '0.8125rem',
        fontStyle: 'italic',
        lineHeight: 1.6,
        color: 'var(--cs-attente)',
      }}
    >
      <p style={{ margin: 0 }}>
        {publiques.length > 0
          ? `Cette page s’est ouverte sans ${enumerer(publiques)}. Le texte se lit tel quel. Vous pouvez recharger la page pour retrouver ce qui manque.`
          : 'Une partie de cette page s’est chargée en mode dégradé, sans conséquence pour la lecture.'}
      </p>
      <div style={{ marginTop: '0.6rem' }}>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            padding: '5px 14px',
            borderRadius: '999px',
            border: '1px solid rgba(var(--cs-vert-rgb),0.35)',
            background: 'rgba(var(--cs-vert-rgb),0.06)',
            color: 'var(--cs-vert)',
            cursor: 'pointer',
            fontFamily: 'var(--font-source-serif), Georgia, serif',
            fontStyle: 'normal',
            fontSize: '0.8125rem',
          }}
        >
          Recharger la page
        </button>
      </div>
      {details.length > 0 && (
        <ul
          aria-label="Détail des couches manquantes, pour l’administration"
          style={{
            listStyle: 'none',
            margin: '0.75rem 0 0',
            padding: 0,
            textAlign: 'left',
            fontFamily: 'inherit',
            fontStyle: 'normal',
            fontSize: '0.6875rem',
            lineHeight: 1.5,
            color: 'var(--cs-texte-second)',
          }}
        >
          {details.map((d, i) => (
            <li key={i}>
              <strong>{d.quoi}</strong>
              {' : '}
              {d.detail}
            </li>
          ))}
        </ul>
      )}
    </aside>
  )
}
