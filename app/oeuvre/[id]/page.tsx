import { hydraterLiensHerites } from '@/app/lib/liens'
import { codesTraductionsLecture } from '@/app/lib/traductions'
import type { Metadata } from 'next'
import { estAdmin as verifierEstAdmin } from '@/app/lib/verifAdmin'
import { ABREV_FR } from '@/app/lib/bible'
import { parseNotes } from '@/app/lib/notes'
import { estOeuvrePubliee } from '@/app/lib/oeuvresPublication'
import { creerSupabaseServeur } from '@/app/lib/supabaseServeur'
import { chargerIndexEditeurs } from '@/app/lib/editeursServeur'
import type { IndexEditeurs } from '@/app/lib/editeursNormalisation'
import { JsonLd, donneesLivre, donneesFilAriane } from '@/app/lib/donneesStructurees'
import OeuvreClient from './OeuvreClient'
import type { AlignementDisponible, NoteStructuree, VersionTextuelle } from './oeuvreTypes'
import { decomposerEdition, labelCourtVersion, libelleTraducteurVersion } from './versionTextuelle'
import { chargerAuteursDOeuvre, libelleAuteurs } from '@/app/lib/auteursOeuvre'
import {
  projeterAppelsNotesStructurees,
  type AncreNoteStructureeProjection,
} from '@/app/lib/appelsNotesStructurees'
import { chargerToutesPagesSupabase } from '@/app/lib/paginationSupabase'

// Base fermée au rôle anonyme : chaque entrée serveur (métadonnées, page) crée
// son client lisant la session du visiteur. Sans cela, la page s'exécutait en
// `anon` et ne recevait plus ni segments ni versets.
type Client = Awaited<ReturnType<typeof creerSupabaseServeur>>

export async function generateMetadata({ params, searchParams }: {
  params: Promise<{ id: string }>
  searchParams?: Promise<{ texte?: string }>
}): Promise<Metadata> {
  const { id } = await params
  const sp = searchParams ? await searchParams : {}
  const supabase = await creerSupabaseServeur()

  const [{ data }, { data: textes }, auteursOeuvre] = await Promise.all([
    supabase.from('oeuvres')
      .select('titre, titre_original, sous_titre, trad_auteur, auteurs!oeuvres_id_auteur_fkey(nom, nom_original)')
      .eq('id_oeuvre', id).maybeSingle(),
    supabase.from('oeuvre_textes')
      .select('id_texte,traducteur,is_default,is_public')
      .eq('id_oeuvre', id)
      .eq('is_public', true),
    chargerAuteursDOeuvre(supabase, id),
  ])
  if (!data) return { title: { absolute: 'Corpus Scriptura' } }
  // Une œuvre signée à deux est nommée sous les deux noms, ici comme ailleurs.
  const auteur = libelleAuteurs(auteursOeuvre) || (data.auteurs as any)?.nom
  const textesPublics = textes ?? []
  const texteActif = textesPublics.find(texte => texte.id_texte === sp.texte)
    ?? textesPublics.find(texte => texte.is_default)
    ?? textesPublics[0]
  const traducteur = texteActif?.traducteur ?? data.trad_auteur
  // Mots-clés = toutes les formes sous lesquelles on cherche l'œuvre et l'auteur.
  const motsCles = [data.titre, data.titre_original, ...auteursOeuvre.map(a => a.nom), auteur, (data.auteurs as any)?.nom_original]
    .filter((v): v is string => !!v)
  const description = [
    auteur ? `${data.titre}, ${auteur}` : data.titre,
    data.sous_titre || null,
    traducteur ? `traduction de ${traducteur}` : null,
  ].filter(Boolean).join('. ') + '. Texte et notice sur Corpus Scriptura.'
  return {
    // `absolute` : le gabarit « %s · Corpus Scriptura » du layout racine s'ajouterait
    // sinon à ce titre qui porte déjà le nom du site, d'où un « … · Corpus Scriptura ·
    // Corpus Scriptura » dans l'onglet et dans les partages.
    title: { absolute: auteur ? `${data.titre} — ${auteur} · Corpus Scriptura` : `${data.titre} · Corpus Scriptura` },
    description: description.slice(0, 300),
    keywords: motsCles,
  }
}

type Segment = {
  id: number; id_texte: string; segment_key: string|null; segment_numero: number; segment_texte: string
  ref_niv1: string|null; ref_niv2: string|null; ref_niv3: string|null
  ref_niv4: string|null; ref_niv5: string|null
  ref_niv1_texte: string|null; ref_niv2_texte: string|null
  ref_niv3_texte: string|null; ref_niv4_texte: string|null
  lien_1: string|null; lien_2: string|null; lien_3: string|null; lien_4: string|null
  nature: string|null
  paragraphe: number|null; rang: number|null; texte_original: string|null
  espace_textuel: string|null; join_before: string|null
}

