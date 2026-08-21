import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const OEUVRE = 'A0010O0023'
const WRITE = process.argv.includes('--write')
const AJOUTS = [
  [65, 'ACT.7.2', 1, 'Référence intentionnelle vérifiée au début du récit de saint Étienne : apparition de Dieu à Abraham en Mésopotamie.'],
  [65, 'ACT.7.3', 1, 'Référence intentionnelle vérifiée au récit de saint Étienne : ordre donné à Abraham de quitter son pays et sa parenté.'],
  [65, 'ACT.7.4', 1, 'Référence intentionnelle vérifiée à la suite du récit de saint Étienne : départ de Chaldée, séjour à Haran et transfert après la mort du père.'],
  [94, null, 4, 'RÉFÉRENCE NON BIBLIQUE (source antique) : renvoi explicite à Aulu-Gelle, Nuits attiques, livre XIX, pour la discussion stoïcienne des émotions premières du sage ; cible de corpus à constituer.'],
  [1397, 'EXO.26.12', 3, 'L’anticipation littéraire évoquée concerne la demi-tenture surnuméraire à cacher derrière le tabernacle, passage annoncé puis cité au segment suivant.'],
  [1406, 'EXO.26.12', 3, 'La transition distingue la difficulté déjà examinée sur la demi-tenture surnuméraire de la question suivante.'],
  [1406, 'EXO.26.13', 3, 'La nouvelle question annoncée porte sur la coudée excédentaire de chaque côté des tentures, citée immédiatement après.'],
  [1633, 'LEV.8.28', 3, 'La relation logique entre le particulier et le tout explique le sacrifice collectif d’installation offert par Moïse.'],
  [1633, 'LEV.8.29', 3, 'La poitrine reçue par Moïse dans le rite collectif demeure comprise dans l’opposition entre offrande publique et offrande personnelle.'],
  [1655, 'EXO.27.1', 3, 'Le silence de l’Écriture porte sur le moyen de desservir un autel haut de trois coudées sans degré adhérent.'],
  [1655, 'EXO.20.26', 3, 'La question est motivée par le silence entre l’interdiction des degrés adhérents et la nécessité pratique de s’élever jusqu’à l’autel.'],
]
const NUMEROS = [...new Set(AJOUTS.map(([numero]) => numero))]
const CIBLES = [...new Set(AJOUTS.map(([, cible]) => cible).filter(Boolean))]
const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]))
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})
const { data: segments, error: erreurSegments } = await db.from('segments')
  .select('id,segment_numero,segment_texte,notes,liens_revus_le,liens_revus_par')
  .eq('id_oeuvre', OEUVRE).in('segment_numero', NUMEROS).order('segment_numero')
if (erreurSegments) throw erreurSegments
if (segments.length !== NUMEROS.length || segments.some((segment) => !segment.liens_revus_le || !segment.liens_revus_par)) {
  throw new Error('Préétat des segments invalide')
}
const parNumero = new Map(segments.map((segment) => [segment.segment_numero, segment]))
const ids = segments.map((segment) => segment.id)
const { count: existants, error: erreurExistants } = await db.from('liens_bibliques')
  .select('id', { count: 'exact', head: true }).in('segment_id', ids)
if (erreurExistants) throw erreurExistants
if (existants !== 0) throw new Error(`Préétat invalide : ${existants} lien(s) existent déjà sur les segments corrigés`)
const { data: temoins, error: erreurTemoins } = await db.from('versets_lecture')
  .select('id_verset,"TR0001","TR0003","TR0004"').in('id_verset', CIBLES)
if (erreurTemoins) throw erreurTemoins
const parCible = new Map(temoins.map((temoin) => [temoin.id_verset, temoin]))
const invalides = CIBLES.filter((cible) => {
  const temoin = parCible.get(cible)
  return !temoin || (!temoin.TR0001 && !temoin.TR0003 && !temoin.TR0004)
})
if (invalides.length) throw new Error(`Cibles invalides : ${invalides.join(', ')}`)
console.log(JSON.stringify({
  mode: WRITE ? 'écriture' : 'contrôle',
  segments_corriges: NUMEROS,
  liens_ajoutes: AJOUTS.length,
  types: { 1: AJOUTS.filter((ajout) => ajout[2] === 1).length, 3: AJOUTS.filter((ajout) => ajout[2] === 3).length, 4: AJOUTS.filter((ajout) => ajout[2] === 4).length },
  segments_sans_lien_attendus_apres: [1, 2, 3, 4, 5, 64, 1296, 1396, 1593, 3262],
  avancement: '3262 / 3262 = 100,00 %',
}, null, 2))
if (!WRITE) process.exit(0)

const quote = (value) => `'${String(value).replaceAll("'", "''")}'`
const valeurs = AJOUTS.map(([numero, cible, type, motif]) => {
  const segmentId = parNumero.get(numero).id
  const fiabilite = cible ? 'vérifié' : 'à constituer'
  return `(${segmentId},${cible ? quote(cible) : 'null'},${type},${quote(fiabilite)},${quote(motif)},'lecture',${cible ? 'false' : 'true'})`
}).join(',\n')
const sql = `do $p$ declare n integer; begin
  if exists (select 1 from liens_bibliques where segment_id in (${ids.join(',')})) then raise exception 'Liens déjà présents'; end if;
  insert into liens_bibliques(segment_id,canon_id,type,fiabilite,motif,provenance,arbitrage_requis) values ${valeurs};
  get diagnostics n = row_count;
  if n <> ${AJOUTS.length} then raise exception 'Liens insérés : %', n; end if;
end $p$;`
const { error: erreurEcriture } = await db.rpc('exec_sql', { sql })
if (erreurEcriture) throw erreurEcriture
const { data: apres, error: erreurApres } = await db.from('liens_bibliques')
  .select('segment_id,canon_id,type,fiabilite,motif,provenance,arbitrage_requis').in('segment_id', ids)
if (erreurApres) throw erreurApres
if (apres.length !== AJOUTS.length || apres.some((lien) => !lien.motif || lien.provenance !== 'lecture'
  || (lien.canon_id ? lien.fiabilite !== 'vérifié' || lien.arbitrage_requis
    : lien.fiabilite !== 'à constituer' || !lien.arbitrage_requis || lien.type !== 4))) {
  throw new Error('Postcontrôle invalide')
}
console.log(`✓ ${apres.length} liens ajoutés sur ${NUMEROS.length} segments`)
