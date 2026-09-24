'use client'

// ── L'ONGLET « DISCUSSION » DU VOLET DES PÈRES ─────────────────────────────────
//
// Les commentaires des LECTEURS sur un verset, sortis de `PanneauPatristique` (2026-09-22)
// et chargés à la demande (`next/dynamic`), comme l'inventaire des notes : un lecteur qui
// n'ouvre pas l'onglet n'en paie pas le poids. Le volet le monte avec `key={id_verset}` :
// changer de verset repart d'un onglet neuf, réponse visée comprise.

import { useCallback, useEffect, useState } from 'react'
import LireQuandMeme, { FEUILLE_COMMENTAIRE_RETRACTE } from '@/app/components/LireQuandMeme'
import { MotAttente } from '@/app/lib/attenteEnCreux'
import { supabase } from '@/app/lib/supabase'
import { rendreTexteEnrichi } from '@/app/oeuvre/[id]/texteEnrichi'
import IconeSignalement from '@/app/components/IconeSignalement'
import IconeCroix from '@/app/components/IconeCroix'
import { calculerRang, couleurRang } from '@/app/lib/classement'
import EditeurCommentaire from '@/app/components/EditeurCommentaire'
import ModalSignalement from '@/app/components/ModalSignalement'
import { useCompte } from '@/app/lib/contexteCompte'
import InvitationCompteInline from '@/app/components/InvitationCompteInline'
import MarqueMecene from '@/app/components/MarqueMecene'
import FleuronDiscret from '@/app/components/FleuronDiscret'
import EtatVideVolet, { MentionVide } from '@/app/components/EtatVideVolet'
import BoutonSupprimerCommentaire from '@/app/components/BoutonSupprimerCommentaire'
import { carteCommentaire, ENTETE_COMMENTAIRE, NOM_COMMENTAIRE, DATE_COMMENTAIRE, BADGE_RANG, BADGE_ETAT, TEXTE_COMMENTAIRE, PIED_COMMENTAIRE, ACTION_COMMENTAIRE, EFFACE_COMMENTAIRE, formeCommentaire } from '@/app/lib/styleCommentaire'
import { TEXTE_ERREUR } from '@/app/lib/texteErreur'

type Verset = { id_verset: string }

// Pas plus de 5 majuscules consécutives (accentuées comprises).
const REGEX_CAPS_ABUSIVES = /[A-ZÀÂÄÉÈÊËÏÎÔÖÙÛÜŸÇ]{6,}/

const COLONNES = 'id, texte, auteur_nom, created_at, user_id, valide, reponse_a, demande_validation, certifie, supprime'

type LigneCommentaire = {
  id: number; texte: string; auteur_nom: string; created_at: string
  user_id: string | null; valide: boolean; reponse_a: number | null
  demande_validation: boolean; certifie?: boolean | null; supprime: boolean
}
type Commentaire = LigneCommentaire & {
  pseudo: string | null
  lecture: { nb_auteurs: number; total_auteurs: number } | null
  mecene: boolean; nbLikes: number; nbDislikes: number; monVote: 1 | -1 | null
}

/** Le message d'un envoi refusé. ⛔ Jamais le message brut de Postgres : seul le lexique
 *  (ZL001) écrit le sien pour être lu ; tout le reste se dit en français sobre, comme dans
 *  l'onglet de la page d'une œuvre. */
function motifDuRefus(error: { code?: string; message?: string } | null): string {
  if (error?.code === 'ZL001' && error.message) return error.message
  return 'Le commentaire n’a pas pu être enregistré. Réessayez.'
}

// ⛔ 24 PX DE CIBLE, LE DESSIN INCHANGÉ : le rembourrage s'étend et une marge négative de
// même valeur le rend, si bien que le pouce et son chiffre ne bougent pas d'un pixel.
const CIBLE_VOTE: React.CSSProperties = {
  display:'flex', alignItems:'center', gap:'3px', background:'transparent', border:'none', cursor:'pointer',
  padding:'6px', margin:'-6px', minHeight:'24px', minWidth:'24px', boxSizing:'border-box',
}

