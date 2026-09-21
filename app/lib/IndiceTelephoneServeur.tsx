import { headers } from 'next/headers'
import type { ReactNode } from 'react'
import { estTelephone } from './pointsDeRupture'
import { ProvisionTelephone } from './useEstMobile'

/**
 * L'INDICE DU TÉLÉPHONE, lu dans la requête et confié à `useEstMobile`.
 *
 * ⛔ À NE POSER QUE SUR UNE PAGE DÉJÀ RENDUE À LA REQUÊTE (qui lit les cookies de
 * session, ses paramètres…). Lire les en-têtes rend la route dynamique : posé dans
 * le gabarit racine, il aurait retiré leur cache aux pages prérendues (`revalidate`
 * de la Bibliographie, de l'Histoire, des Péricopes, de la Communauté). Celles-là
 * gardent le premier rendu du bureau.
 */
export default async function IndiceTelephoneServeur({ children }: { children: ReactNode }) {
  const h = await headers()
  return (
    <ProvisionTelephone telephone={estTelephone(h.get('sec-ch-ua-mobile'), h.get('user-agent'))}>
      {children}
    </ProvisionTelephone>
  )
}
