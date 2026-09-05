import { describe, it, expect } from 'vitest'
import {
  convertirGuillemetsInternes,
  resserrerTiretsAnnees,
  normaliserPonctuationFinale,
  capitaliserInitiale,
  preparerTexteCitation,
  citationPatristique,
  citationBiblique,
} from './citation'
import { SEPARATEUR_COEDITEURS } from './editeursNormalisation'
import { GUILLEMET_FERMANT, GUILLEMET_OUVRANT } from './referenceBibliographique'

describe('convertirGuillemetsInternes', () => {
  it('remplace les guillemets français internes par des guillemets anglais', () => {
    expect(convertirGuillemetsInternes('Il a dit « bonjour »')).toBe('Il a dit “bonjour”')
  })
  it('gère la fine insécable et l’insécable dans les guillemets', () => {
    expect(convertirGuillemetsInternes('« mot »')).toBe('“mot”')
  })
})

describe('resserrerTiretsAnnees', () => {
  it('resserre le demi-cadratin espacé', () => {
    expect(resserrerTiretsAnnees('1984 – 1986')).toBe('1984-1986')
  })
  it('resserre le cadratin et le trait d’union espacés', () => {
    expect(resserrerTiretsAnnees('1984 — 1986')).toBe('1984-1986')
    expect(resserrerTiretsAnnees('1984 - 1986')).toBe('1984-1986')
  })
  it('laisse « Vers 396 – Vers 399 » intact (pas chiffre-tiret-chiffre)', () => {
    expect(resserrerTiretsAnnees('Vers 396 – Vers 399')).toBe('Vers 396 – Vers 399')
  })
})

describe('normaliserPonctuationFinale', () => {
  it('remplace une virgule finale par un point', () => {
    expect(normaliserPonctuationFinale('au commencement,')).toBe('au commencement.')
  })
  it('remplace un point-virgule et un deux-points finals par un point', () => {
    expect(normaliserPonctuationFinale('ainsi ;')).toBe('ainsi.')
    expect(normaliserPonctuationFinale('ceci :')).toBe('ceci.')
  })
  it('remplace des points de suspension finals par un point', () => {
    expect(normaliserPonctuationFinale('la fin…')).toBe('la fin.')
  })
  it('conserve le point d’interrogation et d’exclamation', () => {
    expect(normaliserPonctuationFinale('vraiment ?')).toBe('vraiment ?')
    expect(normaliserPonctuationFinale('quelle joie !')).toBe('quelle joie !')
  })
  it('ajoute un point en l’absence de ponctuation', () => {
    expect(normaliserPonctuationFinale('la paix')).toBe('la paix.')
  })
  it('conserve la parenthèse/le crochet fermant et ajoute un point', () => {
    expect(normaliserPonctuationFinale('(cf. Jn 1)')).toBe('(cf. Jn 1).')
    expect(normaliserPonctuationFinale('[sic]')).toBe('[sic].')
  })
  it('n’ajoute pas de point en double', () => {
    expect(normaliserPonctuationFinale('déjà.')).toBe('déjà.')
  })
})

