'use client'
import { ABREV_FR } from '@/app/lib/bible'
import { hydraterLiensHerites } from '@/app/lib/liens'
import { codesTraductionsLecture } from '@/app/lib/traductions'
import { projeterAppelsNotesStructurees } from '@/app/lib/appelsNotesStructurees'

import { useState, useEffect, useRef, useMemo, useCallback, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import IconeCrayon from '@/app/components/IconeCrayon'
import { createPortal } from 'react-dom'
import { parseNotes } from '@/app/lib/notes'
import { supabase } from "@/app/lib/supabase"
import type { SegData, GroupeData, Props, EditionCible, OeuvreResumee, NoteAffichee } from './oeuvreTypes'
import { rendreTexteEnrichi, texteSansEnrichissement, normaliserEspaces, normaliserEspacesOriginal } from './texteEnrichi'
import { bornerGuillemets } from '@/app/lib/guillemets'
import { effacerTiretsDeBordure } from '@/app/lib/tirets'
import { positionCellule } from '@/app/lib/celluleActions'
import { SELECT_SEGMENT, NATURES_CORPS } from '@/app/lib/oeuvreSelects'
import { niveauxAlinea, retraitVers, ouvreStrophe, mesureAlinea, marqueStrophe, fusionnerBlocs, RETRAIT_SUITE } from '@/app/lib/compositionVers'
import { LABEL_VOLET, BTN_VOLET } from '@/app/lib/stylesVoletLecture'
import { cesurerLatin } from '@/app/lib/cesuresLatines'
import { cesurerGrec, codeLangue } from '@/app/lib/grec'
import { detecterCitationSortie } from '@/app/lib/citationSortie'
import { preparerTitreColophon, titreSansAppelsDeNote, rendreTexteAvecNotes, rendreTitreColophonAvecNotes, notesPourTexte } from './appelNote'
import { chargerAuteursParOeuvre, separateurAuteurs } from '@/app/lib/auteursOeuvre'
import { libelleVersionComplet } from './versionTextuelle'
import { nettoyerFin } from '@/app/lib/ponctuation'
import ModaleEditionAdmin from './ModaleEditionAdmin'
import PageTitre, { libelleTrad, formaterEditeur } from './PageTitre'
import { useEditeursCharges } from '@/app/lib/editeurs'
import ModaleAuteur from '@/app/components/ModaleAuteur'
import ApercuAuteur from '@/app/components/ApercuAuteur'
import { FeuilleVigne } from './Ornements'
import EtoileFavori from '@/app/components/EtoileFavori'
import { useFavoris } from '@/app/lib/useFavoris'
import { refFavoriOriginal } from '@/app/lib/refsFavoris'
import OngletCommentaires from './OngletCommentaires'
import { BTN_STYLE, BoutonEnregistrerSegment, BoutonCopieSegment, BoutonSignalerSegment } from './BoutonsSegment'
import { useEstMobile } from '@/app/lib/useEstMobile'
import { COMPOSITION_INTITULE, sansPointFinal, cleTriTitre } from '@/app/lib/titres'
import { enregistrerOeuvreRecente } from '@/app/lib/oeuvresRecentes'
import { HAUTEUR_NAVBAR } from '@/app/lib/mesures'
import { BoutonCopieVerset, BoutonEnregistrerVerset, BoutonSignalerVerset } from './BoutonsVerset'
import AssocierVerset from './AssocierVerset'
import { useAffichageAdmin } from '@/app/lib/contexteAffichageAdmin'
import { useCompte } from '@/app/lib/contexteCompte'
import { insererSignalement } from './signalements'
import ModalLienBiblique, { libelleTypeLien, type ChampLienBiblique, type VersetLienBiblique } from '@/app/components/ModalLienBiblique'
import { estOeuvrePubliee } from '@/app/lib/oeuvresPublication'
import { formaterDateHistorique } from '@/app/lib/datesHistoriques'
import { allerAAncre, allerAElement } from '@/app/lib/defilement'
import ComparaisonTraductions from './ComparaisonTraductions'
import {
  choisirAlignement,
  comparaisonDisponible,
  divisionVoisine,
  divisionPresente,
  libelleLivreComparaison,
  libelleDivisionComparaison,
  type DivisionAlignee,
} from './comparaisonTraductionsUtils'

const CHARS_PAR_PAGE = 15000

// Même table que celle utilisée côté serveur (page.tsx) pour l'affichage
// des références bibliques en français — doit rester identique aux deux endroits.

function detailsRefBiblique(ref: string): { label: string; livre: string; chapitre: string; verset: string } {
  const p = ref.trim().split(' ')
  if (p.length < 2) return { label: ref, livre: '', chapitre: '', verset: '' }
  const cv = p[1].split(':')
  const label = cv[1] ? `${ABREV_FR[p[0]] ?? p[0]} ${cv[0]}, ${cv[1]}` : `${ABREV_FR[p[0]] ?? p[0]} ${cv[0]}`
  return { label, livre: p[0], chapitre: cv[0] || '', verset: cv[1] || '' }
}

// REGROUPEMENTS (affichage seul, la base n'est pas modifiée) : quand un segment cite
// plusieurs versets qui se suivent dans le même chapitre (verset n, n+1, n+2…), on les réunit
// en UNE occurrence — un seul paragraphe, à la suite. On regroupe les entrées adjacentes de la
// liste dont le numéro de verset s'enchaîne sans trou.
function regrouperVersetsConsecutifs<T extends { livre: string; chapitre: string; verset: string }>(versets: T[]): T[][] {
  const groupes: T[][] = []
  for (const v of versets) {
    const dernierGroupe = groupes[groupes.length - 1]
    const prec = dernierGroupe?.[dernierGroupe.length - 1]
    const nPrec = prec ? Number(prec.verset) : NaN
    const nCur = Number(v.verset)
    if (prec && prec.livre === v.livre && prec.chapitre === v.chapitre
        && Number.isFinite(nPrec) && Number.isFinite(nCur) && nCur === nPrec + 1) {
      dernierGroupe.push(v)
    } else {
      groupes.push([v])
    }
  }
  return groupes
}

// Un verset cité PUIS commenté est visé par deux liens du même segment (types 1
// et 3, cumul rendu obligatoire par l'arbitrage n°17). Il ne doit paraître qu'une
// fois dans le volet, en portant les deux natures.
const NATURE_LIEN = ['citation', 'reprise', 'doctrine', 'écho'] as const

function extraireVersetsAvecNature(s: any): { id: string; natures: string[] }[] {
  const ordre: string[] = []
  const natures = new Map<string, string[]>()
  ;[s.lien_1, s.lien_2, s.lien_3, s.lien_4].forEach((col: any, i: number) => {
    String(col ?? '').split(';').map((v: string) => v.trim()).filter(Boolean).forEach((vid: string) => {
      if (!natures.has(vid)) { natures.set(vid, []); ordre.push(vid) }
      const n = NATURE_LIEN[i]
      if (!natures.get(vid)!.includes(n)) natures.get(vid)!.push(n)
    })
  })
  return ordre.map(id => ({ id, natures: natures.get(id)! }))
}

function extraireVersetsSegment(s: any): string[] {
  return extraireVersetsAvecNature(s).map(v => v.id)
}

function segmentAffichable(s: any) {
  if (s.nature === 'separateur') return false
  return Boolean((s.segment_texte ?? '').trim() || extraireVersetsSegment(s).length > 0)
}

const SEUIL_TITRE_COLOPHON = 86

// Numéro de segment en exposant. Une seule définition : le corps et l'apparat le
// composaient à l'identique.
const STYLE_NUMERO_SEGMENT: React.CSSProperties = { fontSize: '0.50rem', color: 'var(--cs-texte-faible)', userSelect: 'none', marginRight: '2px', lineHeight: 1 }

// Appels de note (info-bulle, formes selon le contexte) et outils de titre :
// voir ./appelNote — partagés avec la page de titre.

const TRADUCTIONS_FALLBACK = [
  { code: 'TR0001',    label: 'Bible de Sacy' },
  { code: 'TR0002',     label: 'Bible Segond' },
  { code: 'TR0003', label: 'Bible Crampon' },
  { code: 'TR0004', label: 'Vulgate' },
]

// Extrait le préfixe de numérotation divergente du texte d'un verset.
// Format stocké en DB : "(Psaumes 9, 22 dans la Vulgate) ut quid Domine…"
// Retourne { note, corps } — note est null si le texte est sans préfixe.
function extraireNoteVerset(texte: string): { note: string | null; corps: string } {
  const m = texte.match(/^\(([^)]+)\)\s+(.+)$/s)
  if (m) return { note: m[1], corps: m[2] }
  return { note: null, corps: texte }
}

let _codesTraductionsCache: PromiseLike<string[]> | null = null
function chargerCodesTraductions(): PromiseLike<string[]> {
  if (!_codesTraductionsCache) {
    // Ne garde que les traductions matérialisées dans `versets_lecture` : une colonne
    // inexistante dans le select ferait échouer toute la requête et viderait l'apparat
    // biblique (voir app/lib/traductions.ts).
    _codesTraductionsCache = codesTraductionsLecture(supabase).then(
      codes => codes.length > 0 ? codes : TRADUCTIONS_FALLBACK.map(t => t.code),
      () => TRADUCTIONS_FALLBACK.map(t => t.code),
    )
  }
  return _codesTraductionsCache
}

