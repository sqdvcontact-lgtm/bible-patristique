import { describe, expect, it } from 'vitest'
import {
  BORD_DEFILEMENT_PX, SEUIL_LASSO_PX, VITESSE_DEFILEMENT_MAX_PX,
  cleDeLassoValide, clesTouchees, colonnesTouchees, combinerSelection, depasseLeSeuil, feuilleDeSurbrillance,
  citationsDeLaSelection, memesCles, peutOuvrirLeLasso, rectangleEntre, seCroisent,
  surUneBarreDeDefilement, traceVisible, vitesseDeDefilement,
  type BoiteDefilante, type NoeudDom,
} from './lasso'

describe('rectangleEntre', () => {
  it('rend le même rectangle quel que soit le sens du geste', () => {
    const attendu = { left: 10, top: 20, right: 110, bottom: 220 }
    expect(rectangleEntre({ x: 10, y: 20 }, { x: 110, y: 220 })).toEqual(attendu)
    expect(rectangleEntre({ x: 110, y: 220 }, { x: 10, y: 20 })).toEqual(attendu)
    expect(rectangleEntre({ x: 110, y: 20 }, { x: 10, y: 220 })).toEqual(attendu)
  })
})

describe('seCroisent', () => {
  const ligne = { left: 100, top: 100, right: 400, bottom: 120 }

  it('prend une ligne que le lasso couvre en partie', () => {
    expect(seCroisent({ left: 0, top: 90, right: 150, bottom: 110 }, ligne)).toBe(true)
  })

  it('ne prend pas une boîte qui touche seulement le bord', () => {
    expect(seCroisent({ left: 0, top: 120, right: 500, bottom: 200 }, ligne)).toBe(false)
    expect(seCroisent({ left: 400, top: 0, right: 500, bottom: 500 }, ligne)).toBe(false)
  })

  it('prend la ligne qu’un lasso PLAT traverse', () => {
    expect(seCroisent({ left: 0, top: 110, right: 500, bottom: 110 }, ligne)).toBe(true)
  })

  it('ne prend rien à l’écart', () => {
    expect(seCroisent({ left: 0, top: 0, right: 50, bottom: 50 }, ligne)).toBe(false)
  })
})

describe('depasseLeSeuil', () => {
  it('garde un clic tant que le pointeur reste près de son départ', () => {
    expect(depasseLeSeuil({ x: 0, y: 0 }, { x: SEUIL_LASSO_PX - 1, y: SEUIL_LASSO_PX - 1 })).toBe(false)
  })

  it('fait un geste dès qu’un axe franchit le seuil', () => {
    expect(depasseLeSeuil({ x: 0, y: 0 }, { x: 0, y: SEUIL_LASSO_PX })).toBe(true)
    expect(depasseLeSeuil({ x: 0, y: 0 }, { x: -SEUIL_LASSO_PX, y: 0 })).toBe(true)
  })
})

describe('vitesseDeDefilement', () => {
  const haut = 60
  const bas = 900

  it('ne fait rien au milieu', () => {
    expect(vitesseDeDefilement(480, haut, bas, 300)).toBe(0)
  })

  it('descend près du bas quand le geste descend, et remonte près du haut quand il remonte', () => {
    expect(vitesseDeDefilement(bas - 2, haut, bas, 300)).toBeGreaterThan(0)
    expect(vitesseDeDefilement(haut + 2, haut, bas, 300)).toBeLessThan(0)
  })

  it('ne défile PAS contre le sens du geste', () => {
    // Parti près du haut pour descendre : le bord du haut ne compte pas.
    expect(vitesseDeDefilement(haut + 10, haut, bas, haut + 5)).toBe(0)
    // Parti près du bas pour remonter : le bord du bas ne compte pas.
    expect(vitesseDeDefilement(bas - 10, haut, bas, bas - 5)).toBe(0)
  })

  it('croît avec la profondeur dans la bande, et plafonne hors de la zone', () => {
    const entree = vitesseDeDefilement(bas - BORD_DEFILEMENT_PX + 4, haut, bas, 300)
    const bord = vitesseDeDefilement(bas - 1, haut, bas, 300)
    const dehors = vitesseDeDefilement(bas + 200, haut, bas, 300)
    expect(entree).toBeGreaterThanOrEqual(1)
    expect(bord).toBeGreaterThan(entree)
    expect(dehors).toBe(VITESSE_DEFILEMENT_MAX_PX)
    expect(vitesseDeDefilement(haut - 200, haut, bas, 300)).toBe(-VITESSE_DEFILEMENT_MAX_PX)
  })

  it('ne rend rien pour une zone sans hauteur', () => {
    expect(vitesseDeDefilement(10, 100, 100, 50)).toBe(0)
  })
})

