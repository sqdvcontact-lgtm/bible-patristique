'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useEstMobile } from '@/app/lib/useEstMobile'
import { HAUTEUR_NAVBAR, HAUTEUR_SOUS_NAVBAR } from '@/app/lib/mesures'
import { supabase } from '@/app/lib/supabase'
import { rendreEssai, extraireSommaire } from '@/app/lib/texteEnrichiEssai'
import { PARAGRAPHE_ESSAI, CITATION_ESSAI, enCss } from '@/app/lib/compositionEssai'
import { rendreTexteEnrichi } from '@/app/oeuvre/[id]/texteEnrichi'
import EssaiCommentaires from './EssaiCommentaires'
import BarreVoletMobile from '@/app/components/BarreVoletMobile'
import { useFavoris } from '@/app/lib/useFavoris'
import EtoileFavori from '@/app/components/EtoileFavori'
import ModalSignalement from '@/app/components/ModalSignalement'
import BullePartage from '@/app/components/BullePartage'
import { useCompte } from '@/app/lib/contexteCompte'
import IconeSignalement from '@/app/components/IconeSignalement'
import { ABREV_FR, LIVRES } from '@/app/lib/bible'
import MarqueMecene from '@/app/components/MarqueMecene'
import { useFermerAEchap } from '@/app/lib/useFermerAEchap'
import { useFenetreModale } from '@/app/lib/useFenetreModale'
import { SERIF, SANS } from '@/app/lib/polices'
import { GRAISSE_TITRE_VOLET, STYLE_RUBRIQUE } from '@/app/lib/hierarchieTitres'
import { Z_TIROIR, Z_TIROIR_VOILE } from '@/app/lib/empilement'
import IconeChevron from '@/app/components/IconeChevron'
import RailVolet from '@/app/components/RailVolet'
import { useFoyerAuRepli } from '@/app/lib/useFoyerAuRepli'
import { BoutonVolet } from '@/app/oeuvre/[id]/TeteVolet'
import { poserEnHaut } from '@/app/lib/defilementLecture'
import ModaleProfilLecteur from '@/app/components/ModaleProfilLecteur'

const ABREV_VERS_NOM: Record<string, string> = Object.fromEntries(
  Object.entries(ABREV_FR).map(([code, abrev]) => [abrev, LIVRES.find(l => l.code === code)?.nom ?? abrev])
)

function expanderRef(ref: string): string {
  return ref
    .replace(/^([^\s\d]+)/, (_, abrev) => ABREV_VERS_NOM[abrev] ?? abrev)
    .replace(/,(\S)/g, ', $1')
}

type Essai = {
  id: number; titre: string; sous_titre: string | null; resume: string | null
  categories: string[]; contenu: string; statut: string; nb_vues: number
  user_id: string | null; created_at: string; publie_at: string | null; auteur_pseudo: string | null
  /** Signée « Anonyme » : le nom paraît en tête, mais rien ne renvoie à un compte. */
  anonyme?: boolean
  /** L'auteur porte-t-il la marque de mécène. Voir app/components/MarqueMecene.tsx. */
  auteur_mecene?: boolean
  verset_en_tete?: string | null
  /** Le pseudonyme du compte de l'auteur, pour ouvrir sa fiche ; nul pour un essai anonyme. */
  auteur_profil?: string | null
  /** Le motif écrit par la modération, pour un essai renvoyé ou refusé, et seulement là. */
  motif_moderation?: string | null
}

const MOTS_NOMBRES = ['zéro','une','deux','trois','quatre','cinq','six','sept','huit','neuf','dix','onze','douze','treize','quatorze','quinze','seize','dix-sept','dix-huit','dix-neuf','vingt']
function chiffreEnLettres(n: number): string {
  if (n >= 0 && n <= 20) return MOTS_NOMBRES[n]
  if (n <= 99) {
    const d = Math.floor(n / 10), u = n % 10
    const diz = ['','dix','vingt','trente','quarante','cinquante','soixante','soixante','quatre-vingt','quatre-vingt']
    if (d === 7 || d === 9) return diz[d] + (u === 1 && d === 7 ? '-et-' : '-') + MOTS_NOMBRES[10 + u]
    return diz[d] + (u === 1 && d < 8 ? '-et-un' : u > 0 ? '-' + MOTS_NOMBRES[u] : (d === 8 ? 's' : ''))
  }
  return String(n)
}

