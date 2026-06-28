import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { estAdminUtilisateur } from '@/app/lib/verifAdminUtilisateur'

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
  trad_date?: string | null
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
  'id_oeuvre', 'segment_numero', 'segment_texte',
  'ref_niv1', 'ref_niv2', 'ref_niv3', 'ref_niv4', 'ref_niv5',
  'lien_1', 'lien_2', 'lien_3', 'lien_4', 'fiabilite', 'nature',
] as const

function nulSiVide(v: unknown): string | null {
  if (v === undefined || v === null) return null
  const s = String(v).trim()
  return s ? s : null
}

function normaliserSegment(s: SegmentCsv, idOeuvre: string, index: number) {
  const row: Record<string, string | number | null> = {
    id_oeuvre: idOeuvre,
    segment_numero: Number.parseInt(String(s.segment_numero ?? ''), 10) || index + 1,
    segment_texte: String(s.segment_texte ?? ''),
    ref_niv1: nulSiVide(s.ref_niv1), ref_niv2: nulSiVide(s.ref_niv2),
    ref_niv3: nulSiVide(s.ref_niv3), ref_niv4: nulSiVide(s.ref_niv4),
    ref_niv5: nulSiVide(s.ref_niv5),
    lien_1: nulSiVide(s.lien_1), lien_2: nulSiVide(s.lien_2),
    lien_3: nulSiVide(s.lien_3), lien_4: nulSiVide(s.lien_4),
    fiabilite: nulSiVide(s.fiabilite),
    nature: nulSiVide(s.nature) ?? 'texte',
  }
  return Object.fromEntries(COLONNES_SEGMENTS.map(c => [c, row[c]]))
}

async function rollback(idOeuvre: string) {
  await supabaseAdmin.from('segments').delete().eq('id_oeuvre', idOeuvre)
  await supabaseAdmin.from('oeuvres').delete().eq('id_oeuvre', idOeuvre)
}

async function genererIdOeuvre(idAuteur: string): Promise<string> {
  const { data } = await supabaseAdmin
    .from('oeuvres').select('id_oeuvre').eq('id_auteur', idAuteur)
    .order('id_oeuvre', { ascending: false })
  let prochainNum = 1
  if (data && data.length > 0) {
    const nums = data.map((d: any) => {
      const match = (d.id_oeuvre as string).match(/O(\d+)$/)
      return match ? parseInt(match[1]) : 0
    })
    prochainNum = Math.max(...nums) + 1
  }
  return `${idAuteur}O${String(prochainNum).padStart(4, '0')}`
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

  const idOeuvre = meta.id_oeuvre?.trim() || await genererIdOeuvre(meta.id_auteur)

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

  const oeuvrePayload = {
    id_oeuvre: idOeuvre,
    id_auteur: meta.id_auteur,
    titre: meta.titre.trim(),
    sous_titre: nulSiVide(meta.sous_titre),
    titre_original: nulSiVide(meta.titre_original),
    trad_auteur: nulSiVide(meta.trad_auteur),
    trad_date: nulSiVide(meta.trad_date),
    editeur: nulSiVide(meta.editeur),
    collection: nulSiVide(meta.collection),
    ville: nulSiVide(meta.ville),
    url_source: nulSiVide(meta.url_source),
    date_publication: nulSiVide(meta.date_publication),
    date_composition: nulSiVide(meta.date_composition),
    genres: Array.isArray(meta.genres) ? meta.genres : [],
    langue: nulSiVide(meta.langue),
  }

  const { error: errOeuvre } = await supabaseAdmin.from('oeuvres').insert(oeuvrePayload)
  if (errOeuvre) {
    return NextResponse.json({ error: `Erreur création œuvre : ${errOeuvre.message}` }, { status: 500 })
  }

  try {
    const rows = segments.map((s, i) => normaliserSegment(s, idOeuvre, i))
    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await supabaseAdmin.from('segments').insert(rows.slice(i, i + 500))
      if (error) throw error
    }
    return NextResponse.json({ ok: true, idOeuvre, count: rows.length })
  } catch (error: any) {
    await rollback(idOeuvre)
    return NextResponse.json({ error: `Erreur import segments : ${error?.message ?? String(error)}` }, { status: 500 })
  }
}
