import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const WRITE = process.argv.includes('--write')
const MOTIF = 'RÉFÉRENCE NON BIBLIQUE (Père de l’Église) : renvoi interne d’Augustin à son Sermon IV, n° 16-24 ; cible de corpus à constituer.'
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((ligne) => ligne.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]))
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const { data: segment, error: erreurSegment } = await supabase.from('segments')
  .select('id,segment_numero,segment_texte,notes,liens_revus_le,liens_revus_par')
  .eq('id_oeuvre', 'A0010O0023').eq('segment_numero', 235).single()
if (erreurSegment) throw erreurSegment
if (!segment.liens_revus_le || !segment.liens_revus_par || !segment.notes?.includes('Sermon IV')) throw new Error('Préétat segment 235 inattendu')
const { data: existants, error: erreurExistants } = await supabase.from('liens_bibliques').select('*').eq('segment_id', segment.id)
if (erreurExistants) throw erreurExistants
if (existants.length) throw new Error(`Préétat : ${existants.length} lien(s) déjà présent(s)`)
console.log(JSON.stringify({ mode: WRITE ? 'écriture' : 'contrôle', segment: 235, ajout: { type: 4, fiabilite: 'à constituer', motif: MOTIF } }, null, 2))
if (!WRITE) process.exit(0)

const q = (valeur) => `'${String(valeur).replaceAll("'", "''")}'`
const sql = `do $correction$ declare n integer; begin
  if exists(select 1 from liens_bibliques where segment_id=${segment.id}) then raise exception 'Lien déjà présent'; end if;
  insert into liens_bibliques(segment_id,type,fiabilite,motif,provenance,arbitrage_requis)
  values(${segment.id},4,'à constituer',${q(MOTIF)},'lecture',true);
  get diagnostics n=row_count; if n<>1 then raise exception 'Insertion %/1',n; end if;
end $correction$;`
const { error: erreurEcriture } = await supabase.rpc('exec_sql', { sql })
if (erreurEcriture) throw erreurEcriture
const { data: apres, error: erreurApres } = await supabase.from('liens_bibliques').select('*').eq('segment_id', segment.id).single()
if (erreurApres) throw erreurApres
if (apres.canon_id || apres.verset_v2_id || apres.livre || apres.chapitre || apres.type !== 4 || apres.fiabilite !== 'à constituer' || !apres.arbitrage_requis || apres.motif !== MOTIF) {
  throw new Error('Postétat invalide')
}
console.log('✓ Renvoi interne du segment 235 consigné sans cible')
