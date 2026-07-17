// Reconstruction complète TR0004 (Vulgate) pour les Psaumes
// Met à jour TOUTES les lignes PSA de TR0004 avec le bon texte Vulgate
// Source : Vulgate.csv (bible_databases-master)
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const sb = createClient(
  'https://oucotpxcjalwgetylfbz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91Y290cHhjamFsd2dldHlsZmJ6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTMyODUyOCwiZXhwIjoyMDk2OTA0NTI4fQ.qAzdbqG1xqL3zkZ9I-pEwlk5Nek8778-Ph0-HkNxPr0'
)

const CSV = 'C:/Users/quins/OneDrive/Bureau/bible_databases-master/bible_databases-master/formats/csv/Vulgate.csv'

// Index Vulgate
const vulg = {}
for (const line of readFileSync(CSV, 'utf8').split(/\r?\n/)) {
  const c1=line.indexOf(','), c2=line.indexOf(',',c1+1)
  if(c1<0||c2<0) continue
  if(line.slice(0,c1)!=='Psalms') continue
  const ch=parseInt(line.slice(c1+1,c2)), rest=line.slice(c2+1), c3=rest.indexOf(','), v=parseInt(rest.slice(0,c3))
  const text=rest.slice(c3+1).trim()
  if(!vulg[ch]) vulg[ch]={}
  vulg[ch][v]=text
}

// Compte de versets par chapitre Protestant (depuis la DB avec TR0001)
let psaAll = [], from = 0
while (true) {
  const { data } = await sb.from('versets')
    .select('chapitre,verset,TR0001,TR0004')
    .eq('livre','PSA')
    .order('chapitre').order('verset')
    .range(from, from+999)
  psaAll = psaAll.concat(data)
  if (data.length < 1000) break
  from += 1000
}

// Compte Protestant PSA 9 (pour l'offset de PSA 10)
const PROT9_COUNT = psaAll.filter(r => r.chapitre===9 && r.TR0001).length

// Mapping Protestant (ch, v) → {vulg_ch, vulg_v, note?}
function mapping(prot_ch, prot_v) {
  // PSA 9 et 10 fusionnés en Vulgate PSA 9
  if (prot_ch === 9) {
    return { vulg_ch: 9, vulg_v: prot_v }
  }
  if (prot_ch === 10) {
    const vv = prot_v + PROT9_COUNT
    return {
      vulg_ch: 9, vulg_v: vv,
      note: `(Psaumes 9, ${vv} dans la Vulgate) `
    }
  }

  // PSA 114 + 115 → Vulgate PSA 113
  if (prot_ch === 114) {
    return { vulg_ch: 113, vulg_v: prot_v }
  }
  if (prot_ch === 115) {
    const PROT114_COUNT = 8  // Protestant PSA 114 a 8 versets
    const vv = prot_v + PROT114_COUNT
    return {
      vulg_ch: 113, vulg_v: vv,
      note: `(Psaumes 113, ${vv} dans la Vulgate) `
    }
  }

  // PSA 116 → Vulgate PSA 114 (v1-9) + PSA 115 (v10-19)
  if (prot_ch === 116) {
    if (prot_v <= 9) {
      return { vulg_ch: 114, vulg_v: prot_v }
    } else {
      const vv = prot_v - 9
      return {
        vulg_ch: 115, vulg_v: vv,
        note: `(Psaumes 115, ${vv} dans la Vulgate) `
      }
    }
  }

  // PSA 147 → Vulgate PSA 146 (v1-11) + PSA 147 (v12-20)
  if (prot_ch === 147) {
    if (prot_v <= 11) {
      return { vulg_ch: 146, vulg_v: prot_v }
    } else {
      const vv = prot_v - 11
      return {
        vulg_ch: 147, vulg_v: vv,
        note: `(Psaumes 147, ${vv} dans la Vulgate) `
      }
    }
  }

  // Chapitre standard
  let vulg_ch, offset = 0
  if (prot_ch <= 8) {
    vulg_ch = prot_ch
    // PSA 2 et PSA 4 ont un verset de titre supplémentaire en Vulgate (offset+1)
    if (prot_ch === 2 || prot_ch === 4) offset = 1
  } else if (prot_ch === 11) {
    // PSA 11 → Vulgate 10: Vulgate 10 a un verset de titre supplémentaire
    vulg_ch = 10
    offset = 1
  } else if (prot_ch <= 113) {
    vulg_ch = prot_ch - 1
  } else if (prot_ch <= 146) {
    vulg_ch = prot_ch - 1
  } else {
    // PSA 148, 149, 150
    vulg_ch = prot_ch
  }

  return { vulg_ch, vulg_v: prot_v + offset }
}

async function main() {
  const total = psaAll.length
  console.log(`=== RECONSTRUCTION TR0004 PSAUMES (${total} lignes) ===`)
  console.log(`Protestant PSA 9 count: ${PROT9_COUNT}\n`)

  let ok=0, absent=0, err=0, unchanged=0

  // Traiter en batches de 100 pour ne pas surcharger
  const BATCH = 50
  for (let i=0; i<psaAll.length; i+=BATCH) {
    const batch = psaAll.slice(i, i+BATCH)
    for (const row of batch) {
      const { chapitre: pch, verset: pv, TR0004: cur } = row
      const m = mapping(pch, pv)
      const rawText = vulg[m.vulg_ch]?.[m.vulg_v]

      if (!rawText) {
        // Pas de texte Vulgate → laisser vide avec note
        const noteText = `(absent de la Vulgate — Psaumes ${pch}, ${pv} selon numérotation hébraïque)`
        if (cur !== noteText) {
          const { error } = await sb.from('versets')
            .update({ TR0004: noteText })
            .eq('livre','PSA').eq('chapitre',pch).eq('verset',pv)
          if (error) { console.error(`  ✗ PSA ${pch}:${pv} — ${error.message}`); err++ }
          else absent++
        } else unchanged++
        continue
      }

      const note = m.note || ''
      const newText = note + rawText

      if (cur === newText) { unchanged++; continue }

      const { error } = await sb.from('versets')
        .update({ TR0004: newText })
        .eq('livre','PSA').eq('chapitre',pch).eq('verset',pv)

      if (error) {
        console.error(`  ✗ PSA ${pch}:${pv} — ${error.message}`)
        err++
      } else {
        ok++
        if (ok <= 20 || !rawText) {
          const display = newText.slice(0,80)
          console.log(`  ✓ PSA ${pch}:${pv}: ${display}…`)
        }
      }
    }
    if (i % 500 === 0 && i > 0) {
      console.log(`  ... ${i}/${total} traités (${ok} MAJ, ${unchanged} inchangés, ${absent} absents, ${err} erreurs)`)
    }
  }

  console.log(`\n=== RÉSULTAT ===`)
  console.log(`Total: ${total} lignes PSA`)
  console.log(`✓ Mis à jour: ${ok}`)
  console.log(`= Inchangés: ${unchanged}`)
  console.log(`~ Absents Vulgate: ${absent}`)
  console.log(`✗ Erreurs: ${err}`)
}

main().catch(console.error)
