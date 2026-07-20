// Répare le chapitre 36 du Siracide chez Crampon — un dégât que j'ai causé moi-même.
//
// CE QUI S'EST PASSÉ. L'AELF ne numérote pas les versets 14 et 15 de ce chapitre : les
// créneaux correspondants ont donc été retirés de l'ossature, et les versets qui s'y
// trouvaient rendus surnuméraires. Mais Crampon PORTE ce texte — la prière pour le peuple et
// pour la ville sainte. En le sortant de l'ossature, je lui ai retiré deux versets qu'il a
// réellement, et le remappage n'avait plus que 26 versets pour 28 places.
//
// LA LEÇON : « le témoin n'a pas ce verset » et « la référence ne le numérote pas » sont deux
// choses différentes. J'ai appliqué la seconde comme si c'était la première.
//
// ON REPART DONC DE LA NUMÉROTATION PROPRE DE CRAMPON (v_orig, 1..28), qui ne dépend d'aucun
// rattachement, et on la range sur les créneaux réels de l'ossature en sautant le seul que
// Crampon n'a pas : l'AELF 36,16.
//
//   node scripts/crampon-sir36.mjs [--dry]
import { readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const D='C:/Users/quins/AppData/Local/Temp/claude/C--Users-quins-OneDrive-Bureau-bible-patristique/c36e26f7-816d-4b33-a05d-7d149dfb6372/scratchpad/sacy/'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const DRY = process.argv.includes('--dry')
const nu = s => (s||'').replace(/\s+/g,' ').trim()

// Tous les versets de Crampon au ch. 36, surnuméraires COMPRIS, dans leur ordre imprimé.
const { data: V } = await sb.from('versets_v2').select('id,v_orig,canon_id,texte,notes')
  .eq('trad_id','TR0003').eq('livre','SIR').eq('ch_orig',36)
const versets = V.filter(r => r.texte?.trim()).sort((a,b) => a.v_orig - b.v_orig)

// Les créneaux que l'ossature porte réellement pour ce chapitre.
const { data: K } = await sb.from('versets_canon').select('v_canon').like('id','SIR.36.%')
const rangs = K.map(r => r.v_canon).sort((a,b) => a-b)
const cibles = rangs.filter(n => n !== 16)          // 16 : le seul verset que Crampon n'a pas

console.log(`${DRY?'[DRY] ':''}Crampon ch 36 : ${versets.length} versets imprimés · ${cibles.length} créneaux à remplir · créneau laissé vide : 16`)
if (versets.length !== cibles.length){
  console.error(`✗ comptes inégaux — rien fait`); process.exit(1)
}
const avant = nu(versets.map(r => r.texte).join(' '))
for (const [i, v] of versets.entries())
  console.log(`   v_orig ${String(v.v_orig).padStart(2)} → SIR.36.${cibles[i]}${v.canon_id ? '' : '   (était surnuméraire)'}`)

if (!DRY){
  writeFileSync(D + `avant_sir36_${Date.now()}.json`, JSON.stringify(V, null, 2))
  for (const [i, v] of versets.entries()){
    // La note de surnumérariat n'a plus lieu d'être : le verset retrouve un créneau.
    const notes = (v.notes || '').replace(/Ce verset n’a pas de correspondant dans la référence[^.]*\./g, '').trim() || null
    const { error } = await sb.from('versets_v2')
      .update({ canon_id: `SIR.36.${cibles[i]}`, notes }).eq('id', v.id)
    if (error){ console.error('  ERR ' + error.message); process.exit(1) }
  }
  const { data: ap } = await sb.from('versets_v2').select('canon_id,texte')
    .eq('trad_id','TR0003').eq('livre','SIR').eq('ch_orig',36)
  const apres = nu(ap.filter(r=>r.texte?.trim()).sort((a,b)=>+a.canon_id.split('.')[2]-+b.canon_id.split('.')[2]).map(r=>r.texte).join(' '))
  console.log(`   matière identique : ${apres === avant ? 'OUI' : '✗ NON'} · sans créneau : ${ap.filter(r=>!r.canon_id).length}`)
}
