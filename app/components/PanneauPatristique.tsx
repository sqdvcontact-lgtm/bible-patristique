'use client'

import LireQuandMeme, { FEUILLE_COMMENTAIRE_RETRACTE } from '@/app/components/LireQuandMeme'
import { CLASSE_ACTIONS_CARTE_VOLET, CLASSE_CARTE_VOLET, CORPS_CARTE_VOLET, FEUILLE_CARTE_VOLET, INTERLIGNE_CARTE_VOLET, STYLE_CARTE_VOLET } from '@/app/lib/carteVolet'
import { Z_FENETRE, Z_TIROIR, Z_TIROIR_VOILE } from '@/app/lib/empilement'
import { useState, useEffect, useId, useMemo, useRef, useCallback } from 'react'
import { MotAttente } from '@/app/lib/attenteEnCreux'
import { supabase } from "@/app/lib/supabase"
import { rendreTexteEnrichi, texteSansEnrichissement } from '@/app/oeuvre/[id]/texteEnrichi'
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
import { calculerRang, couleurRang } from '@/app/lib/classement'
import { anneeChronologique, comparerChronologie } from '@/app/lib/chronologiePatristique'
import { useAffichageAdmin } from '@/app/lib/contexteAffichageAdmin'
import EditeurCommentaire from '@/app/components/EditeurCommentaire'
import { estOeuvrePubliee } from '@/app/lib/oeuvresPublication'
import { segmentsLiesAuVerset, segmentsLiesAuChapitre, segmentsLiesAPlage, type TypeLien } from '@/app/lib/liens'
import IconeSignet from '@/app/components/IconeSignet'
import { HAUTEUR_NAVBAR, BANDEAU_NAV_MOBILE } from '@/app/lib/mesures'
import ModalSignalement from '@/app/components/ModalSignalement'
import { useCompte } from '@/app/lib/contexteCompte'
import InvitationCompteInline from '@/app/components/InvitationCompteInline'
import { citationPatristique, copierCitation } from '@/app/lib/citation'
import { COLONNES_IDENTITE_TEXTE, identiteCitee, parametreTexte, type LigneIdentiteTexte } from '@/app/lib/identiteCitee'
import { indexEditeursNavigateur } from '@/app/lib/editeurs'
import { signalerProgression } from '@/app/components/AnnonceHautsFaits'
import MarqueMecene from '@/app/components/MarqueMecene'
import { carteCommentaire, ENTETE_COMMENTAIRE, NOM_COMMENTAIRE, DATE_COMMENTAIRE, BADGE_RANG, BADGE_ETAT, TEXTE_COMMENTAIRE, PIED_COMMENTAIRE, ACTION_COMMENTAIRE, EFFACE_COMMENTAIRE, formeCommentaire } from '@/app/lib/styleCommentaire'
import RailVolet from '@/app/components/RailVolet'
import IconeChevron from '@/app/components/IconeChevron'
import { ecartsAMesurer, numerosDeLEcart, regrouperCitations, texteDuGroupe, type Ecart } from '@/app/lib/regrouperCitations'
import { niveauxDuSegment, titreEntrePassages, type NiveauxDuPassage } from '@/app/lib/titresDeDivision'
import { lotsPourClauseIn } from '@/app/lib/paginationSupabase'
import { chargerContrepartiesFrancaises } from '@/app/lib/contrepartieFrancaise'
import { MarqueAttenteVolet } from '@/app/lib/attenteNavigation'
import FleuronDiscret from '@/app/components/FleuronDiscret'
import CompteEnAttente from '@/app/components/CompteEnAttente'
import dynamic from 'next/dynamic'
import { cleInventaireNotesBible, type ContexteNotesBible } from '@/app/lib/notesBibleInventaire'
import EtatVideVolet, { MentionVide } from '@/app/components/EtatVideVolet'
import { useFermerAEchap } from '@/app/lib/useFermerAEchap'
import { useRendreLeFoyer } from '@/app/lib/useRendreLeFoyer'

// ⛔ L'inventaire des notes d'une bible ne se charge qu'avec son onglet : il ne sert qu'à
// l'administrateur, et le lecteur n'a pas à en payer le poids.
const OngletNotesBible = dynamic(() => import('@/app/components/OngletNotesBible'))
const OngletSemantique = dynamic(() => import('@/app/components/OngletSemantique'))

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
type Commentaire = { id: number; texte: string; auteur_nom: string; created_at: string }

const ACTION_BTN: React.CSSProperties = {
  background:'none', border:'none', cursor:'pointer', padding:'1px 2px',
  borderRadius:'4px', width:'16px', height:'16px', display:'inline-flex',
  alignItems:'center', justifyContent:'center', fontSize:'0.84375rem',
  lineHeight:1, flexShrink:0, transition:'color 0.15s',
}

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


function siecleEnRomain(n: number): string {
  const r = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV']
  return (r[n - 1] ?? String(n)) + 'e'
}

// Rang chronologique d'un siècle donné en toutes lettres (« IXe siècle »,
// « IVe-Ve siècle ») ou en nombre — pour trier les périodes par ordre chronologique.
function rangSiecle(s: unknown): number {
  const str = String(s).trim()
  const dec = str.match(/^\d+/)
  if (dec) return parseInt(dec[0], 10)
  const m = str.toUpperCase().match(/[IVXLCDM]+/)
  if (!m) return 9999
  const val: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 }
  const rn = m[0]
  let n = 0
  for (let i = 0; i < rn.length; i++) {
    const c = val[rn[i]] ?? 0, suiv = val[rn[i + 1]] ?? 0
    n += c < suiv ? -c : c
  }
  return n
}

// Libellé d'un siècle. `auteurs.siecle` est du TEXTE déjà complet (« IXe siècle »,
// « IVe-Ve siècle ») : on le rend tel quel. On ne construit le libellé que si la valeur
// est un simple nombre (évite le doublon « sièclee »).
function labelSiecle(s: unknown): string {
  const str = String(s).trim()
  if (/[a-zà-ÿ]/i.test(str)) return str
  const n = parseInt(str, 10)
  return Number.isFinite(n) ? `${siecleEnRomain(n)} siècle` : str
}

// Rendu typographique d'un libellé de siècle : le chiffre romain en PETITES CAPITALES,
// l'ordinal (« e ») en EXPOSANT, le reste (« siècle », « - », espaces) en romain normal.
// Ex. « IVe-Ve siècle ». Pas de flag insensible à la casse : « siècle » contient i/c/l.
function rendreSiecle(str: string): React.ReactNode {
  const parts: React.ReactNode[] = []
  const re = /([IVXLCDM]+)(er|ère|ème|e)?/g
  let last = 0, m: RegExpExecArray | null, k = 0
  while ((m = re.exec(str)) !== null) {
    if (m.index > last) parts.push(str.slice(last, m.index))
    parts.push(<span key={k++} style={{ fontVariant: 'small-caps', letterSpacing: '0.02em' }}>{m[1].toLowerCase()}</span>)
    if (m[2]) parts.push(<sup key={k++} style={{ fontSize: '0.68em', lineHeight: 0, verticalAlign: 'baseline', position: 'relative', top: '-0.5em' }}>{m[2]}</sup>)
    last = re.lastIndex
  }
  if (last < str.length) parts.push(str.slice(last))
  return parts
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
function BoutonEnregistrerSegment({ segment, info, userId }: {
  segment: Segment; info?: OeuvreInfo; userId: string | null
}) {
  const [loading, setLoading] = useState(false)
  const [idPrelev, setIdPrelev] = useState<string | null>(null)
  const { exigerCompte } = useCompte()
  if (!userId) return null

  const enregistrer = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (idPrelev) return
    if (!exigerCompte('prélever ce passage')) return
    setLoading(true)
    const { data } = await supabase.from('prelevements').insert({
      user_id: userId, type: 'patristique',
      auteur: info?.auteur_nom || segment.id_oeuvre,
      titre_oeuvre: info?.titre || '',
      ref_niv1: segment.ref_niv1 || null,
      ref_niv2: segment.ref_niv2 || null,
      id_oeuvre: segment.id_oeuvre,
      // ⛔ LE SEGMENT ET SON TEXTE, et non le seul numéro : sans eux, le déclencheur
      //    `resoudre_prelevement_segment` cherchait le numéro dans le texte PAR DÉFAUT, et
      //    un passage de Ceriziers se rangeait sous le segment de Mirandol qui porte le même.
      segment_id: segment.id,
      id_texte: segment.id_texte,
      segment_numero: segment.segment_numero,
      texte: segment.segment_texte,
    }).select('id').single()
    setLoading(false)
    if (data) { setIdPrelev(data.id); signalerProgression() }
  }

  const supprimer = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!idPrelev) return
    setLoading(true)
    await supabase.from('prelevements').delete().eq('id', idPrelev)
    setLoading(false)
    setIdPrelev(null)
  }

  if (idPrelev) {
    return (
      <button onClick={supprimer} disabled={loading} title="Retirer des prélèvements"
        className="cs-bouton-fin" style={{ ...ACTION_BTN, color:'var(--cs-texte-faible)' }}>
        {loading ? '…' : <IconeSignet plein />}
      </button>
    )
  }
  return (
    <button onClick={enregistrer} disabled={loading} title="Enregistrer dans mes prélèvements"
      className="cs-bouton-fin" style={{ ...ACTION_BTN, color:'var(--cs-bord)' }}>
      {loading ? '…' : <IconeSignet />}
    </button>
  )
}

// ── Bouton supprimer lien (admin uniquement) ──────────────────────────────────
function BoutonSupprimerLien({ segmentId, colonneLien, isAdmin, onSupprime }: {
  segmentId: number; colonneLien: string; isAdmin: boolean; onSupprime: () => void
}) {
  const [confirme, setConfirme] = useState(false)
  const [loading, setLoading] = useState(false)
  if (!isAdmin) return null

  if (!confirme) {
    return (
      <button onClick={e => { e.stopPropagation(); setConfirme(true) }}
        title={`Supprimer ${colonneLien}`}
        className="cs-bouton-fin" style={{ ...ACTION_BTN, fontSize:'1.125rem', color:'var(--cs-bord)' }}>
        ×
      </button>
    )
  }
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:'2px', flexShrink:0 }}>
      <button onClick={async e => {
        e.stopPropagation()
        setLoading(true)
        await supabase.from('segments').update({ [colonneLien]: null }).eq('id', segmentId)
        setLoading(false)
        onSupprime()
      }} disabled={loading}
        style={{ fontSize:'0.625rem', padding:'1px 5px', borderRadius:'4px', border:'none', background:'var(--cs-danger-aplat)', color:'var(--cs-sur-aplat)', cursor:'pointer' }}>
        {loading ? '…' : 'Oui'}
      </button>
      <button onClick={e => { e.stopPropagation(); setConfirme(false) }}
        style={{ fontSize:'0.625rem', padding:'1px 5px', borderRadius:'4px', border:'1px solid var(--cs-bord)', background:'var(--cs-surface)', color:'var(--cs-texte-second)', cursor:'pointer' }}>
        Non
      </button>
    </span>
  )
}

// ── Modale signalement ────────────────────────────────────────────────────────
// Composant partagé unique (voir app/components/ModalSignalement), importé en tête.

// ── Carte segment ─────────────────────────────────────────────────────────────
/** Le type d'une note pour le lecteur d'écran, ou « Note » quand elle n'en déclare aucun. */
const libelleNoteVolet = (contenu: NoteAffichee | undefined) =>
  !contenu || typeof contenu === 'string' ? LIBELLE_NOTE_SANS_TYPE : libelleDeLaNote(contenu)

