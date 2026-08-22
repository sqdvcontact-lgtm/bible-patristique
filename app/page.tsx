import { redirect } from 'next/navigation'
import { Suspense, type ComponentProps } from 'react'
import BibleLayout from './components/BibleLayout'
import BibleSourceReader from './components/BibleSourceReader'
import { LIVRES } from '@/app/lib/bible'
import { loadBibleReadingCatalog, loadSourceReading } from '@/app/lib/bibleMultimodeServer'
import { estVerseEditorial } from '@/app/lib/bibleMultimode'
import { selectableReadingModes, type BibleReadingMode } from '@/app/lib/bibleReadingModes'
import { adapterVersets899, chargerVersets899, couchesDisponibles899, normaliserCouche899, TRAD_ID_BIBLE899 } from '@/app/lib/bible899'
import { chargerVersetsEditoriaux } from '@/app/lib/bibleEditorialServer'
import { chargerLectureBilingue, loadBibleEditionCatalog, loadBibleEditionChapter } from '@/app/lib/bibleEditionServer'
import { sousTypeNoticeValide, type BibleEditionChapterDisplay } from '@/app/lib/bibleEdition'
import { baliserBlocs } from '@/app/lib/bibleHierarchieSemantique'
import { creerSupabaseServeur } from '@/app/lib/supabaseServeur'

// La base est désormais fermée au rôle anonyme : une page serveur doit
// interroger avec la session du visiteur (client lisant les cookies), sinon elle
// s'exécute en `anon` et ne reçoit plus rien. Sans cela, la page Bible se rendait
// vide — texte et traductions introuvables.

const NOMS_LIVRES = Object.fromEntries(LIVRES.map(l => [l.code, l.nom]))

