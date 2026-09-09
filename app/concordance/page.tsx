import { permanentRedirect } from 'next/navigation'

// ⛔ `permanentRedirect` (308), non `redirect` (307) : la concordance a été
// absorbée par la recherche, et le déplacement est définitif. Le 308 conserve
// en outre la méthode et le corps de la requête, ce que le 301 ne garantit pas.
export default async function ConcordanceRedirect({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string>>
}) {
  const params = searchParams ? await searchParams : {}
  const qs = new URLSearchParams(params).toString()
  permanentRedirect(qs ? `/recherche?${qs}` : '/recherche')
}
