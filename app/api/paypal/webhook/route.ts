import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  compteParCourriel,
  noterLaNotification,
  paypalConfigure,
  recalculerMarque,
} from '@/app/lib/mecenesServeur'
import {
  donateurDeLaCommande,
  estEvenementDeDon,
  lireLeDon,
  noteDuDon,
  type EvenementPayPal,
} from '@/app/lib/paypalWebhook'

// LE DON QUI S'INSCRIT SEUL — la notification de PayPal.
//
// PayPal poste ici chaque paiement encaissé. Le don entre au registre, et si l'adresse
// du paiement est celle d'un compte du site, la marque se pose dans la seconde, sans
// que personne n'ait rien à faire. Doctrine : charte § 40.7.
//
// ⛔ LA VÉRIFICATION N'EST PAS FACULTATIVE. L'adresse de cette route est publique par
// nécessité — PayPal doit pouvoir l'atteindre — et une notification qu'on croirait sur
// parole laisserait n'importe qui se déclarer donateur et prendre la marque. C'est
// exactement la faille par laquelle tout compte se faisait administrateur avant le
// 2 septembre 2026 : la RLS bornait la ligne, jamais la valeur. Ici, rien n'est écrit
// avant que PayPal ait confirmé sa propre signature.
//
// ⛔ AUCUN MONTANT n'est lu ni gardé, pas même celui que la notification porte : PayPal
// tient ce livre-là, et la marque ne se gradue pas.
//
// ⚠️ La route est HORS du verrou de bêta (`proxy.ts`, `LIBRES`) : redirigée en 307 vers
// /chantier, elle mourrait en silence, et PayPal renoncerait au bout de ses tentatives
// sans que rien ne le dise ici. Même raison que pour la balise d'audience.

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

// ⚠️ `sandbox` sert à éprouver le montage avec un compte d'essai PayPal, sans argent
// réel. La production ne pose pas la variable et reste sur `live`.
function baseApi(): string {
  return process.env.PAYPAL_ENV === 'sandbox'
    ? 'https://api-m.sandbox.paypal.com'
    : 'https://api-m.paypal.com'
}

