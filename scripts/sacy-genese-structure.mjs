// Re-segmentation de la Genèse (Sacy 1730) guidée par le canon.
// Sacy traduit la Vulgate : versets_canon donne le nombre exact de versets par chapitre,
// ce qui sert de contrainte pour arbitrer les numéros douteux et les titres manqués.
import { readFileSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const D = 'C:/Users/quins/AppData/Local/Temp/claude/C--Users-quins-OneDrive-Bureau-bible-patristique/c36e26f7-816d-4b33-a05d-7d149dfb6372/scratchpad/sacy/'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
async function all(q){const o=[];let f=0;while(true){const{data,error}=await q.range(f,f+999);if(error)throw error;o.push(...data);if(data.length<1000)break;f+=1000}return o}

// ── contrainte : nombre de versets par chapitre selon la Vulgate ──
const canon = await all(sb.from('versets_canon').select('ch_canon,v_canon').eq('livre','GEN').order('ordre'))
const MAXV = {}
for (const r of canon) MAXV[r.ch_canon] = Math.max(MAXV[r.ch_canon]||0, r.v_canon)
const NB_CH = Object.keys(MAXV).length

// ── paragraphes de la Genèse ──
const paras = JSON.parse(readFileSync(D+'paras.json','utf8')).map(p=>p.replace(/\s+/g,' ').trim())
const DEBUT = 337, FIN = 2194        // « GENESE » … « EXODE »

const ROM={I:1,V:5,X:10,L:50,C:100,D:500,M:1000}
function romain(s){let t=(s||'').toUpperCase().replace(/[^IVXLCDM1l|î]/g,'').replace(/[1l|î]/g,'I')
  if(!t)return null; t=t.replace(/(I)L$/,'$1I')
  let n=0,p=0; for(let i=t.length-1;i>=0;i--){const v=ROM[t[i]]; if(!v)return null; n+= v<p?-v:(p=v,v)}
  return n>0&&n<=60?n:null}
const MOTS={PREMIER:1,PREMIERE:1,SECOND:2,SECONDE:2}
function titreCh(p){
  if(p.length>110) return null
  const compact=p.replace(/[^A-Za-zÀ-ÿ]/g,'').toUpperCase()
  if(!/CHAP/.test(compact.slice(0,16))) return null
  const m=p.replace(/C\W*H\W*A\W*P\W*[A-Za-zÀ-ÿ]{0,6}/i,' ').match(/([IVXLCDM1l|î\s.*,-]{1,16})/)
  let n=m?romain(m[1]):null
  if(!n) for(const[k,v] of Object.entries(MOTS)) if(compact.includes(k)){n=v;break}
  return n
}
const estSommaire = p => /^[•*·]?\s*[§Ss\.,;:]{1,4}\s*[.,]?\s*(?:\d{1,2}|[ivxlIVXL]{1,4})\s*[.,-]/.test(p)
  && /[a-zà-ÿ]{4}/.test(p) && p.length<160 && !/^\d{1,3}\s*\.\s+[A-ZÀ-Ü]?[a-zà-ÿ]{3}/.test(p)
const estLettrine = p => /^[^A-Za-zÀ-ÿ]{0,3}[A-Za-zÀ-Ü][^A-Za-zÀ-ÿ]{0,6}$/.test(p)
const estNumSeul  = p => /^[1lI]\s*\.?$/.test(p)
const normTete = t => t.replace(/^([A-Za-zÀ-ÿ]{2,})/, m =>
  /[A-ZÀ-Ü]/.test(m.slice(1))||/^[a-zà-ÿ]/.test(m) ? m[0].toUpperCase()+m.slice(1).toLowerCase() : m)

const versets=[]; let ch=0, dernierV=0, courant=null, attenteV1=null
const pousser=()=>{ if(courant&&courant.texte.trim().length>2) versets.push(courant); courant=null }
function cloreV1(){
  if(!attenteV1) return
  let m=attenteV1.filter(x=>x&&!estNumSeul(x))
  for(let i=0;i<m.length-1;i++) if(estLettrine(m[i])){
    const l=(m[i].match(/[A-Za-zÀ-Ü]/)||[''])[0]
    m[i+1]=normTete(l+m[i+1].replace(/^[^A-Za-zÀ-ÿ]+/,'')); m[i]=''
  }
  const t=m.filter(Boolean).join(' ').replace(/\s+/g,' ').trim()
  if(t.length>3){ versets.push({ch, v:1, texte:t}); dernierV=1 }
  attenteV1=null
}
function nouveauChapitre(n){ pousser(); cloreV1(); ch=n; dernierV=0; attenteV1=[] }

for(let i=DEBUT;i<FIN;i++){
  const p=paras[i]; if(!p) continue
  const t=titreCh(p)
  if(t!==null){
    // le titre est cru s'il est plausible ; sinon on prend le chapitre suivant
    nouveauChapitre( (t===ch+1 || (t>ch && t<=ch+3)) ? t : ch+1 )
    continue
  }
  if(ch===0) continue
  if(estSommaire(p)) continue
  if(p.length<12 && !/^\d{1,3}\s*\./.test(p) && !attenteV1) continue

  for(let frag of p.split(/(?=(?:^|[\s.;:,])\d{1,3}\s*\.\s+[A-ZÀ-Üa-zà-ÿ])/)){
    frag=frag.trim(); if(!frag) continue
    const mv=frag.match(/^(\d{1,3})\s*\.\s*(.*)$/s)
    if(mv && mv[2].length>1){
      let n=+mv[1]
      if(attenteV1 && n<=1) continue
      if(attenteV1) cloreV1()
      // ── arbitrage par le canon ──
      if(n > (MAXV[ch]||999)){
        // numéro impossible dans ce chapitre : soit OCR fautif, soit chapitre suivant
        if(n<=3 || dernierV>=(MAXV[ch]||999)-2){ if(ch<NB_CH) nouveauChapitre(ch+1) }
        else { if(courant){courant.texte+=' '+frag} continue }   // nombre dans le texte
      } else if(n<=dernierV){
        // retour en arrière : nouveau chapitre si on est près de la fin du chapitre courant
        if(n<=2 && dernierV>=Math.min(8,(MAXV[ch]||99)-3)){ if(ch<NB_CH) nouveauChapitre(ch+1) }
        else { if(courant){courant.texte+=' '+frag} continue }
      }
      pousser()
      courant={ch, v:n, texte:mv[2].trim()}; dernierV=n
    } else if(attenteV1){ attenteV1.push(frag) }
    else if(courant){
      if(/[a-zà-ÿ]-$/.test(courant.texte)) courant.texte=courant.texte.slice(0,-1)+frag
      else courant.texte+=' '+frag
    }
  }
}
pousser(); cloreV1()

// dédoublonnage (garde la version la plus longue)
const uniq=new Map()
for(const v of versets){ const k=v.ch+'.'+v.v
  if(!uniq.has(k) || uniq.get(k).texte.length<v.texte.length) uniq.set(k,v) }
const out=[...uniq.values()].sort((a,b)=>a.ch-b.ch||a.v-b.v)
writeFileSync(D+'genese_structure.json', JSON.stringify(out,null,1))

// ── contrôle ──
const chs=new Set(out.map(v=>v.ch))
console.log('Genèse — chapitres '+chs.size+'/'+NB_CH+' · versets '+out.length+'/'+canon.length)
const manquants=[]
for(let c=1;c<=NB_CH;c++){
  const has=new Set(out.filter(v=>v.ch===c).map(v=>v.v))
  const miss=[]; for(let v=1;v<=MAXV[c];v++) if(!has.has(v)) miss.push(v)
  if(miss.length) manquants.push('  ch '+String(c).padStart(2)+' : '+has.size+'/'+MAXV[c]+' — manque '+miss.join(',').slice(0,50))
}
console.log('\nchapitres incomplets : '+manquants.length)
manquants.slice(0,20).forEach(m=>console.log(m))
