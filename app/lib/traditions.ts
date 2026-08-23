// ── Les traditions, rangées par familles ──────────────────────────────────────
//
// `auteurs.traditions` est un vocabulaire LIBRE : cinq étiquettes par auteur,
// taillées au plus juste pour chacun. Cent quarante étiquettes distinctes en
// base, dont la plupart ne désignent qu'un seul auteur (« Quartodécimanisme »,
// « Lérins », « Culture cicéronienne »…). Le filtre de la bibliothèque les
// dépliait toutes : seize auteurs suffisaient à en aligner soixante-dix, et
// personne ne pouvait plus rien y chercher.
//
// On ne touche pas aux étiquettes — elles sont justes, et la fiche de l'auteur
// continue de les donner en toutes lettres. C'est le FILTRE qui change d'échelle :
// il n'offre plus que sept familles, et chaque étiquette rejoint la sienne.
//
// Le rattachement se fait par MOTIFS et non par table nominative : une étiquette
// nouvelle (et il s'en écrira à chaque auteur importé) se range d'elle-même, sans
// qu'on ait à tenir un dictionnaire à jour. Les familles sont examinées DANS
// L'ORDRE de ce tableau, la première qui reconnaît l'étiquette l'emporte ; c'est
// pourquoi « Théologie ascétique » revient à la spiritualité et non à la doctrine,
// bien que les deux familles connaissent le mot « théologie ». Une étiquette
// qu'aucune famille ne reconnaît reste lisible sur la fiche, mais ne paraît pas
// dans le filtre : mieux vaut une pastille de moins qu'une pastille fausse.

export type FamilleTradition = {
  /** Clé stable, employée par l'état du filtre. */
  cle: string
  /** Nom affiché sur la pastille. */
  libelle: string
  /** Ce que la famille reconnaît, sur l'étiquette sans accents et en bas de casse. */
  motif: RegExp
}

export const FAMILLES_TRADITION: FamilleTradition[] = [
  {
    cle: 'ecoles',
    libelle: 'Écoles et milieux',
    // Le lieu d'où l'on parle : une école, une Église locale, une aire de langue.
    motif: /ecole|eglise|^patristique|cappadocien|afrique chretienne|lerins|episcopat|alexandri|antioch|cesaree|jerusalem|smyrne|asie mineure|corbie|ordre dominicain|christianisme (?:syriaque|latin|romain|athenien|judeen)|^(?:grecque|latine|syriaque|georgienne|antiochienne)$/,
  },
  {
    cle: 'epoques',
    libelle: 'Époques et courants',
    // Le moment, et les courants qui se réclament d'un maître.
    motif: /primitif|christianisme ancien|carolingien|renaissance|^medievale$|peres apostoliques|scolastique|augustinisme|origenisme|thomisme|chrysostomien|reception|nouvelle prophetie|encratisme|quartodeciman/,
  },
  {
    cle: 'spiritualite',
    libelle: 'Spiritualité et monachisme',
    motif: /ascet|asces|monach|monastique|hesychas|priere|contemplat|mystique|martyre|ethique|morale|penitentiel|theologie spirituelle|vie spirituelle/,
  },
  {
    cle: 'exegese',
    libelle: 'Exégèse et lettres',
    // Lire l'Écriture, et tout ce qui s'écrit autour d'elle : commentaire,
    // traduction, histoire, prédication, poésie.
    motif: /exeges|commentaire|philolog|traduction|historiograph|chronograph|predication|homeli|poesie|hymnod|harmonie evangeli|origines des evangiles|paroles du seigneur|tradition orale|tradition johannique|hagiograph|apocryph|apocalypse|succession|memoire ecclesiale/,
  },
  {
    cle: 'doctrine',
    libelle: 'Doctrine',
    motif: /theologi|christolog|trinit|ecclesiolog|anthropolog|resurrection|eucharist|baptism|catech|liturg|mystagog|discipline eccles|ordre ecclesiastique|pastorale|grace|recapitulation|logos|deux voies|tradition apostolique|pascale|millenarisme|monotheisme|dogm/,
  },
  {
    cle: 'philosophie',
    libelle: 'Philosophie',
    motif: /philosoph|platonis|aristotel|logique|arts liberaux|ciceronien/,
  },
  {
    cle: 'polemique',
    libelle: 'Apologétique et polémique',
    motif: /apolog|polemi|antignost|antimarcion|heresiolog|antijuda|dialogue judeo|dialogue avec la culture|identite chretienne/,
  },
]

function sansAccents(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

/** La famille d'une étiquette, ou `null` si aucune ne la reconnaît. */
export function familleTradition(tradition: string | null | undefined): string | null {
  const t = sansAccents(tradition ?? '')
  if (!t) return null
  return FAMILLES_TRADITION.find(f => f.motif.test(t))?.cle ?? null
}

/** Les familles d'un auteur, sans doublon et dans l'ordre d'affichage. */
export function famillesDesTraditions(traditions: readonly string[] | null | undefined): string[] {
  const clés = new Set((traditions ?? []).map(familleTradition).filter(Boolean) as string[])
  return FAMILLES_TRADITION.filter(f => clés.has(f.cle)).map(f => f.cle)
}
