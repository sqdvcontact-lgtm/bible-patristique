// LES HAUTS FAITS — ce que le code sait en faire.
//
// Partage net avec la base : `public.hauts_faits` dit COMBIEN et COMMENT ça s'appelle,
// ce module sait seulement COMPTER et CLASSER. Les seuils et les textes se corrigent
// donc sans déploiement, ce qui est la condition pour les recalibrer après l'ouverture,
// sur la distribution réelle — avec six comptes, aucune rareté ne se calibre encore.
//
// ⛔ LA RÈGLE QUI COMMANDE TOUT LE RESTE : il doit toujours rester un haut fait À DEUX
// PAS. Anderson, Huttenlocher, Kleinberg et Leskovec (WWW 2013) ont mesuré sur
// plusieurs millions de comptes Stack Overflow que l'activité s'accélère fortement à
// l'approche d'un badge, puis s'effondre après l'obtention et retourne au niveau de
// base. ⚠️ Le remède n'est PAS un palier lointain : le gradient est nul à distance
// jugée infinie, et un degré hors de portée masque la clôture au lieu de l'éviter.
// Ce sont des séries DÉCALÉES qu'il faut, et c'est `serieLaPlusProche` qui les fait
// jouer : à tout moment, la page met en avant celle dont le degré suivant est le
// plus près, quelle que soit la série.

/** Ce que le code sait compter. Une mesure absente d'ici ne peut pas être servie,
 *  quand bien même la base la nommerait : le référentiel se corrige librement, mais
 *  il ne peut pas inventer un compteur. */
export const MESURES = [
  'passages_retenus',
  'oeuvres_bibliotheque',
  'peres_retenus',
  'siecles_retenus',
  'commentaires_valides',
  'essais_publies',
  // ── Ouvertes le 1er septembre 2026, sur la table des hauts faits proposée par
  // l'auteur. ⛔ TOUTES se dérivent de marques VOLONTAIRES (voir mesuresLecteur.ts) :
  // pas une ne lit ce que le lecteur a seulement regardé.
  'versets_retenus',
  'passages_patristiques',
  'favoris_poses',
  'livres_bibliques',
  'testaments_touches',
  'evangiles_touches',
  'epitres_pauliniennes',
  'psaumes_retenus',
  'deuterocanoniques',
  'genese_ouverte',
  'exode_et_nombres',
  'passages_anciens',
  'passages_grecs',
  'passages_latins',
  'traductions_retenues',
  'traductions_dun_verset',
  'peres_sur_un_verset',
  'augustin_en_un_jour',
  'confessions_ouvertes',
  'jours_marques',
  'prelevements_nuit',
  'prelevements_aurore',
  'mois_ecoules',
  'commentaires_poses',
  'reponses_posees',
  'signalements_poses',
] as const

export type Mesure = (typeof MESURES)[number]

export function mesureConnue(nom: string): nom is Mesure {
  return (MESURES as readonly string[]).includes(nom)
}

/** Ce que le lecteur a marqué, mesure par mesure. */
export type Compteurs = Record<Mesure, number>

/** Ce que la bibliothèque donne à lire aujourd'hui : le dénominateur des seuils
 *  exprimés en part. Il monte avec le corpus, et les derniers degrés avec lui. */
export type Corpus = { auteurs: number; siecles: number; oeuvres: number }

/** À quel total se rapporte une part. Une mesure qui n'a pas de total ne peut pas
 *  porter de seuil relatif : `seuilEffectif` le refuse plutôt que de deviner. */
const TOTAL_DE_LA_MESURE: Partial<Record<Mesure, keyof Corpus>> = {
  peres_retenus: 'auteurs',
  siecles_retenus: 'siecles',
  oeuvres_bibliotheque: 'oeuvres',
}

/** Le TON d'une case. Ce sont les trois familles de corpus déjà chartées — on
 *  n'invente aucune teinte (charte § 40). */
export const FAMILLES = ['ecriture', 'peres', 'communaute'] as const
export type FamilleCorpus = (typeof FAMILLES)[number]

export function familleConnue(nom: string): nom is FamilleCorpus {
  return (FAMILLES as readonly string[]).includes(nom)
}

export type HautFait = {
  code: string
  serie: string
  serie_nom: string
  degre: number
  nom: string
  notice: string
  mesure: string
  seuil: number | null
  seuil_part: number | null
  ordre: number
  /** Ce que la case vaut. ⛔ Ne s'échange contre RIEN : c'est une mesure, jamais une
   *  monnaie. Voir la migration hauts_faits_points. */
  points: number
  famille: string
}

