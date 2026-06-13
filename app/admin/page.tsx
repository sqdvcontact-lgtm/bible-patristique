import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import AdminClient from './AdminClient'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!  // clé service_role — jamais exposée côté client
)

const MOT_DE_PASSE = process.env.ADMIN_PASSWORD!
const COOKIE_NOM   = 'bp_admin_session'
const COOKIE_VALEUR = 'authentifie'

// ── Server Actions ────────────────────────────────────────────────────────────

async function actionConnexion(formData: FormData) {
  'use server'
  const mdp = formData.get('mdp') as string
  if (mdp === MOT_DE_PASSE) {
    const cookieStore = await cookies()
    cookieStore.set(COOKIE_NOM, COOKIE_VALEUR, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 8, // 8 heures
      path: '/',
    })
  }
  redirect('/admin')
}

async function actionDeconnexion() {
  'use server'
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NOM)
  redirect('/admin')
}

async function actionValiderCommentaire(id: number) {
  'use server'
  await supabaseAdmin.from('commentaires').update({ valide: true }).eq('id', id)
  redirect('/admin')
}

async function actionSupprimerCommentaire(id: number) {
  'use server'
  await supabaseAdmin.from('commentaires').delete().eq('id', id)
  redirect('/admin')
}

async function actionMarquerTraite(id: number) {
  'use server'
  await supabaseAdmin.from('signalements').update({ traite: true }).eq('id', id)
  redirect('/admin')
}

async function actionSupprimerSignalement(id: number) {
  'use server'
  await supabaseAdmin.from('signalements').delete().eq('id', id)
  redirect('/admin')
}

// ── Page ─────────────────────────────────────────────────────────────────────

export const metadata = { title: 'Administration — Bible & Tradition' }

export default async function AdminPage() {
  const cookieStore = await cookies()
  const estConnecte = cookieStore.get(COOKIE_NOM)?.value === COOKIE_VALEUR

  if (!estConnecte) {
    return (
      <main style={{ minHeight: 'calc(100vh - 48px)', background: '#f7f4ef', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: '#fff', border: '1px solid #d6d0c4', borderRadius: '10px', padding: '36px 40px', width: '320px' }}>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: '20px', fontWeight: 'normal', color: '#2a3d30', marginBottom: '6px' }}>
            Administration
          </h1>
          <p style={{ fontSize: '12px', color: '#9a958d', marginBottom: '24px' }}>Bible &amp; Tradition patristique</p>
          <form action={actionConnexion} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input
              type="password"
              name="mdp"
              placeholder="Mot de passe"
              required
              autoFocus
              style={{
                padding: '9px 12px', fontSize: '13px', border: '1px solid #d6d0c4',
                borderRadius: '6px', outline: 'none', color: '#2a2520', background: '#faf8f4',
              }}
            />
            <button
              type="submit"
              style={{
                padding: '9px', fontSize: '13px', fontWeight: 500,
                background: '#3d6b4f', color: '#fff', border: 'none',
                borderRadius: '6px', cursor: 'pointer',
              }}
            >
              Accéder
            </button>
          </form>
        </div>
      </main>
    )
  }

  // Récupérer commentaires non validés
  const { data: commentaires } = await supabaseAdmin
    .from('commentaires')
    .select('id, texte, valide, created_at, id_segment, id_verset')
    .eq('valide', false)
    .order('created_at', { ascending: false })

  // Récupérer signalements non traités
  const { data: signalements } = await supabaseAdmin
    .from('signalements')
    .select('id, message, traite, created_at, id_segment')
    .eq('traite', false)
    .order('created_at', { ascending: false })

  // Récupérer les segments pour contexte
  const segIds = [
    ...(commentaires?.map(c => c.id_segment).filter(Boolean) ?? []),
    ...(signalements?.map(s => s.id_segment).filter(Boolean) ?? []),
  ]
  const segIdsUniques = [...new Set(segIds)]

  const { data: segments } = segIdsUniques.length > 0
    ? await supabaseAdmin.from('segments').select('id, segment_texte, segment_numero, id_oeuvre').in('id', segIdsUniques)
    : { data: [] }

  const segMap: Record<number, { texte: string; numero: number; id_oeuvre: string }> = {}
  segments?.forEach(s => { segMap[s.id] = { texte: s.segment_texte, numero: s.segment_numero, id_oeuvre: s.id_oeuvre } })

  return (
    <AdminClient
      commentaires={commentaires ?? []}
      signalements={signalements ?? []}
      segMap={segMap}
      actionDeconnexion={actionDeconnexion}
      actionValider={actionValiderCommentaire}
      actionSupprimerCommentaire={actionSupprimerCommentaire}
      actionMarquerTraite={actionMarquerTraite}
      actionSupprimerSignalement={actionSupprimerSignalement}
    />
  )
}