type TexteVersionRow = {
  id_texte: string
  titre_version: string | null
  langue: string | null
  traducteur: string | null
  edition_label: string | null
  annee_edition: number | null
  source_url: string | null
  catalogue_notice_id_ligne: string | null
  metadata: Record<string, unknown> | null
  is_default: boolean | null
  is_public: boolean | null
  statut: string | null
}

type AlignementRow = {
  alignment_set_id: string
  reference_text_id: string
  aligned_text_id: string
  status: string | null
}

const NIV1_LIMINAIRES = '__LIMINAIRES__'

function construireVersionTextuelle(t: TexteVersionRow, indexEditeurs: IndexEditeurs | null): VersionTextuelle {
  const titre = t.titre_version || t.id_texte
  // L’index des éditeurs passe par ici pour que la mention d’édition nomme sa maison
  // sous sa forme répertoriée dès le rendu serveur, sans paraître d’abord en brut.
  const edition = decomposerEdition(t.edition_label, t.annee_edition, indexEditeurs)
  const base = {
    idTexte: t.id_texte,
    titre,
    langue: t.langue,
    traducteur: t.traducteur,
    anneeEdition: t.annee_edition,
  }
  return {
    ...base,
    editionLabel: t.edition_label,
    sourceUrl: t.source_url,
    catalogueNoticeIdLigne: t.catalogue_notice_id_ligne,
    metadata: t.metadata ?? {},
    isDefault: t.is_default === true,
    isPublic: t.is_public === true,
    statut: t.statut,
    labelCourt: labelCourtVersion(base),
    traducteurLabel: libelleTraducteurVersion(base),
    editionDescription: edition.editionDescription,
    publicationLabel: edition.publicationLabel,
    villeEdition: edition.ville,
    editeurEdition: edition.editeur,
    dateEdition: edition.annee,
  }
}

// Un même verset peut être visé par plusieurs liens du même segment — chez un
// commentateur, il est cité PUIS commenté, et l'arbitrage n°17 rend ce cumul
// obligatoire. Il ne doit pour autant paraître qu'une fois dans le volet : on
// dédoublonne, et l'on garde la trace des natures rencontrées pour les dire.
const NATURE_LIEN = ['citation', 'reprise', 'doctrine', 'écho'] as const

function extraireVersetsAvecNature(s: Segment): { id: string; natures: string[] }[] {
  const ordre: string[] = []
  const natures = new Map<string, string[]>()
  ;[s.lien_1, s.lien_2, s.lien_3, s.lien_4].forEach((col, i) => {
    String(col ?? '').split(';').map(v => v.trim()).filter(Boolean).forEach(vid => {
      if (!natures.has(vid)) { natures.set(vid, []); ordre.push(vid) }
      const n = NATURE_LIEN[i]
      if (!natures.get(vid)!.includes(n)) natures.get(vid)!.push(n)
    })
  })
  return ordre.map(id => ({ id, natures: natures.get(id)! }))
}

function extraireVersets(s: Segment): string[] {
  return extraireVersetsAvecNature(s).map(v => v.id)
}

function segmentAffichable(s: Segment) {
  if (s.nature === 'separateur') return false
  return Boolean((s.segment_texte ?? '').trim() || extraireVersets(s).length > 0)
}

function grouper(segments: Segment[]) {
  type G = { niv1:string; niv2:string; niv3:string; niv4:string
    niv1_texte:string; niv2_texte:string; niv3_texte:string; niv4_texte:string
    items:Segment[] }
  const gs:G[]=[]
  let cur={niv1:'',niv2:'',niv3:'',niv4:'',niv1_texte:'',niv2_texte:'',niv3_texte:'',niv4_texte:'',items:[] as Segment[]}
  for(const s of segments){
    // Ignorer les séparateurs et les rubriques réellement vides.
    if(!segmentAffichable(s)) continue
    // Les introductions sont rendues à part (en tête d'homélie), hors des groupes
    // et de la pagination.
    if(s.nature==='introduction') continue
    const n1=s.ref_niv1||'',n2=s.ref_niv2||'',n3=s.ref_niv3||'',n4=s.ref_niv4||''
    if(n1!==cur.niv1||n2!==cur.niv2||n3!==cur.niv3||n4!==cur.niv4){
      if(cur.items.length>0)gs.push({...cur})
      cur={niv1:n1,niv2:n2,niv3:n3,niv4:n4,
        niv1_texte:s.ref_niv1_texte||'',niv2_texte:s.ref_niv2_texte||'',
        niv3_texte:s.ref_niv3_texte||'',niv4_texte:s.ref_niv4_texte||'',
        items:[s]}
    }
    else cur.items.push(s)
  }
  if(cur.items.length>0)gs.push({...cur})
  return gs
}

