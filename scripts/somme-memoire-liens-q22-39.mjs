import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .filter((x) => x && !x.startsWith('#')).map((x) => {
    const i = x.indexOf('=')
    return [x.slice(0, i), x.slice(i + 1).replace(/^["']|["']$/g, '')]
  }))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const cle = 'feedback_liens_protocole'
const titre = '#### Somme théologique — validation IIa-IIae, questions 22 à 39 (29 juillet 2026)'
const { data, error } = await sb.from('parametres').select('valeur').eq('cle', cle).single()
if (error) throw error
let valeur = String(data.valeur ?? '')
if (!valeur.includes(titre)) {
  valeur += `\n\n${titre}\n\n- Les 1 100 segments des questions 22 à 39 ont été lus puis réaudités exhaustivement après une quarantaine préventive. État final : questions 22–27, 149 liens vérifiés ; questions 28–33, 133 liens ciblés vérifiés et 4 arbitrages sans cible ; questions 34–39, 104 liens vérifiés.\n- Le défaut principal rencontré était la sur-extension des types 3 à des réponses ou segments voisins. Un type 3 ne doit rester que si le segment lui-même interprète réellement le verset ou l’épisode visé ; une continuité thématique ou un simple mot commun ne suffit pas.\n- Pour contrôler un segment multiréférentiel, isoler l’ancre locale de chaque lien. Ne jamais comparer toutes les cibles à la première citation du segment. Pour les Psaumes et autres numérotations Vulgate, comparer les témoins TR0001/TR0004 aussi bien que TR0003.\n- Les sondages finaux ont porté séparément sur 15 types 1 et 15 types 3, sans erreur constatée. La reprise fiable peut continuer à la question 40 ; les questions 1 à 19 restent un chantier rétrospectif distinct.\n`
  const { error: updateError } = await sb.from('parametres').update({ valeur, mis_a_jour: new Date().toISOString() }).eq('cle', cle)
  if (updateError) throw updateError
}
console.log('Mémoire Q22-39 enregistrée.')