describe('citationPatristique', () => {
  const info = {
    auteur: 'Augustin',
    titre: 'Les Confessions',
    tradAuteur: 'Joseph Trabucco',
    editeur: 'Garnier',
    datePublication: '1937',
  }
  it('met le titre en italique dans la forme HTML', () => {
    const { html } = citationPatristique('au commencement,', info)
    expect(html).toContain('<em>Les Confessions</em>')
  })
  it('produit une forme plein-texte sans balise, titre non italique', () => {
    const { texte } = citationPatristique('au commencement,', info)
    expect(texte).toContain('Les Confessions')
    expect(texte).not.toContain('<em>')
    expect(texte.startsWith('Augustin, Les Confessions, trad. Joseph Trabucco, Garnier')).toBe(true)
  })
  it('normalise la ponctuation finale ET capitalise l’initiale du passage cité', () => {
    const { texte } = citationPatristique('au commencement,', info)
    expect(texte.endsWith('Au commencement. »')).toBe(true)
  })
  it('resserre une fourchette de dates', () => {
    const { texte } = citationPatristique('paix', { ...info, datePublication: '1984-1986' })
    expect(texte).toContain('1984-1986')
    expect(texte).not.toContain('1984 – 1986')
  })
  // ── Depuis le 5 septembre 2026, la référence vient du MOTEUR bibliographique ──
  it('compose dans l’ordre du moteur : trad., collection, lieu, éditeur, date', () => {
    const { texte } = citationPatristique('paix', {
      auteur: 'Augustin d’Hippone', titre: 'La Cité de Dieu',
      tradAuteur: 'H. Barreau ; M. Charpentier', editeur: 'Louis Vivès',
      collection: 'Œuvres complètes de saint Augustin', ville: 'Paris',
      datePublication: '1870 – 1873',
    })
    expect(texte.startsWith(
      'Augustin d’Hippone, La Cité de Dieu, trad. H. Barreau et M. Charpentier, '
      + 'coll. ' + GUILLEMET_OUVRANT + 'Œuvres complètes de saint Augustin' + GUILLEMET_FERMANT
      + ', Paris, Louis Vivès, 1870-1873, disponible sur le site Corpus Scriptura : ',
    )).toBe(true)
  })
  it('joint deux maisons par la barre à fines, jamais par le point-virgule du catalogue', () => {
    const { texte } = citationPatristique('paix', { ...info, editeur: 'Veuve Jean Camusat ; Pierre Le Petit' })
    expect(texte).toContain('Veuve Jean Camusat' + SEPARATEUR_COEDITEURS + 'Pierre Le Petit')
    expect(texte).not.toContain('Camusat ; Pierre')
  })
  it('compose l’auteur en petites capitales dans la forme HTML', () => {
    const { html } = citationPatristique('paix', info)
    expect(html).toContain('<span style="font-variant: small-caps">Augustin</span>')
  })
  it('⛔ le point final de la notice tombe : la phrase continue', () => {
    const { texte } = citationPatristique('paix', info)
    expect(texte).not.toContain('1937. disponible')
    expect(texte).toContain('1937, disponible sur le site Corpus Scriptura')
  })
  it('sans titre, la citation garde sa provenance et son passage', () => {
    const { texte } = citationPatristique('paix', {})
    expect(texte).toBe('disponible sur le site Corpus Scriptura : « Paix. »')
  })
})

describe('capitaliserInitiale', () => {
  it('capitalise la première lettre quand elle est minuscule', () => {
    expect(capitaliserInitiale('au commencement')).toBe('Au commencement')
  })
  it('laisse intacte une initiale déjà capitale', () => {
    expect(capitaliserInitiale('Au commencement')).toBe('Au commencement')
  })
  it('saute les marques de tête (guillemets, parenthèses, espaces)', () => {
    expect(capitaliserInitiale('“bonjour”')).toBe('“Bonjour”')
    expect(capitaliserInitiale('(voir plus haut)')).toBe('(Voir plus haut)')
    expect(capitaliserInitiale('  puis vint')).toBe('  Puis vint')
  })
  it('saute une balise d’enrichissement sans la casser', () => {
    expect(capitaliserInitiale('<i>mot</i> suivant')).toBe('<i>Mot</i> suivant')
  })
  it('ne touche pas un début non alphabétique', () => {
    expect(capitaliserInitiale('1 chiffre')).toBe('1 chiffre')
  })
})

describe('preparerTexteCitation', () => {
  it('convertit, normalise la fin ET capitalise l’initiale', () => {
    expect(preparerTexteCitation('au commencement Dieu créa')).toBe('Au commencement Dieu créa.')
  })
})

describe('citationBiblique', () => {
  it('encadre le verset et ajoute la référence, ponctuation normalisée', () => {
    expect(citationBiblique('Au commencement Dieu créa', 'Gn 1, 1'))
      .toBe('« Au commencement Dieu créa. » (Gn 1, 1)')
  })
})
