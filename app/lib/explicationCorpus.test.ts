import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { lireMetadonneesBlocNote } from './apparatCritique'
import {
  CORPS_ENCART,
  INTERLIGNE_ENCART,
  MARGE_LIBELLE_EXPLICATION_REM,
  STYLE_FACE_LIBELLE_EXPLICATION,
  STYLE_LIBELLE_EXPLICATION,
  hauteurSouhaiteeNote,
  reliefDeLaNote,
} from './compositionNote'
import {
  CLASSE_EXPLICATION_CORPUS,
  LIBELLE_EXPLICATION_CORPUS,
  STYLE_EXPLICATION_CORPUS,
  estExplicationCorpus,
  libelleExplicationCorpus,
  libelleLectureSur,
  styleLectureSur,
} from './explicationCorpus'

// ── L'EXPLICATION DE CORPUS SCRIPTURA : le contrat, sa projection, sa feuille ────
//
// ⛔ Aucun identifiant de bloc n'entre dans la règle. Les tests en nomment un pour montrer
// qu'il n'y change rien.

/** Le contrat tel que la passe P10 le pose sur `texte_note_blocs.metadata`. */
const CONTRAT = {
  editorial_role: 'corpus_editorial_note',
  reader_style: 'corpus_explanation',
  reader_label: 'Corpus Scriptura',
  editorial_origin: 'Corpus Scriptura',
  editorial_addition: true,
  clarity_summary: true,
}

describe('le vocabulaire des styles de lecture', () => {
  it('ne reconnaît que « corpus_explanation », au caractère près', () => {
    expect(styleLectureSur('corpus_explanation')).toBe(STYLE_EXPLICATION_CORPUS)
    for (const valeur of ['Corpus_Explanation', 'corpus explanation', 'corpus_explanations', '', null, undefined, 1, true, {}]) {
      expect(styleLectureSur(valeur)).toBeNull()
    }
  })

  it('lit un libellé non vide, débarrassé de ses blancs de bord', () => {
    expect(libelleLectureSur('  Corpus Scriptura  ')).toBe('Corpus Scriptura')
    for (const valeur of ['', '   ', null, undefined, 12, false]) expect(libelleLectureSur(valeur)).toBeNull()
  })
})

describe('estExplicationCorpus', () => {
  it('se décide sur le style de lecture, et sur lui seul', () => {
    const avecStyle = { blockId: 'un-bloc-quelconque', editorialRole: 'source_editorial_note', readerStyle: 'corpus_explanation' }
    // ⛔ Un bloc de Corpus Scriptura sans le style n'est pas une explication, fût-il nommé
    // comme les clarifications de la passe.
    const roleSeul = { blockId: 'AUG-CD-ALA-0084:clarity-v32', editorialRole: 'corpus_editorial_note', readerStyle: null }
    expect(estExplicationCorpus(avecStyle)).toBe(true)
    expect(estExplicationCorpus(roleSeul)).toBe(false)
    expect(estExplicationCorpus({})).toBe(false)
  })

  it('prend le libellé de la donnée, sinon « Corpus Scriptura »', () => {
    expect(libelleExplicationCorpus({ readerLabel: 'Éclaircissement' })).toBe('Éclaircissement')
    expect(libelleExplicationCorpus({ readerLabel: '   ' })).toBe(LIBELLE_EXPLICATION_CORPUS)
    expect(libelleExplicationCorpus({ readerLabel: null })).toBe('Corpus Scriptura')
    expect(libelleExplicationCorpus({})).toBe('Corpus Scriptura')
  })
})

describe('la projection du contrat (`lireMetadonneesBlocNote`)', () => {
  it('fait voyager le style et son libellé, et rien d’autre du contrat', () => {
    const lu = lireMetadonneesBlocNote(CONTRAT)
    expect(lu.readerStyle).toBe('corpus_explanation')
    expect(lu.readerLabel).toBe('Corpus Scriptura')
    expect(lu.editorialRole).toBe('corpus_editorial_note')
    // ⚠️ Connus, non projetés : le rendu ne les lit pas.
    for (const cle of ['editorialOrigin', 'editorialAddition', 'claritySummary', 'editorial_origin', 'editorial_addition', 'clarity_summary']) {
      expect(Object.keys(lu)).not.toContain(cle)
    }
  })

  it('ne déclenche rien sur le rôle seul, ni sur un libellé sans style', () => {
    expect(lireMetadonneesBlocNote({ editorial_role: 'corpus_editorial_note' }).readerStyle).toBeNull()
    const libelleSeul = lireMetadonneesBlocNote({ editorial_role: 'corpus_editorial_note', reader_label: 'Corpus Scriptura' })
    expect(libelleSeul.readerStyle).toBeNull()
    expect(libelleSeul.readerLabel).toBeNull()
    const styleInconnu = lireMetadonneesBlocNote({ ...CONTRAT, reader_style: 'corpus_explanations' })
    expect(styleInconnu.readerStyle).toBeNull()
    expect(styleInconnu.readerLabel).toBeNull()
  })

  it('garde le style quand le libellé est vide : le rendu retombe alors sur « Corpus Scriptura »', () => {
    const lu = lireMetadonneesBlocNote({ ...CONTRAT, reader_label: '  ' })
    expect(lu.readerStyle).toBe('corpus_explanation')
    expect(lu.readerLabel).toBeNull()
    expect(libelleExplicationCorpus(lu)).toBe('Corpus Scriptura')
  })
})

