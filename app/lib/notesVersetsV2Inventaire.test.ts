import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { composerNotesV2, positionsDesVersets, type LigneNoteV2, type PositionsDeLecture } from './notesVersetsV2'
import {
  inventorierNotesEditoriales, lectureDemandee, noteAbsente, RAISONS_ABSENCE_EDITORIALE, repereDeLaFenetre,
} from './notesVersetsV2Inventaire'

// ── L'INVENTAIRE DES NOTES ÉDITORIALES D'UN LIVRE ───────────────────────────────
//
// Demande de l'auteur (17 septembre 2026) : « Tu as bien affiché les notes dans le volet de
// droite, hein ? » Elles ne l'étaient pas : l'onglet « Notes » ne recensait que l'appareil
// d'une édition. ⛔ L'inventaire REJOUE la composition de la page ; ces tests exigent qu'une
// fenêtre porte l'identifiant, le rang et la cible que la page donne à son appel.

const ligne = (surcharge: Partial<LigneNoteV2>): LigneNoteV2 => ({
  id: 'l1', trad_id: 'TR0001', livre: 'PSA', canon_id: null, ch_orig: null, v_orig: null,
  v_orig_suffixe: null, est_suscription: false, ordre_slot: null, texte: 'Texte', notes: 'Une note.',
  ...surcharge,
})

const verset = (id_verset: string, textes: Record<string, string | null> = {}) => ({ id_verset, ...textes })

describe('repereDeLaFenetre', () => {
  it('dit un créneau en « chapitre, verset »', () => {
    expect(repereDeLaFenetre('PSA.10.4', 'PSA', 10, null)).toEqual({ verset: 4, reperes: '10, 4', canonId: 'PSA.10.4' })
  })
  it('dit le titre d’un psaume, sans créneau à poser', () => {
    expect(repereDeLaFenetre('PSA.38.0^', 'PSA', 38, null)).toEqual({ verset: 0, reperes: '38, titre', canonId: null })
  })
  it('dit une ligne propre à l’édition, et pose le créneau du même numéro', () => {
    expect(repereDeLaFenetre('SIR.3.32+', 'SIR', 3, null))
      .toEqual({ verset: 32, reperes: '3, 32 (hors canon)', canonId: 'SIR.3.32' })
  })
  it('dit une glose par la numérotation de sa ligne', () => {
    expect(repereDeLaFenetre('uuid-1', 'GEN', 13, { v_orig: 18 }))
      .toEqual({ verset: 18, reperes: '13, 18 (glose)', canonId: 'GEN.13.18' })
    expect(repereDeLaFenetre('uuid-2', 'GEN', 13, { v_orig: null }))
      .toEqual({ verset: 0, reperes: '13, glose', canonId: null })
  })
})

