import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { estAdmin } from '@/app/lib/verifAdmin'
import { estAdminUtilisateur } from '@/app/lib/verifAdminUtilisateur'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type LigneTraduction = { id_verset: string; texte: string }

function sqlLiteral(valeur: string) {
  return `'${valeur.replace(/'/g, "''")}'`
}

export async function POST(req: Request) {
  if (!(await estAdminUtilisateur(req)) && !(await estAdmin())) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { trad_id, lignes }: { trad_id: string; lignes: LigneTraduction[] } = body

    if (!trad_id || !/^TR\d{4}$/.test(trad_id)) {
      return NextResponse.json({ error: 'trad_id invalide.' }, { status: 400 })
    }
    if (!lignes || lignes.length === 0) {
      return NextResponse.json({ error: 'Aucune ligne fournie.' }, { status: 400 })
    }

let majCount = 0
    let ignores = 0

    for (let i = 0; i < lignes.length; i += 500) {
      const batch = lignes.slice(i, i + 500)
      const ids = batch.map(l => l.id_verset)

      const { data: versetsExistants } = await supabaseAdmin
        .from('versets')
        .select('id_verset')
        .in('id_verset', ids)

      const idsExistants = new Set((versetsExistants ?? []).map(v => v.id_verset as string))
      const lignesValides = batch.filter(l => idsExistants.has(l.id_verset))
      ignores += batch.length - lignesValides.length

      if (lignesValides.length === 0) continue

      const values = lignesValides
        .map(l => `(${sqlLiteral(l.id_verset)}, ${sqlLiteral(l.texte)})`)
        .join(',\n')

      const { error } = await supabaseAdmin.rpc('exec_sql', {
        sql: `
          UPDATE versets AS v
          SET "${trad_id}" = data.texte
          FROM (VALUES ${values}) AS data(id_verset, texte)
          WHERE v.id_verset = data.id_verset;
        `
      })
      if (error) {
        return NextResponse.json({ error: `Erreur lors de la mise à jour : ${error.message}` }, { status: 500 })
      }
      majCount += lignesValides.length
    }

    await supabaseAdmin
      .from('traductions')
      .update({ import_maj_le: new Date().toISOString() })
      .eq('trad_id', trad_id)

    return NextResponse.json({ ok: true, maj: majCount, ignores })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur inconnue' }, { status: 500 })
  }
}
