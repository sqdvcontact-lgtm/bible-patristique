// LA CHAÎNE DU LECTEUR — ce qu'il a écrit, rangé dans l'ordre du canon.
//
// Le lecteur écrit sur les versets à DEUX endroits, sans jamais les revoir ensemble :
// une NOTE dans la colonne de droite de la Polyglotte (`polyglotte_notes`, privée), un
// COMMENTAIRE sous le verset de la page Bible (`commentaires`, public après relecture).
// Les deux disent la même chose de la même main sur le même verset, et rien ne les
// rassemblait : il fallait retrouver le chapitre pour retrouver ce qu'on y avait pensé.
//
// La forme est celle d'une CHAÎNE EXÉGÉTIQUE : un lemme — le verset —, et sous lui les
// scholies qui s'y sont accumulées, dans l'ordre où elles ont été écrites. Les entrées
// se suivent dans l'ordre du canon, jamais par date : c'est ce qui fait une chaîne et
// non un journal. Une chaîne se relit par le livre qu'on étudie.
//
// ⚠️ Module PUR : il ne connaît ni Supabase ni React, et se prouve sans navigateur
// (chaineExegetique.test.ts). L'ordre canonique, l'écart des gloses vides et le
// groupement par livre sont des règles, non des détails de rendu.

import { LIVRES } from './bible'
import { formaterPlageCanonique, parsePointCanonique } from './referencesBibliques'

/** D'où vient une scholie. ⛔ Deux natures, et elles ne se confondent pas : la note ne
 *  regarde que son auteur, le commentaire s'adresse aux autres lecteurs. */
export type NatureGlose = 'note' | 'commentaire'

export type GloseLecteur = {
  /** Clé stable au rendu ; porte la nature, pour qu'une note et un commentaire du même
   *  verset ne puissent jamais se répondre. */
  cle: string
  nature: NatureGlose
  texte: string
  /** ISO, ou `null` quand la ligne n'en porte pas. */
  date: string | null
  /** Commentaire non encore validé : il ne paraît qu'à son auteur, et la page le dit —
   *  même mot que le panneau de la Bible, « en révision ». */
  enRevision: boolean
  /** Commentaire écrit en réponse à un autre. Il reste une scholie du lecteur, mais il
   *  se lit autrement : sans son vis-à-vis, il peut n'avoir aucun sens seul. */
  enReponse: boolean
}

/** Une ligne de `commentaires`, telle que la page la lit. */
export type CommentaireBrut = {
  id: number | string
  id_verset: string | null
  texte: string | null
  created_at: string | null
  valide: boolean | null
  reponse_a: number | null
  supprime?: boolean | null
}

/** Une ligne de `polyglotte_notes`. */
export type NoteBrute = {
  canon_id: string | null
  texte: string | null
  updated_at: string | null
}

/** Un verset, et tout ce que le lecteur en a dit. */
export type EntreeChaine = {
  canonId: string
  livre: string
  chapitre: number | null
  verset: number | null
  /** « Genèse 1, 1 » — la référence lisible, composée par le moteur commun. */
  reference: string
  gloses: GloseLecteur[]
}

/** Les entrées d'un même livre. Le sommaire de la page en fait ses ancres. */
export type GroupeChaine = {
  /** Code du livre, ou chaîne vide pour les identifiants qui n'en désignent aucun. */
  code: string
  nom: string
  ancre: string
  /** La rubrique sous laquelle le sommaire range le groupe. */
  rubrique: RubriqueChaine
  entrees: EntreeChaine[]
}

/** Les rubriques du sommaire, dans l'ordre où elles se suivent. ⛔ Ce sont les mots du
 *  volet de la Bible : deux surfaces qui partagent le canon ne peuvent pas le partager
 *  en deux vocabulaires. */
export const RUBRIQUES_CHAINE = ['Ancien Testament', 'Nouveau Testament', 'Écrits non canoniques', 'Autres'] as const
export type RubriqueChaine = (typeof RUBRIQUES_CHAINE)[number]

const RUBRIQUE_PAR_TESTAMENT: Record<'AT' | 'NT' | 'AUTRES', RubriqueChaine> = {
  AT: 'Ancien Testament',
  NT: 'Nouveau Testament',
  AUTRES: 'Écrits non canoniques',
}

const RANG_LIVRE = new Map(LIVRES.map((l, i) => [l.code, i]))
const LIVRE_PAR_CODE = new Map(LIVRES.map(l => [l.code, l]))

/**
 * Les identifiants du PREMIER modèle — « B000015 » — ne désignent plus rien : ni livre,
 * ni chapitre, ni verset, et aucune table ne les résout. Ce sont pourtant des lignes que
 * le lecteur a écrites, et une page qui les tairait lui ferait croire qu'il n'a rien
 * écrit là. Elles se rangent donc ensemble, en fin de chaîne, sous leur identifiant nu.
 */
export const GROUPE_SANS_LIVRE = { code: '', nom: 'Références anciennes', ancre: 'livre-autres' } as const

/** Rang canonique d'un livre ; l'inconnu passe en fin, dans l'ordre où il vient. */
function rangDuLivre(code: string): number {
  const rang = RANG_LIVRE.get(code)
  return rang === undefined ? Number.MAX_SAFE_INTEGER : rang
}

/** Un identifiant canonique complet : « GEN.1.1 ». Ce qui n'a pas cette forme n'a ni
 *  référence lisible ni texte à montrer. */
