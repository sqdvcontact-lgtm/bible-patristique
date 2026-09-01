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
import { mesurerLecteur, type MarquePrelevement } from '@/app/lib/mesuresLecteur'
import {
  etatDesSeries, hautsFaitsEcartes, obtentionsNouvelles, score, serieLaPlusProche,
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
  corpus: { auteurs: number; siecles: number; oeuvres: number }
}

export async function GET() {
  const sb = await creerSupabaseServeur()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié.' }, { status: 401 })

  try {
    // ⛔ UNE SEULE REQUÊTE PAR TABLE, et les mesures se dérivent en mémoire
    // (`mesurerLecteur`). Le référentiel en compte une trentaine depuis la refonte du
    // 1er septembre 2026 : autant de `count(head)` seraient autant d'allers-retours,
    // et surtout une mesure écrite en SQL ici ne pourrait pas être éprouvée.
    // ⚠️ Le plafond PostgREST ne menace pas : ce sont les marques d'UN lecteur.
    const [retenu, referentiel, journal, prelevements, favoris, commentaires, signalements, essais, langues] =
      await Promise.all([
        calculerRetenu(supabaseAdmin, user.id),
        supabaseAdmin.from('hauts_faits')
          .select('code, serie, serie_nom, degre, nom, notice, mesure, seuil, seuil_part, ordre, points, famille')
          .eq('actif', true).order('ordre', { ascending: true }),
        supabaseAdmin.from('hauts_faits_obtenus').select('code, obtenu_le').eq('user_id', user.id),
        supabaseAdmin.from('prelevements')
          .select('type, ref_livre, ref_chapitre, ref_verset, traduction, auteur, titre_oeuvre, created_at')
          .eq('user_id', user.id),
        supabaseAdmin.from('favoris').select('type').eq('user_id', user.id),
        // ⛔ On tire TOUS les commentaires, non les seuls validés : « Premier mot »
        // se gagne au geste, « Bien vu » à la validation, et les deux se comptent ici.
        // La modération reste le garde-fou du seul danger réel du système.
        supabaseAdmin.from('commentaires').select('valide, reponse_a').eq('user_id', user.id),
        supabaseAdmin.from('signalements').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabaseAdmin.from('essais').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('statut', 'publie'),
        // ⛔ Le grec et le latin se reconnaissent à la LANGUE déclarée, jamais à un
        // identifiant écrit en dur : une édition nouvelle ne doit rien demander ici.
        supabaseAdmin.from('traductions').select('trad_id, langue'),
      ])

    if (referentiel.error) return erreur500(referentiel.error, 'Le référentiel n’a pas pu être lu.')
    if (journal.error) return erreur500(journal.error, 'Les hauts faits obtenus n’ont pas pu être lus.')
    const erreurCompte = prelevements.error ?? favoris.error ?? commentaires.error
      ?? signalements.error ?? essais.error ?? langues.error
    if (erreurCompte) return erreur500(erreurCompte, 'Les compteurs n’ont pas pu être établis.')

    const compteurs: Compteurs = {
      ...mesurerLecteur({
        prelevements: (prelevements.data ?? []) as MarquePrelevement[],
        favoris: (favoris.data ?? []) as { type: string | null }[],
        commentaires: (commentaires.data ?? []) as { valide: boolean | null; reponse_a: string | null }[],
        signalements: signalements.count ?? 0,
        essaisPublies: essais.count ?? 0,
        langues: (langues.data ?? []) as { trad_id: string; langue: string | null }[],
      }),
      // ⚠️ Ces deux-là ne se dérivent PAS des marques seules : elles demandent de
      // savoir ce que le corpus porte, et `calculerRetenu` s'en charge.
      peres_retenus: retenu.auteursRetenus,
      siecles_retenus: retenu.sieclesRetenus,
    } as Compteurs
    const corpus = { auteurs: retenu.totalAuteurs, siecles: retenu.totalSiecles, oeuvres: retenu.totalOeuvres }

    // ⛔ Un haut fait écarté ne se signale par RIEN : sa case disparaît du tableau et
    // le total de points baisse. On le dit, plutôt que de laisser un référentiel
    // mal réglé se corriger en silence.
    const ecartes = hautsFaitsEcartes((referentiel.data ?? []) as HautFait[], corpus)
    if (ecartes.length) {
      console.error("Hauts faits : des degrés ont été écartés du tableau.", ecartes)
    }
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
