// Les lectures de l'atelier d'alignement et de la mesure du grain, côté serveur.
//
// ⛔ La clé de service ne sert qu'ICI, derrière la garde de l'administration : les
// textes originaux non publiés (le grec de la Didachè) seraient invisibles à une
// lecture ordinaire, et leur ensemble serait donc réputé sain, ce qu'il n'est pas.
// ⛔ Aucune règle ne vit ici : la mesure vient de `grainAlignement.ts` par
// `atelierAlignement.ts`, le choix de l'ensemble qui porte la lecture de
// `choisirEnsembleBilingue`, la fonction que la page d'œuvre emploie.
import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import {
  colonnesTraduites,
  composerGroupes,
  empansDesMesures,
  lireMesures,
  roleDuTraduit,
  type GroupeAtelier,
  type LigneGroupe,
  type LigneMembre,
  type LigneMesure,
  type Role,
  type SegmentAtelier,
} from '@/app/lib/atelierAlignement'
import { bilanDuGrain, type BilanGrain } from '@/app/lib/grainAlignement'
import { choisirEnsembleBilingue } from '@/app/oeuvre/[id]/bilingueAlignement'
import { memeLangue } from '@/app/lib/langues'
import { lancerEnParallele, lotsPourClauseIn } from '@/app/lib/paginationSupabase'

export function clientAtelier(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  })
}

export type TexteDEnsemble = { idTexte: string; langue: string | null; libelle: string; isPublic: boolean }

export type EnsembleAtelier = {
  alignmentSetId: string
  idOeuvre: string
  titreOeuvre: string
  langueOriginale: string | null
  referenceTextId: string
  alignedTextId: string
  alignmentLevel: string | null
  status: string
  groupes: number
  reference: TexteDEnsemble
  aligned: TexteDEnsemble
  /** Le rôle du texte TRADUIT : c'est sur lui que l'atelier coupe et mesure. */
  roleTraduit: Role
  /** Les textes dont le contrôle mesure le grain. */
  colonnes: string[]
  /** L'ensemble porte-t-il RÉELLEMENT une lecture en regard sur le site ? */
  porteLaLecture: boolean
}

type LigneEnsemble = {
  alignment_set_id: string; id_oeuvre: string; reference_text_id: string
  aligned_text_id: string; alignment_level: string | null; status: string
}
type LigneTexte = {
  id_texte: string; id_oeuvre: string; langue: string | null
  titre_version: string | null; edition_label: string | null; is_public: boolean | null
}

function libelleTexte(t: LigneTexte | undefined, id: string): string {
  if (!t) return id
  return [t.langue, t.edition_label || t.titre_version].filter(Boolean).join(' · ') || id
}

