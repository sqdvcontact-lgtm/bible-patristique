import { Suspense } from 'react'
import { estAdminDeLaRequete } from '../chargementsControle'
import { EcranReserve } from '../piecesControle'
import { CSS_SYSTEME } from '../stylesCentre'
import VueSysteme from './VueSysteme'

export const metadata = { title: 'État du contrôle v2 · Centre de contrôle' }
export const dynamic = 'force-dynamic'

// L'état du système de contrôle v2, dans sa propre vue du centre de contrôle.
//
// Son contrat se fait attendre dans une frontière de flux : l'en-tête et le volet paraissent
// tout de suite, et une panne du contrat ne ferme plus que cette vue.
export default async function PageSysteme() {
  if (!(await estAdminDeLaRequete())) return <EcranReserve />

  return (
    <>
      <style>{CSS_SYSTEME}</style>
      <header className="cv-entete">
        <h1 className="cc-titre">État du contrôle v2</h1>
        <p className="cc-sous-titre">Ce que le système de contrôle affirme, à l’instant.</p>
      </header>
      <Suspense
        fallback={
          <div className="cc-carte">
            <p className="cv-vide">Le contrat du contrôle v2 se calcule. Il dispose de huit secondes.</p>
          </div>
        }
      >
        <VueSysteme />
      </Suspense>
    </>
  )
}