export default function EssaiClient({ essai }: { essai: Essai }) {
  // ≤ 900px : le volet Commentaires devient une barre fixe en bas + tiroir,
  // et le texte prend toute la largeur (voir AGENTS § Responsive mobile).
  const mobile = useEstMobile()
  const [voletOuvert, setVoletOuvert] = useState(true)
  // Le tiroir d'un téléphone se ferme à Échap, comme une fenêtre.
  useFermerAEchap(mobile && voletOuvert, () => setVoletOuvert(false))
  const refVolet = useRef<HTMLElement>(null)
  // Replier rend le foyer au rail, déplier au chevron (voir `useFoyerAuRepli`).
  const refRailVolet = useRef<HTMLButtonElement>(null)
  const refChevronVolet = useRef<HTMLButtonElement>(null)
  useFoyerAuRepli(voletOuvert, refRailVolet, refChevronVolet)
  useFenetreModale(refVolet, mobile && voletOuvert)
  // ⛔ Fermé d'office sous 1100 px, non sous 900. Volet gauche 15rem, volet droit
  //    18,75rem et 112 px de rembourrage : à 901 px il ne restait que 249 px de mesure
  //    au texte, et 328 mesurés à 1010 px. Le seuil n'est pas celui du hook parce qu'il
  //    ne dit pas la même chose : le hook dit « téléphone », celui-ci dit « la place
  //    manque pour lire À CÔTÉ ». On l'ouvre toujours d'un clic.
  // ⚠️ `window.innerWidth <= 900` et non `< 900` : à 900 px exactement, le hook
  //    (`max-width: 900px`) disait mobile pendant que ce test disait bureau.
  useEffect(() => { if (typeof window !== 'undefined' && window.innerWidth <= 1100) setVoletOuvert(false) }, [])
  const [nbVues, setNbVues] = useState(essai.nb_vues)
  const [nbAppreciations, setNbAppreciations] = useState(0)
  const [aApprecie, setApprecie] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  const { favoris: favorisEssais, pret: favorisPret, toggle: toggleFavoriEssai } = useFavoris('essai')
  const dateAffichee = essai.publie_at ?? essai.created_at

  useEffect(() => {
    fetch('/api/essais/incrementer-vue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: essai.id }),
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (typeof data?.nb_vues === 'number') setNbVues(data.nb_vues)
      })
      .catch(() => {})
  }, [essai.id])

  useEffect(() => {
    localStorage.setItem('cs_derniere_publication', JSON.stringify({
      id: essai.id,
      titre: essai.titre,
      auteur: essai.auteur_pseudo,
    }))
  }, [essai.id, essai.titre, essai.auteur_pseudo])

  useEffect(() => {
    supabase.from('essais_appreciations').select('user_id', { count: 'exact' }).eq('id_essai', essai.id)
      .then(({ data, count }) => {
        setNbAppreciations(count ?? data?.length ?? 0)
      })
    supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user.id ?? null
      setUserId(uid)
      if (uid) {
        supabase.from('essais_appreciations').select('user_id').eq('id_essai', essai.id).eq('user_id', uid).maybeSingle()
          .then(({ data }) => setApprecie(!!data))
      }
    })
  }, [essai.id])

  const toggleApprecier = async () => {
    if (!aApprecie && !exigerCompte('apprécier cette publication')) return
    if (!userId) return
    if (aApprecie) {
      await supabase.from('essais_appreciations').delete().eq('id_essai', essai.id).eq('user_id', userId)
      setApprecie(false); setNbAppreciations(n => Math.max(0, n - 1))
    } else {
      await supabase.from('essais_appreciations').insert({ id_essai: essai.id, user_id: userId })
      setApprecie(true); setNbAppreciations(n => n + 1)
    }
  }

  const [pdfEnCours, setPdfEnCours] = useState(false)
  const [signalerOuvert, setSignalerOuvert] = useState(false)
  const { exigerCompte } = useCompte()

  const envoyerSignalement = async (message: string, importance?: string) => {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    const headers: HeadersInit = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
    const res = await fetch('/api/signalements', {
      method: 'POST', headers,
      body: JSON.stringify({ reference: `Publication : ${essai.titre}`, message, importance, url_source: typeof window !== 'undefined' ? window.location.href : null }),
    })
    if (!res.ok) throw new Error('échec du signalement')
  }

  // ⛔ Le partage passe par la bulle partagée du site : elle compose la ligne
  // (`app/lib/partage.ts`) et offre les canaux, la copie du lien comprise — d'où le
  // retrait du bouton « Copier le lien », qui faisait le même geste à côté d'elle.
  // ⚠️ Une publication anonyme ne nomme personne : son pseudonyme ne sort pas d'ici.
  // ⚠️ L'état EST l'ancre : `null` ferme, le rectangle du bouton ouvre à côté de lui.
  const [ancrePartage, setAncrePartage] = useState<DOMRect | null>(null)

  const telechargerPDF = async () => {
    if (pdfEnCours) return
    setPdfEnCours(true)
    try {
      const { telechargerPDF: fn } = await import('./EssaiPDF')
      await fn({
        titre: essai.titre,
        sousTitre: essai.sous_titre,
        auteur: essai.auteur_pseudo,
        date: new Date(dateAffichee).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
        verset: versetParse,
        contenu: essai.contenu,
      })
    } finally {
      setPdfEnCours(false)
    }
  }

  const dateFormatee = new Date(dateAffichee).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  const versetParse = (() => { try { return essai.verset_en_tete ? JSON.parse(essai.verset_en_tete) as { ref: string; texte: string } : null } catch { return null } })()
  const sommaire = extraireSommaire(essai.contenu)
  // ⛔ Le texte défile dans SON bloc, non dans la fenêtre : `scrollIntoView` faisait
  // aussi défiler la page et posait le titre sous la barre. `poserEnHaut` vise le
  // défileur qui porte le titre, et le pose en haut de sa bande (2026-09-24).
  const allerAu = (id: string) => { const cible = document.getElementById(id); if (cible) poserEnHaut(cible) }
  const [profilOuvert, setProfilOuvert] = useState(false)

  // Boutons télécharger / partager / signaler, en tête du volet gauche (desktop), sur le
  // modèle de la tête du volet d'une œuvre (`BoutonVolet`), et, en mobile, dans l'en-tête
  // du volet des commentaires.
  const boutonsPartage = (
    <>
      <BoutonVolet titre={pdfEnCours ? 'Génération du PDF…' : 'Télécharger en PDF'} onClick={() => { if (!pdfEnCours) telechargerPDF() }}>
        {pdfEnCours ? (
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
            <circle cx="8" cy="8" r="5.5" strokeDasharray="15 10">
              <animateTransform attributeName="transform" type="rotate" from="0 8 8" to="360 8 8" dur="0.8s" repeatCount="indefinite"/>
            </circle>
          </svg>
        ) : (
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M8 1.8v8.2M4.8 6.9L8 10.1l3.2-3.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2.6 12.1v1.1a1 1 0 0 0 1 1h8.8a1 1 0 0 0 1-1v-1.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        )}
      </BoutonVolet>
      <BoutonVolet titre="Partager" onClick={e => setAncrePartage(e.currentTarget.getBoundingClientRect())}>
        <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M4.8 7.3l6.4-3.4M4.8 8.7l6.4 3.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
          <circle cx="12" cy="3.5" r="2.2" fill="currentColor"/>
          <circle cx="12" cy="12.5" r="2.2" fill="currentColor"/>
          <circle cx="4" cy="8" r="2.2" fill="currentColor"/>
        </svg>
      </BoutonVolet>
      <BoutonVolet titre="Signaler" onClick={() => { if (exigerCompte('signaler cette publication')) setSignalerOuvert(true) }}>
        <IconeSignalement size={14} />
      </BoutonVolet>
    </>
  )

  return (
    <div style={mobile
      ? { display: 'flex', flexDirection: 'column', background: 'var(--cs-fond)' }
      : { display: 'flex', height: HAUTEUR_SOUS_NAVBAR, background: 'var(--cs-fond)' }}>
      <style>{`
        /* ⛔ La composition du corps vient du module compositionEssai, jamais d'ici :
           la lecture, l'éditeur et le composeur en dérivent tous les trois. Trois copies
           d'une même forme ne restent identiques que par accident, et les !important
           de cette feuille masquaient les deux autres. */
        .essai-lecture-corps p { ${enCss(PARAGRAPHE_ESSAI, true)} }
        .essai-lecture-corps blockquote {
          ${enCss(CITATION_ESSAI, true)}
          /* Ce que le navigateur pose de lui-même sur une citation, et qui n'est pas
             de la composition : le filet de gauche et son retrait. */
          border-left: none !important;
          padding-left: 0 !important;
        }
        .essai-lecture-corps h2 {
          font-family: ${SERIF} !important;
          text-align: left !important;
          padding-left: 0 !important;
          margin-top: 6mm !important;
          margin-bottom: 4mm !important;
          line-height: 1.25 !important;
          text-indent: 0 !important;
        }
        .essai-lecture-corps h3 {
          font-family: ${SERIF} !important;
          text-align: left !important;
          padding-left: 3mm !important;
          margin-top: 4mm !important;
          margin-bottom: 1mm !important;
          text-indent: 0 !important;
        }
        /* Le nom de l'auteur ouvre sa fiche : le survol le souligne, comme le crédit
           d'une œuvre en tête de son volet. */
        .essai-nom-auteur { text-decoration: none; }
        .essai-nom-auteur:hover, .essai-nom-auteur:focus-visible { text-decoration: underline; text-underline-offset: 3px; }
        @keyframes essai-note-progress { from { width: 0% } to { width: 100% } }
      `}</style>

      {/* Volet gauche (desktop) : titre, date, actions, sommaire — sur le modèle du
          volet de lecture des Pères. Les boutons télécharger/partager/lien y vivent. */}
      {!mobile && (
        <aside style={{ width: '15rem', flexShrink: 0, background: 'var(--cs-fond-clair)', borderRight: '1px solid var(--cs-bord)', height: '100%', overflowY: 'auto', padding: '22px 16px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            {/* La tête du volet d'une œuvre : le titre, et ses actions au fer à droite,
                alignées sur sa première ligne (2026-09-24). */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <h2 style={{ flex: 1, minWidth: 0, fontFamily: SERIF, fontSize: '1.0625rem', fontWeight: GRAISSE_TITRE_VOLET, color: 'var(--cs-encre-fonce)', lineHeight: 1.28, margin: 0 }}>{essai.titre}</h2>
              <div className="cs-tete-volet-actions" style={{ marginTop: 'calc((1.36rem - max(24px, 1.5rem)) / 2)' }}>
                {boutonsPartage}
              </div>
            </div>
            {essai.sous_titre && (
              <p style={{ fontFamily: SERIF, fontSize: '0.8125rem', fontStyle: 'italic', color: 'var(--cs-texte-gris)', margin: '5px 0 0', lineHeight: 1.35 }}>{essai.sous_titre}</p>
            )}
            {essai.auteur_pseudo && (
              <p style={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.13em', textTransform: 'uppercase', color: 'var(--cs-vert)', margin: '10px 0 0', fontFamily: SANS }}>
                {essai.auteur_profil ? (
                  <button type="button" onClick={() => setProfilOuvert(true)} className="essai-nom-auteur" title={`Voir la fiche : ${essai.auteur_pseudo}`}
                    style={{ font: 'inherit', letterSpacing: 'inherit', textTransform: 'inherit', color: 'inherit', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}>
                    {essai.auteur_pseudo}
                  </button>
                ) : essai.auteur_pseudo}
                {essai.auteur_mecene && <>{' '}<MarqueMecene taille="1.1em" /></>}
              </p>
            )}
            <p style={{ fontSize: '0.6875rem', letterSpacing: '0.04em', color: 'var(--cs-texte-gris)', margin: '12px 0 0', fontFamily: SANS }}>Publié le {dateFormatee}</p>
            <p style={{ fontSize: '0.6875rem', color: 'var(--cs-texte-gris)', margin: '3px 0 0', fontFamily: SANS }}>Lu {nbVues} fois</p>
          </div>

          {sommaire.length > 0 && (
            <div style={{ borderTop: '1px solid var(--cs-fond-doux)', paddingTop: '14px' }}>
              <p style={{ ...STYLE_RUBRIQUE, margin: '0 0 9px' }}>Sommaire</p>
              <nav style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                {sommaire.map(s => (
                  <button key={s.id} onClick={() => allerAu(s.id)} className="cs-survol-encre"
                    style={{ textAlign: 'left', fontFamily: SERIF, fontSize: s.niveau === 2 ? '0.75rem' : '0.8125rem', fontStyle: s.niveau === 2 ? 'italic' : 'normal', '--repos-encre': s.niveau === 2 ? 'var(--cs-texte-second)' : 'var(--cs-texte)', '--survol-encre': 'var(--cs-vert)', background: 'none', border: 'none', padding: 0, paddingLeft: s.niveau === 2 ? '12px' : 0, cursor: 'pointer', lineHeight: 1.32 } as React.CSSProperties}>
                    {rendreTexteEnrichi(s.titre)}
                  </button>
                ))}
              </nav>
            </div>
          )}
        </aside>
      )}

      {/* Zone de lecture — scroll indépendant */}
      <div style={{ flex: 1, overflowY: mobile ? 'visible' : 'auto', minWidth: 0, paddingBottom: mobile ? '3.25rem' : undefined }}>
        <div style={{ maxWidth: '41.25rem', margin: '0 auto', padding: mobile ? '0 20px 80px' : '0 56px 80px' }}>

          {essai.statut === 'en_attente' && (
            <p style={{ fontSize: '0.71875rem', color: 'var(--cs-attente)', background: 'var(--cs-fond-clair)', border: '1px solid #e4c4a0', borderRadius: '8px', padding: '8px 12px', margin: '24px 0 0' }}>
              Cet essai est en attente de validation par l’administration — seul vous pouvez le voir ainsi.
            </p>
          )}
          {/* Charte § 52 : « à revoir » et « refusé » viennent de la modération. Le bandeau
              reprend son MOTIF (audit d'ergonomie du 2026-09-21) : l'apprendre ici et devoir
              le chercher ailleurs, c'était deux clics de trop pour l'essai qui demande une
              action. Un renvoi sans motif écrit le dit, au lieu de renvoyer à un vide. */}
          {(essai.statut === 'a_reviser' || essai.statut === 'refuse') && (
            <div role="status" style={{ fontSize: '0.75rem', lineHeight: 1.5, color: 'var(--cs-danger-fonce)', background: 'var(--cs-fond-clair)', border: '1px solid var(--cs-danger-bord)', borderRadius: '8px', padding: '10px 14px', margin: '24px 0 0' }}>
              <p style={{ margin: 0 }}>
                {essai.statut === 'a_reviser'
                  ? 'La modération vous a renvoyé cet essai pour qu’il soit revu.'
                  : 'La modération n’a pas retenu cet essai.'}
              </p>
              {essai.motif_moderation ? (
                <>
                  <p style={{ margin: '8px 0 2px', fontWeight: 600 }}>Motif de la modération&nbsp;:</p>
                  <p style={{ margin: 0, color: 'var(--cs-texte)', whiteSpace: 'pre-line' }}>{essai.motif_moderation}</p>
                </>
              ) : (
                <p style={{ margin: '6px 0 0', color: 'var(--cs-texte)' }}>
                  La modération n’a pas écrit de motif. Vous pouvez lui écrire par le <Link href="/contact" className="cs-lien-phrase">formulaire de contact</Link>.
                </p>
              )}
              {essai.statut === 'a_reviser' && (
                <p style={{ margin: '8px 0 0' }}>
                  <Link href={`/essais/${essai.id}/modifier`} className="cs-lien-phrase">Reprendre l’essai</Link>
                  {' '}puis soumettez-le de nouveau.
                </p>
              )}
            </div>
          )}

          {/* Page de titre — rapprochée du texte (moins de hauteur et de marge basse). */}
          <div style={{
            minHeight: '30vh', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            padding: '40px 24px 26px', borderBottom: '1px solid var(--cs-bord)',
            marginBottom: '26px', textAlign: 'center',
          }}>
            {essai.auteur_pseudo && (
              <p style={{ fontSize: '0.71875rem', fontWeight: 600, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--cs-vert)', marginBottom: '28px', fontFamily: SANS }}>
                {essai.auteur_pseudo}
                {essai.auteur_mecene && <>{' '}<MarqueMecene taille="1.1em" /></>}
              </p>
            )}
            <h1 style={{ fontFamily: SERIF, fontSize: 'clamp(1.625rem, 4vw, 2.375rem)', fontWeight: 'normal', color: 'var(--cs-encre-fonce)', lineHeight: 1.2, margin: '0 0 14px', maxWidth: '35rem' }}>
              {essai.titre}
            </h1>
            {essai.sous_titre && (
              <p style={{ fontFamily: SERIF, fontSize: 'clamp(0.9375rem, 2vw, 1.125rem)', fontStyle: 'italic', color: 'var(--cs-texte-gris)', margin: '0 0 24px', letterSpacing: '0.01em' }}>
                {essai.sous_titre}
              </p>
            )}
            <div style={{ width: '32px', height: '1px', background: 'var(--cs-bord)', marginBottom: '16px' }} />
            <p style={{ fontSize: '0.6875rem', letterSpacing: '0.06em', color: 'var(--cs-texte-gris)', marginBottom: '28px' }}>
              {dateFormatee}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
              <p style={{ fontSize: '0.6875rem', color: 'var(--cs-texte-gris)', letterSpacing: '0.04em', margin: 0, fontFamily: SANS }}>
                Cette publication a été lue {nbVues} fois
              </p>
              <button onClick={toggleApprecier} disabled={!userId}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.6875rem', color: aApprecie ? 'var(--cs-vert)' : 'var(--cs-texte-gris)', background: 'none', border: 'none', padding: 0, cursor: userId ? 'pointer' : 'default', fontFamily: SANS, letterSpacing: '0.03em' }}>
                <svg width="11" height="11" viewBox="0 0 12 12" fill={aApprecie ? 'currentColor' : 'none'} aria-hidden="true">
                  <path d="M6 11S1 7.5 1 4a2.5 2.5 0 0 1 5-.8A2.5 2.5 0 0 1 11 4c0 3.5-5 7-5 7z" stroke="currentColor" strokeWidth="1"/>
                </svg>
                {nbAppreciations > 0
                  ? `${chiffreEnLettres(nbAppreciations).charAt(0).toUpperCase() + chiffreEnLettres(nbAppreciations).slice(1)} personne${nbAppreciations > 1 ? 's aiment' : ' aime'} cette publication`
                  : 'Aucune appréciation'}
              </button>
              {favorisPret && (
                <EtoileFavori actif={favorisEssais.has(String(essai.id))} onToggle={() => toggleFavoriEssai(String(essai.id))} size={13}
                  title={favorisEssais.has(String(essai.id)) ? 'Retirer des favoris' : 'Ajouter aux favoris'} />
              )}
            </div>
          </div>

          {versetParse && (
            <div style={{ margin: '0 auto 52px', maxWidth: '26.25rem', textAlign: 'center' }}>
              <p style={{ fontFamily: SERIF, fontSize: '0.875rem', lineHeight: 1.8, color: 'var(--cs-texte)', fontStyle: 'italic', margin: '0 0 10px', letterSpacing: '0.01em' }}>
                {'« '}{rendreTexteEnrichi(versetParse.texte)}{' »'}
              </p>
              <p style={{ fontSize: '0.65625rem', letterSpacing: '0.1em', color: 'var(--cs-texte-second)', margin: 0, fontFamily: SANS, textTransform: 'uppercase' }}>
                {expanderRef(versetParse.ref)}
              </p>
            </div>
          )}

          <div className="essai-lecture-corps" style={{ fontSize: '0.875rem', color: 'var(--cs-texte-fort)', fontFamily: SERIF }}>
            {rendreEssai(essai.contenu)}
          </div>

        </div>
      </div>

      {/* Volet droit — ouvert */}
      {voletOuvert ? (
        <>
        {mobile && <div onClick={() => setVoletOuvert(false)} style={{ position: 'fixed', inset: 0, background: 'var(--cs-calque-modale)', zIndex: Z_TIROIR_VOILE }} />}
        <aside ref={refVolet} id="essai-volet-commentaires" role={mobile ? 'dialog' : undefined} aria-modal={mobile || undefined} aria-label="Commentaires"
          style={mobile
          ? { position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: Z_TIROIR, maxHeight: `calc(100dvh - ${HAUTEUR_NAVBAR} - 2rem)`, background: 'var(--cs-fond-clair)', borderTop: '1px solid var(--cs-bord)', display: 'flex', flexDirection: 'column', boxShadow: 'var(--cs-ombre-modale-haut)' }
          : { width: '18.75rem', flexShrink: 0, background: 'var(--cs-fond-clair)', borderLeft: '1px solid var(--cs-bord)', display: 'flex', flexDirection: 'column', height: '100%' }}>

          {/* Barre supérieure : fermer | titre | partager. ⚠️ Trois colonnes dont les
              deux bords sont à parts égales : le titre tient l'axe du volet quelle que
              soit la largeur des boutons qui l'encadrent (même règle que le chevron doublé). */}
          <div style={{ minHeight: '41px', padding: '6px 8px 6px 6px', borderBottom: '1px solid var(--cs-fond-doux)', flexShrink: 0, display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '6px' }}>
            {/* Le chevron de repli de tout le site (`.cs-volet-reduire`) : nommé, 24 px de
                cible sans que le glyphe bouge (la marge négative rend ce que le rembourrage
                ajoute). */}
            <button ref={refChevronVolet} onClick={() => setVoletOuvert(false)} title="Réduire le volet" aria-label="Réduire le volet"
              aria-expanded={true} aria-controls="essai-volet-commentaires" className="cs-volet-reduire"
              style={{ justifySelf: 'start', background: 'none', border: 'none', cursor: 'pointer', padding: '5px', margin: '-2px', display: 'flex', alignItems: 'center' }}>
              <IconeChevron dir="right" taille="0.875rem" strokeWidth={1.5} />
            </button>
            <span style={{ ...STYLE_RUBRIQUE, textAlign: 'center', whiteSpace: 'nowrap' }}>Commentaires</span>
            {/* En desktop, les actions vivent dans le volet gauche ; en mobile, ici. */}
            <div style={{ justifySelf: 'end', display: 'flex', gap: '4px', alignItems: 'center' }}>
              {mobile && boutonsPartage}
            </div>
          </div>

          {/* Commentaires — la liste défile, l'outil de rédaction reste ancré en bas. */}
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            <EssaiCommentaires idEssai={essai.id} />
          </div>
        </aside>
        </>
      ) : mobile ? (
        /* Volet droit — barre fixe en bas (mobile). La même barre que celle d'une
           œuvre : libellé centré, chevron doublé. */
        <BarreVoletMobile cote="bas" ouvert={false} libelle="Commentaires" titre="Ouvrir les commentaires"
          onBasculer={() => setVoletOuvert(true)} />
      ) : (
        /* Volet droit — réduit : le RAIL de tout le site (`RailVolet`), qui nomme l'action.
           Il valait vingt-deux pixels dessinés à la main et portait le nom du contenu
           (audit d'harmonie, 2026-09-23). Son fond est celui du volet qu'il remplace. */
        <RailVolet ref={refRailVolet} cote="droite" fond="clair" libelle="Ouvrir les commentaires" onOuvrir={() => setVoletOuvert(true)} />
      )}

      {signalerOuvert && (
        <ModalSignalement titre={`Publication\u00A0: ${essai.titre}`} avecNiveauImportance
          onClose={() => setSignalerOuvert(false)} onEnvoyer={envoyerSignalement} />
      )}

      {profilOuvert && essai.auteur_profil && (
        <ModaleProfilLecteur pseudo={essai.auteur_profil} onClose={() => setProfilOuvert(false)} />
      )}

      {ancrePartage && (
        <BullePartage
          sujet={{ genre: 'essai', titre: essai.titre, auteur: essai.anonyme ? null : essai.auteur_pseudo }}
          ancre={ancrePartage}
          onFermer={() => setAncrePartage(null)} />
      )}
    </div>
  )
}
