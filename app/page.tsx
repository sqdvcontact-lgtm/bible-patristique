import { notFound, redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import type { Metadata } from 'next'
import { cache, type ComponentProps } from 'react'
import BibleLayout from './components/BibleLayout'
import BibleSourceReader from './components/BibleSourceReader'
import ChapitreIndisponible from './components/ChapitreIndisponible'
import { LIVRES, estLivreNonCanonique } from '@/app/lib/bible'
import { loadBibleReadingCatalog, loadSourceReading } from '@/app/lib/bibleMultimodeServer'
import { estVerseEditorial, estVerseSurColonnes, withCanonicalV2Capability } from '@/app/lib/bibleMultimode'
import { selectableReadingModes, type BibleReadingMode } from '@/app/lib/bibleReadingModes'
import {
  adapterVersets899, chargerVersets899, couchesDisponibles899, COUCHES_TOUJOURS_899, normaliserCouche899, TRAD_ID_BIBLE899,
  type Couche899,
} from '@/app/lib/bible899'
import { chargerVersetsCanoniquesV2, chargerVersetsEditoriaux } from '@/app/lib/bibleEditorialServer'
import IndiceTelephoneServeur from '@/app/lib/IndiceTelephoneServeur'
import {
  canonDuChapitre, chargerBibliographiesEdition, chargerLectureBilingue, chargerLiminairesEdition,
  chargerPieceLiminaire, loadBibleEditionCatalog, loadBibleEditionChapter,
} from '@/app/lib/bibleEditionServer'
import { bibliographieDesBlocs } from '@/app/lib/bibleBibliographieOuvrages'
import {
  blocsTexteEditoriaux, presentationDeBloc, regimeEtPartDeLActif, ancienneVersionDeLActif, sousTypeNoticeValide, styleCompositionDeNote,
  type BibleEditionChapterDisplay, type BibleEditionDisplayTextBlock,
  adresseVersionnee,
} from '@/app/lib/bibleEdition'
import type {
  BibleEditionBodyBlockRow, BibleEditionChapterPayload, BibleEditionNoteBlockRow,
} from '@/app/lib/bibleEditionServer'
import { baliserBlocsDuChapitre, type BornesOrdreChapitre } from '@/app/lib/bibleAxeChapitre'
import { rangDesSousTitres } from '@/app/lib/bibleHierarchieSemantique'
import { intituleDeManchette, manchettesDApparat } from '@/app/lib/bibleApparatIntroductif'
import { blocOrphelinSansAncre } from '@/app/lib/bibleFrontMatter'
import { grouperPiecesLiminaires, pieceParCle } from '@/app/lib/bibleSommaireEdition'
import { roleDuBlocDeNote } from '@/app/lib/noteBiblique'
import { normaliserChapitreBible } from '@/app/lib/bibleNavigation'
import { codeTraductionValide, COOKIE_TRAD_BIBLE } from '@/app/lib/preferenceBible'
import { nomLivreReference } from '@/app/lib/referencesBibliques'
import {
  avecNomDuSite, descriptionChapitreBible, enTetesPartage, naturePatristique, titreChapitreBible,
} from '@/app/lib/metadonneesSeo'
import { chargerPresencePatristique } from '@/app/lib/metadonneesSeoServeur'
import { JsonLd, donneesChapitreBible, donneesFilAriane } from '@/app/lib/donneesStructurees'
import { creerSupabaseServeur } from '@/app/lib/supabaseServeur'
import { chargerIndexEditeurs } from '@/app/lib/editeursServeur'
import { joindreEditeurs } from '@/app/lib/editeursNormalisation'
import { codeLangue } from '@/app/lib/grec'
import { composerNotesV2, positionsDesVersets, positionsEnRegard, type LigneNoteV2 } from '@/app/lib/notesVersetsV2'
import { chargerNotesVersetsV2 } from '@/app/lib/notesVersetsV2Chargement'

// La base est désormais fermée au rôle anonyme : une page serveur doit
// interroger avec la session du visiteur (client lisant les cookies), sinon elle
// s'exécute en `anon` et ne reçoit plus rien. Sans cela, la page Bible se rendait
// vide — texte et traductions introuvables.

const NOMS_LIVRES = Object.fromEntries(LIVRES.map(l => [l.code, l.nom]))

// ⚠️ `cache` de React, et les DEUX appelants passent les mêmes arguments : le
// titre de l'onglet et les données structurées de la page décrivent le même
// chapitre, et le routeur exécute `generateMetadata` et la page dans la même
// requête. Sans cela, l'apparat patristique serait interrogé deux fois par
// visite. ⛔ Le client Supabase se crée DEDANS : passé en argument, il serait
// une valeur neuve à chaque appel et le cache ne servirait jamais.
const presenceDuChapitre = cache(async (livre: string, chapitre: number) =>
  chargerPresencePatristique(await creerSupabaseServeur(), livre, chapitre))

// Métadonnées du chapitre lu. Le titre dit DEUX choses, dans cet ordre : quel
// passage on lit, puis ce que Corpus Scriptura y apporte de propre — les Pères
// qui le commentent. « Jean 1 » seul ne distinguerait ce site d'aucun autre ;
// « Exégèse patristique johannique » ne se cherche pas.
//
// ⛔ Et il ne promet que ce que la page porte : un chapitre que personne ne
// commente s'annonce comme texte biblique, pas comme commentaire patristique.
// Voir `app/lib/metadonneesSeo.ts` pour les modèles, et
// `app/lib/metadonneesSeoServeur.ts` pour la lecture qui les alimente.
//
// Sans paramètre, la page redirige vers l'accueil : rien à décrire.
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ livre?: string; chapitre?: string }>
}): Promise<Metadata> {
  const p = await searchParams
  if (!p.livre && !p.chapitre) return {}
  const livre = p.livre || 'GEN'
  // Un livre que la Bible ne connaît pas ne désigne aucune page : elle rendra un
  // 404, et un 404 ne se compose pas un titre de chapitre.
  if (!NOMS_LIVRES[livre]) return {}
  const chapitre = normaliserChapitreBible(p.chapitre)
  // « Psaume 22 », non « Psaumes 22 » : la forme sous laquelle on CITE un livre,
  // qui est aussi celle sous laquelle on le cherche.
  const reference = `${nomLivreReference(livre)} ${chapitre}`

  const { types, auteurs } = await presenceDuChapitre(livre, chapitre)
  const nature = naturePatristique(types)
  const titre = titreChapitreBible(reference, nature)
  const description = descriptionChapitreBible(reference, nature, auteurs)

  return {
    // Le gabarit « %s · Corpus Scriptura » du layout racine ne s'applique pas à la page
    // racine (même segment) : on compose donc le suffixe ici, pour rester cohérent.
    title: { absolute: avecNomDuSite(titre) },
    description,
    // Un même chapitre se lit sous bien des habits : traduction choisie, mode de
    // lecture, graphie, texte en regard, appareil écarté, verset visé. Toutes ces
    // adresses montrent LE MÊME passage ; on désigne celle qui fait foi, pour que
    // les moteurs les rassemblent au lieu de les compter neuf fois.
    // ⚠️ Aucune URL n'est touchée : celles qui existent continuent de fonctionner.
    alternates: { canonical: `/?livre=${livre}&chapitre=${chapitre}` },
    ...enTetesPartage(titre, description),
  }
}

/**
 * Les manchettes d'un lot de blocs, et les notes qu'un titre absorbé lègue à
 * son développement.
 *
 * ⛔ LES SUBDIVISIONS D'UN APPARAT INTRODUCTIF PASSENT EN MANCHETTE, et leur
 * bloc de titre ne se rend plus pour lui-même (charte § 35.27). Le calcul se
 * fait sur l'ORDRE MATÉRIEL, avant tout éclatement par créneau canonique : le
 * titre y perdrait son développement.
 *
 * ⛔ **LES DEUX LECTURES LE PARTAGENT.** Une colonne et le texte en regard
 * composent les mêmes blocs d'apparat ; ils doivent donc les composer pareil.
 * La lecture en regard s'en passait : « Le sujet et le but » et « Plan et
 * division » de la Genèse y gardaient le titre centré et le blanc de
 * sous-section que la lecture ordinaire avait quittés (relevé de l'auteur, 20
 * septembre 2026). Même raison que `baliserPayload` et `rangerSousTitres` —
 * une seule écriture, sinon les deux dérivent.
 */
