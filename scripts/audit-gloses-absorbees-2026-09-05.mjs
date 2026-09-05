/**
 * Recherche des gloses absorbées dans le texte canonique de Bible 899.
 *
 * Mt 1,25 sert de cas-test : une glose exégétique y avait été prise dans le
 * verset canonique. La mesure qui la retrouve est le RAPPORT DE LONGUEUR entre
 * le témoin traduit (TR0013) et la Vulgate clémentine (TR0004) pour un même
 * `canon_id`. Une traduction française du XIIIe siècle est naturellement plus
 * longue que son latin, d'un dixième environ ; au-delà du double, la surcharge
 * n'est plus de langue mais de matière.
 *
 * ⛔ Lecture seule. Le tri philologique reste à faire : ce fichier propose des
 * candidats, il ne décide rien.
 *
 * Usage : node scripts/audit-gloses-absorbees-2026-09-05.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const SEUIL_RATIO = 2.2
const SEUIL_LONGUEUR = 220
const SEUIL_VULGATE = 40

const env = Object.fromEntries(
  readFileSync(resolve(racine, '.env.local'), 'utf8').split(/\r?\n/u)
    .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/u)).filter(Boolean)
    .map(m => [m[1], m[2].replace(/^["']|["']$/gu, '')]),
)
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const lireTout = async (trad) => {
  const lignes = []
  for (let debut = 0; ; debut += 1000) {
    const { data, error } = await db.from('versets_v2')
      .select('canon_id,livre,ch_orig,v_orig,texte')
      .eq('trad_id', trad).not('canon_id', 'is', null)
      .order('canon_id').range(debut, debut + 999)
    if (error) throw error
    lignes.push(...data)
    if (data.length < 1000) break
  }
  return lignes
}

const livres899 = new Set((await lireTout('TR0013')).map(l => l.livre))
const temoin = await lireTout('TR0013')
const vulgate = new Map((await lireTout('TR0004')).map(l => [l.canon_id, (l.texte ?? '').length]))

const MARQUEURS = [
  ['c’est-à-dire', /c’est-à-dire/iu],
  ['question', /\?/u],
  ['signifie / vaut autant', /signifie|vaut autant|veut dire/iu],
  ['en latin / en hébreu', /en latin|en hébreu|en grec/iu],
  ['les maîtres / l’Église', /les maîtres|sainte Église/iu],
  ['l’évangéliste / saint', /l’évangéliste|saint (Luc|Jean|Marc|Matthieu)/u],
  ['il faut entendre', /il faut entendre|on croit|on appelle|appelait-on/iu],
]

const candidats = temoin
  .map(l => {
    const n899 = (l.texte ?? '').length
    const nvg = vulgate.get(l.canon_id) ?? 0
    return { ...l, n899, nvg, ratio: nvg > 0 ? n899 / nvg : 0 }
  })
  .filter(c => c.nvg >= SEUIL_VULGATE && c.n899 >= SEUIL_LONGUEUR && c.ratio >= SEUIL_RATIO)
  .sort((a, b) => a.livre.localeCompare(b.livre) || a.ch_orig - b.ch_orig || a.v_orig - b.v_orig)

const parLivre = new Map()
for (const c of candidats) parLivre.set(c.livre, [...(parLivre.get(c.livre) ?? []), c])

const lignes = []
lignes.push('# Bible 899 — gloses absorbées dans le texte canonique')
lignes.push('')
lignes.push('Relevé du 5 septembre 2026, à la suite du détachement de la glose de Mt 1,25.')
lignes.push('')
lignes.push('## Méthode')
lignes.push('')
lignes.push('Pour chaque `canon_id`, on rapporte la longueur du témoin traduit (`TR0013`) à celle')
lignes.push('de la Vulgate clémentine (`TR0004`). Le rapport moyen tourne autour de 1,08 dans les')
lignes.push('livres historiques et monte à 1,41 dans Jean : c’est déjà la signature du corpus glosé.')
lignes.push(`Sont retenus ici les versets dont le rapport atteint ${SEUIL_RATIO} et dont le texte dépasse`)
lignes.push(`${SEUIL_LONGUEUR} signes, la Vulgate comptant au moins ${SEUIL_VULGATE} signes pour que le rapport ait un sens.`)
lignes.push('')
lignes.push('⛔ Un rapport élevé n’est pas une preuve. Il désigne un verset à relire, non une glose à')
lignes.push('détacher. La décision est philologique : elle demande de lire le témoin, de reconnaître')
lignes.push('où finit le texte traduit et où commence le commentaire, et de vérifier la matérialité.')
lignes.push('')
lignes.push('⚠️ Beaucoup de ces versets portent une glose INTERLINÉAIRE, qui alterne plusieurs fois')
lignes.push('avec le texte canonique dans un même verset. Mt 1,25 était un cas simple, en un seul')
lignes.push('bloc. Ceux-là demanderont plusieurs empans surnuméraires par verset, et le modèle de')
lignes.push('rendu ne sait pas encore les replacer dans l’ordre matériel (charte § 15.4).')
lignes.push('')
lignes.push('## Décompte')
lignes.push('')
lignes.push('| Livre | Candidats |')
lignes.push('|---|---|')
for (const [livre, liste] of [...parLivre].sort((a, b) => b[1].length - a[1].length)) {
  lignes.push(`| ${livre} | ${liste.length} |`)
}
lignes.push(`| **Total** | **${candidats.length}** |`)
lignes.push('')
lignes.push(`Corpus mesuré : ${livres899.size} livres, ${temoin.length} versets canoniques de TR0013.`)
lignes.push('')
lignes.push('## Candidats')
lignes.push('')
for (const [livre, liste] of [...parLivre].sort((a, b) => a[0].localeCompare(b[0]))) {
  lignes.push(`### ${livre} (${liste.length})`)
  lignes.push('')
  lignes.push('| Référence | TR0013 | Vulgate | Rapport | Marqueurs | Début |')
  lignes.push('|---|---|---|---|---|---|')
  for (const c of liste) {
    const marqueurs = MARQUEURS.filter(([, re]) => re.test(c.texte ?? '')).map(([nom]) => nom).join(', ') || '—'
    const debut = (c.texte ?? '').slice(0, 150).replace(/\s+/gu, ' ').replace(/\|/gu, '\\|')
    lignes.push(`| ${c.canon_id} | ${c.n899} | ${c.nvg} | ${c.ratio.toFixed(2)} | ${marqueurs} | ${debut}… |`)
  }
  lignes.push('')
}

mkdirSync(resolve(racine, 'audit'), { recursive: true })
const chemin = resolve(racine, 'audit', 'bible899-gloses-absorbees-2026-09-05.md')
writeFileSync(chemin, lignes.join('\n') + '\n', 'utf8')
console.log(`${candidats.length} candidats, ${parLivre.size} livres. Écrit : ${chemin}`)
