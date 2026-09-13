import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  ETATS_BIBLE_INVALIDES, ETATS_VALIDATION, FILTRE_BIBLE_PUBLIABLE, bibleEtatPubliable,
  estPubliable, etatValidation, libellePublication, libelleValidation,
  raisonNonPublication, rangValidation,
} from './etatsPublication'

describe('etatValidation', () => {
  it('lit le vocabulaire de la charte tel quel', () => {
    for (const etat of ETATS_VALIDATION) expect(etatValidation(etat)).toBe(etat)
  })

  it('traduit l’ancien vocabulaire des textes comme le déclencheur de la base', () => {
    expect(etatValidation('published')).toBe('termine')
    expect(etatValidation('review')).toBe('termine')
    expect(etatValidation('draft')).toBe('en_cours')
    expect(etatValidation('retired')).toBe('invalide')
  })

  it('lit les codes de la couche Bible, des péricopes et de la frise', () => {
    expect(etatValidation('validated')).toBe('valide')
    expect(etatValidation('verified')).toBe('valide')
    expect(etatValidation('rejected')).toBe('invalide')
    expect(etatValidation('a_revoir')).toBe('termine')
    expect(etatValidation('validé')).toBe('valide')
    expect(etatValidation('à classer')).toBe('en_cours')
    expect(etatValidation('exclu')).toBe('invalide')
  })

  it('ignore la casse et les blancs, mais pas les accents de la frise', () => {
    expect(etatValidation('  Published ')).toBe('termine')
    expect(etatValidation('a classer')).toBeNull()
  })

  it('rend null pour une valeur absente ou inconnue', () => {
    expect(etatValidation(null)).toBeNull()
    expect(etatValidation('')).toBeNull()
    expect(etatValidation('ouvert')).toBeNull()
  })
})

describe('estPubliable', () => {
  it('publie validé, terminé et travail en cours', () => {
    expect(estPubliable('valide')).toBe(true)
    expect(estPubliable('termine')).toBe(true)
    expect(estPubliable('en_cours')).toBe(true)
  })

  it('ne publie ni l’invalide ni l’inconnu', () => {
    expect(estPubliable('invalide')).toBe(false)
    expect(estPubliable('retired')).toBe(false)
    expect(estPubliable('ouvert')).toBe(false)
  })
})

describe('rangValidation', () => {
  it('range du plus sûr au moins sûr, l’inconnu en dernier', () => {
    const rangs = ['valide', 'termine', 'en_cours', 'invalide', 'ouvert'].map(rangValidation)
    expect(rangs).toEqual([...rangs].sort((a, b) => b - a))
    expect(rangValidation('ouvert')).toBeLessThan(rangValidation('invalide'))
  })

  it('garde l’ordre d’avant pour les chaînes héritées', () => {
    expect(rangValidation('review')).toBeGreaterThan(rangValidation('draft'))
    expect(rangValidation('draft')).toBeGreaterThan(rangValidation('retired'))
  })
})

describe('libelles', () => {
  it('nomme chaque état d’un seul mot d’écran', () => {
    expect(libelleValidation('review')).toBe('Terminé')
    expect(libelleValidation('en_cours')).toBe('Travail en cours')
    expect(libelleValidation('ouvert')).toBe('ouvert')
  })

  it('accorde la publication', () => {
    expect(libellePublication(true)).toBe('Publié')
    expect(libellePublication(false, 'feminin')).toBe('Non publiée')
  })
})

describe('raisonNonPublication', () => {
  const texte = { statut: 'termine', motif_non_publication: null, nb_signes: 1200 }

  it('ne retient rien quand tout est en ordre', () => {
    expect(raisonNonPublication(texte)).toBeNull()
  })

  it('nomme d’abord l’invalide, avec son motif', () => {
    expect(raisonNonPublication({ ...texte, statut: 'invalide', motif_non_publication: 'Droits de l’AELF' }))
      .toBe('Invalide : Droits de l’AELF')
  })

  it('fait passer le motif de l’œuvre avant celui du texte', () => {
    expect(raisonNonPublication({ ...texte, motif_non_publication: 'essai' }, 'Fragment retiré'))
      .toBe('Œuvre retenue : Fragment retiré')
  })

  it('dit qu’un texte vide paraîtra de lui-même', () => {
    expect(raisonNonPublication({ ...texte, statut: 'en_cours', nb_signes: 0 })).toMatch(/Aucun segment/)
  })
})

/**
 * LA CHAÎNE TEXTUELLE DE LA BIBLE (charte § 52).
 *
 * Le 12 septembre 2026, vingt-huit livres de la Fillion — les Psaumes, Job, Isaïe, les
 * Proverbes… — étaient donnés au lecteur pour « absents de cette traduction » : la liste
 * des livres exigeait `validated` sur la division du livre, quand la charte ne ferme que
 * sur `rejected` et `retired`. Ces épreuves tiennent la règle des deux côtés, le
 * vocabulaire et les deux surfaces qui interrogent la base.
 */
describe('la chaîne Bible : ce qui interdit de paraître', () => {
  it('ne ferme que sur rejected et retired', () => {
    for (const etat of ['draft', 'review', 'validated', 'verified', 'candidate', '', null, undefined]) {
      expect(bibleEtatPubliable(etat), String(etat)).toBe(true)
    }
    for (const etat of ETATS_BIBLE_INVALIDES) expect(bibleEtatPubliable(etat), etat).toBe(false)
  })

  it('rattrape les valeurs nulles dans le filtre PostgREST', () => {
    // ⚠️ `not.in` écarte les lignes NULLES : sans le `is.null`, une division sans état
    // disparaîtrait, alors que la fonction SQL la laisse paraître.
    expect(FILTRE_BIBLE_PUBLIABLE)
      .toBe('validation_status.is.null,validation_status.not.in.(rejected,retired)')
  })

  it('⛔ aucune surface de lecture n’exige « validated »', () => {
    for (const chemin of ['app/lib/bibleEditorial.ts', 'app/lib/bibleMultimodeServer.ts']) {
      const code = readFileSync(chemin, 'utf8')
      expect(code, chemin).toContain('FILTRE_BIBLE_PUBLIABLE')
      expect(code, chemin).not.toMatch(/validation_status['"],\s*['"]validated/u)
    }
  })

  it('le compteur administratif applique la même règle aux textes, mais garde l’exception des illustrations', () => {
    const code = readFileSync('app/admin/controle/MatiereMission.tsx', 'utf8')
    expect(code).toContain("compter('bible_editorial_body_blocks', 'bible')")
    expect(code).toContain("compter('bible_verse_notes', 'bible')")
    expect(code).toContain("compter('bible_edition_assets', 'illustration')")
    expect(code).toContain('requetePublique.or(FILTRE_BIBLE_PUBLIABLE)')
    expect(code).toContain("requetePublique.eq('validation_status', 'validated')")
  })

  it('borne tous les compteurs et le contrôle des styles à la famille Fillion', () => {
    const code = readFileSync('app/admin/controle/MatiereMission.tsx', 'utf8')
    expect(code.match(/\.eq\('family_id', famille\.id\)/gu)).toHaveLength(2)
    expect(code).not.toContain('publicSeulement')
  })
})
