import { describe, it, expect } from 'vitest'
import { auteursDuCorpus, auteurDeLigne, AUTEURS_ECARTES } from './auteursDuCorpus'

const A = (id: string, nom: string, annee: number | null) => ({ id_auteur: id, nom, date_debut_annee: annee })

const TERTULLIEN = A('A0011', 'Tertullien', 160)
const BASILE     = A('A0017', 'Basile de Césarée', 329)
const GREGOIRE   = A('A0047', 'Grégoire de Nazianze', 329)
const THOMAS     = A('A0013', 'Thomas d’Aquin', 1225)
const RUFIN      = A('A0052', 'Rufin d’Aquilée', 345)
const APOTRES    = A('A0012', 'Douze Apôtres', 51)

describe('auteursDuCorpus', () => {
  it('range du plus ancien au plus récent', () => {
    const r = auteursDuCorpus(
      [{ id_oeuvre: 'O1', auteur: THOMAS }, { id_oeuvre: 'O2', auteur: TERTULLIEN }],
      new Set(['O1', 'O2']),
    )
    expect(r.map(a => a.nom)).toEqual(['Tertullien', 'Thomas d’Aquin'])
  })

  it('ne nomme un auteur qu’une fois, quel que soit son nombre d’œuvres', () => {
    const r = auteursDuCorpus(
      [{ id_oeuvre: 'O1', auteur: TERTULLIEN }, { id_oeuvre: 'O2', auteur: TERTULLIEN }],
      new Set(['O1', 'O2']),
    )
    expect(r).toHaveLength(1)
  })

  it('départage deux contemporains par le nom', () => {
    const r = auteursDuCorpus(
      [{ id_oeuvre: 'O1', auteur: GREGOIRE }, { id_oeuvre: 'O2', auteur: BASILE }],
      new Set(['O1', 'O2']),
    )
    expect(r.map(a => a.nom)).toEqual(['Basile de Césarée', 'Grégoire de Nazianze'])
  })

  it('ferme la marche sur un auteur sans année, jamais l’ouvre', () => {
    const inconnu = A('A0999', 'Anonyme', null)
    const r = auteursDuCorpus(
      [{ id_oeuvre: 'O1', auteur: inconnu }, { id_oeuvre: 'O2', auteur: THOMAS }],
      new Set(['O1', 'O2']),
    )
    expect(r.map(a => a.nom)).toEqual(['Thomas d’Aquin', 'Anonyme'])
  })

  it('compte les CO-SIGNATURES : Rufin paraît par l’Histoire ecclésiastique', () => {
    const r = auteursDuCorpus(
      [{ id_oeuvre: 'A0024O0001', auteur: A('A0024', 'Eusèbe de Césarée', 260) },
       { id_oeuvre: 'A0024O0001', auteur: RUFIN }],
      new Set(['A0024O0001']),
    )
    expect(r.map(a => a.nom)).toEqual(['Eusèbe de Césarée', 'Rufin d’Aquilée'])
  })

  it('une co-signature sur une œuvre RETENUE ne fait paraître personne', () => {
    const r = auteursDuCorpus(
      [{ id_oeuvre: 'RETENUE', auteur: RUFIN }, { id_oeuvre: 'O1', auteur: THOMAS }],
      new Set(['O1']),
    )
    expect(r.map(a => a.nom)).toEqual(['Thomas d’Aquin'])
  })

  it('écarte les fiches qui ne sont pas des personnes', () => {
    const r = auteursDuCorpus(
      [{ id_oeuvre: 'O1', auteur: APOTRES }, { id_oeuvre: 'O2', auteur: TERTULLIEN }],
      new Set(['O1', 'O2']),
    )
    expect(AUTEURS_ECARTES).toContain('A0012')
    expect(r.map(a => a.nom)).toEqual(['Tertullien'])
  })

  it('tolère une ligne sans auteur plutôt que de tomber', () => {
    const r = auteursDuCorpus(
      [{ id_oeuvre: 'O1', auteur: null }, { id_oeuvre: 'O2', auteur: TERTULLIEN }],
      new Set(['O1', 'O2']),
    )
    expect(r.map(a => a.nom)).toEqual(['Tertullien'])
  })
})

describe('auteurDeLigne — les deux formes d’embed PostgREST', () => {
  it('lit un objet', () => {
    expect(auteurDeLigne({ id_auteur: 'A0011', nom: 'Tertullien', date_debut_annee: 160 })).toEqual(TERTULLIEN)
  })
  it('lit un tableau à un élément', () => {
    expect(auteurDeLigne([{ id_auteur: 'A0011', nom: 'Tertullien', date_debut_annee: 160 }])).toEqual(TERTULLIEN)
  })
  it('rend null sur une ligne vide, un tableau vide ou un nom manquant', () => {
    expect(auteurDeLigne(null)).toBeNull()
    expect(auteurDeLigne([])).toBeNull()
    expect(auteurDeLigne({ id_auteur: 'A0011' })).toBeNull()
  })
  it('n’invente pas une année quand la colonne est nulle', () => {
    expect(auteurDeLigne({ id_auteur: 'A0176', nom: 'Dhuoda', date_debut_annee: null })?.date_debut_annee).toBeNull()
  })
})
