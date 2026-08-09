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
 * Répartit les findings pour l'écran (§11.1) : corrections automatiques, familles à échantillonner,
 * cas critiques (R3, individuels), cas non résolus (indéterminés), blocages (R4). Aucune correction
 * non critique n'exige un clic individuel.
 */
export function classerValidation(findings) {
  const automatiques = [], critiques = [], non_resolus = [], blocages = [], resteFamille = []
  for (const f of (findings || [])) {
    const st = f.statut, r = f.niveau_risque
    if (st === 'confirme_humain' || st === 'modifie_humain') { automatiques.push(f); continue } // décidé humain
    if (st === 'refuse' || st === 'annule') continue // refusé / annulé : hors flux
    if (st === 'bloquant' || r === 'R4') blocages.push(f)
    else if (st === 'indetermine') non_resolus.push(f)
    else if (r === 'R3') critiques.push(f)
    else if (st === 'applique_deterministe' || st === 'accepte_regle_validee' || st === 'accepte_echantillonnage') automatiques.push(f)
    else resteFamille.push(f) // R0-R2 proposés → traités par famille / échantillonnage
  }
  const familles = grouperFamilles(resteFamille)
  return {
    automatiques, familles, critiques, non_resolus, blocages,
    compteurs: {
      automatiques: automatiques.length, familles: familles.length, critiques: critiques.length,
      non_resolus: non_resolus.length, blocages: blocages.length,
      corrections_totales: (findings || []).length,
    },
  }
}
