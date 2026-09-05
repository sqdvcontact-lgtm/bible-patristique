import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { estAdminUtilisateur } from '@/app/lib/verifAdminUtilisateur'
import { NATURE_VALIDES } from '@/app/lib/naturesSegments'
import { resoudreStyleSemantique } from '@/app/lib/bibleHierarchieSemantique'
import { chargerToutesPagesSupabase, lotsPourClauseIn } from '@/app/lib/paginationSupabase'
import { canonDuChapitre } from '@/app/lib/bibleEditionServerCore'
import { LIVRES } from '@/app/lib/bible'
import { CLE_FORME, FORME_VERS } from '@/app/lib/compositionVers'
import { metadonneesAvecForme, metadonneesAvecStyleBible, natureAttribuable } from '@/app/lib/stylesAttribution'

// ── Le module « Styles » de l'administration ──────────────────────────────────
//
// Demande de l'auteur (2026-09-03) : « un petit module admin pour les styles, pour
// les identifier ou les changer ; à partir de ce module, je veux pouvoir changer le
// style d'un segment, d'un verset, d'un titre, etc. » Cette route sert l'écran
// `SectionStyles` : le catalogue (les styles, leurs noms propres, leur usage), les
// listes qui mènent à un objet (œuvre → texte → division → segments ; famille →
// livre → chapitre → blocs), et l'écriture d'un style sur un objet.
//
// ⛔ Les écritures passent ICI, avec la clé de service et la vérification admin, pour
// une raison qui n'est pas de commodité : le style d'un bloc biblique vit DANS un
// `jsonb` (`metadata.semantic_style`), et le poser depuis le navigateur écraserait ce
// que la colonne porte d'autre. La fusion se fait en un endroit (`stylesAttribution`),
// et la base garde le dernier mot par ses verrous (`chk_segments_nature`,
// `trg_bible_style_semantique_connu`) : leur message est rendu tel quel.
//
// ⛔ Une famille éditoriale en BROUILLON ne se touche pas d'ici : c'est le chantier de
// la Bible 899, que GPT tient (statut `draft`). Seules les familles publiées paraissent.

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const erreur = (message: string, status = 400) => NextResponse.json({ error: message }, { status })

// Même ordre de couches que le chargeur de la page (bibleEditionServerCore).
const PRIORITE_COUCHE: Record<string, number> = { expanded: 0, translation: 1, diplomatic: 2, modernized: 3, other: 4 }

type LigneBloc = {
  id: string; block_key: string; block_kind: string; heading: string | null
  semantic_style_code: string; semantic_level: string | null; embedded_title_level: string | null
  material_order: number | null; canon_id_start: string | null; segment_id: string
  notice_subtype: string | null; placement: string; is_public: boolean
}

/** Le début du texte de chaque bloc, par la même chaîne que la page : la première
 *  unité-source du segment, dans sa meilleure couche. */
