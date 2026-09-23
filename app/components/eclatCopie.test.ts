import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { DUREE_ECLAT_MS, MENTION_PAR_DEFAUT } from './EclatCopie'
import { DUREE_MENTION_MS, ETINCELLES } from './MentionCopiee'

// L'ACCUSÉ D'UNE COPIE. Le 20 septembre 2026, un halo derrière le pictogramme ; depuis le
// 23, la mention au curseur, avec ses étincelles sur son pourtour (demande de l'auteur :
// « utilise ce même effet et ce même texte pour le symbole “copier” »). Ces épreuves
// gardent les décisions : il repart à chaque clic, il nomme ce qu'il a copié, la forme vit
// dans globals.css, le câblage dans les boutons.

const lire = (chemin: string) => readFileSync(new URL(chemin, import.meta.url), 'utf8')

const BOUTONS = [
  './ActionsVerset.tsx',
  './BoutonCopierTexte.tsx',
  './PanneauPatristique.tsx',
  './TexteBible.tsx',
  '../oeuvre/[id]/BoutonsSegment.tsx',
  '../oeuvre/[id]/BoutonsVerset.tsx',
]

describe('l’accusé repart à chaque clic', () => {
  const source = lire('./EclatCopie.tsx')

  it('⛔ l’accusé est un RANG de clic, et la mention le prend pour clé', () => {
    // C'est la clé, et elle seule, qui remonte l'élément : une animation de la feuille
    // ne redémarre qu'au MONTAGE, et un booléen reposé sur lui-même ne rend rien.
    expect(source).toContain('rang.current += 1')
    expect(source).toContain('setEclat(rang.current)')
    expect(lire('./MentionCopiee.tsx')).toContain('key={mention.rang}')
  })

  it('⛔ un clic relance l’accusé au lieu de l’attendre', () => {
    // Les minuteurs en cours sont retirés AVANT d'en armer de neufs, sinon le premier
    // éteindrait l'accusé du second.
    const corps = source.slice(source.indexOf('const briller'))
    const arme = corps.slice(0, corps.indexOf('}, [])'))
    expect(arme.indexOf('clearTimeout')).toBeLessThan(arme.indexOf('setEclat'))
  })

  it('⛔ plus de halo : l’accusé est la mention au curseur', () => {
    expect(source).not.toContain('className="cs-eclat"')
    expect(source).toContain('<MentionCopiee mention={montree}>')
  })

  it('⛔ une pose d’un rang passé ne se montre pas', () => {
    expect(source).toContain('eclat > 0 && pose?.rang === eclat ? pose : null')
  })

  for (const chemin of BOUTONS) {
    it(`${chemin} passe le rang, non l’état`, () => {
      const source = lire(chemin)
      expect(source).toMatch(/<EclatCopie eclat=\{eclat\}( mention=[^/]+)? \/>/)
      expect(source).toContain('const { copie, eclat, briller } = useEclatCopie()')
    })
  }
})

describe('la mention nomme ce qu’elle a copié', () => {
  it('par défaut, une citation', () => {
    expect(MENTION_PAR_DEFAUT).toBe('Citation copiée')
  })

  it('la référence d’une fiche se dit référence bibliographique', () => {
    for (const chemin of ['../oeuvre/[id]/FicheEdition.tsx', './ModaleTraduction.tsx']) {
      expect(lire(chemin)).toContain('mention="Référence bibliographique copiée"')
    }
  })

  it('le texte nu d’un verset se dit verset', () => {
    expect(lire('./ActionsVerset.tsx')).toContain('mention="Verset copié"')
  })
})

describe('la forme vit dans la feuille', () => {
  const feuille = lire('../globals.css')
  const dureeMention = () => {
    const m = feuille.match(/animation:\s*cs-mention-copiee\s+([\d.]+)s/)
    if (!m) throw new Error('la feuille ne déclare plus la durée de la mention')
    return Number(m[1]) * 1000
  }

  it('la mention tient au moins ce que son animation dure, et pas une demi-seconde de plus', () => {
    expect(DUREE_MENTION_MS).toBeGreaterThanOrEqual(dureeMention())
    expect(DUREE_MENTION_MS - dureeMention()).toBeLessThanOrEqual(500)
  })

  it('le pictogramme s’éteint avant la mention', () => {
    expect(DUREE_ECLAT_MS).toBeLessThan(DUREE_MENTION_MS)
  })

  it('⛔ chaque étincelle a sa place ÉCRITE, sur le pourtour du message', () => {
    for (let n = 1; n <= ETINCELLES; n++) {
      const m = feuille.match(new RegExp(`\\.cs-mention-etincelle\\[data-etincelle='${n}'\\]\\s*\\{([^}]*)\\}`))
      expect(m, `étincelle ${n}`).not.toBeNull()
      const corps = m![1]
      expect(corps).toContain('--cs-etincelle-l')
      expect(corps).toContain('--cs-etincelle-t')
      // Sur le BORD : un côté à 0 ou 100 %, jamais le centre.
      const l = corps.match(/--cs-etincelle-l:\s*([\d.]+)%?/)![1]
      const t = corps.match(/--cs-etincelle-t:\s*([\d.]+)%?/)![1]
      expect(['0', '100'].includes(l) || ['0', '100'].includes(t)).toBe(true)
    }
    expect(feuille).not.toContain(`data-etincelle='${ETINCELLES + 1}'`)
  })

  it('⛔ sous le mouvement réduit, l’accusé garde son fondu', () => {
    expect(feuille).toContain('.cs-mention-copiee { animation-name: cs-mention-copiee-calme; }')
    expect(feuille).toContain('.cs-mention-etincelle { animation-name: cs-mention-etincelle-calme; }')
  })

  it('⚠️ la mention se ramène dans la fenêtre par une propriété de la feuille', () => {
    expect(feuille).toContain('calc(3.5rem + var(--cs-mention-decalage, 0px))')
  })

  it('⚠️ une lumière ne se lit pas à la synthèse vocale : la région est toujours rendue', () => {
    expect(lire('./EclatCopie.tsx')).toContain('<span className="cs-hors-ecran" role="status">')
  })
})
