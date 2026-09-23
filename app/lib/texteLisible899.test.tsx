import { describe, expect, it } from 'vitest'
import { Fragment } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { marquerLacunesDuTemoin, rendreMarqueurs899 } from './marqueurs899'
import { texteLisible899, texteLisibleDeLaBible, texteLisibleModerne899 } from './texteLisible899'
import { normaliserEspaces } from './typographie'
import type { ReactNode } from 'react'

/** Le texte d'un rendu : balises ôtées, entités rendues. */
function sansBalises(noeuds: ReactNode): string {
  const html = renderToStaticMarkup(<Fragment>{noeuds}</Fragment>)
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
}

/** Le texte que l'écran montre : le rendu, balises ôtées, entités rendues. */
function texteRendu(brut: string): string {
  return sansBalises(rendreMarqueurs899(brut))
}

const VERSETS = [
  'Au commencement Dieu fist le ciel et la terre.',
  'et [lecture incertaine : preig] les autres',
  'il dist [ajout marginal : a ses filz] que',
  'preig] et puis il vint',
  '[…] et il prenoit le pain',
  'por[…]er le fes',
  'la [lacune : déchirure] fin',
  'la [lacune : non précisée] fin',
  'et [lacune : le folio',
  'dechiré] manque ici',
  'Moÿses dist : [lecture difficile : ce que]',
  'il vint [lacune] et',
  '',
]

describe('texteLisible899', () => {
  it.each(VERSETS)('rend le texte que l’écran montre : « %s »', (brut) => {
    expect(texteLisible899(brut)).toBe(texteRendu(brut))
  })

  it('ne laisse aucune étiquette d’atelier', () => {
    const lu = texteLisible899('et [lecture incertaine : preig] les autres')
    expect(lu).toBe('et preig les autres')
    expect(lu).not.toMatch(/lecture incertaine|\[|\]/)
  })

  it('dit la lacune par sa cause, ou par le mot nu', () => {
    expect(texteLisible899('la [lacune : déchirure] fin')).toBe('la [déchirure] fin')
    expect(texteLisible899('il vint […] et')).toBe('il vint [lacune] et')
  })
})

// ── LA TRADUCTION MODERNE DU TÉMOIN (TR0013) ─────────────────────────────────────────
// Les versets sont de la forme que `versets_v2` porte pour TR0013 : lacunes en clair,
// lectures incertaines citant l'ancien français, restitutions entre crochets.
const VERSETS_MODERNES = [
  'Au commencement Dieu fit le ciel et la terre.',
  'il [m’exauça] et le peuple se tut.',
  'et [lecture difficile : « oures »] il partit',
  'Alors il dit [lecture incertaine : « Quant li frere come il erant',
  ' »]. Et il se tut.',
  'tu guetteras ses [lecture difficile : « oures »]. »',
  'il dit [ajout marginal : « a ses filz »] que',
  'Après qu’il eut mangé et bu […]',
  'Le Seigneur le chassa [lacune : déchirure] hors du paradis.',
  'la [lacune : non précisée] fin',
  'et [lacune : le folio',
  'por[lacune : déchirure]er le fes',
  'ne l’avait pas [Lacune].',
  'il [les eut frappés] et [lecture incertaine : il partit]',
  '',
]

describe('texteLisibleModerne899', () => {
  // ⚠️ `marquerLacunesDuTemoin` reçoit du texte DÉJÀ normalisé : c'est `rendreTexteEnrichi`
  // qui appelle `normaliserEspaces` à son entrée, et qui lui passe ensuite les portions de
  // texte naturel. La fonction sœur, elle, part du brut : la garde normalise donc le témoin
  // du rendu, sans quoi elle comparerait deux états différents du même verset.
  it.each(VERSETS_MODERNES)('rend le texte que l’écran montre : « %s »', (brut) => {
    expect(texteLisibleModerne899(brut)).toBe(sansBalises(marquerLacunesDuTemoin(normaliserEspaces(brut), 't0')))
  })

  it('n’emporte ni étiquette d’atelier ni guillemet de citation', () => {
    const lu = texteLisibleModerne899('et [lecture difficile : « oures »] il partit')
    expect(lu).toBe('et oures il partit')
    expect(lu).not.toMatch(/lecture difficile|\[|\]/)
  })

  it('laisse la RESTITUTION intacte, crochets compris', () => {
    const brut = 'il [m’exauça] et le peuple se tut.'
    expect(texteLisibleModerne899(brut)).toBe(brut)
  })

  it('dit la lacune par sa cause, ou par le mot nu', () => {
    expect(texteLisibleModerne899('Le Seigneur le chassa [lacune : déchirure] hors')).toBe('Le Seigneur le chassa [déchirure] hors')
    expect(texteLisibleModerne899('Après qu’il eut mangé et bu […]')).toBe('Après qu’il eut mangé et bu [lacune]')
  })
})

describe('texteLisibleDeLaBible', () => {
  it('choisit l’automate selon la bible, suffixe de couche compris', () => {
    const recompose = 'et [lecture incertaine : preig] les autres'
    expect(texteLisibleDeLaBible(recompose, 'TR0009')).toBe('et preig les autres')
    expect(texteLisibleDeLaBible(recompose, 'TR0009#diplomatic')).toBe('et preig les autres')
    expect(texteLisibleDeLaBible('et [lecture difficile : « oures »] il partit', 'TR0013')).toBe('et oures il partit')
  })

  it('ne touche à aucune autre bible', () => {
    const brut = 'Au commencement, Dieu créa le ciel et la terre.'
    expect(texteLisibleDeLaBible(brut, 'TR0001')).toBe(brut)
    expect(texteLisibleDeLaBible(brut, null)).toBe(brut)
  })
})
