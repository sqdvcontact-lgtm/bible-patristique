// REGISTRE DES PROPOSITIONS DE GPT — une source RÉDIGÉE, jamais un scan.
//
// Même parti que l'inventaire des illustrations : ce fichier dit ce que GPT a
// proposé, ce que la mesure en dit, et ce que la proposition heurte s'il y a lieu.
// Un relevé automatique rendrait des phrases, jamais un arbitrage.
//
// ⛔ CHAQUE PROPOSITION PORTE SON AVANT-APRÈS, sur une entrée RÉELLE de l'apparat,
// citée avec son numéro de note et sa ligne imprimée. On lit trois états :
//   1. l'entrée telle qu'elle est EN BASE ;
//   2. ce que le site en rend AUJOURD'HUI, calculé par le renderer réel
//      (`texteApparatAffiche`), et non recopié à la main ;
//   3. ce que la consigne produirait.
// ⚠️ L'état 3 est une APPLICATION LITTÉRALE, pas une amélioration : là où la
// consigne bute ou ne dit pas, `reserve` le nomme au lieu de combler le trou.
//
// ⛔ PARTAGE DES RÔLES : ce fichier ne DÉCIDE rien. L'état de chaque proposition et
// les instructions qui l'accompagnent appartiennent à l'auteur du site, vivent dans
// `parametres.<CLE_DIRECTIVES>` et ne sont jamais écrits d'ici.
//
// Pour ajouter un lot : une entrée de plus dans LOTS. Les identifiants sont des
// clés de stockage — ⛔ ne jamais renommer un identifiant déjà arbitré, la
// directive qui lui est attachée s'en trouverait orpheline.

import { ROLE_APPARAT_CRITIQUE } from '@/app/lib/apparatCritique'

/** Où vivent les directives de l'auteur. Lue par la page, écrite par la route. */
export const CLE_DIRECTIVES = 'directives_propositions_gpt'

export type EtatArbitrage = 'a_arbitrer' | 'retenue' | 'retenue_amendee' | 'refusee' | 'plus_tard'

export const ETATS: { cle: EtatArbitrage; label: string; teinte: string }[] = [
  { cle: 'a_arbitrer', label: 'À arbitrer', teinte: 'var(--cs-texte-doux)' },
  { cle: 'retenue', label: 'Retenue', teinte: 'var(--cs-vert)' },
  { cle: 'retenue_amendee', label: 'Retenue, amendée', teinte: 'var(--cs-or)' },
  { cle: 'refusee', label: 'Refusée', teinte: 'var(--cs-danger)' },
  { cle: 'plus_tard', label: 'Plus tard', teinte: 'var(--cs-attente)' },
]

// ── Fragments d'un rendu proposé ─────────────────────────────────────────────
// `latin` s'imprime en italique, `sigle` en romain effacé, `gloss` en romain
// secondaire : c'est la typographie que GPT demande, montrée plutôt que décrite.

export type RoleFragment = 'latin' | 'sigle' | 'gloss'
export type Fragment = { v: string; r?: RoleFragment }

const l = (v: string): Fragment => ({ v, r: 'latin' })
const g = (v: string): Fragment => ({ v, r: 'gloss' })
const s = (v: string): Fragment => ({ v, r: 'sigle' })
const t = (v: string): Fragment => ({ v })

export type Exemple = {
  /** Une entrée RÉELLE, citée telle qu'elle est en base. */
  source: {
    note: number
    ligne: number
    texte: string
    /** Le rôle éditorial de l'entrée. Absent : l'apparat de Knöll. */
    role?: string | null
    /** D'où elle vient, quand ce n'est pas l'apparat des Confessions. */
    provenance?: string
  }
  /** Ce que la consigne produirait, ligne par ligne. */
  apres: Fragment[][]
  /** Où la consigne bute, ce qu'elle ne dit pas, ou ce qu'elle suppose. */
  reserve?: string
}

/** Une consigne antérieure et la proposition qui la heurte, citées toutes deux. */
export type Heurt = { consigne: string; proposition: string }

