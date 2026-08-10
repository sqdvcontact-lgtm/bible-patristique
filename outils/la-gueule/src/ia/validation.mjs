// Phase E — VALIDATION CIBLÉE (§11). L'utilisateur ne valide pas tout : on regroupe les corrections
// par FAMILLE, on échantillonne, on ne présente individuellement que les cas critiques et les
// blocages. Seuls `confirme_humain` / `modifie_humain` ouvrent le ground-truth (§11.7).

export const STATUTS = [
  'applique_deterministe', 'propose_ia', 'accepte_regle_validee', 'accepte_echantillonnage',
  'confirme_humain', 'modifie_humain', 'refuse', 'indetermine', 'bloquant', 'annule',
]

/** §11.7 — seuls une confirmation ou une modification HUMAINE ouvrent le ground-truth. */
export function admissibleGroundTruth(statut) {
  return statut === 'confirme_humain' || statut === 'modifie_humain'
}

const RANG_RISQUE = { R0: 0, R1: 1, R2: 2, R3: 3, R4: 4 }

/** Regroupe les findings par RÈGLE : une famille = {cle, type, risque (max), nb, occurrences}. */
export function grouperFamilles(findings) {
  const parCle = new Map()
  for (const f of (findings || [])) {
    const cle = f.regle || f.id || f.type || 'autre'
    if (!parCle.has(cle)) parCle.set(cle, { cle, type: f.type || null, risque: f.niveau_risque || 'R0', nb: 0, occurrences: [] })
    const fam = parCle.get(cle)
    fam.occurrences.push(f); fam.nb++
    if ((RANG_RISQUE[f.niveau_risque] ?? 0) > (RANG_RISQUE[fam.risque] ?? 0)) fam.risque = f.niveau_risque
  }
  return [...parCle.values()]
}

/**
 * Échantillon d'une famille : les occurrences les moins sûres D'ABORD (confiance la plus basse =
 * plus probable erreur), avec un étalement sur les pages. Déterministe (pas de hasard qui casserait
 * la reproductibilité). Renvoie au plus `n` occurrences.
 */
export function echantillonner(occurrences, n = 5) {
  const arr = [...(occurrences || [])].sort((a, b) => (a.confiance_modele ?? 1) - (b.confiance_modele ?? 1))
  const choisi = [], pagesVues = new Set()
  for (const o of arr) { if (choisi.length >= n) break; if (!pagesVues.has(o.page)) { choisi.push(o); pagesVues.add(o.page) } }
  for (const o of arr) { if (choisi.length >= n) break; if (!choisi.includes(o)) choisi.push(o) } // complète si peu de pages
  return choisi
}

/**
 * Règle d'échantillonnage (§11.3, configurable) : 0 erreur sur l'échantillon → proposer d'accepter la
 * famille ; 1 erreur → étendre l'échantillon ; ≥2 → contrôle détaillé.
 */
export function regleEchantillonnage(nbErreurs, { seuilBase = 5, seuilEtendu = 15 } = {}) {
  if (nbErreurs <= 0) return { action: 'proposer_acceptation', taille: seuilBase }
  if (nbErreurs === 1) return { action: 'etendre', taille: seuilEtendu }
  return { action: 'controle_detaille', taille: null }
}

/**
 * Un finding porte-t-il une DÉCISION CONCRÈTE propre à une ligne — correction de TEXTE réelle
 * (texte_candidat ≠ texte_original) ou RECLASSEMENT de rôle ? (Phase 4) Ces objets sont TOUJOURS
 * individuels : jamais fondus dans une « famille » acceptée en bloc sous un motif unique (ex.
 * relecture_page). Une famille ne regroupe que des FLAGS répétitifs et homogènes (confiance faible,
 * doublon, page ignorable…), qui, eux, se contrôlent par échantillonnage.
 */
export function aPayloadConcret(f) {
  if (!f) return false
  if (f.type === 'reclassement_role') return true
  const orig = f.texte_original == null ? null : String(f.texte_original)
  const cand = f.texte_candidat == null ? null : String(f.texte_candidat)
  // Un candidat VIDE n'est pas une proposition : c'est l'absence de proposition. Un signalement
  // qui dit seulement « cette ligne est douteuse » (confiance faible) doit rester un FLAG traité
  // par échantillonnage, pas devenir une décision individuelle à prendre ligne à ligne. Cohérent
  // avec l'interdiction de supprimer une ligne par une correction vide (§14.2, §23.8).
  if (cand == null || !cand.trim()) return false
  return cand !== orig
}

/** Distance d'édition (Levenshtein), bornée pour de courtes lignes. Pur / testable. */
export function distanceEdition(a = '', b = '') {
  a = String(a); b = String(b)
  if (a === b) return 0
  const m = a.length, n = b.length
  if (!m) return n
  if (!n) return m
  let prev = new Array(n + 1)
  for (let j = 0; j <= n; j++) prev[j] = j
  for (let i = 1; i <= m; i++) {
    const cur = [i]
    for (let j = 1; j <= n; j++) {
      const cout = a[i - 1] === b[j - 1] ? 0 : 1
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cout)
    }
    prev = cur
  }
  return prev[n]
}

