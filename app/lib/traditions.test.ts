import { describe, expect, it } from 'vitest'
import { FAMILLES_TRADITION, familleTradition, famillesDesTraditions } from './traditions'

// Le vocabulaire des traditions tel qu'il est en base, relevé le 2026-08-23 (142
// étiquettes distinctes). Il tient lieu de banc d'essai : toute étiquette écrite
// jusqu'ici doit trouver sa famille, sans quoi elle disparaîtrait du filtre.
const VOCABULAIRE_EN_BASE = [
  'Afrique chrétienne', 'Anthropologie chrétienne',
  'Antignosticisme', 'Antignostique',
  'Antimarcionite', 'antiochienne',
  'Apocalypse chrétienne', 'apocryphes bibliques',
  'Apologétique', 'Apologétique grecque',
  'Apologétique latine', 'Aristotélisme chrétien',
  'Arts libéraux et transmission médiévale', 'Ascèse chrétienne',
  'ascétique', 'Ascétisme',
  'Ascétisme chrétien', 'Ascétisme communautaire',
  'Augustinisme', 'Catéchèse baptismale',
  'Christianisme ancien', 'Christianisme athénien',
  'Christianisme judéen', 'christianisme latin',
  'Christianisme primitif', 'Christianisme romain',
  'Christianisme romain ancien', 'Christianisme syriaque',
  'Christologie', 'Christologie ancienne',
  'Chronographie biblique', 'Chronographie chrétienne',
  'Controverse trinitaire', 'Culture cicéronienne',
  'Dialogue avec la culture gréco-romaine', 'Dialogue judéo-chrétien',
  'Dialogue philosophique', 'Discipline ecclésiale',
  'Ecclésiologie', 'Ecclésiologie ancienne',
  'École d’Alexandrie', 'École d’Antioche',
  'École de Césarée', 'Église d’Antioche',
  'Église d’Asie Mineure', 'Église de Jérusalem',
  'Église de Rome', 'Église de Smyrne',
  'Encratisme', 'Épiscopat gaulois',
  'époque carolingienne', 'Éthique chrétienne',
  'Exégèse allégorique', 'Exégèse biblique',
  'Exégèse de la Genèse', 'Exégèse des paroles du Seigneur',
  'Exégèse médiévale', 'Exégèse spirituelle',
  'Exégèse typologique', 'Exhortation morale',
  'géorgienne', 'grecque',
  'Hagiographie monastique', 'hagiographique',
  'Harmonie évangélique', 'Hérésiologie',
  'Hésychasme', 'Historiographie chrétienne ancienne',
  'Historiographie ecclésiastique', 'Hymnodie latine',
  'Identité chrétienne', 'latine',
  'Lérins', 'Liturgie ancienne',
  'Logique aristotélicienne', 'Martyre chrétien',
  'médiévale', 'Mémoire ecclésiale',
  'Millénarisme ancien', 'Monachisme ancien',
  'Monachisme bénédictin', 'Monachisme égyptien',
  'Monachisme sinaïtique', 'Monachisme syrien',
  'monastique', 'Monothéisme',
  'Mystagogie', 'Néoplatonisme chrétien',
  'Néoplatonisme latin', 'Nouvelle Prophétie',
  'Ordre dominicain', 'Ordre ecclésiastique',
  'Origénisme', 'Origines des Évangiles',
  'Pastorale', 'Patristique grecque',
  'Patristique grecque à Rome', 'Patristique latine',
  'Pères apostoliques', 'Pères cappadociens',
  'Philologie chrétienne', 'Philosophie chrétienne',
  'Philosophie de l’Antiquité tardive', 'Polémique antijudaïque',
  'Polémique antimarcionite', 'Polémique doctrinale',
  'Polémique religieuse', 'Prédication',
  'Prédication chrétienne ancienne', 'Prédication et poésie chrétiennes',
  'Prière contemplative', 'Quartodécimanisme',
  'Réception d’Origène', 'Renaissance carolingienne',
  'Résurrection des corps', 'Scolastique',
  'Successions épiscopales', 'syriaque',
  'Théologie ascétique', 'Théologie baptismale',
  'Théologie de la grâce', 'Théologie de la récapitulation',
  'Théologie du Logos', 'Théologie du martyre',
  'Théologie eucharistique', 'Théologie liturgique',
  'Théologie mystique', 'Théologie nicéenne',
  'Théologie pascale', 'Théologie pénitentielle',
  'Théologie spirituelle', 'Théologie trinitaire',
  'Théologie trinitaire ancienne', 'Théologie trinitaire et christologique',
  'Thomisme', 'Tradition apostolique',
  'Tradition chrysostomienne', 'Tradition des Deux Voies',
  'Tradition johannique', 'Tradition orale',
  'Traduction biblique', 'Traduction patristique',
]

