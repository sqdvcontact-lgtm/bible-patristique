import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { estAdmin } from '@/app/lib/verifAdmin'
import { estAdminUtilisateur } from '@/app/lib/verifAdminUtilisateur'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type LigneTraduction = { id_verset: string; texte: string }

const attendre = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

async function rechargerCacheSchema() {
  await supabaseAdmin.rpc('exec_sql', { sql: `NOTIFY pgrst, 'reload schema';` })
  await attendre(750)
}

function sqlLiteral(valeur: string) {
  return `'${valeur.replace(/'/g, "''")}'`
}

export async function POST(req: Request) {
  if (!(await estAdminUtilisateur(req)) && !(await estAdmin())) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { nom, auteur, dates, bio_courte, commentaire_editorial, date_publication, confession, langue, ordre, lignes } = body

    if (!nom || !lignes || lignes.length === 0) {
      return NextResponse.json({ error: 'Nom et lignes CSV requis.' }, { status: 400 })
    }

    // 1. Générer le prochain trad_id (TR0005, TR0006…)
    const { data: existantes } = await supabaseAdmin
      .from('traductions')
      .select('trad_id')
      .order('trad_id', { ascending: false })
      .limit(1)

    let prochainNum = 1
    if (existantes && existantes.length > 0) {
      const dernier = existantes[0].trad_id as string
      const num = parseInt(dernier.replace('TR', ''), 10)
      if (!isNaN(num)) prochainNum = num + 1
    }
    const trad_id = `TR${String(prochainNum).padStart(4, '0')}`

    // 2. Créer la colonne dans versets via SQL brut
    const { error: colErr } = await supabaseAdmin.rpc('exec_sql', {
      sql: `ALTER TABLE versets ADD COLUMN IF NOT EXISTS "${trad_id}" TEXT;`
    })
    if (colErr) {
      // Fallback : essayer directement via l'API SQL
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
        },
        body: JSON.stringify({ sql: `ALTER TABLE versets ADD COLUMN IF NOT EXISTS "${trad_id}" TEXT;` })
      })
      if (!res.ok) {
        return NextResponse.json({ error: `Impossible de créer la colonne : ${colErr.message}` }, { status: 500 })
      }
    }
    await rechargerCacheSchema()

    // 3. Insérer les versets par batch de 500
    let inseres = 0
    let ignores = 0
    for (let i = 0; i < lignes.length; i += 500) {
      const batch = lignes.slice(i, i + 500)
      const ids = batch.map((l: LigneTraduction) => l.id_verset)
      const { data: versetsExistants, error: existErr } = await supabaseAdmin
        .from('versets')
        .select('id_verset')
        .in('id_verset', ids)
      if (existErr) {
        return NextResponse.json({ error: `Erreur vérification versets : ${existErr.message}` }, { status: 500 })
      }

      const idsExistants = new Set((versetsExistants ?? []).map(v => v.id_verset as string))
      const lignesExistantes = batch.filter((l: LigneTraduction) => idsExistants.has(l.id_verset))
      ignores += batch.length - lignesExistantes.length
      if (lignesExistantes.length === 0) continue

      const values = lignesExistantes
        .map((l: LigneTraduction) => `(${sqlLiteral(l.id_verset)}, ${sqlLiteral(l.texte)})`)
        .join(',\n')
      const { error: updateErr } = await supabaseAdmin.rpc('exec_sql', {
        sql: `
          UPDATE versets AS v
          SET "${trad_id}" = data.texte
          FROM (VALUES ${values}) AS data(id_verset, texte)
          WHERE v.id_verset = data.id_verset;
        `
      })
      if (updateErr) {
        return NextResponse.json({ error: `Erreur update : ${updateErr.message}` }, { status: 500 })
      }
      inseres += lignesExistantes.length
    }

    // 4. Créer la ligne dans traductions
    const { error: tradErr } = await supabaseAdmin.from('traductions').insert({
      trad_id,
      nom,
      auteur: auteur || null,
      dates: dates || null,
      bio_courte: bio_courte || null,
      commentaire_editorial: commentaire_editorial || null,
      date_publication: date_publication || null,
      confession: confession || null,
      langue: langue || null,
      ordre: ordre ? parseInt(ordre) : 99,
    })
    if (tradErr) {
      return NextResponse.json({ error: `Traduction créée mais erreur metadata : ${tradErr.message}` }, { status: 500 })
    }

    return NextResponse.json({ ok: true, trad_id, inseres, ignores })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur inconnue' }, { status: 500 })
  }
}
