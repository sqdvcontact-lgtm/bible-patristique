import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  LEXIQUE_INTERDIT, replierTexte, termeInterditDansPseudo, termesInterditsDansTexte,
} from './moderationLexique'

describe('replierTexte', () => {
  it('efface casse, accents et séparateurs, et ramène une répétition à deux lettres', () => {
    expect(replierTexte('CoNNNard  !')).toBe('connard')
    expect(replierTexte('Con-NNNard')).toBe('con nnard')
    expect(replierTexte('Bâtard')).toBe('batard')
  })
  it('ne replie pas jusqu’à une seule lettre : le Niger n’est pas une insulte', () => {
    expect(replierTexte('nigger')).toBe('nigger')
    expect(replierTexte('Niger')).toBe('niger')
  })
})

describe('termeInterditDansPseudo', () => {
  it('condamne l’injure cachée dans un pseudonyme', () => {
    expect(termeInterditDansPseudo('connard42')).toBe('connard')
    expect(termeInterditDansPseudo('Con-NNNard')).toBe('connard')
    expect(termeInterditDansPseudo('Sal_ope')).toBe('salope')
    expect(termeInterditDansPseudo('TrouDuCul')).toBe('trou du cul')
    expect(termeInterditDansPseudo('pd_42')).toBe('pd')
  })
  it('laisse passer ce qui ne fait que ressembler', () => {
    expect(termeInterditDansPseudo('depute')).toBeNull()
    expect(termeInterditDansPseudo('Dominique')).toBeNull()
    expect(termeInterditDansPseudo('Constantin')).toBeNull()
    expect(termeInterditDansPseudo('pedestre')).toBeNull()
    expect(termeInterditDansPseudo('Encre')).toBeNull()
  })
})

describe('termesInterditsDansTexte', () => {
  it('ne juge que des mots entiers, pluriel compris', () => {
    expect(termesInterditsDansTexte('Quel connard, ce commentateur.')).toEqual(['connard'])
    expect(termesInterditsDansTexte('Ces salopes.')).toEqual(['salope'])
    expect(termesInterditsDansTexte('Le député Dominique a fait un pas pédestre.')).toEqual([])
  })
  it('reste permissif sur le registre familier', () => {
    expect(termesInterditsDansTexte('Merde, putain, c’est débile.')).toEqual([])
  })
  it('reconnaît une locution', () => {
    expect(termesInterditsDansTexte('va te faire, fils de pute')).toContain('fils de pute')
  })
})

describe('la base porte la MÊME liste', () => {
  it('la dernière migration qui peuple moderation_lexique dit mot pour mot ce que dit le module', () => {
    const dossier = join(__dirname, '../../supabase/migrations')
    const fichier = readdirSync(dossier).filter(f => f.endsWith('.sql')).sort()
      .filter(f => readFileSync(join(dossier, f), 'utf8').includes('insert into public.moderation_lexique')).pop()
    expect(fichier, 'aucune migration ne peuple moderation_lexique').toBeTruthy()
    const sql = readFileSync(join(dossier, fichier!), 'utf8')
    const bloc = sql.slice(sql.indexOf('insert into public.moderation_lexique'))
    const enBase = [...bloc.matchAll(/\('((?:[^']|'')+)',\s*(true|false)\)/g)]
      .map(m => ({ mot: m[1].replace(/''/g, "'"), entier: m[2] === 'true' }))
    expect(enBase).toEqual([...LEXIQUE_INTERDIT])
  })
})