describe('inventorierNotesEditoriales', () => {
  const positions = new Map<number, PositionsDeLecture>([
    [9, positionsDesVersets([verset('PSA.9.0^', { TR0001: 'Titre' }), verset('PSA.9.1', { TR0001: 'Un' }), verset('PSA.9.2', { TR0001: 'Deux' })], 'TR0001')],
    [10, positionsDesVersets([verset('PSA.10.1', { TR0001: 'Un' }), verset('PSA.10.4', { TR0001: 'Quatre' }), verset('PSA.10.4+', { TR0001: 'Surplus' })], 'TR0001')],
  ])
  const lignes = [
    ligne({ id: 'a', canon_id: 'PSA.10.4', ch_orig: 9, v_orig: 25, notes: 'Écart de numérotation.' }),
    ligne({ id: 'b', est_suscription: true, ch_orig: 9, v_orig: 0, notes: 'Argument du psaume.' }),
    ligne({ id: 'c', ch_orig: 10, v_orig: 4, notes: 'Verset propre à l’édition.' }),
    ligne({ id: 'd', canon_id: 'PSA.9.2', ch_orig: 9, v_orig: 2, notes: '   ' }),
    ligne({ id: 'e', canon_id: 'DAN.3.1', ch_orig: 3, v_orig: 1, notes: 'Hors du livre.' }),
    ligne({ id: 'f', canon_id: 'PSA.11.1', ch_orig: 11, v_orig: 1, notes: 'Chapitre sans page.' }),
  ]
  const releve = inventorierNotesEditoriales(lignes, { livre: 'PSA', mode: 'vue-large', positions })

  it('⛔ porte l’identifiant, le rang et la cible que la page donne à chaque appel', () => {
    for (const chapitre of [9, 10]) {
      const page = composerNotesV2(lignes, { livre: 'PSA', chapitre, mode: 'vue-large', positions: positions.get(chapitre)!, debut: 1 })
      const inventaire = releve.fenetres.filter(f => f.chapitre === chapitre)
      expect(inventaire.map(f => [f.id, f.rang, f.cible])).toEqual(page.map(n => [n.id, n.displayNumber, n.canonId]))
      expect(inventaire.map(f => f.textes)).toEqual(page.map(n => n.blocks.map(b => b.text)))
    }
  })

  it('range les fenêtres par chapitre et dit leurs repères', () => {
    expect(releve.fenetres.map(f => [f.chapitre, f.reperes])).toEqual([
      [9, '9, titre'],
      [10, '10, 4'],
      [10, '10, 4 (hors canon)'],
    ])
  })

  it('dit pourquoi une note ne paraît pas, et écarte une note vide', () => {
    expect(releve.absentes).toEqual([
      { id: 'e', chapitre: null, verset: 1, reperes: '3, 1', raison: RAISONS_ABSENCE_EDITORIALE.autreLivre, texte: 'Hors du livre.' },
      { id: 'f', chapitre: 11, verset: 1, reperes: '11, 1', raison: RAISONS_ABSENCE_EDITORIALE.sansPage, texte: 'Chapitre sans page.' },
    ])
    expect([...releve.fenetres.map(f => f.id), ...releve.absentes.map(a => a.id)]).not.toContain('v2-d')
  })

  it('une note absente se dit avec la numérotation de sa ligne, suffixe compris', () => {
    expect(noteAbsente(ligne({ id: 'h', livre: 'EST', ch_orig: 1, v_orig: 1, v_orig_suffixe: 'a', notes: '  Suite grecque.  ' }), 1, RAISONS_ABSENCE_EDITORIALE.horsCanon))
      .toEqual({ id: 'h', chapitre: 1, verset: 1, reperes: '1, 1a', raison: RAISONS_ABSENCE_EDITORIALE.horsCanon, texte: 'Suite grecque.' })
  })

  it('par le canon, une note orpheline cite le fragment qu’elle explique', () => {
    const parLeCanon = inventorierNotesEditoriales(
      [ligne({ id: 'g', trad_id: 'TR0013', livre: 'GEN', ch_orig: 12, v_orig: 8, texte: 'Répétition', notes: 'Répétition matérielle.' })],
      {
        livre: 'GEN', mode: 'canon-v2',
        positions: new Map([[12, positionsDesVersets([verset('GEN.12.8', { TR0013: 'huit' })], 'TR0013')]]),
      },
    )
    expect(parLeCanon.fenetres).toEqual([expect.objectContaining({
      id: 'v2-g', cible: 'GEN.12.8', rang: 1, reperes: '12, 8', textes: ['Répétition', 'Répétition matérielle.'],
    })])
  })
})

