import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  compteParCourriel,
  ipnConfigure,
  noterLaNotification,
  recalculerMarque,
} from '@/app/lib/mecenesServeur'
import {
  corpsDeValidation,
  lireLeDon,
  lireMessage,
  messagePourMoi,
  noteDuDon,
} from '@/app/lib/paypalIpn'

// LE DON QUI S'INSCRIT SEUL — la notification IPN de PayPal.
//
// C'est la voie retenue le 3 septembre 2026, après avoir constaté que le webhook exige
// un compte Business (« je ne passerai pas en compte Business », décision de l'auteur).
// L'IPN vit dans les réglages du compte, non dans l'espace développeur : il est ouvert
// à un compte personnel, ne demande aucune clé d'API, et porte DIRECTEMENT l'adresse du
// donateur. Doctrine : charte § 40.7.
//
// ⛔ DEUX CONTRÔLES, ET IL EN FAUT DEUX. PayPal valide que le message est AUTHENTIQUE,
// en le lui renvoyant ; mais il ne dit pas qu'il m'était DESTINÉ, et un message
// authentique adressé à un autre marchand se valide tout aussi bien. Sans le second
// contrôle, n'importe qui se donnerait un euro à lui-même et me réexpédierait le message
// pour prendre la marque.
//
// ⛔ AUCUN MONTANT n'est lu ni gardé, pas même celui que le message porte.
//
// ⚠️ La route est HORS du verrou de bêta (`proxy.ts`, `LIBRES`) : redirigée en 307, elle
// mourrait en silence et PayPal finirait par couper la notification.

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// ⛔ `ipnpb.paypal.com` et NON `www.paypal.com` : la validation par l'adresse ordinaire
// est abandonnée depuis longtemps et rend des refus qu'on croit être des messages faux.
function adresseValidation(): string {
  return process.env.PAYPAL_ENV === 'sandbox'
    ? 'https://ipnpb.sandbox.paypal.com/cgi-bin/webscr'
    : 'https://ipnpb.paypal.com/cgi-bin/webscr'
}

/** PayPal confirme que ce message vient bien de lui. */
async function messageAuthentique(corpsBrut: string): Promise<boolean> {
  const res = await fetch(adresseValidation(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      // ⚠️ PayPal REFUSE une validation sans agent nommé, et le refus ressemble alors
      // à un message faux : on croit à une attaque là où il n'y a qu'un en-tête absent.
      'User-Agent': 'Corpus-Scriptura-IPN/1.0',
    },
    body: corpsDeValidation(corpsBrut),
  })
  if (!res.ok) return false
  return (await res.text()).trim() === 'VERIFIED'
}

export async function POST(request: Request) {
  // ⛔ Le corps se lit UNE fois, en texte, et c'est ce texte-là qu'on renvoie à PayPal :
  // reconstruire le formulaire depuis les paramètres décodés réordonne et réencode, et
  // la validation rend alors INVALID sans qu'on comprenne pourquoi.
  const corpsBrut = await request.text()

  // ⚠️ 503 et non 200 : PayPal REJOUE un message qu'il n'a pas pu livrer, pendant
  // plusieurs jours. Tant que l'adresse du receveur n'est pas renseignée, on ne peut
  // rien contrôler ; en refusant temporairement, les dons de l'intervalle finissent par
  // arriver au lieu d'être perdus.
  if (!ipnConfigure()) {
    return new NextResponse('Réception incomplète.', { status: 503 })
  }

  if (!(await messageAuthentique(corpsBrut))) {
    // Ni 200 ni 503 : ce message n'est pas de PayPal, et il n'y a rien à rejouer.
    return new NextResponse('Message refusé.', { status: 401 })
  }

  const message = lireMessage(corpsBrut)

  // ⛔ Le second contrôle, celui que la validation ne fait pas.
  if (!messagePourMoi(message, process.env.PAYPAL_RECEVEUR)) {
    console.error('IPN : message authentique mais adressé ailleurs.', {
      receiver_email: message.receiver_email, business: message.business,
    })
    return new NextResponse('Message étranger.', { status: 401 })
  }

  await noterLaNotification(supabaseAdmin, `IPN ${message.txn_type || message.payment_status || ''}`.trim())

  const don = lireLeDon(message)
  // Vérifié et pour moi, mais ce n'est pas un don encaissé : la liaison est prouvée,
  // il n'y a rien à inscrire.
  if (!don) return new NextResponse(null, { status: 200 })

  // ⛔ Le rattachement N'EST PAS un préalable à l'inscription : le registre garde le don
  // quoi qu'il arrive, et c'est ce qui empêche un don de se perdre en silence.
  const userId = await compteParCourriel(supabaseAdmin, don.email).catch(() => null)

  const { error } = await supabaseAdmin.from('dons').insert({
    user_id: userId,
    email_donateur: don.email,
    nom_donateur: don.nom,
    reference: don.reference,
    recu_le: don.recuLe,
    source: 'paypal',
    note: noteDuDon(don),
  })

  // 23505 : la référence est unique, et PayPal rejoue ses messages tant qu'il n'a pas eu
  // de 200. Un doublon n'est donc pas une anomalie mais le fonctionnement même.
  if (error && error.code !== '23505') {
    console.error('Don IPN : inscription refusée.', error)
    // 500 : PayPal rejouera, et le don ne sera pas perdu.
    return new NextResponse('Inscription refusée.', { status: 500 })
  }

  // ⚠️ La marque ne se recalcule que sur une inscription NEUVE : sur un rejeu, le don
  // est déjà au registre et la date n'a pas bougé.
  if (!error && userId) await recalculerMarque(supabaseAdmin, userId)

  // ⛔ PayPal attend un 200 NU. Un corps, une redirection ou un délai le font conclure à
  // un échec et rejouer le message ; répété, il finit par couper la notification.
  return new NextResponse(null, { status: 200 })
}

/** PayPal contrôle parfois l'adresse avant d'accepter de l'enregistrer. */
export async function GET() {
  return NextResponse.json({ ok: true, service: 'notification de don (IPN)' })
}
