// Réaligne la Segond dans Job (ch. 38 à 41) sur le canon.
//
// LE DÉFAUT. Le fichier source (corpus ebible, fra-fraLSG) clôt son chapitre 38 au v. 38,
// là où la Segond imprimée en compte 41 : les trois derniers versets basculent en tête du
// chapitre 39, et le décalage se propage jusqu'à la fin du chapitre 41. Même famille de
// défaut que celui repéré dans Néhémie — il est dans la SOURCE, pas dans l'import.
//
// CE QUI EST CORRIGÉ : le rattachement au canon (canon_id).
// CE QUI NE L'EST PAS : la numérotation d'origine (ch_orig / v_orig), qui reste celle de la
// source. On ne réécrit pas ce qu'une édition porte, fût-ce à tort ; on le rattache.
//
// HUIT VERSETS SONT ABSENTS DE LA SOURCE et ne seront pas fabriqués :
//   canon 39,28-30 (l'aigle : « Il habite les rochers », « De là il guette sa proie »,
//                   « Ses petits s'abreuvent de sang »)
//   canon 40,1-5   (« Yahweh s'adressant à Job », jusqu'à « deux fois, je n'ajouterai rien »)
// Contrôle arithmétique : Segond 38+30+28+25 = 121 ; canon 41+30+32+26 = 129 ; 129-121 = 8.
import { readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const D='C:/Users/quins/AppData/Local/Temp/claude/C--Users-quins-OneDrive-Bureau-bible-patristique/c36e26f7-816d-4b33-a05d-7d149dfb6372/scratchpad/sacy/'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const DRY = process.argv.includes('--dry')
const all=async q=>{const o=[];let f=0;for(;;){const{data}=await q.range(f,f+999);o.push(...data);if(data.length<1000)break;f+=1000}return o}

// Chaque borne a été vérifiée sur le contenu, en regard du référent :
//   S 39,1  « Chasses-tu la proie pour la lionne »        = canon 38,39
//   S 39,4  « Sais-tu quand les chèvres sauvages… »       = canon 39,1
//   S 40,1  « L'Éternel répondit à Job du milieu de la tempête » = canon 40,6
//   S 40,28 « Voici, on est trompé dans son attente »     = canon 41,1
//   S 41,25 « Il regarde avec dédain tout ce qui est élevé » = canon 41,26
const vers = (ch, v) => {
  if (ch === 39) return v <= 3 ? `JOB.38.${v + 38}` : `JOB.39.${v - 3}`
  if (ch === 40) return v <= 27 ? `JOB.40.${v + 5}` : 'JOB.41.1'
  if (ch === 41) return `JOB.41.${v + 1}`
  return `JOB.${ch}.${v}`
}

const S = (await all(sb.from('versets_v2').select('id,ch_orig,v_orig,canon_id,texte')
  .eq('trad_id','TR0002').eq('livre','JOB'))).filter(v => v.ch_orig >= 39 && v.ch_orig <= 41)
const canon = new Set((await all(sb.from('versets_canon').select('id').like('id','JOB.%'))).map(r => r.id))

const maj = [], hors = []
for (const v of S.sort((a,b)=>a.ch_orig-b.ch_orig||a.v_orig-b.v_orig)){
  const cible = vers(v.ch_orig, v.v_orig)
  if (!canon.has(cible)){ hors.push(`${v.ch_orig},${v.v_orig}→${cible}`); continue }
  if (cible !== v.canon_id) maj.push({ id: v.id, de: v.canon_id, vers: cible, ch: v.ch_orig, v: v.v_orig })
}
console.log(`${DRY?'[DRY] ':''}Segond Job — ${S.length} versets examinés, ${maj.length} à rattacher autrement`)
if (hors.length) console.log('  ⚠ hors canon : ' + hors.join(' '))
for (const m of maj.slice(0,4)) console.log(`  S ${m.ch},${m.v} : ${m.de} → ${m.vers}`)
console.log(`  … (${Math.max(0, maj.length-4)} autres)`)

// contrôle : aucune collision entre deux versets Segond sur un même créneau
const finaux = new Map()
for (const v of S){ const c = vers(v.ch_orig, v.v_orig); if (finaux.has(c)) console.log(`  ⚠ COLLISION sur ${c}`); finaux.set(c, v) }

// créneaux du canon laissés sans Segond dans la zone traitée
const zone = [...canon].filter(id => { const [,c,n] = id.split('.'); return (+c===38 && +n>=39) || (+c>=39 && +c<=41) })
const decouverts = zone.filter(id => !finaux.has(id)).sort()
console.log(`  créneaux sans Segond dans la zone : ${decouverts.length} → ${decouverts.join(' ')}`)

if (!DRY && maj.length){
  writeFileSync(D + `avant_segond_JOB_${new Date().toISOString().slice(0,10)}.json`, JSON.stringify(S, null, 1))
  for (const m of maj){
    const { error } = await sb.from('versets_v2').update({ canon_id: m.vers, alignement_verifie: true }).eq('id', m.id)
    if (error){ console.error('ERR '+error.message); break }
  }
  console.log('  écrit — sauvegarde de l’état antérieur faite')
}
