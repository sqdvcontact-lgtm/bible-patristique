// ── Détourage des gravures Fillion ───────────────────────────────────────────
//
// `node --env-file=.env.local scripts/fillion/detourer-gravures.mjs`              → MESURE seule
// `node --env-file=.env.local scripts/fillion/detourer-gravures.mjs --fabriquer`  → écrit dans tmp/
// `node --env-file=.env.local scripts/fillion/detourer-gravures.mjs --televerser` → remplace master et web
//
// ⛔ TROIS SOURCES POSSIBLES, ET ELLES NE SE VALENT PAS. Dans cet ordre :
//
//  1. LE FEUILLET JP2 de l'archive Internet Archive. Un scan en ton continu : la
//     taille de la gravure y est entière. C'est la seule source qui rende une
//     GRAVURE, et c'est celle dont le tome I a été tiré.
//  2. LE MASQUE DE TRAIT du PDF. Le PDF du tome VII est une compression à
//     contenu mixte : un fond JPX à 134 points par pouce, et un masque JBIG2 à
//     1 bit qui porte le trait, franc mais SANS demi-teinte. On n'en obtient
//     qu'un dessin au trait, jamais une gravure.
//  3. ⛔ LA PAGE COMPOSÉE, jamais. C'est le trait déjà mêlé aux bavures du fond,
//     et tout le travail consiste ensuite à les séparer. Payé deux journées.
//
// Mesuré sur le « Modius ou boisseau romain », page 219 : la page composée rend
// un fantôme, le masque un fil de fer sans matière, le JP2 un vase de bois avec
// ses deux poignées, ses cerclages, sa hachure et son pied. Ce n'est pas la même
// image mieux tirée, c'est un autre objet.
//
// ⚠️ Corollaire de méthode : le PDF suffit à TROUVER les illustrations, le JP2
// seul permet de les RENDRE. On repère sur le PDF, on tire les seuls feuillets
// JP2 correspondants, et l'on ne télécharge jamais un volume entier.

