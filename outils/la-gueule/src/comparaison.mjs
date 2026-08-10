// Extraction de CONTRÔLE — OCR IA vs OCR mécanique.
//
// But (retour utilisateur 2026-08-10) : donner à GPT — qui fixe les règles éditoriales —
// de quoi juger, ligne à ligne et SANS ouvrir l'atelier, ce que le contrôle IA a changé
// par rapport à la lecture machine. Deux couches de la ligne suffisent :
//   - `ocr0` = ce que la MACHINE a lu (immuable, charte §14) → colonne « méca » ;
//   - `dip`  = l'état candidat COURANT, après le contrôle IA (et l'humain) → colonne « IA ».
// La différence (méca ≠ IA) est exactement le geste de l'IA à contrôler.
//
// Module PUR : aucune I/O, aucun réseau, aucune dépendance, pas de Date.now() (l'appelant
// passe l'horodatage). Testé dans test/comparaison.test.mjs.

const S_LONG = 'ſ' // U+017F — le « s long » de l'imprimé d'Ancien Régime.
const ANCIENS = [S_LONG, 'ﬅ', 'ﬆ'] // ſ, ﬅ (long s+t), ﬆ (s+t)

/**
 * Caractères typographiques anciens que l'IA a INTRODUITS (présents dans `apres`, en plus
 * nombreux que dans `avant`). Sert à repérer l'archaïsation « s → ſ » que l'utilisateur
 * refuse pour l'imprimé non médiéval (moderniser les caractères, pas l'orthographe).
 */
export function caracteresAnciensIntroduits(avant, apres) {
  const cpt = (s, c) => [...String(s ?? '')].filter((x) => x === c).length
  return ANCIENS.filter((c) => cpt(apres, c) > cpt(avant, c))
}

// Dernière correction de TEXTE encore active (non annulée) d'une ligne, ou null.
function derniereCorrectionTexte(ligne) {
  const cs = Array.isArray(ligne?.corrections) ? ligne.corrections : []
  for (let k = cs.length - 1; k >= 0; k--) {
    const c = cs[k]
    if (!c?.annulee && (c?.type === 'correction_ocr' || c?.type == null)) return c
  }
  return null
}
// Dernier reclassement de rôle encore actif, ou null.
function reclassementActif(ligne) {
  const cs = Array.isArray(ligne?.corrections) ? ligne.corrections : []
  for (let k = cs.length - 1; k >= 0; k--) {
    const c = cs[k]
    if (!c?.annulee && c?.type === 'reclassement_role') return c
  }
  return null
}

/**
 * Réduit une ligne à sa comparaison méca/IA. Renvoie null s'il n'y a RIEN à signaler
 * (texte identique et pas de reclassement hors-corps) — l'extraction ne montre que les
 * gestes de l'IA/humain, jamais les lignes inchangées.
 */
export function comparerLigne(ligne, i) {
  const meca = String(ligne?.ocr0 ?? ligne?.dip ?? ligne?.texte ?? '')
  const ia = String(ligne?.dip ?? ligne?.texte ?? ligne?.ocr0 ?? '')
  const reclas = reclassementActif(ligne)
  const roleConfirme = ligne?.suggestion?.role_confirme ?? null
  const horsCorps = ligne?.suggestion?.export_corps === false
  const modifieTexte = meca !== ia
  if (!modifieTexte && !reclas && !horsCorps) return null
  const corr = modifieTexte ? derniereCorrectionTexte(ligne) : null
  return {
    i,
    meca,
    ia,
    modifieTexte,
    confiance: ligne?.confiance ?? null,
    origine: corr?.origine ?? reclas?.origine ?? null, // 'ia' | 'humain' | 'deterministe'
    modele: corr?.modele ?? reclas?.modele ?? null,
    statut: corr?.statut ?? reclas?.statut ?? null,
    validationHumaine: !!(corr?.validation_humaine ?? reclas?.validation_humaine),
    certitude: corr?.certitude ?? null, // 'certaine' | 'incertaine' | null (si conservée)
    regle: corr?.regle ?? reclas?.regle ?? null,
    reclasseVers: reclas ? (reclas.role_apres ?? roleConfirme) : (horsCorps ? roleConfirme : null),
    horsCorps,
    caracteresAnciens: modifieTexte ? caracteresAnciensIntroduits(meca, ia) : [],
  }
}

/**
 * Parcourt le projet et produit une analyse structurée : un résumé chiffré + les pages
 * portant au moins une différence, chacune avec ses lignes comparées.
 */
