// Ce que la page Bible montre quand son TEXTE n'a pas pu se lire (2026-09-22).
//
// ⛔ Une panne de la base ne se déguise pas en absence. La lecture de `versets_lecture`
// ignorait son erreur : un délai dépassé rendait une liste vide, et la page annonçait
// « La traduction X ne comporte pas ce livre », ou un chapitre sans un verset. Le lecteur
// croyait le texte manquant, alors qu'il n'avait simplement pas été lu.
//
// ⚠️ Pourquoi un état de la page, et non `app/error.tsx` : l'écran d'erreur de la
// racine propose « Réessayer » par `reset()`, qui re-rend l'arbre SANS refaire la
// requête du serveur — l'erreur revient telle quelle. Ici, « Réessayer » est un lien
// ordinaire vers la même adresse : le navigateur la redemande, et le serveur relit.
//
// Composant serveur, sans état : il se rend dans la réponse même qui a échoué.

import Link from 'next/link'
import { ENCRE_TITRE_CARTE, GRAISSE_TITRE, TITRE_CARTE } from '@/app/lib/hierarchieTitres'
import { SERIF } from '@/app/lib/polices'

export default function ChapitreIndisponible({
  adresse,
  titre = 'Le chapitre n’a pas pu se charger',
  explication = 'Le texte n’a pas répondu à temps. Il est bien là : réessayez dans un instant.',
}: {
  /** L'adresse de la page, à redemander telle quelle. */
  adresse: string
  titre?: string
  explication?: string
}) {
  return (
    <main style={{ minHeight: 'calc(100dvh - 3.5rem)', display: 'grid', placeItems: 'start center', padding: '14vh 1.5rem 4rem', background: 'var(--cs-fond)' }}>
      <div role="alert" style={{ maxWidth: '30rem', textAlign: 'center' }}>
        <h1 style={{ fontFamily: SERIF, fontSize: TITRE_CARTE, fontWeight: GRAISSE_TITRE, color: ENCRE_TITRE_CARTE, margin: 0 }}>
          {titre}
        </h1>
        <p style={{ fontFamily: SERIF, fontSize: '0.9375rem', fontStyle: 'italic', color: 'var(--cs-texte-second)', lineHeight: 1.65, margin: '0.9rem 0 1.6rem' }}>
          {explication}
        </p>
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {/* ⛔ Un <a> et non un <Link> : c'est un RECHARGEMENT qu'on veut, pour que le
              serveur relise le texte au lieu de rendre une page tenue en cache. */}
          <a href={adresse}
            style={{ padding: '7px 16px', borderRadius: '999px', border: '1px solid rgba(var(--cs-vert-rgb),0.35)', background: 'rgba(var(--cs-vert-rgb),0.06)', color: 'var(--cs-vert)', textDecoration: 'none', fontFamily: SERIF, fontSize: '0.8125rem' }}>
            Réessayer
          </a>
          <Link href="/accueil"
            style={{ padding: '7px 16px', borderRadius: '999px', border: '1px solid var(--cs-bord)', color: 'var(--cs-texte-second)', textDecoration: 'none', fontFamily: SERIF, fontSize: '0.8125rem' }}>
            Retour à l’accueil
          </Link>
        </div>
      </div>
    </main>
  )
}
