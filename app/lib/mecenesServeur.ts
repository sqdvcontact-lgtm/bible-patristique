import type { SupabaseClient } from '@supabase/supabase-js'

// LA MARQUE DE MÉCÈNE, CÔTÉ SERVEUR — ce que les DEUX portes du registre partagent.
//
// ⛔ Deux portes y écrivent : l'onglet « Mécènes » de l'administration, où un humain
// rattache, et la notification de PayPal, qui inscrit seule. Elles doivent poser la
// marque de la MÊME façon, sans quoi un don rattaché à la main et un don reçu
// automatiquement ne donneraient pas le même résultat, et il faudrait deviner lequel
// des deux a raison. Le dépôt a déjà payé cette dérive sur les natures de segment et
// sur les colonnes de la bibliothèque : une règle recopiée à deux endroits ne reste
// identique que par accident.
//
// ⛔ Ces fonctions attendent un client à CLÉ DE SERVICE. `dons` n'a aucune politique
// RLS et `compte_par_courriel` n'est exécutable que par ce rôle : appelées depuis une
// session de lecteur, elles ne rendraient rien.

/**
 * La marque, recalculée sur le REGISTRE : la date du plus ancien don rattaché, ou rien.
 *
 * ⛔ Elle ne se pose jamais à la main. Rattacher, détacher ou effacer un don suffit, et
 * les deux tables ne peuvent pas se contredire.
 *
 * ⚠️ À appeler pour l'ANCIEN comme pour le NOUVEAU compte quand un don change de mains :
 * sans quoi l'ancien garderait une marque que plus aucun don ne soutient.
 */
export async function recalculerMarque(sb: SupabaseClient, userId: string | null): Promise<void> {
  if (!userId) return
  const { data } = await sb
    .from('dons').select('recu_le').eq('user_id', userId)
    .order('recu_le', { ascending: true }).limit(1)
  await sb.from('profils')
    .update({ mecene_depuis: data?.[0]?.recu_le ?? null })
    .eq('id', userId)
}

/**
 * Le compte qui porte cette adresse, ou null.
 *
 * ⛔ Il n'y a AUCUNE approximation ici, et c'est ce qui distingue cette recherche de
 * celle de l'administration : celle-là propose à un humain, celle-ci décide seule. La
 * fonction en base ne rend un compte que s'il est le seul à porter l'adresse.
 */
export async function compteParCourriel(sb: SupabaseClient, courriel: string | null): Promise<string | null> {
  if (!courriel) return null
  const { data, error } = await sb.rpc('compte_par_courriel', { courriel })
  if (error) throw error
  return typeof data === 'string' && data ? data : null
}

/** La clé du paramètre qui date la dernière notification vérifiée. */
export const CLE_DERNIERE_NOTIFICATION = 'paypal_webhook_dernier'

/**
 * Note qu'une notification a été reçue et vérifiée.
 *
 * ⚠️ Elle s'écrit pour TOUTE notification vérifiée, même celles qu'on n'inscrit pas :
 * ce qu'on veut savoir est que la liaison avec PayPal VIT, non qu'un don est arrivé.
 * Un remboursement prouve la liaison aussi bien qu'un don.
 */
export async function noterLaNotification(sb: SupabaseClient, type: string): Promise<void> {
  await sb.from('parametres').upsert(
    { cle: CLE_DERNIERE_NOTIFICATION, valeur: `${new Date().toISOString()} ${type}`.trim(), mis_a_jour: new Date().toISOString() },
    { onConflict: 'cle' },
  )
}

/** Ce que l'administration affiche de la réception automatique. */
export type EtatReception = {
  /** La voie armée, ou null si aucune ne l'est. Voir `voieDeReception`. */
  voie: VoieReception
  /** Vrai dès qu'une voie est armée. */
  configuree: boolean
  /** Le jour de la dernière notification vérifiée, ou null si aucune n'est venue. */
  derniereLe: string | null
  /** Depuis combien de jours. ⚠️ Compté ICI, jamais au rendu : l'heure est un fait
   *  extérieur, et une horloge lue pendant un rendu en fait un rendu instable. */
  joursDepuis: number | null
  /** Le type de cette dernière notification. */
  dernierType: string | null
}

/** Lit l'état de la réception automatique, pour le dire à l'administrateur. */
export async function lireEtatReception(sb: SupabaseClient, maintenant = new Date()): Promise<EtatReception> {
  const { data } = await sb.from('parametres').select('valeur').eq('cle', CLE_DERNIERE_NOTIFICATION).maybeSingle()
  const brut = String(data?.valeur ?? '').trim()
  const [horodatage, ...reste] = brut.split(' ')
  const date = horodatage ? new Date(horodatage) : null
  const lisible = date && !Number.isNaN(date.getTime()) ? date : null
  return {
    voie: voieDeReception(),
    configuree: voieDeReception() !== null,
    derniereLe: lisible ? lisible.toISOString().slice(0, 10) : null,
    joursDepuis: lisible ? Math.floor((maintenant.getTime() - lisible.getTime()) / 86_400_000) : null,
    dernierType: reste.join(' ') || null,
  }
}

/** Par où les dons arrivent seuls. Voir les deux routes d'`app/api/paypal/`. */
export type VoieReception = 'ipn' | 'webhook' | null

/**
 * Les trois clés du WEBHOOK, sans lesquelles sa signature ne peut être vérifiée.
 *
 * ⚠️ Le webhook exige un compte PayPal Business (constaté le 3 septembre 2026 : le
 * tableau de bord refuse l'onglet « Live » à un compte personnel). La route reste
 * écrite et dort ; c'est l'IPN qui sert.
 */
export function paypalConfigure(): boolean {
  return Boolean(
    process.env.PAYPAL_CLIENT_ID &&
    process.env.PAYPAL_CLIENT_SECRET &&
    process.env.PAYPAL_WEBHOOK_ID,
  )
}

/**
 * L'IPN, qui ne demande AUCUNE clé : PayPal valide son propre message en le recevant en
 * retour. La seule chose à renseigner est l'adresse qui REÇOIT les dons, et elle n'est
 * pas un secret.
 *
 * ⛔ Sans elle, on ne peut pas contrôler qu'un message authentique m'était bien destiné,
 * et la réception reste éteinte plutôt que d'accepter ce qu'elle ne sait pas juger.
 */
export function ipnConfigure(): boolean {
  return Boolean((process.env.PAYPAL_RECEVEUR ?? '').trim())
}

/**
 * La voie armée.
 *
 * ⚠️ L'IPN passe d'abord : quand les deux sont montées, c'est lui qui porte les dons
 * d'un compte personnel, et son message est le plus complet — il nomme le donateur sans
 * qu'on aille chercher la commande.
 */
export function voieDeReception(): VoieReception {
  if (ipnConfigure()) return 'ipn'
  if (paypalConfigure()) return 'webhook'
  return null
}
