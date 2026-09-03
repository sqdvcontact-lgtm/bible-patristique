// CE QU'ON SAIT LIRE DANS UNE NOTIFICATION PAYPAL — module pur, testé.
//
// Le format d'un événement PayPal n'est pas un contrat : il varie selon le type de
// l'événement, selon l'ancienneté du parcours de paiement, et selon ce que le donateur
// a employé (compte PayPal ou carte). Tout ce qui LIT ce format vit donc ici, et rien
// n'y suppose une forme unique : chaque valeur se cherche sur plusieurs chemins, et son
// absence n'est jamais une erreur.
//
// ⛔ LA RÈGLE QUI COMMANDE LE RESTE : le registre ne perd JAMAIS un don. Un don dont on
// ne sait pas lire le donateur s'inscrit tout de même, avec sa référence, et attend une
// main dans l'onglet « Mécènes ». Un don qu'on n'inscrirait pas parce qu'un champ manque
// serait un don perdu, et personne ne le saurait.

/** L'enveloppe d'un événement, telle que PayPal la poste. */
export type EvenementPayPal = {
  id?: unknown
  event_type?: unknown
  create_time?: unknown
  resource?: unknown
}

/** Ce qu'on retient d'une notification pour l'inscrire au registre. */
export type DonLu = {
  /** La référence de transaction : celle que le donateur lit sur son reçu. */
  reference: string
  /** L'adresse du donateur, ou null si l'événement ne la porte pas. */
  email: string | null
  /** Son nom, ou null. */
  nom: string | null
  /** La date du don, au format du jour. */
  recuLe: string
  /** L'identifiant de la commande, par où l'on peut aller chercher le donateur. */
  commande: string | null
  /** Ce que le lien de don portait, s'il portait quelque chose. */
  marqueur: string | null
  /** Le type d'événement, gardé pour la note du registre. */
  type: string
}

// ⛔ SEUL UN PAIEMENT ENCAISSÉ fait un don. `CHECKOUT.ORDER.APPROVED` porte l'identité
// du donateur et NON la certitude qu'il a payé : l'inscrire au registre y ferait entrer
// des paiements abandonnés, et le lecteur porterait la marque sans avoir donné. On va
// donc chercher l'identité par la commande (voir `commande`), au lieu de se fier à
// l'approbation.
//
// ⚠️ `PAYMENT.SALE.COMPLETED` est la forme ancienne du même fait. Elle ne porte ni
// commande ni, le plus souvent, de donateur : le don s'inscrit alors sans compte.
const EVENEMENTS_DE_DON = new Set([
  'PAYMENT.CAPTURE.COMPLETED',
  'PAYMENT.SALE.COMPLETED',
])

// ⛔ Un remboursement ou un litige ne RETIRE pas la marque, et ce n'est pas un oubli :
// une gratitude constatée ne se reprend pas par un automate. Ces événements ne sont pas
// traités ; si le cas se présente, l'administrateur efface le don du registre et la
// marque suit, comme pour n'importe quelle correction.
export function estEvenementDeDon(type: unknown): boolean {
  return typeof type === 'string' && EVENEMENTS_DE_DON.has(type)
}

/** Descend un chemin pointé dans un objet inconnu, sans jamais lever. */
function lire(source: unknown, chemin: string): unknown {
  return chemin.split('.').reduce<unknown>((valeur, cle) => {
    if (valeur === null || typeof valeur !== 'object') return undefined
    return (valeur as Record<string, unknown>)[cle]
  }, source)
}

/** La première valeur textuelle non vide trouvée parmi ces chemins. */
function premierTexte(source: unknown, chemins: string[]): string | null {
  for (const chemin of chemins) {
    const valeur = lire(source, chemin)
    if (typeof valeur === 'string' && valeur.trim()) return valeur.trim()
  }
  return null
}

// ⛔ `payee` n'est JAMAIS lu, et son absence de cette liste est la règle : c'est
// l'adresse du site, celle qui REÇOIT. La confondre avec celle du donateur rattacherait
// tous les dons au compte de l'auteur.
const CHEMINS_EMAIL = [
  'payer.email_address',
  'payer.payer_info.email',
  'payment_source.paypal.email_address',
  'subscriber.email_address',
  'payer_email',
]

