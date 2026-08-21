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
const titre = '#### Homélie XVIII'

if (!valeur.includes(titre)) valeur += `

${titre}

- Une référence marginale absorbée dans le corps peut être méconnaissable sans l’image. « Tob. r » au segment 1869 est le résidu OCR de « Job. 1 », tandis que « Matta. » au segment 1921 vient de « Matt. 12 » : retirer ces fragments du texte, reconstruire les notes et les réancrer sur les citations complètes.
- Les chiffres d’une note doivent être lus sur le fac-similé avant toute correction sémantique. [[328]] est réellement « Rom. 9 », non « Rom. 7 » ; [[329]] porte « 2. Cor. 7 », dont l’import avait perdu le 2 ; [[341]] est « Luc 11 », non le chiffre romain « II ».
- Une faute certaine de l’édition reste littéralement visible dans la note, mais la cible suit la formulation. « Eccl. 22 » vise Si 2,4-5, « Amos 16 » vise Am 6,6 et « Rom. 1 » vise Rm 5,3 ; ces erreurs ne doivent pas être silencieusement normalisées dans l’appareil éditorial.
- Une chaîne très serrée de références doit être reconstruite globalement. Aux segments 1893-1894, les appels des Ps 1, 93, 118, 2, 145 et 111 avaient glissé d’une proposition à l’autre ; chaque marqueur a été retiré puis replacé après sa propre béatitude.
- L’absence de note éditoriale ne dispense jamais de relire la phrase comme une citation. Is 22,4 (« qu’on le laisse pleurer amèrement ») et Ez 18,32 (« il ne veut point la mort du pécheur ») ont été restaurés en notes après confrontation avec le témoin parallèle.
- Le contrôle doit comparer le texte local de la cible, pas seulement une référence mémorisée. Il a permis de distinguer dans l’ossature locale Mt 5,3 (« pauvres en esprit », rendus « humbles ») de Mt 5,5 (« ceux qui pleurent », rendus « affligés ») et d’éviter une inversion des deux liens.
- Un témoin parallèle ne crée pas une citation locale lorsque la traduction diverge. Dans la chaîne des béatitudes, Si 14,2 est attesté par le grec parallèle, mais « selon le cœur de Dieu » ne reprend pas assez précisément le verset français : le rapprochement reste un écho de type 4.
- Homélie XVIII : 91 segments lus, 185 liens (31 type 1, 10 type 2, 143 type 3, 1 type 4). Le contrôle par sondage a été exécuté, les trente-et-une citations ont été vérifiées exhaustivement, et les références éditoriales forment une bijection de 29 appels et 29 définitions.
`

const { error: erreurUpdate } = await sb.from('parametres').update({
  valeur,
  mis_a_jour: new Date().toISOString(),
}).eq('cle', CLE)
if (erreurUpdate) throw erreurUpdate

const { data: verif, error: erreurVerif } = await sb.from('parametres').select('valeur').eq('cle', CLE).single()
if (erreurVerif) throw erreurVerif
if (!String(verif.valeur).includes(titre) || !String(verif.valeur).includes('Homélie XVIII : 91 segments lus, 185 liens')) {
  throw new Error('La mémoire de l’Homélie XVIII n’a pas été enregistrée correctement')
}
console.log('✓ mémoire feedback_liens_protocole complétée pour l’Homélie XVIII')
