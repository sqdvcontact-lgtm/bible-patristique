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
import { Bulle } from '@/app/components/Bulle'
import { avecHoteEclat, EclatCopie, useEclatCopie } from '@/app/components/EclatCopie'
import { EclatEchec, STYLE_HOTE_ECHEC, useEclatEchec } from '@/app/components/EclatEchec'
import { anneeChronologique, comparerChronologie } from '@/app/lib/chronologiePatristique'
import { useAffichageAdmin } from '@/app/lib/contexteAffichageAdmin'
import { estOeuvrePubliee } from '@/app/lib/oeuvresPublication'
import { segmentsDesLiens, segmentsLiesAuVerset, segmentsLiesAuChapitre, segmentsLiesAPlage, type TypeLien } from '@/app/lib/liens'
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
import { chargerToutesPagesSupabase, lancerEnParallele, lotsPourClauseIn } from '@/app/lib/paginationSupabase'
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
 *  jamais le contenu. Le volet s'appelle « Pères de l’Église » : « Ouvrir les Pères » dit
 *  ce qu'un clic fera, dans le nom de ce qu'il ouvre (2026-09-22 ; le rail disait
 *  « Ouvrir les commentaires » et la barre mobile « Ouvrir les textes patristiques »). */
const LIBELLE_RAIL = 'Ouvrir les Pères'

type Verset = { id_verset: string; ref: string; verset: number; chapitre: number }
/** Un morceau d'extrait tel que le volet le lit : sa clé, et — une fois la page connue —
 *  son texte et ses notes héritées. */
type Morceau = {
  id?: string; id_texte: string; segment_key: string | null
  longueur?: number | null
  segment_texte?: string; notes?: string | null
  /** Le SÉPARATEUR que l'édition pose avant ce morceau (`join_before`), matérialisé par
   *  `liantAvantSegment`. Il dit si deux segments qui se suivent forment un paragraphe ou
   *  une seule phrase coupée par la segmentation ; sans lui, le volet imposait un saut de
   *  ligne partout (relevé de l'auteur, 2026-09-23, sur la Cité de Dieu). */
  join_before?: string | null
}
type Segment = {
  // ⛔ `id_texte` DÉCIDE des regroupements, `id_oeuvre` ne fait que nommer : une œuvre
  // porte plusieurs textes (La Cité de Dieu son latin et son français, tous deux liés
  // à des versets) et leurs `segment_numero` se recouvrent.
  // ⛔ L'IDENTIFIANT EST UNE CHAÎNE DE CHIFFRES (2026-09-22) : `segments.id` est un bigint
  // de dix-neuf chiffres, que `JSON.parse` arrondit au-delà de 2^53. Le volet le reprenait
  // arrondi dans son `in('id', …)`, et 2 771 liens — quatre œuvres de Cyrille de Jérusalem,
  // l'Homélie sur la Présentation — ne paraissaient jamais. Il se demande `id::text` et
  // repart tel quel : requêtes, prélèvements, adresse du passage.
  id: string; id_oeuvre: string; id_texte: string; segment_numero: number
  ref_niv1: string; ref_niv2: string
  ref_niv3: string; ref_niv4?: string | null
  segment_key?: string | null
  /** ⛔ LA LONGUEUR SEULE VOYAGE AVEC LA LISTE (2026-09-22) : comptes, filtres, tris,
   *  regroupements et mesure des élisions se font sur des colonnes légères, et le texte
   *  (559 Ko sur Genèse 1, pour vingt extraits montrés) ne se charge que pour la PAGE
   *  affichée. Champ calculé `longueur_texte` (migration `20260922155227_volet_peres_audit`). */
  longueur?: number | null
  /** Le texte et les notes héritées : absents tant que la page qui montre ce segment n'a
   *  pas été chargée (voir `hydrater`). */
  segment_texte?: string; notes?: string | null
  /** Le séparateur que l'édition pose avant ce segment (voir `Morceau.join_before`). */
  join_before?: string | null
  // ⚠️ Le segment qui PORTE le lien biblique, quand ce n'est pas celui qu'on montre :
  // un lien posé sur un latin s'affiche dans sa contrepartie française (voir
  // `contrepartieFrancaise`). Ce qu'on lit, ouvre et prélève est le français ; le
  // retrait d'un lien, lui, vise toujours le segment d'origine.
  idLien: string
  /** Les segments français d'un EMPAN, quand la contrepartie d'un latin en réunit
   *  plusieurs (`chargerContrepartiesFrancaises`) : le volet pose les appels et lit les
   *  notes de chacun (`composerExtrait`). */
  parties?: Morceau[]
}
/** Un segment dont la page a chargé le texte : c'est ce que la carte montre, copie et prélève. */
type SegmentHydrate = Segment & { segment_texte: string; parties?: (Morceau & { segment_texte: string })[] }
/** Une ligne de `liens_bibliques`, gardée pour le RETRAIT : son type et sa cible. */
type LigneLien = { id: number; type: TypeLien; canon_id: string | null; livre: string | null; chapitre: number | null }
/** Le texte caché d'un lecteur d'écran : la classe du site (`globals.css`). */
const HORS_ECRAN = 'cs-hors-ecran'
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
    // « Copier ce passage » : le mot du site pour un extrait patristique (page d'œuvre,
    // cellule d'actions). « Segment » est un mot d'atelier, il ne se montre pas au lecteur.
    <Bulle texte="Copier ce passage" position="left">
      <button onClick={handle} aria-label="Copier ce passage"
        className={avecHoteEclat('cs-bouton-fin')} style={{ ...ACTION_BTN, color: copie ? 'var(--cs-vert)' : 'var(--cs-bord)' }}>
        <IconeCopier />
        <EclatCopie eclat={eclat} />
      </button>
    </Bulle>
  )
}

