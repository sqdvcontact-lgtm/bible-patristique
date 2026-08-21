// Deux cas du référent que le combleur générique ne sait pas traiter, chacun pour sa raison.
//
// DEU 5 — Crampon numérote le Décalogue à l'HÉBRAÏQUE (30 versets), le canon à la Vulgate
// (33). Son v. 17 réunit à lui seul QUATRE versets du canon. Trois coupes dans un seul
// verset, puis tout le reste décalé de trois crans.
// L'édition en ligne imprime elle-même les équivalences (« (Vulgate 18) », « (Vulg. 19) »…) :
// la preuve est dans la source, elle n'est pas déduite.
//
// JOS 21 — CE N'EST PAS UNE SOUDURE MAIS UNE OMISSION. Crampon saute les deux versets des
// villes de Ruben. Décaler sans le savoir aurait déplacé le trou au mauvais endroit : après
// correction, JOS.21.36 et 37 restent VIDES, et c'est le bon état.
// Contre-épreuve interne trouvée par le lecteur : le v. 38 totalise « douze villes » alors
// qu'il n'en énumère que huit — les quatre villes de Ruben manquent au texte, pas au compte.
//
//   node scripts/crampon-deu5-jos21.mjs [--dry]
import { readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const D='C:/Users/quins/AppData/Local/Temp/claude/C--Users-quins-OneDrive-Bureau-bible-patristique/c36e26f7-816d-4b33-a05d-7d149dfb6372/scratchpad/sacy/'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const DRY = process.argv.includes('--dry')
const nu = s => (s||'').replace(/\s+/g,' ').trim()

async function chapitre(livre, ch){
  const { data } = await sb.from('versets_v2').select('id,canon_id,v_orig,v_orig_suffixe,texte,notes')
    .eq('trad_id','TR0003').eq('livre', livre).like('canon_id', `${livre}.${ch}.%`)
  return { data, par: new Map(data.map(r => [+r.canon_id.split('.')[2], r])) }
}
const matiere = d => nu(d.slice().sort((a,b)=>+a.canon_id.split('.')[2]-+b.canon_id.split('.')[2]).map(r=>r.texte).join(' '))

// ── DEU 5 ────────────────────────────────────────────────────────────────────────────────
{
  const { data, par } = await chapitre('DEU', 5)
  const avant = matiere(data)
  const v17 = par.get(17)
  const coupes = ['Tu ne commettras point d’adultère.', 'Tu ne déroberas point.',
                  'Tu ne porteras point de faux témoignage contre ton prochain.']
  const idx = coupes.map(c => v17.texte.indexOf(c))
  if (idx.some(i => i < 0) || par.get(33)?.texte){
    console.error('DEU 5 : coupes introuvables ou chapitre déjà traité — rien fait')
  } else {
    const parts = [v17.texte.slice(0, idx[0]), v17.texte.slice(idx[0], idx[1]),
                   v17.texte.slice(idx[1], idx[2]), v17.texte.slice(idx[2])].map(s => s.trim())
    const maj = []
    for (let n = 33; n >= 21; n--) maj.push({ id: par.get(n).id, texte: par.get(n-3).texte,
      v_orig: par.get(n-3).v_orig, v_orig_suffixe: null })
    const note = `Cette édition numérote le Décalogue selon l’hébreu et réunit en son verset 17 ce que le canon compte en quatre ; le verset a été coupé pour que les traductions restent alignées, et chaque part garde la numérotation d’origine.`
    for (let k = 0; k < 4; k++) maj.push({ id: par.get(17 + k).id, texte: parts[k],
      v_orig: 17, v_orig_suffixe: 'abcd'[k], notes: note })
    console.log(`${DRY?'[DRY] ':''}DEU 5 — ${maj.length} versets touchés (3 coupes dans le v. 17, décalage de 3)`)
    if (!DRY){
      writeFileSync(D + `avant_crampon_DEU5_${Date.now()}.json`, JSON.stringify(data, null, 1))
      for (const m of maj){ const { id, ...c } = m
        const { error } = await sb.from('versets_v2').update(c).eq('id', id); if (error){ console.error('  ERR '+error.message); break } }
      const { data: ap } = await chapitre('DEU', 5).then(x => ({ data: x.data }))
      console.log(`   matière identique : ${matiere(ap) === avant ? 'OUI' : '✗ NON'} · vides : ${ap.filter(r=>!r.texte?.trim()).length}`)
    }
  }
}

// ── JOS 21 ───────────────────────────────────────────────────────────────────────────────
{
  const { data, par } = await chapitre('JOS', 21)
  const avant = matiere(data)
  if (par.get(45)?.texte || !par.get(36)?.texte){
    console.error('JOS 21 : état inattendu — rien fait')
  } else {
    const maj = []
    for (let n = 45; n >= 38; n--) maj.push({ id: par.get(n).id, texte: par.get(n-2).texte,
      v_orig: par.get(n-2).v_orig, v_orig_suffixe: null })
    // Les deux créneaux libérés redeviennent vides : Crampon n'a pas ces versets.
    const note = `Cette édition omet les deux versets consacrés aux villes de Ruben, omission connue d’une partie de la tradition manuscrite ; le créneau reste donc sans texte chez ce témoin.`
    for (const n of [36, 37]) maj.push({ id: par.get(n).id, texte: '', v_orig: n, v_orig_suffixe: null, notes: note })
    console.log(`${DRY?'[DRY] ':''}JOS 21 — ${maj.length} versets touchés (décalage de 2, créneaux 36 et 37 laissés vides)`)
    if (!DRY){
      writeFileSync(D + `avant_crampon_JOS21_${Date.now()}.json`, JSON.stringify(data, null, 1))
      for (const m of maj){ const { id, ...c } = m
        const { error } = await sb.from('versets_v2').update(c).eq('id', id); if (error){ console.error('  ERR '+error.message); break } }
      const { data: ap } = await chapitre('JOS', 21).then(x => ({ data: x.data }))
      const vides = ap.filter(r=>!r.texte?.trim()).map(r=>r.canon_id)
      console.log(`   matière identique : ${matiere(ap) === avant ? 'OUI' : '✗ NON'} · vides : ${vides.join(' ') || 'aucun'}`)
    }
  }
}
