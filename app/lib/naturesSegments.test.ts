import { describe, expect, it } from 'vitest'
import { NATURE_VALIDES, declarationDeSegment, normaliserNatureSegment } from './naturesSegments'
import { LIBELLE_NATURE } from './stylesLibelles'

describe('vocabulaire des importateurs génériques', () => {
  it('contient exactement les natures autorisées', () => {
    expect(NATURE_VALIDES).toEqual([
      'texte', 'citation', 'lemme', 'rubrique', 'dialogue',
      'introduction', 'apparat_critique', 'apparat_auteur', 'apparat_editeur',
      'separateur', 'texte absent', 'signature', 'verset',
    ])
  })

  it.each(['verset', 'dialogue', 'rubrique'] as const)('accepte %s sans la modifier', nature => {
    expect(normaliserNatureSegment(nature)).toBe(nature)
  })

  it('⛔ `vers` n’est plus une nature : la poésie se déclare par sa FORME', () => {
    // Sortie du vocabulaire le 29 août 2026, avec les 2 325 segments qui la
    // portaient. Un importateur qui l’écrirait encore la rabat sur `texte` — la
    // nature que ses frères portent —, et c’est exactement ce que la migration a
    // fait. La forme, elle, se pose à part : `segment_metadata.forme = 'vers'`.
    expect(NATURE_VALIDES).not.toContain('vers')
    expect(normaliserNatureSegment('vers')).toBe('texte')
  })

  it('rabât une valeur inconnue sur texte', () => {
    expect(normaliserNatureSegment('inconnue')).toBe('texte')
  })
})

describe('⛔ un import ne perd JAMAIS le vers en silence', () => {
  // Le danger est propre à l'écriture : `normaliserNatureSegment` rabat toute valeur
  // inconnue sur `texte`, si bien qu'un import écrivant encore la nature héritée
  // `vers` aurait fait de la poésie de la prose, sans retour possible.
  it('traduit la nature héritée au lieu de la rabattre', () => {
    expect(declarationDeSegment({ nature: 'vers' }))
      .toEqual({ nature: 'texte', segment_metadata: { forme: 'vers' } })
  })

  it('la nature retombe sur celle des FRÈRES, selon l’espace', () => {
    // C'est la règle qu'a suivie la migration du 29 août 2026 : `introduction` dans
    // l'espace d'introduction — les 20 vers du Manuel de Dhuoda —, `texte` ailleurs.
    expect(declarationDeSegment({ nature: 'vers', espace_textuel: 'introduction' }).nature).toBe('introduction')
    expect(declarationDeSegment({ nature: 'vers', espace_textuel: 'corps' }).nature).toBe('texte')
  })

  it('la FORME se déclare pour elle-même, sur n’importe quelle nature', () => {
    // ⛔ C'est la seule écriture possible dans l'apparat, où la nature est déjà prise.
    expect(declarationDeSegment({ nature: 'apparat_critique', forme: 'vers' }))
      .toEqual({ nature: 'apparat_critique', segment_metadata: { forme: 'vers' } })
  })

  it('la prose n’écrit AUCUNE métadonnée', () => {
    expect(declarationDeSegment({ nature: 'texte' })).toEqual({ nature: 'texte', segment_metadata: null })
    expect(declarationDeSegment({ nature: 'dialogue' })).toEqual({ nature: 'dialogue', segment_metadata: null })
    expect(declarationDeSegment({})).toEqual({ nature: 'texte', segment_metadata: null })
  })

  it('⛔ n’ouvre pas `segment_metadata` en grand : la seule clé est la forme', () => {
    // Un passe-plat serait une porte par où entrerait tout ce que personne ne relit.
    const d = declarationDeSegment({ nature: 'vers', page: 42, stanza_before: true } as never)
    expect(Object.keys(d.segment_metadata ?? {})).toEqual(['forme'])
  })
})

describe('le menu de l’administration ne peut offrir que ce qui existe', () => {
  it('donne un libellé à chaque nature du vocabulaire, et rien de plus', async () => {
    // ⛔ Le menu partait d'une liste écrite à la main où figuraient `titre` et
    // `note`, que `chk_segments_nature` refuse : les choisir écrivait une erreur en
    // base. Une liste offerte est une promesse ; offrir ce que la base refuse est
    // une promesse fausse.
    // Depuis le 2026-09-03 la table des noms vit dans `stylesLibelles.ts`, partagée
    // avec le module « Styles » ; le contrôle des œuvres l'importe.
    expect(Object.keys(LIBELLE_NATURE).sort()).toEqual([...NATURE_VALIDES].sort())
  })
})

describe('le vocabulaire et la base disent la même chose', () => {
  it('reproduit exactement `chk_segments_nature`', () => {
    // ⚠️ Recopié à la main, faute qu'un test puisse interroger la base : c'est le
    // prix de la garde. Contrainte posée par les migrations 20260828120000 (verset),
    // 20260829090000 (signature) et 20260829150000 (retrait de `vers`) ; toute
    // migration qui la touche passe ici.
    const CONTRAINTE = [
      'texte', 'citation', 'verset', 'lemme', 'rubrique', 'dialogue',
      'signature', 'separateur', 'apparat_critique', 'apparat_auteur',
      'apparat_editeur', 'texte absent', 'introduction',
    ]
    expect([...NATURE_VALIDES].sort()).toEqual([...CONTRAINTE].sort())
  })
})
