// ── Relevé des familles nombreuses ───────────────────────────────────────────
//
// Ce module ne mesure PAS les illustrations de la planche : leur poids et leur
// définition se prennent dans le navigateur, qui charge les images de toute
// façon (voir `PlancheIllustrations`). Il ne fait que compter les familles trop
// nombreuses pour y figurer, et en tirer un échantillon.
//
// ⛔ Ne pas y ramener une lecture de `public/` : le dossier est servi en statique
// et n'est pas embarqué dans la fonction qui rend la page. L'y forcer par
// `outputFileTracingIncludes` a fait échouer le déploiement du 2026-08-24, la
// fonction passant de 240 à 259 Mo pour un plafond de 250.

import { createClient } from '@supabase/supabase-js'
import { FAMILLES, type Famille } from './inventaire'
import type { EchantillonFamille } from './PlancheIllustrations'
import { GRAVURES_CLASSEES, cheminProposition, type GravureFillion } from './regimesFillion'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const URL_SUPABASE = process.env.NEXT_PUBLIC_SUPABASE_URL!

/** Une page de listage. Le seau des fac-similés en porte quinze cents : sans
 *  pagination on en rendrait mille en annonçant le compte complet, ce qui est
 *  pire qu'un compte manquant. */
const PAR_PAGE = 1000

/** Parcourt un seau Supabase en descendant dans ses dossiers et en paginant.
 *  Deux garde-fous, la profondeur et le nombre d'appels : sans eux, un seau de
 *  quinze cents objets tiendrait la page en otage. `complet` dit si le parcours
 *  est allé au bout, et la planche le répercute par un « au moins ». */
async function parcourirSeau(seau: string, budget = 24): Promise<{ noms: string[]; complet: boolean }> {
  const noms: string[] = []
  const aVisiter: string[] = ['']
  let appels = 0
  while (aVisiter.length && appels < budget) {
    const prefixe = aVisiter.shift()!
    let offset = 0
    // Une page pleine peut en cacher une autre : on redemande tant qu'elle l'est.
    for (;;) {
      if (appels >= budget) return { noms: noms.sort(), complet: false }
      appels++
      const { data, error } = await supabaseAdmin.storage.from(seau).list(prefixe, { limit: PAR_PAGE, offset })
      if (error || !data) break
      for (const entree of data) {
        if (entree.name === '.emptyFolderPlaceholder') continue
        const complet = prefixe ? `${prefixe}/${entree.name}` : entree.name
        // Un dossier n'a pas d'identifiant : c'est ainsi que l'API les distingue.
        if (entree.id === null) aVisiter.push(complet)
        else noms.push(complet)
      }
      if (data.length < PAR_PAGE) break
      offset += PAR_PAGE
    }
  }
  return { noms: noms.sort(), complet: aVisiter.length === 0 }
}

const TAILLE_ECHANTILLON = 10

async function releverFamille(famille: Famille): Promise<EchantillonFamille> {
  const seau = famille.source.seau
  const { noms, complet } = await parcourirSeau(seau)

  // L'échantillon est PRIS AU LARGE, non pris en tête : dix premiers fichiers
  // d'un dossier trié, ce sont dix voisins, et l'on ne verrait qu'un coin de la
  // famille. Un pas régulier montre son étendue.
  const pas = Math.max(1, Math.floor(noms.length / TAILLE_ECHANTILLON))
  const choisis = noms.filter((_, i) => i % pas === 0).slice(0, TAILLE_ECHANTILLON)

  return {
    cle: famille.cle,
    nom: famille.nom,
    emploi: famille.emploi,
    lieu: famille.lieu ?? null,
    origine: `Seau Supabase « ${seau} »`,
    nombre: noms.length,
    complet,
    echantillon: choisis.map(nom => ({
      nom,
      url: `${URL_SUPABASE}/storage/v1/object/public/${seau}/${nom}`,
    })),
  }
}

/** Le relevé des familles trop nombreuses pour figurer sur la planche. */
export async function releverFamilles(): Promise<EchantillonFamille[]> {
  return Promise.all(FAMILLES.map(releverFamille))
}

// ── Les gravures de Fillion, rangées par régime de composition ───────────────

/** ⚠️ Le classement vient de la SOURCE RÉDIGÉE (`regimesFillion.ts`), la base ne
 *  porte encore aucun régime. On ne lit ici que ce que la base sait dire : les
 *  adresses, les dimensions et le nombre de planches. Une gravure classée qui
 *  aurait disparu de la base est simplement écartée, sans faire tomber la page. */
export async function releverGravuresFillion(): Promise<{
  gravures: GravureFillion[]
  planches: number
  planche: { url: string; legende: string } | null
}> {
  const { data, error } = await supabaseAdmin
    .from('v_bible_edition_assets')
    .select('asset_key,asset_kind,public_uri,width_px,height_px,printed_caption,editorial_caption')
  if (error) throw new Error(`Gravures de Fillion illisibles : ${error.message}`)
  const parCle = new Map((data ?? []).map(a => [a.asset_key as string, a]))

  const gravures = GRAVURES_CLASSEES.flatMap((g): GravureFillion[] => {
    const a = parCle.get(g.cle)
    if (!a) return []
    return [{
      ...g,
      url: a.public_uri as string,
      urlDetouree: g.regime === 'A'
        ? `${URL_SUPABASE}/storage/v1/object/public/bible-illustrations-web/${cheminProposition(g.cle)}`
        : null,
      largeur: a.width_px as number,
      hauteur: a.height_px as number,
    }]
  })
  // Une planche TÉMOIN pour le régime C. Prise par son rang dans l'ordre des clés,
  // non au hasard : la planche montrée doit être la même d'une visite à l'autre.
  const lesPlanches = (data ?? []).filter(a => a.asset_kind === 'plate')
    .sort((a, b) => String(a.asset_key).localeCompare(String(b.asset_key)))
  const temoin = lesPlanches[Math.floor(lesPlanches.length / 2)] ?? null
  return {
    gravures,
    planches: lesPlanches.length,
    planche: temoin
      ? {
        url: temoin.public_uri as string,
        legende: (temoin.editorial_caption ?? temoin.printed_caption ?? 'Planche hors-texte') as string,
      }
      : null,
  }
}
