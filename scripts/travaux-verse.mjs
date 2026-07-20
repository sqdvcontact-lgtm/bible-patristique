// Verse en base les relevés de collation qui vivaient dans le répertoire temporaire.
//
// Ils sont coûteux à produire — chacun est une lecture en regard de deux éditions — et le
// répertoire qui les abrite peut disparaître. La table les rend durables.
//
// RIEN N'EST ÉCRASÉ SANS RAISON : une clé déjà présente est mise à jour, et l'ancien contenu
// est conservé dans un fichier avant remplacement.
//
//   node scripts/travaux-verse.mjs [--dry]
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const D='C:/Users/quins/AppData/Local/Temp/claude/C--Users-quins-OneDrive-Bureau-bible-patristique/c36e26f7-816d-4b33-a05d-7d149dfb6372/scratchpad/sacy/'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const DRY = process.argv.includes('--dry')

// fichier · livre · catégorie · source · note d'usage
const RELEVES = [
  ['aelf_SIR_structure.json', 'SIR', 'structure', 'aelf.org/bible/Si',
   'Structure seule — nombres et numéros de verset. Le TEXTE de l’AELF est sous droits et n’a pas été relevé : ne pas l’importer. Référence de numérotation pour ce livre, par décision de l’éditeur (20/07/2026).'],
  ['crampon_SIR_decoupage.json', 'SIR', 'decoupage', 'jesusmarie.free.fr — Crampon 1923, Ecclésiastique',
   'Découpage imprimé : 1 363 versets, numérotés 1..N sans saut ni numéro composé. ATTENTION : la note liminaire de l’édition annonce que les leçons latines sont entre crochets, mais la page n’en porte que 19 — les crochets ne peuvent PAS servir de repère pour situer les additions.'],
  ['sir_pos_A.json', 'SIR', 'diagnostic', 'collation AELF / Crampon imprimé',
   'Lacunes de Crampon situées, ch. 20 23 24 25 48. Cause dominante : Crampon IMPRIME les additions latines mais ne les NUMÉROTE pas — elles occupent un créneau AELF sans occuper un numéro chez lui.'],
  ['sir_pos_B.json', 'SIR', 'diagnostic', 'collation AELF / Crampon imprimé',
   'Lacunes situées, ch. 32 33 34 36 39. PIÈGE au ch. 33 : deux versets de l’AELF y commencent par les mêmes mots — une vérification sur les seuls débuts de verset conduit à une conclusion FAUSSE, il faut le texte entier.'],
  ['sir_pos_C.json', 'SIR', 'diagnostic', 'collation AELF / Crampon imprimé',
   'Ch. 5, 41, 43 : l’AELF et Crampon s’accordent rang par rang. C’était l’ossature qui avait des créneaux en trop, hérités du fichier scrollmapper. Les 9 créneaux ont été supprimés.'],
  ['sir_align.json', 'SIR', 'table_alignement', 'lecture en regard Sacy / Crampon',
   'Tables de Sacy, 45 chapitres. ⚠️ ÉTABLIES CONTRE L’ANCIEN CRAMPON DÉFECTUEUX : la lecture du CONTENU reste bonne, les CRÉNEAUX sont faux. À rejouer contre le référent corrigé.'],
  ['wis_align.json', 'WIS', 'table_alignement', 'lecture en regard Sacy / Crampon',
   'Sagesse, 6 chapitres en écart. Chargé et vérifié : 437/437.'],
  ['creneaux_NT.json', null, 'diagnostic', 'collation Crampon en ligne',
   'Créneaux vides du référent au NT. Les six cas ont été appliqués. Ac 14 était le cas lourd : soudure au v. 6, 23 versets à décaler.'],
  ['creneaux_AT.json', null, 'diagnostic', 'collation Crampon en ligne',
   'Créneaux vides du référent à l’AT — QUATRE causes distinctes, pas une : soudure simple, soudure quadruple (Dt 5), omission réelle (Jos 21, où les créneaux doivent RESTER vides), et créneaux surnuméraires du CANON (Nb 26,66 · Is 8,24 · Za 4,15-16, vides dans les trois traductions).'],
  ['creneaux_SIR.json', 'SIR', 'diagnostic', 'collation Crampon en ligne',
   'Premier diagnostic du Siracide. C’est lui qui a établi que versets_canon ET TR0003 sortaient du MÊME fichier (FreCrampon.json, scrollmapper) — l’ossature n’était donc pas un témoin indépendant. Découverte à l’origine de la bascule vers l’AELF.'],
]
for (let i = 1; i <= 15; i++)
  RELEVES.push([`psa_align_LOT${i}.json`, 'PSA', 'table_alignement', 'lecture en regard Sacy / Crampon',
    'Psautier : tables verset par verset, appliquées et vérifiées (2 529/2 529).'])

const lignes = []
for (const [f, livre, categorie, source, note] of RELEVES){
  if (!existsSync(D + f)){ console.log(`  — ${f} absent, ignoré`); continue }
  let contenu; try { contenu = JSON.parse(readFileSync(D + f, 'utf8')) }
  catch (e){ console.error(`  ✗ ${f} illisible : ${e.message}`); continue }
  lignes.push({ cle: f.replace(/\.json$/, ''), livre, categorie, source, contenu, note })
}
console.log(`${DRY?'[DRY] ':''}${lignes.length} relevés à verser`)
for (const l of lignes) console.log(`  ${l.cle.padEnd(26)} ${(l.livre||'—').padEnd(4)} ${l.categorie}`)

if (!DRY){
  const { data: avant } = await sb.from('travaux_alignement').select('cle,contenu')
    .in('cle', lignes.map(l => l.cle))
  if (avant?.length) writeFileSync(D + `avant_travaux_${Date.now()}.json`, JSON.stringify(avant, null, 1))
  const { error } = await sb.from('travaux_alignement')
    .upsert(lignes.map(l => ({ ...l, maj_le: new Date().toISOString() })), { onConflict: 'cle' })
  if (error){ console.error('  ERR ' + error.message); process.exit(1) }
  const { count } = await sb.from('travaux_alignement').select('*', { count: 'exact', head: true })
  console.log(`  versé — la table contient ${count} relevés`)
}