/** Un jeton d'accès, tiré des deux clés de l'application PayPal. */
async function jetonPayPal(): Promise<string | null> {
  const id = process.env.PAYPAL_CLIENT_ID
  const secret = process.env.PAYPAL_CLIENT_SECRET
  if (!id || !secret) return null
  const res = await fetch(`${baseApi()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })
  if (!res.ok) return null
  const json = await res.json().catch(() => null)
  return typeof json?.access_token === 'string' ? json.access_token : null
}

// Les cinq en-têtes par lesquels PayPal signe. Leur absence n'est pas une erreur de
// notre côté : c'est que la requête ne vient pas de PayPal.
const EN_TETES = [
  'paypal-auth-algo',
  'paypal-cert-url',
  'paypal-transmission-id',
  'paypal-transmission-sig',
  'paypal-transmission-time',
] as const

/**
 * PayPal vérifie sa propre signature.
 *
 * ⛔ On ne va PAS chercher le certificat nous-mêmes : `paypal-cert-url` vient de la
 * requête, donc de qui l'envoie, et une vérification qui suit une adresse fournie par
 * celui qu'elle contrôle ne contrôle rien. Passer par l'API de PayPal, avec nos propres
 * clés, retire cette question entière.
 */
async function signatureValide(entetes: Headers, evenement: unknown, jeton: string): Promise<boolean> {
  const valeurs: Record<string, string> = {}
  for (const nom of EN_TETES) {
    const v = entetes.get(nom)
    if (!v) return false
    valeurs[nom] = v
  }
  const res = await fetch(`${baseApi()}/v1/notifications/verify-webhook-signature`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${jeton}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      auth_algo: valeurs['paypal-auth-algo'],
      cert_url: valeurs['paypal-cert-url'],
      transmission_id: valeurs['paypal-transmission-id'],
      transmission_sig: valeurs['paypal-transmission-sig'],
      transmission_time: valeurs['paypal-transmission-time'],
      webhook_id: process.env.PAYPAL_WEBHOOK_ID,
      webhook_event: evenement,
    }),
  })
  if (!res.ok) return false
  const json = await res.json().catch(() => null)
  return json?.verification_status === 'SUCCESS'
}

/** La commande, allée chercher chez PayPal : c'est elle qui porte le donateur. */
async function lireLaCommande(id: string, jeton: string): Promise<unknown | null> {
  const res = await fetch(`${baseApi()}/v2/checkout/orders/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${jeton}` },
  })
  if (!res.ok) return null
  return res.json().catch(() => null)
}

export async function POST(request: Request) {
  // ⚠️ Sans les clés, on ne peut rien vérifier, donc on n'écrit rien. Répondre 200
  // plutôt qu'une erreur : PayPal ne doit pas réessayer un montage qui n'existe pas.
  if (!paypalConfigure()) {
    return NextResponse.json({ ok: false, raison: 'PayPal non configuré.' })
  }

  const evenement = (await request.json().catch(() => null)) as EvenementPayPal | null
  if (!evenement || typeof evenement !== 'object') {
    return NextResponse.json({ error: 'Charge illisible.' }, { status: 400 })
  }

  const jeton = await jetonPayPal()
  // ⚠️ 503 et non 401 : les clés sont là mais PayPal ne répond pas. Une erreur
  // temporaire mérite que PayPal réessaie, un refus non.
  if (!jeton) return NextResponse.json({ error: 'PayPal injoignable.' }, { status: 503 })

  if (!(await signatureValide(request.headers, evenement, jeton))) {
    return NextResponse.json({ error: 'Signature refusée.' }, { status: 401 })
  }

  const type = String(evenement.event_type ?? 'inconnu')
  await noterLaNotification(supabaseAdmin, type)

  // Vérifiée mais étrangère au don : la liaison est prouvée, il n'y a rien à inscrire.
  if (!estEvenementDeDon(evenement.event_type)) {
    return NextResponse.json({ ok: true, ignore: type })
  }

  const don = lireLeDon(evenement)
  if (!don) return NextResponse.json({ ok: true, ignore: 'sans référence' })

  // L'identité du donateur vit dans la COMMANDE, non dans l'encaissement. Un échec ici
  // n'empêche rien : le don s'inscrit sans compte et attend une main.
  let email = don.email
  let nom = don.nom
  let viaCommande = false
  if (!email && don.commande) {
    const commande = await lireLaCommande(don.commande, jeton)
    if (commande) {
      const donateur = donateurDeLaCommande(commande)
      if (donateur.email) { email = donateur.email; nom = donateur.nom ?? nom; viaCommande = true }
    }
  }

  // ⛔ Le rattachement N'EST PAS un préalable à l'inscription : le registre garde le don
  // quoi qu'il arrive, et c'est ce qui empêche un don de se perdre en silence.
  const userId = await compteParCourriel(supabaseAdmin, email).catch(() => null)

  const { error } = await supabaseAdmin.from('dons').insert({
    user_id: userId,
    email_donateur: email,
    nom_donateur: nom,
    reference: don.reference,
    recu_le: don.recuLe,
    source: 'paypal',
    note: noteDuDon(don, viaCommande),
  })

  // 23505 : la référence est unique, et PayPal REJOUE ses notifications tant qu'il n'a
  // pas eu de 200. Un doublon n'est donc pas une anomalie mais le fonctionnement même :
  // on répond que tout va bien, et rien n'est compté deux fois.
  if (error && error.code !== '23505') {
    console.error('Don PayPal : inscription refusée.', error)
    return NextResponse.json({ error: 'Inscription refusée.' }, { status: 500 })
  }

  // ⚠️ La marque ne se recalcule que sur une inscription NEUVE : sur un rejeu, le don
  // est déjà au registre et la date n'a pas bougé.
  if (!error && userId) await recalculerMarque(supabaseAdmin, userId)

  return NextResponse.json({ ok: true, inscrit: !error, rattache: Boolean(userId) })
}

// ⚠️ PayPal envoie parfois une requête de contrôle sur l'adresse d'un webhook. Y
// répondre évite qu'il tienne la liaison pour rompue.
export async function GET() {
  return NextResponse.json({ ok: true, service: 'notification de don' })
}
