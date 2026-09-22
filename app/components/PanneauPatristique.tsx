'use client'

import { CLASSE_ACTIONS_CARTE_VOLET, CLASSE_CARTE_VOLET, CORPS_CARTE_VOLET, FEUILLE_CARTE_VOLET, INTERLIGNE_CARTE_VOLET, STYLE_CARTE_VOLET } from '@/app/lib/carteVolet'
import { Z_FENETRE, Z_TIROIR, Z_TIROIR_VOILE } from '@/app/lib/empilement'
import { useState, useEffect, useId, useMemo, useRef, useCallback } from 'react'
import { supabase } from "@/app/lib/supabase"
import { texteSansEnrichissement } from '@/app/oeuvre/[id]/texteEnrichi'
// ⛔ Le texte d'un extrait se rend par le MOTEUR de la page de lecture, et nulle part
// ailleurs : le volet en portait une copie, qui avait pris du retard sur les conventions
// du corpus et ne savait ni projeter une ancre positionnelle, ni lire une note
// structurée. Seul l'APPEL change ici — il déplie la note au-dessus de l'extrait au
// lieu d'ouvrir un encart flottant (`NoteDuVolet`).
import { ContenuDeLaNote, rendreTexteAvecNotes } from '@/app/oeuvre/[id]/appelNote'
import type { NoteAffichee } from '@/app/oeuvre/[id]/oeuvreTypes'
import { chargerNotesDesSegments, type NotesDuSegment } from '@/app/lib/notesStructureesChargement'
import { clesDesExtraits, composerExtrait, segmentDeLaCle } from '@/app/lib/extraitVolet'
import { AppelDuVolet, NoteDuVolet } from '@/app/components/NoteDuVolet'
import { intituleDeLaNote, libelleDeLaNote, LIBELLE_NOTE_SANS_TYPE } from '@/app/lib/typeNote'
import { signesDeLaNote } from '@/app/lib/compositionNote'
import IconeSignalement from '@/app/components/IconeSignalement'
import IconeCopier from '@/app/components/IconeCopier'
import { avecHoteEclat, EclatCopie, useEclatCopie } from '@/app/components/EclatCopie'
import { anneeChronologique, comparerChronologie } from '@/app/lib/chronologiePatristique'
import { useAffichageAdmin } from '@/app/lib/contexteAffichageAdmin'
import { estOeuvrePubliee } from '@/app/lib/oeuvresPublication'
import { segmentsLiesAuVerset, segmentsLiesAuChapitre, segmentsLiesAPlage, type TypeLien } from '@/app/lib/liens'
import IconeSignet from '@/app/components/IconeSignet'
import { HAUTEUR_NAVBAR, BANDEAU_NAV_MOBILE } from '@/app/lib/mesures'
import ModalSignalement from '@/app/components/ModalSignalement'
import { useCompte } from '@/app/lib/contexteCompte'
import { citationPatristique, copierCitation } from '@/app/lib/citation'
import { COLONNES_IDENTITE_TEXTE, identiteCitee, parametreTexte, type LigneIdentiteTexte } from '@/app/lib/identiteCitee'
import { indexEditeursNavigateur } from '@/app/lib/editeurs'
import { signalerProgression } from '@/app/components/AnnonceHautsFaits'
import RailVolet from '@/app/components/RailVolet'
import IconeChevron from '@/app/components/IconeChevron'
import { ecartsAMesurer, numerosDeLEcart, regrouperCitations, texteDuGroupe, type Ecart } from '@/app/lib/regrouperCitations'
import { niveauxDuSegment, titreEntrePassages, type NiveauxDuPassage } from '@/app/lib/titresDeDivision'
import { lancerEnParallele, lotsPourClauseIn } from '@/app/lib/paginationSupabase'
import FiltresPatristiques, { useFiltresPatristiques, type MetaAuteur } from '@/app/components/FiltresPatristiques'
import { chargerContrepartiesFrancaises } from '@/app/lib/contrepartieFrancaise'
import { MarqueAttenteVolet } from '@/app/lib/attenteNavigation'
import FleuronDiscret from '@/app/components/FleuronDiscret'
import CompteEnAttente from '@/app/components/CompteEnAttente'
import dynamic from 'next/dynamic'
import { cleInventaireNotesBible, type ContexteNotesBible } from '@/app/lib/notesBibleInventaire'
import EtatVideVolet, { MentionVide } from '@/app/components/EtatVideVolet'
import { useFermerAEchap } from '@/app/lib/useFermerAEchap'
import { useFenetreModale } from '@/app/lib/useFenetreModale'
import { adresseRetourBible } from '@/app/lib/retourLecture'

// ⛔ L'inventaire des notes d'une bible ne se charge qu'avec son onglet : il ne sert qu'à
// l'administrateur, et le lecteur n'a pas à en payer le poids.
const OngletNotesBible = dynamic(() => import('@/app/components/OngletNotesBible'))
const OngletSemantique = dynamic(() => import('@/app/components/OngletSemantique'))
// La discussion des lecteurs ne se charge qu'au clic sur son onglet, comme `OngletNotesBible`.
const OngletCommentaires = dynamic(() => import('@/app/components/OngletCommentaires'))

/** Ce que le rail et la barre mobile écrivent quand le volet est fermé : l'ACTION,
 *  jamais le contenu. « Commentaires » sur une bande fermée décrit ce qu'on ne voit
 *  pas ; « Ouvrir les commentaires » dit ce qu'un clic fera. */
const LIBELLE_RAIL = 'Ouvrir les commentaires'

type Verset = { id_verset: string; ref: string; verset: number; chapitre: number }
type Segment = {
  // ⛔ `id_texte` DÉCIDE des regroupements, `id_oeuvre` ne fait que nommer : une œuvre
  // porte plusieurs textes (La Cité de Dieu son latin et son français, tous deux liés
  // à des versets) et leurs `segment_numero` se recouvrent.
  id: number; id_oeuvre: string; id_texte: string; segment_numero: number
  segment_texte: string; ref_niv1: string; ref_niv2: string
  ref_niv3: string; ref_niv4?: string | null; notes?: string | null
  segment_key?: string | null
  // ⚠️ Le segment qui PORTE le lien biblique, quand ce n'est pas celui qu'on montre :
  // un lien posé sur un latin s'affiche dans sa contrepartie française (voir
  // `contrepartieFrancaise`). Ce qu'on lit, ouvre et prélève est le français ; le
  // retrait d'un lien, lui, vise toujours le segment d'origine.
  idLien: number
  /** Les segments français d'un EMPAN, quand la contrepartie d'un latin en réunit
   *  plusieurs (`chargerContrepartiesFrancaises`) : le volet pose les appels et lit les
   *  notes de chacun (`composerExtrait`). */
  parties?: { id_texte: string; segment_key: string | null; segment_texte: string; notes?: string | null }[]
}
type OeuvreInfo = {
  titre: string; sous_titre?: string; auteur_nom: string; id_auteur?: string
  trad_auteur: string | null; editeur: string | null
  collection?: string; ville: string | null; date_publication: string | null
  // ⛔ `date_publication` est la date de l'ÉDITION MODERNE, et elle sert la CITATION.
  // `date_composition` est celle de l'œuvre, et elle sert le CLASSEMENT. Ne pas les
  // confondre : les Confessions valent 1649 pour l'une, « Vers 397-401 » pour l'autre.
  date_composition: string | null
  genre?: string | null
  /** Jusqu'où la lecture de l'œuvre compose ses titres : c'est là qu'une citation se coupe
   *  (charte § 38.8.1). */
  niveaux_corps: number | null
}

// ⛔ 24 PX DE CIBLE, LE DESSIN INCHANGÉ (audit ergonomique du 2026-09-21) : les icônes
// faisaient des boîtes de 16 px, collées l'une à l'autre, et un clic manqué sur la copie
// tombait sur la suppression d'un lien. La boîte passe au plancher AA de 24 px, l'icône
// garde sa taille, et la grappe s'espace de 4 px. Au doigt, `.cs-bouton-fin` porte la
// boîte à 36 px (globals.css) ; ⚠️ pas de `.cs-cible-fine` ici : son débord de 12 px
// ferait avaler à un bouton les taps de son voisin, et c'est précisément le défaut corrigé.
const ACTION_BTN: React.CSSProperties = {
  background:'none', border:'none', cursor:'pointer', padding:'4px',
  borderRadius:'4px', width:'24px', height:'24px', display:'inline-flex',
  alignItems:'center', justifyContent:'center', fontSize:'0.84375rem',
  lineHeight:1, flexShrink:0, transition:'color 0.15s',
}

/**
 * Les actions d'une carte, AU TÉLÉPHONE (demande de l'auteur, 2026-09-22) : plus
 * petites, serrées, calées en haut à droite sur la ligne du nom de l'auteur.
 * ⚠️ La règle globale `@media (hover: none)` porte chaque `.cs-bouton-fin` à 36 px, en
 * `!important` : trois boutons y faisaient une grappe de 116 px, centrée sur deux lignes.
 * On revient ici au plancher AA de 24 px, sans écart, glyphe de 10 px. La marge
 * négative centre le bouton sur la ligne de l'auteur (0,75 rem × 1,2).
 */
const ACTIONS_CARTE_MOBILE = `
  [data-visite='peres'] .cs-carte-volet-actions { margin-top: calc(0.45rem - 12px); }
  [data-visite='peres'] .cs-carte-volet-actions > div { gap: 0 !important; }
  [data-visite='peres'] .cs-carte-volet-actions .cs-bouton-fin { width: 24px !important; height: 24px !important; padding: 0 !important; }
  [data-visite='peres'] .cs-carte-volet-actions svg { width: 10px; height: 11px; }
`

// ── Détection admin fiable, via profils.est_admin du compte connecté ─────────
// (le cookie bp_admin_session est HttpOnly, donc invisible et inutilisable
// depuis un composant client — c'est pour ça que ça ne fonctionnait jamais.)
//
// La lecture de `profils` vit désormais dans `ProvisionCompte`, une seule fois pour
// toute la page : ce volet la refaisait pour son compte, comme la barre et le texte
// biblique, chacun sans savoir que les autres l'avaient déjà demandée.
function useIsAdmin() {
  return useCompte().estAdmin
}


