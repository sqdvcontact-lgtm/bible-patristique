import { createClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import BibleLayout from './components/BibleLayout'
import { LIVRES } from '@/app/lib/bible'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const NOMS_LIVRES = Object.fromEntries(LIVRES.map(l => [l.code, l.nom]))

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

  const [{ data: versets }, { data: traductions }] = await Promise.all([
    supabase.from('versets').select('*').eq('livre', livre).eq('chapitre', chapitre).order('verset'),
    supabase.from('traductions').select('trad_id, nom').order('ordre', { ascending: true }),
  ])

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
