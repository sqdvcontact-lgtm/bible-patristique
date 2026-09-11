import 'server-only'

/**
 * LE CONTEXTE RÉEL D'UNE GRAVURE FILLION — le cadre inférieur de la revue.
 *
 * La revue des illustrations (`../RevueFillion.tsx`, écrite par GPT) montre chaque
 * gravure dans la page de lecture elle-même, par un cadre qui charge cette page à
 * l'ancre de la figure (`#illustration-<asset_key>`).
 *
 * ⛔ IL LIT LA BASE EN SERVICE ROLE, sans session ni RLS : il ne se rend donc QUE
 * derrière `estAdmin()` (`./page.tsx`), sous `/admin`. GPT l'avait écrit comme une
 * épreuve sous `/auth/apercu-audit-fillion`, chemin que `proxy.ts` laisse libre, et
 * sans aucune vérification : versé tel quel, il aurait servi à n'importe qui, sans
 * session, une page composée avec la clé de service. ⛔ Ne jamais le rendre depuis
 * une route libre.
 *
 * ⚠️ Ce n'est pas tout à fait la page de lecture, et le bandeau le dit. Sur un
 * chapitre dont le texte de Fillion n'est pas encore aligné, les gravures se posent
 * sur le texte de Sacy ; et une gravure rattachée à un bloc que le registre ne sait
 * pas composer est remise sur son ancre canonique, pour ne pas disparaître.
 */
import BibleLayout from '@/app/components/BibleLayout'
import { LIVRES } from '@/app/lib/bible'
import { chargerVersetsEditoriaux } from '@/app/lib/bibleEditorialServer'
import { loadBibleEditionCatalog, loadBibleEditionChapter } from '@/app/lib/bibleEditionServer'
import type { BibleEditionBodyBlockRow, BibleEditionNoteBlockRow } from '@/app/lib/bibleEditionServer'
import {
  blocEditorialAffichable, blocsTexteEditoriaux, presentationDeBloc, regimeEtPartDeLActif,
  sousTypeNoticeValide, styleCompositionDeNote,
  type BibleEditionChapterDisplay, type BibleEditionDisplayTextBlock,
} from '@/app/lib/bibleEdition'
import { baliserBlocs } from '@/app/lib/bibleHierarchieSemantique'
import { clientAdministration } from '../donnees'

const NOMS_LIVRES = Object.fromEntries(LIVRES.map(l => [l.code, l.nom]))
const TRAD = 'TR0010'
/** Le texte qui situe l'appareil quand celui de Fillion manque au chapitre. */
const TRAD_CONTEXTE = 'TR0001'