export type Proposition = {
  /** Clé de stockage de la directive. ⛔ Immuable une fois arbitrée. */
  id: string
  rubrique: string
  titre: string
  /** Ce que GPT demande, dans ses termes. */
  texte: string
  exemple?: Exemple
  /** Un fait MESURÉ sur les 7 266 entrées, pour que l'arbitrage porte sur du réel. */
  mesure?: string
  /** Ce que la proposition heurte dans une consigne antérieure. Les deux côtés sont
   *  cités ; le registre ne tranche pas. ⚠️ Une LISTE depuis le regroupement du
   *  2026-08-25 : un point qui en absorbe trois porte les trois heurts, et n'en
   *  perd aucun. */
  heurts?: Heurt[]
  /** Déjà servi sur le site. Un FAIT, pas une décision. */
  dejaEnPlace?: boolean
}

export type Lot = {
  id: string
  titre: string
  objet: string
  recuLe: string
  propositions: Proposition[]
}

// ── Lot 1 : mise en forme de l'apparat critique ──────────────────────────────

const APPARAT: Proposition[] = [
  // ── La décision qui commande ───────────────────────────────────────────────
  {
    id: 'apparat-critique/ordre-de-priorite',
    rubrique: 'La décision qui commande',
    titre: 'Fidélité à Knöll, ou lisibilité pour le lecteur ?',
    texte: "Ordre de priorité : fidélité à Knöll, puis conservation intégrale de l'information, puis lisibilité, puis esthétique. Toute transformation incertaine doit rester non transformée plutôt que de produire une interprétation fausse.",
    mesure: "Les six autres points en découlent : c'est le seul dont la réponse change toutes les autres.",
    exemple: {
      source: { note: 46, ligne: 1, texte: '1 adpraehendam FS, apprehendam BGOP, apprehendam V; moriar om. C, moriarne MV.' },
      apres: [
        [g('Si la lisibilité passe devant :')],
        [t('Texte : '), l('apprehendam'), g('   ← leçon devinée')],
        [s('F, S'), t(' : '), l('adpraehendam')],
        [s('C'), t(' : omet '), l('moriar')],
        [s('M, V'), t(' : '), l('moriarne')],
        [g('Si la fidélité passe devant :')],
        [t('adpraehendam FS, apprehendam BGOP, apprehendam V; moriar om. C, moriarne MV.')],
      ],
      reserve: "⛔ Les deux ordres ne donnent pas la même page, et tout l'écart est là. « Lisibilité d'abord » doit choisir un lemme que l'entrée ne nomme pas, et ce choix devient invisible au lecteur, qui le lira comme une donnée. « Fidélité d'abord » laisse l'entrée telle quelle, illisible au non-spécialiste, mais ne prête rien à Knöll. Cette entrée ne porte aucun crochet, et deux témoins différents y donnent la même graphie : rien ne dit laquelle est la leçon retenue.",
    },
  },

  // ── Ce qu'il faut trancher ─────────────────────────────────────────────────
  {
    id: 'apparat-critique/recomposition',
    rubrique: 'Ce qu’il faut trancher',
    titre: 'Recomposer chaque entrée en lemme, variantes et témoins',
    texte: "Ne pas afficher le crochet fermant, l'interpréter comme un séparateur entre lemme et variante. Afficher le lemme sous la forme « Texte : » suivi du latin. Une ligne distincte par variante ou groupe de témoins. Ne pas conserver la ponctuation condensée de l'imprimé quand elle ne sert qu'à séparer des unités logiques. Un parseur identifie lemme, variante, témoins, opération critique et commentaire éditorial ; en cas d'ambiguïté, il conserve la forme source.",
    mesure: "4 645 entrées sur 7 266 (64 %) ne portent AUCUN crochet, donc aucun lemme repérable ; 490 en portent plusieurs ; 3 495 portent au moins un point-virgule. Le repli sur la forme source serait le cas ordinaire, non l'exception.",
    heurts: [
      {
        consigne: "« conserver les crochets `]`, parenthèses, points, astérisques et abréviations » (consigne du 25 août, §3).",
        proposition: "« Ne pas afficher le crochet fermant `]` ».",
      },
      {
        consigne: "« Le code d'affichage ne doit modifier aucune ponctuation » (consigne du 25 août, §7).",
        proposition: "« Ne pas conserver artificiellement la ponctuation condensée de l'apparat imprimé ».",
      },
      {
        consigne: "« Le renderer doit seulement présenter fidèlement les données » et « ne jamais embellir ou réinterpréter automatiquement la notation critique » (§3 et §7).",
        proposition: "analyser chaque entrée en cinq constituants et la recomposer en lignes françaises.",
      },
    ],
    exemple: {
      source: { note: 17, ligne: 11, texte: '11 eum inuocabo Q; et] ut V; quo] in quo F; ueniad F sic saepe, uenat M; in me] M2 s. l.' },
      apres: [
        [s('Q'), t(' : '), l('eum inuocabo'), g('   ← unité sans lemme')],
        [t('Texte : '), l('et')],
        [s('V'), t(' : '), l('ut')],
        [t('Texte : '), l('quo')],
        [s('F'), t(' : '), l('in quo')],
        [s('F'), t(' : '), l('ueniad'), g(', et souvent ainsi')],
        [s('M'), t(' : '), l('uenat')],
        [t('Texte : '), l('in me')],
        [s('M2'), t(' : au-dessus de la ligne')],
      ],
      reserve: "⛔ « ueniad F sic saepe » est le piège. « sic saepe » n'est ni une leçon ni un témoin : c'est une remarque de Knöll disant que ce manuscrit écrit ainsi partout ailleurs. Un parseur qui la prend pour une variante fabrique un témoignage. La formule reparaît note 4 et note 9. ⚠️ Et sur la note 46, sans crochet, la règle n'a aucune prise : la page serait mi-recomposée, mi-brute, sans que le lecteur sache pourquoi.",
    },
  },
  {
    id: 'apparat-critique/abreviations',
    rubrique: 'Ce qu’il faut trancher',
    titre: 'Développer les abréviations éditoriales en français',
    texte: "Afficher en français clair lorsque le sens est certain : om. « omet », add. « ajouté », suppl. « suppléé », corr. « corrigé », del. « effacé », ras. « rasure », supra lin. et s. l. « au-dessus de la ligne », in mg. et mg. « dans la marge », fort. « peut-être », edd. « éditions », cett. « autres témoins », pr. « premier », alt. « second », m. 1, m. 2 et m. 3 « première, seconde, troisième main ». Ne pas développer m. rec. avant vérification de la convention de Knöll ; toute autre abréviation non univoque reste telle quelle.",
    mesure: "Occurrences : om. 1 637, edd. 701, ras. 575, add. 427, m. 1/2/3 379, corr. 347, pr. 212, alt. 157, s. l. 128, mg. 115, in mg. 114, m. rec. 38, del. 29, suppl. 12, cett. 8, fort. 4, supra lin. 3.",
    heurts: [
      {
        consigne: "« Le code d'affichage ne doit développer aucune abréviation » (consigne du 25 août, §7).",
        proposition: "développer dix-huit abréviations éditoriales en français clair.",
      },
    ],
    exemple: {
      source: { note: 8, ligne: 11, texte: '11 et scire—sit supra lin. add. S; sit prius B; sit om. W; an inuocare te] om. S; fort. erant addita in mg. nunc deleta; set F.' },
      apres: [
        [s('S'), t(' : '), l('et scire … sit'), g(', ajouté au-dessus de la ligne')],
        [s('B'), t(' : '), l('sit'), g(' placé avant')],
        [s('W'), t(' : omet '), l('sit')],
        [t('Texte : '), l('an inuocare te')],
        [s('S'), t(' : omet ce passage'), g(' ; peut-être ajouté dans la marge, puis effacé')],
        [s('F'), t(' : '), l('set')],
      ],
      reserve: "⚠️ Deux réserves. « supra lin. » ne paraît que TROIS fois sur 7 266, alors que GPT en fait son exemple phare ; la forme courante est « s. l. », 128 fois. Et la règle laisse « m. rec. » intact, ce qui donne des lignes mi-françaises, mi-latines : la note 6337 rendrait « V : premier sensisset, corrigé m. rec. », où trois mots de la même entrée reçoivent trois traitements. Il faut trancher : ou l'on développe tout, ou l'on ne développe rien.",
    },
  },
  {
    id: 'apparat-critique/sigles',
    rubrique: 'Ce qu’il faut trancher',
    titre: 'Découper les sigles, et les expliquer ailleurs',
    texte: "Séparer clairement les sigles multiples : BPQ devient B, P, Q. Conserver les exposants. Ne jamais développer un sigle de manuscrit dans la note ; prévoir une légende générale des sigles ailleurs dans l'interface.",
    mesure: "Les témoins de Knöll sont des capitales isolées (B C D E F G H L M O P Q S V W), auxquelles s'ajoutent des minuscules (b, mo, o). Un exposant après la lettre désigne une MAIN successive du même manuscrit : M¹ la première, M² la seconde. ⚠️ Les deux graphies coexistent dans la base, « M² » 115 fois et « M2 » quand l'océrisation n'a pas rendu l'exposant. Le seul témoin que l'apparat nomme lui-même est E, « liber Parisinus no. 12191 » (note 204) ; la table complète est dans la préface de Knöll, qui n'est pas importée.",
    heurts: [
      {
        consigne: "« conserver les sigles des manuscrits tels quels » et « ne normaliser aucun sigle de manuscrit » (consigne du 25 août, §3 et §7).",
        proposition: "« BPQ devient B, P, Q ».",
      },
    ],
    exemple: {
      source: { note: 2089, ligne: 9, texte: "9 studiosus B1, studiosa BI; currerem FGMV; ambrosii BCFGHMOPQW'b, Ambrosium mo" },
      apres: [
        [s('B1'), t(' : '), l('studiosus')],
        [s('B, I'), t(' : '), l('studiosa'), g('   ← faux découpage')],
        [s('F, G, M, V'), t(' : '), l('currerem')],
        [s("B, C, F, G, H, M, O, P, Q, W'b"), t(' : '), l('ambrosii'), g('   ← découpage douteux')],
        [s('mo'), t(' : '), l('Ambrosium')],
      ],
      reserve: "⛔ L'entrée montre la règle en échec, et c'est pourquoi elle est ici. « BI » et « B1 » se suivent dans la même ligne : l'un est une main, l'autre porte un i que l'océrisation a peut-être fabriqué. Découper « BI » en « B, I » invente un témoin, I n'étant pas des témoins de Knöll. Et « W'b » n'est ni une lettre ni deux. L'entrée porte d'ailleurs une demande de contrôle visuel. ⚠️ La légende, elle, reste à constituer : le corpus n'en porte aucune.",
    },
  },

  // ── Ce qui en découle ──────────────────────────────────────────────────────
  {
    id: 'apparat-critique/italique-latin',
    rubrique: 'Ce qui en découle',
    titre: 'Latin en italique, commentaire et sigles en romain',
    texte: "Tout latin correspondant au lemme, à une variante, ou à un mot ajouté, supprimé ou corrigé, doit être en italique. Le commentaire explicatif et les sigles des manuscrits restent en romain.",
    mesure: "Suspendu à la recomposition : sans parseur, rien ne sait dans une entrée ce qui est latin et ce qui est commentaire. Refuser la recomposition, c'est refuser l'italique avec elle.",
    exemple: {
      source: { note: 2079, ligne: 20, texte: '20 surge** (re ras.) B; reuiuisceret BCMP¹QV, rereuiuisceret W, reuiuiscet G; traderes O, redderes BPQb' },
      apres: [
        [s('B'), t(' : '), l('surge**'), g(', re en rasure')],
        [s('B, C, M, P¹, Q, V'), t(' : '), l('reuiuisceret')],
        [s('W'), t(' : '), l('rereuiuisceret')],
        [s('G'), t(' : '), l('reuiuiscet')],
        [s('O'), t(' : '), l('traderes')],
        [s('B, P, Q, b'), t(' : '), l('redderes')],
      ],
      reserve: "⚠️ « surge** » : les deux astérisques appartiennent-ils au mot, donc à l'italique, ou sont-ils une marque d'éditeur, donc au romain ? La consigne ne le dit pas, et la réponse change ce que le lecteur croit lire. Même question pour les 698 entrées qui portent un astérisque.",
    },
  },
  {
    id: 'apparat-critique/couleur',
    rubrique: 'Ce qui en découle',
    titre: 'Se servir de la couleur, sans lui confier le sens',
    texte: "La couleur peut aider : lemme en teinte neutre ou atténuée, variante en couleur d'accent du site, sigles en teinte secondaire discrète, commentaire en couleur normale. Ne jamais faire dépendre la compréhension de la seule couleur. Le rendu doit rester compréhensible sans couleur, en mode sombre, à l'impression, et pour un utilisateur daltonien.",
    mesure: "Le thème Cuir est monochrome par décision : une couleur d'accent y serait la seule tache d'une page qui n'en a plus. Il s'y sépare par la chroma et la clarté, jamais par la teinte.",
    exemple: {
      source: { note: 12, ligne: 5, texte: '5 quaeram] **eram F; et] ut M2 supra lin.' },
      apres: [
        [t('Texte : '), l('quaeram')],
        [s('F'), t(' : '), l('**eram')],
        [t('Texte : '), l('et')],
        [s('M2'), t(' : '), l('ut'), g(', au-dessus de la ligne')],
      ],
      reserve: "L'épreuve à faire est de relire ce bloc en niveaux de gris. Si « Texte : », le sigle et la leçon restent distincts, la couleur n'était qu'un renfort. Sinon, elle portait le sens, et la consigne est violée par son propre rendu.",
    },
  },

  // ── Ce qui est déjà tenu ───────────────────────────────────────────────────
  {
    id: 'apparat-critique/acquis',
    rubrique: 'Ce qui est déjà tenu',
    titre: 'Ce que le site fait déjà, et que GPT confirme',
    texte: "Quatre consignes en une. Supprimer le numéro de ligne initial quand il correspond à printed_line, sans toucher à la base. Conserver exposants, astérisques, rasures, lacunes et points d'interrogation. Ne pas corriger l'OCR, ne pas développer conjecturalement les sigles, ne pas traduire ni remplacer les lectures latines, ne modifier ni note_number, ni note_key, ni les ancres, ni les offsets, ni needs_review, ni human_validated. Employer un renderer réutilisable commandé par editorial_role, et non par kind.",
    mesure: "Les quatre sont servies depuis le 25 août. 698 entrées portent un astérisque, 18 un point d'interrogation, 7 265 ouvrent sur leur ligne imprimée. Aucun bloc n'a été réécrit.",
    dejaEnPlace: true,
    exemple: {
      source: {
        note: 148, ligne: 0, role: null,
        provenance: 'La Cité de Dieu, texte latin des Bénédictins (Vivès)',
        texte: 'Editi, sed dæmonia mala. At melioris notæ Mss. sed omina mala, id est præsagia excidii et cladis venturæ.',
      },
      apres: [[t('Editi, sed dæmonia mala. At melioris notæ Mss. sed omina mala, id est præsagia excidii et cladis venturæ.')]],
      reserve: "⚠️ L'exemple montre la LIMITE de la règle, qui est ce qu'il fallait éprouver. Cette note ressemble à un apparat : elle oppose les éditions aux manuscrits de meilleure qualité, exactement comme Knöll. Mais elle ne porte pas `editorial_role`, et elle garde donc le rendu ordinaire ; 3 265 blocs de ce texte sont dans ce cas. Côté Confessions, la conservation se voit sur la note 142, « misereris (be add. m. 2) M; qnm*** (qnm ras.) P; peccato W¹. » : « qnm*** » est une abréviation mutilée que la tentation serait de restituer en « quoniam », et l'interdit dit non.",
    },
  },
]