describe('le libellé, et ce qu’il demande à la boîte', () => {
  it('ne porte aucune couleur : elle vient de la classe, donc du thème', () => {
    expect(STYLE_LIBELLE_EXPLICATION.color).toBeUndefined()
    expect(STYLE_FACE_LIBELLE_EXPLICATION.color).toBeUndefined()
  })

  it('emprunte la ligne du propos, et reste hors de la sélection', () => {
    expect(STYLE_LIBELLE_EXPLICATION.display).toBe('block')
    expect(STYLE_LIBELLE_EXPLICATION.fontSize).toBe(CORPS_ENCART)
    expect(STYLE_LIBELLE_EXPLICATION.lineHeight).toBe(INTERLIGNE_ENCART)
    expect(STYLE_LIBELLE_EXPLICATION.userSelect).toBe('none')
  })

  it('compte une ligne et son blanc par libellé dans l’estimation de hauteur', () => {
    const note = { blocks: [{ text: 'La remarque de l’édition.' }, { text: 'Une explication.', readerStyle: 'corpus_explanation' }] }
    expect(reliefDeLaNote(note).libelles).toBe(1)
    expect(reliefDeLaNote({ blocks: [{ text: 'Sans style.' }] }).libelles).toBe(0)
    expect(reliefDeLaNote('Une note héritée.').libelles).toBe(0)

    const racine = 16
    const sans = hauteurSouhaiteeNote({ signes: 120, racine })
    const avec = hauteurSouhaiteeNote({ signes: 120, racine, libelles: 1 })
    const attendu = (Number.parseFloat(CORPS_ENCART) * INTERLIGNE_ENCART + MARGE_LIBELLE_EXPLICATION_REM) * racine
    expect(Math.abs(avec - sans - attendu)).toBeLessThanOrEqual(1)
  })
})

// ── La feuille ───────────────────────────────────────────────────────────────

const NL = String.fromCharCode(10)

function sansCommentaires(css: string): string {
  let sortie = ''
  let i = 0
  while (i < css.length) {
    const debut = css.indexOf('/*', i)
    if (debut < 0) { sortie += css.slice(i); break }
    sortie += css.slice(i, debut)
    const fin = css.indexOf('*/', debut + 2)
    if (fin < 0) break
    i = fin + 2
  }
  return sortie
}

const FEUILLE = sansCommentaires(readFileSync(join(process.cwd(), 'app', 'globals.css'), 'utf8'))

/** Le corps d'une règle de premier niveau, accolades appariées. */
function corpsDe(selecteur: string): string {
  const debut = FEUILLE.indexOf(NL + selecteur + ' {')
  if (debut < 0) throw new Error('règle introuvable : ' + selecteur)
  const ouverture = FEUILLE.indexOf('{', debut)
  let profondeur = 0
  for (let i = ouverture; i < FEUILLE.length; i++) {
    if (FEUILLE[i] === '{') profondeur++
    else if (FEUILLE[i] === '}') {
      profondeur--
      if (profondeur === 0) return FEUILLE.slice(ouverture + 1, i)
    }
  }
  throw new Error('règle non fermée : ' + selecteur)
}

function jeton(corps: string, nom: string): string {
  const debut = corps.indexOf(nom + ':')
  if (debut < 0) throw new Error('jeton introuvable : ' + nom)
  return corps.slice(debut + nom.length + 1, corps.indexOf(';', debut)).trim()
}

function luminance(hex: string): number {
  const h = hex.replace('#', '')
  const plein = h.length === 3 ? h.split('').map(c => c + c).join('') : h
  const canaux = [0, 2, 4].map(i => Number.parseInt(plein.slice(i, i + 2), 16) / 255)
  const lineaire = canaux.map(c => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * lineaire[0] + 0.7152 * lineaire[1] + 0.0722 * lineaire[2]
}

function contraste(a: string, b: string): number {
  const [claire, sombre] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (claire + 0.05) / (sombre + 0.05)
}

describe('la feuille : un jeton par thème, et une classe qui ne change que l’encre', () => {
  const clair = corpsDe(':root')
  const cuir = corpsDe(':root[data-theme="sombre"]')

  it('pose le vert dans les deux thèmes : celui du site au Clair, une sauge plus claire au Cuir', () => {
    const vertClair = jeton(clair, '--cs-explication-corpus')
    const vertCuir = jeton(cuir, '--cs-explication-corpus')
    // ⚠️ La même valeur que `--cs-vert` au Clair, sans en être un alias : au Cuir, le vert
    // d'accent devient un or, et l'explication doit rester verte.
    expect(vertClair).toBe(jeton(clair, '--cs-vert'))
    expect(vertCuir).not.toBe(jeton(cuir, '--cs-vert'))
    expect(luminance(vertCuir)).toBeGreaterThan(luminance(vertClair))
  })

  it('tient 4,5 de contraste sur les deux fonds de l’encart, dans chaque thème', () => {
    for (const theme of [clair, cuir]) {
      const vert = jeton(theme, '--cs-explication-corpus')
      for (const fond of ['--cs-fond', '--cs-surface']) {
        expect(contraste(vert, jeton(theme, fond))).toBeGreaterThanOrEqual(4.5)
      }
    }
  })

  it('colore le bloc par sa classe, sans fond ni encadré, et tient ses liens dans son vert', () => {
    const bloc = corpsDe('.' + CLASSE_EXPLICATION_CORPUS)
    expect(bloc).toContain('color: var(--cs-explication-corpus)')
    expect(bloc).not.toContain('background')
    expect(bloc).not.toContain('border')
    // ⛔ Le point d'exclamation n'est pas un ornement : le lien porte sa couleur en style en ligne.
    expect(corpsDe('.' + CLASSE_EXPLICATION_CORPUS + ' a')).toContain('color: inherit !important')
    const filet = corpsDe('.' + CLASSE_EXPLICATION_CORPUS + '::before')
    expect(filet).toContain('var(--cs-explication-corpus)')
    expect(filet).toContain('pointer-events: none')
  })
})