// ── Bouton enregistrer segment ────────────────────────────────────────────────
// ⛔ L'ÉTAT VIENT DU VOLET, qui lit les prélèvements de la page (clé `user_id` +
// `segment_id`) : le bouton partait toujours de « non prélevé », si bien qu'un passage déjà
// enregistré s'enregistrait une seconde fois. Il montre son geste aussitôt, et le défait si
// la base le refuse, en le disant discrètement (encre d'alerte et infobulle).
function BoutonEnregistrerSegment({ segment, info, userId, enregistre, onChange }: {
  segment: SegmentHydrate; info?: OeuvreInfo; userId: string | null
  /** `null` : l'état n'est pas encore connu, le bouton attend. */
  enregistre: boolean | null
  onChange: (segmentId: string, enregistre: boolean) => void
}) {
  const [loading, setLoading] = useState(false)
  // ⛔ UN PRÉLÈVEMENT REFUSÉ SE DIT COMME AILLEURS (2026-09-22) : l'éclat rouge du site et
  // son annonce vivante (`EclatEchec`), non plus une infobulle et une teinte, que personne
  // ne survole et qu'aucun lecteur d'écran n'annonce.
  const { echec, signaler } = useEclatEchec()
  const { exigerCompte } = useCompte()
  if (!userId) return null

  const enregistrer = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (enregistre !== false || loading) return
    if (!exigerCompte('prélever ce passage')) return
    setLoading(true)
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
      signaler('Le passage n’a pas pu être ajouté à vos prélèvements.')
      return
    }
    signalerProgression()
  }

  // Le retrait vise la CLÉ NATURELLE (ce lecteur, ce segment) : un doublon ancien part avec.
  const supprimer = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (enregistre !== true || loading) return
    setLoading(true)
    onChange(segment.id, false)
    const { error } = await supabase.from('prelevements').delete().eq('user_id', userId).eq('segment_id', segment.id)
    setLoading(false)
    if (error) {
      console.error('[volet] retrait refusé :', error)
      onChange(segment.id, true)
      signaler('Le passage n’a pas pu être retiré de vos prélèvements.')
    }
  }

  const libelle = echec ? `${echec.message} Réessayer.` : enregistre ? 'Retirer de mes prélèvements' : 'Ajouter à mes prélèvements'
  const couleur = echec ? 'var(--cs-danger)' : enregistre ? 'var(--cs-texte-doux)' : 'var(--cs-bord)'
  return (
    <Bulle texte={libelle} position="left">
      <button onClick={enregistre ? supprimer : enregistrer} disabled={loading || enregistre === null}
        aria-label={libelle} aria-pressed={enregistre === true}
        className={avecHoteEclat('cs-bouton-fin')}
        style={{ ...ACTION_BTN, color: couleur, ...(echec ? STYLE_HOTE_ECHEC : null) }}>
        {loading ? '…' : <IconeSignet plein={enregistre === true} />}
        <EclatEchec echec={echec} />
      </button>
    </Bulle>
  )
}

// ── Bouton supprimer lien (admin uniquement) ──────────────────────────────────
// ⛔ LES LIENS VIVENT DANS `liens_bibliques`, une ligne par lien : l'ancien bouton écrivait
// `segments.lien_N = null`, des colonnes mortes, et la carte disparaissait sans que rien ne
// change en base. On supprime les lignes (la politique `liens_bibliques_admin_all` l'ouvre à
// l'administrateur), on lit l'erreur, et la carte ne part qu'en cas de succès.
function BoutonSupprimerLien({ lienIds, confirmation, isAdmin, onSupprime }: {
  lienIds: number[]
  /** Ce que la confirmation dit AVANT le retrait : combien de liens, et vers quels versets.
   *  ⛔ Obligatoire en vue chapitre et sur une plage, où la carte ne dit pas quel verset
   *  elle représente et où le retrait peut en viser plusieurs. */
  confirmation: string | null
  isAdmin: boolean
  /** Les identifiants que la base a RÉELLEMENT retirés. */
  onSupprime: (retires: number[]) => void
}) {
  const [confirme, setConfirme] = useState(false)
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState(false)
  if (!isAdmin || lienIds.length === 0) return null

  if (!confirme) {
    const nom = lienIds.length > 1 ? 'Supprimer ces liens bibliques' : 'Supprimer ce lien biblique'
    return (
      <button onClick={e => { e.stopPropagation(); setConfirme(true); setErreur(false) }}
        title={nom} aria-label={nom}
        className="cs-bouton-fin" style={{ ...ACTION_BTN, fontSize:'1.125rem', color:'var(--cs-bord)' }}>
        ×
      </button>
    )
  }
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:'6px', flexShrink:0, flexWrap:'wrap', justifyContent:'flex-end', maxWidth:'13rem' }}>
      {confirmation && (
        <span role="note" style={{ width:'100%', textAlign:'right', fontSize:'0.6875rem', lineHeight:1.3, color:'var(--cs-texte-second)' }}>{confirmation}</span>
      )}
      <button onClick={async e => {
        e.stopPropagation()
        setLoading(true); setErreur(false)
        // ⚠️ On relit ce que la base a retiré : une politique qui refuse ne lève pas, elle
        // retire zéro ligne, et la carte serait partie sans que rien ne change.
        const { data, error } = await supabase.from('liens_bibliques').delete().in('id', lienIds).select('id')
        setLoading(false)
        const retires = ((data ?? []) as { id: number }[]).map(l => l.id)
        if (error || retires.length === 0) { console.error('[volet] suppression du lien refusée :', error ?? 'aucune ligne retirée'); setErreur(true); return }
        onSupprime(retires)
      }} disabled={loading}
        aria-label={lienIds.length > 1 ? `Confirmer la suppression des ${lienIds.length} liens` : 'Confirmer la suppression du lien'}
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

function SegmentCard({ s, texteAffichage, notes, notesEnAttente, info, edition, userId, isAdmin, lienIds, confirmationSuppression, enregistre, onEnregistre, retour, onSignaler, onSupprimeLien, refFoyer }: {
  s: SegmentHydrate; info?: OeuvreInfo; userId: string | null; isAdmin: boolean
  /** Le premier extrait de la page le reçoit : c'est lui qui prend le foyer quand on
   *  tourne la page (voir la pagination). */
  refFoyer?: React.Ref<HTMLDivElement>
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
  /** Ce que la confirmation du retrait dit (voir `BoutonSupprimerLien`). */
  confirmationSuppression: string | null
  /** Le passage est-il dans les prélèvements du lecteur ? `null` : pas encore lu. */
  enregistre: boolean | null
  onEnregistre: (segmentId: string, enregistre: boolean) => void
  onSignaler: (s: SegmentHydrate, titreOeuvre?: string) => void
  onSupprimeLien: (retires: number[]) => void
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
    // ⚠️ `tabIndex={-1}` sur le premier extrait : il ne s'ajoute pas à l'ordre de
    // tabulation, mais il peut RECEVOIR le foyer quand on tourne la page.
    <div ref={refFoyer} tabIndex={refFoyer ? -1 : undefined} className={CLASSE_CARTE_VOLET} style={STYLE_CARTE_VOLET}>

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
            title={niveaux ? `Accéder au passage exact dans l’œuvre : ${niveaux}` : 'Accéder au passage exact dans l’œuvre'}
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
              texte={s.segment_texte} auteur={info?.auteur_nom || s.id_oeuvre} titre={info?.titre || ''}
              sous_titre={info?.sous_titre}
              trad_auteur={identite.tradAuteur ?? undefined} editeur={identite.editeur ?? undefined}
              collection={identite.collection ?? undefined} ville={identite.ville ?? undefined}
              date_publication={identite.datePublication ?? undefined} responsable={identite.responsable ?? undefined}
            />
            <Bulle texte="Signaler une erreur" position="left">
              <button onClick={e => { e.stopPropagation(); onSignaler(s, info?.titre) }} aria-label="Signaler une erreur"
                className="cs-bouton-fin" style={{ ...ACTION_BTN, color:'var(--cs-bord)' }}>
                <IconeSignalement />
              </button>
            </Bulle>
          </div>
          {/* ⛔ LA SUPPRESSION VIT À PART (audit ergonomique du 2026-09-21) : collé à la
              copie, le « × » d'administration se prenait pour elle. Il descend sur sa
              propre rangée, sous les actions qui ne détruisent rien, et demande toujours
              confirmation. */}
          <BoutonSupprimerLien lienIds={lienIds} confirmation={confirmationSuppression} isAdmin={isAdmin} onSupprime={onSupprimeLien} />
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
      {/* ⛔ LA CHASSE DE L'EXTRAIT (reprise de l'auteur, 2026-09-23, devant le volet de
          droite : « les caractères sont très légèrement trop serrés, mais vraiment très
          légèrement ; et l'espace entre les mots est légèrement trop important ; revoir
          harmonieusement »). Le bloc est JUSTIFIÉ dans une colonne de deux cents pixels :
          la justification ajoute le même blanc absolu quelle que soit l'espace de départ,
          si bien que les mots s'écartaient pendant que les lettres se touchaient. Les deux
          se règlent ENSEMBLE — un centième de cadratin de chasse en plus, deux centièmes
          d'espace en moins — et le texte reste condensé, ce que l'auteur demande partout.
          ⚠️ Le bloc déclare donc sa PROPRE chasse : elle l'emporte sur celle du site
          (`--cs-chasse-ui` / `--cs-espace-mot-ui`, posée sur `body`), une déclaration plus
          proche gagnant, et c'est la règle de la charte § 3.11. */}
      <p lang="fr" style={{ '--cs-lacune':'var(--cs-texte-second)', fontSize:CORPS_CARTE_VOLET, lineHeight:INTERLIGNE_CARTE_VOLET, color:'var(--cs-texte-fort)', textAlign:'justify', textJustify:'inter-word', margin:'0 0 1px', letterSpacing:'0.018em', wordSpacing:'-0.1em', hyphens:'auto', WebkitHyphens:'auto', overflowWrap:'break-word' } as React.CSSProperties}>
        {/* ⚠️ La capitale et les appels projetés arrivent POSÉS (`composerExtrait`) : la
            capitale passe avant la projection, qui compte ses offsets dans le texte. */}
        {avecSautsDuVolet(rendreTexteAvecNotes(texteAffichage, notes, 'corps', {
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
        }))}
      </p>
    </div>
  )
}

