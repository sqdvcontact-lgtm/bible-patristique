import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const OEUVRE = 'A0010O0023'
const WRITE = process.argv.includes('--write')
const RELECTEUR = 'Codex (IA) — lecture intégrale Heptateuque, Genèse Q. I-X'

// [segment_numero, canon_id, type, motif]
// Chaque ligne résulte d'une lecture du segment et d'une confrontation aux
// trois témoins de versets_lecture. Les références de titre n'ont pas été
// propagées mécaniquement.
const LIENS = [
  [8, 'GEN.4.17', 3, 'Question précise sur la possibilité pour Caïn de bâtir la ville mentionnée en Genèse 4,17.'],
  [9, 'GEN.4.17', 3, 'Réponse exégétique à Genèse 4,17 : la longue durée des premières vies explique une population suffisante.'],
  [10, 'GEN.4.17', 3, 'Genèse 5,4 est invoqué comme preuve dans l’explication de la ville bâtie par Caïn en Genèse 4,17.'],
  [10, 'GEN.5.4', 1, 'Citation explicite vérifiée : Adam « engendra des fils et des filles ».'],
  [11, 'GEN.4.17', 3, 'Conclusion de l’explication démographique de la ville de Caïn mentionnée en Genèse 4,17.'],

  [12, 'GEN.5.25', 3, 'Début de la supputation de l’âge de Mathusalem examinée à propos de sa survie supposée au déluge.'],
  [12, 'GEN.5.27', 3, 'L’âge total et la mort de Mathusalem sont au centre de la difficulté chronologique examinée.'],
  [12, 'GEN.5.28', 3, 'L’âge de Lamech à la naissance de Noé entre dans la supputation chronologique examinée.'],
  [12, 'GEN.7.6', 3, 'L’âge de Noé lors du déluge entre dans la supputation de la date de la mort de Mathusalem.'],
  [13, 'GEN.5.25', 3, 'Discussion textuelle des données chronologiques relatives à Mathusalem dans les témoins hébreu et grec.'],
  [13, 'GEN.5.27', 3, 'Conclusion textuelle sur la mort de Mathusalem avant le déluge, à partir de son âge total.'],
  [13, 'GEN.5.28', 3, 'La chronologie de Lamech et Noé contribue à dater la mort de Mathusalem avant le déluge.'],
  [13, 'GEN.7.6', 3, 'L’âge de Noé au déluge fixe le terme de la comparaison chronologique.'],

  [14, 'GEN.6.4', 3, 'Exégèse directe des fils de Dieu, des filles des hommes et des géants de Genèse 6,4.'],
  [15, 'GEN.6.4', 3, 'Poursuite de l’interprétation des « fils de Dieu » de Genèse 6,4 comme hommes justes.'],
  [15, 'MAL.3.1', 1, 'Citation explicite vérifiée : « Voici que j’envoie mon ange devant moi pour préparer ton chemin ».'],
  [16, 'GEN.6.4', 3, 'Réponse à la difficulté de Genèse 6,4 sur la naissance des géants.'],
  [17, 'GEN.6.4', 3, 'Conclusion exégétique : les fils de Dieu de Genèse 6,4 sont préférablement des hommes justes.'],

  [18, 'GEN.6.15', 3, 'Question précise sur la capacité de l’arche à partir des dimensions données en Genèse 6,15.'],
  [19, 'GEN.6.15', 3, 'Interprétation des coudées de Genèse 6,15 comme coudées géométriques afin d’expliquer la capacité de l’arche.'],
  [19, 'ACT.7.22', 1, 'Citation explicite vérifiée : Moïse fut instruit dans toute la sagesse des Égyptiens.'],
  [20, 'GEN.6.15', 3, 'Conclusion du calcul de capacité fondé sur les dimensions de Genèse 6,15.'],
  [21, 'GEN.6.15', 3, 'Nouvelle question précise sur la construction de l’arche aux dimensions données en Genèse 6,15.'],
  [22, 'GEN.6.15', 3, 'Réponse à la difficulté de construction de l’arche décrite en Genèse 6,15 : recours possible à des ouvriers.'],

  [23, 'GEN.6.16', 1, 'Citation explicite vérifiée des étages de l’arche décrits en Genèse 6,16.'],
  [23, 'GEN.6.16', 3, 'Ouverture d’une explication textuelle des étages de l’arche en Genèse 6,16.'],
  [24, 'GEN.6.16', 3, 'Interprétation détaillée du premier, du second et du troisième étage de Genèse 6,16.'],
  [25, 'GEN.6.16', 3, 'Conclusion architecturale de l’explication des trois étages de Genèse 6,16.'],

  [26, 'GEN.6.21', 1, 'Référence intentionnelle vérifiée à l’ordre de prendre des aliments pour Noé et les animaux.'],
  [26, 'GEN.6.21', 3, 'Question exégétique précise sur la nourriture des animaux carnivores prescrite en Genèse 6,21.'],
  [27, 'GEN.6.21', 3, 'Réponse à la difficulté alimentaire soulevée par Genèse 6,21.'],

  [28, 'GEN.7.8', 1, 'Citation explicite vérifiée des animaux purs et impurs, des oiseaux et de ce qui rampe.'],
  [28, 'GEN.7.9', 1, 'Suite explicite vérifiée : entrée dans l’arche deux à deux, mâle et femelle.'],
  [28, 'GEN.7.8', 3, 'Glose textuelle sur l’application de la distinction pur/impur à ce qui rampe en Genèse 7,8.'],
  [28, 'GEN.7.9', 3, 'Ouverture de l’explication de l’expression « deux à deux » en Genèse 7,9.'],
  [29, 'GEN.7.8', 3, 'Explication de la distinction entre animaux purs et impurs dans la séquence de Genèse 7,8-9.'],
  [29, 'GEN.7.9', 3, '« Deux à deux » est interprété du sexe, non de la quantité, en commentaire de Genèse 7,9.'],

  [30, 'GEN.7.15', 1, 'Citation explicite vérifiée : « en qui est l’esprit de vie ».'],
  [30, 'GEN.7.15', 3, 'Explication textuelle de l’expression « esprit de vie » appliquée aux animaux en Genèse 7,15.'],
  [30, 'GEN.2.7', 1, 'Citation explicite vérifiée du souffle de vie insufflé à l’homme en Genèse 2,7.'],
  [30, 'GEN.2.7', 3, 'Discussion de la variante et de l’interprétation « Esprit-Saint » / « souffle de vie » en Genèse 2,7.'],

  [31, 'GEN.7.20', 1, 'Référence intentionnelle vérifiée aux quinze coudées d’eau au-dessus des montagnes.'],
  [31, 'GEN.7.20', 3, 'Question et réponse physiques sur l’élévation des eaux décrite en Genèse 7,20.'],
]

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((ligne) => ligne.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/))
  .filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]))
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const { data: segments, error: erreurSegments } = await supabase.from('segments')
  .select('id,segment_numero,ref_niv2,segment_texte,notes,liens_revus_le,liens_revus_par')
  .eq('id_oeuvre', OEUVRE).gte('segment_numero', 8).lte('segment_numero', 31).order('segment_numero')
