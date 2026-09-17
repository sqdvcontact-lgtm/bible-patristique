/**
 * LES NOTES ÉDITORIALES D'UNE BIBLE ENTIÈRE, pour l'onglet « Notes » du volet de droite de la
 * page Bible.
 *
 * `GET /api/admin/notes-versets?trad=TR0001&lecture=vue-large` rend `{ fenetres, absentes }` :
 * les fenêtres de notes que la page compose sur chaque chapitre de chaque livre de la bible
 * (identifiant d'appel, livre, rang, repères, paragraphes), et les notes qu'elle ne pose nulle
 * part, avec leur raison. `lecture=canon-v2` pour une bible lue par le canon ;
 * `lecture=regard&famille={uuid}&parLeCanon=TR0013` pour la lecture en regard.
 *
 * ⛔ Réservée à l'administrateur, comme l'onglet : elle rejoue la composition de chapitres
 * entiers, et montre ce que la page ne pose pas.
 * ⛔ Elle lit avec la SESSION de l'administrateur (`creerSupabaseServeur`), jamais avec la clé de
 * service : elle ne montre que ce que la page peut montrer.
 * ⚠️ Rien ne se met en cache : la réponse dépend de la session, et les notes bougent.
 */

import { NextResponse, type NextRequest } from 'next/server'
import { creerSupabaseServeur } from '@/app/lib/supabaseServeur'
import { estAdmin } from '@/app/lib/verifAdmin'
import { messageDErreur } from '@/app/lib/chargementTolerant'
import { releverNotesEditorialesDeLaBible } from '@/app/lib/notesVersetsV2InventaireServeur'
import { lectureDemandee } from '@/app/lib/notesVersetsV2Inventaire'

export const runtime = 'nodejs'
/** Une bible entière lue au verset relit ses chapitres annotés : on laisse le temps. */
export const maxDuration = 60

const ENTETES = { 'Cache-Control': 'private, no-store' }
export async function GET(requete: NextRequest) {
  const demande = lectureDemandee(requete.nextUrl.searchParams)
  if (!demande) return NextResponse.json({ erreur: 'Paramètres invalides.' }, { status: 400, headers: ENTETES })
  if (!(await estAdmin())) return NextResponse.json({ erreur: 'Réservé à l’administration.' }, { status: 403, headers: ENTETES })
  try {
    const supabase = await creerSupabaseServeur()
    const releve = await releverNotesEditorialesDeLaBible(supabase, demande)
    return NextResponse.json(releve, { headers: ENTETES })
  } catch (erreur) {
    console.error(`[notes éditoriales] relevé illisible (${demande.trad} | ${demande.lecture.lecture}) : ${messageDErreur(erreur)}`)
    return NextResponse.json({ erreur: 'Les notes éditoriales n’ont pas pu être relevées.' }, { status: 500, headers: ENTETES })
  }
}