async function incipits(blocs: LigneBloc[]): Promise<Map<string, string>> {
  const resultat = new Map<string, string>()
  const segmentIds = [...new Set(blocs.map((b) => b.segment_id).filter(Boolean))]
  if (segmentIds.length === 0) return resultat
  type Source = { segment_id: string; source_id: string; unit_id: string; unit_sequence: number; start_offset: number | null; end_offset: number | null }
  const sources: Source[] = []
  for (const lot of lotsPourClauseIn(segmentIds)) {
    const { data, error } = await supabaseAdmin
      .from('bible_editorial_segment_sources')
      .select('segment_id,source_id,unit_id,unit_sequence,start_offset,end_offset')
      .in('segment_id', lot)
      .order('unit_sequence')
    if (error) throw new Error(`Sources des blocs illisibles : ${error.message}`)
    sources.push(...((data ?? []) as Source[]))
  }
  const premiere = new Map<string, Source>()
  for (const s of sources) if (!premiere.has(s.segment_id)) premiere.set(s.segment_id, s)
  const unitIds = [...new Set([...premiere.values()].map((s) => s.unit_id))]
  if (unitIds.length === 0) return resultat
  type Unite = { source_id: string; unit_id: string; layer_kind: string; text_content: string }
  const meilleure = new Map<string, Unite>()
  for (const lot of lotsPourClauseIn(unitIds)) {
    const { data, error } = await supabaseAdmin
      .from('v_bible_source_unit_texts')
      .select('source_id,unit_id,layer_kind,text_content')
      .in('unit_id', lot)
    if (error) throw new Error(`Texte des blocs illisible : ${error.message}`)
    for (const u of (data ?? []) as Unite[]) {
      const cle = `${u.source_id}:${u.unit_id}`
      const courante = meilleure.get(cle)
      if (!courante || (PRIORITE_COUCHE[u.layer_kind] ?? 99) < (PRIORITE_COUCHE[courante.layer_kind] ?? 99)) meilleure.set(cle, u)
    }
  }
  for (const [segmentId, s] of premiere) {
    const u = meilleure.get(`${s.source_id}:${s.unit_id}`)
    if (!u) continue
    const texte = u.text_content.slice(s.start_offset ?? 0, s.end_offset ?? undefined).replace(/\s+/g, ' ').trim()
    resultat.set(segmentId, texte.length > 160 ? `${texte.slice(0, 157)}…` : texte)
  }
  return resultat
}

