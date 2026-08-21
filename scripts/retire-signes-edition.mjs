// Retire du texte les signes d'appareil de l'édition de 1730 : le pied-de-mouche ¶ (marque de
// paragraphe) et l'obèle † (appel de renvoi marginal).
//
// CE NE SONT PAS DU TEXTE. Ils renvoient à un appareil de notes marginales que nous n'avons
// pas ; isolés dans le corps du verset, ils ne veulent plus rien dire. Certains lots les
// avaient transcrits dans le texte, d'autres consignés en note — deux conventions dans le
// même corpus, ce qui est le pire état possible.
//
// L'INFORMATION N'EST PAS PERDUE : les notes de page des lots bruts les consignent, et
// l'état antérieur est sauvegardé avant écriture. Ce qui disparaît, c'est leur présence
// dans une colonne de lecture où ils ne peuvent que déconcerter.
//
//   node scripts/retire-signes-edition.mjs [--dry]
import { readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const D='C:/Users/quins/AppData/Local/Temp/claude/C--Users-quins-OneDrive-Bureau-bible-patristique/c36e26f7-816d-4b33-a05d-7d149dfb6372/scratchpad/sacy/'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const DRY = process.argv.includes('--dry')
const all=async q=>{const o=[];let f=0;for(;;){const{data,error}=await q.range(f,f+999);if(error)throw error;o.push(...data);if(data.length<1000)break;f+=1000}return o}

// On retire le signe ET l'espace qui le suit, puis on referme les espaces doubles laissées
// quand le signe était au milieu d'une phrase. Sans ce second passage, le texte garderait une
// cicatrice — une double espace là où il y avait une croix — plus discrète mais aussi fautive.
// ON NE TOUCHE À RIEN D'AUTRE. Une première version normalisait aussi les espaces devant
// « ; : ? ! » — mais ce sont celles de l'ÉDITION, que la transcription conserve délibérément
// (la consigne l'exige). Les « corriger » ici aurait modernisé la ponctuation de 294 versets
// sous couvert d'enlever une croix. On se borne donc à refermer l'espace double que le retrait
// du signe laisse derrière lui.
const nettoie = t => (t || '')
  .replace(/\s*[†¶]\s*/g, ' ')
  .replace(/ {2,}/g, ' ')
  .trim()

const maj = []
for (const L of [...new Set((await all(sb.from('versets_canon').select('livre'))).map(r=>r.livre))]){
  for (const r of await all(sb.from('versets_v2').select('id,livre,ch_orig,v_orig,texte').eq('trad_id','TR0001').eq('livre', L))){
    if (!/[†¶]/.test(r.texte || '')) continue
    const t = nettoie(r.texte)
    if (t !== r.texte) maj.push({ id: r.id, livre: r.livre, ch: r.ch_orig, v: r.v_orig, avant: r.texte, texte: t })
  }
}

console.log(`${DRY?'[DRY] ':''}versets portant ¶ ou † : ${maj.length}`)
for (const m of maj.slice(0, 6)) console.log(`  ${m.livre} ${m.ch},${m.v} : ${m.avant.slice(0,44)} → ${m.texte.slice(0,44)}`)
if (!DRY && maj.length){
  writeFileSync(D + `avant_signes_${new Date().toISOString().slice(0,10)}.json`, JSON.stringify(maj, null, 1))
  for (const m of maj){
    const { error } = await sb.from('versets_v2').update({ texte: m.texte }).eq('id', m.id)
    if (error){ console.error('  ERR ' + error.message); break }
  }
  console.log('  écrit — état antérieur sauvegardé')
}
