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
   *  cités ; le registre ne tranche pas. */
  conflit?: { consigne: string; proposition: string }
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
  {
    id: 'apparat-critique/ligne-imprimee',
    rubrique: 'Règles de transformation',
    titre: 'Retirer le numéro de ligne initial',
    texte: "Supprimer de l'affichage courant le numéro de ligne initial lorsqu'il correspond exactement à `metadata.printed_line`. Ne pas modifier ce numéro en base pour l'instant.",
    mesure: '7 265 entrées sur 7 266 ouvrent sur leur ligne imprimée. La seule exception est la souscription du livre II.',
    dejaEnPlace: true,
    exemple: {
      source: { note: 1, ligne: 2, texte: '2 Magnus es — tua et sapi|| minio depicta S.' },
      apres: [[t('Magnus es — tua et sapi|| minio depicta S.')]],
      reserve: "La consigne est déjà servie : « aujourd'hui » et « avec la consigne » disent la même chose. L'écart se lit entre la base et le site.",
    },
  },
  {
    id: 'apparat-critique/crochet-masque',
    rubrique: 'Structure lemme et variante',
    titre: 'Ne plus afficher le crochet fermant',
    texte: "Ne pas afficher le crochet fermant `]`. L'interpréter comme un séparateur entre lemme et variante.",
    mesure: "4 645 entrées sur 7 266 (64 %) ne portent AUCUN crochet : elles n'ont donc pas de lemme à séparer. 490 en portent plusieurs.",
    conflit: {
      consigne: "« conserver les crochets `]`, parenthèses, points, astérisques et abréviations » (consigne du 25 août, §3).",
      proposition: "« Ne pas afficher le crochet fermant `]` ».",
    },
    exemple: {
      source: { note: 2, ligne: 3, texte: '3 uirtus (r ex s corr.) B; est] est et BPQ.' },
      apres: [
        [s('B'), t(' : '), l('uirtus'), g(', r corrigé à partir de s')],
        [t('Texte : '), l('est')],
        [s('B, P, Q'), t(' : '), l('est et')],
      ],
      reserve: "C'est la transformation que GPT donne lui-même pour cette entrée. ⚠️ Le crochet seul ne suffit pas à la produire : il faut aussi savoir que « uirtus (r ex s corr.) B » est une unité close, ce qu'aucune règle ne dit. Sur la note 46, « adpraehendam FS, apprehendam BGOP … », il n'y a pas de crochet du tout et la règle n'a aucune prise.",
    },
  },
  {
    id: 'apparat-critique/lemme-texte',
    rubrique: 'Structure lemme et variante',
    titre: 'Annoncer le lemme par « Texte : »',
    texte: "Afficher le lemme sous la forme « Texte : » suivi du latin en italique. Afficher les variantes latines en italique.",
    mesure: "Le modèle ne s'applique qu'aux 2 621 entrées qui portent un crochet. Reste à décider ce que deviennent les 4 645 autres.",
    exemple: {
      source: { note: 14, ligne: 7, texte: '7 humanitatem] humilitatem M2 supra lin.' },
      apres: [
        [t('Texte : '), l('humanitatem')],
        [s('M2'), t(' : '), l('humilitatem'), g(', ajouté au-dessus de la ligne')],
      ],
      reserve: "⚠️ GPT écrit ce sigle « M² », en exposant. La base porte « M2 », en chiffre ordinaire. Son exemple applique donc déjà, sans le dire, une normalisation que sa propre consigne ne demande pas : conserver un exposant n'est pas en fabriquer un.",
    },
  },
  {
    id: 'apparat-critique/ligne-par-variante',
    rubrique: 'Structure lemme et variante',
    titre: 'Une ligne par variante ou groupe de témoins',
    texte: "Utiliser une ligne distincte par variante ou groupe de témoins lorsque cela améliore la lisibilité.",
    mesure: "3 495 entrées portent au moins un point-virgule, donc au moins deux unités logiques à dégrouper.",
    exemple: {
      source: { note: 7, ligne: 10, texte: '10 scire] scire te V; intelligere FV, intellere P; si (i add. m. 2) M.' },
      apres: [
        [t('Texte : '), l('scire')],
        [s('V'), t(' : '), l('scire te')],
        [s('F, V'), t(' : '), l('intelligere')],
        [s('P'), t(' : '), l('intellere')],
        [s('M'), t(' : '), l('si'), g(', i ajouté par la seconde main')],
      ],
      reserve: "⚠️ GPT cite cette entrée dans sa consigne, mais tronquée : il s'arrête à « intellere P » et laisse tomber « si (i add. m. 2) M. », qui en est la cinquième unité. L'exemple ci-dessus rend l'entrée entière.",
    },
  },
  {
    id: 'apparat-critique/ponctuation-condensee',
    rubrique: 'Structure lemme et variante',
    titre: 'Défaire la ponctuation condensée de l’imprimé',
    texte: "Ne pas conserver artificiellement la ponctuation condensée de l'apparat imprimé si elle sert seulement à séparer des unités logiques.",
    conflit: {
      consigne: "« Le code d'affichage ne doit modifier aucune ponctuation » (consigne du 25 août, §7). Le rendu servi aujourd'hui a précisément été purgé des deux normalisations qui y touchaient.",
      proposition: "« Ne pas conserver artificiellement la ponctuation condensée de l'apparat imprimé ».",
    },
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
      reserve: "⚠️ Six points-virgules, et ils ne font pas tous le même office : celui de « nunc deleta; set F » sépare un commentaire d'éditeur d'une leçon, non deux unités de même rang. Défaire la ponctuation demande donc de savoir ce qu'elle sépare, ce que la consigne suppose acquis.",
    },
  },
  {
    id: 'apparat-critique/sigles-separes',
    rubrique: 'Sigles des manuscrits',
    titre: 'Séparer les sigles agglutinés',
    texte: "Séparer clairement les sigles multiples : `BPQ` devient `B, P, Q`. Conserver les exposants : `M²`, `P¹`.",
    mesure: "Un sigle de Knöll n'est pas toujours une lettre : « FO1VW », « BCFGHMOPQW'b », « QV1 » et « b » minuscule coexistent. Le découpage demande de savoir où finit un sigle.",
    conflit: {
      consigne: "« conserver les sigles des manuscrits tels quels » et « ne normaliser aucun sigle de manuscrit » (consigne du 25 août, §3 et §7).",
      proposition: "« `BPQ` devient `B, P, Q` ».",
    },
    exemple: {
      source: { note: 2089, ligne: 9, texte: "9 studiosus B1, studiosa BI; currerem FGMV; ambrosii BCFGHMOPQW'b, Ambrosium mo" },
      apres: [
        [s('B1'), t(' : '), l('studiosus')],
        [s('B, I'), t(' : '), l('studiosa'), g('   ← faux découpage')],
        [s('F, G, M, V'), t(' : '), l('currerem')],
        [s("B, C, F, G, H, M, O, P, Q, W'b"), t(' : '), l('ambrosii'), g('   ← découpage douteux')],
        [s('mo'), t(' : '), l('Ambrosium')],
      ],
      reserve: "⛔ Cette entrée montre la règle en échec, et c'est pourquoi elle est ici. « BI » et « B1 » se suivent dans la même ligne : l'un est un sigle à chiffre, l'autre porte un i que l'océrisation a peut-être fabriqué. Découper « BI » en « B, I » invente un témoin. Et « W'b » n'est ni une lettre ni deux. L'entrée porte d'ailleurs une demande de contrôle visuel.",
    },
  },
  {
    id: 'apparat-critique/sigles-non-developpes',
    rubrique: 'Sigles des manuscrits',
    titre: 'Ne jamais développer un sigle dans la note',
    texte: "Ne jamais développer les sigles de manuscrits dans chaque note. Prévoir éventuellement une légende générale des sigles ailleurs dans l'interface.",
    mesure: "Le corpus ne porte aujourd'hui aucune table des sigles de Knöll : la légende serait à constituer.",
    exemple: {
      source: { note: 204, ligne: 12, texte: '12 ab tu itaque incipit liber Parisinus no. 12191 (E); infantia (om. et; e add. m. rec.) V, infantia et D' },
      apres: [
        [s('E'), t(' : le manuscrit commence à '), l('tu itaque'), g(' (Parisinus 12191)')],
        [s('V'), t(' : '), l('infantia'), g(', et omis, e ajouté par une main récente')],
        [s('D'), t(' : '), l('infantia et')],
      ],
      reserve: "Cette entrée est la seule du lot où Knöll nomme lui-même un manuscrit : « liber Parisinus no. 12191 (E) ». Elle donne une ligne de la légende à constituer, et rappelle que celle-ci existe déjà en creux dans l'apparat, dispersée.",
    },
  },
  {
    id: 'apparat-critique/abreviations-developpees',
    rubrique: 'Abréviations éditoriales',
    titre: 'Développer les abréviations en français',
    texte: "Afficher en français clair lorsque le sens est certain : om. devient « omet », add. « ajouté », suppl. « suppléé », corr. « corrigé », del. « effacé », ras. « rasure », supra lin. et s. l. « au-dessus de la ligne », in mg. et mg. « dans la marge », fort. « peut-être », edd. « éditions », cett. « autres témoins », pr. « premier », alt. « second », m. 1, m. 2 et m. 3 « première, seconde, troisième main ».",
    mesure: "Occurrences : om. 1 637, edd. 701, ras. 575, add. 427, m. 1/2/3 379, corr. 347, pr. 212, alt. 157, s. l. 128, mg. 115, in mg. 114, del. 29, suppl. 12, cett. 8, fort. 4, supra lin. 3.",
    conflit: {
      consigne: "« Le code d'affichage ne doit développer aucune abréviation » (consigne du 25 août, §7).",
      proposition: "développer dix-huit abréviations éditoriales en français clair.",
    },
    exemple: {
      source: { note: 18, ligne: 12, texte: '12 quo deus— in me deus] add. S1 s. l.; quo] qui P2V, et quis Q; ueniat deus BM; ueniat in me om. Q.' },
      apres: [
        [t('Texte : '), l('quo deus … in me deus')],
        [s('S1'), t(' : passage ajouté au-dessus de la ligne')],
        [t('Texte : '), l('quo')],
        [s('P2, V'), t(' : '), l('qui')],
        [s('Q'), t(' : '), l('et quis')],
        [s('B, M'), t(' : '), l('ueniat deus')],
        [s('Q'), t(' : omet '), l('ueniat in me')],
      ],
      reserve: "⚠️ « supra lin. » ne paraît que TROIS fois sur 7 266, alors que GPT en fait son exemple phare ; la forme courante est « s. l. », 128 fois. Un développement décidé sur un échantillon non représentatif ne se vérifie pas de lui-même.",
    },
  },
  {
    id: 'apparat-critique/abreviations-reservees',
    rubrique: 'Abréviations éditoriales',
    titre: 'Laisser intact ce qui n’est pas univoque',
    texte: "Ne pas développer `m. rec.` avant vérification de la convention exacte de Knöll. Toute autre abréviation non univoque reste telle quelle en attendant une règle explicite.",
    mesure: "`m. rec.` paraît 38 fois. La liste des abréviations réellement employées par Knöll n'a pas été relevée : d'autres formes attendent hors de la table des dix-huit.",
    exemple: {
      source: { note: 6337, ligne: 15, texte: '15 pr. sensisset (corr. m. rec.) V' },
      apres: [
        [s('V'), t(' : premier '), l('sensisset'), g(', corrigé '), t('m. rec.')],
      ],
      reserve: "⛔ Voilà ce que la règle produit quand elle s'arrête à mi-chemin : une ligne mi-française, mi-latine abrégée, où « m. rec. » subsiste seul au milieu du français. Trois mots de la même entrée reçoivent trois traitements. Il faut trancher : ou l'on développe tout, ou l'on ne développe rien.",
    },
  },
  {
    id: 'apparat-critique/italique-latin',
    rubrique: 'Typographie',
    titre: 'Latin en italique, commentaire en romain',
    texte: "Tout latin correspondant au lemme, à une variante, ou à un mot ajouté, supprimé ou corrigé, doit être en italique. Le commentaire explicatif et les sigles restent en romain.",
    mesure: "La distinction suppose que le parseur sache, dans chaque entrée, ce qui est latin et ce qui est commentaire. C'est la même exigence que la proposition « parseur » ci-dessous.",
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
    id: 'apparat-critique/signes-conserves',
    rubrique: 'Typographie',
    titre: 'Conserver exposants, astérisques et signes critiques',
    texte: "Les exposants doivent être conservés. Les astérisques doivent être conservés lorsqu'ils appartiennent à la notation critique. Les signes de rasure, lacune ou restitution ne doivent jamais être supprimés automatiquement. Les points d'interrogation critiques doivent être conservés.",
    mesure: "698 entrées portent un astérisque, 18 un point d'interrogation. C'est déjà le comportement servi.",
    dejaEnPlace: true,
    exemple: {
      source: { note: 2132, ligne: 16, texte: '16 occult? V' },
      apres: [[s('V'), t(' : '), l('occult?')]],
      reserve: "Le point d'interrogation appartient à la leçon : il dit que la fin du mot n'est pas lisible. Le retirer, ou le prendre pour une ponctuation, effacerait le doute que l'éditeur a voulu inscrire.",
    },
  },
  {
    id: 'apparat-critique/couleur-secondaire',
    rubrique: 'Couleurs',
    titre: 'La couleur en aide secondaire',
    texte: "La couleur peut aider : lemme en teinte neutre ou atténuée, variante en couleur d'accent du site, sigles en teinte secondaire discrète, commentaire en couleur normale. Ne jamais faire dépendre la compréhension de la seule couleur.",
    mesure: "Le thème Cuir est monochrome par décision : une couleur d'accent y est une tache. Le rendu devrait s'y séparer par la chroma et la clarté, non par la teinte.",
    exemple: {
      source: { note: 17, ligne: 11, texte: '11 eum inuocabo Q; et] ut V; quo] in quo F; ueniad F sic saepe, uenat M; in me] M2 s. l.' },
      apres: [
        [s('Q'), t(' : '), l('eum inuocabo')],
        [t('Texte : '), l('et')],
        [s('V'), t(' : '), l('ut')],
        [t('Texte : '), l('quo')],
        [s('F'), t(' : '), l('in quo')],
        [s('F'), t(' : '), l('ueniad'), g(', et souvent ainsi')],
        [s('M'), t(' : '), l('uenat')],
        [t('Texte : '), l('in me')],
        [s('M2'), t(' : au-dessus de la ligne')],
      ],
      reserve: "Les trois rôles se distinguent ici par l'italique et par l'encre. ⚠️ La même page en thème Cuir n'aurait qu'une gamme de bruns : la teinte d'accent y disparaît, et seule la séparation italique et romain subsiste.",
    },
  },
  {
    id: 'apparat-critique/lisible-sans-couleur',
    rubrique: 'Couleurs',
    titre: 'Rester lisible sans couleur',
    texte: "Le rendu doit rester compréhensible sans couleur, en mode sombre, à l'impression, et pour un utilisateur daltonien.",
    exemple: {
      source: { note: 12, ligne: 5, texte: '5 quaeram] **eram F; et] ut M2 supra lin.' },
      apres: [
        [t('Texte : '), l('quaeram')],
        [s('F'), t(' : '), l('**eram')],
        [t('Texte : '), l('et')],
        [s('M2'), t(' : '), l('ut'), g(', au-dessus de la ligne')],
      ],
      reserve: "L'épreuve à faire est de relire ce bloc en niveaux de gris. Si « Texte : », le sigle et la leçon restent distincts, la couleur n'était qu'un renfort. Sinon, elle portait le sens, et la consigne est violée.",
    },
  },
  {
    id: 'apparat-critique/parseur',
    rubrique: 'Architecture',
    titre: 'Un parseur des cinq constituants',
    texte: "Le parseur doit essayer d'identifier le lemme, la variante, les témoins, l'opération critique et le commentaire éditorial. En cas d'ambiguïté, conserver la forme source plutôt que produire une interprétation fausse.",
    mesure: "C'est la proposition qui commande toutes les autres : sans elle, ni l'italique, ni la couleur, ni la ligne par variante ne peuvent être posées.",
    conflit: {
      consigne: "« Le renderer doit seulement présenter fidèlement les données » et « ne jamais embellir ou réinterpréter automatiquement la notation critique » (consigne du 25 août, §3 et §7).",
      proposition: "analyser chaque entrée en cinq constituants et la recomposer en lignes françaises.",
    },
    exemple: {
      source: { note: 17, ligne: 11, texte: '11 eum inuocabo Q; et] ut V; quo] in quo F; ueniad F sic saepe, uenat M; in me] M2 s. l.' },
      apres: [
        [t('lemme '), l('et'), t('   variante '), l('ut'), t('   témoin '), s('V')],
        [t('lemme '), l('quo'), t('   variante '), l('in quo'), t('   témoin '), s('F')],
        [t('lemme '), l('in me'), t('   témoin '), s('M2'), t('   opération '), g('au-dessus de la ligne')],
        [t('unité sans lemme '), l('eum inuocabo'), t('   témoin '), s('Q')],
        [t('commentaire d’éditeur '), g('sic saepe'), t('   accroché à '), s('F')],
      ],
      reserve: "⛔ « ueniad F sic saepe » est le piège. « sic saepe » n'est ni une leçon ni un témoin : c'est une remarque de Knöll disant que ce manuscrit écrit ainsi partout ailleurs. Un parseur qui la prend pour une variante fabrique un témoignage. La même formule paraît note 4, « excitas V sic saepe », et note 9, « aliut S sic semper ».",
    },
  },
  {
    id: 'apparat-critique/repli-forme-source',
    rubrique: 'Architecture',
    titre: 'Le repli est la forme source',
    texte: "Toute transformation incertaine doit rester non transformée plutôt que d'être interprétée automatiquement.",
    mesure: "Le repli devient le cas ORDINAIRE et non l'exception : au moins 4 645 entrées sans crochet, plus les entrées à crochets multiples.",
    exemple: {
      source: { note: 46, ligne: 1, texte: '1 adpraehendam FS, apprehendam BGOP, apprehendam V; moriar om. C, moriarne MV.' },
      apres: [[t('adpraehendam FS, apprehendam BGOP, apprehendam V; moriar om. C, moriarne MV.')]],
      reserve: "Aucun crochet, donc aucun lemme repérable, et deux graphies identiques (« apprehendam » deux fois) attribuées à des témoins différents : rien ne dit laquelle est la leçon retenue. Le repli rend l'entrée inchangée. ⚠️ C'est le sort de la majorité de l'apparat : la page serait donc mi-recomposée, mi-brute, et le lecteur ne saurait pas pourquoi.",
    },
  },
  {
    id: 'apparat-critique/renderer-reutilisable',
    rubrique: 'Architecture',
    titre: 'Un renderer réutilisable pour critical_apparatus',
    texte: "Créer un renderer réutilisable pour `metadata.editorial_role = critical_apparatus`. Ne pas appliquer ce rendu à tous les blocs `commentary`.",
    dejaEnPlace: true,
    exemple: {
      source: {
        note: 148, ligne: 0, role: null,
        provenance: 'La Cité de Dieu, texte latin des Bénédictins (Vivès)',
        texte: 'Editi, sed dæmonia mala. At melioris notæ Mss. sed omina mala, id est præsagia excidii et cladis venturæ.',
      },
      apres: [[t('Editi, sed dæmonia mala. At melioris notæ Mss. sed omina mala, id est præsagia excidii et cladis venturæ.')]],
      reserve: "⚠️ Cette note RESSEMBLE à un apparat : elle oppose les éditions aux manuscrits de meilleure qualité, exactement comme Knöll. Mais elle ne porte pas `editorial_role`, et elle garde donc le rendu ordinaire. C'est ce que la règle protège, et c'est aussi ce qu'elle laisse de côté : 3 265 blocs de ce texte sont dans ce cas.",
    },
  },
  {
    id: 'apparat-critique/interdits',
    rubrique: 'Garde-fous',
    titre: 'Les interdits de données',
    texte: "Ne pas corriger l'OCR, ne pas supprimer les astérisques, ne pas développer conjecturalement les sigles, ne pas remplacer les lectures latines, ne pas les traduire. Ne modifier ni note_number, ni note_key, ni les ancres, ni les offsets, ni needs_review, ni human_validated. Ne pas réécrire segment_texte, texte_norm ou texte_original. Pas de migration des 7 266 blocs dans ce chantier.",
    dejaEnPlace: true,
    exemple: {
      source: { note: 142, ligne: 2, texte: '2 misereris (be add. m. 2) M; qnm*** (qnm ras.) P; peccato W¹.' },
      apres: [[t('misereris (be add. m. 2) M; qnm*** (qnm ras.) P; peccato W¹.')]],
      reserve: "« qnm*** » est une abréviation latine mutilée que trois astérisques signalent. La tentation serait de la restituer en « quoniam ». L'interdit dit non : ce que l'éditeur n'a pas pu lire, le site ne le devine pas. L'exposant de « W¹ » et la rasure restent tels quels.",
    },
  },
  {
    id: 'apparat-critique/ordre-de-priorite',
    rubrique: 'Garde-fous',
    titre: 'L’ordre de priorité éditorial',
    texte: "Fidélité à Knöll, puis conservation intégrale de l'information, puis lisibilité, puis esthétique.",
    mesure: "C'est le principe qui permet de trancher les cinq conflits signalés : il place la fidélité avant la lisibilité.",
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
      reserve: "⛔ Les deux ordres de priorité ne donnent pas la même page, et tout l'écart est là. « Lisibilité d'abord » doit choisir un lemme que l'entrée ne nomme pas, et ce choix devient invisible au lecteur, qui le lira comme une donnée. « Fidélité d'abord » laisse l'entrée telle quelle, illisible au non-spécialiste, mais ne prête rien à Knöll. C'est la décision qui commande tout le lot.",
    },
  },
]

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
    for (const [cle, v] of Object.entries(par as Record<string, unknown>)) {
      if (!v || typeof v !== 'object' || Array.isArray(v)) continue
      const d = v as Record<string, unknown>
      const etat = ETATS.some(e => e.cle === d.etat) ? (d.etat as EtatArbitrage) : 'a_arbitrer'
      // `note` est la forme héritée du premier jet, quand la directive était un champ unique.
      parProposition[cle] = {
        etat,
        instructions: lireMessages(d.instructions ?? d.note),
        reponses: lireMessages(d.reponses),
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
  if (p.conflit) {
    bloc.push('', 'Cette proposition heurte une consigne antérieure.',
      `Consigne : ${p.conflit.consigne}`,
      `Proposition : ${p.conflit.proposition}`)
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
  return LOTS.flatMap(lot => lot.propositions).filter(p => p.conflit)
}
