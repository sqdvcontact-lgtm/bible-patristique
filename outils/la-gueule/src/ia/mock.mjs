// Fournisseur IA MOCK — déterministe, sans réseau. Sert aux tests et au fonctionnement hors-ligne.
// Il s'ABSTIENT par défaut (sortie prudente) : l'IA n'est jamais autorité, une IA prudente vaut mieux
// qu'une IA qui invente. Chaque sortie est un CANDIDAT traçable, jamais une décision.

const base = (type, extra = {}) => ({ type, statut: 'candidat', abstention: false, inference_contextuelle: false, ...extra })

export function fournisseurMock() {
  return {
    nom: 'mock',
    cloud: false,
    dispo: true,
    modele: { diagnostic: 'mock', vision: 'mock', controle: 'mock' },
    async diagnostiquer() {
      return base('diagnostic', { document: { type: 'imprime_ancien', langues: ['fr'], qualite_scan: 'inconnue' }, moteur_propose: 'kraken', modele_propose: 'CATMuS-Print' })
    },
    async lettrine() {
      // Prudence : sans preuve visuelle réelle, on s'abstient (pas d'invention de lettre).
      return base('lettrine', { presence: 'indeterminee', lecture_candidate: '', type_intervention: 'aucune', lecture_fondee_sur_image: false, abstention: true, confiance: 0, preuves: [] })
    },
    async titre() {
      return base('niveau_titre', { role_propose: 'indetermine', niveau_propose: null, abstention: true, confiance: 0, preuves: [] })
    },
    async ligne() {
      return base('correction_ocr', { texte_propose: null, categorie_erreur: null, abstention: true, confiance: 0, preuves: [] })
    },
    async page() { return base('controle_page', { anomalies: [], abstention: true }) },
    // Ancrage des notes (§13) : sans lecture réelle de la page, aucun rattachement n'est proposé.
    async notes() { return base('ancrage_notes', { ancrages: [], abstention: true }) },
    // Vérification visuelle : sans image réellement regardée, aucune lecture n'est confirmée — donc
    // aucune correction ne peut être auto-acceptée hors-ligne. C'est voulu (§9 : jamais d'automatisme
    // sans preuve).
    async verification() { return base('verification_visuelle', { verifications: [], abstention: true }) },
    async section() { return base('controle_section', { anomalies: [], abstention: true }) },
    async lot() { return base('controle_lot', { anomalies: [], abstention: true }) },
  }
}
