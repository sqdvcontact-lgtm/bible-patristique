import{readFileSync}from'node:fs';import{createClient}from'@supabase/supabase-js'
const env=Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/).map(x=>x.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map(m=>[m[1],m[2].replace(/^["']|["']$/g,'')])),sb=createClient(env.NEXT_PUBLIC_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY),CLE='feedback_liens_protocole',titre='#### Homélie XXIII';const{data,error}=await sb.from('parametres').select('valeur').eq('cle',CLE).single();if(error)throw error;let valeur=String(data.valeur??'')
if(!valeur.includes(titre))valeur+=`

${titre}

- Le précepte de 1 Co 10,31 gouverne explicitement les segments 2444-2506 : Chrysostome demande comment manger, demeurer chez soi, louer, blâmer, se taire, se vêtir, se marier, commercer et même punir pour la gloire de Dieu. Cette continuité argumentative justifie le type 3 sur tout le développement.
- Les observations superstitieuses des jours aux segments 2415-2424 commentent directement Ga 4,10-11 ; la fête véritable aux segments 2428-2430 commente 1 Co 5,8. Ces deux sous-commentaires doivent rester distincts du développement principal.
- Le récit de Phinée aux segments 2493-2498 suit Nb 25,6-11 et Ps 105,30-31. Il reçoit une cible de chapitre pour Nb 25, tandis que le psaume est cité littéralement selon la numérotation sémantique de l’ossature.
- Homélie XXIII : 105 segments lus, 130 liens (15 type 1, 16 type 2, 99 type 3, aucun type 4). Le sondage déterministe de 15 liens est juste, aucune cible morte ni aucun doublon n’a été détecté, et les références forment une bijection de 9 appels et 9 définitions.
`
const{error:e2}=await sb.from('parametres').update({valeur,mis_a_jour:new Date().toISOString()}).eq('cle',CLE);if(e2)throw e2;const{data:v,error:e3}=await sb.from('parametres').select('valeur').eq('cle',CLE).single();if(e3)throw e3;if(!String(v.valeur).includes(titre))throw new Error('Mémoire Homélie XXIII non enregistrée');console.log('✓ mémoire feedback_liens_protocole complétée pour l’Homélie XXIII')