function manchettesDuPayload(blocs: BibleEditionChapterPayload['bodyBlocks']) {
  const manchettes = manchettesDApparat(blocs.map((b) => ({
    id: b.id,
    blockKey: b.block_key,
    semanticStyleCode: b.semantic_style_code,
    semanticLevel: b.semantic_level,
    embeddedTitleLevel: b.embedded_title_level,
    semanticParentKey: b.semantic_parent_key,
    heading: b.heading,
  })))
  // Les notes que le titre absorbé portait sur son intitulé suivent leur
  // intitulé : elles se rendent dans la manchette, à l'appel près.
  // ⚠️ L'ancre se dénumérote comme l'intitulé, sans quoi « 1. La personne de
  // l'auteur » ne se retrouverait plus dans « La personne de l'auteur » et la
  // note tomberait dans la liste de bas de bloc (3 notes du corpus).
  const notesDuTitreAbsorbe = new Map<string, BibleEditionChapterPayload['bodyBlocks'][number]['internal_notes']>()
  for (const [cibleId, manchette] of manchettes.parBloc) {
    const titre = blocs.find((b) => b.id === manchette.titreId)
    if (!titre || titre.internal_notes.length === 0) continue
    notesDuTitreAbsorbe.set(cibleId, titre.internal_notes.map((note) => ({
      ...note,
      anchor_text: note.anchor_text ? intituleDeManchette(note.anchor_text) : note.anchor_text,
    })))
  }
  return { manchettes, notesDuTitreAbsorbe }
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ livre?: string; chapitre?: string; trad?: string; mode?: string; division?: string; couche?: string; bilingue?: string; texte?: string; piece?: string }>
}) {
  const params = await searchParams
  if (!params.livre && !params.chapitre && !params.trad) redirect('/accueil')

  // Une adresse qui nomme un livre que la Bible ne connaît pas ne désigne aucune
  // page. On le dit, au lieu de recopier la chaîne reçue en guise de nom de livre :
  // « INCONNU ❧ Chapitre 1 » se composait jusqu'ici comme un vrai chapitre.
  const livre = params.livre || 'GEN'
  if (!NOMS_LIVRES[livre]) notFound()
  const chapitre = normaliserChapitreBible(params.chapitre)

  // ── Quelle bible rendre ─────────────────────────────────────────────────────
  // La décision se prend ICI, avant le premier rendu, et dans cet ordre : l'adresse,
  // puis le cookie de préférence, puis le profil. Elle se prenait autrefois APRÈS le
  // rendu, dans un effet du navigateur qui se rappelait lui-même — voir la note de
  // `app/lib/preferenceBible.ts`.
  const cookieStore = await cookies()
  const tradDemandee = codeTraductionValide(params.trad)
    ?? codeTraductionValide(cookieStore.get(COOKIE_TRAD_BIBLE)?.value)

  const supabase = await creerSupabaseServeur()
  // ⚠️ Le CANON du chapitre part avec la vague, mais on ne l'ATTEND pas ici :
  // seules les éditions commentées s'en servent, et une bible ordinaire n'a pas
  // à payer son aller-retour. La requête est lancée, la promesse est cueillie
  // plus bas, là où l'on sait qu'elle sert. ⛔ Le rattrapage d'erreur n'est pas
  // un ornement : une promesse rejetée que personne n'attend fait tomber le
  // processus. ⚠️ Elle sert les DEUX chemins de lecture, une colonne comme deux
  // en regard, et c'est elle qui permet de ne demander à la base que les blocs
  // du CHAPITRE au lieu de ceux du livre entier — mesuré sur Matthieu 1 : 224 ms
  // et 744 Ko avant, 73 ms et 26 Ko après.
  const canonPromis = canonDuChapitre(supabase, livre, chapitre)
    .catch((erreur: unknown) => {
      // ⚠️ Journalisé, puis dégradé : un canon vide fait RELIRE l'axe par le chargeur
      // de versets, qui lève alors une erreur explicite (`lireCanonDuChapitre`).
      console.error(`[lecture] canon de ${livre} ${chapitre} illisible :`, erreur)
      return { lignes: [] as Awaited<ReturnType<typeof canonDuChapitre>>['lignes'], bornes: null }
    })
  // L'adresse de la page, à redemander telle quelle quand le texte n'a pas pu se lire.
  const adressePage = `/?${new URLSearchParams(
    Object.entries(params).filter((e): e is [string, string] => typeof e[1] === 'string'),
  ).toString()}`
  const [
    catalog, editionCatalog,
    { data: rawTranslations, error: erreurTraductions },
    { data: rawEditions, error: erreurEditions },
    tradProfil, indexEditeurs, couchesPrechargees,
  ] = await Promise.all([
    loadBibleReadingCatalog(supabase),
    loadBibleEditionCatalog(supabase),
    // `dates` = vie et mort de l'auteur ; `date_publication` = la ligne d'édition
    // de l'encart Traduction (« D'après l'édition de 1888-1904 »).
    // ⛔ Plus de `source_edition` ni de `bio_courte` : la carte du volet portait la
    // référence de l'édition, puis la notice du traducteur, et ne porte plus ni
    // l'une ni l'autre (2026-09-02 et 2026-09-03). Les deux sont dans la fiche
    // « En savoir plus », qui les charge elle-même quand on l'ouvre ; les demander
    // ici, c'était les faire voyager à chaque chapitre lu pour personne.
    // ⛔ Plus de `confession` ni de `langue` non plus : elles servaient les trois
    // repères de la carte, remplacés le 2026-09-03 par la seule ligne d'édition.
    // ⛔ `est_biblique` : la table tient aussi la notice bibliographique de la traduction
    // employée par une œuvre PATRISTIQUE (Jeannin pour Chrysostome, Barreau et Charpentier
    // pour la Cité de Dieu…), à laquelle renvoie `oeuvres.trad_id`. Un sélecteur de
    // traduction BIBLIQUE ne montre que ce qui en est.
    // ⚠️ `langue` revient, pour une autre raison : une note de verset qui cite un texte que
    // la page écarte (le prologue grec du Siracide) le cite dans SA langue (charte § 13.22).
    supabase.from('traductions').select('trad_id, nom, auteur, dates, date_publication, langue').eq('est_biblique', true).order('ordre', { ascending: true }),
    // ⚠️ LE LIEU ET L’ÉDITEUR de l’édition servie, pour la phrase de la carte
    // (« D’après l’édition de Paris, Letouzey et Ané, 1888-1904 » — demande de
    // l’auteur, 2026-09-04). Ils vivent dans `editions_sources`, une table de sept
    // lignes : elle part dans la MÊME vague que les autres et ne coûte pas un
    // aller-retour de plus. ⛔ Pas de jointure par `v_traductions_page` : la vue
    // ne porte pas `est_biblique`, sur quoi le sélecteur de bibles se filtre, et
    // elle traîne la notice éditoriale entière — deux kilo-octets par bible, à
    // chaque chapitre ouvert, pour deux mots.
    supabase.from('editions_sources').select('trad_id, lieu_edition, editeur, annee_edition, depot_manuscrit, cote_manuscrit'),
    // Le profil ne sert QUE la première visite d'un navigateur, avant qu'il porte le
    // cookie : la page le repose ensuite elle-même à chaque lecture. Interrogé dans
    // la même vague que les trois autres, il ne coûte pas un aller-retour de plus.
    tradDemandee ? Promise.resolve(null) : (async () => {
      const { data: session } = await supabase.auth.getUser()
      const uid = session.user?.id
      if (!uid) return null
      const { data: profil } = await supabase.from('profils').select('traduction_defaut').eq('id', uid).maybeSingle()
      return codeTraductionValide(profil?.traduction_defaut)
    })(),
    // ⛔ LE CANON DU CHAPITRE NE SE REDEMANDE PAS ICI : il part déjà avec la vague, par
    // `canonPromis`, quelques lignes plus haut. Il l'a été DEUX fois du 2026-08-27 au
    // 2026-09-09, la seconde réponse étant jetée par une case vide du destructuring —
    // la base faisait donc le travail deux fois à chaque chapitre ouvert, et les 26 Ko
    // mesurés sur Matthieu 1 voyageaient en double. Pire : ce second appel n'avait PAS
    // le rattrapage d'erreur de `canonPromis`, si bien qu'un canon en échec faisait
    // tomber la page entière au lieu de la dégrader, ce que le `.catch` de la ligne 139
    // était précisément là pour empêcher.
    // ⚠️ Ce qui suit décrit toujours `canonPromis` : les BORNES d'ordre canonique ne
    // dépendent que du livre et du numéro, connus dès l'entrée, et servent aux DEUX
    // chemins de lecture — une colonne comme deux en regard. C'est elles qui permettent
    // de ne demander à la base que les blocs du CHAPITRE au lieu de ceux du livre entier :
    // mesuré sur Matthieu 1, 224 ms et 744 Ko avant, 73 ms et 26 Ko après.
    // ⚠️ L'INDEX DES ÉDITEURS RÉPERTORIÉS, pour que la carte nomme les maisons
    // sous leur forme normalisée et les joigne par « et » (voir `joindreEditeurs`).
    // La table est minuscule et le module la garde cinq minutes en mémoire : la
    // requête part avec la vague et ne coûte pas un aller-retour de plus.
    // ⛔ La résolution se fait ICI, sur le serveur : envoyer l'index au navigateur
    // ferait voyager la table entière des éditeurs pour composer deux mots.
    chargerIndexEditeurs(supabase),
    // ⚠️ Les COUCHES du témoin 899 partent avec la vague (2026-09-22), au lieu d'être
    // attendues seules une fois la bible choisie. On ne les demande que si la bible
    // lue PEUT être ce témoin (adresse ou cookie qui le nomment, ou rien de demandé).
    // ⛔ Leur échec ne ferme pas la page : `null`, et la page retombe sur les deux
    // couches que la vue porte toujours.
    (tradDemandee == null || tradDemandee === TRAD_ID_BIBLE899)
      ? couchesDisponibles899(supabase).catch((erreur: unknown) => {
        console.error('[lecture] couches du témoin 899 illisibles :', erreur)
        return null
      })
      : Promise.resolve(null),
  ])
  // ⛔ UNE PANNE N'EST PAS UNE ABSENCE (2026-09-22). La liste des traductions en panne
  // se lisait comme « aucune traduction », et la page redirigeait vers l'accueil. Elle
  // dit maintenant qu'elle n'a pas pu se charger. L'adresse des éditions n'est qu'un
  // ornement de la carte : son échec se journalise et la carte se passe de l'adresse.
  if (erreurTraductions) {
    console.error(`[lecture] traductions illisibles (${livre} ${chapitre}) :`, erreurTraductions)
    return <ChapitreIndisponible adresse={adressePage} titre="La page n’a pas pu se charger"
      explication="La liste des traductions n’a pas répondu à temps. Réessayez dans un instant." />
  }
  if (erreurEditions) console.error('[lecture] adresses des éditions illisibles, carte servie sans elles :', erreurEditions)
  // L'adresse de l'édition servie, rangée par bible. ⚠️ Une bible sans fiche
  // d'édition n'a pas d'adresse : la phrase de la carte se compose alors avec les
  // seules dates, et son séparateur part avec le champ absent.
  const adressesEdition = new Map(
    ((rawEditions ?? []) as {
      trad_id: string; lieu_edition: string | null; editeur: string | null
      annee_edition: string | null; depot_manuscrit: string | null; cote_manuscrit: string | null
    }[]).map(e => [e.trad_id, e]),
  )
  const toutesTraductions = (rawTranslations || [])
    .map(t => {
      const fiche = adressesEdition.get(t.trad_id)
      return {
        code: t.trad_id, label: t.nom, auteur: t.auteur, auteurDates: t.dates ?? null,
        datePublication: t.date_publication,
        lieuEdition: fiche?.lieu_edition ?? null,
        // ⚠️ L'éditeur part d'ici DÉJÀ NORMALISÉ : chaque maison sous son nom
        // répertorié, et « et » entre elles au lieu du point-virgule du catalogue.
        editeur: joindreEditeurs(fiche?.editeur, indexEditeurs),
        anneeEdition: fiche?.annee_edition ?? null,
        depotManuscrit: fiche?.depot_manuscrit ?? null,
        coteManuscrit: fiche?.cote_manuscrit ?? null,
        // La langue voyage dès le premier rendu : TexteBible sait la lire.
        langue: t.langue ?? null,
      }
    })
  // La langue de chaque bible, au code du site (`grc`, `la`, `fr`) : celle du texte qu'une
  // note de verset cite.
  const languesDesBibles = new Map((rawTranslations ?? []).map((t) => [t.trad_id as string, codeLangue(t.langue)]))
  const estLisible = (code: string) => selectableReadingModes(
    catalog.capabilities[code] ?? { translationId: code, modes: [] },
  ).length > 0
  // ── Les traductions lues dans `versets_v2` par le canon ────────────────────
  // Un membre de famille que le catalogue ne sait pas lire (ni colonne de la vue
  // large, ni segmentation éditoriale) mais que `livres_par_traduction` porte : la
  // traduction moderne de la Bible du XIIIe siècle (TR0013), en famille avec le
  // témoin 899. ⛔ La découverte se fait ICI, sous la RLS du lecteur, et jamais
  // dans le catalogue mis en cache pour tous : une traduction privée n'existe que
  // pour l'administrateur, et un cache la promettrait à tout le monde.
  // ⚠️ La promesse part maintenant et ne s'attend que là où elle sert : tout de
  // suite si c'est cette traduction qu'on demande, avec la vague des versets sinon.
  const candidatsV2 = [...new Set(editionCatalog.map((row) => row.trad_id))].filter((code) => !estLisible(code))
  const tradsV2Promis: Promise<string[]> = candidatsV2.length === 0
    ? Promise.resolve([])
    : Promise.resolve(supabase.from('livres_par_traduction').select('trad_id').in('trad_id', candidatsV2))
      .then(({ data }) => [...new Set(((data ?? []) as { trad_id: string }[]).map((row) => row.trad_id))])
      .catch(() => [] as string[])
  const tradSouhaitee = tradDemandee ?? tradProfil
  const souhaiteeV2 = !!tradSouhaitee && candidatsV2.includes(tradSouhaitee) && (await tradsV2Promis).includes(tradSouhaitee)
  const trad = tradSouhaitee && (catalog.capabilities[tradSouhaitee] || souhaiteeV2)
    ? tradSouhaitee
    : toutesTraductions.find((t) => estLisible(t.code))?.code
  const canoniqueV2 = souhaiteeV2 && trad === tradSouhaitee
  if (!trad) redirect('/accueil')
  // Le menu ne liste que des bibles lisibles, MAIS il liste toujours celle qu'on lit.
  // Sans cette seconde condition, une traduction que le catalogue n'annonce pas encore
  // laisse le menu montrer le nom d'une AUTRE bible au-dessus du chapitre lu, puisque
  // l'index tombe alors sur la première de la liste. L'ordre de `traductions` est
  // conservé : la bible lue reste à sa place, elle n'est pas poussée en tête.
  const translations = toutesTraductions.filter((t) => estLisible(t.code) || t.code === trad)

  const modes = selectableReadingModes(catalog.capabilities[trad] ?? { translationId: trad, modes: [] })
  const requestedMode = params.mode as BibleReadingMode | undefined
  const mode = modes.some((item) => item.value === requestedMode)
    ? requestedMode!
    : modes[0]?.value ?? 'verse'

  if (mode !== 'verse') {
    const capabilityRow = catalog.rows.find((row) => (
      row.trad_id === trad && row.mode_code === mode && row.is_available
    ))
    const payload = capabilityRow
      ? await loadSourceReading(supabase, capabilityRow.source_id, mode, params.division)
      : null
    if (payload) {
      return (
        <BibleSourceReader
          translationId={trad}
          translations={translations}
          capabilities={catalog.capabilities}
          mode={mode}
          divisions={payload.divisions}
          selectedDivision={payload.selectedDivision}
          units={payload.units}
        />
      )
    }
    return (
      <main style={{ minHeight: '60vh', display: 'grid', placeItems: 'start center', paddingTop: '12vh' }}>
        <p style={{ color: 'var(--cs-texte-second)', fontStyle: 'italic' }}>
          Ce mode est annoncé, mais ses données de lecture ne sont pas accessibles.
        </p>
      </main>
    )
  }

  // Deux origines pour le mode « verset », même contrat de données pour BibleLayout :
  //   - éditions historiques (TR0001–TR0005) : vue large `versets_lecture` ;
  //   - segmentations éditoriales (Bible 899, Fillion, Vulgate Fillion…) : texte
  //     recomposé et aligné sur
  //     canon_id, ADAPTÉ au contrat ordinaire (aucune copie vers versets_v2). La
  //     mécanique (offsets, unités-source, folios…) reste derrière l'adaptateur.
  const editorial = estVerseEditorial(catalog.capabilities[trad])
  const bible899 = trad === TRAD_ID_BIBLE899
  // Couches réellement disponibles, lues sur les DONNÉES : elles alimentent le menu
  // « Graphie » du volet de gauche. Aucune n'est écartée ici — la transcription
  // diplomatique est un état du texte comme les autres, et le lecteur qui la demande
  // sait ce qu'il demande. Le menu ne paraît qu'à partir de deux couches.
  const couchesBible: Couche899[] = !bible899 ? []
    : couchesPrechargees
      ?? await couchesDisponibles899(supabase).catch((erreur: unknown) => {
        console.error('[lecture] couches du témoin 899 illisibles :', erreur)
        return [...COUCHES_TOUJOURS_899]
      })
  const couche = normaliserCouche899(params.couche, couchesBible)
  // ⚠️ Une FONCTION, non un chargement immédiat : la lecture en regard rend ses deux
  // colonnes par son propre chemin et n'a que faire de celui-ci. Chargé d'office, il
  // coûtait quatre allers-retours pour rien sur la Fillion en regard.
  const lireVersetsDuChapitre = async (): Promise<ComponentProps<typeof BibleLayout>['versets']> => {
    if (bible899) {
      const lignes = await chargerVersets899(supabase, { livre, chapitre }, [couche])
      return adapterVersets899(lignes, trad, livre, chapitre, couche)
    }
    if (canoniqueV2) {
      // Le texte est dans `versets_v2`, un verset par créneau : rien à recomposer.
      return chargerVersetsCanoniquesV2(supabase, { translationId: trad, livre, chapitre, canonRows: canonChapitre.lignes })
    }
    if (editorial) {
      const sourceIds = catalog.rows
        .filter((row) => row.trad_id === trad && row.mode_code === 'verse' && row.is_available)
        .map((row) => row.source_id)
      // ⚠️ Le canon est déjà lu : une des quatre vagues de la cascade éditoriale
      // disparaît du chemin critique (mesurée à 83 ms).
      return chargerVersetsEditoriaux(supabase, { sourceIds, translationId: trad, livre, chapitre, canonRows: canonChapitre.lignes })
    }
    const { data } = await supabase
      // Vue de compatibilité canonique. Elle reste le chemin exclusif des éditions
      // historiques et n'est jamais utilisée pour simuler un mode source.
      // ⚠️ Un livre SANS créneau canonique n'y est pas, et ne peut pas y être : la
      // Septante porte sept écrits que le canon ne reçoit pas, et ils vivent dans
      // `versets_apocryphes`, hors de l'ossature, ce qui est leur juste place. Le
      // contrat de lecture est le même des deux côtés, si bien que le choix se réduit
      // à un nom de vue (voir la migration 20260906125959).
      .from(estLivreNonCanonique(livre) ? 'versets_lecture_apocryphes' : 'versets_lecture')
      .select('*')
      // ⛔ L'erreur se LÈVE (2026-09-22) : ignorée, un délai dépassé rendait une liste vide,
      // et la page annonçait « La traduction ne comporte pas ce livre ».
      .throwOnError()
      .eq('livre', livre)
      .eq('chapitre', chapitre)
      .order('verset')
      // ⛔ Le second tri n'est pas un ornement : un verset et la ligne propre à une édition
      // qui porte le même numéro (« 8 » et « 8+ ») partagent leur `verset`, et leur ordre
      // n'était garanti par rien (701 paires dans la vue, relevé du 17 septembre 2026). Il
      // décide du rang des notes des versets, et l'inventaire du volet de droite le rejoue.
      .order('id_verset')
    return data || []
  }
  // ⛔ LE TEXTE EST LA SEULE COUCHE DONT L'ÉCHEC FERME LA PAGE (charte § 18), et il la
  // ferme en le DISANT. L'échec est retenu ici plutôt que levé : la promesse des versets
  // nourrit aussi celle de l'appareil, et un rejet laissé sans preneur ferait tomber le
  // processus. La page lit `echecTexte.erreur` après la vague et rend « Le chapitre n'a pas pu
  // se charger », avec un « Réessayer » qui redemande vraiment la page.
  const echecTexte: { erreur: unknown } = { erreur: null }
  const chargerVersetsDuChapitre = async (): Promise<ComponentProps<typeof BibleLayout>['versets']> => {
    try {
      return await lireVersetsDuChapitre()
    } catch (erreur) {
      echecTexte.erreur = erreur
      console.error(`[lecture] ${livre} ${chapitre} (${trad}) : le texte n’a pas pu se charger :`, erreur)
      return []
    }
  }

  // Les balises de titre se calculent sur les seuls blocs qui atteignent l'axe
  // de lecture du chapitre. Un parent chargé parce que sa plage recouvre le
  // chapitre, mais inséré plusieurs chapitres plus tôt, reste utile au payload
  // et aux sous-titres ; il n'existe pas dans le DOM courant et ne doit donc pas
  // y creuser un niveau HTML invisible.
  const baliserPayload = (
    blocs: readonly BibleEditionBodyBlockRow[],
    bornes: BornesOrdreChapitre = null,
  ) => baliserBlocsDuChapitre(blocs.map((b) => ({
    id: b.id,
    semanticStyle: b.semantic_style_code,
    intitule: b.heading,
    blockKey: b.block_key,
    semanticParentKey: b.semantic_parent_key,
    axeHierarchie: presentationDeBloc(b.presentation)?.hierarchyAxis ?? null,
    placement: b.placement,
    canonOrderStart: b.canon_order_start,
    canonOrderEnd: b.canon_order_end,
  })), bornes)

  // Le rang du TITRE auquel chaque sous-titre s'accroche, du même passage : un
  // sous-titre est le CHAPEAU de son titre, tombé dans un bloc voisin par l'ordre
  // matériel, et il doit se composer comme lui. ⛔ Ni son rôle ni son propre rang
  // ne le disent — voir `rangDesSousTitres`.
  const rangerSousTitres = (blocs: readonly BibleEditionBodyBlockRow[]) =>
    rangDesSousTitres(blocs.map((b) => ({
      id: b.id,
      blockKey: b.block_key,
      semanticStyle: b.semantic_style_code,
      niveau: b.semantic_level,
      roleAffichage: presentationDeBloc(b.presentation)?.displayRole ?? null,
      ancre: presentationDeBloc(b.presentation)?.attachToBlockKey ?? null,
    })))

  // Un bloc de note se compose partout de la même façon : la couche de RENDU
  // quand elle existe — c'est elle qui porte `*italique*` et `++capitales++` —,
  // la transcription sinon, et le style que la donnée déclare.
  // ⛔ Et sa VOIX : la sienne, sinon celle que sa note déclare (charte § 13.21). La
  // fenêtre la nomme en tête ; une voix perdue ici se tairait sans que rien ne le dise.
  const blocDeNote = (roleDeLaNote: string | null | undefined) =>
    (bloc: BibleEditionNoteBlockRow): BibleEditionDisplayTextBlock => ({
      id: bloc.block_id,
      kind: bloc.kind,
      form: bloc.form,
      text: bloc.rendering ?? bloc.text,
      language: bloc.language,
      presentationStyle: styleCompositionDeNote(bloc.presentation),
      editorialRole: roleDuBlocDeNote(bloc.editorial_role, roleDeLaNote),
    })

  const editionMember = editionCatalog.find((row) => row.trad_id === trad)
  // La promesse lancée en tête n'est cueillie que si une édition commentée la
  // demande : la lecture ordinaire ne l'attend jamais.
  const canonChapitre = editionMember ? await canonPromis : { lignes: [], bornes: null }
  // Lecture « Sans les commentaires » : on n'écarte pas l'appareil à l'affichage, on
  // ne le CHARGE PAS. C'est un axe INDÉPENDANT de ce qu'on lit — il vaut pour une
  // colonne comme pour les deux en regard.
  const texteSeul = params.texte === 'seul'
  // L'édition porte un appareil éditorial : le choix se pose, chapitre commenté ou non.
  // On le tient de la FAMILLE, non du chapitre affiché — sans quoi le menu
  // disparaîtrait sur un chapitre sans commentaire, laissant le lecteur enfermé dans
  // le texte nu sans moyen d'en sortir.
  // ⛔ Mais une famille SANS appareil n'offre pas le choix (demande de l'auteur,
  // 2026-09-03 : « Avec et Sans commentaires doit apparaître seulement si les
  // commentaires existent »). La Bible du XIIIe siècle et sa traduction moderne
  // forment une famille dont les notes sont encore en brouillon : le menu leur
  // proposait d'écarter un appareil qui n'existe pas. Deux comptes en tête, sous la
  // RLS du lecteur — elle ne rend que ce qui est publié —, dans la vague des versets.
  const paratexteDisponiblePromis: Promise<boolean> = editionMember
    // ⚠️ Deux SONDES d'une ligne, non deux comptes exacts (2026-09-22) : on veut savoir
    // s'il y a UN bloc ou UNE note, et `count: 'exact'` parcourait toute la famille pour
    // n'en retenir que « plus de zéro ». Un échec se journalise et vaut « non ».
    ? Promise.all([
      supabase.from('bible_editorial_body_blocks').select('id').eq('family_id', editionMember.family_id).limit(1),
      supabase.from('bible_verse_notes').select('id').eq('family_id', editionMember.family_id).limit(1),
    ]).then(([blocs, notes]) => {
      if (blocs.error || notes.error) {
        console.error('[lecture] sonde de l’appareil éditorial en échec :', blocs.error ?? notes.error)
      }
      return (blocs.data?.length ?? 0) + (notes.data?.length ?? 0) > 0
    }).catch(() => false)
    : Promise.resolve(false)
  // Les rangs de titre que l’édition ne rend pas : réglage d’administration, lu sous
  // la RLS du lecteur, dans la même vague. Un échec les rend tous visibles.
  const titresMasquesPromis: Promise<string[]> = editionMember
    ? Promise.resolve(supabase.from('bible_edition_families').select('titres_masques').eq('id', editionMember.family_id).maybeSingle())
      .then(({ data }) => (data?.titres_masques as string[] | null) ?? []).catch(() => [])
    : Promise.resolve([])
  // Même raison que ci-dessus : en regard, cet appareil n'est jamais rendu (c'est
  // `lectureBilingue` qui porte le sien), et le charger d'office coûtait cinq
  // allers-retours pour rien.
  // ⚠️ La transformation d'une charge en matière d'AFFICHAGE sert deux lectures :
  // l'appareil d'un chapitre, et une pièce du sommaire de l'édition. Une seule
  // écriture, sinon les deux dérivent — c'est ainsi qu'une section entière est
  // restée invisible en ligne pendant que ses tests passaient (voir AGENTS.md,
  // « Les colonnes de `segments` s'écrivent en UN seul endroit »).
  const composerAffichage = (
    membre: NonNullable<typeof editionMember>,
    payload: BibleEditionChapterPayload,
    bornesAffichage: BornesOrdreChapitre = null,
  ): BibleEditionChapterDisplay => {
    const appartientAuMembre = (row: { applies_to: 'family' | 'member'; applies_to_member_id: string | null }) => (
      row.applies_to === 'family' || row.applies_to_member_id === membre.member_id
    )
    const balises = baliserPayload(payload.bodyBlocks, bornesAffichage)
    const rangs = rangerSousTitres(payload.bodyBlocks)
    const { manchettes, notesDuTitreAbsorbe } = manchettesDuPayload(payload.bodyBlocks)
    // Les blocs qui atteignent vraiment l'écran : ceux du membre, moins les
    // titres que leur manchette a absorbés.
    const blocsDuMembre = payload.bodyBlocks
      .filter(appartientAuMembre)
      .filter((block) => !manchettes.absorbes.has(block.id))
    return {
      familyId: membre.family_id,
      memberId: membre.member_id,
      bodyBlocks: blocsDuMembre.map((block) => ({
        id: block.id,
        blockKey: block.block_key,
        semanticStyleCode: block.semantic_style_code,
        semanticLevel: block.semantic_level,
        embeddedTitleLevel: block.embedded_title_level,
        presentation: presentationDeBloc(block.presentation),
        semanticParentKey: block.semantic_parent_key,
        niveauHtml: balises.get(block.id),
        rangDuTitre: rangs.get(block.id),
        noticeSubtype: sousTypeNoticeValide(block.block_kind, block.notice_subtype),
        heading: block.heading,
        manchette: manchettes.parBloc.get(block.id)?.texte ?? null,
        // Le bloc n'est là que parce que le rendu l'a adopté, sa donnée ne
        // déclarant aucun parent : il le dit, et la feuille le crie.
        defautDeDonnee: blocOrphelinSansAncre(block) ? 'orphelin' as const : null,
        placement: block.placement,
        canonIdStart: block.canon_id_start,
        canonIdEnd: block.canon_id_end,
        materialOrder: block.material_order,
        textBlocks: blocsTexteEditoriaux(block.id, block.text_content, block.text_features),
        internalNotes: [...block.internal_notes, ...(notesDuTitreAbsorbe.get(block.id) ?? [])].map((note) => ({
          id: note.id,
          displayNumber: note.display_number,
          printedMarker: note.printed_marker,
          anchorStartOffsetUnicode: note.anchor_start_offset_unicode,
          anchorEndOffsetUnicode: note.anchor_end_offset_unicode,
          anchorText: note.anchor_text,
          anchorTarget: note.anchor_text && note.anchor_start_offset_unicode === null
            ? 'heading' as const
            : 'body' as const,
          blocks: note.blocks.map(blocDeNote(note.editorial_role)),
        })),
      })),
      notes: payload.notes.filter(appartientAuMembre).map((note) => ({
        id: note.id,
        displayNumber: note.display_number,
        canonId: note.canon_id,
        materialOrder: note.material_order,
        sousType: note.note_subtype,
        ancre: note.ancre ?? null,
        blocks: note.blocks.map(blocDeNote(note.editorial_role)),
      })),
      assets: payload.assets.filter(appartientAuMembre).map((asset) => ({
        id: asset.id,
        assetKey: asset.asset_key,
        assetKind: asset.asset_kind,
        url: adresseVersionnee(asset.public_uri, asset.web_sha256),
        width: asset.width_px,
        height: asset.height_px,
        altText: asset.alt_text,
        // La légende IMPRIMÉE d'abord : c'est celle de Fillion. La légende
        // éditoriale ne la supplée qu'à son défaut (les planches du tome I, dont
        // l'imprimée n'est pas transcrite), et elle porte encore des notes
        // d'atelier (« planche tournée ») qui relèvent de la donnée.
        caption: asset.printed_caption ?? asset.editorial_caption,
        printedPage: asset.printed_page,
        placement: asset.placement,
        canonIdStart: asset.canon_id_start,
        canonIdEnd: asset.canon_id_end,
        bodyBlockId: asset.body_block_id,
        noteId: asset.note_id,
        materialOrder: asset.material_order,
          ...regimeEtPartDeLActif(asset),
          ancienne: ancienneVersionDeLActif(asset),
      })),
    }
  }

  const chargerAppareilDuChapitre = async (
    membre: NonNullable<typeof editionMember>,
    // Une PROMESSE est acceptée : l'appareil part alors avec les versets au lieu
    // de les attendre (voir la note de `loadBibleEditionChapter`).
    canonIds: string[] | Promise<string[]>,
  ): Promise<BibleEditionChapterDisplay> => composerAffichage(membre, await loadBibleEditionChapter(supabase, {
    familyId: membre.family_id,
    bookCode: livre,
    canonIds,
    // ⚠️ Calculées plus bas, dans la vague des versets. La fonction n'étant
    // appelée qu'après, la constante est déjà posée quand elle s'exécute.
    bornesChapitre: canonChapitre.bornes,
    // Le canon LU : le chargeur n'a plus à redemander `versets_canon` pour l'ordre
    // de chaque créneau, que la page vient de lire.
    canonRows: canonChapitre.lignes,
    includeBookFrontMatter: chapitre === 1,
  }), canonChapitre.bornes)

  // Lecture « Latin & Français » : demandée par l'URL, et servie seulement si la
  // famille éditoriale porte réellement deux membres pour ce chapitre. À défaut,
  // la page rend la lecture ordinaire plutôt qu'un écran d'erreur.
  // ── Les notes des VERSETS (`versets_v2.notes`) ─────────────────────────────
  // ⛔ TOUTE BIBLE LUE AU VERSET PORTE SES NOTES SUR CETTE PAGE (charte § 13.22, demande de
  // l'auteur du 17 septembre 2026). Elles ne paraissaient que dans la Polyglotte : l'argument
  // d'un psaume chez Sacy, le verset propre à la Vulgate, l'écart de numérotation.
  // ⚠️ La requête part AVEC les versets, et son échec ne ferme pas la page : les notes
  // manquent, le texte reste, et l'échec part au journal (charte § 18).
  // ⛔ Pas en lecture « Sans les commentaires » : le texte nu est nu.
  const lancerNotesVersetsV2 = (codes: readonly string[]): Promise<LigneNoteV2[] | null> => (
    texteSeul || codes.length === 0
      ? Promise.resolve([])
      : chargerNotesVersetsV2(supabase, { codes, livre, chapitre }).catch((erreur: unknown) => {
        console.error(`[lecture] ${livre} ${chapitre} servi sans les notes des versets :`, erreur)
        return null
      })
  )
  const familyRows = editionMember
    ? editionCatalog.filter((row) => row.family_id === editionMember.family_id)
    : []
  // Les membres de la famille, dédoublonnés et dans l'ordre du catalogue : ils
  // composent le menu « Lecture » du volet de gauche (Français · Latin & Français ·
  // Latin). Deux membres ou plus ouvrent la lecture en regard ; une famille à un
  // seul texte se lit comme une traduction ordinaire.
  const membresFamille = [...new Map(familyRows.map((row) => [row.member_id, {
    tradId: row.trad_id,
    langue: row.language_code,
    role: row.member_role,
  }])).values()]
  const bilingueDisponible = membresFamille.length >= 2

  let lectureBilingue: ComponentProps<typeof BibleLayout>['lectureBilingue'] = null
  // L'appareil que la lecture en regard a déjà chargé, quand elle n'a pas pu se servir :
  // la lecture ordinaire qui prend le relais le REPREND au lieu de le redemander.
  let appareilDuRegard: BibleEditionChapterDisplay | null = null
  if (editionMember && bilingueDisponible && params.bilingue === '1') {
    // Les deux membres et l'appareil partent ENSEMBLE : l'appareil ne tient des
    // membres que l'axe canonique, qu'il accepte en promesse (même dispositif qu'en
    // une colonne, `chargerAppareilDuChapitre`). Ils se suivaient, et la lecture en
    // regard coûtait le double d'une colonne (mesuré en ligne le 2026-09-02 : 3,7 s
    // contre 2,0). Même règle qu'en une colonne : sans les commentaires, l'appareil
    // n'est pas chargé du tout, les trois listes vides suffisent.
    const membresCanoniquesV2 = new Set(await tradsV2Promis)
    // Le canon, déjà lu en tête de page, part avec : la lecture en regard ne le relit
    // plus pour chaque colonne.
    // ⛔ Le texte en regard qui ne se lit pas ferme la page en le DISANT, comme en lecture
    // simple (`echecTexte`) : l'échec est retenu, non levé, parce que la même promesse
    // nourrit l'appareil et qu'un rejet sans preneur ferait tomber le processus.
    const echecRegard: { erreur: unknown } = { erreur: null }
    const chargeePromise = chargerLectureBilingue(supabase, {
      familyRows, livre, chapitre, membresCanoniquesV2, canonRows: canonChapitre.lignes,
    }).catch((erreur: unknown) => {
      echecRegard.erreur = erreur
      console.error(`[lecture] ${livre} ${chapitre} en regard : le texte n’a pas pu se charger :`, erreur)
      return null
    })
    // Les notes des versets ne vivent que chez un membre lu par le canon : un membre à
    // segmentation éditoriale n'a pas de ligne dans `versets_v2`.
    const notesEnRegardPromis = lancerNotesVersetsV2([...new Set(familyRows.map((row) => row.trad_id))]
      .filter((code) => membresCanoniquesV2.has(code)))
    // ⚠️ L'appareil en panne ne ferme pas la page : le texte se sert sans lui, et l'échec
    // part au journal (charte § 18). `null` le distingue d'un appareil vide.
    const [chargee, payloadLu, lignesNotesEnRegard] = await Promise.all([
      chargeePromise,
      texteSeul
        ? Promise.resolve<BibleEditionChapterPayload>({ bodyBlocks: [], notes: [], assets: [] })
        : loadBibleEditionChapter(supabase, {
          familyId: editionMember.family_id,
          bookCode: livre,
          canonIds: chargeePromise.then((c) => c?.axeCanonique ?? []),
          bornesChapitre: canonChapitre.bornes,
          canonRows: canonChapitre.lignes,
          includeBookFrontMatter: chapitre === 1,
        }).catch((erreur: unknown): BibleEditionChapterPayload | null => {
          console.error(`[lecture] ${livre} ${chapitre} en regard servi sans l’appareil :`, erreur)
          return null
        }),
      notesEnRegardPromis,
    ])
    if (echecRegard.erreur) return <ChapitreIndisponible adresse={adressePage} />
    const payload: BibleEditionChapterPayload = payloadLu ?? { bodyBlocks: [], notes: [], assets: [] }
    // Servie ou non, la lecture en regard a chargé l'appareil de la famille sur l'axe du
    // chapitre : si elle cède la place, la lecture ordinaire le compose tel quel. ⚠️ Pas
    // s'il a échoué, ni sur un axe vide (ses notes de verset n'auraient pas été lues).
    if (!texteSeul && payloadLu && chargee && chargee.axeCanonique.length > 0) {
      appareilDuRegard = composerAffichage(editionMember, payloadLu, canonChapitre.bornes)
    }
    if (chargee && chargee.colonnes.some((colonne) => colonne.cellules.length > 0)) {
      const balisesBilingue = baliserPayload(payload.bodyBlocks, canonChapitre.bornes)
      const rangsBilingue = rangerSousTitres(payload.bodyBlocks)
      const {
        manchettes: manchettesBilingue,
        notesDuTitreAbsorbe: notesDuTitreAbsorbeBilingue,
      } = manchettesDuPayload(payload.bodyBlocks)
      // Les notes des versets d'un membre lu par le canon, numérotées APRÈS celles que sa
      // colonne appelle déjà (les siennes et celles de l'édition) : le numéro d'une note
      // d'édition est une donnée, et il ne se recompose pas.
      const notesEnRegard = chargee.colonnes.flatMap((colonne) => {
        const code = colonne.membre.translationId
        const lignes = (lignesNotesEnRegard ?? []).filter((ligne) => ligne.trad_id === code)
        if (lignes.length === 0) return []
        const numeros = payload.notes
          .filter((note) => note.applies_to === 'family' || note.applies_to_member_id === colonne.membre.id)
          .map((note) => note.display_number)
        return composerNotesV2(lignes, {
          livre, chapitre, mode: 'canon-v2',
          positions: positionsEnRegard(chargee.axeCanonique, colonne.cellules),
          debut: 1 + Math.max(0, ...numeros),
          langueDuTexte: languesDesBibles.get(code) ?? null,
        }).map((note) => ({ ...note, appliesTo: 'member' as const, appliesToMemberId: colonne.membre.id }))
      })
      lectureBilingue = {
        membres: chargee.colonnes.map((colonne) => colonne.membre),
        colonnes: chargee.colonnes,
        axeCanonique: chargee.axeCanonique,
        blocs: payload.bodyBlocks.filter((block) => !manchettesBilingue.absorbes.has(block.id)).map((block) => ({
          id: block.id,
          blockKey: block.block_key,
          semanticStyleCode: block.semantic_style_code,
          semanticLevel: block.semantic_level,
          embeddedTitleLevel: block.embedded_title_level,
          presentation: presentationDeBloc(block.presentation),
          semanticParentKey: block.semantic_parent_key,
          niveauHtml: balisesBilingue.get(block.id),
          rangDuTitre: rangsBilingue.get(block.id),
          noticeSubtype: sousTypeNoticeValide(block.block_kind, block.notice_subtype),
          heading: block.heading,
          manchette: manchettesBilingue.parBloc.get(block.id)?.texte ?? null,
          defautDeDonnee: blocOrphelinSansAncre(block) ? 'orphelin' as const : null,
          placement: block.placement,
          canonIdStart: block.canon_id_start,
          canonIdEnd: block.canon_id_end,
          materialOrder: block.material_order,
          appliesTo: block.applies_to,
          appliesToMemberId: block.applies_to_member_id,
          textBlocks: blocsTexteEditoriaux(block.id, block.text_content, block.text_features),
          internalNotes: [
            ...block.internal_notes,
            ...(notesDuTitreAbsorbeBilingue.get(block.id) ?? []),
          ].map((note) => ({
            id: note.id,
            displayNumber: note.display_number,
            printedMarker: note.printed_marker,
            anchorStartOffsetUnicode: note.anchor_start_offset_unicode,
            anchorEndOffsetUnicode: note.anchor_end_offset_unicode,
            anchorText: note.anchor_text,
            anchorTarget: note.anchor_text && note.anchor_start_offset_unicode === null
              ? 'heading' as const
              : 'body' as const,
            blocks: note.blocks.map(blocDeNote(note.editorial_role)),
          })),
        })),
        notes: [...payload.notes.map((note) => ({
          id: note.id,
          displayNumber: note.display_number,
          canonId: note.canon_id,
          materialOrder: note.material_order,
          appliesTo: note.applies_to,
          appliesToMemberId: note.applies_to_member_id,
          sousType: note.note_subtype,
          ancre: note.ancre ?? null,
          blocks: note.blocks.map(blocDeNote(note.editorial_role)),
        })), ...notesEnRegard],
        illustrations: payload.assets.map((asset) => ({
          id: asset.id,
          assetKey: asset.asset_key,
          assetKind: asset.asset_kind,
          url: adresseVersionnee(asset.public_uri, asset.web_sha256),
          width: asset.width_px,
          height: asset.height_px,
          altText: asset.alt_text,
          caption: asset.printed_caption ?? asset.editorial_caption,
          printedPage: asset.printed_page,
          placement: asset.placement,
          canonIdStart: asset.canon_id_start,
          canonIdEnd: asset.canon_id_end,
          bodyBlockId: asset.body_block_id,
          noteId: asset.note_id,
          materialOrder: asset.material_order,
          ...regimeEtPartDeLActif(asset),
          ancienne: ancienneVersionDeLActif(asset),
          appliesTo: asset.applies_to,
          appliesToMemberId: asset.applies_to_member_id,
        })),
      }
    }
  }

  // ── Et SEULEMENT MAINTENANT la lecture ordinaire ─────────────────────────────
  // L'ordre compte : la lecture en regard décide la première, parce qu'elle peut ne
  // pas être servable (chapitre hors du lot aligné) et laisser la lecture ordinaire
  // prendre le relais. La charger d'avance, comme on le faisait, revenait à payer
  // NEUF allers-retours dont neuf inutiles dès que les deux colonnes s'affichaient.
  // ⚠️ Le sommaire de l'édition part dans la MÊME vague que les versets : il ne
  // coûte donc pas un aller-retour de plus. Il n'existe que pour une édition
  // commentée — Fillion en a soixante-deux pièces, une bible ordinaire aucune —
  // et c'est lui qui décide si l'onglet « Sommaire » paraît au volet de gauche.
  const versetsPromis = lectureBilingue ? Promise.resolve([]) : chargerVersetsDuChapitre()
  // Les notes des versets partent AVEC eux. ⛔ La vue large les demande pour TOUTES ses
  // colonnes : le menu échange une colonne en mémoire, sans repasser par le serveur, et la
  // bible qu'on y choisit doit trouver les siennes. Une segmentation éditoriale (le témoin
  // de 1260, Fillion) n'a pas de ligne dans `versets_v2`, et une pièce liminaire n'a pas de
  // versets. ⚠️ Un livre hors du canon se lit dans une autre vue, qui n'en porte pas.
  const codesNotesVersetsV2 = (lectureBilingue || params.piece || bible899)
    ? []
    : canoniqueV2
      ? [trad]
      : (editorial || estLivreNonCanonique(livre))
        ? []
        : Object.keys(catalog.capabilities).filter((code) => estVerseSurColonnes(catalog.capabilities[code]))
  const notesVersetsV2Promis = lancerNotesVersetsV2(codesNotesVersetsV2)
  // ⚠️ L'APPAREIL ne dépend que du CANON, déjà lu en tête de page : ses blocs tiennent
  // aux bornes du chapitre, ses notes aux créneaux, et ni les uns ni les autres n'ont
  // besoin des versets. Il attendait `versetsPromis` pour en tirer des identifiants que
  // `canonChapitre.lignes` porte déjà — et qui valaient mieux : la lecture du témoin 899
  // y glisse des clés de glose (« 899:… ») qu'aucun `canon_id` ne connaît.
  // ⛔ ET IL NE PART QUE SI LA FAMILLE EN A UN (2026-09-22). Il était demandé pour TOUT
  // membre d'édition, donc pour les cinq bibles historiques dont la famille est en
  // chantier : cinq requêtes parallèles puis une seconde vague, pour ZÉRO ligne — mesuré
  // sous `authenticated` sur Sacy / Matthieu 5, 129 ms de base à elles cinq, plus deux
  // allers-retours de latence. La sonde `paratexteDisponiblePromis` part
  // dans la même vague que les versets, sous la RLS du lecteur — elle ne voit donc que ce
  // qui est publié —, et c'est elle qui ouvre la porte.
  // ⛔ La condition se lit sur l'ADRESSE (`params.piece`) et non sur la pièce résolue, qui
  // n'est connue qu'après le sommaire : une pièce demandée remplace le chapitre, et son
  // appareil n'a alors pas à être chargé.
  // ⛔ Son échec ne ferme pas la page : `null`, au journal, et le texte se sert sans lui.
  const appareilPromis: Promise<BibleEditionChapterDisplay | null> | null = (editionMember && !lectureBilingue && !texteSeul && !params.piece)
    ? (appareilDuRegard
      ? Promise.resolve(appareilDuRegard)
      : paratexteDisponiblePromis
        .then((disponible) => (disponible
          ? chargerAppareilDuChapitre(editionMember, canonChapitre.lignes.map((ligne) => ligne.id))
          : null))
        .catch((erreur: unknown) => {
          console.error(`[lecture] ${livre} ${chapitre} servi sans l’appareil :`, erreur)
          return null
        }))
    : null
  const [versetsCharges, liminaires, tradsV2, paratexteDisponible, titresMasques] = await Promise.all([
    versetsPromis,
    editionMember ? chargerLiminairesEdition(supabase, editionMember.family_id) : Promise.resolve([]),
    tradsV2Promis,
    paratexteDisponiblePromis,
    titresMasquesPromis,
  ])
  // Le texte n'a pas pu se lire : on le DIT, au lieu d'annoncer un chapitre vide. Une
  // pièce liminaire demandée n'a pas besoin des versets, elle se sert quand même.
  if (echecTexte.erreur && !params.piece) {
    // L'appareil attend encore : il ne doit pas rejeter sans preneur.
    void appareilPromis?.catch(() => null)
    return <ChapitreIndisponible adresse={adressePage} />
  }
  // Les traductions lues dans `versets_v2` rejoignent le catalogue de CETTE page,
  // et le menu avec elles (voir plus haut, « Les traductions lues dans versets_v2 »).
  const capabilitiesLecture = withCanonicalV2Capability(catalog.capabilities, tradsV2)
  const traductionsLecture = toutesTraductions.filter((t) => estLisible(t.code) || tradsV2.includes(t.code) || t.code === trad)
  // Les bibles d'une même famille d'édition se réunissent dans le menu central, sous leur
  // nom commun, et s'y déclinent par langue (charte § 15.6) : chaque bible porte ici sa
  // famille, lue au catalogue des éditions, jamais écrite à la main.
  const familleDeBible = new Map(editionCatalog.map((row) => [row.trad_id, { cle: row.family_id, role: row.member_role, rang: row.display_order }]))
  const traductionsMenu = traductionsLecture.map((t) => ({ ...t, famille: familleDeBible.get(t.code) ?? null }))
  const piecesLiminaires = grouperPiecesLiminaires(liminaires.map((bloc) => ({
    id: bloc.id,
    blockKey: bloc.block_key,
    heading: bloc.heading,
    scopeKind: bloc.scope_kind,
    scopeLabel: bloc.scope_label,
    nature: bloc.block_kind,
    pageImprimee: bloc.printed_page_start,
    materialOrder: bloc.material_order,
  })))
  const pieceDemandee = pieceParCle(piecesLiminaires, params.piece)

  // Une pièce liminaire REMPLACE le texte à l'écran : elle se lit seule, comme on
  // ouvre un volume à sa page de garde. Le chapitre ne se rend donc pas, et son
  // appareil ne se charge pas.
  const cles = new Set(pieceDemandee?.blocs.map((bloc) => bloc.blockKey) ?? [])
  // ⚠️ La bibliographie STRUCTURÉE part avec le texte de la pièce, non derrière
  // lui : les deux ne dépendent que de la famille et des blocs, connus ici. Et
  // elle ne part QUE si une pièce est demandée — un chapitre ordinaire n'en a
  // aucun usage et ne doit pas payer l'aller-retour.
  const [pieceChargee, entreesBibliographiques] = (pieceDemandee && editionMember)
    ? await Promise.all([
      chargerPieceLiminaire(supabase, {
        familyId: editionMember.family_id,
        blocs: liminaires.filter((bloc) => cles.has(bloc.block_key)),
      }),
      chargerBibliographiesEdition(supabase, editionMember.family_id),
    ])
    : [null, []]

  const pieceAffichee = (pieceDemandee && pieceChargee && editionMember)
    ? {
      cle: pieceDemandee.cle,
      titre: pieceDemandee.titre,
      portee: pieceDemandee.portee,
      contenu: composerAffichage(editionMember, pieceChargee),
      // ⛔ La pièce ne se reconnaît pas à son titre translittéré : chaque entrée
      // désigne le bloc matériel dont elle est issue, et c'est cette
      // appartenance-là qui lui donne sa clé de bibliographie.
      bibliographie: bibliographieDesBlocs(
        entreesBibliographiques,
        pieceDemandee.blocs.map((bloc) => bloc.id),
      ),
    }
    : null

  const versets = pieceDemandee ? [] : versetsCharges
  // L'appareil a été demandé plus haut, en même temps que les versets : il ne
  // reste qu'à le cueillir. ⚠️ Une pièce liminaire résolue APRÈS coup l'écarte,
  // même s'il a été chargé : c'est le cas d'une clé d'adresse qui ne désigne
  // aucune pièce, où l'on retombe sur le chapitre.
  const editionChapter: BibleEditionChapterDisplay | null =
    (appareilPromis && !pieceDemandee) ? await appareilPromis : null
  // Les notes des versets, rangées par bible et numérotées dans l'ordre de lecture. La bible
  // lue les numérote APRÈS l'appareil de son édition, quand elle en a un.
  const lignesNotesVersetsV2 = await notesVersetsV2Promis
  const numerosEdition = (editionChapter?.notes ?? []).map((note) => note.displayNumber)
  const notesDesVersets = lignesNotesVersetsV2 && lignesNotesVersetsV2.length > 0 && versets.length > 0
    ? Object.fromEntries(codesNotesVersetsV2.map((code) => [code, composerNotesV2(
      lignesNotesVersetsV2.filter((ligne) => ligne.trad_id === code),
      {
        livre, chapitre,
        mode: canoniqueV2 ? 'canon-v2' as const : 'vue-large' as const,
        positions: positionsDesVersets(versets, code),
        debut: 1 + (code === trad ? Math.max(0, ...numerosEdition) : 0),
        langueDuTexte: languesDesBibles.get(code) ?? null,
      },
    )]))
    : null

  // ⛔ Pas de frontière `Suspense` ici. Il n'y avait rien à y suspendre — tout ce
  // qu'elle enveloppait est attendu ci-dessus — mais elle suffisait à faire diffuser
  // le chapitre HORS FLUX, dans un `<div hidden id="S:0">` que le script de
  // révélation ne reprenait pas : le document gardait DEUX exemplaires du chapitre,
  // 136 Ko et le tiers de ses nœuds pour rien, et le HTML du serveur était jeté au
  // profit d'un rendu refait par le navigateur (mesuré le 2026-08-24).
  // Données structurées du chapitre. ⚠️ `presenceDuChapitre` est mis en cache par
  // React : cet appel ne coûte rien, `generateMetadata` l'a déjà fait dans la même
  // requête. Les noms des Pères n'existaient dans AUCUN document servi, le volet
  // patristique étant rendu par le navigateur.
  const { auteurs } = await presenceDuChapitre(livre, chapitre)
  const reference = `${nomLivreReference(livre)} ${chapitre}`

  return (
    <IndiceTelephoneServeur>
      <JsonLd
        donnees={donneesChapitreBible({
          livre, chapitre, reference, nomLivre: NOMS_LIVRES[livre] || livre, auteurs,
        })}
      />
      {/* Le livre ne se lit qu'à un chapitre : son échelon du fil d'Ariane pointe
          donc le premier, et disparaît quand c'est celui qu'on lit. */}
      <JsonLd
        donnees={donneesFilAriane([
          { nom: 'Accueil', url: '/accueil' },
          ...(chapitre > 1
            ? [{ nom: NOMS_LIVRES[livre] || livre, url: `/?livre=${livre}&chapitre=1` }]
            : []),
          { nom: reference, url: `/?livre=${livre}&chapitre=${chapitre}` },
        ])}
      />
      <BibleLayout
        livres={LIVRES}
        versets={versets}
        traductions={traductionsMenu}
        livreActif={livre}
        chapitreActif={chapitre}
        nomLivre={NOMS_LIVRES[livre] || livre}
        tradInitiale={trad}
        readingCapabilities={capabilitiesLecture}
        couche={bible899 ? couche : undefined}
        couchesDisponibles={couchesBible}
        editionChapter={editionChapter}
        notesDesVersets={notesDesVersets}
        lectureBilingue={lectureBilingue}
        membresFamille={membresFamille}
        paratexteDisponible={paratexteDisponible}
        titresMasques={titresMasques}
        texteSeul={texteSeul}
        sommaireEdition={piecesLiminaires.map(({ cle, titre, portee, scopeKind }) => ({
          cle, titre, portee, scopeKind,
        }))}
        pieceAffichee={pieceAffichee}
      />
    </IndiceTelephoneServeur>
  )
}