/** Le seuil réellement à atteindre.
 *
 *  ⛔ Un seuil en PART se recalcule sur le corpus du jour : « les trois quarts des
 *  auteurs » vaut onze aujourd'hui et vingt demain. C'est ce qui empêche un dernier
 *  degré de devenir soit impossible, soit trivial — un palier à cinquante Pères n'est
 *  pas rare quand il n'y en a que quinze, il est hors d'atteinte, et un haut fait
 *  hors d'atteinte est un défaut, non un défi.
 *
 *  Rend `null` si le seuil ne peut pas se résoudre : le haut fait est alors écarté
 *  plutôt que présenté avec un but faux. */
export function seuilEffectif(hf: HautFait, corpus: Corpus): number | null {
  if (hf.seuil != null) return hf.seuil
  if (hf.seuil_part == null || !mesureConnue(hf.mesure)) return null
  const cle = TOTAL_DE_LA_MESURE[hf.mesure]
  if (!cle) return null
  const total = corpus[cle]
  if (!total || total <= 0) return null
  // On arrondit vers le HAUT : « les trois quarts de quinze » font onze, non dix.
  return Math.max(1, Math.ceil(total * hf.seuil_part))
}

/** Les hauts faits que `etatDesSeries` va ÉCARTER, et pourquoi.
 *
 *  ⛔ Un haut fait écarté ne se signale par RIEN : sa case disparaît du tableau, le
 *  total de points baisse, et personne ne s'en aperçoit. C'est ce qui est arrivé à
 *  « Grand lecteur » le 1er septembre 2026 — un seuil en part sur une mesure sans
 *  total —, et seul un compte de cases (43 au lieu de 44) l'a trahi. La route
 *  journalise donc ce que cette fonction rend : c'est la règle déjà posée pour les
 *  panneaux discrets, « rien ne distingue vide de cassé ». */
export function hautsFaitsEcartes(hautsFaits: HautFait[], corpus: Corpus): { code: string; raison: string }[] {
  const ecartes: { code: string; raison: string }[] = []
  for (const hf of hautsFaits) {
    if (!mesureConnue(hf.mesure)) {
      ecartes.push({ code: hf.code, raison: `mesure inconnue du code : ${hf.mesure}` })
      continue
    }
    if (seuilEffectif(hf, corpus) == null) {
      ecartes.push({
        code: hf.code,
        raison: hf.seuil_part != null && !TOTAL_DE_LA_MESURE[hf.mesure]
          ? `seuil en part sur « ${hf.mesure} », qui n’a pas de total de corpus`
          : 'seuil irrésoluble',
      })
    }
  }
  return ecartes
}

export type DegreEtat = HautFait & {
  seuilAtteindre: number
  obtenu: boolean
  obtenuLe: string | null
  /** Où en est le compteur de cette case. La grille en fait « 31 / 50 ».
   *  ⚠️ Il est BORNÉ au seuil : une case obtenue affiche « 50 / 50 », jamais « 200 / 50 »,
   *  et une case dont le compteur a redescendu reste pleine, l'obtention étant acquise. */
  valeur: number
  restant: number
  /** De 0 à 1 : la barre de la case. */
  part: number
}

export type SerieEtat = {
  serie: string
  nom: string
  mesure: Mesure
  /** Où en est le compteur aujourd'hui. */
  valeur: number
  degres: DegreEtat[]
  /** Le prochain degré non obtenu, et ce qu'il reste à faire pour lui. */
  prochain: DegreEtat | null
  restant: number | null
}

