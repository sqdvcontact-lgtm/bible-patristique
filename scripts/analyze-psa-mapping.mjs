// Analyse mapping Protestant ↔ Vulgate pour reconstruction TR0004 PSA
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const sb = createClient(
  'https://oucotpxcjalwgetylfbz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91Y290cHhjamFsd2dldHlsZmJ6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTMyODUyOCwiZXhwIjoyMDk2OTA0NTI4fQ.qAzdbqG1xqL3zkZ9I-pEwlk5Nek8778-Ph0-HkNxPr0'
)

const CSV = 'C:/Users/quins/OneDrive/Bureau/bible_databases-master/bible_databases-master/formats/csv/Vulgate.csv'
const vulg = {}
for (const line of readFileSync(CSV, 'utf8').split(/\r?\n/)) {
  const c1=line.indexOf(','), c2=line.indexOf(',',c1+1)
  if(c1<0||c2<0) continue
  if(line.slice(0,c1)!=='Psalms') continue
  const ch=parseInt(line.slice(c1+1,c2)), rest=line.slice(c2+1), c3=rest.indexOf(','), v=parseInt(rest.slice(0,c3)), text=rest.slice(c3+1).trim()
  if(!vulg[ch]) vulg[ch]={}
  vulg[ch][v]=text
}
const vc={} // Vulgate verse counts
for(const ch of Object.keys(vulg)) vc[+ch]=Object.keys(vulg[ch]).length

// Récupérer tous les versets PSA de la DB avec TR0001
let psaRows = [], from = 0
while (true) {
  const { data } = await sb.from('versets').select('chapitre,verset,TR0001')
    .eq('livre','PSA').not('TR0001','is',null)
    .order('chapitre').order('verset').range(from, from+999)
  psaRows = psaRows.concat(data)
  if (data.length < 1000) break
  from += 1000
}

// Compte versets protestants par chapitre
const pc = {}  // protestant count
const pMax = {} // max verse number
for (const r of psaRows) {
  pc[r.chapitre] = (pc[r.chapitre]||0)+1
  pMax[r.chapitre] = Math.max(pMax[r.chapitre]||0, r.verset)
}

// Mapping chapitre Protestant → Vulgate
// Règles LXX: 9+10→9; 11-113→10-112; 114+115→113; 116→114+115; 117-146→116-145; 147→146+147; 148-150→same
function pch2vch(pch) {
  if (pch <= 8) return pch
  if (pch <= 10) return 9
  if (pch <= 113) return pch-1
  if (pch <= 115) return 113
  if (pch === 116) return -116  // split
  if (pch <= 146) return pch-1
  if (pch === 147) return -147  // split
  return pch
}

console.log('ProtCH | Prot# | VulgCH | Vulg# | Diff | Notes')
console.log('-------|-------|--------|-------|------|------')

// PSA 9/10 cas spécial
const p9 = pc[9]||0, p10 = pc[10]||0, v9 = vc[9]||0
console.log('     9 | '+String(p9).padStart(5)+' |      9 | '+String(v9).padStart(5)+' |   -- | prot9:v2-v'+(p9+1)+', prot10:v'+(p9+2)+'-v'+(p9+1+p10)+' (vulg 39:'+(v9===p9+1+p10?'OK':'MISMATCH')+')')

for (let pch=1; pch<=150; pch++) {
  if (pch===9||pch===10) continue
  const p = pc[pch]||0
  const vch = pch2vch(pch)
  if (vch<0) {
    if (vch===-116) {
      const p116 = pc[116]||0, v114=vc[114]||0, v115=vc[115]||0
      console.log('   116 | '+String(p116).padStart(5)+' | 114+115| '+String(v114+v115).padStart(5)+' |'+String(v114+v115-p116).padStart(5)+' | v1-9→Vulg114, v10-19→Vulg115')
    }
    if (vch===-147) {
      const p147 = pc[147]||0, v146=vc[146]||0, v147=vc[147]||0
      console.log('   147 | '+String(p147).padStart(5)+' | 146+147| '+String(v146+v147).padStart(5)+' |'+String(v146+v147-p147).padStart(5)+' | v1-11→Vulg146, v12-20→Vulg147')
    }
    continue
  }
  const v = vc[vch]||0
  const diff = v-p
  const note = diff===1?'offset+1':diff===0?'direct':diff>1?'*** MULTI ***':'*** NEG ***'
  if (diff!==0 && diff!==1) {
    console.log(String(pch).padStart(6)+' | '+String(p).padStart(5)+' | '+String(vch).padStart(6)+' | '+String(v).padStart(5)+' | '+String(diff).padStart(4)+' | '+note)
  }
}

// Résumé: quels Vulgate chapitres ont offset 0 vs 1
console.log('\n=== VULGATE CHAPITRES AVEC OFFSET 0 (Vulg# = Prot#) ===')
const offset0 = []
for (let pch=1; pch<=150; pch++) {
  if (pch===9||pch===10||pch===116||pch===147) continue
  const vch = pch2vch(pch)
  if (vch<0) continue
  if ((vc[vch]||0) === (pc[pch]||0)) offset0.push(`VulgPSA${vch}(=Prot${pch})`)
}
console.log(offset0.join(', '))

console.log('\n=== VÉRIFICATION SAMPLE ===')
// Vérif: PSA 113/114/115
console.log('Prot PSA 113:', pc[113], '| Prot 114:', pc[114], '| Prot 115:', pc[115])
console.log('Vulg PSA 112:', vc[112], '| Vulg 113:', vc[113])
console.log('Match 113→Vulg112?', (vc[112]||0)===(pc[113]||0)+1 ? 'offset1' : (vc[112]||0)===(pc[113]||0) ? 'direct' : 'MISMATCH')
console.log('Match 114+115→Vulg113?', (vc[113]||0) , '=?', (pc[114]||0)+(pc[115]||0)+((vc[113]||0)===(pc[114]||0)+(pc[115]||0)+2?2:0))
