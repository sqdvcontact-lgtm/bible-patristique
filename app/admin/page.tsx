import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { creerSupabaseServeur } from '@/app/lib/supabaseServeur'
import { estAdmin } from '@/app/lib/verifAdmin'
import AdminClient from './AdminClient'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function actionDeconnexion() {
  'use server'
  const supabase = await creerSupabaseServeur()
  await supabase.auth.signOut()
  redirect('/admin')
}
async function actionValiderCommentaire(id: number) {
  'use server'
  if (!(await estAdmin())) return
  await supabaseAdmin.from('commentaires').update({ valide: true }).eq('id', id)
  redirect('/admin')
}
async function actionSupprimerCommentaire(id: number) {
  'use server'
  if (!(await estAdmin())) return
  await supabaseAdmin.from('commentaires').delete().eq('id', id)
  redirect('/admin')
}
async function actionMarquerTraite(id: number) {
  'use server'
  if (!(await estAdmin())) return
  await supabaseAdmin.from('signalements').update({ traite: true }).eq('id', id)
  redirect('/admin')
}
async function actionSupprimerSignalement(id: number) {
  'use server'
  if (!(await estAdmin())) return
  await supabaseAdmin.from('signalements').delete().eq('id', id)
  redirect('/admin')
}
async function actionCertifierCommentaire(id: number) {
  'use server'
  if (!(await estAdmin())) return
  await supabaseAdmin.from('commentaires').update({ certifie: true, valide: true, demande_validation: false }).eq('id', id)
  redirect('/admin')
}
async function actionRetirerDemandeCertification(id: number) {
  'use server'
  if (!(await estAdmin())) return
  await supabaseAdmin.from('commentaires').update({ demande_validation: false }).eq('id', id)
  redirect('/admin')
}
async function actionPublierEssai(id: number) {
  'use server'
  if (!(await estAdmin())) return
  const { data: actuel } = await supabaseAdmin.from('essais').select('publie_at').eq('id', id).single()
  const payload: any = { statut: 'publie' }
  if (!actuel?.publie_at) payload.publie_at = new Date().toISOString()
  await supabaseAdmin.from('essais').update(payload).eq('id', id)
  redirect('/admin')
}
async function actionRenvoyerBrouillonEssai(id: number) {
  'use server'
  if (!(await estAdmin())) return
  await supabaseAdmin.from('essais').update({ statut: 'brouillon' }).eq('id', id)
  redirect('/admin')
}

export const metadata = { title: 'Administration — La Bible des Pères' }

