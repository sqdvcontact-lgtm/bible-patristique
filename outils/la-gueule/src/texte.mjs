// Rendu d'un projet relu en texte lisible : TXT brut et Markdown. Comme le DOCX,
// on honore la structure éditoriale ref_niv1..5 (un titre n'est émis que lorsque
// sa valeur CHANGE) et on rassemble les notes en fin de document. Pur (testable).

/** Parcourt les segments en émettant les titres de niveau au bon endroit.
 *  `surTitre(niveau, texte)` et `surSegment(seg)` sont appelés dans l'ordre du corps. */
function parcourir(segments, surTitre, surSegment) {
  const dernier = [null, null, null, null, null]
  for (const s of segments) {
    for (let k = 1; k <= 5; k++) {
      const t = s[`ref_niv${k}_texte`]
      if (t && t !== dernier[k - 1]) {
        surTitre(k, t)
        dernier[k - 1] = t
        for (let j = k; j < 5; j++) dernier[j] = null // un titre supérieur réinitialise les sous-niveaux
      }
    }
    surSegment(s)
  }
}

/** Collecte les blocs de notes des segments (chaînes « [[n]] … »), dans l'ordre. */
function collecterNotes(segments) {
  const notes = []
  for (const s of segments) if (s.notes) for (const l of String(s.notes).split('\n')) if (l.trim()) notes.push(l.trim())
  return notes
}

/** Rendu TXT brut : titres soulignés (= puis -), paragraphes séparés par une ligne vide. */
export function construireTexte({ meta = {}, segments = [] } = {}) {
  const out = []
  if (meta.titre) out.push(meta.titre)
  if (meta.auteur) out.push(meta.auteur)
  if (meta.sous_titre) out.push(meta.sous_titre)
  if (meta.trad_auteur) out.push('Traduction : ' + meta.trad_auteur)
  if (out.length) out.push('')

  parcourir(
    segments,
    (niveau, texte) => {
      out.push('')
      out.push(texte)
      if (niveau === 1) out.push('='.repeat(Math.max(3, [...texte].length)))
      else if (niveau === 2) out.push('-'.repeat(Math.max(3, [...texte].length)))
      out.push('')
    },
    (s) => {
      if (s.segment_texte) { out.push(s.segment_texte); out.push('') }
      if (s.texte_original) { for (const l of String(s.texte_original).split('\n')) out.push('    ' + l); out.push('') }
    },
  )

  const notes = collecterNotes(segments)
  if (notes.length) {
    out.push('')
    out.push('Notes')
    out.push('-----')
    for (const n of notes) out.push(n)
    out.push('')
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trimStart() + '\n'
}

/** Rendu Markdown : # = titre de l'œuvre, ## … ###### = ref_niv1..5, > = texte original. */
export function construireMarkdown({ meta = {}, segments = [] } = {}) {
  const out = []
  if (meta.titre) out.push('# ' + meta.titre)
  const chapeau = []
  if (meta.auteur) chapeau.push('**' + meta.auteur + '**')
  if (meta.sous_titre) chapeau.push('*' + meta.sous_titre + '*')
  if (meta.trad_auteur) chapeau.push('*Traduction : ' + meta.trad_auteur + '*')
  if (chapeau.length) { out.push(''); out.push(chapeau.join('  \n')) }
  out.push('')

  parcourir(
    segments,
    (niveau, texte) => {
      out.push('')
      out.push('#'.repeat(Math.min(6, niveau + 1)) + ' ' + texte) // niv1 → ##, … niv5 → ######
      out.push('')
    },
    (s) => {
      if (s.segment_texte) { out.push(s.segment_texte); out.push('') }
      if (s.texte_original) { out.push('> ' + String(s.texte_original).split('\n').join('\n> ')); out.push('') }
    },
  )

  const notes = collecterNotes(segments)
  if (notes.length) {
    out.push('---')
    out.push('')
    out.push('#### Notes')
    out.push('')
    for (const n of notes) out.push('- ' + n)
    out.push('')
  }
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trimStart() + '\n'
}
