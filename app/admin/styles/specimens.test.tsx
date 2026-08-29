import { readFileSync } from 'node:fs'

import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { EPREUVES } from './specimens'
import type { Unite } from './specimens'
import { STYLE_NUMERO_VERSET } from '@/app/lib/compositionBible'
import { styleParagrapheLecture, styleTitreNiveau } from '@/app/lib/compositionOeuvre'
import { NATURE_VALIDES } from '@/app/lib/naturesSegments'

const toutes = EPREUVES.flatMap((e) => e.unites.map((u) => ({ epreuve: e.cle, ...u })))

/** L'unité dont le nom contient ce fragment — plus robuste qu'un indice de tableau. */
function unite(cle: string, fragment: string): Unite {
  const trouvee = EPREUVES.find((e) => e.cle === cle)?.unites.find((u) => u.style.includes(fragment))
  if (!trouvee) throw new Error(`Aucune unité « ${fragment} » dans l'épreuve « ${cle} »`)
  return trouvee
}

const rendu = (u: Unite) => renderToStaticMarkup(<>{u.contenu}</>)
const texteSeul = (html: string) => html.replace(/<[^>]*>/g, '').trim()

/**
 * ⛔ Les seules unités dont le VIDE est la bonne réponse, et il faut les NOMMER :
 * sans cette liste, une épreuve qui cesserait de rendre passerait pour un parti
 * pris. C'est exactement l'inverse de ce que la planche sert à montrer.
 */
const EPREUVES_VIDES = [
  // La barre de navigation nomme déjà le chapitre (charte § 35.1).
  'bible_apparat/titre_chapitre_livre — T5, axe MATÉRIEL',
  // La page porte déjà le nom du livre dans ses métadonnées.
  'bible_apparat/titre_livre — T1',
  // `footnote_only` : ce n'est pas un bloc de corps, et le type ne l'admet même pas.
  'bible_apparat/note_verset — footnote_only',
  // Nature éteinte, conservée pour d'anciens exports ; zéro segment la porte.
  'patristique/separateur — ÉTEINTE',
]

describe('les épreuves de la planche', () => {
  it('couvrent les quatre vocabulaires, et aucune n’est vide', () => {
    expect(EPREUVES.map((e) => e.cle)).toEqual(['bible', 'oeuvres', 'apparat-oeuvres', 'apparat-bibles'])
    for (const epreuve of EPREUVES) expect(epreuve.unites.length, epreuve.cle).toBeGreaterThan(0)
  })

  it('ne nomment jamais deux unités de la même façon dans une épreuve', () => {
    // Le nom du style sert de clé de rendu : deux homonymes s'y marcheraient dessus.
    for (const epreuve of EPREUVES) {
      const noms = epreuve.unites.map((u) => u.style)
      expect(new Set(noms).size, epreuve.cle).toBe(noms.length)
    }
  })

  it.each(toutes.map((u) => [u.epreuve, u.style, u] as const))('%s · %s se rend', (_e, style, u) => {
    if (EPREUVES_VIDES.includes(style)) {
      // Un vide VOULU. Le bloc du chapitre est le seul à traverser tout de même le
      // composant : on vérifie qu'il en ressort sans son texte.
      if (style.includes('titre_chapitre_livre')) {
        expect(rendu(u)).toContain('cs-bible-axe')
        expect(rendu(u)).not.toContain('Ceci ne doit pas paraître')
      } else {
        expect(texteSeul(rendu(u)), style).toBe('')
      }
      return
    }
    expect(texteSeul(rendu(u)).length, style).toBeGreaterThan(0)
  })

  it('⛔ un vide n’est ADMIS que s’il est nommé', () => {
    // Sans cette garde, une épreuve qui cesserait de rendre — un composant renommé,
    // une donnée que le rendu ne reconnaît plus — passerait pour un parti pris.
    const vides = toutes.filter((u) => texteSeul(rendu(u)) === '').map((u) => u.style)
    expect([...vides].sort()).toEqual([...EPREUVES_VIDES].sort())
  })
})