// ── Bouton copie segment ──────────────────────────────────────────────────────
function BoutonCopieSegment({ texte, auteur, titre, sous_titre, trad_auteur, editeur, collection, ville, date_publication, responsable }: {
  texte: string; auteur: string; titre: string; sous_titre?: string
  trad_auteur?: string; editeur?: string; collection?: string; ville?: string; date_publication?: string
  responsable?: string
}) {
  const { copie, eclat, briller } = useEclatCopie()
  const handle = (e: React.MouseEvent) => {
    e.stopPropagation()
    const citation = citationPatristique(texte, { auteur, titre, sousTitre: sous_titre, tradAuteur: trad_auteur, editeur, collection, ville, datePublication: date_publication, responsable })
    copierCitation(citation).then(briller)
  }
  return (
    <button onClick={handle} title="Copier ce segment" aria-label="Copier ce segment"
      className={avecHoteEclat('cs-bouton-fin')} style={{ ...ACTION_BTN, color: copie ? 'var(--cs-vert)' : 'var(--cs-bord)' }}>
      <IconeCopier />
      <EclatCopie eclat={eclat} />
    </button>
  )
}

// ── Bouton enregistrer segment ────────────────────────────────────────────────
// ⛔ L'ÉTAT VIENT DU VOLET, qui lit les prélèvements de la page (clé `user_id` +
// `segment_id`) : le bouton partait toujours de « non prélevé », si bien qu'un passage déjà
// enregistré s'enregistrait une seconde fois. Il montre son geste aussitôt, et le défait si
// la base le refuse, en le disant discrètement (encre d'alerte et infobulle).
function BoutonEnregistrerSegment({ segment, info, userId, enregistre, onChange }: {
  segment: Segment; info?: OeuvreInfo; userId: string | null
  /** `null` : l'état n'est pas encore connu, le bouton attend. */
  enregistre: boolean | null
  onChange: (segmentId: number, enregistre: boolean) => void
}) {
  const [loading, setLoading] = useState(false)
  const [echec, setEchec] = useState<string | null>(null)
  const { exigerCompte } = useCompte()
  useEffect(() => {
    if (!echec) return
    const t = setTimeout(() => setEchec(null), 4000)
    return () => clearTimeout(t)
  }, [echec])
  if (!userId) return null

  const enregistrer = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (enregistre !== false || loading) return
    if (!exigerCompte('prélever ce passage')) return
    setLoading(true); setEchec(null)
    onChange(segment.id, true)
    const { error } = await supabase.from('prelevements').insert({
      user_id: userId, type: 'patristique',
      auteur: info?.auteur_nom || segment.id_oeuvre,
      titre_oeuvre: info?.titre || '',
      ref_niv1: segment.ref_niv1 || null,
      ref_niv2: segment.ref_niv2 || null,
      id_oeuvre: segment.id_oeuvre,
      // ⛔ LE SEGMENT ET SON TEXTE, et non le seul numéro : sans eux, le déclencheur
      //    `resoudre_prelevement_segment` cherchait le numéro dans le texte PAR DÉFAUT.
      segment_id: segment.id,
      id_texte: segment.id_texte,
      segment_numero: segment.segment_numero,
      texte: segment.segment_texte,
    })
    setLoading(false)
    if (error) {
      console.error('[volet] prélèvement refusé :', error)
      onChange(segment.id, false)
      setEchec('Le passage n’a pas pu être ajouté à vos prélèvements.')
      return
    }
    signalerProgression()
  }

  // Le retrait vise la CLÉ NATURELLE (ce lecteur, ce segment) : un doublon ancien part avec.
  const supprimer = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (enregistre !== true || loading) return
    setLoading(true); setEchec(null)
    onChange(segment.id, false)
    const { error } = await supabase.from('prelevements').delete().eq('user_id', userId).eq('segment_id', segment.id)
    setLoading(false)
    if (error) {
      console.error('[volet] retrait refusé :', error)
      onChange(segment.id, true)
      setEchec('Le passage n’a pas pu être retiré de vos prélèvements.')
    }
  }

  const libelle = echec ?? (enregistre ? 'Retirer de mes prélèvements' : 'Ajouter à mes prélèvements')
  const couleur = echec ? 'var(--cs-danger)' : enregistre ? 'var(--cs-texte-doux)' : 'var(--cs-bord)'
  return (
    <button onClick={enregistre ? supprimer : enregistrer} disabled={loading || enregistre === null}
      title={libelle} aria-label={libelle} aria-pressed={enregistre === true}
      className="cs-bouton-fin" style={{ ...ACTION_BTN, color: couleur }}>
      {loading ? '…' : <IconeSignet plein={enregistre === true} />}
    </button>
  )
}

// ── Bouton supprimer lien (admin uniquement) ──────────────────────────────────
// ⛔ LES LIENS VIVENT DANS `liens_bibliques`, une ligne par lien : l'ancien bouton écrivait
// `segments.lien_N = null`, des colonnes mortes, et la carte disparaissait sans que rien ne
// change en base. On supprime les lignes (la politique `liens_bibliques_admin_all` l'ouvre à
// l'administrateur), on lit l'erreur, et la carte ne part qu'en cas de succès.
function BoutonSupprimerLien({ lienIds, isAdmin, onSupprime }: {
  lienIds: number[]; isAdmin: boolean; onSupprime: () => void
}) {
  const [confirme, setConfirme] = useState(false)
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState(false)
  if (!isAdmin || lienIds.length === 0) return null

  if (!confirme) {
    return (
      <button onClick={e => { e.stopPropagation(); setConfirme(true); setErreur(false) }}
        title="Supprimer ce lien biblique" aria-label="Supprimer ce lien biblique"
        className="cs-bouton-fin" style={{ ...ACTION_BTN, fontSize:'1.125rem', color:'var(--cs-bord)' }}>
        ×
      </button>
    )
  }
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:'6px', flexShrink:0, flexWrap:'wrap', justifyContent:'flex-end' }}>
      <button onClick={async e => {
        e.stopPropagation()
        setLoading(true); setErreur(false)
        const { error } = await supabase.from('liens_bibliques').delete().in('id', lienIds)
        setLoading(false)
        if (error) { console.error('[volet] suppression du lien refusée :', error); setErreur(true); return }
        onSupprime()
      }} disabled={loading}
        aria-label="Confirmer la suppression du lien"
        style={{ fontSize:'0.6875rem', minHeight:'24px', padding:'2px 8px', borderRadius:'4px', border:'none', background:'var(--cs-danger-aplat)', color:'var(--cs-sur-aplat)', cursor:'pointer' }}>
        {loading ? '…' : 'Supprimer'}
      </button>
      <button onClick={e => { e.stopPropagation(); setConfirme(false); setErreur(false) }}
        style={{ fontSize:'0.6875rem', minHeight:'24px', padding:'2px 8px', borderRadius:'4px', border:'1px solid var(--cs-bord)', background:'var(--cs-surface)', color:'var(--cs-texte-second)', cursor:'pointer' }}>
        Annuler
      </button>
      {erreur && <span role="alert" style={{ fontSize:'0.6875rem', color:'var(--cs-danger)' }}>Échec de la suppression.</span>}
    </span>
  )
}

// ── Modale signalement ────────────────────────────────────────────────────────
// Composant partagé unique (voir app/components/ModalSignalement), importé en tête.

// ── Carte segment ─────────────────────────────────────────────────────────────
/** Le type d'une note pour le lecteur d'écran, ou « Note » quand elle n'en déclare aucun. */
const libelleNoteVolet = (contenu: NoteAffichee | undefined) =>
  !contenu || typeof contenu === 'string' ? LIBELLE_NOTE_SANS_TYPE : libelleDeLaNote(contenu)

