import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { DUREE_ECLAT_MS } from './EclatCopie'

// L'ÉCLAT D'UNE COPIE (2026-09-20). L'accusé est une LUMIÈRE, non un signe ; et depuis
// le soir du même jour, il se RELANCE à chaque clic. Ces épreuves gardent les deux
// décisions : la forme vit dans globals.css, le câblage dans les six boutons.

const lire = (chemin: string) => readFileSync(new URL(chemin, import.meta.url), 'utf8')

const BOUTONS = [
  './ActionsVerset.tsx',
  './BoutonCopierTexte.tsx',
  './PanneauPatristique.tsx',
  './TexteBible.tsx',
  '../oeuvre/[id]/BoutonsSegment.tsx',
  '../oeuvre/[id]/BoutonsVerset.tsx',
]

describe('l’éclat repart à chaque clic', () => {
  const module = lire('./EclatCopie.tsx')

  it('⛔ l’éclat est un RANG de clic, et le rang sert de clé', () => {
    // C'est la clé, et elle seule, qui remonte l'élément : une animation de la feuille
    // ne redémarre qu'au MONTAGE, et un booléen reposé sur lui-même ne rend rien.
    expect(module).toContain('setEclat(n => n + 1)')
    expect(module).toContain('key={eclat}')
    expect(module).toContain('eclat > 0 ? <span key={eclat} className="cs-eclat"')
  })

  it('⛔ un clic relance la lumière au lieu de l’attendre', () => {
    // Le minuteur en cours est retiré AVANT d'en armer un neuf, sinon le premier
    // éteindrait l'éclat du second.
    const corps = module.slice(module.indexOf('const briller'))
    const arme = corps.slice(0, corps.indexOf('}, [])'))
    expect(arme.indexOf('clearTimeout')).toBeLessThan(arme.indexOf('setEclat'))
  })

  it('le composant ne prend plus de booléen', () => {
    expect(module).toContain('export function EclatCopie({ eclat }: { eclat: number })')
    expect(module).not.toContain('{ copie }: { copie: boolean }')
  })

  for (const chemin of BOUTONS) {
    it(`${chemin} passe le rang, non l’état`, () => {
      const source = lire(chemin)
      expect(source).toContain('<EclatCopie eclat={eclat} />')
      expect(source).not.toContain('<EclatCopie copie=')
      expect(source).toContain('const { copie, eclat, briller } = useEclatCopie()')
    })
  }
})

describe('l’encre survit à la lumière', () => {
  // ⛔ UN VRAI INVARIANT, MESURÉ SUR LA FEUILLE : le pictogramme reste allumé au moins
  //    aussi longtemps que l'éclat dure. L'inverse ferait briller un halo sur un
  //    pictogramme déjà éteint — l'accusé se contredirait au milieu de lui-même.
  const feuille = lire('../globals.css')
  const dureeEclat = () => {
    const m = feuille.match(/animation:\s*cs-eclat\s+([\d.]+)s/)
    if (!m) throw new Error('la feuille ne déclare plus la durée de l’éclat')
    return Number(m[1]) * 1000
  }

  it('le pictogramme tient au moins ce que la lumière dure', () => {
    expect(DUREE_ECLAT_MS).toBeGreaterThanOrEqual(dureeEclat())
  })

  it('⛔ mais il ne s’attarde pas : une demi-seconde au plus après elle', () => {
    expect(DUREE_ECLAT_MS - dureeEclat()).toBeLessThanOrEqual(500)
  })

  it('la lumière est VIVE : un tiers de seconde au plus', () => {
    expect(dureeEclat()).toBeLessThanOrEqual(350)
  })
})

describe('l’éclat reste un accusé, non un ornement', () => {
  const feuille = lire('../globals.css')

  it('⛔ sous le mouvement réduit il garde son fondu et ne perd que sa dilatation', () => {
    expect(feuille).toContain('.cs-eclat { animation-name: cs-eclat-calme; }')
    const calme = feuille.slice(feuille.indexOf('@keyframes cs-eclat-calme'))
    expect(calme.slice(0, calme.indexOf('}\n'))).not.toContain('transform')
  })

  it('le halo s’ouvre DERRIÈRE le pictogramme', () => {
    expect(feuille).toContain('.cs-eclat-hote > svg { position: relative; z-index: 1; }')
    const regle = feuille.slice(feuille.indexOf('.cs-eclat {'))
    expect(regle.slice(0, regle.indexOf('}'))).toContain('z-index: 0')
  })

  it('⚠️ une lumière ne se lit pas à la synthèse vocale : la région est toujours rendue', () => {
    const module = lire('./EclatCopie.tsx')
    expect(module).toContain('<span className="cs-hors-ecran" role="status">')
  })
})
