import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { erreur500 } from '@/app/lib/apiErreur'

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
    const urlSource = typeof body?.url_source === 'string' && body.url_source ? body.url_source.slice(0, 500) : null
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

    const { error } = await supabaseAdmin.from('signalements').insert(insertPayload)

    if (error) return erreur500(error, 'Erreur lors de l\'envoi du signalement.')

    return NextResponse.json({ ok: true })
  } catch (error) {
    return erreur500(error)
  }
}
