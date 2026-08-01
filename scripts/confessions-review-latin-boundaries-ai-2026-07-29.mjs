import fs from 'node:fs'
import path from 'node:path'
import nextEnv from '@next/env'

const { loadEnvConfig } = nextEnv

loadEnvConfig(process.cwd())

const LATIN_ROOT = path.join('tmp', 'confessions-latin-csel-2026-07-29')
const FRENCH_ROOT = path.join('tmp', 'confessions-import-2026-07-29')
const apiKey = process.env.ANTHROPIC_API_KEY
if (!apiKey) throw new Error('ANTHROPIC_API_KEY manquante dans .env.local')

const latinPayload = JSON.parse(fs.readFileSync(path.join(LATIN_ROOT, 'confessions-csel-chapters.json'), 'utf8'))
const sourceMap = JSON.parse(fs.readFileSync(path.join(FRENCH_ROOT, 'confessions-source-map.json'), 'utf8'))
const body = sourceMap.filter((item) => item.nature === 'texte')
const paragraphsByChapter = new Map()
for (const item of body) {
  const key = `${item.ref_niv1}\u0000${item.ref_niv2}`
  if (!paragraphsByChapter.has(key)) paragraphsByChapter.set(key, [])
  paragraphsByChapter.get(key).push(item)
}
const chapterKeys = [...paragraphsByChapter.keys()]

function chapterPacket(chapter) {
  const key = chapterKeys[chapter.order - 1]
  const paragraphs = paragraphsByChapter.get(key)
  return {
    order: chapter.order,
    book: chapter.book_number,
    chapter: chapter.chapter_number,
    latin: chapter.text,
    french: paragraphs.map((item, index) => ({
      paragraph: index + 1,
      style: item.style,
      text: item.source_clean,
    })),
  }
}

function makeBatches(chapters, maximumCharacters = 36_000) {
  const batches = []
  let current = []
  let size = 0
  for (const chapter of chapters) {
    const packet = chapterPacket(chapter)
    const packetSize = JSON.stringify(packet).length
    if (current.length && size + packetSize > maximumCharacters) {
      batches.push(current)
      current = []
      size = 0
    }
    current.push(packet)
    size += packetSize
  }
  if (current.length) batches.push(current)
  return batches
}

async function requestReview(batch, attempt = 1) {
  const prompt = `Tu contrôles l'alignement paragraphe par paragraphe des Confessions de saint Augustin.
Pour chaque chapitre fourni, repère dans le texte latin le début sémantique exact de chacun des paragraphes de la traduction française d'Arnauld d'Andilly.

Règles impératives :
1. Retourne uniquement un tableau JSON valide, sans commentaire ni bloc Markdown.
2. Un objet par chapitre : {"order": nombre, "markers": [chaînes]}.
3. Le tableau markers doit contenir exactement autant d'éléments qu'il y a de paragraphes français.
4. Chaque marker est une citation exacte et consécutive de 12 à 60 caractères copiée dans le latin, commençant au tout premier caractère latin correspondant au paragraphe français.
5. Le premier marker est obligatoirement le début exact du chapitre latin.
6. Les markers doivent apparaître une seule fois si possible, dans le même ordre, sans chevauchement.
7. La traduction est libre : décide d'après le sens, pas d'après la longueur. Une frontière française peut couper une phrase latine. Les vers français séparés doivent recevoir chacun leur membre latin correspondant.

DONNÉES :
${JSON.stringify(batch)}`

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 90_000)
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.CLAUDE_TRIAGE_MODEL ?? 'claude-haiku-4-5-20251001',
        max_tokens: 5000,
        temperature: 0,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    if (!response.ok) throw new Error(`Anthropic ${response.status}: ${await response.text()}`)
    const payload = await response.json()
    const text = payload.content?.find((item) => item.type === 'text')?.text ?? ''
    const parsed = JSON.parse(text.trim().replace(/^```json\s*/i, '').replace(/\s*```$/, ''))
    if (!Array.isArray(parsed) || parsed.length !== batch.length) throw new Error('Nombre de chapitres incorrect')
    return { parsed, usage: payload.usage ?? {} }
  } catch (error) {
    if (attempt >= 3) throw error
    return requestReview(batch, attempt + 1)
  } finally {
    clearTimeout(timeout)
  }
}

function validateReview(chapter, review) {
  const packet = chapterPacket(chapter)
  if (review.order !== chapter.order) throw new Error(`Ordre de chapitre inattendu : ${review.order}`)
  if (!Array.isArray(review.markers) || review.markers.length !== packet.french.length) {
    throw new Error(`Nombre de marqueurs incorrect au chapitre ${chapter.order}`)
  }
  const offsets = []
  let cursor = 0
  for (const [index, marker] of review.markers.entries()) {
    if (typeof marker !== 'string' || marker.length < 5) throw new Error(`Marqueur invalide ${chapter.order}.${index + 1}`)
    const offset = chapter.text.indexOf(marker, cursor)
    if (offset < 0) throw new Error(`Marqueur introuvable ${chapter.order}.${index + 1}: ${marker}`)
    if (index === 0 && offset !== 0) throw new Error(`Premier marqueur décalé au chapitre ${chapter.order}`)
    offsets.push(offset)
    cursor = offset + marker.length
  }
  return { ...review, offsets }
}

const selectors = process.argv.slice(2).filter((arg) => /^\d+\.\d+$/.test(arg))
const selected = selectors.length
  ? latinPayload.chapters.filter((chapter) => selectors.includes(`${chapter.book_number}.${chapter.chapter_number}`))
  : latinPayload.chapters
const batches = makeBatches(selected)
const results = []
const usages = []
let next = 0

async function worker() {
  while (true) {
    const index = next++
    if (index >= batches.length) return
    const batch = batches[index]
    const { parsed, usage } = await requestReview(batch)
    for (let itemIndex = 0; itemIndex < batch.length; itemIndex++) {
      const chapter = latinPayload.chapters.find((candidate) => candidate.order === batch[itemIndex].order)
      results.push(validateReview(chapter, parsed[itemIndex]))
    }
    usages.push(usage)
    process.stdout.write(`lot ${index + 1}/${batches.length} validé (${batch.length} chapitres)\n`)
  }
}

await Promise.all(Array.from({ length: Math.min(4, batches.length) }, () => worker()))
results.sort((a, b) => a.order - b.order)
const output = {
  model: process.env.CLAUDE_TRIAGE_MODEL ?? 'claude-haiku-4-5-20251001',
  reviewed_at: new Date().toISOString(),
  chapters: results,
  usage: usages.reduce((sum, usage) => ({
    input_tokens: sum.input_tokens + (usage.input_tokens ?? 0),
    output_tokens: sum.output_tokens + (usage.output_tokens ?? 0),
  }), { input_tokens: 0, output_tokens: 0 }),
}
const suffix = selectors.length ? '-prototype' : ''
fs.writeFileSync(path.join(LATIN_ROOT, `confessions-latin-ai-boundaries${suffix}.json`), `${JSON.stringify(output, null, 2)}\n`)
console.log(JSON.stringify({ ok: true, chapters: results.length, batches: batches.length, usage: output.usage }, null, 2))
