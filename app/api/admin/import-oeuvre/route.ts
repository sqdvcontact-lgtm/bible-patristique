import { NextResponse } from 'next/server'
import { erreur500 } from '@/app/lib/apiErreur'
import { createClient } from '@supabase/supabase-js'
import { estAdminUtilisateur } from '@/app/lib/verifAdminUtilisateur'
import { colonnesPeriodeHistorique, normaliserDateHistoriqueTexte } from '@/app/lib/datesHistoriques'
import { NATURE_VALIDES as NATURES_SEGMENTS_IMPORT, normaliserNatureSegment } from '@/app/lib/naturesSegments'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type MetaOeuvre = {
  id_oeuvre?: string
  id_auteur: string
  titre: string
  sous_titre?: string | null
  titre_original?: string | null
  trad_auteur?: string | null
  editeur?: string | null
  collection?: string | null
  ville?: string | null
  url_source?: string | null
  date_publication?: string | null
  date_composition?: string | null
  genres?: string[] | null
  langue?: string | null
}

type SegmentCsv = Record<string, string | number | null | undefined>

const COLONNES_SEGMENTS = [
  'id_oeuvre', 'id_texte', 'segment_numero', 'segment_texte',
  'ref_niv1', 'ref_niv2', 'ref_niv3', 'ref_niv4', 'ref_niv5',
  'lien_1', 'lien_2', 'lien_3', 'lien_4', 'fiabilite', 'nature', 'notes',
] as const

function nulSiVide(v: unknown): string | null {
  if (v === undefined || v === null) return null
  const s = String(v).trim()
  return s ? s : null
}

// Vocabulaire unique de la fiabilité (charte §24.3). « Lien à constituer » et
// « à_vérifier » ont disparu le 20 juillet 2026 : les accepter faisait passer des
// valeurs mortes, les refuser en silence faisait perdre les valeurs vivantes.
const FIABILITE_VALIDES = ['à constituer', 'douteux', 'probable', 'vérifié']
export const NATURE_VALIDES = [...NATURES_SEGMENTS_IMPORT]

function normaliserSegment(s: SegmentCsv, idOeuvre: string, idTexte: string, index: number) {
  const row: Record<string, string | number | null> = {
    id_oeuvre: idOeuvre,
    id_texte: idTexte,
    segment_numero: Number.parseInt(String(s.segment_numero ?? ''), 10) || index + 1,
    segment_texte: String(s.segment_texte ?? ''),
    ref_niv1: nulSiVide(s.ref_niv1), ref_niv2: nulSiVide(s.ref_niv2),
    ref_niv3: nulSiVide(s.ref_niv3), ref_niv4: nulSiVide(s.ref_niv4),
    ref_niv5: nulSiVide(s.ref_niv5),
    lien_1: nulSiVide(s.lien_1), lien_2: nulSiVide(s.lien_2),
    lien_3: nulSiVide(s.lien_3), lien_4: nulSiVide(s.lien_4),
    fiabilite: FIABILITE_VALIDES.includes(String(s.fiabilite ?? '')) ? String(s.fiabilite) : null,
    nature: normaliserNatureSegment(s.nature),
  }
  return Object.fromEntries(COLONNES_SEGMENTS.map(c => [c, row[c]]))
}

function segmentUtile(row: Record<string, string | number | null>) {
  return Boolean(
    String(row.segment_texte ?? '').trim() ||
    row.lien_1 || row.lien_2 || row.lien_3 || row.lien_4 ||
    row.fiabilite
  )
}

async function rollback(idOeuvre: string) {
  await supabaseAdmin.from('segments').delete().eq('id_oeuvre', idOeuvre)
  await supabaseAdmin.from('oeuvre_textes').delete().eq('id_oeuvre', idOeuvre)
  await supabaseAdmin.from('oeuvres').delete().eq('id_oeuvre', idOeuvre)
}

async function prochainIdOeuvre(idAuteur: string): Promise<string> {
  const { data } = await supabaseAdmin
    .from('oeuvres').select('id_oeuvre').eq('id_auteur', idAuteur)
    .order('id_oeuvre', { ascending: false }).limit(1)
  const dernier = data?.[0]?.id_oeuvre as string | undefined
  const match = dernier?.match(/O(\d+)$/)
  const num = match ? parseInt(match[1]) + 1 : 1
  return `${idAuteur}O${String(num).padStart(4, '0')}`
}