describe('les familles de traditions', () => {
  it('range toutes les étiquettes écrites jusqu’ici', () => {
    const orphelines = VOCABULAIRE_EN_BASE.filter(t => familleTradition(t) === null)

    expect(orphelines).toEqual([])
  })

  it('nomme sept familles, et pas une de plus', () => {
    expect(FAMILLES_TRADITION.map(f => f.cle)).toEqual([
      'ecoles', 'epoques', 'spiritualite', 'exegese', 'doctrine', 'philosophie', 'polemique',
    ])
  })

  it('range chaque étiquette selon ce qu’elle dit, non selon ce qu’elle contient', () => {
    // Le lieu d'où l'on parle.
    expect(familleTradition('Patristique latine')).toBe('ecoles')
    expect(familleTradition('École d’Alexandrie')).toBe('ecoles')
    expect(familleTradition('Christianisme romain ancien')).toBe('ecoles')
    // Le moment, et les courants de réception.
    expect(familleTradition('Christianisme primitif')).toBe('epoques')
    expect(familleTradition('Renaissance carolingienne')).toBe('epoques')
    expect(familleTradition('Réception d’Origène')).toBe('epoques')
    // Ce qu'on écrit, et ce qu'on croit.
    expect(familleTradition('Exégèse biblique')).toBe('exegese')
    expect(familleTradition('Théologie trinitaire')).toBe('doctrine')
    expect(familleTradition('Monachisme égyptien')).toBe('spiritualite')
  })

  it('n’est pas dupe des mots que deux familles partagent', () => {
    // « patristique » désigne un milieu ; « traduction patristique », un travail.
    expect(familleTradition('Traduction patristique')).toBe('exegese')
    // « spirituelle » qualifie ici une lecture, là une vie.
    expect(familleTradition('Exégèse spirituelle')).toBe('exegese')
    expect(familleTradition('Théologie spirituelle')).toBe('spiritualite')
    // Une aire de langue posée seule n'est ni une apologétique ni un platonisme.
    expect(familleTradition('grecque')).toBe('ecoles')
    expect(familleTradition('Apologétique grecque')).toBe('polemique')
    expect(familleTradition('latine')).toBe('ecoles')
    expect(familleTradition('Néoplatonisme latin')).toBe('philosophie')
    expect(familleTradition('médiévale')).toBe('epoques')
    expect(familleTradition('Arts libéraux et transmission médiévale')).toBe('philosophie')
  })

  it('laisse hors du filtre une étiquette qu’elle ne reconnaît pas', () => {
    expect(familleTradition('Numismatique')).toBeNull()
    expect(familleTradition('')).toBeNull()
    expect(familleTradition(null)).toBeNull()
  })

  it('rend les familles d’un auteur sans doublon et dans l’ordre d’affichage', () => {
    expect(famillesDesTraditions([
      'Exégèse biblique', 'Patristique latine', 'Augustinisme', 'Théologie de la grâce', 'Néoplatonisme chrétien',
    ])).toEqual(['ecoles', 'epoques', 'exegese', 'doctrine', 'philosophie'])

    // Cinq étiquettes d'une même famille ne font qu'une pastille.
    expect(famillesDesTraditions(['Ascétisme', 'Monachisme ancien', 'Hésychasme'])).toEqual(['spiritualite'])
    expect(famillesDesTraditions(null)).toEqual([])
  })
})
