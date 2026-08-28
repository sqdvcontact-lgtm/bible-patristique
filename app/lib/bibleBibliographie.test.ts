import { describe, expect, it } from 'vitest'
import { composerBibliographie } from './bibleBibliographie'

describe('composition d’une note bibliographique', () => {
  const note = [
    'Pour les commentaires catholiques, voyez l’introduction. Signalons, comme œuvres spéciales :',
    '- ++Jean Chrysostome++, *Homélies sur l’Évangile selon Matthieu*.',
    '- ++Arnoldi++ Matthias, *Commentar zum Evangelium des heiligen Matthäus*, Trèves, 1856.',
    '- ++Van Steenkiste++ Jean-Aloïs, *Commentarius in Evangelium secundum Matthaeum*, Bruges, 1876.',
  ].join('\n')

  it('sépare l’annonce de la liste', () => {
    const { chapeau, entrees } = composerBibliographie(note)
    expect(chapeau).toBe('Pour les commentaires catholiques, voyez l’introduction. Signalons, comme œuvres spéciales :')
    expect(entrees).toHaveLength(3)
  })

  it('retire le marqueur de liste sans toucher au texte de l’entrée', () => {
    const { entrees } = composerBibliographie(note)
    expect(entrees[0]).toBe('++Jean Chrysostome++, *Homélies sur l’Évangile selon Matthieu*.')
    // ⛔ Le tiret ne s'imprime jamais : c'est un marqueur, non un signe du texte.
    expect(entrees.some((entree) => entree.startsWith('-'))).toBe(false)
  })

  it('garde la capitale d’autorité de la forme d’affichage', () => {
    const { entrees } = composerBibliographie(note)
    expect(entrees[2]).toMatch(/^\+\+Van Steenkiste\+\+/)
  })

  it('accepte le demi-cadratin et le cadratin comme marqueurs', () => {
    expect(composerBibliographie('Liste :\n– Un.\n— Deux.').entrees).toEqual(['Un.', 'Deux.'])
  })

  it('ne fabrique pas de blanc pour une simple rupture de ligne', () => {
    // Une seule rupture après les deux-points : elle ouvre la liste, elle ne
    // crée pas un paragraphe vide.
    expect(composerBibliographie('Annonce :\n- Une entrée.').chapeau).toBe('Annonce :')
  })

  it('recolle une référence repliée sur deux lignes', () => {
    const { entrees } = composerBibliographie('Annonce :\n- Un titre long,\nBruges, 1876.')
    expect(entrees).toEqual(['Un titre long, Bruges, 1876.'])
  })

  it('ne voit aucune liste dans un paragraphe suivi', () => {
    const { chapeau, entrees } = composerBibliographie('Un commentaire ordinaire, sans liste.')
    expect(entrees).toEqual([])
    expect(chapeau).toBe('Un commentaire ordinaire, sans liste.')
  })

  it('compose un bloc déclaré comme entrée autonome sans injecter de tiret', () => {
    const texte = '*Évangile selon saint Matthieu*. Introduction critique et commentaires.'
    const { chapeau, entrees } = composerBibliographie(texte, { entreeAutonome: true })
    expect(chapeau).toBeNull()
    expect(entrees).toEqual([texte])
  })
})
