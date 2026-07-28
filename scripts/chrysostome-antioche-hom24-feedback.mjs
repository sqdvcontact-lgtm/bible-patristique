import{readFileSync}from'node:fs';import{createClient}from'@supabase/supabase-js'
const env=Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/).map(x=>x.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')])),sb=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY),CLE='feedback_liens_protocole',titre='#### Homélie XXIV';const{data,error}=await sb.from('parametres').select('valeur').eq('cle',CLE).single();if(error)throw error;let valeur=String(data.valeur??'')
if(!valeur.includes(titre))valeur+=`

${titre}

- L’homélie distingue deux Épiphanies par Tt 2,11-13, puis explique pourquoi la fête désigne le baptême et non la naissance du Christ. Jn 1,26.33 gouverne la manifestation au Jourdain ; Mt 3 gouverne ensuite les raisons et la justice du baptême.
- La comparaison des baptêmes doit conserver ses articulations : Mt 3,8.11 pour Jean, Ac 19,2-6 pour les disciples rebaptisés et recevant l’Esprit, puis Mt 3,14-17 pour le Christ. Ac 19 et Mt 3 reçoivent chacun une cible de chapitre sur leur commentaire suivi.
- Une note imprimée peut viser le mauvais livre : [[378]] « Tit. 2. 13 » accompagne en réalité Jl 3,4, identifié par le soleil changé en ténèbres et la lune en sang. La note reste littérale, la cible suit le texte.
- Homélie XXIV : 88 segments lus, 115 liens (23 type 1, 12 type 2, 80 type 3, aucun type 4). Le sondage déterministe de 15 liens est juste, aucune cible morte ni aucun doublon n’a été détecté, et les références forment une bijection de 10 appels et 10 définitions.
`
const{error:e2}=await sb.from('parametres').update({valeur,mis_a_jour:new Date().toISOString()}).eq('cle',CLE);if(e2)throw e2;const{data:v,error:e3}=await sb.from('parametres').select('valeur').eq('cle',CLE).single();if(e3)throw e3;if(!String(v.valeur).includes(titre))throw new Error('Mémoire Homélie XXIV non enregistrée');console.log('✓ mémoire feedback_liens_protocole complétée pour l’Homélie XXIV')
