// Désignation des livres bibliques PROPRE À CHAQUE ÉDITION, quand elle diffère du canon.
//   node scripts/livres-editions.mjs [--dry]
//
// Pourquoi une table et non une colonne de versets_v2 : c'est une règle systématique de
// l'édition, pas un fait propre à chaque verset. La stocker verset par verset la
// dupliquerait des milliers de fois et la rendrait incohérente à la première retouche.
//
// Principe : on n'inscrit QUE les écarts. Un livre absent de la table porte, dans
// l'édition, le même nom que dans le canon — inutile de le répéter.
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/)
  .map(l=>l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const DRY = process.argv.includes('--dry')

const TABLE = {
  // Sacy 1730 (Vulgate) : les quatre livres des Rois. 1-2 Samuel y sont Rois I et II,
  // 1-2 Rois y sont Rois III et IV. Vérifié sur les pages de titre du fac-similé :
  // p.320 « LES ROIS. LIVRE PREMIER », p.362 « LIVRE SECOND », p.396 « LIVRE TROISIEME »,
  // p.436 « LIVRE QUATRIEME ».
  TR0001: {
    '1SA': { nom: 'Les Rois, livre premier',   abrege: 'I Rois' },
    '2SA': { nom: 'Les Rois, livre second',    abrege: 'II Rois' },
    '1KI': { nom: 'Les Rois, livre troisième', abrege: 'III Rois' },
    '2KI': { nom: 'Les Rois, livre quatrième', abrege: 'IV Rois' },
    // Les Chroniques s'appellent Paralipomènes dans toute la tradition latine.
    '1CH': { nom: 'Les Paralipomènes, livre premier', abrege: 'I Par.' },
    '2CH': { nom: 'Les Paralipomènes, livre second',  abrege: 'II Par.' },
  },
}

const { data: avant } = await sb.from('parametres').select('valeur').eq('cle','livres_editions').maybeSingle()
const valeur = JSON.stringify(TABLE, null, 1)

for (const [trad, livres] of Object.entries(TABLE)){
  console.log(`${trad} — ${Object.keys(livres).length} livre(s) désignés autrement que dans le canon`)
  for (const [code, d] of Object.entries(livres)) console.log(`   ${code.padEnd(5)} « ${d.nom} »  (${d.abrege})`)
}

if (!DRY){
  const { error } = avant
    ? await sb.from('parametres').update({ valeur }).eq('cle','livres_editions')
    : await sb.from('parametres').insert({ cle: 'livres_editions', valeur })
  if (error){ console.error('ERR ' + error.message); process.exit(1) }
  const { data: apres } = await sb.from('parametres').select('valeur').eq('cle','livres_editions').single()
  console.log(`\n${avant ? 'mis à jour' : 'créé'} : parametres.livres_editions (${apres.valeur.length} caractères)`)
} else console.log('\n[DRY] rien écrit')