/**
 * REPRISE DES IDENTIFIANTS — dix-huit points regroupés en sept, le 2026-08-25.
 *
 * ⛔ Un identifiant est une clé de stockage : le renommer ORPHELINE la directive
 * qui y pend. Quatre instructions étaient déjà posées au moment du regroupement,
 * dont deux questions. Cette table les reporte sur le point qui a absorbé le leur,
 * et `lireDirectives` la lit à chaque chargement.
 *
 * ⚠️ AUCUNE écriture en base : le paramètre garde ses anciennes clés, et la reprise
 * se fait à la LECTURE. Une réécriture aurait été irréversible, et elle aurait fait
 * perdre la trace de ce que l'auteur avait répondu, et à quoi.
 */
export const REPRISES: Record<string, string> = {
  'apparat-critique/crochet-masque': 'apparat-critique/recomposition',
  'apparat-critique/lemme-texte': 'apparat-critique/recomposition',
  'apparat-critique/ligne-par-variante': 'apparat-critique/recomposition',
  'apparat-critique/ponctuation-condensee': 'apparat-critique/recomposition',
  'apparat-critique/parseur': 'apparat-critique/recomposition',
  'apparat-critique/repli-forme-source': 'apparat-critique/recomposition',
  'apparat-critique/abreviations-developpees': 'apparat-critique/abreviations',
  'apparat-critique/abreviations-reservees': 'apparat-critique/abreviations',
  'apparat-critique/sigles-separes': 'apparat-critique/sigles',
  'apparat-critique/sigles-non-developpes': 'apparat-critique/sigles',
  'apparat-critique/couleur-secondaire': 'apparat-critique/couleur',
  'apparat-critique/lisible-sans-couleur': 'apparat-critique/couleur',
  'apparat-critique/ligne-imprimee': 'apparat-critique/acquis',
  'apparat-critique/signes-conserves': 'apparat-critique/acquis',
  'apparat-critique/interdits': 'apparat-critique/acquis',
  'apparat-critique/renderer-reutilisable': 'apparat-critique/acquis',
}


