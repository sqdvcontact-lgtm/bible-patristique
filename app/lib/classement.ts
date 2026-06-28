export type Rang = 'Catéchumène' | 'Disciple' | 'Docteur'

// Seuils : un commentateur régulier (2-3 fois/semaine, validés + quelques likes)
// atteint Disciple en ~1 mois, Docteur en ~4-6 mois.
export const SEUIL_DISCIPLE = 50
export const SEUIL_DOCTEUR  = 300

export function calculerScore(nbCommentaires: number, nbValides: number, nbLikes: number): number {
  return nbCommentaires + 2 * nbValides + nbLikes
}

export function calculerRang(score: number): { rang: Rang; rangSuivant: Rang | null; seuilSuivant: number | null; seuilPrecedent: number } {
  if (score < SEUIL_DISCIPLE) return { rang: 'Catéchumène', rangSuivant: 'Disciple', seuilSuivant: SEUIL_DISCIPLE, seuilPrecedent: 0 }
  if (score < SEUIL_DOCTEUR)  return { rang: 'Disciple',    rangSuivant: 'Docteur',   seuilSuivant: SEUIL_DOCTEUR,  seuilPrecedent: SEUIL_DISCIPLE }
  return { rang: 'Docteur', rangSuivant: null, seuilSuivant: null, seuilPrecedent: SEUIL_DOCTEUR }
}

export function couleurRang(rang: Rang): { fond: string; texte: string } {
  switch (rang) {
    case 'Catéchumène': return { fond: '#f0ece6', texte: '#8a8278' }
    case 'Disciple': return { fond: 'rgba(61,107,79,0.10)', texte: '#3d6b4f' }
    case 'Docteur': return { fond: 'rgba(192,86,42,0.10)', texte: '#9a4a1f' }
  }
}