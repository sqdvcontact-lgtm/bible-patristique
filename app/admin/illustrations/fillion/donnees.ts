import 'server-only'

import { createClient } from '@supabase/supabase-js'
import type { IllustrationFillionEnRevue } from './modele'

const PAR_PAGE = 1000

type LigneActif = {
  id: string
  asset_key: string
  asset_kind: string
  scope_book_code: string | null
  source_page_index: number | null
  printed_page: string | null
  canon_id_start: string | null
  canon_id_end: string | null
  placement: 'before' | 'after' | 'inline'
  body_block_id: string | null
  regime: 'vignette' | 'au-fil' | 'hors-texte'
  part_colonne: number
  printed_caption: string | null
  editorial_caption: string | null
  alt_text: string
  public_uri: string
  width_px: number
  height_px: number
  byte_size: number
  web_sha256: string
  requires_review: boolean
  material_order: number
}

type LigneBloc = {
  id: string
  block_key: string
  heading: string | null
}

/** ⛔ Le client de SERVICE ROLE de la revue : il ne s'appelle que derrière
 *  `estAdmin()`, depuis les pages de `/admin/illustrations/fillion`. */
export function clientAdministration() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const cle = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !cle) throw new Error('Configuration Supabase incomplète pour la revue Fillion.')
  return createClient(url, cle, { auth: { persistSession: false, autoRefreshToken: false } })
}

async function toutesLesLignes<T>(fabriquer: (debut: number, fin: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const lignes: T[] = []
  for (let debut = 0; ; debut += PAR_PAGE) {
    const { data, error } = await fabriquer(debut, debut + PAR_PAGE - 1)
    if (error) throw new Error(error.message)
    lignes.push(...(data ?? []))
    if ((data?.length ?? 0) < PAR_PAGE) return lignes
  }
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

  const actifs = await toutesLesLignes<LigneActif>((debut, fin) => supabase
    .from('v_bible_edition_assets')
    .select('id,asset_key,asset_kind,scope_book_code,source_page_index,printed_page,canon_id_start,canon_id_end,placement,body_block_id,regime,part_colonne,printed_caption,editorial_caption,alt_text,public_uri,width_px,height_px,byte_size,web_sha256,requires_review,material_order')
    .eq('family_id', membre.family_id)
    .order('scope_book_code')
    .order('material_order')
    .range(debut, fin) as unknown as PromiseLike<{ data: LigneActif[] | null; error: { message: string } | null }>)

  const idsBlocs = [...new Set(actifs.map((actif) => actif.body_block_id).filter((id): id is string => Boolean(id)))]
  const blocs: LigneBloc[] = []
  for (let debut = 0; debut < idsBlocs.length; debut += 200) {
    const { data, error } = await supabase
      .from('v_bible_editorial_body_blocks')
      .select('id,block_key,heading')
      .in('id', idsBlocs.slice(debut, debut + 200))
    if (error) throw new Error(`Contexte éditorial Fillion illisible : ${error.message}`)
    blocs.push(...((data ?? []) as LigneBloc[]))
  }
  const blocParId = new Map(blocs.map((bloc) => [bloc.id, bloc]))

  return actifs.flatMap((actif): IllustrationFillionEnRevue[] => {
    if (!actif.scope_book_code || !actif.public_uri) return []
    const bloc = actif.body_block_id ? blocParId.get(actif.body_block_id) : null
    return [{
      id: actif.id,
      cle: actif.asset_key,
      livre: actif.scope_book_code,
      pageSource: actif.source_page_index,
      pageImprimee: actif.printed_page,
      canonDebut: actif.canon_id_start,
      canonFin: actif.canon_id_end,
      placement: actif.placement,
      blocEditorialId: actif.body_block_id,
      blocEditorialCle: bloc?.block_key ?? null,
      blocEditorialTitre: bloc?.heading ?? null,
      regime: actif.regime,
      partColonne: actif.part_colonne,
      nature: actif.asset_kind,
      legende: actif.editorial_caption ?? actif.printed_caption,
      description: actif.alt_text,
      url: actif.public_uri,
      largeur: actif.width_px,
      hauteur: actif.height_px,
      poids: actif.byte_size,
      empreinte: actif.web_sha256,
      demandeRelecture: actif.requires_review,
    }]
  })
}

