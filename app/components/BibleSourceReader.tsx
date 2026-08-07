'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import {
  composeContinuousSourceText,
  nativeChapterChoices,
  nativeDivisionLabel,
  type NativeDivisionRow,
  type SourceUnitTextRow,
} from '@/app/lib/bibleMultimode'
import {
  selectableReadingModes,
  type BibleReadingMode,
  type TranslationReadingCapabilities,
} from '@/app/lib/bibleReadingModes'
import BibleReadingModeSelector from './BibleReadingModeSelector'

type Translation = { code: string; label: string }

type Props = {
  translationId: string
  translations: Translation[]
  capabilities: Record<string, TranslationReadingCapabilities>
  mode: BibleReadingMode
  divisions: NativeDivisionRow[]
  selectedDivision: NativeDivisionRow
  units: SourceUnitTextRow[]
}

function readerUrl(translationId: string, mode: BibleReadingMode, divisionId?: string) {
  const params = new URLSearchParams({ trad: translationId, mode })
  if (divisionId) params.set('division', divisionId)
  return `/?${params.toString()}`
}

export default function BibleSourceReader({
  translationId,
  translations,
  capabilities,
  mode,
  divisions,
  selectedDivision,
  units,
}: Props) {
  const router = useRouter()
  const modes = selectableReadingModes(capabilities[translationId])
  const chapters = nativeChapterChoices(divisions)
  const divisionIndex = chapters.findIndex((division) => division.id === selectedDivision.id)
  const parentBook = selectedDivision.parent_id
    ? divisions.find((division) => division.id === selectedDivision.parent_id)
    : undefined
  const firstUnit = units[0]

  const changeMode = (nextMode: BibleReadingMode) => {
    localStorage.setItem(`cs_bible_mode:${translationId}`, nextMode)
    router.push(readerUrl(translationId, nextMode, selectedDivision.id))
  }

  const changeTranslation = (nextTranslation: string) => {
    const nextModes = selectableReadingModes(capabilities[nextTranslation])
    const saved = localStorage.getItem(`cs_bible_mode:${nextTranslation}`) as BibleReadingMode | null
    const nextMode = nextModes.some((item) => item.value === saved)
      ? saved!
      : nextModes[0]?.value ?? 'verse'
    router.push(readerUrl(nextTranslation, nextMode))
  }

  return (
    <main style={{ minHeight: 'calc(100vh - 3.5rem)', background: 'var(--cs-fond)', padding: '1.25rem clamp(1rem, 4vw, 3rem) 3rem' }}>
      <header style={{ maxWidth: '58rem', margin: '0 auto 1rem', display: 'grid', gap: '0.875rem' }}>
        <p style={{ margin: 0, color: 'var(--cs-texte-faible)', fontSize: '0.6875rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Lecture du témoin
        </p>
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem 1.25rem' }}>
          <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.6875rem', color: 'var(--cs-texte-second)' }}>
            Édition
            <select value={translationId} onChange={(event) => changeTranslation(event.target.value)}>
              {translations.map((translation) => (
                <option key={translation.code} value={translation.code}>{translation.label}</option>
              ))}
            </select>
          </label>
          <BibleReadingModeSelector value={mode} modes={modes} onChange={changeMode} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            disabled={divisionIndex <= 0}
            onClick={() => router.push(readerUrl(translationId, mode, chapters[divisionIndex - 1]?.id))}
          >
            Chapitre précédent
          </button>
          <label style={{ flex: 1, display: 'grid', gap: '0.25rem', fontSize: '0.6875rem', color: 'var(--cs-texte-second)' }}>
            Structure native
            <select
              value={selectedDivision.id}
              onChange={(event) => router.push(readerUrl(translationId, mode, event.target.value))}
            >
              {chapters.map((division) => (
                <option key={division.id} value={division.id}>{division.label}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={divisionIndex < 0 || divisionIndex >= chapters.length - 1}
            onClick={() => router.push(readerUrl(translationId, mode, chapters[divisionIndex + 1]?.id))}
          >
            Chapitre suivant
          </button>
        </div>
      </header>

      <article style={{ maxWidth: '44rem', margin: '0 auto', padding: '1.5rem clamp(1rem, 4vw, 2.5rem)', background: 'var(--cs-surface)', border: '1px solid var(--cs-bord)', borderRadius: '0.5rem' }}>
        <header style={{ marginBottom: '1rem', borderBottom: '1px solid var(--cs-bord)', paddingBottom: '0.75rem' }}>
          <h1 style={{ margin: 0, fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '1.25rem', fontWeight: 500 }}>
            {nativeDivisionLabel(selectedDivision, parentBook)}
          </h1>
          {firstUnit?.native_folio_raw ? (
            <p style={{ margin: '0.35rem 0 0', color: 'var(--cs-texte-faible)', fontSize: '0.6875rem' }}>
              Début au folio {firstUnit.native_folio_raw}
            </p>
          ) : null}
          {firstUnit?.surface_key ? (
            <Link href={`/manuscrits/bible-899?colonne=${encodeURIComponent(firstUnit.surface_key)}`} style={{ fontSize: '0.6875rem', color: 'var(--cs-vert)' }}>
              Voir le fac-similé et la colonne source
            </Link>
          ) : null}
        </header>

        {mode === 'native' ? (
          <p lang="fro" style={{ margin: 0, whiteSpace: 'pre-wrap', textAlign: 'justify', lineHeight: 1.65 }}>
            {composeContinuousSourceText(units)}
          </p>
        ) : (
          <ol lang="fro" style={{ margin: 0, paddingLeft: '3.25rem' }}>
            {units.map((unit) => (
              <li key={unit.unit_id} value={unit.line_no ?? undefined} style={{ padding: '0.08rem 0 0.08rem 0.5rem', lineHeight: 1.5 }}>
                <span>{unit.text_content}</span>
                {unit.has_unclear ? <span title="Lecture incertaine" style={{ marginLeft: '0.35rem', color: 'var(--cs-texte-faible)' }}>?</span> : null}
              </li>
            ))}
          </ol>
        )}
      </article>
    </main>
  )
}
