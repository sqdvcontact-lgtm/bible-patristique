import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { creerSupabaseServeur } from '@/app/lib/supabaseServeur'
import { estAdmin } from '@/app/lib/verifAdmin'
import AdminClient from './AdminClient'
import { ENCRE_TITRE_CARTE, GRAISSE_TITRE, TITRE_CARTE } from '@/app/lib/hierarchieTitres'

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
    message_admin: 'Votre commentaire a été validé par la modération.',
    message_admin_at: new Date().toISOString(),
  }).eq('id', id)
}
async function actionSupprimerCommentaire(id: number) {
  'use server'
  if (!(await estAdmin())) return
  await supabaseAdmin.from('commentaires').delete().eq('id', id)
}
async function actionValiderCommentaireEssai(id: number) {
  'use server'
  if (!(await estAdmin())) return
  await supabaseAdmin.from('essais_commentaires').update({ valide: true }).eq('id', id)
}
async function actionSupprimerCommentaireEssai(id: number) {
  'use server'
  if (!(await estAdmin())) return
  await supabaseAdmin.from('essais_commentaires').delete().eq('id', id)
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
    message_admin: 'Merci pour votre signalement. Il a été transmis à la modération et marqué comme traité.',
    message_admin_at: new Date().toISOString(),
  }).eq('id', id)
}
async function actionMarquerTraiteSilencieux(id: number | string) {
  'use server'
  if (!(await estAdmin())) return
  if (String(id).startsWith('quiz_')) {
    await supabaseAdmin.from('quiz_signalements').update({ traite: true }).eq('id', String(id).replace(/^quiz_/, ''))
    return
  }
  // « Traité » sans remercier : on ne pose pas de message_admin destiné à l'utilisateur.
  await supabaseAdmin.from('signalements').update({ traite: true }).eq('id', id)
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
    message_admin: 'Votre commentaire a été validé et certifié par la modération.',
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
    message_admin: 'Votre commentaire a été validé par la modération, mais la demande de certification n’a pas été retenue.',
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

export const metadata = { title: 'Administration' }

export default async function AdminPage() {
  const autorise = await estAdmin()

  if (!autorise) {
    return (
      <main style={{ minHeight: 'calc(100vh - 3.5rem)', background: 'var(--cs-fond)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: 'var(--cs-surface)', border: '1px solid var(--cs-bord)', borderRadius: '8px', padding: '36px 40px', width: '21.25rem', textAlign: 'center' }}>
          <h1 style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: TITRE_CARTE, fontWeight: GRAISSE_TITRE, color: ENCRE_TITRE_CARTE, marginBottom: '6px' }}>Administration</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--cs-texte-doux)', marginBottom: '20px' }}>Corpus Scriptura</p>
          <p style={{ fontSize: '0.875rem', color: 'var(--cs-texte-second)', lineHeight: 1.6, marginBottom: '22px' }}>
            Cette page est réservée au compte administrateur. Connectez-vous avec ce compte pour y accéder.
          </p>
          <a href="/chantier" style={{ display: 'inline-block', padding: '9px 20px', fontSize: '0.9375rem', fontWeight: 500, background: 'var(--cs-vert-aplat)', color: 'var(--cs-sur-aplat)', borderRadius: '8px', textDecoration: 'none' }}>
            Se connecter
          </a>
        </div>
      </main>
    )
  }

  // ── Vague 1 : 12 requêtes indépendantes en parallèle ─────────────────────
  const vague1 = await Promise.all([
    supabaseAdmin.from('commentaires').select('id, texte, auteur_nom, auteur_mail, valide, created_at, id_segment, id_verset, user_id, reponse_a').eq('valide', false).or('demande_validation.is.null,demande_validation.eq.false').order('created_at', { ascending: false }),
    supabaseAdmin.from('signalements').select('id, message, traite, created_at, id_segment, id_verset, user_id, importance, url_source').eq('traite', false).order('created_at', { ascending: false }),
    supabaseAdmin.from('quiz_signalements').select('id, raison, commentaire, created_at, id_verset, user_id').eq('traite', false).order('created_at', { ascending: false }).limit(200),
    supabaseAdmin.from('commentaires').select('id, texte, auteur_nom, auteur_mail, valide, created_at, id_segment, id_verset, user_id, demande_validation, certifie, reponse_a').eq('demande_validation', true).order('created_at', { ascending: false }),
    supabaseAdmin.from('essais').select('id, titre, sous_titre, resume, categories, statut, created_at, updated_at, publie_at, user_id').eq('statut', 'en_attente').order('created_at', { ascending: false }),
    supabaseAdmin.from('essais').select('id, titre, sous_titre, resume, categories, statut, created_at, updated_at, publie_at, user_id').eq('statut', 'a_reviser').order('created_at', { ascending: false }),
    supabaseAdmin.from('essais').select('id, titre, sous_titre, contenu, created_at, updated_at, publie_at, user_id, afficher_nom_reel, statut, nb_vues').eq('statut', 'publie').order('publie_at', { ascending: false, nullsFirst: false }),
    supabaseAdmin.from('essais').select('id, titre, sous_titre, contenu, created_at, updated_at, publie_at, user_id, afficher_nom_reel, statut, nb_vues').eq('statut', 'brouillon').order('updated_at', { ascending: false, nullsFirst: false }),
    supabaseAdmin.from('signalements').select('message'),
    supabaseAdmin.from('auteurs').select('id_auteur, nom, nom_original, titre, dates, date_naissance, date_mort, siecle, traditions, note_biographique, note_theologique, langue_principale, chronologie, anecdotes, influence, photo_position, oeuvres!oeuvres_id_auteur_fkey(id_oeuvre, titre, titre_affichage, sous_titre, titre_original, trad_auteur, editeur, collection, ville, date_publication, date_composition, url_source, genre, genres, profondeur_sommaire, nb_signes, niveaux_sommaire, niveaux_corps, texte_sommaire, texte_corps, afficher_numeros, acces_public, acces_public_note, commentaire_traduction, note_editoriale_complete, note_editoriale_complement, note_editoriale_titre)').order('siecle', { ascending: true, nullsFirst: false }),
    supabaseAdmin.from('traductions').select('*').order('ordre', { ascending: true }),
    supabaseAdmin.rpc('count_verifications_pending'),
    supabaseAdmin.from('essais_commentaires').select('id, id_essai, texte, auteur_nom, created_at, user_id').eq('valide', false).eq('supprime', false).order('created_at', { ascending: false }),
    // Commentaires privés des œuvres : table à part, sans droit de lecture pour
    // anon ni authenticated — elle ne s'atteint donc que par la clé de service.
    supabaseAdmin.from('oeuvres_commentaires_prives').select('id_oeuvre, commentaire'),
  ])
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
    { data: nbVerifRaw },
    { data: commentairesPublicationsRaw },
    { data: commentairesPrivesOeuvres },
  ] = vague1
  const nbVerifications = (nbVerifRaw as number | null) ?? 0

  // Signalements : fallback si la colonne id_verset manque
  let signalements = signResult.data
  if (signResult.error) {
    const fallback = await supabaseAdmin.from('signalements').select('id, message, traite, created_at, id_segment, user_id').eq('traite', false).order('created_at', { ascending: false })
    signalements = (fallback.data ?? []).map(s => ({ ...s, id_verset: null, importance: null, url_source: null }))
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
    ...((commentaires?.map(c => c.id_verset).filter(Boolean) ?? []) as string[]),
    ...((demandesCertification?.map(c => c.id_verset).filter(Boolean) ?? []) as string[]),
    ...((signalements?.map(s => s.id_verset).filter(Boolean) ?? []) as string[]),
  ])]
  // Messages parents des commentaires qui sont des réponses (pour les afficher en contexte).
  const idsParents = [...new Set([
    ...((commentaires?.map(c => (c as any).reponse_a).filter(Boolean) ?? []) as number[]),
    ...((demandesCertification?.map(c => (c as any).reponse_a).filter(Boolean) ?? []) as number[]),
  ])]
  const idsAuteursEssais = [...new Set(essaisValidationRaw.map(e => e.user_id))]
  const idsAuteursModification = [...new Set(essaisModificationRaw.map(e => e.user_id))]
  const idsEssaisListes = essaisListesRaw.map(e => e.id)
  const idsAuteursPublies = [...new Set(essaisListesRaw.map(e => e.user_id))]
  const idsAuteursSignalements = [...new Set(tousSignalements.map(s => s.user_id).filter(Boolean) as string[])]
  const idsEssaisCommentes = [...new Set((commentairesPublicationsRaw ?? []).map(c => c.id_essai).filter(Boolean) as number[])]

  // ── Vague 2 : 7 requêtes dépendantes en parallèle ────────────────────────
  const vague2 = await Promise.all([
    segIdsUniques.length > 0 ? supabaseAdmin.from('segments').select('id, segment_texte, segment_numero, id_oeuvre, id_texte').in('id', segIdsUniques) : Promise.resolve({ data: [] as any[], error: null }),
    idsVersetsCertif.length > 0 ? supabaseAdmin.from('versets_lecture').select('id_verset, ref, TR0001').in('id_verset', idsVersetsCertif) : Promise.resolve({ data: [] as any[], error: null }),
    idsAuteursEssais.length > 0 ? supabaseAdmin.from('profils').select('id, pseudo').in('id', idsAuteursEssais) : Promise.resolve({ data: [] as any[], error: null }),
    idsAuteursModification.length > 0 ? supabaseAdmin.from('profils').select('id, pseudo').in('id', idsAuteursModification) : Promise.resolve({ data: [] as any[], error: null }),
    idsEssaisListes.length > 0 ? supabaseAdmin.from('essais_appreciations').select('id_essai').in('id_essai', idsEssaisListes) : Promise.resolve({ data: [] as any[], error: null }),
    idsEssaisListes.length > 0 ? supabaseAdmin.from('essais_commentaires').select('id_essai').in('id_essai', idsEssaisListes) : Promise.resolve({ data: [] as any[], error: null }),
    idsAuteursPublies.length > 0 ? supabaseAdmin.from('profils').select('id, pseudo, nom, prenom').in('id', idsAuteursPublies) : Promise.resolve({ data: [] as any[], error: null }),
    idsAuteursSignalements.length > 0 ? supabaseAdmin.from('profils').select('id, pseudo').in('id', idsAuteursSignalements) : Promise.resolve({ data: [] as any[], error: null }),
    idsEssaisCommentes.length > 0 ? supabaseAdmin.from('essais').select('id, titre').in('id', idsEssaisCommentes) : Promise.resolve({ data: [] as any[], error: null }),
    idsParents.length > 0 ? supabaseAdmin.from('commentaires').select('id, auteur_nom, texte').in('id', idsParents) : Promise.resolve({ data: [] as any[], error: null }),
  ])
  const [
    { data: segmentsCtx },
    { data: versetsCtx },
    { data: profilsEssais },
    { data: profilsModification },
    { data: appreciationsEssais },
    { data: commentairesEssais },
    { data: profilsPublies },
    { data: profilsSignalements },
    { data: titresEssaisCommentes },
    { data: commentairesParents },
  ] = vague2

  // Un chargement a-t-il VRAIMENT échoué ? On écarte deux cas connus et non
  // « rechargeables » : le fallback des signalements (index 1, colonne id_verset
  // parfois absente, déjà rattrapé) et une table structurellement absente
  // (PGRST205 — p. ex. quiz_signalements, dont le code gère déjà l'absence).
  const erreurReelle = (r: unknown) => {
    const e = (r as { error?: { code?: string } }).error
    return Boolean(e) && e?.code !== 'PGRST205'
  }
  const erreurChargement =
    vague1.some((r, i) => i !== 1 && erreurReelle(r)) ||
    vague2.some(r => erreurReelle(r))

  // ── Traitement ─────────────────────────────────────────────────────────────
  const segMap: Record<number, { texte: string; numero: number; id_oeuvre: string; id_texte: string }> = {}
  segmentsCtx?.forEach(s => { segMap[s.id] = { texte: s.segment_texte, numero: s.segment_numero, id_oeuvre: s.id_oeuvre, id_texte: s.id_texte } })

  const versetMap: Record<string, string> = {}
  const versetTexteMap: Record<string, string> = {}
  versetsCtx?.forEach(v => { versetMap[v.id_verset] = v.ref; if ((v as any).TR0001) versetTexteMap[v.id_verset] = (v as any).TR0001 })

  // Nom de l'œuvre pour un segment (« Auteur — Titre »), et pseudo de l'auteur d'un signalement.
  const oeuvreTitreMap: Record<string, string> = {}
  ;(auteursData ?? []).forEach((a: any) => (a.oeuvres ?? []).forEach((o: any) => { oeuvreTitreMap[o.id_oeuvre] = `${a.nom} — ${o.titre}` }))
  const signalementAuteurMap: Record<string, string> = {}
  ;(profilsSignalements ?? []).forEach((p: any) => { if (p.pseudo) signalementAuteurMap[p.id] = p.pseudo })
  const commentaireParentMap: Record<number, { auteur_nom: string; texte: string }> = {}
  ;(commentairesParents ?? []).forEach((c: any) => { commentaireParentMap[c.id] = { auteur_nom: c.auteur_nom ?? 'Anonyme', texte: c.texte ?? '' } })

  // Commentaires de publications (essais) en attente de modération.
  const titreEssaiMap: Record<number, string> = {}
  ;(titresEssaisCommentes ?? []).forEach((e: any) => { titreEssaiMap[e.id] = e.titre })
  const commentairesPublications = (commentairesPublicationsRaw ?? []).map((c: any) => ({
    id: c.id, id_essai: c.id_essai, texte: c.texte, auteur_nom: c.auteur_nom ?? 'Anonyme',
    created_at: c.created_at, user_id: c.user_id ?? null,
    titre_essai: titreEssaiMap[c.id_essai] ?? `Publication ${c.id_essai}`,
  }))

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
  // Le commentaire privé rejoint son œuvre : le formulaire de modification le
  // présente sous le commentaire public, mais il vient d'une autre table.
  const commentairePriveParOeuvre = new Map(
    (commentairesPrivesOeuvres ?? []).map(c => [c.id_oeuvre, c.commentaire])
  )
  const auteurs = (auteursData ?? []).map(a => ({
    ...a,
    oeuvres: (a.oeuvres ?? []).map(o => ({
      ...o,
      commentaire_prive: commentairePriveParOeuvre.get(o.id_oeuvre) ?? null,
    })),
  }))

  return (
    <AdminClient
      commentaires={commentaires ?? []}
      commentairesPublications={commentairesPublications}
      signalements={tousSignalements}
      demandesCertification={demandesCertification ?? []}
      essaisEnAttente={essaisEnAttente}
      essaisModification={essaisModification}
      essaisPublies={essaisPublies}
      essaisBrouillons={essaisBrouillons}
      versetMap={versetMap}
      versetTexteMap={versetTexteMap}
      segMap={segMap}
      oeuvreTitreMap={oeuvreTitreMap}
      signalementAuteurMap={signalementAuteurMap}
      commentaireParentMap={commentaireParentMap}
      auteurs={auteurs}
      traductions={traductions ?? []}
      nbVerifications={nbVerifications ?? 0}
      erreurChargement={erreurChargement}
      actionDeconnexion={actionDeconnexion}
      actionValider={actionValiderCommentaire}
      actionSupprimerCommentaire={actionSupprimerCommentaire}
      actionValiderCommentaireEssai={actionValiderCommentaireEssai}
      actionSupprimerCommentaireEssai={actionSupprimerCommentaireEssai}
      actionMarquerTraite={actionMarquerTraite}
      actionMarquerTraiteSilencieux={actionMarquerTraiteSilencieux}
      actionSupprimerSignalement={actionSupprimerSignalement}
      actionCertifier={actionCertifierCommentaire}
      actionRetirerDemandeCertification={actionRetirerDemandeCertification}
      actionPublierEssai={actionPublierEssai}
      actionRenvoyerBrouillonEssai={actionRenvoyerBrouillonEssai}
    />
  )
}
