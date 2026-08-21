// Rétablit, chez le référent, les deux psaumes où le titre avait été soudé au premier verset.
//
// LE DÉFAUT EST DANS L'IMPORT, pas dans Crampon. L'édition numérote le titre à part — la
// source en ligne (jesusmarie.free.fr, Bible Crampon 1923) porte bien « 1 Psaume d'Asaph. »
// sur sa propre ligne, PUIS « 1 Dieu, Elohim, Yahweh parle… ». L'import a réuni les deux dans
// le créneau 1 ; tout le psaume s'est donc décalé d'un cran vers le haut, et le DERNIER
// créneau est resté vide. C'est ce créneau vide, et lui seul, qui a rendu le défaut visible.
//
// Les deux seuls cas du psautier : PSA.49.24 et PSA.100.9 étaient vides.
//
//   node scripts/crampon-psaumes-titre.mjs [--dry]
import { readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const D='C:/Users/quins/AppData/Local/Temp/claude/C--Users-quins-OneDrive-Bureau-bible-patristique/c36e26f7-816d-4b33-a05d-7d149dfb6372/scratchpad/sacy/'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const DRY = process.argv.includes('--dry')

// Le titre, et le texte qui doit ouvrir le créneau suivant. Recopiés de la source.
const CAS = [
  { ch: 49,  dernier: 24, titre: 'Psaume d’Asaph.',  suite: 'Dieu, Elohim, Yahweh parle' },
  { ch: 100, dernier: 9,  titre: 'Psaume de David.', suite: 'Je veux chanter la bonté' },
]

for (const c of CAS){
  const { data } = await sb.from('versets_v2').select('id,canon_id,texte')
    .eq('trad_id','TR0003').eq('livre','PSA').like('canon_id', `PSA.${c.ch}.%`)
  const par = new Map(data.map(r => [+r.canon_id.split('.')[2], r]))
  const p1 = par.get(1)
  const i = p1.texte.indexOf(c.suite)
  if (i < 0){ console.error(`Ps ${c.ch} : « ${c.suite} » introuvable dans le v.1 — rien fait`); continue }
  if (par.get(c.dernier)?.texte){ console.error(`Ps ${c.ch} : le dernier créneau n'est PAS vide — rien fait`); continue }

  // On descend depuis la fin : chaque verset n prend le texte du n-1, et le 2 prend la suite
  // du 1, qui se réduit au titre. Descendre évite d'écraser une valeur pas encore lue.
  const maj = []
  for (let n = c.dernier; n >= 2; n--){
    const src = n === 2 ? p1.texte.slice(i).trim() : par.get(n - 1).texte
    maj.push({ id: par.get(n).id, texte: src })
  }
  maj.push({ id: p1.id, texte: c.titre })

  console.log(`${DRY?'[DRY] ':''}Ps ${c.ch} — ${maj.length} versets décalés d'un cran ; v.1 = « ${c.titre} »`)
  if (!DRY){
    writeFileSync(D + `avant_crampon_PSA${c.ch}_${new Date().toISOString().slice(0,10)}.json`, JSON.stringify(data, null, 1))
    for (const m of maj){
      const { error } = await sb.from('versets_v2').update({ texte: m.texte }).eq('id', m.id)
      if (error){ console.error('  ERR ' + error.message); break }
    }
    console.log('  écrit — état antérieur sauvegardé')
  }
}
