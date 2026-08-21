import Link from 'next/link'
import { estAdmin } from '@/app/lib/verifAdmin'
import { creerSupabaseServeur } from '@/app/lib/supabaseServeur'

export const metadata = { title: 'TOL / AELF — privé' }

type CatalogueRow = {
  book_code: string
  aelf_slug: string
  nom_fr: string | null
  chapter_label: string
  chapter_order: number
}

type VerseRow = {
  verse_label: string
  text_content: string
  source_markup: string | null
  material_order: number
  source_url: string | null
}

type Props = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function valeur(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v
}

export default async function AelfAdminPage({ searchParams }: Props) {
  if (!(await estAdmin())) {
    return (
      <main style={{ maxWidth: 760, margin: '5rem auto', padding: '0 1.5rem' }}>
        <h1>Accès réservé</h1>
        <p>La Traduction officielle liturgique n’est accessible que depuis le compte administrateur.</p>
      </main>
    )
  }

  const supabase = await creerSupabaseServeur()
  const { data: catalogueData, error: catalogueError } = await supabase.rpc('admin_tol_aelf_catalogue')
  const catalogue = (catalogueData ?? []) as CatalogueRow[]

  if (catalogueError) {
    return <main style={{ maxWidth: 760, margin: '5rem auto', padding: '0 1.5rem' }}>Erreur de chargement du catalogue AELF.</main>
  }

  const params = (await searchParams) ?? {}
  const bookParam = valeur(params.livre)
  const chapParam = valeur(params.chapitre)
  const premier = catalogue[0]
  const livre = catalogue.some(r => r.book_code === bookParam) ? bookParam! : premier?.book_code
  const chapitres = catalogue.filter(r => r.book_code === livre)
  const chapitre = chapitres.some(r => r.chapter_label === chapParam) ? chapParam! : chapitres[0]?.chapter_label
  const metaLivre = chapitres[0]

  let versets: VerseRow[] = []
  if (livre && chapitre != null) {
    const { data } = await supabase.rpc('admin_tol_aelf_chapter', {
      p_book_code: livre,
      p_chapter_label: chapitre,
    })
    versets = (data ?? []) as VerseRow[]
  }

  const livres = Array.from(
    catalogue.reduce((m, r) => {
      if (!m.has(r.book_code)) m.set(r.book_code, r)
      return m
    }, new Map<string, CatalogueRow>()).values()
  )

  return (
    <main style={{ maxWidth: 980, margin: '2.5rem auto 5rem', padding: '0 1.5rem', color: 'var(--cs-texte)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'baseline', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ fontSize: '.75rem', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--cs-texte-doux)' }}>Privé — administrateur</div>
          <h1 style={{ margin: '.25rem 0' }}>Traduction officielle liturgique</h1>
          <div style={{ color: 'var(--cs-texte-second)', fontSize: '.9rem' }}>AELF — capture directe du 21 août 2026</div>
        </div>
        <Link href="/admin" style={{ color: 'var(--cs-vert)' }}>Administration</Link>
      </div>

      <form method="get" style={{ display: 'flex', gap: '.75rem', flexWrap: 'wrap', marginBottom: '2rem', padding: '1rem', border: '1px solid var(--cs-bord)', borderRadius: 8, background: 'var(--cs-surface)' }}>
        <label style={{ display: 'grid', gap: '.3rem' }}>
          <span style={{ fontSize: '.75rem', color: 'var(--cs-texte-doux)' }}>Livre</span>
          <select name="livre" defaultValue={livre} style={{ minWidth: 260, padding: '.5rem' }}>
            {livres.map(l => <option key={l.book_code} value={l.book_code}>{l.nom_fr ?? l.book_code}</option>)}
          </select>
        </label>
        <label style={{ display: 'grid', gap: '.3rem' }}>
          <span style={{ fontSize: '.75rem', color: 'var(--cs-texte-doux)' }}>Chapitre</span>
          <select name="chapitre" defaultValue={chapitre} style={{ minWidth: 120, padding: '.5rem' }}>
            {chapitres.map(c => <option key={c.chapter_label} value={c.chapter_label}>{c.chapter_label}</option>)}
          </select>
        </label>
        <button type="submit" style={{ alignSelf: 'end', padding: '.55rem 1rem', border: 0, borderRadius: 6, background: 'var(--cs-vert)', color: 'white', cursor: 'pointer' }}>Afficher</button>
      </form>

      <article style={{ maxWidth: 780, margin: '0 auto', fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '1.08rem', lineHeight: 1.7 }}>
        <h2 style={{ marginBottom: '1.5rem' }}>{metaLivre?.nom_fr ?? livre} — chapitre {chapitre}</h2>
        {versets.map(v => (
          <p key={`${v.material_order}-${v.verse_label}`} style={{ margin: '0 0 .8rem' }}>
            <sup style={{ fontSize: '.68em', marginRight: '.45rem', color: 'var(--cs-vert-fonce)', fontWeight: 700 }}>{v.verse_label}</sup>
            {v.text_content}
          </p>
        ))}
      </article>
    </main>
  )
}