/** Les SAUTS DE LIGNE de l'extrait, rendus par un blanc léger (décision de l'auteur,
 *  2026-09-23) : ils se fondaient dans le paragraphe justifié. ⚠️ On découpe le RENDU,
 *  non le texte : les appels de note se numérotent sur l'extrait entier. */
function avecSautsDuVolet(noeuds: React.ReactNode): React.ReactNode {
  if (!Array.isArray(noeuds)) return noeuds
  return noeuds.flatMap((n, i) => typeof n === 'string' && n.includes('\n')
    ? n.split(/\s*\n\s*/).flatMap((t, j) => j ? [<span key={`saut-${i}-${j}`} className="cs-saut-volet" aria-hidden="true" />, t] : [t])
    : [n])
}

// ── LE SQUELETTE D'UN SEUL EXTRAIT ────────────────────────────────────────────
//
// ⛔ ON N'ÉTEINT PAS LA LISTE POUR UNE CARTE (2026-09-22). Le panneau entier passait à
// `opacity: 0` dès qu'un morceau de texte manquait ; depuis que le texte se charge page
// par page, la liste clignotait à chaque page et à chaque filtre. Ce qui est déjà servi
// reste lisible, et seule la carte en attente montre sa place — trois filets, l'encre des
// fonds doux, ni mouvement ni promesse.
const FILET_SQUELETTE: React.CSSProperties = {
  display: 'block', height: '0.5rem', borderRadius: '999px', background: 'var(--cs-fond-doux)',
}
function SqueletteExtrait() {
  return (
    <div className={CLASSE_CARTE_VOLET} style={STYLE_CARTE_VOLET} aria-hidden="true">
      <span style={{ ...FILET_SQUELETTE, width: '45%', marginBottom: '10px' }} />
      <span style={{ ...FILET_SQUELETTE, width: '100%', marginBottom: '6px' }} />
      <span style={{ ...FILET_SQUELETTE, width: '100%', marginBottom: '6px' }} />
      <span style={{ ...FILET_SQUELETTE, width: '72%' }} />
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
// ⛔ ET UN GLYPHE NE SE NOMME PAS PAR `aria-label` (audit d'accessibilité, 2026-09-22) :
// sur un `span`, qui ne porte aucun rôle, l'attribut n'est pas garanti d'être lu. Le signe
// est donc `aria-hidden`, et la mention s'écrit en toutes lettres dans un texte caché.
const STYLE_COMPTE_NUL: React.CSSProperties = { fontWeight: 400, color: 'var(--cs-texte-doux)' }

function LigneCompte({ enAttente, compte, style, videDit, unite }: {
  enAttente: boolean
  compte: number | null | undefined
  /** Corps, interligne, HAUTEUR et encre de la ligne. */
  style: React.CSSProperties
  /** Ce qui s'écrit quand le compte est nul ; rien, s'il n'est pas donné. */
  videDit?: string
  /** ⛔ UN COMPTE PORTE SON UNITÉ pour qui ne voit pas l'onglet : « 12 extraits », et non
   *  « 12 » seul, que rien ne rattache à son intitulé. */
  unite?: (n: number) => string
}) {
  return (
    <span style={{ display: 'block', whiteSpace: 'nowrap', ...style }}>
      {enAttente ? <CompteEnAttente />
        : compte != null && compte > 0 ? (
          unite
            ? <><span aria-hidden="true">{compte}</span><span className={HORS_ECRAN}>{unite(compte)}</span></>
            : compte
        )
        : compte === 0 && videDit ? (
          <span style={STYLE_COMPTE_NUL} title="Aucune occurrence">
            <span aria-hidden="true">{videDit}</span>
            <span className={HORS_ECRAN}>aucune occurrence</span>
          </span>
        )
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
// ⛔ DURÉE DE VIE, ABSENCES, LECTEUR (2026-09-22). Une entrée vit cinq minutes : une œuvre
// publiée entre-temps, ou retirée, se voit sans recharger la page. Une ABSENCE (œuvre non
// publiée, introuvable, édition illisible) ne se retient PAS : elle se redemande au passage
// suivant, sans quoi une œuvre qu'on vient de publier resterait invisible jusqu'au
// rechargement. Et tout le cache se vide quand le LECTEUR change : ce qu'on lit dépend de
// sa session (la politique de lecture), et un cache de module survit à la déconnexion.
const DUREE_CACHE_MS = 5 * 60 * 1000
type EntreeCache<T> = { valeur: T; t: number }
const cacheOeuvres = new Map<string, EntreeCache<OeuvreInfo>>()
const cacheAuteurs = new Map<string, EntreeCache<MetaAuteur>>()
const cacheEditions = new Map<string, EntreeCache<LigneIdentiteTexte>>()
let lecteurDuCache: string | null | undefined
const frais = <T,>(e: EntreeCache<T> | undefined): e is EntreeCache<T> => e !== undefined && Date.now() - e.t < DUREE_CACHE_MS
function accorderCacheAuLecteur(lecteur: string | null) {
  if (lecteurDuCache === lecteur) return
  cacheOeuvres.clear(); cacheAuteurs.clear(); cacheEditions.clear()
  lecteurDuCache = lecteur
}
const instantane = <T,>(cache: Map<string, EntreeCache<T>>): Record<string, T> => {
  const r: Record<string, T> = {}
  for (const [id, e] of cache) if (frais(e)) r[id] = e.valeur
  return r
}

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
async function chargerMetadonnees(idsOeuvres: string[], idsTextes: string[], lecteur: string | null) {
  accorderCacheAuLecteur(lecteur)
  const oeuvresManquantes = [...new Set(idsOeuvres)].filter(id => !frais(cacheOeuvres.get(id)))
  const textesManquants = [...new Set(idsTextes)].filter(id => id && !frais(cacheEditions.get(id)))
  const [reponsesOeuvres, reponsesTextes] = await Promise.all([
    lancerEnParallele(lotsPourClauseIn(oeuvresManquantes).map(lot => () =>
      supabase.from('oeuvres').select(COLONNES_OEUVRE).in('id_oeuvre', lot))),
    lancerEnParallele(lotsPourClauseIn(textesManquants).map(lot => () =>
      supabase.from('oeuvre_textes').select(COLONNES_IDENTITE_TEXTE).in('id_texte', lot))),
  ])
  for (const r of reponsesOeuvres) if (r.error) throw r.error
  const t = Date.now()
  for (const r of reponsesOeuvres) {
    for (const o of (r.data ?? []) as unknown as LigneOeuvre[]) {
      const auteur = Array.isArray(o.auteurs) ? o.auteurs[0] ?? null : o.auteurs
      if (o.id_auteur && auteur) cacheAuteurs.set(o.id_auteur, { valeur: { traditions: auteur.traditions ?? [], siecle: auteur.siecle ?? null, date_mort: auteur.date_mort ?? null }, t })
      // ⛔ Une œuvre non publiée ne se retient pas (et une entrée périmée qui l'était se retire).
      if (!estOeuvrePubliee(o)) { cacheOeuvres.delete(o.id_oeuvre); continue }
      cacheOeuvres.set(o.id_oeuvre, { t, valeur: {
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
      } })
    }
  }
  const echecTextes = reponsesTextes.find(r => r.error)
  if (echecTextes) console.error('[volet] éditions illisibles, citation à l’œuvre :', echecTextes.error)
  else {
    for (const r of reponsesTextes) for (const l of (r.data ?? []) as unknown as LigneIdentiteTexte[]) cacheEditions.set(l.id_texte, { valeur: l, t })
  }
}

const instantaneOeuvres = () => instantane(cacheOeuvres)
const instantaneEditions = () => instantane(cacheEditions)
const instantaneAuteurs = () => instantane(cacheAuteurs)

// Quatre natures de lien : citation directe (1), paraphrase (2), commentaire (3), écho (4).
type Categorie = 'citation_directe' | 'paraphrase' | 'commentaire' | 'echo'
type ItemAffiche = { seg: Segment; col: string; categorie: Categorie; categories: Categorie[] }
const estCitation = (cats: Categorie[]) => cats.includes('citation_directe') || cats.includes('paraphrase')

/** Les types de lien que MONTRE un sous-onglet, donc ceux que son « × » retire (charte §9) :
 *  Citations = citation (1) et reprise (2), Commentaires = doctrine (3), Échos = écho (4).
 *  ⛔ Le type retiré se dérive de l'onglet REGARDÉ, jamais de la première rubrique de
 *  l'extrait : un passage cité ET commenté, supprimé depuis « Commentaires », perdait son
 *  lien de CITATION et gardait le commentaire qu'on voulait retirer (2026-09-22). */
const TYPES_DU_SOUS_ONGLET: Record<'citations' | 'doctrine' | 'echos', readonly TypeLien[]> = {
  citations: [1, 2], doctrine: [3], echos: [4],
}

/** La clé d'un morceau pour la carte des textes chargés : sa clé stable, sinon son id. */
const cleTexteDe = (m: { id?: string; id_texte: string; segment_key?: string | null }) =>
  m.segment_key ? `${m.id_texte}|${m.segment_key}` : `id:${m.id}`

type TexteDeSegment = { segment_texte: string; notes: string | null; join_before: string | null }

/** Le texte et les notes héritées d'une page d'extraits, par (texte, clé) — jamais par
 *  l'identifiant, qu'un bigint au-delà de 2^53 arrondit dans le navigateur (`liensDeSegments`). */
async function chargerTextesDesSegments(cles: readonly string[]): Promise<Map<string, TexteDeSegment>> {
  const parTexte = new Map<string, string[]>()
  const parId: string[] = []
  for (const c of cles) {
    if (c.startsWith('id:')) { parId.push(c.slice(3)); continue }
    const i = c.indexOf('|')
    const t = c.slice(0, i)
    parTexte.set(t, [...(parTexte.get(t) ?? []), c.slice(i + 1)])
  }
  const taches: (() => PromiseLike<{ data: unknown; error: unknown }>)[] = []
  for (const [t, cles] of parTexte) for (const lot of lotsPourClauseIn(cles)) {
    taches.push(() => supabase.from('segments').select('id_texte, segment_key, segment_texte, notes, join_before').eq('id_texte', t).in('segment_key', lot))
  }
  // ⛔ `id::text` : l'identifiant revient en chiffres exacts, faute de quoi la clé rendue
  // (`id:…`) ne serait pas celle qu'on a demandée (bigint arrondi, voir `Segment.id`).
  for (const lot of lotsPourClauseIn(parId)) {
    taches.push(() => supabase.from('segments').select('id::text, id_texte, segment_key, segment_texte, notes, join_before').in('id', lot))
  }
  const reponses = await lancerEnParallele(taches)
  const textes = new Map<string, TexteDeSegment>()
  for (const r of reponses) {
    if (r.error) throw r.error
    for (const l of (r.data ?? []) as { id?: string; id_texte: string; segment_key: string | null; segment_texte: string | null; notes: string | null; join_before: string | null }[]) {
      const valeur = { segment_texte: l.segment_texte ?? '', notes: l.notes ?? null, join_before: l.join_before ?? null }
      if (l.id !== undefined) textes.set(`id:${l.id}`, valeur)
      if (l.segment_key) textes.set(`${l.id_texte}|${l.segment_key}`, valeur)
    }
  }
  return textes
}

/** Le segment tel que la carte le montre, son texte posé ; `null` tant qu'un morceau manque. */
function hydrater(seg: Segment, textes: ReadonlyMap<string, TexteDeSegment>): SegmentHydrate | null {
  if (seg.parties && seg.parties.length > 0) {
    const parties: (Morceau & { segment_texte: string })[] = []
    for (const p of seg.parties) {
      const t = textes.get(cleTexteDe(p))
      if (!t) return null
      parties.push({ ...p, segment_texte: t.segment_texte, notes: t.notes, join_before: t.join_before })
    }
    // ⚠️ L'empan se recompose comme `chargerContrepartiesFrancaises` le recompose.
    return { ...seg, parties, segment_texte: parties.map(p => p.segment_texte).join(' '), notes: parties.map(p => p.notes).filter(Boolean).join('\n') || null }
  }
  const t = textes.get(cleTexteDe(seg))
  return t ? { ...seg, parties: undefined, segment_texte: t.segment_texte, notes: t.notes, join_before: t.join_before } : null
}

/** Le numéro d'un verset visé, pour la confirmation d'un retrait : « 7 » dans un chapitre,
 *  « 3, 7 » sur une plage qui traverse des chapitres. */
function repereDuLien(l: LigneLien, surPlage: boolean): string {
  if (!l.canon_id) return l.chapitre != null ? `le chapitre ${l.chapitre} entier` : 'une cible à constituer'
  const [, c, v] = l.canon_id.split('.')
  return surPlage ? `${c}, ${v}` : v
}

/** Ce que la confirmation d'un retrait dit en vue chapitre ou plage : combien, et lesquels. */
function confirmationDuRetrait(lignes: readonly LigneLien[], surPlage: boolean): string {
  const auVerset = [...new Set(lignes.filter(l => l.canon_id).map(l => repereDuLien(l, surPlage)))]
    .sort((a, b) => a.localeCompare(b, 'fr', { numeric: true }))
  const auChapitre = [...new Set(lignes.filter(l => !l.canon_id).map(l => repereDuLien(l, surPlage)))]
  const cibles = [
    ...(auVerset.length ? [`${auVerset.length > 1 ? 'versets' : 'verset'} ${auVerset.join(', ')}`] : []),
    ...auChapitre,
  ]
  const n = lignes.length
  return `${n > 1 ? `${n} liens seront retirés` : 'Un lien sera retiré'} : ${cibles.join(' ; ')}.`
}

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
  // Les segments liés, LÉGERS (sans texte), leur contrepartie française posée.
  const [segsCharges, setSegsCharges] = useState<Segment[]>([])
  // Les lignes de `liens_bibliques` de chaque segment porteur (`idLien`) : elles disent
  // ses rubriques, et c'est elles que le « × » d'administration retire.
  const [liensParSegment, setLiensParSegment] = useState<Map<string, LigneLien[]>>(new Map())
  const [oeuvres, setOeuvres] = useState<Record<string, OeuvreInfo>>(instantaneOeuvres)
  const [auteurMeta, setAuteurMeta] = useState<Record<string, MetaAuteur>>(instantaneAuteurs)
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
  const [segSignale, setSegSignale] = useState<{ seg: SegmentHydrate; titreOeuvre?: string } | null>(null)

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
      setSegsCharges([]); setLiensParSegment(new Map()); setSegmentsPour(null)
      return
    }
    const cle = cleDemande
    setLoading(true)
    setErreurPour(null)
    let annule = false

    // ⛔ DES COLONNES LÉGÈRES (2026-09-22) : ni texte ni notes. La liste entière ne sert
    // qu'à compter, filtrer, trier et regrouper ; le texte d'un extrait se charge avec la
    // page qui le montre (`chargerTextesDesSegments`). La longueur voyage, par le champ
    // calculé `longueur_texte` : c'est elle qui juge une élision.
    // ⛔ `id::text` : l'identifiant ne repart jamais en nombre (voir `Segment.id`).
    const SEG_COLS = 'id::text, id_oeuvre, id_texte, segment_key, segment_numero, ref_niv1, ref_niv2, ref_niv3, ref_niv4, longueur:longueur_texte'
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
        const lignes = new Map<string, LigneLien[]>()
        for (const l of liens) {
          if (!lignes.has(l.segment_id)) lignes.set(l.segment_id, [])
          lignes.get(l.segment_id)!.push({ id: l.id, type: l.type, canon_id: l.canon_id, livre: l.livre, chapitre: l.chapitre })
        }
        const ids = [...lignes.keys()]
        if (!ids.length) {
          setSegsCharges([]); setLiensParSegment(new Map()); setSegmentsPour(cle)
          return
        }
        // ⛔ LES IDENTIFIANTS PARTENT EN CHIFFRES EXACTS (`segmentsDesLiens`, qui lève si
        // l'un d'eux est un nombre) : c'est ici que 2 771 liens se perdaient.
        const bruts = await segmentsDesLiens<Omit<Segment, 'idLien'>>(ids, SEG_COLS)
        if (annule) return
        // ⛔ ON LIT TOUJOURS UNE TRADUCTION FRANÇAISE (2026-09-04) : le segment AFFICHÉ
        // devient sa contrepartie française ; seul `idLien` garde celui qui porte le lien.
        // ⚠️ `chargerContrepartiesFrancaises` transporte encore l'identifiant par un
        // NOMBRE : on ne lui donne donc pas le nôtre, mais le RANG du segment dans la
        // liste — une clé de correspondance, que rien n'arrondit.
        const contreparties = await chargerContrepartiesFrancaises(
          supabase, bruts.map((s, rang) => ({ ...s, id: rang })), { texte: false })
        if (annule) return
        const segs: Segment[] = bruts.map((s, rang) => {
          const fr = contreparties.get(rang)
          if (!fr) return { ...s, idLien: s.id }
          // ⚠️ La contrepartie rend l'identifiant de son segment français en NOMBRE. Aucun
          // des six textes qui en ont une ne porte d'identifiant au-delà de 2^53 (mesuré
          // le 2026-09-22) ; si cela changeait, on garderait le segment d'origine plutôt
          // que d'afficher un passage qu'on ne saurait ni prélever ni ouvrir.
          const numeriques = [fr.id, ...(fr.parties ?? []).map(p => p.id)]
          if (!numeriques.every(n => Number.isSafeInteger(n))) {
            console.error('[volet] contrepartie française à l’identifiant non représentable, segment d’origine gardé :', s.id_texte, s.segment_numero)
            return { ...s, idLien: s.id }
          }
          return {
            ...s, ...fr,
            id: String(fr.id),
            parties: fr.parties?.map(p => ({ ...p, id: String(p.id) })),
            id_oeuvre: s.id_oeuvre,
            idLien: s.id,
          }
        })
        await chargerMetadonnees(segs.map(s => s.id_oeuvre), segs.map(s => s.id_texte), userId)
        if (annule) return
        setOeuvres(instantaneOeuvres())
        setAuteurMeta(instantaneAuteurs())
        setEditions(instantaneEditions())
        setSegsCharges(segs)
        setLiensParSegment(lignes)
        setSegmentsPour(cle)
      } catch (erreur) {
        if (annule) return
        console.error('[volet] les textes des Pères n’ont pas pu être chargés :', erreur)
        setSegsCharges([]); setLiensParSegment(new Map())
        setErreurPour(cle)
        setSegmentsPour(cle)
      } finally {
        if (!annule) setLoading(false)
      }
    })()
    return () => { annule = true }
    // ⚠️ `userId` : ce qu'on lit dépend de la session (politique de lecture), et le cache
    // des métadonnées se vide quand le lecteur change.
  }, [demande, cleDemande, tentative, userId])

  // Citations = types 1 et 2 réunis ; doctrine = 3 ; écho = 4. ⚠️ Les TYPES se cherchent
  // par `idLien` : ils sont portés par le lien, non par le segment montré. Dérivées des
  // lignes de liens, les rubriques suivent d'elles-mêmes un retrait.
  const { segmentsCitations, segmentsDoctrine, segmentsEcho } = useMemo(() => {
    const citations: { seg: Segment; col: string }[] = []
    const doctrine: Segment[] = []
    const echo: Segment[] = []
    for (const seg of segsCharges) {
      const types = new Set((liensParSegment.get(seg.idLien) ?? []).map(l => l.type))
      if (types.has(1)) citations.push({ seg, col: 'lien_1' })
      else if (types.has(2)) citations.push({ seg, col: 'lien_2' })
      if (types.has(3)) doctrine.push(seg)
      if (types.has(4)) echo.push(seg)
    }
    return { segmentsCitations: citations, segmentsDoctrine: doctrine, segmentsEcho: echo }
  }, [segsCharges, liensParSegment])

  // Les segments PORTEURS de chaque segment montré : deux latins d'un même paragraphe
  // rendent la même contrepartie française, et le retrait doit viser les deux.
  const porteursDuSegment = useMemo(() => {
    const m = new Map<string, Set<string>>()
    for (const seg of segsCharges) {
      if (!m.has(seg.id)) m.set(seg.id, new Set())
      m.get(seg.id)!.add(seg.idLien)
    }
    return m
  }, [segsCharges])

  // ── MESURER LES ÉLISIONS ────────────────────────────────────────────────────
  // Deux citations d'un même texte séparées par un ou deux paragraphes se lisent d'un
  // trait, l'écart marqué d'un « […] » — mais seulement si l'on SAIT ce qu'on élide.
  // ⚠️ La mesure ne part QUE s'il y a un écart à mesurer, et la page n'en dépend jamais.
  useEffect(() => {
    const tous = [...segmentsCitations.map(c => c.seg), ...segmentsDoctrine, ...segmentsEcho]
    // ⚠️ Ce que la liste porte déjà se sait sans requête : sa longueur, et ses niveaux.
    const connues = new Map<string, number>()
    const niveauxConnus = new Map<string, NiveauxDuPassage>()
    for (const seg of tous) {
      connues.set(`${seg.id_texte}|${seg.segment_numero}`, seg.longueur ?? 0)
      niveauxConnus.set(`${seg.id_texte}|${seg.segment_numero}`, niveauxDuSegment(seg))
    }
    const rangee = tous
      .map(seg => ({ idOeuvre: seg.id_oeuvre, idTexte: seg.id_texte, numero: seg.segment_numero, texte: '' }))
      .sort((x, y) => (x.idTexte ?? '').localeCompare(y.idTexte ?? '') || x.numero - y.numero)
    const ecarts = ecartsAMesurer(rangee, c => c)
    // ⛔ LES PAIRES UTILES, TEXTE PAR TEXTE (2026-09-22). La requête croisait
    // `.in('id_texte', textes).in('segment_numero', numéros)` : tous les numéros dans tous
    // les textes, soit 2 566 lignes sur Genèse 1 pour 424 utiles, tronquées à 1 000 par
    // PostgREST. Chaque texte ne demande plus que SES numéros, pages comprises.
    const parTexte = new Map<string, Set<number>>()
    for (const e of ecarts) for (const n of numerosDeLEcart(e)) {
      if (connues.has(`${e.idTexte}|${n}`)) continue
      if (!parTexte.has(e.idTexte)) parTexte.set(e.idTexte, new Set())
      parTexte.get(e.idTexte)!.add(n)
    }
    let annule = false
    ;(async () => {
      type Ligne = {
        id_texte: string; segment_numero: number; longueur: number | null
        ref_niv1: string | null; ref_niv2: string | null; ref_niv3: string | null; ref_niv4: string | null
      }
      const taches: (() => Promise<Ligne[]>)[] = []
      for (const [idTexte, numeros] of parTexte) {
        for (const lot of lotsPourClauseIn([...numeros].map(String))) {
          taches.push(() => chargerToutesPagesSupabase<Ligne>((debut, fin) =>
            supabase.from('segments')
              .select('id_texte, segment_numero, longueur:longueur_texte, ref_niv1, ref_niv2, ref_niv3, ref_niv4')
              .eq('id_texte', idTexte).in('segment_numero', lot.map(Number))
              .order('segment_numero', { ascending: true }).range(debut, fin) as unknown as PromiseLike<{ data: Ligne[] | null; error: unknown }>))
        }
      }
      // ⚠️ Chaque tâche pagine EN SÉRIE : la borne de `lancerEnParallele` est la borne réelle.
      const lots = await lancerEnParallele(taches)
      const trouvees = new Map(connues)
      const niveaux = new Map(niveauxConnus)
      for (const lignes of lots) {
        for (const l of lignes) {
          trouvees.set(`${l.id_texte}|${l.segment_numero}`, l.longueur ?? 0)
          niveaux.set(`${l.id_texte}|${l.segment_numero}`, niveauxDuSegment(l))
        }
      }
      if (!annule) { setLongueurs(trouvees); setNiveauxEcarts(niveaux) }
    // ⚠️ Une erreur se LIT : elle ne doit pas se lire « rien à élider ».
    })().catch(e => console.error('Volet patristique : mesure des élisions impossible.', e))
    return () => { annule = true }
  }, [segmentsCitations, segmentsDoctrine, segmentsEcho])

  // Retirer les lignes que la base vient de supprimer : les rubriques se recalculent, et
  // un segment qui garde un lien d'un autre type reste sous son autre onglet.
  const retirerLiens = useCallback((retires: readonly number[]) => {
    const partis = new Set(retires)
    setLiensParSegment(prev => {
      const apres = new Map<string, LigneLien[]>()
      for (const [id, lignes] of prev) apres.set(id, lignes.filter(l => !partis.has(l.id)))
      return apres
    })
  }, [])

  // ⛔ CE QUE LE « × » D'UNE CARTE RETIRE (2026-09-22). Les lignes de TOUS les segments de
  // l'occurrence (une occurrence réunie en porte plusieurs), du TYPE de l'onglet regardé,
  // et, en vue verset, du SEUL verset montré : le retrait ne visait que le premier segment,
  // prenait le type de sa première rubrique, et emportait en vue chapitre les liens du
  // segment vers TOUS les versets du chapitre, sans le dire.
  const cibleDuRetrait = useCallback((groupe: readonly ItemAffiche[]): { ids: number[]; confirmation: string | null } => {
    const types = TYPES_DU_SOUS_ONGLET[sousOnglet]
    const porteurs = new Set<string>()
    for (const it of groupe) for (const p of porteursDuSegment.get(it.seg.id) ?? [it.seg.idLien]) porteurs.add(p)
    const lignes = [...porteurs].flatMap(p => liensParSegment.get(p) ?? []).filter(l => types.includes(l.type))
    if (demande?.type === 'verset') {
      const auVerset = lignes.filter(l => l.canon_id === demande.idVerset)
      if (auVerset.length > 0) return { ids: auVerset.map(l => l.id), confirmation: null }
      // Le passage n'est lié qu'au chapitre entier : le retrait vaut pour tout le chapitre.
      return { ids: lignes.map(l => l.id), confirmation: lignes.length ? confirmationDuRetrait(lignes, false) : null }
    }
    return { ids: lignes.map(l => l.id), confirmation: lignes.length ? confirmationDuRetrait(lignes, demande?.type === 'plage') : null }
  }, [sousOnglet, porteursDuSegment, liensParSegment, demande])


  // UN SEGMENT NE PARAÎT QU'UNE FOIS, en portant toutes les natures de son rapport au
  // verset. ⛔ ET IL EST CLASSÉ, dans le temps (date de l'œuvre, puis auteur, œuvre, rang).
  // ⚠️ La clé chronologique se calcule UNE fois par extrait, avant le tri.
  const itemsTous: ItemAffiche[] = useMemo(() => {
    const brut: Omit<ItemAffiche, 'categories'>[] = [
      ...segmentsCitations.map(({ seg, col }) => ({ seg, col, categorie: (col === 'lien_2' ? 'paraphrase' : 'citation_directe') as Categorie })),
      ...segmentsDoctrine.map(seg => ({ seg, col: 'lien_3', categorie: 'commentaire' as const })),
      ...segmentsEcho.map(seg => ({ seg, col: 'lien_4', categorie: 'echo' as const })),
    ].filter(({ seg }) => Boolean(oeuvres[seg.id_oeuvre]))
    const parSegment = new Map<string, ItemAffiche>()
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
  // ⛔ UN COMPTE PORTE SON UNITÉ pour qui ne voit pas l'onglet (audit d'accessibilité,
  // 2026-09-22) : le chiffre seul, lu à la suite de l'intitulé, ne dit pas ce qu'il compte.
  const pluriel = (n: number, un: string, plusieurs: string) => `${n} ${n > 1 ? plusieurs : un}`
  const ONGLETS: { code: Onglet; label: string; count?: number | null; enAttente: boolean; unite: (n: number) => string }[] = [
    { code: 'patristique',  label: 'Pères de l’Église', count: comptesSousOnglets.peres, enAttente, unite: n => pluriel(n, 'extrait', 'extraits') },
    // L'onglet des commentaires de LECTEURS s'appelle « Discussion » : « Commentaires » est
    // le sous-onglet des commentaires PATRISTIQUES, et les deux se confondaient.
    ...(verset ? [{ code: 'commentaires' as Onglet, label: 'Discussion', count: nbCommentairesBible, enAttente: attenteCommentaires, unite: (n: number) => pluriel(n, 'commentaire', 'commentaires') }] : []),
    ...(notesOffertes ? [{
      code: 'notes' as Onglet, label: 'Notes',
      count: compteNotes !== null && compteNotes.pour === cleNotes ? compteNotes.n : null,
      enAttente: ongletAffiche === 'notes' && compteNotes?.pour !== cleNotes,
      unite: (n: number) => pluriel(n, 'note', 'notes'),
    }] : []),
    ...(semantiqueOfferte ? [{
      code: 'semantique' as Onglet, label: 'Sémantique',
      count: compteSemantique !== null && compteSemantique.pour === cleSemantique ? compteSemantique.n : null,
      enAttente: ongletAffiche === 'semantique' && compteSemantique?.pour !== cleSemantique,
      unite: (n: number) => pluriel(n, 'annotation', 'annotations'),
    }] : []),
  ]
  const SOUS_ONGLETS: [SousOnglet, string, number, (n: number) => string][] = [
    ['citations', 'Citations', comptesSousOnglets.citations, n => pluriel(n, 'citation', 'citations')],
    ['doctrine', 'Commentaires', comptesSousOnglets.doctrine, n => pluriel(n, 'commentaire', 'commentaires')],
    ['echos', 'Échos', comptesSousOnglets.echos, n => pluriel(n, 'écho', 'échos')],
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
    numero: it.seg.segment_numero, texte: it.seg.segment_texte ?? '',
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
  // ⚠️ Les clés ne lisent que `id_texte` et `segment_key` : la page LÉGÈRE suffit, et les
  // notes partent sans attendre les textes.
  const clesPage = clesDesExtraits(itemsPage as unknown as Parameters<typeof clesDesExtraits>[0]).join('\n')
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

  // ── LES TEXTES DE LA PAGE ──────────────────────────────────────────────────
  // ⛔ LE TEXTE NE SE CHARGE QUE POUR LA PAGE MONTRÉE (2026-09-22) : vingt extraits, non
  // plus les 2 446 segments de Genèse 1. Retenus par clé, ils servent de nouveau quand on
  // revient à une page déjà vue.
  const [textes, setTextes] = useState<Map<string, TexteDeSegment>>(() => new Map())
  const textesDemandes = useRef<Set<string>>(new Set())
  const [echecTextesPour, setEchecTextesPour] = useState<string | null>(null)
  const [tentativeTextes, setTentativeTextes] = useState(0)
  const clesTextesPage = [...new Set(itemsPage.flatMap(g => g.flatMap(({ seg }) =>
    seg.parties && seg.parties.length > 0 ? seg.parties.map(cleTexteDe) : [cleTexteDe(seg)])))].join('\n')
  useEffect(() => {
    const manquantes = clesTextesPage ? clesTextesPage.split('\n').filter(cle => !textesDemandes.current.has(cle)) : []
    if (manquantes.length === 0) return
    for (const cle of manquantes) textesDemandes.current.add(cle)
    const pour = clesTextesPage
    chargerTextesDesSegments(manquantes)
      .then(charges => {
        // ⛔ UNE RÉUSSITE EFFACE L'ÉCHEC PRÉCÉDENT (2026-09-22) : sans cela, une panne
        // passagère laissait « Les textes de cette page n'ont pas pu être chargés » au-dessus
        // d'extraits pourtant affichés, jusqu'au changement de page.
        setEchecTextesPour(null)
        setTextes(avant => {
          const apres = new Map(avant)
          for (const [cle, t] of charges) apres.set(cle, t)
          return apres
        })
      })
      .catch(erreur => {
        // Une clé en échec se redemandera au prochain essai.
        for (const cle of manquantes) textesDemandes.current.delete(cle)
        console.error('[volet] textes de la page illisibles :', erreur)
        setEchecTextesPour(pour)
      })
  }, [clesTextesPage, tentativeTextes])
  // Les groupes de la page, leur texte posé ; `null` tant qu'un morceau manque.
  const groupesHydrates = useMemo(() => itemsPage.map(groupe => {
    const h = groupe.map(it => { const seg = hydrater(it.seg, textes); return seg ? { ...it, seg } : null })
    return h.every(x => x !== null) ? h as (ItemAffiche & { seg: SegmentHydrate })[] : null
  }), [itemsPage, textes])
  const echecTextes = echecTextesPour !== null && echecTextesPour === clesTextesPage
  // ⛔ LE PANNEAU NE S'ÉTEINT PLUS QUAND UN TEXTE MANQUE (2026-09-22). Le fondu couvrait
  // aussi l'arrivée des textes : depuis qu'ils se chargent PAGE PAR PAGE, la liste
  // clignotait à chaque page et à chaque filtre. Ce qui est servi reste lu ; seule la carte
  // dont le texte manque attend, sous son propre squelette.
  const premierGroupePret = groupesHydrates.length === 0 || groupesHydrates[0] !== null

  // ── TOURNER LA PAGE : LA LISTE REMONTE, LE FOYER SUIT ──────────────────────
  // ⛔ Changer de page laissait le défilement où il était et le foyer sur la flèche : on
  // arrivait au milieu de la page suivante, et au clavier rien ne disait qu'elle avait
  // changé. Le panneau revient en tête, et le premier extrait prend le foyer dès qu'il est
  // servi (son texte peut arriver après).
  const refDefilement = useRef<HTMLDivElement>(null)
  const refPremierExtrait = useRef<HTMLDivElement>(null)
  const [foyerADonner, setFoyerADonner] = useState(false)
  const allerAPage = useCallback((p: number) => { setPageItems(p); setFoyerADonner(true) }, [])
  useEffect(() => {
    if (!foyerADonner) return
    refDefilement.current?.scrollTo({ top: 0 })
    const premier = refPremierExtrait.current
    if (!premier) return
    premier.focus({ preventScroll: true })
    setFoyerADonner(false)
  }, [foyerADonner, premierGroupePret])

  // ── LES PRÉLÈVEMENTS DE LA PAGE ────────────────────────────────────────────
  // ⛔ Le bouton d'un extrait partait toujours de « non prélevé » : on lit ceux de la page,
  // par la clé naturelle (ce lecteur, ces segments). Retenus avec la demande qu'ils servent.
  const idsSegmentsPage = itemsPage.map(g => g[0].seg.id).join(',')
  const clePrelevements = userId && idsSegmentsPage ? `${userId}|${idsSegmentsPage}` : null
  const [preleves, setPreleves] = useState<{ pour: string; ids: Set<string> } | null>(null)
  useEffect(() => {
    if (!clePrelevements || !userId) return
    const pour = clePrelevements
    let annule = false
    // ⛔ `segment_id::text` des deux côtés : on interroge avec des chiffres exacts, et l'on
    // compare à des chiffres exacts (voir `Segment.id`).
    lancerEnParallele(lotsPourClauseIn(idsSegmentsPage.split(',')).map(lot => () =>
      supabase.from('prelevements').select('segment_id::text').eq('user_id', userId).in('segment_id', lot)))
      .then(reponses => {
        if (annule) return
        const enEchec = reponses.find(r => r.error)
        if (enEchec) { console.error('[volet] prélèvements illisibles :', enEchec.error); return }
        const ids = new Set<string>()
        for (const r of reponses) for (const l of (r.data ?? []) as unknown as { segment_id: string | null }[]) if (l.segment_id != null) ids.add(l.segment_id)
        setPreleves({ pour, ids })
      })
      .catch(e => console.error('[volet] prélèvements illisibles :', e))
    return () => { annule = true }
  }, [clePrelevements, userId, idsSegmentsPage])
  const prelevesPage = preleves && preleves.pour === clePrelevements ? preleves.ids : null
  const marquerPreleve = useCallback((segmentId: string, oui: boolean) => {
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
        <button onClick={() => setOuvert(true)} title={LIBELLE_RAIL} aria-label={LIBELLE_RAIL}
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
                    <LigneCompte enAttente={t.enAttente} compte={t.count} videDit="∅" unite={t.unite}
                      style={{ fontSize: '0.6875rem', lineHeight: 1, height: '1em', fontWeight: 500, color: actif ? 'var(--cs-vert)' : 'var(--cs-texte-gris)' }} />
                  </button>
                )
              })}
            </div>
          </div>

          {/* Contenu (la discussion et les notes défilent en interne, pour épingler la
              saisie ou les filtres en tête du volet). */}
          {/* ⛔ `scrollbar-gutter: stable` : les SOUS-ONGLETS vivent DANS ce défileur, et
              ils se partagent sa largeur à parts égales. Un sous-onglet moins fourni que
              les autres — « Échos » le plus souvent — faisait disparaître la barre, la
              largeur utile gagnait quinze pixels, et toute la rangée sautait de sept vers
              la gauche. Ce n'était pas les onglets, c'était la barre de défilement.
              ⚠️ `stable` seul, non `both-edges` : la barre est à DROITE, et réserver sa
              seule gouttière suffit à ce que la page ne bouge jamais. ⛔ Rien au doigt :
              une barre superposée n'y prend aucune place, et la gouttière y serait un
              blanc perdu sur une colonne déjà étroite. */}
          <div id={idPanneau} role="tabpanel" aria-labelledby={idOnglet(ongletAffiche)} ref={refDefilement}
            style={(ongletAffiche === 'commentaires' && verset) || ongletAffiche === 'notes'
            ? { flex:1, minHeight:0, overflow:'hidden', padding:'0 12px', display:'flex', flexDirection:'column' }
            : { overflowY:'auto', flex:1, padding:'0 12px', display:'flex', flexDirection:'column',
                ...(mobile ? {} : { scrollbarGutter: 'stable' }) }}>
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
                  {SOUS_ONGLETS.map(([key, label, nb, unite]) => {
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
                        <LigneCompte enAttente={enAttente} compte={nb} videDit="∅" unite={unite}
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
                {!echec && echecTextes && (
                  <EtatVideVolet>
                    <MentionVide>Les textes de cette page n’ont pas pu être chargés.</MentionVide>
                    <button onClick={() => { setEchecTextesPour(null); setTentativeTextes(t => t + 1) }} className="cs-bouton-lien">Réessayer</button>
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
                {itemsPage.map((groupeLeger, rang) => {
                  const groupe = groupesHydrates[rang]
                  // Le texte de cette carte n'est pas encore là : sa place l'attend.
                  if (!groupe) return <SqueletteExtrait key={groupeLeger.map(g => g.seg.id).join('_')} />
                  const premier = groupe[0]
                  // Occurrence réunie : les textes des segments consécutifs en un seul
                  // paragraphe. Métadonnées = premier segment ; liens = TOUS ses segments.
                  const segFusionne: SegmentHydrate = groupe.length === 1
                    ? premier.seg
                    : { ...premier.seg, segment_texte: texteDuGroupe(groupe, cleCitation) }
                  const extrait = composerExtrait(groupe, notesVolet)
                  const retrait = isAdmin ? cibleDuRetrait(groupeLeger) : { ids: [], confirmation: null }
                  return (
                    <SegmentCard
                      key={groupe.map(g => g.seg.id).join('_')} s={segFusionne} info={oeuvres[premier.seg.id_oeuvre]}
                      refFoyer={rang === 0 ? refPremierExtrait : undefined}
                      edition={editions[premier.seg.id_texte]}
                      texteAffichage={extrait.texte} notes={extrait.notes} notesEnAttente={extrait.enAttente}
                      userId={userId} isAdmin={isAdmin}
                      lienIds={retrait.ids}
                      confirmationSuppression={retrait.confirmation}
                      enregistre={prelevesPage ? prelevesPage.has(premier.seg.id) : null}
                      onEnregistre={marquerPreleve}
                      retour={adresseRetour}
                      onSignaler={(s, titreOeuvre) => { if (exigerCompte('signaler une erreur')) setSegSignale({ seg: s, titreOeuvre }) }}
                      onSupprimeLien={retirerLiens}
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
              <button onClick={() => allerAPage(Math.max(pageCouranteItems - 1, 0))} disabled={!precedentePossible}
                aria-label="Page précédente" title="Page précédente"
                style={{ ...STYLE_FLECHE_PAGE, color: precedentePossible ? 'var(--cs-texte-second)' : 'var(--cs-bord)', cursor: precedentePossible ? 'pointer' : 'default' }}>
                ‹
              </button>
              <span aria-live="polite" style={{ fontSize:'0.6875rem', color:'var(--cs-texte-gris)', whiteSpace:'nowrap', padding:'0 2px' }}>
                {pageCouranteItems + 1} sur {nbPagesItems}
              </span>
              <button onClick={() => allerAPage(Math.min(pageCouranteItems + 1, nbPagesItems - 1))} disabled={!suivantePossible}
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
