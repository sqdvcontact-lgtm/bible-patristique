import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ContenuNoteStructuree } from './ContenuNoteStructuree'
import type { NoteBlocData, NoteStructuree } from './oeuvreTypes'

/** L'espace insécable, écrite par son code : un caractère invisible ne se relit pas. */
const INSECABLE = String.fromCharCode(0xa0)

function note(...blocks: NoteBlocData[]): NoteStructuree {
  return { noteKey: 'I-TEST', noteNumber: 1, blocks }
}

function block(overrides: Partial<NoteBlocData>): NoteBlocData {
  return {
    blockId: 'b1', rank: 100, kind: 'commentary', form: 'prose',
    language: 'fr', text: 'Texte', rendering: 'word_paragraph',
    needsReview: false, targetBlockId: null, translationOf: null,
    ...overrides,
  }
}

describe('ContenuNoteStructuree', () => {
  it('rend inline_after_target après la cible avec une espace insécable et sans parenthèses ajoutées', () => {
    const html = renderToStaticMarkup(<ContenuNoteStructuree note={note(
      block({ blockId: 'cible', text: 'Traduction.' }),
      block({
        blockId: 'ref', rank: 200, kind: 'reference', text: '(Platon, Timée.)',
        rendering: 'inline_after_target', targetBlockId: 'cible',
      }),
    )} />)

    expect(html).toContain('Traduction.<span')
    expect(html).toContain(`>${INSECABLE}(Platon, Timée.)</span>`)
    expect(html).not.toContain('((Platon')
  })

  it('rend manual_line_break_in_verse dans la même unité après un vrai retour à la ligne', () => {
    const html = renderToStaticMarkup(<ContenuNoteStructuree note={note(
      block({ blockId: 'poeme', kind: 'quotation', form: 'verse', text: 'Premier vers\nSecond vers', rendering: 'Footnote Verse' }),
      block({
        blockId: 'ref', rank: 200, kind: 'reference', text: '(Contra Symmach.)',
        rendering: 'manual_line_break_in_verse', targetBlockId: 'poeme',
      }),
    )} />)

    // ⛔ UN VERS EST UNE BOÎTE PAR LIGNE, non un texte à `pre-line` : c'est la boîte
    // qui porte le retrait de suite, et c'est elle qui interdit la césure. Le renvoi
    // qui suit descend d'une ligne en devenant une boîte lui aussi — le saut matériel
    // n'a plus de `pre-line` pour le rendre, et deux façons de descendre d'une ligne
    // dans le même bloc se contrediraient.
    expect(html).toContain('>Premier vers</span>')
    expect(html).toContain('>Second vers</span>')
    expect(html).not.toContain('Premier vers\nSecond vers')
    expect(html).toContain('hyphens:none')
    expect(html).toContain('(Contra Symmach.)</span>')
    expect((html.match(/data-block-id="poeme"/g) ?? [])).toHaveLength(1)
  })

  it('compose au MÊME corps ce que la note CITE, et sur un seul fer', () => {
    const html = renderToStaticMarkup(<ContenuNoteStructuree note={note(
      block({ blockId: 'poeme', kind: 'quotation', form: 'verse', language: 'la', text: 'Jam mihi deterior canis\nJamque meos vultus' }),
      block({ blockId: 'trad', rank: 200, kind: 'translation', text: 'La traduction.' }),
    )} />)

    // ⛔ AUCUN CORPS PROPRE AU VERS : la source ne se compose pas plus petit que sa
    // propre traduction, dans une boîte qui porte déjà le rang discret de l'appareil.
    // Aucune des cinq autres surfaces où le site compose des vers ne le fait.
    expect(html).not.toContain('font-size:0.9em')
    // ⛔ UN SEUL FER POUR LES DEUX : la ligne de vers le porte en marge, le bloc de
    // traduction en rembourrage, et les deux rendent 1,5 em.
    expect(html).toContain('margin-left:1.5em')
    expect(html).toContain('padding-left:1.5em')
    // ⛔ ET PAS DE FILET : le retrait dit tout, comme pour une citation sortie.
    expect(html).not.toContain('border-left')
  })

  it('conserve word_paragraph comme paragraphe distinct, au rang prévu et sans italique par défaut', () => {
    const html = renderToStaticMarkup(<ContenuNoteStructuree note={note(
      block({ blockId: 'lemme', text: 'Lemme.' }),
      block({
        blockId: 'ref', rank: 200, kind: 'reference', text: 'Voir le chapitre VI.',
        rendering: 'word_paragraph', targetBlockId: 'lemme',
      }),
    )} />)

    expect(html.indexOf('Lemme.')).toBeLessThan(html.indexOf('Voir le chapitre VI.'))
    expect(html).toContain('data-block-id="ref"')
    expect(html).toContain('font-style:normal')
    expect(html).not.toContain('<em>')
  })

  it('compose les titres et locutions balisés en italique dans une note ordinaire', () => {
    const html = renderToStaticMarkup(<ContenuNoteStructuree note={note(
      block({ text: 'Voir *De anima*, 58.' }),
    )} />)

    expect(html).toContain('Voir <em>De anima</em>, 58.')
    expect(html).not.toContain('*De anima*')
  })

  it('ne prête pas l’italique d’un bloc latin au renvoi français qui le suit en ligne', () => {
    // L'italique dit la langue du texte qu'il couvre : un nom d'auteur n'est pas du latin.
    const html = renderToStaticMarkup(<ContenuNoteStructuree note={note(
      block({ blockId: 'q', kind: 'quotation', language: 'la', text: 'Tolle, lege.' }),
      block({
        blockId: 'r', rank: 200, kind: 'reference', text: '(Augustin, Confessions.)',
        rendering: 'inline_after_target', targetBlockId: 'q',
      }),
    )} />)

    expect(html).toMatch(/<span[^>]*data-kind="reference"[^>]*font-style:normal/u)
  })
})

