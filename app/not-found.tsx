// L'adresse ne désigne rien. C'est le cas d'un lien périmé, d'une faute de frappe,
// ou d'un livre biblique que la Bible ne connaît pas (`/?livre=INCONNU`), que la page
// de lecture recopiait jusqu'ici en guise de titre de livre.
//
// Le site n'avait pas cette page : `notFound()` servait l'écran par défaut de Next,
// en anglais et sans navigation.

import Link from 'next/link'
import { ENCRE_TITRE_CARTE, GRAISSE_TITRE, TITRE_CARTE } from '@/app/lib/hierarchieTitres'

export const metadata = { title: 'Page introuvable' }

export default function Introuvable() {
  return (
    <main style={{ minHeight: 'calc(100vh - 3.5rem)', display: 'grid', placeItems: 'start center', padding: '14vh 1.5rem 4rem', background: 'var(--cs-fond)' }}>
      <div style={{ maxWidth: '30rem', textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: TITRE_CARTE, fontWeight: GRAISSE_TITRE, color: ENCRE_TITRE_CARTE, margin: 0 }}>
          Cette adresse ne mène à rien
        </h1>
        <p style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '0.9375rem', fontStyle: 'italic', color: 'var(--cs-texte-second)', lineHeight: 1.65, margin: '0.9rem 0 1.6rem' }}>
          Le lien est peut-être périmé, ou le nom de livre mal orthographié. La
          bibliothèque et la Bible restent à un clic.
        </p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link
            href="/?livre=GEN&chapitre=1"
            style={{ padding: '7px 16px', borderRadius: '999px', border: '1px solid rgba(var(--cs-vert-rgb),0.35)', background: 'rgba(var(--cs-vert-rgb),0.06)', color: 'var(--cs-vert)', textDecoration: 'none', fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '0.8125rem' }}>
            Lire la Bible
          </Link>
          <Link
            href="/accueil"
            style={{ padding: '7px 16px', borderRadius: '999px', border: '1px solid var(--cs-bord)', color: 'var(--cs-texte-second)', textDecoration: 'none', fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '0.8125rem' }}>
            Retour à l’accueil
          </Link>
        </div>
      </div>
    </main>
  )
}
