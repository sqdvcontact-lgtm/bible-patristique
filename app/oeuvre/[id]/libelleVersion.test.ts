import { describe, expect, it } from 'vitest'
import { libelleVersionComplet } from './versionTextuelle'

const version = (v: Partial<Parameters<typeof libelleVersionComplet>[0]>) => ({
  traducteur: null,
  titre: 'Édition',
  anneeEdition: null,
  metadata: null,
  ...v,
}) as Parameters<typeof libelleVersionComplet>[0]

describe('libelleVersionComplet', () => {
  // Le défaut signalé : dans le menu, « Texte latin » faisait face à un nom propre nu,
  // et la liste du catalogue y gardait son point-virgule.
  it('met la liste de traducteurs en phrase, sans le point-virgule du catalogue', () => {
    expect(libelleVersionComplet(version({
      traducteur: 'H. Barreau ; M. Charpentier',
      titre: 'Texte français',
      anneeEdition: 1873,
    }))).toBe('Traduction par H. Barreau et M. Charpentier, 1873')
  })

  it('dit qu’une version est une traduction, et de qui', () => {
    expect(libelleVersionComplet(version({
      traducteur: 'René de Ceriziers',
      titre: 'Traduction de René de Ceriziers, cinquième édition, 1646',
      anneeEdition: 1646,
    }))).toBe('Traduction par René de Ceriziers, 1646')
  })

  it('emploie la formule au deux-points quand le nom porte un titre', () => {
    expect(libelleVersionComplet(version({ traducteur: 'abbé Joyeux', anneeEdition: 1866 })))
      .toBe('Traduction : abbé Joyeux, 1866')
  })

  // Une version en langue originale n'a pas de traducteur : c'est son titre qui la nomme.
  it('laisse la version originale se nommer par son titre', () => {
    expect(libelleVersionComplet(version({ titre: 'Texte latin', anneeEdition: 1873 })))
      .toBe('Texte latin, 1873')
  })

  it('ajoute les dates du traducteur quand la version les porte', () => {
    expect(libelleVersionComplet(version({
      traducteur: 'Bareille',
      anneeEdition: 1865,
      metadata: { traducteur_naissance: 1810, traducteur_mort: 1878 },
    }))).toBe('Traduction de Bareille (1810–1878), 1865')
  })

  it('se contente du titre quand rien d’autre n’est connu', () => {
    expect(libelleVersionComplet(version({ titre: 'Texte grec' }))).toBe('Texte grec')
  })
})