export default async function ContexteFillion({ livre: livreDemande, chapitre: chapitreDemande }: {
  livre?: string
  chapitre?: string
}) {
  // ⚠️ Des paramètres d'adresse, donc des saisies : un livre inconnu retombe sur
  // Matthieu, un chapitre qui n'est pas un nombre sur le premier.
  const livre = livreDemande && NOMS_LIVRES[livreDemande] ? livreDemande : 'MAT'
  const lu = Number.parseInt(chapitreDemande ?? '', 10)
  const chapitre = Number.isInteger(lu) && lu > 0 ? lu : 1

  const supabase = clientAdministration()
  const catalogue = await loadBibleEditionCatalog(supabase)
  const membre = catalogue.find((row) => row.trad_id === TRAD)
  if (!membre) return <p style={{ padding: 24 }}>Membre {TRAD} introuvable dans le catalogue.</p>

  const sourceIds = [...new Set(catalogue.filter((row) => row.trad_id === TRAD).map((row) => row.source_id))]
  const versetsFillion = await chargerVersetsEditoriaux(supabase, {
    sourceIds, translationId: TRAD, livre, chapitre,
  })
  const aTexteFillion = versetsFillion.some((verset) => (
    typeof verset[TRAD] === 'string' && verset[TRAD].trim().length > 0
  ))
  const versets = aTexteFillion
    ? versetsFillion
    : await supabase
      .from('versets_lecture')
      .select('*')
      .eq('livre', livre)
      .eq('chapitre', chapitre)
      .order('verset')
      .then(({ data, error }) => {
        if (error) throw new Error(`Texte biblique de contexte illisible : ${error.message}`)
        return data ?? []
      })
  const tradTexte = aTexteFillion ? TRAD : TRAD_CONTEXTE
  const canonIds = versets.map((v) => `${livre}.${chapitre}.${v.verset}`)

  const payload = await loadBibleEditionChapter(supabase, {
    familyId: membre.family_id, bookCode: livre, canonIds, includeBookFrontMatter: chapitre === 1,
  })
  const blocsAffichables = new Set(payload.bodyBlocks.filter((bloc) => blocEditorialAffichable(
    bloc.semantic_style_code,
    bloc.semantic_level,
    bloc.embedded_title_level,
  )).map((bloc) => bloc.id))

  const blocDeNote = (bloc: BibleEditionNoteBlockRow): BibleEditionDisplayTextBlock => ({
    id: bloc.block_id,
    kind: bloc.kind,
    form: bloc.form,
    text: bloc.rendering ?? bloc.text,
    language: bloc.language,
    presentationStyle: styleCompositionDeNote(bloc.presentation),
  })
  const balises = baliserBlocs((payload.bodyBlocks as readonly BibleEditionBodyBlockRow[]).map((b) => ({
    id: b.id,
    semanticStyle: b.semantic_style_code,
    intitule: b.heading,
    blockKey: b.block_key,
    semanticParentKey: b.semantic_parent_key,
    axeHierarchie: presentationDeBloc(b.presentation)?.hierarchyAxis ?? null,
  })))
  const appartient = (row: { applies_to: 'family' | 'member'; applies_to_member_id: string | null }) => (
    row.applies_to === 'family' || row.applies_to_member_id === membre.member_id
  )

  const editionChapter: BibleEditionChapterDisplay = {
    familyId: membre.family_id,
    memberId: membre.member_id,
    bodyBlocks: payload.bodyBlocks.filter(appartient).map((block) => ({
      id: block.id,
      blockKey: block.block_key,
      semanticStyleCode: block.semantic_style_code,
      semanticLevel: block.semantic_level,
      embeddedTitleLevel: block.embedded_title_level,
      presentation: presentationDeBloc(block.presentation),
      semanticParentKey: block.semantic_parent_key,
      niveauHtml: balises.get(block.id),
      noticeSubtype: sousTypeNoticeValide(block.block_kind, block.notice_subtype),
      heading: block.heading,
      placement: block.placement,
      canonIdStart: block.canon_id_start,
      canonIdEnd: block.canon_id_end,
      materialOrder: block.material_order,
      textBlocks: blocsTexteEditoriaux(block.id, block.text_content, block.text_features),
      internalNotes: block.internal_notes.map((note) => ({
        id: note.id,
        displayNumber: note.display_number,
        printedMarker: note.printed_marker,
        anchorStartOffsetUnicode: note.anchor_start_offset_unicode,
        anchorEndOffsetUnicode: note.anchor_end_offset_unicode,
        anchorText: note.anchor_text,
        anchorTarget: note.anchor_text && note.anchor_start_offset_unicode === null
          ? 'heading' as const
          : 'body' as const,
        blocks: note.blocks.map(blocDeNote),
      })),
    })),
    notes: payload.notes.filter(appartient).map((note) => ({
      id: note.id,
      displayNumber: note.display_number,
      canonId: note.canon_id,
      materialOrder: note.material_order,
      blocks: note.blocks.map(blocDeNote),
    })),
    assets: payload.assets.filter(appartient).map((asset) => ({
      id: asset.id,
      assetKey: asset.asset_key,
      assetKind: asset.asset_kind,
      url: asset.public_uri,
      width: asset.width_px,
      height: asset.height_px,
      altText: asset.alt_text,
      caption: asset.editorial_caption ?? asset.printed_caption,
      printedPage: asset.printed_page,
      placement: asset.placement,
      canonIdStart: asset.canon_id_start,
      canonIdEnd: asset.canon_id_end,
      // Dans certains livres sans concordance canonique validée (Tobie), le
      // commentaire conserve son ancre matérielle mais son bloc n'entre pas
      // encore dans le chapitre canonique. La revue montre alors la figure à la
      // borne de sa plage biblique ; la liaison exacte reste intacte en base.
      bodyBlockId: asset.body_block_id && blocsAffichables.has(asset.body_block_id) ? asset.body_block_id : null,
      noteId: asset.note_id,
      materialOrder: asset.material_order,
      ...regimeEtPartDeLActif(asset),
    })),
  }

  return (
    <>
      {/* Le badge de développement de Next masquerait un coin de la page revue. */}
      <style>{'nextjs-portal{display:none!important}'}</style>
      {!aTexteFillion && (
        <p style={{ margin: 0, padding: '.45rem 1rem', color: 'var(--cs-texte-second)', fontSize: '.75rem', textAlign: 'center' }}>
          Texte biblique de la Bible de Sacy utilisé pour situer l’appareil et les illustrations Fillion.
          Les figures dont le commentaire n’est pas encore aligné sont présentées à la borne de leur plage biblique ; leur ancre matérielle exacte est conservée.
        </p>
      )}
      <BibleLayout
        livres={LIVRES}
        versets={versets}
        traductions={[{ code: tradTexte, label: aTexteFillion ? 'Fillion' : 'Bible de Sacy · contexte Fillion' }]}
        livreActif={livre}
        chapitreActif={chapitre}
        nomLivre={NOMS_LIVRES[livre] ?? livre}
        tradInitiale={tradTexte}
        readingCapabilities={{}}
        editionChapter={editionChapter}
        paratexteDisponible
      />
    </>
  )
}
