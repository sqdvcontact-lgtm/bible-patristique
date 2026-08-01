import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { estAdminUtilisateur } from '@/app/lib/verifAdminUtilisateur'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Écritures sur les événements et leurs associations (chronologie). La RLS n'ouvre
// que la LECTURE au public ; tout passe ici, avec vérification admin serveur.
// Invariants (charte §26) : on ne crée jamais d'auteur ni d'association vers un
// auteur introuvable ; supprimer une association ne touche jamais l'événement
// central (la FK evenement_id est ON DELETE RESTRICT).

const CHAMPS_EVT = new Set([
  'titre', 'notice', 'lieu', 'date_debut', 'date_fin', 'date_exacte', 'qualification_date',
  'genre_id', 'portee', 'importance_generale', 'note_datation', 'source_principale',
  'source_secondaire', 'origine_donnee', 'statut_source', 'oeuvre_id', 'est_publie',
])
const CHAMPS_ASSOC = new Set([
  'nature_lien', 'pertinence', 'justification', 'titre_personnalise', 'notice_personnalisee',
  'source_lien', 'commentaire', 'est_affiche', 'a_controler', 'ordre_force',
])
const CHAMPS_ENTIERS = new Set(['date_debut', 'date_fin', 'ordre_force'])

// Ne conserve que les champs autorisés, en normalisant les entiers et les vides.
function filtrer(champs: Record<string, unknown>, autorises: Set<string>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(champs ?? {})) {
    if (!autorises.has(k)) continue
    if (CHAMPS_ENTIERS.has(k)) {
      if (v === null || v === undefined || v === '') { out[k] = null; continue }
      const n = Number(v)
      out[k] = Number.isInteger(n) ? n : null
    } else if (typeof v === 'string') {
      out[k] = v.trim() === '' ? null : v
    } else {
      out[k] = v
    }
  }
  return out
}

export async function POST(request: Request) {
  if (!(await estAdminUtilisateur(request))) return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })

  const body = await request.json().catch(() => null)
  if (!body || typeof body.action !== 'string') return NextResponse.json({ error: 'Requête invalide.' }, { status: 400 })
  const action = body.action as string

  // ── Mise à jour d'un événement central ──────────────────────────────
  if (action === 'maj-evenement') {
    const id = String(body.id ?? '')
    if (!id) return NextResponse.json({ error: 'Identifiant manquant.' }, { status: 400 })
    const maj = filtrer(body.champs ?? {}, CHAMPS_EVT)
    // titre et source_principale ne peuvent pas devenir vides (NOT NULL).
    if ('titre' in maj && !maj.titre) return NextResponse.json({ error: 'Le titre est requis.' }, { status: 400 })
    if (Object.keys(maj).length === 0) return NextResponse.json({ error: 'Rien à mettre à jour.' }, { status: 400 })
    const { error } = await supabaseAdmin.from('evenements').update(maj).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  // ── Mise à jour d'une association ────────────────────────────────────
  if (action === 'maj-association') {
    const id = body.id
    if (id == null) return NextResponse.json({ error: 'Identifiant manquant.' }, { status: 400 })
    const maj = filtrer(body.champs ?? {}, CHAMPS_ASSOC)
    if (Object.keys(maj).length === 0) return NextResponse.json({ error: 'Rien à mettre à jour.' }, { status: 400 })
    const { error } = await supabaseAdmin.from('auteurs_evenements').update(maj).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  // ── Suppression d'une association (l'événement central survit) ───────
  if (action === 'suppr-association') {
    const id = body.id
    if (id == null) return NextResponse.json({ error: 'Identifiant manquant.' }, { status: 400 })
    const { error } = await supabaseAdmin.from('auteurs_evenements').delete().eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  // ── Création d'une association vers un auteur EXISTANT ───────────────
  // On ne crée jamais d'auteur : on refuse tout auteur introuvable (charte §26.3).
  if (action === 'creer-association') {
    const auteur_id = String(body.auteur_id ?? '').trim()
    const evenement_id = String(body.evenement_id ?? '').trim()
    if (!auteur_id || !evenement_id) return NextResponse.json({ error: 'Auteur et événement requis.' }, { status: 400 })

    const [{ data: aut }, { data: evt }] = await Promise.all([
      supabaseAdmin.from('auteurs').select('id_auteur').eq('id_auteur', auteur_id).maybeSingle(),
      supabaseAdmin.from('evenements').select('id').eq('id', evenement_id).maybeSingle(),
    ])
    if (!aut) return NextResponse.json({ error: `Auteur « ${auteur_id} » introuvable : aucune association n'est créée.` }, { status: 400 })
    if (!evt) return NextResponse.json({ error: 'Événement introuvable.' }, { status: 400 })

    const ligne = {
      auteur_id, evenement_id,
      nature_lien: String(body.nature_lien ?? 'direct'),
      pertinence: String(body.pertinence ?? 'utile'),
      justification: String(body.justification ?? '').trim() || 'Association ajoutée manuellement.',
      source_lien: String(body.source_lien ?? '').trim() || 'Saisie manuelle (admin).',
      origine_association: 'manuel',
      commentaire: body.commentaire ? String(body.commentaire).trim() : null,
      a_controler: body.a_controler === true,
    }
    const { error } = await supabaseAdmin.from('auteurs_evenements').insert(ligne)
    if (error) {
      const msg = error.code === '23505' ? 'Cet auteur est déjà associé à cet événement.' : error.message
      return NextResponse.json({ error: msg }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Action inconnue.' }, { status: 400 })
}
