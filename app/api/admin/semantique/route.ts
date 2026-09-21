/**
 * L'ANNOTATION SÉMANTIQUE D'UN CHAPITRE, pour l'onglet « Sémantique » du volet de droite de
 * la page Bible (règle : `app/lib/semantiqueVerset.ts`).
 *
 * `GET /api/admin/semantique?livre=GEN&chapitre=14` rend `SemantiqueDuChapitre` : les
 * créneaux du chapitre, toutes les annotations dont la portée le recoupe (actives,
 * retirées, remplacées) avec leur concept, leur autorité et ses formes, ou leur terme
 * littéraire, et les arbitrages OUVERTS qui le touchent.
 *
 * ⛔ Réservée à l'administrateur, et elle lit par la CLÉ DE SERVICE : les tables
 * `semantique_*` n'ont aucune politique de lecture, et l'auteur veut rester le seul à les
 * lire (2026-09-21). La garde `estAdmin()` passe donc AVANT toute lecture.
 * ⛔ Lecture seule : rien ici n'écrit dans la base.
 * ⚠️ Rien ne se met en cache : l'annotation est un chantier en cours.
 */

import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { estAdmin } from '@/app/lib/verifAdmin'
import { messageDErreur } from '@/app/lib/chargementTolerant'
import { chargerToutesPagesSupabase, lancerEnParallele, lotsPourClauseIn } from '@/app/lib/paginationSupabase'
import {
  porteeRecoupeChapitre,
  type AnnotationSemantique,
  type ArbitrageOuvert,
  type SemantiqueDuChapitre,
  type TypeAnnotation,
} from '@/app/lib/semantiqueVerset'

export const runtime = 'nodejs'

const ENTETES = { 'Cache-Control': 'private, no-store' }

type Page<T> = PromiseLike<{ data: T[] | null; error: unknown }>

type LignePortee = { id: number; canon_debut_id: string | null; canon_fin_id: string | null; note: string | null }
type LigneAnnotation = {
  id: number; portee_id: number; type_annotation: TypeAnnotation
  concept_id: number | null; autorite_id: string | null; litteraire_code: string | null
  importance: string | null; niveau_semantique: string | null; certitude: string; provenance: string
  validation: string; cycle_vie: string; confiance_technique: number | null; justification: string | null
  cree_par: string | null; valide_par: string | null; valide_le: string | null; cree_le: string; mis_a_jour: string
}
type LigneConcept = { id: number; code: string; version_code: string; terme_prefere: string; categorie: string; statut: string }
type LigneAutorite = { id: string; type_code: string; nom_canonique: string; validation: string; cycle_vie: string }
type LigneForme = { autorite_id: string; forme: string; langue: string; type_forme: string; note: string | null }
type LigneLitteraire = { code: string; version_code: string; categorie: string; libelle: string }
type LigneTypeAutorite = { code: string; libelle: string }
type LigneArbitrage = {
  id: number; portee_id: number | null; systeme: string; formulation_proposee: string; besoin_documentaire: string
  identifiants_voisins: unknown[]; provenance: string; sources_note: string | null; cree_le: string
}

const COLONNES_ANNOTATION = 'id,portee_id,type_annotation,concept_id,autorite_id,litteraire_code,importance,'
  + 'niveau_semantique,certitude,provenance,validation,cycle_vie,confiance_technique,justification,'
  + 'cree_par,valide_par,valide_le,cree_le,mis_a_jour'

/** Toutes les lignes d'une table dont une colonne tombe dans une liste, par lots. */
async function parLots<T>(ids: (string | number)[], lire: (lot: string[]) => Page<T>): Promise<T[]> {
  const uniques = [...new Set(ids.map(String))]
  if (uniques.length === 0) return []
  const lots = await lancerEnParallele(lotsPourClauseIn(uniques).map(lot => () => lire(lot)))
  return lots.flatMap(page => {
    if (page.error) throw page.error
    return page.data ?? []
  })
}

