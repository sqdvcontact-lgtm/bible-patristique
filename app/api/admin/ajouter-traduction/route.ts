import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { estAdmin } from '@/app/lib/verifAdmin'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  if (!(await estAdmin())) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { nom, auteur, dates, bio_courte, date_publication, confession, langue, ordre, lignes } = body

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

    // 3. Insérer les versets par batch de 500
    let inseres = 0
    for (let i = 0; i < lignes.length; i += 500) {
      const batch = lignes.slice(i, i + 500)
      const payload = batch.map((l: { id_verset: string; texte: string }) => ({
        id_verset: l.id_verset,
        [trad_id]: l.texte,
      }))
      const { error: upsertErr } = await supabaseAdmin
        .from('versets')
        .upsert(payload, { onConflict: 'id_verset', ignoreDuplicates: false })
      if (upsertErr) {
        return NextResponse.json({ error: `Erreur upsert : ${upsertErr.message}` }, { status: 500 })
      }
      inseres += batch.length
    }

    // 4. Créer la ligne dans traductions
    const { error: tradErr } = await supabaseAdmin.from('traductions').insert({
      trad_id,
      nom,
      auteur: auteur || null,
      dates: dates || null,
      bio_courte: bio_courte || null,
      date_publication: date_publication || null,
      confession: confession || null,
      langue: langue || null,
      ordre: ordre ? parseInt(ordre) : 99,
    })
    if (tradErr) {
      return NextResponse.json({ error: `Traduction créée mais erreur metadata : ${tradErr.message}` }, { status: 500 })
    }

    return NextResponse.json({ ok: true, trad_id, inseres })
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? 'Erreur inconnue' }, { status: 500 })
  }
}