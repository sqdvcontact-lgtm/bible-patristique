// Contrôle des scellés des fac-similés Bible 899.
//
// Les 1 488 images ne vivent plus dans le dépôt mais dans le seau Supabase
// `manuscrits`. Ce script retélécharge chacune d'elles et recalcule son empreinte
// SHA-256 pour la comparer à celle inscrite au manifeste. Il vérifie aussi le
// scellé du TEI lui-même.
//
//   npm run bible899:verifier
//
// Il tourne aussi chaque dimanche par GitHub Actions (verification-facsimiles.yml).
// Le seau étant public, aucune clé n'est nécessaire.
//
// Sortie : code 0 si tout concorde, 1 au premier écart. Les écarts sont énumérés.
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import path from 'node:path'

const RACINE = process.cwd()
const MANIFESTE = path.join(RACINE, 'data/manuscrits/bible-899/manifest.json')
const BASE = (process.env.NEXT_PUBLIC_BIBLE899_IMAGES
  ?? `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://oucotpxcjalwgetylfbz.supabase.co'}/storage/v1/object/public/manuscrits/bible-899`
).replace(/\/+$/u, '')

const empreinte = (donnees) => createHash('sha256').update(donnees).digest('hex')

const manifeste = JSON.parse(readFileSync(MANIFESTE, 'utf8'))
const images = [...manifeste.images, ...(manifeste.alternativeImages ?? [])]
console.log(`Scellés à contrôler : ${images.length} images, plus le TEI.`)
console.log(`Base : ${BASE}`)

const ecarts = []

const tei = readFileSync(path.join(RACINE, manifeste.teiPath))
const teiEmpreinte = empreinte(tei.toString('utf8').replace(/\r\n/gu, '\n'))
const teiBrut = empreinte(tei)
if (teiEmpreinte !== manifeste.teiSha256 && teiBrut !== manifeste.teiSha256) {
  ecarts.push(`TEI ${manifeste.teiPath} : empreinte différente du manifeste`)
}

let faites = 0
const file = [...images]
async function ouvrier() {
  for (;;) {
    const image = file.shift()
    if (!image) return
    try {
      const reponse = await fetch(`${BASE}/${image.file}`)
      if (!reponse.ok) ecarts.push(`${image.file} : HTTP ${reponse.status}`)
      else {
        const calculee = empreinte(Buffer.from(await reponse.arrayBuffer()))
        if (calculee !== image.sha256) ecarts.push(`${image.file} : empreinte différente`)
      }
    } catch (erreur) {
      ecarts.push(`${image.file} : ${erreur.message}`)
    }
    if (++faites % 200 === 0) console.log(`  ${faites}/${images.length}…`)
  }
}
await Promise.all(Array.from({ length: 8 }, ouvrier))

if (ecarts.length === 0) {
  console.log(`Tous les scellés concordent : ${images.length} images et le TEI.`)
  process.exit(0)
}
console.error(`${ecarts.length} écart(s) :`)
for (const e of ecarts.slice(0, 50)) console.error('  ' + e)
process.exit(1)