export async function GET(requete: NextRequest) {
  const livre = requete.nextUrl.searchParams.get('livre') ?? ''
  const chapitre = Number(requete.nextUrl.searchParams.get('chapitre'))
  if (!/^[0-9A-Z]{3}$/.test(livre) || !Number.isInteger(chapitre) || chapitre < 0) {
    return NextResponse.json({ erreur: 'Paramètres invalides.' }, { status: 400, headers: ENTETES })
  }
  if (!(await estAdmin())) return NextResponse.json({ erreur: 'Réservé à l’administration.' }, { status: 403, headers: ENTETES })

  const base = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  try {
    const [versets, porteesDuLivre] = await Promise.all([
      base.from('versets_canon').select('id').eq('livre', livre).eq('ch_canon', chapitre).order('ordre')
        .then(({ data, error }) => { if (error) throw error; return (data ?? []).map(l => (l as { id: string }).id) }),
      // ⚠️ Par le LIVRE, puis filtrées ici : une portée peut commencer au chapitre d'avant.
      chargerToutesPagesSupabase<LignePortee>((debut, fin) => base.from('semantique_portees')
        .select('id,canon_debut_id,canon_fin_id,note')
        .eq('type_portee', 'canon')
        .like('canon_debut_id', `${livre}.%`)
        .order('id')
        .range(debut, fin) as unknown as Page<LignePortee>),
    ])
    const portees = new Map(porteesDuLivre
      .filter(p => p.canon_debut_id && p.canon_fin_id
        && porteeRecoupeChapitre({ debut: p.canon_debut_id, fin: p.canon_fin_id }, livre, chapitre))
      .map(p => [p.id, { id: p.id, debut: p.canon_debut_id!, fin: p.canon_fin_id!, note: p.note }]))
    const idsPortees = [...portees.keys()]

    const [annotations, arbitrages, typesAutorites] = await Promise.all([
      parLots<LigneAnnotation>(idsPortees, lot => base.from('semantique_annotations')
        .select(COLONNES_ANNOTATION).in('portee_id', lot) as unknown as Page<LigneAnnotation>),
      parLots<LigneArbitrage>(idsPortees, lot => base.from('semantique_arbitrages')
        .select('id,portee_id,systeme,formulation_proposee,besoin_documentaire,identifiants_voisins,provenance,sources_note,cree_le')
        .eq('statut', 'ouvert').in('portee_id', lot) as unknown as Page<LigneArbitrage>),
      base.from('semantique_types_autorites').select('code,libelle')
        .then(({ data, error }) => { if (error) throw error; return (data ?? []) as LigneTypeAutorite[] }),
    ])

    const idsAutorites = annotations.flatMap(a => a.autorite_id ? [a.autorite_id] : [])
    const [concepts, autorites, formes, litteraires] = await Promise.all([
      parLots<LigneConcept>(annotations.flatMap(a => a.concept_id !== null ? [a.concept_id] : []), lot => base
        .from('semantique_concepts').select('id,code,version_code,terme_prefere,categorie,statut')
        .in('id', lot) as unknown as Page<LigneConcept>),
      parLots<LigneAutorite>(idsAutorites, lot => base
        .from('semantique_autorites').select('id,type_code,nom_canonique,validation,cycle_vie')
        .in('id', lot) as unknown as Page<LigneAutorite>),
      parLots<LigneForme>(idsAutorites, lot => base
        .from('semantique_autorite_formes').select('autorite_id,forme,langue,type_forme,note')
        .in('autorite_id', lot).order('id') as unknown as Page<LigneForme>),
      parLots<LigneLitteraire>(annotations.flatMap(a => a.litteraire_code ? [a.litteraire_code] : []), lot => base
        .from('semantique_termes_litteraires').select('code,version_code,categorie,libelle')
        .in('code', lot) as unknown as Page<LigneLitteraire>),
    ])

    const conceptParId = new Map(concepts.map(c => [c.id, c]))
    const autoriteParId = new Map(autorites.map(a => [a.id, a]))
    const litteraireParCode = new Map(litteraires.map(l => [l.code, l]))
    const libelleType = new Map(typesAutorites.map(t => [t.code, t.libelle]))
    const formesParAutorite = new Map<string, LigneForme[]>()
    for (const f of formes) formesParAutorite.set(f.autorite_id, [...(formesParAutorite.get(f.autorite_id) ?? []), f])

    const reponse: SemantiqueDuChapitre = {
      livre,
      chapitre,
      versets,
      annotations: annotations.flatMap((a): AnnotationSemantique[] => {
        const portee = portees.get(a.portee_id)
        if (!portee) return []
        const c = a.concept_id !== null ? conceptParId.get(a.concept_id) : undefined
        const au = a.autorite_id ? autoriteParId.get(a.autorite_id) : undefined
        const l = a.litteraire_code ? litteraireParCode.get(a.litteraire_code) : undefined
        return [{
          id: a.id, type: a.type_annotation, portee,
          importance: a.importance, niveauSemantique: a.niveau_semantique, certitude: a.certitude,
          provenance: a.provenance, validation: a.validation, cycleVie: a.cycle_vie,
          confianceTechnique: a.confiance_technique, justification: a.justification,
          creePar: a.cree_par, validePar: a.valide_par, valideLe: a.valide_le, creeLe: a.cree_le, misAJour: a.mis_a_jour,
          concept: c ? {
            id: c.id, code: c.code, versionCode: c.version_code, termePrefere: c.terme_prefere,
            categorie: c.categorie, statut: c.statut,
          } : null,
          autorite: au ? {
            id: au.id, typeCode: au.type_code, typeLibelle: libelleType.get(au.type_code) ?? null,
            nomCanonique: au.nom_canonique, validation: au.validation, cycleVie: au.cycle_vie,
            formes: (formesParAutorite.get(au.id) ?? []).map(f => ({ forme: f.forme, langue: f.langue, typeForme: f.type_forme, note: f.note })),
          } : null,
          litteraire: l ? { code: l.code, categorie: l.categorie, libelle: l.libelle, versionCode: l.version_code } : null,
        }]
      }),
      arbitrages: arbitrages.map((a): ArbitrageOuvert => {
        const portee = a.portee_id !== null ? portees.get(a.portee_id) : undefined
        return {
          id: a.id, portee: portee ? { id: portee.id, debut: portee.debut, fin: portee.fin } : null,
          systeme: a.systeme, formulationProposee: a.formulation_proposee, besoinDocumentaire: a.besoin_documentaire,
          identifiantsVoisins: a.identifiants_voisins, provenance: a.provenance, sourcesNote: a.sources_note, creeLe: a.cree_le,
        }
      }).sort((a, b) => a.id - b.id),
    }
    return NextResponse.json(reponse, { headers: ENTETES })
  } catch (erreur) {
    console.error(`[sémantique] ${livre} ${chapitre} illisible : ${messageDErreur(erreur)}`)
    return NextResponse.json({ erreur: 'L’annotation sémantique n’a pas pu être lue.' }, { status: 500, headers: ENTETES })
  }
}
