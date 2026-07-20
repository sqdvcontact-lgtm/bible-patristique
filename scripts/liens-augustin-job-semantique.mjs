// Passe SÉMANTIQUE sur Job — ce que le lexical ne pouvait pas faire.
//
// Le script `liens-augustin-job.mjs` a laissé 95 segments sans lien : de vraies
// citations de Job dont la graphie de Sacy ne partage aucun mot avec celle du
// traducteur d'Augustin. La charte §25.7 le disait — le mur est la paraphrase,
// pas le vocabulaire —, et §25.8 renvoyait ces cas à « un modèle de langue ».
//
// C'est cette passe. Chaque lemme a été lu et rapproché du verset de Job qu'il
// cite, par le sens et non par les mots, sous deux contraintes :
//   — l'ordre : le rattachement reste dans le chapitre commenté (ref_niv1) ;
//   — la prudence : on ne place que là où le sens désigne UN verset sans rival.
// Les cas à deux versets également plausibles sont laissés à l'éditeur, et les
// chapitres 40-42 (absents du canon, cf. plus bas) sont hors d'atteinte.
//
// Tout part en `douteux`, `arbitrage_requis` : un placement au jugement d'un
// modèle reste un indice fort pour l'humain, jamais un verdict.
//
//   node scripts/liens-augustin-job-semantique.mjs --dry
//   node scripts/liens-augustin-job-semantique.mjs
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map(m => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const OEUVRE = 'A0010O0100'
const DRY = process.argv.includes('--dry')

// segment_numero → canon_id, apparié à la lecture. Groupé par chapitre pour la
// relecture ; l'ordre des versets doit monter à l'intérieur de chaque chapitre.
const PLACEMENTS = {
  52: 'JOB.5.12',   64: 'JOB.5.27',
  82: 'JOB.6.22',
  101: 'JOB.7.15',  102: 'JOB.7.16',
  164: 'JOB.10.16',
  174: 'JOB.11.6',  181: 'JOB.11.14', 183: 'JOB.11.16', 184: 'JOB.11.17', 185: 'JOB.11.19',
  203: 'JOB.13.15', 213: 'JOB.13.18',
  222: 'JOB.14.3',  236: 'JOB.14.21',
  239: 'JOB.15.5',  242: 'JOB.15.12', 255: 'JOB.15.30', 259: 'JOB.15.35',
  263: 'JOB.16.6',
  277: 'JOB.17.1',
  327: 'JOB.19.29',
  330: 'JOB.20.4',  341: 'JOB.20.20',
  371: 'JOB.22.4',
  393: 'JOB.23.13',
  397: 'JOB.24.1',  412: 'JOB.24.9',
  423: 'JOB.26.2',  424: 'JOB.26.5',  425: 'JOB.26.6',  428: 'JOB.26.9',
  482: 'JOB.29.16',
  495: 'JOB.30.6',  511: 'JOB.30.23',
  529: 'JOB.31.19', 539: 'JOB.31.31',
  559: 'JOB.33.18', 562: 'JOB.33.25',
  581: 'JOB.34.26', 582: 'JOB.34.27', 583: 'JOB.34.28',
  592: 'JOB.35.4',  597: 'JOB.35.9',
  605: 'JOB.36.2',  628: 'JOB.36.25', 630: 'JOB.36.27', 631: 'JOB.36.28',
  690: 'JOB.38.31', 693: 'JOB.38.34', 696: 'JOB.38.37',
  722: 'JOB.39.23', 728: 'JOB.39.29',
}

// Les cibles doivent exister dans le texte réellement en base (Sacy) : sans quoi
// on rattacherait à un créneau fantôme. C'est la garde qui écarte d'office les
// chapitres 40-42, que Sacy ne porte pas.
const { data: sacy } = await sb.from('versets_v2').select('canon_id')
  .eq('trad_id', 'TR0001').eq('livre', 'JOB').not('canon_id', 'is', null)
const existe = new Set(sacy.map(v => v.canon_id))

const { data: segs } = await sb.from('segments')
  .select('id, segment_numero').eq('id_oeuvre', OEUVRE)
  .in('segment_numero', Object.keys(PLACEMENTS).map(Number))
const parNumero = new Map(segs.map(s => [s.segment_numero, s.id]))

// Ce que la passe précédente a déjà posé sur ces segments : on ne double pas.
const idsSeg = [...parNumero.values()]
const dejaVise = new Set()
for (let i = 0; i < idsSeg.length; i += 300) {
  const { data } = await sb.from('liens_bibliques')
    .select('segment_id, canon_id, type').in('segment_id', idsSeg.slice(i, i + 300))
  for (const l of data ?? []) dejaVise.add(`${l.segment_id}|${l.canon_id}|${l.type}`)
}

const liens = []
let manquantCanon = 0, manquantSeg = 0, deja = 0
for (const [num, canon_id] of Object.entries(PLACEMENTS)) {
  const segment_id = parNumero.get(+num)
  if (!segment_id) { console.warn(`✗ segment ${num} introuvable`); manquantSeg++; continue }
  if (!existe.has(canon_id)) { console.warn(`✗ ${canon_id} absent du texte Sacy (segment ${num})`); manquantCanon++; continue }
  const commun = {
    segment_id, canon_id, fiabilite: 'douteux', provenance: 'ia', arbitrage_requis: true,
    motif: `Placement sémantique (charte §25.8) : lemme rapproché de ${canon_id} par le sens, la graphie de Sacy ne partageant aucun mot. À vérifier.`,
  }
  for (const type of [1, 3]) {
    if (dejaVise.has(`${segment_id}|${canon_id}|${type}`)) { deja++; continue }
    liens.push({ ...commun, type,
      motif: type === 3 ? `Commentaire du verset cité en tête. ${commun.motif}` : commun.motif })
  }
  if (DRY) console.log(`  seg ${String(num).padStart(4)} → ${canon_id}`)
}

console.log(`\n${Object.keys(PLACEMENTS).length} placements · ${liens.length} liens à écrire`)
if (manquantCanon) console.log(`  ${manquantCanon} écartés : cible hors du texte Sacy`)
if (manquantSeg) console.log(`  ${manquantSeg} écartés : segment introuvable`)
if (deja) console.log(`  ${deja} déjà présents, ignorés`)

if (DRY) { console.log('\n(--dry : rien écrit)'); process.exit(0) }

for (let i = 0; i < liens.length; i += 500) {
  const { error } = await sb.from('liens_bibliques').insert(liens.slice(i, i + 500))
  if (error) throw error
}
console.log(`✓ ${liens.length} liens sémantiques écrits`)
