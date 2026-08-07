import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import BibleLayout from './components/BibleLayout'
import BibleSourceReader from './components/BibleSourceReader'
import { LIVRES } from '@/app/lib/bible'
import { loadBibleReadingCatalog, loadSourceReading } from '@/app/lib/bibleMultimodeServer'
import { selectableReadingModes, type BibleReadingMode } from '@/app/lib/bibleReadingModes'
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
  searchParams: Promise<{ livre?: string; chapitre?: string; trad?: string; mode?: string; division?: string }>
}) {
  const params = await searchParams
  if (!params.livre && !params.chapitre && !params.trad) redirect('/accueil')

  const livre = params.livre || 'GEN'
  const chapitre = parseInt(params.chapitre || '1')
  const supabase = await creerSupabaseServeur()
  const [catalog, { data: rawTranslations }] = await Promise.all([
    loadBibleReadingCatalog(supabase),
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

  const { data: versets } = await supabase
    // Vue de compatibilité canonique. Elle reste le chemin exclusif des éditions
    // historiques et n'est jamais utilisée pour simuler un mode source.
    .from('versets_lecture')
    .select('*')
    .eq('livre', livre)
    .eq('chapitre', chapitre)
    .order('verset')

  return (
    <Suspense fallback={null}>
      <BibleLayout
        livres={LIVRES}
        versets={versets || []}
        traductions={translations}
        livreActif={livre}
        chapitreActif={chapitre}
        nomLivre={NOMS_LIVRES[livre] || livre}
        tradInitiale={trad}
        readingCapabilities={catalog.capabilities}
      />
    </Suspense>
  )
}
