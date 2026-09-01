// LES HAUTS FAITS D'UN LECTEUR — état, et constat des nouvelles obtentions.
//
// ⛔ L'obtention se CONSTATE ICI, jamais dans le navigateur. La table
// `hauts_faits_obtenus` n'a aucune politique d'écriture pour un compte ordinaire : un
// client qui pourrait y insérer s'attribuerait le haut fait le plus rare. C'est la
// même leçon que le portrait — RLS borne la ligne qu'un lecteur modifie, jamais la
// valeur qu'il y écrit.
//
// ⚠️ Le constat se fait à la LECTURE de la page, et non au moment du geste. C'est un
// choix assumé pour l'instant : il évite un déclencheur par table marquée, et il place
// la découverte là où le lecteur vient justement regarder sa collection.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { creerSupabaseServeur } from '@/app/lib/supabaseServeur'
import { erreur500 } from '@/app/lib/apiErreur'
import { calculerRetenu } from '@/app/lib/retenuServeur'
import {
  etatDesSeries, obtentionsNouvelles, score, serieLaPlusProche,
  type Compteurs, type HautFait, type Score, type SerieEtat,
} from '@/app/lib/hautsFaits'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

/** En deçà, la rareté ne se calcule pas : « obtenu par un lecteur sur six » ne dit
 *  rien de la difficulté, seulement de la jeunesse du site. Elle ne s'allume donc
 *  qu'une fois la population assez large pour que le chiffre veuille dire quelque
 *  chose — et les seuils eux-mêmes se recalibreront alors, en base. */
const POPULATION_MINIMALE_POUR_LA_RARETE = 50

export type ReponseHautsFaits = {
  series: SerieEtat[]
  /** La série dont le degré suivant est le plus proche, toutes séries confondues. */
  enVue: string | null
  /** Ce qui vient d'être atteint, pour le signaler à l'écran. */
  nouveaux: string[]
  /** Part des lecteurs qui ont chaque haut fait, ou null tant que c'est trop tôt. */
  rarete: Record<string, number> | null
  /** ⛔ Ne s'échange contre rien : une mesure, jamais une monnaie (charte § 40). */
  score: Score
  corpus: { auteurs: number; siecles: number }
}

export async function GET() {
  const sb = await creerSupabaseServeur()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  try {
    const compte = (table: string, filtres: Record<string, string | boolean> = {}) => {
      let q = supabaseAdmin.from(table).select('id', { count: 'exact', head: true }).eq('user_id', user.id)
      for (const [col, val] of Object.entries(filtres)) q = q.eq(col, val)
      return q
    }

    const [retenu, referentiel, journal, passages, oeuvres, commentaires, essais] = await Promise.all([
      calculerRetenu(supabaseAdmin, user.id),
      supabaseAdmin.from('hauts_faits')
        .select('code, serie, serie_nom, degre, nom, notice, mesure, seuil, seuil_part, ordre, points, famille')
        .eq('actif', true).order('ordre', { ascending: true }),
      supabaseAdmin.from('hauts_faits_obtenus').select('code, obtenu_le').eq('user_id', user.id),
      compte('prelevements'),
      compte('favoris', { type: 'oeuvre' }),
      // ⛔ Le rang ne compte que le VALIDÉ. C'est le seul garde-fou contre le seul
      // danger réel du système : dix commentaires creux postés pour le compteur. La
      // modération existe déjà — autant s'en servir. Le parcours d'entrée, lui, coche
      // le geste sans attendre, parce qu'il enseigne au lieu de classer.
      compte('commentaires', { valide: true }),
      compte('essais', { statut: 'publie' }),
    ])

    if (referentiel.error) return erreur500(referentiel.error, 'Le référentiel n’a pas pu être lu.')
    if (journal.error) return erreur500(journal.error, 'Les hauts faits obtenus n’ont pas pu être lus.')
    const erreurCompte = passages.error ?? oeuvres.error ?? commentaires.error ?? essais.error
    if (erreurCompte) return erreur500(erreurCompte, 'Les compteurs n’ont pas pu être établis.')

    const compteurs: Compteurs = {
      passages_retenus: passages.count ?? 0,
      oeuvres_bibliotheque: oeuvres.count ?? 0,
      peres_retenus: retenu.auteursRetenus,
      siecles_retenus: retenu.sieclesRetenus,
      commentaires_valides: commentaires.count ?? 0,
      essais_publies: essais.count ?? 0,
    }
    const corpus = { auteurs: retenu.totalAuteurs, siecles: retenu.totalSiecles }
    const obtenus = new Map((journal.data ?? []).map(o => [o.code as string, o.obtenu_le as string]))

    const series = etatDesSeries((referentiel.data ?? []) as HautFait[], compteurs, corpus, obtenus)
    const nouveaux = obtentionsNouvelles(series, obtenus)

    if (nouveaux.length) {
      // ⚠️ `ignoreDuplicates` : deux onglets ouverts constatent la même obtention en
      // même temps, et la seconde insertion ne doit pas faire échouer la page.
      const { error } = await supabaseAdmin.from('hauts_faits_obtenus')
        .upsert(nouveaux.map(code => ({ user_id: user.id, code })), { onConflict: 'user_id,code', ignoreDuplicates: true })
      if (error) console.error('Hauts faits : les obtentions n’ont pas pu être inscrites.', error)
    }

    // La rareté, si la population le permet. On compte les lecteurs qui ont au moins
    // un haut fait : c'est d'eux que la part se calcule, et non de tous les inscrits,
    // dont beaucoup n'ont encore rien marqué.
    let rarete: Record<string, number> | null = null
    const { data: toutes } = await supabaseAdmin.from('hauts_faits_obtenus').select('user_id, code')
    const lignes = toutes ?? []
    const lecteurs = new Set(lignes.map(l => l.user_id as string)).size
    if (lecteurs >= POPULATION_MINIMALE_POUR_LA_RARETE) {
      const parCode = new Map<string, number>()
      for (const l of lignes) parCode.set(l.code as string, (parCode.get(l.code as string) ?? 0) + 1)
      rarete = Object.fromEntries([...parCode].map(([code, n]) => [code, n / lecteurs]))
    }

    const reponse: ReponseHautsFaits = {
      series,
      enVue: serieLaPlusProche(series)?.serie ?? null,
      nouveaux,
      rarete,
      score: score(series),
      corpus,
    }
    return NextResponse.json(reponse, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (e) {
    return erreur500(e, 'Les hauts faits n’ont pas pu être établis.')
  }
}
