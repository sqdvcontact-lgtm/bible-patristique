import { describe, expect, it } from 'vitest'
import {
  CHAPITRES_PROTOCANON, chargerChapitresParLivre, chargerLivresLisibles,
  estLivreOuvrable, nombreDeChapitres,
} from './chapitresCanon'

// Ce que l'ossature porte réellement, relevé sur `livres_canon` le 2026-09-04.
const OSSATURE = { GEN: 50, SIR: 51, WIS: 19, TOB: 14, JDT: 16, '1MA': 16, '2MA': 15, BAR: 6, JOL: 4, DAN: 12 }

describe('nombreDeChapitres', () => {
  it('prend le compte de l’OSSATURE quand on l’a', () => {
    expect(nombreDeChapitres('SIR', OSSATURE)).toBe(51)
    expect(nombreDeChapitres('WIS', OSSATURE)).toBe(19)
  })

  it('⛔ le deutérocanonique ne retombe plus sur UN chapitre', () => {
    for (const code of ['SIR', 'WIS', 'TOB', 'JDT', '1MA', '2MA', 'BAR']) {
      expect(nombreDeChapitres(code, OSSATURE), code).toBeGreaterThan(1)
      // La table de repli ne les a jamais portés : c'est bien l'ossature qui répond.
      expect(CHAPITRES_PROTOCANON[code], code).toBeUndefined()
    }
  })

  it('retombe sur le repli tant que l’ossature n’a pas répondu', () => {
    expect(nombreDeChapitres('GEN', null)).toBe(50)
    expect(nombreDeChapitres('SIR', null)).toBe(1)
  })

  it('⚠️ le repli dit ce que l’OSSATURE dit, non ce que la Vulgate compte', () => {
    // Joël valait 3 (son chapitre 4 était inatteignable) et Daniel 14 (ses deux derniers
    // chapitres s'offraient sans rien rendre, leur texte vivant sous SUS et BEL).
    expect(CHAPITRES_PROTOCANON.JOL).toBe(OSSATURE.JOL)
    expect(CHAPITRES_PROTOCANON.DAN).toBe(OSSATURE.DAN)
  })

  it('rend UN chapitre pour un livre que personne ne connaît', () => {
    expect(nombreDeChapitres('XYZ', OSSATURE)).toBe(1)
  })
})

describe('estLivreOuvrable', () => {
  it('⛔ un livre que RIEN ne rend ne se liste pas', () => {
    // Hénoch et les Jubilés n'ont de texte nulle part : ni ossature, ni apocryphes.
    expect(estLivreOuvrable('ENO', OSSATURE)).toBe(false)
    expect(estLivreOuvrable('JUB', OSSATURE)).toBe(false)
  })

  it('un livre que l’ossature porte se liste', () => {
    expect(estLivreOuvrable('SIR', OSSATURE)).toBe(true)
  })

  it('⚠️ un écrit NON CANONIQUE se liste dès qu’il a des chapitres (2026-09-06)', () => {
    // `livres_lisibles` en compte pour les écrits de la Septante hors ossature : la
    // Lettre de Jérémie et le Daniel du vieux grec s'ouvrent depuis qu'ils ont un
    // chemin de lecture. Ils n'entrent PAS dans l'ossature pour autant.
    expect(estLivreOuvrable('LJE', { ...OSSATURE, LJE: 1, DAG: 12 })).toBe(true)
    expect(estLivreOuvrable('DAG', { ...OSSATURE, LJE: 1, DAG: 12 })).toBe(true)
    expect(estLivreOuvrable('LJE', OSSATURE)).toBe(false)
  })

  it('⚠️ tant qu’on ne SAIT pas, on ne retire rien', () => {
    expect(estLivreOuvrable('ESG', null)).toBe(true)
  })
})

describe('chargerLivresLisibles', () => {
  it('interroge `livres_lisibles`, et non plus `livres_canon`', async () => {
    // ⛔ La bascule de vue est la décision, pas le dessin : `livres_canon` ne connaît
    // que l'ossature, et laissait les écrits non canoniques grisés à jamais.
    const demandes: { table: string; colonnes: string }[] = []
    const client = {
      from: (table: string) => ({
        select: (colonnes: string) => {
          demandes.push({ table, colonnes })
          return Promise.resolve({
            data: [
              { code: 'GEN', chapitres: 50, canonique: true },
              { code: 'DAG', chapitres: 12, canonique: false },
            ],
            error: null,
          })
        },
      }),
    }

    const lignes = await chargerLivresLisibles(client)

    expect(demandes).toEqual([{ table: 'livres_lisibles', colonnes: 'code, chapitres, canonique' }])
    expect(lignes.find(l => l.code === 'DAG')?.canonique).toBe(false)
    // La table des chapitres se dérive de la MÊME lecture : une seule requête pour tout
    // le site, comme avant.
    expect(await chargerChapitresParLivre(client)).toEqual({ GEN: 50, DAG: 12 })
    expect(demandes).toHaveLength(1)
  })
})