// Titre unique par chapitre lu (« Genèse 1 · Corpus Scriptura ») plutôt que le titre
// générique du site. Sans paramètre, la page redirige vers l'accueil : titre neutre.
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ livre?: string; chapitre?: string }>
}) {
  const p = await searchParams
  if (!p.livre && !p.chapitre) return {}
  const nom = NOMS_LIVRES[p.livre || 'GEN'] || 'Bible'
  const ch = parseInt(p.chapitre || '1')
  // Le gabarit « %s · Corpus Scriptura » du layout racine ne s'applique pas à la page
  // racine (même segment) : on compose donc le suffixe ici, pour rester cohérent.
  return { title: { absolute: `${nom} ${Number.isFinite(ch) ? ch : 1} · Corpus Scriptura` } }
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ livre?: string; chapitre?: string; trad?: string; mode?: string; division?: string; couche?: string; bilingue?: string; texte?: string }>
}) {
  const params = await searchParams
  if (!params.livre && !params.chapitre && !params.trad) redirect('/accueil')

  const livre = params.livre || 'GEN'
  const chapitre = parseInt(params.chapitre || '1')
  const supabase = await creerSupabaseServeur()
  const [catalog, editionCatalog, { data: rawTranslations }] = await Promise.all([
    loadBibleReadingCatalog(supabase),
    loadBibleEditionCatalog(supabase),
    // `dates` = vie et mort de l'auteur ; `source_edition` = référence complète de
    // l'édition présentée (ville, éditeur, date), toutes deux pour l'encart Traduction.
    supabase.from('traductions').select('trad_id, nom, auteur, dates, source_edition, date_publication, confession, langue').order('ordre', { ascending: true }),
  ])
  const toutesTraductions = (rawTranslations || [])
    .map(t => ({ code: t.trad_id, label: t.nom, auteur: t.auteur, auteurDates: t.dates ?? null, editionRef: t.source_edition ?? null, datePublication: t.date_publication, confession: t.confession, langue: t.langue }))
  const estLisible = (code: string) => selectableReadingModes(
    catalog.capabilities[code] ?? { translationId: code, modes: [] },
  ).length > 0
  const requestedTranslation = params.trad
  const trad = requestedTranslation && catalog.capabilities[requestedTranslation]
    ? requestedTranslation
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
  let versets: ComponentProps<typeof BibleLayout>['versets']
  if (bible899) {
    const lignes = await chargerVersets899(supabase, { livre, chapitre }, [couche])
    versets = adapterVersets899(lignes, trad, livre, chapitre, couche)
  } else if (editorial) {
    const sourceIds = catalog.rows
      .filter((row) => row.trad_id === trad && row.mode_code === 'verse' && row.is_available)
      .map((row) => row.source_id)
    versets = await chargerVersetsEditoriaux(supabase, {
      sourceIds,
      translationId: trad,
      livre,
      chapitre,
    })
  } else {
    const { data } = await supabase
      // Vue de compatibilité canonique. Elle reste le chemin exclusif des éditions
      // historiques et n'est jamais utilisée pour simuler un mode source.
      .from('versets_lecture')
      .select('*')
      .eq('livre', livre)
      .eq('chapitre', chapitre)
      .order('verset')
    versets = data || []
  }

  // Les balises de titre se calculent d'un seul passage sur l'ordre matériel :
  // elles dépendent des titres déjà ouverts, et le mode bilingue éclate ensuite
  // les blocs en deux colonnes.
  const baliserPayload = (blocs: readonly { id: string; semantic_style_code: string; heading: string | null }[]) =>
    baliserBlocs(blocs.map((b) => ({ id: b.id, semanticStyle: b.semantic_style_code, intitule: b.heading })))

  const editionMember = editionCatalog.find((row) => row.trad_id === trad)
  // Lecture « Texte biblique seul » : on n'écarte pas l'appareil à l'affichage, on ne
  // le CHARGE PAS. Le mode ne s'applique pas en regard, où les deux colonnes tiennent
  // déjà toute la place.
  const texteSeul = params.texte === 'seul' && params.bilingue !== '1'
  // L'édition porte un appareil éditorial : le choix se pose, chapitre commenté ou non.
  // On le tient de la FAMILLE, non du chapitre affiché — sans quoi le menu
  // disparaîtrait sur un chapitre sans commentaire, laissant le lecteur enfermé dans
  // le texte nu sans moyen d'en sortir.
  const paratexteDisponible = !!editionMember
  let editionChapter: BibleEditionChapterDisplay | null = null
  if (editionMember && !texteSeul) {
    const payload = await loadBibleEditionChapter(supabase, {
      familyId: editionMember.family_id,
      bookCode: livre,
      canonIds: versets.map((verset) => verset.id_verset),
      includeBookFrontMatter: chapitre === 1,
    })
    const appartientAuMembre = (row: { applies_to: 'family' | 'member'; applies_to_member_id: string | null }) => (
      row.applies_to === 'family' || row.applies_to_member_id === editionMember.member_id
    )
    const balises = baliserPayload(payload.bodyBlocks)
    editionChapter = {
      familyId: editionMember.family_id,
      memberId: editionMember.member_id,
      bodyBlocks: payload.bodyBlocks.filter(appartientAuMembre).map((block) => ({
        id: block.id,
        semanticStyleCode: block.semantic_style_code,
        niveauHtml: balises.get(block.id),
        noticeSubtype: sousTypeNoticeValide(block.block_kind, block.notice_subtype),
        heading: block.heading,
        placement: block.placement,
        canonIdStart: block.canon_id_start,
        canonIdEnd: block.canon_id_end,
        materialOrder: block.material_order,
        textBlocks: [{
          id: `${block.id}:text`,
          kind: 'commentary',
          form: 'prose',
          text: block.text_content,
        }],
        internalNotes: block.internal_notes.map((note) => ({
          id: note.id,
          displayNumber: note.display_number,
          printedMarker: note.printed_marker,
          blocks: note.blocks.map((noteBlock) => ({
            id: noteBlock.block_id,
            kind: noteBlock.kind,
            form: noteBlock.form,
            text: noteBlock.text,
            language: noteBlock.language,
          })),
        })),
      })),
      notes: payload.notes.filter(appartientAuMembre).map((note) => ({
        id: note.id,
        displayNumber: note.display_number,
        canonId: note.canon_id,
        materialOrder: note.material_order,
        blocks: note.blocks.map((block) => ({
          id: block.block_id,
          kind: block.kind,
          form: block.form,
          text: block.text,
          language: block.language,
        })),
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
  // Le mode n'est offert que si l'édition porte réellement un second membre :
  // une famille à un seul texte se lit comme une traduction ordinaire.
  const bilingueDisponible = new Set(familyRows.map((row) => row.member_id)).size >= 2

  let lectureBilingue: ComponentProps<typeof BibleLayout>['lectureBilingue'] = null
  if (editionMember && bilingueDisponible && params.bilingue === '1') {
    const chargee = await chargerLectureBilingue(supabase, { familyRows, livre, chapitre })
    if (chargee && chargee.colonnes.some((colonne) => colonne.cellules.length > 0)) {
      const payload = await loadBibleEditionChapter(supabase, {
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
          semanticStyleCode: block.semantic_style_code,
          niveauHtml: balisesBilingue.get(block.id),
          noticeSubtype: sousTypeNoticeValide(block.block_kind, block.notice_subtype),
          heading: block.heading,
          placement: block.placement,
          canonIdStart: block.canon_id_start,
          canonIdEnd: block.canon_id_end,
          materialOrder: block.material_order,
          appliesTo: block.applies_to,
          appliesToMemberId: block.applies_to_member_id,
          textBlocks: [{
            id: `${block.id}:text`,
            kind: 'commentary' as const,
            form: 'prose' as const,
            text: block.text_content,
          }],
          internalNotes: block.internal_notes.map((note) => ({
            id: note.id,
            displayNumber: note.display_number,
            printedMarker: note.printed_marker,
            blocks: note.blocks.map((noteBlock) => ({
              id: noteBlock.block_id,
              kind: noteBlock.kind,
              form: noteBlock.form,
              text: noteBlock.text,
              language: noteBlock.language,
            })),
          })),
        })),
        notes: payload.notes.map((note) => ({
          id: note.id,
          displayNumber: note.display_number,
          canonId: note.canon_id,
          materialOrder: note.material_order,
          appliesTo: note.applies_to,
          appliesToMemberId: note.applies_to_member_id,
          blocks: note.blocks.map((block) => ({
            id: block.block_id,
            kind: block.kind,
            form: block.form,
            text: block.text,
            language: block.language,
          })),
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

  return (
    <Suspense fallback={null}>
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
        tradExplicite={!!params.trad}
        editionChapter={editionChapter}
        lectureBilingue={lectureBilingue}
        bilingueDisponible={bilingueDisponible}
        paratexteDisponible={paratexteDisponible}
        texteSeul={texteSeul}
      />
    </Suspense>
  )
}
