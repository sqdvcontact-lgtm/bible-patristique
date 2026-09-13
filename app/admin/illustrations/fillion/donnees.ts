import 'server-only'

import { createClient } from '@supabase/supabase-js'
import { adresseVersionnee } from '@/app/lib/bibleEdition'
import { chargerToutesPagesSupabase, lotsPourClauseIn } from '@/app/lib/paginationSupabase'
import {
  rangCanoniqueLivre,
  type FichierServi,
  type IllustrationFillionEnRevue,
  type RegimeIllustration,
  type TraitementRevision,
} from './modele'

/** Un fichier décrit dans `metadata.quality_revision` (le témoin non-IA). */
type FichierDeRevision = {
  public_uri?: string | null
  storage_bucket?: string | null
  storage_path?: string | null
  width_px?: number | null
  height_px?: number | null
  sha256?: string | null
}

/** ⚠️ Le type décrit ce que le `select` DEMANDE, non ce que la vue contient. */
type LigneActif = {
  id: string
  asset_key: string
  scope_book_code: string | null
  source_page_index: number | null
  printed_page: string | null
  canon_id_start: string | null
  canon_id_end: string | null
  placement: 'before' | 'after' | 'inline'
  body_block_id: string | null
  regime: RegimeIllustration
  part_colonne: number
  printed_caption: string | null
  editorial_caption: string | null
  alt_text: string
  public_uri: string | null
  width_px: number | null
  height_px: number | null
  byte_size: number | null
  web_sha256: string | null
  requires_review: boolean
  material_order: number
  decision: { instruction?: string | null; locked?: boolean | null } | null
  traitement: string | null
  note_traitement: string | null
  temoin: FichierDeRevision | null
}

type LigneFichierWeb = {
  asset_id: string
  public_uri: string | null
  storage_bucket: string
  storage_path: string
  width_px: number
  height_px: number
  byte_size: number
  sha256: string
}

type LigneBloc = {
  id: string
  block_key: string
  heading: string | null
}

const COLONNES_ACTIF = [
  'id', 'asset_key', 'scope_book_code', 'source_page_index', 'printed_page', 'canon_id_start', 'canon_id_end',
  'placement', 'body_block_id', 'regime', 'part_colonne', 'printed_caption', 'editorial_caption', 'alt_text',
  'public_uri', 'width_px', 'height_px', 'byte_size', 'web_sha256', 'requires_review', 'material_order',
  // ⚠️ Seuls les champs de `metadata` que la revue lit, et dans la MÊME requête : la
  //    colonne entière pèse 3,3 Ko par actif en moyenne (431 actifs, 2026-09-13), et la
  //    revue la relisait à part, par lots successifs.
  'decision:metadata->editorial_decision',
  'traitement:metadata->quality_revision->>treatment',
  'note_traitement:metadata->quality_revision->>treatment_note',
  'temoin:metadata->quality_revision->reference_non_ai',
].join(',')

const TRAITEMENTS: readonly TraitementRevision[] = ['ai_reconstruction', 'source_faithful_restoration', 'source_reversion']

/** ⛔ Le client de SERVICE ROLE de la revue : il ne s'appelle que derrière
 *  `estAdmin()`, depuis les pages de `/admin/illustrations/fillion` et sa route. */
export function clientAdministration() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const cle = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !cle) throw new Error('Configuration Supabase incomplète pour la revue Fillion.')
  return createClient(url, cle, { auth: { persistSession: false, autoRefreshToken: false } })
}

type ClientAdministration = ReturnType<typeof clientAdministration>
type ReponseLot = PromiseLike<{ data: unknown; error: { message: string } | null }>

/** Une clause `in` découpée en octets d'adresse (`lotsPourClauseIn`), les lots en
 *  parallèle. Une erreur lève, en nommant ce qu'on lisait. */
async function chargerParLots<T>(valeurs: string[], requete: (lot: string[]) => ReponseLot, contexte: string): Promise<T[]> {
  const lots = await Promise.all(lotsPourClauseIn(valeurs).map(async (lot) => {
    const { data, error } = await requete(lot)
    if (error) throw new Error(`${contexte} : ${error.message}`)
    return (data ?? []) as T[]
  }))
  return lots.flat()
}

function adresseDuFichier(supabase: ClientAdministration, fichier: FichierDeRevision): string | null {
  if (fichier.public_uri) return fichier.public_uri
  if (!fichier.storage_bucket || !fichier.storage_path) return null
  return supabase.storage.from(fichier.storage_bucket).getPublicUrl(fichier.storage_path).data.publicUrl
}

/** ⚠️ Un témoin sans empreinte ne se montre pas : son adresse ne se versionnerait pas,
 *  et le cache d'un an servirait l'image d'avant une reprise. */