import { createHash } from 'node:crypto'
import sharp from 'sharp'
import { mkdirSync, writeFileSync, existsSync, readdirSync, readFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'

// ── Réglages ─────────────────────────────────────────────────────────────────

/** L'encre de la famille, celle des ornements du site (charte). Elle n'est pas
 *  noire : un noir franc sur le crème fait un trait d'imprimante, non une encre. */
const ENCRE = [34, 33, 30]
const LUM_ENCRE = 0.2126 * ENCRE[0] + 0.7152 * ENCRE[1] + 0.0722 * ENCRE[2]
const AMPLITUDE = 255 - LUM_ENCRE
const NETTETE = { sigma: 0.6, m1: 0, m2: 2 }

/** ⛔ LE RATTRAPAGE SE RÈGLE SUR CE QUE LE NAVIGATEUR REND, NON SUR NOTRE FICHIER.
 *
 *  Nous servons au DOUBLE de la taille d'affichage. Sur un écran ordinaire le
 *  navigateur réduit donc une seconde fois, avec son propre filtre et sans aucun
 *  rattrapage : le lecteur ne voit jamais le fichier que nous écrivons, il voit
 *  CETTE réduction-là. Or un rattrapage étroit renforce des fréquences que cette
 *  seconde réduction jette aussitôt.
 *
 *  Mesuré sur les neuf gravures au trait, en énergie de bord APRÈS la seconde
 *  réduction, 100 % valant ce que notre propre réduction rendrait :
 *
 *    σ 0,6 (m2 2)  83 %     σ 1,2 (m3)  92 %     σ 1,6 (m3)  99 %
 *    σ 1,0 (m3)    90 %     σ 1,4 (m3)  97 %
 *
 *  ⚠️ Le remède n'est pas de rattraper plus FORT — m2 3 ou 4 à σ 0,6 ne rendent
 *  qu'un point — mais plus LARGE. Contrôlé à l'œil aux deux échelles, fichier
 *  servi compris : aucun halo.
 *
 *  ⛔ ET LE TON CONTINU N'EN PREND PAS AUTANT. Sur une photogravure, σ 1,6 fait
 *  BOUILLIR la feuillée et granule les ciels — le défaut déjà relevé du contraste
 *  local. Mais 0,6 y était trop prudent : la limite se trouve entre 1,3 et 1,6, et
 *  c'est `NETTETE_TON` qui la porte.
 *
 *  ⛔ ET IL NE DOIT JAMAIS SERVIR À MESURER LA RAMPE : voir le découplage, plus
 *  bas. Mêlés, ils ont fait perdre aux neuf gravures de 5 à 19 % de leur encre,
 *  et l'auteur a vu le démoniaque pâlir. La densité VUE — après la seconde
 *  réduction, rapportée au témoin — dit le partage : ancienne chaîne ×0,90,
 *  rattrapage large avec rampe couplée ×0,83, rampe découplée ×1,03. */
const NETTETE_TRAIT = { sigma: 1.6, m1: 0, m2: 3 }

/** Le même rattrapage, pour le TON CONTINU — photogravure et planche hors-texte.
 *
 *  Il obéit à la même raison que `NETTETE_TRAIT` : la seconde réduction du
 *  navigateur jette ce qu'un rattrapage étroit renforce. Mais une masse de
 *  demi-tons se fragmente là où un trait se raffermit, et le seuil est plus bas.
 *  Contrôlé à l'œil sur la feuillée du Jourdain et sur les toits de Damas :
 *  σ 1,0 gagne déjà beaucoup, σ 1,3 gagne encore, σ 1,6 GRANULE.
 *
 *  ⚠️ 0,6 y était trop prudent, et c'est une correction du 30 août 2026 : la règle
 *  disait « les planches cadrées gardent le rattrapage étroit », alors que seul le
 *  σ 1,6 avait été éprouvé sur elles. Une borne se trouve en encadrant, non en
 *  refusant la première valeur qui déborde.
 *
 *  ⛔ ET LES DEUX OSCILLATIONS SE BRIDENT, sans quoi le gain se paie en ombres
 *  CREVÉES. Un rattrapage large creuse de part et d'autre de chaque bord, et sur
 *  une image en ton continu ces creux butent sur zéro : mesuré sur le Jourdain, le
 *  noir pur passait de 4,07 % à 12,44 %, c'est-à-dire un huitième de la feuillée
 *  perdu. `y3` plafonne l'assombrissement, `y2` l'éclaircissement.
 *
 *    réglage              blanc pur   noir pur   bord vu
 *    σ 0,6 (le témoin)      2,01 %     4,07 %     127,8
 *    σ 1,3 sans bride       4,32 %     6,89 %     144,4
 *    σ 1,3 y2 4 y3 5        1,34 %     1,53 %     130,1
 *
 *  ⚠️ La bride reprend l'essentiel du gain de bord — le reste venait justement des
 *  oscillations qu'on écrête — et le réglage retenu reste MEILLEUR que le témoin
 *  sur les trois mesures à la fois. C'est ce qui le fait choisir, non le chiffre
 *  de bord seul. */
const NETTETE_TON = { sigma: 1.3, m1: 0, m2: 3, y2: 4, y3: 5 }

/** ⛔ UNE PHOTOGRAVURE SE CREUSE, ELLE NE SE RECADRE PAS UNE SECONDE FOIS.
 *
 *  L'étalement porte déjà le papier au blanc et l'encre au noir : la plage est
 *  entière, et pourtant le rendu reste GRIS — moyenne 143 sur le Jourdain, 127
 *  sur la synagogue. C'est le propre d'une photogravure, dont l'essentiel du
 *  dessin vit dans les demi-tons ; l'auteur l'a relevé, « il faudrait que les
 *  tons soient plus noirs ».
 *
 *  Un second étalement ne rendrait rien, les deux bouts étant déjà pris : c'est
 *  la COURBE qu'il faut, et une puissance suffit. Mesuré sur les deux planches :
 *
 *    γ      moyenne (Jourdain)   blanc pur   noir pur
 *    1        142,6                2,45 %      4,14 %
 *    1,2      131,5                2,45 %      4,25 %
 *    1,4      122,1                2,45 %      4,33 %
 *    1,6      113,8                2,45 %      4,61 %
 *
 *  ⚠️ Le blanc ne bouge PAS et le noir gagne deux dixièmes de point : on creuse
 *  sans rien écrêter, ce qui est exactement ce qu'un étalement plus dur ferait
 *  perdre. À 1,6 la feuillée la plus sombre commence à se fermer ; d'où 1,4.
 *
 *  ⛔ Elle ne vaut QUE pour la photogravure. Une gravure au trait n'a pas de
 *  demi-tons à creuser : son alpha vient de la rampe, qui a déjà ses deux bornes
 *  mesurées, et une courbe de plus l'empâterait. */
const CREUX_DES_TONS = 1.4

async function creuserLesTons(png) {
  const r = await sharp(png).removeAlpha().toColourspace('b-w')
    .raw().toBuffer({ resolveWithObject: true })
  if (r.info.channels !== 1) throw new Error('canal unique attendu')
  const out = Buffer.alloc(r.info.width * r.info.height)
  for (let i = 0; i < out.length; i++) {
    out[i] = Math.round(255 * Math.pow(r.data[i] / 255, CREUX_DES_TONS))
  }
  return sharp(out, { raw: { width: r.info.width, height: r.info.height, channels: 1 } })
    .png().toBuffer()
}

/** La largeur imprimée : une colonne, ou les deux.
 *
 *  La page de Fillion est à DEUX colonnes. Une gravure qui tient dans une
 *  colonne est une vignette, que le commentaire habille ; une gravure qui les
 *  enjambe se pose au fil du texte et rien ne l'habille. Le seuil est donc
 *  au-dessus d'une colonne et au-dessous de deux.
 *
 *  ⛔ MAIS ELLE NE DÉCIDE PLUS SEULE DU RÉGIME. Elle dit la MISE EN PAGE — ce qui
 *  s'habille et ce qui ne s'habille pas — non la NATURE de l'image. Une gravure
 *  large peut être un dessin au trait : voir `estPhotographie`, juste après.
 *
 *  ⚠️ Un premier jet classait sur la part des gris qui bordent le trait. Il
 *  rendait le MÊME partage, mais pour une mauvaise raison : il mesurait les
 *  dégâts de la compression, non la composition de la page. Il sert encore, mais
 *  à ce qu'il sait dire : choisir la source. */
const LARGEUR_DEUX_COLONNES = 0.6

/** ⛔ C'EST FILLION QUI DIT CE QU'IL IMPRIME.
 *
 *  La largeur seule ne suffit plus. Elle a valu tant que le corpus se réduisait aux
 *  onze gravures de Marc, où « enjambe les deux colonnes » et « photogravure »
 *  coïncidaient. À 155 gravures le partage se défait : le massacre des saints
 *  Innocents d'après un ivoire, un plan du temple d'Hérode, une scène de deuil
 *  d'après une peinture grecque enjambent tous les deux colonnes et sont des
 *  DESSINS AU TRAIT. Les cadrer leur laisse un rectangle de papier gris là où la
 *  page attend de l'encre sur le sien. Sur 35 gravures larges, 18 étaient dans ce
 *  cas.
 *
 *  ⚠️ Aucune mesure de pixel ne les sépare proprement. La TRAME — la part des gris
 *  qui bordent le trait — met les photographies de paysage au milieu des dessins,
 *  faute de traits. Et ce que le détourage rend TRANSPARENT laisse une bande
 *  trouble : les deux photogravures de Marc y rendent 34 %, le boisseau, qui est un
 *  dessin, 50 %, et quatre photographies de Luc et de Jean entre 50 et 59 %.
 *
 *  ⛔ La légende IMPRIMÉE, elle, le dit : Fillion écrit « (D'après une
 *  photographie.) » sous ses photographies, et « (D'après un ivoire) »,
 *  « (Bas-relief romain) », « (Peinture égyptienne) » sous ses dessins. C'est la
 *  source qui tranche, non le pixel — et c'est ce que la charte demande partout
 *  ailleurs.
 *
 *  ⚠️ DEUX gravures du tome VII n'ont aucune légende, et une poignée nomment un
 *  lieu sans dire le procédé (« Tombeaux taillés dans le roc », « Intérieur de
 *  l'église la Nativité »). Elles retombent donc au trait, ce qui est le parti le
 *  moins coûteux : une photographie détourée se voit tout de suite, un dessin cadré
 *  passe inaperçu et laisse un rectangle. */
function estPhotographie(legende) {
  return /photograph/i.test(legende ?? '')
}

/** ⛔ LE RÉGIME SE FORCE PAR LA DONNÉE, dans `metadata.regime`. Deux gravures du
 *  tome VII sont des demi-teintes dont la légende ne nomme qu'un lieu, et le
 *  détourage y écrase les tons. Recopié d'`app/lib/bibleEdition.ts`, où la page
 *  le lit ; `app/lib/partIllustration.test.ts` tient les deux accordés.
 *
 *  ⚠️ La page nomme les régimes, la chaîne les code : on traduit ici, une seule
 *  fois. Une valeur inconnue est ignorée. */
function regimeForce(metadata) {
  const v = metadata?.regime
  return v === 'vignette' ? 'A' : v === 'au-fil' ? 'B' : v === 'hors-texte' ? 'C' : null
}

/** ⛔ UN FICHIER SE SERT AU DOUBLE DE SA TAILLE D'AFFICHAGE, JAMAIS PLUS
 *  (charte). Au delà, le navigateur réduit une seconde fois derrière nous, et
 *  deux réductions successives moyennent les hachures fines en un gris mou. */
/** ⛔ LA PART DE LA COLONNE SUIT LA LARGEUR IMPRIMÉE, et c'est elle qui décide de
 *  la TAILLE SERVIE, puisqu'un fichier se sert au double de sa taille
 *  d'affichage (charte).
 *
 *  ⚠️ Le premier jet donnait 30 % à toutes les vignettes. Fillion les imprime de
 *  19,8 % à 57,5 % de sa page : la part fixe aplatissait un rapport de 1 à 3 et
 *  jetait, mesuré le 30 août 2026, de 1,6 à 4,7 fois la résolution linéaire de
 *  chaque gravure. C'est la cause de tout ce que l'auteur a relevé.
 *
 *  ⛔ CES QUATRE NOMBRES SONT RECOPIÉS de `app/lib/bibleEdition.ts`, où la page
 *  de lecture les lit. Un script `.mjs` ne peut pas importer le module TypeScript
 *  du site, mais deux copies d'une mesure ne restent égales que par accident : le
 *  test `app/lib/partIllustration.test.ts` compare les deux fichiers et refuse
 *  qu'ils divergent. Même garde que celle qui tient `get_niv1_texte`. */
const PLANCHER_ILLUSTRATION = 0.36
const PLAFOND_ILLUSTRATION = 0.88
const PLAFOND_VIGNETTE = 0.56
const PART_HORS_TEXTE = PLAFOND_ILLUSTRATION
const MESURE_COLONNE = 500

const borner = (part) => Math.min(PLAFOND_ILLUSTRATION, Math.max(PLANCHER_ILLUSTRATION, part))

function partIllustration(regime, largeurImprimee) {
  if (regime === 'C') return borner(PART_HORS_TEXTE)
  if (typeof largeurImprimee !== 'number') return borner(PLANCHER_ILLUSTRATION)
  // ⛔ Le plafond de la vignette suppose une gravure qui TIENT DANS UNE COLONNE.
  //    Celle qui enjambe les deux garde la proportion que Fillion lui donne.
  if (largeurImprimee > LARGEUR_DEUX_COLONNES) return borner(largeurImprimee)
  return borner(Math.min(PLAFOND_VIGNETTE, largeurImprimee))
}

/** Le DOUBLE de la taille d'affichage, jamais plus : au delà, le navigateur
 *  réduit une seconde fois derrière nous et moyenne les hachures. */
function largeurAServir(part) {
  return Math.round(2 * part * MESURE_COLONNE)
}

/** Au-dessus de ce taux, les gris BORDENT le trait : ils sont de la structure,
 *  et le masque du PDF, qui n'en porte aucune, les perdrait. */
export const SEUIL_TRAME = 0.35
const SEUIL_NOYAU = 100

/** ⛔ UNE PLANCHE TOURNÉE SE REDRESSE. Fillion imprime en paysage, sur une page
 *  portrait, les vues qui ne tiendraient pas autrement : le lecteur du volume
 *  tourne le livre. La règle est celle de la chaîne des planches du tome I —
 *  couvrir au moins 30 % de la page ET être nettement verticale — et la rotation
 *  est HORAIRE.
 *
 *  ⚠️ Elle n'est écrite NULLE PART dans la provenance du tome VII : l'ancienne
 *  chaîne la posait sans la consigner, et c'est l'épreuve dans le corps du texte
 *  qui l'a rendue, le Jourdain paraissant debout. Une transformation qu'on
 *  n'inscrit pas se perd à la première reprise. */
const PART_DE_PAGE_TOURNEE = 0.3

function estPlancheTournee(n, largeurPage, hauteurPage) {
  const partLargeur = n[2] - n[0], partHauteur = n[3] - n[1]
  if (partLargeur * partHauteur < PART_DE_PAGE_TOURNEE) return false
  // ⚠️ La verticalité se juge en PIXELS, jamais en fractions de page : la page
  //    est elle-même portrait, et une découpe plus large que haute y couvre une
  //    fraction de hauteur supérieure à sa fraction de largeur. Le Jourdain ne
  //    tournait que par un cheveu, et la synagogue pas du tout.
  return partHauteur * hauteurPage > partLargeur * largeurPage
}

const PDF = 'tmp/pdfs/fillion/lasaintebibletex07fill.pdf'
const DOSSIER_JP2 = 'tmp/jp2-png'
const DOSSIER_COUCHES = 'tmp/fillion-couches'
const DOSSIER_LOCAL = 'tmp/fillion-detourage'
const SEAU_WEB = 'bible-illustrations-web'
const SEAU_MASTER = 'bible-illustrations-master'

const args = process.argv.slice(2)
const FABRIQUER = args.includes('--fabriquer') || args.includes('--televerser')
const TELEVERSER = args.includes('--televerser')
// ⚠️ `--seulement <motifs>` borne la passe aux clés qui contiennent l’un des motifs
//    séparés par une virgule. La chaîne est idempotente et repasser tout le
//    corpus ne fait aucun mal, mais cent soixante-seize gravures coûtent une
//    demi-heure : quand la livraison n’en ajoute que dix, on ne refabrique pas
//    les cent soixante-six autres.
const SEULEMENT = args.includes('--seulement') ? args[args.indexOf('--seulement') + 1].split(',') : null

// ── Outils ───────────────────────────────────────────────────────────────────

/** ⚠️ `resize`, `blur` et `sharpen` peuvent rendre trois canaux là où l'on en
 *  attend un. Sans ce contrôle, la boucle lit un octet sur trois et RAYE
 *  l'image, sans qu'aucune erreur ne le dise. Payé deux fois. */
async function monocanal(pipeline) {
  const r = await pipeline.removeAlpha().toColourspace('b-w').raw().toBuffer({ resolveWithObject: true })
  if (r.info.channels !== 1) throw new Error(`canal unique attendu, reçu ${r.info.channels}`)
  return r
}

/** Les bornes de la découpe, en fractions de la page. ⚠️ `normalized` manque sur
 *  une découpe : elle se CALCULE des bornes absolues et des dimensions de page,
 *  toutes deux présentes. Ce n'est pas deviner, c'est diviser. */
function normaliserDecoupe(boite) {
  if (!boite) return null
  if (Array.isArray(boite.normalized) && boite.normalized.length === 4) return boite.normalized
  const { left, top, right, bottom, page_width_px: W, page_height_px: H } = boite
  if (!W || !H || [left, top, right, bottom].some(v => typeof v !== 'number')) return null
  return [left / W, top / H, right / W, bottom / H]
}

function decouper(largeur, hauteur, n) {
  const box = { left: Math.round(n[0] * largeur), top: Math.round(n[1] * hauteur) }
  box.width = Math.round(n[2] * largeur) - box.left
  box.height = Math.round(n[3] * hauteur) - box.top
  return box
}

/** Fermeture morphologique 3×3, réservée au masque : elle comble les entailles
 *  d'un pixel que la substitution de symboles du JBIG2 laisse sur les traits.
 *  ⛔ Dilatation PUIS érosion, l'ordre inverse amincirait le trait.
 *  ⛔ Jamais sur un ton continu : elle y écraserait la hachure. */
function fermer(source, W, H) {
  const passe = (s, dilate) => {
    const o = Buffer.alloc(W * H)
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let v = dilate ? 0 : 255
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const yy = y + dy, xx = x + dx
        const p = (yy < 0 || yy >= H || xx < 0 || xx >= W) ? 0 : s[yy * W + xx]
        v = dilate ? Math.max(v, p) : Math.min(v, p)
      }
      o[y * W + x] = v
    }
    return o
  }
  return passe(passe(source, true), false)
}

