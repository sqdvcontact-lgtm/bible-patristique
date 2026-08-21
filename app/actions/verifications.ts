'use server'

import { createClient } from '@supabase/supabase-js'
import { estAdmin } from '@/app/lib/verifAdmin'

// `liens_bibliques` et `segments` ne sont ouverts qu'en LECTURE par la RLS
// (une seule politique SELECT publique) : toute écriture par le client de session
// est rejetée (« new row violates row-level security policy »). Comme les routes
// /api/admin/segment-*, on écrit donc avec le client SERVICE-ROLE — après avoir
// vérifié l'administrateur côté serveur. Le service-role n'est jamais utilisé
// sans ce garde. (cf. charte §17 : les écritures passent par du code serveur vérifié.)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export type TypeLien = 1 | 2 | 3 | 4
/** L'action de l'éditeur : classer le lien dans l'un des quatre types, ou dire
 *  qu'il n'y a pas de lien du tout entre ce segment et ce verset. */
export type ActionLien = TypeLien | 'pas_de_lien'

/** Arbitrage d'un lien entre un segment et un verset.
 *
 *  Autrefois : recopier quatre chaînes de caractères, retirer l'identifiant de
 *  l'une, l'ajouter à l'autre, puis relire l'ensemble pour deviner si le segment
 *  était « vérifié ». Le classement d'un lien dans un type se dit maintenant
 *  d'une ligne, et sa fiabilité se pose sur lui — non plus sur tout le segment.
 */
export async function verifierLien(
  seg: { id: number; verifies?: string[] | null },
  canonId: string,
  action: ActionLien,
) {
  // Arbitrage = jugement de l'éditeur : réservé à l'administrateur, vérifié ici
  // avant toute écriture (le service-role ne s'utilise pas sans ce contrôle).
  if (!(await estAdmin())) throw new Error('Action réservée à l’administrateur.')

  // Un verset ne peut relever que d'un type à la fois pour un même segment :
  // on efface d'abord tout lien existant de ce segment vers ce verset.
  const { error: eDel } = await supabaseAdmin.from('liens_bibliques')
    .delete().eq('segment_id', seg.id).eq('canon_id', canonId)
  if (eDel) throw new Error(eDel.message)

  if (action !== 'pas_de_lien') {
    const { error: eIns } = await supabaseAdmin.from('liens_bibliques').insert({
      segment_id: seg.id,
      canon_id: canonId,
      type: action,
      // L'éditeur vient de trancher : c'est un jugement humain, et il est ferme.
      fiabilite: 'vérifié',
      provenance: 'editeur',
      arbitrage_requis: false,
    })
    if (eIns) throw new Error(eIns.message)
  }

  // `verifies` garde la trace des versets déjà passés en revue pour ce segment,
  // y compris ceux qu'on a écartés — sans quoi un lien refusé reviendrait
  // indéfiniment dans la file.
  const vv = (seg.verifies ?? []).filter(v => v !== canonId)
  vv.push(canonId)
  const { error: eMaj } = await supabaseAdmin.from('segments').update({ verifies: vv }).eq('id', seg.id)
  if (eMaj) throw new Error(eMaj.message)

  // Le segment est au net quand plus aucun de ses liens n'attend d'arbitrage.
  const { count } = await supabaseAdmin.from('liens_bibliques')
    .select('*', { count: 'exact', head: true })
    .eq('segment_id', seg.id).neq('fiabilite', 'vérifié')

  return { verifies: vv, segmentEntierementVerifie: (count ?? 0) === 0 }
}

/** Transforme un renvoi NON biblique (lien « à constituer ») en appel de note sur le
 *  segment : on ajoute un marqueur `[[N]]` en fin de segment et le corps de la note dans
 *  `segments.notes`, puis on supprime le lien biblique (ce n'en est pas un). Le marqueur
 *  numérique suit le plus grand déjà présent dans le segment. */
export async function ajouterNoteNonBiblique(lienId: number, noteTexte: string) {
  if (!(await estAdmin())) throw new Error('Action réservée à l’administrateur.')
  const texte = (noteTexte ?? '').trim()
  if (!texte) throw new Error('Le texte de la note est vide.')

  const { data: lien, error: eL } = await supabaseAdmin.from('liens_bibliques')
    .select('id, segment_id').eq('id', lienId).maybeSingle()
  if (eL) throw new Error(eL.message)
  if (!lien) throw new Error('Lien introuvable.')

  const { data: seg, error: eS } = await supabaseAdmin.from('segments')
    .select('id, segment_texte, notes').eq('id', lien.segment_id).maybeSingle()
  if (eS) throw new Error(eS.message)
  if (!seg) throw new Error('Segment introuvable.')

  // Prochain marqueur numérique : le plus grand [[n]] du texte ET des notes, + 1.
  const nums: number[] = []
  const re = /\[\[(\d+)\]\]/g
  for (const src of [seg.segment_texte ?? '', seg.notes ?? '']) {
    re.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = re.exec(src))) nums.push(Number(m[1]))
  }
  const n = (nums.length ? Math.max(...nums) : 0) + 1

  const nouvTexte = (seg.segment_texte ?? '').replace(/\s+$/, '') + ` [[${n}]]`
  const nouvNotes = (seg.notes ?? '').trim()
    ? (seg.notes ?? '').replace(/\s+$/, '') + `\n[[${n}]] ${texte}`
    : `[[${n}]] ${texte}`

  const { error: eMaj } = await supabaseAdmin.from('segments')
    .update({ segment_texte: nouvTexte, notes: nouvNotes }).eq('id', seg.id)
  if (eMaj) throw new Error(eMaj.message)

  const { error: eDel } = await supabaseAdmin.from('liens_bibliques').delete().eq('id', lienId)
  if (eDel) throw new Error(eDel.message)

  return { ok: true, marqueur: n }
}
