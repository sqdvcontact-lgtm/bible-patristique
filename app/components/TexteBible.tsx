'use client'
import { ABREV_FR, estLivreNonCanonique } from '@/app/lib/bible'
import MarqueNonCanonique from '@/app/components/MarqueNonCanonique'

import { Fragment, useState, useEffect, useMemo, useRef } from 'react'
import dynamic from 'next/dynamic'
import { useSearchParams } from 'next/navigation'
import { amenerAuCentre, annoncerReprise, ATTRIBUT_BARRE_LECTURE, poserEnHaut, positionDuDefileur, terminerReprise } from '@/app/lib/defilementLecture'
import { lireRepere, PARAMETRE_REPERE } from '@/app/lib/repriseLecture'
import { texteLisible899, texteLisibleModerne899 } from '@/app/lib/texteLisible899'
import { cesurerSelonLangue, useLangueBible } from '@/app/lib/langueBible'
import { copierSansCesures } from '@/app/lib/grec'
import { EclatEchec, STYLE_HOTE_ECHEC, useEclatEchec } from '@/app/components/EclatEchec'
import LassoTactile from '@/app/components/LassoTactile'
import { useNaviguer } from '@/app/lib/attenteNavigation'
import { supabase } from "@/app/lib/supabase"
import { useAffichageAdmin } from "@/app/lib/contexteAffichageAdmin"
import { useCompte } from "@/app/lib/contexteCompte"
import { useEstMobile, useSansSurvol } from "@/app/lib/useEstMobile"
import { POINTS_DE_RUPTURE } from '@/app/lib/pointsDeRupture'
import { citationBiblique, copierCitation, type CitationRendue } from "@/app/lib/citation"
import { canonIdDeLigne, cleVersetPreleve, codeDeTraduction, prelevementDuVerset, usePrelevementsDuChapitre } from "@/app/lib/prelevementsBibliques"
import { libelleNumeroVerset } from "@/app/lib/libelleVerset"
export { libelleNumeroVerset }
import {
  compterDejaPreleves, copierLeLasso, enregistrerLeLasso, retirerDuLasso,
  type ContexteDuLasso, type PassageDuLasso,
} from "@/app/lib/prelevementsLasso"
import { UNITE_VERSETS } from "@/app/lib/selectionPassages"
import LassoLecture from '@/app/components/LassoLecture'
import { rendreTexteEnrichi } from '@/app/oeuvre/[id]/texteEnrichi'


import IconeSignet from '@/app/components/IconeSignet'
import IconeCopier from '@/app/components/IconeCopier'
import { avecHoteEclat, EclatCopie, useEclatCopie } from '@/app/components/EclatCopie'
import IconeCrayon from '@/app/components/IconeCrayon'
import IconeSignalement from '@/app/components/IconeSignalement'
import IconePolyglotte from '@/app/components/IconePolyglotte'
import IconeFacsimile from '@/app/components/IconeFacsimile'
import { Bulle } from '@/app/components/Bulle'
import FleuronDiscret from '@/app/components/FleuronDiscret'
import { rendreEnrichi } from '@/app/lib/enrichissements'
import { STYLE_BOUTON_ACTION } from '@/app/lib/celluleActions'
// ⛔ Les fenêtres ne se chargent qu'au CLIC (2026-09-22) : le fac-similé, le signalement,
// l'édition d'un verset n'ont rien à peser sur la lecture tant qu'on ne les ouvre pas.
const ModaleFacsimile899 = dynamic(() => import('@/app/components/ModaleFacsimile899'), { ssr: false })
const ModalSignalement = dynamic(() => import('@/app/components/ModalSignalement'), { ssr: false })
const ModaleEditionVerset = dynamic(() => import('@/app/components/ModaleEditionVerset'), { ssr: false })
import { BANDEAU_NAV_MOBILE } from '@/app/lib/mesures'
import { fondreAppelsDansLaMarque, marquerLacunesDuTemoin, rendreMarqueurs899 } from '@/app/lib/marqueurs899'
import { estTraductionModerne899 } from '@/app/lib/bible899'
import {
  marqueDensiteTient, styleDensiteVerset,
  STYLE_LACUNE, STYLE_NUMERO_ALTERNATIF, STYLE_NUMERO_VERSET, STYLE_SIGNET_VERSET, STYLE_VERSET_VIDE,
  styleAxeTexte, styleBlocVerset, styleGrilleRangee, styleRangeeVerset, styleTexteVerset,
  BLANC_TITRE_MENU, GOUTTIERE_ACTIONS_VERSET, INTERLIGNE_TITRE_CHAPITRE, RETRAIT_ACTIONS_VERSET,
} from '@/app/lib/compositionBible'
import {
  libelleDensiteVerset, type DensiteVerset,
} from '@/app/lib/densitePatristique'
import { hauteurNavbarPx, tailleRacinePx } from '@/app/lib/fenetreContextuelle'
import SelecteurTraductionBible from '@/app/components/SelecteurTraductionBible'
import FlecheChapitre, { type CibleChapitre } from '@/app/components/FlecheChapitre'
import NavigationBasChapitre from '@/app/components/NavigationBasChapitre'
import { BlocEditorialBible, figuresDeLaNote, IllustrationBible, PieceLiminaire } from '@/app/components/BibleEditionParatext'
import { estSuiteDuBloc } from '@/app/lib/bibleHierarchieSemantique'
import AppelNoteBiblique from '@/app/components/NoteBibliqueFenetre'
import { rendreTexteAvecAppels, repartirAppels } from '@/app/lib/ancresAppelsBible'
import { separateurAppels, styleSeparateurAppels } from '@/app/lib/appelsDeNote'
import { lirePlageVersets, placeCanoniqueDuVerset, urlPolyglotte } from '@/app/lib/bibleNavigation'
import type { PieceLiminaireAffichee } from '@/app/components/BibleLayout'
import { signalerProgression } from '@/app/components/AnnonceHautsFaits'
import { activerAuClavier } from '@/app/lib/activerAuClavier'
import {
  indexerBlocsDeCorps,
  habillerLesVignettes,
  indexerIllustrations,
  type BibleEditionChapterDisplay,
  type BibleEditionDisplayAsset,
  type BibleEditionDisplayBodyBlock,
  type BibleEditionDisplayNote,
} from '@/app/lib/bibleEdition'
import { SERIF } from '@/app/lib/polices'

// ⛔ Le gabarit vient du module partagé : un bouton d'action a la même boîte sur les
// cinq surfaces, qu'il vive dans la gouttière d'un verset, dans le pavé flottant du
// doigt ou dans la cellule d'actions d'un segment.
const VERSET_ACTION_BTN = STYLE_BOUTON_ACTION

/** La ligne qui dit où en est la recherche des bibles d'un livre absent : la mesure de la
 *  liste qui la remplacera, pour que rien ne saute quand elle arrive. */
const STYLE_ETAT_RECHERCHE: React.CSSProperties = {
  margin: 0, maxWidth: '21.25rem', textAlign: 'center', textWrap: 'balance',
  fontFamily: SERIF, fontSize: '0.8125rem', lineHeight: 1.6,
  color: 'var(--cs-texte-second)',
}

/** Le LIVRE ABSENT se compose comme une petite page de titre (demande de l'auteur,
 *  2026-09-23) : le nom de la bible en titre, ce qu'il en est en mention, un fleuron qui
 *  sépare le constat de l'issue, puis les bibles qui donnent le livre. Le tout sur l'axe
 *  du texte, comme le titre du chapitre et la mention d'une lacune. */
const STYLE_LIVRE_ABSENT: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
  minHeight: '50vh', padding: '15vh 16px 0',
}
const STYLE_ABSENT_NOM: React.CSSProperties = {
  margin: 0, maxWidth: '24rem', textWrap: 'balance',
  fontFamily: SERIF, fontSize: '1.125rem', lineHeight: 1.3,
  color: 'var(--cs-encre)',
}
const STYLE_ABSENT_MENTION: React.CSSProperties = {
  margin: '0.3125rem 0 0',
  fontFamily: SERIF, fontSize: '0.9375rem', fontStyle: 'italic',
  letterSpacing: '0.02em', lineHeight: 1.4, color: 'var(--cs-mention)',
}
const STYLE_ABSENT_FLEURON: React.CSSProperties = { display: 'flex', justifyContent: 'center', margin: '1.375rem 0 1.25rem' }
const STYLE_ABSENT_ISSUE: React.CSSProperties = {
  margin: '0 0 0.375rem',
  fontFamily: SERIF, fontSize: '0.8125rem', fontStyle: 'italic',
  lineHeight: 1.4, color: 'var(--cs-texte-second)',
}
const STYLE_ABSENT_LISTE: React.CSSProperties = {
  listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.1875rem',
  fontFamily: SERIF, fontSize: '0.9375rem', lineHeight: 1.45,
}

/** La reprise de lecture (`repere=N`) : combien de temps la page s'abstient de retenir une
 *  place, et quand le verset se repose tant que le lecteur n'a pas bougé. */
const DUREE_REPRISE_MS = 1800
const REPOSES_REPRISE_MS = [120, 350, 700, 1200] as const

type Verset = {
  id_verset: string; ref: string; livre: string
  chapitre: number; verset: number
  chapitre_alternatif?: number | null; verset_alternatif?: number | null
  // Marqueurs des adaptateurs éditoriaux ; Bible 899 ajoute son statut de lacune.
  _est899?: boolean; _estEditorial?: boolean; _estLacune?: boolean
  [traduction: string]: string | number | boolean | null | undefined
}

/** `langue` : celle de `traductions.langue`, quand la page la passe. À défaut, la page la
 *  lit une fois par session (`useLangueBible`). */
type Traduction = { code: string; label: string; langue?: string | null }

