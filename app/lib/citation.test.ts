import { describe, it, expect } from 'vitest'
import {
  convertirGuillemetsInternes,
  resserrerTiretsAnnees,
  normaliserPonctuationFinale,
  capitaliserInitiale,
  preparerTexteCitation,
  citationPatristique,
  citationBiblique,
  fragmentsReferenceCanoniqueOeuvre,
  referenceCanoniqueOeuvre,
} from './citation'
import { SEPARATEUR_COEDITEURS } from './editeursNormalisation'
import { GUILLEMET_FERMANT, GUILLEMET_OUVRANT } from './referenceBibliographique'
import { texteFragments } from './referenceBibliographiqueSorties'
import { normaliserEspaces } from './typographie'

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
  // ⛔ Règle arrêtée par l'auteur le 23 septembre 2026 : la ponctuation finale TOMBE et
  // RIEN ne la remplace ; le point de la phrase se pose après la référence.
  it('retire une virgule finale sans rien mettre à la place', () => {
    expect(normaliserPonctuationFinale('au commencement,')).toBe('au commencement')
  })
  it('retire un point-virgule et un deux-points finals', () => {
    expect(normaliserPonctuationFinale('ainsi ;')).toBe('ainsi')
    expect(normaliserPonctuationFinale('ceci :')).toBe('ceci')
  })
  it('retire des points de suspension finals', () => {
    expect(normaliserPonctuationFinale('la fin…')).toBe('la fin')
  })
  it('conserve le point d’interrogation et d’exclamation', () => {
    expect(normaliserPonctuationFinale('vraiment ?')).toBe('vraiment ?')
    expect(normaliserPonctuationFinale('quelle joie !')).toBe('quelle joie !')
  })
  it('⛔ n’ajoute AUCUN point en l’absence de ponctuation', () => {
    expect(normaliserPonctuationFinale('la paix')).toBe('la paix')
  })
  it('conserve la parenthèse et le crochet fermants, sans rien ajouter', () => {
    expect(normaliserPonctuationFinale('(cf. Jn 1)')).toBe('(cf. Jn 1)')
    expect(normaliserPonctuationFinale('[sic]')).toBe('[sic]')
  })
  it('retire le point final', () => {
    expect(normaliserPonctuationFinale('déjà.')).toBe('déjà')
  })
  // ⚠️ La ponctuation se juge SOUS les marques d'enrichissement, qui se reposent telles
  // quelles : chez Sacy, un verset s'achève souvent sur un mot ajouté, en italique.
  it('juge la ponctuation sous une balise d’italique fermante', () => {
    expect(normaliserPonctuationFinale('le verset <i>ajouté.</i>')).toBe('le verset <i>ajouté</i>')
    expect(normaliserPonctuationFinale('le verset <i>ajouté</i>.')).toBe('le verset <i>ajouté</i>')
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
    expect(texte.endsWith('Au commencement ».')).toBe(true)
  })
  it('⛔ met les passages qu’un titre sépare sous la même référence, chacun entre ses guillemets', () => {
    const { texte, html } = citationPatristique(['fin du livre premier,', 'début du second'], info)
    expect(texte.endsWith('« Fin du livre premier ».\n\n« Début du second ».')).toBe(true)
    expect(texte.split('Augustin')).toHaveLength(2)
    expect(html).toContain(' ».<br><br>« ')
  })
  it('un seul passage en liste rend la forme d’un passage seul', () => {
    expect(citationPatristique(['au commencement,'], info)).toEqual(citationPatristique('au commencement,', info))
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
  it('compose l’auteur en romain dans la forme HTML', () => {
    const { html } = citationPatristique('paix', info)
    expect(html).toContain('Augustin')
    expect(html).not.toContain('font-variant: small-caps')
  })
  it('⛔ le point final de la notice tombe : la phrase continue', () => {
    const { texte } = citationPatristique('paix', info)
    expect(texte).not.toContain('1937. disponible')
    expect(texte).toContain('1937, disponible sur le site Corpus Scriptura')
  })
  it('sans titre, la citation garde sa provenance et son passage', () => {
    const { texte } = citationPatristique('paix', {})
    expect(texte).toBe('disponible sur le site Corpus Scriptura : « Paix ».')
  })
})

describe('referenceCanoniqueOeuvre', () => {
  it('reprend la notice canonique et la provenance, sans passage cité', () => {
    expect(referenceCanoniqueOeuvre({
      auteur: 'Augustin d’Hippone',
      titre: 'Les Confessions',
      tradAuteur: 'Joseph Trabucco',
      editeur: 'Garnier',
      datePublication: '1937',
    })).toBe(
      'Augustin d’Hippone, Les Confessions, trad. Joseph Trabucco, Garnier, 1937, '
      + 'disponible sur le site Corpus Scriptura.',
    )
  })

  it('ne laisse ni deux-points ni guillemets d’une citation de passage', () => {
    const reference = referenceCanoniqueOeuvre({ auteur: 'Augustin', titre: 'Les Confessions' })
    expect(reference).toBe('Augustin, Les Confessions, disponible sur le site Corpus Scriptura.')
    expect(reference).not.toContain(' : ')
    expect(reference).not.toContain('«')
  })
})

