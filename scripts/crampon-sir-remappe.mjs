// Remappe le Siracide du référent Crampon sur l'ossature du canon.
//
// LE DÉFAUT EST DANS L'IMPORT, ET IL EST GRAVE. L'édition Crampon suit le grec bref, omet la
// plupart des additions latines, et RENUMÉROTE ses versets en continu 1..n. Le canon, lui,
// réserve un numéro à chaque addition. Or le référent a été chargé POSITIONNELLEMENT —
// Crampon n → canon n. Résultat : dans 22 chapitres, la numérotation décroche AU MILIEU du
// chapitre, et tout ce qui suit est logé dans le mauvais créneau.
//
// LES CRÉNEAUX VIDES DE FIN DE CHAPITRE N'ÉTAIENT QUE LE RELIQUAT, pas le problème. J'ai
// longtemps cru à la signature « un cran de retard, on coupe le dernier verset » : ici c'est
// faux, et l'appliquer aurait aggravé le désordre. La preuve qui tranche : le DERNIER verset
// de Crampon correspond au DERNIER créneau du canon dans 17 chapitres sur 22 — donc rien ne
// manque à la fin, tout est décalé depuis le milieu.
//
// DEUX FIGURES, à ne pas confondre :
//   OMISSION — Crampon n'a pas ces versets. On ne coupe rien : on redistribue ses versets
//              en SAUTANT les créneaux des additions, qui restent légitimement vides.
//   SOUDURE  — Crampon réunit deux versets du canon dans un seul. On coupe, et la suite
//              se décale.
//
// N'APPLIQUE QUE LES CHAPITRES DE CONFIANCE HAUTE. Neuf autres restent à trancher : les
// positions exactes de leurs lacunes ne sont pas épinglées, et un remappage approximatif
// serait pire que le désordre actuel, car il aurait l'air juste.
//
//   node scripts/crampon-sir-remappe.mjs [--dry]
import { readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const D='C:/Users/quins/AppData/Local/Temp/claude/C--Users-quins-OneDrive-Bureau-bible-patristique/c36e26f7-816d-4b33-a05d-7d149dfb6372/scratchpad/sacy/'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const DRY = process.argv.includes('--dry')
const nu = s => (s||'').replace(/<\/?i>/g,'').replace(/\s+/g,' ').trim()

// Les créneaux du canon que Crampon N'A PAS — les additions latines qu'il omet.
// Relevés un par un par la lecture en regard de l'édition en ligne.
const OMISSIONS = {
  3:  [19, 25],
  10: [21],
  11: [15, 16],
  13: [14],
  16: [15, 16],
  19: [18, 19, 21],
  22: [9, 10],
  26: [19, 20, 21, 22, 23, 24, 25, 26, 27],
}

// Les versets de Crampon qui en réunissent deux du canon. `apres` = le créneau qui reste
// vide malgré la coupe, quand le chapitre porte en outre une addition finale.
const SOUDURES = {
  20: { v: 3,  coupe: null, vide: [32] },
  23: { v: 27, coupe: null, vide: [] },
  24: { v: 17, coupe: null, vide: [24] },
  25: { v: 11, coupe: null, vide: [] },
  48: { v: 24, coupe: null, vide: [] },
}

const matiere = d => nu(d.slice().sort((a,b)=>+a.canon_id.split('.')[2]-+b.canon_id.split('.')[2]).map(r=>r.texte).join(' '))
const NOTE_OMIS = `Cette édition suit le texte grec bref et n’a pas ce verset, propre à la tradition latine ; le créneau reste donc sans texte chez ce témoin.`

let traites = 0
for (const ch of Object.keys(OMISSIONS).map(Number).sort((a,b)=>a-b)){
  const { data } = await sb.from('versets_v2').select('id,canon_id,v_orig,v_orig_suffixe,texte,notes')
    .eq('trad_id','TR0003').eq('livre','SIR').like('canon_id', `SIR.${ch}.%`)
  const par = new Map(data.map(r => [+r.canon_id.split('.')[2], r]))
  const total = Math.max(...par.keys())
  const trous = OMISSIONS[ch]
  const avant = matiere(data)

  // Les versets réellement présents, dans l'ordre où l'import les a rangés (1..n).
  const presents = []
  for (let n = 1; n <= total; n++){ const r = par.get(n); if (r?.texte?.trim()) presents.push(r) }
  const cibles = []
  for (let n = 1; n <= total; n++) if (!trous.includes(n)) cibles.push(n)
  if (presents.length !== cibles.length){
    console.error(`✗ SIR ${ch} : ${presents.length} versets pour ${cibles.length} créneaux attendus — rien fait`)
    continue
  }
  if (presents.every((r, i) => +r.canon_id.split('.')[2] === cibles[i])){
    console.log(`⏭  SIR ${ch} : déjà en place`); continue
  }

  const maj = cibles.map((n, i) => ({ id: par.get(n).id, texte: presents[i].texte,
    v_orig: presents[i].v_orig, v_orig_suffixe: null, notes: presents[i].notes }))
  for (const n of trous) maj.push({ id: par.get(n).id, texte: '', v_orig: n, v_orig_suffixe: null, notes: NOTE_OMIS })

  console.log(`${DRY?'[DRY] ':''}SIR ${ch} — ${presents.length} versets redistribués, ${trous.length} créneau(x) laissé(s) vide(s) : ${trous.join(', ')}`)
  if (DRY) continue
  writeFileSync(D + `avant_sir_remap_${ch}_${Date.now()}.json`, JSON.stringify(data, null, 1))
  for (const m of maj){ const { id, ...c } = m
    const { error } = await sb.from('versets_v2').update(c).eq('id', id); if (error){ console.error('  ERR '+error.message); break } }
  const { data: ap } = await sb.from('versets_v2').select('canon_id,texte')
    .eq('trad_id','TR0003').eq('livre','SIR').like('canon_id', `SIR.${ch}.%`)
  const vides = ap.filter(r => !r.texte?.trim()).map(r => +r.canon_id.split('.')[2]).sort((a,b)=>a-b)
  console.log(`   matière identique : ${matiere(ap) === avant ? 'OUI' : '✗ NON'} · vides : ${vides.join(', ')}`)
  traites++
}
console.log(`\n${traites} chapitre(s) remappé(s). Les soudures (ch. ${Object.keys(SOUDURES).join(', ')}) attendent leur point de coupe, relevé sur le texte.`)
