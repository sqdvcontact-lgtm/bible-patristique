import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { messageDErreur, noterDegradation, tolerer, type DegradationChargement } from './chargementTolerant'

describe('tolerer', () => {
  let journalServeur: unknown[][]
  beforeEach(() => {
    journalServeur = []
    vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => { journalServeur.push(args) })
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('rend la valeur d’une lecture qui aboutit, sans rien consigner', async () => {
    const journal: DegradationChargement[] = []
    const valeur = await tolerer(journal, { quoi: 'les notes', publique: true }, async () => 42, () => 0)
    expect(valeur).toBe(42)
    expect(journal).toEqual([])
    expect(journalServeur).toEqual([])
  })

  it('rend le repli sur un rejet, et consigne la dégradation avec son détail', async () => {
    const journal: DegradationChargement[] = []
    const valeur = await tolerer(
      journal,
      { quoi: 'les notes', publique: true },
      () => Promise.reject({ code: '57014', message: 'canceling statement due to statement timeout' }),
      () => [] as number[],
    )
    expect(valeur).toEqual([])
    expect(journal).toEqual([
      { quoi: 'les notes', publique: true, detail: '57014 · canceling statement due to statement timeout' },
    ])
    expect(journalServeur).toHaveLength(1)
    expect(String(journalServeur[0][0])).toContain('page servie sans les notes')
  })

  it('attrape aussi une exception SYNCHRONE de la tâche', async () => {
    const journal: DegradationChargement[] = []
    const valeur = await tolerer(
      journal,
      { quoi: 'le texte original en regard', publique: true },
      () => { throw new Error('Un segment sans id_texte ou segment_key…') },
      () => 'repli',
    )
    expect(valeur).toBe('repli')
    expect(journal[0]?.detail).toBe('Un segment sans id_texte ou segment_key…')
    expect(journal[0]?.publique).toBe(true)
  })

  it('appelle la fabrique du repli à chaque échec : deux appelants ne partagent pas un même objet', async () => {
    const journal: DegradationChargement[] = []
    const a = await tolerer(journal, { quoi: 'a', publique: false }, () => Promise.reject(new Error('x')), () => ({}))
    const b = await tolerer(journal, { quoi: 'b', publique: false }, () => Promise.reject(new Error('x')), () => ({}))
    expect(a).not.toBe(b)
    expect(journal.map(d => d.quoi)).toEqual(['a', 'b'])
  })
})

describe('messageDErreur', () => {
  it('lit une Error, une chaîne, une réponse PostgREST et un objet quelconque', () => {
    expect(messageDErreur(new Error('boum'))).toBe('boum')
    expect(messageDErreur('brut')).toBe('brut')
    expect(messageDErreur({ code: 'PGRST200', message: 'relation inconnue', hint: 'vérifier' }))
      .toBe('PGRST200 · relation inconnue · vérifier')
    expect(messageDErreur({ n: 1 })).toBe('{"n":1}')
    expect(messageDErreur(undefined)).toBe('undefined')
  })
})

describe('noterDegradation', () => {
  it('écrit au journal du serveur ET dans la liste de la page', () => {
    const espion = vi.spyOn(console, 'error').mockImplementation(() => {})
    const journal: DegradationChargement[] = []
    noterDegradation(journal, { quoi: 'quelques appels de note', detail: '2 ancres hors du texte', publique: true })
    expect(journal).toHaveLength(1)
    expect(espion).toHaveBeenCalledTimes(1)
    expect(String(espion.mock.calls[0][0])).toContain('quelques appels de note')
    espion.mockRestore()
  })
})
