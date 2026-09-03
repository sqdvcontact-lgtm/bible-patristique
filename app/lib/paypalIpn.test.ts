import { describe, it, expect } from 'vitest'
import {
  corpsDeValidation,
  dateDuMessage,
  emailDuDonateur,
  estPaiementAcheve,
  estTypeRetenu,
  lireLeDon,
  lireMessage,
  messagePourMoi,
  nomDuDonateur,
  noteDuDon,
} from './paypalIpn'

// Le corps est recopié de la forme que PayPal documente pour un bouton de don : encodé
// en formulaire, avec le donateur DANS le message — ce que l'encaissement d'un webhook
// ne porte presque jamais.
const CORPS =
  'mc_gross=10.00&payment_status=Completed&payer_email=Jean.Dupont%40Example.COM' +
  '&txn_id=3C679366HH908993F&receiver_email=dons%40corpus-scriptura.fr' +
  '&first_name=Jean&last_name=Dupont&payment_date=15%3A04%3A05+Sep+03%2C+2026+PDT' +
  '&txn_type=web_accept&item_name=Soutien+libre+au+projet&mc_currency=EUR'

const MESSAGE = lireMessage(CORPS)

describe('lireMessage', () => {
  it('décode le formulaire sans rien perdre', () => {
    expect(MESSAGE.payer_email).toBe('Jean.Dupont@Example.COM')
    expect(MESSAGE.payment_date).toBe('15:04:05 Sep 03, 2026 PDT')
    expect(MESSAGE.item_name).toBe('Soutien libre au projet')
  })

  it('ne lève pas sur un corps vide', () => {
    expect(lireMessage('')).toEqual({})
  })
})

describe('estPaiementAcheve', () => {
  it('n’accepte que « Completed »', () => {
    expect(estPaiementAcheve(MESSAGE)).toBe(true)
    for (const statut of ['Pending', 'Refunded', 'Reversed', 'Failed', '']) {
      expect(estPaiementAcheve({ ...MESSAGE, payment_status: statut })).toBe(false)
    }
  })
})

describe('estTypeRetenu', () => {
  it('retient le bouton, le panier, le virement et l’échéance d’abonnement', () => {
    for (const t of ['web_accept', 'cart', 'send_money', 'subscr_payment']) {
      expect(estTypeRetenu({ ...MESSAGE, txn_type: t })).toBe(true)
    }
  })

  // ⚠️ Un type absent ne fait pas écarter : le message est déjà vérifié, et un don
  // qu'on n'inscrirait pas serait un don perdu.
  it('retient un message sans type', () => {
    expect(estTypeRetenu({ ...MESSAGE, txn_type: '' })).toBe(true)
  })

  it('écarte l’ouverture d’un abonnement, qui n’est pas un paiement', () => {
    expect(estTypeRetenu({ ...MESSAGE, txn_type: 'subscr_signup' })).toBe(false)
  })
})

describe('messagePourMoi', () => {
  it('accepte le message adressé à mon adresse, quelle que soit la casse', () => {
    expect(messagePourMoi(MESSAGE, 'dons@corpus-scriptura.fr')).toBe(true)
    expect(messagePourMoi(MESSAGE, '  DONS@Corpus-Scriptura.FR ')).toBe(true)
  })

  it('accepte aussi sur une adresse secondaire (`business`)', () => {
    const m = { ...MESSAGE, receiver_email: 'autre@ailleurs.fr', business: 'dons@corpus-scriptura.fr' }
    expect(messagePourMoi(m, 'dons@corpus-scriptura.fr')).toBe(true)
  })

  // ⛔ L'attaque que la validation de PayPal ne couvre PAS : un message authentique
  // adressé à quelqu'un d'autre se valide tout aussi bien.
  it('refuse le message adressé à un autre marchand', () => {
    expect(messagePourMoi({ ...MESSAGE, receiver_email: 'quelquun@dautre.fr' }, 'dons@corpus-scriptura.fr')).toBe(false)
  })

  // ⛔ Sans adresse attendue, on ne peut RIEN contrôler : on refuse, on ne suppose pas.
  it('refuse quand l’adresse attendue n’est pas renseignée', () => {
    expect(messagePourMoi(MESSAGE, undefined)).toBe(false)
    expect(messagePourMoi(MESSAGE, '   ')).toBe(false)
  })
})

describe('dateDuMessage', () => {
  it('lit le jour dans la forme de PayPal, fuseau compris', () => {
    expect(dateDuMessage(MESSAGE)).toBe('2026-09-03')
    expect(dateDuMessage({ payment_date: '20:12:59 Jan 13, 2027 PST' })).toBe('2027-01-13')
  })

  it('retombe sur aujourd’hui quand la date manque ou ne se lit pas', () => {
    const jour = new Date('2026-12-25T10:00:00Z')
    expect(dateDuMessage({}, jour)).toBe('2026-12-25')
    expect(dateDuMessage({ payment_date: 'hier soir' }, jour)).toBe('2026-12-25')
  })
})

describe('emailDuDonateur et nomDuDonateur', () => {
  it('met l’adresse en bas de casse', () => {
    expect(emailDuDonateur(MESSAGE)).toBe('jean.dupont@example.com')
  })

  it('écarte ce qui n’a pas la forme d’une adresse', () => {
    expect(emailDuDonateur({ payer_email: 'pas-une-adresse' })).toBeNull()
    expect(emailDuDonateur({})).toBeNull()
  })

  it('réunit le prénom et le nom, ou prend la raison sociale', () => {
    expect(nomDuDonateur(MESSAGE)).toBe('Jean Dupont')
    expect(nomDuDonateur({ payer_business_name: 'Abbaye de Solesmes' })).toBe('Abbaye de Solesmes')
    expect(nomDuDonateur({})).toBeNull()
  })
})

describe('lireLeDon', () => {
  it('retient le don entier, donateur compris', () => {
    const don = lireLeDon(MESSAGE)!
    expect(don).toEqual({
      reference: '3C679366HH908993F',
      email: 'jean.dupont@example.com',
      nom: 'Jean Dupont',
      recuLe: '2026-09-03',
      marqueur: null,
      type: 'web_accept',
    })
  })

  it('n’inscrit rien sans référence, ni sur un paiement inachevé', () => {
    expect(lireLeDon({ ...MESSAGE, txn_id: '' })).toBeNull()
    expect(lireLeDon({ ...MESSAGE, payment_status: 'Pending' })).toBeNull()
    expect(lireLeDon({})).toBeNull()
  })

  it('garde le marqueur du lien quand il y en a un', () => {
    expect(lireLeDon({ ...MESSAGE, custom: 'cs-42' })!.marqueur).toBe('cs-42')
    expect(noteDuDon(lireLeDon({ ...MESSAGE, custom: 'cs-42' })!))
      .toBe('Reçu automatiquement (IPN · web_accept) · marqueur du lien : cs-42')
  })
})

describe('corpsDeValidation', () => {
  // ⛔ Le corps brut est réexpédié TEL QUEL : PayPal compare caractère pour caractère,
  // et un paramètre réordonné ou réencodé rend INVALID.
  it('préfixe la commande sans toucher au reste', () => {
    expect(corpsDeValidation(CORPS)).toBe(`cmd=_notify-validate&${CORPS}`)
  })
})