/** L'état d'une série : ses degrés, celui qui vient, et la distance qui l'en sépare. */
export function etatDesSeries(
  hautsFaits: HautFait[],
  compteurs: Compteurs,
  corpus: Corpus,
  obtenus: Map<string, string>,
): SerieEtat[] {
  const parSerie = new Map<string, HautFait[]>()
  for (const hf of hautsFaits) {
    if (!mesureConnue(hf.mesure)) continue
    if (!parSerie.has(hf.serie)) parSerie.set(hf.serie, [])
    parSerie.get(hf.serie)!.push(hf)
  }

  const series: SerieEtat[] = []
  for (const [serie, liste] of parSerie) {
    const mesure = liste[0].mesure as Mesure
    const valeur = compteurs[mesure] ?? 0

    const degres: DegreEtat[] = liste
      .map(hf => ({ hf, seuilAtteindre: seuilEffectif(hf, corpus) }))
      .filter((d): d is { hf: HautFait; seuilAtteindre: number } => d.seuilAtteindre != null)
      .sort((a, b) => a.seuilAtteindre - b.seuilAtteindre || a.hf.degre - b.hf.degre)
      .map(({ hf, seuilAtteindre }) => {
        // ⛔ Un degré obtenu le RESTE, même si le compteur redescend : c'est le journal
        // qui fait foi, jamais le compteur du jour. Une perte démotive plus qu'un gain
        // ne motive, et l'on ne retire pas ce qui a été acquis.
        const obtenu = obtenus.has(hf.code) || valeur >= seuilAtteindre
        // ⚠️ La valeur affichée est BORNÉE au seuil, et une case acquise est PLEINE :
        // « 50 / 50 » et non « 200 / 50 » quand on a dépassé, « 50 / 50 » et non
        // « 3 / 50 » quand le compteur a redescendu sous un degré déjà obtenu.
        const atteint = obtenu ? seuilAtteindre : Math.min(valeur, seuilAtteindre)
        return {
          ...hf,
          seuilAtteindre,
          obtenu,
          obtenuLe: obtenus.get(hf.code) ?? null,
          valeur: atteint,
          restant: Math.max(0, seuilAtteindre - atteint),
          part: seuilAtteindre > 0 ? atteint / seuilAtteindre : 1,
        }
      })

    if (!degres.length) continue
    const prochain = degres.find(d => !d.obtenu) ?? null
    series.push({
      serie,
      nom: liste[0].serie_nom,
      mesure,
      valeur,
      degres,
      prochain,
      restant: prochain ? Math.max(0, prochain.seuilAtteindre - valeur) : null,
    })
  }

  return series.sort((a, b) => (a.degres[0]?.ordre ?? 0) - (b.degres[0]?.ordre ?? 0))
}

/** La série dont le degré suivant est le PLUS PROCHE, toutes séries confondues.
 *
 *  C'est elle que la page met en avant, et c'est tout le mécanisme : après une
 *  obtention, ce n'est pas le degré supérieur de la même série qui reprend la main,
 *  c'est la série voisine, celle où il ne manque plus qu'un ou deux gestes. À égalité,
 *  la première dans l'ordre du référentiel — pour que l'ordre reste une décision
 *  éditoriale, et non le fruit du hasard. */
export function serieLaPlusProche(series: SerieEtat[]): SerieEtat | null {
  const enCours = series.filter(s => s.prochain && s.restant != null)
  if (!enCours.length) return null
  return enCours.reduce((meilleure, s) => (s.restant! < meilleure.restant! ? s : meilleure))
}

/** Les codes que le lecteur vient d'atteindre et que le journal ne porte pas encore. */
export function obtentionsNouvelles(series: SerieEtat[], obtenus: Map<string, string>): string[] {
  return series.flatMap(s => s.degres.filter(d => d.obtenu && !obtenus.has(d.code)).map(d => d.code))
}

/** Ce qu'on annonce pour une série en cours.
 *
 *  ⚠️ Toujours ce qui RESTE, jamais le chemin parcouru : ici, contrairement au
 *  parcours d'entrée, le lecteur est déjà engagé, et c'est le petit reste qui porte
 *  (Koo et Fishbach). « Encore deux » se lit ; « 8 sur 10 » se calcule. */
export function libelleRestant(serie: SerieEtat): string | null {
  if (!serie.prochain || serie.restant == null) return null
  if (serie.restant === 0) return 'Atteint.'
  return serie.restant === 1 ? 'Encore un.' : `Encore ${serie.restant}.`
}

// ── Le tableau de cases ──────────────────────────────────────────────────────
//
// Décision de l'auteur, 1er septembre 2026 : « un grand tableau de cases à
// collectionner, dans différents tons harmonieux ; deux états, validé et non validé ;
// les non validées sobres, avec un indice de progression ». La carte « Ce que j'ai
// retenu » est retirée : elle montrait un ÉTAT, elle ne donnait rien à remplir.

/** Toutes les cases, à plat et dans l'ordre du référentiel — la grille les range
 *  ensuite par série, chaque série tenant sa ligne et son ton. */