/** Tous les ensembles, avec leur œuvre, leurs deux textes et leur nombre de groupes. */
export async function chargerEnsembles(db: SupabaseClient): Promise<EnsembleAtelier[]> {
  const { data: bruts, error } = await db
    .from('texte_alignement_ensembles')
    .select('alignment_set_id,id_oeuvre,reference_text_id,aligned_text_id,alignment_level,status')
    .order('alignment_set_id')
  if (error) throw error
  const ensembles = (bruts ?? []) as LigneEnsemble[]
  const idsOeuvres = [...new Set(ensembles.map(e => e.id_oeuvre))]
  if (idsOeuvres.length === 0) return []

  const [oeuvresR, textesR, comptes] = await Promise.all([
    db.from('oeuvres').select('id_oeuvre,titre,langue_originale').in('id_oeuvre', idsOeuvres),
    db.from('oeuvre_textes')
      .select('id_texte,id_oeuvre,langue,titre_version,edition_label,is_public')
      .in('id_oeuvre', idsOeuvres),
    lancerEnParallele(ensembles.map(e => () =>
      db.from('texte_alignements')
        .select('alignment_id', { count: 'exact', head: true })
        .eq('alignment_set_id', e.alignment_set_id))),
  ])
  if (oeuvresR.error) throw oeuvresR.error
  if (textesR.error) throw textesR.error
  const oeuvreDe = new Map((oeuvresR.data ?? []).map(o => [o.id_oeuvre as string, o]))
  const textes = (textesR.data ?? []) as LigneTexte[]
  const texteDe = new Map(textes.map(t => [t.id_texte, t]))
  const langueDe = (id: string) => texteDe.get(id)?.langue ?? null
  const nbGroupes = new Map(ensembles.map((e, i) => [e.alignment_set_id, comptes[i]?.count ?? 0]))

  // La lecture en regard se juge avec la fonction de la page, paire par paire : le texte
  // lu d'un côté, un texte en langue originale de l'autre. Un ensemble retiré ne sert pas.
  const portent = new Set<string>()
  for (const idOeuvre of idsOeuvres) {
    const langueOriginale = (oeuvreDe.get(idOeuvre)?.langue_originale ?? null) as string | null
    const desOeuvres = textes.filter(t => t.id_oeuvre === idOeuvre)
    const originaux = desOeuvres.filter(t => memeLangue(t.langue, langueOriginale))
    const traduits = desOeuvres.filter(t => !originaux.includes(t))
    const candidats = ensembles
      .filter(e => e.id_oeuvre === idOeuvre && e.status !== 'retired')
      .map(e => ({
        alignmentSetId: e.alignment_set_id, referenceTextId: e.reference_text_id,
        alignedTextId: e.aligned_text_id, alignmentLevel: e.alignment_level,
        nbGroupes: nbGroupes.get(e.alignment_set_id) ?? null,
      }))
    for (const t of traduits) for (const o of originaux) {
      const retenu = choisirEnsembleBilingue(candidats, t.id_texte, o.id_texte)
      if (retenu) portent.add(retenu.alignmentSetId)
    }
  }

  return ensembles.map(e => {
    const oeuvre = oeuvreDe.get(e.id_oeuvre)
    const langueOriginale = (oeuvre?.langue_originale ?? null) as string | null
    const lu = { referenceTextId: e.reference_text_id, alignedTextId: e.aligned_text_id }
    const ref = texteDe.get(e.reference_text_id)
    const ali = texteDe.get(e.aligned_text_id)
    return {
      alignmentSetId: e.alignment_set_id,
      idOeuvre: e.id_oeuvre,
      titreOeuvre: (oeuvre?.titre as string | undefined) ?? e.id_oeuvre,
      langueOriginale,
      referenceTextId: e.reference_text_id,
      alignedTextId: e.aligned_text_id,
      alignmentLevel: e.alignment_level,
      status: e.status,
      groupes: nbGroupes.get(e.alignment_set_id) ?? 0,
      reference: { idTexte: e.reference_text_id, langue: ref?.langue ?? null, libelle: libelleTexte(ref, e.reference_text_id), isPublic: ref?.is_public === true },
      aligned: { idTexte: e.aligned_text_id, langue: ali?.langue ?? null, libelle: libelleTexte(ali, e.aligned_text_id), isPublic: ali?.is_public === true },
      roleTraduit: roleDuTraduit(lu, langueDe, langueOriginale),
      colonnes: colonnesTraduites(lu, langueDe, langueOriginale),
      porteLaLecture: portent.has(e.alignment_set_id),
    }
  })
}

// ── La mesure, avec une mémoire courte ─────────────────────────────────────────

// ⚠️ La mesure d'un ensemble coûte jusqu'à trois secondes (la Somme, 32 000 segments).
// On la GARDE deux minutes, et l'atelier l'oublie après chaque écriture de l'ensemble.
const DUREE_MESURE_MS = 2 * 60_000
const memoire = new Map<string, { depuis: number; promesse: Promise<LigneMesure[]> }>()

