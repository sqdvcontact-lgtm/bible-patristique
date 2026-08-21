import { NextRequest, NextResponse } from 'next/server'
import { estAdminUtilisateur } from '@/app/lib/verifAdminUtilisateur'
import { estAdminServeur } from '@/app/lib/verifAdmin'

// Relecture IA d'un segment : la machine ne juge PAS le style ni le fond, seulement
// les défauts matériels de transcription qui justifient une reprise. Elle renvoie
// { reprendre, raison } ; le client, lui, force le rang « à reprendre » et consigne
// la raison en note. Réutilise l'infrastructure Anthropic déjà en place (triage-ia).
export async function POST(req: NextRequest) {
  if (!(await estAdminUtilisateur(req)) && !(await estAdminServeur())) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY manquante.' }, { status: 500 })

  const { texte } = await req.json()
  const contenu = typeof texte === 'string' ? texte.trim() : ''
  if (!contenu) return NextResponse.json({ error: 'Segment vide.' }, { status: 400 })

  const prompt = `Tu es correcteur d'éditions patristiques. Voici la transcription d'un segment d'œuvre.
Repère UNIQUEMENT les défauts MATÉRIELS qui justifieraient une reprise : caractères corrompus ou mauvais encodage, ponctuation aberrante, mots collés ou coupés, césures fautives, balises ou apparat résiduels, numéros de note égarés. N'évalue NI le style, NI le fond, NI l'orthographe d'époque (qui peut être volontaire).

Réponds UNIQUEMENT en JSON, sans autre texte :
{"reprendre": true ou false, "raison": "…"}
« raison » : en français, ≤ 160 caractères, décrit le défaut principal ; chaîne vide si reprendre vaut false.

TEXTE :
«${contenu.slice(0, 4000)}»`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 25_000)
  let res: Response
  try {
    res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: controller.signal,
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: process.env.CLAUDE_TRIAGE_MODEL ?? 'claude-haiku-4-5-20251001',
        max_tokens: 200,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
  } catch {
    clearTimeout(timeout)
    return NextResponse.json({ error: 'Appel IA interrompu (délai dépassé).' }, { status: 504 })
  }
  clearTimeout(timeout)

  if (!res.ok) {
    const err = await res.text()
    return NextResponse.json({ error: `Erreur IA ${res.status} : ${err.slice(0, 200)}` }, { status: 500 })
  }
  const json = await res.json()
  const brut: string = json.content?.[0]?.text ?? ''
  const match = brut.match(/\{[\s\S]*\}/)
  if (!match) return NextResponse.json({ error: 'Réponse IA illisible.' }, { status: 500 })
  try {
    const parsed = JSON.parse(match[0]) as { reprendre?: boolean; raison?: string }
    return NextResponse.json({
      reprendre: parsed.reprendre === true,
      raison: typeof parsed.raison === 'string' ? parsed.raison.slice(0, 200) : '',
    })
  } catch {
    return NextResponse.json({ error: 'JSON IA invalide.' }, { status: 500 })
  }
}
