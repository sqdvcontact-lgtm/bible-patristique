import { describe, expect, it } from 'vitest'
import {
  compterMarque,
  compterOccurrences,
  contientMarque,
  contientTous,
  contientTousOriginal,
  graphiesVariantes,
  marqueDe,
  modeDepuisParametre,
  normaliser,
  referenceBiblique,
  regexMarque,
  regexTermes,
  termesRecherche,
} from './rechercheRequete'

// La page des résultats relit ce que la base lui rend : le mot y est-il, en début de
// mot ou entier, sans égard aux accents ; et une saisie chiffrée est-elle une
// référence biblique. Ces tests figent la relecture et la référence.

describe('termes et mode', () => {
  it('découpe la saisie sur les blancs', () => {
    expect(termesRecherche('  fils   de Dieu ')).toEqual(['fils', 'de', 'Dieu'])
    expect(termesRecherche('   ')).toEqual([])
  })
  it('ne connaît que trois modes, et retombe sur le préfixe', () => {
    expect(modeDepuisParametre('exact')).toBe('exact')
    expect(modeDepuisParametre('famille')).toBe('famille')
    expect(modeDepuisParametre('autre')).toBe('prefixe')
    expect(modeDepuisParametre(null)).toBe('prefixe')
  })
  it('replie accents, casse et apostrophes', () => {
    expect(normaliser('Espérance')).toBe('esperance')
    expect(normaliser('l’Envoyé')).toBe("l'envoye")
  })
  it('ramène les graphies anciennes au français d’aujourd’hui, comme la base', () => {
    // Sacy : la base trouve « était » dans « étoit » ; la page doit le relire de même.
    expect(normaliser('la terre étoit informe')).toBe('la terre etait informe')
    expect(normaliser('ils disoient et connoissoient')).toBe('ils disaient et connaissaient')
    // « connoître » et « foible » se replient ; « paroistre » (« oi » devant « st ») n'est
    // pas dans les règles de la base, et la page ne fait pas plus qu'elle.
    expect(normaliser('connoître, foible, paroistre')).toBe('connaitre, faible, paroistre')
    // Et la longueur ne bouge pas : c'est ce qui garde le marquage à sa place.
    for (const s of ['étoit', 'connoître', 'disoient', 'foible']) expect(normaliser(s).length).toBe(s.length)
    expect(contientTous('Dieu vit que cela étoit bon', ['était'], true)).toBe(true)
    expect(compterOccurrences('il étoit, ils étoient', ['était', 'étaient'], true)).toBe(2)
  })
})

describe('référence biblique', () => {
  it('reconnaît une référence chiffrée, avec ou sans verset', () => {
    expect(referenceBiblique('Jean 3, 16')).toMatchObject({ livre: 'JHN', chapitre: 3, verset: 16, libelle: 'Jean 3, 16', href: '/?livre=JHN&chapitre=3&verset=16#verset-16' })
    expect(referenceBiblique('Jn 3,16')).toMatchObject({ livre: 'JHN', chapitre: 3, verset: 16 })
    expect(referenceBiblique('Genèse 22')).toMatchObject({ livre: 'GEN', chapitre: 22, verset: null, libelle: 'Genèse 22', href: '/?livre=GEN&chapitre=22' })
  })
  it('ne prend ni un livre seul ni des mots pour une référence', () => {
    expect(referenceBiblique('Jonas')).toBeNull()
    expect(referenceBiblique('fils de Dieu')).toBeNull()
    expect(referenceBiblique('espérance 3')).toBeNull()
  })
})

