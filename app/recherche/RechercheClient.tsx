'use client'
import { LIVRES } from '@/app/lib/bible'

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useEstMobile } from '@/app/lib/useEstMobile'
import { useSearchParams } from 'next/navigation'
import IconeChevron from '@/app/components/IconeChevron'
import { supabase } from '@/app/lib/supabase'
import { nettoyerFin } from '@/app/lib/ponctuation'
import { texteSansEnrichissement, rendreTexteEnrichi } from '@/app/oeuvre/[id]/texteEnrichi'
import { rendreEnrichi, sansEnrichissements } from '@/app/lib/enrichissements'
import { millesimeEdition } from '@/app/lib/millesimeEdition'
import { cesurerGrec, codeLangue, copierSansCesures } from '@/app/lib/grec'
import { MENTION_ABSENT, MENTION_ABSENT_TITRE, STYLE_MENTION } from '@/app/lib/compositionBible'
import { STYLE_TERME_TAPE } from '@/app/lib/surlignageRecherche'
// ⛔ CE QUE LA RECHERCHE DEMANDE ET COMMENT ELLE RELIT vit dans un module PUR, testé
// (audit du 2026-09-06) : les termes, le mode, la référence biblique tapée, la
// frontière de mot telle que la BASE la voit. Cette page n'en garde que le rendu.
import {
  compterMarque, contientMarque, graphiesVariantes as graphiesLatines, marqueDe,
  modeDepuisParametre, normaliser, referenceBiblique, regexMarque, termesRecherche,
  type Marque, type ModeRecherche, type ReferenceBiblique,
} from '@/app/lib/rechercheRequete'
// ⛔ LE VOLET PREND LA FORME DE CELUI DE « BIBLE CLASSIQUE » (demande de l'auteur,
// 2026-09-04 : « revoir la mise en forme du volet de gauche de la page des résultats :
// prendre modèle sur le volet de gauche de la page Bible classique »). C'est le dernier
// volet du site à ne pas la porter ; les volets d'« Aller plus loin » l'ont reçue la
// veille. Une rubrique d'axe, des options en liste verticale, l'option retenue sur
// pastille verte : trois formes recopiées de moins.
import { RUBRIQUE_AXE, OPTION_VOLET } from '@/app/lib/stylesVoletLecture'
import VisiteGuidee from '@/app/components/VisiteGuidee'
import { CLE_VISITE_RECHERCHE, VISITE_RECHERCHE } from '@/app/lib/visiteRecherche'
import { oublierVisite, visiteFaite } from '@/app/lib/visiteGuidee'
import { offrirLaVisite } from '@/app/lib/demandeDeVisite'
import { ENCRE_TITRE, GRAISSE_TITRE_VOLET, TITRE_VOLET } from '@/app/lib/hierarchieTitres'
import { siglesTraductions } from '@/app/lib/sigleTraduction'
import { codesTraductionsLecture } from '@/app/lib/traductions'

// (`normaliser` et `graphiesVariantes`, hérités de la concordance, vivent désormais dans
// `app/lib/rechercheRequete.ts`, avec les tests qui leur manquaient. Les graphies
// latines ne servent plus qu'à RELIRE un texte original : la base les cherche
// elle-même, d'une seule expression, par `graphies_latines`.)

// (`refFr` et son `abrevFr` composaient la référence entière — « Ps 18, 2 » — sur chaque
// carte de résultat. Le nom du livre étant monté dans la rubrique de groupe, la ligne ne
// porte plus que « 18, 2 » et l'abréviation n'a plus d'emploi ici. `nombreFr`, lui, était
// mort depuis plus longtemps encore. Tous trois sont partis avec les cartes.)

// Noms des livres DÉRIVÉS de `LIVRES` (app/lib/bible.ts), comme le fait déjà `app/page.tsx`.
// Une table écrite à la main ici a dérivé : il y manquait les deutérocanoniques, et
// l'en-tête de la Polyglotte affichait le code brut (« SIR » au lieu de « Siracide »).
// Une seule source, donc : tout livre ajouté à LIVRES est nommé partout du même coup.
const NOMS_LIVRES: Record<string, string> = Object.fromEntries(LIVRES.map(l => [l.code, l.nom]))

// (L'ordre canonique des résultats bibliques vient de la BASE, qui range les versets par
// `ordre` et les livres par leur premier verset : plus de tri ni de rang de livre ici.)

type TraductionRecherche = { code: string; label: string; lang: string; millesime?: string | null }
// Les trois groupes de langue du menu des colonnes, ceux de la page Polyglotte.
const GROUPES_LANG: { code: string; label: string }[] = [
  { code: 'fr', label: 'Français' },
  { code: 'la', label: 'Latin' },
  { code: 'grc', label: 'Grec' },
]
const TRADUCTIONS_FALLBACK: TraductionRecherche[] = [
  { code: 'TR0001', label: 'Bible de Sacy', lang: 'fr' },
  { code: 'TR0002', label: 'Bible Segond', lang: 'fr' },
  { code: 'TR0003', label: 'Bible Crampon', lang: 'fr' },
  { code: 'TR0004', label: 'Vulgate', lang: 'la' },
]

type VersetResult = {
  id_verset: string; ref: string; livre: string; chapitre: number; verset: number
  [key: string]: any
}
type SegmentResult = {
  id: number; segment_texte: string; id_oeuvre: string; id_texte: string
  ref_niv1: string | null; ref_niv3: string | null
  auteur_nom: string; oeuvre_titre: string
  texte_original?: string | null; langue?: string | null; matchFr?: boolean; matchOrig?: boolean
}
type EssaiResult = {
  id: number; titre: string; sous_titre: string | null; resume: string | null; contenu: string; categories: string[]
}
type Mode = ModeRecherche
type Onglet = 'bible' | 'patristique' | 'essais' | 'polyglotte'

const PAGE = 20

// ── Recherche enregistrée ────────────────────────────────────────────────────
// Une seule recherche mémorisée à la fois (localStorage, donc valable aussi pour un
// visiteur non connecté). On y consigne tout ce qu'il faut pour retrouver l'écran à
// l'identique : le(s) mot(s), le mode, les traductions, l'onglet, la page et la position
// de défilement. Enregistrée à la demande, puis rafraîchie automatiquement de temps à autre.
const CLE_RECHERCHE_SAUVEE = 'cs-recherche-sauvee'
type RechercheSauvee = {
  query: string; mode: Mode
  tradScope: string; tradAffichage: string; colTrads: string[]
  onglet: Onglet
  pageV: number; pageS: number; pageE: number
  scrollTop: number
  ts: number
}

// Surligne les occurrences de la MARQUE dans UN run de texte plat. Renvoie toujours des nœuds
// CLÉS (préfixe `kb`) — pour pouvoir être imbriqué dans l'enrichissement sans collision de clé.
// On construit le regex sur le texte normalisé pour trouver les positions, puis on surligne
// les caractères originaux aux mêmes positions.
//
// ⛔ PLUS DE FOND JAUNE (demande de l'auteur, 2026-09-04 : « ne pas surligner en jaune les
// termes trouvés ; le gras suffit »). Le mot se marque par la GRAISSE et par une encre d'un
// rang plus profonde, la forme que la barre de recherche emploie déjà — `STYLE_TERME_TAPE`,
// une seule définition pour les trois surligneurs du site.
//
// ⚠️ Le `<mark>` RESTE : il dit que le mot répond à la recherche, ce qu'aucune graisse ne
// dit à qui n'y voit pas. Seule sa peinture s'en va — et il faut l'éteindre, le navigateur
// posant un fond jaune par défaut sur cette balise.
//
// (Le jaune avait pris la place d'un vert, lui-même remplacé parce qu'il disait « Bible »
// dans un résultat patristique ; c'est la troisième teinte à tomber, et la dernière.)
//
// (Une variante ROUGE a existé, pour le verset dont la traduction affichée ne porte pas le
// mot. Plus rien ne l'appelait depuis que la ligne d'en-tête dit où le mot se trouve ; c'est
// maintenant le sigle barré et le fond d'absence qui le disent.)
// ⚠️ La frontière de mot est celle de la base (`regexMarque`) : l'ancienne liste de
// séparateurs ignorait l'apostrophe et le trait d'union, et « l’espérance » ne se
// marquait pas — quand elle n'était pas rejetée tout à fait (voir `rechercheRequete`).
function surligneParts(texte: string, marque: Marque, kb: string): React.ReactNode[] {
  const re = regexMarque(marque)
  if (!texte || !re) return [texte]
  const style = STYLE_TERME_TAPE
  try {
    const texteN = normaliser(texte)
    const parts: React.ReactNode[] = []; let last = 0; let m: RegExpExecArray | null
    while ((m = re.exec(texteN)) !== null) {
      const s = m.index + m[1].length
      const e = s + m[2].length
      if (s > last) parts.push(<Fragment key={`${kb}t${last}`}>{texte.slice(last, s)}</Fragment>)
      parts.push(<mark key={`${kb}m${s}`} style={style}>{texte.slice(s, e)}</mark>)
      last = e
    }
    if (last < texte.length) parts.push(<Fragment key={`${kb}t${last}`}>{texte.slice(last)}</Fragment>)
    return parts.length ? parts : [texte]
  } catch { return [texte] }
}

function highlighter(texte: string, marque: Marque): React.ReactNode {
  if (!texte || !marque.mots.length) return texte
  const parts = surligneParts(texte, marque, 'h')
  return parts.length > 1 ? <>{parts}</> : texte
}

// Enrichissement (gras, italique, `<i>` de Sacy…) ET surlignage du mot cherché, ensemble :
// on passe le surligneur en `transform` de rendreTexteEnrichi. Sans cela, la recherche
// affichait soit les balises en clair (onglet Bible), soit un texte appauvri (Polyglotte).
function rendreEtSurligner(texte: string, marque: Marque): React.ReactNode {
  if (!texte) return texte
  return rendreTexteEnrichi(texte, (s, key) => surligneParts(s, marque, key))
}

// ── Les trois FAMILLES DE CORPUS ────────────────────────────────────────────
// Quatre onglets, trois corpus : la Polyglotte est une autre VUE sur les mêmes versets
// que la Bible, et partage donc sa teinte. Les valeurs vivent dans `app/globals.css`
// (§ familles de corpus) et se transposent seules au Cuir ; ici on ne nomme que le rôle.
//
// Le fond lavé d'un groupe et son filet ne sont PAS des jetons : ils se dérivent de
// l'encre par `color-mix`, en CSS, à partir de la variable `--fam` posée sur le groupe.
// Une famille se dit donc en un seul endroit, et tout le reste suit.
const FAMILLES: Record<Onglet, { encre: string; aplat: string }> = {
  bible:       { encre: 'var(--cs-ecriture)',   aplat: 'var(--cs-ecriture-aplat)' },
  polyglotte:  { encre: 'var(--cs-ecriture)',   aplat: 'var(--cs-ecriture-aplat)' },
  patristique: { encre: 'var(--cs-peres)',      aplat: 'var(--cs-peres-aplat)' },
  essais:      { encre: 'var(--cs-communaute)', aplat: 'var(--cs-communaute-aplat)' },
}

/** Le style qui pose une famille sur un groupe ; tout le CSS du groupe en dérive. */
function styleFamille(onglet: Onglet): React.CSSProperties {
  const f = FAMILLES[onglet]
  return { '--fam': f.encre, '--fam-aplat': f.aplat } as React.CSSProperties
}

// Regroupe une liste DÉJÀ TRIÉE en tranches consécutives de même clé. Consécutives, et
// non par table de hachage : les listes arrivent dans l'ordre canonique (Genèse →
// Apocalypse) ou alphabétique d'auteur, et cet ordre est précisément ce qu'on montre.
// Un regroupement par clé le casserait en ramenant ensemble des tranches éloignées.
function grouperConsecutifs<T>(liste: T[], cle: (x: T) => string): { cle: string; items: T[] }[] {
  const tranches: { cle: string; items: T[] }[] = []
  for (const item of liste) {
    const k = cle(item)
    const derniere = tranches[tranches.length - 1]
    if (derniere && derniere.cle === k) derniere.items.push(item)
    else tranches.push({ cle: k, items: [item] })
  }
  return tranches
}

// ⛔ LA BASE PAGINE ET COMPTE (demande de l'auteur, 2026-09-06 : « optimise la page »).
// La page rapatriait TOUT ce que la base trouvait — jusqu'à 6 000 versets avec leurs
// cinq bibles et 5 000 passages entiers, cinq à six méga-octets sur « Dieu » —, puis
// en montrait vingt, comptait les livres et les œuvres dans le navigateur et paginait
// sur place : dix à quinze secondes avant la première ligne, et un plafond au-delà
// duquel elle annonçait « résultats trop nombreux ». Elle ne demande plus que deux
// RÉPARTITIONS (les livres et les œuvres avec leur effectif, dont le total se déduit)
// et une PAGE de vingt lignes à la fois, que la base range et filtre
// (`recherche_versets_v2`, `recherche_segments_v2` et leurs `_repartition`).
// ⚠️ La base fait foi : la page ne rejette plus rien de ce qu'elle rend, elle marque ce
// qu'elle reconnaît.
type Requete = { cle: string; termes: string[]; mode: Mode; scope: string }
type RepartitionLivre = { livre: string; n: number }
type RepartitionOeuvre = { id_oeuvre: string; auteur_nom: string; oeuvre_titre: string; n: number }
type PageVersets = { cle: string; lignes: VersetResult[] }
type PageSegments = { cle: string; lignes: SegmentResult[] }

/** La clé d'une page : la requête, le rang de page et le filtre, ce qui la définit. */
function cleDePage(requete: Requete | null, page: number, filtre: string | null): string {
  return requete ? `${requete.cle}|${page}|${filtre ?? ''}` : ''
}

