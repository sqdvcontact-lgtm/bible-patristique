// Écriture des DIRECTIVES de l'auteur sur les propositions de GPT.
// Les propositions elles-mêmes vivent dans le dépôt (app/admin/propositions-gpt/registre.ts) ;
// seul ce que l'auteur en décide est écrit ici, dans `parametres.directives_propositions_gpt`.
// Vérification admin serveur, écriture par la clé de service (charte §17, §30).
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { estAdmin } from '@/app/lib/verifAdmin'
import { estAdminUtilisateur } from '@/app/lib/verifAdminUtilisateur'
import { CLE_DIRECTIVES, ETATS, LOTS, lireDirectives, type Directives, type EtatArbitrage } from '@/app/admin/propositions-gpt/registre'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const PLAFOND_NOTE = 4000
const PLAFOND_NOTE_GENERALE = 12000

// ⛔ Seuls les identifiants du registre sont acceptés : une clé inventée par le
// client n'entre pas dans le paramètre, qui deviendrait sinon un dépotoir.
const IDS_CONNUS = new Set(LOTS.flatMap(l => l.propositions.map(p => p.id)))

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

  const suivant: Directives = {
    version: 1,
    majLe: new Date().toISOString(),
    noteGenerale: courant.noteGenerale,
    parProposition: { ...courant.parProposition },
  }

  if (typeof body.noteGenerale === 'string') {
    suivant.noteGenerale = body.noteGenerale.slice(0, PLAFOND_NOTE_GENERALE)
  }

  const id = typeof body.id === 'string' ? body.id : null
  if (id) {
    if (!IDS_CONNUS.has(id)) {
      return NextResponse.json({ error: `Proposition inconnue : ${id}` }, { status: 400 })
    }
    const actuelle = courant.parProposition[id] ?? { etat: 'a_arbitrer' as EtatArbitrage, note: '' }
    const etat = ETATS.some(e => e.cle === body.etat) ? (body.etat as EtatArbitrage) : actuelle.etat
    const note = typeof body.note === 'string' ? body.note.slice(0, PLAFOND_NOTE) : actuelle.note
    suivant.parProposition[id] = { etat, note }
  }

  const { error } = await supabaseAdmin
    .from('parametres')
    .upsert({ cle: CLE_DIRECTIVES, valeur: JSON.stringify(suivant), mis_a_jour: suivant.majLe }, { onConflict: 'cle' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, majLe: suivant.majLe })
}
