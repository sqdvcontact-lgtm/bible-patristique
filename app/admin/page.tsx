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
  await supabaseAdmin.from('commentaires').update({
    valide: true,
    message_admin: 'Votre commentaire a ete valide par la moderation.',
    message_admin_at: new Date().toISOString(),
  }).eq('id', id)
}
async function actionSupprimerCommentaire(id: number) {
  'use server'
  if (!(await estAdmin())) return
  await supabaseAdmin.from('commentaires').delete().eq('id', id)
}
async function actionMarquerTraite(id: number | string) {
  'use server'
  if (!(await estAdmin())) return
  if (String(id).startsWith('quiz_')) {
    await supabaseAdmin.from('quiz_signalements').update({ traite: true }).eq('id', String(id).replace(/^quiz_/, ''))
    return
  }
  await supabaseAdmin.from('signalements').update({
    traite: true,
    message_admin: 'Merci pour votre signalement. Il a ete transmis a la moderation et marque comme traite.',
    message_admin_at: new Date().toISOString(),
  }).eq('id', id)
}
async function actionSupprimerSignalement(id: number | string) {
  'use server'
  if (!(await estAdmin())) return
  if (String(id).startsWith('quiz_')) {
    await supabaseAdmin.from('quiz_signalements').delete().eq('id', String(id).replace(/^quiz_/, ''))
    return
  }
  await supabaseAdmin.from('signalements').delete().eq('id', id)
}
async function actionCertifierCommentaire(id: number) {
  'use server'
  if (!(await estAdmin())) return
  await supabaseAdmin.from('commentaires').update({
    certifie: true,
    valide: true,
    demande_validation: false,
    message_admin: 'Votre commentaire a ete valide et certifie par la moderation.',
    message_admin_at: new Date().toISOString(),
  }).eq('id', id)
}
async function actionRetirerDemandeCertification(id: number) {
  'use server'
  if (!(await estAdmin())) return
  await supabaseAdmin.from('commentaires').update({
    certifie: false,
    valide: true,
    demande_validation: false,
    message_admin: 'Votre commentaire a ete valide par la moderation, mais la demande de certification n a pas ete retenue.',
    message_admin_at: new Date().toISOString(),
  }).eq('id', id)
}
async function actionPublierEssai(id: number) {
  'use server'
  if (!(await estAdmin())) return
  const { data: actuel } = await supabaseAdmin.from('essais').select('publie_at').eq('id', id).single()
  const payload: any = { statut: 'publie', note_admin: null, updated_at: new Date().toISOString() }
  if (!actuel?.publie_at) payload.publie_at = new Date().toISOString()
  await supabaseAdmin.from('essais').update(payload).eq('id', id)
}
async function actionRenvoyerBrouillonEssai(id: number, note: string, refus = false) {
  'use server'
  if (!(await estAdmin())) return
  await supabaseAdmin.from('essais').update({
    statut: 'brouillon',
    note_admin: note || (refus
      ? 'Votre publication a été refusée par la modération.'
      : 'Votre publication a été renvoyée en brouillon par la modération.'),
    updated_at: new Date().toISOString(),
  }).eq('id', id)
}

function compterSignes(contenu: string | null | undefined): number {
  return (contenu ?? '').replace(/\s+/g, ' ').trim().length
}

function compteSignalementsEssai(id: number, signalementsEssais: { message: string | null }[]): number {
  const motifs = [`essai ${id}`, `essai #${id}`, `/essais/${id}`, `id ${id}`]
  return signalementsEssais.filter(s => {
    const message = (s.message ?? '').toLowerCase()
    return motifs.some(m => message.includes(m))
  }).length
}

export const metadata = { title: 'Administration — Corpus Scriptura' }

