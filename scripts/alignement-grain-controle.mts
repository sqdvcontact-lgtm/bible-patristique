/**
 * Contrôle du GRAIN DE L'EMPAN sur tous les ensembles d'alignement.
 *
 * Doctrine : charte `parametres.charte_ia`, § 12.2, « Le grain de l'empan ». La règle
 * était écrite et rien ne la vérifiait ; ce script la rejoue sur la base.
 *
 * ⛔ Il n'a AUCUNE règle à lui. La mesure vient de `app/lib/grainAlignement.ts` et le
 * choix de l'ensemble qui porte la lecture de `choisirEnsembleBilingue`, la fonction que
 * la page d'œuvre emploie. Une seconde écriture de l'une ou de l'autre divergerait au
 * premier ajustement, et le contrôle certifierait alors un site imaginaire — c'est ce que
 * le dépôt a déjà payé sur les listes de natures.
 *
 * ⛔ Il MESURE et ne corrige rien : aucune écriture, pas même dans le centre de contrôle.
 *
 * Usage :
 *   npx tsx scripts/alignement-grain-controle.mts
 *   npx tsx scripts/alignement-grain-controle.mts --detail <alignment_set_id>
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import {
  mesurerEmpans,
  bilanDuGrain,
  empansARependre,
  longueurUnicode,
  LIMITE_EMPAN,
  REPERE_EMPAN,
  type SegmentTraduit,
} from '../app/lib/grainAlignement'
import { choisirEnsembleBilingue, type EnsembleAlignement } from '../app/oeuvre/[id]/bilingueAlignement'
import { chargerToutesPagesSupabase } from '../app/lib/paginationSupabase'

const racine = resolve(import.meta.dirname, '..')
const detailDemande = (() => {
  const i = process.argv.indexOf('--detail')
  return i >= 0 ? process.argv[i + 1] : null
})()

const env = Object.fromEntries(
  readFileSync(resolve(racine, '.env.local'), 'utf8')
    .split(/\r?\n/u)
    .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/u))
    .filter(Boolean)
    .map(m => [m![1], m![2].replace(/^["']|["']$/gu, '')]),
) as Record<string, string>

// La clé de service, et il la faut : le grec de la Didachè n'est pas public, et son
// ensemble serait invisible à une lecture ordinaire — donc réputé sain, ce qu'il n'est pas.
const db: SupabaseClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

type Ensemble = {
  alignment_set_id: string
  id_oeuvre: string
  reference_text_id: string
  aligned_text_id: string
  alignment_level: string | null
  status: string
}
type Texte = { id_texte: string; id_oeuvre: string; langue: string | null; is_public: boolean }

const { data: ensemblesBruts, error: erreurEnsembles } = await db
  .from('texte_alignement_ensembles')
  .select('alignment_set_id,id_oeuvre,reference_text_id,aligned_text_id,alignment_level,status')
  .order('alignment_set_id')
if (erreurEnsembles) throw erreurEnsembles
const ensembles = (ensemblesBruts ?? []) as Ensemble[]

const idsOeuvres = [...new Set(ensembles.map(e => e.id_oeuvre))]
const { data: oeuvres } = await db
  .from('oeuvres').select('id_oeuvre,titre,langue_originale').in('id_oeuvre', idsOeuvres)
const { data: textesBruts } = await db
  .from('oeuvre_textes').select('id_texte,id_oeuvre,langue,is_public').in('id_oeuvre', idsOeuvres)

const oeuvreDe = new Map((oeuvres ?? []).map(o => [o.id_oeuvre as string, o]))
const textes = (textesBruts ?? []) as Texte[]
const texteDe = new Map(textes.map(t => [t.id_texte, t]))

/**
 * La finesse d'un ensemble, en nombre de GROUPES.
 *
 * ⛔ `alignment_level` est l'étiquette de l'éditeur, non une mesure : `choisirEnsembleBilingue`
 * ne s'y fie qu'à défaut, et lui passer un ensemble sans son compte le ferait retomber sur
 * l'ancienne règle — celle qui retenait le plus GROSSIER des deux alignements de la Didachè.
 */
const nbGroupes = new Map<string, number>()
for (const e of ensembles) {
  const { count } = await db
    .from('texte_alignements')
    .select('alignment_id', { count: 'exact', head: true })
    .eq('alignment_set_id', e.alignment_set_id)
  nbGroupes.set(e.alignment_set_id, count ?? 0)
}

