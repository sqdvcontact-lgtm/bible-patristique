import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
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
  REMBOURRAGE_ENCART,
  RESERVE_CROIX,
  SEUIL_GRIS_SIGNES,
  STYLE_FACE_NUMERO,
  STYLE_INTITULE_ENCART,
  STYLE_NUMERO_SEUL,
  STYLE_NUMERO_TETE,
  STYLE_RESERVE_CROIX,
  STYLE_TETE_ENCART,
  largeurEncartMinPx,
} from './compositionNote'

/** Une note assez longue pour porter un gris, et une qui n'en a pas. */
const LONGUE = SEUIL_GRIS_SIGNES + 10
const COURTE = 42

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
    // ⚠️ 40 px : la boîte d'UNE ligne, remesurée le 2026-09-10 — passage au sans, un rang
    // de moins, et le blanc mort retiré sous la dernière ligne.
    expect(haut(0)).toBeGreaterThanOrEqual(40)
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
  // ⛔ ILS SE REMESURENT DÈS QUE LE CORPS OU LE BLANC BOUGENT, et c'est arrivé DEUX fois.
  // Le 8 septembre 2026 au soir — note passée à 0,75 rem, interligne à 1,42, rembourrage à
  // 0,875/1 rem, blanc de paragraphe à 0,375 : 65 · 162 · 91 sont devenus 53 · 139 · 89.
  // Le 10 septembre au matin, la note s'étant condensée — interligne 1,38, rembourrage
  // 0,6875 sur 0,8125 rem, blanc SYMÉTRIQUE (la croix se réserve par un flottant), numéro
  // et type réunis dans une tête : 53 · 139 · 89 sont devenus 47 · 113 · 81.
  // Le 10 au soir, la note passée au SANS et descendue d'un rang (0,71875 rem), sa chasse
  // remesurée à 0,44 em, et le blanc mort retiré sous sa dernière ligne : 47 · 113 · 81
  // sont devenus **40 · 88 · 58**, soit de quinze à vingt-huit pour cent de moins.
  // Une demande périmée ne rendrait pas le test faux, elle le rendrait MOU — il passerait
  // sur une boîte deux fois trop haute sans rien dire.
  // ⚠️ Les trois demandes sont la hauteur RÉELLE de la boîte, mesurée sur le module même
  // (planche `tmp/mesure-encart-note.html`, qui empaquette ce fichier plutôt que de le
  // rejouer). L'estimation rend les deux premières au PIXEL près ; la troisième la
  // dépasse de seize, ses 90 signes tombant juste à la frontière de l'enroulement —
  // l'estimation compte des LIGNES ENTIÈRES, et elle arrondit toujours vers le haut.
  // ⛔ Un balayage l'a vérifié dans le sens qui compte : 171 comptes de signes × deux
  // racines × deux pistes, 684 cas, et l'estimation ne rend JAMAIS moins que la boîte.
  // ⛔ CHAQUE CAS PORTE DEUX NOMBRES, ET IL EN FAUT DEUX. La boîte RÉELLE dit ce que le
  // propos demande ; l'estimation ATTENDUE épingle ce que le module en calcule. Épinglée
  // seule, elle serait tautologique ; bornée seule, elle laissait passer n'importe quelle
  // dérive d'une ligne — éprouvé le 2026-09-10, la chasse du sérif laissée sur un texte
  // en sans passait un plancher ET un plafond d'une ligne les yeux fermés.
  it.each([
    //                                                signes  intitulé  réelle  estimée
    ['la médiane du corpus, 29 signes',                   29,   false,     40,     40],
    ['une note moyenne, 340 signes',                     340,   false,     88,     88],
    ['un apparat critique de 90 signes, avec intitulé',    90,    true,     58,     74],
  ])('couvre %s', (_nom, signes, avecIntitule, reelle, attendue) => {
    const estimee = haut(signes as number, 16, avecIntitule as boolean)
    // ⛔ Ce que le module CALCULE, au pixel : toute dérive du corps, de l'interligne, du
    // blanc ou de la CHASSE déplace ce nombre, et c'est le seul moyen d'épingler la
    // chasse par un test — elle appartient à la police, et aucun test ne sait la mesurer.
    expect(estimee).toBe(attendue as number)
    // ⛔ Et ce que le calcul PROMET : jamais moins que la boîte réelle, jamais plus d'une
    // ligne au-dessus. L'estimation compte des lignes ENTIÈRES et arrondit toujours vers
    // le haut ; c'est ce qui coûte une ligne au troisième cas, dont les 90 signes tombent
    // juste à la frontière de l'enroulement. Au-delà d'une ligne, c'est la mesure qui a
    // menti. ⛔ La borne se DÉRIVE des constantes, elle ne se recopie pas.
    const uneLigne = Number.parseFloat(CORPS_ENCART) * INTERLIGNE_ENCART * 16 + 2
    expect(attendue as number).toBeGreaterThanOrEqual(reelle as number)
    expect(attendue as number).toBeLessThanOrEqual((reelle as number) + uneLigne)
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
    expect(styleCorpsEncart(LONGUE).overflowY).toBe('auto')
  })

  it('le corps prend la hauteur qui reste, il ne se borne pas lui-même', () => {
    const corps = styleCorpsEncart(LONGUE)
    expect(corps.flex).toBe('1 1 auto')
    expect(corps.minHeight).toBe(0)
    expect(corps.maxHeight).toBeUndefined()
  })

  it('le défilement ne se propage jamais à la page', () => {
    expect(styleCorpsEncart(LONGUE).overscrollBehavior).toBe('contain')
  })

  // ⛔ LA GÉOMÉTRIE NE BOUGE PAS ENTRE LE SURVOL ET LE CLIC — la règle du 9 septembre
  // 2026 tient, mais elle se paie autrement : la place de la croix est un FLOTTANT, donc
  // réservée toujours ET sur la seule ligne où la croix se tient. Le rembourrage de
  // droite la retenait sur toute la hauteur, et la boîte était dissymétrique.
  it('la place de la croix se réserve par un flottant, non par un rembourrage', () => {
    expect(STYLE_RESERVE_CROIX.float).toBe('right')
    expect(STYLE_RESERVE_CROIX.width).toBe(RESERVE_CROIX)
    // ⛔ Moins d'une ligne, sans quoi le flottant en mordrait une seconde.
    expect(Number.parseFloat(String(STYLE_RESERVE_CROIX.height)))
      .toBeLessThan(Number.parseFloat(CORPS_ENCART) * INTERLIGNE_ENCART)
  })

  it('le blanc intérieur est SYMÉTRIQUE', () => {
    expect(styleCorpsEncart(LONGUE).padding).toBe(REMBOURRAGE_ENCART)
    expect(styleCorpsEncart(LONGUE).paddingRight).toBeUndefined()
  })

  // ⛔ SANS EMPATTEMENTS depuis le 2026-09-10 : une note est de l'appareil, non du
  // corpus, et le change de caractère est ce qui le dit. Elle emporte l'apparat
  // critique et tout ce que l'encart contient, qui héritent.
  it('le propos se compose en sans, au corps de l’encart', () => {
    const corps = styleCorpsEncart(LONGUE)
    expect(String(corps.fontFamily)).toContain('font-source-sans')
    expect(String(corps.fontFamily)).not.toContain('serif,')
    expect(corps.fontSize).toBe(CORPS_ENCART)
  })
})