function numerotationLocale(segments: Segment[]): Map<number,number> {
  const map=new Map<number,number>()
  let c=0,n1c=''
  for(const s of segments){
    if(!segmentAffichable(s)) continue
    if(s.nature==='introduction') continue
    const n1=s.ref_niv1||'';if(n1!==n1c){c=0;n1c=n1};map.set(s.id,++c)
  }
  return map
}


function detailsRefBiblique(ref:string): { label: string; livre: string; chapitre: string; verset: string } {
  const p=ref.trim().split(' ')
  if(p.length<2)return { label: ref, livre: '', chapitre: '', verset: '' }
  const cv=p[1].split(':')
  const label = cv[1]?`${ABREV_FR[p[0]]||p[0]} ${cv[0]}, ${cv[1]}`:`${ABREV_FR[p[0]]||p[0]} ${cv[0]}`
  return { label, livre: p[0], chapitre: cv[0] || '', verset: cv[1] || '' }
}

// N'expose que les traductions réellement matérialisées dans `versets_lecture` :
// une colonne inexistante dans le select fait échouer toute la requête (voir
// app/lib/traductions.ts).
async function chargerCodesTraductions(supabase: Client) {
  return codesTraductionsLecture(supabase)
}

async function enrichirAvecVersets(supabase: Client, segments: Segment[], codesTraductions: string[]) {
  const tousIds = new Set<string>()
  segments.forEach(s => extraireVersets(s).forEach(v => tousIds.add(v)))
  const tousIdsArray = Array.from(tousIds)
  if (tousIdsArray.length === 0) return {}
  const selectVersets = ['id_verset', 'ref', ...codesTraductions.map(code => `"${code}"`)].join(', ')
  const batchSize = 500
  const batches = Array.from({ length: Math.ceil(tousIdsArray.length / batchSize) }, (_, i) =>
    tousIdsArray.slice(i * batchSize, (i + 1) * batchSize))
  const results = await Promise.all(batches.map(batch =>
    supabase.from('versets_lecture').select(selectVersets).in('id_verset', batch)))
  const versetsData = results.flatMap(r => r.data ?? []) as any[]

  const versetMap: Record<string,{label:string;textes:Record<string,string>}> = {}
  versetsData.forEach(v => {
    const textes = Object.fromEntries(codesTraductions.map(code => [code, v[code] || '']))
    const ref = detailsRefBiblique(v.ref)
    versetMap[v.id_verset] = {
      ...ref,
      textes,
    }
  })
  return versetMap
}

