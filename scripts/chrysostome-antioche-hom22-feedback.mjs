import{readFileSync}from'node:fs';import{createClient}from'@supabase/supabase-js'
const env=Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/).map(x=>x.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')])),sb=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY),CLE='feedback_liens_protocole',titre='#### Homélie XXII'
const{data,error}=await sb.from('parametres').select('valeur').eq('cle',CLE).single();if(error)throw error;let valeur=String(data.valeur??'')
if(!valeur.includes(titre))valeur+=`

${titre}

- Le pardon des injures est organisé autour de passages déterminés et non d’un thème biblique vague : Si 28,2 aux segments 2250-2281, Mt 5,44 aux segments 2291-2303, Mt 5,23-24 aux segments 2313-2322, puis Mt 6,12.14-15 et Mt 18,35 aux segments 2330-2346.
- Le récit de Marie lépreuse et de l’intercession de Moïse constitue un commentaire suivi de Nb 12 aux segments 2304-2307 ; la note [[363]] et la formulation permettent de distribuer Nb 12,10.13-15 et de poser la cible de chapitre.
- La conversion de Ninive reçoit à la fois les versets locaux de Jon 3, une cible de chapitre sur le récit suivi, puis Mt 12,41 lorsque Chrysostome cite le jugement des Ninivites. La leçon « encore trois jours » diffère du texte local de Jon 3,4 mais l’intention de citer reste explicite.
- Homélie XXII : 162 segments lus, 137 liens (15 type 1, 16 type 2, 104 type 3, 2 type 4). Le sondage déterministe de 15 liens est juste, aucune cible morte ni aucun doublon n’a été détecté, et les références forment une bijection de 5 appels et 5 définitions.
`
const{error:e2}=await sb.from('parametres').update({valeur,mis_a_jour:new Date().toISOString()}).eq('cle',CLE);if(e2)throw e2
const{data:v,error:e3}=await sb.from('parametres').select('valeur').eq('cle',CLE).single();if(e3)throw e3;if(!String(v.valeur).includes(titre))throw new Error('Mémoire Homélie XXII non enregistrée');console.log('✓ mémoire feedback_liens_protocole complétée pour l’Homélie XXII')
