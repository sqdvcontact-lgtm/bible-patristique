// La garde de l'administration, posée une fois par requête.
//
// Le layout de l'administration, celui du centre de contrôle et la page qu'ils enveloppent
// vérifient TOUS l'administrateur : un layout ne protège pas les pages qu'il enveloppe, et
// chacun pose donc la question pour son compte. `cache()` fait que React ne la pose qu'une
// fois par requête, soit un seul appel au service d'authentification au lieu de trois.
//
// ⛔ Une seule enveloppe, et tout le monde l'importe d'ici : deux `cache(estAdmin)` ne
// partagent rien, et chacune rappellerait le service.
import { cache } from 'react'
import { estAdmin } from '@/app/lib/verifAdmin'

export const estAdminDeLaRequete = cache(estAdmin)
