import { describe, expect, it } from 'vitest'
import {
  accorderVisites, cadreDuSujet, decoupeDuVoile, ecrireVisites, etapesPresentes, lireVisites,
  defilementDuSujet, placerCarteVisite, traitVersSujet,
  type Cadre, type EtapeVisite,
} from './visiteGuidee'

// Un écran de bureau ordinaire, et la barre de navigation du site.
const VUE = { largeur: 1400, hauteur: 900 }
const NAVBAR = 56
const CARTE = { largeur: 336, hauteur: 160 }

const etape = (cle: string, sujet: string[]): EtapeVisite =>
  ({ cle, sujet, titre: cle, texte: [cle] })

describe('placement de la case explicative', () => {
  it('se pose à droite du sujet quand la place y est', () => {
    const cadre: Cadre = { top: 100, left: 10, width: 240, height: 90 }
    const p = placerCarteVisite({ cadre, carte: CARTE, vue: VUE, hautNavbar: NAVBAR })
    expect(p.cote).toBe('droite')
    expect(p.left).toBe(250 + 22)
  })

  it('passe à gauche quand la droite ne peut pas la recevoir', () => {
    // Le volet de droite : il touche le bord de l'écran, rien ne tient au-delà.
    const cadre: Cadre = { top: 70, left: 1000, width: 386, height: 800 }
    const p = placerCarteVisite({ cadre, carte: CARTE, vue: VUE, hautNavbar: NAVBAR })
    expect(p.cote).toBe('gauche')
    expect(p.left + CARTE.largeur).toBe(1000 - 22)
  })

  it('honore le côté demandé par le scénario quand il tient', () => {
    const cadre: Cadre = { top: 300, left: 500, width: 400, height: 60 }
    const p = placerCarteVisite({ cadre, carte: CARTE, vue: VUE, hautNavbar: NAVBAR, cote: 'dessous' })
    expect(p.cote).toBe('dessous')
    expect(p.top).toBe(360 + 22)
  })

  it('passe outre le côté demandé lorsqu’il ne tient pas', () => {
    // Un en-tête haut placé : « dessus » est demandé, mais la barre de navigation
    // ne laisse pas de quoi le loger.
    const cadre: Cadre = { top: 80, left: 500, width: 400, height: 60 }
    const p = placerCarteVisite({ cadre, carte: CARTE, vue: VUE, hautNavbar: NAVBAR, cote: 'dessus' })
    expect(p.cote).not.toBe('dessus')
  })

  it('préfère le côté où la case FAIT FACE au sujet', () => {
    // Un sujet menu contre le haut de l'écran, et une case haute. La droite peut la
    // recevoir, mais elle y glisse contre la barre de navigation et regarde deux cents
    // pixels plus bas ; le dessous la laisse presque en face. C'est le défaut relevé
    // par l'auteur le 2026-09-06 (« l'encart lumineux n'est pas bien centré »).
    const cadre: Cadre = { top: 60, left: 10, width: 120, height: 30 }
    const p = placerCarteVisite({
      cadre, carte: { largeur: 336, hauteur: 400 }, vue: VUE, hautNavbar: NAVBAR,
    })
    expect(p.cote).toBe('dessous')
  })

  it('garde le côté demandé quand deux côtés s’alignent aussi bien', () => {
    // ⛔ La tolérance existe pour cela : sans elle, trois pixels d'écart feraient
    // sauter la case d'un côté du sujet à l'autre.
    const cadre: Cadre = { top: 400, left: 600, width: 200, height: 100 }
    const p = placerCarteVisite({ cadre, carte: CARTE, vue: VUE, hautNavbar: NAVBAR, cote: 'gauche' })
    expect(p.cote).toBe('gauche')
  })

  it('ne passe jamais sous la barre de navigation ni hors de l’écran', () => {
    const cadre: Cadre = { top: 60, left: 1340, width: 50, height: 40 }
    const p = placerCarteVisite({ cadre, carte: CARTE, vue: VUE, hautNavbar: NAVBAR })
    expect(p.top).toBeGreaterThanOrEqual(NAVBAR + 14)
    expect(p.left).toBeGreaterThanOrEqual(14)
    expect(p.left + CARTE.largeur).toBeLessThanOrEqual(VUE.largeur - 14)
    expect(p.top + CARTE.hauteur).toBeLessThanOrEqual(VUE.hauteur - 14)
  })
})

