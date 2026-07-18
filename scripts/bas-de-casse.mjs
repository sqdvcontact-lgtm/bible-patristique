// Choix éditorial : pas de mot, syntagme ni phrase en capitales dans le texte des versets.
// Les capitales d'insistance de l'édition (petites capitales, lettrines) passent en bas de
// casse. Les NOMS PROPRES gardent leur majuscule initiale ; la ponctuation forte impose
// une majuscule de début de phrase. --dry pour simuler.
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const DRY = process.argv.includes('--dry')
const TRADS = process.argv.slice(2).filter(a=>!a.startsWith('--'))
async function all(q){const o=[];let f=0;while(true){const{data,error}=await q.range(f,f+999);if(error)throw error;o.push(...data);if(data.length<1000)break;f+=1000}return o}

// ── noms propres : mots employés avec une majuscule EN MILIEU de phrase dans les
//    traductions déjà relues (Segond, Crampon). Méthode plus sûre qu'une liste écrite à la main.
// Un nom propre est un mot MAJORITAIREMENT capitalisé : « Jacob » l'est presque toujours,
// « vous » ou « seront » presque jamais. Compter les deux formes évite de prendre pour un
// nom propre un mot simplement rencontré en tête de proposition.
const hautes = new Map(), basses = new Map()
const incr = (m,k) => m.set(k, (m.get(k)||0)+1)
for (const r of await all(sb.from('versets_v2').select('texte').in('trad_id',['TR0002','TR0003']).order('id'))){
  const t = (r.texte||'').replace(/<\/?i>/g,'')
  for (const m of t.matchAll(/([A-ZÀ-Üa-zà-ÿ][a-zà-ÿ’'-]{2,})/g)){
    const w = m[1]
    incr(/^[A-ZÀ-Ü]/.test(w) ? hautes : basses, w.toLowerCase())
  }
}
const propres = new Set()
for (const [w, nh] of hautes){
  const nb = basses.get(w) || 0
  if (nh >= 3 && nh > nb * 5) propres.add(w)     // dominance nette de la forme capitalisée
}
for (const w of ['seigneur','dieu','israel','israël','egypte','égypte','pharaon','christ']) propres.add(w)
// lexique des mots communs : sert de filet de sécurité — un mot en capitales ABSENT du
// lexique est presque toujours un nom propre rare (NEPHTHAR, ELMODAD…), pas un mot courant.
const commun = new Set()
for (const [w, nb] of basses) if (nb >= 3) commun.add(w)
console.log('noms propres retenus : '+propres.size+' · mots communs connus : '+commun.size)

const CAP = "A-ZÀ-ÂÄÇÈ-ËÎÏÔÖÙ-ÜŒ"
const minus = s => s.toLowerCase()
const titre = s => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()

// Un mot est « en capitales » s'il ne contient AUCUNE minuscule et au moins deux capitales.
// Cette définition attrape aussi les formes élidées : J’ATTENDRAI, L’ÉTERNEL, C’EST.
const estCap = w => !/[a-zà-ÿ]/.test(w) && (w.match(new RegExp(`[${CAP}]`,'g'))||[]).length >= 2
// mot d'UNE seule capitale (À, A, Ô) : capitale seulement s'il est pris dans une suite
const estCapIsole = w => !/[a-zà-ÿ]/.test(w) && (w.match(new RegExp(`[${CAP}]`,'g'))||[]).length === 1

// Découpage en MOTS ENTIERS (lettres, apostrophes, traits d'union) et séparateurs : évite
// d'attraper le début d'un mot en casse mixte (« L’A » dans « L’Ange »).
function corriger(texte){
  const jetons = texte.split(/([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ’'-]*)/)   // impairs = mots
  let precedent = ''                                            // texte déjà émis, pour la ponctuation
  let dansSequence = false
  for (let i = 0; i < jetons.length; i++){
    // seule une ponctuation FORTE rompt la suite en capitales ; virgule et point-virgule non
    if (i % 2 === 0){ precedent += jetons[i]; if (/[.!?:»]/.test(jetons[i])) dansSequence = false; continue }
    const mot = jetons[i]
    // un mot d'une seule capitale n'est traité que s'il prolonge une suite en capitales
    if (!estCap(mot) && !(dansSequence && estCapIsole(mot))){ precedent += mot; dansSequence = false; continue }
    const avant = precedent.replace(/<\/?i>/g,'').replace(/[\s ]+$/,'')
    const debutDePhrase = avant === '' || /[.!?:»]$/.test(avant)
    const bas = minus(mot)
    // un composé (JÉSUS-CHRIST) est un nom propre dès qu'un de ses éléments en est un
    const parties = bas.split(/[-]/).map(p => /[’']/.test(p) ? p.split(/[’']/).pop() : p)
    // nom propre avéré, OU mot inconnu du lexique courant (nom propre rare présumé)
    const inconnu = parties.every(p => p.length < 3 || !commun.has(p))
    const estPropre = propres.has(bas) || parties.some(p => p.length > 2 && propres.has(p))
                      || (inconnu && bas.length > 3 && !estCapIsole(mot))
    let out
    if (estPropre) out = bas.split(/([-])/).map(p => p === '-' ? p : titre(p)).join('')   // Jésus-Christ
    else if (!dansSequence && debutDePhrase) out = titre(mot)             // début de phrase
    else out = bas
    jetons[i] = out
    precedent += out
    dansSequence = true
  }
  return jetons.join('')
}

const cibles = TRADS.length ? TRADS : ['TR0001']
for (const tid of cibles){
  const V = await all(sb.from('versets_v2').select('id,ch_orig,v_orig,texte').eq('trad_id',tid).order('canon_id'))
  const upd = []
  for (const v of V){ const n = corriger(v.texte||''); if (n !== v.texte) upd.push({id:v.id, ref:`${v.ch_orig},${v.v_orig}`, avant:v.texte, texte:n}) }
  console.log(`\n${DRY?'[DRY] ':''}${tid} — ${upd.length} versets à corriger sur ${V.length}`)
  upd.slice(0,14).forEach(u=>{
    const i = Math.max(0, u.avant.search(new RegExp(`[${CAP}]{2,}`)) - 18)
    console.log(`   ${u.ref} : «…${u.avant.slice(i,i+62).trim()}…»`)
    console.log(`        → «…${u.texte.slice(i,i+62).trim()}…»`)
  })
  if (upd.length>14) console.log(`   … et ${upd.length-14} autres`)
  if (!DRY) for (let i=0;i<upd.length;i+=25) await Promise.all(upd.slice(i,i+25).map(u=>sb.from('versets_v2').update({texte:u.texte}).eq('id',u.id)))
}
if (!DRY) console.log('\nappliqué.')
