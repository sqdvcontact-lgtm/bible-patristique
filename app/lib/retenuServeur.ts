// CE QUE LE LECTEUR A RETENU — le calcul, une seule fois.
//
// ⛔ Il ne sert plus qu'UNE route, /api/compte/hauts-faits, dont deux séries se
// comptent sur ces chiffres. Il en servait deux : la carte /api/compte/retenu est
// retirée avec elle (charte § 40.3). ⚠️ Il RESTE malgré tout un module à part et
// ne se replie pas dans la route qui l'appelle : `peres_retenus` et
// `siecles_retenus` sont la même mesure que le rang lit ailleurs, et une seconde
// écriture ferait lire douze Pères d'un côté, onze de l'autre.
//
// ⛔ Il ne dit PAS ce que le lecteur a LU, et ne le prétend pas. Décision de l'auteur
// du 1er septembre 2026 : on ne trace rien. Ce sont les marques volontaires qui
// comptent — un passage prélevé, une œuvre mise en bibliothèque. Une ouverture de page
// ne prouve pas une lecture, et une carte qu'on sait imméritée dévalue tout le reste.
//
// ⚠️ Le client passe en paramètre : ce module ne fabrique aucune connexion, et ne
// porte donc aucune clé. Il s'appelle depuis une route, jamais depuis le navigateur.

import type { SupabaseClient } from '@supabase/supabase-js'
import { idOeuvreDeRef } from './refsFavoris'
import { MARQUEUR_OEUVRE_DEPUBLIEE } from './oeuvresPublication'
import { rangDuSiecle, siecleNormalise } from './siecles'

export type AuteurRetenu = { id: string; nom: string; retenu: boolean }
export type SiecleRetenu = { rang: number; libelle: string; auteurs: AuteurRetenu[] }

export type Retenu = {
  /** Les auteurs que la bibliothèque donne réellement à lire. */
  totalAuteurs: number
  /** Les siècles qu'ils couvrent. */
  totalSiecles: number
  auteursRetenus: number
  sieclesRetenus: number
  siecles: SiecleRetenu[]
}

type LigneOeuvre = {
  id_oeuvre: string
  id_auteur: string
  note: string | null
  nb_signes: number | null
  auteurs: { nom: string; siecle: string | null } | null
}

export async function calculerRetenu(sb: SupabaseClient, userId: string): Promise<Retenu> {
  const [oeuvresRes, prelevementsRes, favorisRes] = await Promise.all([
    // ⚠️ Le texte se constate sur `nb_signes`, JAMAIS en interrogeant `segments` :
    // celle-ci est la plus lourde du corpus et cinq index GIN y pèsent déjà. Les deux
    // critères désignent les mêmes 45 œuvres et les mêmes 15 auteurs au 1er septembre
    // 2026, l'écart tenant à trois titres de Jérôme dont le texte n'est pas encore
    // posé, et qui ont d'autres œuvres pour le représenter.
    sb.from('oeuvres').select('id_oeuvre, id_auteur, note, nb_signes, auteurs!oeuvres_id_auteur_fkey(nom, siecle)'),
    sb.from('prelevements').select('id_oeuvre')
      .eq('user_id', userId).eq('type', 'patristique').not('id_oeuvre', 'is', null),
    sb.from('favoris').select('ref_id').eq('user_id', userId).eq('type', 'oeuvre'),
  ])
  if (oeuvresRes.error) throw oeuvresRes.error
  if (prelevementsRes.error) throw prelevementsRes.error
  if (favorisRes.error) throw favorisRes.error

  const oeuvres = (oeuvresRes.data ?? []) as unknown as LigneOeuvre[]

  const auteursLisibles = new Map<string, { nom: string; siecle: string | null }>()
  // ⚠️ Cette table-ci retient TOUTES les œuvres, dépubliées comprises : elle sert à
  // ramener une marque à son auteur, et une marque posée avant une dépublication reste
  // une marque. C'est le DÉNOMINATEUR qui se restreint, non le numérateur.
  const auteurParOeuvre = new Map<string, string>()
  for (const o of oeuvres) {
    auteurParOeuvre.set(o.id_oeuvre, o.id_auteur)
    if (o.note === MARQUEUR_OEUVRE_DEPUBLIEE) continue
    if ((o.nb_signes ?? 0) <= 0) continue
    if (o.auteurs) auteursLisibles.set(o.id_auteur, { nom: o.auteurs.nom, siecle: o.auteurs.siecle })
  }

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

  // ⚠️ Le classement passe par `rangDuSiecle` et JAMAIS par un tri sur le champ texte :
  // `auteurs.siecle` est libre, et trié comme du texte, « IXe » passe avant « Ve ».
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

  return {
    totalAuteurs: auteursLisibles.size,
    totalSiecles: siecles.length,
    auteursRetenus: retenus.size,
    sieclesRetenus: siecles.filter(s => s.auteurs.some(a => a.retenu)).length,
    siecles,
  }
}
