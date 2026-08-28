/**
 * § 35.6.1 : un sous-titre se détache par un POINT.
 *
 * Décision de l'auteur du 28 août 2026, la troisième du jour sur ce joint et
 * celle qui tient : `*Évangile selon saint Jean. Introduction critique et
 * commentaires*`. Un sous-titre EST un sous-titre, non une apposition qu'un
 * deux-points introduirait — et la virgule prescrite jusqu'au matin ne le
 * détachait pas davantage.
 *
 * ⛔ N'écrit QUE dans `parametres.charte_ia` ; le miroir s'en régénère.
 * Usage : node scripts/charte-sous-titre-point-2026-08-28.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')

const REMPLACEMENTS = [
  {
    nom: 'prescription du joint (§ 35.6.1)',
    avant: 'ils se composent tous deux en italique et se joignent par un **deux-points**, précédé de son espace insécable `U+00A0`, non par une virgule ni par un point : `*Évangile selon saint Jean : Introduction critique et commentaires*`. ⚠️ Décision de l’auteur du 28 août 2026, qui remplace la virgule prescrite jusque-là.',
    apres: 'ils se composent tous deux en italique et se joignent par un **point** : `*Évangile selon saint Jean. Introduction critique et commentaires*`. Un sous-titre EST un sous-titre, non une apposition qu’un deux-points introduirait. ⚠️ Décision de l’auteur du 28 août 2026, qui remplace le deux-points prescrit le matin même, lequel remplaçait la virgule : ⛔ ni virgule, ni deux-points, ni l’espace insécable qui précédait celui-ci. ⚠️ Un titre qui se ferme DÉJÀ sur une ponctuation forte n’en reçoit pas une seconde, sa ponctuation attestée détachant à elle seule : `*Où en est la question biblique ? Réponse à quelques objections*`.',
  },
  {
    nom: 'exemple de la description matérielle',
    avant: 'La forme affichée est donc : intitulé, lieu, éditeur normalisé, année, point final — `*Évangile selon saint Jean : Introduction critique et commentaires*, Paris, Lethielleux, 1887.`',
    apres: 'La forme affichée est donc : intitulé, lieu, éditeur normalisé, année, point final — `*Évangile selon saint Jean. Introduction critique et commentaires*, Paris, Lethielleux, 1887.`',
  },
  {
    nom: 'ponctuation sans style propre (§ 35.6.2)',
    avant: 'elle appartient à la séquence où elle tombe et en hérite — le deux-points qui joint le titre au sous-titre reste ainsi dans l’italique du titre.',
    apres: 'elle appartient à la séquence où elle tombe et en hérite — le point qui joint le titre au sous-titre reste ainsi dans l’italique du titre.',
  },
]

const env = Object.fromEntries(
  readFileSync(resolve(racine, '.env.local'), 'utf8')
    .split(/\r?\n/u)
    .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/u))
    .filter(Boolean)
    .map(m => [m[1], m[2].replace(/^["']|["']$/gu, '')]),
)
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const { data, error } = await db.from('parametres').select('valeur').eq('cle', 'charte_ia').single()
if (error) throw error

let texte = data.valeur
for (const { nom, avant, apres } of REMPLACEMENTS) {
  const n = texte.split(avant).length - 1
  if (n !== 1) throw new Error(`motif « ${nom} » : ${n} occurrence(s), 1 attendue.`)
  texte = texte.split(avant).join(apres)
}
console.log(JSON.stringify({
  avant: data.valeur.length, apres: texte.length, delta: texte.length - data.valeur.length,
  essai_seul: essaiSeul,
}, null, 2))
if (essaiSeul) { console.log('Essai seul : rien n’a été écrit.'); process.exit(0) }
const { error: err } = await db.from('parametres').update({ valeur: texte }).eq('cle', 'charte_ia')
if (err) throw err
console.log('Charte à jour. Régénérer le miroir : node scripts/synchroniser-charte-supabase.mjs --pull')
