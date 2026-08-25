// REGISTRE DES PROPOSITIONS DE GPT — une source RÉDIGÉE, jamais un scan.
//
// Même parti que l'inventaire des illustrations : ce fichier dit ce que GPT a
// proposé, ce que la mesure en dit, et ce que la proposition heurte s'il y a lieu.
// Un relevé automatique rendrait des phrases, jamais un arbitrage.
//
// ⛔ PARTAGE DES RÔLES : ce fichier ne DÉCIDE rien. L'état de chaque proposition et
// la directive qui l'accompagne appartiennent à l'auteur du site, vivent dans
// `parametres.<CLE_DIRECTIVES>` et ne sont jamais écrits d'ici.
//
// Pour ajouter un lot : une entrée de plus dans LOTS. Les identifiants sont des
// clés de stockage — ⛔ ne jamais renommer un identifiant déjà arbitré, la
// directive qui lui est attachée s'en trouverait orpheline.

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

export type Proposition = {
  /** Clé de stockage de la directive. ⛔ Immuable une fois arbitrée. */
  id: string
  rubrique: string
  titre: string
  /** Ce que GPT demande, dans ses termes. */
  texte: string
  /** Exemple donné par GPT, quand il en donne un. */
  exemple?: { avant: string; apres: string[] }
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
  },
  {
    id: 'apparat-critique/lemme-texte',
    rubrique: 'Structure lemme et variante',
    titre: 'Annoncer le lemme par « Texte : »',
    texte: "Afficher le lemme sous la forme « Texte : » suivi du latin en italique. Afficher les variantes latines en italique.",
    exemple: {
      avant: 'humanitatem] humilitatem M² supra lin.',
      apres: ['Texte : humanitatem', 'M² : humilitatem, ajouté au-dessus de la ligne'],
    },
    mesure: "Le modèle ne s'applique qu'aux 2 621 entrées qui portent un crochet. Reste à décider ce que deviennent les 4 645 autres.",
  },
  {
    id: 'apparat-critique/ligne-par-variante',
    rubrique: 'Structure lemme et variante',
    titre: 'Une ligne par variante ou groupe de témoins',
    texte: "Utiliser une ligne distincte par variante ou groupe de témoins lorsque cela améliore la lisibilité.",
    exemple: {
      avant: 'scire] scire te V; intelligere FV, intellere P',
      apres: ['Texte : scire', 'V : scire te', 'F, V : intelligere', 'P : intellere'],
    },
    mesure: "3 495 entrées portent au moins un point-virgule, donc au moins deux unités logiques à dégrouper.",
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
  },
  {
    id: 'apparat-critique/sigles-separes',
    rubrique: 'Sigles des manuscrits',
    titre: 'Séparer les sigles agglutinés',
    texte: "Séparer clairement les sigles multiples : `BPQ` devient `B, P, Q`. Conserver les exposants : `M²`, `P¹`.",
    mesure: "Un sigle de Knöll n'est pas toujours une lettre : « FO1VW », « BCFGHaMOSVW », « W'b », « QV1 » et « b » minuscule coexistent. Le découpage demande de savoir où finit un sigle.",
    conflit: {
      consigne: "« conserver les sigles des manuscrits tels quels » et « ne normaliser aucun sigle de manuscrit » (consigne du 25 août, §3 et §7).",
      proposition: "« `BPQ` devient `B, P, Q` ».",
    },
  },
  {
    id: 'apparat-critique/sigles-non-developpes',
    rubrique: 'Sigles des manuscrits',
    titre: 'Ne jamais développer un sigle dans la note',
    texte: "Ne jamais développer les sigles de manuscrits dans chaque note. Prévoir éventuellement une légende générale des sigles ailleurs dans l'interface.",
    mesure: "Le corpus ne porte aujourd'hui aucune table des sigles de Knöll : la légende serait à constituer.",
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
  },
  {
    id: 'apparat-critique/abreviations-reservees',
    rubrique: 'Abréviations éditoriales',
    titre: 'Laisser intact ce qui n’est pas univoque',
    texte: "Ne pas développer `m. rec.` avant vérification de la convention exacte de Knöll. Toute autre abréviation non univoque reste telle quelle en attendant une règle explicite.",
    mesure: "`m. rec.` paraît 38 fois. La liste des abréviations réellement employées par Knöll n'a pas été relevée : d'autres formes attendent hors de la table des dix-huit.",
  },
  {
    id: 'apparat-critique/italique-latin',
    rubrique: 'Typographie',
    titre: 'Latin en italique, commentaire en romain',
    texte: "Tout latin correspondant au lemme, à une variante, ou à un mot ajouté, supprimé ou corrigé, doit être en italique. Le commentaire explicatif et les sigles restent en romain.",
    mesure: "La distinction suppose que le parseur sache, dans chaque entrée, ce qui est latin et ce qui est commentaire. C'est la même exigence que la proposition « parseur » ci-dessous.",
  },
  {
    id: 'apparat-critique/signes-conserves',
    rubrique: 'Typographie',
    titre: 'Conserver exposants, astérisques et signes critiques',
    texte: "Les exposants doivent être conservés. Les astérisques doivent être conservés lorsqu'ils appartiennent à la notation critique. Les signes de rasure, lacune ou restitution ne doivent jamais être supprimés automatiquement. Les points d'interrogation critiques doivent être conservés.",
    mesure: "698 entrées portent un astérisque, 18 un point d'interrogation. C'est déjà le comportement servi.",
    dejaEnPlace: true,
  },
  {
    id: 'apparat-critique/couleur-secondaire',
    rubrique: 'Couleurs',
    titre: 'La couleur en aide secondaire',
    texte: "La couleur peut aider : lemme en teinte neutre ou atténuée, variante en couleur d'accent du site, sigles en teinte secondaire discrète, commentaire en couleur normale. Ne jamais faire dépendre la compréhension de la seule couleur.",
    mesure: "Le thème Cuir est monochrome par décision : une couleur d'accent y est une tache. Le rendu devrait s'y séparer par la chroma et la clarté, non par la teinte.",
  },
  {
    id: 'apparat-critique/lisible-sans-couleur',
    rubrique: 'Couleurs',
    titre: 'Rester lisible sans couleur',
    texte: "Le rendu doit rester compréhensible sans couleur, en mode sombre, à l'impression, et pour un utilisateur daltonien.",
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
  },
  {
    id: 'apparat-critique/repli-forme-source',
    rubrique: 'Architecture',
    titre: 'Le repli est la forme source',
    texte: "Toute transformation incertaine doit rester non transformée plutôt que d'être interprétée automatiquement.",
    mesure: "Le repli devient le cas ORDINAIRE et non l'exception : au moins 4 645 entrées sans crochet, plus les entrées à crochets multiples.",
  },
  {
    id: 'apparat-critique/renderer-reutilisable',
    rubrique: 'Architecture',
    titre: 'Un renderer réutilisable pour critical_apparatus',
    texte: "Créer un renderer réutilisable pour `metadata.editorial_role = critical_apparatus`. Ne pas appliquer ce rendu à tous les blocs `commentary`.",
    dejaEnPlace: true,
  },
  {
    id: 'apparat-critique/interdits',
    rubrique: 'Garde-fous',
    titre: 'Les interdits de données',
    texte: "Ne pas corriger l'OCR, ne pas supprimer les astérisques, ne pas développer conjecturalement les sigles, ne pas remplacer les lectures latines, ne pas les traduire. Ne modifier ni note_number, ni note_key, ni les ancres, ni les offsets, ni needs_review, ni human_validated. Ne pas réécrire segment_texte, texte_norm ou texte_original. Pas de migration des 7 266 blocs dans ce chantier.",
    dejaEnPlace: true,
  },
  {
    id: 'apparat-critique/ordre-de-priorite',
    rubrique: 'Garde-fous',
    titre: 'L’ordre de priorité éditorial',
    texte: "Fidélité à Knöll, puis conservation intégrale de l'information, puis lisibilité, puis esthétique.",
    mesure: "C'est le principe qui permet de trancher les cinq conflits signalés : il place la fidélité avant la lisibilité.",
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

// ── Directives de l'auteur ───────────────────────────────────────────────────

export type Directive = { etat: EtatArbitrage; note: string }
export type Directives = {
  version: 1
  majLe: string | null
  noteGenerale: string
  parProposition: Record<string, Directive>
}

export const DIRECTIVES_VIDES: Directives = {
  version: 1, majLe: null, noteGenerale: '', parProposition: {},
}

/** Relit ce que porte `parametres.valeur`, qui est du TEXTE. Tolérante : une valeur
 *  absente, illisible ou d'une autre forme rend un registre vierge plutôt que de
 *  faire tomber la page. Une directive orpheline (proposition renommée ou retirée)
 *  est conservée dans l'objet mais ne s'affiche plus. */
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
      parProposition[cle] = { etat, note: typeof d.note === 'string' ? d.note : '' }
    }
  }
  return {
    version: 1,
    majLe: typeof o.majLe === 'string' ? o.majLe : null,
    noteGenerale: typeof o.noteGenerale === 'string' ? o.noteGenerale : '',
    parProposition,
  }
}

export function directiveDe(directives: Directives, id: string): Directive {
  return directives.parProposition[id] ?? { etat: 'a_arbitrer', note: '' }
}

/** Combien reste-t-il à arbitrer, et combien de notes ont été écrites. */
export function avancement(directives: Directives) {
  const ids = LOTS.flatMap(l => l.propositions.map(p => p.id))
  const arbitrees = ids.filter(id => directiveDe(directives, id).etat !== 'a_arbitrer').length
  const annotees = ids.filter(id => directiveDe(directives, id).note.trim().length > 0).length
  return { total: ids.length, arbitrees, annotees, restantes: ids.length - arbitrees }
}

/** Les propositions qui heurtent une consigne antérieure : ce sont elles qui
 *  appellent une décision, et elles se comptent à part. */
export function conflits(): Proposition[] {
  return LOTS.flatMap(l => l.propositions).filter(p => p.conflit)
}