export async function GET(request: Request) {
  if (!(await estAdminUtilisateur(request))) return erreur('Non autorisé.', 403)
  const url = new URL(request.url)
  const p = (nom: string) => url.searchParams.get(nom) ?? ''
  try {
    switch (p('vue')) {
      case 'catalogue': {
        // Les natures se comptent en tête (treize comptes légers) ; les blocs bibliques
        // se relisent par le registre, parce que la donnée porte encore des noms hérités
        // (`commentaire_pericope`) qui se résolvent au canonique.
        const natures: Record<string, number> = {}
        for (const nature of NATURE_VALIDES) {
          const { count } = await supabaseAdmin.from('segments').select('id', { count: 'exact', head: true }).eq('nature', nature)
          natures[nature] = count ?? 0
        }
        const { count: formeVers } = await supabaseAdmin.from('segments').select('id', { count: 'exact', head: true }).contains('segment_metadata', { [CLE_FORME]: FORME_VERS })
        const blocs = await chargerToutesPagesSupabase<{ semantic_style_code: string; semantic_level: string | null; embedded_title_level: string | null }>(
          (debut, fin) => supabaseAdmin.from('v_bible_editorial_body_blocks').select('semantic_style_code,semantic_level,embedded_title_level').eq('is_public', true).order('id').range(debut, fin),
        )
        const styles: Record<string, { total: number; rangs: Record<string, number> }> = {}
        let inconnus = 0
        for (const b of blocs) {
          const r = resoudreStyleSemantique(b.semantic_style_code, { niveau: b.semantic_level, titre: b.embedded_title_level })
          if (!r) { inconnus += 1; continue }
          const s = (styles[r.canonique] ??= { total: 0, rangs: {} })
          s.total += 1
          s.rangs[r.level] = (s.rangs[r.level] ?? 0) + 1
        }
        return NextResponse.json({ natures, formeVers: formeVers ?? 0, styles, inconnus })
      }
      case 'oeuvres': {
        const { data, error } = await supabaseAdmin.from('oeuvres').select('id_oeuvre, titre, auteurs!oeuvres_id_auteur_fkey(nom)').order('titre')
        if (error) throw new Error(error.message)
        const oeuvres = (data ?? []).map((o) => {
          const a = (o as { auteurs?: { nom?: string } | { nom?: string }[] | null }).auteurs
          const nom = Array.isArray(a) ? a[0]?.nom : a?.nom
          return { id: (o as { id_oeuvre: string }).id_oeuvre, titre: (o as { titre: string }).titre, auteur: nom ?? null }
        })
        return NextResponse.json({ oeuvres })
      }
      case 'textes': {
        const { data, error } = await supabaseAdmin.from('oeuvre_textes').select('id_texte, titre_version, langue, is_default, is_public').eq('id_oeuvre', p('oeuvre')).order('is_default', { ascending: false })
        if (error) throw new Error(error.message)
        return NextResponse.json({ textes: data ?? [] })
      }
      case 'divisions': {
        // L'éditeur doit voir les divisions de TOUTES les surfaces. La RPC publique
        // `get_niv1_list` est volontairement limitée au sommaire du corps.
        const { data, error } = await supabaseAdmin.rpc('get_niv1_list_global', { p_id_oeuvre: p('oeuvre'), p_id_texte: p('texte') })
        if (error) throw new Error(error.message)
        const divisions = ((data ?? []) as { ref_niv1: string | null }[]).map((r) => r.ref_niv1).filter((v): v is string => Boolean(v))
        const { count: sansDivision } = await supabaseAdmin.from('segments').select('id', { count: 'exact', head: true }).eq('id_oeuvre', p('oeuvre')).eq('id_texte', p('texte')).is('ref_niv1', null)
        return NextResponse.json({ divisions, sansDivision: sansDivision ?? 0 })
      }
      case 'segments': {
        type Ligne = { id: number; segment_numero: number; ref_niv2: string | null; ref_niv3: string | null; nature: string | null; segment_metadata: Record<string, unknown> | null; segment_texte: string | null }
        const niv1 = p('niv1')
        const lignes = await chargerToutesPagesSupabase<Ligne>((debut, fin) => {
          let q = supabaseAdmin.from('segments').select('id,segment_numero,ref_niv2,ref_niv3,nature,segment_metadata,segment_texte').eq('id_oeuvre', p('oeuvre')).eq('id_texte', p('texte'))
          q = niv1 ? q.eq('ref_niv1', niv1) : q.is('ref_niv1', null)
          return q.order('segment_numero').range(debut, fin)
        })
        const segments = lignes.map((s) => ({
          id: s.id, numero: s.segment_numero,
          reference: [s.ref_niv2, s.ref_niv3].filter(Boolean).join(' · '),
          nature: s.nature ?? 'texte',
          enVers: s.segment_metadata?.[CLE_FORME] === FORME_VERS,
          texte: (() => { const t = (s.segment_texte ?? '').replace(/\s+/g, ' ').trim(); return t.length > 160 ? `${t.slice(0, 157)}…` : t })(),
        }))
        return NextResponse.json({ segments })
      }
      case 'bible-livres': {
        const { data: familles, error } = await supabaseAdmin.from('bible_edition_families').select('id, family_code, title, metadata').eq('status', 'published')
        if (error) throw new Error(error.message)
        const { data: membres } = await supabaseAdmin.from('bible_edition_members').select('family_id, trad_id, member_role')
        const resultat = (familles ?? []).map((f) => {
          const meta = (f as { metadata?: { books?: string[] } }).metadata
          const livres = (meta?.books ?? []).map((code) => ({ code, nom: LIVRES.find((l) => l.code === code)?.nom ?? code }))
          const traduction = (membres ?? []).find((m) => m.family_id === f.id && m.member_role === 'translation')?.trad_id
            ?? (membres ?? []).find((m) => m.family_id === f.id)?.trad_id ?? null
          return { id: f.id, code: f.family_code, titre: f.title, livres, traduction }
        })
        return NextResponse.json({ familles: resultat })
      }
      case 'bible-blocs': {
        const livre = p('livre')
        const chapitre = Math.max(1, Number.parseInt(p('chapitre') || '1', 10) || 1)
        const { bornes } = await canonDuChapitre(supabaseAdmin, livre, chapitre)
        let q = supabaseAdmin.from('v_bible_editorial_body_blocks')
          .select('id,block_key,block_kind,heading,semantic_style_code,semantic_level,embedded_title_level,material_order,canon_id_start,segment_id,notice_subtype,placement,is_public')
          .eq('family_id', p('famille')).eq('scope_book_code', livre)
        if (bornes) {
          q = chapitre === 1
            ? q.or(`and(canon_order_start.gte.${bornes.premier},canon_order_start.lte.${bornes.dernier}),canon_order_start.is.null`)
            : q.gte('canon_order_start', bornes.premier).lte('canon_order_start', bornes.dernier)
        }
        const { data, error } = await q.order('material_order').limit(1000)
        if (error) throw new Error(error.message)
        const lignes = (data ?? []) as LigneBloc[]
        const debuts = await incipits(lignes)
        const blocs = lignes.map((b) => {
          const r = resoudreStyleSemantique(b.semantic_style_code, { niveau: b.semantic_level, titre: b.embedded_title_level })
          return {
            id: b.id, cle: b.block_key, kind: b.block_kind, intitule: b.heading ?? '', incipit: debuts.get(b.segment_id) ?? '',
            style: b.semantic_style_code, canonique: r?.canonique ?? null, rang: r?.level ?? b.semantic_level ?? null,
            famille: r?.kind ?? null, canon: b.canon_id_start, placement: b.placement, public: b.is_public,
          }
        })
        return NextResponse.json({ blocs, chapitre, bornes })
      }
      default:
        return erreur('Vue inconnue.')
    }
  } catch (e) {
    return erreur(e instanceof Error ? e.message : 'Lecture impossible.', 500)
  }
}