type Props = {
  versets: Verset[]
  /** Rangs de titre que l'édition ne rend pas (réglage d'administration). */
  titresMasques?: readonly string[]
  traduction: string
  traductionIndex: number
  setTraductionIndex: (i: number) => void
  /** Ouvrir une famille en regard depuis le menu central (voir `ListeMenuBibles`). */
  choisirEnRegard?: (index: number) => void
  traductions: Traduction[]
  livreActif: string
  chapitreActif: number
  nomLivre: string
  versetSelectionne: Verset | null
  setVersetSelectionne: (v: Verset | null) => void
  /** Combien d’ŒUVRES parlent de chaque verset du chapitre. Vient de la page, qui la
   *  charge une fois : la barre d’onglets du doigt en a besoin autant que la marge. */
  densites: ReadonlyMap<string, DensiteVerset>
  mobile?: boolean
  /** Appareil de l’édition : introductions, commentaires, notes, illustrations.
   *  Nul en lecture « Texte biblique seul » — la page ne le charge alors pas. */
  editionChapter?: BibleEditionChapterDisplay | null
  /** Les notes des VERSETS (`versets_v2.notes`), rangées par bible (charte § 13.22). Toutes
   *  les colonnes de la vue large y sont : l'échange de colonne en mémoire garde les siennes. */
  notesDesVersets?: Readonly<Record<string, readonly BibleEditionDisplayNote[]>> | null
  /** Pièce liminaire de l'édition, lue SEULE : elle remplace le chapitre. */
  pieceAffichee?: PieceLiminaireAffichee | null
  /** Les chapitres voisins, adresses composées par la page (`chapitreVoisin`) : au bout
   *  d'un livre, le livre voisin ; `null` à une borne réelle. */
  voisins?: { precedent: CibleChapitre | null; suivant: CibleChapitre | null; position?: { actuel: number; total: number } | null }
  /** Les bibles qui portent ce livre quand la bible lue ne le porte pas (audit
   *  ergonomique, 2026-09-21) ; `null` tant qu'on cherche, ou hors de ce cas. */
  biblesDuLivreAbsent?: readonly BiblePorteuse[] | null
  onChoisirBible?: (code: string) => void
  /** Où en est la recherche de ces bibles : `en-cours` tant qu'on cherche, `echec` quand
   *  elle n'a pas pu se faire (ce n'est PAS « aucune bible ne le donne »), `faite` sinon. */
  rechercheBiblesAbsent?: EtatRechercheBibles | null
  onReessayerBiblesAbsent?: () => void
}

/** L'état de la recherche des bibles qui portent un livre absent. */
export type EtatRechercheBibles = 'en-cours' | 'echec' | 'faite'

/** La bible lue ne porte rien de ce chapitre. ⛔ Une seule écriture : la page
 *  (`BibleLayout`) la relit pour aller chercher les bibles qui portent le livre. */
export function texteAbsentDuChapitre(versets: readonly object[], traduction: string): boolean {
  return versets.length === 0 || versets.every(v => {
    const l = v as Record<string, unknown>
    return !l[traduction] && l._est899 !== true
  })
}

/** Une bible qui porte le livre que la bible lue n'a pas : son nom, et l'adresse de ce
 *  chapitre dans elle. La page les compose ; le texte ne fait que les offrir. */
export type BiblePorteuse = { code: string; label: string; href: string }

// ── Bouton copie ──────────────────────────────────────────────────────────────
function BoutonCopie({ citation, numero }: { citation: CitationRendue; numero: number }) {
  const { copie, eclat, briller } = useEclatCopie()
  const { echec, signaler } = useEclatEchec()
  const handle = (e: React.MouseEvent) => {
    e.stopPropagation()
    // ⛔ Un échec du presse-papiers (permission refusée, page hors foyer) se DIT : il
    // passait en silence, et le lecteur croyait avoir copié.
    const presse = typeof navigator !== 'undefined' ? navigator.clipboard : undefined
    if (!presse) { signaler('La copie a échoué.'); return }
    // ⚠️ `copierCitation` porte les DEUX formes : sans elle, le verset emportait les
    // balises d'italique de Sacy en clair dans le document du lecteur.
    copierCitation(citation).then(briller, (erreur: unknown) => {
      console.error('[copie] verset', erreur)
      signaler('La copie a échoué.')
    })
  }
  return (
    <Bulle texte={echec ? 'La copie a échoué' : 'Copier ce verset'} position="left">
    <button onClick={handle} className={avecHoteEclat('bouton-action-verset')}
      style={{ ...VERSET_ACTION_BTN, opacity:0, color: echec ? 'var(--cs-danger)' : copie ? 'var(--cs-vert)' : 'var(--cs-bord)', ...(echec ? STYLE_HOTE_ECHEC : null) }}
      aria-label={`Copier le verset ${numero}`}>
      {/* ⚠️ Le glyphe vient d'`IconeCopier` : la VISITE le reproduit dans son
          illustration, et les deux ne doivent pas diverger. ⛔ Il ne cède plus la place
          à un ✓ : l'accusé est un ÉCLAT, posé par-dessus lui. */}
      <IconeCopier />
      {echec ? <EclatEchec echec={echec} /> : <EclatCopie eclat={eclat} />}
    </button>
    </Bulle>
  )
}

// ── Modale signalement ────────────────────────────────────────────────────────
// Composant partagé unique (voir app/components/ModalSignalement), importé en tête.

// « GEN 1:1 » (référence canonique interne) → « Gn 1, 1 » (forme française attendue partout
// sur le site : abréviation française, virgule entre chapitre et verset).
function refFrBible(ref: string): string {
  const p = ref.trim().split(' ')
  if (p.length < 2) return ref
  const cv = p[1].split(':')
  const abr = ABREV_FR[p[0]] ?? p[0]
  return cv[1] ? `${abr} ${cv[0]}, ${cv[1]}` : `${abr} ${cv[0]}`
}

function BoutonSignaler({ versetId, versetRef, texte }: { versetId: string; versetRef?: string; texte?: string }) {
  const [ouvert, setOuvert] = useState(false)
  const { exigerCompte } = useCompte()
  const envoyer = async (msg: string, importance?: string) => {
    const { data } = await supabase.auth.getSession()
    const headers: HeadersInit = { 'Content-Type': 'application/json' }
    const token = data.session?.access_token
    if (token) headers.Authorization = `Bearer ${token}`
    const res = await fetch('/api/signalements', {
      method: 'POST',
      headers,
      // ⚠️ Une ligne RECOMPOSÉE (Bible du XIIIe siècle, segmentation éditoriale) porte un
      // identifiant synthétique (« 899:GEN.29.3 ») que la route refuse : elle part alors
      // par sa RÉFÉRENCE, consignée en tête du message, comme depuis la Polyglotte.
      body: JSON.stringify(/^[A-Z0-9.]{2,20}$/.test(versetId)
        ? { id_verset: versetId, message: msg, importance, url_source: window.location.href }
        : { reference: versetRef ? refFrBible(versetRef) : versetId, message: msg, importance, url_source: window.location.href }),
    })
    if (!res.ok) {
      const details = await res.json().catch(() => null)
      throw new Error(details?.error ?? "Erreur d'envoi du signalement")
    }
  }
  const ref = versetRef ? refFrBible(versetRef) : versetId
  return (
    <>
      <Bulle texte="Signaler une erreur" position="left">
        <button onClick={e => { e.stopPropagation(); if (exigerCompte('signaler une erreur')) setOuvert(true) }}
          className="bouton-action-verset"
          aria-label={`Signaler une erreur dans ${ref}`}
          style={{ ...VERSET_ACTION_BTN, opacity:0, color:'var(--cs-bord)' }}>
          <IconeSignalement />
        </button>
      </Bulle>
      {ouvert && <ModalSignalement titre={ref} texteObjet={texte} avecNiveauImportance onClose={() => setOuvert(false)} onEnvoyer={envoyer} />}
    </>
  )
}

// ── Bouton « Voir dans la Polyglotte » ──
// Un lien, non un geste : il ouvre la Polyglotte sur le même verset du CANON, qui s'y
// désigne et s'y marque en vert (voir placePolyglotteDemandee). ⛔ Dans une NOUVELLE
// fenêtre, par défaut (demande de l'auteur, 2026-09-20) : on bascule sans perdre
// l'endroit où l'on lisait.
function BoutonPolyglotte({ href }: { href: string }) {
  return (
    <Bulle texte="Voir dans la Polyglotte (nouvel onglet)" position="left">
      <a href={href} target="_blank" rel="noopener" onClick={e => e.stopPropagation()}
        className="bouton-action-verset" aria-label="Voir ce verset dans la Polyglotte (nouvel onglet)"
        style={{ ...VERSET_ACTION_BTN, opacity:0, color:'var(--cs-bord)' }}>
        <IconePolyglotte />
      </a>
    </Bulle>
  )
}

// ── Bouton « Voir le manuscrit » ──
// Seuls les versets de la Bible du XIIIe siècle qui savent où ils commencent dans le
// témoin le portent (`_facsDebut899`, posé par le chargeur). La fenêtre ne se monte
// qu'au clic, et c'est elle qui charge la table des colonnes puis l'image.
function BoutonFacsimile({ reference, debut, fin }: { reference: string; debut: string; fin: string | null }) {
  const [ouvert, setOuvert] = useState(false)
  return (
    <>
      <Bulle texte="Voir le manuscrit" position="left">
        <button type="button" onClick={e => { e.stopPropagation(); setOuvert(true) }}
          className="bouton-action-verset" aria-label={`Voir ${reference} dans le manuscrit`}
          style={{ ...VERSET_ACTION_BTN, opacity:0, color:'var(--cs-bord)' }}>
          <IconeFacsimile />
        </button>
      </Bulle>
      {ouvert && <ModaleFacsimile899 reference={reference} repereDebut={debut} repereFin={fin} onFermer={() => setOuvert(false)} />}
    </>
  )
}

