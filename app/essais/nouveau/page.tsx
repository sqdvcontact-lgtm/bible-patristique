import { redirect } from 'next/navigation'
import { creerSupabaseServeur } from '@/app/lib/supabaseServeur'
import NouvelEssaiClient from './NouvelEssaiClient'

export default async function NouvelEssaiPage() {
  const supabase = await creerSupabaseServeur()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) redirect('/compte')

  return <NouvelEssaiClient />
}
