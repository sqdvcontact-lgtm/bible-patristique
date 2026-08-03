import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const WRITE = process.argv.includes('--write')
const OEUVRE = 'A0010O0023'
const EMPREINTE = '93ca103f492ba99a3938a0e540b6ee5bd28132bee655369bf3523f1eb959bc74'
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((ligne) => ligne.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const { data: segment, error } = await sb.from('segments')
  .select('id,segment_numero,ref_niv1,ref_niv2,ref_niv2_texte,segment_texte,notes,liens_revus_le,liens_revus_par')
  .eq('id_oeuvre', OEUVRE).eq('segment_numero', 601).single()
if (error) throw error
if (segment.ref_niv1 !== 'Livre deuxième' || segment.ref_niv2 !== 'Question X') throw new Error('Structure inattendue')
const empreinte = createHash('sha256').update(JSON.stringify([
  segment.id, segment.segment_numero, segment.ref_niv1, segment.ref_niv2,
  segment.ref_niv2_texte, segment.segment_texte, segment.notes,
])).digest('hex')
if (empreinte !== EMPREINTE) throw new Error(`Texte modifié : ${empreinte}`)
const { count: existants, error: erreurLiens } = await sb.from('liens_bibliques')
  .select('id', { count: 'exact', head: true }).eq('segment_id', segment.id)
if (erreurLiens) throw erreurLiens
if (existants || segment.liens_revus_le || segment.liens_revus_par) throw new Error('Segment déjà traité')
const liens = [
  [1, 'Citation de Moïse représentant Dieu pour Aaron dans la répartition des fonctions.'],
  [3, 'La médiation de Moïse entre Dieu et Aaron prolonge l’interprétation d’Exode 4,16.'],
]
console.log(JSON.stringify({ mode: WRITE ? 'écriture' : 'contrôle', segment: 601, cible: 'EXO.4.16', liens: liens.length, empreinte }, null, 2))
if (!WRITE) process.exit(0)
const q = (valeur) => `'${String(valeur).replaceAll("'", "''")}'`
const valeurs = liens.map(([type, motif]) => `(${segment.id},'EXO.4.16',${type},'vérifié',${q(motif)},'lecture',false)`).join(',')
const sql = `do $p$ declare n integer; begin if exists(select 1 from liens_bibliques where segment_id=${segment.id}) then raise exception 'Liens présents'; end if; if exists(select 1 from segments where id=${segment.id} and (liens_revus_le is not null or liens_revus_par is not null)) then raise exception 'Déjà relu'; end if; insert into liens_bibliques(segment_id,canon_id,type,fiabilite,motif,provenance,arbitrage_requis) values ${valeurs}; get diagnostics n=row_count; if n<>2 then raise exception 'Liens %',n; end if; update segments set liens_revus_le=now(),liens_revus_par='Codex (IA) - correction oubli Exode Q. X, segment 601' where id=${segment.id}; get diagnostics n=row_count; if n<>1 then raise exception 'Segment %',n; end if; end $p$;`
const { error: erreurEcriture } = await sb.rpc('exec_sql', { sql })
if (erreurEcriture) throw erreurEcriture
const [{ count: apres, error: e1 }, { data: relu, error: e2 }] = await Promise.all([
  sb.from('liens_bibliques').select('id', { count: 'exact', head: true }).eq('segment_id', segment.id),
  sb.from('segments').select('liens_revus_le,liens_revus_par').eq('id', segment.id).single(),
])
if (e1 || e2) throw (e1 || e2)
if (apres !== 2 || !relu.liens_revus_le || !relu.liens_revus_par) throw new Error('Postcontrôle invalide')
console.log('✓ segment 601 relu ; 2 liens écrits')
