// app/api/admin/alignements/route.ts
//
// Les écritures de l'atelier d'alignement : COUPER un groupe à une jonction de
// segments, FUSIONNER deux groupes voisins (charte § 12.2, règle 2).
//
// ⛔ Le plan se REBÂTIT ici, sur l'état lu en base, jamais sur ce que le navigateur
// envoie : celui-ci ne donne que le geste (le groupe, les deux jonctions) et ce qu'il
// a vu. Si ce qu'il a vu n'est plus l'état de la base, on refuse (409) plutôt que de
// couper au mauvais endroit. La base revérifie encore, d'un seul tenant, dans
// `atelier_alignement_couper` et `atelier_alignement_fusionner`.
// ⛔ Les écritures restent dans les trois tables d'alignement : aucune autre.
import { NextRequest, NextResponse } from 'next/server'
import { estAdmin } from '@/app/lib/verifAdmin'
import { estAdminUtilisateur } from '@/app/lib/verifAdminUtilisateur'
import {
  memesMembres,
  planDeCoupe,
  planDeFusion,
  type GroupeAtelier,
  type LigneGroupe,
} from '@/app/lib/atelierAlignement'
import {
  chargerGroupes,
  chargerUnEnsemble,
  clientAtelier,
  oublierMesures,
} from '@/app/admin/alignements/chargementAtelier'

type Attendus = { traduits: string[]; originaux: string[] }

const estListe = (v: unknown): v is string[] => Array.isArray(v) && v.every(x => typeof x === 'string')
const estAttendus = (v: unknown): v is Attendus =>
  typeof v === 'object' && v !== null
  && estListe((v as Attendus).traduits) && estListe((v as Attendus).originaux)

/** L'écran a-t-il vu ce groupe tel qu'il est ? L'ordre du texte traduit compte : c'est
 *  sur lui que se comptent les jonctions. */
function aVuCeGroupe(g: GroupeAtelier, vu: Attendus): boolean {
  const traduits = g.traduits.map(s => s.cle)
  return traduits.length === vu.traduits.length
    && traduits.every((c, i) => c === vu.traduits[i])
    && memesMembres(g.originaux.map(s => s.cle), vu.originaux)
}

const refus = (status: number, error: string) => NextResponse.json({ error }, { status })

