import { redirect } from 'next/navigation'

export default async function ConcordanceRedirect({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string>>
}) {
  const params = searchParams ? await searchParams : {}
  const qs = new URLSearchParams(params).toString()
  redirect(qs ? `/recherche?${qs}` : '/recherche')
}
