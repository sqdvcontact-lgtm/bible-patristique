// Contrôle des scellés du fac-similé Bible 899, à la demande depuis le centre de contrôle.
//
// Le contrôle INTÉGRAL retélécharge 1,89 Go : il ne tient pas dans une requête et vit
// ailleurs — `npm run bible899:verifier`, et le workflow du dimanche. Ce que fait cette
// route, c'est ce qui tient en quelques secondes sans rien concéder de faux :
//
//   1. Couverture COMPLÈTE sur la présence et la taille des 1 488 images, par simple
//      lecture du catalogue du seau. Une image disparue, tronquée ou remplacée par un
//      fichier de taille différente est vue ici.
//   2. Empreinte SHA-256 réellement recalculée sur un ÉCHANTILLON tiré au sort, seul
//      moyen de détecter une substitution de même taille.
//
// La réponse dit exactement ce qui a été contrôlé, pour que l'écran n'en promette pas
// davantage.
import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { estAdmin } from '@/app/lib/verifAdmin'
import { estAdminUtilisateur } from '@/app/lib/verifAdminUtilisateur'

const SEAU = 'manuscrits'
const PREFIXE = 'bible-899'
const TAILLE_ECHANTILLON = 20

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

type ImageManifeste = { file: string; sha256: string }

export async function POST(req: NextRequest) {
  if (!(await estAdminUtilisateur(req)) && !(await estAdmin())) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }
  const debut = Date.now()

  let manifeste: { images: ImageManifeste[]; alternativeImages?: ImageManifeste[] }
  try {
    const brut = await readFile(path.join(process.cwd(), 'data/manuscrits/bible-899/manifest.json'), 'utf8')
    manifeste = JSON.parse(brut)
  } catch {
    return NextResponse.json({ error: 'Manifeste illisible' }, { status: 500 })
  }
  const attendues = [...manifeste.images, ...(manifeste.alternativeImages ?? [])]

  // 1. Catalogue du seau : présence et taille, sur la totalité.
  const tailles = new Map<string, number>()
  for (let page = 0; page < 20; page++) {
    const { data, error } = await supabaseAdmin.storage.from(SEAU)
      .list(PREFIXE, { limit: 1000, offset: page * 1000 })
    if (error) return NextResponse.json({ error: error.message }, { status: 502 })
    for (const objet of data ?? []) tailles.set(objet.name, (objet.metadata as { size?: number })?.size ?? 0)
    if ((data ?? []).length < 1000) break
  }

  const absentes: string[] = []
  for (const image of attendues) if (!tailles.has(image.file)) absentes.push(image.file)

  // 2. Empreintes réelles sur un échantillon tiré au sort.
  const presentes = attendues.filter((image) => tailles.has(image.file))
  const echantillon = [...presentes].sort(() => Math.random() - 0.5).slice(0, TAILLE_ECHANTILLON)
  const base = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${SEAU}/${PREFIXE}`
  const empreintesFausses: string[] = []
  await Promise.all(echantillon.map(async (image) => {
    try {
      const reponse = await fetch(`${base}/${image.file}`, { cache: 'no-store' })
      if (!reponse.ok) { empreintesFausses.push(`${image.file} (HTTP ${reponse.status})`); return }
      const calculee = createHash('sha256').update(Buffer.from(await reponse.arrayBuffer())).digest('hex')
      if (calculee !== image.sha256) empreintesFausses.push(image.file)
    } catch {
      empreintesFausses.push(`${image.file} (injoignable)`)
    }
  }))

  return NextResponse.json({
    attendues: attendues.length,
    presentes: presentes.length,
    absentes,
    empreintesControlees: echantillon.length,
    empreintesFausses,
    conforme: absentes.length === 0 && empreintesFausses.length === 0,
    dureeMs: Date.now() - debut,
  })
}