export function casesDuTableau(series: SerieEtat[]): DegreEtat[] {
  return series.flatMap(s => s.degres)
}

export type Score = { obtenus: number; possibles: number; cases: number; total: number }

/** Le score. ⛔ Il ne s'échange contre RIEN — ni droit, ni accès, ni fonction. C'est
 *  la mesure agrégée d'un parcours, jamais une monnaie (charte § 40). */
export function score(series: SerieEtat[]): Score {
  const cases = casesDuTableau(series)
  const acquises = cases.filter(c => c.obtenu)
  return {
    obtenus: acquises.reduce((n, c) => n + (c.points ?? 0), 0),
    possibles: cases.reduce((n, c) => n + (c.points ?? 0), 0),
    cases: acquises.length,
    total: cases.length,
  }
}

// ── Les paliers de progression ───────────────────────────────────────────────
//
// ⛔ ON NE NOTIFIE PAS CHAQUE PAS. Une vignette à chaque prélèvement serait
// insupportable, et une notification qu'on subit cesse d'être lue — c'est la règle
// déjà payée sur les gardes rouges en permanence. Deux paliers par case au plus :
// la moitié du chemin, puis le dernier pas.
export const PALIER_MOITIE = 0.5

/** Un palier ne se dit que s'il APPREND quelque chose.
 *
 *  ⚠️ Sous quatre, « la moitié » n'a pas de sens : sur un seuil de 2, elle tombe au
 *  premier geste, en même temps que le début. Et « il ne reste qu'un » ne se dit pas
 *  sur un seuil de 1, où ce serait annoncer qu'on n'a rien fait. */
export const SEUIL_MINIMAL_MOITIE = 4
export const SEUIL_MINIMAL_DERNIER_PAS = 2

export type Palier = 'moitie' | 'dernier-pas'

/** Où en est une case sur l'échelle des paliers, ou `null` si elle n'y est pas encore.
 *  Une case obtenue n'a plus de palier : elle a sa propre notification. */
export function palierAtteint(c: DegreEtat): Palier | null {
  if (c.obtenu) return null
  if (c.restant === 1 && c.seuilAtteindre >= SEUIL_MINIMAL_DERNIER_PAS) return 'dernier-pas'
  if (c.part >= PALIER_MOITIE && c.seuilAtteindre >= SEUIL_MINIMAL_MOITIE) return 'moitie'
  return null
}

/** Ce qu'on annonce dans une petite notification de progression. */
export function libellePalier(c: DegreEtat, palier: Palier): string {
  return palier === 'dernier-pas'
    ? `Plus qu’un pas avant « ${c.nom} ».`
    : `À mi-chemin de « ${c.nom} » — ${c.valeur} sur ${c.seuilAtteindre}.`
}

/** Ce que chaque mesure compte, au singulier et au pluriel.
 *
 *  ⛔ Il sert à écrire l'avancement EN TOUTES LETTRES — « 31 passages sur 50 », le
 *  mot même de l'auteur (« 55 versets commentés sur 100 »). Une fraction « 31 / 50 »
 *  est un tableur, pas une étagère ; c'est ce qu'il a refusé le 1er septembre 2026
 *  (« le 2/4 est tellement formel ! »). ⚠️ Le nom vient d'ici et non de la base : le
 *  référentiel dit CE QU'ON COMPTE, la langue appartient au code. */
