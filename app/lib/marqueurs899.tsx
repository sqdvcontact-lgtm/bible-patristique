import type { ReactNode } from 'react'

// Rendu des marqueurs éditoriaux INLINE portés par le texte recomposé de TR0009
// (Bible 899) : « lecture incertaine », « lacune », « ajout marginal ». Ce sont des
// faits du témoin, à conserver comme signal éditorial, mais SANS surcharger la lecture :
// le texte reste lisible ; le marqueur ne fait qu'un discret rappel visuel + infobulle.
// Les statuts techniques d'alignement (MATCH/OFFSET/review…) ne passent JAMAIS par ici.
//
// ⚠️ Les marqueurs peuvent être à CHEVAL sur plusieurs versets : la recomposition
// canonique découpe le texte par créneau, si bien qu'un « [lecture incertaine : … »
// peut s'ouvrir dans un verset et se fermer (« …] ») dans le suivant. Ce module se lit
// donc verset par verset avec un petit automate tolérant aux marqueurs non fermés ou
// non ouverts — jamais de crochet brut laissé à l'écran.

const STYLE_INCERTAINE: React.CSSProperties = {
  color: 'var(--cs-texte-second)',
  borderBottom: '1px dotted var(--cs-texte-faible)',
}
const STYLE_LACUNE: React.CSSProperties = {
  color: 'var(--cs-texte-doux)',
  fontStyle: 'italic',
}

// Un token = soit une ouverture « [<type> : », soit une fermeture « ] ».
const RE_TOKEN = /\[(lecture incertaine|lacune|ajout marginal)\s*:\s*|\]/gu
const RE_OUVERTURE = /\[(?:lecture incertaine|lacune|ajout marginal)\s*:/u

type Mode = 'normal' | 'incertaine' | 'ajout' | 'lacune'

function infobulle(mode: Mode): string {
  if (mode === 'ajout') return 'Ajout marginal du manuscrit'
  return 'Lecture incertaine (transcription du manuscrit)'
}

/**
 * Transforme le texte recomposé (couche du manuscrit) en nœuds React où les marqueurs
 * éditoriaux inline sont rendus discrètement. Le texte hors marqueur reste littéral.
 * Tolère les marqueurs à cheval : un verset qui commence par une fermeture « … ] » est
 * réputé prolonger une lecture incertaine ouverte au verset précédent.
 */
export function rendreMarqueurs899(texte: string): ReactNode {
  if (!texte) return texte

  // Le verset commence-t-il À L'INTÉRIEUR d'une portée ouverte au verset précédent ?
  // Signe : une fermeture « ] » apparaît avant toute ouverture « [type : ».
  const posOuverture = texte.search(RE_OUVERTURE)
  const posFermeture = texte.indexOf(']')
  let mode: Mode =
    posFermeture !== -1 && (posOuverture === -1 || posFermeture < posOuverture) ? 'incertaine' : 'normal'

  const noeuds: ReactNode[] = []
  let cle = 0
  let dernier = 0

  const pousser = (txt: string, m: Mode) => {
    if (!txt) return
    if (m === 'normal') noeuds.push(txt)
    else if (m === 'lacune') return // contenu d'une lacune = un motif, pas du texte lisible : masqué
    else noeuds.push(
      <span key={`m${cle++}`} title={infobulle(m)} style={STYLE_INCERTAINE}>{txt}</span>,
    )
  }

  RE_TOKEN.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = RE_TOKEN.exec(texte)) !== null) {
    pousser(texte.slice(dernier, m.index), mode)
    if (m[0] === ']') {
      mode = 'normal'
    } else if (m[1] === 'lacune') {
      noeuds.push(
        <span key={`m${cle++}`} title="Lacune matérielle du manuscrit" style={STYLE_LACUNE}>[lacune]</span>,
      )
      mode = 'lacune'
    } else {
      mode = m[1] === 'ajout marginal' ? 'ajout' : 'incertaine'
    }
    dernier = m.index + m[0].length
  }
  pousser(texte.slice(dernier), mode)

  if (noeuds.length === 0) return texte
  if (noeuds.length === 1 && typeof noeuds[0] === 'string') return noeuds[0]
  return noeuds
}