// ── Proposition de lien biblique (non-admin) ──────────────────────────────────
// Le lecteur dispose des DEUX moyens, et non plus du seul texte libre : il choisit ses
// versets dans l'outil de sélection — le même que celui de l'administrateur, à ceci près
// qu'ici RIEN n'est écrit dans `segments` — et il écrit ce qu'il veut à côté, pour dire
// d'où lui vient sa lecture. L'un ou l'autre suffit à envoyer ; les deux valent mieux.
//
// ⛔ La sélection ne s'enregistre pas : elle n'est qu'une façon commode d'ÉCRIRE une
// référence sans se tromper de chiffre. Ce qui part est une proposition, que la
// modération lira.
function ProposerLienBiblique({ segId }: { segId: number }) {
  const [ouvert, setOuvert] = useState(false)
  const [texte, setTexte] = useState('')
  const [choixOuvert, setChoixOuvert] = useState(false)
  const [selection, setSelection] = useState<{ champ: ChampLienBiblique; versets: VersetLienBiblique[] } | null>(null)
  const [statut, setStatut] = useState<'idle' | 'envoi' | 'ok' | 'err'>('idle')
  const { exigerCompte } = useCompte()

  const versets = selection?.versets ?? []
  // Un texte SEUL reste recevable : on peut vouloir signaler un rapprochement sans savoir
  // le référencer. Une sélection SEULE l'est aussi : la référence se suffit alors.
  const peutEnvoyer = versets.length > 0 || texte.trim().length > 0

  const reinitialiser = () => { setTexte(''); setSelection(null); setStatut('idle') }

  const envoyer = async () => {
    if (!peutEnvoyer) return
    setStatut('envoi')
    const morceaux: string[] = []
    if (selection && versets.length > 0) {
      morceaux.push(`${libelleTypeLien(selection.champ)} : ${versets.map(v => v.label).join(' ; ')}`)
    }
    if (texte.trim()) morceaux.push(texte.trim())
    try {
      await insererSignalement({ id_segment: segId, message: `Proposition de lien biblique : ${morceaux.join(' — ')}`, importance: 'important', url_source: window.location.href })
      setStatut('ok')
      setTimeout(() => { setOuvert(false); reinitialiser() }, 1800)
    } catch { setStatut('err') }
  }

  return (
    <>
      <button onClick={() => { if (!exigerCompte('proposer un lien biblique')) return; reinitialiser(); setOuvert(true) }}
        style={{ fontSize: '0.6875rem', color: 'var(--cs-texte-gris)', background: 'rgba(var(--cs-vert-rgb),0.04)', border: '1px dashed var(--cs-bord)', borderRadius: '4px', padding: '5px 10px', cursor: 'pointer', marginTop: '8px', width: '100%', textAlign: 'left' }}>
        + Proposer un lien biblique
      </button>
      {/* Sous la barre de navigation et bornée en hauteur, comme les autres fenêtres de
          cette page : le pied porte le bouton d'envoi, il ne peut pas sortir de l'écran. */}
      {ouvert && (
        <div onClick={() => setOuvert(false)} style={{ position: 'fixed', top: HAUTEUR_NAVBAR, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.35)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.25rem' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--cs-surface)', borderRadius: '8px', width: 'min(22.5rem, 100%)', maxHeight: `calc(100dvh - ${HAUTEUR_NAVBAR} - 2.5rem)`, display: 'flex', flexDirection: 'column', boxShadow: 'var(--cs-ombre-modale)' }}>
            <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 22px 10px' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--cs-vert)', margin: 0 }}>Proposer un lien biblique</p>
              <button onClick={() => setOuvert(false)} style={{ fontSize: '0.875rem', color: 'var(--cs-texte-faible)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>✕</button>
            </div>
            <div className="cs-defilement-discret" style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', padding: '0 22px' }}>
            {statut === 'ok' ? (
              <p style={{ fontSize: '0.71875rem', color: 'var(--cs-vert)', fontStyle: 'italic', textAlign: 'center', padding: '8px 0 16px' }}>Proposition envoyée, merci !</p>
            ) : (
              <>
                <p style={{ fontSize: '0.65625rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic', margin: '0 0 10px', lineHeight: 1.45 }}>
                  Choisissez les versets dans la Bible, ou écrivez la référence et ce qui vous la fait proposer. L’un ou l’autre suffit.
                </p>

                <button type="button" onClick={() => setChoixOuvert(true)}
                  style={{ width: '100%', fontSize: '0.6875rem', color: 'var(--cs-vert)', background: 'rgba(var(--cs-vert-rgb),0.04)', border: '1px dashed var(--cs-bord)', borderRadius: '4px', padding: '6px 10px', cursor: 'pointer', textAlign: 'left' }}>
                  {versets.length > 0 ? 'Modifier les versets choisis…' : 'Choisir les versets dans la Bible…'}
                </button>

                {selection && versets.length > 0 && (
                  <div style={{ marginTop: '8px', padding: '8px 10px', background: 'var(--cs-fond-clair)', border: '1px solid var(--cs-fond-doux)', borderRadius: '4px' }}>
                    <p style={{ fontSize: '0.53125rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--cs-texte-faible)', margin: '0 0 4px' }}>{libelleTypeLien(selection.champ)}</p>
                    {versets.map(v => (
                      <p key={v.id} style={{ fontSize: '0.6875rem', color: 'var(--cs-texte-fort)', margin: '2px 0 0', lineHeight: 1.4 }}>{v.label}</p>
                    ))}
                    <button type="button" onClick={() => setSelection(null)}
                      style={{ marginTop: '6px', fontSize: '0.625rem', color: 'var(--cs-texte-doux)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '2px' }}>
                      Retirer ce choix
                    </button>
                  </div>
                )}

                <textarea value={texte} onChange={e => setTexte(e.target.value)} rows={3}
                  placeholder="Référence, ou ce qui vous la fait proposer…"
                  style={{ width: '100%', fontSize: '0.6875rem', padding: '7px 9px', marginTop: '8px', border: '1px solid var(--cs-bord)', borderRadius: '4px', background: 'var(--cs-fond-clair)', color: 'var(--cs-texte-fort)', resize: 'vertical', outline: 'none', lineHeight: 1.5, boxSizing: 'border-box' }} />
              </>
            )}
            </div>
            {statut !== 'ok' && (
              <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px', padding: '10px 22px 18px' }}>
                {statut === 'err' && <span style={{ fontSize: '0.625rem', color: 'var(--cs-danger)', marginRight: 'auto' }}>Erreur d’envoi.</span>}
                <button onClick={() => setOuvert(false)} style={{ fontSize: '0.6875rem', padding: '5px 12px', borderRadius: '4px', border: '1px solid var(--cs-bord)', background: 'var(--cs-surface)', color: 'var(--cs-texte-second)', cursor: 'pointer' }}>Annuler</button>
                <button onClick={envoyer} disabled={statut === 'envoi' || !peutEnvoyer}
                  style={{ fontSize: '0.6875rem', padding: '5px 14px', borderRadius: '4px', border: 'none', cursor: peutEnvoyer ? 'pointer' : 'default', background: peutEnvoyer ? 'var(--cs-vert-aplat)' : 'var(--cs-bord-clair)', color: peutEnvoyer ? 'var(--cs-sur-aplat)' : 'var(--cs-texte-doux)', fontWeight: 500 }}>
                  {statut === 'envoi' ? 'Envoi…' : 'Envoyer'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      {choixOuvert && (
        <ModalLienBiblique
          ouvert={choixOuvert}
          titre="Choisir les versets à proposer"
          onFermer={() => setChoixOuvert(false)}
          onValider={(champ, versetsChoisis) => { setSelection({ champ, versets: versetsChoisis }); setChoixOuvert(false) }}
        />
      )}
    </>
  )
}

// ── Composant principal ───────────────────────────────────────────────────────
// Les styles des contrôles du volet gauche (Lecture / Texte / Traduction) vivent
// dans `app/lib/stylesVoletLecture.ts`, d'où la page Bible les prend aussi : le même
// geste — choisir comment on lit ce qu'on a sous les yeux — se présente de la même
// façon des deux côtés du site. Ce fichier en portait une COPIE depuis le 2026-08-22,
// le temps d'un chantier ; elle est réunie ici, les deux formes étant encore mot pour
// mot identiques. ⛔ Ne pas en redéclarer une troisième.
const NIV1_LIMINAIRES = '__LIMINAIRES__'

export default function OeuvreClient({ auteur, auteurId, auteurs: auteursOeuvre = [], idOeuvre, idTexte, versionsTextuelles, alignementsDisponibles, notesStructurees = {}, ancresNotesStructurees = {}, estAdmin: estAdminReel, niv1List: niv1ListProp, niv1TexteMap: niv1TexteMapProp = {}, niveauxSommaire = 1, niveauxCorps = 1, txtSommaire = [], txtCorps = [], afficherNumeros = true, lectureTexteEntier = false, oeuvre, groupes: groupesInit, segments: segmentsInit, tocApparat, groupesApparat: groupesApparatInit, segmentsApparat: segmentsApparatInit, segmentCibleId = null, niv1Initial = null, vueInitiale = 'texte', niv1InitialPartiel = false, comparaisonInitiale = false, alignmentSetIdInitial = null, comparaisonLivreInitial = 1, comparaisonDivisionInitiale = 1 }: Props) {
  const { modeUtilisateurStandard } = useAffichageAdmin()
  const estAdmin = estAdminReel && !modeUtilisateurStandard
  // Charge la table des éditeurs (une fois) pour afficher les noms complets répertoriés.
  useEditeursCharges()
  const { favoris: favorisOeuvres, pret: favorisPret, toggle: toggleFavoriOeuvre } = useFavoris('oeuvre')
  const [segActif, setSegActif] = useState<number | null>(segmentCibleId)
  const [tradIndex, setTradIndex] = useState(0)
  const [traductionsBible, setTraductionsBible] = useState(TRADUCTIONS_FALLBACK)
  const [tradOuverte, setTradOuverte] = useState(false)
  // ⛔ Plus d'onglet « Problèmes ». Il listait les passages dont le lien biblique restait
  // à constituer, et vivait de colonnes abolies : la fiabilité est portée AU LIEN depuis
  // le 20 juillet 2026 (charte §24.3), `segments.fiabilite` est vidée et `lien_1` à
  // `lien_4` n'existent plus. Il a été rebâti sur `liens_bibliques`, puis retiré : ce
  // travail relève de l'atelier, non du volet de lecture d'un lecteur.
  const [ongletDroit, setOngletDroit] = useState<'refs' | 'commentaires'>('refs')
  const { exigerCompte } = useCompte()
  const [userId, setUserId] = useState<string | null>(null)
  const [sauvegardesSegs, setSauvegardesSegs] = useState<Set<number>>(new Set())
  const [vue, setVue] = useState<'texte' | 'apparat'>(vueInitiale)
  const [editionCible, setEditionCible] = useState<EditionCible | null>(null)
  const [titreAffiche, setTitreAffiche] = useState(oeuvre.titre)
  const [oeuvreLocale, setOeuvreLocale] = useState<Props['oeuvre']>(oeuvre)
  const versionActive = versionsTextuelles.find(version => version.idTexte === idTexte) ?? null
  const oeuvreAffichee = useMemo<Props['oeuvre']>(() => ({
    ...oeuvreLocale,
    trad_auteur: versionActive?.traducteur ?? oeuvreLocale.trad_auteur,
    editeur: versionActive?.editeurEdition ?? oeuvreLocale.editeur,
    ville: versionActive?.villeEdition ?? oeuvreLocale.ville,
    date_publication: versionActive?.dateEdition ?? oeuvreLocale.date_publication,
    url_source: versionActive?.sourceUrl ?? oeuvreLocale.url_source,
    commentaire_traduction: versionActive && !versionActive.isDefault
      ? null
      : oeuvreLocale.commentaire_traduction,
  }), [oeuvreLocale, versionActive])
  const [navOuverte, setNavOuverte] = useState(true)
  const [panneauOuvert, setPanneauOuvert] = useState(true)
  // ≤ 900px : nav et apparat en barres fixes + tiroirs (voir AGENTS § mobile).
  const mobile = useEstMobile(900)

  // Mémorise l'œuvre ouverte dans les « dernières consultées » (survol de
  // « Patristique » dans la navbar). Local au navigateur.
  useEffect(() => {
    enregistrerOeuvreRecente({ id: idOeuvre, titre: oeuvre.titre, auteur })
  }, [idOeuvre, oeuvre.titre, auteur])
  // Mobile : actions de segment masquées, révélées à l'appui long (comme les
  // versets de la page Bible).
  const [infoEditionOuverte, setInfoEditionOuverte] = useState(false)
  // Identifiant de l'auteur dont la fiche est ouverte (null = aucune). Une œuvre
  // pouvant être signée à deux, il ne suffit plus de savoir QU'une fiche est
  // ouverte : il faut savoir LAQUELLE.
  const [auteurModalId, setAuteurModalId] = useState<string | null>(null)
  // La lecture se fait EN PARAGRAPHES, et il n'y a plus d'autre façon : les segments
  // d'un même paragraphe coulent en un seul bloc, leur délimitation n'apparaissant
  // qu'au survol.
  //
  // ⛔ Le mode « segments » (un segment = un bloc, gouttière d'actions à droite) est
  // retiré, avec le choix qui l'offrait. Les SEGMENTS, eux, restent entiers : ils sont
  // l'unité de numérotation, d'ancre, de signet, de prélèvement et de renvoi. Ce qui
  // disparaît est une MISE EN PAGE, non une structure.
  //
  // Une œuvre dont les segments n'ont pas de `paragraphe` se lit sans dommage : le
  // garde-fou de `paragraphesDe` isole alors chaque segment dans son propre bloc, ce
  // qui rend très exactement ce que faisait l'ancien mode. C'est pourquoi le drapeau
  // `eligibleParagraphes` a pu partir avec lui : il ne gardait plus aucune porte.
  const aTexteOriginal = useMemo(
    () => [...segmentsInit, ...segmentsApparatInit].some(s => Boolean(s.texteOriginal?.trim())),
    [segmentsInit, segmentsApparatInit],
  )
  // Mode d'affichage du texte : français seul, bilingue (français + latin), latin seul.
  const [modeTexte, setModeTexte] = useState<'fr' | 'bilingue' | 'la'>('fr')
  // « Traductions parallèles » est désactivé pour le moment (mode de lecture jugé
  // trop complexe). On force l'indisponibilité : les boutons disparaissent et le
  // mode est neutralisé partout (via modeComparaisonActif). Réversible d'une ligne :
  // rétablir `comparaisonDisponible(alignementsDisponibles)`.
  const COMPARAISON_ACTIVE = false
  const comparaisonEstDisponible = COMPARAISON_ACTIVE && comparaisonDisponible(alignementsDisponibles)
  const [alignmentSetId, setAlignmentSetId] = useState<string | null>(alignmentSetIdInitial)
  const alignementActif = choisirAlignement(alignementsDisponibles, alignmentSetId)
  const [modeComparaison, setModeComparaison] = useState(comparaisonInitiale)
  const modeComparaisonActif = comparaisonEstDisponible && modeComparaison && Boolean(alignementActif)
  // Navigation de la comparaison, MENÉE COMME LA LECTURE : l'état (livre, division,
  // liste ordonnée des divisions alignées) vit ici pour alimenter à la fois le
  // sommaire de gauche et la barre « ‹ Livre — Division › », exactement comme les
  // niveaux du texte alimentent le sommaire et la barre de niveau 1.
  const [comparaisonDivisions, setComparaisonDivisions] = useState<DivisionAlignee[]>([])
  const [comparaisonBook, setComparaisonBook] = useState(() => Number.isInteger(comparaisonLivreInitial) && comparaisonLivreInitial >= 1 ? comparaisonLivreInitial : 1)
  const [comparaisonDivision, setComparaisonDivision] = useState(() => Number.isInteger(comparaisonDivisionInitiale) && comparaisonDivisionInitiale >= 1 ? comparaisonDivisionInitiale : 1)
  const fermerComparaison = () => {
    setModeComparaison(false)
    const params = new URLSearchParams(window.location.search)
    params.delete('compare')
    params.delete('book')
    params.delete('division')
    router.replace(`${window.location.pathname}${params.size ? `?${params.toString()}` : ''}`, { scroll: false })
  }
  const ouvrirLectureParallele = (setId: string) => {
    setVue('texte')
    setAlignmentSetId(setId)
    setModeComparaison(true)
    const params = new URLSearchParams(window.location.search)
    params.set('compare', setId)
    params.set('book', String(comparaisonBook))
    params.set('division', String(comparaisonDivision))
    router.replace(`${window.location.pathname}?${params.toString()}`, { scroll: false })
  }
  // Va à une division alignée (depuis le sommaire de gauche ou les flèches ‹ ›),
  // met l'URL à jour et ramène en haut du texte — comme un changement de niveau 1.
  const naviguerComparaison = (book: number, division: number) => {
    setComparaisonBook(book)
    setComparaisonDivision(division)
    const params = new URLSearchParams(window.location.search)
    if (alignementActif) params.set('compare', alignementActif.alignmentSetId)
    params.set('book', String(book))
    params.set('division', String(division))
    router.replace(`${window.location.pathname}?${params.toString()}`, { scroll: false })
    if (mobile) setNavOuverte(false)
    allerAAncre('barre-nav-division')
  }
  // Charge la liste ordonnée des divisions alignées à l'entrée en comparaison, avec
  // le TITRE EXACT de chaque division tiré de la traduction de référence (niv1/niv2),
  // pour que le sommaire soit identique à celui de la lecture. Recale la division
  // courante sur la première disponible si elle est hors liste.
  useEffect(() => {
    if (!comparaisonEstDisponible || !alignementActif || !modeComparaison) return
    let actif = true
    ;(async () => {
      const { data: alnData, error } = await supabase.from('texte_alignements')
        .select('alignment_id,book,canonical_division_order')
        .eq('alignment_set_id', alignementActif.alignmentSetId)
        .order('book').order('canonical_division_order')
      if (!actif || error || !alnData) return
      // Une entrée par division (dans l'ordre), avec un groupe représentatif dont on
      // lira le titre côté référence.
      const parDivision = new Map<string, { book: number; division: number; alignmentId: string }>()
      for (const row of alnData as { alignment_id: string; book: number; canonical_division_order: number }[]) {
        const cle = `${row.book}|${row.canonical_division_order}`
        if (!parDivision.has(cle)) parDivision.set(cle, { book: row.book, division: row.canonical_division_order, alignmentId: row.alignment_id })
      }
      const reps = [...parDivision.values()]
      const { data: memData } = await supabase.from('texte_alignement_membres')
        .select('alignment_id,segment_key').eq('role', 'reference').in('alignment_id', reps.map(rep => rep.alignmentId))
      const cleParAlignement = new Map<string, string>()
      for (const row of (memData ?? []) as { alignment_id: string; segment_key: string }[]) if (!cleParAlignement.has(row.alignment_id)) cleParAlignement.set(row.alignment_id, row.segment_key)
      const segKeys = [...cleParAlignement.values()]
      const { data: segData } = segKeys.length
        ? await supabase.from('segments').select('segment_key,ref_niv1,ref_niv2').in('segment_key', segKeys)
        : { data: [] }
      const titreParCle = new Map<string, { niv1: string | null; niv2: string | null }>()
      for (const row of (segData ?? []) as { segment_key: string; ref_niv1: string | null; ref_niv2: string | null }[]) titreParCle.set(row.segment_key, { niv1: row.ref_niv1, niv2: row.ref_niv2 })
      const liste: DivisionAlignee[] = reps.map(rep => {
        const segKey = cleParAlignement.get(rep.alignmentId)
        const titre = segKey ? titreParCle.get(segKey) : undefined
        return { book: rep.book, division: rep.division, niv1: titre?.niv1 ?? undefined, niv2: titre?.niv2 ?? undefined }
      })
      if (!actif) return
      setComparaisonDivisions(liste)
      if (liste.length > 0 && !divisionPresente(liste, comparaisonBook, comparaisonDivision)) {
        setComparaisonBook(liste[0].book)
        setComparaisonDivision(liste[0].division)
      }
    })()
    return () => { actif = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comparaisonEstDisponible, alignementActif?.alignmentSetId, modeComparaison])
  useEffect(() => {
    try {
      // Un lien direct « ?mt=la » (texte original / bilingue) l'emporte sur la
      // préférence enregistrée : il ouvre l'œuvre exactement dans le mode demandé.
      const urlMt = new URLSearchParams(window.location.search).get('mt')
      if (urlMt === 'fr' || urlMt === 'bilingue' || urlMt === 'la') {
        setModeTexte(urlMt)
        return
      }
      const mt = localStorage.getItem(`cs_modetexte_${idOeuvre}`)
      if (mt === 'fr' || mt === 'bilingue' || mt === 'la') setModeTexte(mt)
      else if (localStorage.getItem(`cs_bilingue_${idOeuvre}`) === '1') setModeTexte('bilingue')
    } catch {}
  }, [idOeuvre])
  const affichageBilingue = modeTexte === 'bilingue'
  const afficherOriginalSeul = modeTexte === 'la'
  // Libellés du choix de lecture selon la langue de l'original (grec ou, par défaut, latin).
  // La langue s'écrit « Grec » ou « grec » selon les fiches : la comparaison stricte
  // laissait passer la minuscule, et un texte grec repartait alors avec les libellés
  // et le syllabateur latins.
  const estGrec = /grec/i.test(oeuvre.langue_originale ?? '')
  const labelOriginal = estGrec ? 'Grec' : 'Latin'
  const labelBilingue = estGrec ? 'Français & Grec' : 'Français & Latin'
  const basculerTexte = (mode: 'fr' | 'bilingue' | 'la') => {
    if (modeComparaisonActif) fermerComparaison()
    setModeTexte(mode)
    try {
      localStorage.setItem(`cs_modetexte_${idOeuvre}`, mode)
    } catch {}
  }
  // Compensation droite CONSTANTE pour centrer tous les titres (fleuron, niv1,
  // niv2) sur le CORPS DU TEXTE, en excluant systématiquement la gouttière des
  // boutons d'action (signaler, prélever, copier) — ~60px à droite. Le corps du
  // texte se définit toujours ainsi, quel que soit le mode de lecture (segments,
  // paragraphes, bilingue) : le centre visuel se décale d'environ 30px vers la
  // gauche, comme la page de titre. Sur mobile, pas de gouttière : aucune compensation.
  const gouttiereTitre = mobile ? undefined : '60px'

  // Survol d'un segment en mode paragraphes : cellule d'actions flottante ancrée
  // sur le segment (via portail, pour n'être pas clippée par le corps).
  const [segSurvol, setSegSurvol] = useState<{ id: number; top: number; left: number } | null>(null)
  const timerSurvolRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // null = largeur AUTO (responsive, s'adapte à l'écran, plancher de lisibilité) ;
  // number = largeur fixée à la main (drag), en px.
  const [navWidth, setNavWidth] = useState<number | null>(null)
  const [pannWidth, setPannWidth] = useState<number | null>(null)
  const voletsDirty = navWidth !== null || pannWidth !== null
  const refNav = useRef<HTMLElement>(null)
  const refAside = useRef<HTMLElement>(null)
  const [configNiveaux, setConfigNiveaux] = useState({
    sommaire: niveauxSommaire ?? 1, corps: niveauxCorps ?? 1,
    txtSommaire: (txtSommaire ?? []).concat([false,false,false,false,false]).slice(0,5) as boolean[],
    txtCorps: (txtCorps ?? []).concat([false,false,false,false,false]).slice(0,5) as boolean[],
    afficherNumeros: afficherNumeros ?? true,
    texteEntier: lectureTexteEntier,
  })
  const [configOuverte, setConfigOuverte] = useState(false)
  const [configEnvoi, setConfigEnvoi] = useState(false)
  // ⛔ L'enregistrement échouait SANS UN MOT : `if (reponses.some(r => !r.ok)) return`
  // remettait simplement le bouton en place. Six appels partent en parallèle ; si un
  // seul est refusé — session expirée, droits perdus — l'admin voyait « Enregistrement… »
  // puis plus rien, et devait conclure que le réglage ne marchait pas. Un réglage qui
  // échoue doit le dire, sans quoi on cherche le défaut dans l'affichage.
  const [configErreur, setConfigErreur] = useState<string | null>(null)
  // Quels niveaux de titres existent réellement dans l'œuvre : on grise les niveaux
  // vides dans le sélecteur d'affichage. Calculé une fois, à l'ouverture du panneau
  // (admin seulement), par une simple sonde d'existence par niveau.
  const [niveauxPresents, setNiveauxPresents] = useState<boolean[] | null>(null)
  useEffect(() => {
    if (!configOuverte || niveauxPresents) return
    let annule = false
    // ⛔ `apparat_auteur` (prologue, avertissement de l'auteur) appartient au CORPS :
    // il se lit à sa place dans le texte. Ne pas le retirer de cette liste — c'est
    // ce qui l'avait fait disparaître du rendu. Distinct d'`apparat_critique`.
    const cols = ['ref_niv1', 'ref_niv2', 'ref_niv3', 'ref_niv4', 'ref_niv5'] as const
    ;(async () => {
      const reponses = await Promise.all(cols.map(col =>
        supabase.from('segments').select('id').eq('id_oeuvre', idOeuvre).eq('id_texte', idTexte)
          .in('nature', NATURES_CORPS).not(col, 'is', null).neq(col, '').limit(1)
      ))
      if (annule) return
      setNiveauxPresents(cols.map((_, i) => ((reponses[i].data as unknown[])?.length ?? 0) > 0))
    })()
    return () => { annule = true }
  }, [configOuverte, niveauxPresents, idOeuvre, idTexte])
  const resetVolets = () => { setNavWidth(null); setPannWidth(null); try { localStorage.removeItem('cs_volets_oeuvre2') } catch {} }
  const [nbCommentairesOeuvre, setNbCommentairesOeuvre] = useState<number | null>(null)
  useEffect(() => {
    if (segActif === null) { setNbCommentairesOeuvre(null); return }
    supabase.from('commentaires').select('id', { count: 'exact', head: true })
      .eq('id_segment', segActif)
      .then(({ count }) => setNbCommentairesOeuvre(count ?? 0))
  }, [segActif])
  const tradSelectRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem('cs_volets_oeuvre2') ?? 'null')
      if (s?.nav) setNavWidth(s.nav)
      if (s?.pann) setPannWidth(s.pann)
    } catch {}
    if (typeof window !== 'undefined' && window.innerWidth < 900) {
      setNavOuverte(false)
      setPanneauOuvert(false)
    }
  }, [])
  useEffect(() => {
    localStorage.setItem('cs_volets_oeuvre2', JSON.stringify({ nav: navWidth, pann: pannWidth }))
  }, [navWidth, pannWidth])
  useEffect(() => {
    if (!tradOuverte) return
    const fermerAuClicExterieur = (event: MouseEvent) => {
      if (tradSelectRef.current && !tradSelectRef.current.contains(event.target as Node)) {
        setTradOuverte(false)
      }
    }
    document.addEventListener('mousedown', fermerAuClicExterieur)
    return () => document.removeEventListener('mousedown', fermerAuClicExterieur)
  }, [tradOuverte])

    const [oeuvresAuteur, setOeuvresAuteur] = useState<OeuvreResumee[]>([])
  const router = useRouter()
  // Traductions sœurs : œuvres du MÊME auteur au MÊME titre normalisé (comme le
  // regroupement de la Bibliothèque). Sert au sélecteur de traduction du volet gauche.
  type VersionTrad = { id_oeuvre: string; titre: string; trad_auteur: string | null; editeur: string | null; ville: string | null; date_publication: string | null; note: string | null; langue_originale: string | null; langue_trad: string | null }
  const [versions, setVersions] = useState<VersionTrad[]>([])
  const [auteurOuvert, setAuteurOuvert] = useState(false)
  const [apparatOuvert, setApparatOuvert] = useState(false)
  const [sommaireOuvert, setSommaireOuvert] = useState(true)
  const [apparatNiv1Actif, setApparatNiv1Actif] = useState<string | null>(null)
  const [ancreEnAttente, setAncreEnAttente] = useState<string | null>(null)

  useEffect(() => {
    if (!ancreEnAttente || vue !== 'apparat') return
    const el = document.getElementById(ancreEnAttente)
    if (allerAElement(el)) setAncreEnAttente(null)
  }, [vue, ancreEnAttente])

  // Navigation lazy par niv1
  const niv1List = niv1ListProp
  const texteSansNiveaux = niv1List.length === 0
  // Carte niv1 -> titre textuel, complete des le rendu serveur.
  // Elle reste enrichie apres modifications ou chargements forces.
  const [niv1TexteMap, setNiv1TexteMap] = useState<Record<string, string>>(niv1TexteMapProp)
  const [niv1Actif, setNiv1Actif] = useState<string>((niv1Initial && niv1List.includes(niv1Initial) ? niv1Initial : null) ?? niv1List[0] ?? '')
  const [groupes, setGroupes] = useState<GroupeData[]>(groupesInit)
  const [segments, setSegments] = useState<SegData[]>(segmentsInit)
  const [groupesApparat, setGroupesApparat] = useState<GroupeData[]>(groupesApparatInit)
  const [segmentsApparat, setSegmentsApparat] = useState<SegData[]>(segmentsApparatInit)
  const [niv1Loading, setNiv1Loading] = useState(false)
  const [niv1Erreur, setNiv1Erreur] = useState<string | null>(null)
  const [pageActuelle, setPageActuelle] = useState(0)
  const profondeurSommaire = configNiveaux.sommaire
  const profondeurCorps = configNiveaux.corps
  // Navigation par niv2 (si profondeur >= 2)
  const [niv2Actif, setNiv2Actif] = useState<string | null>(null)

  // Niv1 actif suivi en ref : la complétion en tâche de fond ne doit s'appliquer
  // que si le lecteur n'a pas changé de niveau entre-temps.
  const niv1ActifRef = useRef(niv1Actif)
  useEffect(() => { niv1ActifRef.current = niv1Actif }, [niv1Actif])

  const niv1Index = niv1List.indexOf(niv1Actif)
  const niv1Prev = niv1Index > 0 ? niv1List[niv1Index - 1] : null
  const niv1Next = niv1Index < niv1List.length - 1 ? niv1List[niv1Index + 1] : null

  // Cache mémoire des niv1 déjà chargés : navigation instantanée au retour sur
  // un niveau déjà visité, et préchargement discret des niv1 voisins en tâche
  // de fond pour réduire la latence perçue au clic sur Suivant/Précédent.
  const cacheNiv1Ref = useRef<Map<string, { groupes: GroupeData[]; segments: SegData[] }>>(new Map())
  useEffect(() => {
    cacheNiv1Ref.current.set(niv1Actif, { groupes: groupesInit, segments: segmentsInit })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const pendingScrollTopRef = useRef(false)
  const pendingScrollSegRef = useRef<number | null>(null)
  useEffect(() => {
    if (!pendingScrollTopRef.current || vue !== 'texte') return
    pendingScrollTopRef.current = false
    document.getElementById('barre-nav-niv1')?.scrollIntoView({ block: 'start' })
  }, [vue, groupes])
  // Liste des niv2 du niv1 actif (sert au sommaire)
  const groupesNiv1Actif = lectureTexteEntier ? groupes.filter(g => g.niv1 === niv1Actif) : groupes
  const niv2List = Array.from(new Set(groupesNiv1Actif.map(g => g.niv2).filter(Boolean)))

  // Pagination : découpe les groupes en pages de CHARS_PAR_PAGE caractères max,
  // sans jamais couper un groupe (niv3/4/5 solidaires).
  const segCharMap = useMemo(() => {
    const m = new Map<number, number>()
    segments.forEach(s => m.set(s.id, s.texte?.length ?? 0))
    return m
  }, [segments])

  const pages = useMemo(() => {
    if (groupes.length === 0) return [[]] as GroupeData[][]
    if (texteSansNiveaux) {
      const result: GroupeData[][] = []
      let currentIds: number[] = []
      let currentChars = 0
      let pageIndex = 0
      const flush = () => {
        if (currentIds.length === 0) return
        result.push([{
          niv1: '', niv2: '', niv3: '', niv4: '',
          niv1_texte: '', niv2_texte: '', niv3_texte: '', niv4_texte: '',
          anchor: `g-sans-niveaux-${pageIndex++}`,
          itemIds: currentIds,
        }])
        currentIds = []
        currentChars = 0
      }
      const tousIds = groupes.flatMap(g => g.itemIds)
      for (const id of tousIds) {
        const chars = segCharMap.get(id) ?? 0
        if (currentIds.length > 0 && currentChars + chars > CHARS_PAR_PAGE) flush()
        currentIds.push(id)
        currentChars += chars
      }
      flush()
      return result.length > 0 ? result : [[]]
    }
    const result: GroupeData[][] = []
    let current: GroupeData[] = []
    let currentChars = 0
    for (const groupe of groupes) {
      const gc = groupe.itemIds.reduce((acc, id) => acc + (segCharMap.get(id) ?? 0), 0)
      if (current.length > 0 && currentChars + gc > CHARS_PAR_PAGE) {
        result.push(current)
        current = [groupe]
        currentChars = gc
      } else {
        current.push(groupe)
        currentChars += gc
      }
    }
    if (current.length > 0) result.push(current)
    return result
  }, [groupes, segCharMap, texteSansNiveaux])

  const groupesFiltres = useMemo(() => pages[pageActuelle] ?? [], [pages, pageActuelle])

  // Amène un élément au NIVEAU DES YEUX : son sommet se pose au tiers supérieur de la
  // fenêtre. On passe par `scrollIntoView` (fiable ici) avec une marge de défilement
  // haute temporaire égale au tiers de la fenêtre — `block:'start'` cale alors le sommet
  // à ce tiers.
  const scrollNiveauDesYeux = useCallback((id: string) => {
    const el = document.getElementById(id)
    if (!el) return false
    const prev = el.style.scrollMarginTop
    el.style.scrollMarginTop = `${Math.round(window.innerHeight / 3)}px`
    // Défilement INSTANTANÉ (et non « smooth ») : un défilement animé était annulé dès la
    // première frame par le re-rendu déclenché par la sélection du segment.
    el.scrollIntoView({ behavior: 'auto', block: 'start' })
    window.setTimeout(() => { el.style.scrollMarginTop = prev }, 200)
    return true
  }, [])

  useEffect(() => {
    const segId = pendingScrollSegRef.current
    if (!segId) return
    const g = groupes.find(gr => gr.itemIds.includes(segId))
    if (!g) return
    pendingScrollSegRef.current = null
    const pageIdx = pages.findIndex(p => p.some(gr => gr.anchor === g.anchor))
    if (pageIdx >= 0 && pageIdx !== pageActuelle) setPageActuelle(pageIdx)
    // « Aller au passage » : on pose le passage au niveau des yeux (tiers supérieur) ;
    // à défaut du segment précis, on se rabat sur le paragraphe qui le contient.
    setTimeout(() => {
      if (!scrollNiveauDesYeux(`segment-${segId}`)) allerAAncre(g.anchor)
    }, 80)
  }, [groupes, pages, pageActuelle, scrollNiveauDesYeux])

  const premierSegmentId = pageActuelle === 0 && groupesFiltres.length > 0
    ? (groupesFiltres[0].itemIds[0] ?? null)
    : null

  const segmentsFiltres = useMemo(() => {
    const ids = new Set(groupesFiltres.flatMap(g => g.itemIds))
    return segments.filter(s => ids.has(s.id))
  }, [groupesFiltres, segments])

  // Scroll-spy du sommaire : au défilement, le niveau 2 (question, section…)
  // effectivement à l'écran devient l'actif dans le sommaire — et non celui sur
  // lequel on avait cliqué en dernier. On retient le dernier groupe dont le haut
  // est passé sous la barre fixe (sticky 48px + barre de navigation niv1).
  useEffect(() => {
    if (vue !== 'texte') return
    // Scroll-spy throttlé : au plus UNE mesure par frame (requestAnimationFrame),
    // au lieu de lire la géométrie (getBoundingClientRect en boucle) à chaque
    // événement scroll — ce qui provoquait du jank sur les grosses œuvres.
    const etat = { ticking: false }
    const calcul = () => {
      etat.ticking = false
      const seuil = 140
      let n1Courant: string | null = null
      let n2Courant: string | null = null
      let trouve = false
      for (const g of groupesFiltres) {
        const el = document.getElementById(g.anchor)
        if (!el) continue
        if (el.getBoundingClientRect().top - seuil <= 0) {
          n1Courant = g.niv1 || null
          n2Courant = g.niv2 || null
          trouve = true
        } else break
      }
      if (trouve) {
        if (lectureTexteEntier && n1Courant) setNiv1Actif(prev => (prev === n1Courant ? prev : n1Courant!))
        setNiv2Actif(prev => (prev === n2Courant ? prev : n2Courant))
      }
    }
    const onScroll = () => {
      if (etat.ticking) return
      etat.ticking = true
      requestAnimationFrame(calcul)
    }
    calcul()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [groupesFiltres, lectureTexteEntier, vue])

  // Navigue vers une ancre en changeant de page si nécessaire
  const naviguerVersAncre = useCallback((ancre: string) => {
    const pageIdx = pages.findIndex(p => p.some(g => g.anchor === ancre))
    if (pageIdx >= 0 && pageIdx !== pageActuelle) {
      setPageActuelle(pageIdx)
      // L'ancre n'existe pas encore : elle est sur une page qu'on vient seulement de
      // demander. On laisse le rendu se faire avant de viser.
      setTimeout(() => allerAAncre(ancre), 60)
    } else {
      allerAAncre(ancre)
    }
  }, [pages, pageActuelle])

  // Deep link : aller à la bonne page de pagination puis scroller sur le segment
  useEffect(() => {
    if (!segmentCibleId) return
    const pageIdx = pages.findIndex(p => p.some(g => g.itemIds.includes(segmentCibleId)))
    if (pageIdx >= 0 && pageIdx !== pageActuelle) setPageActuelle(pageIdx)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segmentCibleId, pages])

  useEffect(() => {
    if (!segmentCibleId) return
    let stopped = false
    const tryScroll = (attempt = 0) => {
      if (stopped) return
      const el = document.getElementById(`segment-${segmentCibleId}`)
      // `allerAElement` rend false tant que le segment n'est pas dans la page : on
      // réessaie alors, comme avant, jusqu'à quinze fois.
      if (!allerAElement(el) && attempt < 15) window.setTimeout(() => tryScroll(attempt + 1), 200)
    }
    const timer = window.setTimeout(() => tryScroll(), 100)
    return () => { stopped = true; window.clearTimeout(timer) }
  }, [segmentCibleId, pageActuelle])

  const allerAuNiv2 = (n2: string | null) => {
    setNiv2Actif(n2)
    setVue('texte')
    if (!n2) return
    const ancre = groupes.find(g => (!lectureTexteEntier || g.niv1 === niv1Actif) && g.niv2 === n2)?.anchor
    if (ancre) naviguerVersAncre(ancre)
  }

  const chargerNiv1Data = async (n1: string): Promise<{ groupes: GroupeData[]; segments: SegData[] }> => {
    // ⛔ `apparat_auteur` (prologue, avertissement de l'auteur) appartient au CORPS :
    // il se lit à sa place dans le texte. Ne pas le retirer de cette liste — c'est
    // ce qui l'avait fait disparaître du rendu. Distinct d'`apparat_critique`.
    // Chargement par lots de 1000 mais EN PARALLÈLE (les grosses divisions, ex.
    // Somme théologique ~6500 segments/niv1, se chargeaient en séquentiel) : on
    // récupère le total avec le 1er lot, puis on tire le reste d'un coup.
    const lotNiv1 = (from: number) => {
      let q = supabase.from('segments').select(SELECT_SEGMENT).eq('id_oeuvre', idOeuvre).eq('id_texte', idTexte)
        .in('nature', NATURES_CORPS).order('segment_numero').range(from, from + 999)
      if (!lectureTexteEntier && !texteSansNiveaux && n1) {
        q = n1 === NIV1_LIMINAIRES ? q.is('ref_niv1', null) : q.eq('ref_niv1', n1)
      }
      return q
    }
    let premierReq = supabase.from('segments').select(SELECT_SEGMENT, { count: 'exact' }).eq('id_oeuvre', idOeuvre).eq('id_texte', idTexte)
      .in('nature', NATURES_CORPS).order('segment_numero').range(0, 999)
    if (!lectureTexteEntier && !texteSansNiveaux && n1) {
      premierReq = n1 === NIV1_LIMINAIRES ? premierReq.is('ref_niv1', null) : premierReq.eq('ref_niv1', n1)
    }
    const premier = await premierReq
    if (premier.error) {
      console.error(`Chargement des segments impossible (${idTexte}/${n1}) :`, premier.error)
      throw premier.error
    }
    const segs: any[] = [...((premier.data as any[]) ?? [])]
    const total = premier.count ?? segs.length
    if (total > 1000) {
      const restes = await Promise.all(
        Array.from({ length: Math.ceil(total / 1000) - 1 }, (_, i) => lotNiv1((i + 1) * 1000))
      )
      for (const r of restes) {
        if (r.error) {
          console.error(`Chargement d'un lot de segments impossible (${idTexte}/${n1}) :`, r.error)
          throw r.error
        }
        segs.push(...((r.data as any[]) ?? []))
      }
    }

    // Les liens ne sont plus portés par le segment : on les rapporte de
    // `liens_bibliques` et on les repose au format attendu par l'affichage.
    await hydraterLiensHerites(segs)

    const tousIds = new Set<string>()
    const segsAffichables = segs.filter(segmentAffichable)

    segsAffichables.forEach((s: any) => {
      [s.lien_1,s.lien_2,s.lien_3,s.lien_4].filter(Boolean).forEach((v: string) =>
        v.split(';').map((x: string) => x.trim()).filter(Boolean).forEach((x: string) => tousIds.add(x)))
    })
    const idsArr = Array.from(tousIds)
      const versetMap: Record<string,{label:string;textes:Record<string,string>;livre:string;chapitre:string;verset:string}> = {}
    if (idsArr.length > 0) {
      const codesTraductions = await chargerCodesTraductions()
      const selectVersets = ['id_verset', 'ref', ...codesTraductions.map(code => `"${code}"`)].join(', ')
      const { data: vd } = await supabase.from('versets_lecture')
        .select(selectVersets)
        .in('id_verset', idsArr)
      ;(vd ?? []).forEach((v: any) => {
        const ref = detailsRefBiblique(v.ref)
        const textes = Object.fromEntries(codesTraductions.map(code => [code, v[code] || '']))
        versetMap[v.id_verset] = { ...ref, textes }
      })
    }

    let c = 0
    const newSegs: SegData[] = segsAffichables.map((s: any) => {
      const estIntro = s.nature === 'introduction'
      if (!estIntro) c++
      const versets = extraireVersetsAvecNature(s)
        .map(({ id: vid, natures }) => ({ id: vid, natures, ...(versetMap[vid] || { label: vid, textes: {}, livre: '', chapitre: '', verset: '' }) }))
      return {
        id: s.id, idTexte: s.id_texte, segmentKey: s.segment_key,
        numero: estIntro ? s.segment_numero : c, numeroSource: s.segment_numero,
        texte: s.segment_texte,
        texteAffichage: projeterAppelsNotesStructurees(
          s.segment_texte,
          s.segment_key ? ancresNotesStructurees[s.segment_key] : undefined,
        ), versets,
        notes: (s.segment_key && notesStructurees[s.segment_key]) || parseNotes(s.notes),
        paragraphe: s.paragraphe, rang: s.rang, texteOriginal: s.texte_original,
        nature: s.nature, espaceTextuel: s.espace_textuel, joinBefore: s.join_before,
        alinea: mesureAlinea(s.alinea), stropheAvant: marqueStrophe(s.strophe_avant),
      }
    })

    const newGroupes: GroupeData[] = []
    let cur: any = { niv1:'', niv2:'', niv3:'', niv4:'', itemIds:[] as number[] }
    let gi = 0
    segsAffichables.forEach((s: any) => {
      if (s.nature === 'introduction') return
      const n1v = s.ref_niv1||'', n2v = s.ref_niv2||'', n3v = s.ref_niv3||'', n4v = s.ref_niv4||''
      if (n1v !== cur.niv1 || n2v !== cur.niv2 || n3v !== cur.niv3 || n4v !== cur.niv4) {
        if (cur.itemIds.length > 0) newGroupes.push({ ...cur, anchor: `g${gi++}` })
        cur = {
          niv1: n1v, niv2: n2v, niv3: n3v, niv4: n4v,
          niv1_texte: s.ref_niv1_texte||'', niv2_texte: s.ref_niv2_texte||'',
          niv3_texte: s.ref_niv3_texte||'', niv4_texte: s.ref_niv4_texte||'',
          itemIds: [s.id]
        }
      } else cur.itemIds.push(s.id)
    })
    if (cur.itemIds.length > 0) newGroupes.push({ ...cur, anchor: `g${gi}` })

    // Enrichir la carte niv1 → niv1_texte avec ce qu'on vient de charger
    const niv1TexteEntries: Record<string, string> = {}
    newGroupes.forEach(g => { if (g.niv1 && g.niv1_texte) niv1TexteEntries[g.niv1] = g.niv1_texte })
    if (Object.keys(niv1TexteEntries).length > 0)
      setNiv1TexteMap(prev => ({ ...prev, ...niv1TexteEntries }))

    return { groupes: newGroupes, segments: newSegs }
  }

  // Recharge tout l'apparat critique de l'œuvre depuis Supabase — nécessaire
  // après une modification ou une suppression admin, puisque l'apparat n'est
  // sinon chargé qu'une seule fois au rendu serveur de la page.
  const chargerApparatData = async () => {
    const { data, error } = await supabase
      .from('segments')
      .select(SELECT_SEGMENT)
      .eq('id_oeuvre', idOeuvre)
      .eq('id_texte', idTexte)
      .eq('nature', 'apparat_critique')
      .order('segment_numero')
    if (error) {
      console.error(`Chargement de l'apparat impossible (${idTexte}) :`, error)
      throw error
    }
    const segs = ((data ?? []) as any[]).filter(segmentAffichable)

    let c = 0, n1c = ''
    const newSegs: SegData[] = segs.map((s: any) => {
      const n1v = s.ref_niv1 || ''
      if (n1v !== n1c) { c = 0; n1c = n1v }
      c++
      return {
        id: s.id, idTexte: s.id_texte, segmentKey: s.segment_key,
        numero: c, numeroSource: s.segment_numero, texte: s.segment_texte,
        texteAffichage: projeterAppelsNotesStructurees(
          s.segment_texte,
          s.segment_key ? ancresNotesStructurees[s.segment_key] : undefined,
        ), versets: [],
        notes: (s.segment_key && notesStructurees[s.segment_key]) || parseNotes(s.notes),
        paragraphe: s.paragraphe, rang: s.rang, texteOriginal: s.texte_original,
        nature: s.nature, espaceTextuel: s.espace_textuel, joinBefore: s.join_before,
        alinea: mesureAlinea(s.alinea), stropheAvant: marqueStrophe(s.strophe_avant),
      }
    })

    const newGroupes: GroupeData[] = []
    let cur: any = { niv1: '', niv2: '', niv3: '', niv4: '', itemIds: [] as number[] }
    let gi = 0
    segs.forEach((s: any) => {
      const n1v = s.ref_niv1 || '', n2v = s.ref_niv2 || '', n3v = s.ref_niv3 || '', n4v = s.ref_niv4 || ''
      if (n1v !== cur.niv1 || n2v !== cur.niv2 || n3v !== cur.niv3 || n4v !== cur.niv4) {
        if (cur.itemIds.length > 0) newGroupes.push({ ...cur, anchor: `a${gi++}` })
        cur = {
          niv1: n1v, niv2: n2v, niv3: n3v, niv4: n4v,
          niv1_texte: s.ref_niv1_texte || '', niv2_texte: s.ref_niv2_texte || '',
          niv3_texte: s.ref_niv3_texte || '', niv4_texte: s.ref_niv4_texte || '',
          itemIds: [s.id]
        }
      } else cur.itemIds.push(s.id)
    })
    if (cur.itemIds.length > 0) newGroupes.push({ ...cur, anchor: `a${gi}` })

    setGroupesApparat(newGroupes)
    setSegmentsApparat(newSegs)
  }

  const changerNiv1 = async (n1: string, opts?: { forceRefresh?: boolean; conserverPosition?: boolean }) => {
    setNiv1Actif(n1)
    if (lectureTexteEntier) {
      // ⛔ En texte entier, il n'y a PAS de niveau 1 à recharger : le serveur a envoyé
      // l'œuvre d'un seul tenant. `chargerNiv1Data` ne sait rapporter qu'UNE section, et
      // un rafraîchissement forcé la substituait donc à tout le reste — la lecture se
      // repliait sans un mot sur la seule section courante, et le mode paraissait ne
      // plus s'appliquer, jusqu'au prochain rechargement de la page. Le seul équivalent
      // honnête d'un « forceRefresh » est ici de reprendre la page entière.
      if (opts?.forceRefresh) { window.location.reload(); return }
      setSegActif(null)
      setNiv2Actif(null)
      setVue('texte')
      const ancre = groupes.find(g => g.niv1 === n1)?.anchor
      if (ancre) naviguerVersAncre(ancre)
      return
    }
    if (!opts?.conserverPosition) {
      setSegActif(null)
      setNiv2Actif(null)
      setVue('texte')
      setPageActuelle(0)
      pendingScrollTopRef.current = true
    }

    const enCache = !opts?.forceRefresh ? cacheNiv1Ref.current.get(n1) : undefined
    if (enCache) {
      setGroupes(enCache.groupes)
      setSegments(enCache.segments)
      setNiv1Loading(false)
      setNiv1Erreur(null)
    } else {
      setNiv1Loading(true)
      setNiv1Erreur(null)
      try {
        const donnees = await chargerNiv1Data(n1)
        cacheNiv1Ref.current.set(n1, donnees)
        setGroupes(donnees.groupes)
        setSegments(donnees.segments)
      } catch (error) {
        console.error(`Chargement du niveau ${n1} impossible :`, error)
        setNiv1Erreur(n1)
      } finally {
        setNiv1Loading(false)
      }
    }

    // Préchargement discret des niv1 voisins, en tâche de fond
    const idx = niv1List.indexOf(n1)
    ;[niv1List[idx - 1], niv1List[idx + 1]].forEach(voisin => {
      if (voisin && !cacheNiv1Ref.current.has(voisin)) {
        chargerNiv1Data(voisin).then(d => cacheNiv1Ref.current.set(voisin, d)).catch(error => {
          console.error(`Préchargement du niveau ${voisin} impossible :`, error)
        })
      }
    })
  }

  // Complétion en tâche de fond de la première tranche du niv1 initial. Le serveur
  // n'en envoie qu'une tranche (~1000 segments) pour peindre vite les grosses
  // divisions ; on charge ici le reste sans bloquer l'affichage, puis on remplace
  // par le niv1 complet. La tranche serveur est ordonnée par segment_numero (comme
  // `chargerNiv1Data`), donc c'en est un vrai préfixe : pas de saut visible.
  useEffect(() => {
    if (!niv1InitialPartiel) return
    let annule = false
    const n1 = niv1Actif
    ;(async () => {
      try {
        const donnees = await chargerNiv1Data(n1)
        cacheNiv1Ref.current.set(n1, donnees)
        // N'appliquer que si le lecteur est toujours sur ce niv1.
        if (!annule && niv1ActifRef.current === n1) {
          setGroupes(donnees.groupes)
          setSegments(donnees.segments)
        }
      } catch (error) {
        // La tranche initiale reste affichée, mais l'échec n'est pas silencieux.
        console.error(`Complétion du niveau ${n1} impossible :`, error)
      }
    })()
    return () => { annule = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Cf. useMemo groupesFiltres / segmentsFiltres définis plus haut (après `pages`)

  const trad = traductionsBible[tradIndex]?.code ?? 'TR0001'
  const segMap = new Map(segmentsFiltres.map(s => [s.id, s]))
  const segMapApparat = new Map(segmentsApparat.map(s => [s.id, s]))
  const segMapActive = vue === 'texte' ? segMap : segMapApparat

  // Une note appelée dans un TITRE n'est pas toujours définie sur le premier
  // segment de son groupe : dans les imports à notes structurées, son ancre tombe
  // quelques segments plus loin (Discours sur la Genèse : l'appel du chapeau du
  // « Premier discours » est ancré au huitième segment). Le titre cherche donc son
  // appel dans toute la section chargée, à défaut du groupe — sans quoi l'appel
  // paraîtrait avec une note vide.
  const notesSection = useMemo(() => {
    const banque: Record<string, NoteAffichee> = {}
    for (const s of [...segments, ...segmentsApparat]) {
      if (!s.notes) continue
      for (const cle of Object.keys(s.notes)) if (banque[cle] === undefined) banque[cle] = s.notes[cle]
    }
    return banque
  }, [segments, segmentsApparat])

  const notesDuTitre = useCallback(
    (textes: (string | null | undefined)[], locales?: Record<string, NoteAffichee>) =>
      notesPourTexte(textes, [locales, notesSection]),
    [notesSection],
  )
  const segActifData = segActif !== null ? segMapActive.get(segActif) : null
  // idOeuvre vient des Props
  const hasApparat = segmentsApparat.length > 0
  // Le TOC apparat n'inclut que les niv1 qui ne sont PAS dans le sommaire texte :
  // les catéchèses avec des résidus apparat_critique ne doivent pas y apparaître.
  const niv1TexteSetClient = new Set(niv1List)
  const tocApparatLocal = (() => {
    const vus = new Set<string>()
    const out: { niv1: string; anchor: string }[] = []
    groupesApparat.forEach(g => {
      if (g.niv1 && !vus.has(g.niv1) && !niv1TexteSetClient.has(g.niv1)) {
        vus.add(g.niv1)
        out.push({ niv1: g.niv1, anchor: g.anchor })
      }
    })
    return out
  })()

  // Détection session + chargement des segments déjà sauvegardés
  // + traduction biblique par défaut choisie dans Mon compte
  const chargerTraductionDefaut = (uid: string) => {
    supabase.from('profils').select('traduction_defaut').eq('id', uid).maybeSingle().then(({ data }) => {
      if (data?.traduction_defaut) {
        localStorage.setItem('traduction_defaut', data.traduction_defaut)
        const idx = traductionsBible.findIndex(t => t.code === data.traduction_defaut)
        if (idx >= 0) setTradIndex(idx)
      }
    })
  }

  useEffect(() => {
    supabase.from('traductions').select('trad_id, nom').order('ordre', { ascending: true }).then(({ data }) => {
      if (data?.length) setTraductionsBible(data.map((t: any) => ({ code: t.trad_id, label: t.nom })))
    })
  }, [])

  useEffect(() => {
    const code = localStorage.getItem('traduction_defaut')
    if (!code) return
    const idx = traductionsBible.findIndex(t => t.code === code)
    if (idx >= 0) setTradIndex(idx)
  }, [traductionsBible])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const uid = data.session?.user.id ?? null
      setUserId(uid)
      if (uid && idOeuvre) chargerSauvegardesSegs(uid, idOeuvre, idTexte)
      if (uid) chargerTraductionDefaut(uid)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      const uid = session?.user.id ?? null
      setUserId(uid)
      if (uid && idOeuvre) chargerSauvegardesSegs(uid, idOeuvre, idTexte)
      else setSauvegardesSegs(new Set())
      if (uid) chargerTraductionDefaut(uid)
    })
    return () => listener.subscription.unsubscribe()
  }, [idOeuvre, idTexte])

  useEffect(() => {
    if (idOeuvre && oeuvre?.titre) {
      localStorage.setItem('cs_derniere_oeuvre', JSON.stringify({ id: idOeuvre, titre: oeuvre.titre, auteur }))
    }
  }, [idOeuvre, oeuvre?.titre, auteur])

  // Une œuvre peut être signée à plusieurs : « du même auteur » et les traductions
  // sœurs se cherchent alors sur TOUS ses auteurs, et par les couples (œuvre,
  // auteur) — un filtre sur `oeuvres.id_auteur` manquerait les œuvres que l'auteur
  // co-signe sans les ouvrir.
  const idsAuteurs = useMemo(
    () => (auteursOeuvre.length > 0 ? auteursOeuvre.map(a => a.id_auteur) : auteurId ? [auteurId] : []),
    [auteursOeuvre, auteurId],
  )
  const cleAuteurs = idsAuteurs.join(',')

  // Chaque auteur porte son propre nom cliquable : sur une œuvre signée à deux,
  // le lecteur atteint la fiche de l'un ou de l'autre. Repli sur le nom composé
  // (non cliquable) si la liste n'a pas été fournie.
  const auteursCliquables = useMemo(
    () => (auteursOeuvre.length > 0 ? auteursOeuvre : auteurId && auteur ? [{ id_auteur: auteurId, nom: auteur, rang: 1 }] : []),
    [auteursOeuvre, auteurId, auteur],
  )
  const NomsAuteurs = () => (
    <span style={{ minWidth: 0 }}>
      {auteursCliquables.map((a, i) => (
        <Fragment key={a.id_auteur}>
          {i > 0 && separateurAuteurs(i, auteursCliquables.length)}
          <ApercuAuteur auteurId={a.id_auteur} onOuvrirFiche={() => setAuteurModalId(a.id_auteur)}>{a.nom}</ApercuAuteur>
        </Fragment>
      ))}
    </span>
  )

  const [oeuvresDesAuteurs, setOeuvresDesAuteurs] = useState<string[]>([])
  useEffect(() => {
    if (!cleAuteurs) { setOeuvresDesAuteurs([]); return }
    let annule = false
    const ids = cleAuteurs.split(',')
    chargerAuteursParOeuvre(supabase).then(parOeuvre => {
      if (annule) return
      setOeuvresDesAuteurs(Object.entries(parOeuvre)
        .filter(([, auteurs]) => auteurs.some(a => ids.includes(a.id_auteur)))
        .map(([id]) => id))
    })
    return () => { annule = true }
  }, [cleAuteurs])

  useEffect(() => {
    if (!auteurId) return
    const base = supabase.from('oeuvres').select('id_oeuvre, titre, note, trad_auteur, editeur, ville, date_publication, langue_originale, langue_trad')
    // Repli sur le premier auteur tant que les couples ne sont pas chargés (ou
    // s'ils n'ont pas pu l'être) : la liste reste peuplée, simplement sans les
    // co-signatures.
    const requete = oeuvresDesAuteurs.length > 0 ? base.in('id_oeuvre', oeuvresDesAuteurs) : base.eq('id_auteur', auteurId)
    requete
      .neq('id_oeuvre', idOeuvre)
      .then(({ data }) => setOeuvresAuteur(
        ((data ?? []) as any[]).filter(estOeuvrePubliee)
          // Classement alphabétique en écartant l'article/déterminant de tête
          // (« La Cité de Dieu » → à « C »), titre brut en départage.
          .sort((a, b) => cleTriTitre(a.titre).localeCompare(cleTriTitre(b.titre), 'fr')
            || String(a.titre).localeCompare(String(b.titre), 'fr'))
      ))
  }, [auteurId, idOeuvre, oeuvresDesAuteurs])

  // Charge les traductions sœurs (même auteur, même titre normalisé), œuvre courante
  // incluse. S'il y en a plus d'une, le sélecteur de traduction s'affiche.
  useEffect(() => {
    if (!auteurId) return
    const norm = (s: string) => (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
    const cible = norm(oeuvre?.titre || '')
    const base = supabase.from('oeuvres').select('id_oeuvre, titre, trad_auteur, editeur, ville, date_publication, note, langue_originale, langue_trad')
    const requete = oeuvresDesAuteurs.length > 0 ? base.in('id_oeuvre', oeuvresDesAuteurs) : base.eq('id_auteur', auteurId)
    requete
      .order('date_publication', { ascending: true, nullsFirst: true })
      .then(({ data }) => {
        const soeurs = ((data ?? []) as VersionTrad[]).filter(o => norm(o.titre) === cible && estOeuvrePubliee(o))
        setVersions(soeurs)
      })
  }, [auteurId, oeuvre?.titre, oeuvresDesAuteurs])

  // ── Éditions de l'ouvrage et menus de lecture (deux menus) ─────────────────
  // Menu 1 = mode de lecture (LANGUE) ; menu 2 = édition dans cette langue. Une
  // édition en langue ORIGINALE (langue_trad vide, langue_originale renseignée)
  // est le texte original ; les autres sont des traductions. « versions » = les
  // œuvres sœurs (même titre normalisé), langue comprise ; l'œuvre courante en
  // fait partie. Le mode « original » vise l'ŒUVRE latine/grecque AUTONOME quand
  // elle existe (titres d'origine), sinon le texte_original de la traduction (mt=la).
  const estEditionOriginale = (v: { langue_trad: string | null; langue_originale: string | null }) =>
    !(v?.langue_trad && v.langue_trad.trim()) && !!(v?.langue_originale && v.langue_originale.trim())
  const editionCourante = versions.find(v => v.id_oeuvre === idOeuvre) ?? null
  const couranteEstOriginale = editionCourante ? estEditionOriginale(editionCourante)
    : (!!oeuvre.langue_originale && !aTexteOriginal)
  // Une œuvre en langue originale lue POUR ELLE-MÊME (le latin autonome, à ses titres
  // d'origine) a son CORPS en latin ou en grec : il se compose alors comme la colonne
  // originale du bilingue. Sans quoi le corps se déclarait « fr » et « hyphens: auto »
  // coupait le latin avec le dictionnaire français, faute que le navigateur en ait un
  // pour ces langues — c'est justement pourquoi nous posons les césures nous-mêmes.
  const langueCorps = couranteEstOriginale ? codeLangue(oeuvre.langue_originale) : 'fr'
  const composerCorps = (texte: string) => !couranteEstOriginale ? texte
    : estGrec ? cesurerGrec(texte) : cesurerLatin(normaliserEspacesOriginal(texte))
  const editionsTraduction = versions.filter(v => !estEditionOriginale(v))
  const editionsOriginal = versions.filter(estEditionOriginale)
  const langueOrigLabel = editionsOriginal[0]?.langue_originale || oeuvre.langue_originale || 'Latin'
  const origEstGrec = /grec/i.test(langueOrigLabel)
  const labelOrigMenu = origEstGrec ? 'Grec' : 'Latin'
  const labelBilingueMenu = origEstGrec ? 'Français & Grec' : 'Français & Latin'
  const editionFrRef = (!couranteEstOriginale && editionCourante) ? editionCourante : (editionsTraduction[0] ?? null)
  const editionOrigRef = (couranteEstOriginale && editionCourante) ? editionCourante : (editionsOriginal[0] ?? null)
  const aOriginalQuelconque = aTexteOriginal || editionsOriginal.length > 0 || couranteEstOriginale
  const allerAuMode = (cibleOeuvre: string, mt: 'fr' | 'bilingue' | 'la') => {
    if (cibleOeuvre === idOeuvre) basculerTexte(mt)
    else router.push(`/oeuvre/${cibleOeuvre}${mt === 'fr' ? '' : `?mt=${mt}`}`)
  }
  // Cible du mode « original » :
  //  - si l'œuvre courante EST l'original, on la lit elle-même (mt=fr = son texte) ;
  //  - sinon l'œuvre latine/grecque AUTONOME sœur si elle existe (mt=fr, titres d'origine) ;
  //  - sinon le texte_original de la traduction (mt=la).
  const origAutonome = !couranteEstOriginale && !!editionOrigRef && editionOrigRef.id_oeuvre !== editionFrRef?.id_oeuvre
  const cibleOrigOeuvre = couranteEstOriginale ? idOeuvre : origAutonome ? editionOrigRef!.id_oeuvre : (editionFrRef?.id_oeuvre ?? idOeuvre)
  const cibleOrigMt: 'fr' | 'la' = (couranteEstOriginale || origAutonome) ? 'fr' : 'la'
  type ModeLecture = { cle: string; label: string; cibleOeuvre: string; cibleMt: 'fr' | 'bilingue' | 'la'; actif: boolean }
  const modesLecture: ModeLecture[] = []
  if (aOriginalQuelconque && editionFrRef) {
    const surFr = idOeuvre === editionFrRef.id_oeuvre && !couranteEstOriginale
    modesLecture.push({ cle: 'fr', label: 'Français', cibleOeuvre: editionFrRef.id_oeuvre, cibleMt: 'fr',
      actif: surFr && modeTexte === 'fr' })
    modesLecture.push({ cle: 'bilingue', label: labelBilingueMenu, cibleOeuvre: editionFrRef.id_oeuvre, cibleMt: 'bilingue',
      actif: surFr && modeTexte === 'bilingue' })
  }
  if (aOriginalQuelconque && (couranteEstOriginale || editionOrigRef || aTexteOriginal)) {
    const surOrig = idOeuvre === cibleOrigOeuvre && (couranteEstOriginale || (cibleOrigMt === 'la' && modeTexte === 'la'))
    modesLecture.push({ cle: 'orig', label: labelOrigMenu, cibleOeuvre: cibleOrigOeuvre, cibleMt: cibleOrigMt,
      actif: surOrig })
  }
  // Menu 2 — éditions dans la LANGUE du mode courant (masqué si une seule).
  const langueCouranteEstOrig = couranteEstOriginale || (idOeuvre === editionFrRef?.id_oeuvre && modeTexte === 'la')
  const editionsMenu2 = langueCouranteEstOrig ? editionsOriginal : editionsTraduction
  // L’étoile range CE QU’ON LIT. Sur une édition en langue originale autonome, c’est
  // l’œuvre elle-même, qui a son identifiant. Sur une traduction lue en « texte
  // original seul », c’est le texte original, qui n’en a pas : sa référence prend le
  // suffixe « #la » (voir app/lib/refsFavoris.ts). Sans quoi le latin d’une œuvre ne
  // pouvait se mettre en favori qu’en rangeant sa traduction à sa place.
  const favoriEstOriginal = !couranteEstOriginale && modeTexte === 'la'
  const refFavori = favoriEstOriginal ? refFavoriOriginal(idOeuvre) : idOeuvre
  const nomFavori = favoriEstOriginal ? `le texte ${estGrec ? 'grec' : 'latin'}` : null
  const libelleEdition = (v: VersionTrad): string => {
    const edit = [formaterEditeur(v.editeur), v.ville, v.date_publication ? formaterDateHistorique(v.date_publication) : null].filter(Boolean).join(', ')
    if (estEditionOriginale(v)) {
      const lang = /grec/i.test(v.langue_originale || '') ? 'Grec' : 'Latin'
      return [lang, edit && `édition ${edit}`].filter(Boolean).join(' — ')
    }
    const trad = v.trad_auteur ? libelleTrad(v.trad_auteur) : (v.langue_trad || 'Français')
    return [trad, edit && `édition ${edit}`].filter(Boolean).join(', ')
  }

  // « Du même auteur » : la ligne qui DÉPARTAGE deux entrées. Le titre y reste
  // normalisé, comme partout ailleurs, et deux éditions d'un même texte y portaient
  // donc rigoureusement le même intitulé : la liste proposait deux liens que rien ne
  // distinguait, et le lecteur ne pouvait que tirer au sort.
  //
  // On ne reprend pas `libelleEdition` tel quel : il TAIT la langue des traductions,
  // sous-entendue française dans le sélecteur d'édition, où l'on ne compare que des
  // sœurs du même texte. Ici les entrées sont des œuvres différentes, et la langue est
  // justement l'une des trois choses qui les séparent. Elle vient donc en tête, puis le
  // traducteur, puis l'édition.
  const libelleDistinction = (o: OeuvreResumee): string => {
    // Un SEUL séparateur entre les trois rangs, et il est nommé. La première écriture en
    // avait deux : un tiret après la langue d'une édition originale, une virgule après
    // celle d'une traduction, parce que les deux branches composaient leur chaîne chacune
    // de son côté. Rien n'imposait qu'elles s'accordent, et elles ne s'accordaient pas.
    // Les trois rangs sont maintenant assemblés au même endroit, par la même constante.
    //
    // La virgule reste À L'INTÉRIEUR du rang « édition », où elle sépare l'éditeur, la
    // ville et la date : ce sont les parties d'une même mention, non trois rangs.
    const SEP = ' — '
    const edition = [formaterEditeur(o.editeur ?? null), o.ville, o.date_publication ? formaterDateHistorique(o.date_publication) : null].filter(Boolean).join(', ')
    const majuscule = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
    const originale = estEditionOriginale({ langue_trad: o.langue_trad ?? null, langue_originale: o.langue_originale ?? null })
    const langue = originale
      ? (/grec/i.test(o.langue_originale || '') ? 'Grec' : 'Latin')
      : majuscule((o.langue_trad || '').trim() || 'Français')
    // Une édition en langue originale n'a pas de traducteur : si la donnée en porte un,
    // c'est une scorie, et l'afficher ferait passer un texte original pour une traduction.
    const trad = !originale && o.trad_auteur ? libelleTrad(o.trad_auteur) : null
    return [langue, trad, edition].filter(Boolean).join(SEP)
  }

  const chargerSauvegardesSegs = async (uid: string, oeuvreId: string, texteId: string) => {
    const { data } = await supabase
      .from('prelevements')
      .select('segment_id')
      .eq('user_id', uid)
      .eq('type', 'patristique')
      .eq('id_oeuvre', oeuvreId)
      .eq('id_texte', texteId)
    setSauvegardesSegs(new Set(
      (data ?? []).map(row => row.segment_id).filter((value): value is number => typeof value === 'number'),
    ))
  }

  const marquerSauvegardeSeg = (segmentId: number) => {
    setSauvegardesSegs(prev => new Set([...prev, segmentId]))
  }

  // Met à jour l'affichage immédiatement après l'association d'un verset,
  // sans recharger tout le niv1 depuis Supabase.
  const associerVersetLocal = (segId: number) => (_champ: 'lien_1' | 'lien_2' | 'lien_3' | 'lien_4', verset: typeof segments[number]['versets'][number]) => {
    setSegments(prev => prev.map(s => s.id === segId ? { ...s, versets: [...s.versets, verset] } : s))
  }

  // Les liens vivent dans `liens_bibliques` depuis le 20 juillet 2026 (§24.1).
  // Cette fonction réécrivait encore `segments.lien_1` à `lien_4` : ces colonnes
  // subsistent mais sont vides, si bien que le bouton ne supprimait rien — sans
  // la moindre erreur. On supprime désormais les lignes de la table, tous types
  // confondus : le bouton porte sur le verset, pas sur l'un de ses rapports.
  // Supprime en UNE fois tous les liens d'un groupe (un lien fusionné couvre
  // plusieurs versets) : une seule confirmation, une seule requête, une seule
  // mise à jour d'état — au lieu d'une boucle qui rouvrait un confirm() natif et
  // lançait une écriture par verset.
  const supprimerLiensBibliques = async (segId: number, versetIds: string[]) => {
    if (!estAdmin || !versetIds.length) return
    const multiple = versetIds.length > 1
    if (!confirm(multiple ? `Supprimer ces ${versetIds.length} liens bibliques ?` : 'Supprimer ce lien biblique ?')) return
    const { error } = await supabase.from('liens_bibliques')
      .delete().eq('segment_id', segId).in('canon_id', versetIds)
    if (error) { alert('Suppression impossible : ' + error.message); return }
    const aRetirer = new Set(versetIds)
    setSegments(prev => prev.map(s => s.id === segId ? { ...s, versets: s.versets.filter(v => !aRetirer.has(v.id)) } : s))
  }

  // Lettrine (drop cap) du tout premier segment.
  const DROPCAP: React.CSSProperties = { float: 'left', fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: '3.4em', lineHeight: '0.78', paddingRight: '5px', paddingTop: '3px', color: 'var(--cs-encre)', fontWeight: 'normal', userSelect: 'none' }
  const preparerTexteSegment = (texte: string) => idTexte.endsWith('_LEGACY')
    ? nettoyerFin(normaliserEspaces(texte))
    : texte

  // Rend un texte de segment avec sa lettrine (drop cap) sur la première LETTRE.
  // Si le paragraphe s'ouvre sur une ponctuation (guillemet «, tiret…), celle-ci
  // doit rester SOLIDAIRE de la lettrine flottante : rendue à part, un « float »
  // la rejetterait à droite de la lettrine (« [V] « ous… » au lieu de « «V ous… »).
  // On la glisse donc dans le même flottant, en petit corps calé sur le haut.
  const rendreAvecLettrine = (texte: string, notes: Record<string, NoteAffichee>): React.ReactNode => {
    const t = preparerTexteSegment(texte)
    const chars = [...t]
    const li = chars.findIndex(ch => /\p{L}/u.test(ch))
    if (li < 0) return rendreTexteAvecNotes(t, notes)
    const prefix = chars.slice(0, li).join('')
    const lettre = chars[li]
    const suite = chars.slice(li + 1).join('')
    return (
      <>
        <span style={DROPCAP}>
          {prefix && <span style={{ fontSize: '0.34em', verticalAlign: '0.72em', lineHeight: 1, paddingRight: '1px' }}>{rendreTexteAvecNotes(prefix, notes)}</span>}
          {lettre}
        </span>
        {rendreTexteAvecNotes(suite, notes)}
      </>
    )
  }

  // Corps d'un segment : lettrine et citation sortie comprises (charte §3.8,
  // cinquième règle). Le segment est posé dans un <span> partagé avec ses voisins du
  // même paragraphe ; la citation étant TERMINALE par construction
  // (`detecterCitationSortie`), le bloc ferme le segment et les suivants reprennent à
  // la ligne, sans qu'aucun voisin soit coupé en deux.
  const rendreCorpsSegment = (s: SegData, estPremier: boolean): React.ReactNode => {
    const texteAffichage = s.texteAffichage ?? s.texte
    const texte = composerCorps(preparerTexteSegment(texteAffichage))
    // Le numéro de segment est rendu ICI, et non par l'appelant : quand le segment
    // est la citation tout entière, il doit entrer DANS le bloc. Laissé dehors, il
    // se retrouverait seul sur sa ligne, le bloc qui le suit rompant la ligne.
    const numero = configNiveaux.afficherNumeros && !estPremier
      ? <sup style={STYLE_NUMERO_SEGMENT}>{s.numero}</sup>
      : null
    // La lettrine garde la priorité : un premier segment orné ne se sort pas.
    if (estPremier && texte.length > 0) return rendreAvecLettrine(composerCorps(texteAffichage), s.notes ?? {})
    // `sansAnnonce` : réservé à la prose. Une réplique de dialogue est elle aussi
    // entre guillemets et n'est pas une citation d'auteur (Boèce).
    const sortie = detecterCitationSortie(texte, { sansAnnonce: s.nature === 'texte' })
    if (!sortie) return <>{numero}{rendreTexteAvecNotes(texte, s.notes ?? {})}</>
    // Segment entièrement cité : le numéro entre dans le bloc, il n'y a rien d'autre.
    if (!sortie.avant) return <span className="citation-sortie">{numero}{rendreTexteAvecNotes(sortie.citation, s.notes ?? {})}</span>
    return (
      <>
        {numero}
        {rendreTexteAvecNotes(sortie.avant, s.notes ?? {})}
        <span className="citation-sortie">{rendreTexteAvecNotes(sortie.citation, s.notes ?? {})}</span>
      </>
    )
  }

  // Mode paragraphes : découpe les segments d'un groupe en paragraphes (colonne
  // `paragraphe`, charte §6.1), ordonnés en interne par `rang`. Segments
  // consécutifs de même paragraphe → un bloc coulant. Un `paragraphe` nul isole
  // le segment (garde-fou).
  const paragraphesDe = (itemIds: number[], source: Map<number, SegData> = segMap): { ids: number[] }[] => {
    const chunks: { par: number | null | undefined; ids: number[] }[] = []
    for (const sid of itemIds) {
      const par = source.get(sid)?.paragraphe
      const dernier = chunks[chunks.length - 1]
      if (dernier && par != null && dernier.par === par) dernier.ids.push(sid)
      else chunks.push({ par, ids: [sid] })
    }
    for (const c of chunks) c.ids.sort((a, b) => {
      const ra = source.get(a)?.rang, rb = source.get(b)?.rang
      return (ra != null && rb != null) ? ra - rb : 0
    })
    return chunks.map(c => ({ ids: c.ids }))
  }

  // Cellule d'actions flottante d'un segment (mode paragraphes), ancrée sur le
  // segment survolé ou sélectionné.
  // La règle de position vit dans app/lib/celluleActions.ts, avec ses tests : à droite
  // de la ligne, au-dessus si la droite est trop étroite, jamais par-dessus. Elle est
  // partagée par toutes les surfaces de lecture.
  const positionnerToolbar = (el: HTMLElement, sid: number) => {
    if (timerSurvolRef.current) clearTimeout(timerSurvolRef.current)
    const r = el.getBoundingClientRect()
    const largeurEcran = typeof window !== 'undefined' ? window.innerWidth : 1200
    const { top, left } = positionCellule(r, largeurEcran)
    setSegSurvol({ id: sid, top, left })
  }
  const masquerToolbar = (sid: number) => {
    timerSurvolRef.current = setTimeout(() => setSegSurvol(prev => (prev && prev.id === sid ? null : prev)), 200)
  }

  // Tap sur un segment (mode paragraphes). Sur mobile la barre flottante n'a pas de
  // survol pour se refermer : re-taper le segment actif la referme (bascule), au lieu
  // de la repositionner indéfiniment.
  const tapSegmentParagraphe = (el: HTMLElement, sid: number, actif: boolean) => {
    if (actif) { setSegActif(null); if (mobile) setSegSurvol(null) }
    else { setSegActif(sid); positionnerToolbar(el, sid) }
  }
  // Mobile : referme aussi la barre flottante au tap hors barre/segment et au
  // défilement (elle est en position fixe et se détacherait du texte sinon).
  useEffect(() => {
    if (!mobile || !segSurvol) return
    const auTapDehors = (e: Event) => {
      const cible = e.target as Element | null
      if (cible && !cible.closest('[data-seg-toolbar]') && !cible.closest('.seg-inline')) setSegSurvol(null)
    }
    const auDefilement = () => setSegSurvol(null)
    document.addEventListener('pointerdown', auTapDehors, true)
    window.addEventListener('scroll', auDefilement, { passive: true })
    return () => { document.removeEventListener('pointerdown', auTapDehors, true); window.removeEventListener('scroll', auDefilement) }
  }, [mobile, segSurvol])

  return (
    <div style={{ background: 'var(--cs-fond)', minHeight: '100vh' }}>
      <style>{`
        .seg-wrapper { position: relative; }
        .seg-wrapper::after { content: ''; position: absolute; top: 0; right: -44px; width: 44px; height: 100%; pointer-events: none; }
        .seg-p { transition: background 0.12s; }
        .seg-p:hover { background: rgba(var(--cs-vert-rgb),0.05) !important; }
        .seg-actions { opacity: 0; transition: opacity 0.15s; position: relative; z-index: 2; pointer-events: auto; }
        .seg-wrapper:hover .seg-actions { opacity: 1; }
        .seg-wrapper--actif .seg-actions { opacity: 0.5; }
        .seg-wrapper:hover .seg-btn-enreg { opacity: 1 !important; }
        .seg-wrapper .seg-btn-enreg { opacity: 0; }
        .seg-wrapper--actif .seg-btn-enreg { opacity: 0.5; }
        .seg-wrapper:hover .seg-btn-action { opacity: 1 !important; }
        .seg-wrapper .seg-btn-action { opacity: 0; }
        .seg-wrapper--actif .seg-btn-action { opacity: 0.5; }
        /* Segments coulant dans un même bloc, délimités au survol. */
        .seg-inline { border-radius: 4px; padding: 0 0.5px; cursor: pointer; transition: background 0.12s; box-decoration-break: clone; -webkit-box-decoration-break: clone; }
        .seg-inline:hover { background: rgba(var(--cs-vert-rgb),0.09); }
        .seg-inline--actif { background: var(--cs-vert-pale); }
        .para-bilingue { display: grid; grid-template-columns: minmax(0, 1.12fr) minmax(0, 0.88fr); gap: 1.6rem; align-items: start; border-bottom: 1px solid rgba(var(--cs-bord-rgb),0.55); margin-bottom: 0.85rem; }
        .para-bilingue > p { margin-bottom: 0.85rem !important; }
        /* Le texte en langue originale se lit en sérif comme le reste de l'œuvre.
           SEULE exception : mis EN REGARD du français, il passe en sans-serif. La
           différence de police distingue les deux colonnes d'un coup d'œil, mieux
           qu'un filet, et sans peser sur le latin quand il se lit seul. */
        /* Citation sortie (charte §3.8, cinquième règle) : une citation longue,
           isolée et terminale se détache de la prose. Retrait des deux côtés, corps
           légèrement réduit, ni guillemets ni filet — le retrait suffit à la dire.
           Même mesure que la citation d'un essai, pour une seule forme sur le site. */
        /* Le retrait est porté par la marge MOINS le rembourrage, pour que le texte
           cité reste à 8mm tout en laissant la surbrillance déborder autour de lui. */
        .citation-sortie { display: block; margin: 0.5rem calc(8mm - 4px); padding: 0.12rem 4px; font-size: 0.95em; text-align: justify; border-radius: 4px; transition: background 0.12s; }
        @media(max-width: 980px){ .citation-sortie { margin-left: calc(5mm - 4px); margin-right: -4px; } }
        /* ⚠️ En mode paragraphes, le fond de .seg-inline ne peint QUE ses fragments
           en ligne : un enfant en display:block sort de l'inline et resterait sans
           surbrillance. Le survol et la sélection doivent donc l'atteindre à part,
           sans quoi une citation sortie ne se désigne plus au survol comme les autres. */
        .seg-inline:hover .citation-sortie { background: rgba(var(--cs-vert-rgb),0.09); }
        .seg-inline--actif .citation-sortie { background: var(--cs-vert-pale); }
        /* Un segment entièrement cité ne laisse devant son bloc qu'un fragment en
           ligne VIDE. Son rembourrage y peignait au survol un trait vert d'un
           demi-pixel, flottant seul dans la marge au-dessus de la citation. */
        .seg-inline:has(> .citation-sortie:first-child) { padding: 0; }
        .texte-original { color: var(--cs-original); font-family: var(--font-source-serif), Georgia, serif; }
        .para-bilingue > .texte-original { font-family: var(--font-source-sans), Arial, sans-serif; }
        @media(max-width: 980px){
          .seg-wrapper::after { display: none !important; width: 0 !important; right: 0 !important; }
          .titre-colophon{max-width:100%!important;line-height:1.32!important;word-spacing:normal!important;letter-spacing:0!important;}
          .titre-colophon > span{display:inline!important;width:auto!important;max-width:100%!important;}
          .titre-colophon > span:not(:last-child)::after{content:" ";}
          .para-bilingue { grid-template-columns: 1fr; gap: 0.15rem; }
          .para-bilingue > .texte-original { padding-left: 0.85rem; border-left: 2px solid var(--cs-bord); }
        }
        .toc-lien-n1:hover, .toc-lien-n2:hover { color: var(--cs-vert) !important; }
        .ref-lien:hover { color: var(--cs-vert) !important; }
        .onglet-btn { transition: color 0.12s, border-color 0.12s; }
        .onglet-btn:hover { color: var(--cs-vert) !important; }
        .signal-btn:hover { color: var(--cs-danger) !important; }
        .trad-option:hover { background: rgba(var(--cs-vert-rgb),0.06) !important; }
      `}</style>

      <div style={{ display: 'flex', minHeight: '100vh' }}>

        {/* ── NAV GAUCHE ── */}
        {navOuverte ? (
        <>
        {/* Mobile : tiroir par-dessus le texte, sous la navbar. */}
        {mobile && <div onClick={() => setNavOuverte(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.34)', zIndex: 2400 }} />}
        <nav ref={refNav} data-sommaire-panneau style={mobile ? {
          position: 'fixed', top: HAUTEUR_NAVBAR, left: 0, right: 0, zIndex: 2401, maxHeight: `calc(100dvh - ${HAUTEUR_NAVBAR} - 2.5rem)`, overflowY: 'auto', overflowX: 'hidden', background: 'var(--cs-fond-clair)', borderBottom: '1px solid var(--cs-bord)', display: 'flex', flexDirection: 'column', boxShadow: 'var(--cs-ombre-modale)',
        } : { width: navWidth == null ? 'clamp(240px, 16vw, 380px)' : navWidth + 'px', flexShrink: 0, position: 'sticky', top: '3.5rem', alignSelf: 'flex-start', height: 'calc(100vh - 3.5rem)', overflowY: 'auto', overflowX: 'hidden', borderRight: '1px solid var(--cs-bord)', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          {!mobile && <div data-sommaire-poignee onMouseDown={e => {
            e.preventDefault()
            const startW = navWidth ?? refNav.current?.getBoundingClientRect().width ?? 240
            const startX = e.clientX
            const onMove = (ev: MouseEvent) => setNavWidth(Math.max(120, Math.min(400, startW + ev.clientX - startX)))
            const onUp = () => document.removeEventListener('mousemove', onMove)
            document.addEventListener('mousemove', onMove)
            document.addEventListener('mouseup', onUp, { once: true })
          }} style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '5px', cursor: 'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2724%27 height=%2724%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%235f574b%27 stroke-width=%271.7%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Cpath d=%27M8 7L3 12l5 5%27/%3E%3Cpath d=%27M3 12h18%27/%3E%3Cpath d=%27M16 7l5 5-5 5%27/%3E%3C/svg%3E") 12 12, ew-resize', zIndex: 10, background: 'transparent', transition: 'background 0.14s, box-shadow 0.14s' }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(198,184,158,0.08)'
              e.currentTarget.style.boxShadow = 'inset -1px 0 rgba(122,96,64,0.08)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.boxShadow = 'none'
            }}
          />}
          <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid var(--cs-bord)', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <NomsAuteurs />
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                {estAdmin && (
                  <button onClick={() => setConfigOuverte(true)} title="Configurer les niveaux d'affichage"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '3px', color: 'var(--cs-texte-faible)', display: 'flex', alignItems: 'center', lineHeight: 1 }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6"/></svg>
                  </button>
                )}
                {favorisPret && (
                  <EtoileFavori actif={favorisOeuvres.has(refFavori)} onToggle={() => toggleFavoriOeuvre(refFavori)} size={13}
                    title={favorisOeuvres.has(refFavori)
                      ? (nomFavori ? `Retirer ${nomFavori} des favoris` : 'Retirer des favoris')
                      : (nomFavori ? `Ajouter ${nomFavori} aux favoris` : 'Ajouter aux favoris')} />
                )}
                <button onClick={() => setNavOuverte(false)} title="Réduire le sommaire"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '3px', color: 'var(--cs-texte-faible)', display: 'flex', alignItems: 'center' }}>
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M10 4L6 8l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </button>
              </div>
            </div>
            {/* Le sommaire respecte la composition manuelle du titre de catalogue. */}
            <p style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: '0.8125rem', color: 'var(--cs-encre)', lineHeight: 1.35, margin: 0, whiteSpace: 'pre-line' }}>
              {/* Le titre COMPOSÉ (`titre_affichage`) ne vaut que pour la page de titre.
                  Partout ailleurs, ici comme dans la bibliothèque ou le fil d'Ariane,
                  c'est le titre de catalogue qui nomme l'œuvre. */}
              {rendreTexteEnrichi(titreAffiche)}
            </p>
            {(oeuvreAffichee.sous_titre || oeuvreAffichee.titre_original || oeuvreAffichee.trad_auteur || oeuvreAffichee.editeur || oeuvreAffichee.ville || oeuvreAffichee.date_publication || oeuvreAffichee.collection) && (
              <button onClick={() => setInfoEditionOuverte(true)}
                style={{ fontSize: '0.625rem', color: 'var(--cs-texte-faible)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: '6px', textDecoration: 'underline', textUnderlineOffset: '2px' }}>
                En savoir plus sur cette édition
              </button>
            )}
            {/* ── Menu 1 : mode de lecture (LANGUE) ──────────────────────────
                Français / Français & [orig] / [orig]. Le mode dont la cible EST l'œuvre
                courante bascule sur place ; les autres NAVIGUENT vers l'édition voulue
                (le latin autonome à ses titres d'origine).

                Plus de sous-choix « Paragraphes / Segments ». La ligne « Français » se
                divisait en deux au survol pour l'offrir, et un second bloc attendait plus
                bas les œuvres sans texte original, qui n'avaient que ce choix-là à faire.
                Les deux sont partis avec le mode segments, et le menu ne parle donc plus
                que de LANGUE. */}
            {modesLecture.length > 0 && (
              <div style={{ marginTop: '10px' }}>
                <span style={LABEL_VOLET}>Lecture</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', marginTop: '4px' }}>
                  {modesLecture.map(m => (
                    <button key={m.cle} onClick={() => allerAuMode(m.cibleOeuvre, m.cibleMt)} style={{ ...BTN_VOLET(m.actif) }}>{m.label}</button>
                  ))}
                </div>
              </div>
            )}
            {/* ── Menu 2 : édition, dans la LANGUE du mode courant ────────────
                Masqué s'il n'y a qu'une édition dans cette langue. Chaque édition
                est une œuvre sœur ; la choisir y navigue. */}
            {editionsMenu2.length > 1 && (
              <div style={{ marginTop: '7px' }}>
                <span style={{ fontSize: '0.5rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--cs-texte-faible)', display: 'block', marginBottom: '4px' }}>Édition</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {editionsMenu2.map(v => {
                    const actif = v.id_oeuvre === idOeuvre
                    return (
                      <button key={v.id_oeuvre} disabled={actif}
                        onClick={() => { if (!actif) router.push(`/oeuvre/${v.id_oeuvre}`) }}
                        title={actif ? 'Édition affichée' : 'Afficher cette édition'}
                        style={{ textAlign: 'left', fontSize: '0.625rem', lineHeight: 1.32, padding: '4px 8px', borderRadius: '4px', border: `1px solid ${actif ? 'var(--cs-vert)' : 'var(--cs-bord-clair)'}`, background: actif ? 'rgba(var(--cs-vert-rgb),0.07)' : 'transparent', color: actif ? 'var(--cs-encre)' : 'var(--cs-texte-second)', cursor: actif ? 'default' : 'pointer', fontWeight: actif ? 600 : 400, transition: 'border-color 0.12s, background 0.12s' }}>
                        {libelleEdition(v)}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
            {/* Plusieurs versions d'une même œuvre (rare) : sélecteur conservé. */}
            {versionsTextuelles.length > 1 && (
              <div style={{ marginTop: '7px' }}>
                <span style={{ fontSize: '0.5rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--cs-texte-faible)', display: 'block', marginBottom: '4px' }}>Éditions de ce texte</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {versionsTextuelles.map(version => {
                    const actif = version.idTexte === idTexte
                    const indisponible = !actif && version.metadata?.indisponible === true
                    return (
                      <button key={version.idTexte} disabled={actif || indisponible}
                        onClick={() => { if (!actif && !indisponible) router.push(`/oeuvre/${idOeuvre}?texte=${encodeURIComponent(version.idTexte)}`) }}
                        title={actif ? 'Édition affichée' : indisponible ? 'Bientôt disponible (alignement en cours)' : 'Afficher cette édition'}
                        style={{ ...BTN_VOLET(actif), cursor: actif ? 'default' : indisponible ? 'not-allowed' : 'pointer', opacity: indisponible ? 0.45 : 1 }}>
                        {libelleVersionComplet(version)}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>


          {oeuvresAuteur.length > 0 && (
            <div style={{ borderBottom: '1px solid var(--cs-bord)', flexShrink: 0 }}>
              <button onClick={() => setAuteurOuvert(!auteurOuvert)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '10px 16px', textAlign: 'left' }}>
                <span style={{ fontSize: '0.5625rem', fontWeight: 600, letterSpacing: '0.09em', color: 'var(--cs-texte-faible)' }}>DU MÊME AUTEUR</span>
                <span style={{ fontSize: '0.4375rem', color: 'var(--cs-texte-faible)' }}>{auteurOuvert ? '▲' : '▼'}</span>
              </button>
              {auteurOuvert && (
                <div style={{ padding: '0 16px 12px' }}>
                  {oeuvresAuteur.map(o => {
                    const distinction = libelleDistinction(o)
                    return (
                      <a key={o.id_oeuvre} href={`/oeuvre/${o.id_oeuvre}`}
                        style={{ display: 'block', fontSize: '0.6875rem', color: 'var(--cs-texte)', textDecoration: 'none', padding: '4px 0', lineHeight: 1.35, borderBottom: '1px solid var(--cs-fond-doux)' }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--cs-vert)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--cs-texte)')}>
                        {o.titre}
                        {/* La ligne de distinction ne prend PAS la couleur de survol : le lien
                            est le titre, et cette ligne le renseigne. Elle garde donc sa teinte
                            faible, ce qui la tient au second rang même sous le curseur. */}
                        {distinction && (
                          <span style={{ display: 'block', fontSize: '0.625rem', fontStyle: 'italic', color: 'var(--cs-texte-faible)', lineHeight: 1.3, marginTop: '1px' }}>{distinction}</span>
                        )}
                      </a>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Apparat critique + Sommaire — conteneur partagé à hauteur égale */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>

            {!modeComparaisonActif && tocApparatLocal.length > 0 && (
              <div style={{ ...(apparatOuvert ? { flex: '0 1 auto', maxHeight: '50%', minHeight: 0 } : { flexShrink: 0 }), display: 'flex', flexDirection: 'column', borderBottom: '1px solid var(--cs-bord)' }}>
                <button onClick={() => setApparatOuvert(!apparatOuvert)}
                  style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '10px 16px', textAlign: 'left' }}>
                  <span style={{ fontSize: '0.5625rem', fontWeight: 600, letterSpacing: '0.09em', color: 'var(--cs-texte-faible)' }}>APPARAT CRITIQUE</span>
                  <span style={{ fontSize: '0.4375rem', color: 'var(--cs-texte-faible)' }}>{apparatOuvert ? '▲' : '▼'}</span>
                </button>
                {apparatOuvert && (
                  <div style={{ flex: '0 1 auto', overflowY: 'auto', padding: '0 16px 14px' }}>
                    {tocApparatLocal.map((entry, i) => (
                      <div key={i}>
                        <a href={`#${entry.anchor}`} onClick={(e) => { e.preventDefault(); setVue('apparat'); setSegActif(null); setApparatNiv1Actif(entry.niv1); setAncreEnAttente(entry.anchor) }} className="toc-lien-n1"
                          style={{ display: 'block', fontSize: '0.71875rem', fontWeight: apparatNiv1Actif === entry.niv1 ? 600 : 400, color: apparatNiv1Actif === entry.niv1 ? 'var(--cs-vert)' : 'var(--cs-texte)', marginBottom: '2px', lineHeight: 1.35, textDecoration: 'none' }}>
                          {entry.niv1}
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div style={{ ...(sommaireOuvert ? { flex: 1, minHeight: 0 } : { flexShrink: 0 }), display: 'flex', flexDirection: 'column' }}>
              <button onClick={() => setSommaireOuvert(!sommaireOuvert)}
                style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '10px 16px', textAlign: 'left' }}>
                <span style={{ fontSize: '0.5625rem', fontWeight: 600, letterSpacing: '0.09em', color: 'var(--cs-texte-faible)' }}>SOMMAIRE</span>
                <span style={{ fontSize: '0.4375rem', color: 'var(--cs-texte-faible)' }}>{sommaireOuvert ? '▲' : '▼'}</span>
              </button>

              {sommaireOuvert && (
              <div style={{ flex: 1, overflowY: 'auto', padding: '4px 16px 24px' }}>
            <p style={{ display: 'none' }}></p>

            {/* En comparaison, le sommaire liste les Livres → Divisions alignés,
                exactement au gabarit des niveaux 1/2 du texte ; cliquer charge la
                division (comme cliquer un niveau 1 charge sa section). */}
            {modeComparaisonActif && (
              comparaisonDivisions.length === 0 ? (
                <p style={{ fontSize: '0.71875rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic', lineHeight: 1.45, margin: '4px 0 0' }}>Chargement des divisions…</p>
              ) : (
                Array.from(new Set(comparaisonDivisions.map(d => d.book))).map(bk => {
                  const estActif = comparaisonBook === bk
                  const divisionsDuLivre = comparaisonDivisions.filter(d => d.book === bk)
                  const titreLivre = divisionsDuLivre[0]?.niv1 || `LIVRE ${libelleLivreComparaison(bk)}`
                  return (
                    <div key={bk} style={{ marginBottom: '6px' }}>
                      <button onClick={() => divisionsDuLivre[0] && naviguerComparaison(bk, divisionsDuLivre[0].division)}
                        style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '3px 0', fontSize: '0.71875rem', fontWeight: estActif ? 600 : 400, color: estActif ? 'var(--cs-vert)' : 'var(--cs-texte)', lineHeight: 1.35 }}>
                        {titreSansAppelsDeNote(titreLivre)}
                      </button>
                      {estActif && divisionsDuLivre.map(d => {
                        const actif2 = comparaisonDivision === d.division
                        return (
                          <div key={d.division} style={{ borderLeft: actif2 ? '2px solid var(--cs-vert)' : '2px solid transparent', marginBottom: '2px' }}>
                            <button onClick={() => naviguerComparaison(bk, d.division)}
                              style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '3px 0 3px 8px' }}>
                              <span style={{ fontSize: '0.65625rem', color: actif2 ? 'var(--cs-vert)' : 'var(--cs-texte-second)', fontWeight: actif2 ? 600 : 400, display: 'block', lineHeight: 1.3 }}>{titreSansAppelsDeNote(d.niv2 || libelleDivisionComparaison(d.division))}</span>
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  )
                })
              )
            )}

            {!modeComparaisonActif && texteSansNiveaux && (
              <p style={{ fontSize: '0.71875rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic', lineHeight: 1.45, margin: '4px 0 0' }}>
                Texte complet
              </p>
            )}

            {!modeComparaisonActif && !texteSansNiveaux && niv1List.map(n1 => {
              const estActif = vue === 'texte' && n1 === niv1Actif

              return (
                <div key={n1} style={{ marginBottom: profondeurSommaire >= 2 ? '6px' : '0' }}>
                  {/* Niv1 */}
                  <button onClick={() => changerNiv1(n1)}
                    style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '3px 0', fontSize: '0.71875rem', fontWeight: estActif ? 600 : 400, color: estActif ? 'var(--cs-vert)' : 'var(--cs-texte)', lineHeight: 1.35, ...COMPOSITION_INTITULE }}>
                    {titreSansAppelsDeNote(n1 === NIV1_LIMINAIRES ? (niv1TexteMap[n1] || 'Liminaires') : n1)}
                    {n1 !== NIV1_LIMINAIRES && niv1TexteMap[n1] && configNiveaux.txtSommaire[0] && (
                      <span style={{ fontSize: '0.59375rem', color: estActif ? 'var(--cs-vert)' : 'var(--cs-texte-doux)', fontStyle: 'italic', display: 'block', lineHeight: 1.3, marginTop: '1px', ...COMPOSITION_INTITULE }}>{titreSansAppelsDeNote(niv1TexteMap[n1])}</span>
                    )}
                  </button>

                  {/* Niv2 — affiché si profondeur >= 2 ET niv1 actif */}
                  {profondeurSommaire >= 2 && estActif && niv2List.map(n2 => {
                    const g2 = groupes.find(g => (!lectureTexteEntier || g.niv1 === n1) && g.niv2 === n2)
                    const n2txt = g2?.niv2_texte || ''
                    const actif2 = vue === 'texte' && niv2Actif === n2
                    // Niv3 distincts pour ce niv2
                    const niv3DeN2 = profondeurSommaire >= 3
                      ? Array.from(new Set(groupes.filter(g => (!lectureTexteEntier || g.niv1 === n1) && g.niv2 === n2 && g.niv3).map(g => g.niv3)))
                      : []
                    return (
                      <div key={n2} style={{ borderLeft: actif2 ? '2px solid var(--cs-vert)' : '2px solid transparent', marginBottom: '2px' }}>
                        {/* Bouton niv2 */}
                        <button
                          onClick={() => allerAuNiv2(actif2 ? null : n2)}
                          style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '3px 0 3px 8px' }}>
                          <span style={{ fontSize: '0.65625rem', color: actif2 ? 'var(--cs-vert)' : 'var(--cs-texte-second)', fontWeight: actif2 ? 600 : 400, display: 'block', lineHeight: 1.3, ...COMPOSITION_INTITULE }}>{titreSansAppelsDeNote(n2)}</span>
                          {n2txt && configNiveaux.txtSommaire[1] && <span style={{ fontSize: '0.59375rem', color: actif2 ? 'var(--cs-vert)' : 'var(--cs-texte-doux)', fontStyle: 'italic', display: 'block', lineHeight: 1.3, marginTop: '1px', ...COMPOSITION_INTITULE }}>{titreSansAppelsDeNote(n2txt)}</span>}
                        </button>
                        {/* Niv3 — toujours visible, sans accordéon */}
                        {niv3DeN2.map(n3 => {
                          const g3 = groupes.find(g => (!lectureTexteEntier || g.niv1 === n1) && g.niv2 === n2 && g.niv3 === n3)
                          const n3txt = g3?.niv3_texte || ''
                          const ancre = groupes.find(g => (!lectureTexteEntier || g.niv1 === n1) && g.niv2 === n2 && g.niv3 === n3)?.anchor
                          return (
                            <button key={n3}
                              onClick={() => {
                                setVue('texte')
                                if (ancre) naviguerVersAncre(ancre)
                              }}
                              style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0 2px 16px' }}>
                              <span style={{ fontSize: '0.59375rem', color: 'var(--cs-texte-doux)', display: 'block', lineHeight: 1.3, ...COMPOSITION_INTITULE }}>{titreSansAppelsDeNote(n3)}</span>
                              {n3txt && configNiveaux.txtSommaire[2] && <span style={{ fontSize: '0.5625rem', color: 'var(--cs-texte-faible)', fontStyle: 'italic', display: 'block', lineHeight: 1.2, ...COMPOSITION_INTITULE }}>{titreSansAppelsDeNote(n3txt)}</span>}
                            </button>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
              )}
            </div>
          </div>
        </nav>
        </>
        ) : mobile ? (
          <button onClick={() => setNavOuverte(true)} title="Ouvrir le sommaire"
            style={{ position: 'fixed', top: HAUTEUR_NAVBAR, left: 0, right: 0, zIndex: 1200, width: '100%', background: 'var(--cs-fond-clair)', border: 'none', borderBottom: '1px solid var(--cs-bord)', boxShadow: 'var(--cs-ombre-posee)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '9px', padding: '0.6875rem 1rem' }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ transform: 'rotate(90deg)', color: 'var(--cs-texte-doux)' }}><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span style={{ fontSize: '0.8125rem', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600, color: 'var(--cs-texte-second)' }}>Sommaire</span>
          </button>
        ) : (
          <button onClick={() => setNavOuverte(true)} title="Ouvrir le sommaire"
            style={{ position: 'sticky', top: '3.5rem', alignSelf: 'flex-start', flexShrink: 0, height: 'calc(100vh - 3.5rem)', width: '22px', background: 'var(--cs-fond-clair)', border: 'none', borderRight: '1px solid var(--cs-bord)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: 0 }}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0 }}><path d="M3 1l4 4-4 4" stroke="#9a958d" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span style={{ writingMode: 'vertical-rl' as any, transform: 'rotate(180deg)', fontSize: '0.5rem', letterSpacing: '0.13em', textTransform: 'uppercase' as any, fontWeight: 600, color: 'var(--cs-texte-faible)', userSelect: 'none' }}>Sommaire</span>
          </button>
        )}

        {/* ── TEXTE CENTRAL ── */}
        <main lang="fr" style={{ flex: 1, minWidth: 0, padding: mobile ? '2.875rem 14px 3.75rem' : '0 14px 80px', position: 'relative', overflow: 'visible' }}><div style={{ maxWidth: modeComparaisonActif ? '52rem' : '35rem', margin: '0 auto', position: 'relative', overflow: 'visible' }}>
          {/* Frontispice IDENTIQUE à la lecture (même en Traductions parallèles). En
              comparaison, `sansGouttiere` centre le titre sur toute la largeur (pas de
              colonne d'actions à compenser). Les deux traductions comparées sont
              nommées en tête de colonnes plus bas. */}
          <PageTitre auteur={auteur} oeuvre={oeuvreLocale} versionActive={versionActive} titre={titreAffiche} estAdmin={estAdmin} mobile={mobile} sansGouttiere={modeComparaisonActif}
            notes={notesDuTitre([oeuvreLocale.titre_affichage, titreAffiche, oeuvreLocale.sous_titre, oeuvreLocale.titre_original])}
            onModifier={(champ, va) => setEditionCible({
              type: 'titre_oeuvre', champ, texteActuel: va,
              // Le titre a deux colonnes, et la page de titre montre la seconde dès
              // qu'elle est renseignée : on laisse donc choisir celle qu'on modifie,
              // au lieu d'écrire dans l'une pendant que l'écran affiche l'autre.
              variantes: champ === 'titre' ? [
                { champ: 'titre', libelle: 'Titre de catalogue', texte: titreAffiche,
                  aide: 'Le nom de l’œuvre : bibliothèque, recherche, citations, fil d’Ariane. Il s’écrit d’un seul tenant.' },
                { champ: 'titre_affichage', libelle: 'Titre composé', texte: oeuvreLocale.titre_affichage ?? '',
                  aide: 'La composition du seul frontispice, sauts de ligne compris. Renseignée, c’est elle qui paraît ici, à la place du titre de catalogue.' },
              ] : undefined,
            })} />

          {/* Fleuron (feuille de vigne) séparant la page de titre du niveau 1,
              à la place du long filet. En comparaison, pas de gouttière d'actions :
              le fleuron se centre sur toute la largeur des deux colonnes. */}
          <div style={{ display: 'flex', justifyContent: 'center', margin: '40px 0 44px', paddingRight: modeComparaisonActif ? undefined : gouttiereTitre }}>
            <FeuilleVigne />
          </div>

          {/* Barre de circulation de la comparaison — jumelle de « barre-nav-niv1 » :
              flèches ‹ › et titre « Livre — Division » centré, serif. */}
          {vue === 'texte' && modeComparaisonActif && alignementActif && (() => {
            const prev = divisionVoisine(comparaisonDivisions, comparaisonBook, comparaisonDivision, -1)
            const next = divisionVoisine(comparaisonDivisions, comparaisonBook, comparaisonDivision, 1)
            const courante = comparaisonDivisions.find(d => d.book === comparaisonBook && d.division === comparaisonDivision)
            // Les intitulés alignés viennent des segments de la traduction de
            // référence, sans la banque de notes qui les accompagne en lecture :
            // l'appel y serait muet, on le masque comme au sommaire.
            const titreLivre = titreSansAppelsDeNote(courante?.niv1 || `LIVRE ${libelleLivreComparaison(comparaisonBook)}`)
            const titreDivision = titreSansAppelsDeNote(courante?.niv2 || libelleDivisionComparaison(comparaisonDivision))
            return (
              <div id="barre-nav-division" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--cs-fond-doux)', minHeight: '32px', scrollMarginTop: `calc(${HAUTEUR_NAVBAR} + 4px)` }}>
                <button onClick={() => prev && naviguerComparaison(prev.book, prev.division)} disabled={!prev} aria-label="Division précédente"
                  style={{ flexShrink: 0, width: '1.1em', textAlign: 'center', fontSize: '1.125rem', lineHeight: 1, color: prev ? 'var(--cs-texte-doux)' : 'transparent', background: 'none', border: 'none', cursor: prev ? 'pointer' : 'default', padding: 0, pointerEvents: prev ? 'auto' : 'none' }}>
                  {prev ? '‹' : ''}
                </button>
                <span style={{ fontSize: '1.4375rem', fontWeight: 500, color: 'var(--cs-encre)', fontFamily: "var(--font-source-serif), Georgia, serif", textAlign: 'center', minWidth: 0, lineHeight: 1.3 }}>
                  {titreLivre}
                  <span style={{ display: 'block', fontSize: '0.9375rem', fontWeight: 400, color: 'var(--cs-texte-second)', fontStyle: 'italic', marginTop: '4px', fontFamily: "var(--font-source-serif), Georgia, serif" }}>{titreDivision}</span>
                </span>
                <button onClick={() => next && naviguerComparaison(next.book, next.division)} disabled={!next} aria-label="Division suivante"
                  style={{ flexShrink: 0, width: '1.1em', textAlign: 'center', fontSize: '1.125rem', lineHeight: 1, color: next ? 'var(--cs-texte-doux)' : 'transparent', background: 'none', border: 'none', cursor: next ? 'pointer' : 'default', padding: 0, pointerEvents: next ? 'auto' : 'none' }}>
                  {next ? '›' : ''}
                </button>
              </div>
            )
          })()}

          {/* Navigation précédent/suivant — toujours au niveau 1 */}
          {vue === 'texte' && !modeComparaisonActif && !texteSansNiveaux && !lectureTexteEntier && (
            <div id="barre-nav-niv1" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', marginBottom: '1.5rem', paddingBottom: '1rem', paddingRight: gouttiereTitre, borderBottom: '1px solid var(--cs-fond-doux)', minHeight: '32px', scrollMarginTop: `calc(${HAUTEUR_NAVBAR} + 4px)` }}>
              <button onClick={() => niv1Prev && changerNiv1(niv1Prev, { conserverPosition: true })} disabled={!niv1Prev}
                style={{ flexShrink: 0, width: '1.1em', textAlign: 'center', fontSize: '1.125rem', lineHeight: 1, color: niv1Prev ? 'var(--cs-texte-doux)' : 'transparent', background: 'none', border: 'none', cursor: niv1Prev ? 'pointer' : 'default', padding: 0, pointerEvents: niv1Prev ? 'auto' : 'none' }}>
                {niv1Prev ? '‹' : ''}
              </button>
              <span style={{ fontSize: '1.4375rem', fontWeight: 500, color: 'var(--cs-encre)', fontFamily: "var(--font-source-serif), Georgia, serif", textAlign: 'center', minWidth: 0, lineHeight: 1.3, whiteSpace: 'pre-line', overflowWrap: 'break-word', position: 'relative' }}>
                {niv1Erreur ? (
                  <span style={{ fontSize: '0.75rem', color: 'var(--cs-danger)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    Erreur de chargement.{' '}
                    <button onClick={() => changerNiv1(niv1Erreur, { forceRefresh: true })}
                      style={{ fontSize: '0.6875rem', padding: '2px 8px', borderRadius: '4px', border: '1px solid var(--cs-danger-bord)', background: 'var(--cs-surface)', color: 'var(--cs-danger)', cursor: 'pointer' }}>
                      Réessayer
                    </button>
                  </span>
                ) : niv1Loading ? <span style={{ fontSize: '0.8125rem', color: 'var(--cs-texte-faible)' }}>Chargement…</span> : (
                  <>
                    {(() => {
                      const intitule = niv1Actif === NIV1_LIMINAIRES ? (niv1TexteMap[niv1Actif] || 'Liminaires') : niv1Actif
                      return rendreTitreColophonAvecNotes(
                        intitule,
                        notesDuTitre([intitule], segMap.get(groupes[0]?.itemIds[0] ?? -1)?.notes),
                        true,
                        'titre',
                      )
                    })()}
                    {(() => {
                      const txt = groupes[0]?.niv1_texte || niv1TexteMap[niv1Actif] || ''
                      const notesTitre = notesDuTitre([txt], segMap.get(groupes[0]?.itemIds[0] ?? -1)?.notes)
                      return txt && configNiveaux.txtCorps[0]
                        ? <span style={{ display: 'block', fontSize: '0.9375rem', fontWeight: 400, color: 'var(--cs-texte-second)', fontStyle: 'italic', marginTop: '4px', fontFamily: "var(--font-source-serif), Georgia, serif" }}>{rendreTexteAvecNotes(preparerTitreColophon(txt), notesTitre)}</span>
                        : null
                    })()}
                    {estAdmin && niv1Actif !== NIV1_LIMINAIRES && (() => { const g = groupes[0] ?? { niv1: niv1Actif, niv2: '', niv3: '', niv4: '', anchor: '', itemIds: [] }; return (
                      <div style={{ position: 'absolute', right: '-52px', top: '2px', display: 'flex', gap: '3px', alignItems: 'center' }}>
                        <button onClick={() => setEditionCible({ type: 'titre', niveau: 1, groupe: g, texteActuel: niv1Actif, schemaTexte: false })}
                          title="Modifier le titre" style={{ fontSize: '0.8125rem', color: 'var(--cs-texte-faible)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px', lineHeight: 1 }}><IconeCrayon size={12} /></button>
                        <button onClick={() => setEditionCible({ type: 'titre', niveau: 1, groupe: g, texteActuel: g.niv1_texte ?? '', schemaTexte: true })}
                          title="Modifier le sous-titre" style={{ fontSize: '0.625rem', color: 'var(--cs-bord)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px', lineHeight: 1, fontStyle: 'italic' }}><IconeCrayon size={12} /></button>
                      </div>
                    )})()}
                  </>
                )}
              </span>
              <button onClick={() => niv1Next && changerNiv1(niv1Next, { conserverPosition: true })} disabled={!niv1Next}
                style={{ flexShrink: 0, width: '1.1em', textAlign: 'center', fontSize: '1.125rem', lineHeight: 1, color: niv1Next ? 'var(--cs-texte-doux)' : 'transparent', background: 'none', border: 'none', cursor: niv1Next ? 'pointer' : 'default', padding: 0, pointerEvents: niv1Next ? 'auto' : 'none' }}>
                {niv1Next ? '›' : ''}
              </button>
            </div>
          )}

          {/* Vue texte principal */}
          {vue === 'texte' && modeComparaisonActif && alignementActif ? (
            <ComparaisonTraductions key={`${alignementActif.alignmentSetId}:${comparaisonBook}:${comparaisonDivision}`} alignement={alignementActif} estAdmin={estAdmin} book={comparaisonBook} division={comparaisonDivision} userId={userId} auteur={auteur} />
          ) : vue === 'texte' && (() => {
            let dniv1 = pageActuelle > 0 ? (pages[pageActuelle - 1]?.at(-1)?.niv1 ?? '') : ''
            let dniv2 = '', dniv3 = '', dniv4 = ''
            let isFirstGroupe = true
            // Introductions (arguments) hissées en tête de l'homélie, hors des groupes
            // et de la pagination : police plus petite et plus claire, marges latérales.
            // Rendues depuis l'état complet des segments, et seulement sur la 1re page.
            const intros = pageActuelle === 0 ? segments.filter(s => s.nature === 'introduction') : []
            return (<>
              {intros.map((s, index) => {
                const suivant = intros[index + 1]
                const memeParagraphe = suivant?.paragraphe != null && suivant.paragraphe === s.paragraphe
                return (
                <div key={`intro-${s.id}`} className="seg-wrapper" style={{ position: 'relative', margin: `0 0 ${memeParagraphe ? '0.18rem' : '0.55rem'}` }}>
                  <div lang={langueCorps} onClick={() => setSegActif(segActif === s.id ? null : s.id)} className="seg-p"
                    style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: '0.75rem', fontStyle: 'italic', color: 'var(--cs-texte-second)', lineHeight: 1.6, textAlign: 'justify', textJustify: 'inter-word', hyphens: 'auto', WebkitHyphens: 'auto', cursor: 'pointer', borderRadius: '4px', padding: '2px 6px', margin: 0, background: segActif === s.id ? 'var(--cs-vert-pale)' : 'transparent' } as React.CSSProperties}>
                    {rendreTexteAvecNotes(composerCorps(preparerTexteSegment(s.texteAffichage ?? s.texte)), s.notes ?? {})}
                  </div>
                  <div className="seg-actions" style={{ position: 'absolute', top: '2px', right: '2px', display: 'flex', gap: '2px', alignItems: 'center', background: 'var(--cs-surface)', border: '1px solid var(--cs-bord-clair)', borderRadius: '8px', boxShadow: 'var(--cs-ombre-nette)', padding: '2px 4px' }}>
                    {userId && <BoutonEnregistrerSegment seg={s} auteur={auteur} titreOeuvre={oeuvre.titre} idOeuvre={idOeuvre} userId={userId} dejaSauvegarde={sauvegardesSegs.has(s.id)} onSauvegarde={() => marquerSauvegardeSeg(s.id)} />}
                    <BoutonCopieSegment texte={texteSansEnrichissement(s.texte)} auteur={auteur} titre={oeuvreAffichee.titre} sousTitre={oeuvreAffichee.sous_titre} tradAuteur={oeuvreAffichee.trad_auteur} editeur={oeuvreAffichee.editeur} collection={oeuvreAffichee.collection} ville={oeuvreAffichee.ville} datePublication={oeuvreAffichee.date_publication} />
                    <BoutonSignalerSegment segId={s.id} texteObjet={texteSansEnrichissement(s.texte)} titreOeuvre={oeuvre.titre} />
                  </div>
                </div>
                )
              })}
              {groupesFiltres.map((groupe) => {
              const itemsReels = groupe.itemIds.filter(id => segMap.get(id)?.nature !== 'introduction')
              if (itemsReels.length === 0) return null
              const notesTitre = notesDuTitre(
                [groupe.niv1, groupe.niv1_texte, groupe.niv2, groupe.niv2_texte, groupe.niv3, groupe.niv3_texte, groupe.niv4, groupe.niv4_texte],
                segMap.get(itemsReels[0])?.notes,
              )
              const showNiv1 = lectureTexteEntier && profondeurCorps >= 1 && groupe.niv1 && groupe.niv1 !== dniv1
              const showNiv2 = profondeurCorps >= 2 && groupe.niv2 && groupe.niv2 !== dniv2
              const showNiv3 = profondeurCorps >= 3 && groupe.niv3 && groupe.niv3 !== dniv3
              const showNiv4 = profondeurCorps >= 4 && groupe.niv4 && groupe.niv4 !== dniv4
              if (showNiv1) {
                dniv1 = groupe.niv1
                dniv2 = ''
                dniv3 = ''
                dniv4 = ''
              }
              if (showNiv2) dniv2 = groupe.niv2
              if (showNiv3) dniv3 = groupe.niv3
              if (showNiv4) dniv4 = groupe.niv4
              const marginTop = isFirstGroupe ? '0' : showNiv1 ? '2.8rem' : showNiv2 ? '2.5rem' : showNiv3 ? '1.5rem' : '0.8rem'
              if (isFirstGroupe) isFirstGroupe = false
              return (
                <div key={groupe.anchor} id={groupe.anchor} style={{ scrollMarginTop: `calc(${HAUTEUR_NAVBAR} + 4px)` }}>
                  {showNiv1 && (
                    <div style={{ textAlign: 'center', marginTop, marginBottom: '1.5rem', paddingTop: '0.5rem', paddingRight: gouttiereTitre, position: 'relative' }}>
                      <h2 style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: '1.4375rem', fontWeight: 500, color: 'var(--cs-encre)', lineHeight: 1.3, margin: 0, whiteSpace: 'pre-line' }}>{rendreTitreColophonAvecNotes(groupe.niv1, notesTitre, true, 'titre')}</h2>
                      {groupe.niv1_texte && configNiveaux.txtCorps[0] && <p style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: '0.9375rem', fontWeight: 400, color: 'var(--cs-texte-second)', fontStyle: 'italic', lineHeight: 1.4, margin: '5px 0 0', whiteSpace: 'pre-line' }}>{rendreTexteAvecNotes(preparerTitreColophon(groupe.niv1_texte), notesTitre)}</p>}
                    </div>
                  )}
                  {showNiv2 && (
                    <div style={{ textAlign: 'center', marginTop: marginTop, marginBottom: '1rem', paddingTop: '0.5rem', paddingRight: gouttiereTitre, position: 'relative' }}>
                      <h3 style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: '1.125rem', fontWeight: 400, color: 'var(--cs-encre)', lineHeight: 1.3, margin: 0, letterSpacing: '0.01em', whiteSpace: 'pre-line' }}>{rendreTitreColophonAvecNotes(groupe.niv2, notesTitre, true, 'titre')}</h3>
                      {groupe.niv2_texte && configNiveaux.txtCorps[1] && <p style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: '0.9375rem', fontWeight: 400, color: 'var(--cs-texte-second)', fontStyle: 'italic', lineHeight: 1.4, margin: '5px 0 0', whiteSpace: 'pre-line' }}>{rendreTitreColophonAvecNotes(groupe.niv2_texte, notesTitre)}</p>}
                      {estAdmin && (
                        <div style={{ position: 'absolute', right: '52px', top: '0.5rem', display: 'flex', gap: '3px', alignItems: 'center' }}>
                          <button onClick={() => setEditionCible({ type: 'titre', niveau: 2, groupe, texteActuel: groupe.niv2, schemaTexte: false })}
                            title="Modifier le titre" style={{ fontSize: '0.6875rem', color: 'var(--cs-texte-faible)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}><IconeCrayon size={12} /></button>
                          <button onClick={() => setEditionCible({ type: 'titre', niveau: 2, groupe, texteActuel: groupe.niv2_texte ?? '', schemaTexte: true })}
                            title="Modifier le sous-titre" style={{ fontSize: '0.5625rem', color: 'var(--cs-bord)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px', fontStyle: 'italic' }}><IconeCrayon size={12} /></button>
                        </div>
                      )}
                    </div>
                  )}
                  {showNiv3 && (
                    <div style={{ marginTop: isFirstGroupe ? '0' : '1rem', marginBottom: '0.4rem', paddingLeft: '11px', borderLeft: '1px solid var(--cs-bord)', position: 'relative', paddingRight: estAdmin ? '44px' : 0 }}>
                      <p style={{ fontSize: '0.78125rem', fontWeight: 600, color: 'var(--cs-texte)', lineHeight: 1.3, margin: 0, letterSpacing: '0.02em', whiteSpace: 'pre-line', textAlign: groupe.niv3.length >= SEUIL_TITRE_COLOPHON ? 'center' : undefined }}>{rendreTitreColophonAvecNotes(groupe.niv3, notesTitre, true)}</p>
                      {groupe.niv3_texte && configNiveaux.txtCorps[2] && <p style={{ fontSize: '0.75rem', fontStyle: 'italic', color: 'var(--cs-texte-doux)', lineHeight: 1.3, margin: '2px 0 0', whiteSpace: 'pre-line' }}>{rendreTitreColophonAvecNotes(groupe.niv3_texte, notesTitre)}</p>}
                      {estAdmin && (
                        <div style={{ position: 'absolute', right: 0, top: 0, display: 'flex', gap: '3px', alignItems: 'center' }}>
                          <button onClick={() => setEditionCible({ type: 'titre', niveau: 3, groupe, texteActuel: groupe.niv3, schemaTexte: false })}
                            title="Modifier le titre" style={{ fontSize: '0.625rem', color: 'var(--cs-texte-faible)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}><IconeCrayon size={12} /></button>
                          <button onClick={() => setEditionCible({ type: 'titre', niveau: 3, groupe, texteActuel: groupe.niv3_texte ?? '', schemaTexte: true })}
                            title="Modifier le sous-titre" style={{ fontSize: '0.5625rem', color: 'var(--cs-bord)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px', fontStyle: 'italic' }}><IconeCrayon size={12} /></button>
                        </div>
                      )}
                    </div>
                  )}
                  {showNiv4 && (
                    <p style={{ fontSize: '0.71875rem', fontWeight: 600, color: 'var(--cs-texte-faible)', letterSpacing: '0.10em', textTransform: 'uppercase', marginBottom: '0.25rem', marginTop: '0.5rem', position: 'relative', paddingRight: estAdmin ? '44px' : 0, whiteSpace: 'pre-line' }}>
                      {rendreTitreColophonAvecNotes(groupe.niv4, notesTitre, true)}
                      {groupe.niv4_texte && configNiveaux.txtCorps[3] && <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, marginLeft: '6px', fontStyle: 'italic' }}>{rendreTitreColophonAvecNotes(groupe.niv4_texte, notesTitre)}</span>}
                      {estAdmin && (
                        <span style={{ position: 'absolute', right: 0, top: 0, display: 'inline-flex', gap: '3px', alignItems: 'center', textTransform: 'none' }}>
                          <button onClick={() => setEditionCible({ type: 'titre', niveau: 4, groupe, texteActuel: groupe.niv4, schemaTexte: false })}
                            title="Modifier le titre" style={{ fontSize: '0.5625rem', color: 'var(--cs-texte-faible)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px', letterSpacing: 0 }}><IconeCrayon size={12} /></button>
                          <button onClick={() => setEditionCible({ type: 'titre', niveau: 4, groupe, texteActuel: groupe.niv4_texte ?? '', schemaTexte: true })}
                            title="Modifier le sous-titre" style={{ fontSize: '0.5rem', color: 'var(--cs-bord)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px', fontStyle: 'italic', letterSpacing: 0 }}><IconeCrayon size={12} /></button>
                        </span>
                      )}
                    </p>
                  )}
                  {/* ⚠️ On refait le POÈME avant de composer. Le découpage par
                      `paragraphe` est juste pour de la prose et faux pour des vers :
                      Ceriziers laisse `paragraphe` à 1 sur ses 1 213 vers, Mirandol y
                      range une strophe de douze. Sans fusion, la même œuvre se
                      composait en un bloc par poème d'un côté et un bloc par strophe
                      de l'autre. Un bloc qui porte un texte ORIGINAL n'est jamais
                      fondu : la grille bilingue apparie un original par bloc. */}
                  {fusionnerBlocs(
                    paragraphesDe(itemsReels),
                    ids => ids.every(sid => {
                      const s = segMap.get(sid)
                      return s?.nature === 'vers' && !s?.texteOriginal?.trim()
                    }),
                  ).map((chunk) => {
                    const original = chunk.ids.map(sid => segMap.get(sid)).find(s => Boolean(s?.texteOriginal?.trim()))
                    const toutRubrique = chunk.ids.every(sid => segMap.get(sid)?.nature === 'rubrique')
                    // Bloc de signatures : composé au fer à droite, interligne resserré.
                    const toutSignature = chunk.ids.every(sid => segMap.get(sid)?.nature === 'signature')
                    // Strophe : un poème ne se compose pas comme de la prose. Toute la
                    // règle vit dans `app/lib/compositionVers.ts`, que les traductions
                    // parallèles emploient aussi — une seule composition, deux surfaces.
                    const toutVers = chunk.ids.every(sid => segMap.get(sid)?.nature === 'vers')
                    return (
                    <div key={`para-${chunk.ids[0]}`} className={affichageBilingue && original ? 'para-bilingue' : undefined}
                      /* Réserve la MÊME gouttière d'actions (~60px) que le mode segments, pour que
                         la largeur du texte (et de la grille bilingue) s'aligne sur les titres et
                         la page de titre. */
                      style={{ paddingRight: gouttiereTitre }}>
                      {toutVers ? (
                        /* ⛔ Une ligne de vers est une BOÎTE, jamais un fragment en ligne.
                           Un seul `<p>` ne peut pas rentrer chaque ligne : `text-indent`
                           ne s'applique qu'à la PREMIÈRE ligne d'un bloc, et jamais après
                           un saut forcé. D'où une boîte par vers — et le retrait de suite
                           qui distingue une ligne trop longue du vers d'après.
                           Ni justification ni césure : on ne coupe pas un alexandrin. */
                        <div lang={langueCorps} style={{ display: afficherOriginalSeul ? 'none' : undefined, fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '0.8125rem', color: 'var(--cs-texte-fort)', margin: '0 0 0.72rem', wordSpacing: '-0.025em', letterSpacing: 0 }}>
                          {(() => {
                            const rangs = niveauxAlinea(chunk.ids.map(sid => segMap.get(sid)?.alinea))
                            return chunk.ids.map((sid, i) => {
                              const s = segMap.get(sid)
                              if (!s) return null
                              const actif = segActif === sid
                              const estPremier = sid === premierSegmentId
                              const strophe = ouvreStrophe(
                                { strophe_avant: s.stropheAvant, paragraphe: s.paragraphe },
                                i > 0 ? segMap.get(chunk.ids[i - 1]) : undefined,
                              )
                              return (
                                <span key={sid} style={{ display: 'block', lineHeight: 1.4, marginTop: strophe ? '0.6rem' : 0, marginLeft: `${retraitVers(rangs[i])}em`, paddingLeft: `${RETRAIT_SUITE}em`, textIndent: `-${RETRAIT_SUITE}em`, hyphens: 'none', WebkitHyphens: 'none' } as React.CSSProperties}>
                                  <span id={`segment-${sid}`} className={`seg-inline${actif ? ' seg-inline--actif' : ''}`} style={{ scrollMarginTop: `calc(${HAUTEUR_NAVBAR} + 4px)` }}
                                    onClick={(e) => tapSegmentParagraphe(e.currentTarget as HTMLElement, sid, actif)}
                                    onMouseEnter={mobile ? undefined : (e) => positionnerToolbar(e.currentTarget as HTMLElement, sid)}
                                    onMouseLeave={mobile ? undefined : () => masquerToolbar(sid)}>
                                    {rendreCorpsSegment(s, estPremier)}
                                  </span>
                                </span>
                              )
                            })
                          })()}
                        </div>
                      ) : (
                      <p lang={langueCorps} style={{ display: afficherOriginalSeul ? 'none' : undefined, fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '0.8125rem', color: 'var(--cs-texte-fort)', lineHeight: toutSignature ? '1.32' : '1.62', textAlign: toutSignature ? 'right' : toutRubrique ? 'center' : 'justify', textJustify: 'inter-word', fontStyle: toutRubrique ? 'italic' : undefined, margin: toutSignature ? '0 0 0.3rem' : '0 0 0.72rem', wordSpacing: '-0.025em', letterSpacing: 0, hyphens: 'auto', WebkitHyphens: 'auto', overflowWrap: 'break-word', whiteSpace: 'pre-line' } as React.CSSProperties}>
                        {chunk.ids.map((sid, i) => {
                          const s = segMap.get(sid)
                          if (!s) return null
                          const actif = segActif === sid
                          const estPremier = sid === premierSegmentId
                          return (
                            <Fragment key={sid}>
                              {i > 0 ? (s.joinBefore ?? ' ') : null}
                              <span id={`segment-${sid}`} className={`seg-inline${actif ? ' seg-inline--actif' : ''}`} style={{ scrollMarginTop: `calc(${HAUTEUR_NAVBAR} + 4px)` }}
                                onClick={(e) => tapSegmentParagraphe(e.currentTarget as HTMLElement, sid, actif)}
                                onMouseEnter={mobile ? undefined : (e) => positionnerToolbar(e.currentTarget as HTMLElement, sid)}
                                onMouseLeave={mobile ? undefined : () => masquerToolbar(sid)}>
                                {rendreCorpsSegment(s, estPremier)}
                              </span>
                            </Fragment>
                          )
                        })}
                      </p>
                      )}
                      {(affichageBilingue || afficherOriginalSeul) && original?.texteOriginal && (
                        // En « Latin/Grec seul », l'original occupe seul la colonne, au gabarit du
                        // français (mêmes taille et teinte). La langue de l'original commande la
                        // césure (latine ou grecque) et l'attribut `lang` : un texte grec composé
                        // avec le syllabateur latin coupait faux et se déclarait à tort « la ».
                        <p lang={codeLangue(oeuvre.langue_originale)} className="texte-original" style={{ fontSize: afficherOriginalSeul ? '0.82rem' : '0.79rem', color: afficherOriginalSeul ? 'var(--cs-texte-fort)' : undefined, lineHeight: afficherOriginalSeul ? '1.62' : '1.58', textAlign: 'justify', textJustify: 'inter-word', margin: '0 0 0.72rem', wordSpacing: estGrec ? '-0.01em' : '-0.025em', letterSpacing: 0, hyphens: 'auto', WebkitHyphens: 'auto', overflowWrap: 'break-word', whiteSpace: 'pre-line' } as React.CSSProperties}>
                          {rendreTexteAvecNotes(estGrec ? cesurerGrec(original.texteOriginal) : cesurerLatin(normaliserEspacesOriginal(original.texteOriginal)), original.notes ?? {})}
                        </p>
                      )}
                    </div>
                    )
                  })}
                </div>
              )
            })}
            </>)
          })()}

          {/* Navigation de pages — bas de page */}
          {vue === 'texte' && !modeComparaisonActif && pages.length > 1 && (
            <NavPages pages={pages} pageActuelle={pageActuelle} setPageActuelle={setPageActuelle} bas />
          )}

          {/* Vue apparat critique */}
          {/* ⛔ Les titres de l'apparat se centrent sur le CORPS DU TEXTE, comme ceux du
              texte suivi, et non sur toute la largeur du bloc. Ils ne le faisaient pas : le
              frontispice, le fleuron, les titres de niveau 1 et 2 du texte et les paragraphes
              de l'apparat lui-même portent tous `paddingRight: gouttiereTitre`, qui retranche
              la colonne des boutons d'action (~60px à droite) avant de centrer. Les deux
              titres de l'apparat étaient les seuls à l'ignorer : ils se centraient donc sur un
              axe décalé de trente pixels vers la droite par rapport à tout ce qui les
              entourait, y compris la page de titre posée juste au-dessus d'eux.

              ⛔ Ils s'écrivent aussi dans la même ENCRE, `--cs-encre`, qui tire sur le vert.
              Ils portaient `--cs-texte-fort` au rang 1 et `--cs-texte` au rang 2, deux noirs
              neutres : trois encres différentes se partageaient donc les titres d'une même
              œuvre selon la vue où on les lisait, alors qu'un apparat critique n'est pas un
              autre livre. Un titre de rang 1 doit se reconnaître comme tel des deux côtés. */}
          {vue === 'apparat' && (() => {
            let dniv1 = '', dniv2 = ''
            let isFirst = true
            return (
              <>
                {groupesApparat.map((groupe) => {
                  // Les sections qui ont du texte dans le sommaire ne sont pas
                  // affichées ici — leurs résidus apparat_critique sont filtrés.
                  if (niv1TexteSetClient.has(groupe.niv1)) return null
                  const showNiv1 = groupe.niv1 && groupe.niv1 !== dniv1
                  if (showNiv1) { dniv1 = groupe.niv1; dniv2 = '' }
                  const showNiv2 = groupe.niv2 && groupe.niv2 !== dniv2
                  if (showNiv2) dniv2 = groupe.niv2
                  const notesTitre = notesDuTitre(
                    [groupe.niv1, groupe.niv1_texte, groupe.niv2, groupe.niv2_texte],
                    segMapApparat.get(groupe.itemIds[0])?.notes,
                  )
                  // Même valeur qu'au niveau 1 du texte suivi : l'apparat prenait 2,5rem
                  // quand le texte en prend 2,8, écart que rien ne justifiait.
                  const marginTop = isFirst ? '0' : '2.8rem'
                  if (isFirst) isFirst = false
                  return (
                    <div key={groupe.anchor} id={groupe.anchor} style={{ scrollMarginTop: `calc(${HAUTEUR_NAVBAR} + 4px)` }}>
                      {showNiv1 && (
                        // Mise en page reprise TELLE QUELLE du niveau 1 du texte suivi : le
                        // centrage porté par le bloc et non par chaque ligne, un demi-rem de
                        // respiration en tête, et surtout 1,5rem sous le titre au lieu de 0,5.
                        // Ce demi-rem collait « Avis au lecteur » à son premier paragraphe,
                        // alors que le même titre, dans le texte, en est détaché de trois fois
                        // plus. Un titre a besoin d'un blanc au moins égal à son propre corps
                        // pour cesser de faire partie de ce qui le suit.
                        <div style={{ textAlign: 'center', marginTop, marginBottom: '1.5rem', paddingTop: '0.5rem', paddingRight: gouttiereTitre, position: 'relative' }}>
                          <h2 style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: '1.4375rem', fontWeight: 500, color: 'var(--cs-encre)', lineHeight: 1.3, margin: 0, whiteSpace: 'pre-line' }}>{rendreTitreColophonAvecNotes(groupe.niv1, notesTitre, true, 'titre')}</h2>
                          {groupe.niv1_texte && <p style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: '0.9375rem', fontWeight: 400, color: 'var(--cs-texte-second)', fontStyle: 'italic', lineHeight: 1.4, margin: '5px 0 0', whiteSpace: 'pre-line' }}>{rendreTitreColophonAvecNotes(groupe.niv1_texte, notesTitre)}</p>}
                          {estAdmin && (
                            <button onClick={() => setEditionCible({ type: 'titre', niveau: 1, groupe, texteActuel: groupe.niv1_texte || groupe.niv1, schemaTexte: true })}
                              title="Modifier ce titre (admin)" style={{ position: 'absolute', right: 0, top: 0, fontSize: '0.6875rem', color: 'var(--cs-texte-faible)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}><IconeCrayon size={12} /></button>
                          )}
                        </div>
                      )}
                      {showNiv2 && (
                        <div style={{ margin: showNiv1 ? '1rem 0 0.6rem' : '2rem 0 0.6rem', textAlign: 'center', paddingRight: gouttiereTitre }}>
                          <h3 style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: '1.0625rem', fontWeight: 500, color: 'var(--cs-encre)', lineHeight: 1.3, margin: 0, whiteSpace: 'pre-line' }}>{rendreTitreColophonAvecNotes(groupe.niv2, notesTitre, true, 'titre')}</h3>
                          {groupe.niv2_texte && <p style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: '0.9375rem', fontWeight: 400, color: 'var(--cs-texte-second)', fontStyle: 'italic', lineHeight: 1.4, margin: '5px 0 0', whiteSpace: 'pre-line' }}>{rendreTitreColophonAvecNotes(groupe.niv2_texte, notesTitre)}</p>}
                        </div>
                      )}
                      {paragraphesDe(groupe.itemIds, segMapApparat).map(chunk => (
                        <div key={`apparat-para-${chunk.ids[0]}`} style={{ paddingRight: gouttiereTitre }}>
                          <p lang={langueCorps} style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '0.8125rem', color: 'var(--cs-texte-fort)', lineHeight: '1.62', textAlign: 'justify', textJustify: 'inter-word', margin: '0 0 0.72rem', wordSpacing: '-0.025em', letterSpacing: 0, hyphens: 'auto', WebkitHyphens: 'auto', overflowWrap: 'break-word', whiteSpace: 'pre-line' } as React.CSSProperties}>
                            {chunk.ids.map((sid, i) => {
                              const s = segMapApparat.get(sid)
                              if (!s) return null
                              const actif = segActif === sid
                              return (
                                <Fragment key={sid}>
                                  {i > 0 ? (s.joinBefore ?? ' ') : null}
                                  <span id={`segment-${sid}`} className={`seg-inline${actif ? ' seg-inline--actif' : ''}`} style={{ scrollMarginTop: `calc(${HAUTEUR_NAVBAR} + 4px)` }}
                                    onClick={(e) => tapSegmentParagraphe(e.currentTarget as HTMLElement, sid, actif)}
                                    onMouseEnter={mobile ? undefined : (e) => positionnerToolbar(e.currentTarget as HTMLElement, sid)}
                                    onMouseLeave={mobile ? undefined : () => masquerToolbar(sid)}>
                                    {configNiveaux.afficherNumeros && <sup style={STYLE_NUMERO_SEGMENT}>{s.numero}</sup>}
                                    {rendreTexteAvecNotes(composerCorps(preparerTexteSegment(s.texteAffichage ?? s.texte)), s.notes ?? {})}
                                  </span>
                                </Fragment>
                              )
                            })}
                          </p>
                        </div>
                      ))}
                    </div>
                  )
                })}
              </>
            )
          })()}
        </div></main>

        {/* ── PANNEAU DROIT ── */}
        {panneauOuvert ? (
        <>
        {/* Mobile : tiroir montant du bas, par-dessus le texte. */}
        {mobile && <div onClick={() => setPanneauOuvert(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.34)', zIndex: 2400 }} />}
        <aside ref={refAside} style={mobile ? {
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 2401, maxHeight: `calc(100dvh - ${HAUTEUR_NAVBAR} - 2rem)`, borderTop: '1px solid var(--cs-bord)', display: 'flex', flexDirection: 'column', background: 'var(--cs-surface)', boxShadow: 'var(--cs-ombre-modale-haut)',
        } : { width: pannWidth == null ? 'clamp(280px, 21vw, 480px)' : pannWidth + 'px', flexShrink: 0, position: 'sticky', top: '3.5rem', alignSelf: 'flex-start', height: 'calc(100vh - 3.5rem)', borderLeft: '1px solid var(--cs-bord)', display: 'flex', flexDirection: 'column', background: 'var(--cs-surface)' }}>
          <div onMouseDown={e => {
            e.preventDefault()
            const startW = pannWidth ?? refAside.current?.getBoundingClientRect().width ?? 320
            const startX = e.clientX
            const onMove = (ev: MouseEvent) => setPannWidth(Math.max(200, Math.min(560, startW - (ev.clientX - startX))))
            const onUp = () => document.removeEventListener('mousemove', onMove)
            document.addEventListener('mousemove', onMove)
            document.addEventListener('mouseup', onUp, { once: true })
          }} style={{ position: 'absolute', left: '-4px', top: 0, bottom: 0, width: '9px', cursor: 'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2724%27 height=%2724%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%235f574b%27 stroke-width=%271.7%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3E%3Cpath d=%27M8 7L3 12l5 5%27/%3E%3Cpath d=%27M3 12h18%27/%3E%3Cpath d=%27M16 7l5 5-5 5%27/%3E%3C/svg%3E") 12 12, ew-resize', zIndex: 10, background: 'transparent', transition: 'background 0.14s, box-shadow 0.14s' }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(198,184,158,0.08)'
              e.currentTarget.style.boxShadow = 'inset 1px 0 rgba(122,96,64,0.08)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.boxShadow = 'none'
            }}
          />

          <div style={{ position: 'relative', borderBottom: '1px solid var(--cs-bord)', flexShrink: 0, display: 'flex', alignItems: 'stretch' }}>
            <button onClick={() => setPanneauOuvert(false)} title="Réduire le panneau"
              style={{ position: 'absolute', left: 0, top: 0, bottom: 0, zIndex: 1, padding: '0 6px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cs-texte-faible)', display: 'flex', alignItems: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <div style={{ display: 'flex', flex: 1 }}>
              {(['refs', 'commentaires'] as const).map((key, idx) => {
                const labels = { refs: 'Bible', commentaires: 'Commentaires' }
                const actif = ongletDroit === key
                return (
                  <Fragment key={key}>
                    {idx > 0 && (
                      <span style={{ width: '1px', background: 'var(--cs-bord-clair)', alignSelf: 'center', height: '16px', flexShrink: 0 }} />
                    )}
                    <button onClick={() => setOngletDroit(key)} className="onglet-btn"
                      style={{ flex: 1, padding: '11px 4px 10px', background: 'transparent', borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderBottom: actif ? '2px solid var(--cs-vert-aplat)' : '2px solid transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 0 }}>
                      <span style={{ fontSize: '0.78125rem', fontWeight: actif ? 600 : 400, color: actif ? 'var(--cs-vert)' : 'var(--cs-texte-second)', whiteSpace: 'nowrap' }}>{labels[key]}</span>
                    </button>
                  </Fragment>
                )
              })}
            </div>
          </div>

          <div style={ongletDroit === 'commentaires'
            ? { flex: 1, minHeight: 0, overflow: 'hidden', padding: '0 12px', display: 'flex', flexDirection: 'column' }
            : { flex: 1, overflowY: 'auto', padding: '0 12px 16px' }}>
            {ongletDroit === 'refs' ? (
              <>
                {/* Sélecteur traduction */}
                <div ref={tradSelectRef} style={{ padding: '10px 0 8px', borderBottom: '1px solid var(--cs-fond-doux)', marginBottom: '10px', position: 'relative' }}>
                  {/* Sélecteur de traduction remis dans le style général du site : libellé en
                      capitales espacées grises + contrôle sobre à bord neutre (au lieu de la
                      pilule verte). Le vert ne sert plus qu'à l'option active et au focus. */}
                  <p style={{ fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--cs-texte-doux)', margin: '0 0 4px' }}>Traduction</p>
                  <button onClick={() => setTradOuverte(!tradOuverte)}
                    style={{ display: 'flex', alignItems: 'center', gap: '7px', width: '100%', padding: '5px 10px', borderRadius: '4px', border: `1px solid ${tradOuverte ? 'var(--cs-vert)' : 'var(--cs-bord)'}`, background: 'var(--cs-surface)', fontSize: '0.65625rem', color: 'var(--cs-encre)', cursor: 'pointer', transition: 'border-color 0.12s' }}>
                    <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>{traductionsBible[tradIndex]?.label ?? trad}</span>
                    <svg width="9" height="9" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0, color: 'var(--cs-texte-doux)', transform: tradOuverte ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}><path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </button>
                  {tradOuverte && (
                    <div style={{ position: 'absolute', top: 'calc(100% - 2px)', left: 0, right: 0, background: 'var(--cs-surface)', border: '1px solid var(--cs-bord)', borderRadius: '8px', zIndex: 50, boxShadow: 'var(--cs-ombre-flottante)', overflow: 'hidden' }}>
                      {traductionsBible.map((t, i) => (
                        <button key={t.code} onClick={() => { setTradIndex(i); setTradOuverte(false) }} className="trad-option"
                          style={{ width: '100%', textAlign: 'left', padding: '6px 10px', fontSize: '0.65625rem', borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderBottom: i < traductionsBible.length - 1 ? '1px solid var(--cs-fond-doux)' : 'none', background: tradIndex === i ? 'var(--cs-fond)' : 'var(--cs-surface)', color: tradIndex === i ? 'var(--cs-vert)' : 'var(--cs-texte)', fontWeight: tradIndex === i ? 600 : 400, cursor: 'pointer' }}>
                          {t.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Références du segment actif */}
                {segActifData ? (
                  <>
                    {segActifData.versets.length === 0 ? (
                      <p style={{ fontSize: '0.71875rem', fontStyle: 'italic', color: 'var(--cs-texte-doux)' }}>Aucun lien biblique pour ce passage.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {regrouperVersetsConsecutifs(segActifData.versets).map(groupe => {
                          const premier = groupe[0]
                          const dernier = groupe[groupe.length - 1]
                          const multiple = groupe.length > 1
                          // Versets réunis : label en fourchette (« Gn 1, 1-3 ») et corps mis à la suite.
                          const labelGroupe = multiple
                            ? `${premier.label.replace(/\d+\s*$/, '')}${premier.verset}-${dernier.verset}`
                            : premier.label
                          // Le verset est montré SEUL, hors de son contexte, et hérite donc d'une
                          // ponctuation qui désigne un texte absent. Deux remèdes, de sens opposé.
                          //
                          // Le guillemet orphelin s'AJOUTE : une citation qui court sur plusieurs
                          // versets se borne des deux côtés (app/lib/guillemets.ts), car on sait de
                          // quel côté manque le signe. Le tiret d'incise, lui, se RETRANCHE quand il
                          // touche un bord (app/lib/tirets.ts) : il sépare l'extrait de ce qu'on ne
                          // montre pas, et on ne va pas inventer le segment auquel il renvoie.
                          //
                          // Les deux se font APRÈS la fusion du groupe, qui peut s'équilibrer de
                          // lui-même ; et les tirets d'abord, sans quoi le bornage viendrait poser
                          // son guillemet derrière un tiret qui doit partir.
                          const corps = bornerGuillemets(effacerTiretsDeBordure(groupe
                            .map(v => extraireNoteVerset(v.textes[trad] || v.textes['TR0001'] || '').corps)
                            .filter(Boolean)
                            .join(' ')))
                          // La note éditoriale n'est portée que par un verset seul (sinon on fond
                          // simplement les corps).
                          const note = multiple ? null : extraireNoteVerset(premier.textes[trad] || premier.textes['TR0001'] || '').note
                          const natures = Array.from(new Set(groupe.flatMap(v => (v as any).natures ?? []))) as string[]
                          // Objet synthétique pour les actions (copie/enregistrement) sur le groupe :
                          // textes fondus par traduction, label en fourchette.
                          const versetAction: any = multiple
                            ? { ...premier, label: labelGroupe, textes: Object.fromEntries(Object.keys(premier.textes).map(code => [code, groupe.map(v => (v.textes as any)[code] || '').filter(Boolean).join(' ')])) }
                            : premier
                          const key = groupe.map(v => v.id).join('_')
                          return (
                            <div key={key}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: note ? '2px' : '4px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0 }}>
                                  <a href={`/?livre=${encodeURIComponent(premier.livre)}&chapitre=${encodeURIComponent(premier.chapitre)}&verset=${encodeURIComponent(premier.verset)}&trad=${encodeURIComponent(trad)}`} target="_blank" rel="noopener noreferrer" className="ref-lien" style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--cs-vert)', margin: 0, textDecoration: 'none' }}>{labelGroupe}</a>
                                  {/* La nature du rapport, dite sans peser : le lecteur
                                      voit la référence d'abord, et peut savoir à quel
                                      titre elle est là s'il y prend garde. */}
                                  {natures.length > 0 && (
                                    <span style={{ fontSize: '0.59375rem', color: 'var(--cs-texte-faible)', fontStyle: 'italic', whiteSpace: 'nowrap' }}>
                                      {natures.join(' · ')}
                                    </span>
                                  )}
                                  {estAdmin && (
                                    <button onClick={() => supprimerLiensBibliques(segActifData.id, groupe.map(v => v.id))} title="Supprimer ce lien biblique"
                                      style={{ fontSize: '0.59375rem', color: 'var(--cs-danger)', background: 'none', border: 'none', cursor: 'pointer', padding: '1px 0', lineHeight: 1.1, fontWeight: 600, whiteSpace: 'nowrap' }}>
                                      {multiple ? 'Supprimer les liens' : 'Supprimer le lien'}
                                    </button>
                                  )}
                                </div>
                                <div style={{ display: 'flex', gap: '1px', alignItems: 'center' }}>
                                  <BoutonEnregistrerVerset verset={versetAction} trad={trad} userId={userId} />
                                  <BoutonCopieVerset texte={corps} label={labelGroupe} />
                                  <BoutonSignalerVerset versetId={premier.id} label={labelGroupe} texte={corps} segmentId={segActifData.id} />
                                </div>
                              </div>
                              {note && (
                                <p style={{ fontSize: '0.625rem', fontStyle: 'italic', color: 'var(--cs-etiquette)', margin: '0 0 3px', lineHeight: 1.3 }}>
                                  ↳ {note}
                                </p>
                              )}
                              {/* Texte du/des verset(s) réuni(s) : SANS SÉRIF, même mise en forme que les
                                  citations patristiques du panneau Bible — justifié, wordSpacing serré,
                                  césure. Enrichissement (« <i> » de Sacy) rendu. */}
                              <p lang="fr" style={{ fontSize: '0.6875rem', lineHeight: '1.38', color: 'var(--cs-texte-fort)', textAlign: 'justify', textJustify: 'inter-word', wordSpacing: '-0.08em', hyphens: 'auto', WebkitHyphens: 'auto', overflowWrap: 'break-word', margin: '0 0 4px' } as React.CSSProperties}>
                                {corps ? rendreTexteEnrichi(corps) : '—'}
                              </p>
                            </div>
                          )
                        })}
                      </div>
                    )}
                    {estAdmin
                      ? <AssocierVerset segId={segActifData.id} onAssocie={associerVersetLocal(segActifData.id)} />
                      : userId && <ProposerLienBiblique segId={segActifData.id} />
                    }
                  </>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '40px' }}>
                    {/* Cul-de-lampe (buisson ardent), puis l'invite dessous. `multiply` fond le
                        fond blanc du dessin dans le papier. Le PNG porte un blanc interne en bas :
                        on remonte le texte (marge négative) pour qu'il se pose sous le DESSIN, non
                        sous le rectangle de l'image — l'ensemble reste ainsi équilibré. */}
                    <img className="cs-ornement" src="/ornements/cul-de-lampe-buisson-ardent.png" alt="" aria-hidden="true"
                      style={{ width: '82%', maxWidth: '11.875rem', height: 'auto', opacity: 0.42, mixBlendMode: 'multiply' }} />
                    <p style={{ fontSize: '0.71875rem', fontStyle: 'italic', color: 'var(--cs-texte-doux)', textAlign: 'center', margin: '-30px 0 0' }}>Cliquez sur un paragraphe.</p>
                  </div>
                )}
              </>
            ) : (
              <div style={{ flex: 1, minHeight: 0, paddingTop: '14px', display: 'flex', flexDirection: 'column' }}>
                <OngletCommentaires segActif={segActif} estAdmin={estAdmin} />
              </div>
            )}
          </div>

        </aside>
        </>
        ) : mobile ? (
          <button onClick={() => setPanneauOuvert(true)} title="Ouvrir le panneau de références"
            style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1200, width: '100%', background: 'var(--cs-surface)', border: 'none', borderTop: '1px solid var(--cs-bord)', boxShadow: 'var(--cs-ombre-posee-haut)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '9px', padding: '0.6875rem 1rem' }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ transform: 'rotate(-90deg)', color: 'var(--cs-texte-doux)' }}><path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span style={{ fontSize: '0.8125rem', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600, color: 'var(--cs-texte-second)' }}>Références &amp; commentaires</span>
          </button>
        ) : (
          <button onClick={() => setPanneauOuvert(true)} title="Ouvrir le panneau de références"
            style={{ position: 'sticky', top: '3.5rem', alignSelf: 'flex-start', flexShrink: 0, height: 'calc(100vh - 3.5rem)', width: '22px', background: 'var(--cs-surface)', border: 'none', borderLeft: '1px solid var(--cs-bord)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: 0 }}>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0 }}><path d="M7 1l-4 4 4 4" stroke="#9a958d" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            <span style={{ writingMode: 'vertical-rl' as any, fontSize: '0.5rem', letterSpacing: '0.13em', textTransform: 'uppercase' as any, fontWeight: 600, color: 'var(--cs-texte-faible)', userSelect: 'none' }}>Commentaires et références bibliques</span>
          </button>
        )}
      </div>

      {/* Mode paragraphes : cellule d'actions flottante du segment survolé/sélectionné. */}
      {segSurvol && vue === 'texte' && typeof document !== 'undefined' && (() => {
        const s = segMap.get(segSurvol.id)
        if (!s) return null
        return createPortal(
          <div data-seg-toolbar="" onMouseEnter={() => { if (timerSurvolRef.current) clearTimeout(timerSurvolRef.current) }}
            onMouseLeave={() => masquerToolbar(segSurvol.id)}
            style={{ position: 'fixed', top: segSurvol.top, left: segSurvol.left, zIndex: 1500, display: 'flex', gap: '2px', alignItems: 'center', background: 'var(--cs-surface)', border: '1px solid var(--cs-bord-clair)', borderRadius: '8px', boxShadow: 'var(--cs-ombre-flottante)', padding: '2px 4px' }}>
            {userId && <BoutonEnregistrerSegment seg={s} auteur={auteur} titreOeuvre={oeuvre.titre} idOeuvre={idOeuvre} userId={userId} dejaSauvegarde={sauvegardesSegs.has(s.id)} onSauvegarde={() => marquerSauvegardeSeg(s.id)} />}
            <BoutonCopieSegment texte={texteSansEnrichissement(s.texte)} auteur={auteur} titre={oeuvreAffichee.titre} sousTitre={oeuvreAffichee.sous_titre} tradAuteur={oeuvreAffichee.trad_auteur} editeur={oeuvreAffichee.editeur} collection={oeuvreAffichee.collection} ville={oeuvreAffichee.ville} datePublication={oeuvreAffichee.date_publication} />
            <BoutonSignalerSegment segId={s.id} texteObjet={texteSansEnrichissement(s.texte)} titreOeuvre={oeuvre.titre} />
            {estAdmin && (
              <button onClick={() => setEditionCible({ type: 'segment', seg: s })} title="Modifier ce segment (admin)" aria-label="Modifier ce segment"
                style={{ ...BTN_STYLE, color: 'var(--cs-bord)' }}><IconeCrayon size={12} /></button>
            )}
          </div>,
          document.body
        )
      })()}


      {infoEditionOuverte && typeof document !== 'undefined' && createPortal(
        /* ⛔ `top: 48` traînait ici, en pixels : la barre mesure 56px à la racine 16 mais
            77 à la racine 22, si bien que sur un grand écran ce voile remontait de vingt et
            un pixels DERRIÈRE elle (charte, § Responsive). Composé sur HAUTEUR_NAVBAR, il
            la suit. */
        <div style={{ position: 'fixed', top: HAUTEUR_NAVBAR, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.35)', zIndex: 1200, display: 'flex', padding: '20px', overflowY: 'auto' }}
          onClick={() => setInfoEditionOuverte(false)}>
          <div onClick={e => e.stopPropagation()} style={{ margin: 'auto', background: 'var(--cs-surface)', borderRadius: '8px', padding: '18px 22px', width: '33.75rem', maxWidth: '100%', boxShadow: 'var(--cs-ombre-modale)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '14px' }}>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: '0.53125rem', fontWeight: 700, letterSpacing: '0.12em', color: 'var(--cs-vert)', margin: '0 0 5px', textTransform: 'uppercase' }}>À propos de cette édition</p>
                {/* Auteur ET titre sur la même ligne ; chaque auteur ouvre sa fiche. */}
                <p style={{ margin: 0, lineHeight: 1.28 }}>
                  {auteursCliquables.length > 0 ? (
                    auteursCliquables.map((a, i) => (
                      <Fragment key={a.id_auteur}>
                        {i > 0 && <span style={{ fontSize: '0.75rem', color: 'var(--cs-texte-second)' }}>{separateurAuteurs(i, auteursCliquables.length)}</span>}
                        <button onClick={() => setAuteurModalId(a.id_auteur)} title="Voir la fiche de l’auteur"
                          style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--cs-vert)', background: 'none', border: 'none', padding: 0, cursor: 'pointer', letterSpacing: '0.02em' }}>{a.nom}</button>
                      </Fragment>
                    ))
                  ) : (
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--cs-vert)', letterSpacing: '0.02em' }}>{auteur}</span>
                  )}
                  <span style={{ margin: '0 3px' }}> </span>
                  <span style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: '0.875rem', color: 'var(--cs-encre)' }}>{rendreTexteEnrichi(titreAffiche)}</span>
                </p>
                {oeuvreLocale.sous_titre && (
                  <p style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: '0.71875rem', color: 'var(--cs-texte-gris)', fontStyle: 'italic', lineHeight: 1.3, margin: '3px 0 0' }}>{oeuvreLocale.sous_titre}</p>
                )}
              </div>
              <button onClick={() => setInfoEditionOuverte(false)} style={{ fontSize: '1rem', color: 'var(--cs-texte-faible)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1, flexShrink: 0 }}>✕</button>
            </div>

            {/* Deux colonnes distinctes : texte original / édition de référence. */}
            {(() => {
              const aOriginal = !!(oeuvreLocale.titre_original || oeuvreLocale.date_composition || oeuvreLocale.langue_originale || (oeuvreLocale.genres && oeuvreLocale.genres.length))
              const aEdition = !!(oeuvreAffichee.trad_auteur || oeuvreAffichee.trad_date || oeuvreAffichee.editeur || oeuvreAffichee.ville || oeuvreAffichee.date_publication || oeuvreAffichee.collection || oeuvreAffichee.commentaire_traduction?.trim() || versionActive?.editionDescription || versionActive?.sourceUrl)
              if (!aOriginal && !aEdition) return null
              const carte: React.CSSProperties = { background: 'var(--cs-fond-clair)', border: '1px solid var(--cs-vert-pale)', borderLeft: '2.5px solid var(--cs-vert-clair)', borderRadius: '8px', padding: '11px 13px' }
              const legende: React.CSSProperties = { fontSize: '0.53125rem', fontWeight: 700, letterSpacing: '0.10em', color: 'var(--cs-vert)', margin: '0 0 8px', textTransform: 'uppercase' }
              const cle: React.CSSProperties = { fontSize: '0.53125rem', color: 'var(--cs-texte-faible)', display: 'block', marginBottom: '-3px', lineHeight: 0.95 }
              const val: React.CSSProperties = { fontSize: '0.71875rem', color: 'var(--cs-texte)', lineHeight: 1.15 }
              return (
                <div style={{ display: 'grid', gridTemplateColumns: (aOriginal && aEdition) ? 'minmax(0,1fr) minmax(0,1fr)' : '1fr', gap: '10px', marginBottom: '12px' }}>
                  {aOriginal && (
                    <div style={carte}>
                      <p style={legende}>Texte original</p>
                      {oeuvreLocale.titre_original && <div style={{ marginBottom: '6px' }}><span style={cle}>Titre</span><span style={{ ...val, fontStyle: 'italic' }}>{oeuvreLocale.titre_original}</span></div>}
                      {oeuvreLocale.date_composition && <div style={{ marginBottom: '6px' }}><span style={cle}>Date de composition</span><span style={val}>{formaterDateHistorique(oeuvreLocale.date_composition)}</span></div>}
                      {oeuvreLocale.langue_originale && <div style={{ marginBottom: '6px' }}><span style={cle}>Langue originale</span><span style={val}>{oeuvreLocale.langue_originale}</span></div>}
                      {oeuvreLocale.genres && oeuvreLocale.genres.length > 0 && (
                        <div><span style={cle}>Genre{oeuvreLocale.genres.length > 1 ? 's' : ''}</span><span style={val}>{oeuvreLocale.genres.join(', ')}</span></div>
                      )}
                    </div>
                  )}
                  {aEdition && (
                    <div style={carte}>
                      <p style={legende}>Édition de référence</p>
                      {oeuvreAffichee.trad_auteur && <div style={{ marginBottom: '6px' }}><span style={cle}>Traducteur</span><span style={val}>{versionActive?.traducteurLabel ?? libelleTrad(oeuvreAffichee.trad_auteur)}{oeuvreAffichee.trad_date ? ` (${formaterDateHistorique(oeuvreAffichee.trad_date)})` : ''}</span></div>}
                      {versionActive?.editionDescription && <div style={{ marginBottom: '6px' }}><span style={cle}>Édition</span><span style={val}>{versionActive.editionDescription}</span></div>}
                      {(oeuvreAffichee.editeur || oeuvreAffichee.ville || oeuvreAffichee.date_publication) && <div style={{ marginBottom: '6px' }}><span style={cle}>Publication</span><span style={val}>{versionActive?.editionDescription && versionActive.publicationLabel ? versionActive.publicationLabel : [formaterEditeur(oeuvreAffichee.editeur), oeuvreAffichee.ville, formaterDateHistorique(oeuvreAffichee.date_publication)].filter(Boolean).join(', ')}</span></div>}
                      {oeuvreAffichee.collection && <div><span style={cle}>Collection</span><span style={val}>{oeuvreAffichee.collection}</span></div>}
                      {versionActive?.sourceUrl && <div style={{ marginTop: '6px' }}><span style={cle}>Source</span><a href={versionActive.sourceUrl} target="_blank" rel="noopener noreferrer" style={{ ...val, color: 'var(--cs-vert)' }}>Consulter la source</a></div>}
                      {/* Commentaire éventuel destiné au public, dans la carte « Édition de référence ». */}
                      {oeuvreAffichee.commentaire_traduction?.trim() && (
                        <div style={{ marginTop: '9px', paddingTop: '8px', borderTop: '1px solid var(--cs-vert-pale)' }}>
                          <span style={{ ...cle, marginBottom: '2px' }}>Commentaire</span>
                          <span style={{ ...val, display: 'block', lineHeight: 1.55, fontStyle: 'italic', color: 'var(--cs-texte)', marginTop: '1px', whiteSpace: 'pre-line' }}>{sansPointFinal(oeuvreAffichee.commentaire_traduction)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })()}
            {/* Notes éditoriales secondaires : rubrique DISTINCTE de la page de titre.
                Le frontispice (commentaire_traduction) reste réservé aux informations
                éditoriales factuelles de l'œuvre ; les remarques secondaires vivent ici. */}
            {oeuvreAffichee.note_editoriale_secondaire?.trim() && (
              <div style={{ marginTop: '4px', background: 'var(--cs-fond-clair)', border: '1px solid var(--cs-fond-doux)', borderRadius: '8px', padding: '11px 13px' }}>
                <p style={{ fontSize: '0.53125rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--cs-texte-second)', margin: '0 0 6px' }}>Notes éditoriales</p>
                <div style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: '0.71875rem', lineHeight: 1.55, color: 'var(--cs-texte)', whiteSpace: 'pre-line' }}>{rendreTexteEnrichi(oeuvreAffichee.note_editoriale_secondaire ?? '')}</div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Fiche auteur en fenêtre, ouverte depuis « À propos de cette édition ». */}
      <ModaleAuteur id={auteurModalId} onClose={() => setAuteurModalId(null)} />

      {estAdmin && configOuverte && typeof document !== 'undefined' && createPortal(
        /* ⛔ Le voile part SOUS la barre de navigation, et sa mesure se compose sur
            HAUTEUR_NAVBAR. Il partait de `inset: 0`, donc du bord haut de la fenêtre,
            alors que la barre est `fixed` et porte un z-index de 3000 contre 1200 ici :
            l'en-tête de la fenêtre passait donc DERRIÈRE elle, et « Niveaux d'affichage »
            se lisait à moitié.

            ⛔ Et la carte se BORNE en hauteur, faute de quoi elle dépassait de l'écran par
            le bas sans que rien ne défile : sur une fenêtre courte, le pied — donc
            « Enregistrer » — devenait hors de portée, et le réglage ne pouvait plus être
            validé du tout. Trois étages désormais : en-tête et pied fixes, corps défilant
            entre les deux. C'est le pied qui devait rester visible, non le haut du texte.

            La largeur est en `min(25rem, 100%)` : elle suit la police racine, donc l'écran,
            et ne peut jamais dépasser la place disponible. */
        <div style={{ position: 'fixed', top: HAUTEUR_NAVBAR, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.35)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.25rem' }}
          onClick={() => setConfigOuverte(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--cs-surface)', borderRadius: '8px', width: 'min(25rem, 100%)', maxHeight: `calc(100dvh - ${HAUTEUR_NAVBAR} - 2.5rem)`, display: 'flex', flexDirection: 'column', boxShadow: 'var(--cs-ombre-modale)' }}>
            <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 22px 12px' }}>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--cs-vert)', margin: 0 }}>Niveaux d'affichage</p>
              <button onClick={() => setConfigOuverte(false)} style={{ fontSize: '0.9375rem', color: 'var(--cs-texte-faible)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1 }}>✕</button>
            </div>
            {/* `minHeight: 0` est ce qui autorise un enfant de flexbox à devenir plus court
                que son contenu : sans lui, le corps refuse de rétrécir et la carte déborde
                de nouveau, le plafond de hauteur n'y faisant rien. */}
            <div className="cs-defilement-discret" style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto', padding: '0 22px' }}>
            <p style={{ fontSize: '0.6875rem', color: 'var(--cs-texte-gris)', lineHeight: 1.5, margin: '0 0 16px' }}>
              Réglez la finesse des titres affichés, séparément pour le <strong style={{ color: 'var(--cs-texte-second)' }}>sommaire</strong> (colonne de gauche) et le <strong style={{ color: 'var(--cs-texte-second)' }}>corps</strong> du texte.
            </p>
            <div style={{ marginBottom: '14px', padding: '12px 14px', background: 'var(--cs-fond-clair)', borderRadius: '8px', border: '1px solid var(--cs-fond-doux)' }}>
              <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--cs-vert)', margin: '0 0 10px' }}>Mode de lecture</p>
              <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                {[
                  { valeur: false, libelle: 'Par niveau 1' },
                  { valeur: true, libelle: 'Texte entier paginé' },
                ].map(option => (
                  <button key={option.libelle} onClick={() => setConfigNiveaux(prev => ({ ...prev, texteEntier: option.valeur }))}
                    style={{ flex: 1, minHeight: '34px', padding: '5px 8px', borderRadius: '4px', border: `1px solid ${configNiveaux.texteEntier === option.valeur ? 'var(--cs-vert)' : 'var(--cs-bord)'}`, background: configNiveaux.texteEntier === option.valeur ? 'var(--cs-vert-aplat)' : 'var(--cs-surface)', color: configNiveaux.texteEntier === option.valeur ? 'var(--cs-sur-aplat)' : 'var(--cs-texte-second)', fontSize: '0.6875rem', cursor: 'pointer', fontWeight: configNiveaux.texteEntier === option.valeur ? 700 : 400 }}>
                    {option.libelle}
                  </button>
                ))}
              </div>
              <p style={{ fontSize: '0.625rem', color: 'var(--cs-texte-gris)', lineHeight: 1.45, margin: 0 }}>Le texte entier conserve ses titres et son sommaire. La pagination ne s’arrête plus à chaque niveau 1.</p>
            </div>
            {(['sommaire', 'corps'] as const).map(type => {
              const key = type === 'sommaire' ? 'sommaire' : 'corps'
              const txtKey = type === 'sommaire' ? 'txtSommaire' : 'txtCorps'
              const titre = type === 'sommaire' ? 'Sommaire' : 'Corps du texte'
              return (
                <div key={type} style={{ marginBottom: '14px', padding: '12px 14px', background: 'var(--cs-fond-clair)', borderRadius: '8px', border: '1px solid var(--cs-fond-doux)' }}>
                  <p style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--cs-vert)', margin: '0 0 10px' }}>{titre}</p>

                  <label style={{ fontSize: '0.65625rem', color: 'var(--cs-texte-second)', display: 'block', margin: '0 0 6px', fontWeight: 600 }}>Niveaux de titres affichés</label>
                  <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
                    {[1,2,3,4,5].map(n => {
                      const vide = !!niveauxPresents && !niveauxPresents[n - 1]
                      const choisi = configNiveaux[key] === n
                      return (
                        <button key={n} disabled={vide} onClick={() => { if (!vide) setConfigNiveaux(prev => ({ ...prev, [key]: n })) }}
                          title={vide ? `Le niveau ${n} n’existe pas dans cette œuvre` : `Afficher jusqu’au niveau ${n}`}
                          style={{ width: '34px', height: '30px', borderRadius: '4px', border: `1px solid ${choisi ? 'var(--cs-vert)' : 'var(--cs-bord)'}`, background: choisi ? 'var(--cs-vert-aplat)' : 'var(--cs-surface)', color: choisi ? 'var(--cs-sur-aplat)' : 'var(--cs-texte-second)', fontSize: '0.75rem', cursor: vide ? 'default' : 'pointer', fontWeight: choisi ? 700 : 400, opacity: vide ? 0.4 : 1 }}>
                          {n}
                        </button>
                      )
                    })}
                  </div>

                  <label style={{ fontSize: '0.65625rem', color: 'var(--cs-texte-second)', display: 'block', margin: '0 0 6px', fontWeight: 600 }}>Chapeaux descriptifs</label>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    {[1,2,3,4,5].map((n, i) => {
                      const actif = configNiveaux[txtKey][i]
                      const disponible = n <= configNiveaux[key]
                      return (
                        <button key={n} disabled={!disponible} onClick={() => setConfigNiveaux(prev => {
                          const arr = [...prev[txtKey]]
                          arr[i] = !arr[i]
                          return { ...prev, [txtKey]: arr }
                        })}
                          title={disponible ? `Chapeau du niveau ${n}` : `Le niveau ${n} n’est pas affiché`}
                          style={{ width: '34px', height: '30px', borderRadius: '4px', border: `1px solid ${actif ? 'var(--cs-vert)' : 'var(--cs-bord)'}`, background: actif ? 'var(--cs-vert-aplat)' : 'var(--cs-surface)', color: actif ? 'var(--cs-sur-aplat)' : 'var(--cs-texte-doux)', fontSize: '0.65625rem', cursor: disponible ? 'pointer' : 'default', opacity: disponible ? 1 : 0.4 }}>
                          N{n}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <p style={{ fontSize: '0.5625rem', fontWeight: 700, letterSpacing: '0.10em', color: 'var(--cs-texte-faible)', margin: 0, textTransform: 'uppercase' }}>Numéros de segments</p>
              <button onClick={() => setConfigNiveaux(prev => ({ ...prev, afficherNumeros: !prev.afficherNumeros }))}
                style={{ fontSize: '0.6875rem', padding: '4px 12px', borderRadius: '4px', border: '1px solid var(--cs-bord)', background: configNiveaux.afficherNumeros ? 'var(--cs-vert-aplat)' : 'var(--cs-surface)', color: configNiveaux.afficherNumeros ? 'var(--cs-sur-aplat)' : 'var(--cs-texte-doux)', cursor: 'pointer' }}>
                {configNiveaux.afficherNumeros ? 'Affichés' : 'Masqués'}
              </button>
            </div>
            </div>
            {configErreur && (
              <p role="alert" style={{ flexShrink: 0, margin: 0, padding: '10px 22px 0', fontSize: '0.65625rem', lineHeight: 1.45, color: 'var(--cs-danger-fonce)' }}>{configErreur}</p>
            )}
            <div style={{ flexShrink: 0, display: 'flex', justifyContent: 'flex-end', gap: '8px', padding: '12px 22px 20px', borderTop: '1px solid var(--cs-fond-doux)' }}>
              <button onClick={() => setConfigOuverte(false)} style={{ fontSize: '0.6875rem', padding: '5px 12px', borderRadius: '4px', border: '1px solid var(--cs-bord)', background: 'var(--cs-surface)', color: 'var(--cs-texte-second)', cursor: 'pointer' }}>Annuler</button>
              <button disabled={configEnvoi} onClick={async () => {
                setConfigEnvoi(true)
                setConfigErreur(null)
                const toStr = (b: boolean[]) => b.map(x => x ? '1' : '0').join(',')
                const appels = [
                  { champ: 'niveaux_sommaire', valeur: configNiveaux.sommaire },
                  { champ: 'niveaux_corps', valeur: configNiveaux.corps },
                  { champ: 'texte_sommaire', valeur: toStr(configNiveaux.txtSommaire) },
                  { champ: 'texte_corps', valeur: toStr(configNiveaux.txtCorps) },
                  { champ: 'afficher_numeros', valeur: configNiveaux.afficherNumeros },
                  { champ: 'lecture_texte_entier', valeur: configNiveaux.texteEntier },
                ]
                const reponses = await Promise.all(appels.map(({ champ, valeur }) =>
                  fetch('/api/admin/update-oeuvre', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id_oeuvre: idOeuvre, champ, valeur }) })
                ))
                const refusees = appels.filter((_, i) => !reponses[i].ok).map(a => a.champ)
                if (refusees.length > 0) {
                  setConfigErreur(`Enregistrement refusé pour : ${refusees.join(", ")}. Rien n’a été rechargé ; réessayez, ou reconnectez-vous si la session a expiré.`)
                  setConfigEnvoi(false)
                  return
                }
                const modeModifie = configNiveaux.texteEntier !== lectureTexteEntier
                setConfigEnvoi(false)
                setConfigOuverte(false)
                if (modeModifie) window.location.reload()
              }}
                style={{ fontSize: '0.6875rem', padding: '5px 14px', borderRadius: '4px', border: 'none', background: 'var(--cs-vert-aplat)', color: 'var(--cs-sur-aplat)', fontWeight: 500, cursor: 'pointer' }}>
                {configEnvoi ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {editionCible && (
        <ModaleEditionAdmin
          cible={editionCible}
          idOeuvre={idOeuvre}
          onTitreOeuvreModifie={(champ, valeur) => {
            if (champ === 'titre') setTitreAffiche(valeur)
            setOeuvreLocale(prev => ({ ...prev, [champ]: valeur || undefined }))
          }}
          onClose={() => setEditionCible(null)}
          onEnregistre={() => vue === 'apparat' ? chargerApparatData() : changerNiv1(niv1Actif, { forceRefresh: true, conserverPosition: true })}
        />
      )}
      {voletsDirty && (
        <button
          onClick={resetVolets}
          style={{
            position: 'fixed',
            left: '18px',
            bottom: '18px',
            zIndex: 2500,
            padding: '7px 12px',
            borderRadius: '999px',
            border: '1px solid rgba(198,184,158,0.62)',
            background: 'rgba(250,246,237,0.86)',
            color: 'var(--cs-texte-second)',
            boxShadow: 'var(--cs-ombre-flottante)',
            backdropFilter: 'blur(6px)',
            fontSize: '0.71875rem',
            fontFamily: 'var(--font-source-serif), Georgia, serif',
            fontStyle: 'italic',
            cursor: 'pointer',
          }}>
          Rétablir les proportions
        </button>
      )}
    </div>
  )
}

function NavPages({ pages, pageActuelle, setPageActuelle, bas = false }: {
  pages: any[][]
  pageActuelle: number
  setPageActuelle: (p: number) => void
  bas?: boolean
}) {
  if (pages.length <= 1) return null
  const total = pages.length
  const peutReculer = pageActuelle > 0
  const peutAvancer = pageActuelle < total - 1
  return (
    <div style={{ paddingRight: '8px', paddingTop: bas ? '2.5rem' : '0', paddingBottom: bas ? '0.5rem' : '1.5rem' }}>
      {/* Plus de filets de part et d'autre. Ils tiraient un trait sur toute la largeur de
          la colonne pour annoncer trois signes, et faisaient du simple passage à la page
          suivante une fin de chapitre. Le groupe se centre maintenant de lui-même. */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0', color: 'var(--cs-texte-doux)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 16px' }}>
          <button
            onClick={() => peutReculer && setPageActuelle(pageActuelle - 1)}
            disabled={!peutReculer}
            title="Page précédente"
            style={{ background: 'none', border: 'none', cursor: peutReculer ? 'pointer' : 'default', color: peutReculer ? 'var(--cs-texte-second)' : 'var(--cs-bord)', fontSize: '0.9375rem', padding: '0 2px', lineHeight: 1, transition: 'color 0.15s' }}>
            ‹
          </button>
          {/* « sur » plutôt qu'une barre oblique. La barre est un signe de fraction : on y
              lit d'abord un quart de quelque chose, et il faut un temps pour comprendre
              qu'il s'agit d'une page dans un tout. Le rapport se lit, il ne se calcule
              pas. */}
          <span style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontStyle: 'italic', fontSize: '0.75rem', color: 'var(--cs-texte-doux)', letterSpacing: '0.02em', userSelect: 'none', minWidth: '5.5rem', textAlign: 'center', whiteSpace: 'nowrap' }}>
            {pageActuelle + 1} sur {total}
          </span>
          <button
            onClick={() => peutAvancer && setPageActuelle(pageActuelle + 1)}
            disabled={!peutAvancer}
            title="Page suivante"
            style={{ background: 'none', border: 'none', cursor: peutAvancer ? 'pointer' : 'default', color: peutAvancer ? 'var(--cs-texte-second)' : 'var(--cs-bord)', fontSize: '0.9375rem', padding: '0 2px', lineHeight: 1, transition: 'color 0.15s' }}>
            ›
          </button>
        </div>
      </div>
    </div>
  )
}