export function analyserComparaison(projet, { seuilConfiance = 0.8 } = {}) {
  const pages = []
  const resume = {
    pages: 0, lignes: 0, modifiees: 0, auto: 0, validees: 0,
    avec_s_long: 0, reclassements: 0, confiance_faible: 0,
  }
  const nums = Object.keys(projet?.pages || {}).map(Number).sort((a, b) => a - b)
  for (const n of nums) {
    const lignes = projet.pages[n]?.lignes
    if (!Array.isArray(lignes)) continue // entrée non océrisée (vignette) : ignorée
    resume.pages++
    const items = []
    lignes.forEach((l, i) => {
      resume.lignes++
      if (l?.confiance != null && l.confiance < seuilConfiance) resume.confiance_faible++
      const c = comparerLigne(l, i)
      if (!c) return
      if (c.modifieTexte) {
        resume.modifiees++
        if (c.validationHumaine) resume.validees++
        else resume.auto++
        if (c.caracteresAnciens.length) resume.avec_s_long++
      }
      if (c.reclasseVers) resume.reclassements++
      items.push(c)
    })
    if (items.length) pages.push({ page: n, lignes: items })
  }
  return { resume, pages }
}

const nb = (x) => (x == null ? '—' : (Math.round(x * 100) / 100).toString().replace('.', ','))

function etiquette(c) {
  const t = []
  if (c.origine) t.push(c.origine === 'ia' ? 'IA' + (c.modele ? ' (' + c.modele + ')' : '') : c.origine)
  if (c.certitude) t.push('certitude : ' + c.certitude)
  if (c.confiance != null) t.push('conf ' + nb(c.confiance))
  if (c.validationHumaine) t.push('✓ humain')
  else if (c.modifieTexte) t.push('auto/candidate')
  if (c.caracteresAnciens.length) t.push('⚠ſ')
  return t.join(' · ')
}

/**
 * Rendu Markdown lisible par GPT : synthèse en tête, puis, page par page, les seules
 * lignes où l'IA (dip) diffère de la machine (ocr0), avec l'origine et un repère « ⚠ſ »
 * quand l'IA a introduit un « s long ».
 */
export function comparaisonMarkdown(projet, { nom = 'projet', date = null, seuilConfiance = 0.8 } = {}) {
  const { resume, pages } = analyserComparaison(projet, { seuilConfiance })
  const meta = projet?.meta || {}
  const out = []
  out.push('# Contrôle OCR — IA vs mécanique — ' + nom)
  const entete = [meta.titre, meta.auteur, meta.date_publication].filter(Boolean).join(' · ')
  if (entete) out.push('', entete)
  out.push('', 'Brouillon **CANDIDAT** (charte §14)' + (date ? ' — généré le ' + date : '') + '.')
  out.push('')
  out.push('**Légende** — méca : lecture machine (`ocr0`, immuable). IA : candidat après contrôle (`dip`). ⚠ſ : l’IA a introduit un « s long » (ſ) absent de la lecture machine.')
  out.push('')
  out.push('## Synthèse')
  out.push('- Pages océrisées : ' + resume.pages + ' — lignes : ' + resume.lignes)
  out.push('- Lignes modifiées (méca ≠ IA) : ' + resume.modifiees + ' (auto/candidate : ' + resume.auto + ', validées humain : ' + resume.validees + ')')
  out.push('- dont l’IA introduit un « ſ » : **' + resume.avec_s_long + '** — à moderniser sauf texte médiéval')
  out.push('- Reclassements hors-corps (ornement/titre courant/…) : ' + resume.reclassements)
  out.push('- Lignes de faible confiance (< ' + nb(seuilConfiance) + ') : ' + resume.confiance_faible)
  out.push('')
  if (!pages.length) {
    out.push('_Aucune différence entre l’OCR IA et l’OCR mécanique sur ce lot._', '')
    return out.join('\n')
  }
  for (const pg of pages) {
    out.push('## p.' + pg.page)
    for (const c of pg.lignes) {
      const et = etiquette(c)
      if (c.reclasseVers && !c.modifieTexte) {
        out.push('- L' + c.i + ' · reclassement → **' + c.reclasseVers + '** (hors-corps)' + (et ? ' · ' + et : ''))
        out.push('  - méca : ' + (c.meca || '∅'))
        out.push('  - IA   : _écartée du corps_')
      } else {
        out.push('- L' + c.i + (et ? ' · ' + et : '') + (c.reclasseVers ? ' · → **' + c.reclasseVers + '**' : ''))
        out.push('  - méca : ' + (c.meca || '∅'))
        out.push('  - IA   : ' + (c.ia || '∅'))
      }
    }
    out.push('')
  }
  return out.join('\n')
}
