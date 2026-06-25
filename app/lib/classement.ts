export type Rang = 'Catéchumène' | 'Disciple' | 'Docteur'

// Seuils ajustables au même endroit — voir la charte pour le détail du calcul.
const SEUIL_DISCIPLE = 15
const SEUIL_DOCTEUR = 50

export function calculerScore(nbCommentaires: number, nbValides: number, nbLikes: number): number {
  return nbCommentaires + 2 * nbValides + nbLikes
}

export function calculerRang(score: number): { rang: Rang; rangSuivant: Rang | null; seuilSuivant: number | null } {
  if (score < SEUIL_DISCIPLE) return { rang: 'Catéchumène', rangSuivant: 'Disciple', seuilSuivant: SEUIL_DISCIPLE }
  if (score < SEUIL_DOCTEUR) return { rang: 'Disciple', rangSuivant: 'Docteur', seuilSuivant: SEUIL_DOCTEUR }
  return { rang: 'Docteur', rangSuivant: null, seuilSuivant: null }
}

export function couleurRang(rang: Rang): { fond: string; texte: string } {
  switch (rang) {
    case 'Catéchumène': return { fond: '#f0ece6', texte: '#8a8278' }
    case 'Disciple': return { fond: 'rgba(61,107,79,0.10)', texte: '#3d6b4f' }
    case 'Docteur': return { fond: 'rgba(192,86,42,0.10)', texte: '#9a4a1f' }
  }
}