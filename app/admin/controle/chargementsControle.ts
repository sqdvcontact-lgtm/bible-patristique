// Les lectures du centre de contrôle, réunies pour que chaque vue ne demande que la sienne.
//
// ⛔ UNE VUE NE CHARGE QUE CE QU'ELLE MONTRE. Le centre de contrôle tenait en deux pages d'un
// seul tenant : l'une attendait le contrat du contrôle v2, l'autre le tableau de bord du
// corpus entier. La première s'est fermée le jour où son contrat a dépassé son délai
// (23,7 s mesurées le 13 septembre 2026, pour huit secondes accordées à la clé de service),
// et elle emportait avec elle tout ce qui ne dépendait pas de lui. Le volet ne lit plus que
// les intitulés, une mission sa note et ses tâches, et chaque calcul lourd se fait attendre
// dans la seule vue qui le demande.
import { cache } from 'react'
import { createClient } from '@supabase/supabase-js'
import { estAdmin } from '@/app/lib/verifAdmin'
import { composerMissions, type LigneMission, type Mission, type Todo } from './missions'

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export type ErreurPostgrest = { message?: string; code?: string; details?: string; hint?: string }

/** Le code d'un dépassement du `statement_timeout`, seul cas où une reprise a un sens. */
export const CODE_DELAI_DEPASSE = '57014'

/** Le layout et la page vérifient tous deux : React ne pose la question qu'une fois par requête. */
export const estAdminDeLaRequete = cache(estAdmin)

/** Les intitulés du volet, et rien d'autre : la note de « Qualité du texte » pèse à elle seule
 *  117 Ko et ses tâches 250 Ko, qu'aucune entrée du volet n'a besoin de lire. */
export const chargerMissions = cache(async (): Promise<{ missions: Mission[]; erreur: ErreurPostgrest | null }> => {
  const { data, error } = await supabaseAdmin
    .from('controle_sections')
    .select('cle, titre, ordre')
    .order('ordre', { ascending: true })
  if (error) console.error('[controle] lecture des missions :', error)
  return { missions: composerMissions((data ?? []) as LigneMission[]), erreur: error }
})

export type FicheMission = {
  cle: string
  titre: string | null
  ordre: number | null
  commentaire_ia: string | null
  todos: Todo[] | null
  maj_le: string | null
}

export const chargerFicheMission = cache(async (cle: string): Promise<{ fiche: FicheMission | null; erreur: ErreurPostgrest | null }> => {
  const { data, error } = await supabaseAdmin
    .from('controle_sections')
    .select('cle, titre, ordre, commentaire_ia, todos, maj_le')
    .eq('cle', cle)
    .maybeSingle()
  if (error) console.error(`[controle] lecture de la mission ${cle} :`, error)
  return { fiche: (data ?? null) as FicheMission | null, erreur: error }
})

// ── Le tableau de bord du corpus ─────────────────────────────────────────────

export type TableauBord = {
  genere_le: string
  qualite_calcule_le: string | null
  corpus: { oeuvres_total: number; oeuvres_latin: number; oeuvres_grec: number; oeuvres_fr: number; auteurs: number; editeurs: number; traductions_total: number }
  qualite: { seg_total: number; seg_bon: number; seg_moyen: number; seg_critique: number; seg_controle_humain: number; seg_controle_total: number }
  catalogue: { notices_total: number; notices_refusees: number; notices_sur_site: number; notices_verifie_admin: number; auteurs_termine: number; auteurs_en_cours: number; auteurs_a_reprendre: number; auteurs_suivi_total: number }
  pericopes: { total: number; notice_remplie: number; validees: number; validation_lignes: number; val_presentation: number; val_exegese: number; val_theologie: number; val_tradition: number; val_coherence: number; val_biblio: number }
  bibliographie: { ouvrages: number; liens_pericopes: number; pericopes_avec_biblio: number }
  chronologie: { evenements: number; publies: number; valides: number; a_classer: number }
}

export type ResultatTableauBord = { tb: TableauBord | null; erreur: ErreurPostgrest | null }

// ⚠️ Le tableau agrège tout le corpus en direct : 6,9 s mesurées le 13 septembre 2026, pour
// huit accordées. Six missions en tirent leurs chiffres, et passer de l'une à l'autre le
// recalculait chaque fois. Il est donc GARDÉ cinq minutes, et la vue dit quand il a été
// calculé. ⛔ Un échec ne se garde pas : la mission suivante doit pouvoir réessayer.
const DUREE_DE_VIE_TABLEAU_MS = 5 * 60_000

let tableauRetenu: { promesse: Promise<ResultatTableauBord>; depuis: number } | null = null

async function calculerTableauBord(): Promise<ResultatTableauBord> {
  for (let essai = 0; ; essai++) {
    const { data, error } = await supabaseAdmin.rpc('controle_tableau_bord')
    if (!error) return { tb: (data ?? null) as TableauBord | null, erreur: null }
    console.error(`[controle] RPC controle_tableau_bord (essai ${essai + 1}) :`, error)
    // Une seule reprise, et sur le seul dépassement de délai : une vraie erreur (droits,
    // objet manquant) doit remonter tout de suite.
    if (essai >= 1 || error.code !== CODE_DELAI_DEPASSE) return { tb: null, erreur: error }
    await new Promise((resoudre) => setTimeout(resoudre, 1200))
  }
}

export function chargerTableauBord(): Promise<ResultatTableauBord> {
  const maintenant = Date.now()
  if (tableauRetenu && maintenant - tableauRetenu.depuis < DUREE_DE_VIE_TABLEAU_MS) return tableauRetenu.promesse
  const retenu = { promesse: calculerTableauBord(), depuis: maintenant }
  tableauRetenu = retenu
  const oublier = () => {
    if (tableauRetenu === retenu) tableauRetenu = null
  }
  retenu.promesse.then((resultat) => {
    if (!resultat.tb) oublier()
  }, oublier)
  return retenu.promesse
}

// ── Le contrat du contrôle v2 ────────────────────────────────────────────────

/**
 * Une seule tentative, et c'est délibéré. La page en faisait trois, du temps où le contrat
 * frôlait son délai (7,55 s le 24 août 2026) : le dépassement était alors transitoire. Il
 * est désormais systématique (23,7 s le 13 septembre 2026), et chaque tentative fait
 * travailler la base huit secondes pour rien : trois tentatives rendaient la même panne au
 * bout de vingt-sept secondes.
 */
export async function chargerSnapshot(): Promise<{ data: unknown; error: ErreurPostgrest | null }> {
  const { data, error } = await supabaseAdmin.rpc('controle_v2_admin_snapshot')
  if (error) console.error('[controle] RPC controle_v2_admin_snapshot :', error)
  return { data, error }
}
