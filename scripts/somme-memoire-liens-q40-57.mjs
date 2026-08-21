import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .filter((x) => x && !x.startsWith('#')).map((x) => {
    const i = x.indexOf('=')
    return [x.slice(0, i), x.slice(i + 1).replace(/^["']|["']$/g, '')]
  }))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const cle = 'feedback_liens_protocole'
const titre = '#### Somme théologique — validation IIa-IIae, questions 40 à 57 (29 juillet 2026)'
const { data, error } = await sb.from('parametres').select('valeur').eq('cle', cle).single()
if (error) throw error
let valeur = String(data.valeur ?? '')
if (!valeur.includes(titre)) {
  valeur += `\n\n${titre}\n\n- Les 839 segments des questions 40 à 57 ont été lus intégralement en trois lots parallèles, puis contrôlés transversalement. État final cumulé Q22–57 : 1 939 segments marqués, 655 liens (540 type 1, 8 type 2, 94 type 3, 9 type 4), dont 651 ciblés vérifiés et 4 arbitrages sans cible. Aucun doublon, cible canonique morte, motif vide ou résidu de quarantaine.\n- Le contrôle transversal des types 4 est obligatoire : une référence éditoriale explicite vérifiée relève du type 1 ; une explication/application du type 3 ; seuls les échos narratifs, lexicaux ou théologiques moins directs restent type 4. Q22–39 : 12 type 4 réaudités, 5 retypés, 1 supprimé ; Q40–57 : 19 réaudités, 16 retypés.\n- Corrections de vigilance : « sagesse descend d’en haut » vise Jc 3,17 et non Jc 3,15 ; « celui qui aime Dieu, qu’il aime aussi son frère » vise 1 Jn 4,21 et non Jn 4,21. Contrôler spécialement les confusions Jn/1 Jn et les négations du verset témoin.\n- Les requêtes Supabase sont plafonnées à 1 000 lignes par défaut : tout audit dépassant ce seuil doit paginer explicitement ou interroger question par question. Une extraction à 1 000/1 100 segments est incomplète même si elle ne renvoie pas d’erreur.\n- La reprise fiable peut continuer à la question 58. Avancement global nominal : 15 419 / 32 367 segments, soit 47,64 %.\n`
  const { error: updateError } = await sb.from('parametres').update({ valeur, mis_a_jour: new Date().toISOString() }).eq('cle', cle)
  if (updateError) throw updateError
}
console.log('Mémoire Q40-57 enregistrée.')