export default async function AdminPage() {
  const autorise = await estAdmin()

  if (!autorise) {
    return (
      <main style={{ minHeight: 'calc(100vh - 48px)', background: '#f7f4ef', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: '#fff', border: '1px solid #d6d0c4', borderRadius: '10px', padding: '36px 40px', width: '340px', textAlign: 'center' }}>
          <h1 style={{ fontFamily: "Georgia, serif", fontSize: '20px', fontWeight: 'normal', color: '#2a3d30', marginBottom: '6px' }}>Administration</h1>
          <p style={{ fontSize: '12px', color: '#9a958d', marginBottom: '20px' }}>Corpus Scriptura</p>
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

  // ── Vague 1 : 12 requêtes indépendantes en parallèle ─────────────────────
  const [
    { data: commentaires },
    signResult,
    quizResult,
    { data: demandesCertification },
    { data: essaisEnAttenteRaw },
    { data: essaisAReviserRaw },
    { data: essaisPubliesRaw },
    { data: essaisBrouillonsRaw },
    { data: signalementsEssais },
    { data: auteursData },
    { data: traductions },
    { count: nbVerifications },
  ] = await Promise.all([
    supabaseAdmin.from('commentaires').select('id, texte, auteur_nom, auteur_mail, valide, created_at, id_segment, id_verset, user_id').eq('valide', false).or('demande_validation.is.null,demande_validation.eq.false').order('created_at', { ascending: false }),
    supabaseAdmin.from('signalements').select('id, message, traite, created_at, id_segment, id_verset, user_id').eq('traite', false).order('created_at', { ascending: false }),
    supabaseAdmin.from('quiz_signalements').select('id, raison, commentaire, created_at, id_verset, user_id').eq('traite', false).order('created_at', { ascending: false }).limit(200),
    supabaseAdmin.from('commentaires').select('id, texte, auteur_nom, auteur_mail, valide, created_at, id_segment, id_verset, user_id, demande_validation, certifie').eq('demande_validation', true).order('created_at', { ascending: false }),
    supabaseAdmin.from('essais').select('id, titre, sous_titre, resume, categories, statut, created_at, updated_at, publie_at, user_id').eq('statut', 'en_attente').order('created_at', { ascending: false }),
    supabaseAdmin.from('essais').select('id, titre, sous_titre, resume, categories, statut, created_at, updated_at, publie_at, user_id').eq('statut', 'a_reviser').order('created_at', { ascending: false }),
    supabaseAdmin.from('essais').select('id, titre, sous_titre, contenu, created_at, updated_at, publie_at, user_id, afficher_nom_reel, statut, nb_vues').eq('statut', 'publie').order('publie_at', { ascending: false, nullsFirst: false }),
    supabaseAdmin.from('essais').select('id, titre, sous_titre, contenu, created_at, updated_at, publie_at, user_id, afficher_nom_reel, statut, nb_vues').eq('statut', 'brouillon').order('updated_at', { ascending: false, nullsFirst: false }),
    supabaseAdmin.from('signalements').select('message'),
    supabaseAdmin.from('auteurs').select('id_auteur, nom, nom_original, titre, dates, date_naissance, date_mort, siecle, traditions, note_biographique, note_theologique, langue_principale, oeuvres(id_oeuvre, titre, sous_titre, titre_original, trad_auteur, editeur, collection, ville, date_publication, date_composition, url_source, genre, genres, langue, profondeur_sommaire, nb_signes, niveaux_sommaire, niveaux_corps, texte_sommaire, texte_corps, afficher_numeros)').order('siecle', { ascending: true, nullsFirst: false }),
    supabaseAdmin.from('traductions').select('*').order('ordre', { ascending: true }),
    supabaseAdmin.from('segments').select('id', { count: 'exact', head: true }).eq('fiabilite', 'probable'),
  ])

  // Signalements : fallback si la colonne id_verset manque
  let signalements = signResult.data
  if (signResult.error) {
    const fallback = await supabaseAdmin.from('signalements').select('id, message, traite, created_at, id_segment, user_id').eq('traite', false).order('created_at', { ascending: false })
    signalements = (fallback.data ?? []).map(s => ({ ...s, id_verset: null }))
  }
  const quizMapped = ((quizResult.data) ?? []).map((s: any) => ({
    id: `quiz_${s.id}`,
    message: [s.raison, s.commentaire].filter(Boolean).join(' — '),
    traite: false,
    created_at: s.created_at,
    id_segment: null,
    id_verset: s.id_verset ?? null,
    user_id: s.user_id ?? null,
    source: 'quiz_signalements' as const,
  }))
  const tousSignalements = [...(signalements ?? []).map(s => ({ ...s, source: 'signalements' as const })), ...quizMapped]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

  // Calcul des IDs dépendants
  const essaisValidationRaw = (essaisEnAttenteRaw ?? []).filter(e => !e.publie_at)
  const essaisModificationDepuisPublieRaw = (essaisEnAttenteRaw ?? []).filter(e => !!e.publie_at)
  const essaisModificationRaw = [...essaisModificationDepuisPublieRaw, ...(essaisAReviserRaw ?? [])]
  const essaisListesRaw = [...(essaisPubliesRaw ?? []), ...(essaisBrouillonsRaw ?? [])]

  const segIds = [
    ...(commentaires?.map(c => c.id_segment).filter(Boolean) ?? []),
    ...(signalements?.map(s => s.id_segment).filter(Boolean) ?? []),
    ...(demandesCertification?.map(c => c.id_segment).filter(Boolean) ?? []),
  ]
  const segIdsUniques = [...new Set(segIds)]
  const idsVersetsCertif = [...new Set([
    ...((demandesCertification?.map(c => c.id_verset).filter(Boolean) ?? []) as string[]),
    ...((signalements?.map(s => s.id_verset).filter(Boolean) ?? []) as string[]),
  ])]
  const idsAuteursEssais = [...new Set(essaisValidationRaw.map(e => e.user_id))]
  const idsAuteursModification = [...new Set(essaisModificationRaw.map(e => e.user_id))]
  const idsEssaisListes = essaisListesRaw.map(e => e.id)
  const idsAuteursPublies = [...new Set(essaisListesRaw.map(e => e.user_id))]

  // ── Vague 2 : 7 requêtes dépendantes en parallèle ────────────────────────
  const [
    { data: segmentsCtx },
    { data: versetsCtx },
    { data: profilsEssais },
    { data: profilsModification },
    { data: appreciationsEssais },
    { data: commentairesEssais },
    { data: profilsPublies },
  ] = await Promise.all([
    segIdsUniques.length > 0 ? supabaseAdmin.from('segments').select('id, segment_texte, segment_numero, id_oeuvre').in('id', segIdsUniques) : Promise.resolve({ data: [] as any[], error: null }),
    idsVersetsCertif.length > 0 ? supabaseAdmin.from('versets').select('id_verset, ref').in('id_verset', idsVersetsCertif) : Promise.resolve({ data: [] as any[], error: null }),
    idsAuteursEssais.length > 0 ? supabaseAdmin.from('profils').select('id, pseudo').in('id', idsAuteursEssais) : Promise.resolve({ data: [] as any[], error: null }),
    idsAuteursModification.length > 0 ? supabaseAdmin.from('profils').select('id, pseudo').in('id', idsAuteursModification) : Promise.resolve({ data: [] as any[], error: null }),
    idsEssaisListes.length > 0 ? supabaseAdmin.from('essais_appreciations').select('id_essai').in('id_essai', idsEssaisListes) : Promise.resolve({ data: [] as any[], error: null }),
    idsEssaisListes.length > 0 ? supabaseAdmin.from('essais_commentaires').select('id_essai').in('id_essai', idsEssaisListes) : Promise.resolve({ data: [] as any[], error: null }),
    idsAuteursPublies.length > 0 ? supabaseAdmin.from('profils').select('id, pseudo, nom, prenom').in('id', idsAuteursPublies) : Promise.resolve({ data: [] as any[], error: null }),
  ])

  // ── Traitement ─────────────────────────────────────────────────────────────
  const segMap: Record<number, { texte: string; numero: number; id_oeuvre: string }> = {}
  segmentsCtx?.forEach(s => { segMap[s.id] = { texte: s.segment_texte, numero: s.segment_numero, id_oeuvre: s.id_oeuvre } })

  const versetMap: Record<string, string> = {}
  versetsCtx?.forEach(v => { versetMap[v.id_verset] = v.ref })

  const pseudoMap: Record<string, string> = {}
  profilsEssais?.forEach(p => { pseudoMap[p.id] = p.pseudo })
  const essaisEnAttente = essaisValidationRaw.map(e => ({ ...e, auteur_pseudo: pseudoMap[e.user_id] ?? null }))

  const pseudoMapModification: Record<string, string> = {}
  profilsModification?.forEach(p => { pseudoMapModification[p.id] = p.pseudo })
  const essaisModification = essaisModificationRaw.map(e => ({ ...e, auteur_pseudo: pseudoMapModification[e.user_id] ?? null }))

  const likesParEssai = new Map<number, number>()
  ;(appreciationsEssais ?? []).forEach((a: any) => likesParEssai.set(a.id_essai, (likesParEssai.get(a.id_essai) ?? 0) + 1))
  const commentairesParEssai = new Map<number, number>()
  ;(commentairesEssais ?? []).forEach((c: any) => commentairesParEssai.set(c.id_essai, (commentairesParEssai.get(c.id_essai) ?? 0) + 1))
  const profilMapPublies: Record<string, { pseudo: string | null; nom: string | null; prenom: string | null }> = {}
  profilsPublies?.forEach(p => { profilMapPublies[p.id] = p })
  const resoudreEssaiListe = (e: any) => {
    const p = profilMapPublies[e.user_id]
    const auteur = (e.afficher_nom_reel && p?.nom) ? `${p.prenom ? p.prenom + ' ' : ''}${p.nom}` : (p?.pseudo ?? 'Anonyme')
    return {
      id: e.id, titre: e.titre, sous_titre: e.sous_titre, auteur,
      created_at: e.created_at, updated_at: e.updated_at ?? null, publie_at: e.publie_at ?? null,
      statut: e.statut, nb_vues: e.nb_vues ?? 0,
      nb_likes: likesParEssai.get(e.id) ?? 0,
      nb_commentaires: commentairesParEssai.get(e.id) ?? 0,
      nb_signes: compterSignes(e.contenu),
      nb_signalements: compteSignalementsEssai(e.id, signalementsEssais ?? []),
    }
  }
  const essaisPublies = (essaisPubliesRaw ?? []).map(resoudreEssaiListe)
  const essaisBrouillons = (essaisBrouillonsRaw ?? []).map(resoudreEssaiListe)
  const auteurs = auteursData ?? []

  return (
    <AdminClient
      commentaires={commentaires ?? []}
      signalements={tousSignalements}
      demandesCertification={demandesCertification ?? []}
      essaisEnAttente={essaisEnAttente}
      essaisModification={essaisModification}
      essaisPublies={essaisPublies}
      essaisBrouillons={essaisBrouillons}
      versetMap={versetMap}
      segMap={segMap}
      auteurs={auteurs}
      traductions={traductions ?? []}
      nbVerifications={nbVerifications ?? 0}
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
