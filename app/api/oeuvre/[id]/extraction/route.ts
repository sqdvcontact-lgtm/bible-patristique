/**
 * L'EXTRACTION D'UNE ŒUVRE — la route qui la compose et la dépose.
 *
 * ⛔ ELLE LIT AVEC LA SESSION DU VISITEUR (`creerSupabaseServeur`), jamais avec la clé de
 * service. C'est la seule garde d'accès, et c'est la bonne : la base est fermée au rôle
 * anonyme, et la politique de `segments` exige à la fois `oeuvres.acces_public` et
 * `oeuvre_textes.is_public`. Ce que le lecteur peut LIRE, il peut l'extraire ; ce qu'il ne
 * peut pas lire ne sort pas d'ici. Le jour où l'extraction se paiera, le verrou se posera
 * ICI — elle seule connaît la session — jamais dans le menu, qu'un lecteur contourne.
 *
 * ⚠️ La composition, elle, est PURE et vit ailleurs (`app/lib/docx/`) : cette route ne
 * fait que charger, puis passer la main.
 */

import { NextResponse, type NextRequest } from 'next/server'
import { creerSupabaseServeur } from '@/app/lib/supabaseServeur'
import { estOeuvrePubliee } from '@/app/lib/oeuvresPublication'
import { estAdmin as verifierEstAdmin } from '@/app/lib/verifAdmin'
import { chargerAuteursDOeuvre, libelleAuteurs } from '@/app/lib/auteursOeuvre'
import { SELECT_SEGMENT, limiterRequeteSegmentsALaSurface, segmentsDeLaSurface, type SurfaceOeuvre } from '@/app/lib/oeuvreSelects'
import { chargerToutesPagesSupabase } from '@/app/lib/paginationSupabase'
import { chargerNotesStructurees } from '@/app/lib/notesStructureesChargement'
import { estNoteApparatCritique, texteApparatAffiche } from '@/app/lib/apparatCritique'
import { natureSeNormaliseCommeReference } from '@/app/lib/naturesNote'
import { normaliserReferencesDansTexte, terminerNote } from '@/app/lib/referenceNote'
import { normaliserTypographieLecture } from '@/app/lib/typographie'
import { chargerIndexEditeurs } from '@/app/lib/editeursServeur'
import { normaliserNomEditeur } from '@/app/lib/editeursNormalisation'
import { projeterAppelsNotesStructureesSansFaillir } from '@/app/lib/appelsNotesStructurees'
import { tolerer, type DegradationChargement } from '@/app/lib/chargementTolerant'
import { chargerProjectionBilingue } from '@/app/oeuvre/[id]/bilingueAlignement'
import { choisirPaireDeLecture, ensemblesUtilisables, type EnsembleLisible, type VersionLisible } from '@/app/oeuvre/[id]/paireDeLecture'
import { libelleVersionComplet } from '@/app/oeuvre/[id]/versionTextuelle'
import { parseNotes } from '@/app/lib/notes'
import type { NoteStructuree } from '@/app/oeuvre/[id]/oeuvreTypes'
import { lireOptionsExtraction, nomDuFichier } from '@/app/lib/extractionOeuvre'
import { construireDocx } from '@/app/lib/docx/ooxml'
import {
  composerDocumentOeuvre,
  type NoteExtraite, type OriginalExtrait, type SegmentExtrait,
} from '@/app/lib/docx/documentOeuvre'

// ⛔ Node, jamais Edge : le composeur emploie `zlib` et `Buffer`.
export const runtime = 'nodejs'
// ⚠️ Une œuvre entière peut compter trente mille segments : le plafond du plan Hobby.
export const maxDuration = 60

const ADRESSE_SITE = 'https://corpus-scriptura.fr'

type LigneSegment = Record<string, unknown>