function SegmentCard({ s, texteAffichage, notes, notesEnAttente, info, edition, userId, isAdmin, lienIds, enregistre, onEnregistre, retour, onSignaler, onSupprimeLien }: {
  s: Segment; info?: OeuvreInfo; userId: string | null; isAdmin: boolean
  /** Le chemin du verset (ou de la péricope) d'où l'on ouvre le passage : la page
   *  d'œuvre en fait un lien « Retour à … » (`?depuis=`, voir `retourLecture`). */
  retour: string | null
  /** L'ÉDITION du passage (`oeuvre_textes`) : c'est elle que la citation nomme, non l'œuvre. */
  edition?: LigneIdentiteTexte
  /** Ce qu'on LIT : l'initiale capitalisée et les appels structurés projetés (voir
   *  `composerExtrait`). `s.segment_texte` reste le texte canonique, celui qu'on copie. */
  texteAffichage: string
  /** Les notes que ses appels ouvrent, par marqueur. */
  notes: Record<string, NoteAffichee>
  /** Ses notes structurées ne sont pas encore arrivées. */
  notesEnAttente: boolean
  /** Les lignes de `liens_bibliques` que le bouton d'administration supprime. */
  lienIds: number[]
  /** Le passage est-il dans les prélèvements du lecteur ? `null` : pas encore lu. */
  enregistre: boolean | null
  onEnregistre: (segmentId: number, enregistre: boolean) => void
  onSignaler: (s: Segment, titreOeuvre?: string) => void
  onSupprimeLien: () => void
}) {
  // ── LA NOTE DÉPLIÉE ─────────────────────────────────────────────────────────
  // Une seule à la fois par extrait : ouvrir une autre la remplace, recliquer son appel
  // la referme. Elle s'ouvre AU-DESSUS du texte, sur toute la largeur du volet
  // (`NoteDuVolet`), et non plus dans une infobulle que le défileur coupait.
  const idNote = useId()
  const [ouverte, setOuverte] = useState<{ marqueur: string; numero: number; auClavier: boolean } | null>(null)
  const appelOuvrant = useRef<HTMLElement | null>(null)
  const fermerNote = () => {
    setOuverte(null)
    // Le foyer revient à l'appel qui l'avait ouverte ; sans lui, il retomberait au haut
    // du document.
    appelOuvrant.current?.focus({ preventScroll: true })
  }
  const contenuOuvert = ouverte ? notes[ouverte.marqueur] : undefined
  // ⛔ La citation nomme l'ÉDITION du passage, silence compris (`identiteCitee`) : lue à
  //    l'œuvre, un extrait de Ceriziers 1646 se citait sous Mirandol, Hachette, 1861.
  const identite = identiteCitee(info ?? {}, edition, indexEditeursNavigateur())
  const niveaux = [s.ref_niv1, s.ref_niv2, s.ref_niv3].filter(Boolean).join(', ')

  return (
    // La case : même forme que celle du volet biblique d'une œuvre (`carteVolet.ts`).
    <div className={CLASSE_CARTE_VOLET} style={STYLE_CARTE_VOLET}>

      {/* Ligne méta : auteur + titre + niveaux (gauche), badge + actions (droite) */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:'6px', marginBottom:'6px' }}>
        <div style={{ minWidth:0 }}>
          {/* ⛔ PLUS DE NUMÉRO DE VERSET AU-DESSUS DE L'AUTEUR (décision de l'auteur,
              2026-09-22) : la carte s'ouvre sur le nom de l'auteur. */}
          <div style={{ display:'flex', alignItems:'center', gap:'4px', marginBottom:'1px' }}>
            {info?.id_auteur ? (
              <a href={`/auteur/${info.id_auteur}`}
                style={{ fontSize:'0.75rem', fontWeight:600, color:'var(--cs-vert)', lineHeight:1.2, letterSpacing:'0.026em', textDecoration:'none' }}>
                {info.auteur_nom || s.id_oeuvre}
              </a>
            ) : (
              <span style={{ fontSize:'0.75rem', fontWeight:600, color:'var(--cs-vert)', lineHeight:1.2, letterSpacing:'0.026em' }}>
                {info?.auteur_nom || s.id_oeuvre}
              </span>
            )}
          </div>
          {/* ⛔ Plus de flèche à côté du nom (décision de l'auteur, 21 septembre 2026) : le
              TITRE mène au passage exact. ⚠️ La page ne cherche le segment visé que dans le
              texte qu'elle ouvre : un passage d'une autre édition porte `texte=`.
              ⛔ DANS LE MÊME ONGLET, et il se LIT comme un lien (audit ergonomique,
              2026-09-21) : le vert des liens du site, souligné au survol et au foyer
              (`.cs-fiche-lien`). Précédent ramène au verset ; `depuis=` donne à la page
              d'œuvre un lien de retour. */}
          <a href={`/oeuvre/${s.id_oeuvre}?${[parametreTexte(edition), `segment=${s.id}`, retour ? `depuis=${encodeURIComponent(retour)}` : ''].filter(Boolean).join('&')}#segment-${s.id}`}
            className="cs-fiche-lien"
            title={niveaux ? `${niveaux} — accéder au passage` : 'Accéder au passage exact dans l’œuvre'}
            style={{ display:'block', fontSize:'0.75rem', fontStyle:'italic', margin:0, lineHeight:1.2, letterSpacing:'0.02em' }}>
            {info?.titre || ''}
          </a>
          {/* ⛔ La nature du rapport (citation directe, paraphrase…) ne s'affiche plus
              (décision de l'auteur, 21 septembre 2026). Les sous-onglets et les filtres la
              disent déjà. */}
        </div>
        <div className={CLASSE_ACTIONS_CARTE_VOLET} style={{ display:'flex', flexDirection:'column', gap:'4px', alignItems:'flex-end', flexShrink:0 }}>
          <div style={{ display:'flex', gap:'4px', alignItems:'center', justifyContent:'flex-end' }}>
            <BoutonEnregistrerSegment segment={s} info={info} userId={userId} enregistre={enregistre} onChange={onEnregistre} />
            <BoutonCopieSegment
              texte={texteSansEnrichissement(s.segment_texte)} auteur={info?.auteur_nom || s.id_oeuvre} titre={info?.titre || ''}
              sous_titre={info?.sous_titre}
              trad_auteur={identite.tradAuteur ?? undefined} editeur={identite.editeur ?? undefined}
              collection={identite.collection ?? undefined} ville={identite.ville ?? undefined}
              date_publication={identite.datePublication ?? undefined} responsable={identite.responsable ?? undefined}
            />
            <button onClick={e => { e.stopPropagation(); onSignaler(s, info?.titre) }} title="Signaler une erreur" aria-label="Signaler une erreur"
              className="cs-bouton-fin" style={{ ...ACTION_BTN, color:'var(--cs-bord)' }}>
              <IconeSignalement />
            </button>
          </div>
          {/* ⛔ LA SUPPRESSION VIT À PART (audit ergonomique du 2026-09-21) : collé à la
              copie, le « × » d'administration se prenait pour elle. Il descend sur sa
              propre rangée, sous les actions qui ne détruisent rien, et demande toujours
              confirmation. */}
          <BoutonSupprimerLien lienIds={lienIds} isAdmin={isAdmin} onSupprime={onSupprimeLien} />
        </div>
      </div>

      {/* ⛔ LA NOTE S'OUVRE AU-DESSUS DU TEXTE QU'ELLE ANNOTE, sur toute la largeur du
          volet (demande de l'auteur, 2026-09-11). L'appel reste dans le texte, marqué tant
          qu'elle est ouverte ; c'est lui qui la referme, avec la croix et Échap. */}
      {ouverte && (
        <NoteDuVolet
          id={idNote}
          numero={ouverte.numero}
          intitule={contenuOuvert && typeof contenuOuvert !== 'string' ? intituleDeLaNote(contenuOuvert) : null}
          etiquette={`${libelleNoteVolet(contenuOuvert)} ${ouverte.numero}`}
          signes={contenuOuvert ? signesDeLaNote(contenuOuvert) : 0}
          enAttente={contenuOuvert === undefined && notesEnAttente}
          auClavier={ouverte.auClavier}
          onFermer={fermerNote}
        >
          <ContenuDeLaNote contenu={contenuOuvert ?? ''} />
        </NoteDuVolet>
      )}

      {/* Texte du segment.
          ⚠️ L'INITIALE SE CAPITALISE, À L'AFFICHAGE SEUL (demande de l'auteur, 2026-09-04 :
          « toute référence patristique citée dans le volet de droite doit comporter une
          majuscule en début de phrase ; seulement à l'affichage »). Un extrait commence là
          où le lien le prend, c'est-à-dire souvent au milieu d'une phrase de l'édition —
          « aussi les Grecs lui ont-ils donné le nom de cosmos… » —, et il se lit alors
          comme une phrase amputée. ⛔ La donnée ne bouge pas : c'est `capitaliserInitiale`,
          la fonction qui sert déjà le presse-papiers des citations, et elle ne change
          jamais la longueur du texte — les appels de note se posent par offset.
          ⚠️ Elle passe AVANT `rendreTexteAvecNotes` : la capitale appartient au texte, non
          au balisage, et l'appliquer après aurait demandé de descendre dans le rendu. */}
      {/* ⛔ Les appels de note s'y GRISENT (décision de l'auteur, 21 septembre 2026) : le
          volet est déjà de l'appareil, et l'ocre des appels y faisait une couleur de plus
          à chaque ligne. On redéfinit le jeton qu'ils lisent, sur ce seul paragraphe :
          l'appel et le séparateur « & » suivent ensemble. Encre `--cs-texte-second`, qui
          tient le seuil de 4,5 d'un signe qui porte seul son information. */}
      <p lang="fr" style={{ '--cs-lacune':'var(--cs-texte-second)', fontSize:CORPS_CARTE_VOLET, lineHeight:INTERLIGNE_CARTE_VOLET, color:'var(--cs-texte-fort)', textAlign:'justify', textJustify:'inter-word', margin:'0 0 1px', wordSpacing:'-0.08em', hyphens:'auto', WebkitHyphens:'auto', overflowWrap:'break-word' } as React.CSSProperties}>
        {/* ⚠️ La capitale et les appels projetés arrivent POSÉS (`composerExtrait`) : la
            capitale passe avant la projection, qui compte ses offsets dans le texte. */}
        {rendreTexteAvecNotes(texteAffichage, notes, 'corps', {
          appel: ({ marqueur, contenu, numeroVisible }) => (
            <AppelDuVolet
              numero={numeroVisible}
              libelle={libelleNoteVolet(contenu)}
              ouverte={ouverte?.marqueur === marqueur}
              controle={idNote}
              onBasculer={(auClavier, appel) => {
                appelOuvrant.current = appel
                setOuverte(avant => (avant?.marqueur === marqueur ? null : { marqueur, numero: numeroVisible, auClavier }))
              }}
            />
          ),
        })}
      </p>
    </div>
  )
}

// ── LA LIGNE DU COMPTE SOUS UN ONGLET DU VOLET ──────────────────────────────
//
// Demande de l'auteur (14 septembre 2026) : pendant que le volet se recharge, « le nombre
// d'occurrences associé à chacun des cinq onglets change aussi ; serait-il possible de faire
// défiler aléatoirement des caractères grecs, même police, pour que la hauteur des barres
// d'onglets ne varie pas ? ». Le compte disparaissait le temps du chargement, ou restait sur
// celui du passage qu'on quittait, et la barre perdait sa ligne.
//
// ⛔ LA LIGNE EST TOUJOURS RENDUE, et sa HAUTEUR est écrite, en `em` de son propre corps : ce
// qu'elle porte ne décide plus de la hauteur de la barre.
// ⚠️ Trois contenus : des lettres grecques tant qu'on attend (`CompteEnAttente`, dans le corps
// et l'encre du compte), le nombre, ou ∅ sur un compte nul.
// ⚠️ Demande de l'auteur (21 septembre 2026) : ∅ remplace « Aucune occurrence » sous tous
// les onglets. Il prend le corps du compte et l'encre faible, et dit la mention en toutes
// lettres au survol et aux lecteurs d'écran.
const STYLE_COMPTE_NUL: React.CSSProperties = { fontWeight: 400, color: 'var(--cs-texte-doux)' }

function LigneCompte({ enAttente, compte, style, videDit }: {
  enAttente: boolean
  compte: number | null | undefined
  /** Corps, interligne, HAUTEUR et encre de la ligne. */
  style: React.CSSProperties
  /** Ce qui s'écrit quand le compte est nul ; rien, s'il n'est pas donné. */
  videDit?: string
}) {
  return (
    <span style={{ display: 'block', whiteSpace: 'nowrap', ...style }}>
      {enAttente ? <CompteEnAttente />
        : compte != null && compte > 0 ? compte
        : compte === 0 && videDit ? <span style={STYLE_COMPTE_NUL} title="Aucune occurrence" aria-label="Aucune occurrence">{videDit}</span>
        : null}
    </span>
  )
}

// ── LES MÉTADONNÉES DES EXTRAITS ────────────────────────────────────────────────
// ⛔ ON NE CHARGE QUE CE QUE LES SEGMENTS NOMMENT (2026-09-22). Le volet lisait au montage
// `oeuvres`, `auteurs` et `oeuvre_textes` EN ENTIER, les deux premiers en cascade, sans lire
// leur erreur. Il lit désormais les œuvres et les éditions des extraits qu'il montre, en
// parallèle, l'auteur embarqué dans l'œuvre, et garde tout dans un cache de module : revenir
// à un verset déjà vu ne coûte rien.
// ⚠️ `null` : l'œuvre n'est pas publiée (ou introuvable), et ses extraits ne paraissent pas.
const cacheOeuvres = new Map<string, OeuvreInfo | null>()
const cacheAuteurs = new Map<string, MetaAuteur>()
const cacheEditions = new Map<string, LigneIdentiteTexte | null>()