describe('⛔ la planche porte TOUS les styles des deux vocabulaires', () => {
  // C'est la promesse de la planche : « les épreuves doivent porter tous les styles,
  // y compris ceux qu'aucune œuvre n'emploie encore ». Un vocabulaire qui s'étend
  // sans que la planche suive fait échouer ces deux tests, ce qui est le seul moment
  // où l'on peut encore y penser.

  /** Le nom EXACT, non suivi d'une lettre : `introduction` ne vaut pas pour
   *  `introduction_titree`, qui est un autre style. */
  const porte = (labels: string[], nom: string) =>
    labels.some((l) => new RegExp(`${nom.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\w_])`, 'u').test(l))

  it('les treize natures de segment paraissent dans les épreuves patristiques', () => {
    const labels = [...EPREUVES[1].unites, ...EPREUVES[2].unites].map((u) => u.style)
    const absentes = NATURE_VALIDES.filter((n) => !porte(labels, n))
    expect(absentes).toEqual([])
  })

  it('les douze styles du paratexte biblique paraissent dans son épreuve', () => {
    // ⛔ Le registre fait foi sur les valeurs : on ne recopie pas la liste ici.
    const registre = JSON.parse(readFileSync('work/fillion/semantic_display_hierarchy.json', 'utf8'))
    const canoniques: string[] = Object.keys(registre.styles)
    expect(canoniques.length).toBe(12)
    const labels = EPREUVES[3].unites.map((u) => u.style)
    const absents = canoniques.filter((s) => !porte(labels, s))
    expect(absents).toEqual([])
  })
})

describe('⛔ la planche ne rejoue aucune composition', () => {
  // C'est la garde de tout l'exercice : une épreuve qui recopierait les valeurs
  // au lieu de les tirer du module dériverait au premier réglage, et ferait
  // ensuite autorité contre la page qu'elle décrit.

  it('compose la prose d’une œuvre avec le module que la lecture emploie', () => {
    const html = rendu(unite('oeuvres', 'patristique/texte'))
    const attendu = styleParagrapheLecture()
    expect(html).toContain(`font-size:${attendu.fontSize}`)
    expect(html).toContain(`line-height:${attendu.lineHeight}`)
  })

  it('compose la rangée de verset avec le module que la page Bible emploie', () => {
    const html = rendu(unite('bible', 'bible/verset — la rangée'))
    expect(html).toContain(`font-size:${STYLE_NUMERO_VERSET.fontSize}`)
    expect(html).toContain('verset-row')
  })

  it('compose les titres d’œuvre avec le module que les DEUX surfaces emploient', () => {
    // Sortis d'`OeuvreClient` le 29 août 2026, où ils étaient recopiés deux fois et
    // avaient déjà divergé au rang 2.
    for (const [cle, fragment, rang] of [
      ['oeuvres', 'patristique/titre — rang 1', 1],
      ['oeuvres', 'patristique/titre — rang 2', 2],
      ['oeuvres', 'patristique/titre — rang 3', 3],
      ['oeuvres', 'patristique/titre — rang 4', 4],
    ] as const) {
      const attendu = styleTitreNiveau(rang)
      expect(rendu(unite(cle, fragment)), fragment).toContain(`font-size:${attendu.fontSize}`)
    }
    // L'apparat compose le MÊME rang de la MÊME façon : c'est tout l'objet du retrait.
    expect(rendu(unite('apparat-oeuvres', 'titre — rangs 1 et 2')))
      .toContain(`font-size:${styleTitreNiveau(2).fontSize}`)
  })

  it('fait passer le paratexte biblique par le composant, et par son AXE', () => {
    // Sans l'axe, les règles de voisinage de `globals.css` ne s'appliqueraient pas,
    // et le blanc qui cerne un bloc de versets disparaîtrait en silence.
    for (const u of EPREUVES[3].unites) {
      if (u.contenu == null) continue
      const html = rendu(u)
      // Les deux bibliographies se rendent par leur propre composant, hors du bloc.
      if (u.style.includes('bibliographie')) {
        expect(html, u.style).toContain('cs-apparat-bibliographie')
        continue
      }
      expect(html, u.style).toContain('cs-bible-axe')
    }
  })

  it('rend les marqueurs du manuscrit par leur tokeniseur, sans crochet résiduel', () => {
    const html = rendu(unite('bible', 'marqueurs éditoriaux'))
    expect(html).toContain('Lecture incertaine')
    expect(texteSeul(html)).not.toContain('[lecture incertaine :')
    expect(texteSeul(html)).not.toContain('[ajout marginal :')
  })
})

describe('la page de la planche', () => {
  it('se rend d’un bout à l’autre', async () => {
    const { default: PlancheStyles } = await import('./PlancheStyles')
    const html = renderToStaticMarkup(<PlancheStyles />)
    expect(html).toContain('Planche des styles')
    for (const epreuve of EPREUVES) expect(html).toContain(epreuve.libelle)
    // ⛔ Aucune enveloppe entre deux unités : les contenus sont versés à plat,
    // sans quoi les règles de voisinage de globals.css ne trouveraient plus
    // leurs frères — et c'est ce que la planche sert à juger.
    expect(html).not.toContain('pl-unite')
    // Les notices restent atteignables sans souris, sous l'épreuve.
    expect(html).toContain('Tous les styles de cette épreuve')
    expect(html).toContain('bible/verset')
  })
})
