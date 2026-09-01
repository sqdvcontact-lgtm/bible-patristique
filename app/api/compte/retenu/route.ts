// CE QUE LE LECTEUR A RETENU DES PÈRES — la matière de sa carte.
//
// ⛔ Elle ne dit PAS ce qu'il a lu, et ne le prétend pas. Décision de l'auteur du
// 1er septembre 2026 : on ne trace rien. La carte se bâtit sur ce que le lecteur a
// MARQUÉ de lui-même — un passage prélevé, une œuvre mise en bibliothèque. Une
// ouverture de page ne prouve pas une lecture, et une carte qu'on sait imméritée
// dévalue tout le reste ; un geste volontaire, lui, prouve.
//
// ⚠️ Trois autres raisons tiennent avec celle-là. Une carte remplie toute seule se
// comble sans qu'on ait creusé aucun écart, et la curiosité s'éteint avec eux
// (Loewenstein). Une trace automatique fait qu'on se sait observé, et l'on finit par
// lire pour la carte. Enfin, sur un corpus religieux, le temps passé sur un passage
// est une donnée intime qu'on n'écrit pas sans nécessité.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { creerSupabaseServeur } from '@/app/lib/supabaseServeur'
import { erreur500 } from '@/app/lib/apiErreur'
import { idOeuvreDeRef } from '@/app/lib/refsFavoris'
import { MARQUEUR_OEUVRE_DEPUBLIEE } from '@/app/lib/oeuvresPublication'
import { rangDuSiecle, siecleNormalise } from '@/app/lib/siecles'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export type AuteurRetenu = { id: string; nom: string; retenu: boolean }
export type SiecleRetenu = { rang: number; libelle: string; auteurs: AuteurRetenu[] }

export type CarteRetenue = {
  total: number
  retenus: number
  siecles: SiecleRetenu[]
  /** Le siècle où il manque le MOINS d'auteurs, et combien. Voir plus bas. */
  prochain: { libelle: string; manquent: number } | null
}

export async function GET() {
  const sb = await creerSupabaseServeur()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  try {
    const [oeuvresRes, prelevementsRes, favorisRes] = await Promise.all([
      // Le dénominateur de la carte : les auteurs qu'on peut RÉELLEMENT lire. Une
      // œuvre dépubliée, ou qui n'a pas encore reçu son texte, ne rend pas son auteur
      // atteignable — l'y compter creuserait un écart que rien ne permet de combler.
      //
      // ⚠️ Le texte se constate sur `nb_signes`, JAMAIS en interrogeant `segments` :
      // celle-ci est la plus lourde du corpus, et cinq index GIN y pèsent déjà. Les
      // deux critères désignent aujourd'hui les mêmes 45 œuvres et les mêmes 15
      // auteurs, l'écart tenant à trois titres de Jérôme dont le texte n'est pas
      // encore posé, et qui ont d'autres œuvres pour le représenter.
      supabaseAdmin.from('oeuvres')
        .select('id_oeuvre, id_auteur, note, nb_signes, auteurs!oeuvres_id_auteur_fkey(nom, siecle)'),
      supabaseAdmin.from('prelevements').select('id_oeuvre')
        .eq('user_id', user.id).eq('type', 'patristique').not('id_oeuvre', 'is', null),
      supabaseAdmin.from('favoris').select('ref_id')
        .eq('user_id', user.id).eq('type', 'oeuvre'),
    ])
    if (oeuvresRes.error) return erreur500(oeuvresRes.error, 'Le corpus n’a pas pu être lu.')
    if (prelevementsRes.error) return erreur500(prelevementsRes.error, 'Les passages retenus n’ont pas pu être lus.')
    if (favorisRes.error) return erreur500(favorisRes.error, 'La bibliothèque n’a pas pu être lue.')

    type LigneOeuvre = { id_oeuvre: string; id_auteur: string; note: string | null; nb_signes: number | null; auteurs: { nom: string; siecle: string | null } | null }
    const oeuvres = (oeuvresRes.data ?? []) as unknown as LigneOeuvre[]

    const auteursLisibles = new Map<string, { nom: string; siecle: string | null }>()
    // ⚠️ Cette table-ci retient TOUTES les œuvres, dépubliées comprises : elle sert à
    // ramener une marque à son auteur, et une marque posée avant une dépublication
    // reste une marque. C'est le DÉNOMINATEUR qui se restreint, non le numérateur.
    const auteurParOeuvre = new Map<string, string>()
    for (const o of oeuvres) {
      auteurParOeuvre.set(o.id_oeuvre, o.id_auteur)
      if (o.note === MARQUEUR_OEUVRE_DEPUBLIEE) continue
      if ((o.nb_signes ?? 0) <= 0) continue
      if (o.auteurs) auteursLisibles.set(o.id_auteur, { nom: o.auteurs.nom, siecle: o.auteurs.siecle })
    }

    // Les marques, ramenées à leurs auteurs.
    const retenus = new Set<string>()
    for (const p of prelevementsRes.data ?? []) {
      const auteur = auteurParOeuvre.get(p.id_oeuvre as string)
      if (auteur && auteursLisibles.has(auteur)) retenus.add(auteur)
    }
    for (const f of favorisRes.data ?? []) {
      // Une référence suffixée « #la » désigne le texte original lu seul : elle se
      // résout sur l'œuvre porteuse (app/lib/refsFavoris.ts).
      const auteur = auteurParOeuvre.get(idOeuvreDeRef(f.ref_id as string))
      if (auteur && auteursLisibles.has(auteur)) retenus.add(auteur)
    }

    // ⚠️ Le classement passe par `rangDuSiecle` et JAMAIS par un tri sur le champ
    // texte : « auteurs.siecle » est libre, et trié comme du texte, « IXe » passerait
    // avant « Ve ». Voir app/lib/siecles.tsx.
    const parSiecle = new Map<number, { libelle: string; auteurs: AuteurRetenu[] }>()
    for (const [id, { nom, siecle }] of auteursLisibles) {
      const rang = rangDuSiecle(siecle)
      if (!parSiecle.has(rang)) parSiecle.set(rang, { libelle: siecleNormalise(siecle), auteurs: [] })
      parSiecle.get(rang)!.auteurs.push({ id, nom, retenu: retenus.has(id) })
    }

    const siecles: SiecleRetenu[] = [...parSiecle.entries()]
      .map(([rang, { libelle, auteurs }]) => ({
        rang, libelle,
        auteurs: auteurs.sort((a, b) => a.nom.localeCompare(b.nom, 'fr')),
      }))
      .sort((a, b) => a.rang - b.rang)

    // ⛔ LE PETIT ÉCART, ET LUI SEUL. Loewenstein : la curiosité naît d'un écart perçu
    // entre ce qu'on sait et ce qu'on veut savoir, et les PETITS écarts l'excitent
    // quand les grands l'éteignent. On ne montre donc jamais l'immensité de ce qui
    // reste, mais le siècle où il manque le moins d'auteurs. À égalité, le plus ancien.
    const incomplets = siecles
      .map(s => ({ libelle: s.libelle, rang: s.rang, manquent: s.auteurs.filter(a => !a.retenu).length }))
      .filter(s => s.manquent > 0)
      .sort((a, b) => a.manquent - b.manquent || a.rang - b.rang)

    const carte: CarteRetenue = {
      total: auteursLisibles.size,
      retenus: retenus.size,
      siecles,
      prochain: incomplets[0] ? { libelle: incomplets[0].libelle, manquent: incomplets[0].manquent } : null,
    }

    return NextResponse.json(carte, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (e) {
    return erreur500(e, 'La carte n’a pas pu être établie.')
  }
}