describe('où poser le sujet pour que sa case tienne à côté de lui', () => {
  // Un téléphone : la case y est aussi large que la bande utile.
  const TEL = { largeur: 375, hauteur: 667 }
  // ⚠️ La hauteur est MESURÉE, non supposée : c est celle de l arret « Modes » de la
  // recherche, relevee dans le navigateur a 375 px (tmp/planche-visite-mobile.mts).
  const CARTE_TEL = { largeur: 336, hauteur: 306 }

  it('laisse le sujet au CENTRE quand un côté horizontal peut recevoir la case', () => {
    const d = defilementDuSujet({
      sujet: { top: 400, left: 20, width: 300, height: 40 },
      carte: CARTE, vue: VUE, hautNavbar: NAVBAR,
    })
    expect(d.bloc).toBe('center')
    expect(d.marge).toBe(0)
  })

  it('pose le sujet EN TÊTE quand la case ne peut aller qu’au-dessous', () => {
    const d = defilementDuSujet({
      sujet: { top: 300, left: 12, width: 351, height: 40 },
      carte: CARTE_TEL, vue: TEL, hautNavbar: NAVBAR,
    })
    expect(d.bloc).toBe('start')
    expect(d.marge).toBe(NAVBAR + 14)
  })

  it('rend au centre lorsque la bande ne peut porter ni le sujet ni la case', () => {
    const d = defilementDuSujet({
      sujet: { top: 100, left: 12, width: 351, height: 420 },
      carte: CARTE_TEL, vue: TEL, hautNavbar: NAVBAR,
    })
    expect(d.bloc).toBe('center')
  })

  it('fait vraiment de la place : la case ne recouvre plus son sujet', () => {
    const sujet = { top: 300, left: 12, width: 351, height: 40 }
    const vue = TEL
    const carte = CARTE_TEL
    const d = defilementDuSujet({ sujet, carte, vue, hautNavbar: NAVBAR })
    const apres = { ...sujet, top: d.bloc === 'start' ? d.marge : (vue.hauteur - sujet.height) / 2 }
    const cadre = cadreDuSujet({ sujet: apres, vue, hautNavbar: NAVBAR })
    const p = placerCarteVisite({ cadre, carte, vue, hautNavbar: NAVBAR })
    expect(p.cote).toBe('dessous')
    expect(p.top).toBeGreaterThanOrEqual(cadre.top + cadre.height)
    expect(p.trait).not.toBeNull()
  })

  it('le centre RECOUVRAIT le sujet — c’est ce qu’on corrige', () => {
    const sujet = { top: (667 - 40) / 2, left: 12, width: 351, height: 40 }
    const cadre = cadreDuSujet({ sujet, vue: TEL, hautNavbar: NAVBAR })
    const p = placerCarteVisite({ cadre, carte: CARTE_TEL, vue: TEL, hautNavbar: NAVBAR })
    expect(p.trait).toBeNull()
  })
})

describe('le trait qui relie les deux cases', () => {
  it('est droit quand les deux cases se font face', () => {
    const cadre: Cadre = { top: 100, left: 10, width: 240, height: 90 }
    const p = placerCarteVisite({ cadre, carte: CARTE, vue: VUE, hautNavbar: NAVBAR })
    expect(p.trait).not.toBeNull()
    expect(p.trait!.y1).toBe(p.trait!.y2)
    // D'une arête à l'autre, et rien entre les deux.
    expect(p.trait!.x1).toBe(250)
    expect(p.trait!.x2).toBe(p.left)
  })

  it('tombe lorsque les deux cases se recouvrent', () => {
    // Un volet qui occupe tout l'écran d'un téléphone : aucun côté ne peut
    // recevoir la case, elle se range dessus, et un trait n'aurait rien à relier.
    const vue = { largeur: 390, hauteur: 780 }
    const cadre: Cadre = { top: 100, left: 0, width: 390, height: 640 }
    const p = placerCarteVisite({
      cadre, carte: { largeur: 362, hauteur: 190 }, vue, hautNavbar: NAVBAR,
    })
    expect(p.trait).toBeNull()
    expect(p.top).toBeGreaterThanOrEqual(NAVBAR + 14)
  })
})