describe('clesTouchees', () => {
  const cibles = [
    { cle: 1, rects: [{ left: 0, top: 0, right: 500, bottom: 20 }] },
    // Un segment sur deux lignes : il suffit d'en toucher une.
    { cle: 2, rects: [{ left: 300, top: 20, right: 500, bottom: 40 }, { left: 0, top: 40, right: 120, bottom: 60 }] },
    { cle: 3, rects: [{ left: 120, top: 40, right: 500, bottom: 60 }] },
  ]

  it('rend les clés touchées dans l’ordre des cibles', () => {
    expect(clesTouchees({ left: 0, top: 45, right: 130, bottom: 55 }, cibles)).toEqual([2, 3])
    expect(clesTouchees({ left: 0, top: 5, right: 50, bottom: 50 }, cibles)).toEqual([1, 2])
  })

  it('ne rend rien sans recouvrement', () => {
    expect(clesTouchees({ left: 600, top: 0, right: 700, bottom: 100 }, cibles)).toEqual([])
  })
})

describe('combinerSelection', () => {
  const ordre = [10, 11, 12, 13, 14]

  it('suit l’ordre de lecture, jamais celui du geste', () => {
    expect(combinerSelection([], [13, 11, 12], ordre)).toEqual([11, 12, 13])
  })

  it('ajoute à ce qu’on avait', () => {
    expect(combinerSelection([14, 10], [12], ordre)).toEqual([10, 12, 14])
  })

  it('ne répète pas une clé déjà retenue', () => {
    expect(combinerSelection([11, 12], [12, 13], ordre)).toEqual([11, 12, 13])
  })

  it('garde en queue une clé que l’ordre ne connaît plus', () => {
    expect(combinerSelection([99], [11], ordre)).toEqual([11, 99])
  })
})

describe('memesCles', () => {
  it('compare rang pour rang', () => {
    expect(memesCles([1, 2], [1, 2])).toBe(true)
    expect(memesCles([1, 2], [2, 1])).toBe(false)
    expect(memesCles([1], null)).toBe(false)
    expect(memesCles(null, null)).toBe(true)
  })
})

describe('citationsDeLaSelection', () => {
  const ordre = ['a', 'b', 'c', 'd', 'e', 'f']

  it('réunit les clés qui se suivent', () => {
    expect(citationsDeLaSelection(['a', 'b', 'c'], ordre)).toEqual([[['a', 'b', 'c']]])
  })

  it('ouvre une suite là où une clé manque, quel que soit l’ordre reçu, dans la même citation', () => {
    expect(citationsDeLaSelection(['e', 'a', 'b', 'd'], ordre)).toEqual([[['a', 'b'], ['d', 'e']]])
  })

  it('rend une liste vide pour une sélection vide', () => {
    expect(citationsDeLaSelection([], ordre)).toEqual([])
  })

  describe('⛔ un titre ouvre une autre citation', () => {
    const titreAvant = (k: string) => k === 'c'

    it('entre deux passages qui se suivent', () => {
      expect(citationsDeLaSelection(['a', 'b', 'c', 'd'], ordre, titreAvant)).toEqual([[['a', 'b']], [['c', 'd']]])
    })

    it('dans l’écart qu’une élision aurait marqué', () => {
      expect(citationsDeLaSelection(['a', 'e'], ordre, titreAvant)).toEqual([[['a']], [['e']]])
    })

    it('sur le passage d’arrivée d’un écart', () => {
      expect(citationsDeLaSelection(['a', 'c'], ordre, titreAvant)).toEqual([[['a']], [['c']]])
    })

    it('ne coupe rien quand la sélection commence au titre', () => {
      expect(citationsDeLaSelection(['c', 'd', 'f'], ordre, titreAvant)).toEqual([[['c', 'd'], ['f']]])
    })

    it('une clé inconnue ouvre sa propre citation', () => {
      expect(citationsDeLaSelection(['a', 'z', 'b'], ordre)).toEqual([[['a', 'b']], [['z']]])
    })
  })
})