/** ⛔ LA RAMPE ALPHA SE MESURE AUX DEUX BOUTS, ET SUR CETTE GRAVURE-CI.
 *
 *  La version d'avant faisait partir la rampe de 255 et l'arrêtait sur une
 *  amplitude fixe, tirée de l'encre du site. Les deux bouts étaient faux :
 *
 *  ⛔ EN HAUT, le papier n'atteint jamais 255. Il a un grain, et le verso
 *     TRANSPARAÎT. Tout ce qui borde le papier recevait donc un alpha de 1 à 16,
 *     c'est-à-dire un VOILE sur toute la découpe : mesuré, la moyenne des quatre
 *     coins du boisseau valait 4,8 pour un maximum de 16. Un voile uniforme ne se
 *     voit pas en soi, mais ses BORDS dessinent le rectangle de la découpe, et
 *     les caractères du verso y deviennent lisibles parce qu'ils ont une forme.
 *     C'est ce que l'auteur a relevé : « on devine un fond, peut-être les
 *     caractères noirs de la page suivante », « on voit la délimitation du cadre ».
 *
 *  ⛔ EN BAS, l'encre n'atteignait jamais l'opaque. Le gros du trait gravé se
 *     tient entre 150 et 220 après étalement, ce qui rendait un alpha de 40 à 120 :
 *     une gravure GRISE, molle, « floue et baveuse ». La charte le disait déjà des
 *     ornements — « l'ENCRE aussi se mesure, et par sa MÉDIANE » — mais la mesure
 *     ne servait ici qu'à l'étalement, jamais à l'alpha.
 *
 *  Le PLANCHER se prend sur la dispersion PROPRE du papier, mesurée du côté
 *  CLAIR du pic, le seul que l'étalement ne tronque pas : rien n'est plus clair
 *  que le papier, donc ce flanc n'est mêlé à aucune encre. Le pic étant
 *  symétrique, sa demi-largeur haute donne son pied bas.
 *
 *  ⚠️ Un premier essai cherchait la VALLÉE entre le papier et l'encre. Il n'y en
 *  a pas : sur une gravure sur bois, la hachure peuple tout le registre, et le
 *  détecteur dérivait de 143 à 211 selon la planche. */
const FERMETE_DU_PIED = 0.2
const PART_ENCRE_PLEINE = 0.02

function bornesDeRampe(gris, N) {
  const hist = new Uint32Array(256)
  for (const v of gris) hist[v]++
  const lisse = (v) => (hist[Math.max(0, v - 1)] + hist[v] + hist[Math.min(255, v + 1)]) / 3
  let pic = 150
  for (let v = 150; v < 256; v++) if (lisse(v) > lisse(pic)) pic = v
  let demi = 1
  while (pic + demi < 255 && lisse(pic + demi) >= lisse(pic) * FERMETE_DU_PIED) demi++
  let cum = 0, encre = 0
  for (let v = 0; v < 256; v++) { cum += hist[v]; if (cum / N >= PART_ENCRE_PLEINE) { encre = v; break } }
  const plancher = Math.max(encre + 24, pic - demi)
  return { papier: pic, plancher, encre }
}

