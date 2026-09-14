import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { INTERLIGNE_ENTREE_ENROULABLE, styleEntreeListeVolet } from './stylesVoletLecture'

// ⛔ UNE SEULE ÉCRITURE POUR L'ENTRÉE D'UNE LISTE DU VOLET DE LA BIBLE (décision de l'auteur,
// 14 septembre 2026 : « pour le sommaire de l'apparat critique, utilise exactement la même
// police que le sommaire utilisé pour Genèse, Matthieu »). La garde lit les deux listes : un
// corps recomposé à part dans l'une ferait diverger les onglets « Livres » et « Sommaire ».
// ⚠️ Le soir même, l'auteur a demandé que les titres du sommaire se serrent et s'écartent
// l'un de l'autre : l'interligne est le seul écart admis, et il passe par la même écriture.

describe('l’entrée d’une liste du volet de la Bible', () => {
  it('compose le livre et la pièce au même corps, à la même interligne', () => {
    expect(styleEntreeListeVolet({ actif: false })).toMatchObject({
      fontSize: '0.84375rem', lineHeight: 1.4, fontWeight: 400,
      color: 'var(--cs-texte-second)', background: 'transparent',
    })
    expect(styleEntreeListeVolet({ actif: true })).toMatchObject({
      fontSize: '0.84375rem', lineHeight: 1.4, fontWeight: 600,
      color: 'var(--cs-encre)', background: 'rgba(var(--cs-vert-rgb),0.10)',
    })
  })

  it('⚠️ une entrée qui s’enroule ne change que d’interligne, et le serre', () => {
    for (const actif of [false, true]) {
      const { lineHeight, ...reste } = styleEntreeListeVolet({ actif, enroulable: true })
      const { lineHeight: interligneDUnLivre, ...resteDUnLivre } = styleEntreeListeVolet({ actif })
      expect(lineHeight).toBe(INTERLIGNE_ENTREE_ENROULABLE)
      expect(Number(lineHeight)).toBeLessThan(Number(interligneDUnLivre))
      expect(reste).toEqual(resteDUnLivre)
    }
  })

  it('⛔ les deux listes la lisent, et le sommaire ne recompose plus son corps à part', () => {
    const livres = readFileSync('app/components/NavLivres.tsx', 'utf8')
    const sommaire = readFileSync('app/components/SommaireEdition.tsx', 'utf8')
    expect(livres).toContain('...styleEntreeListeVolet({ actif: actif || suggere })')
    expect(sommaire).toContain('...styleEntreeListeVolet({ actif, enroulable: true })')
    expect(sommaire).not.toContain("fontSize: '0.71875rem'")
  })
})
