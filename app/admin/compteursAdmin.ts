// Les compteurs du sommaire de l'administration, relevés par le serveur.
//
// Le sommaire les porte sur TOUTES les pages de l'administration : ce qui attend une réponse,
// une publication à relire, une vérification, un signalement ou une lettre, doit se voir d'où
// qu'on vienne, et non plus depuis la seule page /admin. Le layout les relève une fois par
// chargement ; le volet recompte ensuite ce que le navigateur sait compter lui-même.
//
// ⚠️ Le courrier ne se compte qu'avec la clé de service : `messages_contact` est fermée par la
// RLS et ses droits sont retirés à `anon` comme à `authenticated`. Les vérifications passent par
// la fonction de la base que la page /admin appelait déjà sous cette clé. C'est pourquoi ce
// premier relevé se fait ici, et non dans le navigateur.
// ⚠️ Le client de service est celui du centre de contrôle : une instance de plus n'allongerait
// que la liste des fichiers qui en créent une.
// ⛔ Un compteur est une couche SECONDAIRE (charte § 18) : un échec rend `null`, la pastille se
// tait, et la page qu'enveloppe le sommaire s'affiche quand même.
import { cache } from 'react'
import { supabaseAdmin } from './controle/chargementsControle'
import { compterCeQuiAttend, type CompteursAdmin } from './sommaireAdmin'

const COMPTEURS_INCONNUS: CompteursAdmin = { essais: null, verifications: null, moderation: null, courrier: null }

export const chargerCompteursAdmin = cache(async (): Promise<CompteursAdmin> => {
  try {
    const [attente, verifications, courrier] = await Promise.all([
      compterCeQuiAttend(supabaseAdmin),
      supabaseAdmin.rpc('count_verifications_pending'),
      supabaseAdmin.from('messages_contact').select('id', { count: 'exact', head: true }).is('traite_le', null),
    ])
    if (attente.moderation === null || attente.essais === null) console.error('[administration] compte de la modération ou des essais impossible')
    if (verifications.error) console.error('[administration] compte des vérifications :', verifications.error)
    if (courrier.error) console.error('[administration] compte du courrier :', courrier.error)
    return {
      ...attente,
      verifications: verifications.error ? null : Number(verifications.data ?? 0),
      courrier: courrier.error ? null : (courrier.count ?? 0),
    }
  } catch (erreur) {
    console.error('[administration] compteurs du sommaire :', erreur)
    return COMPTEURS_INCONNUS
  }
})