describe('la case du sujet', () => {
  it('respire autour de lui sans passer sous la barre de navigation', () => {
    const c = cadreDuSujet({
      sujet: { top: 58, left: 40, width: 200, height: 120 }, vue: VUE, hautNavbar: NAVBAR,
    })
    expect(c.top).toBe(NAVBAR + 2)
    expect(c.left).toBe(34)
    // Le bas garde son souffle : seul le haut a été retenu.
    expect(c.top + c.height).toBe(58 + 120 + 6)
  })

  it('réserve la bande de la barre, même au ras de celle-ci', () => {
    const c = cadreDuSujet({
      sujet: { top: NAVBAR, left: 40, width: 200, height: 120 }, vue: VUE, hautNavbar: NAVBAR,
    })
    expect(c.top).toBe(NAVBAR + 2)
  })

  it('ne déborde pas de l’écran', () => {
    const c = cadreDuSujet({
      sujet: { top: 700, left: 1380, width: 60, height: 300 }, vue: VUE, hautNavbar: NAVBAR,
    })
    expect(c.left + c.width).toBeLessThanOrEqual(VUE.largeur)
    expect(c.top + c.height).toBeLessThanOrEqual(VUE.hauteur)
  })
})

describe('le voile et ses trous', () => {
  const CADRE: Cadre = { top: 100, left: 200, width: 300, height: 80 }

  it('cerne l’écran entier, puis creuse les sujets', () => {
    const d = decoupeDuVoile({ vue: VUE, cadre: CADRE })
    // Trois tracés : l'anneau extérieur, le trou du sujet, et le second, à taille nulle.
    expect(d.split('M').length - 1).toBe(3)
    // ⛔ L'anneau descend d'abord, les trous partent vers la droite : les deux sens
    //    sont opposés, et c'est ce qui creuse sous la règle non nulle.
    expect(d.startsWith('M0 0L0 900L1400 900L1400 0Z')).toBe(true)
  })

  it('garde le MÊME nombre de commandes sans second sujet', () => {
    // Sans quoi le tracé ne s'interpolerait pas, et le voile sauterait d'une étape
    // à l'autre là où les cases glissent.
    const seul = decoupeDuVoile({ vue: VUE, cadre: CADRE })
    const deux = decoupeDuVoile({ vue: VUE, cadre: CADRE, cadreBis: { top: 400, left: 500, width: 120, height: 60 } })
    const compter = (s: string, c: string) => s.split(c).length - 1
    for (const c of ['M', 'L', 'A', 'Z']) expect(compter(seul, c)).toBe(compter(deux, c))
  })

  it('pose le trou absent au centre du premier, à taille nulle', () => {
    expect(decoupeDuVoile({ vue: VUE, cadre: CADRE })).toContain('M350 140L350 140')
  })
})

describe('la flèche vers un second sujet', () => {
  const carte = { top: 300, left: 600, largeur: 336, hauteur: 160 }

  it('sort par le HAUT de la case quand le sujet est au-dessus', () => {
    const t = traitVersSujet({ cadre: { top: 10, left: 640, width: 200, height: 40 }, carte })
    expect(t).not.toBeNull()
    expect(t!.y1).toBe(50)
    expect(t!.y2).toBe(carte.top)
  })

  it('sort par le CÔTÉ quand le sujet est franchement à gauche', () => {
    const t = traitVersSujet({ cadre: { top: 320, left: 100, width: 120, height: 60 }, carte })
    expect(t).not.toBeNull()
    expect(t!.x1).toBe(220)
    expect(t!.x2).toBe(carte.left)
  })
})