// ── Le blanc ────────────────────────────────────────────────────────────────
// Un nœud de papier : juste assez de DOM pour éprouver la règle sans navigateur. Le
// sélecteur se lit terme à terme — balise, classe, attribut, attribut préfixé.
type Faux = NoeudDom & { classes: string[]; attributs: Record<string, string> }

function correspond(n: Faux, terme: string): boolean {
  const attr = /^\[([\w-]+)(?:(\^?=)"([^"]*)")?\]$/.exec(terme)
  if (attr) {
    const [, nom, operateur, valeur] = attr
    if (!(nom in n.attributs)) return false
    if (!operateur) return true
    return operateur === '=' ? n.attributs[nom] === valeur : n.attributs[nom].startsWith(valeur)
  }
  if (terme.startsWith('.')) return n.classes.includes(terme.slice(1))
  return n.tagName.toLowerCase() === terme
}

function noeud(
  tagName: string,
  { parent = null, texte = '', classes = [], attributs = {} }:
    { parent?: Faux | null; texte?: string; classes?: string[]; attributs?: Record<string, string> } = {},
): Faux {
  const n: Faux = {
    tagName: tagName.toUpperCase(),
    parentElement: parent,
    childNodes: texte ? [{ nodeType: 3, textContent: texte }] : [],
    classes,
    attributs,
    matches: (selecteur: string) => selecteur.split(',').map(s => s.trim()).some(s => correspond(n, s)),
  }
  return n
}

describe('peutOuvrirLeLasso', () => {
  const zone = noeud('main')
  const colonne = noeud('div', { parent: zone })

  it('s’ouvre dans la marge de la zone et entre deux blocs de la colonne', () => {
    expect(peutOuvrirLeLasso(zone, zone)).toBe(true)
    expect(peutOuvrirLeLasso(colonne, zone)).toBe(true)
    expect(peutOuvrirLeLasso(noeud('section', { parent: colonne }), zone)).toBe(true)
  })

  it('ne s’ouvre pas sur un texte, même dans la marge d’un paragraphe', () => {
    const paragraphe = noeud('p', { parent: colonne })
    expect(peutOuvrirLeLasso(paragraphe, zone)).toBe(false)
    expect(peutOuvrirLeLasso(noeud('span', { parent: paragraphe, texte: 'Au commencement' }), zone)).toBe(false)
    expect(peutOuvrirLeLasso(noeud('div', { parent: colonne, texte: 'Un argument' }), zone)).toBe(false)
  })

  it('ne s’ouvre pas sur une ligne de texte posée en bloc', () => {
    // Une ligne de vers est un `span` en bloc : c'est du texte, pas du blanc.
    expect(peutOuvrirLeLasso(noeud('span', { parent: colonne }), zone)).toBe(false)
  })

  it('ne s’ouvre pas dans ce qui se clique', () => {
    const bouton = noeud('button', { parent: colonne })
    expect(peutOuvrirLeLasso(noeud('div', { parent: bouton }), zone)).toBe(false)
    expect(peutOuvrirLeLasso(noeud('div', { parent: colonne, attributs: { role: 'group' } }), zone)).toBe(false)
  })

  it('ne s’ouvre pas sur une cible du lasso, que la page nomme', () => {
    const rangee = noeud('div', { parent: colonne, classes: ['verset-row'] })
    const grille = noeud('div', { parent: rangee })
    expect(peutOuvrirLeLasso(grille, zone, '.verset-row')).toBe(false)
    const segment = noeud('div', { parent: colonne, attributs: { id: 'segment-12' } })
    expect(peutOuvrirLeLasso(noeud('div', { parent: segment }), zone, '[id^="segment-"]')).toBe(false)
    // Sans consigne de la page, la même rangée vide passerait pour du blanc.
    expect(peutOuvrirLeLasso(grille, zone)).toBe(true)
  })

  it('ne s’ouvre pas hors de la zone', () => {
    const ailleurs = noeud('div', { parent: noeud('body') })
    expect(peutOuvrirLeLasso(ailleurs, zone)).toBe(false)
    expect(peutOuvrirLeLasso(null, zone)).toBe(false)
  })
})

