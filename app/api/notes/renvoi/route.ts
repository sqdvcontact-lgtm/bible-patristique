/**
 * LA NOTE VISÉE PAR UN RENVOI — sa tête et son contenu, par son identité stable.
 *
 * `GET /api/notes/renvoi?texte={id_texte}&note={note_key}` rend
 * `{ tete, note }` : la tête résolue sur le texte tel qu'il est servi (numéro affiché,
 * titre de niveau 1 de l'ancre actuelle) et la note dans ses blocs actuels, ses propres
 * renvois compris, tête résolue. C'est ce qui permet à une note ouverte dans une note de
 * se déplier à son tour.
 *
 * ⛔ Elle lit avec la SESSION DU VISITEUR (`creerSupabaseServeur`), jamais avec la clé de
 * service : la politique de lecture des notes et celle des renvois font la garde. Une note
 * que ce lecteur ne peut pas lire rend 404, comme une note qui n'existe pas.
 * ⛔ Aucun numéro, aucune lettre, aucune page n'identifie la note : sa clé, et elle seule.
 * ⚠️ Rien ne se met en cache, ni au navigateur ni au bord : la réponse dépend de la
 * session, et la note visée peut avoir changé depuis la dernière lecture.
 */

import { NextResponse, type NextRequest } from 'next/server'
import { creerSupabaseServeur } from '@/app/lib/supabaseServeur'
import { chargerNotePourRenvoi } from '@/app/lib/notesStructureesChargement'
import { messageDErreur } from '@/app/lib/chargementTolerant'

export const runtime = 'nodejs'

const ENTETES = { 'Cache-Control': 'private, no-store' }

/** Une clé lisible : de un à deux cents signes, sans caractère de commande. ⚠️ Le test porte
 *  sur les POINTS DE CODE : un caractère de commande écrit dans une expression rationnelle
 *  finit, d'un outil d'édition à l'autre, par devenir le caractère lui-même dans la source. */
function cleValide(valeur: string | null): valeur is string {
  if (typeof valeur !== 'string' || valeur.length === 0 || valeur.length > 200) return false
  for (const signe of valeur) {
    const code = signe.codePointAt(0) ?? 0
    if (code < 32 || code === 127) return false
  }
  return true
}

export async function GET(requete: NextRequest) {
  const texte = requete.nextUrl.searchParams.get('texte')
  const note = requete.nextUrl.searchParams.get('note')
  if (!cleValide(texte) || !cleValide(note)) {
    return NextResponse.json({ erreur: 'Paramètres invalides.' }, { status: 400, headers: ENTETES })
  }
  try {
    const supabase = await creerSupabaseServeur()
    const resultat = await chargerNotePourRenvoi(supabase, { idTexte: texte, noteKey: note }, new Map())
    if (!resultat.note) return NextResponse.json(resultat, { status: 404, headers: ENTETES })
    return NextResponse.json(resultat, { headers: ENTETES })
  } catch (erreur) {
    console.error(`[renvois] note visée illisible (${texte} | ${note}) : ${messageDErreur(erreur)}`)
    return NextResponse.json({ erreur: 'La note visée n’a pas pu être chargée.' }, { status: 500, headers: ENTETES })
  }
}
