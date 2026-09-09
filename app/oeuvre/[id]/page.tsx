import {
  AUCUN_ECHO,
  estLiminaireSansNiveau,
  estSegmentDeLApparat,
  limiterRequeteAuxLiminairesSansNiveau,
  limiterRequeteSegmentsALaSurface,
  partagerLApparat,
  segmentsDeLaSurface,
  SELECT_SEGMENT,
} from '@/app/lib/oeuvreSelects'
import { hydraterLiensHerites } from '@/app/lib/liens'
import { codesTraductionsLecture } from '@/app/lib/traductions'
import type { Metadata } from 'next'
import { estAdmin as verifierEstAdmin } from '@/app/lib/verifAdmin'
import { estOeuvrePubliee } from '@/app/lib/oeuvresPublication'
import { creerSupabaseServeur } from '@/app/lib/supabaseServeur'
import { chargerIndexEditeurs } from '@/app/lib/editeursServeur'
import type { IndexEditeurs } from '@/app/lib/editeursNormalisation'
import { JsonLd, donneesLivre, donneesFilAriane } from '@/app/lib/donneesStructurees'
import { descriptionOeuvre, enTetesPartage, titreOeuvre } from '@/app/lib/metadonneesSeo'
import { porteDesLiensBibliques } from '@/app/lib/metadonneesSeoServeur'
import OeuvreClient from './OeuvreClient'
import type { AlignementDisponible, ChampTitre, TocEntry, VersionTextuelle } from './oeuvreTypes'
import {
  chargerProjectionBilingue,
  type BlocOriginal,
} from './bilingueAlignement'
import { choisirPaireDeLecture, ensemblesUtilisables } from './paireDeLecture'
import {
  composerSegments,
  extraireVersets,
  indexerVersetsCites,
  type LigneVersetCite,
  type SegmentBrut,
  type VersetsCites,
} from './pipelineSegments'
import { decomposerEdition, labelCourtVersion, libelleTraducteurVersion } from './versionTextuelle'
import { chargerAuteursDOeuvre, libelleAuteurs } from '@/app/lib/auteursOeuvre'
import { enumererTraducteurs } from '@/app/lib/traducteurs'
import {
  champDuTitre,
  projeterAppelsNotesStructureesSansFaillir,
  type AncreNoteStructureeProjection,
} from '@/app/lib/appelsNotesStructurees'
import { AUCUNE_NOTE, chargerNotesStructurees } from '@/app/lib/notesStructureesChargement'
import { noterDegradation, tolerer, type DegradationChargement } from '@/app/lib/chargementTolerant'
import type { NoticeBibliographique } from '@/app/lib/referenceBibliographique'
import { chargerNoticesBibliographiques, identifiantsOuvrages, tableDesNotices } from '@/app/lib/referencesBibliographiquesChargement'
import { redirect } from 'next/navigation'
import { cache } from 'react'

// Base fermée au rôle anonyme : chaque entrée serveur (métadonnées, page) crée
// son client lisant la session du visiteur. Sans cela, la page s'exécutait en
// `anon` et ne recevait plus ni segments ni versets.
type Client = Awaited<ReturnType<typeof creerSupabaseServeur>>

/**
 * Les trois lectures que `generateMetadata` et la page font TOUTES DEUX : l'œuvre, ses
 * textes, ses auteurs. Le routeur exécute les deux dans la MÊME requête HTTP, et le client
 * Supabase n'est pas mis en cache par lui : sans `cache`, chaque ouverture d'œuvre payait
 * ces trois allers-retours DEUX FOIS.
 *
 * ⛔ Le client se crée DEDANS. Passé en argument, il serait une valeur neuve à chaque appel
 * et le cache ne servirait jamais — le piège est déjà consigné pour `presenceDuChapitre`.
 *
 * ⚠️ On charge le SURENSEMBLE, et chaque appelant filtre : les métadonnées ne veulent que
 * les textes publics, la page les veut tous. Deux requêtes qui ne diffèrent que par un
 * filtre ne se partagent pas ; deux vues d'une même liste, si.
 */
const chargerOeuvreEtTextes = cache(async (id: string) => {
  const supabase = await creerSupabaseServeur()
  const [oeuvreResult, textesResult, auteursOeuvre] = await Promise.all([
    supabase.from('oeuvres').select('*, auteurs!oeuvres_id_auteur_fkey(id_auteur, nom, nom_original)').eq('id_oeuvre', id).single(),
    supabase.from('oeuvre_textes')
      .select('id_texte,titre_version,langue,traducteur,edition_label,annee_edition,source_url,catalogue_notice_id_ligne,metadata,is_default,is_public,statut')
      .eq('id_oeuvre', id)
      .order('annee_edition', { ascending: true, nullsFirst: true }),
    chargerAuteursDOeuvre(supabase, id),
  ])
  return { oeuvreResult, textesResult, auteursOeuvre }
})