function SegmentCard({ s, texteAffichage, notes, notesEnAttente, info, edition, userId, isAdmin, colonneLien, onSignaler, onSupprimeLien }: {
  s: Segment; info?: OeuvreInfo; userId: string | null; isAdmin: boolean
  /** L'ÉDITION du passage (`oeuvre_textes`) : c'est elle que la citation nomme, non l'œuvre. */
  edition?: LigneIdentiteTexte
  /** Ce qu'on LIT : l'initiale capitalisée et les appels structurés projetés (voir
   *  `composerExtrait`). `s.segment_texte` reste le texte canonique, celui qu'on copie. */
  texteAffichage: string
  /** Les notes que ses appels ouvrent, par marqueur. */
  notes: Record<string, NoteAffichee>
  /** Ses notes structurées ne sont pas encore arrivées. */
  notesEnAttente: boolean
  colonneLien: string
  onSignaler: (s: Segment, titreOeuvre?: string) => void
  onSupprimeLien: (id: number) => void
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
          <div style={{ display:'flex', alignItems:'center', gap:'4px', marginBottom:'1px' }}>
            {info?.id_auteur ? (
              <a href={`/auteur/${info.id_auteur}`} target="_blank" rel="noopener noreferrer"
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
              texte qu'elle ouvre : un passage d'une autre édition porte `texte=`. */}
          <a href={`/oeuvre/${s.id_oeuvre}?${[parametreTexte(edition), `segment=${s.id}`].filter(Boolean).join('&')}#segment-${s.id}`} target="_blank" rel="noopener noreferrer"
            title={niveaux ? `${niveaux} — accéder au passage` : 'Accéder au passage exact dans l’œuvre'}
            style={{ display:'block', fontSize:'0.75rem', color:'var(--cs-texte-gris)', fontStyle:'italic', margin:0, lineHeight:1.2, letterSpacing:'0.02em', textDecoration:'none' }}>
            {info?.titre || ''}
          </a>
          {/* ⛔ La nature du rapport (citation directe, paraphrase…) ne s'affiche plus
              (décision de l'auteur, 21 septembre 2026). Les sous-onglets et les filtres la
              disent déjà. */}
        </div>
        <div className={CLASSE_ACTIONS_CARTE_VOLET} style={{ display:'flex', flexDirection:'column', gap:'4px', alignItems:'flex-end', flexShrink:0 }}>
          <div style={{ display:'flex', gap:'1px', alignItems:'center', justifyContent:'flex-end' }}>
            <BoutonEnregistrerSegment segment={s} info={info} userId={userId} />
            <BoutonCopieSegment
              texte={texteSansEnrichissement(s.segment_texte)} auteur={info?.auteur_nom || s.id_oeuvre} titre={info?.titre || ''}
              sous_titre={info?.sous_titre}
              trad_auteur={identite.tradAuteur ?? undefined} editeur={identite.editeur ?? undefined}
              collection={identite.collection ?? undefined} ville={identite.ville ?? undefined}
              date_publication={identite.datePublication ?? undefined} responsable={identite.responsable ?? undefined}
            />
            <button onClick={e => { e.stopPropagation(); onSignaler(s, info?.titre) }} title="Signaler une erreur"
              className="cs-bouton-fin" style={{ ...ACTION_BTN, color:'var(--cs-bord)' }}>
              <IconeSignalement />
            </button>
            <BoutonSupprimerLien
              segmentId={s.idLien} colonneLien={colonneLien}
              isAdmin={isAdmin} onSupprime={() => onSupprimeLien(s.idLien)}
            />
          </div>
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

// ── Onglet commentaires ───────────────────────────────────────────────────────
// Pas plus de 5 majuscules consécutives (accentuées comprises).
const REGEX_CAPS_ABUSIVES = /[A-ZÀÂÄÉÈÊËÏÎÔÖÙÛÜŸÇ]{6,}/

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
const STYLE_COMPTE_NUL: React.CSSProperties = { fontWeight: 400, color: 'var(--cs-texte-faible)' }

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

// ── LE FILTRE ET SON VOLET PARLENT L'OR ─────────────────────────────────────
//
// Demande de l'auteur (14 septembre 2026) : « uniformiser “Filtre” et la petite fenêtre qui
// s'ouvre quand on clique dessus ; utiliser la couleur dorée/mordorée, y compris sur le bouton
// “filtre” ». Le bouton était gris au repos et vert une fois ouvert, le volet gris, ses
// pastilles vertes pour deux facettes et dorées pour la troisième, « Tout effacer » vert :
// quatre voix pour un seul outil. Une seule désormais, l'or, en quatre valeurs.
//
// ⛔ L'ENCRE est `--cs-or-lisible`, jamais `--cs-or`, qui ne rend que 3,67 sur le papier quand
// ces libellés font dix pixels. Les contrastes mesurés sont écrits dans AGENTS.md.
// ⚠️ Le VERT des sous-onglets ne bouge pas : ce sont des onglets, et le modèle des onglets du
// site est vert. Le filtre n'est pas un onglet, c'est un outil posé dessous.
const OR_ENCRE = 'var(--cs-or-lisible)'
const OR_FILET = 'rgba(var(--cs-or-rgb), 0.45)'
const OR_LAVIS = 'rgba(var(--cs-or-rgb), 0.07)'
const OR_SELECTION = 'rgba(var(--cs-or-rgb), 0.16)'
const OR_SURVOL = 'rgba(var(--cs-or-rgb), 0.10)'

/** La rubrique d'une facette du volet de filtres : « Auteurs », « Tradition »… */
const STYLE_RUBRIQUE_FILTRE: React.CSSProperties = {
  fontSize: '0.59375rem', fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: OR_ENCRE,
}

/** Une pastille de facette : retenue, offerte, ou indisponible sous le tri en cours. */
function stylePastilleFiltre(sel: boolean, dispo: boolean): React.CSSProperties {
  return {
    fontSize: '0.625rem', padding: '2px 7px', borderRadius: '8px', cursor: dispo ? 'pointer' : 'default',
    border: `1px solid ${sel ? 'var(--cs-or)' : dispo ? 'var(--cs-or-doux)' : 'var(--cs-bord-clair)'}`,
    background: sel ? OR_SELECTION : dispo ? 'var(--cs-surface)' : 'transparent',
    color: sel ? OR_ENCRE : dispo ? 'var(--cs-texte-second)' : 'var(--cs-or-doux)',
  }
}

// Groupe de tags de filtre : n'affiche que ~2 lignes ; « Afficher plus » déplie le reste.
// La hauteur de deux lignes est mesurée (position du 1er tag de la 3e ligne) pour un
// repli net, sans demi-ligne.
function GroupeTags({ titre, children }: { titre: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [ouvert, setOuvert] = useState(false)
  const [hauteur2, setHauteur2] = useState<number | null>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) { return }
    const enfants = Array.from(el.children) as HTMLElement[]
    if (enfants.length === 0) { setHauteur2(null); return }
    const base = enfants[0].offsetTop
    let lignes = 1, dernierTop = enfants[0].offsetTop, h: number | null = null
    for (const c of enfants) {
      if (c.offsetTop > dernierTop + 2) {
        lignes++; dernierTop = c.offsetTop
        if (lignes === 3) { h = c.offsetTop - base; break }
      }
    }
    setHauteur2(h)
  })
  const replie = hauteur2 != null && !ouvert
  return (
    <div style={{ marginTop: '8px' }}>
      <p style={{ ...STYLE_RUBRIQUE_FILTRE, margin: '0 0 4px' }}>{titre}</p>
      <div ref={ref} style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', overflow: 'hidden', maxHeight: replie ? `${hauteur2}px` : undefined }}>
        {children}
      </div>
      {hauteur2 != null && (
        // Collé aux tags, mais distinct : c'est un bouton-lien, pas une pastille.
        <button onClick={() => setOuvert(o => !o)} className="cs-bouton-lien cs-bouton-lien--or" style={{ marginTop: '1px' }}>
          {ouvert ? 'Afficher moins' : 'Afficher plus'}
        </button>
      )}
    </div>
  )
}

function OngletCommentaires({ verset, userId, isAdmin, onCount }: { verset: Verset; userId: string | null; isAdmin: boolean; onCount?: (n: number) => void }) {
  type Commentaire2 = Commentaire & { user_id: string | null; valide: boolean; reponse_a: number | null; pseudo: string | null; lecture: { nb_auteurs: number; total_auteurs: number } | null; mecene: boolean; nbLikes: number; nbDislikes: number; monVote: 1 | -1 | null; demande_validation: boolean; certifie?: boolean | null; supprime: boolean }
  const [commentaires, setCommentaires] = useState<Commentaire2[]>([])
  const [loading, setLoading] = useState(true)
  // Le verset dont `commentaires` porte les lignes. ⚠️ Au rendu qui suit un changement de
  // verset, `loading` vaut encore faux et `commentaires` est encore celui du verset quitté :
  // sans ce témoin, l'onglet recevait l'ancien compte sous le nouveau verset.
  const [chargePour, setChargePour] = useState<Verset['id_verset'] | null>(null)
  const [texte, setTexte] = useState('')
  const [nom, setNom] = useState('')
  const [mail, setMail] = useState('')
  const [demandeValidation, setDemandeValidation] = useState(false)
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState('')
  const [revelees, setRevelees] = useState<Set<number>>(new Set())
  const [cibleReponse, setCibleReponse] = useState<Commentaire2 | null>(null)
  const [commentaireSignale, setCommentaireSignale] = useState<Commentaire2 | null>(null)
  // Le pseudonyme vient du contexte : c'était la quatrième lecture de `profils` de
  // la page, pour une colonne que la barre de navigation avait déjà demandée.
  const { aUnCompte, exigerCompte, pseudo: pseudoMoi, estMecene } = useCompte()

  const charger = () => {
    const pour = verset.id_verset
    setLoading(true)
    supabase.from('commentaires').select('id, texte, auteur_nom, created_at, user_id, valide, reponse_a, demande_validation, certifie, supprime')
      .eq('id_verset', pour)
      .order('created_at', { ascending: true })
      .then(async ({ data }) => {
        const base = data || []
        const ids = base.map(c => c.id)
        const idsUtilisateurs = [...new Set(base.map(c => c.user_id).filter((id): id is string => !!id))]
        // ⛔ La marque de mécène se lit dans `mecenes_publics`, jamais dans `profils` :
        // la vue ne rend que des identifiants, et elle filtre déjà sur le choix du
        // lecteur de la montrer ou non. Voir app/components/MarqueMecene.tsx.
        const [likesRes, classementRes, mecenesRes] = await Promise.all([
          ids.length > 0 ? supabase.from('commentaires_likes').select('id_commentaire, user_id, valeur').in('id_commentaire', ids) : Promise.resolve({ data: [] as any[] }),
          idsUtilisateurs.length > 0 ? supabase.from('lecture_utilisateurs').select('user_id, pseudo, nb_auteurs, total_auteurs').in('user_id', idsUtilisateurs) : Promise.resolve({ data: [] as any[] }),
          idsUtilisateurs.length > 0 ? supabase.from('mecenes_publics').select('user_id').in('user_id', idsUtilisateurs) : Promise.resolve({ data: [] as { user_id: string }[] }),
        ])
        const classementMap = new Map((classementRes.data ?? []).map((c: any) => [c.user_id, c]))
        const mecenes = new Set((mecenesRes.data ?? []).map((m: { user_id: string }) => m.user_id))
        const parCommentaire = new Map<number, { likes: number; dislikes: number; mon: 1 | -1 | null }>()
        ;(likesRes.data ?? []).forEach((l: any) => {
          const cur = parCommentaire.get(l.id_commentaire) ?? { likes: 0, dislikes: 0, mon: null }
          if (l.valeur === 1) cur.likes++; else cur.dislikes++
          if (l.user_id === userId) cur.mon = l.valeur
          parCommentaire.set(l.id_commentaire, cur)
        })
        setCommentaires(base.map(c => ({
          ...c,
          pseudo: c.user_id ? classementMap.get(c.user_id)?.pseudo ?? null : null,
          lecture: c.user_id ? classementMap.get(c.user_id) ?? null : null,
          mecene: !!c.user_id && mecenes.has(c.user_id),
          nbLikes: parCommentaire.get(c.id)?.likes ?? 0,
          nbDislikes: parCommentaire.get(c.id)?.dislikes ?? 0,
          monVote: parCommentaire.get(c.id)?.mon ?? null,
        })))
        setChargePour(pour)
        setLoading(false)
      })
  }

  useEffect(() => { charger() }, [verset.id_verset, userId])

  // Le compteur de l'onglet vit dans le parent (chargé une fois par verset) ; sans
  // ce report, un ajout ou une suppression ne s'y refléterait pas. On remonte le
  // nombre de lignes chargées — même périmètre que le comptage parent (par id_verset).
  // Uniquement une fois le chargement terminé, pour éviter un « 0 » transitoire.
  useEffect(() => {
    if (!loading && chargePour === verset.id_verset) onCount?.(commentaires.length)
  }, [commentaires, loading, onCount, chargePour, verset.id_verset])

  // Fil structuré : commentaires principaux (chronologique), chacun suivi de
  // ses réponses directes (chronologique aussi) — un seul niveau, pas d'arborescence.
  const aDesReponses = (id: number) => commentaires.some(c => c.reponse_a === id)
  const commentaireVisible = (c: Commentaire2) => !c.supprime || !!c.reponse_a || aDesReponses(c.id)
  const trierCommentaires = (liste: Commentaire2[]) => [...liste]
    .filter(commentaireVisible)
    .sort((a, b) => {
      if (a.valide !== b.valide) return a.valide ? -1 : 1
      // Un commentaire certifié passe en tête des validés : c'est ce que la case
      // « Demander la certification » promet.
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
  const setCommentairesAvecTransition = (updater: (prev: Commentaire2[]) => Commentaire2[]) => {
    const doc = document as Document & { startViewTransition?: (callback: () => void) => void }
    if (doc.startViewTransition) doc.startViewTransition(() => setCommentaires(updater))
    else setCommentaires(updater)
  }

  const basculerVote = async (c: { id: number; monVote: 1 | -1 | null }, valeur: 1 | -1) => {
    if (!exigerCompte('réagir à un commentaire')) return
    if (!userId) return
    const retire = c.monVote === valeur
    setCommentairesAvecTransition(prev => prev.map(x => {
      if (x.id !== c.id) return x
      let { nbLikes, nbDislikes } = x
      if (x.monVote === 1) nbLikes--
      if (x.monVote === -1) nbDislikes--
      if (!retire) { if (valeur === 1) nbLikes++; else nbDislikes++ }
      return { ...x, nbLikes, nbDislikes, monVote: retire ? null : valeur }
    }))
    if (retire) await supabase.from('commentaires_likes').delete().eq('id_commentaire', c.id).eq('user_id', userId)
    else await supabase.from('commentaires_likes').upsert({ id_commentaire: c.id, user_id: userId, valeur }, { onConflict: 'id_commentaire,user_id' })
  }

  const supprimerCommentaire = async (c: Commentaire2) => {
    if (!confirm('Supprimer définitivement ce commentaire ?')) return
    const { data: session } = await supabase.auth.getSession()
    const token = session.session?.access_token
    const res = await fetch('/api/admin/commentaire-supprimer', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id: c.id }),
    })
    if (res.ok) setCommentaires(prev => prev.filter(x => x.id !== c.id && x.reponse_a !== c.id))
  }

  // Suppression par son propre auteur : la ligne reste (fil des réponses
  // préservé), seul le texte est remplacé par une mention grisée.
  const supprimerMonCommentaire = async (c: Commentaire2) => {
    if (!confirm('Supprimer ce commentaire ? Il restera visible en tant que « commentaire supprimé ».')) return
    const { error } = await supabase.from('commentaires').update({ supprime: true }).eq('id', c.id)
    if (!error) setCommentaires(prev => prev.map(x => x.id === c.id ? { ...x, supprime: true } : x))
  }

  const mailValide = (m: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(m)

  const envoyer = async () => {
    setErreur('')
    if (!exigerCompte('commenter ce passage')) return
    if (!texte.trim()) { setErreur('Le commentaire est vide.'); return }
    if (REGEX_CAPS_ABUSIVES.test(texte)) { setErreur('Pas plus de cinq lettres capitales à la suite.'); return }
    if (!userId) {
      if (!nom.trim())   { setErreur('Le nom est requis.'); return }
      if (!mailValide(mail)) { setErreur('Adresse e-mail invalide.'); return }
    }
    // Alerte UNIQUEMENT lorsque l'auteur demande la certification : on l'avertit au moment
    // d'envoyer, et non par un bandeau permanent. ⛔ Elle promettait une publication « sous
    // votre vrai nom » que rien ne tenait : le pseudonyme s'affiche (audit du 2026-09-11).
    if (userId && demandeValidation && !window.confirm('Ce commentaire sera soumis à la modération pour certification : s’il est retenu, il sera marqué « certifié » et placé en tête des commentaires validés. Continuer ?')) {
      return
    }
    setEnvoi(true)
    const payload: any = { id_verset: verset.id_verset, texte: texte.trim(), valide: false, reponse_a: cibleReponse?.id ?? null, demande_validation: demandeValidation }
    if (userId) { payload.user_id = userId; payload.auteur_nom = pseudoMoi ?? 'Utilisateur' }
    else { payload.auteur_nom = nom.trim(); payload.auteur_mail = mail.trim() }
    const { data, error } = await supabase.from('commentaires').insert(payload).select('id, texte, auteur_nom, created_at, user_id, valide, reponse_a, demande_validation, certifie, supprime').single()
    setEnvoi(false)
    if (!error && data) {
      // Affichage immédiat, sans recharger ni attendre la validation.
      setCommentaires(prev => [...prev, { ...data, pseudo: userId ? pseudoMoi : null, lecture: null, mecene: !!userId && estMecene, nbLikes: 0, nbDislikes: 0, monVote: null }])
      setTexte(''); setNom(''); setMail(''); setCibleReponse(null); setDemandeValidation(false)
    } else setErreur(`Erreur : ${error?.message}`)
  }

  const renderCommentaire = (c: Commentaire2, estReponse: boolean, suivie = false) => {
    const forme = formeCommentaire({ reponse: estReponse, suivie })
    const cache = !c.supprime && !c.valide && !revelees.has(c.id)
    if (cache) {
      return (
        <div key={c.id} style={{ marginLeft: forme.marginLeft, marginBottom: forme.marginBottom }}>
          <button className="commentaire-retracte" onClick={() => setRevelees(prev => new Set(prev).add(c.id))}
            style={{ width:'100%', display:'block', position:'relative', overflow:'hidden', background:'var(--cs-danger-fond)', borderStyle:'solid', borderColor:'var(--cs-danger-bord)', borderWidth: forme.borderWidth, borderRadius: forme.borderRadius, cursor:'pointer', padding:'9px 12px', textAlign:'left' }}>
            <span className="commentaire-retracte-contenu" style={{ display:'block', fontSize:'0.71875rem', color:'var(--cs-danger-fonce)', fontWeight:600 }}>
              Commentaire en attente de contrôle.
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
          <p style={EFFACE_COMMENTAIRE}>
            {c.pseudo ?? c.auteur_nom ?? 'Un utilisateur'} a supprimé un commentaire
          </p>
        ) : (
        <>
        {/* Le nom et ses badges à gauche, la date au bout de la ligne. */}
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
            {estRevision && <span style={{ ...BADGE_ETAT, color:'var(--cs-danger-fonce)', background:'rgba(var(--cs-danger-rgb),0.10)' }}>EN RÉVISION</span>}
          </div>
          <span style={DATE_COMMENTAIRE}>{dateHeureCommentaire(c.created_at)}</span>
        </div>
        {/* Le texte, À MÊME la carte : gras, italique et liens interprétés, sauts de ligne gardés. */}
        <div style={TEXTE_COMMENTAIRE}>{rendreTexteEnrichi(c.texte)}</div>
        {/* Votes, réponse, puis ce qui se range à droite. */}
        <div style={PIED_COMMENTAIRE}>
          {/* ⚠️ Un compteur À ZÉRO ne s'écrit pas : c'est l'état de presque tous les
              commentaires, et deux zéros sous chaque carte faisaient du bruit pour ne
              rien dire. Le chiffre paraît au premier vote. */}
          <div style={{ display:'flex', alignItems:'center', gap:'8px', flexShrink:0 }}>
            <button onClick={() => basculerVote(c, 1)} title="J'aime"
              style={{ display:'flex', alignItems:'center', gap:'3px', color: c.monVote === 1 ? 'var(--cs-vert)' : 'var(--cs-texte-faible)', background:'transparent', border:'none', cursor:'pointer', padding:0 }}>
              <svg width="12" height="12" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="M7 9V17H4.5C3.67 17 3 16.33 3 15.5V10.5C3 9.67 3.67 9 4.5 9H7ZM7 9L10.5 3.5C10.78 3.06 11.32 2.91 11.77 3.15C12.97 3.79 13.5 5.22 12.97 6.47L12 8.75H15.5C16.6 8.75 17.42 9.76 17.18 10.84L16.05 15.84C15.87 16.64 15.16 17.21 14.35 17.21H10C8.9 17.21 7.85 16.83 7 16.18" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
              {c.nbLikes > 0 && <span style={{ fontWeight:600, fontSize:'0.625rem' }}>{c.nbLikes}</span>}
            </button>
            <button onClick={() => basculerVote(c, -1)} title="Je n'aime pas"
              style={{ display:'flex', alignItems:'center', gap:'3px', color: c.monVote === -1 ? 'var(--cs-danger-fonce)' : 'var(--cs-texte-faible)', background:'transparent', border:'none', cursor:'pointer', padding:0 }}>
              <svg width="12" height="12" viewBox="0 0 20 20" fill="none" style={{ transform:'rotate(180deg)' }} aria-hidden="true">
                <path d="M7 9V17H4.5C3.67 17 3 16.33 3 15.5V10.5C3 9.67 3.67 9 4.5 9H7ZM7 9L10.5 3.5C10.78 3.06 11.32 2.91 11.77 3.15C12.97 3.79 13.5 5.22 12.97 6.47L12 8.75H15.5C16.6 8.75 17.42 9.76 17.18 10.84L16.05 15.84C15.87 16.64 15.16 17.21 14.35 17.21H10C8.9 17.21 7.85 16.83 7 16.18" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
              </svg>
              {c.nbDislikes > 0 && <span style={{ fontWeight:600, fontSize:'0.625rem' }}>{c.nbDislikes}</span>}
            </button>
          </div>
          {!estReponse && (
            <button onClick={() => setCibleReponse(c)} style={ACTION_COMMENTAIRE}>
              Répondre
            </button>
          )}
          {userId === c.user_id && (
            <button onClick={() => supprimerMonCommentaire(c)} title="Supprimer mon commentaire"
              style={{ ...ACTION_COMMENTAIRE, marginLeft:'auto' }}>
              Supprimer
            </button>
          )}
          {isAdmin && userId !== c.user_id && (
            <button onClick={() => supprimerCommentaire(c)} title="Supprimer ce commentaire"
              style={{ ...ACTION_COMMENTAIRE, color:'var(--cs-danger)', marginLeft:'auto' }}>
              Supprimer (admin)
            </button>
          )}
          <button onClick={() => { if (exigerCompte('signaler ce commentaire')) setCommentaireSignale(c) }} title="Signaler ce commentaire"
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
          transition: opacity 180ms ease, box-shadow 180ms ease, margin 180ms ease;
        }
        ${FEUILLE_COMMENTAIRE_RETRACTE}
      `}</style>
      {/* Liste défilante : occupe la place disponible pour que la zone de saisie
          reste épinglée au bas du volet. */}
      <div style={{ flex:1, minHeight:0, overflowY:'auto' }}>
        {loading && <MotAttente />}
        {!loading && commentaires.length === 0 && (
          <EtatVideVolet>
            {/* L'absence se dit, puis un fleuron la ferme (demande de l'auteur, 21 septembre
                2026 : les gravures d'état vide cèdent aux fleurons du registre). Même composition
                que « Aucune occurrence. » : au MILIEU de la zone, la mention au-dessus. Voir
                `FleuronDiscret`, qui dit quel fleuron ferme quel vide. */}
            <MentionVide>Aucun commentaire.</MentionVide>
            <FleuronDiscret vide="commentaires" />
          </EtatVideVolet>
        )}
        {principaux.map(c => {
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
            <button onClick={() => setCibleReponse(null)} style={{ marginLeft:'auto', fontSize:'0.78125rem', color:'var(--cs-texte-doux)', background:'none', border:'none', cursor:'pointer', padding:0 }}>✕</button>
          </div>
        )}
        <EditeurCommentaire value={texte} onChange={setTexte} placeholder={cibleReponse ? 'Votre réponse…' : 'Votre commentaire…'} minHeight={62} />
        {!userId && (
          <>
            <input aria-label="Nom" type="text" value={nom} onChange={e => setNom(e.target.value)} placeholder="Nom *"
              style={{ width:'100%', fontSize:'0.71875rem', padding:'4px 7px', borderRadius:'4px', border:`1px solid ${erreur && !nom.trim() ? 'var(--cs-danger)' : 'var(--cs-bord)'}`, background:'var(--cs-surface)', color:'var(--cs-texte-fort)', outline:'none', boxSizing:'border-box' }} />
            <input aria-label="Adresse électronique" type="email" value={mail} onChange={e => setMail(e.target.value)} placeholder="Adresse e-mail *"
              style={{ width:'100%', fontSize:'0.71875rem', padding:'4px 7px', borderRadius:'4px', border:'1px solid var(--cs-bord)', background:'var(--cs-surface)', color:'var(--cs-texte-fort)', outline:'none', boxSizing:'border-box' }} />
            <p style={{ fontSize:'0.625rem', color:'var(--cs-texte-faible)', margin:0 }}>* L’adresse e-mail ne sera pas publiée.</p>
          </>
        )}
        {erreur && <p style={{ fontSize:'0.65625rem', color:'var(--cs-danger)', margin:0 }}>{erreur}</p>}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'8px' }}>
        <label style={{ display:'flex', alignItems:'center', gap:'6px', fontSize:'0.65625rem', color:'var(--cs-texte-second)', cursor:'pointer', lineHeight:1, height:'16px' }}>
          <input type="checkbox" checked={demandeValidation} onChange={e => setDemandeValidation(e.target.checked)}
            style={{ width:'12px', height:'12px', flexShrink:0, accentColor:'var(--cs-vert)', cursor:'pointer', margin:0 }} />
          <span title="La certification met le commentaire en avant après validation et le fait remonter dans la liste.">Demander la certification</span>
        </label>
        <button onClick={envoyer} disabled={envoi}
          style={{ fontSize:'0.71875rem', padding:'4px 12px', borderRadius:'4px', border:'none', background:'var(--cs-vert-aplat)', color:'var(--cs-sur-aplat)', cursor:'pointer', fontWeight:500 }}>
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
              method: 'POST',
              headers,
              // `url_source` : la page D'OÙ l'on signale. Sans elle, la modération ne
              // savait ramener qu'au verset, jamais au commentaire visé.
              body: JSON.stringify({ id_verset: verset.id_verset, message: `Commentaire #${commentaireSignale.id} : ${msg}`, url_source: window.location.href }),
            })
            if (!res.ok) {
              const details = await res.json().catch(() => null)
              throw new Error(details?.error ?? "Erreur d'envoi du signalement")
            }
          }}
        />
      )}
    </div>
  )
}