describe('le numéro de la note', () => {
  // ⛔ Il FLOTTE QUAND IL EST SEUL : rangé dans une colonne de grille, il réservait sa
  // gouttière sur toute la hauteur de la note — dix-neuf lignes de blanc à gauche d'un
  // développement de vingt.
  it('flotte quand il est seul, et le propos l’habille', () => {
    expect(STYLE_NUMERO_SEUL.float).toBe('left')
    expect(STYLE_NUMERO_SEUL.width).toBeTruthy()
  })

  // ⛔ ET IL NE FLOTTE PLUS QUAND LA NOTE DÉCLARE UN TYPE (relevé de l'auteur,
  // 2026-09-10 : « revois les alignements, notamment du numéro de note et du type de
  // note »). Un flottant n'a rien à habiller quand une tête lui prend sa ligne, et il
  // laissait alors trois fers à gauche : le numéro, le type deux rem plus loin, le
  // propos au fer. Dans la tête, les trois n'en font qu'un.
  it('rejoint la tête quand la note déclare un type', () => {
    expect(STYLE_NUMERO_TETE.float).toBeUndefined()
    expect(STYLE_NUMERO_TETE.width).toBeUndefined()
    expect(STYLE_TETE_ENCART.display).toBe('flex')
  })

  // ⛔ SUR LA MÊME LIGNE DE BASE. Les deux ne portent pas le même corps, et posés dans
  // deux blocs voisins d'un flottant ils tenaient chacun la leur — quatre pixels
  // d'écart, mesurés sur la planche.
  it('partage la ligne de base du type', () => {
    expect(STYLE_TETE_ENCART.alignItems).toBe('baseline')
  })

  // ⚠️ Une tête tient sur UNE ligne : un type plus long que la piste s'écrête.
  it('n’ouvre jamais un second rang au-dessus du propos', () => {
    expect(STYLE_INTITULE_ENCART.whiteSpace).toBe('nowrap')
    expect(STYLE_INTITULE_ENCART.textOverflow).toBe('ellipsis')
    expect(STYLE_INTITULE_ENCART.display).toBeUndefined()
  })

  // ⛔ AU FER À GAUCHE, et c'est une décision (2026-09-08) : « supprime l'alinéa avant
  // le numéro de note ». Ferré à droite d'une gouttière fixe, un numéro d'un ou deux
  // signes s'écartait du bord, et l'encart s'ouvrait sur un alinéa. Le fer à droite est
  // la règle d'un chiffre qui accompagne un TEXTE SUIVI, où cinquante repères s'alignent
  // les uns sous les autres ; il n'y en a qu'un ici, en tête d'un objet.
  it('se ferre à GAUCHE : pas d’alinéa avant le numéro', () => {
    expect(STYLE_NUMERO_SEUL.textAlign).toBe('left')
  })

  // ⚠️ Sa ligne est celle du TEXTE : un chiffre de 0,625 rem posé sur son propre
  // interligne flotterait au-dessus de la première ligne du propos.
  // ⛔ Elle se DÉRIVE des deux constantes, elle ne les recopie pas : écrites à la main,
  // elles ont fait échouer ce test le jour où le corps de la note a changé, ce qui est
  // exactement le défaut que ce module existe pour empêcher.
  // ⛔ IL EMPRUNTE LE STRUT DU PROPOS, il ne se contente pas d'en prendre la HAUTEUR.
  // Deux boîtes de même hauteur ne posent pas leur ligne de base au même endroit quand
  // les polices diffèrent : l'ascendante d'une sans n'est pas celle d'une sérif, et le
  // chiffre pendait un pixel au-dessus de la première ligne (mesuré à la racine 22).
  // C'est la leçon de la marge de référence de la Polyglotte, prise par l'autre bout.
  // ⛔ ET LA GARDE TIENT LA RELATION, NON LE NOM DE LA FAMILLE. Elle nommait le sérif
  // en dur ; le jour où le propos est passé au sans, elle a rougi sur la bonne ligne
  // pour la mauvaise raison — elle disait « ce n'est plus du sérif » quand la règle est
  // « ce n'est plus la police du propos ». Comparée au propos, elle ne peut plus se
  // redéfaire au prochain change de caractère.
  it('prend le STRUT du texte — police, corps et interligne', () => {
    expect(STYLE_NUMERO_SEUL.fontSize).toBe(CORPS_ENCART)
    expect(STYLE_NUMERO_SEUL.lineHeight).toBe(INTERLIGNE_ENCART)
    expect(STYLE_NUMERO_SEUL.fontFamily).toBe(styleCorpsEncart(LONGUE).fontFamily)
  })

  // ⚠️ La FACE du chiffre est à part, et elle se pose EN LIGNE dans ce strut : c'est ce
  // qui lui laisse son propre corps sans déplacer la ligne de base.
  it('laisse sa face au chiffre, en ligne', () => {
    expect(STYLE_FACE_NUMERO.fontSize).toBe('0.625rem')
    expect(String(STYLE_FACE_NUMERO.fontFamily)).toContain('font-source-sans')
    expect(STYLE_FACE_NUMERO.float).toBeUndefined()
    expect(STYLE_FACE_NUMERO.width).toBeUndefined()
  })
})

