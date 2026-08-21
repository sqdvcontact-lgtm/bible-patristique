// Écriture des tâches (todos) d'une section du centre de contrôle.
// La table `controle_sections` n'est lisible que par l'admin ; l'écriture passe ici,
// avec vérification admin serveur (charte §17, §30). Le client envoie le tableau
// complet des todos d'une section : dernier envoi gagnant.
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { estAdmin } from '@/app/lib/verifAdmin'
import { estAdminUtilisateur } from '@/app/lib/verifAdminUtilisateur'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type Todo = { texte: string; fait: boolean }

function nettoyerTodos(v: unknown): Todo[] {
  if (!Array.isArray(v)) return []
  return v
    .map((x) => ({
      texte: String((x as { texte?: unknown })?.texte ?? '').trim(),
      fait: Boolean((x as { fait?: unknown })?.fait),
    }))
    .filter((t) => t.texte.length > 0 && t.texte.length <= 600)
    .slice(0, 200)
}

export async function POST(request: Request) {
  if (!(await estAdminUtilisateur(request)) && !(await estAdmin())) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  const cle = String(body?.cle ?? '').trim()
  if (!cle) return NextResponse.json({ error: 'Section manquante.' }, { status: 400 })

  const todos = nettoyerTodos(body?.todos)

  const { data, error } = await supabaseAdmin
    .from('controle_sections')
    .update({ todos })
    .eq('cle', cle)
    .select('cle, todos')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, todos: data.todos })
}