const COLONNES_OEUVRE = 'id_oeuvre, titre, sous_titre, id_auteur, trad_auteur, editeur, collection, ville, date_publication, date_composition, genre, niveaux_corps, acces_public, auteurs!oeuvres_id_auteur_fkey(nom, traditions, siecle, date_mort)'

type LigneOeuvre = {
  id_oeuvre: string; titre: string | null; sous_titre: string | null; id_auteur: string | null
  trad_auteur: string | null; editeur: string | null; collection: string | null; ville: string | null
  date_publication: string | null; date_composition: string | null; genre: string | null
  niveaux_corps: number | null; acces_public: boolean | null
  auteurs: { nom: string | null; traditions: string[] | null; siecle: number | null; date_mort: string | null }
    | { nom: string | null; traditions: string[] | null; siecle: number | null; date_mort: string | null }[] | null
}

/** Charge les œuvres et les éditions qui manquent au cache. Une œuvre illisible LÈVE : sans
 *  elle, l'extrait ne peut pas se nommer. Une édition illisible se consigne seulement : la
 *  citation retombe sur l'œuvre. */
async function chargerMetadonnees(idsOeuvres: string[], idsTextes: string[]) {
  const oeuvresManquantes = [...new Set(idsOeuvres)].filter(id => !cacheOeuvres.has(id))
  const textesManquants = [...new Set(idsTextes)].filter(id => id && !cacheEditions.has(id))
  const [reponsesOeuvres, reponsesTextes] = await Promise.all([
    lancerEnParallele(lotsPourClauseIn(oeuvresManquantes).map(lot => () =>
      supabase.from('oeuvres').select(COLONNES_OEUVRE).in('id_oeuvre', lot))),
    lancerEnParallele(lotsPourClauseIn(textesManquants).map(lot => () =>
      supabase.from('oeuvre_textes').select(COLONNES_IDENTITE_TEXTE).in('id_texte', lot))),
  ])
  for (const r of reponsesOeuvres) if (r.error) throw r.error
  for (const r of reponsesOeuvres) {
    for (const o of (r.data ?? []) as unknown as LigneOeuvre[]) {
      const auteur = Array.isArray(o.auteurs) ? o.auteurs[0] ?? null : o.auteurs
      if (o.id_auteur && auteur) cacheAuteurs.set(o.id_auteur, { traditions: auteur.traditions ?? [], siecle: auteur.siecle ?? null, date_mort: auteur.date_mort ?? null })
      cacheOeuvres.set(o.id_oeuvre, estOeuvrePubliee(o) ? {
        titre: o.titre || o.id_oeuvre,
        sous_titre: o.sous_titre || undefined,
        id_auteur: o.id_auteur || undefined,
        auteur_nom: auteur?.nom || '',
        trad_auteur: o.trad_auteur || null,
        editeur: o.editeur || null,
        collection: o.collection || undefined,
        ville: o.ville || null,
        date_publication: o.date_publication || null,
        date_composition: o.date_composition || null,
        genre: o.genre || null,
        niveaux_corps: o.niveaux_corps ?? null,
      } : null)
    }
  }
  // Ce que la base n'a pas rendu n'est pas lisible : on ne le redemandera pas.
  for (const id of oeuvresManquantes) if (!cacheOeuvres.has(id)) cacheOeuvres.set(id, null)
  const echecTextes = reponsesTextes.find(r => r.error)
  if (echecTextes) console.error('[volet] éditions illisibles, citation à l’œuvre :', echecTextes.error)
  else {
    for (const r of reponsesTextes) for (const l of (r.data ?? []) as unknown as LigneIdentiteTexte[]) cacheEditions.set(l.id_texte, l)
    for (const id of textesManquants) if (!cacheEditions.has(id)) cacheEditions.set(id, null)
  }
}

const instantaneOeuvres = () => {
  const r: Record<string, OeuvreInfo> = {}
  for (const [id, o] of cacheOeuvres) if (o) r[id] = o
  return r
}
const instantaneEditions = () => {
  const r: Record<string, LigneIdentiteTexte> = {}
  for (const [id, e] of cacheEditions) if (e) r[id] = e
  return r
}

// Quatre natures de lien : citation directe (1), paraphrase (2), commentaire (3), écho (4).
type Categorie = 'citation_directe' | 'paraphrase' | 'commentaire' | 'echo'
type ItemAffiche = { seg: Segment; col: string; categorie: Categorie; categories: Categorie[] }
const estCitation = (cats: Categorie[]) => cats.includes('citation_directe') || cats.includes('paraphrase')

/** Le type de lien qu'une colonne héritée désignait (la carte le garde pour savoir quoi
 *  supprimer). */
const TYPE_DE_COLONNE: Record<string, TypeLien> = { lien_1: 1, lien_2: 2, lien_3: 3, lien_4: 4 }

/** La circulation aux flèches dans une barre d'onglets (`role="tablist"`) : ← → passent au
 *  voisin, Début et Fin aux bouts, et le foyer suit l'onglet choisi. */
function circulerAuxFleches<C extends string>(e: React.KeyboardEvent, codes: C[], courant: C, choisir: (c: C) => void, idDe: (c: C) => string) {
  const i = codes.indexOf(courant)
  const cible = e.key === 'ArrowRight' ? codes[(i + 1) % codes.length]
    : e.key === 'ArrowLeft' ? codes[(i - 1 + codes.length) % codes.length]
    : e.key === 'Home' ? codes[0]
    : e.key === 'End' ? codes[codes.length - 1]
    : null
  if (!cible) return
  e.preventDefault()
  choisir(cible)
  document.getElementById(idDe(cible))?.focus()
}

