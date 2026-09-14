import type { ReactNode } from 'react'
import { headers } from 'next/headers'
import CadreAdministration from './CadreAdministration'
import { chargerCompteursAdmin } from './compteursAdmin'
import { chargerMissions } from './controle/chargementsControle'
import { estAdminDeLaRequete } from './gardeAdmin'
import { CSS_CADRE_ADMIN } from './stylesCadreAdmin'

// Toutes les pages de l'administration portent le même sommaire, en volet à gauche (demande de
// l'auteur, 14 septembre 2026). Le dessin et la navigation vivent dans `CadreAdministration`.
//
// ⛔ Une page chargée dans un CADRE ne le porte pas : c'est une vue posée dans un outil. La revue
// des gravures de Fillion montre ainsi, dans un cadre, la page de lecture d'une gravure, et un
// sommaire répété dans cette vignette ne servirait à rien. La requête le dit d'elle-même
// (« Sec-Fetch-Dest: iframe ») : aucune adresse n'est à tenir dans une liste, et rien ne se lit
// en base pour une vue qui n'en montrera rien.
// ⚠️ Le layout ne protège pas les pages qu'il enveloppe : il ne sert le sommaire qu'à
// l'administrateur, et chaque page garde sa propre vérification. `estAdminDeLaRequete` fait que
// la question n'est posée qu'une fois par requête.
export default async function LayoutAdministration({ children }: { children: ReactNode }) {
  if ((await headers()).get('sec-fetch-dest') === 'iframe') return <>{children}</>
  if (!(await estAdminDeLaRequete())) return <>{children}</>

  // ⛔ Le sommaire est une couche SECONDAIRE (charte § 18) : une lecture qui échoue le laisse
  // incomplet, elle ne ferme pas la page qu'il enveloppe.
  const [compteurs, { missions, erreur }] = await Promise.all([
    chargerCompteursAdmin(),
    chargerMissions().catch((panne: unknown) => {
      console.error('[administration] missions du sommaire :', panne)
      return { missions: [], erreur: { message: panne instanceof Error ? panne.message : 'lecture impossible' } }
    }),
  ])

  return (
    <>
      <style>{CSS_CADRE_ADMIN}</style>
      <CadreAdministration
        compteursInitiaux={compteurs}
        missions={missions.map(({ cle, titre }) => ({ cle, titre }))}
        erreurMissions={erreur ? erreur.message ?? 'lecture impossible' : null}
      >
        {children}
      </CadreAdministration>
    </>
  )
}
