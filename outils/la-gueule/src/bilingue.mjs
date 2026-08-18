// Structuration bilingue latin / français. Cœur indépendant de la mise en page :
//   - détecter la langue d'un bloc (robuste : le latin n'a pas d'accents français et a des
//     désinences -us/-um/-æ ; le français a les accents et ses mots-outils) ;
//   - apparier les paragraphes des deux langues (par l'ordre, calé sur les numéros de section).
// Résultat : des PAIRES {paragraphe, fr, la} → deux colonnes alignées, comme sur le site.

/** 'fr' ou 'la' pour un texte. Heuristique, mais très fiable sur une page entière. */
export function detecterLangue(texte) {
  const t = (texte || '').toLowerCase()
  const accents = (t.match(/[éèêàâçùûîïô]/g) || []).length            // accents FRANÇAIS (pas æ/œ)
  const motsFr = (t.match(/\b(le|la|les|des|une?|du|dans|pour|vous|votre|nous|est|qui|que|qu|aux?|par|sur|se|ne|pas|plus|cette|leur|ses|ont)\b/g) || []).length
  const desinLa = (t.match(/\w+(us|um|is|ae|æ|orum|arum|ibus|tur|mus|runt|ntur)\b/g) || []).length
  const motsLa = (t.match(/\b(et|est|non|quod|cum|per|ad|ex|nec|sed|autem|enim|ipse|atque|vel|nam|ut|in)\b/g) || []).length
  const scoreFr = accents * 2 + motsFr
  const scoreLa = desinLa + motsLa
  return scoreFr >= scoreLa ? 'fr' : 'la'
}

/** Numéro de section en tête de paragraphe : « 5° », « V. », « 12. », « 3) ». */
export function numeroSection(texte) {
  const m = /^\s*(\d{1,3})\s*[°.)]/.exec(texte || '')
  return m ? Number(m[1]) : null
}

/** Appariement par l'ordre (repli) : rangée i ↔ rangée i, n° de section pour information. */
function apparierParOrdre(parasLa, parasFr) {
  const n = Math.max(parasLa.length, parasFr.length)
  const paires = []
  for (let i = 0; i < n; i++) {
    const fr = parasFr[i] || ''
    const la = parasLa[i] || ''
    paires.push({ paragraphe: numeroSection(fr) ?? numeroSection(la) ?? null, fr, la })
  }
  return paires
}

/**
 * Regroupe une colonne en SECTIONS numérotées : un paragraphe sans n° est une CONTINUATION
 * de la section courante (les paras d'avant le 1er numéro sont rattachés à la 1re section).
 * Renvoie Map<numéro, texte concaténé>.
 */
function grouperSections(paras, nums) {
  const parSec = new Map()
  let courant = null
  let enAttente = []
  for (let k = 0; k < paras.length; k++) {
    if (nums[k] != null) courant = nums[k]
    if (courant == null) { enAttente.push(paras[k]); continue } // avant tout numéro
    if (!parSec.has(courant)) parSec.set(courant, [])
    if (enAttente.length) { parSec.get(courant).push(...enAttente); enAttente = [] }
    parSec.get(courant).push(paras[k])
  }
  const out = new Map()
  for (const [num, arr] of parSec) out.set(num, arr.join(' ').replace(/\s+/g, ' ').trim())
  return out
}

/**
 * Apparie les paragraphes latins et français. Si les DEUX colonnes portent des numéros de
 * section (≥ 2 de chaque), on APPARIE PAR NUMÉRO (robuste : un paragraphe coupé ou manquant
 * d'un côté ne décale pas tout le reste) ; sinon on retombe sur l'appariement par l'ordre.
 * Le numéro de section alimente `paragraphe`, comme sur le site.
 */
export function apparierParagraphes(parasLa, parasFr) {
  const numLa = parasLa.map(numeroSection)
  const numFr = parasFr.map(numeroSection)
  const ancrable = numLa.filter((v) => v != null).length >= 2 && numFr.filter((v) => v != null).length >= 2
  if (!ancrable) return apparierParOrdre(parasLa, parasFr)

  const secLa = grouperSections(parasLa, numLa)
  const secFr = grouperSections(parasFr, numFr)
  const numeros = [...new Set([...secLa.keys(), ...secFr.keys()])].sort((a, b) => a - b)
  return numeros.map((n) => ({ paragraphe: n, fr: secFr.get(n) || '', la: secLa.get(n) || '' }))
}