// ── LA NOTE I-02 DE LA CONSOLATION, telle que la base la porte depuis le 11 septembre
// 2026 : la citation visée, la référence d'Ovide, le latin d'Ovide, sa traduction.
// C'est le cas témoin de la charte § 13.18.
describe('la citation visée, puis la référence, puis le groupe citationnel — I-02', () => {
  const i02 = note(
    block({
      blockId: 'I-02:cs-lemma-target', rank: 1, kind: 'lemma', form: 'verse', rendering: 'Footnote Verse',
      citationLayout: 'block', text: 'Hélas ! avant le temps, le malheur m’a fait vieux.',
    }),
    block({
      blockId: 'I-02:b0400', rank: 2, kind: 'reference',
      text: '++Ovide++, *Pontiques*, I, 4, vers 1-2 et 19-20 :', targetBlockId: 'I-02:b0200',
    }),
    block({
      blockId: 'I-02:b0200', rank: 3, kind: 'quotation', form: 'verse', language: 'la',
      rendering: 'Footnote Verse', citationLayout: 'block',
      text: 'Jam mihi deterior canis aspergitur ætas,\nJamque meos vultus ruga senilis arat…\nMe quoque debilitat series immensa laborum\nAnte meum tempus cogor et esse senex.',
    }),
    block({
      blockId: 'I-02:b0300', rank: 4, kind: 'translation', citationLayout: 'block', translationOf: 'I-02:b0200',
      text: 'Déjà le temps impitoyable a blanchi mes cheveux ; déjà les rides de la vieillesse sillonnent mon visage… je succombe à cette longue succession de malheurs, et sans le vouloir j’ai vieilli avant l’âge.',
    }),
  )
  const html = renderToStaticMarkup(<ContenuNoteStructuree note={i02} />)
  const unite = (id: string) => html.match(new RegExp(`<div[^>]*data-block-id="${id}"[^>]*>`, 'u'))?.[0] ?? ''

  it('rend QUATRE unités distinctes, dans l’ordre des rangs', () => {
    const ordre = [...html.matchAll(/<div[^>]*data-block-id="([^"]+)"/gu)].map(m => m[1])
    expect(ordre).toEqual(['I-02:cs-lemma-target', 'I-02:b0400', 'I-02:b0200', 'I-02:b0300'])
    // ⛔ La citation visée n'est plus un fragment posé au début de la référence : collée
    // à « Ovide », elle se lisait comme une phrase d'Ovide.
    expect(html).not.toMatch(/<span[^>]*data-kind="lemma"/u)
  })

  it('compose la citation visée en ROMAIN, sortie comme tout vers cité : elle est française', () => {
    expect(unite('I-02:cs-lemma-target')).toContain('font-style:normal')
    expect(unite('I-02:cs-lemma-target')).toContain('data-disposition="sortie"')
    expect(unite('I-02:cs-lemma-target')).toContain('padding-left:1.5em')
  })

  it('termine la référence sur son deux-points, Ovide en petites capitales', () => {
    expect(unite('I-02:b0400')).toContain('font-style:normal')
    expect(html).toMatch(/font-variant:small-caps[^>]*>Ovide</u)
    expect(html).not.toContain('uppercase')
    expect(html).toContain(`19-20${INSECABLE}:`)
  })

  it('sort le latin en italique et sa traduction en romain, au même fer, sans guillemets', () => {
    expect(unite('I-02:b0200')).toContain('font-style:italic')
    expect(unite('I-02:b0200')).toContain('data-disposition="sortie"')
    expect(unite('I-02:b0300')).toContain('font-style:normal')
    expect(unite('I-02:b0300')).toContain('data-disposition="sortie"')
    expect(unite('I-02:b0300')).toContain('padding-left:1.5em')
    // Les vers latins portent le retrait sur chaque ligne.
    expect(html).toContain('margin-left:1.5em')
    // ⛔ Aucun guillemet extérieur autour d'une citation sortie.
    expect(html).not.toMatch(/«[^<]*Déjà le temps/u)
  })
})

