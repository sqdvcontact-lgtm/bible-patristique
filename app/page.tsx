import { createClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import BibleLayout from './components/BibleLayout'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const LIVRES = [
  { code: 'GEN', nom: 'Genèse', testament: 'AT' },
  { code: 'EXO', nom: 'Exode', testament: 'AT' },
  { code: 'LEV', nom: 'Lévitique', testament: 'AT' },
  { code: 'NUM', nom: 'Nombres', testament: 'AT' },
  { code: 'DEU', nom: 'Deutéronome', testament: 'AT' },
  { code: 'JOS', nom: 'Josué', testament: 'AT' },
  { code: 'JDG', nom: 'Juges', testament: 'AT' },
  { code: 'RUT', nom: 'Ruth', testament: 'AT' },
  { code: '1SA', nom: '1 Samuel', testament: 'AT' },
  { code: '2SA', nom: '2 Samuel', testament: 'AT' },
  { code: '1KI', nom: '1 Rois', testament: 'AT' },
  { code: '2KI', nom: '2 Rois', testament: 'AT' },
  { code: '1CH', nom: '1 Chroniques', testament: 'AT' },
  { code: '2CH', nom: '2 Chroniques', testament: 'AT' },
  { code: 'EZR', nom: 'Esdras', testament: 'AT' },
  { code: 'NEH', nom: 'Néhémie', testament: 'AT' },
  { code: 'EST', nom: 'Esther', testament: 'AT' },
  { code: 'JOB', nom: 'Job', testament: 'AT' },
  { code: 'PSA', nom: 'Psaumes', testament: 'AT' },
  { code: 'PRO', nom: 'Proverbes', testament: 'AT' },
  { code: 'ECC', nom: 'Ecclésiaste', testament: 'AT' },
  { code: 'SNG', nom: 'Cantique', testament: 'AT' },
  { code: 'ISA', nom: 'Isaïe', testament: 'AT' },
  { code: 'JER', nom: 'Jérémie', testament: 'AT' },
  { code: 'LAM', nom: 'Lamentations', testament: 'AT' },
  { code: 'EZK', nom: 'Ézéchiel', testament: 'AT' },
  { code: 'DAN', nom: 'Daniel', testament: 'AT' },
  { code: 'HOS', nom: 'Osée', testament: 'AT' },
  { code: 'JOL', nom: 'Joël', testament: 'AT' },
  { code: 'AMO', nom: 'Amos', testament: 'AT' },
  { code: 'OBA', nom: 'Abdias', testament: 'AT' },
  { code: 'JON', nom: 'Jonas', testament: 'AT' },
  { code: 'MIC', nom: 'Michée', testament: 'AT' },
  { code: 'NAM', nom: 'Nahum', testament: 'AT' },
  { code: 'HAB', nom: 'Habacuc', testament: 'AT' },
  { code: 'ZEP', nom: 'Sophonie', testament: 'AT' },
  { code: 'HAG', nom: 'Aggée', testament: 'AT' },
  { code: 'ZEC', nom: 'Zacharie', testament: 'AT' },
  { code: 'MAL', nom: 'Malachie', testament: 'AT' },
  { code: 'MAT', nom: 'Matthieu', testament: 'NT' },
  { code: 'MRK', nom: 'Marc', testament: 'NT' },
  { code: 'LUK', nom: 'Luc', testament: 'NT' },
  { code: 'JHN', nom: 'Jean', testament: 'NT' },
  { code: 'ACT', nom: 'Actes', testament: 'NT' },
  { code: 'ROM', nom: 'Romains', testament: 'NT' },
  { code: '1CO', nom: '1 Corinthiens', testament: 'NT' },
  { code: '2CO', nom: '2 Corinthiens', testament: 'NT' },
  { code: 'GAL', nom: 'Galates', testament: 'NT' },
  { code: 'EPH', nom: 'Éphésiens', testament: 'NT' },
  { code: 'PHP', nom: 'Philippiens', testament: 'NT' },
  { code: 'COL', nom: 'Colossiens', testament: 'NT' },
  { code: '1TH', nom: '1 Thessaloniciens', testament: 'NT' },
  { code: '2TH', nom: '2 Thessaloniciens', testament: 'NT' },
  { code: '1TI', nom: '1 Timothée', testament: 'NT' },
  { code: '2TI', nom: '2 Timothée', testament: 'NT' },
  { code: 'TIT', nom: 'Tite', testament: 'NT' },
  { code: 'PHM', nom: 'Philémon', testament: 'NT' },
  { code: 'HEB', nom: 'Hébreux', testament: 'NT' },
  { code: 'JAS', nom: 'Jacques', testament: 'NT' },
  { code: '1PE', nom: '1 Pierre', testament: 'NT' },
  { code: '2PE', nom: '2 Pierre', testament: 'NT' },
  { code: '1JN', nom: '1 Jean', testament: 'NT' },
  { code: '2JN', nom: '2 Jean', testament: 'NT' },
  { code: '3JN', nom: '3 Jean', testament: 'NT' },
  { code: 'JUD', nom: 'Jude', testament: 'NT' },
  { code: 'REV', nom: 'Apocalypse', testament: 'NT' },
]

const NOMS_LIVRES: Record<string, string> = {
  GEN: 'Genèse', EXO: 'Exode', LEV: 'Lévitique', NUM: 'Nombres',
  DEU: 'Deutéronome', JOS: 'Josué', JDG: 'Juges', RUT: 'Ruth',
  '1SA': '1 Samuel', '2SA': '2 Samuel', '1KI': '1 Rois', '2KI': '2 Rois',
  '1CH': '1 Chroniques', '2CH': '2 Chroniques', EZR: 'Esdras', NEH: 'Néhémie',
  EST: 'Esther', JOB: 'Job', PSA: 'Psaumes', PRO: 'Proverbes',
  ECC: 'Ecclésiaste', SNG: 'Cantique', ISA: 'Isaïe', JER: 'Jérémie',
  LAM: 'Lamentations', EZK: 'Ézéchiel', DAN: 'Daniel', HOS: 'Osée',
  JOL: 'Joël', AMO: 'Amos', OBA: 'Abdias', JON: 'Jonas', MIC: 'Michée',
  NAM: 'Nahum', HAB: 'Habacuc', ZEP: 'Sophonie', HAG: 'Aggée',
  ZEC: 'Zacharie', MAL: 'Malachie', MAT: 'Matthieu', MRK: 'Marc',
  LUK: 'Luc', JHN: 'Jean', ACT: 'Actes', ROM: 'Romains',
  '1CO': '1 Corinthiens', '2CO': '2 Corinthiens', GAL: 'Galates',
  EPH: 'Éphésiens', PHP: 'Philippiens', COL: 'Colossiens',
  '1TH': '1 Thessaloniciens', '2TH': '2 Thessaloniciens',
  '1TI': '1 Timothée', '2TI': '2 Timothée', TIT: 'Tite', PHM: 'Philémon',
  HEB: 'Hébreux', JAS: 'Jacques', '1PE': '1 Pierre', '2PE': '2 Pierre',
  '1JN': '1 Jean', '2JN': '2 Jean', '3JN': '3 Jean', JUD: 'Jude', REV: 'Apocalypse',
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ livre?: string; chapitre?: string; trad?: string }>
}) {
  const params = await searchParams
  if (!params.livre && !params.chapitre && !params.trad) redirect('/accueil')

  const livre = params.livre || 'GEN'
  const chapitre = parseInt(params.chapitre || '1')
  const trad = params.trad || 'TR0001'

  const { data: versets } = await supabase
    .from('versets')
    .select('*')
    .eq('livre', livre)
    .eq('chapitre', chapitre)
    .order('verset')

  const { data: traductions } = await supabase
    .from('traductions')
    .select('trad_id, nom')
    .order('ordre', { ascending: true })

  return (
    <Suspense fallback={null}>
      <BibleLayout
        livres={LIVRES}
        versets={versets || []}
        traductions={(traductions || []).map(t => ({ code: t.trad_id, label: t.nom }))}
        livreActif={livre}
        chapitreActif={chapitre}
        nomLivre={NOMS_LIVRES[livre] || livre}
        tradInitiale={trad}
      />
    </Suspense>
  )
}
