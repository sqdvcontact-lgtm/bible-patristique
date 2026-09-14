import { describe, expect, it } from 'vitest'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import CitationsFavorites, { EXTRAIT_A_DEUX, SEUIL_GRIS, extraitFavorite, motsComposesInsecables } from './CitationsFavorites'
import type { CitationFavoritePublique } from '../../lib/citationsFavorites'

const FINE = String.fromCharCode(0x202f)

const VERSET: CitationFavoritePublique = {
  type: 'biblique',
  texte: 'car Dieu a tant aimé le monde, qu’il a donné son Fils unique',
  reference: 'Jean 3, 16',
  source: 'Bible de Sacy',
  lieu: null,
  lien: '/?livre=JHN&chapitre=3&verset=16',
}

const PERE: CitationFavoritePublique = {
  type: 'patristique',
  texte: 'Tu nous as faits pour toi, et notre cœur est inquiet[[3]] tant qu’il ne repose en toi',
  reference: 'Augustin d’Hippone',
  source: 'Les Confessions',
  lieu: 'Livre premier, I',
  lien: '/oeuvre/A0010O0001#s4',
}

const rendre = (citations: CitationFavoritePublique[]) =>
  renderToStaticMarkup(React.createElement(CitationsFavorites, { citations }))

describe('CitationsFavorites', () => {
  it('ne rend rien sans favorite', () => {
    expect(rendre([])).toBe('')
  })

  it('pose les deux favorites en diptyque, chacune menant à sa source', () => {
    const html = rendre([VERSET, PERE])
    expect(html).toContain('data-nombre="2"')
    expect(html.match(/class="profil-favorite"/g)).toHaveLength(2)
    expect(html).toContain('href="/?livre=JHN&amp;chapitre=3&amp;verset=16"')
    expect(html).toContain('href="/oeuvre/A0010O0001#s4"')
    expect(html).toContain('Citations favorites')
  })

  it('nomme l’œuvre d’un Père en titre, et la traduction d’un verset en romain', () => {
    const html = rendre([VERSET, PERE])
    expect(html).toContain('<cite>Les Confessions</cite>, Livre premier, I')
    expect(html).not.toContain('<cite>Bible de Sacy</cite>')
  })

  it('encadre le passage de guillemets à fines insécables, sans appel de note', () => {
    const html = rendre([PERE])
    expect(html).toContain(`«${FINE}Tu nous as faits pour toi`)
    expect(html).toContain(`toi.${FINE}»`)
    expect(html).not.toContain('[[3]]')
  })

  it('sans source ouverte, le passage ne mène nulle part', () => {
    const html = rendre([{ ...VERSET, lien: null }])
    expect(html).not.toContain('<a ')
    expect(html).toContain('data-nombre="1"')
  })

  it('ne fend pas un mot composé à son trait d’union', () => {
    const html = rendre([{ ...VERSET, texte: 'Que les eaux qui sont au-dessous du ciel se rassemblent' }])
    expect(html).toContain('<span class="profil-favorite-mot">au-dessous</span>')
    expect(html).not.toContain('<span class="profil-favorite-mot">Que')
  })
})

describe('motsComposesInsecables', () => {
  const rendreMots = (texte: string) =>
    renderToStaticMarkup(React.createElement(React.Fragment, null, motsComposesInsecables(texte, 't')))

  it('enferme chaque mot composé, apostrophe comprise, et rien d’autre', () => {
    const html = rendreMots('Il dit, c’est-à-dire vous-mesme, ô Jésus-Christ.')
    expect(html.match(/class="profil-favorite-mot"/g)).toHaveLength(3)
    expect(html).toContain('<span class="profil-favorite-mot">c’est-à-dire</span>')
    expect(html).toContain('<span class="profil-favorite-mot">vous-mesme</span>')
    expect(html).toContain('<span class="profil-favorite-mot">Jésus-Christ</span>')
  })

  it('ne change pas un caractère du texte', () => {
    const texte = 'Au-dessous du ciel, dis-je, et le sec paraisse.'
    expect(rendreMots(texte).replace(/<[^>]+>/g, '')).toBe(texte)
  })

  it('rend le texte tel quel quand aucun mot n’est composé', () => {
    expect(motsComposesInsecables('Au commencement était le Verbe.', 't')).toBe('Au commencement était le Verbe.')
  })
})

describe('extraitFavorite', () => {
  it('un passage court se ponctue comme une citation, entier', () => {
    const extrait = extraitFavorite('au commencement était le Verbe', EXTRAIT_A_DEUX)
    expect(extrait).toEqual({ texte: 'Au commencement était le Verbe.', tronque: false, dense: false })
  })

  it('garde l’enrichissement d’un passage entier', () => {
    expect(extraitFavorite('Et la lumière <i>fut</i>', EXTRAIT_A_DEUX).texte).toBe('Et la lumière <i>fut</i>.')
  })

  it('un passage trop long se coupe au mot, sans point après les points de suspension', () => {
    const long = `${'et le Verbe était auprès de Dieu, '.repeat(20)}fin`
    const extrait = extraitFavorite(long, EXTRAIT_A_DEUX)
    expect(extrait.tronque).toBe(true)
    expect(extrait.texte.endsWith('…')).toBe(true)
    expect(extrait.texte.endsWith('.…')).toBe(false)
    expect(extrait.texte.length).toBeLessThanOrEqual(EXTRAIT_A_DEUX + 1)
    expect(extrait.texte.startsWith('Et le Verbe')).toBe(true)
  })

  it('un passage coupé perd ses marques plutôt que d’en laisser une orpheline', () => {
    const long = `*${'verbum '.repeat(80)}*`
    const extrait = extraitFavorite(long, 100)
    expect(extrait.texte).not.toContain('*')
  })

  it('au-delà du seuil du gris, le passage se dit dense', () => {
    const texte = 'mot '.repeat(Math.ceil(SEUIL_GRIS / 4) + 5).trim()
    expect(extraitFavorite(texte, 480).dense).toBe(true)
  })

  it('les guillemets internes deviennent anglais', () => {
    expect(extraitFavorite('Il dit « viens »', 100).texte).toBe('Il dit “viens”.')
  })
})
