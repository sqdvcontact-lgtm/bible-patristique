import { createClient } from '@supabase/supabase-js'
import BibliographieClient from './BibliographieClient'
import { assemblerBibliographie, STATUTS_MONTRABLES, tableDesNoms, type LigneLienPericope, type LigneOuvrage, type LignePericope } from '@/app/lib/bibliographieCatalogue'
import { chargerNoticesBibliographiques } from '@/app/lib/referencesBibliographiquesChargement'
import { chargerToutesPagesSupabase } from '@/app/lib/paginationSupabase'

export const metadata = {
  title: 'Bibliographie',
  description:
    'Les ouvrages sur lesquels s’appuient les notices du site : commentaires, éditions critiques, études d’exégèse, de théologie et d’histoire de la réception, à chercher et à citer.',
  alternates: { canonical: '/bibliographie' },
}

// La bibliographie est une donnée de RÉFÉRENCE publique et quasi statique, comme le
// catalogue des péricopes : elle se charge côté SERVEUR et la page se met en cache
// (revalidée toutes les trente minutes), au lieu d'un chargement au montage. Le
// composant client ne reçoit que les entrées et ne tient que l'interactivité.
//
// ⛔ Le filtre de statut est posé ICI, à la lecture, et revérifié dans le module pur :
// un ouvrage `exclu` ou `a_verifier` n'atteint jamais le navigateur (charte § 29.1).
// La page ne lit aucun score, aucune réserve, aucun motif : seules les colonnes qu'elle
// affiche sont demandées.
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export const revalidate = 1800

export default async function BibliographiePage() {
  const [ro, rl, rp] = await Promise.all([
    supabaseAdmin
      .from('ouvrages_bibliographiques')
      .select('id, type_ouvrage, statut_scientifique, langue_normalisee, annee')
      .in('statut_scientifique', [...STATUTS_MONTRABLES])
      .order('id'),
    // ⚠️ 1 659 liens au 2026-09-06, au-delà du plafond d'une page PostgREST : on
    // charge toutes les pages, dans un ordre stable.
    chargerToutesPagesSupabase<LigneLienPericope>((debut, fin) =>
      supabaseAdmin
        .from('pericope_bibliographie')
        .select('ouvrage_id, pericope_id, rubrique')
        .order('id')
        .range(debut, fin)),
    supabaseAdmin.from('pericopes').select('id, nom').order('id'),
  ])
  if (ro.error) throw new Error(`Ouvrages illisibles : ${ro.error.message}`)
  if (rp.error) throw new Error(`Péricopes illisibles : ${rp.error.message}`)
  const ouvrages = (ro.data ?? []) as LigneOuvrage[]
  // La notice de chaque ouvrage, avec ses autorités jointes, par LE chargement du
  // moteur : la même vue et les mêmes lots que toute autre surface qui cite.
  const notices = await chargerNoticesBibliographiques(supabaseAdmin, ouvrages.map(o => o.id))
  const pericopes = (rp.data ?? []) as LignePericope[]
  const entrees = assemblerBibliographie(ouvrages, notices, rl, pericopes)
  // ⚠️ Ce qui part au navigateur est mesuré (2026-09-06, 588 entrées) : les notices
  // font l'essentiel du poids, la table des noms voyage une fois, et le texte de
  // recherche ne voyage pas — il se calcule au montage (voir `bibliographieCatalogue`).
  return <BibliographieClient entrees={entrees} nomsPericopes={tableDesNoms(pericopes, entrees)} />
}