/** Charge tous les segments d'une surface, dans l'ordre de lecture. */
async function chargerSegments(
  supabase: Awaited<ReturnType<typeof creerSupabaseServeur>>,
  idOeuvre: string,
  idTexte: string,
  surface: SurfaceOeuvre,
  division: string | null,
): Promise<LigneSegment[]> {
  const lignes = await chargerToutesPagesSupabase<LigneSegment>((debut, fin) => {
    // ⚠️ La chaîne PostgREST se reconstruit à chaque filtre, et son type varie d'un
    // maillon à l'autre : il n'y a pas de forme à nommer entre deux appels.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let requete: any = supabase.from('segments').select(SELECT_SEGMENT)
      .eq('id_oeuvre', idOeuvre).eq('id_texte', idTexte)
    if (division !== null) requete = requete.eq('ref_niv1', division)
    // ⚠️ La liste des colonnes n'est plus un littéral (elle vient de SELECT_SEGMENT) :
    // PostgREST n'infère donc plus la forme des lignes, et le type se déclare ici.
    return limiterRequeteSegmentsALaSurface(requete, surface)
      .order('segment_numero', { ascending: true })
      .range(debut, fin) as PromiseLike<{ data: LigneSegment[] | null; error: unknown }>
  })
  // La surface se retranche AUSSI en mémoire : le filtre PostgREST est un `or` large,
  // la règle est dans `surfaceDuSegment`.
  //
  // ⛔ SANS l'écho de l'apparat d'auteur, et c'est délibéré : sur le site, le prologue se
  // lit dans le texte et résonne dans l'onglet d'apparat, deux surfaces qu'on ouvre l'une
  // ou l'autre ; ici, le corps et l'apparat se suivent dans UN SEUL document, où la même
  // préface paraîtrait deux fois à quelques pages d'intervalle. C'est le défaut de
  // `segmentsDeLaSurface` qui protège l'extraction, non un oubli d'appelant.
  return segmentsDeLaSurface(lignes as never[], surface) as LigneSegment[]
}

/** Un segment est-il assez garni pour paraître ? Même règle que la lecture. */
function segmentAffichable(ligne: LigneSegment): boolean {
  if (ligne.nature === 'separateur') return false
  return String(ligne.segment_texte ?? '').trim().length > 0
}

/**
 * Une note structurée, composée comme la fenêtre de lecture la compose.
 *
 * ⛔ L'APPARAT CRITIQUE NE PASSE PAR AUCUNE NORMALISATION (charte, « Apparat critique ») :
 * `texteApparatAffiche` en retire le seul numéro de ligne imprimée, et rien d'autre. Une
 * fine insécable glissée devant les 3 596 hautes ponctuations de Knöll, ou un point final
 * ajouté aux 6 604 entrées qui n'en portent pas, réécrirait la notation de l'éditeur.
 *
 * ⚠️ Une note ORDINAIRE, elle, prend la typographie de lecture, et son DERNIER bloc reçoit
 * la ponctuation finale — une seule fois, comme à l'écran.
 */
function noteExtraite(note: NoteStructuree | string): NoteExtraite {
  if (typeof note === 'string') return { blocs: [{ texte: note }] }
  const blocs = [...note.blocks].sort((a, b) => a.rank - b.rank)
  const apparat = estNoteApparatCritique(note)
  return {
    blocs: blocs.map((bloc, index) => {
      if (apparat) return { texte: texteApparatAffiche(bloc), vers: bloc.form === 'verse', brut: true }
      const source = natureSeNormaliseCommeReference(bloc.kind)
        ? normaliserReferencesDansTexte(bloc.text)
        : bloc.text
      const compose = normaliserTypographieLecture(source)
      return {
        texte: index === blocs.length - 1 ? terminerNote(compose) : compose,
        vers: bloc.form === 'verse',
        // ⛔ L'italique dit la LANGUE (charte § 13.18), comme dans la fenêtre de lecture.
        latin: bloc.language === 'la',
        brut: true,
      }
    }),
  }
}

function notesExtraites(notes: Record<string, NoteStructuree> | Record<string, string> | undefined): Record<string, NoteExtraite> {
  const sortie: Record<string, NoteExtraite> = {}
  for (const [marqueur, note] of Object.entries(notes ?? {})) sortie[marqueur] = noteExtraite(note)
  return sortie
}