export const LOTS: Lot[] = [
  {
    id: 'apparat-critique',
    titre: 'Mise en forme de l’apparat critique latin des Confessions',
    objet: "Rendre l'apparat de Knöll (A0010O0001T0001, 7 266 entrées) lisible à un lecteur non spécialiste, sans altérer l'information philologique.",
    recuLe: '2026-08-25',
    propositions: APPARAT,
  },
]

/** Le rôle éditorial que porte l'entrée d'un exemple : l'apparat, sauf mention. */
export function roleExemple(exemple: Exemple): string | null {
  return exemple.source.role === undefined ? ROLE_APPARAT_CRITIQUE : exemple.source.role
}

// ── Directives de l'auteur ───────────────────────────────────────────────────

/** Une pièce du dialogue, telle qu’elle a été écrite, avec le moment où elle a été
 *  posée. Les pièces s'EMPILENT : une consigne nouvelle ne remplace pas la
 *  précédente, elle vient après. C’est un journal, pas un champ. */
export type Message = { texte: string; posee: string | null }

/** Nom conservé : `instructions` désignait déjà ce type avant que GPT n’ait sa
 *  colonne. ⛔ Ne pas retirer, la route et la page l’importent. */
export type Instruction = Message

/** Un point du registre porte DEUX voix, et elles ne se mêlent jamais :
 *  ce que l’auteur ordonne, et ce que GPT répond. */
