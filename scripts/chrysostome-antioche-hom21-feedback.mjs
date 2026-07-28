import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'
const env=Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/).map(x=>x.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')]))
const sb=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY),CLE='feedback_liens_protocole',titre='#### Homélie XXI'
const{data,error}=await sb.from('parametres').select('valeur').eq('cle',CLE).single();if(error)throw error
let valeur=String(data.valeur??'')
if(!valeur.includes(titre))valeur+=`

${titre}

- Une note imprimée peut être manifestement décalée ou fautive sans empêcher l’identification sémantique : [[353]] « Matt. 6 » accompagne He 3,7-8 ; [[358]] « Luc 3 » tombe avant le développement qui cite réellement Mt 3,8-9 ; la cible suit les mots du texte.
- La chaîne des noms du Christ aux segments 2155-2158 réunit Ga 3,27, Jn 6,56-57, Jn 15,5.15, 2 Co 11,2, Rm 8,29 et 1 Co 12,27. Chaque formule reçoit sa cible propre au lieu d’être rattachée globalement à la note voisine.
- Trois applications continues justifient le type 3 : la robe nuptiale appliquée à la grâce baptismale (2164-2166), les fruits de pénitence avant le baptême (2169-2175), et la parure chrétienne opposée au luxe (2212-2217). Le rachat à grand prix gouverne 2220-2224.
- Homélie XXI : 104 segments lus, 53 liens (18 type 1, 14 type 2, 21 type 3, aucun type 4). Le sondage déterministe de 15 liens est juste, aucune cible morte ni aucun doublon n’a été détecté, et les références forment une bijection de 8 appels et 8 définitions.
`
const{error:e2}=await sb.from('parametres').update({valeur,mis_a_jour:new Date().toISOString()}).eq('cle',CLE);if(e2)throw e2
const{data:v,error:e3}=await sb.from('parametres').select('valeur').eq('cle',CLE).single();if(e3)throw e3
if(!String(v.valeur).includes(titre))throw new Error('Mémoire Homélie XXI non enregistrée')
console.log('✓ mémoire feedback_liens_protocole complétée pour l’Homélie XXI')
