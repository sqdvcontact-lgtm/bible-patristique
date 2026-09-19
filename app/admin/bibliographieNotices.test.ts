import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  fusionnerLiensEtOuvrages,
  idsOuvragesUniques,
  type LienSansOuvrage,
  type OuvrageAdminNotice,
} from './bibliographieNotices'

const lien = (id: number, ouvrageId: number): LienSansOuvrage => ({
  id,
  ouvrage_id: ouvrageId,
  rubrique: null,
  importance: null,
  reference_passage: null,
  pages: null,
  note_editoriale: null,
  statut_verification: 'verifie',
  retenu_notice: false,
  ordre_notice: null,
  motif_selection: null,
})

const ouvrage = (id: number, titre: string): OuvrageAdminNotice => ({
  id,
  auteurs: null,
  titre,
  annee: null,
  type_ouvrage: null,
  statut_scientifique: 'retenu',
  statut_usage_notice: 'citation_francophone',
  statut_editorial: 'valide',
})

describe('chargement bibliographique des notices', () => {
  it('dédoublonne les IDs sans modifier leur ordre de première rencontre', () => {
    expect(idsOuvragesUniques([lien(1, 8), lien(2, 3), lien(3, 8), lien(4, 5)]))
      .toEqual([8, 3, 5])
    expect(idsOuvragesUniques([])).toEqual([])
  })

  it('reconstitue la forme Lien, conserve son ordre et met à null une fiche absente', () => {
    const liens = [lien(31, 8), lien(12, 3), lien(25, 99)]
    const fusion = fusionnerLiensEtOuvrages(liens, [ouvrage(3, 'Trois'), ouvrage(8, 'Huit')])

    expect(fusion.map(l => l.id)).toEqual([31, 12, 25])
    expect(fusion.map(l => l.ouvrages_bibliographiques?.titre ?? null))
      .toEqual(['Huit', 'Trois', null])
    expect(fusion[0]).toMatchObject({ ...liens[0], ouvrages_bibliographiques: { titre: 'Huit' } })
  })
})

describe('surfaces bibliographiques utilisées par les écrans administrateur', () => {
  const fiabilite = readFileSync(new URL('./SectionFiabilite.tsx', import.meta.url), 'utf8')
  const ouvrages = readFileSync(new URL('./SectionOuvrages.tsx', import.meta.url), 'utf8')
  const notices = readFileSync(new URL('./SectionValidationNotices.tsx', import.meta.url), 'utf8')
  const troisEcrans = `${fiabilite}\n${ouvrages}\n${notices}`

  it('emploie les vues admin et ne lit plus directement les six tables restreintes', () => {
    for (const vue of [
      'v_bibliography_admin_ouvrages',
      'v_bibliography_admin_contributeurs_scientifiques',
      'v_bibliography_admin_editeurs_valeur',
      'v_bibliography_admin_collections_valeur',
      'v_bibliography_admin_auteurs_valeur',
    ]) expect(troisEcrans).toContain(`from('${vue}')`)

    for (const table of [
      'ouvrages_bibliographiques',
      'ouvrages_bibliographiques_editeurs',
      'ouvrage_contributeurs_scientifiques',
      'editeurs_valeur',
      'collections_valeur',
      'auteurs_valeur',
    ]) expect(troisEcrans).not.toContain(`from('${table}')`)
  })

  it('charge les liens sans embed puis les ouvrages par la vue admin', () => {
    expect(notices).toContain("from('pericope_bibliographie').select('id, ouvrage_id, rubrique, importance, reference_passage, pages, note_editoriale, statut_verification, retenu_notice, ordre_notice, motif_selection')")
    expect(notices).not.toContain('ouvrages_bibliographiques(auteurs')
    expect(notices).toContain("from('v_bibliography_admin_ouvrages')")
    expect(notices).toContain('if (ouvrageIds.length > 0)')
  })

  it('conserve les surfaces explicitement partagées par le contrat', () => {
    expect(ouvrages).toContain("from('v_ouvrages_bibliographiques_qualite')")
    expect(ouvrages).toContain("from('v_references_bibliographiques')")
    expect(ouvrages).toContain("from('auteurs')")
  })
})