export type Directive = {
  etat: EtatArbitrage
  /** L’auteur du site. C’est cette voix qui commande. */
  instructions: Message[]
  /** GPT. Elle éclaire, elle ne décide pas. */
  reponses: Message[]
}

export const DIRECTIVE_VIDE: Directive = { etat: 'a_arbitrer', instructions: [], reponses: [] }

export type Directives = {
  version: 1
  majLe: string | null
  instructionsGenerales: Message[]
  reponsesGenerales: Message[]
  parProposition: Record<string, Directive>
}

export const DIRECTIVES_VIDES: Directives = {
  version: 1, majLe: null, instructionsGenerales: [], reponsesGenerales: [], parProposition: {},
}

export const PLAFOND_INSTRUCTION = 4000
export const PLAFOND_INSTRUCTIONS = 100

/** Les deux voix du dialogue. `instructions` est la clé de stockage historique. */
export type Voix = 'instructions' | 'reponses'

export const VOIX: { cle: Voix; label: string; placeholder: string }[] = [
  { cle: 'instructions', label: 'Mes instructions', placeholder: 'Une instruction…' },
  { cle: 'reponses', label: 'Réponses de GPT', placeholder: 'La réponse de GPT…' },
]

/** Nettoie une liste de messages venue du client ou de la base. Écarte le vide,
 *  borne la longueur et le nombre. ⛔ Ne date rien : c’est la route qui date, pour
 *  qu’un client ne puisse pas antidater une consigne. */