// ── Bouton enregistrer ────────────────────────────────────────────────────────
function BoutonEnregistrer({
  verset, texte, nomLivre, livreActif, chapitreActif, userId,
  traductionLabel, trad, canonId, dejaSauvegarde, idPrelevement, onSauvegarde, onSupprimer,
}: {
  verset: Verset
  /** Le texte tel que la page le montre, corrections de l'administrateur comprises
   *  (`texteDuVerset`) : c'est lui qu'on met de côté, comme la copie et le lasso. */
  texte: string
  nomLivre: string; livreActif: string
  chapitreActif: number; userId: string
  traductionLabel: string
  /** Le CODE de la traduction lue (`prelevements.trad_id`) : le prélèvement est celui de
   *  CETTE bible, et le signet des autres ne se remplit pas (2026-09-23). */
  trad: string | null
  /** Le créneau canonique de la ligne (« DAN.13.44+ »), ce qui distingue le verset
   *  « 8 » de la ligne propre à une édition « 8+ » (voir `prelevementsBibliques`). */
  canonId: string | null
  dejaSauvegarde: boolean; idPrelevement: string | null
  onSauvegarde: (id: string) => void; onSupprimer: () => void
}) {
  const [loading, setLoading] = useState(false)
  const { exigerCompte } = useCompte()
  const { echec, signaler } = useEclatEchec()
  const styleEchec = echec ? STYLE_HOTE_ECHEC : null

  if (dejaSauvegarde) {
    const supprimer = async (e: React.MouseEvent) => {
      e.stopPropagation()
      if (!idPrelevement) return
      setLoading(true)
      // ⛔ L'erreur se LIT : un retrait refusé laisse le signet plein, et le dit.
      const { error } = await supabase.from('prelevements').delete().eq('id', idPrelevement).eq('user_id', userId)
      setLoading(false)
      if (error) {
        console.error('[prélèvements] retrait', error)
        signaler('Le retrait a échoué. Réessayez.')
        return
      }
      onSupprimer()
    }
    return (
      /* ⛔ Le signet PLEIN ne paraît plus qu'au survol, comme ses voisins (décision de
         l'auteur, 21 septembre 2026). L'état se dit désormais à gauche du numéro, par
         une petite marque discrète (`STYLE_SIGNET_VERSET`), qui ne pèse pas sur la
         colonne d'actions. Au doigt, le pavé montre ses boutons pleins, comme avant.
         Même encre grise que la marque (reprise du 21 septembre 2026). */
      <Bulle texte={echec ? 'Le retrait a échoué' : 'Retirer de mes prélèvements'} position="left">
        <button onClick={supprimer} disabled={loading}
          className={avecHoteEclat('bouton-action-verset')}
          style={{ ...VERSET_ACTION_BTN, opacity:0, color: echec ? 'var(--cs-danger)' : 'var(--cs-texte-doux)', ...styleEchec }}
          aria-label={`Retirer le verset ${verset.verset} de mes prélèvements`}>
          {loading ? '…' : <IconeSignet plein />}
          <EclatEchec echec={echec} />
        </button>
      </Bulle>
    )
  }

  const enregistrer = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!exigerCompte('prélever ce verset')) return
    setLoading(true)
    const abr = ABREV_FR[livreActif] || livreActif
    const { data, error } = await supabase.from('prelevements').insert({
      user_id: userId, type: 'biblique',
      ref_livre: nomLivre, ref_livre_abr: abr,
      ref_chapitre: chapitreActif, ref_verset: verset.verset,
      canon_id: canonId,
      texte, traduction: traductionLabel, trad_id: trad,
    }).select('id').single()
    setLoading(false)
    // ⛔ L'erreur se LIT : un prélèvement refusé laisse le signet vide, et le dit.
    if (error || !data) {
      console.error('[prélèvements] ajout', error)
      signaler('Le prélèvement a échoué. Réessayez.')
      return
    }
    onSauvegarde(data.id)
    signalerProgression()
  }

  return (
    <Bulle texte={echec ? 'Le prélèvement a échoué' : 'Ajouter à mes prélèvements'} position="left">
      <button onClick={enregistrer} disabled={loading}
        className={avecHoteEclat('bouton-action-verset')}
        style={{ ...VERSET_ACTION_BTN, opacity:0, color: echec ? 'var(--cs-danger)' : 'var(--cs-bord)', ...styleEchec }}
        aria-label={`Ajouter le verset ${verset.verset} (${traductionLabel}) à mes prélèvements`}>
        {loading ? '…' : <IconeSignet />}
        <EclatEchec echec={echec} />
      </button>
    </Bulle>
  )
}

// ── LE COMPTEUR DE LECTURES ───────────────────────────────────────────────────
// ⛔ LE COMPTEUR NE COMPTE QUE LES LECTEURS CONNECTÉS (décision de l'auteur,
// 2026-09-22) : un visiteur sans compte n'appelle pas la route du tout. Elle exige
// une session depuis l'audit du même jour et répondrait 401.
// ⛔ ET UNE LECTURE NE SE COMPTE QU'UNE FOIS PAR SESSION : la route dédoublonne en
// base sur vingt-quatre heures, mais chaque sélection de verset partait quand même,
// si bien qu'un aller-retour entre deux versets en envoyait autant que de clics. La
// mémoire vit au niveau du MODULE : elle survit au remontage du composant qu'un
// changement de chapitre provoque.
const LECTURES_ENVOYEES = new Set<string>()


