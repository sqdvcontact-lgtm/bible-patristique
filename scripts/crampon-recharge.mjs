// Recharge Tobie et Judith du référent Crampon depuis une édition CORRECTEMENT DÉCOUPÉE.
//   node scripts/crampon-recharge.mjs TOB [--ecrire]
//
// Pourquoi. La source d'import d'origine (scrollmapper / FreCrampon) avait été ajustée à
// une ossature trop courte : le texte excédentaire de chaque chapitre était versé dans le
// dernier verset disponible — Tob 2,14 faisait 1 186 caractères et contenait dix versets.
//
// Ce n'est PAS un changement d'édition. Le texte des deux numérisations est identique mot
// pour mot (vérifié : 100 % du vocabulaire, mêmes comptes de mots sur cinq chapitres) ;
// seules les FRONTIÈRES manquaient à l'une. On reprend donc la même traduction, là où elle
// est encore numérotée verset par verset.
//
// L'ossature canonique n'est pas touchée : les versets qui ont un créneau le reçoivent,
// les autres deviennent surnuméraires (canon_id nul) en gardant leur numérotation propre.
import { readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
import { corrigerTypographie } from './typographie.mjs'
const D = 'C:/Users/quins/AppData/Local/Temp/claude/C--Users-quins-OneDrive-Bureau-bible-patristique/c36e26f7-816d-4b33-a05d-7d149dfb6372/scratchpad/sacy/'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const all = async q => { const o=[]; let f=0; while(true){ const {data,error}=await q.range(f,f+999); if(error)throw error; o.push(...data); if(data.length<1000)break; f+=1000 } return o }

const CODE = process.argv[2]
const ECRIRE = process.argv.includes('--ecrire')

const src = JSON.parse(readFileSync(D + `crampon_${CODE}_source.json`, 'utf8'))
const canon = new Set((await all(sb.from('versets_canon').select('id').eq('livre', CODE).order('id'))).map(r => r.id))

const lignes = []
for (const ch of Object.keys(src).map(Number).sort((a,b)=>a-b))
  for (const v of src[ch]){
    const cid = `${CODE}.${ch}.${v.v}`
    lignes.push({
      trad_id: 'TR0003', livre: CODE, ch_orig: ch, v_orig: v.v,
      texte: corrigerTypographie(v.texte),
      canon_id: canon.has(cid) ? cid : null,
      canon_id_fin: null, est_suscription: false,
      notes: canon.has(cid) ? null
        : 'Verset hors ossature canonique : l’édition en compte davantage que le canon pour ce chapitre. Numérotation propre à l’édition conservée dans ch_orig / v_orig.',
      alignement_verifie: true,
    })
  }

const surnum = lignes.filter(l => !l.canon_id)
console.log(`╔═ ${CODE} — rechargement du référent depuis une édition découpée\n`)
console.log(`  versets de la source        : ${lignes.length}`)
console.log(`  reçoivent un créneau canon  : ${lignes.length - surnum.length}`)
console.log(`  surnuméraires               : ${surnum.length}`)
console.log(`  créneaux du canon           : ${canon.size}`)
if (canon.size !== lignes.length - surnum.length)
  console.log(`  ⚠ ${canon.size - (lignes.length - surnum.length)} créneau(x) du canon sans texte`)
console.log(`\n  surnuméraires : ${surnum.map(l => `${l.ch_orig},${l.v_orig}`).join(' ')}`)

if (!ECRIRE){ console.log('\n[simulation] — relancer avec --ecrire'); process.exit(0) }

// sauvegarde de l'état antérieur (charte §23.10)
const avant = await all(sb.from('versets_v2').select('*').eq('trad_id','TR0003').eq('livre',CODE).order('canon_id'))
const f = D + `avant_TR0003_${CODE}_${new Date().toISOString().slice(0,10)}_bis.json`
writeFileSync(f, JSON.stringify(avant, null, 1))
console.log(`\n  état antérieur sauvegardé : ${avant.length} lignes → ${f.split('/').pop()}`)

await sb.from('versets_v2').delete().eq('trad_id','TR0003').eq('livre',CODE)
let n = 0
for (let i = 0; i < lignes.length; i += 500){
  const { error } = await sb.from('versets_v2').insert(lignes.slice(i, i+500))
  if (error){ console.error('ERR ' + error.message); break }
  n += lignes.slice(i, i+500).length
}
console.log(`  inséré : ${n}`)