/** ⛔ LA COURBE : ce qu'on prend pour du FLOU est de la HACHURE moyennée.
 *
 *  Mesurée sur le feuillet JP2, la largeur de transition d'un bord vaut 4 px ;
 *  dans le fichier servi elle vaut 1. Les bords sont donc aussi francs qu'un
 *  raster le permet, et le défaut n'est pas un défaut de netteté : c'est la
 *  BOUILLIE DE GRIS, la hachure du graveur que la réduction de 2,8× moyenne en
 *  alphas intermédiaires — 17,3 % de la surface d'une vignette.
 *
 *  La courbe en S écarte ces partiels vers les deux extrêmes. Mesuré sur les
 *  neuf gravures au trait de Marc :
 *
 *    courbe  bouillie   voile   encre visible perdue
 *      1      17,3 %    14,76          —
 *      1,3    14,0 %    14,25        8,7 %
 *      1,6    11,9 %    13,89       16,0 %
 *
 *  ⚠️ ELLE A UN PRIX : elle efface les partiels les plus faibles. Rien ne s'est
 *  vu manquer à l'agrandissement sur les quatre gravures éprouvées, ni à la taille
 *  d'affichage sur les quatre autres, mais la mesure dit le risque.
 *
 *  ⛔ POSÉE D'ABORD À 1,3, ELLE NE SE VOYAIT PAS. L'auteur l'a relevé le jour
 *  même, et le contrôle a écarté les deux autres causes possibles : les octets
 *  servis sont exactement ceux de la base, et le seau rend bien un 200 avec le
 *  nouveau fichier à un client qui présente l'ancien ETag. Le pas était simplement
 *  trop petit. Éprouvée à la taille d'AFFICHAGE — 151 px, l'encre reposée comme la
 *  page la repose — la marche de 1 à 1,3 ne se distingue pas ; celle de 1,3 à 1,6
 *  se voit ; 2 commence à amincir les traits. D'où 1,6.
 *
 *  ⛔ QUATRE AUTRES VOIES ONT ÉTÉ ÉPROUVÉES ET ÉCARTÉES, ne pas les refaire :
 *   · le BRUIT ne fait pas reculer la bouillie d'un point (23,9 → 23,6 % sur le
 *     paralytique) et monte la granularité de 10,6 à 12,5. Il MASQUE la mollesse,
 *     il ne dessine rien. Sur une photogravure : +2 % d'énergie de bord, +4 % de
 *     poids, invisible même au ×3 ;
 *   · la NETTETÉ forte (σ 0,4, m2 3,5) AUGMENTE la bouillie à 24,3 % : ses halos
 *     sont eux-mêmes des gris intermédiaires ;
 *   · le CONTRASTE LOCAL (CLAHE) fait bouillir la pierre et TACHE les ciels ;
 *   · le FOND LOCAL par maximum glissant ramène le voile de 14,8 à 25 et porte la
 *     bouillie à 26,5 % ;
 *   · la réduction en LUMIÈRE LINÉAIRE est SANS EFFET, la rampe étant mesurée
 *     image par image et absorbant le décalage global.
 *
 *  ⚠️ Et une courbe pondérée par la PLATITUDE du voisinage — qui ne creuserait
 *  que le lavis, en respectant les traits — ne trouve presque rien à corriger :
 *  17,3 → 16,5 %. À 301 px, PLUS RIEN N'EST PLAT. C'est la preuve que la bouillie
 *  est de la hachure, non un lavis, et qu'aucun traitement ne la rendra : le vrai
 *  levier est la TAILLE D'AFFICHAGE, pas le fichier. */
const COURBE_ALPHA = 1.6

function courber(a) {
  if (COURBE_ALPHA === 1 || a <= 0 || a >= 1) return a
  return a < 0.5
    ? 0.5 * Math.pow(2 * a, COURBE_ALPHA)
    : 1 - 0.5 * Math.pow(2 * (1 - a), COURBE_ALPHA)
}

/** ⛔ RECOUDRE UN TRAIT QUE LA RÉDUCTION A DILUÉ — ET RIEN D'AUTRE.
 *
 *  Un trait fin qui traverse un pixel en diagonale n'en couvre qu'une fraction :
 *  la moyenne de la réduction rend un gris pâle, et la courbe achève de le
 *  pousser au papier. Le trait est pourtant là, franc, dans le scan. On lui rend
 *  donc son poids — et ce n'est PAS une restitution, puisque rien n'est dessiné :
 *  on cesse seulement de retirer ce que le témoin porte.
 *
 *  ⛔ TROIS VERROUS, et il faut les trois :
 *   1. ON NE COUD QU'UN CREUX — de l'encre des DEUX CÔTÉS sur un même axe, à un
 *      ou deux pixels. Un trait qui s'arrête ne se prolonge jamais ; seul se
 *      referme ce qui était déjà tenu aux deux bouts.
 *   2. LE PLAFOND EST LE SCAN, par le gris le plus SOMBRE qu'il porte sous le
 *      pixel. Là où aucun trait ne passe, ce minimum est clair et rien ne bouge.
 *   3. ON NE DÉPASSE PAS LE TRAIT LUI-MÊME : jamais plus que le plus faible des
 *      deux bords qui tiennent le creux.
 *
 *  ⚠️ UN PREMIER PLAFOND ÉTAIT LA RAMPE NUE — l'alpha d'avant la courbe. Il est
 *  trop bas pour rien faire : la courbe ne mordant que sous 0,5, la rampe nue y
 *  vaut au plus 0,47, et aucun creux ne pouvait se refermer. Mesuré : 1,15 % de
 *  la surface touchée, ZÉRO trait rejoint. C'est le minimum du scan qu'il faut,
 *  parce que c'est la RÉDUCTION, non la courbe, qui a dilué le trait.
 *
 *  Effet mesuré, en fragments du dessin (deux bouts séparés comptent pour deux) :
 *  paralytique 604 → 559, hémorrhoïsse 740 → 611, médecin 179 → 164. Entre 0,09 %
 *  et 3,37 % de la surface est touchée. */
const COUTURE_TENU = 0.55
const COUTURE_CREUX = 0.45
const COUTURE_PORTEE = 2
const COUTURE_AXES = [[1, 0], [0, 1], [1, 1], [1, -1]]

/** Le plafond, mesuré : sous chaque pixel servi, le gris le plus sombre du scan. */
function plafondDuScan(scan, W, H, bornes) {
  const { plancher, encre } = bornes
  const amplitude = plancher - encre
  const sx = scan.W / W, sy = scan.H / H
  const plafond = new Float32Array(W * H)
  for (let y = 0; y < H; y++) {
    const y0 = Math.floor(y * sy), y1 = Math.min(scan.H, Math.ceil((y + 1) * sy))
    for (let x = 0; x < W; x++) {
      const x0 = Math.floor(x * sx), x1 = Math.min(scan.W, Math.ceil((x + 1) * sx))
      let mn = 255
      for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) {
        const v = scan.data[yy * scan.W + xx]; if (v < mn) mn = v
      }
      plafond[y * W + x] = Math.max(0, Math.min(1, (plancher - mn) / amplitude))
    }
  }
  return plafond
}

function coudreLesCreux(alpha, W, H, plafond) {
  const av = Float32Array.from(alpha)
  let cousus = 0
  for (let y = COUTURE_PORTEE; y < H - COUTURE_PORTEE; y++) {
    for (let x = COUTURE_PORTEE; x < W - COUTURE_PORTEE; x++) {
      const i = y * W + x
      if (av[i] >= COUTURE_CREUX) continue
      let bord = 0
      for (const [dx, dy] of COUTURE_AXES) {
        for (let d = 1; d <= COUTURE_PORTEE; d++) {
          const p = (y - dy * d) * W + (x - dx * d), q = (y + dy * d) * W + (x + dx * d)
          if (av[p] >= COUTURE_TENU && av[q] >= COUTURE_TENU) bord = Math.max(bord, Math.min(av[p], av[q]))
        }
      }
      if (!bord) continue
      const cible = Math.min(bord, plafond[i])
      if (cible > av[i]) { alpha[i] = cible; cousus++ }
    }
  }
  return cousus
}

function versAlpha(gris, W, H, bornes, scan) {
  const { plancher, encre } = bornes
  const amplitude = plancher - encre
  const N = W * H
  const alpha = new Float32Array(N)
  for (let i = 0; i < N; i++) alpha[i] = courber(Math.max(0, Math.min(1, (plancher - gris[i]) / amplitude)))
  const cousus = scan ? coudreLesCreux(alpha, W, H, plafondDuScan(scan, W, H, bornes)) : 0

  const rgba = Buffer.alloc(N * 4)
  let vide = 0, partiels = 0, plein = 0
  for (let i = 0; i < N; i++) {
    const a = alpha[i]
    if (a < 0.004) { vide++; continue }
    const o = i * 4
    rgba[o] = ENCRE[0]; rgba[o + 1] = ENCRE[1]; rgba[o + 2] = ENCRE[2]
    rgba[o + 3] = Math.round(Math.min(1, a) * 255)
    if (rgba[o + 3] >= 235) plein++; else partiels++
  }
  return {
    rgba,
    profil: {
      vide: 100 * vide / N, partiels: 100 * partiels / N, plein: 100 * plein / N,
      cousus: 100 * cousus / N,
    },
  }
}