// ── Panneau principal ─────────────────────────────────────────────────────────
export default function PanneauPatristique({
  verset, livreActif, chapitreActif,
  panelWidth = null, onWidthChange, mobile = false,
  voletMobile = null, setVoletMobile, barreMobile = true, presentation = 'drawer', sousBarres = true,
  plage, notesBible = null, onChoisirVerset,
}: {
  verset: Verset | null
  livreActif: string
  /** ⚠️ Reçu mais PLUS AFFICHÉ : l'en-tête ne redit plus « Genèse 13, 5 », que la
   *  colonne de lecture porte déjà (2026-09-04). La propriété reste, les appelants la
   *  donnant tous. */
  nomLivre: string
  chapitreActif: number
  panelWidth?: number | null
  onWidthChange?: (w: number) => void
  mobile?: boolean
  voletMobile?: 'livres' | 'commentaires' | null
  setVoletMobile?: (v: 'livres' | 'commentaires' | null) => void
  barreMobile?: boolean
  presentation?: 'drawer' | 'inline'
  /** ⛔ En mode ONGLETS, le panneau réserve la barre d'onglets au-dessus (2,875rem)
   *  et le bandeau de chapitre en dessous. Ces deux barres n'existent QUE sur la page
   *  Bible (audit de responsiveness, 2026-09-06). */
  sousBarres?: boolean
  // Page d'une péricope : charge l'apparat d'une PLAGE canonique exacte plutôt que d'un
  // verset ou d'un chapitre entier.
  plage?: { livre: string; canonDebut: string; canonFin: string | null }
  /** L'édition qu'on lit, pour l'onglet « Notes » de l'administrateur (2026-09-16) ;
   *  `null` hors d'une famille éditoriale qui porte un appareil. */
  notesBible?: ContexteNotesBible | null
  /** Choisir un verset depuis le volet (onglet « Sémantique »). Sans lui, pas d'onglet :
   *  seule la page Bible le donne. */
  onChoisirVerset?: (creneau: string) => void
}) {
  type Onglet = 'patristique' | 'commentaires' | 'notes' | 'semantique'
  type SousOnglet = 'citations' | 'doctrine' | 'echos'
  const ITEMS_PAR_PAGE = 20
  const idBase = useId()
  const idOnglet = (c: string) => `${idBase}-onglet-${c}`
  const idPanneau = `${idBase}-panneau`
  const idSousOnglet = (c: string) => `${idBase}-sous-onglet-${c}`
  const idSousPanneau = `${idBase}-sous-panneau`
  // Le chemin de retour d'un passage ouvert depuis ce volet (voir `SegmentCard`). ⚠️ Lu
  // dans `window` au rendu : les cartes ne se rendent qu'une fois les passages chargés
  // par le navigateur, jamais au rendu serveur.
  const adresseRetour = typeof window === 'undefined' ? null
    : plage ? window.location.pathname
    : livreActif ? adresseRetourBible({ livre: livreActif, chapitre: chapitreActif, verset: verset?.verset ?? null }, window.location.search)
    : null
  const [onglet, setOnglet] = useState<Onglet>('patristique')
  const [sousOnglet, setSousOnglet] = useState<SousOnglet>('citations')
  const [pageItems, setPageItems] = useState(0)
  const [ouvertLocal, setOuvertLocal] = useState(true)
  const refPanel = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 900) setOuvertLocal(false)
  }, [])
  // Mobile : accordéon piloté par le parent (un seul volet ouvert). Desktop : local.
  const ouvert = mobile ? voletMobile === 'commentaires' : ouvertLocal
  const setOuvert = (v: boolean) => { if (mobile) setVoletMobile?.(v ? 'commentaires' : null); else setOuvertLocal(v) }
  // Le tiroir d'un téléphone se ferme à Échap, comme une fenêtre.
  const tiroirOuvert = mobile && presentation !== 'inline' && ouvert
  useFermerAEchap(tiroirOuvert, () => setOuvert(false))
  useFenetreModale(refPanel, tiroirOuvert)

  // Longueur de chaque segment chargé ou mesuré, par « id_texte|numero ». Elle sert
  // à juger une ÉLISION : voir `regrouperCitations`.
  const [longueurs, setLongueurs] = useState<Map<string, number>>(new Map())
  // Les niveaux de division des segments lus dans un écart : un titre qui le traverse
  // empêche la réunion (charte § 38.8.1).
  const [niveauxEcarts, setNiveauxEcarts] = useState<Map<string, NiveauxDuPassage>>(new Map())
  const [segmentsCitations, setSegmentsCitations] = useState<{ seg: Segment; col: string }[]>([])
  const [segmentsDoctrine, setSegmentsDoctrine] = useState<Segment[]>([])
  const [segmentsEcho, setSegmentsEcho] = useState<Segment[]>([])
  // Les lignes de `liens_bibliques` de chaque segment porteur, pour la suppression.
  const [liensParSegment, setLiensParSegment] = useState<Map<number, { id: number; type: TypeLien }[]>>(new Map())
  const [oeuvres, setOeuvres] = useState<Record<string, OeuvreInfo>>(instantaneOeuvres)
  const [auteurMeta, setAuteurMeta] = useState<Record<string, MetaAuteur>>(() => Object.fromEntries(cacheAuteurs))
  // Les éditions, pour citer un passage sous la sienne.
  const [editions, setEditions] = useState<Record<string, LigneIdentiteTexte>>(instantaneEditions)
  const [loading, setLoading] = useState(false)
  // La demande dont les trois listes de segments portent la réponse (voir `cleDemande`).
  const [segmentsPour, setSegmentsPour] = useState<string | null>(null)
  // ⛔ UNE PANNE SE DIT (2026-09-22) : la demande dont le chargement a échoué. Sans elle, une
  // erreur laissait le volet en attente sans fin.
  const [erreurPour, setErreurPour] = useState<string | null>(null)
  const [tentative, setTentative] = useState(0)
  const isAdminReel = useIsAdmin()
  const { modeUtilisateurStandard } = useAffichageAdmin()
  const isAdmin = isAdminReel && !modeUtilisateurStandard
  const { userId, exigerCompte } = useCompte()
  const [segSignale, setSegSignale] = useState<{ seg: Segment; titreOeuvre?: string } | null>(null)

  // ── Compteurs onglets ────────────────────────────────────────────────────────
  // ⛔ LE COMPTE EST RETENU AVEC LE VERSET AUQUEL IL APPARTIENT (14 septembre 2026).
  // ⚠️ Une requête en échec rend `n: null` : la ligne se tait au lieu d'attendre toujours.
  const [compteCommentaires, setCompteCommentaires] = useState<{ pour: Verset['id_verset']; n: number | null } | null>(null)
  const idVersetCourant = verset?.id_verset ?? null
  useEffect(() => {
    if (idVersetCourant === null) return
    const pour = idVersetCourant
    let annule = false
    supabase.from('commentaires').select('id', { count: 'exact', head: true })
      .eq('id_verset', pour)
      .then(({ count, error }) => { if (!annule) setCompteCommentaires({ pour, n: error ? null : count ?? 0 }) })
    return () => { annule = true }
  }, [idVersetCourant])
  const nbCommentairesBible = idVersetCourant !== null && compteCommentaires?.pour === idVersetCourant ? compteCommentaires.n : null
  const attenteCommentaires = idVersetCourant !== null && compteCommentaires?.pour !== idVersetCourant
  const reporterCompteCommentaires = useCallback((n: number) => {
    if (idVersetCourant !== null) setCompteCommentaires({ pour: idVersetCourant, n })
  }, [idVersetCourant])

  // ── L'inventaire des notes (administrateur) ────────────────────────────────────
  // ⛔ LE COMPTE VIENT DE L'ONGLET, quand il a relevé le livre (retenu avec sa clé).
  const notesOffertes = isAdmin && notesBible !== null
  const cleNotes = notesBible ? cleInventaireNotesBible(notesBible) : null
  const [compteNotes, setCompteNotes] = useState<{ pour: string; n: number | null } | null>(null)
  const reporterCompteNotes = useCallback((pour: string, n: number | null) => { setCompteNotes({ pour, n }) }, [])

  // ── L'annotation sémantique (administrateur SEUL, 2026-09-21) ────────────────────
  const semantiqueOfferte = isAdmin && !plage && !!livreActif && !!onChoisirVerset
  const cleSemantique = `${livreActif}|${chapitreActif}|${verset?.id_verset ?? ''}`
  const [compteSemantique, setCompteSemantique] = useState<{ pour: string; n: number | null } | null>(null)
  const reporterCompteSemantique = useCallback((pour: string, n: number | null) => { setCompteSemantique({ pour, n }) }, [])

  // Charger les segments : ceux du verset sélectionné, ou — à défaut de sélection —
  // TOUS ceux du chapitre ouvert, ou ceux d'une plage (péricope).
  // ⛔ L'ATTENTE SE DÉDUIT DE LA DEMANDE, ELLE NE S'ALLUME PAS SEULE (14 septembre 2026) :
  // la clé dit ce qu'on demande, `segmentsPour` ce que les segments portent, et tant
  // qu'elles diffèrent le volet attend (sauf si la demande a échoué).
  const plageLivre = plage?.livre, plageDebut = plage?.canonDebut, plageFin = plage?.canonFin ?? null
  const idVerset = verset?.id_verset ?? null
  const demande = useMemo(() =>
    plageLivre && plageDebut ? { type: 'plage' as const, livre: plageLivre, debut: plageDebut, fin: plageFin }
    : idVerset ? { type: 'verset' as const, idVerset }
    : livreActif ? { type: 'chapitre' as const, livre: livreActif, chapitre: chapitreActif }
    : null,
  [plageLivre, plageDebut, plageFin, idVerset, livreActif, chapitreActif])
  const cleDemande = demande === null ? null
    : demande.type === 'plage' ? `plage|${demande.livre}|${demande.debut}|${demande.fin}`
    : demande.type === 'verset' ? `verset|${demande.idVerset}`
    : `chapitre|${demande.livre}|${demande.chapitre}`
  const enAttente = loading || (cleDemande !== null && segmentsPour !== cleDemande)
  // Une demande en échec a sa réponse — vide — et son erreur : le volet cesse d'attendre.
  const echec = !enAttente && cleDemande !== null && erreurPour === cleDemande
  useEffect(() => {
    setPageItems(0)
    if (demande === null) {
      setSegmentsCitations([]); setSegmentsDoctrine([]); setSegmentsEcho([]); setLiensParSegment(new Map()); setSegmentsPour(null)
      return
    }
    const cle = cleDemande
    setLoading(true)
    setErreurPour(null)
    let annule = false

    // La recherche inverse passe par `liens_bibliques` (index sur `canon_id`, paginé).
    const SEG_COLS = 'id, id_oeuvre, id_texte, segment_key, segment_numero, segment_texte, ref_niv1, ref_niv2, ref_niv3, ref_niv4, notes'
    ;(async () => {
      try {
        const liens = demande.type === 'plage'
          ? await segmentsLiesAPlage(demande.livre, demande.debut, demande.fin)
          : demande.type === 'verset'
          ? await segmentsLiesAuVerset(demande.idVerset)
          : await segmentsLiesAuChapitre(demande.livre, demande.chapitre)
        if (annule) return
        // UN SEGMENT PEUT RELEVER DE PLUSIEURS RUBRIQUES À LA FOIS, et il le doit : chez un
        // commentateur, le même passage est cité (type 1) PUIS commenté (type 3).
        const typesParSegment = new Map<number, Set<TypeLien>>()
        const lignes = new Map<number, { id: number; type: TypeLien }[]>()
        for (const l of liens) {
          if (!typesParSegment.has(l.segment_id)) typesParSegment.set(l.segment_id, new Set())
          typesParSegment.get(l.segment_id)!.add(l.type)
          if (!lignes.has(l.segment_id)) lignes.set(l.segment_id, [])
          lignes.get(l.segment_id)!.push({ id: l.id, type: l.type })
        }
        const ids = [...typesParSegment.keys()]
        if (!ids.length) {
          setSegmentsCitations([]); setSegmentsDoctrine([]); setSegmentsEcho([]); setLiensParSegment(new Map()); setSegmentsPour(cle)
          return
        }
        // ⛔ Lots d'OCTETS D'ADRESSE, lancés en parallèle bornée : jamais un lot de 500 en série.
        const reponses = await lancerEnParallele(lotsPourClauseIn(ids.map(String)).map(lot => () =>
          supabase.from('segments').select(SEG_COLS).in('id', lot)))
        for (const r of reponses) if (r.error) throw r.error
        const bruts = reponses.flatMap(r => (r.data ?? []) as unknown as Segment[])
        if (annule) return
        // ⛔ ON LIT TOUJOURS UNE TRADUCTION FRANÇAISE (2026-09-04) : le segment AFFICHÉ
        // devient sa contrepartie française ; seul `idLien` garde celui qui porte le lien.
        const contreparties = await chargerContrepartiesFrancaises(supabase, bruts)
        if (annule) return
        const segs: Segment[] = bruts.map(s => {
          const fr = contreparties.get(s.id)
          return fr ? { ...s, ...fr, id_oeuvre: s.id_oeuvre, idLien: s.id } : { ...s, idLien: s.id }
        })
        await chargerMetadonnees(segs.map(s => s.id_oeuvre), segs.map(s => s.id_texte))
        if (annule) return
        // Citations = types 1 et 2 réunis ; doctrine = 3 ; écho = 4. ⚠️ Les TYPES se
        // cherchent par `idLien` : ils sont portés par le lien, non par le segment montré.
        const citations: { seg: Segment; col: string }[] = []
        const doctrine: Segment[] = []
        const echo: Segment[] = []
        for (const s of segs) {
          const types = typesParSegment.get(s.idLien)
          if (!types) continue
          if (types.has(1)) citations.push({ seg: s, col: 'lien_1' })
          else if (types.has(2)) citations.push({ seg: s, col: 'lien_2' })
          if (types.has(3)) doctrine.push(s)
          if (types.has(4)) echo.push(s)
        }
        setOeuvres(instantaneOeuvres())
        setAuteurMeta(Object.fromEntries(cacheAuteurs))
        setEditions(instantaneEditions())
        setSegmentsCitations(citations)
        setSegmentsDoctrine(doctrine)
        setSegmentsEcho(echo)
        setLiensParSegment(lignes)
        setSegmentsPour(cle)
      } catch (erreur) {
        if (annule) return
        console.error('[volet] les textes des Pères n’ont pas pu être chargés :', erreur)
        setSegmentsCitations([]); setSegmentsDoctrine([]); setSegmentsEcho([]); setLiensParSegment(new Map())
        setErreurPour(cle)
        setSegmentsPour(cle)
      } finally {
        if (!annule) setLoading(false)
      }
    })()
    return () => { annule = true }
  }, [demande, cleDemande, tentative])

  // ── MESURER LES ÉLISIONS ────────────────────────────────────────────────────
  // Deux citations d'un même texte séparées par un ou deux paragraphes se lisent d'un
  // trait, l'écart marqué d'un « […] » — mais seulement si l'on SAIT ce qu'on élide.
  // ⚠️ La mesure ne part QUE s'il y a un écart à mesurer, et la page n'en dépend jamais.
  useEffect(() => {
    const tous = [...segmentsCitations.map(c => c.seg), ...segmentsDoctrine, ...segmentsEcho]
    const connues = new Map<string, number>()
    for (const seg of tous) connues.set(`${seg.id_texte}|${seg.segment_numero}`, (seg.segment_texte ?? '').length)
    const rangee = tous
      .map(seg => ({ idOeuvre: seg.id_oeuvre, idTexte: seg.id_texte, numero: seg.segment_numero, texte: seg.segment_texte }))
      .sort((x, y) => (x.idTexte ?? '').localeCompare(y.idTexte ?? '') || x.numero - y.numero)
    const ecarts = ecartsAMesurer(rangee, c => c)
    let annule = false
    ;(async () => {
      const textes = [...new Set(ecarts.map(e => e.idTexte))]
      const numeros = [...new Set(ecarts.flatMap(numerosDeLEcart))]
      const trouvees = new Map(connues)
      const niveaux = new Map<string, NiveauxDuPassage>()
      type Ligne = {
        id_texte: string; segment_numero: number; segment_texte: string | null
        ref_niv1: string | null; ref_niv2: string | null; ref_niv3: string | null; ref_niv4: string | null
      }
      const reponses = await lancerEnParallele(lotsPourClauseIn(numeros.map(String)).map(lot => () =>
        supabase.from('segments')
          .select('id_texte, segment_numero, segment_texte, ref_niv1, ref_niv2, ref_niv3, ref_niv4')
          .in('id_texte', textes).in('segment_numero', lot.map(Number))))
      // ⚠️ Une erreur se LIT : elle ne doit pas se lire « rien à élider ».
      const enEchec = reponses.find(r => r.error)
      if (enEchec) { console.error('Volet patristique : les élisions n’ont pas pu être mesurées.', enEchec.error); return }
      for (const r of reponses) {
        for (const l of (r.data ?? []) as Ligne[]) {
          trouvees.set(`${l.id_texte}|${l.segment_numero}`, (l.segment_texte ?? '').length)
          niveaux.set(`${l.id_texte}|${l.segment_numero}`, niveauxDuSegment(l))
        }
      }
      if (!annule) { setLongueurs(trouvees); setNiveauxEcarts(niveaux) }
    })().catch(e => console.error('Volet patristique : mesure des élisions impossible.', e))
    return () => { annule = true }
  }, [segmentsCitations, segmentsDoctrine, segmentsEcho])

  // Retirer une carte dont le lien vient d'être supprimé : de sa rubrique, et des lignes
  // de liens de son segment porteur.
  const retirerLien = useCallback((col: string, idLien: number) => {
    const type = TYPE_DE_COLONNE[col]
    if (col === 'lien_1' || col === 'lien_2') setSegmentsCitations(prev => prev.filter(({ seg }) => seg.idLien !== idLien))
    else if (col === 'lien_3') setSegmentsDoctrine(prev => prev.filter(s => s.idLien !== idLien))
    else setSegmentsEcho(prev => prev.filter(s => s.idLien !== idLien))
    setLiensParSegment(prev => {
      const apres = new Map(prev)
      apres.set(idLien, (prev.get(idLien) ?? []).filter(l => l.type !== type))
      return apres
    })
  }, [])


  // UN SEGMENT NE PARAÎT QU'UNE FOIS, en portant toutes les natures de son rapport au
  // verset. ⛔ ET IL EST CLASSÉ, dans le temps (date de l'œuvre, puis auteur, œuvre, rang).
  // ⚠️ La clé chronologique se calcule UNE fois par extrait, avant le tri.
  const itemsTous: ItemAffiche[] = useMemo(() => {
    const brut: Omit<ItemAffiche, 'categories'>[] = [
      ...segmentsCitations.map(({ seg, col }) => ({ seg, col, categorie: (col === 'lien_2' ? 'paraphrase' : 'citation_directe') as Categorie })),
      ...segmentsDoctrine.map(seg => ({ seg, col: 'lien_3', categorie: 'commentaire' as const })),
      ...segmentsEcho.map(seg => ({ seg, col: 'lien_4', categorie: 'echo' as const })),
    ].filter(({ seg }) => Boolean(oeuvres[seg.id_oeuvre]))
    const parSegment = new Map<number, ItemAffiche>()
    for (const it of brut) {
      const deja = parSegment.get(it.seg.id)
      if (deja) { if (!deja.categories.includes(it.categorie)) deja.categories.push(it.categorie) }
      else parSegment.set(it.seg.id, { ...it, categories: [it.categorie] })
    }
    const avecClef = [...parSegment.values()].map(it => {
      const info = oeuvres[it.seg.id_oeuvre]
      const meta = info?.id_auteur ? auteurMeta[info.id_auteur] : null
      return {
        it,
        clef: {
          annee: anneeChronologique({
            dateComposition: info?.date_composition ?? null,
            auteurDateMort: meta?.date_mort ?? null,
            auteurSiecle: meta?.siecle != null ? String(meta.siecle) : null,
          }),
          auteur: info?.auteur_nom || it.seg.id_oeuvre,
          oeuvre: info?.titre || it.seg.id_oeuvre,
          numero: it.seg.segment_numero,
        },
      }
    })
    return avecClef.sort((a, b) => comparerChronologie(a.clef, b.clef)).map(x => x.it)
  }, [segmentsCitations, segmentsDoctrine, segmentsEcho, oeuvres, auteurMeta])

  // Les sous-onglets restent des filtres : un segment cité ET commenté se trouve sous les deux.
  const itemsAffiches: ItemAffiche[] = useMemo(() =>
    sousOnglet === 'citations' ? itemsTous.filter(i => estCitation(i.categories))
    : sousOnglet === 'doctrine' ? itemsTous.filter(i => i.categories.includes('commentaire'))
    : itemsTous.filter(i => i.categories.includes('echo')),
  [itemsTous, sousOnglet])

  const comptesSousOnglets = useMemo(() => ({
    citations: itemsTous.filter(i => estCitation(i.categories)).length,
    doctrine: itemsTous.filter(i => i.categories.includes('commentaire')).length,
    echos: itemsTous.filter(i => i.categories.includes('echo')).length,
    // Le compteur des Pères : cités OU commentés ; les échos restent hors du total.
    peres: itemsTous.filter(i => estCitation(i.categories) || i.categories.includes('commentaire')).length,
  }), [itemsTous])

  // ⛔ L'ONGLET AFFICHÉ SE DÉDUIT : un onglet qui n'est plus offert rend la main aux Pères.
  const ongletAffiche: Onglet = (onglet === 'commentaires' && !verset) || (onglet === 'notes' && !notesOffertes)
    || (onglet === 'semantique' && !semantiqueOfferte)
    ? 'patristique'
    : onglet
  const ONGLETS: { code: Onglet; label: string; count?: number | null; enAttente: boolean }[] = [
    { code: 'patristique',  label: 'Pères de l\'Église', count: comptesSousOnglets.peres, enAttente },
    // L'onglet des commentaires de LECTEURS s'appelle « Discussion » : « Commentaires » est
    // le sous-onglet des commentaires PATRISTIQUES, et les deux se confondaient.
    ...(verset ? [{ code: 'commentaires' as Onglet, label: 'Discussion', count: nbCommentairesBible, enAttente: attenteCommentaires }] : []),
    ...(notesOffertes ? [{
      code: 'notes' as Onglet, label: 'Notes',
      count: compteNotes !== null && compteNotes.pour === cleNotes ? compteNotes.n : null,
      enAttente: ongletAffiche === 'notes' && compteNotes?.pour !== cleNotes,
    }] : []),
    ...(semantiqueOfferte ? [{
      code: 'semantique' as Onglet, label: 'Sémantique',
      count: compteSemantique !== null && compteSemantique.pour === cleSemantique ? compteSemantique.n : null,
      enAttente: ongletAffiche === 'semantique' && compteSemantique?.pour !== cleSemantique,
    }] : []),
  ]
  const SOUS_ONGLETS: [SousOnglet, string, number][] = [
    ['citations', 'Citations', comptesSousOnglets.citations],
    ['doctrine', 'Commentaires', comptesSousOnglets.doctrine],
    ['echos', 'Échos', comptesSousOnglets.echos],
  ]

  // Changer de sous-onglet revient à la première page (ajusté pendant le rendu).
  const [sousOngletRecu, setSousOngletRecu] = useState(sousOnglet)
  if (sousOngletRecu !== sousOnglet) { setSousOngletRecu(sousOnglet); setPageItems(0) }

  // Sans verset, on quitte la discussion : elle ne revient pas d'elle-même au verset suivant.
  useEffect(() => { if (!verset) setOnglet(o => (o === 'commentaires' ? 'patristique' : o)) }, [verset])

  // ── Filtres ──────────────────────────────────────────────────────────────────
  const remettrePage = useCallback(() => setPageItems(0), [])
  const { itemsFiltres, panneau: panneauFiltres } =
    useFiltresPatristiques({ items: itemsAffiches, oeuvres, auteurMeta, onChange: remettrePage })

  // REGROUPEMENTS (affichage seul) : voir `regrouperCitations`.
  const signesElides = useCallback((ecart: Ecart) => {
    let total = 0
    for (const n of numerosDeLEcart(ecart)) {
      const l = longueurs.get(`${ecart.idTexte}|${n}`)
      if (l === undefined) return null
      total += l
    }
    return total
  }, [longueurs])
  const cleCitation = useCallback((it: ItemAffiche) => ({
    idOeuvre: it.seg.id_oeuvre, idTexte: it.seg.id_texte,
    numero: it.seg.segment_numero, texte: it.seg.segment_texte,
  }), [])
  // ⛔ Ni d'un trait ni par une élision par-dessus un titre (charte § 38.8.1).
  const titreEntre = useCallback((ecart: Ecart, precedent: ItemAffiche, suivant: ItemAffiche) => {
    const chaine: (NiveauxDuPassage | undefined)[] = [niveauxDuSegment(precedent.seg)]
    for (const n of numerosDeLEcart(ecart)) chaine.push(niveauxEcarts.get(`${ecart.idTexte}|${n}`))
    chaine.push(niveauxDuSegment(suivant.seg))
    return titreEntrePassages(chaine, oeuvres[precedent.seg.id_oeuvre]?.niveaux_corps)
  }, [niveauxEcarts, oeuvres])
  const itemsGroupes = useMemo(
    () => regrouperCitations(itemsFiltres, cleCitation, signesElides, titreEntre),
    [itemsFiltres, cleCitation, signesElides, titreEntre],
  )

  const nbPagesItems = Math.ceil(itemsGroupes.length / ITEMS_PAR_PAGE)
  const pageCouranteItems = Math.min(pageItems, Math.max(nbPagesItems - 1, 0))
  const debutItems = pageCouranteItems * ITEMS_PAR_PAGE
  const itemsPage = useMemo(
    () => itemsGroupes.slice(debutItems, debutItems + ITEMS_PAR_PAGE),
    [itemsGroupes, debutItems],
  )

  // ── LES NOTES STRUCTURÉES DES EXTRAITS DE LA PAGE ──────────────────────────
  // `undefined` : pas encore demandé ; `null` : la lecture a échoué, et l'extrait retombe
  // sur ses notes héritées (`composerExtrait`).
  const [notesVolet, setNotesVolet] = useState<Map<string, NotesDuSegment | null>>(() => new Map())
  const notesDemandees = useRef<Set<string>>(new Set())
  // ⚠️ Une CHAÎNE, et non la liste : l'effet ne se rejoue que si la page change d'extraits.
  const clesPage = clesDesExtraits(itemsPage).join('\n')
  useEffect(() => {
    const manquantes = clesPage ? clesPage.split('\n').filter(cle => !notesDemandees.current.has(cle)) : []
    if (manquantes.length === 0) return
    for (const cle of manquantes) notesDemandees.current.add(cle)
    chargerNotesDesSegments(supabase, manquantes.map(segmentDeLaCle))
      .then(charges => setNotesVolet(avant => {
        const apres = new Map(avant)
        for (const cle of manquantes) apres.set(cle, charges.get(cle) ?? { notes: {}, ancres: [] })
        return apres
      }))
      .catch(erreur => {
        console.error('[volet] notes structurées indisponibles, repli sur les notes héritées :', erreur)
        setNotesVolet(avant => {
          const apres = new Map(avant)
          for (const cle of manquantes) apres.set(cle, null)
          return apres
        })
      })
  }, [clesPage])

  // ── LES PRÉLÈVEMENTS DE LA PAGE ────────────────────────────────────────────
  // ⛔ Le bouton d'un extrait partait toujours de « non prélevé » : on lit ceux de la page,
  // par la clé naturelle (ce lecteur, ces segments). Retenus avec la demande qu'ils servent.
  const idsSegmentsPage = itemsPage.map(g => g[0].seg.id).join(',')
  const clePrelevements = userId && idsSegmentsPage ? `${userId}|${idsSegmentsPage}` : null
  const [preleves, setPreleves] = useState<{ pour: string; ids: Set<number> } | null>(null)
  useEffect(() => {
    if (!clePrelevements || !userId) return
    const pour = clePrelevements
    let annule = false
    lancerEnParallele(lotsPourClauseIn(idsSegmentsPage.split(',')).map(lot => () =>
      supabase.from('prelevements').select('segment_id').eq('user_id', userId).in('segment_id', lot)))
      .then(reponses => {
        if (annule) return
        const enEchec = reponses.find(r => r.error)
        if (enEchec) { console.error('[volet] prélèvements illisibles :', enEchec.error); return }
        const ids = new Set<number>()
        for (const r of reponses) for (const l of (r.data ?? []) as { segment_id: number | null }[]) if (l.segment_id != null) ids.add(l.segment_id)
        setPreleves({ pour, ids })
      })
      .catch(e => console.error('[volet] prélèvements illisibles :', e))
    return () => { annule = true }
  }, [clePrelevements, userId, idsSegmentsPage])
  const prelevesPage = preleves && preleves.pour === clePrelevements ? preleves.ids : null
  const marquerPreleve = useCallback((segmentId: number, oui: boolean) => {
    setPreleves(prev => {
      if (!prev) return prev
      const ids = new Set(prev.ids)
      if (oui) ids.add(segmentId); else ids.delete(segmentId)
      return { pour: prev.pour, ids }
    })
  }, [])

  // Le volet se replie partout, SAUF en onglets sur un téléphone.
  const peutSeReduire = !mobile || presentation !== 'inline'

  if (!ouvert) {
    // Empilé (mobile) : barre horizontale pleine largeur en bas de la pile.
    if (mobile) {
      if (!barreMobile) return null
      return (
        <button onClick={() => setOuvert(true)} title="Ouvrir les textes patristiques"
          style={{ position: 'fixed', bottom: BANDEAU_NAV_MOBILE, left: 0, right: 0, zIndex: Z_FENETRE, width: '100%', background: 'var(--cs-fond-clair)', border: 'none', borderTop: '1px solid var(--cs-bord)', boxShadow: 'var(--cs-ombre-posee-haut)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '9px', padding: '0.6875rem 1rem' }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ transform: 'rotate(-90deg)', color: 'var(--cs-texte-doux)' }}>
            <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span style={{ fontSize: '0.8125rem', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600, color: 'var(--cs-texte-second)' }}>{LIBELLE_RAIL}</span>
          {/* ⛔ Le chevron DOUBLÉ, son double invisible de l'autre côté. */}
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ visibility: 'hidden', flexShrink: 0 }} />
        </button>
      )
    }
    return <RailVolet cote="droite" libelle={LIBELLE_RAIL} onOuvrir={() => setOuvert(true)} />
  }

  const handleDrag = onWidthChange ? (e: React.MouseEvent) => {
    e.preventDefault()
    const startW = panelWidth ?? refPanel.current?.getBoundingClientRect().width ?? 320
    const startX = e.clientX
    const onMove = (ev: MouseEvent) => onWidthChange(Math.max(200, Math.min(560, startW - (ev.clientX - startX))))
    const onUp = () => document.removeEventListener('mousemove', onMove)
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp, { once: true })
  } : undefined

  const precedentePossible = pageCouranteItems > 0
  const suivantePossible = pageCouranteItems < nbPagesItems - 1
  const STYLE_FLECHE_PAGE: React.CSSProperties = {
    fontSize:'1.25rem', lineHeight:1, minWidth:'24px', minHeight:'24px', padding:'0 6px',
    display:'inline-flex', alignItems:'center', justifyContent:'center', border:'none', background:'none',
  }

  return (
    <>
    {mobile && presentation !== 'inline' && <div onClick={() => setOuvert(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.34)', zIndex: Z_TIROIR_VOILE }} />}
    {/* `data-visite` : le repère de la visite guidée (app/lib/visiteBibleClassique.ts). */}
    <div ref={refPanel} data-visite="peres" role={tiroirOuvert ? 'dialog' : undefined} aria-modal={tiroirOuvert || undefined} aria-label={tiroirOuvert ? 'Pères de l’Église' : undefined}
      style={mobile
      ? (presentation === 'inline'
        ? { width:'100%', background:'var(--cs-surface)', display:'flex', flexDirection:'column', ...(sousBarres ? { paddingTop:'2.875rem', minHeight:`calc(100dvh - ${HAUTEUR_NAVBAR})`, paddingBottom:BANDEAU_NAV_MOBILE } : {}) }
        : { position:'fixed', bottom:BANDEAU_NAV_MOBILE, left:0, right:0, zIndex: Z_TIROIR, background:'var(--cs-surface)', borderTop:'1px solid var(--cs-bord)', display:'flex', flexDirection:'column', maxHeight:`calc(100dvh - ${HAUTEUR_NAVBAR} - 2.5rem - ${BANDEAU_NAV_MOBILE})`, minHeight:0, boxShadow:'var(--cs-ombre-modale-haut)' })
      : { width: panelWidth == null ? 'clamp(260px, 20vw, 460px)' : panelWidth + 'px', flexShrink:0, background:'var(--cs-surface)', borderLeft:'1px solid var(--cs-bord)', display:'flex', flexDirection:'column', height:'100%', minHeight:0, position:'relative' }}>
      {/* Tag de filtre : un fantôme en gras (::after) fige la largeur. */}
      <style>{`
        .pp-tag { display: inline-grid; align-items: center; justify-items: center; }
        .pp-tag > span { grid-area: 1 / 1; }
        .pp-tag::after { content: attr(data-label); grid-area: 1 / 1; font-weight: 600; visibility: hidden; white-space: nowrap; }
        ${FEUILLE_CARTE_VOLET}
        ${mobile ? ACTIONS_CARTE_MOBILE : ''}
      `}</style>
      {!mobile && handleDrag && (
        <div onMouseDown={handleDrag} title="Glisser pour redimensionner"
          style={{ position:'absolute', left:'-4px', top:0, bottom:0, width:'9px', cursor:'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2724%27 height=%2724%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%235f574b%27 stroke-width=%271.7%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Cpath d=%27M8 7L3 12l5 5%27/%3E%3Cpath d=%27M3 12h18%27/%3E%3Cpath d=%27M16 7l5 5-5 5%27/%3E%3C/svg%3E") 12 12, ew-resize', zIndex:10,
            background:'transparent', transition:'background 0.14s, box-shadow 0.14s' }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(198,184,158,0.08)'
            e.currentTarget.style.boxShadow = 'inset 1px 0 rgba(122,96,64,0.08)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.boxShadow = 'none'
          }}
        />
      )}

      <div style={{ display:'flex', flexDirection:'column', flex:1, minHeight:0 }}>

          {/* Onglets pleine largeur, la flèche de repli HORS DU FLUX au bord gauche
              (décision de l'auteur, 2026-09-20). ⛔ LA BARRE PORTE SON FOND, PAS L'ONGLET
              RETENU (2026-09-10) ; l'onglet retenu se distingue par son trait vert, sa
              graisse et son encre, comme le modèle partagé.
              ⚠️ Une vraie barre d'onglets : `role="tablist"`, circulation aux flèches, et un
              seul onglet dans l'ordre de tabulation. */}
          <div style={{ position:'relative', display:'flex', alignItems:'stretch', borderBottom:'1px solid var(--cs-bord)', background:'rgba(var(--cs-vert-rgb),0.04)' }}>
            {/* ⛔ Un réglage de disposition MOBILE ne décide jamais d'un contrôle de BUREAU. */}
            {peutSeReduire && (
              <button onClick={() => setOuvert(false)} title="Réduire le volet" aria-label="Réduire le volet"
                className="cs-volet-reduire"
                style={{ position:'absolute', left:0, top:0, bottom:0, zIndex:1, width:'1.75rem', background:'none', border:'none', cursor:'pointer', padding:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <IconeChevron dir="right" size={14} strokeWidth={1.5} />
              </button>
            )}
            <div role="tablist" aria-label="Volet des Pères" style={{ display:'flex', flex:1, alignItems:'stretch' }}
              onKeyDown={e => circulerAuxFleches(e, ONGLETS.map(t => t.code), ongletAffiche, setOnglet, idOnglet)}>
              {ONGLETS.map(t => {
                const actif = ongletAffiche === t.code
                return (
                  <button key={t.code} id={idOnglet(t.code)} role="tab" aria-selected={actif} aria-controls={idPanneau}
                    tabIndex={actif ? 0 : -1} onClick={() => setOnglet(t.code)}
                    style={{
                      flex:1, padding:'8px 6px 7px', border:'none',
                      borderBottom: actif ? '2px solid var(--cs-vert)' : '2px solid transparent',
                      cursor:'pointer', background:'none',
                      color: actif ? 'var(--cs-encre)' : 'var(--cs-texte-gris)',
                      fontFamily: 'var(--font-source-sans), Arial, sans-serif',
                      transition:'color 0.12s, border-color 0.12s',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px',
                    }}>
                    <span style={{ fontSize:'0.65625rem', letterSpacing:'0.08em', textTransform:'uppercase', fontWeight: actif ? 600 : 400, textAlign: 'center', lineHeight: 1.15 }}>{t.label}</span>
                    {/* ⛔ Une ligne de compte, toujours, et d'une hauteur écrite : voir `LigneCompte`. */}
                    <LigneCompte enAttente={t.enAttente} compte={t.count} videDit="∅"
                      style={{ fontSize: '0.6875rem', lineHeight: 1, height: '1em', fontWeight: 500, color: actif ? 'var(--cs-vert)' : 'var(--cs-texte-gris)' }} />
                  </button>
                )
              })}
            </div>
          </div>

          {/* Contenu (la discussion et les notes défilent en interne, pour épingler la
              saisie ou les filtres en tête du volet). */}
          <div id={idPanneau} role="tabpanel" aria-labelledby={idOnglet(ongletAffiche)}
            style={(ongletAffiche === 'commentaires' && verset) || ongletAffiche === 'notes'
            ? { flex:1, minHeight:0, overflow:'hidden', padding:'0 12px', display:'flex', flexDirection:'column' }
            : { overflowY:'auto', flex:1, padding:'0 12px', display:'flex', flexDirection:'column' }}>
            {ongletAffiche === 'commentaires' && verset ? (
              <OngletCommentaires key={verset.id_verset} verset={verset} userId={userId} isAdmin={isAdmin} onCount={reporterCompteCommentaires} />
            ) : ongletAffiche === 'notes' && notesBible ? (
              <OngletNotesBible contexte={notesBible} onCompte={reporterCompteNotes}
                onAvantOuvrir={mobile ? () => setOuvert(false) : undefined} />
            ) : ongletAffiche === 'semantique' && onChoisirVerset ? (
              <OngletSemantique livre={livreActif} chapitre={chapitreActif} verset={verset?.id_verset ?? null}
                onChoisirVerset={onChoisirVerset} onCompte={reporterCompteSemantique} />
            ) : (
              <>
                {/* Sous-onglets Citations / Commentaires / Échos */}
                <div role="tablist" aria-label="Nature du rapport au texte biblique"
                  style={{ display: 'flex', borderBottom: '1px solid var(--cs-fond-doux)', margin: '6px -12px 0', padding: 0 }}
                  onKeyDown={e => circulerAuxFleches(e, SOUS_ONGLETS.map(s => s[0]), sousOnglet, setSousOnglet, idSousOnglet)}>
                  {SOUS_ONGLETS.map(([key, label, nb]) => {
                    const actif = sousOnglet === key
                    return (
                      <button key={key} id={idSousOnglet(key)} role="tab" aria-selected={actif} aria-controls={idSousPanneau}
                        tabIndex={actif ? 0 : -1} onClick={() => setSousOnglet(key)}
                        style={{
                          flex: 1, background: 'none', border: 'none',
                          borderBottom: actif ? '2px solid var(--cs-vert)' : '2px solid transparent',
                          padding: '5px 2px 4px', cursor: 'pointer',
                          color: actif ? 'var(--cs-vert)' : 'var(--cs-texte-gris)',
                          fontSize: '0.6875rem', fontWeight: actif ? 600 : 400,
                          letterSpacing: '0.04em', lineHeight: 1.2,
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px',
                        }}>
                        <span>{label}</span>
                        <LigneCompte enAttente={enAttente} compte={nb} videDit="∅"
                          style={{ fontSize: '0.6875rem', lineHeight: 1.2, height: '1.2em', color: actif ? 'var(--cs-vert)' : 'var(--cs-texte-gris)' }} />
                      </button>
                    )
                  })}
                </div>

                <FiltresPatristiques {...panneauFiltres} />

                {/* ⛔ LES RÉFÉRENCES DU PASSAGE QU'ON QUITTE S'EFFACENT AUSSITÔT (2026-09-04),
                    en fondu, et leur PLACE reste. */}
                <MarqueAttenteVolet enAttente={enAttente} />
                <div id={idSousPanneau} role="tabpanel" aria-labelledby={idSousOnglet(sousOnglet)}
                  style={{ opacity: enAttente ? 0 : 1, transition: 'opacity .16s ease', flex: '1 0 auto', display: 'flex', flexDirection: 'column' }}>
                {/* ⛔ UNE PANNE SE DIT, dans la voix du volet, avec de quoi réessayer. */}
                {echec && (
                  <EtatVideVolet>
                    <MentionVide>Les textes des Pères n’ont pas pu être chargés.</MentionVide>
                    <button onClick={() => setTentative(t => t + 1)} className="cs-bouton-lien">Réessayer</button>
                  </EtatVideVolet>
                )}
                {/* « Aucune occurrence » au centre, un petit fleuron la ferme (2026-09-14). */}
                {!enAttente && !echec && itemsFiltres.length === 0 && (
                  <EtatVideVolet>
                    <MentionVide>
                      {itemsAffiches.length === 0 ? 'Aucune occurrence.' : 'Aucun résultat pour ces filtres.'}
                    </MentionVide>
                    {itemsAffiches.length === 0 && <FleuronDiscret />}
                  </EtatVideVolet>
                )}
                {itemsPage.length > 0 && (
                <div style={{ marginTop: '6px' }}>
                {itemsPage.map(groupe => {
                  const premier = groupe[0]
                  // Occurrence réunie : les textes des segments consécutifs en un seul
                  // paragraphe. Métadonnées et liens = premier segment.
                  const segFusionne = groupe.length === 1
                    ? premier.seg
                    : { ...premier.seg, segment_texte: texteDuGroupe(groupe, cleCitation) }
                  const extrait = composerExtrait(groupe, notesVolet)
                  const type = TYPE_DE_COLONNE[premier.col]
                  const lienIds = (liensParSegment.get(premier.seg.idLien) ?? []).filter(l => l.type === type).map(l => l.id)
                  return (
                    <SegmentCard
                      key={groupe.map(g => g.seg.id).join('_')} s={segFusionne} info={oeuvres[premier.seg.id_oeuvre]}
                      edition={editions[premier.seg.id_texte]}
                      texteAffichage={extrait.texte} notes={extrait.notes} notesEnAttente={extrait.enAttente}
                      userId={userId} isAdmin={isAdmin}
                      lienIds={lienIds}
                      enregistre={prelevesPage ? prelevesPage.has(premier.seg.id) : null}
                      onEnregistre={marquerPreleve}
                      retour={adresseRetour}
                      onSignaler={(s, titreOeuvre) => { if (exigerCompte('signaler une erreur')) setSegSignale({ seg: s, titreOeuvre }) }}
                      onSupprimeLien={() => retirerLien(premier.col, premier.seg.idLien)}
                    />
                  )
                })}
                </div>
                )}
                </div>
              </>
            )}
          </div>

          {/* Pagination — fixée en pied de panneau, hors zone scrollable. « 1 sur 3 » :
              la page sur le nombre de pages. */}
          {ongletAffiche === 'patristique' && !enAttente && nbPagesItems > 1 && (
            <nav aria-label="Pages des textes des Pères" style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'4px', padding:'6px 0 8px', borderTop:'1px solid var(--cs-bord-clair)', background:'var(--cs-surface)', flexShrink:0 }}>
              <button onClick={() => setPageItems(Math.max(pageCouranteItems - 1, 0))} disabled={!precedentePossible}
                aria-label="Page précédente" title="Page précédente"
                style={{ ...STYLE_FLECHE_PAGE, color: precedentePossible ? 'var(--cs-texte-second)' : 'var(--cs-bord)', cursor: precedentePossible ? 'pointer' : 'default' }}>
                ‹
              </button>
              <span aria-live="polite" style={{ fontSize:'0.6875rem', color:'var(--cs-texte-gris)', whiteSpace:'nowrap', padding:'0 2px' }}>
                {pageCouranteItems + 1} sur {nbPagesItems}
              </span>
              <button onClick={() => setPageItems(Math.min(pageCouranteItems + 1, nbPagesItems - 1))} disabled={!suivantePossible}
                aria-label="Page suivante" title="Page suivante"
                style={{ ...STYLE_FLECHE_PAGE, color: suivantePossible ? 'var(--cs-texte-second)' : 'var(--cs-bord)', cursor: suivantePossible ? 'pointer' : 'default' }}>
                ›
              </button>
            </nav>
          )}

          {segSignale && (
            <ModalSignalement
              titre={segSignale.titreOeuvre}
              texteObjet={segSignale.seg.segment_texte}
              avecNiveauImportance
              onClose={() => setSegSignale(null)}
              onEnvoyer={async (msg, importance) => {
                const { data } = await supabase.auth.getSession()
                const headers: HeadersInit = { 'Content-Type': 'application/json' }
                const token = data.session?.access_token
                if (token) headers.Authorization = `Bearer ${token}`
                const res = await fetch('/api/signalements', {
                  method: 'POST', headers,
                  body: JSON.stringify({ id_segment: segSignale.seg.id, message: msg, importance: importance ?? undefined, url_source: window.location.href }),
                })
                if (!res.ok) { const d = await res.json().catch(() => null); throw new Error(d?.error ?? 'Le signalement n’a pas pu être envoyé.') }
              }}
            />
          )}
      </div>
    </div>
    </>
  )
}
