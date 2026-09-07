import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  ESPACE_TEXTUEL_CORPS,
  ESPACE_TEXTUEL_INTRODUCTION,
  estLiminaireSansNiveau,
  limiterRequeteAuxLiminairesSansNiveau,
} from './oeuvreSelects'

const RACINE = join(import.meta.dirname, '..', '..')
const lire = (chemin: string) => readFileSync(join(RACINE, chemin), 'utf8')

describe('un corps sans niveau ne devient jamais un liminaire', () => {
  it('réserve le pseudo-niveau aux introductions explicitement déclarées et sans ref_niv1', () => {
    expect(estLiminaireSansNiveau({ espace_textuel: ESPACE_TEXTUEL_INTRODUCTION, nature: 'apparat_editeur', ref_niv1: null })).toBe(true)
    expect(estLiminaireSansNiveau({ espace_textuel: ESPACE_TEXTUEL_CORPS, nature: 'texte', ref_niv1: null })).toBe(false)
    expect(estLiminaireSansNiveau({ espace_textuel: ESPACE_TEXTUEL_INTRODUCTION, nature: 'apparat_editeur', ref_niv1: 'Avis' })).toBe(false)
    expect(estLiminaireSansNiveau({ espace_textuel: null, nature: 'introduction', ref_niv1: null })).toBe(false)
  })

  it('traduit la même règle dans la requête PostgREST', () => {
    const appels: [string, string, unknown][] = []
    const requete = {
      eq(colonne: string, valeur: string) {
        appels.push(['eq', colonne, valeur])
        return this
      },
      is(colonne: string, valeur: null) {
        appels.push(['is', colonne, valeur])
        return this
      },
    }
    limiterRequeteAuxLiminairesSansNiveau(requete)
    expect(appels).toEqual([
      ['eq', 'espace_textuel', ESPACE_TEXTUEL_INTRODUCTION],
      ['is', 'ref_niv1', null],
    ])
  })

  it('interdit aux lecteurs le filtre nu ref_niv1 IS NULL pour le pseudo-niveau', () => {
    for (const chemin of ['app/oeuvre/[id]/page.tsx', 'app/oeuvre/[id]/OeuvreClient.tsx']) {
      const source = lire(chemin)
      expect(source).toContain('limiterRequeteAuxLiminairesSansNiveau')
      expect(source).not.toContain("NIV1_LIMINAIRES ? q.is('ref_niv1', null)")
      expect(source).not.toContain("NIV1_LIMINAIRES ? premierReq.is('ref_niv1', null)")
      expect(source).not.toContain(" v === NIV1_LIMINAIRES) q = q.is('ref_niv1', null)")
    }
  })
})
