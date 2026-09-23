import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { erreur500 } from '@/app/lib/apiErreur'
import { checkRateLimit } from '@/app/lib/rateLimiter'

// ⛔ LA ROUTE ÉCRIT AVEC LA CLÉ DE SERVICE, ELLE SE BORNE DONC ELLE-MÊME (audit du
// 2026-09-22). Elle exige une session depuis le 2026-09-07, mais un compte suffisait
// ensuite à remplir la file de modération : quatre mille signes par envoi, sans aucune
// limite de débit. Deux freins, et ils ne disent pas la même chose — la CADENCE, contre
// la rafale, et le DOUBLON, contre le même signalement réenvoyé par impatience.
const SIGNALEMENTS_PAR_MINUTE = 5
const SIGNALEMENTS_PAR_JOUR = 50
const MINUTE_MS = 60_000
const JOUR_MS = 24 * 60 * 60_000
/** Au-delà, le même texte sur le même objet est une reprise, non un doublon. */
const FENETRE_DOUBLON_MINUTES = 30

export async function POST(request: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || (!serviceKey && !anonKey)) {
      return NextResponse.json({ error: 'Configuration Supabase incomplète.' }, { status: 500 })
    }

    const body = await request.json()
    const message = typeof body?.message === 'string' ? body.message.trim().slice(0, 4000) : ''
    const importanceStr = typeof body?.importance === 'string' ? body.importance : null
    const importance: number = importanceStr === 'bloquant' ? 3 : importanceStr === 'mineur' ? 1 : 2
    // Un chemin INTERNE seulement : l’adresse devient un lien cliquable dans la
    // modération, et ne doit pas pouvoir y planter un site tiers.
    const urlSource = typeof body?.url_source === 'string' && /^\/(?![/\\])/.test(body.url_source) ? body.url_source.slice(0, 500) : null
    const idSegmentRaw = body?.id_segment
    const idSegment = typeof idSegmentRaw === 'number' && Number.isFinite(idSegmentRaw)
      ? idSegmentRaw
      : typeof idSegmentRaw === 'string' && /^\d+$/.test(idSegmentRaw)
      ? Number(idSegmentRaw)
      : null
    const idVerset = typeof body?.id_verset === 'string' && body.id_verset.trim()
      ? body.id_verset.trim()
      : null
    // Signalement par référence canonique (page Polyglotte) : son modèle repose sur
    // versets_v2/versets_canon, sans id_verset au format de l'ancienne table. On accepte
    // alors une simple référence lisible (« Gn 3, 1 »), consignée en tête du message pour
    // que le modérateur sache de quel verset il s'agit.
    const reference = typeof body?.reference === 'string' && body.reference.trim()
      ? body.reference.trim().slice(0, 120)
      : null
    const profilPseudo = typeof body?.profil_pseudo === 'string' && body.profil_pseudo.trim()
      ? body.profil_pseudo.trim().slice(0, 80)
      : null

    if (!message) {
      return NextResponse.json({ error: 'message manquant' }, { status: 400 })
    }
    if (!idSegment && !idVerset && !reference && !profilPseudo) {
      return NextResponse.json({ error: 'Objet du signalement manquant.' }, { status: 400 })
    }

    const auth = request.headers.get('Authorization')
    const token = auth?.replace('Bearer ', '').trim()
    let userId: string | null = null

    if (!serviceKey) {
      return NextResponse.json({ error: 'Configuration Supabase incomplète.' }, { status: 500 })
    }
    const supabaseAdmin = createClient(supabaseUrl, serviceKey)

    if (token) {
      const { data } = await supabaseAdmin.auth.getUser(token)
      userId = data.user?.id ?? null
    }
    // Un signalement se fait à visage connu : toute écriture de lecteur exige un compte
    // (charte, « Compte requis pour interagir »). La garde côté client ne suffit pas,
    // n'importe qui pouvait appeler la route sans session et remplir la file.
    if (!userId) return NextResponse.json({ error: 'Connexion requise.' }, { status: 401 })

    // ⚠️ Le débit se compte PAR COMPTE, jamais par adresse : la route n'accepte que des
    // lecteurs identifiés, et deux d'entre eux peuvent partager une adresse.
    // ⛔ Les deux fenêtres se consultent l'une après l'autre, et la minute d'abord : elle
    // coupe la rafale sans entamer le quota du jour.
    if (!checkRateLimit(`signalement-min:${userId}`, SIGNALEMENTS_PAR_MINUTE, MINUTE_MS)) {
      return NextResponse.json(
        { error: 'Vous envoyez trop de signalements à la fois. Réessayez dans une minute.' },
        { status: 429 },
      )
    }
    if (!checkRateLimit(`signalement-jour:${userId}`, SIGNALEMENTS_PAR_JOUR, JOUR_MS)) {
      return NextResponse.json(
        { error: 'Vous avez atteint le nombre de signalements permis pour aujourd’hui.' },
        { status: 429 },
      )
    }

    let referenceStockee = reference
    if (profilPseudo) {
      const { data: profilCible } = await supabaseAdmin
        .from('profils')
        .select('id, pseudo')
        .eq('pseudo', profilPseudo)
        .maybeSingle()
      if (!profilCible) return NextResponse.json({ error: 'Profil introuvable.' }, { status: 404 })
      if (profilCible.id === userId) {
        return NextResponse.json({ error: 'Vous ne pouvez pas signaler votre propre profil.' }, { status: 400 })
      }
      referenceStockee = `Profil @${profilCible.pseudo}`
    }

    // Contrôle de forme de l'identifiant de verset : on accepte l'ancien format
    // (« B000139 ») ET le format canon issu de la bascule versets_v2 (« PSA.54.5 »,
    // « 1CO.7.38 ») — lettres, chiffres et points seulement. Il ne s'agit plus de se
    // prémunir d'une injection, seulement de ne pas consigner n'importe quoi.
    //
    // ⛔ ON NE CHERCHE PLUS LE SEGMENT LIÉ AU VERSET. La route parcourait
    // `segments.lien_1` à `lien_4` en `ilike '%id%'` pour renseigner `id_segment`.
    // Deux raisons de l'avoir retiré (2026-09-07) :
    //   1. ces quatre colonnes sont VIDES sur les 109 683 segments depuis que les liens
    //      vivent dans `liens_bibliques` (20 juillet 2026, charte §24.1) : la boucle ne
    //      trouvait plus jamais rien, et coûtait trois parcours complets d'une table de
    //      1,5 Go, soit près de cinq secondes d'attente à chaque signalement de verset ;
    //   2. la rétablir sur `liens_bibliques` serait pire : la modération localise un
    //      signalement par `id_segment` D'ABORD (app/admin/SectionModeration.tsx). Un
    //      lecteur qui signale « Gn 1, 1 » depuis la Bible serait alors envoyé vers un
    //      passage patristique au lieu de son verset. Le point de départ doit rester
    //      celui d'où le lecteur a parlé.
    //
    // ⚠️ Le contrôle reste borné au cas SANS segment, comme avant. La page d'œuvre
    // envoie les deux (`id_segment` + l'identifiant du verset lié, qui peut être un
    // uuid de `versets_v2`) : l'élargir refuserait ce signalement-là.
    if (!idSegment && idVerset && !/^[A-Z0-9.]{2,20}$/.test(idVerset)) {
      return NextResponse.json({ error: 'Format id_verset invalide.' }, { status: 400 })
    }

    // Faute de colonne dédiée, la référence de page ou de profil est portée en tête du
    // message : le modérateur la voit, et rien n'est perdu.
    const messageStocke = referenceStockee && !idSegment && !idVerset ? `[Réf. ${referenceStockee}] ${message}` : message
    const insertPayload: Record<string, unknown> = { message: messageStocke, importance, traite: false }
    if (idSegment !== null) insertPayload.id_segment = idSegment
    if (idVerset !== null) insertPayload.id_verset = idVerset
    if (userId !== null) insertPayload.user_id = userId
    if (urlSource !== null) insertPayload.url_source = urlSource

    // ⛔ UN DOUBLON EXACT ET RÉCENT SUR LE MÊME OBJET NE S'INSCRIT PAS DEUX FOIS. C'est le
    // geste ordinaire de qui n'a pas vu l'accusé et reclique : la file de modération y
    // gagnait deux fois le même texte, et le modérateur devait trancher lequel traiter.
    // ⚠️ Le contrôle porte sur le message STOCKÉ (référence en tête comprise) et sur
    // l'objet, non sur le seul texte : le même signalement sur deux versets est deux
    // signalements. Sa fenêtre est celle d'une reprise, pas celle d'un quota.
    // ⚠️ Son échec ne ferme pas la route : mieux vaut un doublon qu'un signalement perdu.
    const depuis = new Date(Date.now() - FENETRE_DOUBLON_MINUTES * MINUTE_MS).toISOString()
    let doublon = supabaseAdmin
      .from('signalements')
      .select('id')
      .eq('user_id', userId)
      .eq('message', messageStocke)
      .gte('created_at', depuis)
      .limit(1)
    doublon = idSegment !== null ? doublon.eq('id_segment', idSegment) : doublon.is('id_segment', null)
    doublon = idVerset !== null ? doublon.eq('id_verset', idVerset) : doublon.is('id_verset', null)
    const { data: dejaVu, error: erreurDoublon } = await doublon
    if (erreurDoublon) {
      console.error('[signalement] contrôle du doublon impossible :', erreurDoublon)
    } else if ((dejaVu?.length ?? 0) > 0) {
      // ⚠️ On répond OK : le lecteur a bien signalé, et le dire en erreur lui ferait croire
      // que son premier envoi s'est perdu.
      return NextResponse.json({ ok: true, doublon: true })
    }

    const { error } = await supabaseAdmin.from('signalements').insert(insertPayload)

    if (error) return erreur500(error, 'Erreur lors de l\'envoi du signalement.')

    return NextResponse.json({ ok: true })
  } catch (error) {
    return erreur500(error)
  }
}