describe('surUneBarreDeDefilement', () => {
  // Les mesures RELEVÉES sous Chrome sur le défileur de la page Bible, gouttière réservée
  // des deux côtés : boîte de 735 px à (230, 54), clientLeft 15, clientWidth 705.
  const bible: BoiteDefilante = {
    gauche: 230, haut: 54, decalageGauche: 15, decalageHaut: 0,
    largeurCliente: 705, hauteurCliente: 706,
  }

  it('laisse passer un appui dans la zone cliente, jusqu’à ses bords', () => {
    expect(surUneBarreDeDefilement({ x: 245, y: 60 }, bible)).toBe(false)
    expect(surUneBarreDeDefilement({ x: 949, y: 759 }, bible)).toBe(false)
  })

  it('reconnaît la barre à droite', () => {
    expect(surUneBarreDeDefilement({ x: 950, y: 300 }, bible)).toBe(true)
    expect(surUneBarreDeDefilement({ x: 961, y: 300 }, bible)).toBe(true)
  })

  it('reconnaît la gouttière réservée à gauche, que clientLeft compte', () => {
    expect(surUneBarreDeDefilement({ x: 233, y: 300 }, bible)).toBe(true)
  })

  it('ne voit rien sur une boîte sans barre', () => {
    const sansBarre = { gauche: 100, haut: 50, decalageGauche: 0, decalageHaut: 0, largeurCliente: 600, hauteurCliente: 400 }
    expect(surUneBarreDeDefilement({ x: 100, y: 50 }, sansBarre)).toBe(false)
    expect(surUneBarreDeDefilement({ x: 699, y: 449 }, sansBarre)).toBe(false)
  })
})

describe('traceVisible', () => {
  const bande = { left: 200, top: 60, right: 900, bottom: 800 }

  it('ramène le lasso à l’écran', () => {
    const lasso = { left: 300, top: 1100, right: 500, bottom: 1300 }
    expect(traceVisible(lasso, { x: 0, y: 1000 }, bande)).toEqual({ left: 300, top: 100, right: 500, bottom: 300 })
  })

  it('coupe la trace au bord de la bande quand le départ est sorti de la vue', () => {
    const lasso = { left: 100, top: 500, right: 500, bottom: 1300 }
    expect(traceVisible(lasso, { x: 0, y: 1000 }, bande)).toEqual({ left: 200, top: 60, right: 500, bottom: 300 })
  })

  it('ne rend rien quand il n’en reste rien', () => {
    expect(traceVisible({ left: 300, top: 0, right: 500, bottom: 900 }, { x: 0, y: 1000 }, bande)).toBeNull()
  })
})

describe('les clés et la feuille de surbrillance', () => {
  it('n’admet que ce qui tient entre deux guillemets sans les casser', () => {
    expect(cleDeLassoValide('6907057922700000000')).toBe(true)
    expect(cleDeLassoValide('GEN.1.1')).toBe(true)
    expect(cleDeLassoValide('ab"] * { x')).toBe(false)
    expect(cleDeLassoValide('')).toBe(false)
  })

  it('ne rend rien pour une sélection vide', () => {
    expect(feuilleDeSurbrillance([], 'box-shadow: none;')).toBe('')
    expect(feuilleDeSurbrillance(['  '], 'box-shadow: none;')).toBe('')
  })

  it('réunit les sélecteurs en une seule règle', () => {
    expect(feuilleDeSurbrillance(['#a', '#b'], 'box-shadow: none;')).toBe('#a,\n#b { box-shadow: none; }')
  })
})

describe('colonnesTouchees', () => {
  const colonne = (cle: string) => (cle.includes(':') ? cle.split(':')[0] : null)

  it('ne rend qu’une colonne quand la sélection reste d’un seul côté', () => {
    expect(colonnesTouchees(['TR0010:GEN.1.1', 'TR0010:GEN.1.2'], colonne)).toEqual(['TR0010'])
  })

  it('rend les deux colonnes d’un lasso tiré en travers, dans l’ordre de rencontre', () => {
    expect(colonnesTouchees(['TR0011:GEN.1.1', 'TR0010:GEN.1.1'], colonne)).toEqual(['TR0011', 'TR0010'])
  })

  it('ne compte pour aucune colonne ce que la page ne range nulle part', () => {
    expect(colonnesTouchees(['123', '456'], colonne)).toEqual([])
    expect(colonnesTouchees(['123', 'TR0010:GEN.1.1'], colonne)).toEqual(['TR0010'])
  })

  it('ne rend rien sur une sélection vide', () => {
    expect(colonnesTouchees([], colonne)).toEqual([])
  })
})
