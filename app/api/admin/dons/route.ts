import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { estAdminUtilisateur } from '@/app/lib/verifAdminUtilisateur'
import { lireEtatReception, recalculerMarque } from '@/app/lib/mecenesServeur'

// LE REGISTRE DES DONS — et, par voie de conséquence, la marque de mécène.
//
// ⛔ LA MARQUE SE DÉDUIT DU REGISTRE, elle ne se pose jamais à la main.
// `profils.mecene_depuis` se recalcule après chaque écriture, sur la date du plus
// ancien don rattaché au compte : rattacher, détacher ou supprimer un don suffit, et
// les deux tables ne peuvent pas se contredire. C'est la même règle que partout
// ailleurs sur le site — deux surfaces qui décrivent le même fait divergent au premier
// réglage.
//
// ⛔ La table `dons` n'a AUCUNE politique RLS : elle ne se lit et ne s'écrit qu'avec la
// clé de service, par cette route et par la notification de PayPal
// (`/api/paypal/webhook`), et par rien d'autre. Un registre nominatif de dons n'a rien
// à faire dans un navigateur, fût-ce celui de l'administrateur — et cette route vérifie
// l'admin.
//
// ⛔ AUCUN MONTANT n'est jamais reçu ni gardé : PayPal tient ce livre-là. Le site n'a
// besoin que du FAIT du don, et c'est aussi ce qui rend la marque indivisible.

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type Don = {
  id: string
  user_id: string | null
  email_donateur: string | null
  nom_donateur: string | null
  reference: string | null
  recu_le: string
  source: string
  note: string | null
}

// ⛔ `recalculerMarque` vit dans `app/lib/mecenesServeur.ts`, partagée avec la
// notification de PayPal : les deux portes du registre doivent poser la marque de la
// même façon, sinon un don rattaché à la main et un don reçu automatiquement ne
// donneraient pas le même résultat, et il faudrait deviner lequel a raison.

/** Une date au format du jour (« 2026-09-03 »), ou aujourd'hui. */
function dateDon(v: unknown): string | null {
  const t = String(v ?? '').trim()
  if (!t) return new Date().toISOString().slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : null
}

function texteCourt(v: unknown, max: number): string | null {
  const t = String(v ?? '').trim()
  return t ? t.slice(0, max) : null
}

/** Le registre, du plus récent au plus ancien, avec le pseudonyme du compte rattaché. */
async function lireRegistre() {
  const { data: dons, error } = await supabaseAdmin
    .from('dons')
    .select('id, user_id, email_donateur, nom_donateur, reference, recu_le, source, note')
    .order('recu_le', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw error

  const ids = [...new Set((dons ?? []).map((d: Don) => d.user_id).filter((i): i is string => !!i))]
  const { data: profils } = ids.length
    ? await supabaseAdmin.from('profils').select('id, pseudo, mecene_depuis, pub_mecene').in('id', ids)
    : { data: [] as { id: string; pseudo: string | null; mecene_depuis: string | null; pub_mecene: boolean }[] }
  const parId = new Map((profils ?? []).map(p => [p.id, p]))

  return (dons ?? []).map((d: Don) => ({
    ...d,
    pseudo: d.user_id ? parId.get(d.user_id)?.pseudo ?? null : null,
    // ⚠️ Signalé à l'écran : un mécène qui a retiré sa marque ne doit pas passer pour
    // un rattachement manqué, sans quoi on la lui redonnerait de force.
    marque_retiree: d.user_id ? parId.get(d.user_id)?.pub_mecene === false : false,
  }))
}

export async function GET(request: Request) {
  if (!(await estAdminUtilisateur(request))) return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })

  const terme = new URL(request.url).searchParams.get('q')?.trim() ?? ''
  if (terme) {
    // La recherche d'un compte, sur le pseudonyme, l'adresse de connexion ou celle de
    // la page publique. Voir la fonction `admin_chercher_comptes` (migration du même
    // jour) : l'adresse de connexion vit dans `auth.users`, hors de PostgREST.
    const { data, error } = await supabaseAdmin.rpc('admin_chercher_comptes', { terme })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ comptes: data ?? [] })
  }

  try {
    // ⚠️ L'état de la réception part AVEC le registre, et non sur demande : une
    // liaison rompue ne se voit pas — plus aucun don n'arrive, ce que rend aussi bien
    // un site où personne ne donne. Il faut donc que l'écran le dise sans qu'on
    // l'ait cherché.
    const [dons, reception] = await Promise.all([lireRegistre(), lireEtatReception(supabaseAdmin)])
    return NextResponse.json({ dons, reception })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}

