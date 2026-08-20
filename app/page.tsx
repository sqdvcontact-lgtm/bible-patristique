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
import { loadBibleEditionCatalog, loadBibleEditionChapter } from '@/app/lib/bibleEditionServer'
import type { BibleEditionChapterDisplay } from '@/app/lib/bibleEdition'
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
  searchParams: Promise<{ livre?: string; chapitre?: string; trad?: string; mode?: string; division?: string; couche?: string }>
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
  const translations = (rawTranslations || [])
    .map(t => ({ code: t.trad_id, label: t.nom, auteur: t.auteur, auteurDates: t.dates ?? null, editionRef: t.source_edition ?? null, datePublication: t.date_publication, confession: t.confession, langue: t.langue }))
    .filter((translation) => selectableReadingModes(catalog.capabilities[translation.code] ?? { translationId: translation.code, modes: [] }).length > 0)
  const requestedTranslation = params.trad
  const trad = requestedTranslation && catalog.capabilities[requestedTranslation]
    ? requestedTranslation
    : translations[0]?.code
  if (!trad) redirect('/accueil')

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
  // Couches réellement disponibles pour la page Bible, lues sur les DONNÉES. La graphie
  // « diplomatique » n'est pas destinée à la page Bible (charte) : on l'écarte, ne
  // laissant que « Manuscrit » (expanded) et, quand elle existera, « Modernisée ».
  const couchesBible = bible899
    ? (await couchesDisponibles899(supabase)).filter((c) => c !== 'diplomatic')
    : []
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

  const editionMember = editionCatalog.find((row) => row.trad_id === trad)
  let editionChapter: BibleEditionChapterDisplay | null = null
  if (editionMember) {
    const payload = await loadBibleEditionChapter(supabase, {
      familyId: editionMember.family_id,
      bookCode: livre,
      canonIds: versets.map((verset) => verset.id_verset),
      includeBookFrontMatter: chapitre === 1,
    })
    const appartientAuMembre = (row: { applies_to: 'family' | 'member'; applies_to_member_id: string | null }) => (
      row.applies_to === 'family' || row.applies_to_member_id === editionMember.member_id
    )
    editionChapter = {
      familyId: editionMember.family_id,
      memberId: editionMember.member_id,
      bodyBlocks: payload.bodyBlocks.filter(appartientAuMembre).map((block) => ({
        id: block.id,
        semanticStyleCode: block.semantic_style_code,
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
      />
    </Suspense>
  )
}
