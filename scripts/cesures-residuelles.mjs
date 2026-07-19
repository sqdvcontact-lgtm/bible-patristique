// Trois césures de fin de ligne restées ouvertes, héritées de trains anciens dont le jeu de
// lots n'est plus reconstituable sans risque. La règle est portée dans la fusion (SOUDURES
// pour « magnificence » et « notre », LECTURES.ECC pour le troisième) ; ce script applique
// la même correction aux versets déjà chargés.
//
// Éz 35,14 « no- tre »        → notre
// 1 R 10,5 « ma- gnificence » → magnificence
// Qo 2,3   « en- sans »       → enfans, et NON « ensans » : le second fragment porte un
//   « s » long lu « s » au lieu de « f ». Le référent tranche — « les enfants des hommes ».
//   La césure cachait donc une seconde erreur, que le seul recollage aurait figée.
import { readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const D='C:/Users/quins/AppData/Local/Temp/claude/C--Users-quins-OneDrive-Bureau-bible-patristique/c36e26f7-816d-4b33-a05d-7d149dfb6372/scratchpad/sacy/'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const CAS = [
  { livre:'EZK', ch:35, v:14, de:'no- tre',        a:'notre' },
  { livre:'1KI', ch:10, v:5,  de:'ma- gnificence', a:'magnificence' },
  { livre:'ECC', ch:2,  v:3,  de:'en- sans',       a:'enfans' },
]
const avant = []
for (const c of CAS){
  const { data } = await sb.from('versets_v2').select('id,texte').eq('trad_id','TR0001')
    .eq('livre',c.livre).eq('ch_orig',c.ch).eq('v_orig',c.v)
  if (!data?.length){ console.log(`  ${c.livre} ${c.ch},${c.v} : introuvable`); continue }
  const r = data[0]
  // La passe typographique a pu insérer une insécable après le trait : on cible donc
  // « fragment + trait + ESPACE QUELCONQUE + fragment », et non une chaîne littérale.
  const [g,d] = c.de.split('- ')
  const re = new RegExp(g + '-s+' + d, 'g')
  if (!re.test(r.texte)){ console.log(`  ${c.livre} ${c.ch},${c.v} : « ${c.de} » absent — déjà corrigé ?`); continue }
  avant.push(r)
  const { error } = await sb.from('versets_v2').update({ texte: r.texte.replace(new RegExp(g + '-s+' + d, 'g'), c.a) }).eq('id', r.id)
  console.log(error ? `  ERR ${error.message}` : `  ${c.livre} ${c.ch},${c.v} : « ${c.de} » → « ${c.a} »`)
}
if (avant.length) writeFileSync(D + `avant_cesures_${new Date().toISOString().slice(0,10)}.json`, JSON.stringify(avant, null, 1))
