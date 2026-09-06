// Règles communes aux deux frises (générale et par auteur).
//
// Sources de dates : la RPC `rechercher_frise_v2` et la vue
// `v_chronologie_auteurs_dates`.
// Ne jamais interroger `evenements` ni `auteurs_evenements` depuis le site :
// les vues portent déjà l'ordre éditorial (`ordre_affichage`), la date rédigée
// (`date_affichage`), la géographie de filtrage et les sources. Elles sont en
// lecture seule.

// ── Lignes des vues ────────────────────────────────────────────────────────
export type RangFrise = {
  id: string
  date_debut: number | null
  date_fin: number | null
  date_affichage: string
  date_precision_affichage: string | null
  qualification_date: string | null
  titre: string
  notice: string | null
  lieu: string | null
  famille: string | null
  famille_id: number | null
  genre: string | null
  genre_id: string | null
  zone_geographique: string | null
  pays: string | null
  region: string | null
  ville: string | null
  pays_filtre_codes: string[] | null
  pays_filtres: string[] | null
  source_principale: string | null
  source_secondaire: string | null
  note_datation: string | null
  ordre_affichage: number
  // ── Ce que la vue tendait et que la frise ne prenait pas (2026-09-06) ──────
  // ⚠️ Ces colonnes voyageaient DÉJÀ, la page tirant toute la vue : les nommer ne
  // coûte rien et rend lisible ce dont le rendu dépend.
  /** Le classement ÉDITORIAL, avec ses quatre modes d'affichage. */
  niveau_lecture_fr: string | null
  afficher_mode_essentiel: boolean | null
  afficher_mode_reperes: boolean | null
  afficher_mode_monde_chretien: boolean | null
  /** Les traditions chrétiennes rattachées. ⚠️ Ce sont des familles CONFESSIONNELLES,
 *  non des aires linguistiques : « Catholicisme latin » (462), « Christianisme commun »
 *  (443), « Tradition réformée » (88), « Orthodoxie byzantine » (75)… dix-neuf en tout. */
  tradition_codes: string[] | null
  traditions: string[] | null
  /** Les séries auxquelles l'événement appartient. Le fil se compose depuis
   *  `v_series_evenements`, qui seule porte l'ordre et le rôle de chaque membre. */
  series_codes: string[] | null
  series_titres: string[] | null
  series_count: number | null
  est_principal_serie: boolean | null
  /** La période historique, qui sépare la liste. */
  periode: string | null
  periode_code: string | null
  periode_ordre: number | null
  /** Y a-t-il quelque chose à déplier ? Le détail des relations vient à part. */
  a_des_relations: boolean | null
}

export type RangChrono = {
  association_id: number
  auteur_id: string
  evenement_id: string
  date_debut: number | null
  date_fin: number | null
  /** Les DEUX vues en `_dates` la portent — celle des auteurs comme celle des
   *  traductions. Aucun repli n'est donc nécessaire : lire la vue nue
   *  `v_chronologie_traductions`, qui n'a ni date courte ni précision, était la seule
   *  raison d'en avoir un (corrigé le 2026-09-06). */
  date_affichage_courte: string
  /** La date rédigée, longue. Portée par les deux vues, conservée pour l'apparat. */
  date_affichage: string | null
  date_precision_affichage: string | null
  date_exacte: string | null
  qualification_date: string | null
  titre: string
  notice: string | null
  lieu: string | null
  famille: string | null
  genre: string | null
  nature_lien: string | null
  justification: string | null
  type_affichage: string | null
  /** ⚠️ L’ŒUVRE que l’événement nomme, quand il en nomme une. Les deux vues la
   *  portent, et rien ne la lisait : douze événements sur 1 346 en ont une, un par
   *  œuvre. C’est par elle que la fiche d’une œuvre se reconnaît dans la chronologie
   *  de son auteur. Facultative : la vue des traductions ne la porte pas. */
  oeuvre_id?: string | null
  zone_geographique: string | null
  pays: string | null
  region: string | null
  ville: string | null
  source_principale: string | null
  source_secondaire: string | null
  source_lien: string | null
  note_datation: string | null
  position_relative: string | null
  est_hors_vie: boolean | null
  ordre_affichage: number
}

export type RangFriseDates = Pick<
  RangFrise,
  'id' | 'date_affichage' | 'date_precision_affichage' | 'qualification_date' | 'note_datation'
>

/** La RPC v2 est canonique pour les textes de date ; la vue conserve les champs
 * riches nécessaires aux filtres, à la géographie et aux sources. */
export function fusionnerDatesFrise(rangs: RangFrise[], dates: RangFriseDates[]): RangFrise[] {
  const datesParId = new Map(dates.map(date => [date.id, date]))
  return rangs.map(rang => {
    const date = datesParId.get(rang.id)
    return date ? { ...rang, ...date } : rang
  })
}

