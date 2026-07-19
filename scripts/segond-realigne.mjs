// Réaligne la Segond sur le canon, livre par livre.
//
// LE DÉFAUT EST TOUJOURS LE MÊME, et il est dans la SOURCE (corpus ebible, fra-fraLSG),
// non dans l'import : le fichier numérote selon l'hébreu là où le canon suit une autre
// division, et il lui manque en outre des versets. On corrige le RATTACHEMENT au canon ;
// on ne réécrit jamais ch_orig / v_orig, qui restent ceux de la source.
//
//   node scripts/segond-realigne.mjs [--dry]
import { readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const D='C:/Users/quins/AppData/Local/Temp/claude/C--Users-quins-OneDrive-Bureau-bible-patristique/c36e26f7-816d-4b33-a05d-7d149dfb6372/scratchpad/sacy/'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const DRY = process.argv.includes('--dry')
const all=async q=>{const o=[];let f=0;for(;;){const{data}=await q.range(f,f+999);o.push(...data);if(data.length<1000)break;f+=1000}return o}

// Chaque borne a été vérifiée sur le CONTENU, en regard du référent.
const PLANS = {
  // DANIEL. La Segond ignore le cantique des trois enfants (canon 3,24-90) : sa numérotation
  // reprend donc 67 versets plus tôt. Elle range ensuite dans son chapitre 4 les trois
  // versets que le canon clôt au chapitre 3.
  //   S 3,24 « Alors le roi Nebucadnetsar fut effrayé »        = canon 3,91
  //   S 3,30 « le roi fit prospérer Schadrac »                 = canon 3,97
  //   S 4,1  « Nebucadnetsar, roi, à tous les peuples »        = canon 3,98
  //   S 4,4  « Moi, Nebucadnetsar, je vivais tranquille »      = canon 4,1
  //   S 6,1  « Darius trouva bon d'établir cent vingt satrapes » = canon 6,2
  //   S 6,28 « Daniel prospéra sous le règne de Darius »       = canon 6,29
  DAN: v => {
    if (v.ch_orig === 3 && v.v_orig >= 24) return `DAN.3.${v.v_orig + 67}`
    if (v.ch_orig === 4) return v.v_orig <= 3 ? `DAN.3.${v.v_orig + 97}` : `DAN.4.${v.v_orig - 3}`
    if (v.ch_orig === 6) return `DAN.6.${v.v_orig + 1}`
    return `DAN.${v.ch_orig}.${v.v_orig}`
  },
  // ZACHARIE. Le canon clôt son chapitre 1 quatre versets plus loin que la source, qui
  // ne les a pas : tout le chapitre 2 est donc décalé.
  //   S 2,1 « Je levai les yeux… un homme tenant un cordeau » = canon 2,5
  ZEC: v => (v.ch_orig === 2 ? `ZEC.2.${v.v_orig + 4}` : `ZEC.${v.ch_orig}.${v.v_orig}`),
  // OSÉE. Le canon ouvre son chapitre 14 sur « Samarie sera punie », que la source n'a pas :
  // tout le chapitre est donc décalé d'un cran.
  //   S 14,1 « Israël, reviens à l'Éternel » = canon 14,2
  HOS: v => (v.ch_orig === 14 ? `HOS.14.${v.v_orig + 1}` : `HOS.${v.ch_orig}.${v.v_orig}`),
  // JOËL. La source compte trois chapitres, le canon quatre. Son chapitre 3 est le
  // quatrième du canon.
  //   S 3,1 « Car voici, en ces jours… quand je ramènerai les captifs » = canon 4,1
  JOL: v => (v.ch_orig === 3 ? `JOL.4.${v.v_orig}` : `JOL.${v.ch_orig}.${v.v_orig}`),
}

for (const [code, vers] of Object.entries(PLANS)){
  const S = await all(sb.from('versets_v2').select('id,ch_orig,v_orig,canon_id,texte').eq('trad_id','TR0002').eq('livre',code))
  const canon = new Set((await all(sb.from('versets_canon').select('id').like('id', code+'.%'))).map(r => r.id))
  const maj = [], hors = [], finaux = new Map()
  for (const v of S.sort((a,b)=>a.ch_orig-b.ch_orig||a.v_orig-b.v_orig)){
    const cible = vers(v)
    if (!canon.has(cible)){ hors.push(`${v.ch_orig},${v.v_orig}→${cible}`); continue }
    if (finaux.has(cible)) console.log(`  ⚠ COLLISION sur ${cible}`)
    finaux.set(cible, v)
    if (cible !== v.canon_id) maj.push({ id: v.id, de: v.canon_id, vers: cible })
  }
  const decouverts = [...canon].filter(id => !finaux.has(id)).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}))
  console.log(`\n${DRY?'[DRY] ':''}${code} — ${S.length} versets · ${maj.length} à rattacher autrement`)
  if (hors.length) console.log(`  ⚠ hors canon : ${hors.join(' ')}`)
  console.log(`  créneaux sans Segond : ${decouverts.length}` + (decouverts.length && decouverts.length <= 12 ? ' → ' + decouverts.join(' ') : ''))
  if (!DRY && maj.length){
    writeFileSync(D + `avant_segond_${code}_${new Date().toISOString().slice(0,10)}.json`, JSON.stringify(S, null, 1))
    for (const m of maj){
      const { error } = await sb.from('versets_v2').update({ canon_id: m.vers, alignement_verifie: true }).eq('id', m.id)
      if (error){ console.error('  ERR '+error.message); break }
    }
    console.log('  écrit — sauvegarde de l’état antérieur faite')
  }
}