// Métadonnées de la page d'une œuvre. Le titre nomme l'œuvre, son auteur, et —
// À LA SEULE CONDITION QU'ELLES EXISTENT — les deux langues du texte en regard :
// « Les Confessions — Augustin d'Hippone : texte latin et français ». Une œuvre
// qui n'est éditée qu'en français ne s'en vante pas.
//
// ⚠️ Les langues et le traducteur se lisent sur les textes RÉELLEMENT PUBLICS
// (`is_public`), non sur ce que l'admin voit : sans quoi une page annoncerait au
// visiteur un latin qu'il ne trouverait pas. Modèles : `app/lib/metadonneesSeo.ts`.
export async function generateMetadata({ params, searchParams }: {
  params: Promise<{ id: string }>
  searchParams?: Promise<{ texte?: string }>
}): Promise<Metadata> {
  const { id } = await params
  const sp = searchParams ? await searchParams : {}
  const supabase = await creerSupabaseServeur()

  // Une seule vague : rien ici ne dépend du résultat d'autre chose. La sonde des
  // liens bibliques part avec les autres et ne coûte donc pas un aller-retour.
  const charge = await Promise.all([
    chargerOeuvreEtTextes(id),
    porteDesLiensBibliques(supabase, [id]),
  ]).catch((error: unknown) => {
    // Une métadonnée qui ne se lit pas ne ferme pas la page qu'elle décrit.
    console.error(`[lecture] métadonnées de l’œuvre ${id} illisibles :`, error)
    return null
  })
  if (!charge) return { title: { absolute: 'Corpus Scriptura' } }
  const [{ oeuvreResult, textesResult, auteursOeuvre }, aLiensBibliques] = charge
  const data = oeuvreResult.data
  if (!data) return { title: { absolute: 'Corpus Scriptura' } }
  // ⚠️ Le filtre `is_public` se fait ICI, en mémoire, et non plus dans la requête : les
  // langues et le traducteur se lisent sur les textes RÉELLEMENT publics, sans quoi une
  // page annoncerait au visiteur un latin qu'il ne trouverait pas.
  const textes = (textesResult.data ?? []).filter(texte => texte.is_public === true)
  // Une œuvre signée à deux est nommée sous les deux noms, ici comme ailleurs.
  const auteur = libelleAuteurs(auteursOeuvre) || (data.auteurs as AuteurEmbarque | null)?.nom
  const textesPublics = textes ?? []
  const texteDemande = sp.texte ? textesPublics.find(texte => texte.id_texte === sp.texte) : undefined
  const texteActif = texteDemande
    ?? textesPublics.find(texte => texte.is_default)
    ?? textesPublics[0]
  const etat = {
    auteur,
    langues: textesPublics.map(texte => texte.langue ?? '').filter(Boolean),
    // Le catalogue sépare les traducteurs par un point-virgule ; une description
    // est une phrase. « H. Barreau ; M. Charpentier » y devient « H. Barreau et
    // M. Charpentier », comme partout ailleurs sur le site.
    traducteur: enumererTraducteurs(texteActif?.traducteur ?? data.trad_auteur) || null,
    aLiensBibliques,
    // Une œuvre répertoriée dont aucun texte n'est public ne montre qu'un avis :
    // sa description ne promet donc pas « le texte intégral ».
    aTexte: textesPublics.length > 0,
  }
  const titre = titreOeuvre(data.titre, etat)
  const description = descriptionOeuvre(data.titre, etat)
  return {
    // Pas de `absolute` : le gabarit « %s · Corpus Scriptura » du layout racine
    // ajoute le nom du site. L'écrire ici en donnerait deux (voir AGENTS.md,
    // « Titre d'onglet »).
    title: titre,
    description,
    // Segment visé, texte comparé, retour de la bibliothèque : autant d'adresses
    // pour une seule œuvre. Seule la version de texte EXPLICITEMENT demandée fait
    // une page à part, parce qu'elle en change le contenu ; tout le reste renvoie
    // à l'œuvre. Aucune URL existante n'est modifiée.
    alternates: {
      canonical: texteDemande && !texteDemande.is_default
        ? `/oeuvre/${encodeURIComponent(id)}?texte=${encodeURIComponent(texteDemande.id_texte)}`
        : `/oeuvre/${encodeURIComponent(id)}`,
    },
    ...enTetesPartage(titre, description),
  }
}

/**
 * ⛔ Le type d'une ligne de `segments` vit désormais dans `pipelineSegments`, avec les
 * fonctions qui la lisent. Le client en portait sa propre description ; deux types du même
 * objet finissent par ne plus dire la même chose, et c'est ainsi que le pipeline avait
 * divergé.
 */
type Segment = SegmentBrut

type TexteVersionRow = {
  id_texte: string
  titre_version: string | null
  langue: string | null
  traducteur: string | null
  edition_label: string | null
  annee_edition: number | null
  source_url: string | null
  catalogue_notice_id_ligne: string | null
  metadata: Record<string, unknown> | null
  is_default: boolean | null
  is_public: boolean | null
  statut: string | null
}

type AlignementRow = {
  alignment_set_id: string
  reference_text_id: string
  aligned_text_id: string
  alignment_level: string | null
  status: string | null
}

const NIV1_LIMINAIRES = '__LIMINAIRES__'


// ⚠️ Ce que ces requetes DEMANDENT, non ce que les tables contiennent.
/** La relation `auteurs` embarquee : PostgREST rend un objet quand la jointure
 *  est unique. On n'en lit que deux champs, et seulement en repli du libelle. */
type AuteurEmbarque = { nom?: string | null; id_auteur?: string | number | null }
/** ⚠️ `LigneVersetCite` et `VersetsCites` vivent dans `./pipelineSegments`. */
type LigneNiv1 = { ref_niv1: string | null }
type LigneNiv1Texte = { ref_niv1: string | null; ref_niv1_texte: string | null }

// Les renvois bibliques sont une couche SECONDAIRE : leur échec (le délai dépassé
// sur `liens_bibliques` du 3 septembre 2026) rend la surface sans eux, dit au
// lecteur par le bandeau, et ne ferme plus la page.
const LIENS_MANQUANTS: Omit<DegradationChargement, 'detail'> = { quoi: 'les renvois bibliques', publique: true }

/** Les premières clés d'une liste, pour un journal qui ne doit pas en porter mille. */
const apercu = (cles: readonly string[], n = 8) =>
  cles.slice(0, n).join(', ') + (cles.length > n ? `… (${cles.length} en tout)` : '')

function construireVersionTextuelle(t: TexteVersionRow, indexEditeurs: IndexEditeurs | null): VersionTextuelle {
  const titre = t.titre_version || t.id_texte
  // L’index des éditeurs passe par ici pour que la mention d’édition nomme sa maison
  // sous sa forme répertoriée dès le rendu serveur, sans paraître d’abord en brut.
  const edition = decomposerEdition(t.edition_label, t.annee_edition, indexEditeurs)
  const base = {
    idTexte: t.id_texte,
    titre,
    langue: t.langue,
    traducteur: t.traducteur,
    anneeEdition: t.annee_edition,
  }
  return {
    ...base,
    editionLabel: t.edition_label,
    sourceUrl: t.source_url,
    catalogueNoticeIdLigne: t.catalogue_notice_id_ligne,
    metadata: t.metadata ?? {},
    isDefault: t.is_default === true,
    isPublic: t.is_public === true,
    statut: t.statut,
    labelCourt: labelCourtVersion(base),
    traducteurLabel: libelleTraducteurVersion(base),
    editionDescription: edition.editionDescription,
    publicationLabel: edition.publicationLabel,
    villeEdition: edition.ville,
    editeurEdition: edition.editeur,
    dateEdition: edition.annee,
  }
}

// ⛔ `extraireVersetsAvecNature`, `extraireVersets`, `segmentAffichable`, `grouper`,
// `numerotationLocale` et `detailsRefBiblique` vivaient ICI, et en copie dans
// `OeuvreClient`. Elles sont dans `./pipelineSegments`, avec leurs tests.

// N'expose que les traductions réellement matérialisées dans `versets_lecture` :
// une colonne inexistante dans le select fait échouer toute la requête (voir
// app/lib/traductions.ts).
async function chargerCodesTraductions(supabase: Client) {
  return codesTraductionsLecture(supabase)
}

