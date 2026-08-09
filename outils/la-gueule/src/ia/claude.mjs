// Fournisseur IA Claude (Anthropic) — SQUELETTE configurable. Aucun appel réel n'est fait tant que
// (1) une clé est présente en variable d'environnement ET (2) le consentement cloud est explicite.
// Les tests n'appellent JAMAIS ce fournisseur (ils utilisent le mock). Aucune clé n'est écrite dans
// le dépôt, les journaux ou les exports. Aucun identifiant de modèle n'est codé en dur : tout vient
// de l'environnement. `fetch` natif (pas de dépendance npm).

const ENDPOINT = 'https://api.anthropic.com/v1/messages'

export function fournisseurClaude(env = {}) {
  const cle = env.ANTHROPIC_API_KEY || null
  const modele = {
    diagnostic: env.LG_AI_MODEL_DIAGNOSTIC || null,
    vision: env.LG_AI_MODEL_VISION || null,
    controle: env.LG_AI_MODEL_CONTROLE || null,
  }
  const dispo = !!cle

  // Appel générique. Renvoie TOUJOURS un objet (jamais d'exception qui casserait le projet) :
  // abstention traçable si clé absente, consentement manquant, modèle non configuré, ou erreur réseau.
  async function appel(tache, charge, { consentement = false, modeleTache = 'controle', timeoutMs = 60000, signal = null } = {}) {
    if (!cle) return { type: tache, statut: 'candidat', abstention: true, erreur: 'clé API absente', fournisseur: 'anthropic' }
    if (!consentement) return { type: tache, statut: 'candidat', abstention: true, erreur: 'consentement cloud requis', fournisseur: 'anthropic' }
    const mdl = modele[modeleTache] || modele.controle || modele.vision || modele.diagnostic
    if (!mdl) return { type: tache, statut: 'candidat', abstention: true, erreur: 'modèle non configuré (LG_AI_MODEL_*)', fournisseur: 'anthropic' }
    const ctrl = signal || (typeof AbortController !== 'undefined' ? new AbortController().signal : undefined)
    try {
      const rep = await fetch(ENDPOINT, {
        method: 'POST',
        signal: ctrl,
        headers: { 'x-api-key': cle, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({ model: mdl, max_tokens: 1024, messages: charge?.messages || [] }),
      })
      if (!rep.ok) return { type: tache, statut: 'candidat', abstention: true, erreur: 'HTTP ' + rep.status, fournisseur: 'anthropic', modele: mdl }
      const data = await rep.json()
      return { type: tache, statut: 'candidat', abstention: false, brut: data, fournisseur: 'anthropic', modele: mdl }
    } catch (e) {
      // Panne / timeout : ne bloque jamais le projet ; l'IA est simplement « indisponible ».
      return { type: tache, statut: 'candidat', abstention: true, erreur: 'IA indisponible : ' + (e?.message || e), fournisseur: 'anthropic', modele: mdl }
    }
  }

  return {
    nom: 'anthropic',
    cloud: true,
    dispo,
    modele,
    diagnostiquer: (c, o) => appel('diagnostic', c, { ...o, modeleTache: 'diagnostic' }),
    lettrine: (c, o) => appel('lettrine', c, { ...o, modeleTache: 'vision' }),
    titre: (c, o) => appel('niveau_titre', c, { ...o, modeleTache: 'vision' }),
    ligne: (c, o) => appel('correction_ocr', c, { ...o, modeleTache: 'controle' }),
    page: (c, o) => appel('controle_page', c, { ...o, modeleTache: 'controle' }),
    section: (c, o) => appel('controle_section', c, { ...o, modeleTache: 'controle' }),
    lot: (c, o) => appel('controle_lot', c, { ...o, modeleTache: 'controle' }),
  }
}
