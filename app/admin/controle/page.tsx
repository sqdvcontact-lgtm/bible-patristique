import { redirect } from 'next/navigation'
import { chargerMissions, estAdminDeLaRequete } from './chargementsControle'
import { ADRESSE_SYSTEME, adresseDeMission } from './missions'
import { EcranReserve } from './piecesControle'

export const dynamic = 'force-dynamic'

// L'entrée du centre de contrôle ouvre la PREMIÈRE mission du volet.
//
// ⛔ Elle n'ouvre pas l'état du contrôle v2. Son contrat recalcule à chaque appel toute la
// file des postcontrôles de liens, et il dépasse son délai : ouvrir le centre sur lui,
// c'était ouvrir chaque visite sur une panne, et y attendre vingt-sept secondes.
export default async function CentreControlePage() {
  if (!(await estAdminDeLaRequete())) return <EcranReserve />
  const { missions } = await chargerMissions()
  redirect(missions.length > 0 ? adresseDeMission(missions[0].cle) : ADRESSE_SYSTEME)
}