// ── Familles : teintes sobres, légèrement désaturées ───────────────────────
export const COUL_FAMILLE: Record<string, string> = {
  'Vie des auteurs': 'var(--cs-vert)',
  'Textes et doctrine': '#6d7d43',
  'Église et vie religieuse': '#c79a3a',
  'Pouvoirs, conflits et ruptures': '#b54d3f',
  'Culture et contexte': '#746187',
}
export const coulFamille = (f?: string | null) => (f && COUL_FAMILLE[f]) || 'var(--cs-texte-gris)'

// ⛔ LE BLOC « IMPORTANCE / DENSITÉ » EST RETIRÉ (2026-09-06). Il rabattait
// `importance_code` sur quatre rangs et en tirait un seuil : le jugement de ce qui est
// essentiel se prenait ainsi DANS LE NAVIGATEUR, quand la base porte un classement
// éditorial contrôlé, justifié et verrouillable. Voir « Le mode de lecture » plus bas.
// ⚠️ `poidsTitre` et `taillePuce` partaient avec : la carte ne les appelait plus depuis
// que la frise a perdu ses puces, et une forme que rien ne pose n'est pas une réserve.

// ── Types d'événement dans une chronologie d'auteur ────────────────────────
// Une seule frise, trois nuances discrètes : la lecture doit rester homogène.
export const COUL_TYPE: Record<string, string> = {
  vie: 'var(--cs-vert)',
  'œuvre': '#83a06a',
  contexte: '#c19a3e',
  // Chronologie d'une TRADUCTION : quatre nuances discrètes (pas de couleurs vives).
  formation: 'var(--cs-vert)',
  edition: '#8a7440',
  reception: '#83a06a',
}
/**
 * LA CLÉ D'UN TYPE D'AFFICHAGE, débarrassée de ses accents.
 *
 * ⛔ Les deux vues ne l'écrivent pas de la même façon : `v_chronologie_auteurs`
 * rend « vie », « œuvre », « contexte », et `v_chronologie_traductions` rend
 * « édition » et « réception », accentués. Les six clés ci-dessus étant sans
 * accents, DEUX des trois brins d'une chronologie de traduction ne trouvaient
 * jamais leur couleur ni leur libellé : leurs puces tombaient sur le gris de
 * repli, et la frise ne distinguait plus ce qu'elle range.
 * ⚠️ On replie la CLÉ, on ne renomme pas la donnée : la vue dit ce qu'elle dit,
 * et le rendu s'y accorde. L'œ ligaturé n'est pas un accent et survit au repli,
 * qui est celui du reste du site (NFD, diacritiques ôtés, bas de casse).
 */