export async function GET(requete: NextRequest, contexte: { params: Promise<{ id: string }> }) {
  const { id } = await contexte.params
  const options = lireOptionsExtraction(requete.nextUrl.searchParams)
  const supabase = await creerSupabaseServeur()
  const degradations: DegradationChargement[] = []

  const [estAdmin, oeuvreLue, textesLus, alignementsLus, auteursOeuvre, indexEditeurs] = await Promise.all([
    verifierEstAdmin(),
    supabase.from('oeuvres').select('*, auteurs!oeuvres_id_auteur_fkey(nom)').eq('id_oeuvre', id).maybeSingle(),
    supabase.from('oeuvre_textes')
      .select('id_texte,titre_version,langue,traducteur,edition_label,annee_edition,is_default,is_public,statut')
      .eq('id_oeuvre', id).order('annee_edition', { ascending: true, nullsFirst: true }),
    supabase.from('texte_alignement_ensembles')
      .select('alignment_set_id,reference_text_id,aligned_text_id,alignment_level,status')
      .eq('id_oeuvre', id).order('created_at', { ascending: true }),
    chargerAuteursDOeuvre(supabase, id),
    chargerIndexEditeurs(supabase),
  ])

  const oeuvre = oeuvreLue.data as Record<string, unknown> | null
  // ⛔ Une œuvre retenue ne s'extrait pas plus qu'elle ne se lit : même garde, même mot.
  if (!oeuvre || (!estAdmin && !estOeuvrePubliee(oeuvre as { acces_public?: boolean | null }))) {
    return NextResponse.json({ erreur: 'Œuvre introuvable.' }, { status: 404 })
  }

  type LigneTexte = {
    id_texte: string; titre_version: string | null; langue: string | null; traducteur: string | null
    edition_label: string | null; annee_edition: number | null
    is_default: boolean | null; is_public: boolean | null; statut: string | null
  }
  const textes = (textesLus.data ?? []) as LigneTexte[]
  const demande = options.idTexte ? textes.find(t => t.id_texte === options.idTexte) : undefined
  const texteActif = demande ?? textes.find(t => t.is_default) ?? textes[0]
  if (!texteActif) {
    return NextResponse.json({ erreur: 'Aucun texte accessible pour cette œuvre.' }, { status: 404 })
  }
  const idTexte = texteActif.id_texte

  const versions: VersionLisible[] = textes.map(t => ({
    idTexte: t.id_texte,
    langue: t.langue,
    traducteur: t.traducteur,
    isDefault: t.is_default === true,
    isPublic: t.is_public === true,
    statut: t.statut,
  }))
  const alignements: EnsembleLisible[] = ((alignementsLus.data ?? []) as Record<string, string | null>[]).map(a => ({
    alignmentSetId: a.alignment_set_id as string,
    referenceTextId: a.reference_text_id as string,
    alignedTextId: a.aligned_text_id as string,
    alignmentLevel: a.alignment_level,
    status: a.status,
  }))
  const paire = choisirPaireDeLecture({
    idTexteActif: idTexte,
    versions,
    alignements: ensemblesUtilisables(alignements),
    langueOriginale: oeuvre.langue_originale as string | null,
  })

  // ── Le texte, et ce qui l'accompagne ────────────────────────────────────────
  const [corpsBrut, apparatBrut] = await Promise.all([
    chargerSegments(supabase, id, idTexte, 'corps', options.division),
    options.apparat
      ? chargerSegments(supabase, id, idTexte, 'apparat', options.division)
      : Promise.resolve([] as LigneSegment[]),
  ])
  if (corpsBrut.length === 0) {
    return NextResponse.json({ erreur: 'Ce texte ne porte rien à extraire.' }, { status: 404 })
  }

  const idTexteEnRegard = options.original === 'aucun' ? null : paire.idTexteEnRegard
  const [notesDuTexte, notesDeLOriginal] = await Promise.all([
    options.notes
      ? tolerer(degradations, { quoi: 'les notes', publique: false },
        () => chargerNotesStructurees(supabase, idTexte, degradations),
        () => ({ notesParSegment: {}, ancresParSegment: {} }))
      : Promise.resolve({ notesParSegment: {}, ancresParSegment: {} }),
    options.notes && idTexteEnRegard
      ? tolerer(degradations, { quoi: 'les notes du texte original', publique: false },
        () => chargerNotesStructurees(supabase, idTexteEnRegard, degradations),
        () => ({ notesParSegment: {}, ancresParSegment: {} }))
      : Promise.resolve({ notesParSegment: {}, ancresParSegment: {} }),
  ])

  // ── L'original en regard ────────────────────────────────────────────────────
  const originaux = new Map<string, OriginalExtrait>()
  const groupeParCle = new Map<string, string>()
  if (idTexteEnRegard && paire.ensembleBilingue) {
    const cles = corpsBrut.map(l => String(l.segment_key ?? '')).filter(Boolean)
    const projection = await tolerer(
      degradations,
      { quoi: 'le texte original en regard', publique: false },
      () => chargerProjectionBilingue(supabase, {
        alignmentSetId: paire.ensembleBilingue!.alignmentSetId,
        idTexteTraduit: idTexte,
        idTexteOriginal: idTexteEnRegard,
        clesTraduites: cles,
        notesOriginales: notesDeLOriginal.notesParSegment,
        ancresOriginales: notesDeLOriginal.ancresParSegment,
      }),
      () => ({ groupeParCle: new Map<string, string>(), blocParGroupe: new Map() }),
    )
    for (const [cle, groupe] of projection.groupeParCle) groupeParCle.set(cle, groupe)
    for (const [groupe, bloc] of projection.blocParGroupe) {
      originaux.set(groupe, {
        texte: bloc.texteAffichage || bloc.texte,
        toutVers: bloc.toutVers,
        notes: notesExtraites(bloc.notes),
      })
    }
  }

  // ── Les segments, appels de note matérialisés ───────────────────────────────
  const enSegmentExtrait = (
    ligne: LigneSegment,
    notesParSegment: Record<string, Record<string, NoteStructuree>>,
    ancresParSegment: Record<string, { marker: string; segmentOffsetUnicode: number; noteKey: string; sourceTarget: string | null }[]>,
  ): SegmentExtrait => {
    const cle = (ligne.segment_key as string | null) ?? null
    const texteSource = String(ligne.segment_texte ?? '')
    const ancres = cle ? ancresParSegment[cle] : undefined
    const structurees = cle ? notesParSegment[cle] : undefined
    return {
      segmentKey: cle,
      texte: options.notes
        ? projeterAppelsNotesStructureesSansFaillir(texteSource, ancres, () => {})
        : texteSource,
      nature: (ligne.nature as string | null) ?? null,
      joinBefore: (ligne.join_before as string | null) ?? null,
      paragraphe: (ligne.paragraphe as number | null) ?? null,
      rang: (ligne.rang as number | null) ?? null,
      alinea: ligne.alinea === null || ligne.alinea === undefined ? null : Number(ligne.alinea),
      stropheAvant: ligne.strophe_avant === null || ligne.strophe_avant === undefined
        ? null
        : String(ligne.strophe_avant) === 'true',
      numeroVerset: (ligne.numero_verset as string | null) ?? null,
      forme: (ligne.forme as string | null) ?? null,
      texteOriginal: (ligne.texte_original as string | null) ?? null,
      groupeOriginal: cle ? groupeParCle.get(cle) ?? null : null,
      niv1: String(ligne.ref_niv1 ?? ''), niv1Texte: String(ligne.ref_niv1_texte ?? ''),
      niv2: String(ligne.ref_niv2 ?? ''), niv2Texte: String(ligne.ref_niv2_texte ?? ''),
      niv3: String(ligne.ref_niv3 ?? ''), niv3Texte: String(ligne.ref_niv3_texte ?? ''),
      niv4: String(ligne.ref_niv4 ?? ''), niv4Texte: String(ligne.ref_niv4_texte ?? ''),
      // ⚠️ Les notes STRUCTURÉES d'abord ; la colonne libre `segments.notes` n'est le
      // repli que des imports qui n'ont pas encore d'appareil structuré.
      notes: options.notes
        ? notesExtraites(structurees ?? parseNotes(ligne.notes as string | null))
        : {},
    }
  }

  const corps = corpsBrut.filter(segmentAffichable)
    .map(l => enSegmentExtrait(l, notesDuTexte.notesParSegment, notesDuTexte.ancresParSegment))
  const apparat = apparatBrut.filter(segmentAffichable)
    .map(l => enSegmentExtrait(l, notesDuTexte.notesParSegment, notesDuTexte.ancresParSegment))

  // ── L'identité, et le document ──────────────────────────────────────────────
  const titre = String(oeuvre.titre ?? 'Œuvre')
  const auteur = libelleAuteurs(auteursOeuvre)
    || String((oeuvre.auteurs as { nom?: string } | null)?.nom ?? '')
  const plusieursEditions = textes.filter(t => t.is_public || estAdmin).length > 1
  const dateExtraction = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })

  const blocs = composerDocumentOeuvre({
    identite: {
      titre,
      sousTitre: oeuvre.sous_titre as string | null,
      titreOriginal: oeuvre.titre_original as string | null,
      auteur,
      // ⛔ Le SILENCE d'une version n'est pas une lacune à combler par l'œuvre : le
      //    texte latin de Bondurand, qui n'a pas de traducteur, empruntait celui de
      //    l'œuvre et son frontispice annonçait « Traduction par intelligence
      //    artificielle… » (voir `identiteEdition`, dix-neuf textes dans ce cas).
      traducteur: texteActif.traducteur,
      // ⛔ Une COÉDITION ne se rend jamais telle quelle : « A ; B » est le point-virgule
      // du catalogue, non un nom de maison. Chaque maison se résout pour son compte.
      editeur: normaliserNomEditeur(oeuvre.editeur as string | null, indexEditeurs) || null,
      ville: oeuvre.ville as string | null,
      datePublication: oeuvre.date_publication as string | null,
      collection: oeuvre.collection as string | null,
      edition: plusieursEditions
        ? libelleVersionComplet({
          titre: texteActif.titre_version || texteActif.id_texte,
          traducteur: texteActif.traducteur,
          anneeEdition: texteActif.annee_edition,
          langue: texteActif.langue,
        })
        : null,
      division: options.division,
      adresseEnLigne: `${ADRESSE_SITE}/oeuvre/${encodeURIComponent(id)}`,
      dateExtraction,
    },
    corps,
    apparat,
    originaux,
    original: options.original,
    notes: options.notes,
    sommaire: options.sommaire,
  })

  const document = construireDocx({
    titre: options.division ? `${titre} — ${options.division}` : titre,
    auteur,
    description: `${titre}${auteur ? `, ${auteur}` : ''}. Extrait de Corpus Scriptura le ${dateExtraction}.`,
    dateIso: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    blocs,
  })

  const nom = nomDuFichier(titre, options.division, options.format)
  return new NextResponse(new Uint8Array(document), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      // ⚠️ DEUX formes du nom : `filename` en ASCII pour les clients anciens, `filename*`
      // en UTF-8 pour les autres. Un titre accentué se perd sans la seconde.
      'Content-Disposition': `attachment; filename="${nom.replace(/[^\x20-\x7E]/g, '_')}"; filename*=UTF-8''${encodeURIComponent(nom)}`,
      'Content-Length': String(document.length),
      // ⛔ Rien ne se met en cache : le document dépend de la SESSION (une édition privée
      // ne sort que pour l'administrateur), et un cache de bord le servirait à d'autres.
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex',
    },
  })
}