const CHEMINS_PRENOM = [
  'payer.name.given_name',
  'payer.payer_info.first_name',
  'payment_source.paypal.name.given_name',
  'subscriber.name.given_name',
]

const CHEMINS_NOM = [
  'payer.name.surname',
  'payer.payer_info.last_name',
  'payment_source.paypal.name.surname',
  'subscriber.name.surname',
]

/** L'adresse du donateur, cherchée sur tous les chemins connus. */
export function emailDuDonateur(source: unknown): string | null {
  const brut = premierTexte(source, CHEMINS_EMAIL)
  // ⚠️ On ne « répare » pas une adresse : elle sert de clé de rattachement, et une
  // adresse corrigée rattacherait au mauvais compte. Elle est retenue si elle a la
  // forme d'une adresse, écartée sinon.
  return brut && /^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(brut) ? brut.toLowerCase() : null
}

/** Le nom du donateur, prénom et nom réunis, ou l'un des deux. */
export function nomDuDonateur(source: unknown): string | null {
  const parties = [premierTexte(source, CHEMINS_PRENOM), premierTexte(source, CHEMINS_NOM)]
  const nom = parties.filter(Boolean).join(' ').trim()
  if (nom) return nom
  // Certaines formes ne portent qu'un nom entier, sans le découper.
  return premierTexte(source, ['payer.name.full_name', 'payer_name', 'subscriber.name.full_name'])
}

/** Une date au format du jour, tirée de l'événement ou d'aujourd'hui à défaut. */
export function dateDuDon(evenement: EvenementPayPal, aujourdhui = new Date()): string {
  const brut = premierTexte(evenement, ['resource.create_time', 'create_time', 'resource.update_time'])
  if (brut) {
    const date = new Date(brut)
    if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10)
  }
  return aujourdhui.toISOString().slice(0, 10)
}

/** L'identifiant de la commande, seul chemin vers l'identité du donateur. */
export function commandeDuDon(evenement: EvenementPayPal): string | null {
  return premierTexte(evenement, [
    'resource.supplementary_data.related_ids.order_id',
    'resource.order_id',
  ])
}

/** Ce que le lien de don portait. Voir `marqueur` dans la note ci-dessous. */
export function marqueurDuDon(evenement: EvenementPayPal): string | null {
  const brut = premierTexte(evenement, [
    'resource.custom_id',
    'resource.custom',
    'resource.purchase_units.0.custom_id',
  ])
  return brut ? brut.slice(0, 120) : null
}

/**
 * Ce qu'on retient d'une notification, ou null si ce n'est pas un don encaissé ou
 * qu'aucune référence de transaction n'est lisible.
 *
 * ⛔ La RÉFÉRENCE est la seule chose sans quoi on n'inscrit rien : c'est elle qui
 * empêche de compter deux fois le même don, et c'est elle que le donateur lit sur son
 * reçu. Tout le reste peut manquer.
 */
export function lireLeDon(evenement: EvenementPayPal, aujourdhui = new Date()): DonLu | null {
  if (!estEvenementDeDon(evenement?.event_type)) return null
  const reference = premierTexte(evenement, ['resource.id'])
  if (!reference) return null
  const resource = (evenement as { resource?: unknown }).resource
  return {
    reference,
    email: emailDuDonateur(resource),
    nom: nomDuDonateur(resource),
    recuLe: dateDuDon(evenement, aujourdhui),
    commande: commandeDuDon(evenement),
    marqueur: marqueurDuDon(evenement),
    type: String(evenement.event_type),
  }
}

/**
 * Le donateur, tel qu'une commande allée chercher chez PayPal le donne.
 *
 * ⚠️ C'est le chemin ORDINAIRE, et non un repli : l'encaissement ne porte presque
 * jamais l'identité du donateur, quand la commande la porte toujours.
 */
export function donateurDeLaCommande(commande: unknown): { email: string | null; nom: string | null } {
  return { email: emailDuDonateur(commande), nom: nomDuDonateur(commande) }
}

/** La note du registre : d'où vient ce don, et ce que le lien portait. */
export function noteDuDon(don: DonLu, viaCommande: boolean): string {
  const morceaux = [`Reçu automatiquement (${don.type})`]
  if (viaCommande) morceaux.push('donateur lu sur la commande')
  if (don.marqueur) morceaux.push(`marqueur du lien : ${don.marqueur}`)
  return morceaux.join(' · ').slice(0, 500)
}
