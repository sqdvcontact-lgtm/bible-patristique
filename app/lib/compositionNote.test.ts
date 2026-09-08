import { describe, it, expect } from 'vitest'
import { MARGE_FENETRE } from './fenetreContextuelle'
import {
  CORPS_ENCART,
  HAUTEUR_ENCART_MAX_REM,
  LARGEUR_ENCART,
  LARGEUR_ENCART_REM,
  hauteurSouhaiteeNote,
  largeurEncartPx,
  signesDeLaNote,
  styleCadreEncart,
  styleCorpsEncart,
  LARGEUR_ENCART_MIN_REM,
  STYLE_NUMERO_ENCART,
  largeurEncartMinPx,
} from './compositionNote'

const note = (...textes: string[]) => ({ blocks: textes.map(text => ({ text })) })

describe('la longueur d’une note', () => {
  it('additionne ses blocs', () => {
    expect(signesDeLaNote(note('abc', 'de'))).toBe(5)
  })

  it('lit une note héritée, qui est une chaîne', () => {
    expect(signesDeLaNote('(Is 1, 16).')).toBe(11)
  })

  it('rend zéro sur une note sans bloc', () => {
    expect(signesDeLaNote(note())).toBe(0)
  })
})

describe('la hauteur que l’encart demanderait', () => {
  // ⛔ Elle ne se mesure pas dans le document : `placerFenetre` en a besoin AVANT de
  // poser la boîte, et pour choisir son côté.
  const haut = (signes: number, racine = 16, avecIntitule = false) =>
    hauteurSouhaiteeNote({ signes, racine, avecIntitule })

  it('grandit avec la note', () => {
    expect(haut(1200)).toBeGreaterThan(haut(29))  // 29 = la médiane du corpus
  })

  it('est PLAFONNÉE : une note de dix mille signes ne fait pas basculer toutes les longues vers le haut', () => {
    expect(haut(10094)).toBe(HAUTEUR_ENCART_MAX_REM * 16)
    expect(haut(400000)).toBe(HAUTEUR_ENCART_MAX_REM * 16)
  })

  it('garde un plancher : un renvoi de treize signes reste une boîte, pas un filet', () => {
    expect(haut(0)).toBeGreaterThanOrEqual(56)
    expect(haut(13)).toBe(haut(0))
  })

  it('ne descend pas sous le plancher sur un compte négatif', () => {
    expect(haut(-100)).toBe(haut(0))
  })

  it('réserve la ligne de l’intitulé quand il y en a un', () => {
    expect(haut(600, 16, true)).toBeGreaterThan(haut(600, 16, false))
  })

  it('ne bascule pas d’un cran pour un signe : elle compte des LIGNES', () => {
    expect(haut(200)).toBe(haut(201))
  })

  // ⛔ LA POLICE RACINE EST FLUIDE : tout ce que la boîte contient grandit avec elle.
  // Une hauteur écrite en pixels serait juste à une seule taille d'écran.
  it('SUIT la police racine, sinon une note de deux lignes défilerait sur un grand écran', () => {
    const seize = haut(200, 16)
    const vingtDeux = haut(200, 22)
    // Le texte grandit d'un facteur 22/16 ; seuls les deux filets ne suivent pas.
    expect(vingtDeux).toBeGreaterThan(seize)
    expect((vingtDeux - 2) / (seize - 2)).toBeCloseTo(22 / 16, 1)
  })

  it('le plafond suit la racine, lui aussi', () => {
    expect(haut(400000, 22)).toBe(HAUTEUR_ENCART_MAX_REM * 22)
  })

  // ⚠️ Le compte de contrôle : ces trois-là sont MESURÉS sur la planche du
  // 8 septembre 2026, sur des notes réelles, encart de 29 rem à la racine 16. La
  // boîte doit porter au moins ce que le propos demande.
  it.each([
    ['la médiane du corpus, 29 signes', 29, false, 65],
    ['une note moyenne, 340 signes', 340, false, 162],
    ['un apparat critique de 90 signes, avec intitulé', 90, true, 91],
  ])('couvre %s', (_nom, signes, avecIntitule, demande) => {
    expect(haut(signes as number, 16, avecIntitule as boolean)).toBeGreaterThanOrEqual(demande as number)
  })
})

