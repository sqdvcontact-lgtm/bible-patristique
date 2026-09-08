import { describe, it, expect } from 'vitest'
import { MARGE_FENETRE } from './fenetreContextuelle'
import {
  CORPS_ENCART,
  INTERLIGNE_ENCART,
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
    expect(haut(0)).toBeGreaterThanOrEqual(53)
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

  // ⚠️ Le compte de contrôle : ces trois-là sont MESURÉS dans un navigateur, sur la
  // composition SERVIE, encart de 29 rem à la racine 16, réserve de la croix comprise.
  // La boîte doit porter au moins ce que le propos demande.
  // ⛔ ILS SE REMESURENT DÈS QUE LE CORPS OU LE BLANC BOUGENT, et c'est arrivé le
  // 8 septembre 2026 au soir — note passée à 0,75 rem, interligne à 1,42, rembourrage à
  // 0,875/1 rem, blanc de paragraphe à 0,375 : 65 · 162 · 91 sont devenus 53 · 139 · 89.
  // Une demande périmée ne rendrait pas le test faux, elle le rendrait MOU — il passerait
  // sur une boîte deux fois trop haute sans rien dire.
  it.each([
    ['la médiane du corpus, 29 signes', 29, false, 53],
    ['une note moyenne, 340 signes', 340, false, 139],
    ['un apparat critique de 90 signes, avec intitulé', 90, true, 89],
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

  // ⛔ AU FER À GAUCHE, et c'est une décision (2026-09-08) : « supprime l'alinéa avant
  // le numéro de note ». Ferré à droite d'une gouttière fixe, un numéro d'un ou deux
  // signes s'écartait du bord, et l'encart s'ouvrait sur un alinéa. Le fer à droite est
  // la règle d'un chiffre qui accompagne un TEXTE SUIVI, où cinquante repères s'alignent
  // les uns sous les autres ; il n'y en a qu'un ici, en tête d'un objet.
  it('se ferre à GAUCHE : pas d’alinéa avant le numéro', () => {
    expect(STYLE_NUMERO_ENCART.textAlign).toBe('left')
  })

  // ⚠️ Sa ligne est celle du TEXTE : un chiffre de 0,625 rem posé sur son propre
  // interligne flotterait au-dessus de la première ligne du propos.
  // ⛔ Elle se DÉRIVE des deux constantes, elle ne les recopie pas : écrites à la main,
  // elles ont fait échouer ce test le jour où le corps de la note a changé, ce qui est
  // exactement le défaut que ce module existe pour empêcher.
  it('prend l’interligne du texte, non le sien', () => {
    const ligneTexte = Number.parseFloat(CORPS_ENCART) * INTERLIGNE_ENCART
    expect(Number(STYLE_NUMERO_ENCART.lineHeight) * 0.625).toBeCloseTo(ligneTexte, 5)
  })
})

describe('la composition du propos', () => {
  // ⛔ JUSTIFIÉ ET CÉSURÉ, sur le corps de l'encart et non sur chaque paragraphe : la
  // page Bible justifiait les siens, la lecture d'une œuvre non, et le même encart
  // rendait deux compositions selon la surface qui l'ouvrait.
  it('justifie, coupe les mots, et rend la dernière ligne au fer à gauche', () => {
    const style = styleCorpsEncart(true)
    expect(style.textAlign).toBe('justify')
    expect(style.textAlignLast).toBe('left')
    expect(style.hyphens).toBe('auto')
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