// ── Panneau principal ─────────────────────────────────────────────────────────
export default function PanneauPatristique({
  verset, livreActif, chapitreActif,
  panelWidth = null, onWidthChange, mobile = false,
  voletMobile = null, setVoletMobile, barreMobile = true, presentation = 'drawer', sousBarres = true,
  plage, refAffichee, notesBible = null, onChoisirVerset,
}: {
  verset: Verset | null
  livreActif: string
  /** ⚠️ Reçu mais PLUS AFFICHÉ : l'en-tête ne redit plus « Genèse 13, 5 », que la
   *  colonne de lecture porte déjà (2026-09-04, voir `refFr`). La propriété reste,
   *  les appelants la donnant tous, et l'en-tête pouvant la reprendre le jour où
   *  le volet se lirait ailleurs qu'à côté du texte. */
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
   *  Bible : la page d'une péricope, qui reprend le même panneau, y gagnait 46 px de
   *  blanc en tête et 40 en pied, dans une carte forcée à un écran de haut pour deux
   *  références (audit de responsiveness, 2026-09-06). */
  sousBarres?: boolean
  // Page d'une péricope : charge l'apparat d'une PLAGE canonique exacte plutôt que d'un
  // verset ou d'un chapitre entier. `refAffichee` remplace alors l'en-tête de référence.
  plage?: { livre: string; canonDebut: string; canonFin: string | null }
  refAffichee?: string
  /** L'édition qu'on lit, pour l'onglet « Notes » de l'administrateur (demande de l'auteur,
   *  2026-09-16) ; `null` hors d'une famille éditoriale qui porte un appareil. La page
   *  la compose, parce qu'elle seule sait la manière de lire. */
  notesBible?: ContexteNotesBible | null
  /** Choisir un verset depuis le volet (onglet « Sémantique »). Sans lui, pas d'onglet :
   *  seule la page Bible le donne. */
  onChoisirVerset?: (creneau: string) => void
}) {
  type Onglet = 'patristique' | 'commentaires' | 'notes' | 'semantique'
  type SousOnglet = 'citations' | 'doctrine' | 'echos'
  const ITEMS_PAR_PAGE = 20
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
  useRendreLeFoyer(tiroirOuvert)

  // Citations = lien_1 (exactes) + lien_2 (libres) fusionnés ; Doctrine = lien_3.
  // Longueur de chaque segment chargé ou mesuré, par « id_texte|numero ». Elle sert
  // à juger une ÉLISION : voir `regrouperCitations`.
  const [longueurs, setLongueurs] = useState<Map<string, number>>(new Map())
  // Les niveaux de division des segments lus dans un écart : un titre qui le traverse
  // empêche la réunion (charte § 38.8.1).
  const [niveauxEcarts, setNiveauxEcarts] = useState<Map<string, NiveauxDuPassage>>(new Map())
  const [segmentsCitations, setSegmentsCitations] = useState<{ seg: Segment; col: string }[]>([])
  const [segmentsDoctrine, setSegmentsDoctrine] = useState<Segment[]>([])
  const [segmentsEcho, setSegmentsEcho] = useState<Segment[]>([])
  const [oeuvres, setOeuvres] = useState<Record<string, OeuvreInfo>>({})
  // Les éditions, pour citer un passage sous la sienne. ⚠️ Une panne ne ferme rien : la
  // citation retombe sur l'œuvre, comme avant.
  const [editions, setEditions] = useState<Record<string, LigneIdentiteTexte>>({})
  useEffect(() => {
    supabase.from('oeuvre_textes').select(COLONNES_IDENTITE_TEXTE).then(({ data, error }) => {
      if (error) { console.error('[volet] éditions illisibles :', error); return }
      setEditions(Object.fromEntries(((data ?? []) as unknown as LigneIdentiteTexte[]).map(ligne => [ligne.id_texte, ligne])))
    })
  }, [])
  const [loading, setLoading] = useState(false)
  // La demande dont les trois listes de segments portent la réponse (voir `cleDemande`).
  const [segmentsPour, setSegmentsPour] = useState<string | null>(null)
  const isAdminReel = useIsAdmin()
  const { modeUtilisateurStandard } = useAffichageAdmin()
  const isAdmin = isAdminReel && !modeUtilisateurStandard
  const { userId, exigerCompte } = useCompte()
  const [segSignale, setSegSignale] = useState<{ seg: Segment; titreOeuvre?: string } | null>(null)

  // ── Compteurs onglets ────────────────────────────────────────────────────────
  // ⛔ LE COMPTE EST RETENU AVEC LE VERSET AUQUEL IL APPARTIENT (14 septembre 2026) : il
  // restait sur le verset quitté le temps de la requête, puis sautait. L'attente se DÉDUIT
  // de ce témoin, et l'onglet la dit par ses lettres grecques (`LigneCompte`).
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
  // ⛔ LE COMPTE VIENT DE L'ONGLET, quand il a relevé le livre : l'inventaire ne se charge
  // qu'à la demande, et son onglet n'a donc pas de chiffre tant qu'on ne l'a pas ouvert.
  // Relever tous les livres qu'un administrateur traverse coûterait une lecture de plus à
  // chaque livre ouvert, pour un chiffre qu'il ne demande pas.
  // ⚠️ Le compte est retenu avec le LIVRE qu'il compte (`cleInventaireNotesBible`) : changer
  // de livre ne montre pas celui du précédent.
  const notesOffertes = isAdmin && notesBible !== null
  const cleNotes = notesBible ? cleInventaireNotesBible(notesBible) : null
  const [compteNotes, setCompteNotes] = useState<{ pour: string; n: number | null } | null>(null)
  const reporterCompteNotes = useCallback((pour: string, n: number | null) => { setCompteNotes({ pour, n }) }, [])

  // ── L'annotation sémantique (administrateur SEUL, demande de l'auteur, 2026-09-21) ────
  // ⛔ Les tables `semantique_*` ne se lisent que par la route d'administration ; l'onglet
  // ne paraît jamais à un lecteur, ni sur une péricope. Voir `semantiqueVerset.ts`.
  // ⚠️ Comme celui des notes, son chiffre vient de l'onglet, une fois ouvert.
  const semantiqueOfferte = isAdmin && !plage && !!livreActif && !!onChoisirVerset
  const cleSemantique = `${livreActif}|${chapitreActif}|${verset?.id_verset ?? ''}`
  const [compteSemantique, setCompteSemantique] = useState<{ pour: string; n: number | null } | null>(null)
  const reporterCompteSemantique = useCallback((pour: string, n: number | null) => { setCompteSemantique({ pour, n }) }, [])

  // ── Filtres avancés ──────────────────────────────────────────────────────────
  const [filtreVoletOuvert, setFiltreVoletOuvert] = useState(false)
  const [filtreAuteursIds, setFiltreAuteursIds] = useState<Set<string>>(new Set())
  const [filtreAuteursBlancs, setFiltreAuteursBlancs] = useState<{ id_auteur: string; nom: string }[]>([])
  const [filtreTraditions, setFiltreTraditions] = useState<Set<string>>(new Set())
  const [filtreSiecles, setFiltreSiecles] = useState<Set<number>>(new Set())
  const [filtreGenres, setFiltreGenres] = useState<Set<string>>(new Set())
  const [rechercheAuteur, setRechercheAuteur] = useState('')
  const [resultatsAuteur, setResultatsAuteur] = useState<{ id_auteur: string; nom: string }[]>([])
  const [auteurMeta, setAuteurMeta] = useState<Record<string, { traditions: string[]; siecle: number | null; date_mort: string | null }>>({})

  // Charger les infos des oeuvres une seule fois
  useEffect(() => {
    supabase.from('oeuvres')
      .select('id_oeuvre, titre, sous_titre, id_auteur, trad_auteur, editeur, collection, ville, date_publication, date_composition, genre, niveaux_corps, acces_public')
      .then(async ({ data: od }) => {
        if (!od) return
        const { data: ad } = await supabase.from('auteurs').select('id_auteur, nom, traditions, siecle, date_mort')
        const am: Record<string, string> = {}
        const meta: Record<string, { traditions: string[]; siecle: number | null; date_mort: string | null }> = {}
        ad?.forEach((a: any) => {
          am[a.id_auteur] = a.nom
          meta[a.id_auteur] = { traditions: a.traditions ?? [], siecle: a.siecle ?? null, date_mort: a.date_mort ?? null }
        })
        setAuteurMeta(meta)
        const map: Record<string, OeuvreInfo> = {}
        od.filter(estOeuvrePubliee).forEach(o => {
          map[o.id_oeuvre] = {
            titre: o.titre || o.id_oeuvre,
            sous_titre: o.sous_titre || undefined,
            id_auteur: o.id_auteur || undefined,
            auteur_nom: am[o.id_auteur] || '',
            trad_auteur: o.trad_auteur || null,
            editeur: o.editeur || null,
            collection: o.collection || undefined,
            ville: o.ville || null,
            date_publication: o.date_publication || null,
            date_composition: o.date_composition || null,
            genre: o.genre || null,
            niveaux_corps: o.niveaux_corps ?? null,
          }
        })
        setOeuvres(map)
      })
  }, [])

  // Charger les segments : ceux du verset sélectionné, ou — à défaut de sélection —
  // TOUS ceux du chapitre ouvert (le lecteur voit alors d'emblée l'apparat du chapitre).
  // ⛔ L'ATTENTE SE DÉDUIT DE LA DEMANDE, ELLE NE S'ALLUME PAS SEULE (14 septembre 2026).
  // `loading` ne passe à vrai que dans l'effet, donc APRÈS la peinture : au premier rendu
  // d'un verset neuf, les onglets montraient encore les comptes du verset quitté. La clé dit
  // ce qu'on demande, `segmentsPour` ce que les segments portent, et tant qu'elles diffèrent
  // le volet attend.
  const cleDemande = plage ? `plage|${plage.livre}|${plage.canonDebut}|${plage.canonFin}`
    : verset ? `verset|${verset.id_verset}`
    : livreActif ? `chapitre|${livreActif}|${chapitreActif}`
    : null
  const enAttente = loading || (cleDemande !== null && segmentsPour !== cleDemande)
  useEffect(() => {
    setPageItems(0)
    if (!verset && !livreActif && !plage) { setSegmentsCitations([]); setSegmentsDoctrine([]); setSegmentsEcho([]); return }
    const cle = cleDemande
    setLoading(true)
    let annule = false

    // La recherche inverse passe désormais par `liens_bibliques` : un index sur
    // `canon_id` au lieu de quatre `ilike '%…%'` sur 136 770 lignes — qui, de
    // surcroît, ramenaient GEN.1.10 à GEN.1.19 quand on demandait GEN.1.1.
    const SEG_COLS = 'id, id_oeuvre, id_texte, segment_key, segment_numero, segment_texte, ref_niv1, ref_niv2, ref_niv3, ref_niv4, notes'
    ;(async () => {
      const liens = plage
        ? await segmentsLiesAPlage(plage.livre, plage.canonDebut, plage.canonFin)
        : verset
        ? await segmentsLiesAuVerset(verset.id_verset)
        : await segmentsLiesAuChapitre(livreActif, chapitreActif)
      if (annule) return
      // UN SEGMENT PEUT RELEVER DE PLUSIEURS RUBRIQUES À LA FOIS, et il le doit :
      // chez un commentateur, le même passage est cité (type 1) PUIS commenté
      // (type 3) — c'est même le cas ordinaire, et l'arbitrage n°17 rend ce cumul
      // obligatoire. Ne garder qu'un type par segment vidait la rubrique Doctrine
      // de tout un commentaire suivi.
      const typesParSegment = new Map<number, Set<TypeLien>>()
      for (const l of liens) {
        if (!typesParSegment.has(l.segment_id)) typesParSegment.set(l.segment_id, new Set())
        typesParSegment.get(l.segment_id)!.add(l.type)
      }
      const ids = [...typesParSegment.keys()]
      if (!ids.length) {
        setSegmentsCitations([]); setSegmentsDoctrine([]); setSegmentsEcho([]); setSegmentsPour(cle); setLoading(false); return
      }
      const bruts: Segment[] = []
      for (let i = 0; i < ids.length; i += 500) {
        const { data } = await supabase.from('segments').select(SEG_COLS).in('id', ids.slice(i, i + 500))
        bruts.push(...((data ?? []) as Segment[]))
      }
      if (annule) return
      // ⛔ ON LIT TOUJOURS UNE TRADUCTION FRANÇAISE (demande de l'auteur, 2026-09-04).
      // Un lien peut désigner un texte latin — 2 468 sur 39 823, six œuvres — et le
      // volet servait alors du latin. Le segment AFFICHÉ devient sa contrepartie
      // française, identifiant compris ; seul `idLien` garde celui qui porte le lien.
      // ⚠️ Aucune requête ne part quand tout est déjà français, c'est-à-dire presque
      // toujours : voir `chargerContrepartiesFrancaises`.
      const contreparties = await chargerContrepartiesFrancaises(supabase, bruts)
      if (annule) return
      const segs: Segment[] = bruts.map(s => {
        const fr = contreparties.get(s.id)
        return fr ? { ...s, ...fr, id_oeuvre: s.id_oeuvre, idLien: s.id } : { ...s, idLien: s.id }
      })
      // Citations = types 1 et 2 réunis, comme auparavant ; doctrine = 3 ; écho = 4.
      // Un même segment peut nourrir plusieurs rubriques.
      // ⚠️ Les TYPES se cherchent par `idLien` : ils sont portés par le lien, non par
      // le segment qu'on montre.
      const citations: { seg: Segment; col: string }[] = []
      const doctrine: Segment[] = []
      const echo: Segment[] = []
      for (const s of segs) {
        const types = typesParSegment.get(s.idLien)!
        if (types.has(1)) citations.push({ seg: s, col: 'lien_1' })
        else if (types.has(2)) citations.push({ seg: s, col: 'lien_2' })
        if (types.has(3)) doctrine.push(s)
        if (types.has(4)) echo.push(s)
      }
      setSegmentsCitations(citations)
      setSegmentsDoctrine(doctrine)
      setSegmentsEcho(echo)
      setSegmentsPour(cle)
      setLoading(false)
    })()
    return () => { annule = true }
  }, [cleDemande, verset, livreActif, chapitreActif, plage?.livre, plage?.canonDebut, plage?.canonFin])

  // ── MESURER LES ÉLISIONS ────────────────────────────────────────────────────
  // Deux citations d'un même texte séparées par un ou deux paragraphes se lisent
  // d'un trait, l'écart marqué d'un « […] » — mais seulement si l'on SAIT ce qu'on
  // élide (voir `regrouperCitations`). On mesure donc une fois par chapitre, sur
  // l'ensemble des segments chargés : un filtre qui retire ensuite une citation
  // d'entre deux autres ouvre un écart dont le texte est déjà là.
  // ⚠️ La mesure ne part QUE s'il y a un écart à mesurer, et la page n'en dépend
  // jamais : sans elle, on ne réunit pas, voilà tout.
  useEffect(() => {
    const tous = [...segmentsCitations.map(c => c.seg), ...segmentsDoctrine, ...segmentsEcho]
    const connues = new Map<string, number>()
    for (const seg of tous) connues.set(`${seg.id_texte}|${seg.segment_numero}`, (seg.segment_texte ?? '').length)
    // Les écarts se cherchent sur une liste RANGÉE par texte puis par numéro : c'est
    // un sur-ensemble de toutes les adjacences que l'affichage pourra produire.
    const rangee = tous
      .map(seg => ({ idOeuvre: seg.id_oeuvre, idTexte: seg.id_texte, numero: seg.segment_numero, texte: seg.segment_texte }))
      .sort((x, y) => (x.idTexte ?? '').localeCompare(y.idTexte ?? '') || x.numero - y.numero)
    const ecarts = ecartsAMesurer(rangee, c => c)
    let annule = false
    // ⚠️ La pose de l'état vit DANS le rappel, y compris quand il n'y a rien à aller
    // lire : un `setState` dans le corps d'un effet déclenche une cascade de rendus,
    // et sans écart la boucle ci-dessous ne tourne simplement pas.
    ;(async () => {
      const textes = [...new Set(ecarts.map(e => e.idTexte))]
      const numeros = [...new Set(ecarts.flatMap(numerosDeLEcart))]
      const trouvees = new Map(connues)
      const niveaux = new Map<string, NiveauxDuPassage>()
      for (const lot of lotsPourClauseIn(numeros.map(String))) {
        const { data, error } = await supabase.from('segments')
          .select('id_texte, segment_numero, segment_texte, ref_niv1, ref_niv2, ref_niv3, ref_niv4')
          .in('id_texte', textes).in('segment_numero', lot.map(Number))
        // ⚠️ Une erreur se LIT : elle ne doit pas se lire « rien à élider », ce qui
        // ferait taire un regroupement sans qu'on sache pourquoi.
        if (error) { console.error('Volet patristique : les élisions n’ont pas pu être mesurées.', error); return }
        type Ligne = {
          id_texte: string; segment_numero: number; segment_texte: string | null
          ref_niv1: string | null; ref_niv2: string | null; ref_niv3: string | null; ref_niv4: string | null
        }
        for (const r of (data ?? []) as Ligne[]) {
          trouvees.set(`${r.id_texte}|${r.segment_numero}`, (r.segment_texte ?? '').length)
          niveaux.set(`${r.id_texte}|${r.segment_numero}`, niveauxDuSegment(r))
        }
      }
      if (!annule) { setLongueurs(trouvees); setNiveauxEcarts(niveaux) }
    })()
    return () => { annule = true }
  }, [segmentsCitations, segmentsDoctrine, segmentsEcho])

  // Recherche auteur en direct
  useEffect(() => {
    const q = rechercheAuteur.trim()
    if (!q) { setResultatsAuteur([]); return }
    const t = setTimeout(() => {
      supabase.from('auteurs').select('id_auteur, nom').ilike('nom', `%${q}%`).limit(6)
        .then(({ data }) => setResultatsAuteur((data ?? []).filter((a: any) => !filtreAuteursIds.has(a.id_auteur))))
    }, 200)
    return () => clearTimeout(t)
  }, [rechercheAuteur, filtreAuteursIds])

  const supprimerDeCitations = (id: number) =>
    setSegmentsCitations(prev => prev.filter(({ seg }) => seg.id !== id))
  const supprimerDeDoctrine = (id: number) =>
    setSegmentsDoctrine(prev => prev.filter(s => s.id !== id))
  const supprimerDeEcho = (id: number) =>
    setSegmentsEcho(prev => prev.filter(s => s.id !== id))

  // Quatre natures de lien distinctes : citation directe (type 1), paraphrase (type 2),
  // commentaire (type 3), écho thématique (type 4). La colonne du lien tranche entre les
  // deux premières (lien_1 vs lien_2).
  type Categorie = 'citation_directe' | 'paraphrase' | 'commentaire' | 'echo'
  type ItemAffiche = { seg: Segment; col: string; onSupprime: (id: number) => void; categorie: Categorie; categories: Categorie[] }
  const brut = [
    ...segmentsCitations.map(({ seg, col }) => ({ seg, col, onSupprime: supprimerDeCitations, categorie: (col === 'lien_2' ? 'paraphrase' : 'citation_directe') as Categorie })),
    ...segmentsDoctrine.map(seg => ({ seg, col: 'lien_3', onSupprime: supprimerDeDoctrine, categorie: 'commentaire' as const })),
    ...segmentsEcho.map(seg => ({ seg, col: 'lien_4', onSupprime: supprimerDeEcho, categorie: 'echo' as const })),
  ].filter(({ seg }) => Boolean(oeuvres[seg.id_oeuvre]))
  // Regroupements pour les sous-onglets : « Citations » réunit citation directe et paraphrase.
  const estCitation = (cats: Categorie[]) => cats.includes('citation_directe') || cats.includes('paraphrase')

  // La clé de classement d'un extrait : la date de l'ŒUVRE, à défaut celle de son auteur,
  // puis l'auteur, l'œuvre, et le rang du segment dans l'œuvre.
  const clefChrono = (it: ItemAffiche) => {
    const info = oeuvres[it.seg.id_oeuvre]
    const meta = info?.id_auteur ? auteurMeta[info.id_auteur] : null
    return {
      annee: anneeChronologique({
        dateComposition: info?.date_composition ?? null,
        auteurDateMort: meta?.date_mort ?? null,
        auteurSiecle: meta?.siecle != null ? String(meta.siecle) : null,
      }),
      auteur: info?.auteur_nom || it.seg.id_oeuvre,
      oeuvre: info?.titre || it.seg.id_oeuvre,
      numero: it.seg.segment_numero,
    }
  }

  // UN SEGMENT NE PARAÎT QU'UNE FOIS. Le même passage est souvent cité puis
  // commenté : il relevait alors de deux rubriques et se lisait deux fois de
  // suite, à l'identique. On le donne une seule fois, en portant toutes les
  // natures du rapport qu'il entretient avec le verset.
  //
  // ⛔ ET IL EST CLASSÉ. L'apparat n'avait aucun ordre : les segments arrivaient dans
  // celui que Postgres voulait bien rendre (le `.in('id', …)` ne porte pas de `order`),
  // et la concaténation citations → doctrine → échos faisait remonter en tête du
  // sous-onglet « Commentaires » tous les passages qui sont AUSSI des citations. Deux
  // accidents pour un seul ordre apparent. Il se lit désormais dans le temps : Didachè,
  // Tertullien, Cyprien, Basile, Chrysostome, Augustin, Jérôme, Boèce, Thomas d'Aquin.
  const itemsTous: ItemAffiche[] = (() => {
    const parSegment = new Map<number, ItemAffiche>()
    for (const it of brut) {
      const deja = parSegment.get(it.seg.id)
      if (deja) { if (!deja.categories.includes(it.categorie)) deja.categories.push(it.categorie) }
      else parSegment.set(it.seg.id, { ...it, categories: [it.categorie] })
    }
    return [...parSegment.values()].sort((a, b) => comparerChronologie(clefChrono(a), clefChrono(b)))
  })()

  // Les sous-onglets restent des filtres : un segment cité ET commenté se trouve
  // sous « Citations » comme sous « Doctrine » — c'est attendu, ce n'est pas un
  // doublon puisqu'on ne voit qu'une rubrique à la fois.
  const itemsAffiches: ItemAffiche[] =
    sousOnglet === 'citations' ? itemsTous.filter(i => estCitation(i.categories))
    : sousOnglet === 'doctrine' ? itemsTous.filter(i => i.categories.includes('commentaire'))
    : itemsTous.filter(i => i.categories.includes('echo'))

  // Compteur de l'onglet « Pères de l'Église » : les segments RÉELLEMENT affichables
  // (dédoublonnés, œuvres publiées seulement) qui sont cités OU commentés. Les échos —
  // simples allusions au thème, la plus faible des quatre natures de lien — restent hors
  // du total : ils y pesaient autant qu'une citation formelle et gonflaient le chiffre
  // sans rien annoncer. Leur sous-onglet garde évidemment son propre décompte.
  // Un segment à la fois cité et commenté ne compte toujours qu'une fois.
  const nbPatristique = itemsTous.filter(i => estCitation(i.categories) || i.categories.includes('commentaire')).length
  // Sans verset sélectionné mais avec un chapitre ouvert : mode chapitre (apparat
  // patristique de tout le chapitre). Les commentaires, eux, sont attachés à un
  // verset : leur onglet ne paraît donc qu'avec une sélection.
  const modeChapitre = !verset && (!!livreActif || !!plage)
  // ⛔ L'ONGLET AFFICHÉ SE DÉDUIT : un onglet qui n'est plus offert — les commentaires sans
  // verset, les notes hors du mode administrateur — rend la main aux Pères, sans qu'un effet
  // ait à le reposer.
  const ongletAffiche: Onglet = (onglet === 'commentaires' && !verset) || (onglet === 'notes' && !notesOffertes)
    || (onglet === 'semantique' && !semantiqueOfferte)
    ? 'patristique'
    : onglet
  const ONGLETS: { code: Onglet; label: string; count?: number | null; enAttente: boolean }[] = [
    { code: 'patristique',  label: 'Pères de l\'Église', count: nbPatristique, enAttente },
    ...(verset ? [{ code: 'commentaires' as Onglet, label: 'Commentaires', count: nbCommentairesBible, enAttente: attenteCommentaires }] : []),
    // ⛔ Réservé à l'administrateur : il montre ce que la page ne compose pas.
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

  // Reset page when sous-onglet changes
  // Ajusté pendant le rendu (doc React) : changer d'onglet ne montre plus fugitivement
  // la page courante de l'onglet précédent.
  const [sousOngletRecu, setSousOngletRecu] = useState(sousOnglet)
  if (sousOngletRecu !== sousOnglet) { setSousOngletRecu(sousOnglet); setPageItems(0) }

  // Sans verset (mode chapitre), l'onglet Commentaires n'existe pas : on revient
  // sur « Pères de l'Église » pour ne pas laisser un onglet actif fantôme.
  // ⚠️ Les commentaires SEULEMENT : l'inventaire des notes ne dépend pas du verset, et
  // désigner puis quitter un verset n'a pas à en sortir.
  useEffect(() => { if (!verset) setOnglet(o => (o === 'commentaires' ? 'patristique' : o)) }, [verset])

  const nombreFiltresActifs = filtreAuteursIds.size + filtreTraditions.size + filtreSiecles.size + filtreGenres.size

  const itemsFiltres = useMemo(() => {
    if (!nombreFiltresActifs) return itemsAffiches
    return itemsAffiches.filter(({ seg }) => {
      const info = oeuvres[seg.id_oeuvre]
      const auteurId = info?.id_auteur
      if (filtreAuteursIds.size > 0 && (!auteurId || !filtreAuteursIds.has(auteurId))) return false
      if (filtreTraditions.size > 0) {
        const meta = auteurId ? auteurMeta[auteurId] : null
        if (!meta?.traditions?.some(t => filtreTraditions.has(t))) return false
      }
      if (filtreSiecles.size > 0) {
        const meta = auteurId ? auteurMeta[auteurId] : null
        if (!meta?.siecle || !filtreSiecles.has(meta.siecle)) return false
      }
      if (filtreGenres.size > 0) {
        const genre = info?.genre
        if (!genre || !filtreGenres.has(genre)) return false
      }
      return true
    })
  }, [itemsAffiches, filtreAuteursIds, filtreTraditions, filtreSiecles, filtreGenres, oeuvres, auteurMeta, nombreFiltresActifs])

  // ── Grisage des tags indisponibles ─────────────────────────────────────────
  // Pour chaque facette (traditions / siècles / genres), on calcule ce qui resterait
  // sélectionnable compte tenu des AUTRES facettes actives — une facette ne se grise
  // jamais d'après sa propre sélection (OR interne : on doit pouvoir en cocher plusieurs).
  const passeSauf = (seg: { id_oeuvre: string }, sauf: 'traditions' | 'siecles' | 'genres') => {
    const info = oeuvres[seg.id_oeuvre]
    const auteurId = info?.id_auteur
    const meta = auteurId ? auteurMeta[auteurId] : null
    if (filtreAuteursIds.size > 0 && (!auteurId || !filtreAuteursIds.has(auteurId))) return false
    if (sauf !== 'traditions' && filtreTraditions.size > 0 && !meta?.traditions?.some(t => filtreTraditions.has(t))) return false
    if (sauf !== 'siecles' && filtreSiecles.size > 0 && (!meta?.siecle || !filtreSiecles.has(meta.siecle))) return false
    if (sauf !== 'genres' && filtreGenres.size > 0 && (!info?.genre || !filtreGenres.has(info.genre))) return false
    return true
  }
  const traditionsActives = useMemo(() => {
    const t = new Set<string>()
    itemsAffiches.forEach(({ seg }) => { if (!passeSauf(seg, 'traditions')) return; const id = oeuvres[seg.id_oeuvre]?.id_auteur; if (id) auteurMeta[id]?.traditions?.forEach(tr => t.add(tr)) })
    return t
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsAffiches, filtreAuteursIds, filtreSiecles, filtreGenres, oeuvres, auteurMeta])
  const sieclesActifs = useMemo(() => {
    const s = new Set<number>()
    itemsAffiches.forEach(({ seg }) => { if (!passeSauf(seg, 'siecles')) return; const id = oeuvres[seg.id_oeuvre]?.id_auteur; const si = id ? auteurMeta[id]?.siecle : null; if (si) s.add(si) })
    return s
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsAffiches, filtreAuteursIds, filtreTraditions, filtreGenres, oeuvres, auteurMeta])
  const genresActifs = useMemo(() => {
    const g = new Set<string>()
    itemsAffiches.forEach(({ seg }) => { if (!passeSauf(seg, 'genres')) return; const genre = oeuvres[seg.id_oeuvre]?.genre; if (genre) g.add(genre) })
    return g
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsAffiches, filtreAuteursIds, filtreTraditions, filtreSiecles, oeuvres])

  const traditionsDisponibles = useMemo(() => {
    const t = new Set<string>()
    itemsAffiches.forEach(({ seg }) => {
      const id = oeuvres[seg.id_oeuvre]?.id_auteur
      if (id) auteurMeta[id]?.traditions?.forEach(tr => t.add(tr))
    })
    return [...t].sort()
  }, [itemsAffiches, oeuvres, auteurMeta])

  const sieclesDisponibles = useMemo(() => {
    const s = new Set<number>()
    itemsAffiches.forEach(({ seg }) => {
      const id = oeuvres[seg.id_oeuvre]?.id_auteur
      const siecle = id ? auteurMeta[id]?.siecle : null
      if (siecle) s.add(siecle)
    })
    return [...s].sort((a, b) => rangSiecle(a) - rangSiecle(b))
  }, [itemsAffiches, oeuvres, auteurMeta])

  const genresDisponibles = useMemo(() => {
    const g = new Set<string>()
    itemsAffiches.forEach(({ seg }) => {
      const genre = oeuvres[seg.id_oeuvre]?.genre
      if (genre) g.add(genre)
    })
    return [...g].sort()
  }, [itemsAffiches, oeuvres])

  // REGROUPEMENTS (affichage seul, la base n'est pas modifiée) : les segments d'un MÊME
  // TEXTE qui se suivent sont réunis en UNE occurrence, et depuis le 2026-09-04 ceux que
  // sépare une courte élision le sont aussi, l'écart marqué d'un « […] ». Toute la règle
  // vit dans `regrouperCitations`, avec ses raisons et ses bornes.
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
  // ⛔ Ni d'un trait ni par une élision par-dessus un titre que la lecture de l'œuvre montre
  // (charte § 38.8.1). Les deux bouts se lisent sur les extraits, l'écart sur ce qu'on a lu.
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
  const finItems = Math.min(debutItems + ITEMS_PAR_PAGE, itemsGroupes.length)
  const itemsPage = itemsGroupes.slice(debutItems, finItems)

  // ── LES NOTES STRUCTURÉES DES EXTRAITS DE LA PAGE ──────────────────────────
  // ⛔ Le volet ne lisait que `segments.notes`, le champ hérité : les extraits dont les
  // notes ne vivent que dans les tables structurées s'y montraient sans un appel. Il
  // charge désormais celles de la PAGE montrée — une vingtaine d'extraits, pris dans des
  // œuvres différentes — et les garde : revenir à une page déjà vue ne coûte rien.
  // ⚠️ `undefined` : pas encore demandé ; `null` : la lecture a échoué, et l'extrait
  // retombe sur ses notes héritées (`composerExtrait`). Une page ne se retient pas pour
  // autant : le texte paraît tout de suite, ses appels le rejoignent.
  const [notesVolet, setNotesVolet] = useState<Map<string, NotesDuSegment | null>>(() => new Map())
  const notesDemandees = useRef<Set<string>>(new Set())
  // ⚠️ Une CHAÎNE, et non la liste : l'effet ne se rejoue que si la page change
  // d'extraits, non à chaque rendu, où `itemsPage` est un tableau neuf.
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
  // ── L'EN-TÊTE NE REDIT PLUS LA RÉFÉRENCE QU'ON LIT ──────────────────────────
  //
  // ⛔ « Genèse 13, 5 » en tête du volet de droite est parti (2026-09-04, demande de
  // l'auteur : « supprimer cette indication redondante »). Le volet commente le verset
  // qu'on vient de désigner d'un clic, à trois centimètres de là, dans une colonne qui
  // porte déjà le nom du livre, le numéro du chapitre et le verset en surbrillance :
  // la ligne ne disait rien que l'écran ne montrât.
  //
  // ⚠️ `refAffichee` RESTE, et c'est autre chose : la page d'une péricope donne au
  // volet une PLAGE canonique (« Gn 12, 1-9 ») que rien d'autre n'écrit à l'écran.
  // Une référence qu'on reçoit se montre ; une référence qu'on déduit de ce qu'on
  // affiche déjà ne se montre pas.
  const refFr = refAffichee ?? null
  // Le volet se replie partout, SAUF en onglets sur un téléphone, où les onglets du
  // haut font office de navigation et où une flèche de plus n'irait nulle part.
  const peutSeReduire = !mobile || presentation !== 'inline'

  if (!ouvert) {
    // Empilé (mobile) : barre horizontale pleine largeur en bas de la pile.
    if (mobile) {
      // En mode swipe (barreMobile=false), pas de barre fixe : le tiroir monte
      // par glissement (géré dans BibleLayout) ou via l'indice en haut de l'écran.
      if (!barreMobile) return null
      // Barre TOUJOURS visible, fixée en bas de l'écran. Fermée par défaut ;
      // au tap, le tiroir des Pères monte depuis le bas.
      return (
        <button onClick={() => setOuvert(true)} title="Ouvrir les textes patristiques"
          style={{ position: 'fixed', bottom: BANDEAU_NAV_MOBILE, left: 0, right: 0, zIndex: Z_FENETRE, width: '100%', background: 'var(--cs-fond-clair)', border: 'none', borderTop: '1px solid var(--cs-bord)', boxShadow: 'var(--cs-ombre-posee-haut)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '9px', padding: '0.6875rem 1rem' }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ transform: 'rotate(-90deg)', color: 'var(--cs-texte-doux)' }}>
            <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span style={{ fontSize: '0.8125rem', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600, color: 'var(--cs-texte-second)' }}>{LIBELLE_RAIL}</span>
        </button>
      )
    }
    // Le rail du volet replié : le composant partagé avec le volet des livres et
    // celui de la Polyglotte. ⚠️ Il nomme l'ACTION, non le contenu.
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

  return (
    <>
    {/* Empilé (mobile) : en mode ONGLETS (presentation='inline'), les Pères occupent
        toute la page sous la barre d'onglets, sans fond assombri. En mode tiroir, le
        panneau monte depuis le bas par-dessus le texte, avec un fond assombri. */}
    {mobile && presentation !== 'inline' && <div onClick={() => setOuvert(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.34)', zIndex: Z_TIROIR_VOILE }} />}
    {/* `data-visite` : le repère de la visite guidée (app/lib/visiteBibleClassique.ts).
        Le volet ENTIER : l'étape parle de ce qu'il réunit, de ses filtres et de son
        onglet de commentaires, et les trois n'ont pas de boîte commune plus étroite. */}
    <div ref={refPanel} data-visite="peres" style={mobile
      ? (presentation === 'inline'
        ? { width:'100%', background:'var(--cs-surface)', display:'flex', flexDirection:'column', ...(sousBarres ? { paddingTop:'2.875rem', minHeight:`calc(100dvh - ${HAUTEUR_NAVBAR})`, paddingBottom:BANDEAU_NAV_MOBILE } : {}) }
        : { position:'fixed', bottom:BANDEAU_NAV_MOBILE, left:0, right:0, zIndex: Z_TIROIR, background:'var(--cs-surface)', borderTop:'1px solid var(--cs-bord)', display:'flex', flexDirection:'column', maxHeight:`calc(100dvh - ${HAUTEUR_NAVBAR} - 2.5rem - ${BANDEAU_NAV_MOBILE})`, minHeight:0, boxShadow:'var(--cs-ombre-modale-haut)' })
      : { width: panelWidth == null ? 'clamp(260px, 20vw, 460px)' : panelWidth + 'px', flexShrink:0, background:'var(--cs-surface)', borderLeft:'1px solid var(--cs-bord)', display:'flex', flexDirection:'column', height:'100%', minHeight:0, position:'relative' }}>
      {/* Tag de filtre : un fantôme en gras (::after) fige la largeur, pour que la
          sélection (texte mis en gras) ne repousse pas les tags voisins. */}
      <style>{`
        .pp-tag { display: inline-grid; align-items: center; justify-items: center; }
        .pp-tag > span { grid-area: 1 / 1; }
        .pp-tag::after { content: attr(data-label); grid-area: 1 / 1; font-weight: 600; visibility: hidden; white-space: nowrap; }
        ${FEUILLE_CARTE_VOLET}
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

      {/* ⛔ L'EN-TÊTE NE PORTE PLUS LA FLÈCHE, et il ne paraît donc plus du tout
          aujourd'hui (demande de l'auteur, 2026-09-10 : « la ligne tout en haut, avec la
          flèche pour rabattre le volet, n'est pas nécessaire ; on peut très bien placer
          cette flèche dans la ligne d'au-dessous »).
          ⚠️ Aucun appelant ne passe plus `refAffichee` depuis le 2026-09-08 : cette ligne
          ne pouvait donc porter QUE la flèche, c'est-à-dire une bande de 38 px et son
          filet pour un chevron de quatorze pixels. La flèche descend dans la barre
          d'onglets, qui est la première ligne que le volet porte vraiment.
          ⚠️ Le bloc RESTE, prêt à reprendre la référence le jour où le volet se lirait
          ailleurs qu'à côté du texte — c'est la raison pour laquelle la propriété a été
          gardée. La flèche, elle, ne reviendra pas ici : elle a désormais sa place. */}
      {refFr && (
      <div style={{ position:'relative', borderBottom:'1px solid var(--cs-bord)', minHeight:'38px', display:'flex', alignItems:'center', justifyContent:'center', padding:'6px 36px' }}>
        <h2 style={{ fontFamily:"var(--font-source-serif), Georgia, serif", fontSize:'0.9375rem', fontWeight:500, color:'var(--cs-encre)', margin:0, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', textAlign:'center' }}>
          {refFr}
        </h2>
      </div>
      )}

      {verset || modeChapitre ? (
        <div style={{ display:'flex', flexDirection:'column', flex:1, minHeight:0 }}>

          {/* Onglets pleine largeur, la flèche de repli au bord gauche.
              ⛔ LE CHEVRON EST HORS DU FLUX (décision de l'auteur, 2026-09-20 : « ignorer
              la flèche dans la logique de centrage, afin que les deux lignes et les trois
              onglets soient alignés »). Posé en absolu contre le bord gauche, il ne pousse
              plus rien : les onglets se partagent TOUTE la largeur du volet, comme les
              sous-onglets Citations / Commentaires / Échos dessous, qui la prennent eux
              aussi entière. Les deux rangées tombent alors sur les mêmes tiers. La cale
              de droite, qui ne répondait qu'au chevron, est partie avec lui. */}
          {/* ⛔ LA BARRE PORTE SON FOND, PAS L'ONGLET RETENU (demande de l'auteur,
              2026-09-10 : « il faut que la ligne soit de couleur uniforme, légèrement
              verte »). L'aplat vivait sur le seul bouton actif : la flèche de repli et la
              cale restaient au sol du volet, et la ligne se lisait verte au milieu et neutre
              aux deux bouts. La teinte est la MÊME — c'est celle que l'auteur a vue et
              nommée — elle a seulement changé de porteur : rien de ce qui était déjà
              teinté ne fonce, les deux bouts neutres se remplissent.
              ⚠️ L'ONGLET RETENU SE DISTINGUE ALORS COMME DANS LE MODÈLE PARTAGÉ du site
              (`.cs-onglet`, globals.css), qui ne pose AUCUN fond : par son trait vert, sa
              graisse 600 et son encre. Trois axes, là où la charte en demande deux. */}
          <div style={{ position:'relative', display:'flex', alignItems:'stretch', borderBottom:'1px solid var(--cs-bord)', background:'rgba(var(--cs-vert-rgb),0.04)' }}>
            {/* ⛔ ELLE NE DÉPEND PAS DE LA PRÉSENTATION MOBILE, et c'est ce qui l'avait fait
                disparaître du bureau (demande de l'auteur, 2026-09-04). `presentation` dit
                comment le volet s'empile sur un TÉLÉPHONE, où les onglets du haut font
                office de navigation ; mais la page Bible passe « inline » en toutes
                circonstances, si bien que le bureau perdait un contrôle pour une raison qui
                ne le regarde pas.
                ⚠️ Un réglage de disposition MOBILE ne décide jamais d'un contrôle de BUREAU. */}
            {peutSeReduire && (
              <button onClick={() => setOuvert(false)} title="Réduire le volet" aria-label="Réduire le volet"
                className="cs-volet-reduire"
                style={{ position:'absolute', left:0, top:0, bottom:0, zIndex:1, width:'1.75rem', background:'none', border:'none', cursor:'pointer', padding:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
                <IconeChevron dir="right" size={14} strokeWidth={1.5} />
              </button>
            )}
            {ONGLETS.map(t => (
              <button key={t.code} onClick={() => setOnglet(t.code)}
                style={{
                  flex:1, padding:'8px 6px 7px', border:'none',
                  borderBottom: ongletAffiche === t.code ? '2px solid var(--cs-vert)' : '2px solid transparent',
                  cursor:'pointer',
                  background:'none',
                  color: ongletAffiche === t.code ? 'var(--cs-encre)' : 'var(--cs-texte-gris)',
                  fontFamily: 'var(--font-source-sans), Arial, sans-serif',
                  transition:'color 0.12s, border-color 0.12s',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px',
                }}>
                {/* Libellé + compteur forment un groupe centré verticalement dans la hauteur
                    du bouton (justifyContent: center ci-dessus) : chaque bloc (« Pères de
                    l'Église » + compteur, « Commentaires » + compteur) est ainsi centré, sans
                    réservation basse qui le ferait descendre. */}
                <span style={{ fontSize:'0.65625rem', letterSpacing:'0.08em', textTransform:'uppercase', fontWeight: ongletAffiche === t.code ? 600 : 400, textAlign: 'center', lineHeight: 1.15 }}>{t.label}</span>
                {/* ⛔ Une ligne de compte, toujours, et d'une hauteur écrite : voir `LigneCompte`. */}
                <LigneCompte enAttente={t.enAttente} compte={t.count} videDit="∅"
                  style={{ fontSize: '0.625rem', lineHeight: 1, height: '1em', fontWeight: 500, color: ongletAffiche === t.code ? 'var(--cs-vert)' : 'var(--cs-texte-faible)' }} />
              </button>
            ))}
          </div>

          {/* Contenu scrollable (sauf onglets commentaires et notes : leur liste défile en
              interne, pour épingler la saisie ou les filtres en tête du volet). */}
          <div style={(ongletAffiche === 'commentaires' && verset) || ongletAffiche === 'notes'
            ? { flex:1, minHeight:0, overflow:'hidden', padding:'0 12px', display:'flex', flexDirection:'column' }
            : { overflowY:'auto', flex:1, padding:'0 12px', display:'flex', flexDirection:'column' }}>
            {ongletAffiche === 'commentaires' && verset ? (
              <OngletCommentaires verset={verset} userId={userId} isAdmin={isAdmin} onCount={reporterCompteCommentaires} />
            ) : ongletAffiche === 'notes' && notesBible ? (
              // ⚠️ Sur un téléphone, le volet est un tiroir qui couvre le texte : il se
              // referme avant qu'on montre la note.
              <OngletNotesBible contexte={notesBible} onCompte={reporterCompteNotes}
                onAvantOuvrir={mobile ? () => setOuvert(false) : undefined} />
            ) : ongletAffiche === 'semantique' && onChoisirVerset ? (
              <OngletSemantique livre={livreActif} chapitre={chapitreActif} verset={verset?.id_verset ?? null}
                onChoisirVerset={onChoisirVerset} onCompte={reporterCompteSemantique} />
            ) : (
              <>
                {/* Sous-onglets Citations / Doctrine / Échos */}
                {(() => {
                  const nbCitations = itemsTous.filter(i => estCitation(i.categories)).length
                  const nbDoctrine = itemsTous.filter(i => i.categories.includes('commentaire')).length
                  const nbEchos = itemsTous.filter(i => i.categories.includes('echo')).length
                  const subTabs: [SousOnglet, string, number][] = [
                    ['citations', 'Citations', nbCitations],
                    ['doctrine', 'Commentaires', nbDoctrine],
                    ['echos', 'Échos', nbEchos],
                  ]
                  return (
                    <div style={{ display: 'flex', borderBottom: '1px solid var(--cs-fond-doux)', margin: '6px -12px 0', padding: 0 }}>
                      {subTabs.map(([key, label, nb]) => (
                        <button key={key} onClick={() => setSousOnglet(key)}
                          style={{
                            flex: 1, background: 'none', border: 'none',
                            borderBottom: sousOnglet === key ? '2px solid var(--cs-vert)' : '2px solid transparent',
                            padding: '5px 2px 4px', cursor: 'pointer',
                            color: sousOnglet === key ? 'var(--cs-vert)' : 'var(--cs-texte-doux)',
                            fontSize: '0.625rem', fontWeight: sousOnglet === key ? 600 : 400,
                            letterSpacing: '0.04em', lineHeight: 1.2,
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px',
                          }}>
                          <span>{label}</span>
                          <LigneCompte enAttente={enAttente} compte={nb} videDit="∅"
                            style={{ fontSize: '0.5625rem', lineHeight: 1.2, height: '1.2em', color: sousOnglet === key ? 'var(--cs-vert)' : 'var(--cs-texte-faible)' }} />
                        </button>
                      ))}
                    </div>
                  )
                })()}

                {/* Bouton filtres */}
                <div style={{ display: 'flex', alignItems: 'center', padding: '8px 0 0' }}>
                  <button onClick={() => setFiltreVoletOuvert(o => !o)} aria-expanded={filtreVoletOuvert} style={{
                    position: 'relative',
                    display: 'flex', width: '100%', justifyContent: 'center', alignItems: 'center', gap: '4px',
                    fontSize: '0.65625rem', padding: '5px 9px', borderRadius: '8px', cursor: 'pointer',
                    // L'or dit l'outil, ouvert ou non ; le filet franc et le lavis disent qu'il agit.
                    border: `1px solid ${filtreVoletOuvert || nombreFiltresActifs > 0 ? 'var(--cs-or)' : OR_FILET}`,
                    background: filtreVoletOuvert || nombreFiltresActifs > 0 ? OR_LAVIS : 'var(--cs-surface)',
                    color: OR_ENCRE,
                    fontWeight: 500,
                  }}>
                    <svg width="10" height="10" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                      <path d="M2 4h10M4 7h6M6 10h2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                    </svg>
                    Filtres
                    {/* Badge en ABSOLU : « Filtres » reste centré, la barre ne s'élargit pas. */}
                    {nombreFiltresActifs > 0 && (
                      <span style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: OR_ENCRE, color: 'var(--cs-surface)', borderRadius: '8px', fontSize: '0.5625rem', padding: '0 4px', lineHeight: '14px', fontWeight: 700 }}>
                        {nombreFiltresActifs}
                      </span>
                    )}
                  </button>
                </div>

                {/* Volet filtres dépliant */}
                {filtreVoletOuvert && (
                  <div style={{ margin: '6px 0 2px', padding: '8px 10px', background: OR_LAVIS, border: `1px solid ${OR_FILET}`, borderRadius: '8px' }}>

                    {/* Recherche auteur */}
                    <p style={{ ...STYLE_RUBRIQUE_FILTRE, margin: '0 0 5px' }}>Auteurs</p>
                    <div style={{ position: 'relative', marginBottom: resultatsAuteur.length ? '0' : '4px' }}>
                      <input aria-label="Chercher un auteur"
                        type="text"
                        value={rechercheAuteur}
                        onChange={e => setRechercheAuteur(e.target.value)}
                        placeholder="Chercher un auteur…"
                        style={{ width: '100%', fontSize: '0.75rem', padding: '4px 7px', borderRadius: '4px', border: '1px solid var(--cs-or-doux)', background: 'var(--cs-surface)', color: 'var(--cs-encre)', boxSizing: 'border-box', outline: 'none' }}
                      />
                      {resultatsAuteur.length > 0 && (
                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--cs-surface)', border: '1px solid var(--cs-or-doux)', borderTop: 'none', borderRadius: '0 0 4px 4px', zIndex: 20, boxShadow: 'var(--cs-ombre-nette)' }}>
                          {resultatsAuteur.map(a => (
                            <button key={a.id_auteur} onClick={() => {
                              setFiltreAuteursIds(prev => new Set([...prev, a.id_auteur]))
                              setFiltreAuteursBlancs(prev => prev.find(x => x.id_auteur === a.id_auteur) ? prev : [...prev, a])
                              setRechercheAuteur('')
                              setResultatsAuteur([])
                              setPageItems(0)
                            }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '5px 8px', fontSize: '0.75rem', color: 'var(--cs-encre)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}
                              onMouseEnter={e => (e.currentTarget.style.background = OR_SURVOL)}
                              onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                              {a.nom}
                              <span style={{ fontSize: '0.84375rem', color: OR_ENCRE, lineHeight: 1 }}>+</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {filtreAuteursBlancs.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', marginTop: '5px' }}>
                        {filtreAuteursBlancs.map(a => (
                          <span key={a.id_auteur} style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '0.625rem', padding: '1px 5px 1px 7px', background: OR_SELECTION, color: OR_ENCRE, border: '1px solid var(--cs-or)', borderRadius: '8px', fontWeight: 500 }}>
                            {a.nom}
                            <button onClick={() => {
                              setFiltreAuteursIds(prev => { const n = new Set(prev); n.delete(a.id_auteur); return n })
                              setFiltreAuteursBlancs(prev => prev.filter(x => x.id_auteur !== a.id_auteur))
                              setPageItems(0)
                            }} aria-label={`Retirer ${a.nom} des filtres`} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: OR_ENCRE, fontSize: '0.78125rem', lineHeight: 1, display: 'flex', alignItems: 'center' }}>×</button>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Traditions */}
                    {(traditionsDisponibles.some(t => !filtreTraditions.has(t)) || filtreTraditions.size > 0) && (
                      <GroupeTags titre="Tradition">
                        {/* Liste stable : chaque tag bascule sur place (aucune croix, aucun
                            réagencement). Sélectionné = vert ; indisponible sous le tri = grisé.
                            Le poids du texte va sur le <span> ; la largeur reste figée (pp-tag). */}
                        {traditionsDisponibles.map(t => {
                          const sel = filtreTraditions.has(t)
                          const dispo = sel || traditionsActives.has(t)
                          return (
                            <button key={t} className="pp-tag" data-label={t} disabled={!dispo}
                              onClick={() => { setFiltreTraditions(prev => { const n = new Set(prev); if (n.has(t)) n.delete(t); else n.add(t); return n }); setPageItems(0) }}
                              style={stylePastilleFiltre(sel, dispo)}>
                              <span style={{ fontWeight: sel ? 600 : 400 }}>{t}</span>
                            </button>
                          )
                        })}
                      </GroupeTags>
                    )}

                    {/* Genre */}
                    {(genresDisponibles.some(g => !filtreGenres.has(g)) || filtreGenres.size > 0) && (
                      <GroupeTags titre="Genre">
                        {genresDisponibles.map(g => {
                          const sel = filtreGenres.has(g)
                          const dispo = sel || genresActifs.has(g)
                          return (
                            <button key={g} className="pp-tag" data-label={g} disabled={!dispo}
                              onClick={() => { setFiltreGenres(prev => { const n = new Set(prev); if (n.has(g)) n.delete(g); else n.add(g); return n }); setPageItems(0) }}
                              style={stylePastilleFiltre(sel, dispo)}>
                              <span style={{ fontWeight: sel ? 600 : 400 }}>{g}</span>
                            </button>
                          )
                        })}
                      </GroupeTags>
                    )}

                    {/* Période (siècles) — déjà triés par ordre chronologique croissant. */}
                    {(sieclesDisponibles.some(s => !filtreSiecles.has(s)) || filtreSiecles.size > 0) && (
                      <GroupeTags titre="Période">
                        {sieclesDisponibles.map(s => {
                          const sel = filtreSiecles.has(s)
                          const dispo = sel || sieclesActifs.has(s)
                          const lbl = labelSiecle(s)
                          return (
                            <button key={s} className="pp-tag" data-label={lbl} disabled={!dispo}
                              onClick={() => { setFiltreSiecles(prev => { const n = new Set(prev); if (n.has(s)) n.delete(s); else n.add(s); return n }); setPageItems(0) }}
                              style={stylePastilleFiltre(sel, dispo)}>
                              <span style={{ fontWeight: sel ? 600 : 400 }}>{rendreSiecle(lbl)}</span>
                            </button>
                          )
                        })}
                      </GroupeTags>
                    )}

                    {/* Tout effacer */}
                    {nombreFiltresActifs > 0 && (
                      <button onClick={() => {
                        setFiltreAuteursIds(new Set()); setFiltreAuteursBlancs([])
                        setFiltreTraditions(new Set()); setFiltreSiecles(new Set()); setFiltreGenres(new Set())
                        setPageItems(0)
                      }} className="cs-bouton-lien cs-bouton-lien--or" style={{ marginTop: '8px' }}>
                        Tout effacer
                      </button>
                    )}
                  </div>
                )}

                {/* ⛔ LES RÉFÉRENCES DU PASSAGE QU'ON QUITTE S'EFFACENT AUSSITÔT (demande de
                    l'auteur, 2026-09-04). Le volet gardait la liste précédente sous un mot
                    « Chargement… » : on lisait donc, une seconde durant, l'apparat d'un verset
                    qu'on venait de quitter, et rien ne disait que ce n'était plus le bon.
                    ⚠️ Elle s'efface en fondu, et sa PLACE reste : la retirer du flux ferait
                    sauter le volet à chaque clic, puis sauter de nouveau à l'arrivée. */}
                <MarqueAttenteVolet enAttente={enAttente} />
                {/* ⛔ PLUS DE CARAPACE SOUS « AUCUNE OCCURRENCE », ET LA MENTION SE TIENT AU
                    CENTRE (décision de l'auteur, 14 septembre 2026 : « supprimer le dessin de
                    tortue ; conserver “Aucune occurrence” au centre »). La planche prenait la
                    colonne pour dire ce qu'une ligne dit, et elle ne se posait qu'à moitié : elle
                    suivait les sous-onglets dans le flux, faute d'une hauteur où se centrer.
                    ⚠️ La zone défilante est donc passée en COLONNE FLEXIBLE, et ce bloc y prend la
                    hauteur qui reste (`flex: 1 0 auto`) : il grandit sans jamais rétrécir, si bien
                    qu'une longue liste d'extraits défile comme avant. La mention d'un filtre qui
                    vide la liste prend la même place.
                    ⚠️ Son encre monte à `--cs-texte-second` : seule dans la colonne, elle porte son
                    information seule : 5,74 au Clair et 9,27 en Cuir, quand `--cs-texte-doux` ne
                    rendait que 2,98 sur la surface du volet.
                    ⚠️ La carapace reste aux deux volets de COMMENTAIRES, où elle dit une autre
                    absence.
                    ⚠️ UN PETIT FLEURON SUIT LA MENTION depuis le soir même (demande de l'auteur :
                    « ajoute un petit fleuron parmi la liste des fleurons ; le plus élégant,
                    discret »). Ce n'est pas la carapace qui revient : elle illustrait l'absence,
                    le fleuron ne fait que fermer la ligne. ⛔ Il ne suit pas « Aucun résultat
                    pour ces filtres », qui appelle un geste plutôt qu'un repos. */}
                <div style={{ opacity: enAttente ? 0 : 1, transition: 'opacity .16s ease', flex: '1 0 auto', display: 'flex', flexDirection: 'column' }}>
                {!enAttente && itemsFiltres.length === 0 && (
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
                  // Occurrence réunie : les textes des segments consécutifs mis à la suite en un
                  // seul paragraphe. Métadonnées et liens = premier segment.
                  const segFusionne = groupe.length === 1
                    ? premier.seg
                    : { ...premier.seg, segment_texte: texteDuGroupe(groupe, cleCitation), notes: groupe.map(g => g.seg.notes).filter(Boolean).join('\n') || null }
                  // Ce qu'on LIT : la capitale, les appels structurés projetés, et les notes
                  // que ces appels ouvrent (voir `composerExtrait`).
                  const extrait = composerExtrait(groupe, notesVolet)
                  return (
                    <SegmentCard
                      key={groupe.map(g => g.seg.id).join('_')} s={segFusionne} info={oeuvres[premier.seg.id_oeuvre]}
                      edition={editions[premier.seg.id_texte]}
                      texteAffichage={extrait.texte} notes={extrait.notes} notesEnAttente={extrait.enAttente}
                      userId={userId} isAdmin={isAdmin}
                      colonneLien={premier.col}
                      onSignaler={(s, titreOeuvre) => { if (exigerCompte('signaler une erreur')) setSegSignale({ seg: s, titreOeuvre }) }} onSupprimeLien={premier.onSupprime}
                    />
                  )
                })}
                </div>
                )}
                </div>
              </>
            )}
          </div>

          {/* Pagination — fixée en pied de panneau, hors zone scrollable */}
          {ongletAffiche === 'patristique' && !enAttente && nbPagesItems > 1 && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:'4px', padding:'8px 0 10px', borderTop:'1px solid var(--cs-bord-clair)', background:'var(--cs-surface)', flexShrink:0 }}>
              <button onClick={() => setPageItems(Math.max(pageCouranteItems - 1, 0))} disabled={pageCouranteItems === 0}
                title="Page précédente"
                style={{ fontSize:'1.25rem', lineHeight:1, padding:'0 6px', border:'none', background:'none', color: pageCouranteItems === 0 ? 'var(--cs-bord)' : 'var(--cs-texte-second)', cursor: pageCouranteItems === 0 ? 'default' : 'pointer' }}>
                ‹
              </button>
              <span style={{ fontSize:'0.65625rem', color:'var(--cs-texte-doux)', whiteSpace:'nowrap', padding:'0 2px' }}>
                {debutItems + 1}–{finItems} / {itemsGroupes.length}{nombreFiltresActifs > 0 ? ` (${itemsAffiches.length})` : ''}
              </span>
              <button onClick={() => setPageItems(Math.min(pageCouranteItems + 1, nbPagesItems - 1))} disabled={pageCouranteItems >= nbPagesItems - 1}
                title="Page suivante"
                style={{ fontSize:'1.25rem', lineHeight:1, padding:'0 6px', border:'none', background:'none', color: pageCouranteItems >= nbPagesItems - 1 ? 'var(--cs-bord)' : 'var(--cs-texte-second)', cursor: pageCouranteItems >= nbPagesItems - 1 ? 'default' : 'pointer' }}>
                ›
              </button>
            </div>
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
                if (!res.ok) { const d = await res.json().catch(() => null); throw new Error(d?.error ?? "Erreur d'envoi") }
              }}
            />
          )}
        </div>
      ) : (
        /* ⚠️ CETTE BRANCHE N'EST ATTEINTE PAR AUCUN APPELANT, et c'est la seule raison
           pour laquelle elle ne porte pas la flèche de repli : `modeChapitre` exige
           `livreActif` ou `plage`, et les deux surfaces qui emploient ce volet — la page
           Bible et la page d'une péricope — passent toutes deux `livreActif`, qui est
           requis et toujours renseigné.
           ⛔ Un appelant qui ne le passerait pas laisserait le lecteur sans aucun moyen de
           replier le volet : il faudrait alors lui donner la flèche AU MÊME ENDROIT, en
           haut à gauche, et non ailleurs — un contrôle qui change de place selon ce que le
           volet montre ne s'apprend jamais (défaut déjà payé sur `NavLivres`). */
        // ⛔ L'invite se tient où se tiennent tous les états vides des volets (2026-09-21) :
        // au tiers supérieur, dans la voix des mentions. Les filets pointés et le glyphe ❧
        // sont retirés : un fleuron du site est une planche, et une invite n'en prend pas.
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '0 24px' }}>
          <EtatVideVolet>
            <MentionVide>Cliquez sur un verset pour voir les textes des Pères de l’Église associés.</MentionVide>
          </EtatVideVolet>
        </div>
      )}
    </div>
    </>
  )
}


