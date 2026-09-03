import { describe, it, expect } from 'vitest'
import {
  commandeDuDon,
  dateDuDon,
  donateurDeLaCommande,
  emailDuDonateur,
  estEvenementDeDon,
  lireLeDon,
  marqueurDuDon,
  nomDuDonateur,
  noteDuDon,
} from './paypalWebhook'

// Les charges sont recopiées des formes que PayPal documente : l'encaissement (v2), la
// vente (forme ancienne) et la commande allée chercher par l'API. On ne teste pas un
// format inventé : c'est précisément parce que le format varie que ce module existe.

const ENCAISSEMENT = {
  id: 'WH-6TR22610ES526290S-1LM6924498893330J',
  event_type: 'PAYMENT.CAPTURE.COMPLETED',
  create_time: '2026-09-03T14:22:11.000Z',
  resource: {
    id: '3C679366HH908993F',
    status: 'COMPLETED',
    amount: { currency_code: 'EUR', value: '10.00' },
    create_time: '2026-09-03T14:22:09Z',
    payee: { email_address: 'auteur@corpus-scriptura.fr', merchant_id: 'H8K...' },
    supplementary_data: { related_ids: { order_id: '5O190127TN364715T' } },
  },
}

const VENTE_ANCIENNE = {
  id: 'WH-2WR32451HC0233532-67976317FL4543714',
  event_type: 'PAYMENT.SALE.COMPLETED',
  create_time: '2026-09-03T09:00:00.000Z',
  resource: {
    id: '9T0916156Y071624C',
    state: 'completed',
    amount: { total: '5.00', currency: 'EUR' },
    create_time: '2026-09-03T08:59:58Z',
  },
}

const COMMANDE = {
  id: '5O190127TN364715T',
  intent: 'CAPTURE',
  status: 'COMPLETED',
  payer: {
    name: { given_name: 'Jean', surname: 'Dupont' },
    email_address: 'Jean.Dupont@Example.COM',
    payer_id: 'QYR5Z8XDVJNXQ',
  },
  purchase_units: [{ custom_id: 'cs-lecteur-42', amount: { currency_code: 'EUR', value: '10.00' } }],
}

describe('estEvenementDeDon', () => {
  it('retient l’encaissement et la vente', () => {
    expect(estEvenementDeDon('PAYMENT.CAPTURE.COMPLETED')).toBe(true)
    expect(estEvenementDeDon('PAYMENT.SALE.COMPLETED')).toBe(true)
  })

  // ⛔ Une commande approuvée n'est pas un don : le donateur peut abandonner au
  // dernier écran, et la marque irait à qui n'a rien donné.
  it('écarte une commande seulement approuvée', () => {
    expect(estEvenementDeDon('CHECKOUT.ORDER.APPROVED')).toBe(false)
  })

  it('écarte un remboursement, un litige et ce qui n’est pas une chaîne', () => {
    expect(estEvenementDeDon('PAYMENT.CAPTURE.REFUNDED')).toBe(false)
    expect(estEvenementDeDon('CUSTOMER.DISPUTE.CREATED')).toBe(false)
    expect(estEvenementDeDon(undefined)).toBe(false)
    expect(estEvenementDeDon(42)).toBe(false)
  })
})

describe('emailDuDonateur', () => {
  it('lit l’adresse d’une commande et la met en bas de casse', () => {
    expect(emailDuDonateur(COMMANDE)).toBe('jean.dupont@example.com')
  })

  it('lit les autres formes connues', () => {
    expect(emailDuDonateur({ payer: { payer_info: { email: 'a@b.fr' } } })).toBe('a@b.fr')
    expect(emailDuDonateur({ payment_source: { paypal: { email_address: 'c@d.fr' } } })).toBe('c@d.fr')
    expect(emailDuDonateur({ payer_email: 'e@f.fr' })).toBe('e@f.fr')
  })

  // ⛔ Le défaut qui rattacherait TOUS les dons au compte de l'auteur.
  it('ne prend JAMAIS l’adresse du bénéficiaire', () => {
    expect(emailDuDonateur(ENCAISSEMENT.resource)).toBeNull()
  })

  it('écarte ce qui n’a pas la forme d’une adresse', () => {
    expect(emailDuDonateur({ payer: { email_address: 'pas-une-adresse' } })).toBeNull()
    expect(emailDuDonateur({ payer: { email_address: 'a@b' } })).toBeNull()
    expect(emailDuDonateur({ payer: { email_address: '   ' } })).toBeNull()
    expect(emailDuDonateur(null)).toBeNull()
  })
})

