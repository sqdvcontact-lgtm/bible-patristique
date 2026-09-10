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
    expect(styleCorpsEncart().overflowY).toBe('auto')
  })

  it('le corps prend la hauteur qui reste, il ne se borne pas lui-même', () => {
    const corps = styleCorpsEncart()
    expect(corps.flex).toBe('1 1 auto')
    expect(corps.minHeight).toBe(0)
    expect(corps.maxHeight).toBeUndefined()
  })

  it('le défilement ne se propage jamais à la page', () => {
    expect(styleCorpsEncart().overscrollBehavior).toBe('contain')
  })

  // ⛔ LA GÉOMÉTRIE NE BOUGE PAS ENTRE LE SURVOL ET LE CLIC. Le rembourrage de
  // droite valait 1 rem sans la croix et 2,25 rem avec : la note se recomposait à
  // l’instant où on l’épinglait. C’est la place de la croix qui est désormais
  // réservée toujours, montrée ou non.
  it('la place de la croix est réservée, croix montrée ou non', () => {
    expect(styleCorpsEncart().paddingRight).toBe('2.25rem')
  })

  it('le corps ne prend aucun argument : sa forme ne dépend de rien', () => {
    expect(styleCorpsEncart.length).toBe(0)
  })

  it('le propos se compose en sérif, au corps de l’encart', () => {
    const corps = styleCorpsEncart()
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
    const style = styleCorpsEncart()
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

  // ── LE PLANCHER, ET CE QU'IL OUVRE ────────────────────────────────────────
  //
  // Places RELEVÉES à droite de la colonne, les deux volets ouverts, par
  // l'arithmétique réelle de `placerEnMarge` sur les structures réelles des deux
  // pages (`tmp/mesure-marge-encart.mjs`, une iframe par écran).
  // ⛔ Ces nombres sont MESURÉS, jamais calculés de tête : le commentaire d'hier
  // donnait la marge d'un écran de 1280 pour 366 px, ce qui est la place dans la
  // FENÊTRE — la page d'une œuvre n'en offre que 99 une fois les volets déduits.
  const MARGES = [
    { ecran: 1280, racine: 16, oeuvre: 99, regard: 13, bible: 69 },
    { ecran: 1920, racine: 19, oeuvre: 279, regard: 177, bible: 237 },
    { ecran: 2400, racine: 22, oeuvre: 395, regard: 277, bible: 352 },
    { ecran: 2560, racine: 22, oeuvre: 475, regard: 357, bible: 432 },
    { ecran: 2880, racine: 22, oeuvre: 635, regard: 517, bible: 592 },
  ]
  const sert = (m: typeof MARGES[number], surface: 'oeuvre' | 'regard' | 'bible') =>
    m[surface] >= largeurEncartMinPx(m.racine)

  it('la borne SUIT la police racine — une note y garde le même nombre de signes', () => {
    expect(largeurEncartMinPx(16)).toBe(LARGEUR_ENCART_MIN_REM * 16)
    expect(largeurEncartMinPx(22)).toBe(LARGEUR_ENCART_MIN_REM * 22)
  })

  // ⛔ CE QUE L'AUTEUR A DEMANDÉ LE 2026-09-10 : des notes en marge sur grand écran,
  // même en latin-français. À 20 rem la lecture en regard n'y arrivait qu'à 2880.
  it('rend la marge à la lecture EN REGARD dès 2560', () => {
    expect(sert(MARGES.find(m => m.ecran === 2560)!, 'regard')).toBe(true)
    expect(sert(MARGES.find(m => m.ecran === 2880)!, 'regard')).toBe(true)
  })

  it('rend la marge à l’œuvre lue seule et à la page Bible dès 2400', () => {
    const m = MARGES.find(m => m.ecran === 2400)!
    expect(sert(m, 'oeuvre')).toBe(true)
    expect(sert(m, 'bible')).toBe(true)
  })

  // ⚠️ Le plancher ne PROMET pas la marge partout : sur un portable, deux volets
  // ouverts n'en laissent pas de quoi lire, et l'encart repasse sous son appel.
  // Aucun plancher n'y peut rien — c'est le repli d'un volet qui rend la place.
  it('ne promet rien là où la place n’existe pas', () => {
    for (const surface of ['oeuvre', 'regard', 'bible'] as const) {
      expect(sert(MARGES.find(m => m.ecran === 1280)!, surface)).toBe(false)
      expect(sert(MARGES.find(m => m.ecran === 1920)!, surface)).toBe(false)
    }
  })

  // ⛔ LE PLANCHER EST UN PLANCHER DE LISIBILITÉ, et il se tient par les deux bouts.
  // Piste de texte = largeur − 1 rem de blanc à gauche − 2,25 rem réservés à la croix
  // − les deux filets. Mesuré sur la note la plus longue qu'on ait éprouvée (352
  // signes) : 32 signes par ligne à 16 rem, 25 à 14 — et la justification s'y creuse
  // de lézardes visibles. ⚠️ Descendre plus bas ne gagnerait AUCUN écran de plus en
  // latin-français : 14 rem laisse 2400 hors d'atteinte comme 16.
  it('reste au-dessus de la mesure où la justification se creuse', () => {
    const piste = (racine: number) => largeurEncartMinPx(racine) - 3.25 * racine - 2
    // 202 px à la racine 16, soit 32 signes à 6,3 px de chasse moyenne.
    expect(Math.round(piste(16))).toBe(202)
    expect(piste(16) / 6.3).toBeGreaterThan(30)
    // ⛔ Et 14 rem n'achèterait rien : la marge de 2400 en regard vaut 277 px.
    expect(14 * 22).toBeGreaterThan(MARGES.find(m => m.ecran === 2400)!.regard)
  })
})