// ── Composant principal ───────────────────────────────────────────────────────
export default function TexteBible({
  titresMasques, versets, traduction, traductionIndex, setTraductionIndex, choisirEnRegard, traductions,
  livreActif, chapitreActif, nomLivre,
  versetSelectionne, setVersetSelectionne, densites, mobile = false,
  editionChapter, notesDesVersets = null, pieceAffichee = null,
  voisins = { precedent: null, suivant: null },
  biblesDuLivreAbsent = null, onChoisirBible,
  rechercheBiblesAbsent = null, onReessayerBiblesAbsent,
}: Props) {
  // Session et droits : lus dans le contexte partagé, jamais redemandés ici. Ce
  // composant tenait son propre abonnement d'authentification et sa propre lecture
  // de `profils.est_admin`, l'une et l'autre en double, et les réinstallait à chaque
  // changement de chapitre.
  const { userId, estAdmin, exigerCompte } = useCompte()
  // ⛔ L'axe du lasso est la CAPACITÉ du pointeur : au doigt, glisser fait défiler.
  const sansSurvol = useSansSurvol()
  // ⛔ La Polyglotte n'offre sous 820 px qu'un message « écran large requis » : le
  // bouton qui y mène ne se propose donc pas sur un écran si étroit (audit
  // ergonomique, 2026-09-21). Seuil de la page elle-même, non celui du téléphone.
  const polyglotteTropEtroite = useEstMobile(POINTS_DE_RUPTURE.tablette)
  const [editionCible, setEditionCible] = useState<Verset | null>(null)
  const [overrides, setOverrides] = useState<Record<string, Partial<Record<string, string>>>>({})
  // ⛔ Le chargement des prélèvements du chapitre vit dans `prelevementsBibliques.ts` : la
  // lecture en regard le partage, et deux copies divergeraient au premier réglage.
  // ⛔ La liste est attachée à sa clé (lecteur, livre, chapitre) : elle se montre vide dès
  // que la clé change, et une réponse d'enregistrement arrivée APRÈS un changement de
  // chapitre ne s'inscrit nulle part (`modifierPrelevementsPour`, avec la clé retenue au
  // départ du geste).
  const [sauvegardes, , clePrelevementsCourante, modifierPrelevementsPour] = usePrelevementsDuChapitre(userId, livreActif, chapitreActif)
  const searchParams = useSearchParams()
  // Le clic est ACQUITTÉ : la navigation passe par la provision d'attente, qui
  // allume la marque au centre de la lecture tant que la page se prépare.
  const naviguer = useNaviguer()
  const { modeUtilisateurStandard } = useAffichageAdmin()

  // Mobile : les boutons d'action encombreraient la marge droite d'un écran
  // étroit. On les masque, et un simple tap sur le verset fait surgir un pavé
  // flottant. `actionsMobileId` = verset dont les actions sont visibles.
  const [actionsMobileId, setActionsMobileId] = useState<string | null>(null)
  // Le pavé se pose au-dessus du verset, sauf quand ce verset touche les onglets
  // fixes du haut (barre de navigation + « Livres | Texte | Commentaires ») : posé
  // au-dessus, il passerait dessous, et ses boutons seraient couverts. Il descend
  // alors sous le verset. Mesuré au tap : la place ne change qu'en défilant.
  const [actionsDessous, setActionsDessous] = useState(false)

  // ⛔ LE PAVÉ SE FERME PAR TOUT CE QUI DIT « JE PASSE À AUTRE CHOSE » (audit du
  // 2026-09-22). Il ne se refermait qu'en RETOUCHANT le même verset : un tap à côté, un
  // défilement, Échap le laissaient ouvert, posé sur la ligne du dessus, et le lecteur
  // n'avait aucun moyen de s'en défaire sans revenir à son point de départ.
  // ⚠️ Un tap sur une AUTRE rangée n'est pas traité ici : la rangée elle-même ouvre son
  // propre pavé, et fermer d'abord ferait clignoter le pavé entre les deux.
  useEffect(() => {
    if (!actionsMobileId) return
    const fermer = () => { setActionsMobileId(null); setVersetSelectionne(null) }
    const dehors = (e: PointerEvent) => {
      const cible = e.target instanceof Element ? e.target : null
      // La barre du lasso vit hors des rangées : la toucher n'est pas « passer à autre chose ».
      if (cible?.closest('.verset-row, .verset-actions, .cs-lasso-barre')) return
      // ⛔ LA BARRE D'ONGLETS AGIT SUR LE VERSET CHOISI, elle ne le quitte pas (relevé de
      // l'auteur, 2026-09-23 : « quand je clique sur un verset et que je veux ensuite
      // cliquer sur Pères, le verset se déselectionne, et Pères affiche l'intégralité des
      // commentaires du livre »). L'onglet « Pères » ouvre précisément l'apparat DU verset
      // qu'on vient de choisir : le toucher n'est pas passer à autre chose, c'est s'en
      // servir. Le pavé d'actions se referme — il recouvre la ligne, et l'onglet va
      // prendre l'écran — mais le CHOIX demeure.
      // ⚠️ Le pavé fermé, cet effet se démonte et ses écoutes partent avec lui : le
      // défilement que provoquera le changement d'onglet n'a donc plus personne pour
      // l'entendre, et c'est ce qui défaisait le choix par l'autre bout.
      if (cible?.closest(`[${ATTRIBUT_BARRE_LECTURE}]`)) { setActionsMobileId(null); return }
      fermer()
    }
    const auClavier = (e: KeyboardEvent) => { if (e.key === 'Escape') fermer() }
    // ⚠️ En CAPTURE : un défilement ne remonte pas, mais il descend, et c'est le seul moyen
    // d'entendre le défileur interne de la colonne comme celui de la page.
    window.addEventListener('pointerdown', dehors, true)
    window.addEventListener('scroll', fermer, { capture: true, passive: true })
    window.addEventListener('keydown', auClavier)
    return () => {
      window.removeEventListener('pointerdown', dehors, true)
      window.removeEventListener('scroll', fermer, true)
      window.removeEventListener('keydown', auClavier)
    }
  }, [actionsMobileId, setVersetSelectionne])

  // ── OÙ LES PÈRES PARLENT ───────────────────────────────────────────────────
  // 37 % du canon porte un renvoi patristique, et la page n'en laissait rien voir : on
  // cliquait un verset et l'on découvrait, ou non. Une marque discrète dit combien
  // d'ŒUVRES en parlent — c'est ce que le volet de droite ouvrira, et c'est le seul
  // compte qui ne vaille jamais zéro quand il y a quelque chose.
  // ⚠️ Le chapitre est chargé PAR LA PAGE (voir BibleLayout) depuis le 20 septembre 2026 :
  // au doigt, l'onglet « Commentaires » porte le même compte pour le verset choisi, et
  // deux enfants ne demandent pas deux fois le même fait à la base.

  // ⛔ LA MARQUE NE SE REND QUE SI ELLE TIENT À DROITE DES ACTIONS (décision de l'auteur,
  // 2026-09-13 : « quand la largeur de l'écran le permet »). La place se mesure sur la
  // ZONE de lecture, que les volets rétrécissent sans que la fenêtre bouge : voir
  // marqueDensiteTient (compositionBible). Une seule rangée suffit, toutes portant les
  // mêmes boutons ; ce qui en change le nombre (session, administration) relance la mesure.
  const refDefileur = useRef<HTMLDivElement>(null)
  const [densiteTient, setDensiteTient] = useState(false)
  const nbVersets = versets.length
  const piecePosee = !!pieceAffichee
  useEffect(() => {
    if (mobile) return
    const defileur = refDefileur.current
    if (!defileur) return
    const mesurer = () => {
      const colonne = defileur.querySelector<HTMLElement>('.cs-lecture-colonne')
      const actions = defileur.querySelector<HTMLElement>('.verset-actions')
      if (!colonne || !actions) return
      const zone = colonne.getBoundingClientRect()
      // ⚠️ Une largeur NULLE ne se juge pas : un onglet caché rend zéro partout.
      if (zone.width <= 0) return
      // Le bord de la zone : la colonne est centrée par ses marges automatiques, que le
      // navigateur rend en pixels. ⛔ Ni la largeur cliente ni le bord client du défileur :
      // la gouttière de sa barre de défilement est réservée des deux côtés.
      const bordDeLaZone = zone.right + (Number.parseFloat(getComputedStyle(colonne).marginRight) || 0)
      // La fin des actions : le dernier bouton, ou le rembourrage de la gouttière quand la
      // ligne n'en porte aucun (lignes recomposées d'une édition). ⛔ Jamais la marque
      // elle-même, dont le prédicat décide.
      let finDesActions = actions.getBoundingClientRect().left
        + (Number.parseFloat(getComputedStyle(actions).paddingLeft) || 0)
      for (const bouton of Array.from(actions.querySelectorAll<HTMLElement>('.bouton-action-verset'))) {
        finDesActions = Math.max(finDesActions, bouton.getBoundingClientRect().right)
      }
      setDensiteTient(marqueDensiteTient({ finDesActions, bordDeLaZone, racine: tailleRacinePx() }))
    }
    // ⚠️ Le premier rappel de l'observateur fait la première mesure, après la mise en
    // page : aucun état ne se pose dans le corps de l'effet.
    const ro = new ResizeObserver(mesurer)
    ro.observe(defileur)
    return () => ro.disconnect()
  }, [mobile, nbVersets, traduction, livreActif, chapitreActif, userId, estAdmin, modeUtilisateurStandard, piecePosee])

  // Le verset retenu, lu par l'effet ci-dessous sans en être une dépendance : c'est la
  // page qui écrit `&verset=N` quand on retient un verset (`BibleLayout`), et l'adresse
  // qui change alors ne doit ni reposer la sélection ni faire défiler la colonne.
  const versetRetenuRef = useRef(versetSelectionne)
  useEffect(() => { versetRetenuRef.current = versetSelectionne }, [versetSelectionne])

  // ── UNE PLAGE DEMANDÉE PAR L'ADRESSE (audit ergonomique du 2026-09-21) ──
  // `verset=3-12` : toute la plage est surlignée, rien n'est retenu (le volet des Pères
  // garde le chapitre), et la colonne défile au premier verset. Retenir ensuite un
  // verset réécrit l'adresse (`BibleLayout`), et la plage s'éteint d'elle-même.
  const plageDemandee = lirePlageVersets(searchParams.get('verset'))
  const plageSurlignee = plageDemandee && plageDemandee.fin > plageDemandee.debut ? plageDemandee : null

  // ⛔ LE DÉFILEMENT VERS LE VERSET VISÉ EST DOUX QUAND LE CHAPITRE EST DÉJÀ À L'ÉCRAN
  // (l'auteur veut voir l'effet), et SAUTE quand on arrive sur la page ou sur un autre
  // chapitre (il n'y a rien à suivre des yeux). Il passe par `amenerAuCentre`, qui vérifie
  // que le glissement a eu lieu (charte, « Défilement doux ») et mesure le défileur de la
  // colonne, non la fenêtre. Le minuteur est retiré au démontage.
  const chapitreDejaAffiche = useRef<string | null>(null)
  const cleChapitreAffiche = `${livreActif}|${chapitreActif}`
  useEffect(() => {
    const doux = chapitreDejaAffiche.current === cleChapitreAffiche
    chapitreDejaAffiche.current = cleChapitreAffiche
    const plage = lirePlageVersets(searchParams.get('verset'))
    if (!plage) return
    const num = plage.debut
    let annulerDefilement: () => void = () => {}
    const minuteur = window.setTimeout(() => {
      const el = document.getElementById(`verset-${num}`)
      if (el) annulerDefilement = amenerAuCentre(el, { doux })
    }, doux ? 0 : 200)
    const nettoyer = () => { window.clearTimeout(minuteur); annulerDefilement() }
    if (plage.fin > plage.debut) return nettoyer
    if (versetRetenuRef.current?.verset === num) { nettoyer(); return }
    const v = versets.find(v => v.verset === num)
    if (v) setVersetSelectionne(v)
    return nettoyer
  }, [searchParams, versets, setVersetSelectionne, cleChapitreAffiche])

  // ── LA REPRISE DE LECTURE : `repere=N` (contrat partagé avec la lecture en regard) ──
  // Le verset N se pose EN HAUT de la zone de lecture, sous les barres collantes
  // (`poserEnHaut`), et rien n'est retenu : ni sélection, ni volet des Pères ouvert sur
  // lui. ⛔ Ce n'est pas `verset=N`, qui l'emporte quand les deux sont là.
  // ⚠️ On REPOSE pendant la première seconde et demie, tant que le lecteur n'a pas bougé :
  // polices et gravures arrivent après la première peinture et déplacent ce qui les suit.
  // Pendant ce temps la page ne retient aucune place (`annoncerReprise`), sans quoi elle
  // retiendrait un état de passage.
  // ⚠️ La clé porte `mobile` : sur un téléphone, le premier rendu est celui du bureau
  // (le drapeau part à faux), et la place se reprend quand la mise en page bascule.
  const repereTraite = useRef<string | null>(null)
  const repereDemande = searchParams.get('verset') ? null : lireRepere(searchParams.get(PARAMETRE_REPERE))
  useEffect(() => {
    if (repereDemande === null) return
    const cle = `${cleChapitreAffiche}|${repereDemande}|${mobile ? 1 : 0}`
    if (repereTraite.current === cle) return
    repereTraite.current = cle
    annoncerReprise(DUREE_REPRISE_MS)
    const minuteurs: number[] = []
    let posee: { el: HTMLElement; position: number } | null = null
    let fini = false
    let commence = false
    const finir = () => { if (!fini) { fini = true; terminerReprise() } }
    const poser = () => {
      const el = document.getElementById(`verset-${repereDemande}`)
      if (!el) return false
      poserEnHaut(el)
      posee = { el, position: positionDuDefileur(el) }
      return true
    }
    minuteurs.push(window.setTimeout(() => {
      commence = true
      if (!poser()) { finir(); return }
      REPOSES_REPRISE_MS.forEach((delai, rang) => {
        minuteurs.push(window.setTimeout(() => {
          if (fini || !posee) return
          // Le lecteur a fait défiler lui-même : c'est lui qui commande.
          if (Math.abs(positionDuDefileur(posee.el) - posee.position) > 1) { finir(); return }
          poser()
          if (rang === REPOSES_REPRISE_MS.length - 1) finir()
        }, delai))
      })
    }, 0))
    return () => {
      for (const m of minuteurs) window.clearTimeout(m)
      // ⚠️ Un démontage avant la première pose (double montage du mode strict) ne compte
      // pas pour une reprise faite : la suivante la refera.
      if (!commence) repereTraite.current = null
      finir()
    }
  }, [repereDemande, cleChapitreAffiche, mobile])

  // Les gestes retiennent la clé de la liste AU MOMENT DU RENDU qui les a portés : une
  // réponse arrivée après un changement de chapitre ne touche pas la liste suivante.
  const marquerSauvegarde = (cle: string | null, cleVerset: string, id: string) => {
    modifierPrelevementsPour(cle, prev => new Map([...prev, [cleVerset, id]]))
  }

  const retirerSauvegarde = (cle: string | null, cleVerset: string) => {
    modifierPrelevementsPour(cle, prev => { const n = new Map(prev); n.delete(cleVerset); return n })
  }

  // Le compteur de lectures : une fois par verset et par session, avec le jeton, et
  // seulement pour un lecteur connecté (voir `LECTURES_ENVOYEES`).
  const compterLecture = async (idVerset: string) => {
    if (!userId || LECTURES_ENVOYEES.has(idVerset)) return
    LECTURES_ENVOYEES.add(idVerset)
    try {
      const { data } = await supabase.auth.getSession()
      const jeton = data.session?.access_token
      const res = await fetch('/api/versets/incrementer-lecture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(jeton ? { Authorization: `Bearer ${jeton}` } : {}) },
        body: JSON.stringify({ id_verset: idVerset }),
      })
      // ⚠️ Un 429 se DIT : avalé, un freinage se confond avec un compteur qui marche.
      if (res.status === 429) console.warn('[lecture] compteur freiné (429)', idVerset)
      else if (!res.ok) console.error('[lecture] compteur', res.status, idVerset)
    } catch (erreur) {
      console.error('[lecture] compteur', erreur)
    }
  }

  const traductionActive = traductions[traductionIndex]
  const tradCode = traductionActive?.code ?? 'TR0001'
  const traductionLabel = traductionActive?.label ?? tradCode
  // ⛔ Le code qu'un prélèvement écrit et sous lequel on le cherche : un verset prélevé dans
  // une autre bible ne se montre plus plein ici (demande de l'auteur, 2026-09-23).
  const tradPrelevement = codeDeTraduction(tradCode)


  // TR0009 (Bible 899) et éditions à segmentation éditoriale : l'adaptateur marque ses
  // lignes (`_est899`, `_estEditorial`). La GRAPHIE, la lecture en regard et le texte nu
  // se choisissent dans le menu « Mode de lecture » du volet de gauche, jamais dans le corps du
  // texte : ce sont des manières de lire, non des propriétés du chapitre affiché.
  const estLigne899 = (v: Verset) => v._est899 === true
  const estLigneEditoriale = (v: Verset) => v._estEditorial === true
  const estLacune899 = (v: Verset) => v._estLacune === true
  // La bible lue ne porte rien de ce chapitre : la mention d'absence prend la page.
  const texteAbsent = texteAbsentDuChapitre(versets, traduction)
  // La traduction moderne du même témoin n'est pas recomposée, mais son texte porte les
  // lacunes du manuscrit en clair : il faut les mettre en forme, sans passer par le
  // tokeniseur du témoin, qui prendrait ses restitutions pour des marqueurs à cheval.
  const lacunesEnClair = estTraductionModerne899(traduction)
  // ⚠️ Mémorisés : ces index ne dépendent que de l'appareil et des versets, et ils étaient
  // recalculés à chaque rendu — donc à chaque verset survolé ou retenu.
  const corpsEdition = editionChapter?.bodyBlocks
  const illustrationsEdition = editionChapter?.assets
  const indexBlocs = useMemo(() => indexerBlocsDeCorps(corpsEdition ?? []), [corpsEdition])
  const indexIllustrations = useMemo(() => indexerIllustrations(illustrationsEdition ?? []), [illustrationsEdition])
  // ⛔ LES VIGNETTES SE FONDENT DANS LE COMMENTAIRE QUI COUVRE LEUR VERSET, et y
  //    flottent. L'ancre ne bouge pas : c'est une donnée de provenance. Voir
  //    `habillerLesVignettes`, qui porte toute la règle et ses tests.
  const habillage = useMemo(() => habillerLesVignettes(
    versets.map((v) => v.id_verset), indexBlocs, indexIllustrations,
  ), [versets, indexBlocs, indexIllustrations])
  // ⛔ L'AXE DE LECTURE de la page : le bloc de texte, la colonne d'actions
  // EXCLUE du centrage. Le titre du chapitre et les rangées de verset s'y posaient
  // déjà ; les blocs éditoriaux, les pièces liminaires et les notes se centraient,
  // eux, sur toute la colonne de lecture. Mesuré le 2026-08-28 : trois axes dans la
  // même page, à 503, 495,5 et 514,5 pixels. L'auteur l'a vu sur « Du même auteur »,
  // qui ne tombait pas sous « Genèse ».
  //
  // ⚠️ La géométrie vit ICI, jamais sur le bloc : celui-ci porte ses propres marges
  // horizontales (12 % pour un préambule, zéro pour un sous-titre de partie), et
  // les mêler aurait fait dépendre l'axe du genre du bloc.
  //
  // ⚠️ Un seul enfant par cellule : les règles de voisinage de `globals.css`
  // (`.verset-row + .cs-bible-axe > .cs-bible-bloc`) traversent l'enveloppe, et
  // elles ne le peuvent que si le bloc en est l'enfant DIRECT.
  const surAxeTexte = (contenu: React.ReactNode, cle?: string) => mobile ? contenu : (
    <div key={cle} className="cs-bible-axe" style={styleAxeTexte()}>
      {contenu}
      <div />
    </div>
  )

  const rendreFluxEditorial = (
    blocs: readonly BibleEditionDisplayBodyBlock[],
    toutesIllustrations: readonly BibleEditionDisplayAsset[],
  ) => {
    const illustrations = toutesIllustrations.filter((a) => !habillage.absorbees.has(a.id))
    return [
      ...blocs.map((bloc) => ({ kind: 'block' as const, materialOrder: bloc.materialOrder, id: bloc.id, value: bloc })),
      ...illustrations.map((illustration) => ({
        kind: 'illustration' as const,
        materialOrder: illustration.materialOrder,
        id: illustration.id,
        value: illustration,
      })),
    ]
      .sort((a, b) => a.materialOrder - b.materialOrder || a.id.localeCompare(b.id, 'fr'))
      .map((item, i, items) => {
        // Un bloc de SUITE — le paragraphe suivant d'un même développement, que
        // la donnée a coupé en blocs — ne rouvre pas le blanc de son rang
        // (`estSuiteDuBloc`). Une gravure entre deux blocs rompt la suite : elle
        // rompt déjà leur voisinage.
        const precedent = i > 0 ? items[i - 1] : null
        const suite = item.kind === 'block' && precedent?.kind === 'block' && estSuiteDuBloc(precedent.value, item.value)
        return surAxeTexte(item.kind === 'block'
          ? (
              <BlocEditorialBible
                key={`bloc:${item.id}`}
                bloc={item.value}
                illustrations={indexIllustrations.byBodyBlock.get(item.id) ?? []}
                habillage={habillage.parBloc.get(item.id) ?? []}
                suite={suite}
                titresMasques={titresMasques}
              />
            )
          : <IllustrationBible key={`illustration:${item.id}`} illustration={item.value} />, `axe:${item.id}`)
      })
  }
  // ⛔ LES NOTES DE L'ÉDITION ET CELLES DES VERSETS S'APPELLENT DE LA MÊME FAÇON (charte
  // § 13.22) : une note de `versets_v2` arrive avec sa ligne et son numéro, posés par la page.
  const notesEdition = editionChapter?.notes
  const notesParCanon = useMemo(() => {
    const parCanon = new Map<string, BibleEditionDisplayNote[]>()
    for (const note of [...(notesEdition ?? []), ...(notesDesVersets?.[traduction] ?? [])]) {
      const notes = parCanon.get(note.canonId) ?? []
      notes.push(note)
      parCanon.set(note.canonId, notes)
    }
    for (const notes of parCanon.values()) {
      notes.sort((a, b) => a.displayNumber - b.displayNumber || a.materialOrder - b.materialOrder)
    }
    return parCanon
  }, [notesEdition, notesDesVersets, traduction])
  // Les appels posés à une même ancre se lisent « 2 & 3 », comme partout (charte § 13.7).
  const appelerEnSuite = (notes: readonly BibleEditionDisplayNote[]) => notes.map((note, rang) => (
    <Fragment key={note.id}>
      {rang > 0 && <span style={styleSeparateurAppels()}>{separateurAppels(rang, notes.length)}</span>}
      <AppelNoteBiblique note={note} figures={figuresDeLaNote(indexIllustrations.byNote.get(note.id))} />
    </Fragment>
  ))
  // Chapitre entièrement absent du témoin (ex. 1 Samuel 1 dans la Bible 899) : au lieu
  // d'aligner autant de « [Lacune du manuscrit] » que de versets attendus, on donne UNE
  // mention de chapitre. On ne le fait qu'en contexte 899 (toutes les lignes en sont) et
  // seulement si au moins une ligne existe.
  const chapitreToutLacune = versets.length > 0 && versets.every(v => estLigne899(v) && estLacune899(v))

  // ── LE LASSO ───────────────────────────────────────────────────────────────
  // Tirer un cadre depuis le blanc de la page sélectionne plusieurs versets, qu'on
  // enregistre ou qu'on copie d'un coup (app/components/LassoLecture.tsx).
  // ⛔ Ne se sélectionne que ce qui s'enregistre un par un : un verset qui porte son texte.
  // Les lignes recomposées d'une édition (Bible du XIIIe siècle) y entrent depuis le
  // 2026-09-20 : le prélèvement vise la clé naturelle, non l'identifiant de la ligne.
  // ⚠️ La clé est l'identifiant du verset, non son numéro : une glose partage le numéro
  // de son hôte.
  const lassoActif = !mobile && !sansSurvol && !pieceAffichee && !chapitreToutLacune
  // ⛔ AU DOIGT, LE LASSO NAÎT D'UN APPUI LONG (`LassoTactile`) : glisser y fait défiler,
  // et seul un doigt resté immobile demande un lasso.
  const lassoTactileActif = (mobile || sansSurvol) && !pieceAffichee && !chapitreToutLacune
  // ⛔ Ce qui SORT de la page (copie, prélèvement, lasso, signalement) est le texte qu'elle
  // MONTRE. Une ligne du témoin porte ses marqueurs éditoriaux bruts (« [lecture
  // incertaine : …] »), que l'écran rend d'une teinte : `texteLisible899` en rend le texte.
  // ⛔ ET SA TRADUCTION MODERNE AUSSI (audit du 2026-09-22) : 1 811 versets de TR0013
  // portent les mêmes marqueurs en clair, que `marquerLacunesDuTemoin` met en forme à
  // l'écran et que la copie emportait bruts, termes d'atelier compris. La ligne recomposée
  // se reconnaît à `_est899`, la traduction moderne au code de la bible : ce ne sont pas
  // les mêmes automates (voir `texteLisibleModerne899`).
  const texteDuVerset = (v: Verset) => {
    const brut = String(overrides[v.id_verset]?.[traduction] ?? v[traduction] ?? '')
    if (estLigne899(v)) return texteLisible899(brut)
    return lacunesEnClair ? texteLisibleModerne899(brut) : brut
  }
  const versetsParId = useMemo(() => new Map(versets.map(v => [v.id_verset, v])), [versets])
  // ⛔ L'IDENTIFIANT `verset-N` NE SE DONNE QU'AU VERSET HÔTE : une glose partage le
  // numéro de son verset, et deux `id` pareils faisaient viser l'une pour l'autre. Les
  // liens `?verset=N` visent ainsi toujours le verset, jamais sa glose.
  const idsDeVerset = useMemo(() => {
    const vus = new Set<number>()
    const ids = new Map<string, string>()
    for (const v of versets) {
      if (v._estGlose899 || v._estGloseV2 || vus.has(v.verset)) continue
      vus.add(v.verset)
      ids.set(v.id_verset, `verset-${v.verset}`)
    }
    return ids
  }, [versets])
  // La langue du texte lu : `lang` sur le paragraphe, et les césures du latin et du grec.
  const langueLue = useLangueBible(traduction, traductionActive?.langue)
  // ⛔ Le lasso part : le verset choisi d’un clic se lâche (demande de l’auteur, 2026-09-23).
  // Deux sélections à la fois, l’une d’un clic et l’autre d’un cadre, ne disent plus sur
  // quoi l’on agit ; et le volet des Pères, qui suit le verset choisi, redevient celui du
  // chapitre.
  const lacherLeVersetChoisi = () => { setVersetSelectionne(null); setActionsMobileId(null) }
  const versetsDuLasso = (cles: readonly string[]) =>
    cles.map(cle => versetsParId.get(cle)).filter((v): v is Verset => v !== undefined)
  const abreviationLivre = ABREV_FR[livreActif] || livreActif
  // ⛔ LES TROIS GESTES VIVENT DANS `prelevementsLasso.ts` (dette levée le 2026-09-22) :
  // ils étaient recopiés mot pour mot en lecture en regard, et la copie avait déjà
  // divergé. La page ne garde que la CUEILLETTE — ce qu'elle sait, et elle seule : quelles
  // lignes ces clés désignent, et quel texte l'écran en montre.
  const passagesDuLasso = (cles: readonly string[]): PassageDuLasso[] =>
    versetsDuLasso(cles).map(v => ({
      numero: v.verset,
      texte: texteDuVerset(v),
      label: traductionLabel,
      trad: tradPrelevement,
      canonId: canonIdDeLigne(v.id_verset),
    }))
  const contexteDuLasso = (): ContexteDuLasso => ({
    userId, nomLivre, livreAbrege: abreviationLivre, chapitre: chapitreActif,
    sauvegardes,
    // La clé de la liste au DÉPART du geste : la réponse ne s'inscrit que sous elle.
    cleDepart: clePrelevementsCourante,
    modifierPour: modifierPrelevementsPour,
    exigerCompte,
  })
  const dejaPreleves = (cles: readonly string[]) =>
    compterDejaPreleves(sauvegardes, passagesDuLasso(cles))

  const enregistrerLasso = async (cles: readonly string[]): Promise<number | null> => {
    const faits = await enregistrerLeLasso(contexteDuLasso(), passagesDuLasso(cles))
    if (faits) signalerProgression()
    return faits
  }

  const retirerLasso = (cles: readonly string[]): Promise<number | null> =>
    retirerDuLasso(contexteDuLasso(), passagesDuLasso(cles))

  // La citation d'une sélection : « … » (Gn 1, 3-5.7), une élision là où un verset manque.
  const copierLasso = (cles: readonly string[]) =>
    copierLeLasso(contexteDuLasso(), passagesDuLasso(cles))

  return (
    <div className={mobile ? 'flex flex-col' : 'flex-1 flex flex-col h-full overflow-hidden'} style={{ background: 'var(--cs-fond)', ...(mobile ? { width: '100%', paddingTop: '2.875rem', paddingBottom: `calc(0.75rem + ${BANDEAU_NAV_MOBILE})` } : {}) }}>

      {/* En-tête. `data-visite` : le repère de la visite guidée
          (app/lib/visiteBibleClassique.ts). L'étape parle des DEUX choses que ce bloc
          porte — le passage ouvert et le menu des bibles —, et il n'en existe pas de
          plus petit qui les tienne toutes deux. */}
      <div data-visite="entete-lecture" style={{ borderBottom: '1px solid var(--cs-bord)', background: 'var(--cs-fond)', padding: '14px 32px 10px' }}>

        {/* Titre + navigation chapitres. Calé sur LE MÊME gabarit que les versets
            (bloc de texte de 500 px + colonne d'actions de 38 px) : le titre est centré
            sur la seule première colonne — donc sur le bloc vert de sélection —, la colonne
            des boutons (signaler, prélever…) étant exclue du centrage.
            ⛔ IL NE PARAÎT PAS AU DOIGT (décision de l'auteur, 2026-09-20 : « supprimer le
            "Genèse ❧ Chapitre 1" en haut de page, et conserver le menu de sélection de la
            traduction »). Sur un écran étroit, il prend une bande entière pour dire ce que
            le volet des livres et le bandeau du bas disent déjà — et ce dernier porte les
            mêmes flèches de chapitre : rien ne se perd. */}
        {/* ⛔ AU TÉLÉPHONE, LA PAGE GARDE SON TITRE, MAIS HORS DE L'ÉCRAN (2026-09-22) :
            sans lui, elle n'avait aucun titre de niveau 1 pour qui navigue par titres.
            Aucun changement visible (`.cs-hors-ecran`). */}
        {mobile && (
          <h1 className="cs-hors-ecran">{pieceAffichee ? pieceAffichee.titre : `${nomLivre}, chapitre ${chapitreActif}`}</h1>
        )}
        {!mobile && (
        <div style={{ width: mobile ? '100%' : 'min(var(--mesure-ligne), 100%)', margin: '0 auto', display: mobile ? 'block' : 'grid', gridTemplateColumns: `minmax(0, var(--mesure-bloc)) ${GOUTTIERE_ACTIONS_VERSET}`, alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px' }}>
          {/* Les deux flèches viennent de `FlecheChapitre` : des LIENS, dont la page compose
              l'adresse (`voisins`). Au bout d'un livre elles mènent au livre voisin ; à une
              borne réelle le chevron reste en place, grisé et inerte. Le clic simple passe
              par la provision d'attente : les volets gardent leur état. */}
          <FlecheChapitre sens="precedent" variante="entete" cible={voisins.precedent} onAller={naviguer} />

          <h1 style={{ fontFamily: SERIF, fontWeight: 'normal', margin: 0, display: 'flex', alignItems: 'baseline', gap: '10px', lineHeight: INTERLIGNE_TITRE_CHAPITRE }}>
            {/* La marque suit le titre du chapitre comme elle suit le nom au volet : un
                lecteur qui arrive par un lien direct n'a jamais vu le volet. */}
            <span style={{ fontSize: '1.25rem', color: 'var(--cs-encre-fonce)', letterSpacing: '0.01em' }}>
              {nomLivre}{estLivreNonCanonique(livreActif) && <MarqueNonCanonique />}
            </span>
            <span aria-hidden="true" style={{ color: 'var(--cs-or-doux)', fontSize: '1.25rem', lineHeight: 1 }}>❧</span>
            {/* ⛔ PAS DE VERT DANS CE TITRE (décision de l'auteur, 2026-08-30). Le rang
                de chapitre portait `--cs-vert`, qui jurait contre le fleuron chaud posé
                juste avant. Il prend le DORÉ-GRIS du site : la teinte de l'or à moitié
                chroma, celle-là même que le fleuron porte en plus pâle.
                ⚠️ `--cs-or` ne peut pas servir ici : 3,67 sur le papier, quand un texte
                de 17 px en demande 4,5. Le doré-gris rend 5,37 au Clair et 5,78 au Cuir.
                ⚠️ Ce jeton est nommé pour la voix de l'ÉDITEUR (charte, `--cs-mention`) :
                le site n'a qu'un doré-gris, et le partager vaut mieux que d'en dupliquer
                la valeur sous un second nom. Qui le retouchera pour une cellule de
                comparaison déplacera ce titre avec. */}
            <span style={{ fontSize: '1.0625rem', color: 'var(--cs-mention)', fontStyle: 'italic' }}>Chapitre {chapitreActif}</span>
          </h1>

          <FlecheChapitre sens="suivant" variante="entete" cible={voisins.suivant} onAller={naviguer} />
        </div>
          <div />
        </div>
        )}

        {/* Séparateur fin + choix de traduction : petits filets de part et d'autre.
            Calé sur LE MÊME gabarit que le titre « Genèse ❧ Chapitre 1 » (bloc texte
            de 500 px + colonne d'actions de 38 px exclue du centrage), pour que le menu
            se centre sur le même axe que le titre, et non sur la pleine largeur. */}
        <div style={{ width: mobile ? '100%' : 'min(var(--mesure-ligne), 100%)', margin: mobile ? 0 : `${BLANC_TITRE_MENU} auto 0`, display: mobile ? 'block' : 'grid', gridTemplateColumns: `minmax(0, var(--mesure-bloc)) ${GOUTTIERE_ACTIONS_VERSET}`, alignItems: 'center' }}>
          <SelecteurTraductionBible
            traductions={traductions}
            traductionIndex={traductionIndex}
            setTraductionIndex={setTraductionIndex}
            choisirEnRegard={choisirEnRegard}
          />
          <div />
        </div>

      </div>

      {/* ⛔ `scrollbar-gutter: stable both-edges` : l'en-tête est HORS de ce
          défileur, tout le reste dedans. La barre de défilement mesurée à 15 px
          rétrécissait le défileur d'autant, et tout ce qui s'y centre glissait de
          7,5 px à gauche du titre. Réservée des DEUX côtés, la gouttière laisse le
          contenu centré sur le même axe que l'en-tête, barre visible ou non. */}
      <div ref={refDefileur} className={mobile ? '' : 'overflow-y-auto flex-1'} style={{ paddingTop: '20px', paddingBottom: '20px', ...(mobile ? {} : { scrollbarGutter: 'stable both-edges' }) }}>
        {/* `cs-lecture-colonne` : ce qui s'efface et paraît quand on passe d'un texte à
            l'autre (voir `BibleLayout`, « passage »). L'en-tête, lui, ne bouge pas. */}
        {/* ⛔ La copie retire les césures conditionnelles sur la COLONNE ENTIÈRE, non sur le
            seul paragraphe : une sélection commencée sur le numéro d'un verset ne passait
            pas par le paragraphe, et emportait des U+00AD dans le presse-papiers. */}
        <div className="cs-lecture-colonne" data-colonne-lecture="" onCopy={copierSansCesures} style={{ maxWidth: 'var(--mesure-page)', margin: '0 auto', paddingLeft: '1.5rem', paddingRight: '1.5rem' }}>
          <style>{`
            .verset-row:hover .bouton-action-verset { opacity: 1 !important; }
            .verset-row:has(:focus-visible) .bouton-action-verset { opacity: 1 !important; }
            .verset-row--actif .bouton-action-verset { opacity: 0.5; }
            /* ⛔ La densité ne paraît qu'au SURVOL, avec les actions dont elle ferme la
               rangée (décision de l'auteur, 2026-09-13). Ni au repos, ni sur le verset
               retenu : c'est la ligne qu'on vise qui la demande. */
            .marque-densite { opacity: 0; transition: opacity 0.12s; }
            .verset-row:hover .marque-densite { opacity: 1; }
            .verset-row:has(:focus-visible) .marque-densite { opacity: 1; }
            /* Les flèches encadrent le titre : elles prennent sa teinte, non le vert. */
            .nav-chap-arrow:hover { color: var(--cs-mention) !important; }
            /* Mobile : dans le pavé flottant (appui long), les boutons sont pleins. */
            @media (max-width: 900px) { .verset-actions .bouton-action-verset { opacity: 1 !important; } }
            /* ⛔ Et sur TOUT écran tactile, quelle que soit sa largeur. Le repli par la
               largeur laissait les actions à « opacity: 0 » sur une tablette de 1024px en
               paysage, où le drapeau mobile est faux : ni pavé flottant, ni survol possible, donc
               des boutons présents et invisibles. Le critère est la CAPACITÉ du pointeur,
               comme pour « useSansSurvol » (audit de responsiveness, 2026-09-06). */
            @media (hover: none) { .bouton-action-verset { opacity: 1 !important; } }
          `}</style>

          {pieceAffichee ? surAxeTexte(
            <PieceLiminaire
              titre={pieceAffichee.titre}
              portee={pieceAffichee.portee}
              blocs={pieceAffichee.contenu.bodyBlocks}
              illustrationsParBloc={indexerIllustrations(pieceAffichee.contenu.assets).byBodyBlock}
              bibliographie={pieceAffichee.bibliographie}
              /* ⛔ Aucun RETOUR en pied de pièce (décision de l'auteur, 2026-08-28).
                 Il disait « Revenir à Luc 1 » sous chaque apparat, et c'était un
                 objet de plus pour un geste que le volet fait déjà : l'onglet
                 « Livres » rend le chapitre, et il le rend TEL QU'ON L'AVAIT
                 LAISSÉ, le livre et le chapitre n'ayant jamais quitté l'adresse.
                 Les flèches de chapitre y ramènent aussi.
                 ⚠️ `urlRetour` reste une propriété OPTIONNELLE de PieceLiminaire,
                 et son rendu est gardé par elle : ne rien passer suffit à ne rien
                 rendre. Ne pas retirer la propriété du composant, qui sert aussi
                 la fenêtre de note. */
            />,
          ) : (<>

          {rendreFluxEditorial(indexBlocs.opening, indexIllustrations.opening)}

          {/* LE LIVRE ABSENT (refondu le 2026-09-23, demande de l'auteur : « au plus
              propre, au plus élégant ; un fleuron de la liste des fleurons »). Le nom de la
              bible se pose en titre, le constat en mention, et le fleuron des vides (la
              croix à volutes, `FleuronDiscret`) sépare le constat de l'issue.
              ⛔ Toujours PAS DE GRAVURE (décision du 2026-09-04) : un état qu'on traverse
              ne prend pas une planche ; un fleuron de trois rem n'en est pas une.
              ⛔ Sur l'axe du TEXTE : même grille que le titre du chapitre et la mention
              d'une lacune, la colonne d'actions exclue du centrage. */}
          {texteAbsent && (
            <div style={{ width: mobile ? '100%' : 'min(var(--mesure-ligne), 100%)', margin: '0 auto', display: mobile ? 'block' : 'grid', gridTemplateColumns: `minmax(0, var(--mesure-bloc)) ${GOUTTIERE_ACTIONS_VERSET}` }}>
              <div style={STYLE_LIVRE_ABSENT}>
                <p style={STYLE_ABSENT_NOM}>{rendreEnrichi(traductionLabel)}</p>
                <p style={STYLE_ABSENT_MENTION}>ne comporte pas ce livre.</p>
                <div style={STYLE_ABSENT_FLEURON}><FleuronDiscret vide="livreAbsent" /></div>
                {/* ⛔ L'ATTENTE ET L'ÉCHEC SE DISENT (2026-09-22) : rien ne paraissait pendant
                    la recherche, ni quand elle échouait. ⚠️ Un échec n'est pas « aucune bible
                    ne le donne » : on ne le sait pas. */}
                {rechercheBiblesAbsent === 'en-cours' && (
                  <p role="status" style={{ ...STYLE_ETAT_RECHERCHE, fontStyle: 'italic', color: 'var(--cs-texte-gris)' }}>
                    Recherche des bibles qui le donnent…
                  </p>
                )}
                {rechercheBiblesAbsent === 'echec' && (
                  <div role="status" style={STYLE_ETAT_RECHERCHE}>
                    <p style={{ margin: 0 }}>Les autres bibles n’ont pas pu être consultées.</p>
                    {onReessayerBiblesAbsent && (
                      <button type="button" className="cs-bouton-lien" onClick={onReessayerBiblesAbsent} style={{ marginTop: '6px' }}>
                        Réessayer
                      </button>
                    )}
                  </div>
                )}
                {rechercheBiblesAbsent === 'faite' && biblesDuLivreAbsent?.length === 0 && (
                  <p style={STYLE_ETAT_RECHERCHE}>
                    Aucune des bibles publiées sur Corpus Scriptura ne le donne pour l’instant.
                  </p>
                )}
                {/* L'issue : les bibles qui le portent, en liens directs (audit ergonomique,
                    2026-09-21), un nom par ligne, composés comme partout (`rendreEnrichi`). */}
                {biblesDuLivreAbsent && biblesDuLivreAbsent.length > 0 && (
                  <nav aria-label="Bibles qui comportent ce livre">
                    <p style={STYLE_ABSENT_ISSUE}>On le lit dans</p>
                    <ul style={STYLE_ABSENT_LISTE}>
                      {biblesDuLivreAbsent.map(b => (
                        <li key={b.code}>
                          <a href={b.href} className="cs-lien-phrase" style={{ color: 'var(--cs-vert)' }}
                            onClick={e => {
                              if (!onChoisirBible || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
                              e.preventDefault()
                              onChoisirBible(b.code)
                            }}>
                            {rendreEnrichi(b.label)}
                          </a>
                        </li>
                      ))}
                    </ul>
                  </nav>
                )}
              </div>
              <div />
            </div>
          )}

          {/* Chapitre entièrement absent du témoin : une mention unique, sobre, au lieu
              d'un mur de « [Lacune du manuscrit] ». Rien d'autre, ni ornement ni glose :
              la mention se suffit à elle-même.
              Calée sur LE MÊME gabarit que le titre « Genèse ❧ Chapitre 1 » (bloc de
              texte + colonne d'actions exclue du centrage) : sans cela, la mention se
              centrerait sur la pleine largeur et pendrait à droite de l'axe du titre. */}
          {chapitreToutLacune && (
            <div style={{ width: mobile ? '100%' : 'min(var(--mesure-ligne), 100%)', margin: '0 auto', display: mobile ? 'block' : 'grid', gridTemplateColumns: `minmax(0, var(--mesure-bloc)) ${GOUTTIERE_ACTIONS_VERSET}` }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', minHeight: '50vh', padding: '11vh 16px 0', textAlign: 'center' }}>
                {/* La voix des mentions, encre comprise (décision du 14 septembre 2026) : le
                    chapitre perdu se dit comme la case « Absent de cette traduction », à la
                    taille près, qui reste celle d'une mention de page. */}
                <p style={{ fontFamily: SERIF, fontSize: '1rem', fontStyle: 'italic', letterSpacing: '0.02em', color: 'var(--cs-mention)', margin: 0 }}>
                  Lacune du manuscrit
                </p>
              </div>
              <div />
            </div>
          )}

          {/* On n'affiche QUE les versets réellement portés par cette traduction : une
              édition qui compte moins de versets qu'une autre (Job 25 s'arrête au v. 6
              chez Sacy) ne doit pas laisser des lignes vides à numéro. */}
          {/* ⛔ Un verset que la traduction ne porte pas reste caché, SAUF s'il porte une
              note : l'appel est le seul chemin vers une note de verset depuis le
              13 septembre 2026, et la note dit justement pourquoi le verset manque. Il
              paraît alors en « — », avec son appel. */}
          {!chapitreToutLacune && versets.filter(v => estLigne899(v) || v[traduction] || notesParCanon.has(v.id_verset)).map(v => {
            const actif = versetSelectionne?.id_verset === v.id_verset
            const dansPlage = !!plageSurlignee && v.verset >= plageSurlignee.debut && v.verset <= plageSurlignee.fin
            const ligne899 = estLigne899(v)
            const ligneEditoriale = estLigneEditoriale(v)
            const ligneSource = ligne899 || ligneEditoriale
            const lacune = estLacune899(v)
            const blocsAvant = indexBlocs.beforeByCanon.get(v.id_verset) ?? []
            const blocsApres = indexBlocs.afterByCanon.get(v.id_verset) ?? []
            const illustrationsAvant = indexIllustrations.beforeByCanon.get(v.id_verset) ?? []
            const illustrationsApres = indexIllustrations.afterByCanon.get(v.id_verset) ?? []
            const notesDuVerset = notesParCanon.get(v.id_verset) ?? []
            // Une seule lecture de la densité par rangée.
            const densite = densites.get(v.id_verset)
            // ⛔ LE SIGNET SE CLÉ SUR LE CRÉNEAU, non sur le numéro : « 8 » et la ligne
            // propre à une édition « 8+ » le partagent (voir `prelevementsBibliques`).
            const canonVerset = canonIdDeLigne(v.id_verset)
            const idPreleve = prelevementDuVerset(sauvegardes, canonVerset, v.verset, tradPrelevement)
            // Prélevé dans une AUTRE bible seulement : le signet se dit intermédiaire.
            // ⛔ Un appel se pose à l'ANCRE que la donnée déclare ; sans ancre lisible, il suit le verset.
            const appelsDuVerset = repartirAppels(!lacune && !ligne899 ? texteDuVerset(v) : '', notesDuVerset)
            const dansLeLasso = (lassoActif || lassoTactileActif) && !lacune && Boolean(overrides[v.id_verset]?.[traduction] ?? v[traduction])
            // Retenir le verset : au clic sur la rangée, ou au clavier sur son numéro.
            const choisirVerset = (e?: { currentTarget: Element }) => {
              const incrementer = () => compterLecture(v.id_verset)
              if (mobile) {
                // Sur mobile, un tap sélectionne le verset ET fait apparaître
                // immédiatement le pavé d'actions ; un second tap referme.
                // Les lignes recomposées ne ciblent pas `versets_v2` : pas de comptage
                // de lecture ; leur pavé d'actions, lui, paraît (2026-09-20).
                if (actif) { setVersetSelectionne(null); setActionsMobileId(null) }
                else {
                  if (!ligneSource) incrementer()
                  // Sommet utile : la barre (3,5 rem) et les onglets (2,875 rem).
                  // Hauteur du pavé : ses boutons de 2,25 rem au doigt, son cadre, sa marge.
                  const racine = tailleRacinePx()
                  const haut = (e?.currentTarget.closest('.verset-row') ?? e?.currentTarget)?.getBoundingClientRect().top
                  setActionsDessous(haut !== undefined && haut - 2.75 * racine < hauteurNavbarPx() + 2.875 * racine)
                  setActionsMobileId(v.id_verset); setVersetSelectionne(v)
                }
                return
              }
              if (!actif && !ligneSource) incrementer()
              setVersetSelectionne(actif ? null : v)
            }
            return (
            <Fragment key={v.id_verset}>
            {rendreFluxEditorial(blocsAvant, illustrationsAvant)}
            <div
              id={idsDeVerset.get(v.id_verset)}
              onClick={choisirVerset}
              className={`verset-row${actif ? ' verset-row--actif' : ''}${dansPlage ? ' verset-row--plage' : ''}`}
              data-oeuvres={densite?.oeuvres}
              style={styleRangeeVerset({ mobile })}>

              <div style={styleGrilleRangee({ mobile })}>
                {/* ⛔ LES ACTIONS PRÉCÈDENT LE VERSET DANS LE DOCUMENT (audit ergonomique du
                    2026-09-21). À la tabulation, les appels de note et les liens du texte
                    passaient avant les boutons du verset, qui semblaient appartenir au verset
                    suivant. L'ordre est désormais : les actions du verset, son numéro (le
                    bouton qui le retient), puis son texte, notes et liens compris, dans
                    l'ordre de lecture. Les outils se trouvent avant ce qu'ils servent, et le
                    numéro reste collé au texte qu'il désigne. ⚠️ Le DESSIN ne bouge pas : la
                    grille place les actions en seconde colonne et le bloc en première,
                    explicitement ; au doigt, le pavé est hors du flux, comme avant.
                    Boutons d'action — hors du bloc sélectionné. Sur mobile, ils
                    sortent de la grille : pavé flottant en haut à droite du
                    verset, montré seulement après un appui long. */}
                <div className="verset-actions" style={mobile ? {
                  // Au-dessus du verset (et non sur lui) : le texte reste lisible.
                  position: 'absolute', right: '0.25rem', zIndex: 6,
                  ...(actionsDessous ? { top: '100%', marginTop: '3px' } : { bottom: '100%', marginBottom: '3px' }),
                  display: actionsMobileId === v.id_verset ? 'flex' : 'none', alignItems: 'center', gap: '0.25rem',
                  background: 'var(--cs-surface)', border: '1px solid var(--cs-bord)', borderRadius: '8px', boxShadow: 'var(--cs-ombre-flottante)', padding: '0.25rem 0.375rem',
                } : { gridColumn: 2, gridRow: 1, width: GOUTTIERE_ACTIONS_VERSET, paddingLeft: RETRAIT_ACTIONS_VERSET, display: 'flex', alignItems: 'flex-start', gap: 0, paddingTop: '0.28125rem', overflow: 'visible', position: 'relative' }}>
                  {/* ⛔ LES LIGNES RECOMPOSÉES ONT LEURS ACTIONS (demande de l'auteur, 2026-09-20).
                      Le prélèvement vise la clé NATURELLE (livre, chapitre, verset), la copie
                      prend le texte, le signalement part par la référence. Seule la
                      modification reste réservée aux lignes de `versets_v2`, qu'elle écrit. */}
                    <>
                      {userId && (
                        <BoutonEnregistrer
                          verset={v} texte={texteDuVerset(v)} nomLivre={nomLivre} livreActif={livreActif}
                          chapitreActif={chapitreActif} userId={userId}
                          traductionLabel={traductionLabel}
                          trad={tradPrelevement}
                          canonId={canonVerset}
                          dejaSauvegarde={idPreleve !== null}
                          idPrelevement={idPreleve}
                          onSauvegarde={(id) => marquerSauvegarde(clePrelevementsCourante, cleVersetPreleve(canonVerset, v.verset, tradPrelevement), id)}
                          onSupprimer={() => retirerSauvegarde(clePrelevementsCourante, cleVersetPreleve(canonVerset, v.verset, tradPrelevement))}
                        />
                      )}
                      <BoutonCopie citation={citationBiblique(
                        texteDuVerset(v),
                        `${ABREV_FR[livreActif] || nomLivre} ${chapitreActif}, ${v.verset}`,
                      )} numero={v.verset} />
                      {!polyglotteTropEtroite && (() => { const p = placeCanoniqueDuVerset(v, livreActif, chapitreActif); return <BoutonPolyglotte href={urlPolyglotte(p.livre, p.chapitre, p.verset)} /> })()}
                      {typeof v._facsDebut899 === 'string' && (
                        <BoutonFacsimile
                          reference={`${ABREV_FR[livreActif] || nomLivre} ${chapitreActif}, ${v.verset}`}
                          debut={v._facsDebut899}
                          fin={typeof v._facsFin899 === 'string' ? v._facsFin899 : null}
                        />
                      )}
                      <BoutonSignaler versetId={v.id_verset} versetRef={v.ref} texte={texteDuVerset(v)} />
                      {estAdmin && !modeUtilisateurStandard && !ligneSource && (
                        <Bulle texte="Modifier ce verset" position="left">
                          <button onClick={e => { e.stopPropagation(); setEditionCible(v) }} aria-label="Modifier ce verset" className="bouton-action-verset"
                            style={{ ...VERSET_ACTION_BTN, opacity:0, color:'var(--cs-bord)' }}>
                            <IconeCrayon size={14} />
                          </button>
                        </Bulle>
                      )}
                    </>
                  {/* ⛔ La marque de densité FERME la rangée d'actions, et ne paraît qu'au
                      survol (feuille ci-dessus). Elle ne se rend pas du tout quand elle ne
                      tient pas dans la zone de lecture : une opacité nulle déborderait
                      quand même du défileur. Voir marqueDensiteTient (compositionBible). */}
                  {!mobile && densiteTient && densite && (
                    <span className="marque-densite" title={libelleDensiteVerset(densite)}
                      style={styleDensiteVerset()}>
                      {densite.oeuvres}
                    </span>
                  )}
                </div>
                <div className="verset-bloc" data-lasso-verset={dansLeLasso ? v.id_verset : undefined} style={mobile ? styleBlocVerset({ actif: actif || dansPlage, mobile }) : { ...styleBlocVerset({ actif: actif || dansPlage, mobile }), gridColumn: 1, gridRow: 1 }}>
                  {/* Numéro — inclus dans le bloc sélectionné, aligné sur la 1re ligne du texte (ligne de base) */}
                  {/* ⛔ Le numéro est le BOUTON du verset pour le clavier : la rangée entière
                      porte déjà des liens et des boutons, on ne la rend pas focalisable. */}
                  {/* ⛔ Son NOM dit tout ce que le numéro montre : la numérotation alternative et
                      l'état prélevé. `aria-label` remplace le contenu, et « Verset N » seul
                      les taisait. ⚠️ `data-lasso-depart` : au doigt, c'est ICI, et seulement
                      ici, que naît le lasso (`LassoTactile`) ; l'appui long sur le texte reste
                      à la sélection native, pour copier une demi-phrase. */}
                  <span style={STYLE_NUMERO_VERSET} role="button" tabIndex={0} aria-pressed={actif}
                    aria-label={libelleNumeroVerset(v, idPreleve !== null)}
                    data-lasso-depart={lassoTactileActif ? '' : undefined}
                    onKeyDown={e => activerAuClavier(e, choisirVerset)}>
                    {!mobile && idPreleve !== null && (
                      <span aria-hidden="true" title="Dans mes prélèvements" style={STYLE_SIGNET_VERSET}>
                        <IconeSignet plein taille="100%" />
                      </span>
                    )}
                    {v.verset}
                    {v.chapitre_alternatif != null && (
                      <span style={STYLE_NUMERO_ALTERNATIF}>
                        {' '}({v.chapitre_alternatif}{v.verset_alternatif != null ? `, ${v.verset_alternatif}` : ''})
                      </span>
                    )}
                  </span>

                  {/* Texte — colonne fixe et stable, alignée quel que soit l'état des boutons.
                      TR0009 : lacune du manuscrit rendue explicitement ; marqueurs éditoriaux
                      inline (lecture incertaine, ajout marginal) rendus discrètement. Aucun
                      statut technique d'alignement n'est montré au lecteur. */}
                  <p data-verse-text lang={ligne899 ? 'fro' : langueLue}
                    style={styleTexteVerset({ mobile })}>
                    {lacune ? (
                      // Verset isolé absent du témoin (chapitre par ailleurs porté). Italique
                      // de labeur, capitale initiale, teinte effacée : signalé sans peser.
                      <span title="Lacune matérielle du manuscrit" style={STYLE_LACUNE}>Lacune du manuscrit</span>
                    ) : (overrides[v.id_verset]?.[traduction] ?? v[traduction]) ? (
                      ligne899
                        ? rendreMarqueurs899(String(v[traduction] ?? ''))
                        : rendreTexteAvecAppels(texteDuVerset(v), appelsDuVerset.groupes, (morceau) => rendreTexteEnrichi(
                            // Les césures du latin et du grec se posent morceau par morceau,
                            // APRÈS le placement des appels (qui se fait par offset).
                            cesurerSelonLangue(morceau, langueLue),
                            // La traduction moderne du témoin porte ses lacunes en clair
                            // (« […] ») : elles se mettent en forme comme dans la colonne du
                            // manuscrit, sans que le reste de l'enrichissement soit touché.
                            lacunesEnClair ? marquerLacunesDuTemoin : undefined,
                          ), appelerEnSuite, true,
                          // Un appel qui tombe sur la fin d'une lecture incertaine se colle au
                          // dernier mot, avant le cercle (marqueurs899).
                          lacunesEnClair
                            ? (avant, appels, ponctuation) => fondreAppelsDansLaMarque(avant, appels, ponctuation, rendreTexteEnrichi)
                            : undefined)
                    ) : (
                      <span style={STYLE_VERSET_VIDE}>—</span>
                    )}
                    {appelsDuVerset.aLaSuite.map((note) => (
                      <AppelNoteBiblique key={note.id} note={note} figures={figuresDeLaNote(indexIllustrations.byNote.get(note.id))} />
                    ))}
                  </p>
                  {/* ⛔ PAS DE MARQUE DE DENSITÉ AU DOIGT (décision de l'auteur, 2026-09-20 :
                      « supprimer, en mode mobile, le "10 œuvres en parlent" qui décale tout »).
                      Elle se posait en fin de bloc, en toutes lettres, et sa ligne repoussait le
                      verset suivant : une mention de service coûtait au texte la place qu'un
                      écran étroit n'a pas. Le volet de droite dit la même chose, et mieux, dès
                      qu'on touche le verset. ⚠️ La marque du bureau, elle, reste : c'est un
                      chiffre nu posé dans une marge qui existe là (voir `marque-densite`). */}
                </div>

              </div>
            </div>
            {rendreFluxEditorial(blocsApres, illustrationsApres)}
            </Fragment>
            )
          })}
          {rendreFluxEditorial(indexBlocs.closing, indexIllustrations.closing)}

          {/* Sous le dernier verset, le chapitre précédent et le suivant, nommés : qui a lu
              jusqu'au bout n'a plus à remonter chercher la flèche (audit du 2026-09-21).
              ⚠️ Pas sous une mention d'absence : il n'y a rien eu à lire. */}
          {!texteAbsent && surAxeTexte(
            <NavigationBasChapitre precedent={voisins.precedent} suivant={voisins.suivant} position={voisins.position} onAller={naviguer} />,
          )}
          </>)}
        </div>
      </div>
      <LassoLecture
        zone={refDefileur}
        defileur={refDefileur}
        actif={lassoActif}
        contexte={`${livreActif}|${chapitreActif}|${traduction}`}
        selecteurCibles="[data-lasso-verset]"
        cleDe={element => element.getAttribute('data-lasso-verset')}
        surbrillance={cle => `[data-lasso-verset="${cle}"]`}
        horsLasso=".verset-row, .cs-bible-bloc"
        unite={UNITE_VERSETS}
        gouttiere={GOUTTIERE_ACTIONS_VERSET}
        dejaEnregistres={dejaPreleves}
        onEnregistrer={enregistrerLasso}
        onRetirer={retirerLasso}
        onCopier={copierLasso}
        onLance={lacherLeVersetChoisi}
      />
      <LassoTactile
        zone={refDefileur}
        actif={lassoTactileActif}
        contexte={`${livreActif}|${chapitreActif}|${traduction}`}
        selecteurCibles="[data-lasso-verset]"
        cleDe={element => element.getAttribute('data-lasso-verset')}
        surbrillance={cle => `[data-lasso-verset="${cle}"]`}
        unite={UNITE_VERSETS}
        dejaEnregistres={dejaPreleves}
        onEnregistrer={enregistrerLasso}
        onRetirer={retirerLasso}
        onCopier={copierLasso}
        onLance={lacherLeVersetChoisi}
      />
      {editionCible && (
        <ModaleEditionVerset
          verset={editionCible}
          traduction={traduction}
          traductionLabel={traductionLabel}
          refCourt={`${ABREV_FR[livreActif] || livreActif} ${chapitreActif}, ${editionCible.verset}`}
          valeurActuelle={String(overrides[editionCible.id_verset]?.[traduction] ?? editionCible[traduction] ?? '')}
          onClose={() => setEditionCible(null)}
          onEnregistre={(nouvelleValeur) => {
            setOverrides(prev => ({ ...prev, [editionCible.id_verset]: { ...prev[editionCible.id_verset], [traduction]: nouvelleValeur } }))
            setEditionCible(null)
          }}
        />
      )}
    </div>
  )
}
