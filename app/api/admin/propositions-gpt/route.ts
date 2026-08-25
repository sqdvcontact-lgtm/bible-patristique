// Écriture des DIRECTIVES de l'auteur sur les propositions de GPT.
// Les propositions elles-mêmes vivent dans le dépôt (app/admin/propositions-gpt/registre.ts) ;
// seul ce que l'auteur en décide est écrit ici, dans `parametres.directives_propositions_gpt`.
// Vérification admin serveur, écriture par la clé de service (charte §17, §30).
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { estAdmin } from '@/app/lib/verifAdmin'
import { estAdminUtilisateur } from '@/app/lib/verifAdminUtilisateur'
import {
  CLE_DIRECTIVES, DIRECTIVE_VIDE, ETATS, LOTS, VOIX,
  lireDirectives, lireMessages,
  type Directives, type EtatArbitrage, type Message,
} from '@/app/admin/propositions-gpt/registre'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ⛔ Seuls les identifiants du registre sont acceptés : une clé inventée par le
// client n'entre pas dans le paramètre, qui deviendrait sinon un dépotoir.
const IDS_CONNUS = new Set(LOTS.flatMap(l => l.propositions.map(p => p.id)))

/** ⛔ La DATE est posée ici, jamais par le client : une consigne ne s'antidate pas.
 *  Un message déjà daté garde sa date, sinon toute la liste se redaterait à chaque
 *  ajout ou suppression. */
function dater(messages: Message[], quand: string): Message[] {
  return messages.map(m => ({ texte: m.texte, posee: m.posee ?? quand }))
}

export async function POST(request: Request) {
  if (!(await estAdminUtilisateur(request)) && !(await estAdmin())) {
    return NextResponse.json({ error: 'Non autorisé.' }, { status: 401 })
  }

  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Corps de requête illisible.' }, { status: 400 })
  }

  // On relit l'état ENREGISTRÉ avant d'écrire : deux onglets ouverts sur la page ne
  // doivent pas se recouvrir l'un l'autre en entier. Chaque envoi ne porte que ce
  // qu'il change.
  const { data: existant, error: erreurLecture } = await supabaseAdmin
    .from('parametres').select('valeur').eq('cle', CLE_DIRECTIVES).maybeSingle()
  if (erreurLecture) {
    return NextResponse.json({ error: erreurLecture.message }, { status: 500 })
  }
  const courant = lireDirectives(existant?.valeur)
  const maintenant = new Date().toISOString()

  const suivant: Directives = {
    version: 1,
    majLe: maintenant,
    instructionsGenerales: courant.instructionsGenerales,
    reponsesGenerales: courant.reponsesGenerales,
    parProposition: { ...courant.parProposition },
  }

  if ('instructionsGenerales' in body) {
    suivant.instructionsGenerales = dater(lireMessages(body.instructionsGenerales), maintenant)
  }
  if ('reponsesGenerales' in body) {
    suivant.reponsesGenerales = dater(lireMessages(body.reponsesGenerales), maintenant)
  }

  const id = typeof body.id === 'string' ? body.id : null
  if (id) {
    if (!IDS_CONNUS.has(id)) {
      return NextResponse.json({ error: `Proposition inconnue : ${id}` }, { status: 400 })
    }
    const actuelle = courant.parProposition[id] ?? DIRECTIVE_VIDE
    const etat = ETATS.some(e => e.cle === body.etat) ? (body.etat as EtatArbitrage) : actuelle.etat
    // Les deux voix s'écrivent par le même chemin, jamais l'une dans l'autre.
    const voix = Object.fromEntries(VOIX.map(v => [
      v.cle,
      v.cle in body ? dater(lireMessages(body[v.cle]), maintenant) : actuelle[v.cle],
    ])) as Pick<typeof actuelle, 'instructions' | 'reponses'>
    suivant.parProposition[id] = { etat, ...voix }
  }

  const { error } = await supabaseAdmin
    .from('parametres')
    .upsert({ cle: CLE_DIRECTIVES, valeur: JSON.stringify(suivant), mis_a_jour: maintenant }, { onConflict: 'cle' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // On rend ce qui a été ÉCRIT : le client reprend les dates posées ici plutôt que
  // d'en inventer, et deux onglets se recalent l'un sur l'autre.
  return NextResponse.json({
    ok: true,
    majLe: maintenant,
    instructionsGenerales: suivant.instructionsGenerales,
    reponsesGenerales: suivant.reponsesGenerales,
    instructions: id ? suivant.parProposition[id].instructions : undefined,
    reponses: id ? suivant.parProposition[id].reponses : undefined,
  })
}
