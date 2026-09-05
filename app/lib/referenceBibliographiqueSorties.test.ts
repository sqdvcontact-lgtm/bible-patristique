import { describe, it, expect } from 'vitest'

import { fragmentsReference } from './referenceBibliographique'
import {
  baliseFragments,
  echapperHtml,
  fragmentsSansPointFinal,
  htmlFragments,
  texteFragments,
  typographieFragment,
} from './referenceBibliographiqueSorties'
import { noticeDUneOeuvre } from './noticeOeuvre'

const OEUVRE = {
  auteur: 'Augustin d’Hippone',
  titre: 'Du symbole',
  sousTitre: 'Discours adressé aux catéchumènes',
  editeur: 'Louis Guérin',
  ville: 'Bar-le-Duc',
  datePublication: '1868',
}

const fragments = () => fragmentsReference(noticeDUneOeuvre(OEUVRE))

describe('typographieFragment', () => {
  it('courbe l’apostrophe', () => {
    expect(typographieFragment("L'Idée centrale")).toBe('L’Idée centrale')
  })
  it('convertit le TYPE d’une espace déjà là, sans en ajouter', () => {
    expect(typographieFragment('assertore : disputatio')).toBe('assertore : disputatio')
    expect(typographieFragment('assertore: disputatio')).toBe('assertore: disputatio')
  })
})

describe('fragmentsSansPointFinal', () => {
  it('retire le point que le moteur a posé', () => {
    const avec = fragments()
    expect(avec[avec.length - 1].texte).toBe('.')
    const sans = fragmentsSansPointFinal(avec)
    expect(sans).toHaveLength(avec.length - 1)
    expect(texteFragments(sans).endsWith('1868')).toBe(true)
  })

  it('ne touche pas à la ponctuation d’une DONNÉE', () => {
    const interrogatif = fragmentsReference(noticeDUneOeuvre({
      titre: 'Où en est la question biblique ?',
    }))
    const dernier = interrogatif[interrogatif.length - 1]
    expect(dernier.champ).toBe('titre')
    expect(fragmentsSansPointFinal(interrogatif)).toHaveLength(interrogatif.length)
  })

  it('rend une liste vide sur une notice sans titre', () => {
    expect(fragmentsSansPointFinal(fragmentsReference(noticeDUneOeuvre({ ville: 'Paris' })))).toEqual([])
  })
})

describe('texteFragments', () => {
  it('rend ce que le lecteur lit, sans sa composition', () => {
    expect(texteFragments(fragments()))
      .toBe('Augustin d’Hippone, Du symbole. Discours adressé aux catéchumènes, Bar-le-Duc, Louis Guérin, 1868.')
  })
})

describe('htmlFragments', () => {
  it('réunit les fragments italiques CONSÉCUTIFS en une seule course', () => {
    const html = htmlFragments(fragments())
    expect(html).toContain('<em>Du symbole. Discours adressé aux catéchumènes</em>')
    // ⛔ Trois `em` accolés diraient trois intitulés là où il n’y en a qu’un.
    expect(html.match(/<em>/g)).toHaveLength(1)
  })

  it('écrit les petites capitales en style inline, faute de feuille hors du site', () => {
    expect(htmlFragments(fragments()))
      .toContain('<span style="font-variant: small-caps">Augustin d’Hippone</span>')
  })

  it('échappe le texte des fragments', () => {
    const html = htmlFragments(fragmentsReference(noticeDUneOeuvre({ titre: 'Foi & <raison>' })))
    expect(html).toContain('<em>Foi &amp; &lt;raison&gt;</em>')
  })
})

describe('baliseFragments', () => {
  it('marque l’italique par des astérisques, l’intitulé entier d’un seul tenant', () => {
    expect(baliseFragments(fragmentsSansPointFinal(fragments())))
      .toBe('Augustin d’Hippone, *Du symbole. Discours adressé aux catéchumènes*, Bar-le-Duc, Louis Guérin, 1868')
  })

  it('laisse les petites capitales sans marque : le balisage n’en a pas', () => {
    expect(baliseFragments(fragments())).toContain('Augustin d’Hippone,')
  })
})

describe('echapperHtml', () => {
  it('échappe l’esperluette et les chevrons, et rien d’autre', () => {
    expect(echapperHtml('a & <b> "c"')).toBe('a &amp; &lt;b&gt; "c"')
  })
})