export function chargerMesures(db: SupabaseClient, alignmentSetId: string, idTexte: string): Promise<LigneMesure[]> {
  const cle = `${alignmentSetId}|${idTexte}`
  const retenue = memoire.get(cle)
  if (retenue && Date.now() - retenue.depuis < DUREE_MESURE_MS) return retenue.promesse
  const promesse = (async () => {
    const { data, error } = await db.rpc('atelier_alignement_mesures', { p_set: alignmentSetId, p_id_texte: idTexte })
    if (error) throw error
    return lireMesures(data)
  })()
  memoire.set(cle, { depuis: Date.now(), promesse })
  // Un échec ne se garde pas : la vue suivante doit pouvoir réessayer.
  promesse.catch(() => { if (memoire.get(cle)?.promesse === promesse) memoire.delete(cle) })
  return promesse
}

export function oublierMesures(alignmentSetId: string): void {
  for (const cle of [...memoire.keys()]) if (cle.startsWith(`${alignmentSetId}|`)) memoire.delete(cle)
}

// ── Le grain de tous les ensembles, pour le contrôle ───────────────────────────

export type GrainDUneColonne = {
  idTexte: string
  libelle: string
  bilan: BilanGrain
}

export type GrainDUnEnsemble = {
  ensemble: EnsembleAtelier
  colonnes: GrainDUneColonne[]
  /** Une mesure en échec se dit, elle ne fait pas tomber les autres. */
  erreur: string | null
}

/**
 * Le grain de chaque ensemble non retiré, colonne traduite par colonne traduite.
 * ⚠️ Les ensembles se mesurent l'un après l'autre par petites vagues : chacun est une
 * requête lourde, et les lancer tous ensemble occuperait le pool du site.
 */
export async function mesurerLeGrain(db: SupabaseClient): Promise<GrainDUnEnsemble[]> {
  const ensembles = (await chargerEnsembles(db)).filter(e => e.status !== 'retired')
  return lancerEnParallele(ensembles.map(ensemble => async (): Promise<GrainDUnEnsemble> => {
    try {
      const colonnes = await Promise.all(ensemble.colonnes.map(async idTexte => {
        const lignes = await chargerMesures(db, ensemble.alignmentSetId, idTexte)
        const texte = idTexte === ensemble.referenceTextId ? ensemble.reference : ensemble.aligned
        return { idTexte, libelle: texte.libelle, bilan: bilanDuGrain(empansDesMesures(lignes)) }
      }))
      return { ensemble, colonnes, erreur: null }
    } catch (e) {
      const message = (e as { message?: string })?.message ?? String(e)
      console.error(`[controle] grain de ${ensemble.alignmentSetId} :`, e)
      return { ensemble, colonnes: [], erreur: message }
    }
  }), 3)
}

// ── Une division, telle que l'atelier la montre ────────────────────────────────

type LigneSegment = {
  segment_key: string; segment_numero: number | null; segment_texte: string | null
  ref_niv1: string | null; ref_niv2: string | null; ref_niv3: string | null; paragraphe: number | null
}

async function segmentsDe(db: SupabaseClient, idTexte: string, cles: string[]): Promise<Map<string, SegmentAtelier>> {
  const pages = await lancerEnParallele(lotsPourClauseIn([...new Set(cles)]).map(lot => () =>
    db.from('segments')
      .select('segment_key,segment_numero,segment_texte,ref_niv1,ref_niv2,ref_niv3,paragraphe')
      .eq('id_texte', idTexte)
      .in('segment_key', lot)))
  const sortie = new Map<string, SegmentAtelier>()
  for (const p of pages) {
    if (p.error) throw p.error
    for (const s of (p.data ?? []) as LigneSegment[]) {
      sortie.set(s.segment_key, {
        cle: s.segment_key, numero: s.segment_numero ?? 0, texte: s.segment_texte ?? '',
        refNiv1: s.ref_niv1, refNiv2: s.ref_niv2, refNiv3: s.ref_niv3, paragraphe: s.paragraphe,
      })
    }
  }
  return sortie
}

