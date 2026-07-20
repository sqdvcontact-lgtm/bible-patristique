// Comble les créneaux vides du référent, à partir des diagnostics des lecteurs.
//
// LA SIGNATURE : un créneau vide en fin de chapitre trahit une traduction qui réunit, en
// amont, deux versets que le canon sépare — elle court donc un cran trop bas jusqu'au bout.
// On coupe le verset fautif et l'on décale la suite.
//
// TROIS GARDE-FOUS, chacun payé par une erreur de la journée :
//   • on SAUVEGARDE CE QU'ON ÉCRASE, non ce qu'on s'apprête à écrire. Un correctif antérieur
//     enregistrait ses valeurs neuves : la sauvegarde était sans usage à l'instant précis où
//     elle aurait servi.
//   • on VÉRIFIE LA MATIÈRE : le texte total du chapitre doit être identique avant et après,
//     aux espaces près. Relire sa propre sortie ne prouve rien — c'est cette comparaison qui
//     avait révélé 995 caractères devenus 491.
//   • on travaille par CANON_ID, jamais par ch_orig : Crampon numérote les psaumes à
//     l'hébraïque, et confondre les deux a déjà abîmé deux psaumes intacts.
//
//   node scripts/comble-creneaux-crampon.mjs <fichier.json> [--dry]
import { readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const D='C:/Users/quins/AppData/Local/Temp/claude/C--Users-quins-OneDrive-Bureau-bible-patristique/c36e26f7-816d-4b33-a05d-7d149dfb6372/scratchpad/sacy/'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const DRY = process.argv.includes('--dry')
const FICHIER = process.argv[2]
if (!FICHIER){ console.error('usage : <fichier de diagnostic .json> [--dry]'); process.exit(1) }

const nu = s => (s||'').replace(/<\/?i>/g,'').replace(/\s+/g,' ').trim()

for (const cas of JSON.parse(readFileSync(D + FICHIER, 'utf8')).cas){
  if (cas.incertain){ console.log(`⏭  ${cas.canon_vide} : laissé de côté — ${String(cas.incertain).slice(0,70)}`); continue }
  const [livre, ch] = cas.canon_vide.split('.')
  const { data } = await sb.from('versets_v2').select('id,canon_id,v_orig,v_orig_suffixe,texte,notes')
    .eq('trad_id','TR0003').eq('livre', livre).like('canon_id', `${livre}.${ch}.%`)
  const par = new Map(data.map(r => [+r.canon_id.split('.')[2], r]))
  const vide = +cas.canon_vide.split('.')[2]
  const src  = +cas.verset_a_couper.split('.')[2]
  if (par.get(vide)?.texte){ console.log(`⏭  ${cas.canon_vide} : n'est plus vide — rien fait`); continue }

  const s = par.get(src)
  let i = s.texte.indexOf(cas.coupe)
  if (i < 0){
    const souple = new RegExp(cas.coupe.trim().split(/\s+/)
      .map(m => m.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('\\s*'))
    const m = s.texte.match(souple); if (m) i = m.index
  }
  if (i < 0){ console.error(`✗  ${cas.canon_vide} : coupe introuvable dans ${cas.verset_a_couper} — rien fait`); continue }

  // On descend depuis le créneau vide : chaque verset prend le texte du précédent.
  const maj = []
  for (let n = vide; n >= src + 2; n--) maj.push({ id: par.get(n).id, texte: par.get(n-1).texte,
    v_orig: par.get(n-1).v_orig, v_orig_suffixe: par.get(n-1).v_orig_suffixe })
  maj.push({ id: par.get(src+1).id, texte: s.texte.slice(i).trim(), v_orig: s.v_orig, v_orig_suffixe: 'b',
    notes: `Cette édition réunit en un seul verset, numéroté ${ch}, ${s.v_orig}, ce que le canon compte en deux ; le verset a été coupé pour que les traductions restent alignées, et chaque part garde la numérotation d’origine.` })
  maj.push({ id: s.id, texte: s.texte.slice(0, i).trim(), v_orig: s.v_orig, v_orig_suffixe: 'a',
    notes: `Cette édition réunit en un seul verset, numéroté ${ch}, ${s.v_orig}, ce que le canon compte en deux ; le verset a été coupé pour que les traductions restent alignées, et chaque part garde la numérotation d’origine.` })

  const avantMatiere = nu(data.sort((a,b)=>+a.canon_id.split('.')[2]-+b.canon_id.split('.')[2]).map(r=>r.texte).join(' '))
  console.log(`${DRY?'[DRY] ':''}${cas.canon_vide} ← coupe de ${cas.verset_a_couper} · ${maj.length} versets touchés`)
  if (DRY) continue

  writeFileSync(D + `avant_comble_${livre}${ch}_${Date.now()}.json`, JSON.stringify(data, null, 1))
  for (const m of maj){
    const { id, ...champs } = m
    const { error } = await sb.from('versets_v2').update(champs).eq('id', id)
    if (error){ console.error('  ERR ' + error.message); break }
  }
  const { data: apres } = await sb.from('versets_v2').select('canon_id,texte')
    .eq('trad_id','TR0003').eq('livre', livre).like('canon_id', `${livre}.${ch}.%`)
  const apresMatiere = nu(apres.sort((a,b)=>+a.canon_id.split('.')[2]-+b.canon_id.split('.')[2]).map(r=>r.texte).join(' '))
  const vides = apres.filter(r => !r.texte || !r.texte.trim()).length
  console.log(`   matière identique : ${avantMatiere === apresMatiere ? 'OUI' : '✗ NON'} · créneaux vides restants : ${vides}`)
}