export default function OngletCommentaires({ verset, userId, isAdmin, onCount }: {
  verset: Verset; userId: string | null; isAdmin: boolean; onCount?: (n: number) => void
}) {
  const [commentaires, setCommentaires] = useState<Commentaire[]>([])
  const [loading, setLoading] = useState(true)
  // ⛔ UN ÉCHEC NE SE REND PAS « AUCUN COMMENTAIRE » : il se dit, avec de quoi réessayer.
  const [erreurChargement, setErreurChargement] = useState(false)
  const [tentative, setTentative] = useState(0)
  const [texte, setTexte] = useState('')
  const [nom, setNom] = useState('')
  const [mail, setMail] = useState('')
  const [demandeValidation, setDemandeValidation] = useState(false)
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState('')
  // ⛔ UN ENVOI RÉUSSI SE DIT (2026-09-22) : rien ne répondait au lecteur, et son
  // commentaire paraissait replié sous la bande rouge « Commentaire en attente de
  // contrôle » — on lisait un refus là où il n'y avait qu'une relecture à venir.
  const [envoye, setEnvoye] = useState(false)
  const [revelees, setRevelees] = useState<Set<number>>(new Set())
  const [cibleReponse, setCibleReponse] = useState<Commentaire | null>(null)
  const [commentaireSignale, setCommentaireSignale] = useState<Commentaire | null>(null)
  const { aUnCompte, exigerCompte, pseudo: pseudoMoi, estMecene } = useCompte()
  const idVerset = verset.id_verset

  // ⛔ UNE RÉPONSE TARDIVE NE S'AFFICHE PAS : le drapeau `annule` jette ce qui revient
  // après un changement de verset ou de compte.
  useEffect(() => {
    let annule = false
    ;(async () => {
      setLoading(true); setErreurChargement(false)
      try {
        const { data, error } = await supabase.from('commentaires').select(COLONNES)
          .eq('id_verset', idVerset).order('created_at', { ascending: true })
        if (error) throw error
        const base = (data ?? []) as LigneCommentaire[]
        const ids = base.map(c => c.id)
        const idsUtilisateurs = [...new Set(base.map(c => c.user_id).filter((id): id is string => !!id))]
        // ⛔ La marque de mécène se lit dans `mecenes_publics`, jamais dans `profils`.
        const [likesRes, classementRes, mecenesRes, mesVotesRes] = await Promise.all([
          // ⛔ LES VOTES D'AUTRUI NE SE LISENT PLUS (2026-09-22) : les TOTAUX viennent de
          // `totaux_votes_commentaires` (qui ne dit ni qui ni quoi), et l'on ne lit dans
          // `commentaires_likes` que SA PROPRE ligne. Voir la migration
          // `20260922155227_volet_peres_audit` (fonction) et `20260922164940_votes_prives_index_redondant` (politique).
          ids.length > 0 ? supabase.rpc('totaux_votes_commentaires', { p_ids: ids }) : Promise.resolve({ data: [], error: null }),
          idsUtilisateurs.length > 0 ? supabase.from('lecture_utilisateurs').select('user_id, pseudo, nb_auteurs, total_auteurs').in('user_id', idsUtilisateurs) : Promise.resolve({ data: [], error: null }),
          idsUtilisateurs.length > 0 ? supabase.from('mecenes_publics').select('user_id').in('user_id', idsUtilisateurs) : Promise.resolve({ data: [], error: null }),
          ids.length > 0 && userId ? supabase.from('commentaires_likes').select('id_commentaire, valeur').eq('user_id', userId).in('id_commentaire', ids) : Promise.resolve({ data: [], error: null }),
        ])
        // ⚠️ Votes, rangs et marques sont SECONDAIRES : une panne se consigne, et les
        // commentaires paraissent sans eux.
        for (const r of [likesRes, classementRes, mecenesRes, mesVotesRes]) if (r.error) console.error('[discussion] donnée secondaire indisponible :', r.error)
        if (annule) return
        type Classement = { user_id: string; pseudo: string | null; nb_auteurs: number; total_auteurs: number }
        const classementMap = new Map(((classementRes.data ?? []) as Classement[]).map(c => [c.user_id, c]))
        const mecenes = new Set(((mecenesRes.data ?? []) as { user_id: string }[]).map(m => m.user_id))
        const parCommentaire = new Map<number, { likes: number; dislikes: number; mon: 1 | -1 | null }>()
        for (const t of (likesRes.data ?? []) as { id_commentaire: number; likes: number; dislikes: number }[]) {
          parCommentaire.set(t.id_commentaire, { likes: t.likes, dislikes: t.dislikes, mon: null })
        }
        for (const v of (mesVotesRes.data ?? []) as { id_commentaire: number; valeur: 1 | -1 }[]) {
          const cur = parCommentaire.get(v.id_commentaire) ?? { likes: 0, dislikes: 0, mon: null }
          cur.mon = v.valeur
          parCommentaire.set(v.id_commentaire, cur)
        }
        setCommentaires(base.map(c => ({
          ...c,
          pseudo: c.user_id ? classementMap.get(c.user_id)?.pseudo ?? null : null,
          lecture: c.user_id ? classementMap.get(c.user_id) ?? null : null,
          mecene: !!c.user_id && mecenes.has(c.user_id),
          nbLikes: parCommentaire.get(c.id)?.likes ?? 0,
          nbDislikes: parCommentaire.get(c.id)?.dislikes ?? 0,
          monVote: parCommentaire.get(c.id)?.mon ?? null,
        })))
        setLoading(false)
      } catch (e) {
        if (annule) return
        console.error('[discussion] commentaires illisibles :', e)
        setErreurChargement(true); setLoading(false)
      }
    })()
    return () => { annule = true }
  }, [idVerset, userId, tentative])

  // Le compteur de l'onglet vit dans le volet ; on lui remonte le nombre de lignes, une
  // fois le chargement fini et réussi (jamais un « 0 » transitoire ni un 0 d'échec).
  useEffect(() => {
    if (!loading && !erreurChargement) onCount?.(commentaires.length)
  }, [commentaires, loading, erreurChargement, onCount])

  // Fil structuré : un seul niveau de réponses.
  const aDesReponses = (id: number) => commentaires.some(c => c.reponse_a === id)
  const commentaireVisible = (c: Commentaire) => !c.supprime || !!c.reponse_a || aDesReponses(c.id)
  const trierCommentaires = (liste: Commentaire[]) => [...liste]
    .filter(commentaireVisible)
    .sort((a, b) => {
      if (a.valide !== b.valide) return a.valide ? -1 : 1
      if (a.valide && b.valide && !!a.certifie !== !!b.certifie) return a.certifie ? -1 : 1
      if (a.valide && b.valide) {
        const scoreA = a.nbLikes - a.nbDislikes
        const scoreB = b.nbLikes - b.nbDislikes
        if (scoreA !== scoreB) return scoreB - scoreA
      }
      return +new Date(a.created_at) - +new Date(b.created_at)
    })
  const principaux = trierCommentaires(commentaires.filter(c => !c.reponse_a))
  const reponsesDe = (id: number) => trierCommentaires(commentaires.filter(c => c.reponse_a === id))
  const dateHeureCommentaire = (date: string) =>
    new Date(date).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  const avecTransition = (updater: (prev: Commentaire[]) => Commentaire[]) => {
    const doc = document as Document & { startViewTransition?: (callback: () => void) => void }
    if (doc.startViewTransition) doc.startViewTransition(() => setCommentaires(updater))
    else setCommentaires(updater)
  }

  const basculerVote = async (c: Commentaire, valeur: 1 | -1) => {
    if (!exigerCompte('réagir à un commentaire')) return
    if (!userId) return
    const retire = c.monVote === valeur
    const avant = { nbLikes: c.nbLikes, nbDislikes: c.nbDislikes, monVote: c.monVote }
    avecTransition(prev => prev.map(x => {
      if (x.id !== c.id) return x
      let { nbLikes, nbDislikes } = x
      if (x.monVote === 1) nbLikes--
      if (x.monVote === -1) nbDislikes--
      if (!retire) { if (valeur === 1) nbLikes++; else nbDislikes++ }
      return { ...x, nbLikes, nbDislikes, monVote: retire ? null : valeur }
    }))
    // L'upsert change un vote existant grâce à la politique UPDATE `likes_modification`
    // (migration 20260922164940_votes_prives_index_redondant) : une seule écriture, sans fenêtre où le vote disparaît.
    const { error } = retire
      ? await supabase.from('commentaires_likes').delete().eq('id_commentaire', c.id).eq('user_id', userId)
      : await supabase.from('commentaires_likes').upsert({ id_commentaire: c.id, user_id: userId, valeur }, { onConflict: 'id_commentaire,user_id' })
    // Un vote refusé se défait : l'écran ne montre pas ce que la base n'a pas.
    if (error) {
      console.error('[discussion] vote refusé :', error)
      setCommentaires(prev => prev.map(x => (x.id === c.id ? { ...x, ...avant } : x)))
    }
  }

  // ⛔ La route retire le commentaire ET SES RÉPONSES (elles revenaient sinon au premier
  // niveau, orphelines) ; la question le dit, et un refus se dit à l'écran.
  const supprimerCommentaire = async (c: Commentaire): Promise<boolean> => {
    const nbReponses = commentaires.filter(x => x.reponse_a === c.id).length
    const question = nbReponses === 0
      ? 'Supprimer définitivement ce commentaire\u202F?'
      : `Supprimer définitivement ce commentaire\u202F? ${nbReponses === 1 ? 'Sa réponse part' : `Ses ${nbReponses} réponses partent`} avec lui.`
    if (!confirm(question)) return true
    const { data: session } = await supabase.auth.getSession()
    const token = session.session?.access_token
    const res = await fetch('/api/admin/commentaire-supprimer', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id: c.id }),
    }).catch(() => null)
    if (res?.ok && !res.redirected) {
      setCommentaires(prev => prev.filter(x => x.id !== c.id && x.reponse_a !== c.id))
      return true
    }
    console.error('[discussion] suppression refusée :', res?.status ?? 'réseau')
    return false
  }

  // Suppression par son propre auteur : la ligne reste (fil des réponses préservé).
  // ⛔ LA QUESTION DIT CE QUI S'AFFICHERA (2026-09-22) : la carte ne porte pas la mention
  // « commentaire supprimé », elle écrit « X a supprimé un commentaire ». Et l'on dit ce
  // qu'il advient des réponses — ici elles RESTENT, à la différence d'une suppression par
  // la modération, qui les emporte.
  const supprimerMonCommentaire = async (c: Commentaire): Promise<boolean> => {
    const nom = c.pseudo ?? c.auteur_nom ?? 'Un utilisateur'
    const nbReponses = commentaires.filter(x => x.reponse_a === c.id).length
    const sortDesReponses = nbReponses === 0 ? ''
      : nbReponses === 1 ? ' Sa réponse restera.'
      : ` Ses ${nbReponses} réponses resteront.`
    if (!confirm(`Supprimer ce commentaire\u202F? À sa place, on lira « ${nom} a supprimé un commentaire ».${sortDesReponses}`)) return true
    const { error } = await supabase.from('commentaires').update({ supprime: true }).eq('id', c.id)
    if (!error) { setCommentaires(prev => prev.map(x => x.id === c.id ? { ...x, supprime: true } : x)); return true }
    console.error('[discussion] suppression refusée :', error)
    return false
  }

  const mailValide = (m: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m)

  const envoyer = async () => {
    setErreur(''); setEnvoye(false)
    if (!exigerCompte('commenter ce passage')) return
    if (!texte.trim()) { setErreur('Le commentaire est vide.'); return }
    if (REGEX_CAPS_ABUSIVES.test(texte)) { setErreur('Pas plus de cinq lettres capitales à la suite.'); return }
    if (!userId) {
      if (!nom.trim()) { setErreur('Le nom est requis.'); return }
      if (!mailValide(mail)) { setErreur('Adresse électronique invalide.'); return }
    }
    // ⚠️ Le `window.confirm` reste : le remplacer par une fenêtre du site demanderait un
    // composant de plus pour un geste rare, et la question n'y gagnerait rien.
    if (userId && demandeValidation && !window.confirm('Ce commentaire sera soumis à la modération pour certification\u00A0: s’il est retenu, il sera marqué « certifié » et placé en tête des commentaires validés. Continuer\u202F?')) {
      return
    }
    setEnvoi(true)
    const payload: Record<string, unknown> = { id_verset: idVerset, texte: texte.trim(), valide: false, reponse_a: cibleReponse?.id ?? null, demande_validation: demandeValidation }
    if (userId) { payload.user_id = userId; payload.auteur_nom = pseudoMoi ?? 'Utilisateur' }
    else { payload.auteur_nom = nom.trim(); payload.auteur_mail = mail.trim() }
    const { data, error } = await supabase.from('commentaires').insert(payload).select(COLONNES).single()
    setEnvoi(false)
    if (!error && data) {
      setCommentaires(prev => [...prev, { ...(data as LigneCommentaire), pseudo: userId ? pseudoMoi : null, lecture: null, mecene: !!userId && estMecene, nbLikes: 0, nbDislikes: 0, monVote: null }])
      setTexte(''); setNom(''); setMail(''); setCibleReponse(null); setDemandeValidation(false)
      setEnvoye(true)
    } else {
      console.error('[discussion] envoi refusé :', error)
      setErreur(motifDuRefus(error))
    }
  }

  const reessayer = useCallback(() => setTentative(t => t + 1), [])

  const renderCommentaire = (c: Commentaire, estReponse: boolean, suivie = false) => {
    const forme = formeCommentaire({ reponse: estReponse, suivie })
    // ⛔ TOUT COMMENTAIRE EN ATTENTE SE REPLIE, le sien compris (demande de l'auteur,
    // 2026-09-24) : « EN ATTENTE DE RELECTURE », et le survol propose de le lire.
    const cache = !c.supprime && !c.valide && !revelees.has(c.id)
    if (cache) {
      return (
        <div key={c.id} style={{ marginLeft: forme.marginLeft, marginBottom: forme.marginBottom }}>
          <button className="commentaire-retracte" onClick={() => setRevelees(prev => new Set(prev).add(c.id))}
            style={{ width:'100%', display:'block', position:'relative', overflow:'hidden', background:'var(--cs-danger-fond)', borderStyle:'solid', borderColor:'var(--cs-danger-bord)', borderWidth: forme.borderWidth, borderRadius: forme.borderRadius, cursor:'pointer', padding:'9px 12px', textAlign:'left' }}>
            <span className="commentaire-retracte-contenu" style={{ display:'block', fontSize:'0.71875rem', color:'var(--cs-danger-fonce)', fontWeight:600 }}>
              EN ATTENTE DE RELECTURE
            </span><LireQuandMeme />
          </button>
        </div>
      )
    }
    const rangInfo = c.lecture ? calculerRang(c.lecture.nb_auteurs, c.lecture.total_auteurs) : null
    const couleurs = rangInfo ? couleurRang(rangInfo.rang) : null
    const estCertifie = !!c.certifie
    const estRevision = !c.valide
    const aDesActionsADroite = userId === c.user_id || (isAdmin && userId !== c.user_id)
    return (
      <div className="commentaire-carte" key={c.id}
        style={{ ...carteCommentaire({ certifie: estCertifie, enRevision: estRevision, reponse: estReponse, suivie }), viewTransitionName: `commentaire-bible-${c.id}` }}>
        {c.supprime ? (
          <p style={EFFACE_COMMENTAIRE}>{c.pseudo ?? c.auteur_nom ?? 'Un utilisateur'} a supprimé un commentaire</p>
        ) : (
        <>
        <div style={ENTETE_COMMENTAIRE}>
          <div style={{ display:'flex', alignItems:'center', gap:'6px', flexWrap:'wrap', minWidth:0 }}>
            <span style={NOM_COMMENTAIRE}>
              {c.pseudo ?? c.auteur_nom}
              {c.mecene && <>{' '}<MarqueMecene /></>}
            </span>
            {couleurs && rangInfo && (
              <span style={{ ...BADGE_RANG, color:couleurs.texte, background:couleurs.fond }}>{rangInfo.rang}</span>
            )}
            {estCertifie && <span style={{ ...BADGE_ETAT, color:'var(--cs-vert)', background:'rgba(var(--cs-vert-rgb),0.14)' }}>CERTIFIÉ</span>}
            {estRevision && <span style={{ ...BADGE_ETAT, color:'var(--cs-danger-fonce)', background:'rgba(var(--cs-danger-rgb),0.10)' }}>EN ATTENTE DE RELECTURE</span>}
          </div>
          <span style={DATE_COMMENTAIRE}>{dateHeureCommentaire(c.created_at)}</span>
        </div>
        <div style={TEXTE_COMMENTAIRE}>{rendreTexteEnrichi(c.texte)}</div>
        <div style={PIED_COMMENTAIRE}>
          {/* ⚠️ Un compteur À ZÉRO ne s'écrit pas : le chiffre paraît au premier vote. */}
          <div style={{ display:'flex', alignItems:'center', gap:'14px', flexShrink:0, padding:'0 6px' }}>
            <button onClick={() => basculerVote(c, 1)} title="J’aime" aria-label="J’aime" aria-pressed={c.monVote === 1}
              style={{ ...CIBLE_VOTE, color: c.monVote === 1 ? 'var(--cs-vert)' : 'var(--cs-texte-gris)' }}>
              <svg width="12" height="12" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M7 9V17H4.5C3.67 17 3 16.33 3 15.5V10.5C3 9.67 3.67 9 4.5 9H7ZM7 9L10.5 3.5C10.78 3.06 11.32 2.91 11.77 3.15C12.97 3.79 13.5 5.22 12.97 6.47L12 8.75H15.5C16.6 8.75 17.42 9.76 17.18 10.84L16.05 15.84C15.87 16.64 15.16 17.21 14.35 17.21H10C8.9 17.21 7.85 16.83 7 16.18" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
              {c.nbLikes > 0 && <span style={{ fontWeight:600, fontSize:'0.6875rem' }}>{c.nbLikes}</span>}
            </button>
            <button onClick={() => basculerVote(c, -1)} title="Je n’aime pas" aria-label="Je n’aime pas" aria-pressed={c.monVote === -1}
              style={{ ...CIBLE_VOTE, color: c.monVote === -1 ? 'var(--cs-danger-fonce)' : 'var(--cs-texte-gris)' }}>
              <svg width="12" height="12" viewBox="0 0 20 20" fill="none" style={{ transform:'rotate(180deg)' }} aria-hidden="true">
                <path d="M7 9V17H4.5C3.67 17 3 16.33 3 15.5V10.5C3 9.67 3.67 9 4.5 9H7ZM7 9L10.5 3.5C10.78 3.06 11.32 2.91 11.77 3.15C12.97 3.79 13.5 5.22 12.97 6.47L12 8.75H15.5C16.6 8.75 17.42 9.76 17.18 10.84L16.05 15.84C15.87 16.64 15.16 17.21 14.35 17.21H10C8.9 17.21 7.85 16.83 7 16.18" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
              {c.nbDislikes > 0 && <span style={{ fontWeight:600, fontSize:'0.6875rem' }}>{c.nbDislikes}</span>}
            </button>
          </div>
          {!estReponse && (
            <button onClick={() => setCibleReponse(c)} style={ACTION_COMMENTAIRE}>Répondre</button>
          )}
          {userId === c.user_id && (
            <BoutonSupprimerCommentaire libelle="Supprimer" titre="Supprimer mon commentaire" couleur={ACTION_COMMENTAIRE.color as string}
              marge="auto" onSupprimer={() => supprimerMonCommentaire(c)} />
          )}
          {isAdmin && userId !== c.user_id && (
            <BoutonSupprimerCommentaire libelle="Supprimer (admin)" titre="Supprimer ce commentaire et ses réponses" couleur="var(--cs-danger)"
              marge="auto" onSupprimer={() => supprimerCommentaire(c)} />
          )}
          <button onClick={() => { if (exigerCompte('signaler ce commentaire')) setCommentaireSignale(c) }} title="Signaler ce commentaire" aria-label="Signaler ce commentaire"
            style={{ ...ACTION_COMMENTAIRE, color:'var(--cs-bord)', marginLeft: aDesActionsADroite ? 0 : 'auto', display:'inline-flex', alignItems:'center' }}>
            <IconeSignalement />
          </button>
        </div>
        </>
        )}
      </div>
    )
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%', minHeight:0, padding:'10px 0' }}>
      <style>{`
        .commentaire-carte {
          transition: opacity var(--cs-duree-moyenne) ease, box-shadow var(--cs-duree-moyenne) ease, margin var(--cs-duree-moyenne) ease;
        }
        ${FEUILLE_COMMENTAIRE_RETRACTE}
      `}</style>
      {/* Liste défilante : la zone de saisie reste épinglée au bas du volet. */}
      <div style={{ flex:1, minHeight:0, overflowY:'auto', display:'flex', flexDirection:'column' }}>
        {loading && <MotAttente />}
        {!loading && erreurChargement && (
          <EtatVideVolet>
            <MentionVide>La discussion n’a pas pu être chargée.</MentionVide>
            <button onClick={reessayer} className="cs-bouton-lien">Réessayer</button>
          </EtatVideVolet>
        )}
        {!loading && !erreurChargement && commentaires.length === 0 && (
          <EtatVideVolet>
            <MentionVide>Aucun commentaire.</MentionVide>
            <FleuronDiscret vide="commentaires" />
          </EtatVideVolet>
        )}
        {!loading && !erreurChargement && principaux.map(c => {
          const reponses = reponsesDe(c.id)
          return (
            <div key={c.id}>
              {renderCommentaire(c, false, reponses.length > 0)}
              {reponses.map((r, i) => renderCommentaire(r, true, i < reponses.length - 1))}
            </div>
          )
        })}
      </div>
      <div style={{ flexShrink:0, display:'flex', flexDirection:'column', gap:'5px', borderTop:'1px solid var(--cs-fond-doux)', marginTop:'4px', paddingTop:'10px' }}>
        {!aUnCompte ? <InvitationCompteInline action="commenter ce passage" /> : <>
        {cibleReponse && (
          <div style={{ display:'flex', alignItems:'center', gap:'6px', padding:'0 2px' }}>
            <span style={{ display:'inline-flex', alignItems:'center', gap:'5px', fontSize:'0.71875rem', color:'var(--cs-vert)' }}>
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ flexShrink:0 }}>
                <path d="M7 4 3.5 7.5 7 11M3.5 7.5H10a2.5 2.5 0 0 1 2.5 2.5V12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Réponse à <strong>{cibleReponse.pseudo ?? cibleReponse.auteur_nom}</strong>
            </span>
            <button onClick={() => setCibleReponse(null)} aria-label="Annuler la réponse" title="Annuler la réponse"
              className="cs-croix-fermer cs-croix-fermer--petite" style={{ marginLeft:'auto', width:'24px', height:'24px' }}>
              <IconeCroix />
            </button>
          </div>
        )}
        <EditeurCommentaire value={texte} onChange={t => { setTexte(t); if (envoye) setEnvoye(false) }} placeholder={cibleReponse ? 'Votre réponse…' : 'Votre commentaire…'} minHeight={62} />
        {envoye && (
          <p role="status" style={{ fontSize:'0.6875rem', color:'var(--cs-vert)', margin:0 }}>
            Merci. Votre commentaire paraîtra après relecture.
          </p>
        )}
        {!userId && (
          <>
            <input aria-label="Nom" type="text" value={nom} onChange={e => setNom(e.target.value)} placeholder="Nom *"
              style={{ width:'100%', fontSize:'0.71875rem', padding:'4px 7px', borderRadius:'4px', border:`1px solid ${erreur && !nom.trim() ? 'var(--cs-danger)' : 'var(--cs-bord)'}`, background:'var(--cs-surface)', color:'var(--cs-texte-fort)', outline:'none', boxSizing:'border-box' }} />
            <input aria-label="Adresse électronique" type="email" value={mail} onChange={e => setMail(e.target.value)} placeholder="Adresse électronique *"
              style={{ width:'100%', fontSize:'0.71875rem', padding:'4px 7px', borderRadius:'4px', border:'1px solid var(--cs-bord)', background:'var(--cs-surface)', color:'var(--cs-texte-fort)', outline:'none', boxSizing:'border-box' }} />
            <p style={{ fontSize:'0.6875rem', color:'var(--cs-texte-gris)', margin:0 }}>* L’adresse ne sera pas publiée.</p>
          </>
        )}
        {erreur && <p role="alert" style={{ ...TEXTE_ERREUR, margin:0 }}>{erreur}</p>}
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'8px' }}>
          <label style={{ display:'flex', alignItems:'flex-start', gap:'7px', fontSize:'0.6875rem', color:'var(--cs-texte-second)', cursor:'pointer', lineHeight:1.3, minHeight:'24px' }}>
            <input type="checkbox" checked={demandeValidation} onChange={e => setDemandeValidation(e.target.checked)}
              style={{ width:'16px', height:'16px', flexShrink:0, accentColor:'var(--cs-vert)', cursor:'pointer', margin:'1px 0 0' }} />
            <span>
              Demander la certification
              <span style={{ display:'block', fontSize:'0.6875rem', color:'var(--cs-texte-gris)' }}>Validé, il passe en tête.</span>
            </span>
          </label>
          <button onClick={envoyer} disabled={envoi}
            className="cs-bouton-plein cs-bouton-plein--compact" style={{ flexShrink:0 }}>
            {envoi ? '…' : 'Envoyer'}
          </button>
        </div>
        </>}
      </div>
      {commentaireSignale && (
        <ModalSignalement
          titre={`Commentaire de ${commentaireSignale.pseudo ?? commentaireSignale.auteur_nom}`}
          texteObjet={commentaireSignale.texte}
          onClose={() => setCommentaireSignale(null)}
          onEnvoyer={async (msg) => {
            const { data } = await supabase.auth.getSession()
            const headers: HeadersInit = { 'Content-Type': 'application/json' }
            const token = data.session?.access_token
            if (token) headers.Authorization = `Bearer ${token}`
            const res = await fetch('/api/signalements', {
              method: 'POST', headers,
              // `url_source` : la page D'OÙ l'on signale.
              body: JSON.stringify({ id_verset: idVerset, message: `Commentaire #${commentaireSignale.id} : ${msg}`, url_source: window.location.href }),
            })
            if (!res.ok) {
              const details = await res.json().catch(() => null)
              throw new Error(details?.error ?? 'Le signalement n’a pas pu être envoyé.')
            }
          }}
        />
      )}
    </div>
  )
}
