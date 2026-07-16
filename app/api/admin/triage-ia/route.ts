import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { estAdminUtilisateur } from '@/app/lib/verifAdminUtilisateur'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

type ColLien = 'lien_1' | 'lien_2' | 'lien_3' | 'lien_4'
type Decision = 'GARDER' | 'REJETER' | 'AMBIGU'

function idsLiensSeg(seg: any): { col: ColLien; idVerset: string }[] {
  const out: { col: ColLien; idVerset: string }[] = []
  ;(['lien_1', 'lien_2', 'lien_3', 'lien_4'] as ColLien[]).forEach(col => {
    String(seg[col] ?? '').split(';').map((v: string) => v.trim()).filter(Boolean)
      .forEach((idVerset: string) => out.push({ col, idVerset }))
  })
  return out
}

function verifiesSeg(seg: any): string[] {
  const v = seg.verifies
  if (Array.isArray(v)) return v
  if (typeof v === 'string') { try { return JSON.parse(v) } catch { return [] } }
  return []
}

function retirerId(valeur: string | null | undefined, idVerset: string) {
  return String(valeur ?? '').split(';').map((v: string) => v.trim()).filter(v => v && v !== idVerset).join('; ') || null
}

function ajouterId(valeur: string | null | undefined, idVerset: string) {
  const ids = String(valeur ?? '').split(';').map((v: string) => v.trim()).filter(Boolean)
  if (!ids.includes(idVerset)) ids.push(idVerset)
  return ids.join('; ')
}

const LABELS: Record<ColLien, string> = {
  lien_1: 'Citation directe',
  lien_2: 'Citation paraphrastique',
  lien_3: 'Commentaire doctrinal',
  lien_4: 'Écho thématique',
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

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

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
  idVerset: string,
  colOrigine: ColLien,
  decision: Decision
) {
  if (decision === 'AMBIGU') return // ne pas toucher

  const patch: Record<string, any> = {}
  ;(['lien_1', 'lien_2', 'lien_3', 'lien_4'] as ColLien[]).forEach(c => {
    patch[c] = retirerId(seg[c], idVerset)
  })
  if (decision === 'GARDER') {
    patch[colOrigine] = ajouterId(patch[colOrigine], idVerset)
  }

  const vv = verifiesSeg(seg).filter((v: string) => v !== idVerset)
  vv.push(idVerset)
  patch.verifies = vv

  const liensApres: string[] = []
  ;(['lien_1', 'lien_2', 'lien_3', 'lien_4'] as ColLien[]).forEach(c => {
    String(patch[c] ?? '').split(';').map((v: string) => v.trim()).filter(Boolean).forEach((v: string) => liensApres.push(v))
  })
  if (liensApres.every(v => vv.includes(v))) {
    patch.fiabilite = 'vérifié'
  }

  await supabaseAdmin.from('segments').update(patch).eq('id', seg.id)
}

// POST /api/admin/triage-ia
// Body: { offset: number, batchSize: number }
export async function POST(req: NextRequest) {
  const admin = await estAdminUtilisateur(req)
  if (!admin) return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })

  const { offset = 0, batchSize = 20 } = await req.json()

  // 1. Récupérer les segments probable avec leurs liens
  const { data: segs, error: segErr } = await supabaseAdmin
    .from('segments')
    .select('id, segment_texte, lien_1, lien_2, lien_3, lien_4, verifies')
    .eq('fiabilite', 'probable')
    .order('id')
    .range(offset, offset + 500)

  if (segErr) return NextResponse.json({ error: segErr.message }, { status: 500 })

  // 2. Construire les paires non-vérifiées
  const paires: { seg: any; col: ColLien; idVerset: string }[] = []
  for (const seg of (segs ?? [])) {
    const vv = verifiesSeg(seg)
    for (const { col, idVerset } of idsLiensSeg(seg)) {
      if (!vv.includes(idVerset)) {
        paires.push({ seg, col, idVerset })
        if (paires.length >= batchSize) break
      }
    }
    if (paires.length >= batchSize) break
  }

  if (paires.length === 0) {
    return NextResponse.json({ traite: 0, garde: 0, rejete: 0, ambigu: 0, termine: true })
  }

  // 3. Récupérer les textes des versets
  const idsVersets = [...new Set(paires.map(p => p.idVerset))]
  const { data: versets } = await supabaseAdmin
    .from('versets')
    .select('id_verset, ref, TR0001')
    .in('id_verset', idsVersets)
  const versetMap = new Map((versets ?? []).map((v: any) => [v.id_verset, { ref: v.ref, texte: v.TR0001 ?? '' }]))

  // 4. Appeler Claude
  const entrees = paires.map(p => ({
    segTexte: p.seg.segment_texte ?? '',
    versetRef: versetMap.get(p.idVerset)?.ref ?? p.idVerset,
    versetTexte: versetMap.get(p.idVerset)?.texte ?? '',
    typeSuggere: LABELS[p.col],
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
    await appliquerDecision(p.seg, p.idVerset, p.col, d)
  }))

  // 6. Compter les restants
  const { data: restantCount } = await supabaseAdmin.rpc('count_verifications_pending')

  return NextResponse.json({
    traite: paires.length,
    garde,
    rejete,
    ambigu,
    restant: (restantCount as number) ?? null,
    termine: paires.length < batchSize,
  })
}
