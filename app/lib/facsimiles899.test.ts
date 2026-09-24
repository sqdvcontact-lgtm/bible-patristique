import { describe, expect, it } from 'vitest'
import lignes from './facsimiles899.json'
import {
  construireTableFacsimiles899, libelleColonne899, lireRepere899, urlColonneFacsimile899,
  type LigneTableFacsimiles899,
} from './facsimiles899'

const table = construireTableFacsimiles899(lignes as unknown as LigneTableFacsimiles899[])

describe('lireRepere899', () => {
  it('lit la colonne et la ligne', () => {
    expect(lireRepere899('f100r_a_l04')).toEqual({ colonne: 'f100r_a', ligne: 4 })
    expect(lireRepere899('f1v_b_l39')).toEqual({ colonne: 'f1v_b', ligne: 39 })
  })
  it('refuse toute autre forme', () => {
    for (const v of [null, undefined, '', 'f100r_l04', 'f100r_c_l04', 'GEN.3.1', 42]) {
      expect(lireRepere899(v)).toBeNull()
    }
  })
})

describe('la table des colonnes', () => {
  it('porte les 1 484 colonnes du manifeste, sans doublon', () => {
    expect(table.colonnes).toHaveLength(1484)
    expect(table.rang.size).toBe(1484)
  })
  it('ne prend pas la clé pour le folio : l’image f296r montre le folio 297r', () => {
    const c = table.colonnes[table.rang.get('f296r_a')!]
    expect(c.folio).toBe('297r')
    expect(c.fichier).toBe('f296r_a.png')
    expect(libelleColonne899(c)).toBe('f. 297r, col. a')
  })
  it('retrouve un fichier numéroté de zéros par sa clé sans zéros', () => {
    expect(table.colonnes[table.rang.get('f1v_b')!].fichier).toBe('f001v_b.png')
  })
  it('range les colonnes dans l’ordre du manuscrit', () => {
    expect(table.colonnes.slice(0, 4).map((c) => c.cle)).toEqual(['f1r_a', 'f1r_b', 'f1v_a', 'f1v_b'])
  })
})

describe('urlColonneFacsimile899', () => {
  // La fenêtre lit la copie d'affichage WebP, jamais le maître PNG du lecteur de chantier.
  it('vise la copie WebP de bible-899-web', () => {
    const url = urlColonneFacsimile899({ fichier: 'f001v_b.png' })
    expect(url.endsWith('/storage/v1/object/public/manuscrits/bible-899-web/f001v_b.webp')).toBe(true)
  })
})
