import { notFound, redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import type { Metadata } from 'next'
import { cache, type ComponentProps } from 'react'
import BibleLayout from './components/BibleLayout'
import BibleSourceReader from './components/BibleSourceReader'
import { LIVRES } from '@/app/lib/bible'
import { loadBibleReadingCatalog, loadSourceReading } from '@/app/lib/bibleMultimodeServer'
import { estVerseEditorial } from '@/app/lib/bibleMultimode'
import { selectableReadingModes, type BibleReadingMode } from '@/app/lib/bibleReadingModes'
import { adapterVersets899, chargerVersets899, couchesDisponibles899, normaliserCouche899, TRAD_ID_BIBLE899 } from '@/app/lib/bible899'
import { chargerVersetsEditoriaux } from '@/app/lib/bibleEditorialServer'
import { chargerLectureBilingue, loadBibleEditionCatalog, loadBibleEditionChapter } from '@/app/lib/bibleEditionServer'
import {
  blocsTexteEditoriaux, presentationDeBloc, sousTypeNoticeValide, styleCompositionDeNote,
  type BibleEditionChapterDisplay, type BibleEditionDisplayTextBlock,
} from '@/app/lib/bibleEdition'
import type {
  BibleEditionBodyBlockRow, BibleEditionChapterPayload, BibleEditionNoteBlockRow,
} from '@/app/lib/bibleEditionServer'
import { baliserBlocs } from '@/app/lib/bibleHierarchieSemantique'
import { normaliserChapitreBible } from '@/app/lib/bibleNavigation'
import { codeTraductionValide, COOKIE_TRAD_BIBLE } from '@/app/lib/preferenceBible'
import { nomLivreReference } from '@/app/lib/referencesBibliques'
import {
  avecNomDuSite, descriptionChapitreBible, enTetesPartage, naturePatristique, titreChapitreBible,
} from '@/app/lib/metadonneesSeo'
import { chargerPresencePatristique } from '@/app/lib/metadonneesSeoServeur'
import { JsonLd, donneesChapitreBible, donneesFilAriane } from '@/app/lib/donneesStructurees'
import { creerSupabaseServeur } from '@/app/lib/supabaseServeur'

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

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ livre?: string; chapitre?: string; trad?: string; mode?: string; division?: string; couche?: string; bilingue?: string; texte?: string }>
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
  const [catalog, editionCatalog, { data: rawTranslations }, tradProfil] = await Promise.all([
    loadBibleReadingCatalog(supabase),
    loadBibleEditionCatalog(supabase),
    // `dates` = vie et mort de l'auteur ; `source_edition` = référence complète de
    // l'édition présentée (ville, éditeur, date), toutes deux pour l'encart Traduction.
    supabase.from('traductions').select('trad_id, nom, auteur, dates, source_edition, date_publication, confession, langue').order('ordre', { ascending: true }),
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
  ])
  const toutesTraductions = (rawTranslations || [])
    .map(t => ({ code: t.trad_id, label: t.nom, auteur: t.auteur, auteurDates: t.dates ?? null, editionRef: t.source_edition ?? null, datePublication: t.date_publication, confession: t.confession, langue: t.langue }))
  const estLisible = (code: string) => selectableReadingModes(
    catalog.capabilities[code] ?? { translationId: code, modes: [] },
  ).length > 0
  const tradSouhaitee = tradDemandee ?? tradProfil
  const trad = tradSouhaitee && catalog.capabilities[tradSouhaitee]
    ? tradSouhaitee
    : toutesTraductions.find((t) => estLisible(t.code))?.code
  if (!trad) redirect('/accueil')
  // Le menu ne liste que des bibles lisibles, MAIS il liste toujours celle qu'on lit.
  // Sans cette seconde condition, une traduction que le catalogue n'annonce pas encore
  // laisse le menu montrer le nom d'une AUTRE bible au-dessus du chapitre lu, puisque
  // l'index tombe alors sur la première de la liste. L'ordre de `traductions` est
  // conservé : la bible lue reste à sa place, elle n'est pas poussée en tête.
  const translations = toutesTraductions.filter((t) => estLisible(t.code) || t.code === trad)

  const modes = selectableReadingModes(catalog.capabilities[trad])
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
  const couchesBible = bible899 ? await couchesDisponibles899(supabase) : []
  const couche = normaliserCouche899(params.couche, couchesBible)
  // ⚠️ Une FONCTION, non un chargement immédiat : la lecture en regard rend ses deux
  // colonnes par son propre chemin et n'a que faire de celui-ci. Chargé d'office, il
  // coûtait quatre allers-retours pour rien sur la Fillion en regard.
  const chargerVersetsDuChapitre = async (): Promise<ComponentProps<typeof BibleLayout>['versets']> => {
    if (bible899) {
      const lignes = await chargerVersets899(supabase, { livre, chapitre }, [couche])
      return adapterVersets899(lignes, trad, livre, chapitre, couche)
    }
    if (editorial) {
      const sourceIds = catalog.rows
        .filter((row) => row.trad_id === trad && row.mode_code === 'verse' && row.is_available)
        .map((row) => row.source_id)
      return chargerVersetsEditoriaux(supabase, { sourceIds, translationId: trad, livre, chapitre })
    }
    const { data } = await supabase
      // Vue de compatibilité canonique. Elle reste le chemin exclusif des éditions
      // historiques et n'est jamais utilisée pour simuler un mode source.
      .from('versets_lecture')
      .select('*')
      .eq('livre', livre)
      .eq('chapitre', chapitre)
      .order('verset')
    return data || []
  }

  // Les balises de titre se calculent d'un seul passage sur l'ordre matériel :
  // elles dépendent des titres déjà ouverts, et le mode bilingue éclate ensuite
  // les blocs en deux colonnes.
  // ⚠️ La balise se calcule sur les DEUX axes : le chapitre paraît dans le fil
  // sans commander l'axe analytique, et un titre qui nomme son parent le reprend
  // au lieu de le déduire du jeton. Voir `bibleHierarchieSemantique.ts`.
  const baliserPayload = (blocs: readonly BibleEditionBodyBlockRow[]) =>
    baliserBlocs(blocs.map((b) => ({
      id: b.id,
      semanticStyle: b.semantic_style_code,
      intitule: b.heading,
      blockKey: b.block_key,
      semanticParentKey: b.semantic_parent_key,
      axeHierarchie: presentationDeBloc(b.presentation)?.hierarchyAxis ?? null,
    })))

  // Un bloc de note se compose partout de la même façon : la couche de RENDU
  // quand elle existe — c'est elle qui porte `*italique*` et `++capitales++` —,
  // la transcription sinon, et le style que la donnée déclare.
  const blocDeNote = (bloc: BibleEditionNoteBlockRow): BibleEditionDisplayTextBlock => ({
    id: bloc.block_id,
    kind: bloc.kind,
    form: bloc.form,
    text: bloc.rendering ?? bloc.text,
    language: bloc.language,
    presentationStyle: styleCompositionDeNote(bloc.presentation),
  })

  const editionMember = editionCatalog.find((row) => row.trad_id === trad)
  // Lecture « Sans les commentaires » : on n'écarte pas l'appareil à l'affichage, on
  // ne le CHARGE PAS. C'est un axe INDÉPENDANT de ce qu'on lit — il vaut pour une
  // colonne comme pour les deux en regard.
  const texteSeul = params.texte === 'seul'
  // L'édition porte un appareil éditorial : le choix se pose, chapitre commenté ou non.
  // On le tient de la FAMILLE, non du chapitre affiché — sans quoi le menu
  // disparaîtrait sur un chapitre sans commentaire, laissant le lecteur enfermé dans
  // le texte nu sans moyen d'en sortir.
  const paratexteDisponible = !!editionMember
  // Même raison que ci-dessus : en regard, cet appareil n'est jamais rendu (c'est
  // `lectureBilingue` qui porte le sien), et le charger d'office coûtait cinq
  // allers-retours pour rien.
  const chargerAppareilDuChapitre = async (
    membre: NonNullable<typeof editionMember>,
    canonIds: string[],
  ): Promise<BibleEditionChapterDisplay> => {
    const payload = await loadBibleEditionChapter(supabase, {
      familyId: membre.family_id,
      bookCode: livre,
      canonIds,
      includeBookFrontMatter: chapitre === 1,
    })
    const appartientAuMembre = (row: { applies_to: 'family' | 'member'; applies_to_member_id: string | null }) => (
      row.applies_to === 'family' || row.applies_to_member_id === membre.member_id
    )
    const balises = baliserPayload(payload.bodyBlocks)
    return {
      familyId: membre.family_id,
      memberId: membre.member_id,
      bodyBlocks: payload.bodyBlocks.filter(appartientAuMembre).map((block) => ({
        id: block.id,
        blockKey: block.block_key,
        semanticStyleCode: block.semantic_style_code,
        presentation: presentationDeBloc(block.presentation),
        semanticParentKey: block.semantic_parent_key,
        niveauHtml: balises.get(block.id),
        noticeSubtype: sousTypeNoticeValide(block.block_kind, block.notice_subtype),
        heading: block.heading,
        placement: block.placement,
        canonIdStart: block.canon_id_start,
        canonIdEnd: block.canon_id_end,
        materialOrder: block.material_order,
        textBlocks: blocsTexteEditoriaux(block.id, block.text_content, block.text_features),
        internalNotes: block.internal_notes.map((note) => ({
          id: note.id,
          displayNumber: note.display_number,
          printedMarker: note.printed_marker,
          anchorStartOffsetUnicode: note.anchor_start_offset_unicode,
          anchorEndOffsetUnicode: note.anchor_end_offset_unicode,
          anchorText: note.anchor_text,
          anchorTarget: note.anchor_text && note.anchor_start_offset_unicode === null
            ? 'heading' as const
            : 'body' as const,
          blocks: note.blocks.map(blocDeNote),
        })),
      })),
      notes: payload.notes.filter(appartientAuMembre).map((note) => ({
        id: note.id,
        displayNumber: note.display_number,
        canonId: note.canon_id,
        materialOrder: note.material_order,
        blocks: note.blocks.map(blocDeNote),
      })),
      assets: payload.assets.filter(appartientAuMembre).map((asset) => ({
        id: asset.id,
        assetKey: asset.asset_key,
        assetKind: asset.asset_kind,
        url: asset.public_uri,
        width: asset.width_px,
        height: asset.height_px,
        altText: asset.alt_text,
        caption: asset.editorial_caption ?? asset.printed_caption,
        printedPage: asset.printed_page,
        placement: asset.placement,
        canonIdStart: asset.canon_id_start,
        canonIdEnd: asset.canon_id_end,
        bodyBlockId: asset.body_block_id,
        noteId: asset.note_id,
        materialOrder: asset.material_order,
      })),
    }
  }

  // Lecture « Latin-français » : demandée par l'URL, et servie seulement si la
  // famille éditoriale porte réellement deux membres pour ce chapitre. À défaut,
  // la page rend la lecture ordinaire plutôt qu'un écran d'erreur.
  const familyRows = editionMember
    ? editionCatalog.filter((row) => row.family_id === editionMember.family_id)
    : []
  // Les membres de la famille, dédoublonnés et dans l'ordre du catalogue : ils
  // composent le menu « Lecture » du volet de gauche (Français · Latin-français ·
  // Latin). Deux membres ou plus ouvrent la lecture en regard ; une famille à un
  // seul texte se lit comme une traduction ordinaire.
  const membresFamille = [...new Map(familyRows.map((row) => [row.member_id, {
    tradId: row.trad_id,
    langue: row.language_code,
    role: row.member_role,
  }])).values()]
  const bilingueDisponible = membresFamille.length >= 2

  let lectureBilingue: ComponentProps<typeof BibleLayout>['lectureBilingue'] = null
  if (editionMember && bilingueDisponible && params.bilingue === '1') {
    const chargee = await chargerLectureBilingue(supabase, { familyRows, livre, chapitre })
    if (chargee && chargee.colonnes.some((colonne) => colonne.cellules.length > 0)) {
      // Même règle qu'en une colonne : sans les commentaires, l'appareil n'est pas
      // chargé du tout. Les trois listes vides suffisent, `BibleBilingue` ne rendant
      // alors ni bloc, ni note, ni illustration.
      const payload: BibleEditionChapterPayload = texteSeul
        ? { bodyBlocks: [], notes: [], assets: [] }
        : await loadBibleEditionChapter(supabase, {
          familyId: editionMember.family_id,
          bookCode: livre,
          canonIds: chargee.axeCanonique,
          includeBookFrontMatter: chapitre === 1,
        })
      const balisesBilingue = baliserPayload(payload.bodyBlocks)
      lectureBilingue = {
        membres: chargee.colonnes.map((colonne) => colonne.membre),
        colonnes: chargee.colonnes,
        axeCanonique: chargee.axeCanonique,
        blocs: payload.bodyBlocks.map((block) => ({
          id: block.id,
          blockKey: block.block_key,
          semanticStyleCode: block.semantic_style_code,
          presentation: presentationDeBloc(block.presentation),
          semanticParentKey: block.semantic_parent_key,
          niveauHtml: balisesBilingue.get(block.id),
          noticeSubtype: sousTypeNoticeValide(block.block_kind, block.notice_subtype),
          heading: block.heading,
          placement: block.placement,
          canonIdStart: block.canon_id_start,
          canonIdEnd: block.canon_id_end,
          materialOrder: block.material_order,
          appliesTo: block.applies_to,
          appliesToMemberId: block.applies_to_member_id,
          textBlocks: blocsTexteEditoriaux(block.id, block.text_content, block.text_features),
          internalNotes: block.internal_notes.map((note) => ({
            id: note.id,
            displayNumber: note.display_number,
            printedMarker: note.printed_marker,
            anchorStartOffsetUnicode: note.anchor_start_offset_unicode,
            anchorEndOffsetUnicode: note.anchor_end_offset_unicode,
            anchorText: note.anchor_text,
            anchorTarget: note.anchor_text && note.anchor_start_offset_unicode === null
              ? 'heading' as const
              : 'body' as const,
            blocks: note.blocks.map(blocDeNote),
          })),
        })),
        notes: payload.notes.map((note) => ({
          id: note.id,
          displayNumber: note.display_number,
          canonId: note.canon_id,
          materialOrder: note.material_order,
          appliesTo: note.applies_to,
          appliesToMemberId: note.applies_to_member_id,
          blocks: note.blocks.map(blocDeNote),
        })),
        illustrations: payload.assets.map((asset) => ({
          id: asset.id,
          assetKey: asset.asset_key,
          assetKind: asset.asset_kind,
          url: asset.public_uri,
          width: asset.width_px,
          height: asset.height_px,
          altText: asset.alt_text,
          caption: asset.editorial_caption ?? asset.printed_caption,
          printedPage: asset.printed_page,
          placement: asset.placement,
          canonIdStart: asset.canon_id_start,
          canonIdEnd: asset.canon_id_end,
          bodyBlockId: asset.body_block_id,
          noteId: asset.note_id,
          materialOrder: asset.material_order,
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
  const versets = lectureBilingue ? [] : await chargerVersetsDuChapitre()
  const editionChapter: BibleEditionChapterDisplay | null =
    (lectureBilingue || !editionMember || texteSeul)
      ? null
      : await chargerAppareilDuChapitre(editionMember, versets.map((verset) => verset.id_verset))

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
    <>
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
        traductions={translations}
        livreActif={livre}
        chapitreActif={chapitre}
        nomLivre={NOMS_LIVRES[livre] || livre}
        tradInitiale={trad}
        readingCapabilities={catalog.capabilities}
        couche={bible899 ? couche : undefined}
        couchesDisponibles={couchesBible}
        editionChapter={editionChapter}
        lectureBilingue={lectureBilingue}
        membresFamille={membresFamille}
        paratexteDisponible={paratexteDisponible}
        texteSeul={texteSeul}
      />
    </>
  )
}