if (erreurSegments) throw erreurSegments
if (segments.length !== 24 || segments[0]?.segment_numero !== 8 || segments.at(-1)?.segment_numero !== 31) {
  throw new Error(`Préétat inattendu : ${segments.length} segments`)
}
if (segments.some((segment) => segment.liens_revus_le || segment.liens_revus_par)) {
  throw new Error('Préétat inattendu : un segment du pilote est déjà marqué relu')
}

const parNumero = new Map(segments.map((segment) => [segment.segment_numero, segment]))
if (LIENS.some(([numero]) => !parNumero.has(numero))) throw new Error('Un numéro de segment du manifeste est absent')
const cles = LIENS.map(([numero, canon, type]) => `${numero}|${canon}|${type}`)
if (new Set(cles).size !== cles.length) throw new Error('Doublon interne dans le manifeste')

const cibles = [...new Set(LIENS.map(([, canon]) => canon))]
const { data: temoins, error: erreurTemoins } = await supabase.from('versets_lecture')
  .select('id_verset').in('id_verset', cibles)
if (erreurTemoins) throw erreurTemoins
const presents = new Set(temoins.map((temoin) => temoin.id_verset))
const absents = cibles.filter((cible) => !presents.has(cible))
if (absents.length) throw new Error(`Cibles absentes de versets_lecture : ${absents.join(', ')}`)

const ids = segments.map((segment) => segment.id)
const { data: existants, error: erreurExistants } = await supabase.from('liens_bibliques')
  .select('id').in('segment_id', ids)
if (erreurExistants) throw erreurExistants
if (existants.length) throw new Error(`Préétat inattendu : ${existants.length} lien(s) existe(nt) déjà dans le pilote`)

const types = LIENS.reduce((compte, [, , type]) => ({ ...compte, [type]: (compte[type] ?? 0) + 1 }), {})
console.log(JSON.stringify({
  mode: WRITE ? 'écriture' : 'contrôle',
  segments: segments.length,
  liens: LIENS.length,
  cibles_distinctes: cibles.length,
  types,
}, null, 2))
if (!WRITE) process.exit(0)

const q = (valeur) => `'${String(valeur).replaceAll("'", "''")}'`
const valeurs = LIENS.map(([numero, canon, type, motif]) => {
  const segmentId = parNumero.get(numero).id
  return `(${segmentId},${q(canon)},${type},'vérifié',${q(motif)},'lecture',false)`
}).join(',\n    ')
const idSql = ids.join(',')
const sql = `do $pilote$
declare n integer;
begin
  if exists (select 1 from liens_bibliques where segment_id in (${idSql})) then
    raise exception 'Le pilote possède déjà des liens';
  end if;
  if exists (select 1 from segments where id in (${idSql}) and (liens_revus_le is not null or liens_revus_par is not null)) then
    raise exception 'Le pilote possède déjà des marques de relecture';
  end if;
  insert into liens_bibliques
    (segment_id,canon_id,type,fiabilite,motif,provenance,arbitrage_requis)
  values
    ${valeurs};
  get diagnostics n=row_count;
  if n<>${LIENS.length} then raise exception 'Liens écrits : % au lieu de ${LIENS.length}',n; end if;
  update segments set liens_revus_le=now(), liens_revus_par=${q(RELECTEUR)}
  where id in (${idSql});
  get diagnostics n=row_count;
  if n<>24 then raise exception 'Segments marqués : % au lieu de 24',n; end if;
end $pilote$;`

const { error: erreurEcriture } = await supabase.rpc('exec_sql', { sql })
if (erreurEcriture) throw erreurEcriture

const [{ count: liensApres, error: erreurLiensApres }, { count: relusApres, error: erreurRelusApres }] = await Promise.all([
  supabase.from('liens_bibliques').select('id', { count: 'exact', head: true }).in('segment_id', ids),
  supabase.from('segments').select('id', { count: 'exact', head: true }).in('id', ids).not('liens_revus_le', 'is', null),
])
if (erreurLiensApres) throw erreurLiensApres
if (erreurRelusApres) throw erreurRelusApres
if (liensApres !== LIENS.length || relusApres !== 24) {
  throw new Error(`Postétat invalide : ${liensApres} liens, ${relusApres} segments relus`)
}
console.log(`✓ ${liensApres} liens vérifiés écrits ; ${relusApres} segments marqués relus`)