/** Un passage tel que la base le rend, dans la forme que la page compose. */
function segmentDepuisRpc(r: Record<string, unknown>): SegmentResult {
  return {
    id: Number(r.id), segment_texte: String(r.segment_texte ?? ''), id_oeuvre: String(r.id_oeuvre ?? ''), id_texte: String(r.id_texte ?? ''),
    ref_niv1: (r.ref_niv1 as string | null) ?? null, ref_niv3: (r.ref_niv3 as string | null) ?? null,
    auteur_nom: String(r.auteur_nom ?? ''), oeuvre_titre: String(r.oeuvre_titre ?? ''),
    texte_original: (r.texte_original as string | null) ?? null, langue: (r.langue as string | null) ?? null,
    matchFr: !!r.match_fr, matchOrig: !!r.match_orig,
  }
}

/** Le voile d'une liste dont la page demandée n'est pas encore là. */
function styleAttente(attente: boolean): React.CSSProperties {
  return { opacity: attente ? 0.55 : 1, transition: 'opacity .15s' }
}

// (Le décompte des occurrences par livre, œuvre ou publication passe par `compterMarque`,
// dans le module pur.)

// Date courte d'un enregistrement, compacte pour tenir à droite du bouton (« 27 juil. 14:32 »).
function formatDateCourt(ts: number): string {
  try {
    const d = new Date(ts)
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) +
      ' ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  } catch { return '' }
}

function snippetEssai(texte: string, terme: string, max = 220): string {
  const termes = termesRecherche(terme)
  let idx = -1
  for (const t of termes) {
    const i = normaliser(texte).indexOf(normaliser(t))
    if (i >= 0 && (idx < 0 || i < idx)) idx = i
  }
  if (idx < 0) return texte.length > max ? texte.slice(0, max) + '…' : texte
  const debut = Math.max(0, idx - 60)
  const fin = Math.min(texte.length, debut + max)
  return (debut > 0 ? '…' : '') + texte.slice(debut, fin) + (fin < texte.length ? '…' : '')
}