/** Rogner SUR L'ALPHA. ⛔ Le seuil ne peut pas être « alpha >= 1 » : sous le
 *  dessin traînent des pixels isolés, invisibles à l'œil, dont un seul ancre la
 *  boîte. Un rang ne compte que s'il en porte trois à 8 ou plus. */
function boiteUtile(rgba, W, H, marge = 4) {
  const rang = (horizontal, fixe) => {
    let n = 0
    const long = horizontal ? W : H
    for (let k = 0; k < long; k++) {
      const i = horizontal ? fixe * W + k : k * W + fixe
      if (rgba[i * 4 + 3] >= 8 && ++n >= 3) return true
    }
    return false
  }
  let haut = 0, bas = H - 1, gauche = 0, droite = W - 1
  while (haut < bas && !rang(true, haut)) haut++
  while (bas > haut && !rang(true, bas)) bas--
  while (gauche < droite && !rang(false, gauche)) gauche++
  while (droite > gauche && !rang(false, droite)) droite--
  const b = { left: Math.max(0, gauche - marge), top: Math.max(0, haut - marge) }
  b.width = Math.min(W, droite + marge + 1) - b.left
  b.height = Math.min(H, bas + marge + 1) - b.top
  return b
}

// ── Les sources ──────────────────────────────────────────────────────────────

/** Le feuillet JP2 décodé, s'il a été tiré. ⚠️ Ni sharp ni libvips ne lisent le
 *  JPEG 2000 ici : le décodage passe par ImageMagick, présent dans le WSL qui
 *  sert déjà Kraken, et le PNG obtenu est gardé en cache.
 *
 *  wsl -e bash -lc 'convert <feuillet>.jp2 tmp/jp2-png/f<page>.png' */
/** ⚠️ LE NUMÉRO DE FEUILLET SE COMPLÈTE À TROIS CHIFFRES. Les onze pages de Marc
 *  sont toutes au-delà de la centième, si bien que `f202.png` tombait juste et que
 *  le défaut est resté caché jusqu'à l'arrivée de Matthieu, qui commence au
 *  feuillet 25 : la chaîne cherchait `f25.png` là où le fichier est `f025.png`,
 *  ne le trouvait pas, et retombait sur une branche de repli qui va chercher la
 *  page composée par son adresse — nulle pour un actif sans fichier. */
function feuilletJp2(page) {
  const f = `${DOSSIER_JP2}/f${String(page).padStart(3, '0')}.png`
  return existsSync(f) ? f : null
}

/** Le masque de trait d'une page. ⚠️ Il se reconnaît à ses PROPRIÉTÉS — un seul
 *  canal, la plus grande définition — et non à son rang dans la sortie de
 *  `pdfimages`, que rien ne garantit. */
async function masqueDeTrait(page) {
  mkdirSync(DOSSIER_COUCHES, { recursive: true })
  const deja = () => readdirSync(DOSSIER_COUCHES).filter(f => f.startsWith(`p${page}-`) && f.endsWith('.png'))
  if (deja().length === 0) {
    try {
      execFileSync('pdfimages', ['-f', String(page), '-l', String(page), '-png', PDF, `${DOSSIER_COUCHES}/p${page}`], { stdio: 'ignore' })
    } catch {
      throw new Error(`couches de la page ${page} absentes, et \`pdfimages\` introuvable (poppler, dans le WSL).`)
    }
  }
  let choix = null
  for (const f of deja()) {
    const m = await sharp(`${DOSSIER_COUCHES}/${f}`).metadata()
    if (m.channels !== 1) continue
    if (!choix || m.width * m.height > choix.aire) choix = { fichier: `${DOSSIER_COUCHES}/${f}`, aire: m.width * m.height }
  }
  if (!choix) throw new Error(`aucune couche à un seul canal pour la page ${page}`)
  return choix.fichier
}

// ── La mesure qui choisit la source ──────────────────────────────────────────

/** Part des GRIS qui borde un noyau de trait, sur la page composée. Élevée, les
 *  gris sont de la structure et le masque les perdrait ; basse, ils flottent.
 *  ⛔ Ce n'est pas un détecteur de planche : le grain du papier d'un feuillet en
 *  rangerait une à tort. Il ne se lit qu'après avoir écarté les pleines pages,
 *  que leur nature suffit à désigner. */
export async function partDesGrisAuBordDuTrait(entree) {
  const { data, info } = await monocanal(sharp(entree))
  const W = info.width, H = info.height
  const pres = new Uint8Array(W * H)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (data[y * W + x] >= SEUIL_NOYAU) continue
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const yy = y + dy, xx = x + dx
      if (yy >= 0 && yy < H && xx >= 0 && xx < W) pres[yy * W + xx] = 1
    }
  }
  let gris = 0, borde = 0
  for (let i = 0; i < W * H; i++) {
    if (data[i] < SEUIL_NOYAU || data[i] >= 235) continue
    gris++
    if (pres[i]) borde++
  }
  return { part: gris ? borde / gris : 0, masseGrise: gris / (W * H) }
}

// ── Le détourage ─────────────────────────────────────────────────────────────

/** DEPUIS LE JP2 : un ton continu, dont la hachure survit en alpha PARTIEL.
 *  C'est son office, et c'est le modèle juste, de l'encre posée sur du papier. */