export async function POST(req: NextRequest) {
  if (!(await estAdminUtilisateur(req)) && !(await estAdmin())) return refus(401, 'Non autorisé')

  let corps: Record<string, unknown>
  try {
    corps = await req.json()
  } catch {
    return refus(400, 'Corps de requête illisible.')
  }
  const { op, ensemble: idEnsemble, groupe: idGroupe } = corps
  if (op !== 'couper' && op !== 'fusionner') return refus(400, 'Opération inconnue : couper ou fusionner.')
  if (typeof idEnsemble !== 'string' || !idEnsemble || typeof idGroupe !== 'string' || !idGroupe)
    return refus(400, 'Ensemble et groupe sont requis.')

  const db = clientAtelier()
  try {
    const ensemble = await chargerUnEnsemble(db, idEnsemble)
    if (!ensemble) return refus(404, 'Ensemble introuvable.')
    if (ensemble.status === 'retired') return refus(409, 'Cet ensemble est retiré : il ne sert aucune lecture.')

    const { data: ligne, error: erreurLigne } = await db
      .from('texte_alignements')
      .select('alignment_id,group_order,cardinality,status,book,canonical_division_order')
      .eq('alignment_set_id', ensemble.alignmentSetId)
      .eq('alignment_id', idGroupe)
      .maybeSingle()
    if (erreurLigne) throw erreurLigne
    if (!ligne) return refus(404, 'Groupe introuvable dans cet ensemble.')
    const le = new Date().toISOString()

    if (op === 'couper') {
      const { k, j, attendus } = corps
      if (typeof k !== 'number' || typeof j !== 'number' || !estAttendus(attendus))
        return refus(400, 'Une coupe demande ses deux jonctions et l’état vu.')
      const [g] = await chargerGroupes(db, ensemble, [ligne as LigneGroupe])
      if (!g || !aVuCeGroupe(g, attendus))
        return refus(409, 'Ce groupe a changé depuis son affichage : rechargez l’atelier.')
      const { data: voisins, error: erreurVoisins } = await db
        .from('texte_alignements')
        .select('alignment_id')
        .like('alignment_id', `${idGroupe}-C%`)
      if (erreurVoisins) throw erreurVoisins
      const pris = new Set((voisins ?? []).map(v => v.alignment_id as string))
      const r = planDeCoupe({ groupe: g, k, j, roleTraduit: ensemble.roleTraduit, pris })
      if (!r.ok) return refus(400, r.raison)
      const p = r.plan
      const { error } = await db.rpc('atelier_alignement_couper', {
        p_set: ensemble.alignmentSetId,
        p_groupe: p.groupe,
        p_nouveau: p.nouveau,
        p_reference_garde: p.referenceGarde,
        p_aligned_garde: p.alignedGarde,
        p_reference_part: p.referencePart,
        p_aligned_part: p.alignedPart,
        p_cardinalite_garde: p.cardinaliteGarde,
        p_cardinalite_part: p.cardinalitePart,
        p_trace: { op: 'couper', le, par: 'atelier', jonctions: { traduit: k, original: j }, nouveau: p.nouveau },
      })
      if (error) return refus(error.code === 'P0001' ? 409 : 500, error.message)
      oublierMesures(ensemble.alignmentSetId)
      return NextResponse.json({ ok: true, groupe: p.groupe, nouveau: p.nouveau })
    }

    // Fusionner : le second groupe doit être le VOISIN qui suit, dans la même division.
    const { suivant: idSuivant, attendus } = corps
    if (typeof idSuivant !== 'string' || !idSuivant) return refus(400, 'Une fusion demande le groupe qui suit.')
    const vus = attendus as { premier?: unknown; second?: unknown } | null
    if (!vus || !estAttendus(vus.premier) || !estAttendus(vus.second))
      return refus(400, 'Une fusion demande l’état vu des deux groupes.')
    const { data: prochain, error: erreurProchain } = await db
      .from('texte_alignements')
      .select('alignment_id,group_order,cardinality,status')
      .eq('alignment_set_id', ensemble.alignmentSetId)
      .eq('book', ligne.book)
      .eq('canonical_division_order', ligne.canonical_division_order)
      .gt('group_order', ligne.group_order)
      .order('group_order')
      .limit(1)
      .maybeSingle()
    if (erreurProchain) throw erreurProchain
    if (!prochain || prochain.alignment_id !== idSuivant)
      return refus(409, 'Ces deux groupes ne sont plus voisins : rechargez l’atelier.')
    const [premier, second] = await chargerGroupes(db, ensemble, [ligne as LigneGroupe, prochain as LigneGroupe])
    if (!premier || !second || !aVuCeGroupe(premier, vus.premier) || !aVuCeGroupe(second, vus.second))
      return refus(409, 'Ces groupes ont changé depuis leur affichage : rechargez l’atelier.')
    const r = planDeFusion({ premier, second, roleTraduit: ensemble.roleTraduit })
    if (!r.ok) return refus(400, r.raison)
    const p = r.plan
    const { error } = await db.rpc('atelier_alignement_fusionner', {
      p_set: ensemble.alignmentSetId,
      p_groupe: p.groupe,
      p_absorbe: p.absorbe,
      p_reference: p.reference,
      p_aligned: p.aligned,
      p_cardinalite: p.cardinalite,
      p_trace: { op: 'fusionner', le, par: 'atelier' },
    })
    if (error) return refus(error.code === 'P0001' ? 409 : 500, error.message)
    oublierMesures(ensemble.alignmentSetId)
    return NextResponse.json({ ok: true, groupe: p.groupe, absorbe: p.absorbe })
  } catch (e) {
    console.error('[atelier-alignement]', e)
    return refus(500, (e as { message?: string })?.message ?? 'Écriture impossible.')
  }
}