function estCanonique(canonId: string): boolean {
  const p = parsePointCanonique(canonId)
  return !!p && RANG_LIVRE.has(p.livre) && p.chapitre != null
}

/** Ordonne deux dates ISO, le plus ancien d'abord ; ce qui n'en a pas passe en dernier. */
function parDate(a: string | null, b: string | null): number {
  if (a === b) return 0
  if (!a) return 1
  if (!b) return -1
  return a < b ? -1 : 1
}

/**
 * Compose la chaîne : les deux sources fondues par verset, les versets rangés dans
 * l'ordre du canon, les livres dans l'ordre du canon.
 *
 * ⛔ Une glose VIDE ne paraît pas. La colonne « Notes » de la Polyglotte enregistre dès
 * qu'on y touche : une note ouverte puis refermée laisse une ligne de texte vide, qui
 * n'est pas une pensée du lecteur mais la trace d'un clic. Un commentaire supprimé ne
 * paraît pas davantage — il ne reste en base que pour ne pas trouer un fil de réponses.
 */
export function composerChaine(commentaires: CommentaireBrut[], notes: NoteBrute[]): GroupeChaine[] {
  const parVerset = new Map<string, GloseLecteur[]>()

  const ajouter = (canonId: string | null | undefined, glose: GloseLecteur) => {
    const cle = (canonId ?? '').trim()
    if (!cle || !glose.texte) return
    const liste = parVerset.get(cle)
    if (liste) liste.push(glose)
    else parVerset.set(cle, [glose])
  }

  for (const n of notes) {
    ajouter(n.canon_id, {
      cle: `note-${n.canon_id}`,
      nature: 'note',
      texte: (n.texte ?? '').trim(),
      date: n.updated_at ?? null,
      enRevision: false,
      enReponse: false,
    })
  }

  for (const c of commentaires) {
    if (c.supprime) continue
    ajouter(c.id_verset, {
      cle: `commentaire-${c.id}`,
      nature: 'commentaire',
      texte: (c.texte ?? '').trim(),
      date: c.created_at ?? null,
      enRevision: c.valide === false,
      enReponse: c.reponse_a != null,
    })
  }

  const entrees: EntreeChaine[] = [...parVerset.entries()].map(([canonId, gloses]) => {
    const point = parsePointCanonique(canonId)
    const canonique = estCanonique(canonId)
    return {
      canonId,
      livre: canonique && point ? point.livre : '',
      chapitre: canonique && point ? point.chapitre : null,
      verset: canonique && point ? point.verset : null,
      reference: canonique ? formaterPlageCanonique(canonId) : canonId,
      gloses: [...gloses].sort((a, b) => parDate(a.date, b.date)),
    }
  })

  entrees.sort((a, b) => {
    const rang = rangDuLivre(a.livre) - rangDuLivre(b.livre)
    if (rang !== 0) return rang
    // ⚠️ Deux livres inconnus se départagent sur leur identifiant, faute de rang : sans
    // cela, l'ordre serait celui d'un `Map`, c'est-à-dire celui des requêtes.
    if (a.livre !== b.livre) return a.livre.localeCompare(b.livre, 'fr')
    if ((a.chapitre ?? 0) !== (b.chapitre ?? 0)) return (a.chapitre ?? 0) - (b.chapitre ?? 0)
    if ((a.verset ?? 0) !== (b.verset ?? 0)) return (a.verset ?? 0) - (b.verset ?? 0)
    return a.canonId.localeCompare(b.canonId, 'fr')
  })

  const groupes: GroupeChaine[] = []
  for (const entree of entrees) {
    const livre = LIVRE_PAR_CODE.get(entree.livre)
    const code = livre ? livre.code : GROUPE_SANS_LIVRE.code
    const dernier = groupes[groupes.length - 1]
    if (dernier && dernier.code === code) { dernier.entrees.push(entree); continue }
    groupes.push({
      code,
      nom: livre ? livre.nom : GROUPE_SANS_LIVRE.nom,
      ancre: livre ? `livre-${livre.code}` : GROUPE_SANS_LIVRE.ancre,
      rubrique: livre ? RUBRIQUE_PAR_TESTAMENT[livre.testament] : 'Autres',
      entrees: [entree],
    })
  }
  return groupes
}

/** Ce que le bandeau annonce : des versets et des scholies, comptés sur la chaîne
 *  composée — jamais sur les lignes brutes, dont les vides sont écartés. */
export function compterChaine(groupes: GroupeChaine[]): { versets: number; notes: number; commentaires: number } {
  let versets = 0, notes = 0, commentaires = 0
  for (const g of groupes) for (const e of g.entrees) {
    versets += 1
    for (const glose of e.gloses) {
      if (glose.nature === 'note') notes += 1
      else commentaires += 1
    }
  }
  return { versets, notes, commentaires }
}

/** Les identifiants canoniques dont il faut aller chercher le texte, sans les
 *  identifiants hérités, que `versets_lecture` ne connaît pas. */
export function versetsAResoudre(groupes: GroupeChaine[]): string[] {
  return groupes.flatMap(g => g.entrees.filter(e => e.livre).map(e => e.canonId))
}

/** Le pluriel d'un compte, écrit une fois : « 1 note », « 3 notes ». */
export function accorder(nombre: number, singulier: string, pluriel = `${singulier}s`): string {
  return `${nombre} ${nombre > 1 ? pluriel : singulier}`
}