export async function detourerDepuisJp2(feuillet, n, largeurServie) {
  const m = await sharp(feuillet).metadata()
  const tournee = estPlancheTournee(n, m.width, m.height)
  const decoupee = sharp(feuillet).extract(decouper(m.width, m.height, n))
  const brut = await monocanal(tournee ? decoupee.rotate(90) : decoupee)
  const total = brut.info.width * brut.info.height

  // Le PAPIER par son niveau DOMINANT, jamais aux quatre coins ; le point noir
  // au demi-centile, comme la chaîne des planches du tome I.
  const hist = new Uint32Array(256)
  for (const v of brut.data) hist[v]++
  let papier = 200
  for (let v = 200; v < 256; v++) if (hist[v] > hist[papier]) papier = v
  let cum = 0, noir = 0
  for (let v = 0; v < 256; v++) { cum += hist[v]; if (cum / total >= 0.005) { noir = v; break } }
  if (papier - noir < 24) throw new Error('plage tonale trop étroite, feuillet suspect')

  const etale = Buffer.alloc(total)
  for (let i = 0; i < total; i++) {
    etale[i] = Math.max(0, Math.min(255, Math.round((brut.data[i] - noir) * 255 / (papier - noir))))
  }
  const brutRaw = { raw: { width: brut.info.width, height: brut.info.height, channels: 1 } }
  const master = await sharp(etale, brutRaw).png({ compressionLevel: 9 }).toBuffer()

  // ⛔ L'ALPHA SE CALCULE SUR LE GRIS BRUT, JAMAIS SUR L'ÉTALEMENT.
  //    Les deux font le même travail — porter le papier au blanc et l'encre au
  //    noir — et l'étalement passe le premier : il PLAQUE tout le papier sur 255
  //    et détruit le flanc clair du pic, qui est précisément ce que la rampe
  //    mesure pour trouver son plancher. Mesuré, la demi-largeur retombait à 1 et
  //    le plancher à 254 : la rampe ne mordait plus, et le voile revenait intact.
  //    L'étalement reste sur le MASTER, qui est une image de ton continu à garder.
  // ⛔ LA RAMPE ET LE RATTRAPAGE NE DOIVENT PAS SE MÊLER, et les mêler a coûté une
  //    passe entière. La rampe est une mesure de TONS ; le rattrapage n'est qu'un
  //    conditionnement de SORTIE, réglé sur ce que le navigateur laisse passer
  //    (voir `NETTETE_TRAIT`). Or un rattrapage large creuse la queue sombre de
  //    l'histogramme : le point d'encre, pris au 2e centile, tombe avec elle —
  //    mesuré, de 119 à 77 sur le paralytique et de 104 à 62 sur le démoniaque —
  //    la rampe s'élargit d'autant, et TOUS les demi-tons s'éclaircissent. Les
  //    neuf gravures perdaient ainsi de 5 à 19 % de leur densité d'encre, et
  //    l'auteur a vu le démoniaque pâlir.
  //
  //    La rampe se mesure donc sur la réduction NON rattrapée, et s'applique
  //    ensuite au gris rattrapé : le rendu tonal ne bouge pas d'un pixel, et le
  //    rattrapage n'ajoute que ce qu'on lui demande, de la définition de bord.
  const reduite = await sharp(brut.data, brutRaw)
    .resize({ width: Math.min(largeurServie, brut.info.width), fit: 'inside', withoutEnlargement: true, kernel: 'lanczos3' })
    .removeAlpha().toColourspace('b-w').png().toBuffer()
  const pourLaRampe = await monocanal(sharp(reduite).sharpen(NETTETE))
  const red = await monocanal(sharp(reduite).sharpen(NETTETE_TRAIT))
  if (pourLaRampe.info.width !== red.info.width || pourLaRampe.info.height !== red.info.height) {
    throw new Error('les deux rattrapages ne rendent pas la même taille')
  }
  // La rampe se mesure sur l'image RÉDUITE, celle qu'on sert : la réduction
  // déplace l'histogramme, et une rampe posée sur la pleine résolution ne
  // décrirait pas le fichier qu'on écrit.
  const bornes = bornesDeRampe(pourLaRampe.data, pourLaRampe.info.width * pourLaRampe.info.height)
  // ⛔ La couture a besoin du scan À SA RÉSOLUTION, non de l'image réduite : le
  //    plafond est le gris le plus sombre que porte le feuillet sous le pixel,
  //    et c'est justement ce que la réduction a moyenné.
  const { rgba, profil } = versAlpha(red.data, red.info.width, red.info.height, bornes,
    { data: brut.data, W: brut.info.width, H: brut.info.height })
  const boite = boiteUtile(rgba, red.info.width, red.info.height)
  const image = sharp(rgba, { raw: { width: red.info.width, height: red.info.height, channels: 4 } }).extract(boite)
  return {
    source: 'jp2',
    tournee,
    master,
    webp: await image.clone().webp({ lossless: true, effort: 6 }).toBuffer(),
    png: await image.clone().png({ compressionLevel: 9 }).toBuffer(),
    largeur: boite.width, hauteur: boite.height, papier, noir, profil, bornes,
  }
}

/** DEPUIS LE MASQUE : le trait, et rien que lui. Aucune normalisation, aucun
 *  seuil, aucun champ plat : le masque EST l'alpha. ⛔ Repli seulement, faute de
 *  feuillet : il ne porte aucune demi-teinte et ne rendra jamais une gravure. */
export async function detourerDepuisMasque(masque, n, largeurServie) {
  const m = await sharp(masque).metadata()
  const decoupee = sharp(masque).extract(decouper(m.width, m.height, n))
  const brut = await monocanal(estPlancheTournee(n, m.width, m.height) ? decoupee.rotate(90) : decoupee)
  const W = brut.info.width, H = brut.info.height
  const trait = fermer(brut.data, W, H)
  const rgba = Buffer.alloc(W * H * 4)
  for (let i = 0; i < W * H; i++) {
    const a = trait[i]
    if (!a) continue
    const o = i * 4
    rgba[o] = ENCRE[0]; rgba[o + 1] = ENCRE[1]; rgba[o + 2] = ENCRE[2]; rgba[o + 3] = a
  }
  const reduit = await sharp(rgba, { raw: { width: W, height: H, channels: 4 } })
    .resize({ width: Math.min(largeurServie, W), kernel: 'lanczos3' }).png().toBuffer()
  const a = await sharp(reduit).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  const RW = a.info.width, RH = a.info.height
  let vide = 0, partiels = 0, plein = 0
  for (let i = 0; i < RW * RH; i++) {
    const v = a.data[i * 4 + 3]
    if (!v) vide++; else if (v >= 235) plein++; else partiels++
  }
  const boite = boiteUtile(a.data, RW, RH)
  const image = sharp(reduit).extract(boite)
  const N = RW * RH
  return {
    source: 'masque',
    master: null,
    webp: await image.clone().webp({ lossless: true, effort: 6 }).toBuffer(),
    png: await image.clone().png({ compressionLevel: 9 }).toBuffer(),
    largeur: boite.width, hauteur: boite.height,
    profil: { vide: 100 * vide / N, partiels: 100 * partiels / N, plein: 100 * plein / N },
  }
}


// ── Le cadrage ───────────────────────────────────────────────────────────────

/** ⛔ UNE PHOTOGRAVURE NE SE DÉTOURE PAS : ELLE SE CADRE.
 *
 *  Les deux vues de Marc — le Jourdain, les restes de la synagogue de Kefr
 *  Bir'im — sont des photogravures en ton continu : l'encre couvre TOUT le
 *  champ. Mesuré, la surface réellement transparente y valait 3,3 % et 2,4 %,
 *  quand une gravure au trait en rend 85 à 94. Les détourer revenait à poser sur
 *  la page un rectangle d'encre à peine ajouré, dont le seul effet visible était
 *  d'en montrer les bords.
 *
 *  Elles gardent donc leur papier, comme une planche hors-texte, et se rognent
 *  AU FILET GRAVÉ, que Fillion imprime autour d'elles. La doctrine du régime le
 *  disait déjà — « on rogne AU filet, on pose autour un filet à l'encre du
 *  site » — mais la chaîne ne l'appliquait pas.
 *
 *  ⚠️ On rogne EN DEDANS du filet, sans le garder : il est irrégulier, écaillé
 *  aux angles, et un cadre imprimé de travers dans un cadre du site en fait deux.
 *  Le site pose le sien, droit. */

/** Le filet se lit dans le PROFIL DE LUMINANCE MOYENNE au bord : du papier sur
 *  quelques dizaines de rangs, un creux net, puis l'image. On entre donc au
 *  premier creux, et l'on s'arrête à la remontée qui le suit.
 *
 *  ⛔ Le seuil ne peut pas être « part de pixels sombres » : à pleine résolution
 *  le filet est gris et fin, et un seuil à 120 n'en attrapait que la moitié. La
 *  MOYENNE, elle, le voit sans ambiguïté (204 de papier, 126 au creux).
 *
 *  ⚠️ Bornes : le filet se tient dans les 8 % extérieurs, et le creux doit valoir
 *  au moins 20 niveaux sous le papier du bord. Faute de quoi il n'y a pas de
 *  filet, et l'on ne rogne rien plutôt que de rogner au hasard. */
const BANDE_DU_FILET = 0.08
const CREUX_DU_FILET = 20
/** ⚠️ Un cheveu de plus, une fois le filet passé : son bord intérieur est
 *  dégradé sur deux ou trois pixels, et la remontée de la moyenne le franchit
 *  d'un rang trop tôt. Vu à l'agrandissement sur la synagogue, où une bande
 *  claire d'un pixel courait en tête de l'image servie. */
const MARGE_APRES_FILET = 0.0015

function entreeDuFilet(gris, W, H, horizontal, depuisLaFin) {
  const long = horizontal ? H : W
  const bande = Math.max(8, Math.round(long * BANDE_DU_FILET))
  const rang = (k) => {
    const i = depuisLaFin ? long - 1 - k : k
    let s = 0
    const n = horizontal ? W : H
    for (let j = 0; j < n; j++) s += horizontal ? gris[i * W + j] : gris[j * W + i]
    return s / n
  }
  const bord = (rang(0) + rang(1) + rang(2)) / 3
  let creux = 0
  for (let k = 1; k < bande; k++) if (rang(k) < rang(creux)) creux = k
  if (bord - rang(creux) < CREUX_DU_FILET) return 0
  let k = creux
  while (k + 1 < bande && rang(k + 1) > rang(k)) k++
  return Math.min(bande - 1, k + Math.max(3, Math.round(long * MARGE_APRES_FILET)))
}