/** Compose des groupes donnés, avec leurs membres et le texte de leurs segments. */
export async function chargerGroupes(
  db: SupabaseClient,
  ensemble: Pick<EnsembleAtelier, 'alignmentSetId' | 'referenceTextId' | 'alignedTextId' | 'roleTraduit'>,
  lignes: LigneGroupe[],
): Promise<GroupeAtelier[]> {
  if (lignes.length === 0) return []
  const pages = await lancerEnParallele(lotsPourClauseIn(lignes.map(g => g.alignment_id)).map(lot => () =>
    db.from('texte_alignement_membres')
      .select('alignment_id,role,segment_key')
      .eq('alignment_set_id', ensemble.alignmentSetId)
      .in('alignment_id', lot)))
  const membres: LigneMembre[] = []
  for (const p of pages) {
    if (p.error) throw p.error
    membres.push(...((p.data ?? []) as LigneMembre[]))
  }
  const idTraduit = ensemble.roleTraduit === 'reference' ? ensemble.referenceTextId : ensemble.alignedTextId
  const idOriginal = ensemble.roleTraduit === 'reference' ? ensemble.alignedTextId : ensemble.referenceTextId
  const [segmentsTraduits, segmentsOriginaux] = await Promise.all([
    segmentsDe(db, idTraduit, membres.filter(m => m.role === ensemble.roleTraduit).map(m => m.segment_key)),
    segmentsDe(db, idOriginal, membres.filter(m => m.role !== ensemble.roleTraduit).map(m => m.segment_key)),
  ])
  return composerGroupes({ groupes: lignes, membres, roleTraduit: ensemble.roleTraduit, segmentsTraduits, segmentsOriginaux })
}

/** Les groupes d'une division, dans leur ordre. */
export async function chargerDivision(
  db: SupabaseClient,
  ensemble: EnsembleAtelier,
  book: number,
  division: number,
): Promise<GroupeAtelier[]> {
  const { data, error } = await db
    .from('texte_alignements')
    .select('alignment_id,group_order,cardinality,status')
    .eq('alignment_set_id', ensemble.alignmentSetId)
    .eq('book', book)
    .eq('canonical_division_order', division)
    .order('group_order')
  if (error) throw error
  return chargerGroupes(db, ensemble, (data ?? []) as LigneGroupe[])
}

export type EnsembleDEcriture = Pick<EnsembleAtelier,
  'alignmentSetId' | 'idOeuvre' | 'referenceTextId' | 'alignedTextId' | 'roleTraduit' | 'status'>

/** Un seul ensemble, ce qu'il faut pour écrire : ses deux textes et le rôle du traduit. */
export async function chargerUnEnsemble(db: SupabaseClient, alignmentSetId: string): Promise<EnsembleDEcriture | null> {
  const { data: e, error } = await db
    .from('texte_alignement_ensembles')
    .select('alignment_set_id,id_oeuvre,reference_text_id,aligned_text_id,status')
    .eq('alignment_set_id', alignmentSetId)
    .maybeSingle()
  if (error) throw error
  if (!e) return null
  const [oeuvreR, textesR] = await Promise.all([
    db.from('oeuvres').select('langue_originale').eq('id_oeuvre', e.id_oeuvre).maybeSingle(),
    db.from('oeuvre_textes').select('id_texte,langue').in('id_texte', [e.reference_text_id, e.aligned_text_id]),
  ])
  if (oeuvreR.error) throw oeuvreR.error
  if (textesR.error) throw textesR.error
  const langues = new Map((textesR.data ?? []).map(t => [t.id_texte as string, t.langue as string | null]))
  return {
    alignmentSetId: e.alignment_set_id,
    idOeuvre: e.id_oeuvre,
    referenceTextId: e.reference_text_id,
    alignedTextId: e.aligned_text_id,
    status: e.status,
    roleTraduit: roleDuTraduit(
      { referenceTextId: e.reference_text_id, alignedTextId: e.aligned_text_id },
      id => langues.get(id) ?? null,
      (oeuvreR.data?.langue_originale ?? null) as string | null,
    ),
  }
}