/**
 * Une correction de TEXTE est-elle SIMPLE (donc auto-applicable en candidat, sans clic humain) ? Critère
 * déterministe : très peu de caractères changés — le classique de l'OCR (ſ lu f, i lu t, accent absent).
 * Un changement plus large (mot(s) remplacé(s), réécriture) est COMPLEXE / ambigu → décision humaine.
 * Les reclassements de rôle ne sont jamais « simples » (conséquence structurelle → l'humain tranche). Pur.
 */
export function estCorrectionSimple(f, { seuil = 2, seuilConfiant = 4, confiantMin = 0.85 } = {}) {
  if (!f || f.type === 'reclassement_role') return false
  const orig = f.texte_original == null ? null : String(f.texte_original)
  const cand = f.texte_candidat == null ? null : String(f.texte_candidat)
  if (cand == null || cand === '' || cand === orig) return false
  const d = distanceEdition(orig || '', cand)
  if (d === 0) return false
  if (d <= seuil) return true                                         // ≤ 2 caractères : sûr, quelle que soit la confiance
  if (d <= seuilConfiant && (f.confiance_modele ?? 0) >= confiantMin) return true // jusqu'à 4 si le modèle est confiant
  return false
}

/**
 * Une correction de TEXTE doit-elle être appliquée AUTOMATIQUEMENT (sans clic) ? On fait D'ABORD confiance
 * au VERDICT de l'IA (« la part des choses ») : « incertaine » → jamais auto ; « certaine » → auto, sauf
 * réécriture massive (garde-fou : > `plafondGros` caractères changés reste soumis à l'humain). Quand l'IA
 * n'a pas donné de verdict, on retombe sur le critère déterministe `estCorrectionSimple`. Pur / testable.
 */
export function estAutoApplicable(f, { plafondGros = 12, ...opts } = {}) {
  if (!f || f.type === 'reclassement_role') return false
  const orig = f.texte_original == null ? null : String(f.texte_original)
  const cand = f.texte_candidat == null ? null : String(f.texte_candidat)
  if (cand == null || cand === '' || cand === orig) return false
  if (f.certitude === 'incertaine') return false
  if (f.certitude === 'certaine') return distanceEdition(orig || '', cand) <= plafondGros
  return estCorrectionSimple(f, opts) // pas de verdict → repli déterministe
}

/**
 * Répartit les findings pour l'écran (§11.1, refonte Phase 4) : corrections INDIVIDUELLES (chaque
 * changement de texte/rôle est un objet distinct, relu un à un), familles de flags à échantillonner,
 * cas critiques (R3 concrets), non résolus (indéterminés), blocages (R4), et déjà-automatiques.
 * Plus aucune fausse famille : 41 corrections de relecture donnent 41 objets, jamais un lot « aveugle ».
 */
export function classerValidation(findings, { seuilSimple = 2 } = {}) {
  const automatiques = [], auto_texte = [], corrections = [], critiques = [], non_resolus = [], blocages = [], avertissements = [], resteFlags = []
  for (const f of (findings || [])) {
    const st = f.statut, r = f.niveau_risque
    if (st === 'confirme_humain' || st === 'modifie_humain') { automatiques.push(f); continue } // décidé humain
    if (st === 'refuse' || st === 'annule') continue // refusé / annulé : hors flux
    if (st === 'applique_deterministe' || st === 'accepte_regle_validee' || st === 'accepte_echantillonnage') { automatiques.push(f); continue }
    // Phase 5 : avertissements (page courte, réserve informative) — NON bloquants, hors flux de décision.
    if (st === 'avertissement' || f.severite === 'avertissement' || f.severite === 'information') { avertissements.push(f); continue }
    if (st === 'bloquant' || r === 'R4') { blocages.push(f); continue }
    if (st === 'indetermine') { non_resolus.push(f); continue }
    if (aPayloadConcret(f)) {
      if (r === 'R3') { critiques.push(f); continue }                           // risque élevé → humain
      // Phase 4.3 : correction de TEXTE auto-applicable (verdict IA « certaine », sinon petit changement)
      // → appliquée en candidat, aucun clic. Le reste (verdict « incertaine », grosse réécriture) → humain.
      if (f.type !== 'reclassement_role' && estAutoApplicable(f, { seuil: seuilSimple })) { auto_texte.push(f); continue }
      corrections.push(f); continue                                             // reclassement / gros changement → humain
    }
    if (r === 'R3') { critiques.push(f); continue }
    resteFlags.push(f) // flags répétitifs SANS charge concrète → familles / échantillonnage
  }
  const familles = grouperFamilles(resteFlags)
  return {
    automatiques, auto_texte, corrections, familles, critiques, non_resolus, blocages, avertissements,
    compteurs: {
      automatiques: automatiques.length, auto_texte: auto_texte.length, corrections: corrections.length,
      familles: familles.length, critiques: critiques.length, non_resolus: non_resolus.length,
      blocages: blocages.length, avertissements: avertissements.length, corrections_totales: (findings || []).length,
    },
  }
}
