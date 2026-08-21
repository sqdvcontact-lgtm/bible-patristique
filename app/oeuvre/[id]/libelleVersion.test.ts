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
  it('affiche seulement les noms, sans le point-virgule du catalogue', () => {
    expect(libelleVersionComplet(version({
      traducteur: 'H. Barreau ; M. Charpentier',
      titre: 'Texte français',
      anneeEdition: 1873,
    }))).toBe('H. Barreau et M. Charpentier, édition de 1873')
  })

  it('nomme simplement le traducteur et l’édition', () => {
    expect(libelleVersionComplet(version({
      traducteur: 'René de Ceriziers',
      titre: 'Traduction de René de Ceriziers, cinquième édition, 1646',
      anneeEdition: 1646,
    }))).toBe('René de Ceriziers, édition de 1646')
  })

  it('conserve le titre porté par le nom sans ajouter de formule', () => {
    expect(libelleVersionComplet(version({ traducteur: 'abbé Joyeux', anneeEdition: 1866 })))
      .toBe('abbé Joyeux, édition de 1866')
  })

  // Une version en langue originale n'a pas de traducteur : c'est son titre qui la nomme.
  it('laisse la version originale se nommer par son titre', () => {
    expect(libelleVersionComplet(version({ titre: 'Texte latin', anneeEdition: 1873 })))
      .toBe('Texte latin, édition de 1873')
  })

  it('ajoute les dates du traducteur quand la version les porte', () => {
    expect(libelleVersionComplet(version({
      traducteur: 'Bareille',
      anneeEdition: 1865,
      metadata: { traducteur_naissance: 1810, traducteur_mort: 1878 },
    }))).toBe('Bareille (1810–1878), édition de 1865')
  })

  it('donne les deux traductions de Boèce sous la forme éditoriale demandée', () => {
    expect(libelleVersionComplet(version({
      traducteur: 'René de Ceriziers', anneeEdition: 1646,
      metadata: { traducteur_dates: '1603–1662' },
    }))).toBe('René de Ceriziers (1603–1662), édition de 1646')
    expect(libelleVersionComplet(version({
      traducteur: 'Louis Judicis de Mirandol', anneeEdition: 1861,
      metadata: { traducteur_naissance: 1816, traducteur_mort: 1893 },
    }))).toBe('Louis Judicis de Mirandol (1816–1893), édition de 1861')
  })

  it('se contente du titre quand rien d’autre n’est connu', () => {
    expect(libelleVersionComplet(version({ titre: 'Texte grec' }))).toBe('Texte grec')
  })
})