const NOM_MESURE: Record<Mesure, readonly [string, string]> = {
  passages_retenus:      ['passage', 'passages'],
  oeuvres_bibliotheque:  ['œuvre', 'œuvres'],
  peres_retenus:         ['Père', 'Pères'],
  siecles_retenus:       ['siècle', 'siècles'],
  commentaires_valides:  ['commentaire validé', 'commentaires validés'],
  essais_publies:        ['publication', 'publications'],
  versets_retenus:       ['verset', 'versets'],
  passages_patristiques: ['passage des Pères', 'passages des Pères'],
  favoris_poses:         ['favori', 'favoris'],
  livres_bibliques:      ['livre', 'livres'],
  testaments_touches:    ['Testament', 'Testaments'],
  evangiles_touches:     ['Évangile', 'Évangiles'],
  epitres_pauliniennes:  ['épître', 'épîtres'],
  psaumes_retenus:       ['psaume', 'psaumes'],
  deuterocanoniques:     ['livre deutérocanonique', 'livres deutérocanoniques'],
  passages_anciens:      ['passage en langue ancienne', 'passages en langue ancienne'],
  passages_grecs:        ['passage grec', 'passages grecs'],
  passages_latins:       ['passage latin', 'passages latins'],
  traductions_retenues:  ['traduction', 'traductions'],
  traductions_dun_verset:['traduction d’un même verset', 'traductions d’un même verset'],
  peres_sur_un_verset:   ['Père sur un même verset', 'Pères sur un même verset'],
  augustin_en_un_jour:   ['passage d’Augustin en un jour', 'passages d’Augustin en un jour'],
  jours_marques:         ['jour', 'jours'],
  prelevements_nuit:     ['passage retenu la nuit', 'passages retenus la nuit'],
  prelevements_aurore:   ['passage retenu avant l’aurore', 'passages retenus avant l’aurore'],
  mois_ecoules:          ['mois', 'mois'],
  commentaires_poses:    ['commentaire', 'commentaires'],
  reponses_posees:       ['réponse', 'réponses'],
  signalements_poses:    ['coquille signalée', 'coquilles signalées'],
  // ⛔ Les mesures BOOLÉENNES n'ont pas de nom : « 0 Genèse ouverte sur 1 » ne se
  // lit pas. Une case à seuil 1 sur un fait unique se passe d'indice — le nom du
  // haut fait dit déjà tout ce qu'il y a à faire.
  genese_ouverte:        ['', ''],
  exode_et_nombres:      ['', ''],
  confessions_ouvertes:  ['', ''],
}

/** L'indice de progression d'une case non acquise, tel qu'il s'écrit dessus.
 *
 *  ⛔ À ZÉRO on ne dit pas « 0 passage sur 1 », qui est un constat d'échec posé sur
 *  chacune des vingt et une cases d'un nouveau venu : on dit le BUT seul, qui est
 *  une invitation. C'est la même règle que le parcours d'entrée, où l'avance donnée
 *  se justifie au lieu de se compter. */
export function libelleProgression(c: DegreEtat): string {
  const noms = mesureConnue(c.mesure) ? NOM_MESURE[c.mesure] : null
  // ⛔ Une mesure SANS NOM est un fait unique, non un compte : « Au commencement »
  // ne s'annonce pas « 0 sur 1 ». La carte reste muette et son nom suffit.
  if (noms && !noms[0]) return ''
  if (!noms) return c.valeur <= 0 ? `${c.seuilAtteindre}` : `${c.valeur} sur ${c.seuilAtteindre}`
  const [sing, plur] = noms
  if (c.valeur <= 0) return `${c.seuilAtteindre} ${c.seuilAtteindre > 1 ? plur : sing}`
  return `${c.valeur} ${c.valeur > 1 ? plur : sing} sur ${c.seuilAtteindre}`
}

/** Les petits nombres s'écrivent en toutes lettres dans la PHRASE de tête — pas dans
 *  une case, où la place manque et où le chiffre se lit mieux. Au-delà, le chiffre. */
const EN_LETTRES = [
  'aucune', 'une', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix',
  'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit',
  'dix-neuf', 'vingt', 'vingt et une', 'vingt-deux', 'vingt-trois', 'vingt-quatre',
] as const

export function enLettres(n: number): string {
  return EN_LETTRES[n] ?? String(n)
}

/** La phrase qui coiffe le tableau. ⛔ Un tableau vide ne s'annonce pas « aucune case
 *  sur vingt et une », qui accueille un nouveau venu par un échec : il annonce ce
 *  qu'il y a à faire. */
export function libelleCollection(score: Score): string {
  // ⛔ Les lettres ou les chiffres, jamais les DEUX dans la même phrase : « Dix-neuf
  // cases sur 44 » se lit comme une coquille. Au-delà de ce que la table sait écrire,
  // toute la phrase passe au chiffre.
  const enToutesLettres = score.cases < EN_LETTRES.length && score.total < EN_LETTRES.length
  const dire = (n: number) => (enToutesLettres ? enLettres(n) : String(n))
  if (score.cases === 0) return `${majuscule(dire(score.total))} cases à remplir.`
  return `${majuscule(dire(score.cases))} case${score.cases > 1 ? 's' : ''} sur ${dire(score.total)}.`
}

function majuscule(mot: string): string {
  return mot.charAt(0).toUpperCase() + mot.slice(1)
}