export function lireMessages(v: unknown): Message[] {
  if (typeof v === 'string') {
    // Forme héritée : une note unique. On la garde comme première instruction plutôt
    // que de la perdre au premier chargement.
    const seule = v.trim()
    return seule ? [{ texte: seule.slice(0, PLAFOND_INSTRUCTION), posee: null }] : []
  }
  if (!Array.isArray(v)) return []
  return v
    .map(x => {
      if (typeof x === 'string') return { texte: x.trim(), posee: null }
      if (!x || typeof x !== 'object') return { texte: '', posee: null }
      const o = x as Record<string, unknown>
      return {
        texte: typeof o.texte === 'string' ? o.texte.trim() : '',
        posee: typeof o.posee === 'string' ? o.posee : null,
      }
    })
    .filter(i => i.texte.length > 0)
    .map(i => ({ ...i, texte: i.texte.slice(0, PLAFOND_INSTRUCTION) }))
    .slice(0, PLAFOND_INSTRUCTIONS)
}

/** Réunit deux listes venues de points fondus, dans l'ordre où elles ont été
 *  écrites. ⚠️ Les non datées ferment la marche : elles viennent d'une forme
 *  héritée, dont on ne sait pas quand elle a été posée, et les dater serait
 *  inventer. */
function fondre(a: Message[] | undefined, b: Message[]): Message[] {
  if (!a?.length) return b
  return [...a, ...b].sort((x, y) => {
    if (x.posee === y.posee) return 0
    if (!x.posee) return 1
    if (!y.posee) return -1
    return x.posee < y.posee ? -1 : 1
  })
}