/**
 * Quels ensembles portent RÉELLEMENT une lecture en regard, et pour quelle paire.
 *
 * On interroge la fonction du site, paire par paire : le texte lu d'un côté, un texte en
 * langue originale de l'autre. Un ensemble qui confronte deux traductions (Boèce) n'ouvre
 * donc aucune paire, et un ensemble écarté par la règle du plus fin le dit lui-même.
 */
const candidats: EnsembleAlignement[] = ensembles.map(e => ({
  alignmentSetId: e.alignment_set_id,
  referenceTextId: e.reference_text_id,
  alignedTextId: e.aligned_text_id,
  alignmentLevel: e.alignment_level,
  nbGroupes: nbGroupes.get(e.alignment_set_id) ?? null,
}))

const portentLaLecture = new Set<string>()
for (const idOeuvre of idsOeuvres) {
  const langueOriginale = (oeuvreDe.get(idOeuvre)?.langue_originale ?? '') as string
  const desOeuvres = textes.filter(t => t.id_oeuvre === idOeuvre)
  const originaux = desOeuvres.filter(t => langueOriginale !== '' && t.langue === langueOriginale)
  const traduits = desOeuvres.filter(t => !originaux.includes(t))
  const setsDeLOeuvre = candidats.filter(c =>
    ensembles.find(e => e.alignment_set_id === c.alignmentSetId)?.id_oeuvre === idOeuvre)
  for (const traduit of traduits) {
    for (const original of originaux) {
      const retenu = choisirEnsembleBilingue(setsDeLOeuvre, traduit.id_texte, original.id_texte)
      if (retenu) portentLaLecture.add(retenu.alignmentSetId)
    }
  }
}

async function membresDuRole(setId: string, idTexte: string) {
  return chargerToutesPagesSupabase<{ alignment_id: string; segment_key: string }>((debut, fin) =>
    db.from('texte_alignement_membres')
      .select('alignment_id,segment_key')
      .eq('alignment_set_id', setId).eq('id_texte', idTexte)
      .order('alignment_id').order('member_order').range(debut, fin))
}

/**
 * Les segments d'un texte, DANS L'ORDRE DE LECTURE.
 *
 * ⚠️ `segment_numero`, jamais `rang` : celui-ci repart à 1 à chaque paragraphe, et l'ordre
 * de lecture est précisément ce sur quoi la mesure du chevauchement repose.
 */
async function segmentsDuTexte(idTexte: string) {
  const lignes = await chargerToutesPagesSupabase<{
    segment_key: string; segment_texte: string | null
    ref_niv1: string | null; ref_niv2: string | null; ref_niv3: string | null
    paragraphe: number | null
  }>((debut, fin) =>
    db.from('segments')
      .select('segment_key,segment_texte,ref_niv1,ref_niv2,ref_niv3,paragraphe')
      .eq('id_texte', idTexte).order('segment_numero').range(debut, fin))
  return lignes.map((s): SegmentTraduit => ({
    segmentKey: s.segment_key,
    refNiv1: s.ref_niv1, refNiv2: s.ref_niv2, refNiv3: s.ref_niv3,
    paragraphe: s.paragraphe,
    longueur: longueurUnicode(s.segment_texte ?? ''),
  }))
}

const nombre = (n: number) => n.toLocaleString('fr-FR')
const servis = { aCheval: 0, tropLong: 0, inconnu: 0, empans: 0 }
const tous = { aCheval: 0, tropLong: 0, inconnu: 0, empans: 0 }

