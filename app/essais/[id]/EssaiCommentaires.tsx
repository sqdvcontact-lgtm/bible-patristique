'use client'

import LireQuandMeme, { FEUILLE_COMMENTAIRE_RETRACTE } from '@/app/components/LireQuandMeme'
import { useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import { rendreTexteEnrichi } from '@/app/oeuvre/[id]/texteEnrichi'
import { calculerRang, couleurRang } from '@/app/lib/classement'
import EditeurCommentaire from '@/app/components/EditeurCommentaire'
import { useCompte } from '@/app/lib/contexteCompte'
import InvitationCompteInline from '@/app/components/InvitationCompteInline'
import MarqueMecene from '@/app/components/MarqueMecene'
import { carteCommentaire, ENTETE_COMMENTAIRE, NOM_COMMENTAIRE, DATE_COMMENTAIRE, BADGE_RANG, BADGE_ETAT, TEXTE_COMMENTAIRE, CITATION_COMMENTAIRE, PIED_COMMENTAIRE, ACTION_COMMENTAIRE, EFFACE_COMMENTAIRE, formeCommentaire } from '@/app/lib/styleCommentaire'

type CommentaireEssai = {
  id: number; texte: string; passage_cite: string | null; reponse_a: number | null
  user_id: string | null; auteur_nom: string | null; valide: boolean; created_at: string; supprime: boolean
  lecture?: { nb_auteurs: number; total_auteurs: number } | null
  mecene?: boolean
}

export default function EssaiCommentaires({ idEssai }: { idEssai: number }) {
  const [commentaires, setCommentaires] = useState<CommentaireEssai[]>([])
  const [texte, setTexte] = useState('')
  const [passageCite, setPassageCite] = useState('')
  const [afficherPassage, setAfficherPassage] = useState(false)
  const [cibleReponse, setCibleReponse] = useState<CommentaireEssai | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [pseudo, setPseudo] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState('')
  const [revelees, setRevelees] = useState<Set<number>>(new Set())
  const { aUnCompte, exigerCompte } = useCompte()

  useEffect(() => {
    supabase.from('essais_commentaires').select('id, texte, passage_cite, reponse_a, user_id, auteur_nom, valide, created_at, supprime').eq('id_essai', idEssai).order('created_at', { ascending: true })
      .then(async ({ data }) => {
        const lignes = data ?? []
        const ids = [...new Set(lignes.map(c => c.user_id).filter((id): id is string => !!id))]
        // ⛔ La marque de mécène se lit dans `mecenes_publics`, jamais dans `profils` :
        // la vue ne rend que des identifiants, et elle filtre déjà sur le choix du
        // lecteur de la montrer ou non. Voir app/components/MarqueMecene.tsx.
        const [{ data: scores }, { data: lignesMecenes }] = ids.length
          ? await Promise.all([
              // ⛔ Le rang mesure la LECTURE (charte § 40.5) et se lit dans `lecture_utilisateurs`,
              // comme au panneau patristique. `classement_utilisateurs` n'a pas ces colonnes :
              // tout commentateur paraissait « Catéchumène » ici depuis le 1er septembre.
              supabase.from('lecture_utilisateurs').select('user_id, nb_auteurs, total_auteurs').in('user_id', ids),
              supabase.from('mecenes_publics').select('user_id').in('user_id', ids),
            ])
          : [{ data: [] as any[] }, { data: [] as { user_id: string }[] }]
        const scoreMap = new Map((scores ?? []).map((s: any) => [s.user_id, s]))
        const mecenes = new Set((lignesMecenes ?? []).map((m: { user_id: string }) => m.user_id))
        setCommentaires(lignes.map(c => ({
          ...c,
          lecture: c.user_id ? scoreMap.get(c.user_id) ?? null : null,
          mecene: !!c.user_id && mecenes.has(c.user_id),
        })))
      })
    supabase.auth.getSession().then(async ({ data }) => {
      const uid = data.session?.user.id ?? null
      setUserId(uid)
      if (uid) {
        const { data: profil } = await supabase.from('profils').select('pseudo, est_admin').eq('id', uid).maybeSingle()
        setPseudo(profil?.pseudo ?? null)
        setIsAdmin(profil?.est_admin ?? false)
      }
    })
  }, [idEssai])

  const supprimerCommentaire = async (id: number) => {
    if (!window.confirm('Supprimer définitivement ce commentaire ?')) return
    const { data: session } = await supabase.auth.getSession()
    const token = session.session?.access_token
    const res = await fetch('/api/essais/supprimer-commentaire', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id }),
    })
    if (res.ok) setCommentaires(prev => prev.filter(c => c.id !== id))
  }

  const supprimerMonCommentaire = async (id: number) => {
    if (!window.confirm('Supprimer ce commentaire ? Il restera visible en tant que commentaire supprimé.')) return
    const { error } = await supabase.from('essais_commentaires').update({ supprime: true }).eq('id', id)
    if (!error) setCommentaires(prev => prev.map(c => c.id === id ? { ...c, supprime: true } : c))
  }

  // Le commentaire part en relecture : on le DIT, en ton neutre. Sans ce mot,
  // l'auteur le voyait rejoindre la liste sous une bande de danger, et croyait à
  // une erreur ou à une sanction.
  const [accuse, setAccuse] = useState(false)

  const envoyer = async () => {
    if (!exigerCompte('commenter cette publication')) return
    if (!texte.trim() || !userId) return
    setErreur('')
    setAccuse(false)
    setEnvoi(true)
    const { data, error } = await supabase.from('essais_commentaires').insert({
      id_essai: idEssai,
      texte: texte.trim(),
      passage_cite: passageCite.trim() || null,
      reponse_a: cibleReponse?.id ?? null,
      user_id: userId,
      auteur_nom: pseudo ?? 'Utilisateur',
      valide: false,
    }).select().single()
    setEnvoi(false)
    if (error) { setErreur(error.code === 'ZL001' ? error.message : 'L’envoi a échoué.'); return }
    if (data) {
      setCommentaires(prev => [...prev, data])
      setAccuse(true)
      setTexte('')
      setPassageCite('')
      setAfficherPassage(false)
      setCibleReponse(null)
    }
  }

  const nbReponses = (id: number) => commentaires.filter(c => c.reponse_a === id).length
  const racines = commentaires.filter(c => c.reponse_a === null)
  // Tri unique : les plus commentés d'abord, puis les plus récents.
  const racinesTriees = [...racines].sort((a, b) => {
    const diff = nbReponses(b.id) - nbReponses(a.id)
    return diff !== 0 ? diff : +new Date(b.created_at) - +new Date(a.created_at)
  })
  const dateHeureCommentaire = (date: string) =>
    new Date(date).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  const LigneActions = ({ c }: { c: CommentaireEssai }) => {
    const peutRepondre = !!userId && c.reponse_a === null
    const peutSupprimer = isAdmin || userId === c.user_id
    // ⚠️ Aucune action, aucune ligne. Rendue à vide, elle ne laissait qu'un blanc
    // sous le texte, et une carte sur deux paraissait mal fermée.
    if (!peutRepondre && !peutSupprimer) return null
    return (
      <div style={PIED_COMMENTAIRE}>
        {peutRepondre && (
          <button onClick={() => setCibleReponse(c)} style={ACTION_COMMENTAIRE}>Répondre</button>
        )}
        {isAdmin ? (
          <button onClick={() => supprimerCommentaire(c.id)} style={{ ...ACTION_COMMENTAIRE, color: 'var(--cs-danger)', marginLeft: 'auto' }}>Supprimer</button>
        ) : userId === c.user_id && (
          <button onClick={() => supprimerMonCommentaire(c.id)} style={{ ...ACTION_COMMENTAIRE, marginLeft: 'auto' }}>Supprimer</button>
        )}
      </div>
    )
  }

  const CommentaireRetracte = ({ c, reponse, suivie = false }: { c: CommentaireEssai; reponse: boolean; suivie?: boolean }) => (
    <div style={{ marginLeft: formeCommentaire({ reponse, suivie }).marginLeft, marginBottom: formeCommentaire({ reponse, suivie }).marginBottom }}>
      <button className="commentaire-retracte" onClick={() => setRevelees(prev => new Set(prev).add(c.id))}
        style={{ width: '100%', display: 'block', position: 'relative', overflow: 'hidden', background: 'var(--cs-danger-fond)', borderStyle: 'solid', borderColor: 'var(--cs-danger-bord)', borderWidth: formeCommentaire({ reponse, suivie }).borderWidth, borderRadius: formeCommentaire({ reponse, suivie }).borderRadius, cursor: 'pointer', padding: '9px 12px', textAlign: 'left' }}>
        <span className="commentaire-retracte-contenu" style={{ display: 'block', fontSize: '0.71875rem', color: 'var(--cs-danger-fonce)', fontWeight: 600 }}>
          Commentaire en attente de contrôle.
        </span><LireQuandMeme />
      </button>
    </div>
  )

  const CommentaireEfface = ({ c, reponse, suivie = false }: { c: CommentaireEssai; reponse: boolean; suivie?: boolean }) => (
    <div className="commentaire-carte" style={{ ...carteCommentaire({ reponse, suivie }), viewTransitionName: `commentaire-essai-${c.id}` }}>
      <p style={EFFACE_COMMENTAIRE}>{c.auteur_nom ?? 'Un utilisateur'} a supprimé un commentaire</p>
    </div>
  )

  // ⚠️ UNE seule écriture de la carte, pour la racine comme pour la réponse. Les deux
  // vivaient côte à côte, à quelques dixièmes de rem près : c'est ainsi que le dessin
  // s'était mis à diverger d'un rang à l'autre.
  const CorpsCommentaire = ({ c, reponse, suivie = false }: { c: CommentaireEssai; reponse: boolean; suivie?: boolean }) => {
    const rang = c.lecture ? calculerRang(c.lecture.nb_auteurs, c.lecture.total_auteurs).rang : null
    const rangCouleur = rang ? couleurRang(rang) : null
    // Son PROPRE commentaire en attente se lit déplié, avec la raison de l'attente.
    // ⚠️ Mais sa carte est ROUGE, comme au volet d'un verset et à l'onglet d'une
    // œuvre (demande de l'auteur, 2026-09-22) : un commentaire non contrôlé se
    // reconnaît partout à la même teinte, y compris sous les yeux de qui l'écrit.
    const monAttente = !c.valide && !!userId && c.user_id === userId
    return (
      <div className="commentaire-carte" style={{ ...carteCommentaire({ enRevision: !c.valide, reponse, suivie }), viewTransitionName: `commentaire-essai-${c.id}` }}>
        <div style={ENTETE_COMMENTAIRE}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', minWidth: 0 }}>
            <span style={NOM_COMMENTAIRE}>
              {c.auteur_nom ?? 'Anonyme'}
              {c.mecene && <>{' '}<MarqueMecene /></>}
            </span>
            {rang && rangCouleur && <span style={{ ...BADGE_RANG, color: rangCouleur.texte, background: rangCouleur.fond }}>{rang}</span>}
            {!c.valide && (
              <span style={{ ...BADGE_ETAT, color: 'var(--cs-danger-fonce)', background: 'rgba(var(--cs-danger-rgb),0.10)' }}>
                {monAttente ? 'EN ATTENTE DE RELECTURE' : 'EN RÉVISION'}
              </span>
            )}
          </div>
          <span style={DATE_COMMENTAIRE}>{dateHeureCommentaire(c.created_at)}</span>
        </div>
        {c.passage_cite && (
          <blockquote style={CITATION_COMMENTAIRE}>« {c.passage_cite} »</blockquote>
        )}
        <div style={TEXTE_COMMENTAIRE}>{rendreTexteEnrichi(c.texte)}</div>
        {monAttente && (
          <p style={{ margin: '6px 0 0', fontSize: '0.6875rem', fontStyle: 'italic', color: 'var(--cs-texte-second)' }}>
            Votre commentaire paraîtra pour les autres lecteurs après sa relecture par la modération.
          </p>
        )}
        <LigneActions c={c} />
      </div>
    )
  }

  const Carte = ({ c }: { c: CommentaireEssai }) => {
    const rendre = (x: CommentaireEssai, reponse: boolean, suivie = false) => {
      if (x.supprime) return <CommentaireEfface key={x.id} c={x} reponse={reponse} suivie={suivie} />
      if (!x.valide && x.user_id !== userId && !revelees.has(x.id)) return <CommentaireRetracte key={x.id} c={x} reponse={reponse} suivie={suivie} />
      return <CorpsCommentaire key={x.id} c={x} reponse={reponse} suivie={suivie} />
    }
    // Le fil se sépare du suivant par un BLANC un peu plus large que celui qui règne
    // entre ses cartes. Le filet d'avant ne servait plus qu'à couper deux cartes déjà
    // cernées chacune par la sienne.
    const reponses = commentaires.filter(r => r.reponse_a === c.id)
    return (
      <article>
        {rendre(c, false, reponses.length > 0)}
        {reponses.map((r, i) => rendre(r, true, i < reponses.length - 1))}
      </article>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      <style>{`
        .commentaire-carte {
          transition: opacity 180ms ease, box-shadow 180ms ease, margin 180ms ease;
        }
        ${FEUILLE_COMMENTAIRE_RETRACTE}
      `}</style>
      {/* Liste défilante des commentaires. ⚠️ Pas de décompte en tête (demande de
          l'auteur, 2026-09-22) : « 1 commentaire » au-dessus d'une seule carte ne
          disait rien que la liste ne montre. Le vide seul se dit. */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 14px' }}>
        {racines.length === 0 && (
          <p style={{ margin: 0, fontSize: '0.6875rem', color: 'var(--cs-texte-gris)', fontStyle: 'italic' }}>Aucun commentaire</p>
        )}
        {racinesTriees.map(c => <Carte key={c.id} c={c} />)}
      </div>

      {/* Outil de rédaction : ancré EN BAS du volet. */}
      {aUnCompte ? (
        <div style={{ flexShrink: 0, borderTop: '1px solid var(--cs-fond-doux)', background: 'var(--cs-fond-clair)', padding: '10px 14px 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {cibleReponse && (
            <p style={{ fontSize: '0.6875rem', color: 'var(--cs-texte-second)', background: 'var(--cs-surface)', padding: '4px 8px', borderRadius: '4px', margin: 0, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
                <path d="M7 4 3.5 7.5 7 11M3.5 7.5H10a2.5 2.5 0 0 1 2.5 2.5V12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              En réponse à <strong>{cibleReponse.auteur_nom}</strong>{' '}
              <button onClick={() => setCibleReponse(null)} style={{ color: 'var(--cs-danger)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.6875rem', padding: 0 }}>✕</button>
            </p>
          )}
          <EditeurCommentaire value={texte} onChange={setTexte} placeholder="Votre commentaire…" minHeight={64} />
          {!afficherPassage ? (
            <button onClick={() => setAfficherPassage(true)} style={{ fontSize: '0.6875rem', color: 'var(--cs-vert)', background: 'none', border: 'none', cursor: 'pointer', alignSelf: 'flex-start', padding: 0 }}>+ Citer un passage</button>
          ) : (
            <textarea aria-label="Passage cité" value={passageCite} onChange={e => setPassageCite(e.target.value)} rows={2} placeholder="Passage exact à commenter…"
              style={{ width: '100%', fontSize: '0.71875rem', fontStyle: 'italic', padding: '6px 8px', border: '1px solid var(--cs-bord)', borderRadius: '4px', background: 'var(--cs-surface)', color: 'var(--cs-texte)', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }} />
          )}
          {erreur && <p role="alert" style={{ margin: 0, fontSize: '0.6875rem', color: 'var(--cs-danger)' }}>{erreur}</p>}
          {accuse && !erreur && (
            <p role="status" style={{ margin: 0, fontSize: '0.6875rem', color: 'var(--cs-texte-second)' }}>
              Merci. Votre commentaire paraîtra après relecture.
            </p>
          )}
          <button onClick={envoyer} disabled={envoi || !texte.trim()} className="cs-bouton-plein cs-bouton-plein--compact" style={{ alignSelf: 'flex-end' }}>
            {envoi ? 'Envoi…' : 'Envoyer'}
          </button>
        </div>
      ) : (
        <div style={{ flexShrink: 0, borderTop: '1px solid var(--cs-fond-doux)', background: 'var(--cs-fond-clair)', padding: '10px 14px 12px' }}>
          <InvitationCompteInline action="commenter cette publication" />
        </div>
      )}
    </div>
  )
}
