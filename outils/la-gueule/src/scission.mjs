// SCISSION d'une ligne qui mêle CORPS et MARGE.
//
// Quand la manchette est trop proche de la justification, la reconnaissance la fond dans la ligne
// de corps : « Solennisons donc ceste feste, non com-Solemi¬ » — où « Solemi¬ » appartient à la
// glose, pas à la phrase. Le modèle, voyant la page, retranchait le fragment ; la phrase était
// juste, mais la note DISPARAISSAIT.
//
// Règle éditoriale (utilisateur, 2026-08-10) : **la ligne d'une note doit être entière**. On ne
// tronque donc pas : on SCINDE en deux lignes — le corps d'un côté, la note de l'autre, complète
// et classée `note_marginale`. Rien n'est perdu, et la note garde son intégrité de ligne.
//
// Module PUR (aucune I/O), testé.

/** Distance d'édition bornée — sert à reconnaître un tronc « à peu près identique » au corps corrigé. */
export function distance(a = '', b = '') {
  a = String(a); b = String(b)
  if (a === b) return 0
  const n = a.length, m = b.length
  if (!n) return m
  if (!m) return n
  let prec = Array.from({ length: m + 1 }, (_, j) => j)
  for (let i = 1; i <= n; i++) {
    const cur = [i]
    for (let j = 1; j <= m; j++) {
      cur[j] = Math.min(prec[j] + 1, cur[j - 1] + 1, prec[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
    prec = cur
  }
  return prec[m]
}

// Un fragment de marge est BREF : une glose tient en un ou deux mots sur la largeur d'une marge.
// Au-delà, ce n'est plus une manchette fondue mais du texte, et on ne touche à rien.
const MAX_FRAGMENT = 24

/**
 * Le modèle a-t-il RETRANCHÉ une fin de ligne ? Si oui, le morceau retiré est presque toujours la
 * manchette fondue dans le corps. On le retrouve en cherchant quel suffixe de l'original, une fois
 * ôté, laisse un tronc quasi identique au texte proposé (le corps, lui, a pu être corrigé au
 * passage : « chacouillons » → « chatouillons »).
 * Renvoie { corps, marge } ou null si ce n'est pas une amputation de fin.
 */
export function detecterScission(avant, apres, { maxFragment = MAX_FRAGMENT } = {}) {
  const a = String(avant ?? ''), b = String(apres ?? '')
  if (!a || !b) return null
  const ecart = a.length - b.length
  if (ecart < 2 || ecart > maxFragment + 6) return null   // ni retrait, ni retrait plausible
  // On cherche autour de l'écart de longueur : le corps a pu gagner ou perdre un caractère.
  let meilleur = null
  for (let k = Math.max(1, ecart - 4); k <= Math.min(a.length - 1, ecart + 4); k++) {
    const tronc = a.slice(0, a.length - k)
    const d = distance(tronc.trim(), b.trim())
    // Tolérance proportionnée : le corps n'a subi que des corrections de lettres, pas une réécriture.
    const seuil = Math.max(2, Math.round(b.length * 0.12))
    if (d <= seuil && (!meilleur || d < meilleur.d)) meilleur = { k, d }
  }
  if (!meilleur) return null
  const marge = a.slice(a.length - meilleur.k).trim()
  if (!marge || marge.length > maxFragment) return null
  if (!/\p{L}/u.test(marge)) return null                  // que de la ponctuation : ce n'est pas une note
  return { corps: b.trim(), marge, distance: meilleur.d }
}

/**
 * Applique la scission dans le projet : la ligne de corps garde le texte du corps, et la note
 * devient une LIGNE ENTIÈRE à sa suite, marquée `note_marginale`.
 * La nouvelle ligne n'a ni `bbox` ni `ocr0` propres (elle est issue d'une ligne existante) : elle
 * est donc écartée du ground-truth, mais son texte est conservé. `ocr0` de la ligne d'origine
 * reste INTACT — la trace de ce que la machine a lu n'est jamais réécrite.
 */
export function appliquerScission(projet, page, index, { corps, marge, origine = 'ia', modele = null, date = null } = {}) {
  const lignes = projet?.pages?.[page]?.lignes
  if (!Array.isArray(lignes) || !lignes[index]) return { ok: false, erreur: 'ligne introuvable' }
  const l = lignes[index]
  const avant = String(l.dip ?? l.texte ?? '')
  if (!corps || !marge) return { ok: false, erreur: 'scission incomplète' }
  if (avant === corps && lignes[index + 1]?.scinde_de === index) return { ok: true, statut: 'deja_applique' }
  if (l.ocr0 == null) l.ocr0 = avant
  if (!Array.isArray(l.corrections)) l.corrections = []
  l.corrections.push({
    type: 'scission_marge', avant, apres: corps, origine, modele, regle: 'scission_marge',
    statut: 'applique_candidate', validation_humaine: false, annulee: false, date, fragment: marge,
  })
  l.dip = corps
  lignes.splice(index + 1, 0, {
    bbox: null, ocr0: '', dip: marge, texte: marge,
    scinde_de: index,                       // trace : d'où vient cette ligne
    ajout_humain: false, origine_ajout: origine,
    suggestion: { role_suggere: 'note_marginale', role_confirme: null, statut: 'suggere', regle: 'scission_marge', export_corps: false, preuves: { issue_de_la_ligne: index } },
  })
  return { ok: true, statut: 'applique_candidate', corps, marge }
}
