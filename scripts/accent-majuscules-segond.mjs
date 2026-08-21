// Correction des majuscules non accentuées de la Segond (TR0002).
// Périmètre validé avec l'utilisateur : Segond seulement ; mots courants + noms propres
// établis ; les cas rares/incertains ne sont pas modifiés (aucun pour Segond).
// Chaque règle a été vérifiée en contexte avant écriture. --dry pour simuler.
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const DRY = process.argv.includes('--dry')
async function all(q){ const o=[];let f=0;while(true){const{data,error}=await q.range(f,f+999);if(error)throw error;o.push(...data);if(data.length<1000)break;f+=1000}return o }

// règles : [libellé, regex globale, remplacement]
const REGLES = [
  // préposition « à » en tête de proposition : A + espace (jamais « A-t-il »)
  ['A → À',           /(^|[\s«“(\[—’'"])A(?=\s)/gu, '$1À'],
  // mots courants (accent initial)
  ['Egypte → Égypte',        /\bEgypte\b/g,     'Égypte'],
  ['Epouvantés → Épouvantés',/\bEpouvantés\b/g, 'Épouvantés'],
  ['Etranglait → Étranglait',/\bEtranglait\b/g, 'Étranglait'],
  ['Ote → Ôte',              /\bOte\b/g,        'Ôte'],
  ['Otez → Ôtez',            /\bOtez\b/g,       'Ôtez'],
  ['Oter → Ôter',            /\bOter\b/g,       'Ôter'],
  ['Iles → Îles',            /\bIles\b/g,       'Îles'],
  // nom propre établi
  ['Eve → Ève',              /\bEve\b/g,        'Ève'],
  // fusions (espace manquant) — hors accentuation mais défaut manifeste
  ['Etquiconque → Et quiconque', /\bEtquiconque\b/g, 'Et quiconque'],
  ['Etce → Et ce',               /\bEtce\b/g,        'Et ce'],
  ['Etsi → Et si',               /\bEtsi\b/g,        'Et si'],
]

const rows = await all(sb.from('versets_v2').select('id,canon_id,texte').eq('trad_id','TR0002'))
const compte = Object.fromEntries(REGLES.map(r=>[r[0],0]))
const upd=[]
for (const r of rows){
  let t = r.texte||''
  for (const [lib,re,rep] of REGLES){ const m=t.match(re); if(m){ compte[lib]+=m.length; t=t.replace(re,rep) } }
  if (t!==r.texte) upd.push({id:r.id,texte:t})
}
console.log(`${DRY?'[DRY] ':''}Segond — ${upd.length} versets modifiés.`)
for (const [lib,n] of Object.entries(compte)) console.log('  '+lib+' : '+n)

if (!DRY){
  for (let i=0;i<upd.length;i+=25) await Promise.all(upd.slice(i,i+25).map(u=>sb.from('versets_v2').update({texte:u.texte}).eq('id',u.id)))
  console.log('appliqué.')
  // contrôle : plus de « A » préposition ni de mots ciblés
  const after = await all(sb.from('versets_v2').select('texte').eq('trad_id','TR0002'))
  let aRest=0; for(const r of after){ aRest += (r.texte.match(/(^|[\s«“(\[—’'"])A(?=\s)/gu)||[]).length }
  console.log('contrôle : « A » préposition restants = '+aRest)
}
