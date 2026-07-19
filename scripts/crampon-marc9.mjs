// Le RÉFÉRENT est décalé d'un cran dans Marc 9.
//
// COMMENT ON L'A VU. En établissant la table de versification de Sacy pour le Nouveau
// Testament, son 8,39 (« il y a quelques-uns de ceux qui sont ici présents qui ne mourront
// point ») ne trouvait pas de créneau : le canon compte 38 versets au chapitre 8. Or le
// créneau 9,50 restait vide chez le référent, et son 9,1 portait la Transfiguration.
//
// LA SEGOND A TRANCHÉ. Elle est correctement alignée : son 9,1 porte « quelques-uns de ceux
// qui sont ici », son 9,2 la Transfiguration, son 9,50 le sel. Le canon suit donc bien la
// division grecque, et c'est le RÉFÉRENT qui glisse — son chapitre 9 couvre les créneaux 2
// à 50 sous les numéros 1 à 49, et il lui manque le verset 9,1.
//
// C'est la première fois qu'on prend le référent en défaut d'alignement. Il a servi d'arbitre
// à toutes les tables de versification établies jusqu'ici : cela invite à confronter TROIS
// témoins et non deux quand ils divergent, ce qui est justement ce qui a permis de trancher.
//
//   node scripts/crampon-marc9.mjs [--dry]
import { readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const D='C:/Users/quins/AppData/Local/Temp/claude/C--Users-quins-OneDrive-Bureau-bible-patristique/c36e26f7-816d-4b33-a05d-7d149dfb6372/scratchpad/sacy/'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const DRY = process.argv.includes('--dry')

const { data: S } = await sb.from('versets_v2').select('id,ch_orig,v_orig,canon_id,texte')
  .eq('trad_id','TR0003').eq('livre','MRK').eq('ch_orig',9).order('v_orig')
if (!S?.length){ console.error('aucun verset'); process.exit(1) }
const vide = S.find(v => !v.texte || !v.texte.trim())
console.log(`${DRY?'[DRY] ':''}référent Marc 9 : ${S.length} lignes, dont ${vide?'une vide au v. '+vide.v_orig:'aucune vide'}`)

// On décale du plus GRAND au plus petit, pour ne jamais écrire sur un créneau encore occupé.
const maj = S.filter(v => v.texte && v.texte.trim()).sort((a,b) => b.v_orig - a.v_orig)
console.log(`  ${maj.length} versets à rattacher un cran plus loin (9,v → 9,v+1)`)
console.log(`  le créneau 9,1 restera SANS référent : ce verset manque à l’import`)
if (DRY) process.exit(0)

writeFileSync(D + `avant_crampon_MRK9_${new Date().toISOString().slice(0,10)}.json`, JSON.stringify(S, null, 1))
if (vide){ await sb.from('versets_v2').delete().eq('id', vide.id); console.log('  ligne vide supprimée') }
for (const v of maj){
  const { error } = await sb.from('versets_v2').update({ canon_id: `MRK.9.${v.v_orig + 1}`, alignement_verifie: true }).eq('id', v.id)
  if (error){ console.error('  ERR '+error.message); break }
}
console.log('  écrit — sauvegarde de l’état antérieur faite')