export default async function AdminPage() {
  const autorise = await estAdmin()

  if (!autorise) {
    return (
      <main style={{ minHeight: 'calc(100vh - 48px)', background: '#f7f4ef', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: '#fff', border: '1px solid #d6d0c4', borderRadius: '10px', padding: '36px 40px', width: '340px', textAlign: 'center' }}>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: '20px', fontWeight: 'normal', color: '#2a3d30', marginBottom: '6px' }}>Administration</h1>
          <p style={{ fontSize: '12px', color: '#9a958d', marginBottom: '20px' }}>La Bible des Pères</p>
          <p style={{ fontSize: '12.5px', color: '#6b6560', lineHeight: 1.6, marginBottom: '22px' }}>
            Cette page est réservée au compte administrateur. Connectez-vous avec ce compte pour y accéder.
          </p>
          <a href="/compte" style={{ display: 'inline-block', padding: '9px 20px', fontSize: '13px', fontWeight: 500, background: '#3d6b4f', color: '#fff', borderRadius: '6px', textDecoration: 'none' }}>
            Se connecter
          </a>
        </div>
      </main>
    )
  }

  // Modération
  const { data: commentaires } = await supabaseAdmin.from('commentaires').select('id, texte, auteur_nom, auteur_mail, valide, created_at, id_segment, id_verset').eq('valide', false).order('created_at', { ascending: false })
  const { data: signalements } = await supabaseAdmin.from('signalements').select('id, message, traite, created_at, id_segment').eq('traite', false).order('created_at', { ascending: false })
  const { data: demandesCertification } = await supabaseAdmin.from('commentaires').select('id, texte, auteur_nom, auteur_mail, valide, created_at, id_segment, id_verset, demande_validation, certifie').eq('demande_validation', true).order('created_at', { ascending: false })
  const segIds = [...(commentaires?.map(c => c.id_segment).filter(Boolean) ?? []), ...(signalements?.map(s => s.id_segment).filter(Boolean) ?? []), ...(demandesCertification?.map(c => c.id_segment).filter(Boolean) ?? [])]
  const segIdsUniques = [...new Set(segIds)]
  const { data: segmentsCtx } = segIdsUniques.length > 0
    ? await supabaseAdmin.from('segments').select('id, segment_texte, segment_numero, id_oeuvre').in('id', segIdsUniques)
    : { data: [] }
  const segMap: Record<number, { texte: string; numero: number; id_oeuvre: string }> = {}
  segmentsCtx?.forEach(s => { segMap[s.id] = { texte: s.segment_texte, numero: s.segment_numero, id_oeuvre: s.id_oeuvre } })

  const idsVersetsCertif = [...new Set((demandesCertification?.map(c => c.id_verset).filter(Boolean) ?? []) as string[])]
  const { data: versetsCtx } = idsVersetsCertif.length > 0
    ? await supabaseAdmin.from('versets').select('id_verset, ref').in('id_verset', idsVersetsCertif)
    : { data: [] }
  const versetMap: Record<string, string> = {}
  versetsCtx?.forEach(v => { versetMap[v.id_verset] = v.ref })

  const { data: essaisRaw } = await supabaseAdmin.from('essais').select('id, titre, sous_titre, resume, categories, statut, created_at, user_id').eq('statut', 'en_attente').order('created_at', { ascending: false })
  const idsAuteursEssais = [...new Set((essaisRaw ?? []).map(e => e.user_id))]
  const { data: profilsEssais } = idsAuteursEssais.length > 0
    ? await supabaseAdmin.from('profils').select('id, pseudo').in('id', idsAuteursEssais)
    : { data: [] }
  const pseudoMap: Record<string, string> = {}
  profilsEssais?.forEach(p => { pseudoMap[p.id] = p.pseudo })
  const essaisEnAttente = (essaisRaw ?? []).map(e => ({ ...e, auteur_pseudo: pseudoMap[e.user_id] ?? null }))

  const { data: essaisModificationRaw } = await supabaseAdmin.from('essais').select('id, titre, sous_titre, resume, categories, statut, created_at, user_id').eq('statut', 'a_reviser').order('created_at', { ascending: false })
  const idsAuteursModification = [...new Set((essaisModificationRaw ?? []).map(e => e.user_id))]
  const { data: profilsModification } = idsAuteursModification.length > 0
    ? await supabaseAdmin.from('profils').select('id, pseudo').in('id', idsAuteursModification)
    : { data: [] }
  const pseudoMapModification: Record<string, string> = {}
  profilsModification?.forEach(p => { pseudoMapModification[p.id] = p.pseudo })
  const essaisModification = (essaisModificationRaw ?? []).map(e => ({ ...e, auteur_pseudo: pseudoMapModification[e.user_id] ?? null }))

  const { data: essaisPubliesRaw } = await supabaseAdmin.from('essais').select('id, titre, sous_titre, created_at, user_id, afficher_nom_reel').eq('statut', 'publie').order('titre', { ascending: true })
  const idsAuteursPublies = [...new Set((essaisPubliesRaw ?? []).map(e => e.user_id))]
  const { data: profilsPublies } = idsAuteursPublies.length > 0
    ? await supabaseAdmin.from('profils').select('id, pseudo, nom, prenom').in('id', idsAuteursPublies)
    : { data: [] }
  const profilMapPublies: Record<string, { pseudo: string | null; nom: string | null; prenom: string | null }> = {}
  profilsPublies?.forEach(p => { profilMapPublies[p.id] = p })
  const essaisPublies = (essaisPubliesRaw ?? []).map(e => {
    const p = profilMapPublies[e.user_id]
    const auteur = (e.afficher_nom_reel && p?.nom) ? `${p.prenom ? p.prenom + ' ' : ''}${p.nom}` : (p?.pseudo ?? 'Anonyme')
    return { id: e.id, titre: e.titre, sous_titre: e.sous_titre, auteur, created_at: e.created_at }
  })

  // Bibliothèque
  const { data: auteursData } = await supabaseAdmin.from('auteurs').select('id_auteur, nom, dates, siecle, tradition, note, aire_geographique, langue_principale, oeuvres(id_oeuvre, titre, sous_titre, titre_original, trad_auteur, trad_date, editeur, collection, ville, date_publication, url_source, genre, langue, profondeur_sommaire, nb_signes, niveaux_sommaire, niveaux_corps, texte_sommaire, texte_corps, afficher_numeros)').order('siecle', { ascending: true, nullsFirst: false })
  const auteurs = (auteursData ?? [])

  // Traductions
  const { data: traductions } = await supabaseAdmin.from('traductions').select('*').order('ordre', { ascending: true })

  return (
    <AdminClient
      commentaires={commentaires ?? []}
      signalements={signalements ?? []}
      demandesCertification={demandesCertification ?? []}
      essaisEnAttente={essaisEnAttente}
      essaisModification={essaisModification}
      essaisPublies={essaisPublies}
      versetMap={versetMap}
      segMap={segMap}
      auteurs={auteurs}
      traductions={traductions ?? []}
      actionDeconnexion={actionDeconnexion}
      actionValider={actionValiderCommentaire}
      actionSupprimerCommentaire={actionSupprimerCommentaire}
      actionMarquerTraite={actionMarquerTraite}
      actionSupprimerSignalement={actionSupprimerSignalement}
      actionCertifier={actionCertifierCommentaire}
      actionRetirerDemandeCertification={actionRetirerDemandeCertification}
      actionPublierEssai={actionPublierEssai}
      actionRenvoyerBrouillonEssai={actionRenvoyerBrouillonEssai}
    />
  )
}