describe('nomDuDonateur', () => {
  it('réunit le prénom et le nom', () => {
    expect(nomDuDonateur(COMMANDE)).toBe('Jean Dupont')
  })

  it('se contente de ce qu’il trouve', () => {
    expect(nomDuDonateur({ payer: { name: { given_name: 'Marie' } } })).toBe('Marie')
    expect(nomDuDonateur({ payer: { name: { full_name: 'Marie Curie' } } })).toBe('Marie Curie')
    expect(nomDuDonateur({})).toBeNull()
  })
})

describe('dateDuDon', () => {
  it('prend la date de la ressource, non celle de l’enveloppe', () => {
    expect(dateDuDon(ENCAISSEMENT)).toBe('2026-09-03')
  })

  it('retombe sur aujourd’hui quand la date est absente ou illisible', () => {
    const jour = new Date('2026-12-25T10:00:00Z')
    expect(dateDuDon({ event_type: 'PAYMENT.CAPTURE.COMPLETED' }, jour)).toBe('2026-12-25')
    expect(dateDuDon({ resource: { create_time: 'pas une date' } }, jour)).toBe('2026-12-25')
  })
})

describe('commandeDuDon et marqueurDuDon', () => {
  it('trouve la commande dans les données supplémentaires', () => {
    expect(commandeDuDon(ENCAISSEMENT)).toBe('5O190127TN364715T')
  })

  it('rend null quand la forme ancienne n’en porte pas', () => {
    expect(commandeDuDon(VENTE_ANCIENNE)).toBeNull()
  })

  it('lit le marqueur du lien sous ses trois noms', () => {
    expect(marqueurDuDon({ resource: { custom_id: 'abc' } })).toBe('abc')
    expect(marqueurDuDon({ resource: { custom: 'ancien' } })).toBe('ancien')
    expect(marqueurDuDon({ resource: { purchase_units: [{ custom_id: 'dans-l-unite' }] } })).toBe('dans-l-unite')
    expect(marqueurDuDon(ENCAISSEMENT)).toBeNull()
  })

  it('borne un marqueur trop long', () => {
    expect(marqueurDuDon({ resource: { custom_id: 'x'.repeat(400) } })).toHaveLength(120)
  })
})

describe('lireLeDon', () => {
  it('retient un encaissement, sa référence et sa commande', () => {
    const don = lireLeDon(ENCAISSEMENT)
    expect(don).not.toBeNull()
    expect(don!.reference).toBe('3C679366HH908993F')
    expect(don!.commande).toBe('5O190127TN364715T')
    expect(don!.recuLe).toBe('2026-09-03')
    expect(don!.email).toBeNull()
  })

  // ⛔ Le registre ne perd jamais un don : la forme ancienne n'a ni donateur ni
  // commande, et elle s'inscrit tout de même.
  it('retient la forme ancienne, sans donateur', () => {
    const don = lireLeDon(VENTE_ANCIENNE)
    expect(don!.reference).toBe('9T0916156Y071624C')
    expect(don!.email).toBeNull()
    expect(don!.commande).toBeNull()
  })

  it('n’inscrit rien sans référence ni sur un événement étranger', () => {
    expect(lireLeDon({ event_type: 'PAYMENT.CAPTURE.COMPLETED', resource: {} })).toBeNull()
    expect(lireLeDon({ event_type: 'CHECKOUT.ORDER.APPROVED', resource: { id: 'x' } })).toBeNull()
    expect(lireLeDon({} as never)).toBeNull()
  })
})

describe('donateurDeLaCommande', () => {
  it('rend le donateur que l’encaissement ne portait pas', () => {
    expect(donateurDeLaCommande(COMMANDE)).toEqual({ email: 'jean.dupont@example.com', nom: 'Jean Dupont' })
  })

  it('ne lève pas sur une commande vide ou absente', () => {
    expect(donateurDeLaCommande(null)).toEqual({ email: null, nom: null })
    expect(donateurDeLaCommande({})).toEqual({ email: null, nom: null })
  })
})

describe('noteDuDon', () => {
  it('dit d’où vient le don, et ce que le lien portait', () => {
    const don = lireLeDon(ENCAISSEMENT)!
    expect(noteDuDon(don, false)).toBe('Reçu automatiquement (PAYMENT.CAPTURE.COMPLETED)')
    expect(noteDuDon({ ...don, marqueur: 'cs-42' }, true))
      .toBe('Reçu automatiquement (PAYMENT.CAPTURE.COMPLETED) · donateur lu sur la commande · marqueur du lien : cs-42')
  })
})
