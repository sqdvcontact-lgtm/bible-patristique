import { describe, expect, it } from 'vitest'

import { identiteCitee, parametreTexte, type LigneIdentiteTexte } from './identiteCitee'

// L'œuvre telle que la base la décrit : son adresse est celle de son texte PAR DÉFAUT, la
// traduction d'Arnauld d'Andilly.
const CONFESSIONS = {
  trad_auteur: 'Robert Arnauld d’Andilly',
  editeur: 'Veuve Jean Camusat ; Pierre Le Petit',
  ville: 'Paris',
  date_publication: '1649',
  collection: null,
}

const ligne = (partiel: Partial<LigneIdentiteTexte>): LigneIdentiteTexte => ({
  id_texte: 'T', id_oeuvre: 'A0010O0001', titre_version: null, langue: null, traducteur: null,
  edition_label: null, annee_edition: null, is_default: false, is_public: true, statut: 'termine',
  ...partiel,
})

const LATIN = ligne({
  id_texte: 'A0010O0001T0001',
  titre_version: 'Sancti Aureli Augustini Confessionum libri XIII',
  langue: 'Latin',
  edition_label: 'Pius Knöll (éd.), CSEL 33, Pragae–Vindobonae–Lipsiae, F. Tempsky–G. Freytag, 1896',
  annee_edition: 1896,
})

const FRANCAIS = ligne({
  id_texte: 'A0010O0001T0002',
  langue: 'Français',
  traducteur: 'Robert Arnauld d’Andilly',
  is_default: true,
})

describe('identiteCitee', () => {
  it('⛔ ne prête pas au latin le traducteur ni l’adresse du français', () => {
    const identite = identiteCitee(CONFESSIONS, LATIN, null)
    expect(identite.tradAuteur).toBeNull()
    expect(identite.ville).toBe('Pragae–Vindobonae–Lipsiae')
    expect(identite.editeur).toBe('F. Tempsky–G. Freytag')
    expect(identite.datePublication).toBe('1896')
    expect(identite.responsable).toBe('Pius Knöll')
    expect(identite.collection).toBe('CSEL 33')
  })

  it('laisse l’œuvre répondre pour son texte par défaut, quand il ne porte pas d’adresse', () => {
    const identite = identiteCitee(CONFESSIONS, FRANCAIS, null)
    expect(identite.tradAuteur).toBe('Robert Arnauld d’Andilly')
    expect(identite.ville).toBe('Paris')
    expect(identite.datePublication).toBe('1649')
    expect(identite.responsable).toBeNull()
  })

  it('retombe sur l’œuvre sans ligne de texte', () => {
    expect(identiteCitee(CONFESSIONS, null, null).editeur).toBe('Veuve Jean Camusat ; Pierre Le Petit')
  })
})

describe('parametreTexte', () => {
  it('rouvre une édition qui n’est pas celle par défaut, et elle seule', () => {
    expect(parametreTexte(LATIN)).toBe('texte=A0010O0001T0001')
    expect(parametreTexte(FRANCAIS)).toBe('')
    expect(parametreTexte(null)).toBe('')
  })
})