describe('lectureDemandee — les paramètres de la route', () => {
  const demande = (texte: string) => lectureDemandee(new URLSearchParams(texte))
  const FAMILLE = '0f5b3a8e-1234-4abc-9def-0123456789ab'

  it('lit la vue large et la lecture par le canon', () => {
    expect(demande('trad=TR0001&livre=PSA&lecture=vue-large')).toEqual({ trad: 'TR0001', livre: 'PSA', lecture: { lecture: 'vue-large' } })
    expect(demande('trad=TR0013&livre=1SA&lecture=canon-v2')).toEqual({ trad: 'TR0013', livre: '1SA', lecture: { lecture: 'canon-v2' } })
  })

  it('lit la lecture en regard, dont la bible relevée doit être lue par le canon', () => {
    expect(demande(`trad=TR0013&livre=GEN&lecture=regard&famille=${FAMILLE}&parLeCanon=TR0013`))
      .toEqual({ trad: 'TR0013', livre: 'GEN', lecture: { lecture: 'regard', famille: FAMILLE, biblesParLeCanon: ['TR0013'] } })
    expect(demande(`trad=TR0009&livre=GEN&lecture=regard&famille=${FAMILLE}&parLeCanon=TR0013`)).toBeNull()
  })

  it('refuse ce qui n’est pas une demande', () => {
    expect(demande('trad=TR0001&livre=PSA')).toBeNull()
    expect(demande('trad=TR0001;drop&livre=PSA&lecture=vue-large')).toBeNull()
    expect(demande('trad=TR0001&livre=psaumes&lecture=vue-large')).toBeNull()
    expect(demande('trad=TR0013&livre=GEN&lecture=regard&famille=pas-un-uuid&parLeCanon=TR0013')).toBeNull()
  })
})

describe('le relevé rejoue les chargeurs de la page', () => {
  const PAGE = readFileSync('app/page.tsx', 'utf8')
  const SERVEUR = readFileSync('app/lib/notesVersetsV2InventaireServeur.ts', 'utf8')
  const ROUTE = readFileSync('app/api/admin/notes-versets/route.ts', 'utf8')
  const LAYOUT = readFileSync('app/components/BibleLayout.tsx', 'utf8')

  it('⛔ la vue large départage un verset et sa ligne propre par l’identifiant, des deux côtés', () => {
    expect(PAGE).toMatch(/\.eq\('chapitre', chapitre\)\s*\.order\('verset'\)[\s\S]{0,700}?\.order\('id_verset'\)\s*return data \|\| \[\]/)
    expect(SERVEUR).toMatch(/\.order\('verset'\)\s*\.order\('id_verset'\)/)
  })

  it('⛔ lit les places par les chargeurs de la page, et nulle part ailleurs', () => {
    expect(SERVEUR.startsWith("import 'server-only'")).toBe(true)
    expect(SERVEUR).toContain('chargerVersetsCanoniquesV2(client, { translationId: trad, livre, chapitre })')
    expect(SERVEUR).toContain('chargerLectureBilingue(client, { familyRows, livre, chapitre, membresCanoniquesV2 })')
    expect(SERVEUR).toContain('positionsEnRegard(chargee.axeCanonique, colonne.cellules)')
    expect(SERVEUR).toContain('positionsDesVersets(versets, trad)')
  })

  it('⛔ une bible qui n’est pas une colonne réelle de la vue large n’y est pas lue', () => {
    expect(SERVEUR).toContain('if (!(await codesTraductionsLecture(client)).includes(trad)) return toutesAbsentes(RAISONS_ABSENCE_EDITORIALE.horsVueLarge)')
  })

  it('⛔ la route est réservée à l’administrateur, sous sa session, et sans cache', () => {
    expect(ROUTE).toContain('if (!(await estAdmin()))')
    expect(ROUTE).toContain('creerSupabaseServeur()')
    expect(ROUTE).toContain("'Cache-Control': 'private, no-store'")
    expect(ROUTE).not.toMatch(/SERVICE_ROLE|supabaseAdmin/)
  })

  it('la page déclare, bible par bible, comment elle lit ces notes', () => {
    expect(LAYOUT).toContain('estVerseCanoniqueV2(capacites)')
    expect(LAYOUT).toContain("{ lecture: 'regard' as const, famille: familleCle, biblesParLeCanon: parLeCanon }")
    expect(LAYOUT).toContain('(familleLue === null && !avecNotesEditoriales) ? null')
  })
})
