import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { estAdminUtilisateur } from '@/app/lib/verifAdminUtilisateur'
import { estAdminServeur } from '@/app/lib/verifAdmin'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type TypeLien = 1 | 2 | 3 | 4
type Decision = 'GARDER' | 'REJETER' | 'AMBIGU'

function verifiesSeg(seg: any): string[] {
  const v = seg.verifies
  if (Array.isArray(v)) return v
  if (typeof v === 'string') { try { return JSON.parse(v) } catch { return [] } }
  return []
}

const LABELS: Record<TypeLien, string> = {
  1: 'Citation directe',
  2: 'Citation paraphrastique',
  3: 'Commentaire doctrinal',
  4: 'Écho thématique',
}

async function classerAvecClaude(
  paires: { segTexte: string; versetRef: string; versetTexte: string; typeSuggere: string }[]
): Promise<Decision[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY manquante dans .env.local')

  const lignes = paires.map((p, i) =>
    `${i + 1}. [PÈRE] «${p.segTexte.slice(0, 300)}»\n   [BIBLE ${p.versetRef}] «${p.versetTexte.slice(0, 200)}»\n   Type suggéré: ${p.typeSuggere}`
  ).join('\n\n')

  const prompt = `Tu es un expert en Écriture Sainte et en littérature patristique.
Pour chaque paire ci-dessous (texte d'un Père de l'Église + verset biblique), détermine si le lien suggéré est correct.

Réponds UNIQUEMENT avec un tableau JSON d'exactement ${paires.length} éléments.
Chaque élément est une chaîne parmi : "GARDER", "REJETER", "AMBIGU"
- GARDER : le lien est clairement fondé (citation reconnaissable, référence évidente)
- REJETER : aucun lien réel entre les deux textes
- AMBIGU : le lien est possible mais incertain — à laisser à l'administrateur

${lignes}

Réponds uniquement avec le JSON, sans explication. Exemple : ["GARDER","REJETER","AMBIGU"]`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 25_000)

  let res: Response
  try {
    res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.CLAUDE_TRIAGE_MODEL ?? 'claude-haiku-4-5-20251001',
        max_tokens: 256,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
  } finally {
    clearTimeout(timeout)
  }

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Anthropic API error ${res.status}: ${err}`)
  }

  const json = await res.json()
  const texte = json.content?.[0]?.text ?? ''
  const match = texte.match(/\[[\s\S]*?\]/)
  if (!match) throw new Error(`Réponse Claude invalide : ${texte}`)
  const decisions: Decision[] = JSON.parse(match[0])
  if (decisions.length !== paires.length) throw new Error('Nombre de décisions incorrect')
  return decisions
}

async function appliquerDecision(
  seg: any,
  lienId: number,
  idVerset: string,
  decision: Decision
) {
  // AMBIGU : la machine ne tranche pas. Le lien reste en l'état et remonte à
  // l'éditeur — on le marque explicitement plutôt que de le laisser se confondre
  // avec ceux que personne n'a encore regardés.
  if (decision === 'AMBIGU') {
    await supabaseAdmin.from('liens_bibliques')
      .update({ arbitrage_requis: true }).eq('id', lienId)
    return
  }

  if (decision === 'REJETER') {
    await supabaseAdmin.from('liens_bibliques').delete().eq('id', lienId)
  } else {
    // GARDER : le type suggéré est confirmé, mais par une machine — « probable »,
    // et non « vérifié », qui reste réservé au jugement de l'éditeur.
    await supabaseAdmin.from('liens_bibliques')
      .update({ fiabilite: 'probable', provenance: 'ia', arbitrage_requis: false })
      .eq('id', lienId)
  }

  const vv = verifiesSeg(seg).filter((v: string) => v !== idVerset)
  vv.push(idVerset)
  await supabaseAdmin.from('segments').update({ verifies: vv }).eq('id', seg.id)
}

// POST /api/admin/triage-ia
// Body: { offset: number, batchSize: number }
export async function POST(req: NextRequest) {
  if (!(await estAdminUtilisateur(req)) && !(await estAdminServeur())) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  const { offset = 0, batchSize = 20 } = await req.json()
  const taille = Math.max(1, Math.min(50, Number.isInteger(batchSize) ? batchSize : 20))

  // 1. Les liens à trier : ceux qu'aucun éditeur n'a encore arrêtés.
  const { data: liens, error: segErr } = await supabaseAdmin
    .from('liens_bibliques')
    .select('id, segment_id, canon_id, type')
    .not('canon_id', 'is', null)
    .neq('fiabilite', 'vérifié')
    .eq('arbitrage_requis', false)
    .order('id')
    .range(offset, offset + 500)

  if (segErr) return NextResponse.json({ error: segErr.message }, { status: 500 })

  const { data: segsData } = await supabaseAdmin
    .from('segments')
    .select('id, segment_texte, verifies')
    .in('id', [...new Set((liens ?? []).map(l => l.segment_id))])
  const segParId = new Map((segsData ?? []).map((s: any) => [s.id, s]))

  // 2. Construire les paires que personne n'a encore passées en revue
  const paires: { seg: any; lienId: number; type: TypeLien; idVerset: string }[] = []
  for (const l of (liens ?? [])) {
    const seg = segParId.get(l.segment_id)
    if (!seg) continue
    if (verifiesSeg(seg).includes(l.canon_id)) continue
    paires.push({ seg, lienId: l.id, type: l.type as TypeLien, idVerset: l.canon_id })
    if (paires.length >= taille) break
  }

  if (paires.length === 0) {
    return NextResponse.json({ traite: 0, garde: 0, rejete: 0, ambigu: 0, termine: true })
  }

  // 3. Récupérer les textes des versets
  const idsVersets = [...new Set(paires.map(p => p.idVerset))]
  const { data: versets } = await supabaseAdmin
    .from('versets_lecture')
    .select('id_verset, ref, TR0001')
    .in('id_verset', idsVersets)
  const versetMap = new Map((versets ?? []).map((v: any) => [v.id_verset, { ref: v.ref, texte: v.TR0001 ?? '' }]))

  // 4. Appeler Claude
  const entrees = paires.map(p => ({
    segTexte: p.seg.segment_texte ?? '',
    versetRef: versetMap.get(p.idVerset)?.ref ?? p.idVerset,
    versetTexte: versetMap.get(p.idVerset)?.texte ?? '',
    typeSuggere: LABELS[p.type],
  }))

  let decisions: Decision[]
  try {
    decisions = await classerAvecClaude(entrees)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }

  // 5. Appliquer les décisions
  let garde = 0, rejete = 0, ambigu = 0
  await Promise.all(paires.map(async (p, i) => {
    const d = decisions[i]
    if (d === 'GARDER') garde++
    else if (d === 'REJETER') rejete++
    else ambigu++
    await appliquerDecision(p.seg, p.lienId, p.idVerset, d)
  }))

  // 6. Compter les restants
  const { data: restantCount } = await supabaseAdmin.rpc('count_verifications_pending')

  return NextResponse.json({
    traite: paires.length,
    garde,
    rejete,
    ambigu,
    restant: (restantCount as number) ?? null,
    termine: paires.length < taille,
  })
}