describe('fragmentsReferenceCanoniqueOeuvre', () => {
  const oeuvre = {
    auteur: 'Augustin d’Hippone',
    titre: 'Les Confessions',
    tradAuteur: 'Joseph Trabucco',
    editeur: 'Garnier',
    datePublication: '1937',
  }

  it('⛔ UNE SEULE ÉCRITURE : les fragments rendent, au mot près, ce que la copie emporte', () => {
    expect(texteFragments(fragmentsReferenceCanoniqueOeuvre(oeuvre)))
      .toBe(referenceCanoniqueOeuvre(oeuvre))
  })

  it('le TITRE porte la composition italique, que l’écran balise', () => {
    const titre = fragmentsReferenceCanoniqueOeuvre(oeuvre).find(f => f.champ === 'titre')
    expect(titre?.composition).toBe('italique')
    expect(titre?.texte).toBe('Les Confessions')
  })

  it('la mention du site ferme la phrase, sans champ ni style', () => {
    const dernier = fragmentsReferenceCanoniqueOeuvre(oeuvre).at(-1)
    expect(dernier?.champ).toBeNull()
    expect(dernier?.style).toBeNull()
    expect(dernier?.texte).toBe(', disponible sur le site Corpus Scriptura.')
  })

  it('sans notice, la mention ouvre la phrase et ne prend pas de séparateur', () => {
    const fragments = fragmentsReferenceCanoniqueOeuvre({ auteur: null, titre: null })
    expect(fragments).toHaveLength(1)
    expect(fragments[0].texte).toBe('disponible sur le site Corpus Scriptura.')
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
    expect(preparerTexteCitation('au commencement Dieu créa')).toBe('Au commencement Dieu créa')
  })
})

describe('citationBiblique', () => {
  it('⛔ encadre le verset, et pose le point APRÈS la référence', () => {
    expect(citationBiblique('Au commencement Dieu créa', 'Gn 1, 1').texte)
      .toBe('« Au commencement Dieu créa » (Gn 1, 1).')
  })
  // ⚠️ L'attente se COMPOSE par `normaliserEspaces`, jamais tapée : la fine insécable
  // devant le point d'interrogation ne se distingue pas d'une espace ordinaire à la
  // lecture, et le dépôt en a déjà perdu ainsi.
  it('garde le point d’interrogation dans les guillemets, et ferme après la référence', () => {
    const source = 'Où es-tu ?'
    expect(citationBiblique(source, 'Gn 3, 9').texte)
      .toBe('« ' + normaliserEspaces(source) + ' » (Gn 3, 9).')
  })
  // ⛔ Le texte biblique porte son italique en BALISES : en plein-texte elles tombent,
  // en collage riche elles deviennent une vraie italique. Jamais de balise en clair.
  it('⛔ n’emporte aucune balise en plein-texte, et rend l’italique en HTML', () => {
    const { texte, html } = citationBiblique('Et <i>Dieu</i> vit que cela était bon.', 'Gn 1, 4')
    expect(texte).toBe('« Et Dieu vit que cela était bon » (Gn 1, 4).')
    expect(html).toBe('« Et <i>Dieu</i> vit que cela était bon » (Gn 1, 4).')
  })
})

// ── Une citation ne porte pas d'appel de note (2026-09-10) ────────────────────
// ⛔ Demande de l'auteur : « sur les copier/coller, exclure les numéros d'appels de
// note de la citation ». Un appel est un RENVOI vers un apparat que le presse-papiers
// n'emporte pas : collé ailleurs, il devient un nombre qui ne mène nulle part.
//
// ⚠️ Ces gardes portent sur la PORTE, `preparerTexteCitation`, par où passent les six
// boutons de copie du site et l'affichage d'un prélèvement. Le retrait lui-même est
// éprouvé dans `appelNote.test.ts`.
describe('les appels de note ne partent pas dans le presse-papiers', () => {
  const info = { auteur: 'Augustin', titre: 'Confessions' }

  it('retire l’appel du texte préparé', () => {
    expect(preparerTexteCitation('il le dit[[12]].')).toBe('Il le dit')
  })

  it('n’en laisse aucun dans une citation patristique, plein-texte comme HTML', () => {
    const { texte, html } = citationPatristique('au commencement[[3]], Dieu créa[[4]].', info)
    expect(texte).not.toMatch(/\[\[/)
    expect(html).not.toMatch(/\[\[/)
    expect(texte).toContain('Au commencement, Dieu créa ».')
  })

  it('n’en laisse aucun dans une citation biblique', () => {
    expect(citationBiblique('au commencement[[1]]', 'Gn 1, 1').texte)
      .toBe('« Au commencement » (Gn 1, 1).')
  })

  // ⛔ L'ORDRE compte, et ces deux gardes le tiennent : l'appel tombe JUSTE AVANT la
  // ponctuation finale et parfois en tête. Laissé en place, il ferait lire « ] » comme
  // dernier signe (un point s'ajouterait APRÈS le marqueur), et le crochet de tête
  // ferait manquer l'initiale à capitaliser.
  it('capitalise l’initiale même quand un appel ouvre le passage', () => {
    expect(preparerTexteCitation('[[7]]au commencement')).toBe('Au commencement')
  })

  it('⛔ ne laisse pas l’appel tenir lieu de fin de phrase', () => {
    expect(preparerTexteCitation('il le dit[[12]]')).toBe('Il le dit')
  })
})