/** Relit ce que porte `parametres.valeur`, qui est du TEXTE. Tolérante : une valeur
 *  absente, illisible ou d'une autre forme rend un registre vierge plutôt que de
 *  faire tomber la page. Une directive orpheline (proposition renommée ou retirée)
 *  est conservée dans l’objet mais ne s’affiche plus. */
export function lireDirectives(valeur: unknown): Directives {
  if (typeof valeur !== 'string' || !valeur.trim()) return DIRECTIVES_VIDES
  let brut: unknown
  try { brut = JSON.parse(valeur) } catch { return DIRECTIVES_VIDES }
  if (!brut || typeof brut !== 'object' || Array.isArray(brut)) return DIRECTIVES_VIDES
  const o = brut as Record<string, unknown>
  const par = o.parProposition
  const parProposition: Record<string, Directive> = {}
  if (par && typeof par === 'object' && !Array.isArray(par)) {
    for (const [cleBrute, v] of Object.entries(par as Record<string, unknown>)) {
      if (!v || typeof v !== 'object' || Array.isArray(v)) continue
      const d = v as Record<string, unknown>
      const etat = ETATS.some(e => e.cle === d.etat) ? (d.etat as EtatArbitrage) : 'a_arbitrer'
      // Reprise du regroupement : une clé d'avant le 2026-08-25 rejoint le point qui
      // a absorbé le sien, au lieu de rester orpheline.
      const cle = REPRISES[cleBrute] ?? cleBrute
      const deja = parProposition[cle]
      parProposition[cle] = {
        // ⛔ Un état déjà posé l'emporte sur « à arbitrer » : fondre deux points dont
        // l'un était tranché ne doit pas effacer la décision.
        etat: deja && deja.etat !== 'a_arbitrer' ? deja.etat : etat,
        // `note` est la forme héritée du premier jet, quand la directive était un champ unique.
        instructions: fondre(deja?.instructions, lireMessages(d.instructions ?? d.note)),
        reponses: fondre(deja?.reponses, lireMessages(d.reponses)),
      }
    }
  }
  return {
    version: 1,
    majLe: typeof o.majLe === 'string' ? o.majLe : null,
    instructionsGenerales: lireMessages(o.instructionsGenerales ?? o.noteGenerale),
    reponsesGenerales: lireMessages(o.reponsesGenerales),
    parProposition,
  }
}