describe('la largeur de l’encart', () => {
  // ⛔ Elle s’écrit deux fois — en rem pour la feuille, en nombre pour le placeur —
  // et les deux DOIVENT venir de la même constante : la police racine est fluide.
  it('la forme CSS et la forme du placeur disent la même chose', () => {
    expect(LARGEUR_ENCART).toBe(`${LARGEUR_ENCART_REM}rem`)
    expect(largeurEncartPx(16)).toBe(LARGEUR_ENCART_REM * 16)
    expect(largeurEncartPx(22)).toBe(LARGEUR_ENCART_REM * 22)
  })

  it('NE SUIT PAS le contenu : une seule largeur pour toutes les notes', () => {
    // Une boîte qui épouserait ses treize signes clignoterait le long d’une ligne
    // qui porte trois appels. Le cadre ne reçoit d’ailleurs pas la note.
    const cadre = styleCadreEncart({ left: 10, top: 20, hauteurMax: 300 })
    expect(cadre.width).toBe(LARGEUR_ENCART)
  })

  it('réserve la MÊME marge que le placeur', () => {
    const cadre = styleCadreEncart({ left: 10, top: 20, hauteurMax: 300 })
    expect(cadre.maxWidth).toBe(`calc(100vw - ${MARGE_FENETRE * 2}px)`)
  })
})

describe('le cadre et le corps sont deux éléments', () => {
  // ⛔ Sans quoi la croix défile avec le texte : posée en absolu DANS la zone qui
  // défile, son bloc conteneur est la boîte de rembourrage.
  it('le cadre ne défile pas, le corps défile', () => {
    const cadre = styleCadreEncart({ left: 0, top: 0, hauteurMax: 300 })
    expect(cadre.overflow).toBe('hidden')
    expect(styleCorpsEncart(false).overflowY).toBe('auto')
  })

  it('le corps prend la hauteur qui reste, il ne se borne pas lui-même', () => {
    const corps = styleCorpsEncart(false)
    expect(corps.flex).toBe('1 1 auto')
    expect(corps.minHeight).toBe(0)
    expect(corps.maxHeight).toBeUndefined()
  })

  it('le défilement ne se propage jamais à la page', () => {
    expect(styleCorpsEncart(false).overscrollBehavior).toBe('contain')
  })

  it('la croix reçoit sa place, et elle seule', () => {
    expect(styleCorpsEncart(true).paddingRight).toBeTruthy()
    expect(styleCorpsEncart(false).paddingRight).toBeUndefined()
  })

  it('le propos se compose en sérif, au corps de l’encart', () => {
    const corps = styleCorpsEncart(false)
    expect(String(corps.fontFamily)).toContain('source-serif')
    expect(corps.fontSize).toBe(CORPS_ENCART)
  })
})

describe('le numéro de la note', () => {
  // ⛔ Il FLOTTE : rangé dans une colonne de grille, il réservait sa gouttière sur
  // toute la hauteur de la note — dix-neuf lignes de blanc à gauche d'un
  // développement de vingt.
  it('flotte, et le propos l’habille', () => {
    expect(STYLE_NUMERO_ENCART.float).toBe('left')
    expect(STYLE_NUMERO_ENCART.width).toBeTruthy()
  })

  it('se ferre à droite, contre le texte', () => {
    expect(STYLE_NUMERO_ENCART.textAlign).toBe('right')
  })

  // ⚠️ Sa ligne est celle du TEXTE : un chiffre de 0,625 rem posé sur son propre
  // interligne flotterait au-dessus de la première ligne du propos.
  it('prend l’interligne du texte, non le sien', () => {
    const ligneTexte = 0.8125 * 1.5
    expect(Number(STYLE_NUMERO_ENCART.lineHeight) * 0.625).toBeCloseTo(ligneTexte, 5)
  })
})

describe('l’encart qui se range dans une marge', () => {
  it('prend la largeur RETENUE quand elle lui est donnée', () => {
    expect(styleCadreEncart({ left: 0, top: 0, hauteurMax: 300, largeur: 366 }).width).toBe(366)
  })

  it('garde sa mesure quand rien ne la borne', () => {
    expect(styleCadreEncart({ left: 0, top: 0, hauteurMax: 300 }).width).toBe(LARGEUR_ENCART)
  })

  // ⛔ Sous cette borne, une note ne se lit plus : elle repasse sous son appel.
  // ⚠️ 320 px à la racine 16 : vingt de moins que le plus étroit des trois encarts
  // d'hier, et c'est ce qui permet à la marge de servir dès 1280 px de fenêtre, où
  // elle n'en offre que 366.
  it('a une largeur plancher, qui tient dans la marge d’un écran de 1280', () => {
    expect(largeurEncartMinPx(16)).toBe(LARGEUR_ENCART_MIN_REM * 16)
    expect(largeurEncartMinPx(16)).toBeLessThanOrEqual(366)
    expect(largeurEncartMinPx(16)).toBeGreaterThanOrEqual(300)
  })

  it('la borne SUIT la police racine', () => {
    expect(largeurEncartMinPx(22)).toBe(LARGEUR_ENCART_MIN_REM * 22)
  })
})