for (const ensemble of ensembles) {
  const oeuvre = oeuvreDe.get(ensemble.id_oeuvre)
  const langueOriginale = (oeuvre?.langue_originale ?? '') as string
  const sert = portentLaLecture.has(ensemble.alignment_set_id)
  const deuxTraductions = ![ensemble.reference_text_id, ensemble.aligned_text_id]
    .some(id => langueOriginale !== '' && texteDe.get(id)?.langue === langueOriginale)

  console.log(`\n${'='.repeat(78)}`)
  console.log(`${oeuvre?.titre ?? ensemble.id_oeuvre} — ${ensemble.alignment_set_id}`)
  console.log(
    `statut « ${ensemble.status} » · ${nombre(nbGroupes.get(ensemble.alignment_set_id) ?? 0)} groupes · ` +
    (sert ? 'PORTE la lecture en regard'
      : deuxTraductions ? 'entre deux traductions — ne sert aucune colonne originale'
        : 'écarté : un ensemble plus fin porte la même paire'),
  )

  for (const [role, idTexte] of [
    ['reference', ensemble.reference_text_id],
    ['aligned', ensemble.aligned_text_id],
  ] as const) {
    const texte = texteDe.get(idTexte)
    const langue = texte?.langue ?? '?'
    const estOriginal = langueOriginale !== '' && langue === langueOriginale

    const membres = await membresDuRole(ensemble.alignment_set_id, idTexte)
    if (membres.length === 0) continue
    const groupeParCle = new Map(membres.map(m => [m.segment_key, m.alignment_id]))
    const empans = mesurerEmpans(await segmentsDuTexte(idTexte), groupeParCle)
    const bilan = bilanDuGrain(empans)

    const marque = estOriginal ? 'langue originale' : 'TRADUIT — la règle porte ici'
    console.log(`\n  ${role} · ${langue} · ${marque}${texte?.is_public ? '' : ' · NON PUBLIC'}`)
    console.log(`    ${nombre(bilan.empans)} empans · médiane ${nombre(bilan.medianeSignes)} · max ${nombre(bilan.maxSignes)} signes`)
    console.log(`    ${nombre(bilan.sousLeRepere)} sous le repère de ${nombre(REPERE_EMPAN)} · ${nombre(bilan.tropLong)} au-dessus de ${nombre(LIMITE_EMPAN)}`)
    console.log(bilan.frontieresTenues
      ? '    frontières tenues : aucun empan n’enjambe un paragraphe connu'
      : `    ⛔ ${nombre(bilan.aCheval)} empans enjambent une frontière`)
    // ⚠️ Se lit AVEC la ligne du dessus : « frontières tenues » sur une donnée muette
    // n'est pas une garantie, c'est une ignorance.
    if (bilan.paragrapheInconnu > 0) {
      console.log(`    ⚠️ ${nombre(bilan.paragrapheInconnu)} empans portent des segments SANS numéro de paragraphe`)
    }

    if (!estOriginal) {
      for (const compteur of sert ? [tous, servis] : [tous]) {
        compteur.empans += bilan.empans
        compteur.aCheval += bilan.aCheval
        compteur.tropLong += bilan.tropLong
        compteur.inconnu += bilan.paragrapheInconnu
      }
    }

    if (detailDemande === ensemble.alignment_set_id) {
      const aRependre = empansARependre(empans)
      console.log(`\n    ${nombre(aRependre.length)} empans à reprendre, les plus graves d’abord :`)
      for (const empan of aRependre.slice(0, 40)) {
        console.log(
          `      ${empan.aCheval ? '⛔ à cheval' : '⚠️ trop long'} · ${empan.alignmentId} · ` +
          `${nombre(empan.signes)} signes · ${empan.segments} segments · ${empan.paragraphes.length} paragraphes`,
        )
      }
      if (aRependre.length > 40) console.log(`      … et ${nombre(aRependre.length - 40)} autres.`)
    }
  }
}

// ⚠️ DEUX totaux, et ils ne disent pas la même chose. Celui des ensembles qui portent la
// lecture est celui que le LECTEUR subit ; l'autre compte aussi les alignements écartés et
// les colonnes d'un appariement entre deux traductions. Publier l'un pour l'autre, c'est
// ce qui fait diverger un chiffre d'un document à l'autre.
console.log(`\n${'='.repeat(78)}`)
console.log('Colonnes traduites des ensembles qui PORTENT la lecture :')
console.log(`  ${nombre(servis.empans)} empans · ⛔ ${nombre(servis.aCheval)} enjambent une frontière · ` +
  `${nombre(servis.tropLong)} dépassent ${nombre(LIMITE_EMPAN)} signes · ⚠️ ${nombre(servis.inconnu)} à paragraphe inconnu`)
console.log('Toutes colonnes traduites, ensembles écartés compris :')
console.log(`  ${nombre(tous.empans)} empans · ${nombre(tous.aCheval)} enjambent une frontière · ` +
  `${nombre(tous.tropLong)} dépassent la limite · ${nombre(tous.inconnu)} à paragraphe inconnu`)
if (servis.aCheval > 0) console.log('\n⛔ La règle 1 n’est pas tenue. Centre de contrôle, section « alignements_empans ».')