async function enrichirAvecVersets(supabase: Client, segments: Segment[], codesTraductions: string[]): Promise<VersetsCites> {
  const tousIds = new Set<string>()
  segments.forEach(s => extraireVersets(s).forEach(v => tousIds.add(v)))
  const tousIdsArray = Array.from(tousIds)
  if (tousIdsArray.length === 0) return {}
  const selectVersets = ['id_verset', 'ref', ...codesTraductions.map(code => `"${code}"`)].join(', ')
  const batchSize = 500
  const batches = Array.from({ length: Math.ceil(tousIdsArray.length / batchSize) }, (_, i) =>
    tousIdsArray.slice(i * batchSize, (i + 1) * batchSize))
  const results = await Promise.all(batches.map(batch =>
    supabase.from('versets_lecture').select(selectVersets).in('id_verset', batch)))
  const versetsData = results.flatMap(r => r.data ?? []) as unknown as LigneVersetCite[]
  // ⚠️ Le repli sur `id_verset` d'une ligne sans `ref` vit dans le pipeline, avec son
  // test : c'est précisément le point où les deux surfaces avaient divergé.
  return indexerVersetsCites(versetsData, codesTraductions)
}

export default async function OeuvrePage({
  params,
  searchParams,
}:{
  params:Promise<{id:string}>
  // `niv1`, `groupe` et `cle` sont la POSITION DE LECTURE emportée d'un texte à
  // l'autre de la même œuvre : voir `passageTexte.ts` et `resoudrePassage` plus bas.
  searchParams?:Promise<{segment?:string;texte?:string;compare?:string;book?:string;division?:string;mt?:string;niv1?:string;groupe?:string;cle?:string}>
}) {
  const {id}=await params
  const sp = searchParams ? await searchParams : {}
  const segmentCibleId = Number(sp.segment ?? '')

  // Client lisant la session : les fonctions imbriquées ci-dessous le capturent.
  const supabase = await creerSupabaseServeur()

  // ── LE JOURNAL DES COUCHES MANQUANTES ─────────────────────────────────────
  // Le TEXTE est la seule couche dont l'échec ferme la page. Tout ce qui
  // l'accompagne (notes structurées, renvois bibliques, versets cités, original en
  // regard, apparat critique, codes de traduction) se charge sous `tolerer` : en
  // cas d'échec la page est servie SANS la couche, l'échec part au journal du
  // serveur, et le lecteur en est averti par un bandeau qui nomme ce qui manque
  // (`BandeauDegradations`). ⛔ Ne rien avaler en silence : le bandeau et le
  // journal SONT le signal. Relevé du 5 septembre 2026 : UNE ancre de note
  // incomplète, le temps d'une écriture en base, fermait les Confessions à tout
  // lecteur (« Ancre de note structurée incomplète : AUG-CONF-KNOLL-APP-0154 »).
  // Voir `app/lib/chargementTolerant.ts`.
  const degradations: DegradationChargement[] = []

  // L'œuvre reste l'identité canonique ; le texte actif est choisi séparément.
  // La RLS masque les versions non publiques aux lecteurs ordinaires.
  // ⚠️ Les auteurs partent AVEC cette vague. Ils attendaient seuls, tout à la fin, un
  // aller-retour entier après la projection bilingue, alors qu'ils ne dépendent que de
  // l'identifiant de l'œuvre — connu dès la première ligne. Une vague de plus dans une
  // chaîne qui en compte déjà cinq, pour rien.
  const [estAdmin, partagee, alignementsResult, indexEditeurs] = await Promise.all([
    verifierEstAdmin(),
    // ⚠️ Déjà demandée par `generateMetadata`, que le routeur exécute dans la MÊME requête
    // HTTP : `cache` rend ici le résultat sans repartir en base.
    chargerOeuvreEtTextes(id),
    supabase.from('texte_alignement_ensembles')
      .select('alignment_set_id,reference_text_id,aligned_text_id,alignment_level,status')
      .eq('id_oeuvre', id)
      .order('created_at', { ascending: true }),
    chargerIndexEditeurs(supabase),
  ])
  const { oeuvreResult, textesResult, auteursOeuvre } = partagee
  const oeuvre = oeuvreResult.data
  if (!oeuvre || (!estAdmin && !estOeuvrePubliee(oeuvre))) return (
    <div className="min-h-screen flex items-center justify-center" style={{background:'var(--cs-fond)'}}>
      <p style={{color:'var(--cs-texte-gris)'}}>Œuvre introuvable.</p>
    </div>
  )
  const textesAccessibles = (textesResult.data ?? []) as TexteVersionRow[]
  const texteDemande = sp.texte ? textesAccessibles.find(t => t.id_texte === sp.texte) : null
  const texteActif = texteDemande ?? textesAccessibles.find(t => t.is_default) ?? textesAccessibles[0]
  if (!texteActif) return (
    <div className="min-h-screen flex items-center justify-center" style={{background:'var(--cs-fond)'}}>
      <p style={{color:'var(--cs-texte-gris)'}}>Aucun texte accessible pour cette œuvre.</p>
    </div>
  )
  const idTexte = texteActif.id_texte as string
  const lectureTexteEntier = oeuvre.lecture_texte_entier === true
  const versionsTextuelles = textesAccessibles.map((t) => construireVersionTextuelle(t, indexEditeurs))
  const versionParId = new Map(versionsTextuelles.map(version => [version.idTexte, version]))
  const alignementsDisponibles = ((alignementsResult.data ?? []) as AlignementRow[])
    .flatMap((alignement): AlignementDisponible[] => {
      const reference = versionParId.get(alignement.reference_text_id)
      const aligned = versionParId.get(alignement.aligned_text_id)
      if (!reference || !aligned) return []
      return [{
        alignmentSetId: alignement.alignment_set_id,
        referenceTextId: alignement.reference_text_id,
        alignedTextId: alignement.aligned_text_id,
        alignmentLevel: alignement.alignment_level,
        referenceLabel: reference.labelCourt,
        alignedLabel: aligned.labelCourt,
        referenceLangue: reference.langue,
        alignedLangue: aligned.langue,
        status: alignement.status,
      }]
    })

  // ── LA PAIRE DE LECTURE ────────────────────────────────────────────────────
  // Quelle traduction, quel original, quel alignement : la règle vit dans
  // `paireDeLecture.ts`, avec ses tests, et le CLIENT l'applique à l'identique. Les
  // deux côtés doivent sortir avec le même original en regard, sans quoi le serveur
  // préchargerait les notes et la projection d'un texte que le client ne compose pas.
  // ⛔ Ce choix ne se fait plus par `find(...)` sur des lignes triées au millésime :
  // deux éditions de la même année, et c'est l'ordre de Supabase qui décidait.
  const paireDeLecture = choisirPaireDeLecture({
    idTexteActif: idTexte,
    versions: versionsTextuelles,
    alignements: alignementsDisponibles,
    langueOriginale: oeuvre.langue_originale,
  })

  // « ?mt=la » désigne le texte original de l'œuvre. Quand ce texte existe pour
  // lui-même dans `oeuvre_textes` (le latin de Knöll sous Les Confessions), on l'y
  // envoie : il a ses titres d'origine, ses sommaires et son apparat, là où
  // `segments.texte_original` n'est que la colonne du bilingue. Une seule porte à
  // tenir plutôt que quatre : la bibliothèque, le compte, le profil public et les
  // favoris pointent tous sur « ?mt=la ».
  const texteEnLangueOriginale = paireDeLecture.original
  if (sp.mt === 'la' && !sp.texte && texteEnLangueOriginale && texteEnLangueOriginale.idTexte !== idTexte) {
    redirect(`/oeuvre/${encodeURIComponent(id)}?texte=${encodeURIComponent(texteEnLangueOriginale.idTexte)}`)
  }

  const alignementDemande = sp.compare
    ? alignementsDisponibles.find(alignement => alignement.alignmentSetId === sp.compare)
    : null
  const versionActive = versionParId.get(idTexte)!

  // Admin = connecté avec le compte administrateur (adresse fixe), vérifié
  // côté serveur via la session Supabase Auth — remplace l'ancien cookie
  // bp_admin_session, qui n'est plus jamais posé depuis la suppression de la
  // page de connexion par mot de passe.
  // ⛔ `apparat_auteur` DOIT figurer ici : c'est l'apparat de l'auteur lui-même
  // (prologue, avertissement, dédicace), qui appartient au corps du texte et se lit
  // à sa place dans la lecture — à ne jamais confondre avec `apparat_critique`
  // (l'apparat de l'éditeur, qui a sa propre vue). Son absence de cette liste l'a
  // fait disparaître du rendu (régression du 18 août : le « Prologue de Rufin aux
  // livres X et XI » n'apparaissait plus entre le titre du Livre X et « Chapitre I »).

  // Les divisions dont TOUT le corps est de la main de l'auteur : elles paraissent AUSSI
  // dans la vue d'apparat, où l'auteur et l'éditeur se lisent désormais côte à côte, sous
  // deux en-têtes (décision de l'auteur du 9 septembre 2026). ⚠️ La requête part ICI,
  // avant la vague qui charge l'apparat, et n'est attendue qu'au moment de retrancher :
  // elle ne coûte donc aucun aller-retour de plus dans la chaîne. ⛔ Une panne ne ferme
  // rien et ne tronque rien : sans divisions, l'apparat est celui d'hier, sans écho.
  // ⚠️ `PromiseLike` et non `Promise` : le constructeur PostgREST est « thenable » sans
  // être une promesse, et son `.then` en rend une autre de même espèce. On l'attend, on
  // ne l'enchaîne pas — c'est tout ce qu'on lui demande.
  const promesseDivisionsEcho: PromiseLike<ReadonlySet<string>> = supabase
    .rpc('get_niv1_apparat_auteur', { p_id_oeuvre: id, p_id_texte: idTexte })
    .then(({ data, error }) => {
      if (error) {
        console.error(`Divisions d'apparat d'auteur illisibles (${idTexte}) :`, error)
        return AUCUN_ECHO
      }
      return new Set(((data ?? []) as { ref_niv1: string | null }[])
        .map(ligne => String(ligne.ref_niv1 ?? '').trim())
        .filter(Boolean))
    })

  async function chargerTousSegments(filtre: Record<string, string>) {
    // Applique le filtre a une requete (nature « texte » embarque les introductions).
    // ⚠️ `any` ASSUME ICI : `q` est un constructeur de requete PostgREST, dont le type
    // porte cinq parametres generiques qui changent a chaque maillon de la chaine
    // (`.eq`, `.or`, `.is`, `.order`, `.range`). Le decrire de l'exterieur reviendrait a
    // recopier une partie de la bibliotheque, et ce double divergerait a la premiere
    // montee de version. Les trois `limiterRequete*` qu'on lui applique sont, elles,
    // generiques et rendent le type qu'on leur donne : rien ne se perd en aval.
    const appliquer = (q: any) => {
      for (const [k, v] of Object.entries(filtre)) {
        if (k === 'nature' && v === 'texte') q = limiterRequeteSegmentsALaSurface(q, 'corps')
        else if (k === 'nature' && v === 'apparat') q = limiterRequeteSegmentsALaSurface(q, 'apparat')
        else if (k === 'ref_niv1' && v === NIV1_LIMINAIRES) q = limiterRequeteAuxLiminairesSansNiveau(q)
        else q = q.eq(k, v)
      }
      return q
    }
    const lot = (from: number) =>
      appliquer(supabase.from('segments').select(SELECT_SEGMENT).eq('id_oeuvre', id).eq('id_texte', idTexte))
        .order('segment_numero', { ascending: true }).range(from, from + 999)

    // 1er lot AVEC le total exact (une seule requête) : les grosses divisions
    // (ex. Somme théologique, ~6500 segments par niv1) se chargeaient auparavant
    // par allers-retours SÉQUENTIELS de 1000. On récupère le total tout de suite,
    // puis on tire les lots restants EN PARALLÈLE.
    const premier = await appliquer(
      supabase.from('segments').select(SELECT_SEGMENT, { count: 'exact' }).eq('id_oeuvre', id).eq('id_texte', idTexte)
    ).order('segment_numero', { ascending: true }).range(0, 999)

    const acc: Segment[] = [...((premier.data as Segment[]) ?? [])]
    const total = premier.count ?? acc.length
    if (total > 1000) {
      const restes = await Promise.all(
        Array.from({ length: Math.ceil(total / 1000) - 1 }, (_, i) => lot((i + 1) * 1000))
      )
      for (const r of restes) acc.push(...((r.data as Segment[]) ?? []))
    }
    const surface = filtre.nature === 'apparat' ? 'apparat' : 'corps'
    // ⛔ L'apparat retranche AVEC les divisions : son filtre PostgREST ramène tous les
    // `apparat_auteur` du texte, et seules les pièces entières y restent. Le corps, lui,
    // n'a pas à les connaître — elles y sont chez elles, entières ou non.
    const selectionnes = segmentsDeLaSurface(
      acc,
      surface,
      surface === 'apparat' ? await promesseDivisionsEcho : AUCUN_ECHO,
    )
    // Les liens ne sont plus portés par le segment : on les repose au format
    // attendu, avec le client du serveur — c'est ce rendu que le lecteur voit.
    await tolerer(degradations, LIENS_MANQUANTS, () => hydraterLiensHerites(selectionnes, supabase), () => selectionnes)
    return selectionnes
  }

  // Première tranche d'un niveau 1 (ordre de LECTURE = segment_numero, comme le
  // chargeur client `chargerNiv1Data`, pour que la tranche soit un vrai préfixe du
  // chargement complet), plus l'indication qu'il reste des segments. Sert à peindre
  // vite les grosses divisions (ex. Somme théologique, ~9000 segments dans un seul
  // niv1) sans tout charger d'un coup : le reste est complété en tâche de fond côté
  // client, pendant que le lecteur lit déjà la première page.
  const PLAFOND_TRANCHE = 1000
  async function chargerTrancheTexte(filtre: Record<string, string>): Promise<{ segments: Segment[]; partiel: boolean }> {
    const appliquer = (q: any) => {
      for (const [k, v] of Object.entries(filtre)) {
        if (k === 'nature' && v === 'texte') q = limiterRequeteSegmentsALaSurface(q, 'corps')
        else if (k === 'nature' && v === 'apparat') q = limiterRequeteSegmentsALaSurface(q, 'apparat')
        else if (k === 'ref_niv1' && v === NIV1_LIMINAIRES) q = limiterRequeteAuxLiminairesSansNiveau(q)
        else q = q.eq(k, v)
      }
      return q
    }
    // ⚠️ Pas de `count: 'exact'` : le compte coûtait un second travail à la base pour
    // ne dire qu'une chose, « en reste-t-il ». On demande le plafond entier et l'on
    // regarde s'il est atteint : atteint, la tranche est partielle, et l'on en retire
    // la dernière ligne pour que ce qui part reste un vrai PRÉFIXE de ce que le client
    // complètera. ⛔ Ne pas demander PLAFOND + 1 lignes : PostgREST plafonne ce qu'il
    // rend, et une réponse tronquée à mille dirait « complet ».
    const premier = await appliquer(
      supabase.from('segments').select(SELECT_SEGMENT).eq('id_oeuvre', id).eq('id_texte', idTexte)
    ).order('segment_numero', { ascending: true }).range(0, PLAFOND_TRANCHE - 1)
    const lignes = segmentsDeLaSurface(((premier.data as Segment[]) ?? []), 'corps')
    const partiel = lignes.length >= PLAFOND_TRANCHE
    const acc: Segment[] = partiel ? lignes.slice(0, PLAFOND_TRANCHE - 1) : lignes
    await tolerer(degradations, LIENS_MANQUANTS, () => hydraterLiensHerites(acc, supabase), () => acc)
    return { segments: acc, partiel }
  }

  // ── Vague 1 : 6 requêtes indépendantes en parallèle ──────────────────────
  // Le chargement des notes structurées vit dans `app/lib/notesStructureesChargement.ts`,
  // partagé avec l'extraction d'une œuvre : un chargeur recopié ne reste identique que
  // par accident.

  // Le texte latin ou grec lu EN REGARD, quand ce n'est pas celui qu'on lit : ses
  // notes alimentent la seconde colonne du bilingue, où `texte_original` n'apporte
  // que la lettre.
  const idTexteEnRegard = paireDeLecture.idTexteEnRegard

  // Les alignements qui se disputent CETTE paire de textes. Quand il y en a plusieurs,
  // c'est le plus FIN qui porte la lecture, et la finesse se compte : une ligne de
  // `texte_alignements` par groupe. Le comptage part avec la vague ci-dessous, en
  // `head`, donc sans qu'aucune ligne voyage — et il n'est PAS émis quand un seul
  // alignement se présente, ce qui est le cas de toutes les œuvres sauf une.
  // ⛔ Un ensemble RETIRÉ ne se compte pas : il ne portera pas la lecture, et l'
  // Hexaéméron en garde un à côté de celui qui fait foi.
  const candidatsBilingues = idTexteEnRegard
    ? ensemblesUtilisables(alignementsDisponibles).filter(a =>
        (a.referenceTextId === idTexte && a.alignedTextId === idTexteEnRegard)
        || (a.referenceTextId === idTexteEnRegard && a.alignedTextId === idTexte))
    : []

  // ── Le passage visé, et ce qu'on en tire AVANT la vague 2 ─────────────────
  // Trois façons de viser un passage : `?segment=` (un lien profond : le segment sera
  // SÉLECTIONNÉ), `?groupe=` (le groupe d'alignement du paragraphe qu'on lisait dans
  // l'autre texte de l'œuvre) et `?cle=` (une clé de segment du texte original, ou la
  // sienne propre pour le chemin inverse). Les deux derniers sont une REPRISE : changer
  // de texte ne ramène pas au début, on retombe sur le même passage, sans le
  // sélectionner. Le client compose ces adresses dans `passageTexte.ts`.
  type PassageVise = { id: number; ref_niv1: string | null; nature: string | null; espace_textuel: string | null; reprise: boolean }
  async function resoudrePassage(): Promise<PassageVise | null> {
    const colonnes = 'id,ref_niv1,nature,espace_textuel'
    if (Number.isFinite(segmentCibleId) && segmentCibleId > 0) {
      const { data } = await supabase.from('segments').select(colonnes)
        .eq('id_oeuvre', id).eq('id_texte', idTexte).eq('id', segmentCibleId).maybeSingle()
      return data ? { ...(data as Omit<PassageVise, 'reprise'>), reprise: false } : null
    }
    const groupe = sp.groupe?.trim()
    const cle = sp.cle?.trim()
    if (!groupe && !cle) return null
    // Une reprise ne vise que le CORPS : retomber dans l'apparat, où le texte ne se
    // lit pas, serait pire que retomber au début.
    const corps = () => limiterRequeteSegmentsALaSurface(
      supabase.from('segments').select(colonnes)
        .eq('id_oeuvre', id).eq('id_texte', idTexte),
      'corps',
    )
    if (groupe) {
      const { data: membre } = await supabase.from('texte_alignement_membres').select('segment_key')
        .eq('alignment_id', groupe).eq('id_texte', idTexte).order('member_order').limit(1).maybeSingle()
      if (membre?.segment_key) {
        const { data } = await corps().eq('segment_key', membre.segment_key).limit(1).maybeSingle()
        if (data) return { ...(data as Omit<PassageVise, 'reprise'>), reprise: true }
      }
    }
    if (cle) {
      // La clé désigne un segment du texte ORIGINAL : ou bien c'est ce texte qu'on
      // ouvre, et la clé est la sienne ; ou bien c'est la traduction, dont un segment
      // porte la copie de ce segment-là (`segment_metadata.original_segment_key`).
      const [propre, copie] = await Promise.all([
        corps().eq('segment_key', cle).limit(1).maybeSingle(),
        corps().eq('segment_metadata->>original_segment_key', cle).order('segment_numero').limit(1).maybeSingle(),
      ])
      const data = propre.data ?? copie.data
      if (data) return { ...(data as Omit<PassageVise, 'reprise'>), reprise: true }
    }
    return null
  }
  // ⚠️ Les promesses ci-dessous partent AVANT la vague 2 et sont attendues APRÈS :
  // chacune porte un `catch` posé tout de suite, sans quoi un rejet survenu pendant
  // l'attente de la vague ferait tomber le processus (rejet non traité) avant même
  // qu'on le lise.
  const promessePassage = resoudrePassage().catch((error): PassageVise | null => {
    console.error('Résolution du passage visé impossible :', error)
    return null
  })
  // En texte entier, le corps se charge d'un seul tenant et ne dépend d'aucun niveau :
  // il n'a donc pas à attendre la vague 2. Son rejet éventuel remonte plus bas, à
  // l'endroit où on le lit.
  const promesseTexteEntier = lectureTexteEntier ? chargerTousSegments({ nature: 'texte' }) : null
  promesseTexteEntier?.catch(() => {})
  // La première tranche du niveau 1 part elle aussi dès qu'on sait lequel : le niveau
  // du passage repris, sinon celui que l'adresse nomme (`?niv1=`). La vague 2 dira si
  // ce niveau existe ; s'il ne correspond pas, la tranche est abandonnée et l'on
  // charge la bonne. C'est ce qui fait que changer de texte ne coûte plus une vague
  // de plus que d'ouvrir l'œuvre.
  const promesseTranche: Promise<{ niv1: string; tranche: { segments: Segment[]; partiel: boolean } } | null> =
    lectureTexteEntier ? Promise.resolve(null) : (async () => {
      const passage = await promessePassage
      const niv1 = passage?.ref_niv1
        ?? (passage && estLiminaireSansNiveau(passage) ? NIV1_LIMINAIRES : null)
        ?? sp.niv1?.trim()
        ?? ''
      if (!niv1) return null
      return { niv1, tranche: await chargerTrancheTexte({ ref_niv1: niv1, nature: 'texte' }) }
    })().catch((error): null => {
      console.error('Tranche anticipée du niveau 1 impossible :', error)
      return null
    })

  const [{ data: niv1Raw, error: rpcError }, { data: niv1TexteRaw }, passage, segmentsApparatRaw, codesTraductions, donneesNotesStructurees, donneesNotesEnRegard, { count: nbSegmentsLiminaires }, granularites] = await Promise.all([
    supabase.rpc('get_niv1_list', { p_id_oeuvre: id, p_id_texte: idTexte }),
    supabase.rpc('get_niv1_texte', { p_id_oeuvre: id, p_id_texte: idTexte }),
    promessePassage,
    // Les quatre couches qui suivent sont SECONDAIRES : leur échec rend la page
    // sans elles, dit au lecteur par le bandeau, jamais fermée (voir `degradations`).
    tolerer(degradations, { quoi: 'l’apparat critique', publique: true }, () => chargerTousSegments({ nature: 'apparat' }), () => [] as Segment[]),
    tolerer(degradations, { quoi: 'le texte des versets cités', publique: true }, () => chargerCodesTraductions(supabase), () => [] as string[]),
    tolerer(degradations, { quoi: 'les notes de l’apparat', publique: true }, () => chargerNotesStructurees(supabase, idTexte, degradations), AUCUNE_NOTE),
    tolerer(degradations, { quoi: 'les notes du texte original', publique: true }, () => chargerNotesStructurees(supabase, idTexteEnRegard, degradations), AUCUNE_NOTE),
    limiterRequeteAuxLiminairesSansNiveau(
      limiterRequeteSegmentsALaSurface(
        supabase.from('segments').select('id', { count: 'exact', head: true })
          .eq('id_oeuvre', id).eq('id_texte', idTexte),
        'corps',
      ),
    ),
    candidatsBilingues.length > 1
      ? Promise.all(candidatsBilingues.map(async alignement => ({
          alignmentSetId: alignement.alignmentSetId,
          nbGroupes: (await supabase.from('texte_alignements')
            .select('alignment_id', { count: 'exact', head: true })
            .eq('alignment_set_id', alignement.alignmentSetId)).count ?? null,
        })))
      : Promise.resolve([] as { alignmentSetId: string; nbGroupes: number | null }[]),
  ])
  const { notesParSegment: notesStructurees, ancresParSegment: ancresNotesStructurees } = donneesNotesStructurees
  const { notesParSegment: notesOriginales, ancresParSegment: ancresNotesOriginales } = donneesNotesEnRegard

  // La finesse rejoint les alignements, qui partent tels quels au client : les deux
  // côtés doivent choisir le même ensemble, sans quoi la division rechargée ne se
  // mettrait pas en regard du même original que celle du premier rendu.
  for (const { alignmentSetId, nbGroupes } of granularites) {
    const cible = alignementsDisponibles.find(a => a.alignmentSetId === alignmentSetId)
    if (cible) cible.nbGroupes = nbGroupes
  }

  if (rpcError) console.error('get_niv1_list error:', rpcError)

  // niv1 ayant du texte + libellés ref_niv1_texte : une seule RPC agrégée
  // (get_niv1_texte) remplace l'ancien N+1 (un count par niv1 pour exclure les niv1
  // uniquement apparat) et la pagination séquentielle de reconstitution des libellés.
  const niv1Complet: string[] = ((niv1Raw ?? []) as LigneNiv1[]).map(r => r.ref_niv1).filter(Boolean) as string[]
  const niv1TexteMap: Record<string, string> = {}
  const niv1AvecTexte = new Set<string>()
  ;((niv1TexteRaw ?? []) as LigneNiv1Texte[]).forEach(r => {
    if (!r.ref_niv1) return
    niv1AvecTexte.add(r.ref_niv1)
    if (r.ref_niv1_texte) niv1TexteMap[r.ref_niv1] = r.ref_niv1_texte
  })
  // On conserve l'ordre du sommaire (get_niv1_list) et on exclut les niv1 sans
  // segment texte (apparat critique seul).
  const niv1List = [
    ...((nbSegmentsLiminaires ?? 0) > 0 ? [NIV1_LIMINAIRES] : []),
    ...niv1Complet.filter(n1 => niv1AvecTexte.has(n1)),
  ]
  if ((nbSegmentsLiminaires ?? 0) > 0) niv1TexteMap[NIV1_LIMINAIRES] = 'LIMINAIRES'

  const segmentCible = passage
  // Un lien vers un segment ouvre la surface que déclare son espace textuel ; les
  // natures historiques ne servent de repli que si cet espace est absent.
  const vueInitiale = segmentCible && estSegmentDeLApparat(segmentCible) ? 'apparat' : 'texte'
  const texteSansNiveaux = niv1List.length === 0
  // Le niveau nommé par l'adresse ne vaut que s'il existe dans CE texte : deux textes
  // d'une même œuvre ne partagent leurs clés de niveau qu'une fois sur deux (« Liber I »
  // d'un côté, « Livre premier » de l'autre). Sinon, le premier, comme avant.
  const niv1Nomme = sp.niv1?.trim() ?? ''
  const niv1Demande = niv1Nomme && niv1List.includes(niv1Nomme) ? niv1Nomme : null
  const niv1DuPassage = segmentCible?.ref_niv1
    ?? (segmentCible && estLiminaireSansNiveau(segmentCible) ? NIV1_LIMINAIRES : null)
  const premierNiv1 = vueInitiale === 'texte' && niv1DuPassage
    ? niv1DuPassage
    : niv1Demande ?? niv1List[0] ?? null

  // ── Vague 2 : PREMIÈRE TRANCHE du texte du premier niv1 (apparat exclus) ──
  // On ne charge plus tout le niv1 avant le premier rendu : seule la 1re tranche
  // (~1000 segments) part du serveur ; le client complète le reste en tâche de fond.
  // La tranche partie avant la vague 2 sert si elle visait le bon niveau ; sinon on
  // charge celui-là, comme avant.
  const trancheAnticipee = await promesseTranche
  const trancheInitiale = promesseTexteEntier
    ? { segments: await promesseTexteEntier as Segment[], partiel: false }
    : texteSansNiveaux
      ? await chargerTrancheTexte({ nature: 'texte' })
      : premierNiv1
        ? (trancheAnticipee?.niv1 === premierNiv1
            ? trancheAnticipee.tranche
            : await chargerTrancheTexte({ ref_niv1: premierNiv1, nature: 'texte' }))
        : { segments: [] as Segment[], partiel: false }
  const segmentsTexteRaw = trancheInitiale.segments
  const niv1InitialPartiel = trancheInitiale.partiel

  const segmentsTexte = segmentsTexteRaw as Segment[]
  // La vue d'apparat se lit en DEUX SECTIONS : l'apparat de l'auteur d'abord, celui de
  // l'éditeur ensuite, chacun dans son ordre documentaire. ⛔ Elles se groupent
  // SÉPARÉMENT (voir `partagerLApparat`) : un `ref_niv1` commun de part et d'autre de la
  // frontière fondrait les deux pièces en un seul groupe, sous un en-tête qui mentirait.
  const apparatParSection = partagerLApparat(segmentsApparatRaw as Segment[])
  const segmentsApparat = [...apparatParSection.auteur, ...apparatParSection.editeur]

  // Lecture bilingue : l'original en regard vient de SES PROPRES segments, retrouvés par
  // l'alignement. Rien n'est recopié dans la traduction (voir `bilingueAlignement.ts`).
  //
  // ⚠️ SECOND APPEL, ET IL EST VOULU. Le premier (plus haut) a choisi la paire —
  // l'original, la traduction qui le porte —, ce dont la vague précédente avait besoin
  // pour charger les notes de l'original et compter les groupes. Celui-ci reprend la
  // MÊME règle une fois la finesse connue : c'est le NOMBRE DE GROUPES, et non le
  // niveau déclaré, qui désigne l'ensemble qui portera la lecture (la Doctrine des
  // Apôtres l'a montré, voir `choisirEnsembleBilingue`). Fonction pure et sans requête :
  // le second appel ne coûte rien, et il n'y a toujours qu'une règle.
  const ensembleBilingue = choisirPaireDeLecture({
    idTexteActif: idTexte,
    versions: versionsTextuelles,
    alignements: alignementsDisponibles,
    langueOriginale: oeuvre.langue_originale,
  }).ensembleBilingue
  // Les versets du premier niveau et la projection bilingue ne dépendent que de la
  // tranche, jamais l'un de l'autre : ils partent ensemble. Ils se suivaient, une
  // vague pour rien.
  const PROJECTION_VIDE = () => ({ groupeParCle: new Map<string, string>(), blocParGroupe: new Map<string, BlocOriginal>() })
  const [versetMap, projectionBilingue] = await Promise.all([
    tolerer(degradations, { quoi: 'le texte des versets cités', publique: true },
      () => enrichirAvecVersets(supabase, segmentsTexte, codesTraductions), (): VersetsCites => ({})),
    ensembleBilingue && idTexteEnRegard
      ? tolerer(degradations, { quoi: 'le texte original en regard', publique: true }, () => chargerProjectionBilingue(supabase, {
          alignmentSetId: ensembleBilingue.alignmentSetId,
          idTexteTraduit: idTexte,
          idTexteOriginal: idTexteEnRegard,
          clesTraduites: [...segmentsTexte, ...segmentsApparat]
            .map(s => s.segment_key)
            .filter((cle): cle is string => Boolean(cle)),
          notesOriginales,
          ancresOriginales: ancresNotesOriginales,
        }), PROJECTION_VIDE)
      : Promise.resolve(PROJECTION_VIDE()),
  ])
  const blocsOriginal = Object.fromEntries(projectionBilingue.blocParGroupe)

  // Auteurs de l'œuvre, à égalité : `auteur` est leur libellé commun (il nomme
  // l'œuvre au frontispice, dans les citations, dans l'historique de lecture),
  // `auteurId` reste le premier, pour les surfaces qui n'en visent qu'un. Ils sont
  // chargés avec la première vague, non ici : voir plus haut.
  const auteur = libelleAuteurs(auteursOeuvre) || (oeuvre.auteurs as AuteurEmbarque | null)?.nom || ''
  const auteurId = auteursOeuvre[0]?.id_auteur ?? (oeuvre.auteurs as AuteurEmbarque | null)?.id_auteur?.toString() ?? ''

  // Les appels de note se posent SANS FAILLIR : une ancre hors du texte (offset
  // au-delà du segment, marqueur mal formé) est laissée de côté et comptée, le
  // segment se lit. La projection stricte levait, et une seule ancre fermait la page.
  const ancresRefusees = new Set<string>()
  const projeter = (texte: string, ancres: AncreNoteStructureeProjection[] | undefined, champ?: string) =>
    projeterAppelsNotesStructureesSansFaillir(texte, ancres, (_ancre, refus) => { ancresRefusees.add(refus) }, champ)

  // Le contexte que les DEUX surfaces partagent : ce qu'un segment ne peut pas déduire
  // de lui-même. Ce qui les sépare tient en trois mots — l'apparat porte des notices
  // bibliographiques, n'ouvre aucun volet biblique, et sa SECTION coupe ses groupes.
  const contexteProjection = {
    versetsCites: versetMap,
    notes: notesStructurees,
    notesOriginal: notesOriginales,
    projeterAppels: (texte: string, cle: string | null) =>
      projeter(texte, cle ? ancresNotesStructurees[cle] : undefined),
    projeterAppelsOriginal: (texte: string, cle: string | null) =>
      projeter(texte, cle ? ancresNotesOriginales[cle] : undefined),
    // ⛔ Un CHAMP DE TITRE se projette comme le texte, et ses ancres se cherchent dans
    // TOUS les segments du groupe : l'ancre d'un chapeau tombe parfois quelques segments
    // plus loin que le premier.
    projeterTitre: (texte: string, cles: readonly string[], champ: ChampTitre) =>
      projeter(texte, cles.flatMap(cle => ancresNotesStructurees[cle] ?? []), champDuTitre(champ)),
    groupeOriginal: (cle: string | null) => (cle && projectionBilingue.groupeParCle.get(cle)) || null,
  }

  const { segments: segmentsData, groupes: groupesData } = composerSegments(segmentsTexte, contexteProjection)

  const { segments: segmentsApparatData, groupes: groupesApparatData } = composerSegments(
    segmentsApparat,
    { ...contexteProjection, avecOuvrage: true, sansVersets: true },
    { prefixeAncre: 'a', avecSection: true },
  )

  // Le sommaire de l'apparat : une entrée par changement de niveau 1 ou 2.
  const tocApparat: TocEntry[] = []
  let la1 = '', la2 = ''
  for (const g of groupesApparatData) {
    if (g.niv1 !== la1 || g.niv2 !== la2) {
      tocApparat.push({ niv1: g.niv1, niv2: g.niv2, anchor: g.anchor })
      la1 = g.niv1; la2 = g.niv2
    }
  }

  if (ancresRefusees.size > 0) {
    noterDegradation(degradations, {
      quoi: 'quelques appels de note',
      detail: `${ancresRefusees.size} ancre(s) hors du texte : ${apercu([...ancresRefusees])}`,
      publique: true,
    })
  }

  // Les notices des ouvrages que cite l'apparat — la liste de Mirandol chez Boèce —,
  // lues d'un seul tenant dans `v_references_bibliographiques` et envoyées avec les
  // segments : le premier rendu compose déjà depuis la base. Une œuvre sans segment
  // bibliographique ne paie aucun aller-retour. ⚠️ Une panne ici ne ferme pas la
  // page : le segment retombe sur son texte, la projection de secours.
  const noticesBibliographiques = await chargerNoticesBibliographiques(supabase, identifiantsOuvrages(segmentsApparatData))
    .then(tableDesNotices)
    .catch((erreur: unknown) => {
      console.error(`Notices bibliographiques illisibles (${idTexte}) :`, erreur)
      return {} as Record<number, NoticeBibliographique>
    })

  return (
    <>
      {/* Book JSON-LD — seulement pour une œuvre publique (jamais un brouillon admin). */}
      {estOeuvrePubliee(oeuvre) && texteActif.is_public && (
        <>
          <JsonLd donnees={donneesLivre({
            id,
            titre: oeuvre.titre,
            titreOriginal: oeuvre.titre_original,
            auteur, auteurId: auteurId || null,
            traducteur: versionActive.traducteur ?? oeuvre.trad_auteur,
            editeur: versionActive.editeurEdition ?? oeuvre.editeur,
          })} />
          <JsonLd donnees={donneesFilAriane([
            { nom: 'Accueil', url: '/accueil' },
            { nom: 'Bibliothèque', url: '/bibliotheque' },
            ...(auteur ? [{ nom: auteur, url: `/auteur/${auteurId}` }] : []),
            { nom: oeuvre.titre, url: `/oeuvre/${id}` },
          ])} />
        </>
      )}
    <OeuvreClient
      key={idTexte}
      auteur={auteur}
      auteurId={auteurId}
      auteurs={auteursOeuvre}
      idOeuvre={id}
      idTexte={idTexte}
      estAdmin={estAdmin}
      versionsTextuelles={versionsTextuelles}
      alignementsDisponibles={alignementsDisponibles}
      notesStructurees={notesStructurees}
      ancresNotesStructurees={ancresNotesStructurees}
      notesOriginales={notesOriginales}
      ancresNotesOriginales={ancresNotesOriginales}
      blocsOriginal={blocsOriginal}
      niv1List={niv1List}
      niv1TexteMap={niv1TexteMap}
      niveauxSommaire={oeuvre.niveaux_sommaire ?? oeuvre.profondeur_sommaire ?? 1}
      niveauxCorps={oeuvre.niveaux_corps ?? 1}
      txtSommaire={(oeuvre.texte_sommaire ?? '0,0,0,0,0').split(',').map((v: string) => v === '1')}
      txtCorps={(oeuvre.texte_corps ?? '0,0,0,0,0').split(',').map((v: string) => v === '1')}
      afficherNumeros={oeuvre.afficher_numeros !== false}
      lectureTexteEntier={lectureTexteEntier}
      oeuvre={{titre:oeuvre.titre,titre_affichage:oeuvre.titre_affichage,sous_titre:oeuvre.sous_titre,titre_original:oeuvre.titre_original,trad_auteur:oeuvre.trad_auteur,trad_date:oeuvre.trad_date,commentaire_traduction:oeuvre.commentaire_traduction,note_editoriale_complete:oeuvre.note_editoriale_complete,note_editoriale_complement:oeuvre.note_editoriale_complement,note_editoriale_titre:oeuvre.note_editoriale_titre,editeur:oeuvre.editeur,collection:oeuvre.collection,ville:oeuvre.ville,date_publication:oeuvre.date_publication,date_mise_en_ligne:oeuvre.date_mise_en_ligne,id_oeuvre:oeuvre.id_oeuvre,date_composition:oeuvre.date_composition,langue_originale:oeuvre.langue_originale,genres:oeuvre.genres,url_source:oeuvre.url_source,nb_signes:oeuvre.nb_signes}}
      groupes={groupesData} segments={segmentsData}
      tocApparat={tocApparat} groupesApparat={groupesApparatData} segmentsApparat={segmentsApparatData}
      noticesBibliographiques={noticesBibliographiques}
      degradations={degradations}
      segmentCibleId={segmentCible?.id ?? null}
      cibleReprise={segmentCible?.reprise === true}
      niv1Initial={premierNiv1 ?? niv1List[0] ?? null}
      vueInitiale={vueInitiale}
      niv1InitialPartiel={niv1InitialPartiel}
      comparaisonInitiale={Boolean(alignementDemande)}
      alignmentSetIdInitial={alignementDemande?.alignmentSetId ?? null}
      comparaisonLivreInitial={Number(sp.book ?? '1')}
      comparaisonDivisionInitiale={Number(sp.division ?? '1')}
    />
    </>
  )
}