function temoinServi(supabase: ClientAdministration, temoin: FichierDeRevision | null): FichierServi | null {
  if (!temoin?.sha256) return null
  const url = adresseDuFichier(supabase, temoin)
  return url
    ? { url: adresseVersionnee(url, temoin.sha256), largeur: temoin.width_px ?? null, hauteur: temoin.height_px ?? null }
    : null
}

export async function chargerIllustrationsFillionEnRevue(): Promise<IllustrationFillionEnRevue[]> {
  const supabase = clientAdministration()
  const { data: membre, error: erreurMembre } = await supabase
    .from('v_bible_edition_catalog')
    .select('family_id')
    .eq('trad_id', 'TR0010')
    .limit(1)
    .maybeSingle()
  if (erreurMembre) throw new Error(`Famille Fillion illisible : ${erreurMembre.message}`)
  if (!membre?.family_id) return []

  const actifs = await chargerToutesPagesSupabase<LigneActif>((debut, fin) => supabase
    .from('v_bible_edition_assets')
    .select(COLONNES_ACTIF)
    .eq('family_id', membre.family_id)
    .order('scope_book_code')
    .order('material_order')
    .order('id')
    .range(debut, fin) as unknown as PromiseLike<{ data: LigneActif[] | null; error: unknown }>)
    .catch((erreur: { message?: string } | null) => {
      throw new Error(`Illustrations Fillion illisibles : ${erreur?.message ?? String(erreur)}`)
    })

  // La charte § 52 garde privées les images en revue : la vue peut ne pas joindre leur
  // WebP. Cette page, déjà gardée, le reprend alors dans la table des fichiers. Les deux
  // lectures ne dépendent que des actifs : elles partent ensemble.
  const idsSansFichier = actifs.filter((actif) => !actif.public_uri).map((actif) => actif.id)
  const idsBlocs = [...new Set(actifs.map((actif) => actif.body_block_id).filter((id): id is string => Boolean(id)))]
  const [fichiersWeb, blocs] = await Promise.all([
    chargerParLots<LigneFichierWeb>(idsSansFichier, (lot) => supabase
      .from('bible_edition_asset_files')
      .select('asset_id,public_uri,storage_bucket,storage_path,width_px,height_px,byte_size,sha256')
      .in('asset_id', lot)
      .eq('variant_role', 'web'), 'Fichiers de revue Fillion illisibles'),
    chargerParLots<LigneBloc>(idsBlocs, (lot) => supabase
      .from('v_bible_editorial_body_blocks')
      .select('id,block_key,heading')
      .in('id', lot), 'Contexte éditorial Fillion illisible'),
  ])
  const fichierParActif = new Map(fichiersWeb.map((fichier) => [fichier.asset_id, fichier]))
  const blocParId = new Map(blocs.map((bloc) => [bloc.id, bloc]))

  return actifs
    .slice()
    .sort((a, b) => rangCanoniqueLivre(a.scope_book_code) - rangCanoniqueLivre(b.scope_book_code)
      || a.material_order - b.material_order)
    .flatMap((actif): IllustrationFillionEnRevue[] => {
      const fichier = actif.public_uri ? undefined : fichierParActif.get(actif.id)
      const url = actif.public_uri ?? (fichier ? adresseDuFichier(supabase, fichier) : null)
      const largeur = fichier?.width_px ?? actif.width_px
      const hauteur = fichier?.height_px ?? actif.height_px
      const poids = fichier?.byte_size ?? actif.byte_size
      const empreinte = fichier?.sha256 ?? actif.web_sha256
      if (!actif.scope_book_code || !url || !largeur || !hauteur || !poids || !empreinte) return []
      const bloc = actif.body_block_id ? blocParId.get(actif.body_block_id) : undefined
      return [{
        id: actif.id,
        cle: actif.asset_key,
        livre: actif.scope_book_code,
        pageSource: actif.source_page_index,
        pageImprimee: actif.printed_page,
        canonDebut: actif.canon_id_start,
        canonFin: actif.canon_id_end,
        placement: actif.placement,
        blocEditorialCle: bloc?.block_key ?? null,
        blocEditorialTitre: bloc?.heading ?? null,
        regime: actif.regime,
        partColonne: actif.part_colonne,
        legende: actif.editorial_caption ?? actif.printed_caption,
        description: actif.alt_text,
        url: adresseVersionnee(url, empreinte),
        largeur,
        hauteur,
        poids,
        demandeRelecture: actif.requires_review,
        temoin: temoinServi(supabase, actif.temoin),
        traitementRevision: TRAITEMENTS.find((traitement) => traitement === actif.traitement) ?? null,
        noteRevision: actif.note_traitement?.trim() || null,
        instructionRelecture: actif.decision?.instruction?.trim() || null,
        verrouilleeParAuteur: actif.decision?.locked === true,
      }]
    })
}