export default async function OeuvrePage({
  params,
  searchParams,
}:{
  params:Promise<{id:string}>
  searchParams?:Promise<{segment?:string;texte?:string;compare?:string;book?:string;division?:string}>
}) {
  const {id}=await params
  const sp = searchParams ? await searchParams : {}
  const segmentCibleId = Number(sp.segment ?? '')

  // Client lisant la session : les fonctions imbriquées ci-dessous le capturent.
  const supabase = await creerSupabaseServeur()

  // L'œuvre reste l'identité canonique ; le texte actif est choisi séparément.
  // La RLS masque les versions non publiques aux lecteurs ordinaires.
  const [estAdmin, oeuvreResult, textesResult, alignementsResult, indexEditeurs] = await Promise.all([
    verifierEstAdmin(),
    supabase.from('oeuvres').select('*, auteurs!oeuvres_id_auteur_fkey(id_auteur, nom)').eq('id_oeuvre', id).single(),
    supabase.from('oeuvre_textes')
      .select('id_texte,titre_version,langue,traducteur,edition_label,annee_edition,source_url,catalogue_notice_id_ligne,metadata,is_default,is_public,statut')
      .eq('id_oeuvre', id)
      .order('annee_edition', { ascending: true, nullsFirst: true }),
    supabase.from('texte_alignement_ensembles')
      .select('alignment_set_id,reference_text_id,aligned_text_id,status')
      .eq('id_oeuvre', id)
      .order('created_at', { ascending: true }),
    chargerIndexEditeurs(supabase),
  ])
  const oeuvre = oeuvreResult.data
  if (!oeuvre || (!estAdmin && !estOeuvrePubliee(oeuvre as any))) return (
    <div className="min-h-screen flex items-center justify-center" style={{background:'var(--cs-fond)'}}>
      <p style={{color:'var(--cs-texte-gris)'}}>Œuvre introuvable.</p>
    </div>
  )
  const textesAccessibles = (textesResult.data ?? []) as TexteVersionRow[]
  const texteDemande = sp.texte ? textesAccessibles.find(t => t.id_texte === sp.texte) : null
  const texteActif = texteDemande ?? textesAccessibles.find(t => t.is_default) ?? textesAccessibles[0]
  if (!texteActif) return (
    <div className="min-h-screen flex items-center justify-center" style={{background:'var(--cs-fond)'}}>
      <p style={{color:'var(--cs-texte-gris)'}}>Aucun texte accessible pour cette œuvre.</p>
    </div>
  )
  const idTexte = texteActif.id_texte as string
  const versionsTextuelles = textesAccessibles.map((t) => construireVersionTextuelle(t, indexEditeurs))
  const versionParId = new Map(versionsTextuelles.map(version => [version.idTexte, version]))
  const alignementsDisponibles = ((alignementsResult.data ?? []) as AlignementRow[])
    .flatMap((alignement): AlignementDisponible[] => {
      const reference = versionParId.get(alignement.reference_text_id)
      const aligned = versionParId.get(alignement.aligned_text_id)
      if (!reference || !aligned) return []
      return [{
        alignmentSetId: alignement.alignment_set_id,
        referenceTextId: alignement.reference_text_id,
        alignedTextId: alignement.aligned_text_id,
        referenceLabel: reference.labelCourt,
        alignedLabel: aligned.labelCourt,
        referenceLangue: reference.langue,
        alignedLangue: aligned.langue,
        status: alignement.status,
      }]
    })
  const alignementDemande = sp.compare
    ? alignementsDisponibles.find(alignement => alignement.alignmentSetId === sp.compare)
    : null
  const versionActive = versionParId.get(idTexte)!

  // Admin = connecté avec le compte administrateur (adresse fixe), vérifié
  // côté serveur via la session Supabase Auth — remplace l'ancien cookie
  // bp_admin_session, qui n'est plus jamais posé depuis la suppression de la
  // page de connexion par mot de passe.
  const SELECT_SEG = 'id,id_texte,segment_key,segment_numero,segment_texte,ref_niv1,ref_niv2,ref_niv3,ref_niv4,ref_niv5,ref_niv1_texte,ref_niv2_texte,ref_niv3_texte,ref_niv4_texte,nature,notes,paragraphe,rang,texte_original,espace_textuel,join_before'
  // ⛔ `apparat_auteur` DOIT figurer ici : c'est l'apparat de l'auteur lui-même
  // (prologue, avertissement, dédicace), qui appartient au corps du texte et se lit
  // à sa place dans la lecture — à ne jamais confondre avec `apparat_critique`
  // (l'apparat de l'éditeur, qui a sa propre vue). Son absence de cette liste l'a
  // fait disparaître du rendu (régression du 18 août : le « Prologue de Rufin aux
  // livres X et XI » n'apparaissait plus entre le titre du Livre X et « Chapitre I »).
  const NATURES_TEXTE = ['texte', 'introduction', 'citation', 'dialogue', 'texte absent', 'vers', 'rubrique', 'signature', 'apparat_auteur']

  async function chargerTousSegments(filtre: Record<string, string>) {
    // Applique le filtre à une requête (nature « texte » embarque les introductions).
    const appliquer = (q: any) => {
      for (const [k, v] of Object.entries(filtre)) {
        if (k === 'nature' && v === 'texte') q = q.in('nature', NATURES_TEXTE)
        else if (k === 'ref_niv1' && v === NIV1_LIMINAIRES) q = q.is('ref_niv1', null)
        else q = q.eq(k, v)
      }
      return q
    }
    const lot = (from: number) =>
      appliquer(supabase.from('segments').select(SELECT_SEG).eq('id_oeuvre', id).eq('id_texte', idTexte))
        .order('segment_numero', { ascending: true }).range(from, from + 999)

    // 1er lot AVEC le total exact (une seule requête) : les grosses divisions
    // (ex. Somme théologique, ~6500 segments par niv1) se chargeaient auparavant
    // par allers-retours SÉQUENTIELS de 1000. On récupère le total tout de suite,
    // puis on tire les lots restants EN PARALLÈLE.
    const premier = await appliquer(
      supabase.from('segments').select(SELECT_SEG, { count: 'exact' }).eq('id_oeuvre', id).eq('id_texte', idTexte)
    ).order('segment_numero', { ascending: true }).range(0, 999)

    const acc: any[] = [...((premier.data as any[]) ?? [])]
    const total = premier.count ?? acc.length
    if (total > 1000) {
      const restes = await Promise.all(
        Array.from({ length: Math.ceil(total / 1000) - 1 }, (_, i) => lot((i + 1) * 1000))
      )
      for (const r of restes) acc.push(...((r.data as any[]) ?? []))
    }
    // Les liens ne sont plus portés par le segment : on les repose au format
    // attendu, avec le client du serveur — c'est ce rendu que le lecteur voit.
    await hydraterLiensHerites(acc, supabase)
    return acc
  }

  // Première tranche d'un niveau 1 (ordre de LECTURE = segment_numero, comme le
  // chargeur client `chargerNiv1Data`, pour que la tranche soit un vrai préfixe du
  // chargement complet), plus l'indication qu'il reste des segments. Sert à peindre
  // vite les grosses divisions (ex. Somme théologique, ~9000 segments dans un seul
  // niv1) sans tout charger d'un coup : le reste est complété en tâche de fond côté
  // client, pendant que le lecteur lit déjà la première page.
  const PLAFOND_TRANCHE = 1000
  async function chargerTrancheTexte(filtre: Record<string, string>): Promise<{ segments: Segment[]; partiel: boolean }> {
    const appliquer = (q: any) => {
      for (const [k, v] of Object.entries(filtre)) {
        if (k === 'nature' && v === 'texte') q = q.in('nature', NATURES_TEXTE)
        else if (k === 'ref_niv1' && v === NIV1_LIMINAIRES) q = q.is('ref_niv1', null)
        else q = q.eq(k, v)
      }
      return q
    }
    const premier = await appliquer(
      supabase.from('segments').select(SELECT_SEG, { count: 'exact' }).eq('id_oeuvre', id).eq('id_texte', idTexte)
    ).order('segment_numero', { ascending: true }).range(0, PLAFOND_TRANCHE - 1)
    const acc: any[] = [...((premier.data as any[]) ?? [])]
    const total = premier.count ?? acc.length
    await hydraterLiensHerites(acc, supabase)
    return { segments: acc as Segment[], partiel: total > acc.length }
  }

  // ── Vague 1 : 6 requêtes indépendantes en parallèle ──────────────────────
  async function chargerNotesStructurees(): Promise<{
    notesParSegment: Record<string, Record<string, NoteStructuree>>
    ancresParSegment: Record<string, AncreNoteStructureeProjection[]>
  }> {
    type NoteRow = { note_key: string; note_number: number }
    type AnchorRow = {
      note_key: string
      marker: string | null
      segment_key: string | null
      source_target: string | null
      segment_offset_unicode: number | null
    }
    type BlockRow = {
      note_key: string
      block_id: string
      rank: number
      kind: string
      form: string
      language: string | null
      text: string
      rendering: string | null
      needs_review: boolean
    }
    type RelationRow = {
      note_key: string
      relation_kind: string
      source_block_id: string
      target_block_id: string | null
    }
    let rows: [NoteRow[], AnchorRow[], BlockRow[], RelationRow[]]
    try {
      rows = await Promise.all([
        chargerToutesPagesSupabase<NoteRow>((debut, fin) => supabase.from('texte_notes')
          .select('note_key,note_number').eq('id_texte', idTexte)
          .order('note_number').range(debut, fin)),
        chargerToutesPagesSupabase<AnchorRow>((debut, fin) => supabase.from('texte_note_ancres')
          .select('note_key,marker,segment_key,source_target,segment_offset_unicode')
          .eq('id_texte', idTexte).order('note_key').order('segment_key')
          .order('segment_offset_unicode').range(debut, fin)),
        chargerToutesPagesSupabase<BlockRow>((debut, fin) => supabase.from('texte_note_blocs')
          .select('note_key,block_id,rank,kind,form,language,text,rendering,needs_review')
          .eq('id_texte', idTexte).order('note_key').order('rank').range(debut, fin)),
        chargerToutesPagesSupabase<RelationRow>((debut, fin) => supabase.from('texte_note_relations')
          .select('note_key,relation_kind,source_block_id,target_block_id')
          .eq('id_texte', idTexte).order('note_key').order('source_block_id')
          .order('relation_kind').range(debut, fin)),
      ])
    } catch (error) {
      console.error(`Chargement des notes structurées impossible (${idTexte}) :`, error)
      throw new Error(`Impossible de charger les notes structurées de ${idTexte}.`, { cause: error })
    }
    const [notesRows, anchorsRows, blocksRows, relationsRows] = rows
    const relations = new Map<string, Record<string, string | null>>()
    const numeros = new Map(notesRows.map(note => [note.note_key, note.note_number]))
    for (const relation of relationsRows) {
      const key = `${relation.note_key}:${relation.source_block_id}`
      relations.set(key, { ...(relations.get(key) ?? {}), [relation.relation_kind]: relation.target_block_id })
    }
    const parNote = new Map<string, NoteStructuree>()
    for (const block of blocksRows) {
      const noteNumber = numeros.get(block.note_key)
      if (typeof noteNumber !== 'number') continue
      if (!parNote.has(block.note_key)) parNote.set(block.note_key, { noteKey: block.note_key, noteNumber, blocks: [] })
      const relation = relations.get(`${block.note_key}:${block.block_id}`) ?? {}
      parNote.get(block.note_key)!.blocks.push({
        blockId: block.block_id,
        rank: block.rank,
        kind: block.kind as NoteStructuree['blocks'][number]['kind'],
        form: block.form as NoteStructuree['blocks'][number]['form'],
        language: block.language,
        text: block.text,
        rendering: block.rendering,
        needsReview: block.needs_review,
        targetBlockId: relation.target_block ?? null,
        translationOf: relation.translation_of ?? null,
      })
    }
    const notesParSegment: Record<string, Record<string, NoteStructuree>> = {}
    const ancresParSegment: Record<string, AncreNoteStructureeProjection[]> = {}
    for (const anchor of anchorsRows) {
      const note = parNote.get(anchor.note_key)
      const marker = anchor.marker?.match(/^\[\[([A-Z0-9]+)\]\]$/)?.[1]
      if (!note || !marker || !anchor.segment_key) {
        throw new Error(`Ancre de note structurée incomplète : ${anchor.note_key}.`)
      }
      notesParSegment[anchor.segment_key] ??= {}
      notesParSegment[anchor.segment_key][marker] = note
      if (anchor.source_target === 'segment_texte') {
        if (anchor.segment_offset_unicode === null || !Number.isInteger(anchor.segment_offset_unicode)) {
          throw new Error(`Offset Unicode absent pour ${anchor.note_key}.`)
        }
        ancresParSegment[anchor.segment_key] ??= []
        ancresParSegment[anchor.segment_key].push({
          noteKey: anchor.note_key,
          marker: `[[${marker}]]`,
          segmentOffsetUnicode: anchor.segment_offset_unicode,
          sourceTarget: anchor.source_target,
        })
      }
    }
    return { notesParSegment, ancresParSegment }
  }

  const [{ data: niv1Raw, error: rpcError }, { data: niv1TexteRaw }, { data: segmentCibleData }, segmentsApparatRaw, codesTraductions, donneesNotesStructurees, { count: nbSegmentsLiminaires }] = await Promise.all([
    supabase.rpc('get_niv1_list', { p_id_oeuvre: id, p_id_texte: idTexte }),
    supabase.rpc('get_niv1_texte', { p_id_oeuvre: id, p_id_texte: idTexte }),
    Number.isFinite(segmentCibleId) && segmentCibleId > 0
      ? supabase.from('segments').select('id,ref_niv1,nature').eq('id_oeuvre', id).eq('id_texte', idTexte).eq('id', segmentCibleId).maybeSingle()
      : Promise.resolve({ data: null }),
    chargerTousSegments({ nature: 'apparat_critique' }),
    chargerCodesTraductions(supabase),
    chargerNotesStructurees(),
    supabase.from('segments').select('id', { count: 'exact', head: true })
      .eq('id_oeuvre', id).eq('id_texte', idTexte)
      .is('ref_niv1', null).in('nature', NATURES_TEXTE),
  ])
  const { notesParSegment: notesStructurees, ancresParSegment: ancresNotesStructurees } = donneesNotesStructurees

  if (rpcError) console.error('get_niv1_list error:', rpcError)

  // niv1 ayant du texte + libellés ref_niv1_texte : une seule RPC agrégée
  // (get_niv1_texte) remplace l'ancien N+1 (un count par niv1 pour exclure les niv1
  // uniquement apparat) et la pagination séquentielle de reconstitution des libellés.
  const niv1Complet: string[] = (niv1Raw ?? []).map((r: any) => r.ref_niv1).filter(Boolean)
  const niv1TexteMap: Record<string, string> = {}
  const niv1AvecTexte = new Set<string>()
  ;(niv1TexteRaw ?? []).forEach((r: any) => {
    if (!r.ref_niv1) return
    niv1AvecTexte.add(r.ref_niv1)
    if (r.ref_niv1_texte) niv1TexteMap[r.ref_niv1] = r.ref_niv1_texte
  })
  // On conserve l'ordre du sommaire (get_niv1_list) et on exclut les niv1 sans
  // segment texte (apparat critique seul).
  const niv1List = [
    ...((nbSegmentsLiminaires ?? 0) > 0 ? [NIV1_LIMINAIRES] : []),
    ...niv1Complet.filter(n1 => niv1AvecTexte.has(n1)),
  ]
  if ((nbSegmentsLiminaires ?? 0) > 0) niv1TexteMap[NIV1_LIMINAIRES] = 'LIMINAIRES'

  const segmentCible = segmentCibleData
  const vueInitiale = segmentCible?.nature === 'apparat_critique' ? 'apparat' : 'texte'
  const texteSansNiveaux = niv1List.length === 0
  const lectureTexteEntier = oeuvre.lecture_texte_entier === true
  const premierNiv1 = vueInitiale === 'texte' && segmentCible?.ref_niv1
    ? segmentCible.ref_niv1
    : niv1List[0] ?? null

  // ── Vague 2 : PREMIÈRE TRANCHE du texte du premier niv1 (apparat exclus) ──
  // On ne charge plus tout le niv1 avant le premier rendu : seule la 1re tranche
  // (~1000 segments) part du serveur ; le client complète le reste en tâche de fond.
  const trancheInitiale = lectureTexteEntier
    ? { segments: await chargerTousSegments({ nature: 'texte' }) as Segment[], partiel: false }
    : texteSansNiveaux
      ? await chargerTrancheTexte({ nature: 'texte' })
      : premierNiv1
        ? await chargerTrancheTexte({ ref_niv1: premierNiv1, nature: 'texte' })
        : { segments: [] as Segment[], partiel: false }
  const segmentsTexteRaw = trancheInitiale.segments
  const niv1InitialPartiel = trancheInitiale.partiel

  const segmentsTexte = segmentsTexteRaw as Segment[]
  const segmentsApparat = segmentsApparatRaw as Segment[]

  // 4. Versets pour le premier livre seulement
  const versetMap = await enrichirAvecVersets(supabase, segmentsTexte, codesTraductions)

  const versetParSegment: Record<number, any[]> = {}
  segmentsTexte.forEach(s => {
    versetParSegment[s.id] = extraireVersetsAvecNature(s).map(({ id: vid, natures }) => ({
      id: vid, natures, ...(versetMap[vid] || { label: vid, textes: {} })
    }))
  })

  // Auteurs de l'œuvre, à égalité : `auteur` est leur libellé commun (il nomme
  // l'œuvre au frontispice, dans les citations, dans l'historique de lecture),
  // `auteurId` reste le premier, pour les surfaces qui n'en visent qu'un.
  const auteursOeuvre = await chargerAuteursDOeuvre(supabase, id)
  const auteur = libelleAuteurs(auteursOeuvre) || (oeuvre.auteurs as any)?.nom || ''
  const auteurId = auteursOeuvre[0]?.id_auteur ?? (oeuvre.auteurs as any)?.id_auteur?.toString() ?? ''

  const groupes = grouper(segmentsTexte)
  const groupesApparat = grouper(segmentsApparat)
  const numLocaux = numerotationLocale(segmentsTexte)
  const numLocauxApparat = numerotationLocale(segmentsApparat)

  type TocEntry = { niv1:string; niv2:string; anchor:string }
  const tocApparat: TocEntry[] = []
  let la1='', la2=''
  groupesApparat.forEach((g, i) => {
    if (g.niv1 !== la1 || g.niv2 !== la2) { tocApparat.push({niv1:g.niv1,niv2:g.niv2,anchor:`a${i}`}); la1=g.niv1; la2=g.niv2 }
  })

  const segmentsData = segmentsTexte
    .filter(segmentAffichable)
    .map(s => ({
      id: s.id, idTexte: s.id_texte, segmentKey: s.segment_key,
      numero: numLocaux.get(s.id) || s.segment_numero, numeroSource: s.segment_numero,
      texte: s.segment_texte,
      texteAffichage: projeterAppelsNotesStructurees(
        s.segment_texte,
        s.segment_key ? ancresNotesStructurees[s.segment_key] : undefined,
      ), versets: versetParSegment[s.id] || [],
      notes: (s.segment_key && notesStructurees[s.segment_key]) || parseNotes((s as any).notes),
      paragraphe: s.paragraphe, rang: s.rang, texteOriginal: s.texte_original,
      nature: s.nature, espaceTextuel: s.espace_textuel, joinBefore: s.join_before,
    }))

  const groupesData = groupes.map((g, gi) => ({
    niv1: g.niv1, niv2: g.niv2, niv3: g.niv3, niv4: g.niv4,
    niv1_texte: g.niv1_texte, niv2_texte: g.niv2_texte,
    niv3_texte: g.niv3_texte, niv4_texte: g.niv4_texte,
    anchor: `g${gi}`, itemIds: g.items.map(s => s.id),
  }))

  const segmentsApparatData = segmentsApparat
    .filter(segmentAffichable)
    .map(s => ({
      id: s.id, idTexte: s.id_texte, segmentKey: s.segment_key,
      numero: numLocauxApparat.get(s.id) || s.segment_numero, numeroSource: s.segment_numero,
      texte: s.segment_texte,
      texteAffichage: projeterAppelsNotesStructurees(
        s.segment_texte,
        s.segment_key ? ancresNotesStructurees[s.segment_key] : undefined,
      ), versets: [],
      notes: (s.segment_key && notesStructurees[s.segment_key]) || parseNotes((s as any).notes),
      paragraphe: s.paragraphe, rang: s.rang, texteOriginal: s.texte_original,
      nature: s.nature, espaceTextuel: s.espace_textuel, joinBefore: s.join_before,
    }))

  const groupesApparatData = groupesApparat.map((g, gi) => ({
    niv1: g.niv1, niv2: g.niv2, niv3: g.niv3, niv4: g.niv4,
    niv1_texte: g.niv1_texte, niv2_texte: g.niv2_texte,
    niv3_texte: g.niv3_texte, niv4_texte: g.niv4_texte,
    anchor: `a${gi}`, itemIds: g.items.map(s => s.id),
  }))

  return (
    <>
      {/* Book JSON-LD — seulement pour une œuvre publique (jamais un brouillon admin). */}
      {estOeuvrePubliee(oeuvre as any) && texteActif.is_public && (
        <>
          <JsonLd donnees={donneesLivre({
            id,
            titre: oeuvre.titre,
            titreOriginal: oeuvre.titre_original,
            auteur, auteurId: auteurId || null,
            traducteur: versionActive.traducteur ?? oeuvre.trad_auteur,
            editeur: versionActive.editeurEdition ?? oeuvre.editeur,
          })} />
          <JsonLd donnees={donneesFilAriane([
            { nom: 'Accueil', url: '/accueil' },
            { nom: 'Bibliothèque', url: '/bibliotheque' },
            ...(auteur ? [{ nom: auteur, url: `/auteur/${auteurId}` }] : []),
            { nom: oeuvre.titre, url: `/oeuvre/${id}` },
          ])} />
        </>
      )}
    <OeuvreClient
      key={idTexte}
      auteur={auteur}
      auteurId={auteurId}
      auteurs={auteursOeuvre}
      idOeuvre={id}
      idTexte={idTexte}
      estAdmin={estAdmin}
      versionsTextuelles={versionsTextuelles}
      alignementsDisponibles={alignementsDisponibles}
      notesStructurees={notesStructurees}
      ancresNotesStructurees={ancresNotesStructurees}
      niv1List={niv1List}
      niv1TexteMap={niv1TexteMap}
      niveauxSommaire={oeuvre.niveaux_sommaire ?? oeuvre.profondeur_sommaire ?? 1}
      niveauxCorps={oeuvre.niveaux_corps ?? 1}
      txtSommaire={(oeuvre.texte_sommaire ?? '0,0,0,0,0').split(',').map((v: string) => v === '1')}
      txtCorps={(oeuvre.texte_corps ?? '0,0,0,0,0').split(',').map((v: string) => v === '1')}
      afficherNumeros={oeuvre.afficher_numeros !== false}
      lectureTexteEntier={lectureTexteEntier}
      oeuvre={{titre:oeuvre.titre,titre_affichage:oeuvre.titre_affichage,sous_titre:oeuvre.sous_titre,titre_original:oeuvre.titre_original,trad_auteur:oeuvre.trad_auteur,trad_date:oeuvre.trad_date,commentaire_traduction:oeuvre.commentaire_traduction,note_editoriale_secondaire:oeuvre.note_editoriale_secondaire,editeur:oeuvre.editeur,collection:oeuvre.collection,ville:oeuvre.ville,date_publication:oeuvre.date_publication,date_mise_en_ligne:oeuvre.date_mise_en_ligne,id_oeuvre:oeuvre.id_oeuvre,date_composition:oeuvre.date_composition,langue_originale:oeuvre.langue_originale,genres:oeuvre.genres,url_source:oeuvre.url_source}}
      groupes={groupesData} segments={segmentsData}
      tocApparat={tocApparat} groupesApparat={groupesApparatData} segmentsApparat={segmentsApparatData}
      segmentCibleId={Number.isFinite(segmentCibleId) && segmentCibleId > 0 ? segmentCibleId : null}
      niv1Initial={premierNiv1 ?? niv1List[0] ?? null}
      vueInitiale={vueInitiale}
      niv1InitialPartiel={niv1InitialPartiel}
      comparaisonInitiale={Boolean(alignementDemande)}
      alignmentSetIdInitial={alignementDemande?.alignmentSetId ?? null}
      comparaisonLivreInitial={Number(sp.book ?? '1')}
      comparaisonDivisionInitiale={Number(sp.division ?? '1')}
    />
    </>
  )
}