describe('relire un texte reçu', () => {
  const texte = 'Car Dieu a tant aimé le monde… « L’Espérance » ne trompe point ; gloire, glorieux.'
  it('trouve chaque terme en début de mot, sans égard aux accents', () => {
    expect(contientTous(texte, ['dieu', 'esperance'], false)).toBe(true)
    expect(contientTous(texte, ['glo'], false)).toBe(true)
    expect(contientTous(texte, ['ieu'], false)).toBe(false) // milieu de mot
    expect(contientTous(texte, ['dieu', 'absent'], false)).toBe(false)
  })
  it('exige le mot entier en mode exact', () => {
    expect(contientTous(texte, ['gloire'], true)).toBe(true)
    expect(contientTous(texte, ['glo'], true)).toBe(false)
    expect(contientTous(texte, ['glorieux'], true)).toBe(true)
  })
  it('voit la frontière de mot comme la base : après une apostrophe ou un tiret aussi', () => {
    // La liste de séparateurs d'avant ignorait l'apostrophe et le tiret : « l’espérance »
    // et « Jésus-Christ » étaient rendus par la base et rejetés par la page.
    expect(contientTous('l’espérance ne trompe point', ['esperance'], true)).toBe(true)
    expect(contientTous('en Jésus-Christ notre Seigneur', ['christ'], true)).toBe(true)
    expect(contientTous('d’amour et de foi', ['amour'], false)).toBe(true)
    expect(compterOccurrences('l’amour, l’amour (l’amour)', ['amour'], true)).toBe(3)
  })
  it('compte les occurrences, les termes longs d’abord', () => {
    expect(compterOccurrences(texte, ['glo'], false)).toBe(2)
    expect(compterOccurrences(texte, ['gloire'], true)).toBe(1)
    expect(compterOccurrences(texte, ['gloire', 'glo'], false)).toBe(2)
    expect(compterOccurrences('', ['glo'], false)).toBe(0)
  })
  it('construit une seule expression pour marquer, ou rien sans terme', () => {
    const re = regexTermes(['gloire', 'glo'], false)
    expect(re).not.toBeNull()
    expect(normaliser(texte).match(re!)?.length).toBe(2)
    expect(regexTermes(['  '], false)).toBeNull()
  })
})

describe('la marque', () => {
  it('marque les termes en préfixe ou entiers, et les racines en famille', () => {
    expect(marqueDe(['aimer'], 'prefixe')).toEqual({ mots: ['aimer'], entier: false })
    expect(marqueDe(['aimer'], 'exact')).toEqual({ mots: ['aimer'], entier: true })
    expect(marqueDe(['aimer'], 'famille', ['aim'])).toEqual({ mots: ['aim'], entier: false, jusquAuBout: true })
    // Sans racine rendue, les termes tapés servent de repli.
    expect(marqueDe(['aimer'], 'famille')).toEqual({ mots: ['aimer'], entier: false, jusquAuBout: true })
  })
  it('relit et compte par la marque', () => {
    const m = marqueDe(['aimer'], 'famille', ['aim'])
    expect(contientMarque('il aimait ceux qui l’aiment', m)).toBe(true)
    expect(compterMarque('il aimait ceux qui l’aiment', m)).toBe(2)
    expect(regexMarque(m)).not.toBeNull()
  })
  it('en famille, marque le mot fléchi entier, non la seule racine', () => {
    const m = marqueDe(['aimer'], 'famille', ['aim'])
    const re = regexMarque(m)!
    const texte = normaliser('il aimait ceux qui aiment')
    const marques = [...texte.matchAll(re)].map(x => x[2])
    expect(marques).toEqual(['aimait', 'aiment'])
    // En préfixe, seule la partie tapée se marque, comme avant.
    const p = regexMarque(marqueDe(['aim'], 'prefixe'))!
    expect([...texte.matchAll(p)].map(x => x[2])).toEqual(['aim', 'aim'])
  })
})

describe('graphies latines', () => {
  it('fait valoir u/v et i/j', () => {
    expect(graphiesVariantes('jesus').sort()).toEqual(['iesus', 'jesus', 'jesvs'])
    expect(graphiesVariantes('iustitia').sort()).toEqual(['iustitia', 'ivstitia', 'justitia'])
    expect(graphiesVariantes('verite').sort()).toEqual(['uerite', 'verite'])
  })
  it('relit un original sous l’une de ses graphies', () => {
    expect(contientTousOriginal('Iesus Christus Dominus', ['jesus'], false)).toBe(true)
    expect(contientTousOriginal('Iesus Christus Dominus', ['jesus', 'dominvs'], true)).toBe(true)
    expect(contientTousOriginal('Iesus Christus Dominus', ['petrus'], false)).toBe(false)
  })
})