export async function POST(request: Request) {
  if (!(await estAdminUtilisateur(request))) {
    return NextResponse.json({ error: 'Import refusé : utilisateur non administrateur ou session absente.' }, { status: 403 })
  }

  const body = await request.json()
  const meta = body?.meta as MetaOeuvre | undefined
  const segments = body?.segments as SegmentCsv[] | undefined

  if (!meta?.id_auteur || !meta?.titre?.trim()) {
    return NextResponse.json({ error: 'Titre et auteur sont requis.' }, { status: 400 })
  }
  if (!Array.isArray(segments) || segments.length === 0) {
    return NextResponse.json({ error: 'Aucun segment à importer.' }, { status: 400 })
  }

  const idOeuvre = meta.id_oeuvre?.trim() || await prochainIdOeuvre(meta.id_auteur)
  const idTexte = `TXT_${idOeuvre}_LEGACY`

  const { data: existante } = await supabaseAdmin
    .from('oeuvres').select('id_oeuvre').eq('id_oeuvre', idOeuvre).maybeSingle()

  if (existante) {
    const { count } = await supabaseAdmin
      .from('segments').select('id', { count: 'exact', head: true }).eq('id_oeuvre', idOeuvre)
    if ((count ?? 0) > 0) {
      return NextResponse.json({ error: `L'ID ${idOeuvre} existe déjà et contient ${count} segment(s).` }, { status: 409 })
    }
    await rollback(idOeuvre)
  }

  const datePublication = normaliserDateHistoriqueTexte(meta.date_publication)
  const dateComposition = normaliserDateHistoriqueTexte(meta.date_composition)

  const oeuvrePayload = {
    id_oeuvre: idOeuvre,
    id_auteur: meta.id_auteur,
    titre: meta.titre.trim(),
    sous_titre: nulSiVide(meta.sous_titre),
    titre_original: nulSiVide(meta.titre_original),
    trad_auteur: nulSiVide(meta.trad_auteur),
    editeur: nulSiVide(meta.editeur),
    collection: nulSiVide(meta.collection),
    ville: nulSiVide(meta.ville),
    url_source: nulSiVide(meta.url_source),
    date_publication: datePublication,
    date_composition: dateComposition,
    ...colonnesPeriodeHistorique('publication', datePublication),
    ...colonnesPeriodeHistorique('composition', dateComposition),
    genres: Array.isArray(meta.genres) ? meta.genres : [],
    langue_originale: nulSiVide(meta.langue),
  }

  const { error: errOeuvre } = await supabaseAdmin.from('oeuvres').insert(oeuvrePayload)
  if (errOeuvre) {
    return erreur500(errOeuvre, "Erreur création œuvre : ")
  }

  const { error: errTexte } = await supabaseAdmin.from('oeuvre_textes').insert({
    id_texte: idTexte,
    id_oeuvre: idOeuvre,
    titre_version: meta.titre.trim(),
    langue: nulSiVide(meta.langue),
    traducteur: nulSiVide(meta.trad_auteur),
    edition_label: [nulSiVide(meta.editeur), datePublication].filter(Boolean).join(', ') || null,
    statut: 'published',
    is_default: true,
    is_public: true,
    metadata: { legacy: true, origin: 'admin_import_after_multiversion_migration' },
  })
  if (errTexte) {
    await rollback(idOeuvre)
    return erreur500(errTexte, "Erreur création texte : ")
  }

  try {
    const rows = segments
      .map((s, i) => normaliserSegment(s, idOeuvre, idTexte, i))
      .filter(segmentUtile)
      .map((row, i) => ({ ...row, segment_numero: i + 1 }))
    if (rows.length === 0) {
      throw new Error('Aucun segment non vide à importer.')
    }
    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await supabaseAdmin.from('segments').insert(rows.slice(i, i + 500))
      if (error) throw error
    }
    return NextResponse.json({ ok: true, idOeuvre, idTexte, count: rows.length })
  } catch (error: any) {
    await rollback(idOeuvre)
    const msg = error?.message ?? error?.code ?? String(error)
    return NextResponse.json({ error: `Erreur import segments : ${msg}` }, { status: 500 })
  }
}