/** Le papier de 1923 se garde, mais on lui rend sa plage : point blanc sur le
 *  niveau DOMINANT, point noir au demi-centile, comme pour une gravure au trait.
 *  ⛔ Sans alpha : l'image est OPAQUE, et le thème ne la retourne pas. */
export async function cadrerDepuisJp2(feuillet, n, largeurServie) {
  const m = await sharp(feuillet).metadata()
  const tournee = estPlancheTournee(n, m.width, m.height)
  const decoupee = sharp(feuillet).extract(decouper(m.width, m.height, n))
  // ⚠️ extract + rotate se referment en TAMPON avant tout resize : dans une même
  //    chaîne, sharp tourne AVANT de découper, et la boîte tombe alors hors du
  //    champ (« bad extract area »), ou pire, découpe ailleurs sans rien dire.
  const brut = await monocanal(tournee ? decoupee.rotate(90) : decoupee)
  const W = brut.info.width, H = brut.info.height, total = W * H

  const dedans = {
    left: entreeDuFilet(brut.data, W, H, false, false),
    top: entreeDuFilet(brut.data, W, H, true, false),
  }
  dedans.width = W - dedans.left - entreeDuFilet(brut.data, W, H, false, true)
  dedans.height = H - dedans.top - entreeDuFilet(brut.data, W, H, true, true)

  const hist = new Uint32Array(256)
  for (const v of brut.data) hist[v]++
  let papier = 200
  for (let v = 200; v < 256; v++) if (hist[v] > hist[papier]) papier = v
  let cum = 0, noir = 0
  for (let v = 0; v < 256; v++) { cum += hist[v]; if (cum / total >= 0.005) { noir = v; break } }
  if (papier - noir < 24) throw new Error('plage tonale trop étroite, feuillet suspect')

  const etale = Buffer.alloc(total)
  for (let i = 0; i < total; i++) {
    etale[i] = Math.max(0, Math.min(255, Math.round((brut.data[i] - noir) * 255 / (papier - noir))))
  }
  const cadre = sharp(etale, { raw: { width: W, height: H, channels: 1 } }).extract(dedans)
  // ⛔ LE MASTER RESTE NEUTRE : il ne porte que l'étalement, qui est une remise à
  //    l'échelle et non un parti. C'est de lui qu'on repartirait pour changer le
  //    ton, et un ton cuit dans le master se composerait au suivant.
  const master = await cadre.clone().png({ compressionLevel: 9 }).toBuffer()
  // ⛔ ON CREUSE LES TONS EN DERNIER. Le rattrapage creuse ses sous-oscillations
  //    autour de chaque bord ; appliqué à une image DÉJÀ assombrie, elles butent
  //    sur zéro. Mesuré sur le Jourdain : la puissance passée en premier portait
  //    le noir pur à 12,44 %, passée en dernier à 6,89 %, et bridée à 1,53 %.
  const rendu = await creuserLesTons(await sharp(await cadre.clone().png().toBuffer())
    .resize({ width: Math.min(largeurServie, dedans.width), kernel: 'lanczos3' })
    .sharpen(NETTETE_TON)
    .png().toBuffer())
  const mm = await sharp(rendu).metadata()
  return {
    source: 'jp2',
    cadree: true,
    tournee,
    master,
    webp: await sharp(rendu).webp({ quality: 90, effort: 6 }).toBuffer(),
    png: rendu,
    largeur: mm.width, hauteur: mm.height, papier, noir,
    rogne: { gauche: dedans.left, haut: dedans.top, droite: W - dedans.left - dedans.width, bas: H - dedans.top - dedans.height },
    profil: { vide: 0, partiels: 0, plein: 100 },
  }
}

/** Reporte dans `bible_edition_asset_files` ce que le fichier déposé porte
 *  vraiment : dimensions, poids, empreinte, profil et version du traitement.
 *  ⚠️ Le profil passe à 2.0.0 : la source d'autorité a changé, et une version
 *  qui ne bougerait pas ferait croire au même traitement. */
/** ⛔ ET IL CRÉE LA LIGNE QUAND ELLE N'EXISTE PAS.
 *
 *  La fonction ne faisait qu'un `update`, ce qui suffisait tant que les actifs
 *  venaient d'une chaîne qui posait déjà leurs deux lignes de fichier. Les 155
 *  gravures collectées pour Matthieu, Luc et Jean n'en ont AUCUNE : l'`update`
 *  aurait touché zéro ligne, **sans erreur**, et la base n'aurait rien su des
 *  fichiers déposés. Le seau aurait porté des images que la page ne pouvait pas
 *  nommer.
 *
 *  ⚠️ Le chemin suit la convention déjà en place, relevée sur les onze de Marc :
 *  `fillion/<tome>/<livre>/<chapitre>/<clé>/<rôle>`. Il se dérive de l'ancre
 *  canonique, et rien n'est inventé.
 *
 *  ⚠️ La ligne prend la publication de son ACTIF, jamais `true` par défaut : les
 *  gravures neuves sont privées tant que l'arbitrage des 43 anciennes n'est pas
 *  rendu (charte § 35.16.15), et un fichier public sous un actif privé serait un
 *  état que personne n'a voulu. */
const DOSSIER_TOME = { t01: 'pentateuch', t07: null }

function cheminDuFichier(cle, canonIdStart, role) {
  const tome = cle.match(/^fillion-(t\d+)-/)?.[1]
  if (!tome) throw new Error(`clé sans tome : ${cle}`)
  const [livre, chapitre] = String(canonIdStart ?? '').split('.')
  if (!livre) throw new Error(`${cle} : pas d'ancre canonique, le chemin ne se dérive pas`)
  const section = DOSSIER_TOME[tome] ?? livre.toLowerCase()
  const rang = DOSSIER_TOME[tome] ? livre.toLowerCase() : (chapitre ?? '0')
  const nom = role === 'master' ? 'master.png' : 'web.webp'
  return `fillion/${tome}/${section}/${rang}/${cle}/${nom}`
}

/** ⛔ `source_sha256` est OBLIGATOIRE, et c'est bien vu : une ligne de fichier doit
 *  dire de quoi elle dérive. On empreinte le feuillet RÉELLEMENT LU — celui que la
 *  chaîne a ouvert pour produire l'image —, jamais le PDF, qui n'a servi qu'à
 *  trouver la gravure. */
const empreintesSource = new Map()
function empreinteDuFeuillet(chemin) {
  if (!chemin) return null
  if (!empreintesSource.has(chemin)) {
    empreintesSource.set(chemin, createHash('sha256').update(readFileSync(chemin)).digest('hex'))
  }
  return empreintesSource.get(chemin)
}

async function reporterFichier(db, cle, role, buffer, mime, largeur, hauteur, traitement = null, sourceSha = null) {
  const { data: actif, error: e0 } = await db
    .from('bible_edition_assets').select('id,family_id,is_public,canon_id_start').eq('asset_key', cle).single()
  if (e0) throw new Error(`actif ${cle} introuvable : ${e0.message}`)

  const champs = {
    width_px: largeur,
    height_px: hauteur,
    byte_size: buffer.length,
    mime_type: mime,
    sha256: createHash('sha256').update(buffer).digest('hex'),
    processing_profile: traitement ? `fillion-illustration-${traitement}` : 'fillion-illustration',
    // ⚠️ 4.7.0 — le RÉGIME lit la légende ET se force par la donnée, et la PART
    //    suit la largeur imprimée pour tout. Deux règles changées le 31 août 2026 :
    //    un fichier de 4.6.0 ne vient donc pas de cette chaîne, même quand son
    //    contenu se trouve identique.
    processing_version: '4.7.0',
  }
  const { data: ligne, error: e1 } = await db.from('bible_edition_asset_files')
    .select('id').eq('asset_id', actif.id).eq('variant_role', role).maybeSingle()
  if (e1) throw new Error(`lecture refusée pour ${cle} (${role}) : ${e1.message}`)

  if (ligne) {
    const { error } = await db.from('bible_edition_asset_files').update(champs).eq('id', ligne.id)
    if (error) throw new Error(`report refusé pour ${cle} (${role}) : ${error.message}`)
    return
  }
  const seau = role === 'master' ? SEAU_MASTER : SEAU_WEB
  const chemin = cheminDuFichier(cle, actif.canon_id_start, role)
  const { error } = await db.from('bible_edition_asset_files').insert({
    ...champs,
    family_id: actif.family_id,
    asset_id: actif.id,
    variant_role: role,
    storage_bucket: seau,
    storage_path: chemin,
    // ⛔ UN MASTER N'A PAS D'ADRESSE PUBLIQUE : son seau est privé, et la base le
    //    refuse — c'est bien vu, une adresse publique sur un fichier qui ne l'est
    //    pas serait une promesse en l'air. Le web, lui, la porte.
    public_uri: role === 'master'
      ? null
      : `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${seau}/${chemin}`,
    color_space: role === 'master' ? 'gray' : 'srgb',
    bit_depth: 8,
    source_sha256: sourceSha,
    validation_status: 'review',
    is_public: role === 'master' ? false : actif.is_public,
  })
  if (error) throw new Error(`création refusée pour ${cle} (${role}) : ${error.message}`)
}