export async function POST(request: Request) {
  if (!(await estAdminUtilisateur(request))) return erreur('Non autorisé.', 403)
  const corps = await request.json().catch(() => ({})) as Record<string, unknown>
  try {
    if (corps.cible === 'segment') {
      const id = Number(corps.id)
      if (!Number.isInteger(id)) return erreur('Segment manquant.')
      const { data: seg, error: e1 } = await supabaseAdmin.from('segments').select('id, nature, segment_metadata').eq('id', id).maybeSingle()
      if (e1) throw new Error(e1.message)
      if (!seg) return erreur('Segment introuvable.', 404)
      const champs: Record<string, unknown> = {}
      if (typeof corps.nature === 'string') champs.nature = natureAttribuable(corps.nature)
      if (typeof corps.enVers === 'boolean') champs.segment_metadata = metadonneesAvecForme(seg.segment_metadata, corps.enVers)
      if (Object.keys(champs).length === 0) return erreur('Rien à changer.')
      const { error: e2 } = await supabaseAdmin.from('segments').update(champs).eq('id', id)
      if (e2) return erreur(e2.message)
      return NextResponse.json({ ok: true, nature: champs.nature ?? seg.nature, enVers: (champs.segment_metadata as Record<string, unknown> | null | undefined)?.[CLE_FORME] === FORME_VERS })
    }
    if (corps.cible === 'bloc') {
      const id = String(corps.id ?? '')
      if (!id) return erreur('Bloc manquant.')
      const { data: bloc, error: e1 } = await supabaseAdmin.from('bible_editorial_body_blocks').select('id, family_id, metadata').eq('id', id).maybeSingle()
      if (e1) throw new Error(e1.message)
      if (!bloc) return erreur('Bloc introuvable.', 404)
      const { data: famille } = await supabaseAdmin.from('bible_edition_families').select('status').eq('id', bloc.family_id).maybeSingle()
      if (famille?.status !== 'published') return erreur('Cette famille éditoriale est en brouillon : son chantier n’est pas ici.', 403)
      const metadata = metadonneesAvecStyleBible(bloc.metadata, String(corps.style ?? ''), typeof corps.rang === 'string' ? corps.rang : null, { par: 'administration', le: new Date().toISOString() })
      const { error: e2 } = await supabaseAdmin.from('bible_editorial_body_blocks').update({ metadata }).eq('id', id)
      // Le message du verrou de la base est rendu tel quel : il est écrit pour être lu.
      if (e2) return erreur(e2.message)
      const r = resoudreStyleSemantique(String(metadata.semantic_style), { niveau: String(metadata.semantic_level) })
      return NextResponse.json({ ok: true, style: metadata.semantic_style, rang: metadata.semantic_level, canonique: r?.canonique ?? null })
    }
    return erreur('Cible inconnue.')
  } catch (e) {
    return erreur(e instanceof Error ? e.message : 'Écriture impossible.')
  }
}