describe('la citation visée fait unité devant ce qui n’est pas un propos, et en vers', () => {
  it('ne se colle jamais à l’auteur qui la suit — attribution comprise', () => {
    // III-05 de la Consolation : « Le crois-tu puissant… ? » puis « Decimus Laberius : ».
    const html = renderToStaticMarkup(<ContenuNoteStructuree note={note(
      block({ blockId: 'lem', rank: 1, kind: 'lemma', text: '« Le crois-tu puissant l’homme… qui craint plus encore qu’il n’effraye ? »' }),
      block({ blockId: 'att', rank: 2, kind: 'attribution', text: '++Decimus Laberius++ :', targetBlockId: 'q' }),
      block({ blockId: 'q', rank: 3, kind: 'quotation', language: 'la', citationLayout: 'block', text: 'Necesse est multos timeat quem multi timent.' }),
      block({
        blockId: 't', rank: 4, kind: 'translation', citationLayout: 'block', translationOf: 'q',
        text: 'C’est une nécessité qu’il craigne beaucoup de gens celui que beaucoup de gens craignent.',
      }),
    )} />)
    const ordre = [...html.matchAll(/<div[^>]*data-block-id="([^"]+)"/gu)].map(m => m[1])

    expect(ordre).toEqual(['lem', 'att', 'q', 't'])
    // ⛔ Une citation en PROSE que la donnée déclare sortie se sort, et sa traduction avec.
    expect(html).toMatch(/<div[^>]*data-block-id="q"[^>]*data-disposition="sortie"[^>]*padding-left:1.5em/u)
    expect(html).toMatch(/<div[^>]*data-block-id="t"[^>]*data-disposition="sortie"[^>]*padding-left:1.5em/u)
    expect(html).toMatch(/<div[^>]*data-block-id="q"[^>]*font-style:italic/u)
    expect(html).toMatch(/<div[^>]*data-block-id="t"[^>]*font-style:normal/u)
  })

  it('sort le distique de la citation visée, ligne à ligne, en romain — I-01', () => {
    // I-01 de la Consolation : le lemme est un distique français, que la donnée déclare
    // sorti comme les 37 autres citations visées en vers, suivi d'un commentaire (charte
    // § 13.18, rectifiée le soir du 11 septembre 2026).
    const html = renderToStaticMarkup(<ContenuNoteStructuree note={note(
      block({
        blockId: 'lem', rank: 1, kind: 'lemma', form: 'verse', rendering: 'Footnote Verse', citationLayout: 'block',
        text: 'Le bonheur qui jadis inspirait mes accents,\nA fait place aux sombres alarmes…',
      }),
      block({ blockId: 'com', rank: 2, text: 'Ce début semble indiquer que Boèce avait cultivé la poésie.' }),
    )} />)

    expect(html).toMatch(/<div[^>]*data-block-id="lem"[^>]*data-disposition="sortie"[^>]*font-style:normal/u)
    expect(html).toContain('>Le bonheur qui jadis inspirait mes accents,</span>')
    expect(html).toContain('>A fait place aux sombres alarmes…</span>')
    // ⛔ Chaque ligne porte le retrait d'une citation sortie ; le commentaire reste au fer.
    expect(html.match(/margin-left:1\.5em/gu) ?? []).toHaveLength(2)
    expect(html).not.toContain('margin-left:0')
    expect(html).toMatch(/<div[^>]*data-block-id="com"[^>]*data-disposition="fil"/u)
  })

  it('garde au FER de la note un vers que la donnée déclare au fil', () => {
    const html = renderToStaticMarkup(<ContenuNoteStructuree note={note(
      block({
        blockId: 'lem', rank: 1, kind: 'lemma', form: 'verse', rendering: 'Footnote Verse', citationLayout: 'inline',
        text: 'Premier vers,\nSecond vers.',
      }),
      block({ blockId: 'com', rank: 2, text: 'Le propos.' }),
    )} />)

    expect(html).toMatch(/<div[^>]*data-block-id="lem"[^>]*data-disposition="fil"/u)
    // ⚠️ Des boîtes, avec leur retrait de suite, mais parties du fer : un vers AU FIL
    // n'a pas l'alinéa d'une citation sortie.
    expect(html).toContain('margin-left:0')
    expect(html).not.toContain('margin-left:1.5em')
  })

  it('ne pose pas sur la ligne du propos une citation visée que la donnée déclare sortie', () => {
    const html = renderToStaticMarkup(<ContenuNoteStructuree note={note(
      block({ blockId: 'lem', rank: 1, kind: 'lemma', citationLayout: 'block', text: 'La phrase de l’œuvre.' }),
      block({ blockId: 'com', rank: 2, text: 'Le propos.' }),
    )} />)

    expect(html).toMatch(/<div[^>]*data-block-id="lem"[^>]*data-disposition="sortie"[^>]*padding-left:1.5em/u)
    expect(html).not.toMatch(/<span[^>]*data-kind="lemma"/u)
  })
})
