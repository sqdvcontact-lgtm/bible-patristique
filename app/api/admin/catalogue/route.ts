import { NextResponse } from 'next/server'
import { erreur500 } from '@/app/lib/apiErreur'
import { createClient } from '@supabase/supabase-js'
import { estAdminUtilisateur } from '@/app/lib/verifAdminUtilisateur'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: Request) {
  if (!(await estAdminUtilisateur(req))) return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })
  const url = new URL(req.url)
  const verifie   = url.searchParams.get('verifie')
  const presence  = url.searchParams.get('presence')
  const avecUrl   = url.searchParams.get('avec_url')
  const decision  = url.searchParams.get('decision')
  const auteur    = url.searchParams.get('auteur')
  const page      = parseInt(url.searchParams.get('page') ?? '0')
  const oeuvres   = url.searchParams.get('oeuvres')
  const idsOeuvres = oeuvres?.split(',').map(id => id.trim()).filter(Boolean).slice(0, 500) ?? []
  const limitParam = parseInt(url.searchParams.get('limit') ?? (idsOeuvres.length ? '1000' : '100'))
  const limit = Math.min(Math.max(Number.isFinite(limitParam) ? limitParam : 100, 1), 5000)

  let q = supabaseAdmin
    .from('catalogue_notices')
    .select(
      'id, id_ligne, id_auteur, auteur, dates_auteur, id_oeuvre_stable, titre_stable, titre_original, ' +
      'titre_edition, traducteur, annee_edition, siecle_edition, editeur, collection_nom, domaine_public, ' +
      'url_source, decision_import, niveau_verification, score_fiabilite, presence_sur_le_site, ' +
      'verifie, verifie_admin, refuse_admin, genre, langue_originale, date_oeuvre, authenticite, created_at',
      { count: 'exact' }
    )
    .order('auteur', { ascending: true })
    .order('titre_stable', { ascending: true })
    .range(page * limit, (page + 1) * limit - 1)

  // Les fiches refusées par l'admin sont consignées mais retirées de l'affichage.
  // Elles ne reviennent qu'avec ?inclure_refus=true (accès de contrôle / IA).
  if (url.searchParams.get('inclure_refus') !== 'true') q = q.eq('refuse_admin', false)

  if (verifie === 'true')  q = q.eq('verifie', true)
  if (verifie === 'false') q = q.eq('verifie', false)
  if (presence === 'true') q = q.eq('presence_sur_le_site', true)
  // « Avec lien » : notices dont l'URL vers le livre d'origine est renseignée.
  if (avecUrl === 'true')  q = q.not('url_source', 'is', null)
  if (idsOeuvres.length) q = q.in('id_oeuvre_stable', idsOeuvres)
  if (auteur) q = q.ilike('auteur', `%${auteur}%`)

  if (decision === 'candidat')     q = q.ilike('decision_import', 'Candidat%')
  if (decision === 'bibliographie') q = q.ilike('decision_import', 'Bibliographie%')
  if (decision === 'reperage')     q = q.ilike('decision_import', 'Repérage%')
  if (decision === 'ecarter')      q = q.ilike('decision_import', 'Écarter%')

  const { data, error, count } = await q
  if (error) return erreur500(error)
  return NextResponse.json({ data, count })
}

export async function PATCH(req: Request) {
  if (!(await estAdminUtilisateur(req))) return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })
  const body = await req.json()
  const { id } = body
  if (!id) return NextResponse.json({ error: 'id manquant' }, { status: 400 })
  // On n'écrit que les champs explicitement fournis (verifie, verifie_admin, refuse_admin).
  // Le déclencheur `protect_verified_notice` autorise ces trois-là sur une fiche déjà
  // vérifiée : ils ne font pas partie des champs identitaires qu'il protège.
  const maj: Record<string, unknown> = {}
  if (typeof body.verifie === 'boolean') maj.verifie = body.verifie
  if (typeof body.verifie_admin === 'boolean') maj.verifie_admin = body.verifie_admin
  if (typeof body.refuse_admin === 'boolean') maj.refuse_admin = body.refuse_admin

  // Édition en ligne d'un champ (`champs: { colonne: valeur }`). Liste blanche stricte :
  // on n'écrit que ces colonnes-là. Le déclencheur `protect_verified_notice` refusera
  // encore `titre_stable`/`titre_original` sur une fiche déjà vérifiée — l'erreur est
  // remontée telle quelle au client, qui l'affiche.
  const TEXTE_OK = new Set(['auteur', 'authenticite', 'titre_stable', 'titre_original', 'titre_edition',
    'editeur', 'collection_nom', 'siecle_edition', 'genre', 'langue_originale', 'date_oeuvre',
    'decision_import', 'niveau_verification', 'url_source', 'dates_auteur'])
  const NUM_OK = new Set(['annee_edition', 'score_fiabilite'])
  const champs = body.champs
  if (champs && typeof champs === 'object') {
    for (const [col, valBrute] of Object.entries(champs as Record<string, unknown>)) {
      if (TEXTE_OK.has(col)) {
        const s = valBrute == null ? '' : String(valBrute).trim()
        maj[col] = s === '' ? null : s
      } else if (NUM_OK.has(col)) {
        const s = valBrute == null ? '' : String(valBrute).trim()
        if (s === '') maj[col] = null
        else { const n = Number(s.replace(/[^\d-]/g, '')); maj[col] = Number.isFinite(n) ? n : null }
      }
      // colonne non listée : ignorée en silence
    }
  }

  if (Object.keys(maj).length === 0) return NextResponse.json({ error: 'rien à modifier' }, { status: 400 })
  const { error } = await supabaseAdmin.from('catalogue_notices').update(maj).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: Request) {
  if (!(await estAdminUtilisateur(req))) return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'id manquant' }, { status: 400 })
  const { error } = await supabaseAdmin.from('catalogue_notices').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