describe('la composition du propos', () => {
  // ⛔ JUSTIFIÉ ET CÉSURÉ, sur le corps de l'encart et non sur chaque paragraphe : la
  // page Bible justifiait les siens, la lecture d'une œuvre non, et le même encart
  // rendait deux compositions selon la surface qui l'ouvrait.
  it('justifie, coupe les mots, et rend la dernière ligne au fer à gauche', () => {
    const style = styleCorpsEncart(LONGUE)
    expect(style.textAlign).toBe('justify')
    expect(style.textAlignLast).toBe('left')
    expect(style.hyphens).toBe('auto')
  })

  // ⛔ MAIS SOUS LE SEUIL DU GRIS, ON NE JUSTIFIE PAS (charte § 3.11 ; relevé de
  // l'auteur, 2026-09-10). Une note de quarante signes étirait sa première ligne d'un
  // bord à l'autre pour laisser un mot seul sur la seconde. ⚠️ C'est le cas de 92,6 %
  // des notes du corpus : la médiane fait dix-sept signes.
  it('ne justifie PAS ce qui se lit d’un coup d’œil', () => {
    const style = styleCorpsEncart(COURTE)
    expect(style.textAlign).toBe('left')
    // ⚠️ La césure RESTE : au fer, une piste de trente signes coupe aussi bien.
    expect(style.hyphens).toBe('auto')
  })

  // ⛔ LA CHASSE DU SANS VA AVEC LE GRIS, comme la justification. Le barème de la
  // charte (§ 3.11) donne -0,03 em en sans et -0,025 em en sérif ; sous le seuil,
  // « on ne touche à rien ». ⚠️ Elle se relit le jour où la note changerait de police :
  // les deux valeurs ne sont pas interchangeables, et une chasse de sérif posée sur un
  // sans resserre un demi-millième de trop par mot — invisible sur un renvoi, une ligne
  // de moins sur un développement de vingt.
  it('referme les blancs de la justification, et rien sous le seuil', () => {
    expect(styleCorpsEncart(LONGUE).wordSpacing).toBe('-0.03em')
    expect(styleCorpsEncart(COURTE).wordSpacing).toBeUndefined()
  })

  it('le seuil est celui de la charte', () => {
    expect(SEUIL_GRIS_SIGNES).toBe(250)
    expect(styleCorpsEncart(SEUIL_GRIS_SIGNES).textAlign).toBe('justify')
    expect(styleCorpsEncart(SEUIL_GRIS_SIGNES - 1).textAlign).toBe('left')
  })
})

