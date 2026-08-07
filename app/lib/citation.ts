import { formaterDateHistorique } from './datesHistoriques'

// ── Mise en forme des citations (copier / coller, et affichage des prélèvements) ──
// Règles arrêtées par l'auteur, appliquées à UN seul endroit :
//  1. le titre de l'œuvre est en italiques (rendu HTML pour le collage riche) ;
//  2. en fin de citation, avant le guillemet fermant, toute ponctuation est remplacée
//     par un point, SAUF « ? » et « ! » ; en l'absence de ponctuation, un point est
//     ajouté ; si le dernier signe est une parenthèse ou un crochet fermant, on le
//     conserve et on ajoute un point après ;
//  3. les fourchettes de dates s'écrivent « 1984-1986 » (jamais « 1984 – 1986 ») ;
//  4. les guillemets français internes deviennent des guillemets anglais (la citation
//     est déjà encadrée par « … »).
//
// Regex écrites avec des échappements \u explicites : U+202F fine insécable,
// U+00A0 insécable, U+2010–U+2015 tirets typographiques, U+2212 signe moins,
// U+2026 points de suspension, U+00B7 point médian, U+201C/U+201D guillemets anglais.

// Guillemets français internes → guillemets anglais (courbes).
export function convertirGuillemetsInternes(texte: string): string {
  return texte
    .replace(/«[  \s]*/g, '“')
    .replace(/[  \s]*»/g, '”')
}

// « 1984 – 1986 » / « 1984 — 1986 » / « 1984 - 1986 » → « 1984-1986 ».
export function resserrerTiretsAnnees(s: string): string {
  return s.replace(/(\d)\s*[‐-―−-]\s*(\d)/g, '$1-$2')
}

// Ponctuation finale, juste avant le guillemet fermant (voir règle 2).
export function normaliserPonctuationFinale(texte: string): string {
  const t = texte.replace(/\s+$/, '')
  if (!t) return t
  const dernier = t[t.length - 1]
  if (dernier === '?' || dernier === '!') return t
  if (dernier === ')' || dernier === ']') return t + '.'
  // Ponctuation finale (une éventuelle suite) remplacée par un seul point.
  if (/[.,;:…·‐-―−]/.test(dernier)) {
    return t.replace(/[.,;:…·‐-―−\s]+$/, '') + '.'
  }
  // Lettre, guillemet fermant, chiffre… : pas de ponctuation à remplacer, on ajoute un point.
  return t + '.'
}

// Majuscule à l'initiale du premier mot si elle manque (une citation extraite en cours de
// phrase commence souvent par une minuscule). On saute les marques de tête (espaces,
// guillemets, parenthèses, balises d'enrichissement `<i>`…, astérisques de balisage) pour
// viser la première VRAIE lettre ; `\p{Ll}` ne matchant que les minuscules, une initiale
// déjà capitale (ou un chiffre) reste intacte.
export function capitaliserInitiale(texte: string): string {
  return texte.replace(
    /^((?:<\/?[a-zA-Z]+>|[\s«»“”‘’"'([*_+^—–-])*)(\p{Ll})/u,
    (_m, prefixe: string, lettre: string) => prefixe + lettre.toUpperCase(),
  )
}

// Texte cité prêt à être encadré : guillemets internes convertis, ponctuation finale
// normalisée, initiale capitalisée si elle manque.
export function preparerTexteCitation(texte: string): string {
  return capitaliserInitiale(normaliserPonctuationFinale(convertirGuillemetsInternes(texte.trim())))
}

function echapperHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export type InfoCitation = {
  auteur?: string | null
  titre?: string | null
  sousTitre?: string | null
  tradAuteur?: string | null
  editeur?: string | null
  collection?: string | null
  ville?: string | null
  datePublication?: string | null
}

export type CitationRendue = { texte: string; html: string }

// Citation d'un passage patristique, en DEUX formes : `texte` (plein-texte, presse-papiers)
// et `html` (titre en italique, pour un collage riche dans un traitement de texte).
export function citationPatristique(texte: string, info: InfoCitation): CitationRendue {
  const titreComplet = [info.titre?.trim(), info.sousTitre?.trim()].filter(Boolean).join('. ')

  const avant: string[] = []
  if (info.auteur?.trim()) avant.push(info.auteur.trim())

  const apres: string[] = []
  if (info.tradAuteur?.trim()) apres.push('trad. ' + info.tradAuteur.trim())
  if (info.editeur?.trim()) apres.push(info.editeur.trim())
  if (info.collection?.trim()) apres.push(info.collection.trim())
  if (info.ville?.trim()) apres.push(info.ville.trim())
  const date = resserrerTiretsAnnees(formaterDateHistorique(info.datePublication))
  if (date) apres.push(date)
  apres.push('disponible sur le site Corpus Scriptura')

  const cite = preparerTexteCitation(texte)

  const parties = [...avant, ...(titreComplet ? [titreComplet] : []), ...apres]
  const texteFinal = parties.join(', ') + ' : « ' + cite + ' »'

  const partiesHtml = [
    ...avant.map(echapperHtml),
    ...(titreComplet ? [`<em>${echapperHtml(titreComplet)}</em>`] : []),
    ...apres.map(echapperHtml),
  ]
  const html = partiesHtml.join(', ') + ' : « ' + echapperHtml(cite) + ' »'

  return { texte: texteFinal, html }
}

// Citation d'un passage biblique : « texte » (référence). Pas de titre ni de dates,
// mais mêmes règles de guillemets internes et de ponctuation finale.
export function citationBiblique(texte: string, reference: string): string {
  return '« ' + preparerTexteCitation(texte) + ' » (' + reference + ')'
}

// Écrit une citation dans le presse-papiers en conservant l'italique du titre
// (text/html), avec repli en plein-texte si l'API riche n'est pas disponible.
export async function copierCitation(res: CitationRendue | string): Promise<void> {
  const plain = typeof res === 'string' ? res : res.texte
  const html = typeof res === 'string' ? null : res.html
  try {
    if (html && typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([plain], { type: 'text/plain' }),
        }),
      ])
      return
    }
  } catch {
    // repli plein-texte ci-dessous
  }
  await navigator.clipboard.writeText(plain)
}
