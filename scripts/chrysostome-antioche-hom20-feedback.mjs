import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((ligne) => ligne.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const CLE = 'feedback_liens_protocole'
const titre = '#### Homélie XX'
const { data, error } = await sb.from('parametres').select('valeur').eq('cle', CLE).single()
if (error) throw error
let valeur = String(data.valeur ?? '')
if (!valeur.includes(titre)) valeur += `

${titre}

- Cette homélie est principalement un récit ecclésiastique : le retour de Flavien et son plaidoyer devant Théodose. Une faible densité biblique est donc normale et préférable à la création de rapprochements génériques.
- La note [[352]] « Gen. 3 » accompagne l’initiative de l’empereur envers l’évêque coupable ; le parallèle vise vraisemblablement Dieu abordant Adam après sa faute (Gn 3,9), mais demeure de type 4 faute de reprise verbale.
- Les allusions les plus fermes reposent sur des marqueurs distinctifs : « père du mensonge » (Jn 8,44), l’espérance-ancre (He 6,19), Moïse remontant après la faute du peuple (Ex 32,30-31), la promesse du pardon (Mt 6,14), Joseph retenant ses larmes (Gn 42,24) et la prière du Crucifié (Lc 23,34).
- Homélie XX : 109 segments lus, 13 liens (10 type 2, 3 type 4, aucun type 1 ni type 3), aucune cible morte ni aucun doublon, et une bijection de 1 appel et 1 définition de note.
`
const { error: erreurUpdate } = await sb.from('parametres').update({ valeur, mis_a_jour: new Date().toISOString() }).eq('cle', CLE)
if (erreurUpdate) throw erreurUpdate
const { data: verif, error: erreurVerif } = await sb.from('parametres').select('valeur').eq('cle', CLE).single()
if (erreurVerif) throw erreurVerif
if (!String(verif.valeur).includes(titre)) throw new Error('Mémoire Homélie XX non enregistrée')
console.log('✓ mémoire feedback_liens_protocole complétée pour l’Homélie XX')