describe('la hauteur estimée suit la LARGEUR', () => {
  // ⛔ Elle ne la suivait pas : les signes par ligne étaient une constante calibrée sur
  // la mesure pleine (65 à 29 rem), et l'encart se resserre à la marge qu'on lui laisse.
  // Mesuré à 16 rem : 32 signes par ligne, la moitié — la boîte était bornée aux deux
  // tiers de ce qu'il fallait, et la note défilait pour rien.
  it('rend une note plus HAUTE quand l’encart est plus étroit', () => {
    const pleine = hauteurSouhaiteeNote({ signes: 352, racine: 16, largeur: LARGEUR_ENCART_REM * 16 })
    const etroite = hauteurSouhaiteeNote({ signes: 352, racine: 16, largeur: LARGEUR_ENCART_MIN_REM * 16 })
    expect(etroite).toBeGreaterThan(pleine)
  })

  // ⚠️ Sans largeur, la mesure PLEINE : c'est le cas de l'encart posé sous son appel,
  // où rien ne le resserre.
  it('prend la mesure pleine à défaut', () => {
    expect(hauteurSouhaiteeNote({ signes: 352, racine: 16 }))
      .toBe(hauteurSouhaiteeNote({ signes: 352, racine: 16, largeur: LARGEUR_ENCART_REM * 16 }))
  })

  // ⛔ Une largeur absurde ne rend pas une hauteur infinie.
  it('borne l’absurde', () => {
    expect(Number.isFinite(hauteurSouhaiteeNote({ signes: 352, racine: 16, largeur: 0 }))).toBe(true)
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

/**
 * ⛔ LA QUEUE DU DERNIER BLOC : LA FEUILLE ET L'ESTIMATION SE TIENNENT, OU LE TEXTE
 * PASSE SOUS LE FILET.
 *
 * Chaque bloc d'une note porte le blanc qui le SÉPARE du suivant, en style EN LIGNE ;
 * sur le dernier, ce blanc n'a plus rien à séparer et s'ajoutait au rembourrage — douze
 * pixels de blanc au-dessus du texte, dix-huit au-dessous, mesurés le 2026-09-10 sur la
 * composition servie. La feuille le retire ; `hauteurSouhaiteeNote` a donc cessé de le
 * compter.
 *
 * ⚠️ LES DEUX NE PEUVENT PLUS ÊTRE DÉFAITS L'UN SANS L'AUTRE. La feuille retirée, la
 * boîte garde son blanc et l'estimation la rend six pixels trop courte : la dernière
 * ligne passe sous le filet. C'est arrivé pendant la passe même, parce que la règle
 * avait d'abord été écrite SANS point d'exclamation et perdait contre le style en ligne.
 */
describe('le blanc mort sous la dernière ligne', () => {
  const feuille = readFileSync('app/globals.css', 'utf8')
  const encart = readFileSync('app/components/EncartNote.tsx', 'utf8')

  it('la feuille le retire, et elle CRIE pour battre le style en ligne', () => {
    const regle = feuille.match(/.cs-encart-propos > :last-child {[^}]*}/)?.[0]
    expect(regle).toBeDefined()
    expect(regle).toContain('margin-bottom: 0')
    // ⛔ Sans le point d'exclamation, elle ne retire RIEN : les trois composants posent
    // ce blanc en style en ligne, qui bat toute règle de feuille.
    expect(regle).toContain('!important')
  })

  it('et l’encart porte la marque que la règle vise', () => {
    expect(encart).toContain('className="cs-encart-propos"')
  })
})