export const cleTypeAffichage = (t?: string | null): string =>
  (t ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

export const coulType = (t?: string | null) => COUL_TYPE[cleTypeAffichage(t)] || 'var(--cs-texte-gris)'

export const LIB_TYPE: Record<string, string> = {
  vie: 'Vie',
  'œuvre': 'Œuvre',
  contexte: 'Contexte',
  formation: 'Formation',
  edition: 'Édition',
  reception: 'Réception',
}

// ── Sources : jamais d'URL brute dans le corps de la carte ─────────────────
/** Libellé lisible d'une source : nom de domaine, sans « www. ». Une source
 *  qui n'est pas une URL est rendue telle quelle. */
export function libelleSource(valeur: string | null | undefined): string | null {
  if (!valeur) return null
  const v = valeur.trim()
  if (!v) return null
  if (!/^https?:\/\//i.test(v)) return v
  try {
    return new URL(v).hostname.replace(/^www\./, '')
  } catch {
    return v
  }
}
export const estUrl = (v: string | null | undefined) => !!v && /^https?:\/\//i.test(v.trim())

// ── Repères de siècle ──────────────────────────────────────────────────────
/** Siècle d'une année (négatif avant notre ère). */
export const siecleDe = (annee: number | null): number | null =>
  annee == null ? null : annee > 0 ? Math.ceil(annee / 100) : -Math.ceil(-annee / 100)

// ══════════════════════════════════════════════════════════════════════════════
// CE QUE LA VUE TENDAIT ET QUE LA FRISE NE PRENAIT PAS (audit du 2026-09-06)
//
// `v_frise_generale` calcule pour chaque événement sa période, ses traditions, ses
// séries, ses relations et quatre modes de lecture ÉDITORIAUX. Le type ci-dessus n'en
// reprenait rien : ni periode, ni tradition_codes, ni series_codes, ni
// niveau_lecture_fr, ni afficher_mode_*. Six vues faites pour cela n'étaient lues par
// personne, et 618 relations entre événements — un graphe — se rendaient en liste plate.
//
// ⚠️ Les colonnes voyageaient DÉJÀ : la page tirait toutes les colonnes de la vue.
// Élargir le type ne coûte donc pas un octet ; c'est le select NOMMÉ, posé en même
// temps, qui allège.
// ══════════════════════════════════════════════════════════════════════════════

// ── 1. LE MODE DE LECTURE est éditorial, il ne se calcule plus dans le client ──
//
// ⛔ La « Densité » d'avant était un rabattage de importance_code fait à l'affichage :
// le jugement de ce qui est essentiel se prenait dans le navigateur. La base porte un
// classement CONTRÔLÉ — niveau_lecture_fr, sa justification, quatre booléens
// d'affichage et un verrou éditorial — et c'est lui qui décide désormais.
//
// Mesuré sur les 1 170 événements : 411 « essentiel », 1 061 « repères »,
// 1 117 « monde chrétien », 1 170 « tout ».

export type ModeLecture = 'essentiel' | 'reperes' | 'monde_chretien' | 'tout'

export const MODES_LECTURE: { cle: ModeLecture; label: string }[] = [
  { cle: 'essentiel', label: 'Essentiel' },
  { cle: 'reperes', label: 'Repères' },
  { cle: 'monde_chretien', label: 'Monde chrétien' },
  { cle: 'tout', label: 'Tout' },
]

/** ⚠️ Le mode « tout » ne filtre RIEN, et ce n'est pas une convention : les 1 170
 *  événements portent afficher_mode_tout. La colonne ne voyage donc pas. */
export function passeMode(
  e: Pick<RangFrise, 'afficher_mode_essentiel' | 'afficher_mode_reperes' | 'afficher_mode_monde_chretien'>,
  mode: ModeLecture,
): boolean {
  switch (mode) {
    case 'essentiel': return e.afficher_mode_essentiel === true
    case 'reperes': return e.afficher_mode_reperes === true
    case 'monde_chretien': return e.afficher_mode_monde_chretien === true
    default: return true
  }
}

/** Le mode porté par l'adresse. ⚠️ Les anciens liens écrivaient une DENSITÉ (essentiel,
 *  etendu, complet) : ils continuent d'ouvrir la frise au cran le plus proche, une
 *  adresse partagée ne devant pas cesser de dire ce qu'elle disait. */
export function modeDepuisUrl(mode: string | null, densiteHeritee: string | null): ModeLecture {
  if (mode === 'essentiel' || mode === 'reperes' || mode === 'monde_chretien' || mode === 'tout') return mode
  if (densiteHeritee === 'essentiel') return 'essentiel'
  if (densiteHeritee === 'etendu') return 'reperes'
  if (densiteHeritee === 'complet') return 'tout'
  return 'reperes'
}

// ── 2. LES RELATIONS, dans le dépli de l'événement ───────────────────────────
//
// ⛔ Surtout PAS de visualisation en réseau : coûteuse, illisible au delà de trente
// nœuds, et elle ne dirait rien de plus que la phrase. Une relation se lit comme une
// phrase — « Prépare : le concile de Nicée » — et le titre mène à la cible.

export type RelationFrise = {
  evenement_source_id: string
  source_titre: string | null
  source_date_debut: number | null
  type_relation: string | null
  evenement_cible_id: string
  cible_titre: string | null
  cible_date_debut: number | null
}

/** Ce que la relation dit quand on la lit DEPUIS la source. Vocabulaire CLOS : les sept
 *  valeurs de evenements_relations.type_relation au 2026-09-06. */
const LIB_RELATION_SORTANTE: Record<string, string> = {
  'prolonge': 'Prolonge',
  'prépare': 'Prépare',
  'provoque': 'Provoque',
  'révise': 'Révise',
  'met fin à': 'Met fin à',
  'répond à': 'Répond à',
  'remplace': 'Remplace',
}

/** Et depuis la CIBLE. ⚠️ Ce ne sont pas des passifs mécaniques : « auquel met fin » ne
 *  se lit pas, et « Clos par » dit la même chose en français. */
const LIB_RELATION_ENTRANTE: Record<string, string> = {
  'prolonge': 'Prolongé par',
  'prépare': 'Préparé par',
  'provoque': 'Provoqué par',
  'révise': 'Révisé par',
  'met fin à': 'Clos par',
  'répond à': 'Reçoit la réponse de',
  'remplace': 'Remplacé par',
}

export type LienDEvenement = {
  autreId: string
  autreTitre: string
  autreDate: number | null
  libelle: string
}

/**
 * Les relations d'un événement, dans les DEUX sens, prêtes à composer.
 * ⛔ Une relation dont le type n'est pas au vocabulaire ne se compose PAS : on ne nomme
 * pas un rapport qu'on ne sait pas dire.
 * ⚠️ Le sens entrant se lit sur la même ligne de la vue, qui porte les deux titres :
 * une seule liste voyage, et chaque relation se range deux fois.
 */
export function liensDesEvenements(relations: RelationFrise[]): Map<string, LienDEvenement[]> {
  const par = new Map<string, LienDEvenement[]>()
  const pousser = (id: string, lien: LienDEvenement) => {
    const liste = par.get(id)
    if (liste) liste.push(lien)
    else par.set(id, [lien])
  }
  for (const r of relations) {
    const type = (r.type_relation ?? '').trim()
    const titreCible = (r.cible_titre ?? '').trim()
    const titreSource = (r.source_titre ?? '').trim()
    const sortant = LIB_RELATION_SORTANTE[type]
    const entrant = LIB_RELATION_ENTRANTE[type]
    if (sortant && titreCible) {
      pousser(r.evenement_source_id, {
        autreId: r.evenement_cible_id, autreTitre: titreCible,
        autreDate: r.cible_date_debut, libelle: sortant,
      })
    }
    if (entrant && titreSource) {
      pousser(r.evenement_cible_id, {
        autreId: r.evenement_source_id, autreTitre: titreSource,
        autreDate: r.source_date_debut, libelle: entrant,
      })
    }
  }
  return par
}

// ── 3. LA SÉRIE comme fil ────────────────────────────────────────────────────
//
// 705 événements sur 1 170 appartiennent à une série, et chaque série porte un ORDRE
// éditorial et un RÔLE par membre — origine, étape, principal, prolongement,
// conclusion. C'est ce qui transforme une liste en récit.

export type MembreSerie = { id: string; ordre: number; role: string | null }
export type SerieFrise = {
  code: string
  titre: string
  typeSerie: string | null
  membres: MembreSerie[]
}

export type PlaceDansSerie = {
  code: string
  titre: string
  role: string | null
  rang: number
  total: number
  precedentId: string | null
  suivantId: string | null
}

/**
 * Où un événement se tient dans chacune de ses séries.
 * ⚠️ L'ordre est celui de l'ÉDITEUR (series_evenements_membres.ordre), non la date :
 * une série fait remonter son origine avant son événement principal quelle que soit
 * l'année, et c'est un choix qu'on ne recalcule pas.
 */
export function placesDansSeries(series: SerieFrise[], evenementId: string): PlaceDansSerie[] {
  const places: PlaceDansSerie[] = []
  for (const s of series) {
    const i = s.membres.findIndex(m => m.id === evenementId)
    if (i < 0) continue
    places.push({
      code: s.code, titre: s.titre, role: s.membres[i].role,
      rang: i + 1, total: s.membres.length,
      precedentId: i > 0 ? s.membres[i - 1].id : null,
      suivantId: i < s.membres.length - 1 ? s.membres[i + 1].id : null,
    })
  }
  return places
}

// ── 4. LES PÉRIODES, en séparateurs ──────────────────────────────────────────

// ⚠️ Pas de type de PÉRIODE ici : la liste lit `periode` et `periode_code` sur
// l'ÉVÉNEMENT, et `v_frise_periodes` n'aurait rien apporté que la page rende. On ne
// charge pas ce qu'on n'affiche pas.

/**
 * ⛔ Le séparateur se pose au CHANGEMENT de période dans la liste RENDUE, jamais depuis
 * les bornes de dates : la liste suit l'ordre éditorial de la vue, et un événement daté
 * « vers 380 » peut y précéder un événement de 375. Le repère doit dire où l'on est dans
 * CETTE liste, non dans un calendrier. Même patron que le regroupement des résultats de
 * recherche, et pour la même raison.
 */
export function decouperEnPeriodes<T extends { periode_code: string | null; periode: string | null }>(
  items: T[],
): { code: string | null; nom: string | null; items: T[] }[] {
  const tranches: { code: string | null; nom: string | null; items: T[] }[] = []
  for (const item of items) {
    const derniere = tranches[tranches.length - 1]
    if (derniere && derniere.code === (item.periode_code ?? null)) derniere.items.push(item)
    else tranches.push({ code: item.periode_code ?? null, nom: item.periode ?? null, items: [item] })
  }
  return tranches
}

// ── 5. LES TRADITIONS, en filtre ─────────────────────────────────────────────
//
// 19 traditions, 1 529 rattachements, une couverture totale : c'est la coupe qui manque
// le plus à un corpus patristique — et ce sont des familles CONFESSIONNELLES, non des
// aires linguistiques. ⚠️ Un événement en porte souvent plusieurs ; le
// filtre le retient dès qu'UNE de ses traditions est cochée.

export function passeTraditions(e: Pick<RangFrise, 'traditions'>, retenues: Set<string>): boolean {
  if (retenues.size === 0) return true
  return (e.traditions ?? []).some(t => retenues.has(t))
}