describe('les étapes réellement montrables', () => {
  const present = new Set(['.a', '.verset-row'])
  const trouver = (s: string) => present.has(s)

  it('écarte une étape dont aucun sujet n’est à l’écran', () => {
    const gardees = etapesPresentes([etape('un', ['.a']), etape('deux', ['.absent'])], trouver)
    expect(gardees.map(e => e.cle)).toEqual(['un'])
  })

  it('garde une étape qui retombe sur son sujet de repli', () => {
    const gardees = etapesPresentes(
      [etape('verset', ['.verset-row:has(.marque-densite)', '.verset-row'])],
      trouver,
    )
    expect(gardees.map(e => e.cle)).toEqual(['verset'])
  })
})

describe('la mémoire des visites', () => {
  it('relit ce qu’elle a écrit', () => {
    expect([...lireVisites(ecrireVisites(new Set(['bible-classique'])))]).toEqual(['bible-classique'])
  })

  it('tient un stockage vide, absent ou corrompu pour « aucune visite faite »', () => {
    expect(lireVisites(null).size).toBe(0)
    expect(lireVisites('').size).toBe(0)
    expect(lireVisites('{ pas du json').size).toBe(0)
    expect(lireVisites('{"bible":true}').size).toBe(0)
  })

  it('ne retient d’une liste que les clés qui sont des chaînes', () => {
    expect([...lireVisites('["bible-classique", 3, null]')]).toEqual(['bible-classique'])
  })
})

// Le rapprochement du POSTE et du COMPTE, à l'arrivée du profil. C'est ici qu'est la
// règle, et elle décide de ce qu'un lecteur revoit ou non : elle s'éprouve dans les
// deux sens, jamais par « ça a l'air juste ».
describe('accorderVisites — le poste et le compte', () => {
  it('rend l’UNION, et non le compte seul : deux postes ne se contredisent pas', () => {
    const { retenues } = accorderVisites(['accueil'], ['bible-classique'])
    expect([...retenues].sort()).toEqual(['accueil', 'bible-classique'])
  })

  it('confie au compte ce que le poste lui apprend', () => {
    const { aEcrireAuCompte } = accorderVisites(['accueil'], ['bible-classique'])
    expect(aEcrireAuCompte).toEqual(['accueil', 'bible-classique'])
  })

  it('n’écrit RIEN quand le compte sait déjà tout : un rapprochement muet ne coûte pas une requête', () => {
    expect(accorderVisites(['accueil'], ['accueil', 'oeuvre']).aEcrireAuCompte).toBeNull()
    expect(accorderVisites([], ['accueil']).aEcrireAuCompte).toBeNull()
  })

  it('remonte au compte les décisions d’un poste que la colonne n’a jamais portées', () => {
    expect(accorderVisites(['accueil', 'oeuvre'], null).aEcrireAuCompte).toEqual(['accueil', 'oeuvre'])
  })

  it('n’écrit pas un compte vierge quand le poste n’a rien à lui dire', () => {
    expect(accorderVisites([], null).aEcrireAuCompte).toBeNull()
    expect(accorderVisites([], null).retenues.size).toBe(0)
  })

  // ⛔ Une clé que CE build ne connaît pas est le plus souvent une visite qu'un
  // déploiement plus récent a posée. La jeter effacerait, en silence, la décision
  // prise dans un autre onglet.
  it('garde une clé qu’elle ne reconnaît pas', () => {
    const { retenues, aEcrireAuCompte } = accorderVisites([], ['visite-de-demain'])
    expect(retenues.has('visite-de-demain')).toBe(true)
    expect(aEcrireAuCompte).toBeNull()
  })

  it('écarte ce qui n’est pas une clé, des deux côtés', () => {
    const { retenues } = accorderVisites(['', 'accueil'], ['', 'oeuvre', null as unknown as string])
    expect([...retenues].sort()).toEqual(['accueil', 'oeuvre'])
  })

  it('ne redit pas au compte ce qu’il porte déjà, l’ordre fût-il autre', () => {
    expect(accorderVisites(['oeuvre', 'accueil'], ['accueil', 'oeuvre']).aEcrireAuCompte).toBeNull()
  })
})
