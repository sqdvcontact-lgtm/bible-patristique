// Corrections demandées par l'éditeur — déplacements de matière entre versets voisins.
//
// POURQUOI CE SCRIPT EXISTE. Ces corrections ont été demandées, pour plusieurs, deux ou trois
// fois. Je les avais relayées à des lecteurs et commentées sans jamais les appliquer : le
// travail d'analyse tenait lieu d'exécution. Elles sont ici, dans une table, exécutées d'un
// coup et vérifiables d'un coup d'œil.
//
// DÉPLACER DU TEXTE OU CHANGER UN RATTACHEMENT ? Ici c'est bien le TEXTE qui bouge : la
// source place la matière dans le mauvais verset, alors que les deux autres témoins la
// placent bien. Un changement de rattachement ne corrigerait rien, il déplacerait le défaut.
// Chaque déplacement laisse une note — modifier le contenu d'un verset est plus lourd que
// changer un rattachement, et le lecteur doit pouvoir le savoir.
//
//   node scripts/corrections-editeur.mjs [--dry]
import { readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const D='C:/Users/quins/AppData/Local/Temp/claude/C--Users-quins-OneDrive-Bureau-bible-patristique/c36e26f7-816d-4b33-a05d-7d149dfb6372/scratchpad/sacy/'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const DRY = process.argv.includes('--dry')

const NOTE = `La source de cette édition rattache ce membre de phrase à un autre verset ; il est ici rendu à celui que lui donnent les autres témoins. La numérotation d’origine est conservée.`

// trad · verset SOURCE · verset DESTINATAIRE · début exact du fragment · place dans le destinataire
const MOUVEMENTS = [
  ['TR0001', 'ECC.7.29',  'ECC.8.1',   'Qui est assez sage pour ceci',                'tete'],
  ['TR0001', 'PSA.67.5',  'PSA.67.4',  'Soyez dans de saints transports de joie',     'fin'],
  ['TR0001', 'PSA.67.34', 'PSA.67.33', 'Sachez qu’il rendra sa voix',                 'fin'],
  ['TR0001', 'PSA.83.13', 'PSA.83.12', 'Il ne privera point de ses biens',            'fin'],
  ['TR0001', 'PSA.138.3', 'PSA.138.2', 'Vous avez découvert de loin mes pensées',     'fin'],
  ['TR0002', 'PSA.100.1', 'PSA.100.2', 'Je chanterai la bonté et la justice',         'tete'],
  ['TR0002', 'LUK.4.18',  'LUK.4.19',  'Pour proclamer aux captifs la délivrance',    'tete'],
  ['TR0002', 'JHN.16.4',  'JHN.16.5',  'Je ne vous en ai pas parlé dès le commencement', 'tete'],
  ['TR0002', 'ACT.18.21', 'ACT.18.20', 'Mais il n’y consentit point',                 'fin'],
  ['TR0002', '2CO.2.12',  '2CO.2.13',  'je n’eus point de repos d’esprit',            'tete'],
]

// Corrections de texte pur — ni déplacement ni rattachement.
const RETOUCHES = [
  ['TR0001', 'WIS.14.23', 'propres en- fans', 'propres enfans',
   'césure de fin de ligne restée non recollée à la transcription'],
]

let faits = 0
const avant = []
for (const [trad, src, dst, debut, place] of MOUVEMENTS){
  const { data: a } = await sb.from('versets_v2').select('id,texte,notes').eq('trad_id', trad).eq('canon_id', src)
  const { data: b } = await sb.from('versets_v2').select('id,texte,notes').eq('trad_id', trad).eq('canon_id', dst)
  if (!a?.length || !b?.length){ console.error(`✗ ${trad} ${src}→${dst} : verset introuvable`); continue }
  const s = a[0], d = b[0]
  const i = s.texte?.indexOf(debut) ?? -1
  if (i < 0){ console.error(`✗ ${trad} ${src} : « ${debut.slice(0,38)} » introuvable`); continue }
  if (s.texte.indexOf(debut, i + 1) >= 0){ console.error(`✗ ${trad} ${src} : ancre AMBIGUË`); continue }

  const bouge = s.texte.slice(i).trim()
  const reste = s.texte.slice(0, i).trim()
  if (!reste){ console.error(`✗ ${trad} ${src} : le déplacement viderait le verset — à traiter comme une soudure`); continue }
  const neuf = place === 'tete' ? `${bouge} ${d.texte}`.trim() : `${d.texte} ${bouge}`.trim()

  console.log(`${DRY?'[DRY] ':''}${trad} ${src} → ${dst} (${place})`)
  console.log(`     déplacé : ${bouge.slice(0, 62)}`)
  avant.push({ src, dst, a: s, b: d })
  if (!DRY){
    await sb.from('versets_v2').update({ texte: reste }).eq('id', s.id)
    await sb.from('versets_v2').update({ texte: neuf, notes: [d.notes, NOTE].filter(Boolean).join(' ') }).eq('id', d.id)
  }
  faits++
}

for (const [trad, cid, de, vers, motif] of RETOUCHES){
  const { data } = await sb.from('versets_v2').select('id,texte,notes').eq('trad_id', trad).eq('canon_id', cid)
  if (!data?.length || !data[0].texte?.includes(de)){ console.error(`✗ ${trad} ${cid} : « ${de} » introuvable`); continue }
  const t = data[0].texte.split(de).join(vers)
  console.log(`${DRY?'[DRY] ':''}${trad} ${cid} : « ${de} » → « ${vers} »  (${motif})`)
  avant.push({ src: cid, a: data[0] })
  if (!DRY) await sb.from('versets_v2').update({ texte: t }).eq('id', data[0].id)
  faits++
}

console.log(`\n${faits} correction(s)`)
if (!DRY && avant.length) writeFileSync(D + `avant_corrections_${Date.now()}.json`, JSON.stringify(avant, null, 1))
