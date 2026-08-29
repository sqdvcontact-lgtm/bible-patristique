import { describe, expect, it } from 'vitest'
import { NATURE_VALIDES, normaliserNatureSegment } from './naturesSegments'

describe('vocabulaire des importateurs génériques', () => {
  it('contient exactement les natures autorisées', () => {
    expect(NATURE_VALIDES).toEqual([
      'texte', 'citation', 'lemme', 'vers', 'rubrique', 'dialogue',
      'introduction', 'apparat_critique', 'apparat_auteur', 'apparat_editeur',
      'separateur', 'texte absent', 'signature', 'verset',
    ])
  })

  it.each(['vers', 'verset', 'dialogue', 'rubrique'] as const)('accepte %s sans la modifier', nature => {
    expect(normaliserNatureSegment(nature)).toBe(nature)
  })

  it('rabât une valeur inconnue sur texte', () => {
    expect(normaliserNatureSegment('inconnue')).toBe('texte')
  })
})

describe('le menu de l’administration ne peut offrir que ce qui existe', () => {
  it('donne un libellé à chaque nature du vocabulaire, et rien de plus', async () => {
    // ⛔ Le menu partait d'une liste écrite à la main où figuraient `titre` et
    // `note`, que `chk_segments_nature` refuse : les choisir écrivait une erreur en
    // base. Une liste offerte est une promesse ; offrir ce que la base refuse est
    // une promesse fausse.
    const source = await import('node:fs').then(fs =>
      fs.readFileSync('app/admin/SectionControleOeuvres.tsx', 'utf8'))
    const bloc = source.slice(source.indexOf('const LIBELLE_NATURE'), source.indexOf('type SegmentAfficheControle'))
    const libelles = [...bloc.matchAll(/^\s{2}'?([a-z_ ]+)'?:\s/gm)].map(m => m[1].trim())
    expect([...libelles].sort()).toEqual([...NATURE_VALIDES].sort())
  })
})

describe('le vocabulaire et la base disent la même chose', () => {
  it('reproduit exactement `chk_segments_nature`', () => {
    // ⚠️ Recopié à la main, faute qu'un test puisse interroger la base : c'est le
    // prix de la garde. Contrainte posée par les migrations 20260828120000 (verset)
    // et 20260829090000 (signature) ; toute migration qui la touche passe ici.
    const CONTRAINTE = [
      'texte', 'citation', 'verset', 'lemme', 'vers', 'rubrique', 'dialogue',
      'signature', 'separateur', 'apparat_critique', 'apparat_auteur',
      'apparat_editeur', 'texte absent', 'introduction',
    ]
    expect([...NATURE_VALIDES].sort()).toEqual([...CONTRAINTE].sort())
  })
})