/** Inscrire un don. Le compte est facultatif : un donateur peut n'en avoir aucun. */
export async function POST(request: Request) {
  if (!(await estAdminUtilisateur(request))) return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })
  const corps = await request.json().catch(() => ({}))

  const recu_le = dateDon(corps?.recu_le)
  if (!recu_le) return NextResponse.json({ error: 'La date doit s’écrire 2026-09-03.' }, { status: 400 })

  const ligne = {
    user_id: (typeof corps?.user_id === 'string' && corps.user_id) || null,
    email_donateur: texteCourt(corps?.email_donateur, 200),
    nom_donateur: texteCourt(corps?.nom_donateur, 200),
    reference: texteCourt(corps?.reference, 100),
    recu_le,
    source: texteCourt(corps?.source, 40) ?? 'paypal',
    note: texteCourt(corps?.note, 500),
  }
  if (!ligne.user_id && !ligne.email_donateur && !ligne.nom_donateur)
    return NextResponse.json({ error: 'Un don doit au moins porter un compte, un nom ou une adresse.' }, { status: 400 })

  const { error } = await supabaseAdmin.from('dons').insert(ligne)
  // 23505 : la référence de transaction est unique, et c'est ce qui empêche de compter
  // deux fois le même don. Le dire plutôt que de rendre une erreur de base brute.
  if (error) return NextResponse.json(
    { error: error.code === '23505' ? 'Ce don est déjà inscrit (même référence de transaction).' : error.message },
    { status: error.code === '23505' ? 409 : 500 })

  await recalculerMarque(supabaseAdmin, ligne.user_id)
  return NextResponse.json({ ok: true, dons: await lireRegistre() })
}

/** Rattacher un don à un compte, ou l'en détacher (`user_id` nul). */
export async function PATCH(request: Request) {
  if (!(await estAdminUtilisateur(request))) return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })
  const corps = await request.json().catch(() => ({}))
  const id = String(corps?.id ?? '').trim()
  if (!id) return NextResponse.json({ error: 'Don manquant.' }, { status: 400 })
  const nouveau = (typeof corps?.user_id === 'string' && corps.user_id) || null

  const { data: avant } = await supabaseAdmin.from('dons').select('user_id').eq('id', id).maybeSingle()
  if (!avant) return NextResponse.json({ error: 'Ce don n’existe pas.' }, { status: 404 })

  const { error } = await supabaseAdmin.from('dons').update({ user_id: nouveau }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await recalculerMarque(supabaseAdmin, avant.user_id as string | null)
  await recalculerMarque(supabaseAdmin, nouveau)
  return NextResponse.json({ ok: true, dons: await lireRegistre() })
}

/** Effacer un don du registre. La marque suit : c'est le registre qui la porte. */
export async function DELETE(request: Request) {
  if (!(await estAdminUtilisateur(request))) return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })
  const corps = await request.json().catch(() => ({}))
  const id = String(corps?.id ?? '').trim()
  if (!id) return NextResponse.json({ error: 'Don manquant.' }, { status: 400 })

  const { data: avant } = await supabaseAdmin.from('dons').select('user_id').eq('id', id).maybeSingle()
  const { error } = await supabaseAdmin.from('dons').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await recalculerMarque(supabaseAdmin, (avant?.user_id as string | null) ?? null)
  return NextResponse.json({ ok: true, dons: await lireRegistre() })
}