export function directiveDe(directives: Directives, id: string): Directive {
  return directives.parProposition[id] ?? DIRECTIVE_VIDE
}

/** Les messages d'une voix, sur un point ou en général. */
export function messagesGeneraux(directives: Directives, voix: Voix): Message[] {
  return voix === 'instructions' ? directives.instructionsGenerales : directives.reponsesGenerales
}

/** Combien reste-t-il à arbitrer, ce qui porte une instruction, et ce qui attend GPT. */
export function avancement(directives: Directives) {
  const ids = LOTS.flatMap(lot => lot.propositions.map(p => p.id))
  const arbitrees = ids.filter(id => directiveDe(directives, id).etat !== 'a_arbitrer').length
  const annotees = ids.filter(id => directiveDe(directives, id).instructions.length > 0).length
  const instructions = ids.reduce((n, id) => n + directiveDe(directives, id).instructions.length, 0)
    + directives.instructionsGenerales.length
  const reponses = ids.reduce((n, id) => n + directiveDe(directives, id).reponses.length, 0)
    + directives.reponsesGenerales.length
  // Un point instruit mais sans réponse : c'est là que le dialogue attend.
  const attendGpt = ids.filter(id => {
    const d = directiveDe(directives, id)
    return d.instructions.length > 0 && d.reponses.length === 0
  }).length
  return {
    total: ids.length, arbitrees, annotees, instructions, reponses, attendGpt,
    restantes: ids.length - arbitrees,
  }
}

/**
 * Ce qu'on met dans le presse-papiers pour le porter à GPT : la proposition dans
 * ses termes, ce que la mesure en dit, ce qu'elle heurte, et les instructions déjà
 * posées. ⚠️ GPT n'a pas accès au site : sans ce passage de main, la colonne des
 * réponses resterait un champ que rien ne remplit.
 */
export function texteAPorterAGpt(p: Proposition, d: Directive): string {
  const bloc: string[] = [
    `Proposition : ${p.titre}`,
    `Rubrique : ${p.rubrique}`,
    '',
    `Ta proposition : ${p.texte}`,
  ]
  if (p.mesure) bloc.push('', `Mesuré sur le corpus : ${p.mesure}`)
  for (const h of p.heurts ?? []) {
    bloc.push('', 'Cette proposition heurte une consigne antérieure.',
      `Consigne : ${h.consigne}`,
      `Proposition : ${h.proposition}`)
  }
  if (p.exemple) {
    bloc.push('', `Entrée réelle (note ${p.exemple.source.note}) : ${p.exemple.source.texte}`)
    if (p.exemple.reserve) bloc.push(`Réserve : ${p.exemple.reserve}`)
  }
  if (d.instructions.length > 0) {
    bloc.push('', 'Instructions de l’auteur du site :')
    d.instructions.forEach((m, i) => bloc.push(`${i + 1}. ${m.texte}`))
  }
  bloc.push('', 'Réponds à ce point précis.')
  return bloc.join('\n')
}

/** Les propositions qui heurtent une consigne antérieure : ce sont elles qui
 *  appellent une décision, et elles se comptent à part. */
export function conflits(): Proposition[] {
  return LOTS.flatMap(lot => lot.propositions).filter(p => (p.heurts?.length ?? 0) > 0)
}
