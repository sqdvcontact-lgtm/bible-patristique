import { describe, expect, it } from 'vitest'

import { marquerLacunesDuTemoin, MARQUEUR_LACUNE, rendreMarqueurs899 } from './marqueurs899'

const FINE = ' '   // espace fine insécable U+202F
const NBSP = ' '   // espace insécable U+00A0

// Réduit un nœud React (string | élément) à une forme comparable :
//   texte normal → { t: 'texte', v }
//   marqueur     → { t: 'marque', titre, texte }
function reduire(noeud: unknown): { t: string; v?: string; titre?: string; texte?: unknown } {
  if (typeof noeud === 'string') return { t: 'texte', v: noeud }
  const props = (noeud as { props?: { title?: string; children?: unknown } }).props ?? {}
  return { t: 'marque', titre: props.title, texte: props.children }
}

function reduireTout(resultat: unknown) {
  return Array.isArray(resultat) ? resultat.map(reduire) : reduire(resultat)
}

describe('rendreMarqueurs899', () => {
  it('laisse le texte sans marqueur intact (chaîne simple)', () => {
    expect(rendreMarqueurs899('Li rois dauid estoit ia uielz.')).toBe('Li rois dauid estoit ia uielz.')
  })

  it('rend une lecture incertaine complète en span discret, sans crochet brut', () => {
    const out = reduireTout(rendreMarqueurs899('a [lecture incertaine : b c] d')) as ReturnType<typeof reduire>[]
    expect(out).toEqual([
      { t: 'texte', v: 'a ' },
      { t: 'marque', titre: 'Lecture incertaine (transcription du manuscrit)', texte: 'b c' },
      { t: 'texte', v: ' d' },
    ])
  })

  it('gère un marqueur OUVERT non fermé (fin de verset) sans crochet brut', () => {
    const out = reduireTout(rendreMarqueurs899('Viue adonias li[lecture incertaine : rois. Mes')) as ReturnType<typeof reduire>[]
    expect(out).toEqual([
      { t: 'texte', v: 'Viue adonias li' },
      { t: 'marque', titre: 'Lecture incertaine (transcription du manuscrit)', texte: 'rois. Mes' },
    ])
  })

  it('gère un verset qui COMMENCE dans une portée (fermeture orpheline)', () => {
    const out = reduireTout(rendreMarqueurs899('il na pas apele moi ne sa] doch le prouoire.')) as ReturnType<typeof reduire>[]
    expect(out).toEqual([
      { t: 'marque', titre: 'Lecture incertaine (transcription du manuscrit)', texte: 'il na pas apele moi ne sa' },
      { t: 'texte', v: ' doch le prouoire.' },
    ])
  })

  it('rend une lacune comme jalon discret et MASQUE le motif', () => {
    const out = reduireTout(rendreMarqueurs899('a [lacune : trou de vélin] b')) as ReturnType<typeof reduire>[]
    expect(out).toEqual([
      { t: 'texte', v: 'a ' },
      { t: 'marque', titre: 'Lacune matérielle du manuscrit', texte: MARQUEUR_LACUNE },
      { t: 'texte', v: ' b' },
    ])
  })

  it('insère une ESPACE FINE (U+202F) quand la lacune coupe un mot', () => {
    // « por[lacune : déchirure]er » → le marqueur ne se colle pas au fragment resté, mais
    // n'en est pas non plus séparé par une espace pleine : une fine de chaque côté.
    const out = reduireTout(rendreMarqueurs899('por[lacune : déchirure]er')) as ReturnType<typeof reduire>[]
    expect(out).toEqual([
      { t: 'texte', v: 'por' },
      { t: 'texte', v: ' ' },
      { t: 'marque', titre: 'Lacune matérielle du manuscrit', texte: MARQUEUR_LACUNE },
      { t: 'texte', v: ' ' },
      { t: 'texte', v: 'er' },
    ])
  })

  // ── Typographie : la colonne du manuscrit n'est plus l'exception ────────────────────
  // Toute la lecture du site passe par `normaliserEspaces` (à l'entrée de
  // `rendreTexteEnrichi`), mais TR0009 ne passe pas par lui et arrivait donc brut : 556
  // versets du témoin portaient une espace ORDINAIRE, sécable, devant leur deux-points.
  it('harmonise les espaces du texte lisible — le deux-points prend son insécable', () => {
    expect(rendreMarqueurs899('Et dist nostre sire : que as tu fait')).toBe(`Et dist nostre sire${NBSP}: que as tu fait`)
    expect(rendreMarqueurs899('quoi ? uraiement !')).toBe(`quoi${FINE}? uraiement${FINE}!`)
  })

  // ⛔ La normalisation ne doit PAS aveugler l'automate : elle touche aussi l'espace qui
  // précède le deux-points DU MARQUEUR. `\s` couvre l'insécable et la fine, le marqueur
  // reste donc reconnu — et son motif reste masqué. Ce cas l'éprouve directement, en
  // donnant au marqueur une insécable dès la source.
  it('reconnaît un marqueur dont l’espace interne est déjà insécable', () => {
    const out = reduireTout(rendreMarqueurs899(`a [lecture incertaine${NBSP}: b c] d`)) as ReturnType<typeof reduire>[]
    expect(out).toEqual([
      { t: 'texte', v: 'a ' },
      { t: 'marque', titre: 'Lecture incertaine (transcription du manuscrit)', texte: 'b c' },
      { t: 'texte', v: ' d' },
    ])
  })

  // ── La lacune NUE « […] » ────────────────────────────────────────────────────────
  // Elle se ferme d’elle-même : c’est la donnée qui porte déjà la marque, il n’y a
  // aucun motif à masquer, et le mode courant n’en est pas changé.
  it('rend une lacune NUE au milieu d’un verset', () => {
    const out = reduireTout(rendreMarqueurs899('Après qu’il eut mangé et bu […]')) as ReturnType<typeof reduire>[]
    expect(out).toEqual([
      { t: 'texte', v: 'Après qu’il eut mangé et bu ' },
      { t: 'marque', titre: 'Lacune matérielle du manuscrit', texte: MARQUEUR_LACUNE },
    ])
  })

  // ⛔ Le crochet fermant d’une lacune nue n’est PAS une fermeture orpheline : un verset
  // qui s’ouvre sur elle basculait tout entier en lecture incertaine.
  it('un verset qui COMMENCE par une lacune nue garde son texte en clair', () => {
    const out = reduireTout(rendreMarqueurs899('[…] et il prenait ce qu’il pouvait')) as ReturnType<typeof reduire>[]
    expect(out).toEqual([
      { t: 'marque', titre: 'Lacune matérielle du manuscrit', texte: MARQUEUR_LACUNE },
      { t: 'texte', v: ' et il prenait ce qu’il pouvait' },
    ])
  })

  it('insère une fine de chaque côté quand la lacune nue coupe un mot', () => {
    const out = reduireTout(rendreMarqueurs899('por[…]er')) as ReturnType<typeof reduire>[]
    expect(out).toEqual([
      { t: 'texte', v: 'por' },
      { t: 'texte', v: FINE },
      { t: 'marque', titre: 'Lacune matérielle du manuscrit', texte: MARQUEUR_LACUNE },
      { t: 'texte', v: FINE },
      { t: 'texte', v: 'er' },
    ])
  })

  // ── Le texte NON recomposé (traduction moderne du même témoin) ───────────────────
  // ⛔ Elle porte 85 RESTITUTIONS entre crochets, qui sont l’usage philologique et
  // doivent s’imprimer telles quelles : on ne reconnaît que la lacune, par paires.
  describe('marquerLacunesDuTemoin', () => {
    it('laisse intact un texte sans lacune', () => {
      expect(marquerLacunesDuTemoin('Nabal répondit aux serviteurs', 't0')).toBe('Nabal répondit aux serviteurs')
    })

    it('ne touche NI une restitution NI une lecture incertaine', () => {
      const texte = 'Le Seigneur [les eut frappés] et [lecture incertaine : il partit]'
      expect(marquerLacunesDuTemoin(texte, 't1')).toBe(texte)
    })

    it('met en forme la lacune nue et la lacune motivée', () => {
      const out = reduireTout(marquerLacunesDuTemoin('Le Seigneur [lacune : déchirure] hors du paradis […]', 't2')) as ReturnType<typeof reduire>[]
      expect(out).toEqual([
        { t: 'texte', v: 'Le Seigneur ' },
        { t: 'marque', titre: 'Lacune matérielle du manuscrit', texte: MARQUEUR_LACUNE },
        { t: 'texte', v: ' hors du paradis ' },
        { t: 'marque', titre: 'Lacune matérielle du manuscrit', texte: MARQUEUR_LACUNE },
      ])
    })

    it('sépare d’une fine la lacune qui coupe un mot', () => {
      const out = reduireTout(marquerLacunesDuTemoin('por[lacune : déchirure]er', 't3')) as ReturnType<typeof reduire>[]
      expect(out).toEqual([
        { t: 'texte', v: 'por' },
        { t: 'texte', v: FINE },
        { t: 'marque', titre: 'Lacune matérielle du manuscrit', texte: MARQUEUR_LACUNE },
        { t: 'texte', v: FINE },
        { t: 'texte', v: 'er' },
      ])
    })
  })
  // Le tokeniseur se lit par INDICES : une normalisation qui changerait la longueur
  // décalerait tout ce qui suit. Celle-ci est caractère pour caractère.
  it('ne change pas la longueur du texte', () => {
    const source = 'il dist : uien ; et il uint ! por quoi ?'
    expect(rendreMarqueurs899(source)).toHaveLength(source.length)
  })
})
