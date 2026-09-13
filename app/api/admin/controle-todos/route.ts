// Écriture des tâches (todos) d'une section du centre de contrôle.
// La table `controle_sections` n'est lisible que par l'admin ; l'écriture passe ici,
// avec vérification admin serveur (charte §17, §30). Le client envoie le tableau
// complet des tâches d'une section, ET l'état d'où il est parti.
//
// ⛔ UNE LISTE DE TÂCHES NE SE TRONQUE JAMAIS, ET UNE TÂCHE NE SE JETTE PAS EN SILENCE.
// La route gardait les 200 premières tâches et écartait toute tâche de plus de 600 signes,
// quand « Qualité du texte » en compte 865, dont 282 plus longues, et « Corpus » 130, dont
// 15 (relevé du 13 septembre 2026) : un seul clic sur une case effaçait tout ce qui
// dépassait. Au-delà des bornes, la route REFUSE, et rien ne s'écrit.
//
// ⛔ ET ELLE REFUSE UNE LISTE PÉRIMÉE. Plusieurs sessions écrivent le journal des missions ;
// une page ouverte depuis une heure renvoyait une liste qui ne portait pas leurs tâches, et
// le dernier envoi gagnait. L'état de départ doit être celui de la base, sans quoi la route
// rend la liste réelle (409) et n'écrit rien.
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { estAdmin } from '@/app/lib/verifAdmin'
import { estAdminUtilisateur } from '@/app/lib/verifAdminUtilisateur'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type Todo = { texte: string; fait: boolean }

/** Des bornes contre l'accident, loin au-dessus de la donnée : la plus longue tâche compte
 *  16 251 signes, la plus longue liste 865 tâches. */
const TACHES_MAX = 5_000
const SIGNES_MAX = 50_000

/** La forme normale d'une liste : texte sans blancs de bord, tâches vides écartées. La même
 *  lecture sert la liste envoyée, l'état de départ et la base, sans quoi deux listes égales
 *  paraîtraient différentes. */
function normaliserTodos(v: unknown): Todo[] | null {
  if (!Array.isArray(v)) return null
  return v
    .map((x) => ({
      texte: String((x as { texte?: unknown })?.texte ?? '').trim(),
      fait: Boolean((x as { fait?: unknown })?.fait),
    }))
    .filter((t) => t.texte.length > 0)
}

function memeListe(a: Todo[], b: Todo[]): boolean {
  return a.length === b.length && a.every((t, i) => t.texte === b[i].texte && t.fait === b[i].fait)
}

export async function POST(request: Request) {
  if (!(await estAdminUtilisateur(request)) && !(await estAdmin())) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const cle = String(body?.cle ?? '').trim()
  if (!cle) return NextResponse.json({ error: 'Section manquante.' }, { status: 400 })

  const todos = normaliserTodos(body?.todos)
  if (!todos) return NextResponse.json({ error: 'Liste de tâches illisible.' }, { status: 400 })
  const avant = normaliserTodos(body?.avant)
  if (!avant) {
    return NextResponse.json({ error: 'État de départ manquant : rechargez la page, puis refaites le geste.' }, { status: 400 })
  }

  if (todos.length > TACHES_MAX) {
    return NextResponse.json({ error: `Liste refusée : ${todos.length} tâches, pour ${TACHES_MAX} au plus.` }, { status: 400 })
  }
  const tropLongue = todos.findIndex((t) => t.texte.length > SIGNES_MAX)
  if (tropLongue >= 0) {
    return NextResponse.json({ error: `Liste refusée : la tâche n° ${tropLongue + 1} dépasse ${SIGNES_MAX} signes.` }, { status: 400 })
  }

  const { data: actuelle, error: erreurLecture } = await supabaseAdmin
    .from('controle_sections')
    .select('todos')
    .eq('cle', cle)
    .maybeSingle()
  if (erreurLecture) return NextResponse.json({ error: erreurLecture.message }, { status: 500 })
  if (!actuelle) return NextResponse.json({ error: 'Section inconnue.' }, { status: 404 })

  const enBase = normaliserTodos(actuelle.todos) ?? []
  if (!memeListe(enBase, avant)) {
    return NextResponse.json({ error: 'La liste a changé depuis l’ouverture de la page.', todos: enBase }, { status: 409 })
  }

  const { data, error } = await supabaseAdmin
    .from('controle_sections')
    .update({ todos })
    .eq('cle', cle)
    .select('cle, todos')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, todos: data.todos })
}
