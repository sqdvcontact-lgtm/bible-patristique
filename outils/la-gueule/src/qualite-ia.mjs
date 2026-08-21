// QUALITÉ DE L'IA — mesurée sur les décisions déjà prises, sans travail supplémentaire.
//
// L'outil proposait des corrections sans jamais savoir si elles étaient bonnes. Le registre de
// modèles porte un CER, mais il exige un banc validé à la main ; en attendant, on ne pouvait
// répondre ni « le nouveau prompt est-il meilleur ? » ni « à quel point puis-je lui faire
// confiance ? ».
//
// Or le verdict est DÉJÀ dans les données : chaque `ligne.corrections[]` garde sa provenance
// (`origine`), son statut, et le fait qu'un humain l'ait validée. Accepter, refuser ou annuler une
// proposition, c'est l'étiqueter. Il suffit de compter.
//
// Ce n'est PAS un CER et ne le remplace pas : le CER mesure l'écart à une vérité terrain, ceci
// mesure l'accord d'un relecteur avec les propositions. Les deux sont utiles ; celui-ci est gratuit.
// Module PUR, testé.

const AGREE = new Set(['confirme_humain', 'modifie_humain'])

/** Les corrections d'une ligne, à plat, avec le contexte page/ligne. */
function corrections(projet) {
  const out = []
  for (const num of Object.keys(projet?.pages || {})) {
    const lignes = projet.pages[num]?.lignes
    if (!Array.isArray(lignes)) continue
    lignes.forEach((l, i) => {
      for (const c of (Array.isArray(l.corrections) ? l.corrections : [])) out.push({ page: Number(num), ligne: i, c })
    })
  }
  return out
}

/**
 * Verdict d'une proposition. `null` quand elle n'a pas encore été jugée — on ne compte jamais un
 * silence comme un accord (ce serait se donner raison tout seul).
 */
export function verdict(c) {
  if (!c || c.annulee) return 'annulee'                 // revenue en arrière = désaccord constaté
  if (c.statut === 'refuse') return 'refusee'
  if (AGREE.has(c.statut)) return c.statut === 'modifie_humain' ? 'amendee' : 'acceptee'
  if (c.validation_humaine) return 'acceptee'
  return null                                            // appliquée en candidat, pas encore relue
}

/**
 * Taux d'accord d'un relecteur avec les propositions de l'IA, par provenance et par règle.
 * `jugees` = propositions réellement tranchées ; le taux ne porte QUE sur elles.
 */
export function qualiteIA(projet) {
  const total = { proposees: 0, jugees: 0, acceptees: 0, amendees: 0, refusees: 0, annulees: 0, en_attente: 0 }
  const parRegle = new Map()
  for (const { c } of corrections(projet)) {
    if ((c.origine || 'ia') !== 'ia') continue           // on ne juge que ce que l'IA a proposé
    total.proposees++
    const v = verdict(c)
    const cle = c.regle || c.type || 'autre'
    if (!parRegle.has(cle)) parRegle.set(cle, { regle: cle, proposees: 0, jugees: 0, acceptees: 0, amendees: 0, refusees: 0, annulees: 0 })
    const r = parRegle.get(cle)
    r.proposees++
    if (v == null) { total.en_attente++; continue }
    total.jugees++; r.jugees++
    if (v === 'acceptee') { total.acceptees++; r.acceptees++ }
    else if (v === 'amendee') { total.amendees++; r.amendees++ }
    else if (v === 'refusee') { total.refusees++; r.refusees++ }
    else if (v === 'annulee') { total.annulees++; r.annulees++ }
  }
  const taux = (o) => o.jugees ? Math.round(((o.acceptees + o.amendees) / o.jugees) * 1000) / 10 : null
  return {
    total: { ...total, taux_accord: taux(total) },
    // Les règles les plus jugées d'abord : ce sont celles sur lesquelles le chiffre veut dire quelque chose.
    regles: [...parRegle.values()].map((r) => ({ ...r, taux_accord: taux(r) })).sort((a, b) => b.jugees - a.jugees || b.proposees - a.proposees),
  }
}

/**
 * Rendu lisible. Dit franchement quand l'échantillon est trop mince : un taux calculé sur trois
 * décisions n'apprend rien, et l'afficher comme un résultat serait trompeur.
 */
export function qualiteMarkdown(q, { nom = 'projet', seuilFiable = 20 } = {}) {
  const t = q?.total || {}
  const L = []
  L.push('# Qualité des propositions IA — ' + nom)
  L.push('')
  L.push('Mesure l’ACCORD d’un relecteur avec les propositions, pas leur exactitude absolue.')
  L.push('Ce n’est pas un CER : celui-ci compare à une vérité terrain, celui-là exige un banc validé.')
  L.push('')
  if (!t.proposees) { L.push('_Aucune proposition IA dans ce projet._', ''); return L.join('\n') }
  L.push('## Ensemble')
  L.push('- Proposées : **' + t.proposees + '** — jugées : **' + t.jugees + '** (en attente : ' + t.en_attente + ')')
  if (!t.jugees) {
    L.push('- _Aucune n’a encore été tranchée : rien à mesurer._')
  } else {
    L.push('- Acceptées : ' + t.acceptees + ' · amendées : ' + t.amendees + ' · refusées : ' + t.refusees + ' · annulées : ' + t.annulees)
    L.push('- **Taux d’accord : ' + t.taux_accord + ' %**' + (t.jugees < seuilFiable ? ' — ⚠ sur ' + t.jugees + ' décisions seulement : indicatif, pas un résultat.' : ''))
  }
  L.push('')
  const jugees = (q.regles || []).filter((r) => r.jugees > 0)
  if (jugees.length) {
    L.push('## Par règle')
    L.push('')
    L.push('| règle | jugées | accord | refusées |')
    L.push('|---|---:|---:|---:|')
    for (const r of jugees) L.push('| ' + r.regle + ' | ' + r.jugees + ' | ' + r.taux_accord + ' % | ' + (r.refusees + r.annulees) + ' |')
    L.push('')
    const faible = jugees.filter((r) => r.jugees >= 5 && r.taux_accord != null && r.taux_accord < 60)
    if (faible.length) {
      L.push('**À revoir** — ces règles sont plus souvent refusées qu’acceptées : ' + faible.map((r) => '`' + r.regle + '`').join(', ') + '.')
      L.push('')
    }
  }
  const attente = (q.regles || []).filter((r) => r.jugees === 0 && r.proposees > 0)
  if (attente.length) L.push('_Non encore jugées : ' + attente.map((r) => r.regle + ' (' + r.proposees + ')').join(', ') + '._')
  return L.join('\n') + '\n'
}
