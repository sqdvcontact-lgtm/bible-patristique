// Déplace un fragment de texte d'un verset de la Segond vers le verset voisin.
//
// POURQUOI DÉPLACER LE TEXTE PLUTÔT QUE LE RATTACHEMENT. Ailleurs, quand la Segond est mal
// alignée, c'est sa NUMÉROTATION qui diverge et l'on corrige le canon_id (segond-realigne).
// Ici le défaut est autre : la source (corpus ebible) place la matière dans le mauvais
// verset, alors que les deux autres témoins la placent bien. Vérifié pour Luc 9 :
//   Sacy 9,43   « Mais Jesus ayant parlé avec menaces à l'esprit impur, guerit l'enfant »
//   Crampon 9,43 « Mais Jésus menaça l'esprit impur, guérit l'enfant et le rendit à son père »
// La Segond, elle, garde cette phrase dans son 9,42. Ce n'est donc pas un décalage de
// numérotation mais un mauvais découpage : c'est le texte qui doit bouger.
//
// CHAQUE DÉPLACEMENT LAISSE UNE NOTE. Modifier le contenu d'un verset est plus lourd que
// changer un rattachement : il faut que le lecteur puisse le savoir.
//
//   node scripts/segond-deplace-texte.mjs [--dry]
import { readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const D='C:/Users/quins/AppData/Local/Temp/claude/C--Users-quins-OneDrive-Bureau-bible-patristique/c36e26f7-816d-4b33-a05d-7d149dfb6372/scratchpad/sacy/'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const DRY = process.argv.includes('--dry')

// `depuis` : le verset qui contient le fragment de trop. `vers` : celui qui doit le recevoir.
// `debut` : le texte à détacher, à partir de là jusqu'à la fin du verset source.
// `place` : 'fin' ou 'tete' — où l'insérer dans le verset destinataire.
const DEPLACEMENTS = [
  { depuis: 'LUK.9.42', vers: 'LUK.9.43', place: 'tete',
    debut: 'Mais Jésus menaça l’esprit impur',
    note: 'La source de cette édition rattache cette phrase au verset précédent ; elle est ici rendue au verset que lui donnent la Vulgate comme le texte grec.' },
  { depuis: 'LUK.9.43', vers: 'LUK.9.44', place: 'tete',
    debut: 'Tandis que chacun était dans l’admiration',
    note: 'La source de cette édition rattache cette phrase au verset précédent ; elle est ici rendue au verset que lui donnent la Vulgate comme le texte grec.' },
]

const avant = []
for (const d of DEPLACEMENTS){
  const { data: a } = await sb.from('versets_v2').select('id,canon_id,texte,notes').eq('trad_id','TR0002').eq('canon_id', d.depuis)
  const { data: b } = await sb.from('versets_v2').select('id,canon_id,texte,notes').eq('trad_id','TR0002').eq('canon_id', d.vers)
  if (!a?.length || !b?.length){ console.error(`  ${d.depuis} ou ${d.vers} introuvable — rien fait`); continue }
  const src = a[0], dst = b[0]
  const i = src.texte.indexOf(d.debut)
  if (i < 0){ console.error(`  ${d.depuis} : « ${d.debut.slice(0,40)} » introuvable — rien fait`); continue }
  if (src.texte.indexOf(d.debut, i + 1) >= 0){ console.error(`  ${d.depuis} : ancre AMBIGUË — rien fait`); continue }

  const bouge = src.texte.slice(i).trim()
  const reste = src.texte.slice(0, i).trim()
  const neuf  = d.place === 'tete' ? `${bouge} ${dst.texte}`.trim() : `${dst.texte} ${bouge}`.trim()
  avant.push({ src, dst })
  console.log(`${DRY?'[DRY] ':''}${d.depuis} → ${d.vers}`)
  console.log(`   déplacé : ${bouge.slice(0,70)}`)
  console.log(`   reste   : ${reste.slice(-60)}`)
  if (!DRY){
    await sb.from('versets_v2').update({ texte: reste }).eq('id', src.id)
    await sb.from('versets_v2').update({ texte: neuf,
      notes: [dst.notes, d.note].filter(Boolean).join(' ') }).eq('id', dst.id)
  }
}
if (!DRY && avant.length){
  writeFileSync(D + `avant_segond_deplace_${new Date().toISOString().slice(0,10)}.json`, JSON.stringify(avant, null, 1))
  console.log('  écrit — état antérieur sauvegardé')
}
