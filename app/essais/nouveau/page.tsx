import { redirect } from 'next/navigation'
import { creerSupabaseServeur } from '@/app/lib/supabaseServeur'
import NouvelEssaiClient from './NouvelEssaiClient'

export default async function NouvelEssaiPage() {
  const supabase = await creerSupabaseServeur()
  // getUser() valide la session auprès du serveur d'auth ; getSession() se contente
  // de lire le cookie (non fiable pour une décision d'autorisation côté serveur).
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/compte')

  return <NouvelEssaiClient />
}