// ── Passe ────────────────────────────────────────────────────────────────────

async function principal() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const cle = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !cle) throw new Error('NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis')
  const db = createClient(url, cle)

  const { data, error } = await db
    .from('v_bible_edition_assets')
    .select('asset_key,asset_kind,public_uri,source_page_index,source_crop_box,web_storage_path,printed_caption,canon_id_start,metadata')
    .order('source_page_index')
  if (error) throw new Error(`actifs illisibles : ${error.message}`)

  if (FABRIQUER) mkdirSync(DOSSIER_LOCAL, { recursive: true })
  const rapport = []
  for (const a of data) {
    if (SEULEMENT && !SEULEMENT.some(m => a.asset_key.includes(m))) continue
    // ⛔ Une PLANCHE ne se détoure jamais : c'est une page entière du volume,
    //    avec son filet gravé, sa légende imprimée et son papier.
    if (a.asset_kind === 'plate') {
      rapport.push({ cle: a.asset_key, regime: 'C', motif: 'planche pleine page' })
      continue
    }
    const n = normaliserDecoupe(a.source_crop_box)
    if (!n) { rapport.push({ cle: a.asset_key, regime: '?', motif: 'découpe illisible' }); continue }

    // ⛔ LE RÉGIME NE SE LIT PLUS SUR LA SEULE LARGEUR : c'est FILLION qui dit ce
    //    qu'il imprime. Voir `estPhotographie`. Et la DONNÉE le force quand la
    //    légende ne dit pas le procédé : voir `regimeForce`.
    const largeurImprimee = n[2] - n[0]
    const force = regimeForce(a.metadata)
    const regime = force ?? (largeurImprimee > LARGEUR_DEUX_COLONNES && estPhotographie(a.printed_caption)
      ? 'B' : 'A')
    const ligne = { cle: a.asset_key, regime, largeurImprimee, tournee: null }

    if (FABRIQUER) {
      const feuillet = feuilletJp2(a.source_page_index)
      let r
      const servie = largeurAServir(partIllustration(regime, largeurImprimee))
      if (feuillet && regime === 'B') {
        // ⛔ Une gravure qui ENJAMBE LES DEUX COLONNES imprimées est une
        //    photogravure en ton continu : elle se CADRE, elle ne se détoure pas.
        //    Les deux critères concordent, ce qui n'est pas un hasard — Fillion
        //    ne donne cette largeur qu'aux vues, jamais aux objets isolés.
        r = await cadrerDepuisJp2(feuillet, n, servie)
      } else if (feuillet) {
        r = await detourerDepuisJp2(feuillet, n, servie)
      } else if (!a.public_uri) {
        // ⛔ Sans feuillet ET sans page déjà servie, il n'y a rien à traiter. On le
        //    DIT au lieu d'aller chercher une adresse nulle, qui arrête la passe
        //    entière sur un message que rien ne rattache à l'actif fautif.
        ligne.motif = '⛔ ni feuillet JP2 décodé ni fichier servi : rien à traiter'
        rapport.push(ligne)
        continue
      } else {
        const composee = Buffer.from(await (await fetch(a.public_uri)).arrayBuffer())
        const m = await partDesGrisAuBordDuTrait(composee)
        if (m.part >= SEUIL_TRAME) {
          ligne.motif = '⛔ pas de feuillet JP2, et les gris sont de la structure : le masque les perdrait'
          rapport.push(ligne)
          continue
        }
        r = await detourerDepuisMasque(await masqueDeTrait(a.source_page_index), n, servie)
      }
      Object.assign(ligne, { source: r.source, largeur: r.largeur, hauteur: r.hauteur, profil: r.profil, tournee: r.tournee, cadree: r.cadree, rogne: r.rogne, bornes: r.bornes })
      writeFileSync(`${DOSSIER_LOCAL}/${a.asset_key}.png`, r.png)
      if (TELEVERSER) {
        // ⚠️ `web_storage_path` est NUL pour un actif qui n'a pas encore de
        //    fichier : le chemin se dérive alors de l'ancre, selon la convention
        //    déjà en place. Voir `cheminDuFichier`.
        const cheminWeb = a.web_storage_path ?? cheminDuFichier(a.asset_key, a.canon_id_start, 'web')
        const { error: e1 } = await db.storage.from(SEAU_WEB)
          .upload(cheminWeb, r.webp, { contentType: 'image/webp', upsert: true })
        if (e1) throw new Error(`web refusé pour ${a.asset_key} : ${e1.message}`)
        if (r.master) {
          const cheminMaster = a.web_storage_path
            ? a.web_storage_path.replace(/web\.webp$/, 'master.png')
            : cheminDuFichier(a.asset_key, a.canon_id_start, 'master')
          const { error: e2 } = await db.storage.from(SEAU_MASTER)
            .upload(cheminMaster, r.master, { contentType: 'image/png', upsert: true })
          if (e2) throw new Error(`master refusé pour ${a.asset_key} : ${e2.message}`)
        }
        // ⛔ LA BASE DOIT DIRE CE QUI EST SERVI. Remplacer un fichier sans
        //    reporter ses dimensions laisse la page composer sur les anciennes :
        //    l'épreuve du 30 août a rendu le Jourdain en portrait, sa proportion
        //    étant lue dans une ligne périmée. Dimensions, poids et empreinte se
        //    reportent au même passage que le dépôt, jamais plus tard.
        const sourceSha = empreinteDuFeuillet(feuilletJp2(a.source_page_index))
        await reporterFichier(db, a.asset_key, 'web', r.webp, 'image/webp', r.largeur, r.hauteur, r.cadree ? 'cadree' : 'detouree', sourceSha)
        if (r.master) {
          const mm = await sharp(r.master).metadata()
          await reporterFichier(db, a.asset_key, 'master', r.master, 'image/png', mm.width, mm.height, null, sourceSha)
        }
        ligne.depose = true
      }
    }
    rapport.push(ligne)
  }

  for (const r of rapport) {
    if (r.regime === 'C') continue
    const lp = r.largeurImprimee ? `${(100 * r.largeurImprimee).toFixed(0).padStart(3)} % de large` : ''
    const src = r.source ? `  ${r.source.padEnd(7)}` : '  '
    const tour = r.tournee ? ' ↻' : '  '
    const rampe = r.bornes ? `  papier ${String(r.bornes.papier).padStart(3)}  plancher ${String(r.bornes.plancher).padStart(3)}  encre ${String(r.bornes.encre).padStart(3)}` : ''
    const dim = r.largeur ? `${String(r.largeur).padStart(3)}×${String(r.hauteur).padStart(3)}  ` : ''
    const prof = r.profil ? `plein ${r.profil.plein.toFixed(1).padStart(4)} %  partiels ${r.profil.partiels.toFixed(1).padStart(4)} %` : (r.motif ?? '')
    console.log(`${r.regime}${tour} ${r.cle.padEnd(38)} ${lp}${src}${dim}${prof}${rampe}`)
  }
  const par = (g) => rapport.filter(r => r.regime === g).length
  console.log(`\nA ${par('A')} · B ${par('B')} · C ${par('C')}`)
  if (!FABRIQUER) console.log(`Mesure seule. \`--fabriquer\` écrit dans ${DOSSIER_LOCAL}, \`--televerser\` remplace master et web.`)
}

if (process.argv[1].endsWith('detourer-gravures.mjs')) {
  principal().catch(e => { console.error(e.message); process.exit(1) })
}
