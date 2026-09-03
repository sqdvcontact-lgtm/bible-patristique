// CE QU'ON SAIT LIRE DANS UN MESSAGE IPN — module pur, testé.
//
// L'IPN est l'ancien mécanisme de notification de PayPal, et c'est ici le BON : il vit
// dans les réglages du compte et non dans l'espace développeur, si bien qu'il est ouvert
// à un compte PERSONNEL. Le webhook, lui, exige un compte Business (constaté le
// 3 septembre 2026 : le tableau de bord refuse l'onglet « Live »). Décision de l'auteur
// du même jour : « je ne passerai pas en compte Business ».
//
// ⚠️ Le message arrive en formulaire encodé, non en JSON, et il porte DIRECTEMENT
// l'adresse du donateur — ce que l'encaissement d'un webhook ne fait presque jamais.
// L'ancien mécanisme est donc, ici, le plus simple ET le plus complet.
//
// ⛔ PayPal donne l'IPN pour ancien et le retirera un jour. Ce jour-là il s'arrêtera, et
// c'est précisément pourquoi l'administration affiche la date de la dernière
// notification reçue : le silence doit se voir.

/** Le message, à plat. Les clés absentes valent une chaîne vide, jamais `undefined`. */
export type MessageIpn = Record<string, string>

/** Ce qu'on retient d'un message pour l'inscrire au registre. */
export type DonIpn = {
  reference: string
  email: string | null
  nom: string | null
  recuLe: string
  marqueur: string | null
  type: string
}

/** Lit le corps encodé en formulaire, sans rien perdre ni rien réordonner. */
export function lireMessage(corps: string): MessageIpn {
  const params = new URLSearchParams(corps)
  const message: MessageIpn = {}
  for (const [cle, valeur] of params) message[cle] = valeur
  return message
}

// ⛔ SEUL UN PAIEMENT ACHEVÉ fait un don. `Pending` est un paiement en attente de
// compensation, `Refunded` et `Reversed` sont des retours : les inscrire donnerait la
// marque pour de l'argent qui n'est pas arrivé, ou qui est reparti.
export function estPaiementAcheve(message: MessageIpn): boolean {
  return message.payment_status === 'Completed'
}

// ⛔ Les types de transaction qu'on retient. `send_money` est un virement entre
// particuliers, `web_accept` un bouton de paiement ou de don, `cart` un panier.
// ⚠️ Un abonnement (`subscr_payment`) est un don récurrent : chaque échéance en est un.
const TYPES_RETENUS = new Set(['web_accept', 'cart', 'send_money', 'subscr_payment'])

export function estTypeRetenu(message: MessageIpn): boolean {
  // Un type absent ne fait pas écarter : le message a déjà été vérifié par PayPal, et
  // un don qu'on n'inscrirait pas serait un don perdu.
  return !message.txn_type || TYPES_RETENUS.has(message.txn_type)
}

/**
 * Le message m'est-il VRAIMENT adressé.
 *
 * ⛔ CE CONTRÔLE N'EST PAS FACULTATIF, et il est le seul qui manque à la validation de
 * PayPal. Celle-ci confirme qu'un message est AUTHENTIQUE, non qu'il m'était destiné :
 * un message authentique adressé à un AUTRE marchand se valide tout aussi bien. Sans ce
 * contrôle, n'importe qui se donnerait un euro à lui-même et me réexpédierait le
 * message pour prendre la marque.
 *
 * ⚠️ PayPal renseigne `receiver_email` et, pour un paiement reçu sur une adresse
 * secondaire, `business` : les deux comptent.
 */
export function messagePourMoi(message: MessageIpn, receveur: string | undefined): boolean {
  const attendu = (receveur ?? '').trim().toLowerCase()
  if (!attendu) return false
  const candidats = [message.receiver_email, message.business]
    .map(v => (v ?? '').trim().toLowerCase())
    .filter(Boolean)
  return candidats.includes(attendu)
}

const MOIS: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
}

/**
 * La date du don, au format du jour.
 *
 * ⚠️ `payment_date` s'écrit « 15:04:05 Sep 03, 2026 PDT », que `new Date()` ne sait pas
 * lire de façon fiable : l'abréviation de fuseau lui échappe, et selon le moteur elle
 * rend une date fausse ou rien du tout. On lit donc le jour à la main, et l'heure ne
 * nous intéresse pas — le registre ne garde qu'un jour.
 */
export function dateDuMessage(message: MessageIpn, aujourdhui = new Date()): string {
  const m = /([A-Z][a-z]{2})\s+(\d{1,2}),\s*(\d{4})/.exec(message.payment_date ?? '')
  if (m && m[1] in MOIS) {
    const date = new Date(Date.UTC(Number(m[3]), MOIS[m[1]], Number(m[2])))
    if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10)
  }
  return aujourdhui.toISOString().slice(0, 10)
}

/** L'adresse du donateur, si elle a la forme d'une adresse. */
export function emailDuDonateur(message: MessageIpn): string | null {
  const brut = (message.payer_email ?? '').trim()
  return brut && /^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(brut) ? brut.toLowerCase() : null
}

/** Son nom, prénom et nom réunis. */
export function nomDuDonateur(message: MessageIpn): string | null {
  const nom = [message.first_name, message.last_name]
    .map(v => (v ?? '').trim()).filter(Boolean).join(' ')
  return nom || (message.payer_business_name?.trim() || null)
}

/**
 * Ce qu'on retient du message, ou null s'il n'y a rien à inscrire.
 *
 * ⛔ `txn_id` est la seule chose sans quoi on n'inscrit rien : c'est elle qui empêche de
 * compter deux fois le même don — PayPal REJOUE ses messages tant qu'il n'a pas eu de
 * réponse — et c'est elle que le donateur lit sur son reçu.
 */
export function lireLeDon(message: MessageIpn, aujourdhui = new Date()): DonIpn | null {
  if (!estPaiementAcheve(message) || !estTypeRetenu(message)) return null
  const reference = (message.txn_id ?? '').trim()
  if (!reference) return null
  return {
    reference,
    email: emailDuDonateur(message),
    nom: nomDuDonateur(message),
    recuLe: dateDuMessage(message, aujourdhui),
    marqueur: (message.custom ?? '').trim().slice(0, 120) || null,
    type: message.txn_type || 'ipn',
  }
}

/** La note du registre : d'où vient ce don, et ce que le lien portait. */
export function noteDuDon(don: DonIpn): string {
  const morceaux = [`Reçu automatiquement (IPN · ${don.type})`]
  if (don.marqueur) morceaux.push(`marqueur du lien : ${don.marqueur}`)
  return morceaux.join(' · ').slice(0, 500)
}

/**
 * Le corps à renvoyer à PayPal pour qu'il valide son propre message.
 *
 * ⛔ Le corps BRUT est réexpédié tel quel, sans être reconstruit : PayPal compare
 * caractère pour caractère, et un paramètre réordonné ou réencodé rend INVALID. C'est
 * l'erreur classique de ce mécanisme, et elle ne se voit qu'à l'usage.
 */
export function corpsDeValidation(corpsBrut: string): string {
  return `cmd=_notify-validate&${corpsBrut}`
}