export default function RechercheClient() {
  // ≤ 900px : le formulaire et les résultats s'empilent (le côte-à-côte
  // écraserait les deux). Voir AGENTS § Responsive mobile.
  const mobile = useEstMobile(900)
  const searchParams = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') ?? '')
  const [mode, setMode] = useState<Mode>(modeDepuisParametre(searchParams.get('mode')))
  // La référence biblique que la saisie désigne (« Jn 3, 16 »), s'il y en a une : la
  // page l'OUVRE en tête des résultats, quel que soit l'onglet.
  const [reference, setReference] = useState<ReferenceBiblique | null>(null)
  // Les RACINES rendues par la base en mode « famille » : ce que la page marque et
  // relit à la place des termes tapés.
  const [lexemes, setLexemes] = useState<string[]>([])

  // Par défaut : on cherche dans TOUTES les bibles (scope ALL) et l'on affiche dans la
  // traduction préférée (ou Sacy à défaut). La préférence ne pilote donc que l'affichage,
  // jamais le périmètre de recherche.
  const [tradScope, setTradScope] = useState<string>('ALL')
  const [tradAffichage, setTradAffichage] = useState<string>('TR0001')
  // L'affichage suit TOUJOURS « Afficher en » (tradAffichage), indépendamment du périmètre
  // de recherche : le sélecteur « Afficher en » reste ainsi présent et actif en permanence,
  // même quand on restreint la recherche à une seule bible.
  const tradBible = tradAffichage

  // Polyglotte de recherche : TROIS colonnes au maximum (au modèle de la page Polyglotte).
  const [colTrads, setColTrads] = useState<string[]>(['TR0001','TR0002','TR0003'])
  const [traductions, setTraductions] = useState(TRADUCTIONS_FALLBACK)
  // ── Ce que la base a rendu de la recherche affichée ──
  // La REQUÊTE active (ses termes, son mode, son périmètre) — c'est elle que les pages
  // redemandent —, les deux RÉPARTITIONS (par livre, par œuvre), dont les totaux se
  // déduisent, et la PAGE courante de chaque corpus, avec la clé qui dit à quelle
  // demande elle répond. Une page dont la clé n'est pas celle qu'on demande est en
  // attente : l'attente se DÉDUIT, sans témoin à éteindre (le patron de la Polyglotte).
  const [requete, setRequete] = useState<Requete | null>(null)
  const [repartitionLivres, setRepartitionLivres] = useState<RepartitionLivre[]>([])
  const [repartitionOeuvres, setRepartitionOeuvres] = useState<RepartitionOeuvre[]>([])
  const [versetsPage, setVersetsPage] = useState<PageVersets>({ cle: '', lignes: [] })
  const [segmentsPage, setSegmentsPage] = useState<PageSegments>({ cle: '', lignes: [] })
  const [essaisRes, setEssaisRes] = useState<EssaiResult[]>([])
  // Une recherche qui échoue le DIT (audit du 2026-09-02 : l'erreur n'était jamais lue,
  // et un échec se rendait « aucun résultat »).
  const [erreur, setErreur] = useState<string | null>(null)
  // Numérote les recherches : deux recherches identiques n'ont pas la même clé de page.
  const sequenceRef = useRef(0)
  // La position de défilement à rendre quand la page d'une recherche reprise arrive.
  const scrollCibleRef = useRef<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [lastQuery, setLastQuery] = useState('')
  const [onglet, setOnglet] = useState<Onglet>('bible')
  const [pageV, setPageV] = useState(0)
  const [pageS, setPageS] = useState(0)
  const [pageE, setPageE] = useState(0)
  // Signature du dernier `searchParams` traité (q|mode). L'effet ci-dessous ne réagit
  // QU'À un vrai changement d'URL : sans ce garde, un simple re-rendu (survol, chargement
  // des traductions, suggestions…) rejouait l'effet, et sa branche « pas de q » effaçait
  // les résultats d'une recherche lancée au clavier — laquelle ne met rien dans l'URL.
  const paramsSigRef = useRef<string | null>(null)
  const [sugg, setSugg]         = useState<{ mot: string; freq: number }[]>([])
  const [showSugg, setShowSugg] = useState(false)
  const inputRef   = useRef<HTMLInputElement>(null)
  const suggTimer  = useRef<ReturnType<typeof setTimeout>>(undefined)
  const suggRef    = useRef<HTMLUListElement>(null)
  // Recherche enregistrée : présence d'une sauvegarde (pour révéler « Reprendre »), zone
  // de défilement des résultats (pour restituer la position), et petit accusé « enregistré ».
  const [rechercheSauvee, setRechercheSauvee] = useState<RechercheSauvee | null>(null)
  const [vientDEnregistrer, setVientDEnregistrer] = useState(false)
  // Confirmation d'écrasement : ouverte quand on clique « Enregistrer » alors qu'une autre
  // recherche est déjà mémorisée (mot différent). L'enregistrement n'a lieu qu'après un « oui ».
  const [confirmEcrasement, setConfirmEcrasement] = useState(false)
  // Filtres du volet gauche : restreindre les résultats à un livre / une œuvre / une
  // publication. `null` = pas de filtre. Un second clic sur la même ligne l'annule.
  const [filtres, setFiltres] = useState<{ livre: string | null; oeuvre: string | null; essai: number | null }>({ livre: null, oeuvre: null, essai: null })
  const zoneResultatsRef = useRef<HTMLDivElement>(null)
  // Miroir de l'état courant, lu par l'enregistrement automatique (dont l'intervalle,
  // fermé sur un vieux rendu, ne verrait sinon que des valeurs périmées).
  const etatRef = useRef<Omit<RechercheSauvee, 'scrollTop' | 'ts'> | null>(null)

  useEffect(() => {
    // La préférence de l'utilisateur règle À LA FOIS l'affichage ET le périmètre par défaut :
    // « Chercher dans » vaut par défaut la bible favorite (et non plus « toutes les bibles »).
    const appliquer = (code?: string | null) => {
      if (code && /^TR\d{4}$/.test(code)) { setTradAffichage(code); setTradScope(code) }
    }
    appliquer(localStorage.getItem('traduction_defaut'))
    supabase.auth.getSession().then(async ({ data }) => {
      const uid = data.session?.user.id
      if (!uid) return
      const { data: profil } = await supabase.from('profils').select('traduction_defaut').eq('id', uid).maybeSingle()
      if (profil?.traduction_defaut) { localStorage.setItem('traduction_defaut', profil.traduction_defaut); appliquer(profil.traduction_defaut) }
    })
    // ⛔ `est_biblique` : voir le commentaire dans app/page.tsx.
    //
    // ⛔ ET LE FILTRE PAR COLONNES RÉELLES, qui manquait ici — c'est le piège que la
    // charte nomme « traductions lisibles vs colonnes de versets_lecture ». La liste
    // servait telle quelle à composer `selVersets`, lequel nomme une colonne par
    // traduction. Or `est_biblique` rend NEUF lignes et la vue n'a que CINQ colonnes :
    // TR0009 (entrée le 3 août 2026), TR0010, TR0011 et TR0012 sont des segmentations
    // éditoriales, dont le texte se recompose ailleurs. PostgREST refusait donc la
    // requête ENTIÈRE — « column versets_lecture.TR0009 does not exist », 400, `data`
    // nul — et les onglets Bible et Polyglotte ne rendaient plus RIEN, en silence,
    // depuis cette date. Le même défaut avait déjà vidé l'apparat biblique de toutes
    // les œuvres ; `codesTraductionsLecture` est le remède, il n'était pas appelé ici.
    //
    // ⚠️ Le filtre se corrige tout seul : le jour où une de ces bibles est matérialisée
    // dans la vue, elle reparaît dans les menus sans qu'on touche à ce fichier.
    void (async () => {
      // ⚠️ Le MILLÉSIME sert l'en-tête de la Polyglotte, sous le nom de chaque bible,
      // dérivé comme sur la page Polyglotte (`millesimeEdition`, module pur : le dernier
      // millésime de la notice d'édition, à défaut la fin de la publication).
      const { data } = await supabase
        .from('traductions').select('trad_id, nom, langue, source_edition, publication_fin_annee')
        .eq('est_biblique', true).order('ordre', { ascending: true })
      if (!data?.length) return
      const lisibles = new Set(await codesTraductionsLecture(supabase))
      const trads: TraductionRecherche[] = (data as { trad_id: string; nom: string; langue: string; source_edition: string | null; publication_fin_annee: number | null }[])
        .filter(t => lisibles.has(t.trad_id))
        .map(t => ({ code: t.trad_id, label: t.nom, lang: codeLangue(t.langue), millesime: millesimeEdition(t) }))
      if (!trads.length) return
      setTraductions(trads)
      setColTrads(trads.slice(0, 3).map(t => t.code))
    })()
  }, [])

  // Fermer suggestions au clic extérieur
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (!suggRef.current?.contains(e.target as Node) && e.target !== inputRef.current) setShowSugg(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const suggAbortRef = useRef<AbortController | null>(null)

  // La langue du périmètre choisi. « ALL » cherche dans toutes les bibles, donc en
  // français, qui est la langue de la plupart d'entre elles et de la boîte de recherche.
  const langueScope = useMemo(
    () => (tradScope === 'ALL' ? 'fr' : traductions.find(t => t.code === tradScope)?.lang ?? 'fr'),
    [tradScope, traductions],
  )

  // Autocomplétion (même RPC que la concordance)
  useEffect(() => {
    const val = normaliser(query)
    if (val.length < 2) { setSugg([]); setShowSugg(false); return }
    clearTimeout(suggTimer.current)
    suggTimer.current = setTimeout(async () => {
      suggAbortRef.current?.abort()
      suggAbortRef.current = new AbortController()
      const signal = suggAbortRef.current.signal
      try {
        // Auteurs et œuvres : PRÉFIXE DE MOT, non sous-chaîne. « am » doit ramener
        // « Ambroise », jamais « Ratramme de Corbie » (am au milieu). Un mot commence en
        // tête de champ, après une espace ou une apostrophe. (Les mots de la Bible passent
        // déjà par une RPC préfixe.)
        const valOr = val.replace(/,/g, ' ').trim()
        const prefixeOr = (col: string) => [`${col}.ilike.${valOr}%`, `${col}.ilike.% ${valOr}%`, `${col}.ilike.%'${valOr}%`, `${col}.ilike.%’${valOr}%`].join(',')
        // Le lexique suit la LANGUE du périmètre : chercher dans la Vulgate et se voir
        // proposer « miséricorde » n'aide personne. `suggestions_concordance_la` existait
        // depuis toujours et n'était appelée par rien (relevé le 2026-09-06).
        // ⛔ Le grec a le sien depuis le même jour, et il répond AUSSI à une saisie
        // latine : « theos » propose θεός, « kyrio » propose Κύριος. Ce n'est pas un
        // agrément — un lecteur français n'a pas de clavier grec, et sans cela le lexique
        // ne servirait qu'à qui en a un. ⚠️ La suggestion insère la forme ATTESTÉE, la
        // seule qui retrouve le texte.
        const rpcLexique = langueScope === 'grc' ? 'suggestions_concordance_gr'
          : langueScope === 'la' ? 'suggestions_concordance_la'
          : 'suggestions_concordance_fr'
        const [{ data: dataBible }, { data: dataAuteurs }, { data: dataOeuvres }] = await Promise.all([
          supabase.rpc(rpcLexique, { p_prefixe: val, p_limit: 8 }).abortSignal(signal),
          supabase.from('auteurs').select('nom').or(prefixeOr('nom')).limit(3).abortSignal(signal),
          supabase.from('oeuvres').select('titre').or(prefixeOr('titre')).limit(3).abortSignal(signal),
        ])
        if (signal.aborted) return
        const suggsBible: { mot: string; freq: number }[] = dataBible ?? []
        const seen = new Set(suggsBible.map(s => s.mot.toLowerCase()))
        const suggsExtra: { mot: string; freq: number }[] = [
          ...((dataAuteurs ?? []) as { nom: string }[]).map(a => ({ mot: a.nom, freq: 0 })),
          ...((dataOeuvres ?? []) as { titre: string }[]).map(o => ({ mot: o.titre, freq: 0 })),
        ].filter(s => { const k = s.mot.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; })
        const merged = [...suggsBible, ...suggsExtra].slice(0, 10)
        if (merged.length) { setSugg(merged); setShowSugg(true) } else { setSugg([]); setShowSugg(false) }
      } catch (err: any) {
        if (err?.name !== 'AbortError') { setSugg([]); setShowSugg(false) }
      }
    }, 180)
    return () => { clearTimeout(suggTimer.current); suggAbortRef.current?.abort() }
  }, [query, langueScope])

  const lancerAbortRef = useRef<AbortController | null>(null)

  const lancer = async (queryForce?: string, modeForce?: Mode, scopeForce?: string) => {
    const q = (queryForce ?? query).trim()
    const modeActif = modeForce ?? mode
    const scopeActif = scopeForce ?? tradScope
    if (!q) return

    lancerAbortRef.current?.abort()
    lancerAbortRef.current = new AbortController()
    const signal = lancerAbortRef.current.signal

    setLoading(true); setDone(false); setErreur(null)
    setRequete(null); setRepartitionLivres([]); setRepartitionOeuvres([]); setEssaisRes([])
    setPageV(0); setPageS(0); setPageE(0)
    setFiltres({ livre: null, oeuvre: null, essai: null })
    setLexemes([])

    // ⛔ UNE RÉFÉRENCE CHIFFRÉE S'OUVRE, ELLE NE SE CHERCHE PAS. « Jean 3, 16 » n'est pas
    // trois mots à trouver dans les textes — « jean », « 3 », « 16 » y sont partout, et
    // la page attendait plusieurs secondes de milliers de lignes inutiles avant de
    // montrer la carte (relevé sur le site, 2026-09-06). La carte se pose seule.
    const ref = referenceBiblique(q)
    setReference(ref)
    if (ref) { setLastQuery(q); setLoading(false); setDone(false); return }

    try {
      // ⛔ UNE SEULE VOIE, un mot ou plusieurs (audit du 2026-09-06). La base reçoit les
      // TERMES et le MODE ; elle les normalise comme ses textes (`norm_fr` : accents,
      // casse, graphies anciennes — « était » trouve « étoit » chez Sacy), exige chaque
      // terme dans la MÊME bible ou le même segment, et ne rend que ce qui se lit. Le
      // texte original (latin, grec) est cherché dans le même appel, sous ses graphies
      // latines, et chaque passage dit par quel texte il a répondu.
      const termes = termesRecherche(q)
      const scope = scopeActif === 'ALL' ? 'ALL' : scopeActif
      const requeteNeuve: Requete = { cle: `${++sequenceRef.current}|${q}|${modeActif}|${scope}`, termes, mode: modeActif, scope }

      // Essais — construit sans await, part immédiatement en parallèle
      const reqE = (() => {
        // La table ne se lit plus qu'en propriétaire : le public passe par la vue
        // `essais_publies`, qui tait l'auteur d'une publication anonyme.
        let r = supabase.from('essais_publies').select('id, titre, sous_titre, resume, contenu, categories')
        for (const t of termes) r = r.or(`titre.ilike.%${t}%,sous_titre.ilike.%${t}%,resume.ilike.%${t}%,contenu.ilike.%${t}%`)
        return r.limit(500).abortSignal(signal)
      })()

      // Les racines du mode « famille » : ce que la page marquera dans le texte.
      const reqLexemes = modeActif === 'famille'
        ? supabase.rpc('lexemes_recherche', { p_termes: termes }).abortSignal(signal)
        : Promise.resolve({ data: null as string[] | null, error: null })

      // ⛔ CE QUI PART, ET RIEN DE PLUS : les deux RÉPARTITIONS (ce que le volet
      // affiche, et d'où les totaux se déduisent), la PREMIÈRE PAGE de chaque corpus
      // — pour que la première ligne paraisse sans un second aller-retour —, les
      // publications et les racines. Six requêtes, ensemble ; la plus lourde (« dieu »,
      // 18 000 passages) rend en un tiers de seconde ce qui en coûtait quinze.
      const [resRepV, resRepS, resPageV, resPageS, resE, resLex] = await Promise.all([
        supabase.rpc('recherche_versets_v2_repartition', { p_termes: termes, p_mode: modeActif, p_scope: scope }).abortSignal(signal),
        supabase.rpc('recherche_segments_v2_repartition', { p_termes: termes, p_mode: modeActif }).abortSignal(signal),
        supabase.rpc('recherche_versets_v2', { p_termes: termes, p_mode: modeActif, p_scope: scope, p_livre: null, p_decalage: 0, p_taille: PAGE }).abortSignal(signal),
        supabase.rpc('recherche_segments_v2', { p_termes: termes, p_mode: modeActif, p_id_oeuvre: null, p_decalage: 0, p_taille: PAGE }).abortSignal(signal),
        reqE,
        reqLexemes,
      ])

      if (signal.aborted) return
      const echec = resRepV.error ?? resRepS.error ?? resPageV.error ?? resPageS.error ?? resE.error ?? resLex.error
      if (echec) throw echec

      const lexemesRecus = ((resLex as { data?: string[] | null }).data ?? []) as string[]
      setLexemes(lexemesRecus)
      // Ce que la page marque et relit : les termes, ou les racines en mode famille.
      const marqueLocale = marqueDe(termes, modeActif, lexemesRecus)
      const relire = (texte: string) => modeActif === 'famille' || contientMarque(texte, marqueLocale)

      const repV = (resRepV.data ?? []) as RepartitionLivre[]
      const repS = (resRepS.data ?? []) as RepartitionOeuvre[]
      // Essais : chaque terme quelque part (la vue), puis tous les termes ensemble.
      const essaisBruts = (resE.data ?? []) as EssaiResult[]
      const essais = termes.length > 1 ? essaisBruts.filter(e => relire([e.titre, e.sous_titre, e.resume, e.contenu].filter(Boolean).join(' '))) : essaisBruts

      setRepartitionLivres(repV)
      setRepartitionOeuvres(repS)
      setEssaisRes(essais)
      setVersetsPage({ cle: cleDePage(requeteNeuve, 0, null), lignes: (resPageV.data ?? []) as VersetResult[] })
      setSegmentsPage({ cle: cleDePage(requeteNeuve, 0, null), lignes: ((resPageS.data ?? []) as Record<string, unknown>[]).map(segmentDepuisRpc) })
      setRequete(requeteNeuve)
      setLastQuery(q)
      setLoading(false); setDone(true)
      if (zoneResultatsRef.current) zoneResultatsRef.current.scrollTop = 0

      const counts = { bible: repV.reduce((s, r) => s + r.n, 0), patristique: repS.reduce((s, r) => s + r.n, 0), essais: essais.length }
      setOnglet(prev => {
        if (prev === 'polyglotte') return 'polyglotte'
        if (Object.values(counts).every(c => c === 0)) return prev
        const actuel = counts[prev as keyof typeof counts] ?? 0
        if (actuel > 0) return prev
        if (counts.patristique >= counts.bible && counts.patristique >= counts.essais) return 'patristique'
        if (counts.bible >= counts.essais) return 'bible'
        return 'essais'
      })
    } catch (err: unknown) {
      if ((err as { name?: string })?.name === 'AbortError' || signal.aborted) return
      console.error('[recherche] la recherche a échoué', err)
      setErreur('La recherche n’a pas abouti.')
      setLoading(false)
    }
  }

  useEffect(() => {
    const q = searchParams.get('q')?.trim()
    const modeParam: Mode = modeDepuisParametre(searchParams.get('mode'))
    // On n'agit que si l'URL a RÉELLEMENT changé depuis la dernière fois. Un re-rendu qui
    // rejoue l'effet sans changement d'URL ne touche donc à rien : c'est ce qui protège
    // une recherche lancée au clavier (sans `q` dans l'URL) contre l'effacement.
    const sig = `${q ?? ''}|${modeParam}`
    if (paramsSigRef.current === sig) return
    paramsSigRef.current = sig
    // Arrivée sur « /recherche » SANS terme (« Nouvelle recherche ») : page vierge, on
    // repart de zéro plutôt que de garder les résultats précédents à l'écran.
    if (!q) {
      lancerAbortRef.current?.abort()
      setQuery(''); setDone(false); setLoading(false); setErreur(null)
      setRequete(null); setRepartitionLivres([]); setRepartitionOeuvres([]); setEssaisRes([])
      setPageV(0); setPageS(0); setPageE(0)
      return
    }
    setQuery(q); setMode(modeParam)
    void lancer(q, modeParam)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  // ── Recherche enregistrée ───────────────────────────────────────────────────
  // Miroir de l'état courant (mis à jour à chaque rendu, pas dans un effet).
  etatRef.current = { query: lastQuery, mode, tradScope, tradAffichage, colTrads, onglet, pageV, pageS, pageE }

  // Au montage : présence d'une recherche enregistrée → le bouton « Reprendre » paraît.
  useEffect(() => {
    try {
      const brut = localStorage.getItem(CLE_RECHERCHE_SAUVEE)
      if (brut) { const s = JSON.parse(brut) as RechercheSauvee; if (s?.query) setRechercheSauvee(s) }
    } catch { /* stockage indisponible */ }
  }, [])

  // Écrit réellement la sauvegarde (écrase la précédente s'il y en avait une).
  const ecrireRecherche = () => {
    if (!lastQuery) return
    const snap: RechercheSauvee = {
      query: lastQuery, mode, tradScope, tradAffichage, colTrads: [...colTrads],
      onglet, pageV, pageS, pageE,
      scrollTop: zoneResultatsRef.current?.scrollTop ?? 0, ts: Date.now(),
    }
    try { localStorage.setItem(CLE_RECHERCHE_SAUVEE, JSON.stringify(snap)) } catch { /* ignore */ }
    setRechercheSauvee(snap)
    setVientDEnregistrer(true)
    setTimeout(() => setVientDEnregistrer(false), 2000)
  }

  // Clic sur « Enregistrer » : si une AUTRE recherche est déjà mémorisée (mot différent),
  // on demande confirmation dans une fenêtre avant d'écraser ; sinon on enregistre direct.
  const enregistrerRecherche = () => {
    if (!lastQuery) return
    if (rechercheSauvee && rechercheSauvee.query !== lastQuery) { setConfirmEcrasement(true); return }
    ecrireRecherche()
  }

  // Enregistrement automatique : tant qu'une recherche est mémorisée ET que celle affichée
  // est la même, on rafraîchit page + position sans rien écraser d'autre.
  useEffect(() => {
    if (!rechercheSauvee) return
    const id = window.setInterval(() => {
      const e = etatRef.current
      if (!e?.query || e.query !== rechercheSauvee.query) return
      const snap: RechercheSauvee = { ...e, colTrads: [...e.colTrads], scrollTop: zoneResultatsRef.current?.scrollTop ?? 0, ts: Date.now() }
      try { localStorage.setItem(CLE_RECHERCHE_SAUVEE, JSON.stringify(snap)) } catch { /* ignore */ }
    }, 6000)
    return () => window.clearInterval(id)
  }, [rechercheSauvee])

  const reprendreRecherche = async () => {
    let snap: RechercheSauvee | null = rechercheSauvee
    try { const brut = localStorage.getItem(CLE_RECHERCHE_SAUVEE); if (brut) snap = JSON.parse(brut) } catch { /* ignore */ }
    if (!snap?.query) return
    setMode(snap.mode)
    setTradScope(snap.tradScope)
    setTradAffichage(snap.tradAffichage)
    if (snap.colTrads?.length) setColTrads(snap.colTrads)
    setQuery(snap.query)
    await lancer(snap.query, snap.mode, snap.tradScope)
    // `lancer` a remis les pages à zéro et choisi un onglet au jugé : on rétablit l'état
    // exact qui avait été enregistré, puis la position de défilement.
    // ⚠️ Une page au-delà de la première se REDEMANDE à la base : la position se rend
    // alors quand cette page arrive (voir les effets de page), non sur une minuterie
    // qui la poserait sur la page d'avant.
    setOnglet(snap.onglet)
    setPageV(snap.pageV); setPageS(snap.pageS); setPageE(snap.pageE)
    const cible = snap.scrollTop
    const attendUnePage = (snap.onglet === 'patristique' && snap.pageS > 0)
      || ((snap.onglet === 'bible' || snap.onglet === 'polyglotte') && snap.pageV > 0)
    if (attendUnePage) scrollCibleRef.current = cible
    else setTimeout(() => { if (zoneResultatsRef.current) zoneResultatsRef.current.scrollTop = cible }, 120)
  }

  // La MARQUE de la recherche affichée : les termes tapés, ou les racines rendues par
  // la base en mode famille. Tout ce que la page relit ou surligne passe par elle.
  const marque = useMemo(() => marqueDe(termesRecherche(lastQuery), mode, lexemes), [lastQuery, mode, lexemes])

  // Le SIGLE de chaque bible, calculé une fois sur la liste ENTIÈRE : c'est à cette
  // condition seulement que deux bibles ne peuvent pas recevoir le même (voir
  // `app/lib/sigleTraduction.ts`). Le nom entier reste porté en `title` sur chaque sigle.
  const siglesParCode = useMemo(() => {
    const sigles = siglesTraductions(traductions.map(t => t.label))
    return Object.fromEntries(traductions.map((t, i) => [t.code, sigles[i]])) as Record<string, string>
  }, [traductions])

  // Un texte ORIGINAL se marque sous les graphies latines des termes (u/v, i/j), en
  // début de mot ou entier : la famille de mots n'a pas de racines pour le latin.
  const marqueOriginal = useMemo<Marque>(() => ({
    mots: termesRecherche(lastQuery).flatMap(t => graphiesLatines(normaliser(t))),
    entier: mode === 'exact',
  }), [lastQuery, mode])

  // ── LES COMPTES VIENNENT DE LA BASE, ET LES PAGES AUSSI (2026-09-06) ──
  // Les deux répartitions portent l'effectif de chaque livre et de chaque œuvre, dans
  // l'ordre du canon et de l'auteur ; le total s'en déduit, et le total FILTRÉ est
  // l'effectif de la ligne retenue. Plus de liste entière dans le navigateur, donc plus
  // de tri, de découpe ni de plafond ici.
  const versetsTotal = useMemo(() => repartitionLivres.reduce((s, r) => s + r.n, 0), [repartitionLivres])
  const segmentsTotal = useMemo(() => repartitionOeuvres.reduce((s, r) => s + r.n, 0), [repartitionOeuvres])
  const versetsTotalFiltre = filtres.livre ? (repartitionLivres.find(r => r.livre === filtres.livre)?.n ?? 0) : versetsTotal
  const segmentsTotalFiltre = filtres.oeuvre ? (repartitionOeuvres.find(r => r.id_oeuvre === filtres.oeuvre)?.n ?? 0) : segmentsTotal
  // Publications de la communauté : par publication, occurrences décroissantes. Elles
  // restent chargées entières — une trentaine de textes — et se filtrent ici.
  const repartitionEssais = useMemo(() =>
    essaisRes.map(e => ({
      id: e.id, titre: e.titre,
      n: compterMarque([e.titre, e.sous_titre, e.resume, e.contenu].filter(Boolean).join(' '), marque) || 1,
    })).sort((a, b) => b.n - a.n), [essaisRes, marque])
  const essaisFiltres = useMemo(() => filtres.essai != null ? essaisRes.filter(e => e.id === filtres.essai) : essaisRes, [essaisRes, filtres.essai])
  const essaisPage   = essaisFiltres.slice(pageE * PAGE, (pageE + 1) * PAGE)

  // La page DEMANDÉE de chaque corpus, et celle qui est là. Quand les deux clés
  // diffèrent, la page est EN ATTENTE : l'effet ci-dessous la redemande, et les lignes
  // d'avant restent sous un voile le temps qu'elle vienne. ⚠️ Rien ne s'allume ni ne
  // s'éteint dans un effet : l'attente se lit sur les clés, et retombe seule.
  const cleV = cleDePage(requete, pageV, filtres.livre)
  const cleS = cleDePage(requete, pageS, filtres.oeuvre)
  const versetsEnAttente = !!requete && versetsPage.cle !== cleV
  const segmentsEnAttente = !!requete && segmentsPage.cle !== cleS

  // Une page qui arrive remonte le défileur — ou lui rend la position qu'une recherche
  // reprise attendait. Seule la page de l'onglet AFFICHÉ y touche.
  const poserDefilement = useCallback((ongletDeLaPage: boolean) => {
    const zone = zoneResultatsRef.current
    if (!zone) return
    if (scrollCibleRef.current != null) { zone.scrollTop = scrollCibleRef.current; scrollCibleRef.current = null }
    else if (ongletDeLaPage) zone.scrollTop = 0
  }, [])

  useEffect(() => {
    if (!requete || versetsPage.cle === cleV) return
    const ctrl = new AbortController()
    const ongletDeLaPage = onglet === 'bible' || onglet === 'polyglotte'
    void (async () => {
      const { data, error } = await supabase
        .rpc('recherche_versets_v2', { p_termes: requete.termes, p_mode: requete.mode, p_scope: requete.scope, p_livre: filtres.livre, p_decalage: pageV * PAGE, p_taille: PAGE })
        .abortSignal(ctrl.signal)
      if (ctrl.signal.aborted) return
      if (error) { console.error('[recherche] page biblique', error); setErreur('La page demandée n’a pas pu être chargée.'); return }
      setVersetsPage({ cle: cleV, lignes: (data ?? []) as VersetResult[] })
      poserDefilement(ongletDeLaPage)
    })()
    return () => ctrl.abort()
  }, [requete, cleV, versetsPage.cle, filtres.livre, pageV, onglet, poserDefilement])

  useEffect(() => {
    if (!requete || segmentsPage.cle === cleS) return
    const ctrl = new AbortController()
    const ongletDeLaPage = onglet === 'patristique'
    void (async () => {
      const { data, error } = await supabase
        .rpc('recherche_segments_v2', { p_termes: requete.termes, p_mode: requete.mode, p_id_oeuvre: filtres.oeuvre, p_decalage: pageS * PAGE, p_taille: PAGE })
        .abortSignal(ctrl.signal)
      if (ctrl.signal.aborted) return
      if (error) { console.error('[recherche] page patristique', error); setErreur('La page demandée n’a pas pu être chargée.'); return }
      setSegmentsPage({ cle: cleS, lignes: ((data ?? []) as Record<string, unknown>[]).map(segmentDepuisRpc) })
      poserDefilement(ongletDeLaPage)
    })()
    return () => ctrl.abort()
  }, [requete, cleS, segmentsPage.cle, filtres.oeuvre, pageS, onglet, poserDefilement])

  const totalActive  = onglet === 'bible' || onglet === 'polyglotte' ? versetsTotalFiltre
    : onglet === 'patristique' ? segmentsTotalFiltre : essaisFiltres.length
  const pageActive   = onglet === 'patristique' ? pageS : onglet === 'essais' ? pageE : pageV
  const setPageActive = onglet === 'patristique' ? setPageS : onglet === 'essais' ? setPageE : setPageV
  const pagesTotal   = Math.ceil(totalActive / PAGE)
  const debut = pageActive * PAGE + 1
  const fin   = Math.min((pageActive + 1) * PAGE, totalActive)
  // 44 px : la mesure de la marge de référence sur la page Polyglotte (`LARGEUR_REF`).
  // L'en-tête et le corps partagent la grille.
  //
  // ⛔ UNE SEULE COLONNE SUR TÉLÉPHONE, et c'est la doctrine de la page Polyglotte
  //    prise par l'autre bout. Trois colonnes de sérif JUSTIFIÉ à 14px se partageaient
  //    (375 − 44 − 44) / 3 = 96 px, soit une douzaine de signes par ligne : la page de
  //    lecture, elle, refuse l'outil sous 820 px plutôt que de le comprimer (charte,
  //    § Responsive). Ici l'onglet ne peut pas se refuser — il porte les résultats —
  //    mais la comparaison n'a pas de sens dans 96 px. On garde donc la PREMIÈRE colonne
  //    retenue, en pleine mesure, et le menu de colonne reste ouvert pour en changer.
  const colAffichees = mobile ? colTrads.slice(0, 1) : colTrads
  const polyTmpl = `44px ${colAffichees.map(() => 'minmax(0, 1fr)').join(' ')}`

  // Maintien enfoncé sur « Précédent »/« Suivant » : les pages défilent vite. Un premier
  // pas immédiat, puis, après une courte retenue, une répétition rapide jusqu'au relâché.
  const repeatRef = useRef<{ tempo?: ReturnType<typeof setTimeout>; boucle?: ReturnType<typeof setInterval> }>({})
  const arreterDefilement = () => {
    if (repeatRef.current.tempo) clearTimeout(repeatRef.current.tempo)
    if (repeatRef.current.boucle) clearInterval(repeatRef.current.boucle)
    repeatRef.current = {}
  }
  const demarrerDefilement = (dir: 1 | -1) => {
    arreterDefilement()
    const pas = () => setPageActive(p => Math.max(0, Math.min(pagesTotal - 1, p + dir)))
    pas() // premier pas immédiat (= un simple clic)
    repeatRef.current.tempo = setTimeout(() => {
      repeatRef.current.boucle = setInterval(pas, 70)
    }, 300)
  }
  useEffect(() => arreterDefilement, [])

  // ── LA VISITE ──────────────────────────────────────────────────────────────
  // Ce que la page montre d'elle-même la première fois qu'on l'ouvre (charte § 46).
  //
  // ⛔ ELLE ATTEND DES RÉSULTATS, et c'est le point qui commande tout le reste :
  // quatre de ses six arrêts n'existent pas sur une page vide — ni les onglets, ni
  // leur répartition, ni le bouton qui garde la recherche, ni le moindre résultat.
  // ⛔ Et l'on ne tape PAS à la place du lecteur pour s'en donner : une visite montre
  // la page telle qu'il l'a ouverte.
  // ⚠️ L'état est un COMPTEUR, non un drapeau : rappelée par la barre alors qu'elle
  // est déjà ouverte, la visite repart de son grand message, et le composant ne s'y
  // remet qu'en se REMONTANT. Le compteur lui sert de clé.
  // ⛔ Et l'offre ne se fait qu'UNE fois : sans le témoin, chaque recherche nouvelle
  // la rouvrirait.
  const [visite, setVisite] = useState(0)
  const resultatsPrets = done && (versetsTotal + segmentsTotal + essaisRes.length) > 0
  const visiteProposee = useRef(false)
  useEffect(() => {
    if (!resultatsPrets || visiteProposee.current) return
    visiteProposee.current = true
    const params = new URLSearchParams(window.location.search)
    if (params.has('visite')) oublierVisite(CLE_VISITE_RECHERCHE)
    else if (visiteFaite(CLE_VISITE_RECHERCHE)) return
    const depart = window.setTimeout(() => setVisite(1), 260)
    return () => window.clearTimeout(depart)
  }, [resultatsPrets])

  // La page OFFRE sa visite à la barre de navigation, qui porte le bouton qui la
  // rappelle (voir app/lib/demandeDeVisite.ts). ⚠️ Elle ne l'offre que TANT QU'IL Y A
  // DES RÉSULTATS : le bouton disparaît sur une page vide, où la visite n'aurait rien
  // à cerner, et reparaît dès qu'une recherche répond.
  useEffect(() => {
    if (!resultatsPrets) return
    return offrirLaVisite(() => setVisite(n => n + 1))
  }, [resultatsPrets])

  return (
    <>
      <style>{`
        /* ── UN GROUPE, PAS DES CARTES ──────────────────────────────────────────────
           Les résultats étaient vingt cartes indépendantes, chacune avec son cadre, son
           rayon, son ombre et son survol, et toutes de la même couleur. Elles répétaient
           en outre à chaque ligne ce que le TRI disait déjà : le même livre vingt fois,
           le même auteur et la même œuvre à chaque passage.

           Un groupe est désormais UN SEUL objet : une rubrique en aplat qui porte le
           commun (le livre, l'auteur et l'œuvre, la publication), puis un bloc lavé de la
           même famille dont les lignes se séparent d'un filet. Rien n'est retranché ;
           ce qui était répété est REMONTÉ d'un cran.

           ⛔ Pas de liseré au flanc des lignes. Il a été essayé et refusé : un trait de
           trois pixels dit moins bien la famille qu'un fond qui la porte sur toute la
           hauteur du groupe, et il ajoute un objet là où l'on en retire.

           La famille se pose UNE fois, par --fam et --fam-aplat (voir styleFamille).
           Le lavis et le filet s'en dérivent par color-mix : ils suivent donc les deux
           thèmes sans être nommés, et montent tout seuls sur le sol sombre du Cuir, comme
           la charte l'exige d'un carton posé sur un fond sombre. */
        .grp { border-radius:8px; }
        .grp + .grp { margin-top:4px; }
        .grp-hd { display:flex; align-items:baseline; gap:8px; padding:1px 10px 2px; line-height:1.25; border-radius:8px 8px 0 0; background:var(--fam-aplat); color:var(--cs-sur-aplat); font-family:var(--font-source-serif), Georgia, serif; }
        .grp-hd .nom { font-size:0.75rem; font-weight:600; letter-spacing:0.035em; }
        .grp-hd .compl { min-width:0; font-size:0.6875rem; font-style:italic; opacity:0.84; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .grp-hd .n { margin-left:auto; flex-shrink:0; font-size:0.625rem; font-weight:400; font-variant-numeric:tabular-nums; opacity:0.74; }
        .grp-corps { border:1px solid color-mix(in srgb, var(--fam) 22%, var(--cs-surface)); border-top:none; border-radius:0 0 8px 8px; background:color-mix(in srgb, var(--fam) 7%, var(--cs-surface)); overflow:hidden; }
        .grp-ligne { display:block; text-decoration:none; padding:4px 10px 5px; transition:background 0.1s; }
        .grp-ligne + .grp-ligne { border-top:1px solid color-mix(in srgb, var(--fam) 22%, var(--cs-surface)); }
        .grp-ligne:hover { background:color-mix(in srgb, var(--fam) 14%, var(--cs-surface)); }
        /* Le verset dont la traduction AFFICHÉE ne porte pas le mot : le fond d'absence,
           et le sigle barré sur la ligne du haut disent lequel.
           ⛔ « --cs-absence-fond » et non « --cs-danger-fond » : le second est le fond
           d'un encart d'alerte, trop pâle pour parler seul, et l'absence n'est pas une
           alerte. Le jeton est le MÊME que celui de la cellule polyglotte : c'est le
           même constat, sur la même page, et il ne se dit pas de deux façons. */
        .grp-ligne--absent { background:var(--cs-absence-fond); }
        .grp-ligne--absent:hover { background:var(--cs-absence-fond); }
        /* ── Sigles de bible ──
           Sept noms entiers ne tiennent pas sur une ligne et repoussaient le verset à un
           troisième rang ; sept sigles y tiennent. Le nom entier reste en title. */
        .sigles { display:inline-flex; gap:4px; flex-wrap:wrap; align-items:baseline; }
        .sigle { font-size:0.5625rem; font-weight:600; letter-spacing:0.03em; line-height:1.55; padding:0 4px; border-radius:4px; color:var(--cs-texte-doux); background:color-mix(in srgb, var(--fam) 12%, var(--cs-surface)); }
        .sigle--affichee { color:var(--fam); box-shadow:inset 0 0 0 1px color-mix(in srgb, var(--fam) 34%, var(--cs-surface)); }
        .sigle--absente { color:var(--cs-texte-faible); background:transparent; text-decoration:line-through; }
        /* Lignes de répartition cliquables (filtre par livre / œuvre / publication). */
        .brk-row { display:flex; align-items:baseline; justify-content:space-between; gap:8px; width:100%; text-align:left; border:none; background:transparent; cursor:pointer; padding:2px 6px; border-radius:4px; font-size:0.6875rem; color:var(--cs-texte-second); line-height:1.4; font-family:inherit; transition:background 0.1s; }
        .brk-row:hover { background:color-mix(in srgb, var(--fam) 10%, var(--cs-surface)); }
        .brk-row--actif { background:color-mix(in srgb, var(--fam) 15%, var(--cs-surface)); color:var(--fam); font-weight:600; }
        .brk-row--actif:hover { background:color-mix(in srgb, var(--fam) 21%, var(--cs-surface)); }
        .brk-count { flex-shrink:0; font-size:0.59375rem; color:var(--cs-texte-faible); font-variant-numeric:tabular-nums; }
        .brk-row--actif .brk-count { color:var(--fam); }
        /* ── Onglets VERTICAUX du volet gauche ──
           Une pastille carrée devant chaque libellé donne la clef du code de couleurs :
           c'est le seul endroit de la page où les trois familles se voient ENSEMBLE, et
           donc le seul où l'on peut apprendre ce qu'elles disent.
           ⛔ Le liseré de 3 px qui marquait l'onglet actif est retiré : le lavis fait le
           même travail, se voit mieux, et n'ajoute pas un objet à la page.
           (Les anciennes classes .ong-btn et .ong-count, d'une barre d'onglets
           HORIZONTALE qui n'existe plus, ont disparu avec elles.) */
        .ong-vert { width:100%; display:flex; align-items:center; justify-content:space-between; gap:8px; padding:8px 20px; border:none; background:transparent; color:var(--cs-texte-second); font-weight:400; font-size:0.78125rem; cursor:pointer; text-align:left; font-family:var(--font-source-serif), Georgia, serif; transition:background 0.12s, color 0.12s; }
        .ong-vert:hover { background:color-mix(in srgb, var(--fam) 8%, var(--cs-surface)); }
        .ong-vert--actif { background:color-mix(in srgb, var(--fam) 11%, var(--cs-surface)); color:var(--fam); font-weight:600; }
        .ong-vert .lib { display:flex; align-items:center; gap:8px; min-width:0; line-height:1.25; }
        .ong-vert .pastille { width:7px; height:7px; flex-shrink:0; border-radius:4px; background:var(--fam); }
        .ong-count { flex-shrink:0; font-size:0.625rem; font-weight:400; color:var(--cs-texte-faible); font-variant-numeric:tabular-nums; }
        .ong-vert--actif .ong-count { color:var(--fam); }
        .pag-btn { font-size:0.6875rem; padding:5px 16px; border:1px solid var(--cs-bord); border-radius:999px; background:var(--cs-surface); color:var(--cs-texte); cursor:pointer; transition:background 0.12s,color 0.12s; }
        .pag-btn:hover:not(:disabled) { background:var(--cs-vert-aplat); color:var(--cs-sur-aplat); border-color:var(--cs-vert-aplat); }
        .pag-btn:disabled { color:#c8c0b8; border-color:var(--cs-fond-doux); cursor:default; }
        /* (« .mode-btn » est parti avec le contrôle segmenté : le mode se prend désormais
           en options de volet, dont la forme vit dans « stylesVoletLecture ».) */
        /* ── Polyglotte : LA FORME DE LA PAGE POLYGLOTTE, telle qu'elle est depuis le
           2026-09-04 (demande de l'auteur, 2026-09-06 : « s'inspirer du nouveau modèle »).
           ⛔ Ni cadre, ni ombre, ni coins arrondis : le corps EST la page. L'en-tête
           n'est plus un bandeau vert profond à capitales espacées : c'est la barre claire
           de la page de lecture — le nom de chaque bible en sérif, son année dessous, un
           filet fin entre les colonnes. Les filets et le sol sont ceux de la page. */
        .poly-outer { overflow:hidden; }
        /* L'en-tête : la grille du corps, le sol de la page, un filet dessous. Chaque cellule
           porte le filet de gauche qui ouvre la réglure, et le rembourrage qui donne de
           l'air au bloc teinté du titre (mesures de la page Polyglotte, 2026-09-04). */
        .poly-hd { display:grid; gap:0; min-height:52px; font-size:0.75rem; background:var(--cs-fond); border-bottom:1px solid var(--cs-bord); }
        .poly-hd-cell { border-left:1px solid var(--cs-bord-clair); padding:5px 6px; display:flex; align-items:stretch; justify-content:center; min-width:0; }
        /* Le titre de colonne : le nom en sérif de l'échelle haute, le millésime un rang
           plus bas en capitales espacées, le chevron plus bas encore — une marque
           d'ouverture, pas un accent. Le fond du survol et du menu ouvert vit ICI, dans la
           feuille : une déclaration en ligne le rendrait mort (piège consigné). */
        .poly-hd-pick { position:relative; display:flex; align-items:center; justify-content:center; width:100%; min-width:0; padding:7px 18px 7px 6px; border-radius:4px; cursor:pointer; color:inherit; transition:background .15s; }
        .poly-hd-pick:hover, .poly-hd-pick:has(select:focus-visible) { background:rgba(var(--cs-vert-rgb),0.07); }
        .poly-hd-titre { min-width:0; text-align:center; line-height:1.12; }
        .poly-hd-nom { display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-family:var(--font-source-serif), Georgia, serif; font-size:0.875rem; color:var(--cs-encre-fonce); }
        .poly-hd-millesime { display:block; margin-top:3px; font-family:var(--font-source-sans), Arial, sans-serif; font-size:0.5625rem; font-weight:600; letter-spacing:0.15em; text-indent:0.15em; color:var(--cs-texte-gris); }
        .poly-hd-chevron { position:absolute; right:7px; top:50%; transform:translateY(-50%); pointer-events:none; color:var(--cs-texte-doux); }
        /* Le menu natif couvre le titre, invisible : c'est lui qu'on clique, et c'est lui
           que le clavier atteint. */
        .poly-hd-select { position:absolute; inset:0; width:100%; height:100%; margin:0; border:none; opacity:0; cursor:pointer; }
        /* ── Corps de la Polyglotte : classes REPRISES TELLES QUELLES de la page de
           lecture (app/polyglotte/page.tsx) — grille, lettrine, césure, espacement. ── */
        /* Le livre qui change, dans la course des versets : le titre de la page de
           lecture — sérif vert, centré sur les colonnes de texte, deux filets pâles —,
           et COLLANT comme là-bas, pour que le nom reste en vue tant que ses versets
           défilent. Le rembourrage de gauche vaut la marge de référence. */
        .poly-livre-hd { margin:0; padding:10px 12px 10px 44px; font-family:var(--font-source-serif), Georgia, serif; font-size:1rem; font-weight:400; line-height:1.3; color:var(--cs-vert); background:var(--cs-fond); border-top:1px solid var(--cs-vert-pale); border-bottom:1px solid var(--cs-vert-pale); text-align:center; position:sticky; top:0; z-index:3; }
        /* ⛔ LA COLONNE SE COMPOSE COMME CELLE DE LA PAGE POLYGLOTTE, et la composition
           vit dans « globals.css » — une seule déclaration, deux surfaces (demande de
           l'auteur, 2026-09-04). Le commentaire d'au-dessus promettait des classes
           « REPRISES TELLES QUELLES de la page de lecture » ; elles avaient dérivé sur
           tout ce qui compte : texte en sans de 12 px contre une sérif de 14, référence
           canonique dans une colonne bordée et centrée au lieu de la marge, lettrine
           centrée dans son étui au lieu de se poser sur la ligne de base du texte, et
           trois teintes écrites à la main là où la page de lecture emploie des jetons.
           ⚠️ Ne restent ici que les règles PROPRES à cette surface : les filets qui
           séparent les colonnes et les rangées, et le fond d'un verset dont la
           traduction affichée ne porte pas le mot cherché.
           ⚠️ Le corps monte de 13 à 14 px, celui de la page de lecture : la cellule le
           tient de sa rangée, et c'est de lui que la lettrine tire la hauteur de son
           étui (une ligne de texte, exactement). */
        /* ⚠️ Pas de filet entre les rangées, comme sur la page de lecture : le blanc entre
           versets vient de la cellule, et la réglure verticale court sans interruption.
           Le survol assombrit la rangée d'un cheveu, comme là-bas. */
        .poly-row { display:grid; font-size:0.875rem; text-decoration:none; color:inherit; background:var(--cs-fond); transition:filter 0.12s; }
        .poly-row:hover { filter:brightness(0.955); }
        .poly-texte-cell { border-left:1px solid var(--cs-bord-clair); color:var(--cs-encre-fonce); }
        /* La cellule dont la bible ne porte pas le mot : le fond d'absence, et rien
           d'autre — l'encre reste celle du texte. Elle se lisait en rouge sombre, ce qui
           faisait d'un verset ordinaire une alerte.
           ⚠️ Le fond est le SEUL signal ici — la colonne polyglotte n'a pas le sigle barré
           de l'onglet Bible pour le doubler —, et il portait « --cs-danger-fond », le fond
           d'un encart d'alerte : une teinte faite pour ACCOMPAGNER une bordure et un
           libellé, qui, nue sur le crème de la page, ne se voyait plus (relevé de
           l'auteur, 2026-09-08). Le jeton dédié tient la même famille à la dose d'un fond
           qui parle seul. */
        .poly-texte-cell--absent { background:var(--cs-absence-fond); }
        @media (prefers-reduced-motion: reduce) { .poly-row { transition:none; } }
        /* ⛔ UN MENU DU VOLET NE PORTE NI CADRE NI FOND. Neuf bibles ne se posent pas en
           neuf lignes dans un volet — c'est pourquoi ces deux axes gardent un menu là où
           le mode passe en options —, mais le menu se dépouille comme tout le reste : il
           prend l'encre et le corps d'une option, et le navigateur garde sa flèche, qui
           suffit à le dire cliquable. Un fond léger au survol et au foyer, comme le champ
           de recherche. */
        .ctrl-sel { width:100%; font-size:0.71875rem; padding:2px 4px 2px 0; border:none; border-radius:4px; background:transparent; color:var(--cs-texte-second); outline:none; cursor:pointer; font-family:inherit; transition:background 0.12s, color 0.12s; }
        .ctrl-sel:hover { background:rgba(var(--cs-vert-rgb),0.05); color:var(--cs-texte); }
        .ctrl-sel:focus { background:var(--cs-fond-doux); color:var(--cs-encre); }
        /* Info-bulle « Explicitations » : au survol du « ? », les deux modes expliqués. */
        .expl-wrap { position:relative; display:inline-flex; }
        /* ⛔ Au doigt, ces trois contrôles se haussent au-dessus du plancher WCAG
           (24px) : la rangée de ventilation faisait 19,4px de haut, la pagination 27,
           et l'aide des modes 13. Le corps ne bouge pas, seule la boîte grandit. */
        @media (hover: none) {
          .brk-row { padding:8px 6px; }
          .pag-btn { padding:10px 16px; }
          .expl-badge { width:1.5rem; height:1.5rem; font-size:0.6875rem; }
        }
        .expl-badge { width:13px; height:13px; border-radius:50%; border:1px solid #b6ccbd; color:var(--cs-vert); background:var(--cs-vert-pale); font-size:0.53125rem; font-weight:700; line-height:1; display:inline-flex; align-items:center; justify-content:center; cursor:help; }
        .expl-tip { position:absolute; top:calc(100% + 7px); left:-4px; width:250px; background:var(--cs-surface); border:1px solid var(--cs-bord); border-radius:8px; box-shadow:var(--cs-ombre-modale); padding:9px 11px; font-size:0.65625rem; line-height:1.5; color:#5a5248; text-transform:none; letter-spacing:0; font-weight:400; z-index:200; opacity:0; visibility:hidden; transform:translateY(-3px); transition:opacity 0.14s, transform 0.14s; pointer-events:none; }
        .expl-wrap:hover .expl-tip { opacity:1; visibility:visible; transform:translateY(0); }
        ::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:var(--cs-bord);border-radius:4px}
      `}</style>

      {/* Le layout global (`app/layout.tsx`) décale DÉJÀ le contenu de HAUTEUR_NAVBAR sous
          la navbar. On ne rajoute donc PAS de paddingTop ici (sinon double décalage, gros
          blanc en haut) : on prend simplement toute la hauteur restante sous la navbar. */}
      <div style={mobile
        ? { background:'var(--cs-fond)', display:'flex', flexDirection:'column' }
        : { background:'var(--cs-fond)', height:'calc(100dvh - 3.5rem)', display:'flex', overflow:'hidden' }}>

        {/* ── VOLET GAUCHE : intitulé · recherche · options · onglets. Collé sous la
            navbar, pleine hauteur. Le bloc du haut est fixe ; les onglets, en dessous,
            prennent le reste et défilent si besoin. */}
        <aside style={mobile
          ? { width:'100%', borderBottom:'1px solid var(--cs-bord)', background:'var(--cs-fond-clair)', display:'flex', flexDirection:'column' }
          : { width:'clamp(300px, 22vw, 440px)', flexShrink:0, borderRight:'1px solid var(--cs-bord)', background:'var(--cs-fond-clair)', display:'flex', flexDirection:'column', overflow:'hidden' }}>
          <div style={{ flexShrink:0, padding:'9px 20px 12px', display:'flex', flexDirection:'column', alignItems:'stretch', gap:'9px' }}>

            {/* Titre + nombre total de résultats, sur la même ligne, en tête du volet. */}
            <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', gap:'8px' }}>
              {/* ⛔ PLUS DE CAPITALES ESPACÉES en tête du volet : c'est le TITRE de la page,
                  et il prend le rang que la charte donne à un titre de volet — celui que
                  portent déjà l'Histoire, les péricopes et la page d'œuvre. Composé en
                  0,75 rem gris pâle, il pesait moins que la première rubrique d'en dessous.
                  ⚠️ La page n'avait AUCUN titre de niveau 1 : c'en est un maintenant. */}
              <h1 style={{ fontFamily:"var(--font-source-serif), Georgia, serif", fontSize:TITRE_VOLET, fontWeight:GRAISSE_TITRE_VOLET, color:ENCRE_TITRE, margin:0, lineHeight:1.2 }}>Recherche</h1>
              {done && (() => {
                const total = versetsTotal + segmentsTotal + essaisRes.length
                return <span style={{ fontSize:'0.65625rem', color:'var(--cs-texte-faible)', fontStyle:'italic', flexShrink:0 }}>{total} résultat{total > 1 ? 's' : ''}</span>
              })()}
            </div>

            {/* ── LE CHAMP EST SON PROPRE BLOC ──────────────────────────────────────
                Il portait un filet, un rayon, un fond de surface et une ombre posée :
                un objet encadré dans un volet où plus rien ne l'est. Il prend la forme
                des volets de lecture (`.cs-volet-recherche`, globals.css) — rembourrage
                DANS le champ, rien autour, un filet en pied qui le sépare de ce qu'il
                commande, et un fond léger au seul foyer. */}
            {/* Champ principal */}
            <div data-visite="recherche-champ" style={{ position:'relative', width:'100%', borderBottom:'1px solid var(--cs-bord)' }}>
              <input ref={inputRef} value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') { setShowSugg(false); lancer() }
                  if (e.key === 'Escape') setShowSugg(false)
                }}
                onFocus={() => sugg.length > 0 && setShowSugg(true)}
                placeholder="Chercher un mot, une expression…"
                autoFocus
                /* Sans cela le navigateur pré-remplissait le champ avec une saisie passée
                   (« Am imp »…). `type=search` + autoComplete off + name neutre le coupent. */
                type="search"
                name="cs-recherche"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                className="cs-volet-recherche"
                style={{ fontSize:'0.84375rem', padding:'7px 26px 7px 0', color:'var(--cs-texte-fort)', fontFamily:"var(--font-source-serif), Georgia, serif", boxSizing:'border-box' }} />
              {query ? (
                <button onClick={() => { setQuery(''); setSugg([]); setDone(false); setRequete(null); setRepartitionLivres([]); setRepartitionOeuvres([]); setEssaisRes([]); setShowSugg(false) }}
                  style={{ position:'absolute', right:'2px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--cs-texte-faible)', fontSize:'1rem', lineHeight:1, padding:0 }} title="Effacer">×</button>
              ) : (
                <svg style={{ position:'absolute', right:'2px', top:'50%', transform:'translateY(-50%)', color:'var(--cs-bord)', pointerEvents:'none' }} width="15" height="15" viewBox="0 0 20 20" fill="none">
                  <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.6"/>
                  <path d="M13 13l3.5 3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
                </svg>
              )}
              {showSugg && sugg.length > 0 && (
                <ul ref={suggRef} style={{ position:'absolute', top:'calc(100% + 6px)', left:0, right:0, background:'var(--cs-surface)', border:'1px solid var(--cs-bord)', borderRadius:'8px', boxShadow:'var(--cs-ombre-flottante)', margin:0, padding:'5px 0 0', listStyle:'none', zIndex:100, maxHeight:'300px', overflowY:'auto' }}>
                  {sugg.map(s => (
                    <li key={s.mot}
                      onMouseDown={e => { e.preventDefault(); setQuery(s.mot); setShowSugg(false); lancer(s.mot) }}
                      style={{ padding:'7px 18px', fontSize:'0.875rem', color:'var(--cs-texte-fort)', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center', fontFamily:"var(--font-source-serif), Georgia, serif" }}
                      onMouseEnter={e => (e.currentTarget.style.background='var(--cs-fond)')}
                      onMouseLeave={e => (e.currentTarget.style.background='transparent')}>
                      <span>{s.mot}</span>
                      {s.freq > 0 && <span style={{ fontSize:'0.625rem', color:'var(--cs-texte-faible)' }}>{s.freq}</span>}
                    </li>
                  ))}
                  {/* Tout rechercher : lance la recherche par DÉBUT DE MOT sur ce qui est
                      tapé, ce qui couvre d'un coup tous les mots proposés dans la liste
                      (ils commencent tous par le préfixe). Légèrement mis en évidence. */}
                  <li
                    onMouseDown={e => { e.preventDefault(); setShowSugg(false); setMode('prefixe'); lancer(query, 'prefixe') }}
                    style={{ marginTop:'4px', borderTop:'1px solid var(--cs-fond-doux)', padding:'9px 18px', fontSize:'0.78125rem', fontWeight:600, color:'var(--cs-vert-fonce)', background:'var(--cs-vert-pale)', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'space-between', letterSpacing:'0.01em' }}
                    onMouseEnter={e => (e.currentTarget.style.background='var(--cs-fond-doux)')}
                    onMouseLeave={e => (e.currentTarget.style.background='var(--cs-vert-pale)')}>
                    <span>Tout rechercher</span>
                    <span style={{ fontSize:'0.8125rem' }}>↵</span>
                  </li>
                </ul>
              )}
            </div>

            {/* Contrôles, en colonne dans le volet */}
            <div style={{ display:'flex', flexDirection:'column', gap:'11px' }}>
              {/* Mode + « Explicitations » en INFO-BULLE au survol du « ? » : les deux
                  explications ensemble, ce qui évite l'encart qui alourdissait le volet. */}
              <div data-visite="recherche-mode">
                <p style={{ ...RUBRIQUE_AXE, margin:'0 0 3px', display:'flex', alignItems:'center', gap:'4px' }}>
                  Mode de recherche
                  <span className="expl-wrap">
                    <span className="expl-badge">?</span>
                    <span className="expl-tip">
                      <span style={{ display:'block', fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase', fontSize:'0.53125rem', color:'var(--cs-texte-doux)', marginBottom:'7px' }}>Les trois modes</span>

                      <span style={{ display:'block', marginBottom:'8px' }}>
                        <span style={{ display:'block', fontWeight:700, color:'var(--cs-vert-fonce)', marginBottom:'1px' }}>Début de mot</span>
                        <span style={{ display:'block' }}>Trouve les mots qui commencent par ce que vous tapez ; plusieurs termes à la fois sont admis.</span>
                        <span style={{ display:'block', fontStyle:'italic', color:'var(--cs-texte-gris)', marginTop:'2px' }}>« glo » ramène gloire, glorieux, glorifier ; « glo mis » ramène les passages où figurent ensemble un mot en glo- et un mot en mis-.</span>
                      </span>

                      <span style={{ display:'block', marginBottom:'8px' }}>
                        <span style={{ display:'block', fontWeight:700, color:'var(--cs-vert-fonce)', marginBottom:'1px' }}>Mot exact</span>
                        <span style={{ display:'block' }}>Ne trouve que le mot entier ; plusieurs mots entiers, non consécutifs, sont admis.</span>
                        <span style={{ display:'block', fontStyle:'italic', color:'var(--cs-texte-gris)', marginTop:'2px' }}>« gloire » ne ramène ni glorieux ni gloires ; « gloire Dieu » ramène les passages contenant l’un et l’autre.</span>
                      </span>

                      <span style={{ display:'block' }}>
                        <span style={{ display:'block', fontWeight:700, color:'var(--cs-vert-fonce)', marginBottom:'1px' }}>Famille de mots</span>
                        <span style={{ display:'block' }}>Trouve le mot sous toutes ses formes, conjugué ou dérivé, en français seulement.</span>
                        <span style={{ display:'block', fontStyle:'italic', color:'var(--cs-texte-gris)', marginTop:'2px' }}>« aimer » ramène aime, aimait, aimé ; « espérance » ramène aussi espérer et espéré.</span>
                      </span>
                    </span>
                  </span>
                </p>
                {/* ⛔ Les deux boutons encadrés d'un filet — un contrôle segmenté — cèdent
                    aux options en LIGNE du volet de lecture : une par rang, celle qui est
                    retenue sur la pastille verte. C'est le geste des axes « Lecture » et
                    « Commentaires » de la page Bible, et ce sont les mêmes objets de style.
                    ⚠️ Un troisième rang depuis le 2026-09-06, la famille de mots : l'index
                    plein texte français existait sur les segments, rien ne le lisait. */}
                <div>
                  {([['prefixe','Début de mot'],['exact','Mot exact'],['famille','Famille de mots']] as [Mode, string][]).map(([k, lib]) => (
                    <button key={k} className="cs-option-volet" style={OPTION_VOLET(mode === k)}
                      aria-pressed={mode === k} onClick={() => setMode(k)}>{lib}</button>
                  ))}
                </div>
              </div>
              {/* « Chercher dans » (périmètre) et « Afficher en » (traduction montrée),
                  côte à côte pour tenir sur une seule ligne. « Afficher en » ne disparaît
                  jamais : il commande l'affichage quel que soit le périmètre. */}
              <div data-visite="recherche-perimetre" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
                <div>
                  <p style={{ ...RUBRIQUE_AXE, margin:'0 0 2px' }}>Chercher dans</p>
                  <select className="ctrl-sel" style={{ width:'100%' }} value={tradScope}
                    onChange={e => { const v=e.target.value; setTradScope(v); if(v!=='ALL') setTradAffichage(v) }}>
                    <option value="ALL">Toutes les bibles</option>
                    {traductions.map(t=><option key={t.code} value={t.code}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <p style={{ ...RUBRIQUE_AXE, margin:'0 0 2px' }}>Afficher en</p>
                  <select className="ctrl-sel" style={{ width:'100%' }} value={tradAffichage} onChange={e=>setTradAffichage(e.target.value)}>
                    {traductions.map(t=><option key={t.code} value={t.code}>{t.label}</option>)}
                  </select>
                </div>
              </div>
              {/* Enregistrer ma recherche : dès qu'il y a des résultats. Un clic mémorise
                  mot(s), page et position ; « Reprendre » (juste dessous) y ramène. Le libellé
                  passe brièvement à « Recherche enregistrée » en accusé de réception. */}
              {/* Enregistrer / Reprendre : deux boutons de même hauteur, resserrés. Un clic
                  « Enregistrer » mémorise mot(s), page et position ; si une AUTRE recherche est
                  déjà mémorisée, une fenêtre demande d'abord confirmation d'écrasement. */}
              {((done && (versetsTotal + segmentsTotal + essaisRes.length) > 0) || rechercheSauvee) && (
                <div data-visite="recherche-garder" style={{ display:'flex', flexDirection:'column', gap:'3px', marginTop:'2px' }}>
                  {done && (versetsTotal + segmentsTotal + essaisRes.length) > 0 && (
                    <button onClick={enregistrerRecherche} title="Mémoriser cette recherche pour la reprendre plus tard, au même endroit"
                      style={{ display:'flex', alignItems:'center', gap:'7px', width:'calc(100% + 14px)', margin:'0 -7px', boxSizing:'border-box', textAlign:'left', fontSize:'0.6875rem', color:'var(--cs-vert)', background:'transparent', border:'none', borderRadius:'4px', padding:'3px 7px', cursor:'pointer', transition:'background 0.12s' }}
                      onMouseEnter={e => (e.currentTarget.style.background='rgba(var(--cs-vert-rgb),0.08)')}
                      onMouseLeave={e => (e.currentTarget.style.background='transparent')}>
                      <svg width="11" height="12" viewBox="0 0 12 13" fill="none" aria-hidden="true" style={{ flexShrink:0 }}>
                        <path d="M3 2.2C3 1.75 3.35 1.4 3.8 1.4H8.2C8.65 1.4 9 1.75 9 2.2V11L6 9.15L3 11V2.2Z" stroke="currentColor" strokeWidth="1.25" strokeLinejoin="round" fill="none"/>
                      </svg>
                      <span style={{ minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {vientDEnregistrer ? 'Recherche enregistrée' : 'Enregistrer ma recherche'}
                      </span>
                    </button>
                  )}
                  {/* Reprendre : même hauteur que « Enregistrer », date d'enregistrement à droite. */}
                  {rechercheSauvee && (
                    <button onClick={reprendreRecherche} title={`Reprendre « ${rechercheSauvee.query} » là où vous en étiez`}
                      style={{ display:'flex', alignItems:'center', gap:'7px', width:'calc(100% + 14px)', margin:'0 -7px', boxSizing:'border-box', textAlign:'left', fontSize:'0.6875rem', color:'var(--cs-vert)', background:'transparent', border:'none', borderRadius:'4px', padding:'3px 7px', cursor:'pointer', transition:'background 0.12s' }}
                      onMouseEnter={e => (e.currentTarget.style.background='rgba(var(--cs-vert-rgb),0.08)')}
                      onMouseLeave={e => (e.currentTarget.style.background='transparent')}>
                      <svg width="11" height="11" viewBox="0 0 14 14" fill="none" aria-hidden="true" style={{ flexShrink:0 }}>
                        <path d="M2.5 7a4.5 4.5 0 1 1 1.3 3.2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none"/>
                        <path d="M2.2 4.2v2.6h2.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                      </svg>
                      <span style={{ flex:1, minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        Reprendre ma recherche
                        <span style={{ color:'var(--cs-texte-doux)', fontStyle:'italic' }}> {rechercheSauvee.query}</span>
                      </span>
                      {rechercheSauvee.ts ? <span style={{ flexShrink:0, color:'var(--cs-texte-faible)', fontStyle:'italic', fontSize:'0.59375rem' }}>{formatDateCourt(rechercheSauvee.ts)}</span> : null}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Onglets VERTICAUX : prennent tout l'espace restant (flex:1, minHeight:0) et
              défilent si l'écran est court. Les libellés longs passent à la ligne au lieu
              d'être coupés. */}
          {done && (
            <nav data-visite="recherche-onglets" style={{ flex:1, minHeight:0, maxHeight: mobile ? '45vh' : undefined, overflowY:'auto', borderTop:'1px solid var(--cs-bord-clair)', padding:'6px 0 10px' }}>
              {([
                { k:'bible', label:'Bible', n:versetsTotal },
                { k:'polyglotte', label:'Polyglotte', n:versetsTotal },
                { k:'patristique', label:'Pères de l’Église', n:segmentsTotal },
                { k:'essais', label:'Publications de la communauté', n:essaisRes.length },
              ] as { k:Onglet; label:string; n:number }[]).map(o => {
                const actif = onglet===o.k
                return (
                  <Fragment key={o.k}>
                    {/* La famille se pose sur l'onglet ET sur sa répartition : le survol,
                        l'état actif et la ligne filtrée en dérivent tous par `color-mix`. */}
                    <button className={`ong-vert${actif ? ' ong-vert--actif' : ''}`} style={styleFamille(o.k)} onClick={()=>setOnglet(o.k)}>
                      <span className="lib"><span className="pastille" aria-hidden="true" />{o.label}</span>
                      <span className="ong-count">{o.n}</span>
                    </button>
                    {/* Répartition détaillée sous l'onglet actif : livres (Bible/Polyglotte),
                        œuvres (Pères), publications (communauté), avec le nombre d'occurrences.
                        Chaque ligne est CLIQUABLE : elle restreint les résultats à ce
                        regroupement ; un second clic sur la même ligne annule le filtre. */}
                    {actif && o.n > 0 && (
                      <div style={{ ...styleFamille(o.k), padding:'2px 14px 8px 26px', display:'flex', flexDirection:'column', gap:'1px' }}>
                        {(o.k==='bible' || o.k==='polyglotte') && repartitionLivres.map(({ livre: code, n }) => {
                          const sel = filtres.livre === code
                          return (
                            <button key={code} className={`brk-row${sel ? ' brk-row--actif' : ''}`}
                              onClick={() => { setFiltres(f => ({ ...f, livre: f.livre === code ? null : code })); setPageV(0) }}
                              title={sel ? 'Retirer le filtre' : `N'afficher que ${NOMS_LIVRES[code] ?? code}`}>
                              <span style={{ minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{NOMS_LIVRES[code] ?? code}</span>
                              <span className="brk-count">{n}</span>
                            </button>
                          )
                        })}
                        {/* Une œuvre se désigne par son IDENTIFIANT : c'est lui que la base
                            reçoit en filtre, et deux œuvres d'un même auteur peuvent porter
                            le même titre. */}
                        {o.k==='patristique' && repartitionOeuvres.map(r => {
                          const cle = r.id_oeuvre
                          const sel = filtres.oeuvre === cle
                          return (
                            <button key={cle} className={`brk-row${sel ? ' brk-row--actif' : ''}`}
                              onClick={() => { setFiltres(f => ({ ...f, oeuvre: f.oeuvre === cle ? null : cle })); setPageS(0) }}
                              title={sel ? 'Retirer le filtre' : `N'afficher que ${r.auteur_nom}${r.oeuvre_titre ? ' — ' + r.oeuvre_titre : ''}`}>
                              <span style={{ minWidth:0 }}>
                                <span style={{ color: sel ? 'inherit' : 'var(--cs-texte)' }}>{r.auteur_nom}</span>
                                {r.oeuvre_titre && <span style={{ color: sel ? 'inherit' : 'var(--cs-texte-doux)', fontStyle:'italic' }}> — {r.oeuvre_titre}</span>}
                              </span>
                              <span className="brk-count">{r.n}</span>
                            </button>
                          )
                        })}
                        {o.k==='essais' && repartitionEssais.map(r => {
                          const sel = filtres.essai === r.id
                          return (
                            <button key={r.id} className={`brk-row${sel ? ' brk-row--actif' : ''}`}
                              onClick={() => { setFiltres(f => ({ ...f, essai: f.essai === r.id ? null : r.id })); setPageE(0) }}
                              title={sel ? 'Retirer le filtre' : `N'afficher que « ${r.titre} »`}>
                              <span style={{ minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.titre}</span>
                              <span className="brk-count">{r.n}</span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </Fragment>
                )
              })}
            </nav>
          )}
        </aside>

        {/* ── TABLEAU DE RÉSULTATS : tout l'espace libre ── */}
        <main style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column', overflow: mobile ? 'visible' : 'hidden' }}>

          {/* (La bannière « résultats trop nombreux » est partie avec les plafonds : la
              base compte tout, et la page le pagine.) */}

          {/* ── En-tête de la Polyglotte — hors du défilement, LA BARRE DE LA PAGE
              POLYGLOTTE telle qu'elle est depuis le 2026-09-04 (demande de l'auteur,
              2026-09-06 : « il y a une nouvelle version du tableau dans la page
              Polyglotte ; il faut la reproduire »). Une seule ligne et un unique filet
              dessous : en tête de chaque colonne, le nom de l'édition en sérif, son
              millésime en capitales espacées, et un chevron qui dit que le nom est un
              menu. La cellule donne de l'air au bloc teinté du survol (5 px en haut et en
              bas, 6 sur les côtés), comme là-bas.
              ⚠️ Le menu est un <select> NATIF posé, invisible, sur le titre : la page de
              lecture compose le sien à la main parce qu'elle a des FAMILLES d'éditions à
              déployer ; ici les bibles n'en ont pas, et un menu natif les groupe par
              langue sans qu'on écrive un panneau de plus. */}
          {done && onglet==='polyglotte' && versetsTotalFiltre > 0 && (
            <div className="poly-hd" style={{ gridTemplateColumns: polyTmpl, flexShrink:0, margin: mobile ? '12px 12px 0' : '12px 22px 0' }}>
              {/* La marge de la référence : la réglure ne commence qu'après elle. */}
              <div />
              {colAffichees.map((code, i) => {
                const autresChoisies = new Set(colTrads.filter((_, j) => j !== i))
                const trad = traductions.find(t => t.code === code)
                const groupes = [
                  ...GROUPES_LANG.map(g => ({ ...g, membres: traductions.filter(t => t.lang === g.code) })),
                  { code: 'autres', label: 'Autres', membres: traductions.filter(t => !GROUPES_LANG.some(g => g.code === t.lang)) },
                ].filter(g => g.membres.length)
                return (
                  <div key={i} className="poly-hd-cell">
                    <div className="poly-hd-pick" title="Changer de traduction">
                      <span aria-hidden="true" className="poly-hd-titre">
                        <span className="poly-hd-nom">{trad ? rendreEnrichi(trad.label) : 'Choisir une traduction'}</span>
                        {trad?.millesime && <span className="poly-hd-millesime">{trad.millesime}</span>}
                      </span>
                      <svg aria-hidden="true" className="poly-hd-chevron" width="9" height="9" viewBox="0 0 10 10" fill="none">
                        <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <select className="poly-hd-select" value={code} aria-label="Bible de cette colonne"
                        onChange={e => setColTrads(prev => prev.map((c, j) => j === i ? e.target.value : c))}>
                        {groupes.map(g => (
                          <optgroup key={g.code} label={g.label}>
                            {g.membres.map(t => (
                              <option key={t.code} value={t.code} disabled={autresChoisies.has(t.code)}>
                                {sansEnrichissements(t.label)}{t.millesime ? ` · ${t.millesime}` : ''}{autresChoisies.has(t.code) ? ' (déjà affichée)' : ''}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Résultats */}
          <div ref={zoneResultatsRef} style={{ flex:1, minHeight: mobile ? '40vh' : undefined, overflowY: mobile ? 'visible' : 'auto', scrollbarGutter:'stable', padding: (done && onglet==='polyglotte' && versetsTotalFiltre > 0) ? (mobile ? '0 12px 4px' : '0 22px 4px') : (mobile ? '6px 12px 4px' : '6px 22px 4px') }}>

            {!done && !loading && !reference && (
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                ...(mobile ? { marginTop:'40px', marginBottom:'24px' } : { height:'100%' }) }}>
                {/* Un désert et une fosse tiennent la page tant qu'aucune requête n'est lancée.

                    La pose est celle de la tour de Babel sur le Polyglotte, et pour la même
                    raison : sur PC cette colonne fait TOUTE la hauteur sous la navbar et se
                    trouve entièrement vide, l'intitulé, la recherche et les onglets vivant dans
                    le volet de gauche. C'est donc un écran d'attente, non un blanc de pied de
                    page — d'où la même mesure, la même opacité et la même invite en sérif
                    italique. Un cul-de-lampe discret posé en haut de la colonne y flottait.

                    ⚠️ Le centrage vertical vient du flux, la zone étant de hauteur définie sur
                    PC. En MOBILE elle ne l'est pas (minHeight en vh, débordement visible) : un
                    « height: 100 % » s'y effondrerait, et le groupe reprend donc des marges.

                    ⛔ Aucune LARGEUR posée, deux MAXIMA seulement (charte). Le plafond de hauteur
                    est l'autre moitié du réglage et vaut pour les écrans BAS : la planche est
                    large de 1600 sur 780, donc à 816 px elle en ferait 398 de haut, ce qui ne
                    tient plus sous une fenêtre de 720 px. Les deux dimensions restant
                    automatiques, le navigateur applique les maxima l'un après l'autre en tenant
                    le rapport (CSS 2.1, § 10.4). */}
                <img className="cs-ornement" src="/ornements/desert-fosse.png" alt="" aria-hidden="true"
                  style={{ maxWidth:'min(68rem, 96%)', maxHeight:'calc(100dvh - 3.5rem - 15rem)', opacity:0.72, marginBottom:'16px' }} />
                <p style={{ fontFamily:"var(--font-source-serif), Georgia, serif", fontSize:'0.9375rem', fontStyle:'italic', color:'var(--cs-texte-doux)', letterSpacing:'0.02em', margin:0 }}>Lancez une recherche</p>
              </div>
            )}
            {loading && (
              <div style={{ textAlign:'center', marginTop:'80px' }}>
                <p style={{ fontSize:'0.8125rem', color:'var(--cs-texte-faible)', fontStyle:'italic' }}>Recherche en cours…</p>
              </div>
            )}
            {/* Une panne se DIT, et propose de réessayer : un échec rendu « aucun
                résultat » est la pire des réponses. */}
            {erreur && !loading && (
              <div style={{ textAlign:'center', marginTop:'40px' }}>
                <p style={{ fontSize:'0.8125rem', color:'var(--cs-danger-fonce)', fontStyle:'italic', margin:0 }}>
                  {erreur}{' '}
                  <button onClick={() => lancer(lastQuery || query)} className="pag-btn" style={{ marginLeft:'8px', fontStyle:'normal' }}>Réessayer</button>
                </p>
              </div>
            )}

            {/* ── Le PASSAGE que la saisie désigne ──
                « Jean 3, 16 » ou « Genèse 22 » n'est pas un mot à chercher, c'est un
                endroit où aller : la page l'ouvre en tête, quel que soit l'onglet, avant
                les résultats — qui, sur une référence, sont presque toujours vides. La
                grammaire est celle des péricopes (audit du 2026-09-06). */}
            {reference && !loading && (
              <div style={{ ...styleFamille('bible'), marginBottom:'10px' }}>
                <div className="grp">
                  <div className="grp-hd"><span className="nom">Passage biblique</span></div>
                  <div className="grp-corps">
                    <a href={reference.href} className="grp-ligne" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'10px' }}>
                      <span style={{ fontFamily:"var(--font-source-serif), Georgia, serif", fontSize:'0.9375rem', fontWeight:600, color:'var(--cs-encre)' }}>Ouvrir {reference.libelle}</span>
                      <span style={{ color:'var(--fam)', display:'inline-flex' }}><IconeChevron dir="right" size={13} strokeWidth={1.5} /></span>
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* ── Bible ── */}
            {done && onglet==='bible' && (
              versetsTotalFiltre===0
                ? <Vide texte="Aucun verset trouvé." />
                : <div style={{ ...styleFamille('bible'), ...styleAttente(versetsEnAttente) }}>
                  {/* Un groupe par LIVRE. Les versets arrivant dans l'ordre canonique, une
                      tranche consécutive est exactement un livre. Le nom du livre monte donc
                      dans la rubrique et la référence de chaque ligne retombe à « 18, 2 ».
                      ⛔ Aucun COMPTE dans la rubrique : celui de la page mentirait sur le
                      livre, celui du livre mentirait sur la page. Les comptes complets vivent
                      dans le volet gauche, et le total sous la pagination. */}
                  {grouperConsecutifs(versetsPage.lignes, v => v.livre).map(tranche => (
                    <div className="grp" key={tranche.cle}>
                      <div className="grp-hd">
                        <span className="nom">{NOMS_LIVRES[tranche.cle] ?? tranche.cle}</span>
                      </div>
                      <div className="grp-corps">
                        {tranche.items.map(v => {
                          const texte = String((v as any)[tradBible]??'')
                          const labelDisplay = traductions.find(t=>t.code===tradBible)?.label ?? tradBible
                          const displayLeMot = !!(lastQuery && contientMarque(texte, marque))
                          // TOUTES les bibles qui portent le mot, en SIGLES sur la ligne du haut.
                          // Celle qui est affichée porte un filet ; elle est barrée quand le mot
                          // n'y figure pas, et la ligne prend alors le fond d'absence.
                          const contientDans = lastQuery
                            ? traductions.filter(t => contientMarque(String((v as any)[t.code]??''), marque))
                            : []
                          return (
                            <a key={v.id_verset}
                              // Lien vers la page Bible : livre, chapitre, verset ET la traduction
                              // choisie, avec l'ancre du verset pour l'y amener et l'y sélectionner.
                              href={`/?livre=${encodeURIComponent(v.livre)}&chapitre=${v.chapitre}&verset=${v.verset}&trad=${tradBible}#verset-${v.verset}`}
                              target="_blank" rel="noopener noreferrer"
                              className={`grp-ligne${!displayLeMot && contientDans.length ? ' grp-ligne--absent' : ''}`}>
                              <div style={{ display:'flex', alignItems:'baseline', gap:'7px', flexWrap:'wrap' }}>
                                <span style={{ fontSize:'0.65625rem', fontWeight:600, color:'var(--cs-texte-second)', letterSpacing:'0.01em', fontVariantNumeric:'tabular-nums' }}>{v.chapitre}, {v.verset}</span>
                                <span className="sigles">
                                  <span className={`sigle ${displayLeMot ? 'sigle--affichee' : 'sigle--absente'}`} title={labelDisplay}>{siglesParCode[tradBible] ?? tradBible}</span>
                                  {contientDans.filter(t => t.code !== tradBible).map(t => (
                                    <span key={t.code} className="sigle" title={t.label}>{siglesParCode[t.code] ?? t.label}</span>
                                  ))}
                                </span>
                              </div>
                              {/* Toujours le texte de la traduction CHOISIE, SANS SÉRIF. Surligné si le
                                  mot y est ; sinon montré tel quel (la ligne du haut dit où il se trouve). */}
                              <p style={{ fontFamily:"var(--font-source-sans), Arial, sans-serif", fontSize:'0.78125rem', lineHeight:1.32, color:'var(--cs-texte-fort)', margin:0 }}>
                                {texte
                                  ? rendreEtSurligner(texte, marque)
                                  : <span style={{ color:'var(--cs-texte-faible)', fontStyle:'italic' }}>Ce verset n’existe pas dans {labelDisplay}.</span>}
                              </p>
                            </a>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
            )}

            {/* ── Patristique ── */}
            {done && onglet==='patristique' && (
              segmentsTotalFiltre===0
                ? <Vide texte="Aucun passage trouvé." />
                : <div style={{ ...styleFamille('patristique'), ...styleAttente(segmentsEnAttente) }}>
                  {/* Un groupe par ŒUVRE. La base range les passages par auteur puis par
                      œuvre : une tranche consécutive est exactement une œuvre. L'auteur et
                      le titre cessent donc d'être répétés à chaque passage, et la ligne ne
                      porte plus que sa cote. */}
                  {grouperConsecutifs(segmentsPage.lignes, s => s.id_oeuvre).map(tranche => (
                    <div className="grp" key={tranche.cle}>
                      <div className="grp-hd">
                        <span className="nom">{tranche.items[0].auteur_nom}</span>
                        {tranche.items[0].oeuvre_titre && <span className="compl">{tranche.items[0].oeuvre_titre}</span>}
                      </div>
                      <div className="grp-corps">
                        {tranche.items.map(s=>(
                          <a key={s.id} href={`/oeuvre/${encodeURIComponent(s.id_oeuvre)}?texte=${encodeURIComponent(s.id_texte)}&segment=${s.id}#segment-${s.id}`}
                            target="_blank" rel="noopener noreferrer" className="grp-ligne">
                            {/* Le niveau 1 seul, et seulement s'il existe : le reste est dans la rubrique. */}
                            {s.ref_niv1 && (
                              <div style={{ display:'flex', alignItems:'baseline', gap:'7px', flexWrap:'wrap' }}>
                                <span style={{ fontSize:'0.65625rem', fontWeight:600, color:'var(--cs-texte-second)' }}>{s.ref_niv1}</span>
                              </div>
                            )}
                            {/* Résultat latin/grec : on n'affiche QUE l'original (badge de langue,
                                latin en italiques, grec en romain). Sinon, le texte français. */}
                            {s.matchOrig && s.texte_original ? (
                              <p style={{ fontFamily:"var(--font-source-sans), Arial, sans-serif", fontSize:'0.78125rem', lineHeight:1.32, color:'var(--cs-texte-fort)', margin:0 }}>
                                <span style={{ display:'inline-block', fontStyle:'normal', fontSize:'0.5rem', fontWeight:700, letterSpacing:'0.05em', textTransform:'uppercase', color:'var(--fam)', background:'color-mix(in srgb, var(--fam) 14%, var(--cs-surface))', borderRadius:'4px', padding:'0 5px', marginRight:'6px', verticalAlign:'1px' }}>{s.langue || 'Original'}</span>
                                <span style={{ fontStyle: s.langue === 'Latin' ? 'italic' : 'normal' }}>
                                  {rendreEtSurligner(nettoyerFin(s.texte_original), marqueOriginal)}
                                </span>
                              </p>
                            ) : (
                              <p style={{ fontFamily:"var(--font-source-sans), Arial, sans-serif", fontSize:'0.78125rem', lineHeight:1.32, color:'var(--cs-texte-fort)', margin:0 }}>
                                {/* Un appel de note matériel « [[1772]] » n'a pas de note à ouvrir
                                    ici : il s'efface de l'extrait, avec l'espace qui le précède. */}
                                {rendreEtSurligner(nettoyerFin(s.segment_texte.replace(/[ \t]*\[\[\d+\]\]/g, '')), marque)}
                              </p>
                            )}
                          </a>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
            )}

            {/* ── Essais ── */}
            {done && onglet==='essais' && (
              essaisFiltres.length===0
                ? <Vide texte="Aucun essai trouvé." />
                : <div style={styleFamille('essais')}>
                  {/* Une publication est déjà un groupe à elle seule : son titre monte dans la
                      rubrique avec sa catégorie, et la ligne garde le sous-titre et l'extrait. */}
                  {essaisPage.map(e=>{
                    const extrait = snippetEssai(e.contenu, lastQuery)
                    const texteAffiche = (e.resume && contientMarque(e.resume, marque)) ? e.resume : extrait
                    return (
                      <div className="grp" key={e.id}>
                        <div className="grp-hd">
                          <span className="nom">{e.titre}</span>
                          {e.categories?.[0] && <span className="compl">{e.categories[0]}</span>}
                        </div>
                        <div className="grp-corps">
                          <a href={`/essais/${e.id}`} target="_blank" rel="noopener noreferrer" className="grp-ligne">
                            {e.sous_titre && <p style={{ fontSize:'0.6875rem', color:'var(--cs-texte-gris)', fontStyle:'italic', margin:'0 0 2px' }}>{e.sous_titre}</p>}
                            <p style={{ fontFamily:"var(--font-source-sans), Arial, sans-serif", fontSize:'0.78125rem', lineHeight:1.42, color:'var(--cs-texte-fort)', margin:0 }}>
                              {highlighter(texteAffiche, marque)}
                            </p>
                          </a>
                        </div>
                      </div>
                    )
                  })}
                </div>
            )}

            {/* ── Polyglotte — structure REPRISE de la page de lecture : grille avec colonne
                de référence canonique en marge (44px) + une colonne par traduction, lettrine
                d'origine, texte justifié et césuré, zébrage vert, en-tête de livre = NOM SEUL. */}
            {done && onglet==='polyglotte' && (
              versetsTotalFiltre===0
                ? <Vide texte="Aucun verset trouvé." />
                : (() => {
                    const livresVus = new Set<string>()
                    return (
                      <div className="poly-outer" style={styleAttente(versetsEnAttente)}>
                        {versetsPage.lignes.map(v => {
                          const estNouveauLivre = !livresVus.has(v.livre)
                          if (estNouveauLivre) livresVus.add(v.livre)
                          return (
                            <Fragment key={v.id_verset}>
                              {/* Le livre qui change : le titre COLLANT de la page Polyglotte,
                                  en sérif vert, centré sur les colonnes de texte (le
                                  rembourrage de gauche vaut la marge de référence), qui reste
                                  en vue tant que ses versets défilent. */}
                              {estNouveauLivre && (
                                <h2 className="poly-livre-hd">{NOMS_LIVRES[v.livre] ?? v.livre}</h2>
                              )}
                              <a className="poly-row" style={{ gridTemplateColumns:polyTmpl }}
                                href={`/?livre=${encodeURIComponent(v.livre)}&chapitre=${v.chapitre}&verset=${v.verset}&trad=${tradBible}#verset-${v.verset}`}
                                target="_blank" rel="noopener noreferrer">
                                {/* ⛔ LA RÉFÉRENCE CANONIQUE EST EN MARGE, non dans une colonne
                                    bordée : elle accompagne le verset au lieu de l'encadrer, et
                                    elle emprunte le strut de la cellule pour poser sa ligne de
                                    base sur celle du texte. C'est la forme de la page Polyglotte
                                    depuis le 2026-09-04. */}
                                <div className="poly-marge-ref" style={{ color:'var(--cs-vert)' }}>
                                  <span>{v.chapitre}, {v.verset}</span>
                                </div>
                                {/* Une colonne par traduction */}
                                {colAffichees.map((code, i) => {
                                  const lang = traductions.find(t => t.code === code)?.lang ?? 'fr'
                                  // `original` garde l'enrichissement (`<i>` de Sacy, etc.) pour l'affichage ;
                                  // `brut` (dépouillé) sert à détecter l'absence du mot et à césurer le grec.
                                  const original = String((v as any)[code] ?? '')
                                  const brut = texteSansEnrichissement(original)
                                  const numOrig = String((v as any)['num_' + code] ?? '').trim()
                                  const absent = brut && lastQuery ? !contientMarque(brut, marque) : false
                                  return (
                                    <div key={i} lang={lang} onCopy={copierSansCesures} className={`poly-texte-cell${absent ? ' poly-texte-cell--absent' : ''}`}>
                                      {/* Lettrine : référence(s) d'origine de l'édition (num_TRxxxx),
                                          « ch, v » séparées par « · » si plusieurs versets réunis. */}
                                      {brut && numOrig && (
                                        <span className="poly-lettrine">
                                          {numOrig.split('·').map(s => s.trim()).filter(Boolean).map((nn, k) => {
                                            const m = nn.match(/^(\d+)\s*,\s*(.+)$/)
                                            return (
                                              <span key={k} className="poly-lettrine-item">
                                                <span className="poly-lettrine-ref">
                                                  {m ? <><span className="poly-lettrine-ch">{m[1]},</span> {m[2]}</> : nn}
                                                </span>
                                              </span>
                                            )
                                          })}
                                        </span>
                                      )}
                                      {!brut ? <span title={MENTION_ABSENT_TITRE} style={STYLE_MENTION}>{MENTION_ABSENT}</span>
                                        : lang === 'grc' ? (absent ? cesurerGrec(brut) : highlighter(cesurerGrec(brut), marque))
                                        : rendreEtSurligner(original, marque)}
                                    </div>
                                  )
                                })}
                              </a>
                            </Fragment>
                          )
                        })}
                      </div>
                    )
                  })()
            )}
          </div>

          {/* ── Pagination ── */}
          {done && totalActive>PAGE && (
            <div style={{ flexShrink:0, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 24px 14px', borderTop:'1px solid var(--cs-bord-clair)' }}>
              {/* Maintien enfoncé = défilement rapide (souris ET tactile). */}
              <button className="pag-btn" disabled={pageActive===0} style={{ display:'inline-flex', alignItems:'center', gap:'5px' }}
                onMouseDown={()=>demarrerDefilement(-1)} onMouseUp={arreterDefilement} onMouseLeave={arreterDefilement}
                onTouchStart={e=>{e.preventDefault();demarrerDefilement(-1)}} onTouchEnd={arreterDefilement}><IconeChevron dir="left" size={12} />Précédent</button>
              <span style={{ fontSize:'0.6875rem', color:'var(--cs-texte-faible)' }}>{debut}–{fin} <span style={{ color:'var(--cs-bord)' }}>sur</span> {totalActive}</span>
              <button className="pag-btn" disabled={pageActive>=pagesTotal-1} style={{ display:'inline-flex', alignItems:'center', gap:'5px' }}
                onMouseDown={()=>demarrerDefilement(1)} onMouseUp={arreterDefilement} onMouseLeave={arreterDefilement}
                onTouchStart={e=>{e.preventDefault();demarrerDefilement(1)}} onTouchEnd={arreterDefilement}>Suivant<IconeChevron dir="right" size={12} /></button>
            </div>
          )}
        </main>
      </div>

      {/* Fenêtre de confirmation d'écrasement : s'ouvre APRÈS un clic sur « Enregistrer »
          quand une autre recherche est déjà mémorisée. « Écraser » remplace la précédente. */}
      {confirmEcrasement && rechercheSauvee && (
        <div onClick={() => setConfirmEcrasement(false)}
          style={{ position:'fixed', inset:0, background:'rgba(30,28,24,0.38)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:'20px' }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background:'var(--cs-fond-clair)', border:'1px solid var(--cs-bord)', borderRadius:'8px', boxShadow:'var(--cs-ombre-modale)', padding:'20px 22px', maxWidth:'21.25rem', width:'100%' }}>
            <p style={{ fontFamily:"var(--font-source-serif), Georgia, serif", fontSize:'0.875rem', fontWeight:600, color:'var(--cs-encre)', margin:'0 0 8px' }}>Écraser la recherche précédente ?</p>
            <p style={{ fontSize:'0.75rem', color:'var(--cs-texte-second)', lineHeight:1.5, margin:'0 0 16px' }}>
              Une recherche est déjà enregistrée (« {rechercheSauvee.query} », {formatDateCourt(rechercheSauvee.ts)}).
              L’enregistrer maintenant remplacera cette sauvegarde par « {lastQuery} ».
            </p>
            <div style={{ display:'flex', gap:'8px', justifyContent:'flex-end' }}>
              <button onClick={() => setConfirmEcrasement(false)}
                style={{ fontSize:'0.71875rem', padding:'6px 14px', border:'1px solid var(--cs-bord)', borderRadius:'8px', background:'var(--cs-surface)', color:'var(--cs-texte-second)', cursor:'pointer' }}>Annuler</button>
              <button onClick={() => { ecrireRecherche(); setConfirmEcrasement(false) }}
                style={{ fontSize:'0.71875rem', padding:'6px 14px', border:'none', borderRadius:'8px', background:'var(--cs-vert-aplat)', color:'var(--cs-sur-aplat)', fontWeight:600, cursor:'pointer' }}>Écraser</button>
            </div>
          </div>
        </div>
      )}

      {/* La visite, en dernier : elle se rend dans un portail vers le corps du
          document, et son voile passe au-dessus de tout ce que la page porte. */}
      {visite > 0 && (
        <VisiteGuidee key={visite} visite={VISITE_RECHERCHE} onFin={() => setVisite(0)} />
      )}
    </>
  )
}

function Vide({ texte }: { texte: string }) {
  return <p style={{ fontSize:'0.75rem', color:'var(--cs-texte-faible)', fontStyle:'italic', marginTop:'24px', textAlign:'center' }}>{texte}</p>
}
