import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((ligne) => ligne.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const CLE = 'feedback_liens_protocole'

const { data, error } = await sb.from('parametres').select('valeur').eq('cle', CLE).single()
if (error) throw error
let valeur = String(data.valeur ?? '')
const titre = '#### Homélie XIX'

if (!valeur.includes(titre)) valeur += `

${titre}

- Deux références marginales étaient absorbées dans le corps par l’OCR : « Zach. s. » au segment 1953 et « Terem. » au segment 1980. Elles ont été retirées du texte et restaurées comme notes vers Zacharie 5 et Jérémie 38, après contrôle de la formulation.
- Une note de chapitre peut être matériellement fautive tout en accompagnant une citation identifiable. [[342]] « Tim. 1 » vise 1 Tm 6,8 : nourriture et vêtement suffisent. Les notes [[346]] « Ezech. 7 » et [[347]] « 1. Rois » tombent au milieu d’une citation continue d’Ez 17,16-20 ; la cible suit le texte, la note conserve la leçon imprimée.
- Les prophéties apparemment contraires sur Sédécias doivent être résolues par leur contenu et non par l’ordre des appels. Ez 12,13 annonce qu’il sera conduit à Babylone sans la voir ; Jr 32,5 annonce qu’il y sera conduit. Les appels [[349]] et [[350]] sont matériellement croisés par rapport aux deux propositions françaises.
- L’Homélie XIX est structurée par quatre commentaires suivis : Za 5 aux segments 1953-1955, Ez 17 aux segments 1965-1975, Jr 38 aux segments 1980-1985 et 2 R 25 aux segments 1976-1979 puis 1986-1995. Les digressions et changements de source interrompent les cibles de chapitre au lieu d’être englobés artificiellement.
- Le récit de la prise de Jérusalem suit assez précisément 2 R 25 pour distribuer les liens vers le siège, la famine, l’incendie, les objets du Temple, les prisonniers et le supplice de Sédécias. Le chapitre entier reste attaché à la narration, tandis que les versets précis rendent chaque scène accessible.
- L’interdiction de jurer en Mt 5,34 gouverne le développement pastoral des segments 1998-2025 : comparaison avec l’ancienne alliance, lutte contre l’habitude, mémorisation du précepte et projet d’en faire une règle distinctive d’Antioche. La continuité argumentative justifie le type 3 sur chacun de ces segments.
- Homélie XIX : 101 segments lus, 179 liens (30 type 1, 26 type 2, 123 type 3, aucun type 4). Le sondage déterministe est juste à 15/15, les trente citations ont été contrôlées exhaustivement, aucune cible morte ni aucun doublon n’a été détecté, et les références éditoriales forment une bijection de 12 appels et 12 définitions.
`

const { error: erreurUpdate } = await sb.from('parametres').update({
  valeur,
  mis_a_jour: new Date().toISOString(),
}).eq('cle', CLE)
if (erreurUpdate) throw erreurUpdate

const { data: verif, error: erreurVerif } = await sb.from('parametres').select('valeur').eq('cle', CLE).single()
if (erreurVerif) throw erreurVerif
if (!String(verif.valeur).includes(titre) || !String(verif.valeur).includes('Homélie XIX : 101 segments lus, 179 liens')) {
  throw new Error('La mémoire de l’Homélie XIX n’a pas été enregistrée correctement')
}
console.log('✓ mémoire feedback_liens_protocole complétée pour l’Homélie XIX')
