import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { estAdminUtilisateur } from '@/app/lib/verifAdminUtilisateur'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type MetaOeuvre = {
  id_oeuvre: string
  id_auteur: string
  titre: string
  sous_titre?: string | null
  titre_original?: string | null
  trad_auteur?: string | null
  trad_date?: string | null
  editeur?: string | null
  collection?: string | null
  ville?: string | null
  date_publication?: string | null
  url_source?: string | null
  genre?: string | null
  langue?: string | null
}

type SegmentCsv = Record<string, string | number | null | undefined>

const COLONNES_SEGMENTS = [
  'id_oeuvre',
  'segment_numero',
  'segment_texte',
  'ref_niv1',
  'ref_niv2',
  'ref_niv3',
  'ref_niv4',
  'ref_niv5',
  'lien_1',
  'lien_2',
  'lien_3',
  'lien_4',
  'fiabilite',
  'nature',
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
    ref_niv1: nulSiVide(s.ref_niv1),
    ref_niv2: nulSiVide(s.ref_niv2),
    ref_niv3: nulSiVide(s.ref_niv3),
    ref_niv4: nulSiVide(s.ref_niv4),
    ref_niv5: nulSiVide(s.ref_niv5),
    lien_1: nulSiVide(s.lien_1),
    lien_2: nulSiVide(s.lien_2),
    lien_3: nulSiVide(s.lien_3),
    lien_4: nulSiVide(s.lien_4),
    fiabilite: nulSiVide(s.fiabilite),
    nature: nulSiVide(s.nature) ?? 'texte',
  }
  return Object.fromEntries(COLONNES_SEGMENTS.map(c => [c, row[c]]))
}

async function rollback(idOeuvre: string) {
  await supabaseAdmin.from('segments').delete().eq('id_oeuvre', idOeuvre)
  await supabaseAdmin.from('oeuvres').delete().eq('id_oeuvre', idOeuvre)
}

export async function POST(request: Request) {
  if (!(await estAdminUtilisateur(request))) {
    return NextResponse.json({ error: 'Import refusé : utilisateur non administrateur ou session absente.' }, { status: 403 })
  }

  const body = await request.json()
  const meta = body?.meta as MetaOeuvre | undefined
  const segments = body?.segments as SegmentCsv[] | undefined

  if (!meta?.id_oeuvre || !meta?.id_auteur || !meta?.titre?.trim()) {
    return NextResponse.json({ error: 'Titre, auteur et id_oeuvre sont requis.' }, { status: 400 })
  }
  if (!Array.isArray(segments) || segments.length === 0) {
    return NextResponse.json({ error: 'Aucun segment à importer.' }, { status: 400 })
  }

  const { data: existante, error: existanteError } = await supabaseAdmin
    .from('oeuvres')
    .select('id_oeuvre')
    .eq('id_oeuvre', meta.id_oeuvre)
    .maybeSingle()

  if (existanteError) {
    return NextResponse.json({ error: existanteError.message }, { status: 500 })
  }
  if (existante) {
    const { count, error: countError } = await supabaseAdmin
      .from('segments')
      .select('id', { count: 'exact', head: true })
      .eq('id_oeuvre', meta.id_oeuvre)
    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 500 })
    }
    if ((count ?? 0) > 0) {
      return NextResponse.json({ error: `L'ID ${meta.id_oeuvre} existe déjà et contient ${count} segment(s). Régénérez un ID ou supprimez l'œuvre explicitement.` }, { status: 409 })
    }
    await rollback(meta.id_oeuvre)
  }

  const oeuvrePayload = {
    id_oeuvre: meta.id_oeuvre,
    id_auteur: meta.id_auteur,
    titre: meta.titre.trim(),
    sous_titre: nulSiVide(meta.sous_titre),
    titre_original: nulSiVide(meta.titre_original),
    trad_auteur: nulSiVide(meta.trad_auteur),
    trad_date: nulSiVide(meta.trad_date),
    editeur: nulSiVide(meta.editeur),
    collection: nulSiVide(meta.collection),
    ville: nulSiVide(meta.ville),
    date_publication: nulSiVide(meta.date_publication),
    url_source: nulSiVide(meta.url_source),
    genre: nulSiVide(meta.genre),
    langue: nulSiVide(meta.langue),
  }

  const { error: errOeuvre } = await supabaseAdmin.from('oeuvres').insert(oeuvrePayload)
  if (errOeuvre) {
    return NextResponse.json({ error: `Erreur création œuvre : ${errOeuvre.message}` }, { status: 500 })
  }

  try {
    const rows = segments.map((s, i) => normaliserSegment(s, meta.id_oeuvre, i))
    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await supabaseAdmin.from('segments').insert(rows.slice(i, i + 500))
      if (error) throw error
    }
    return NextResponse.json({ ok: true, idOeuvre: meta.id_oeuvre, count: rows.length })
  } catch (error: any) {
    await rollback(meta.id_oeuvre)
    return NextResponse.json({ error: `Erreur import segments : ${error?.message ?? String(error)}` }, { status: 500 })
  }
}
