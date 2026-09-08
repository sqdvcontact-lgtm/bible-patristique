import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import PageTitre from './PageTitre'
import type { VersionTextuelle } from './oeuvreTypes'

vi.mock('@/app/lib/editeurs', () => ({ resoudreEditeur: () => null, indexEditeursNavigateur: () => null }))

const ceriziers: VersionTextuelle = {
  idTexte: 'texte-prive',
  titre: 'Traduction de René de Ceriziers, cinquième édition, 1646',
  langue: 'français',
  traducteur: 'René de Ceriziers',
  anneeEdition: 1646,
  editionLabel: 'Rouen, Jean Viret, Jacques Besongne et Clément Malassis, cinquième édition revue par le traducteur, 1646',
  sourceUrl: 'https://example.test/source',
  catalogueNoticeIdLigne: 'notice',
  metadata: {},
  isDefault: false,
  isPublic: false,
  statut: 'review',
  labelCourt: 'Ceriziers 1646',
  traducteurLabel: 'Traduction de René de Ceriziers',
  editionDescription: 'Cinquième édition revue par le traducteur',
  publicationLabel: 'Rouen, Jean Viret, Jacques Besongne et Clément Malassis, 1646',
  villeEdition: 'Rouen',
  editeurEdition: 'Jean Viret, Jacques Besongne et Clément Malassis',
  dateEdition: '1646',
}

describe('page de titre du texte actif', () => {
  it('rend uniquement les métadonnées Ceriziers lorsque cette version est active', () => {
    const html = renderToStaticMarkup(
      <PageTitre
        auteur="Boèce"
        titre="Consolation de la philosophie"
        estAdmin
        onModifier={() => {}}
        versionActive={ceriziers}
        oeuvre={{
          titre: 'Consolation de la philosophie',
          trad_auteur: 'Louis Judicis de Mirandol',
          editeur: 'Librairie de L. Hachette et Cie',
          ville: 'Paris',
          date_publication: '1861',
          commentaire_traduction: 'Édition Mirandol',
        }}
      />,
    )
    expect(html).toContain('Traduction de René de Ceriziers')
    expect(html).toContain('Cinquième édition revue par le traducteur')
    expect(html).toContain('Rouen, Jean Viret, Jacques Besongne et Clément Malassis, 1646')
    expect(html).not.toContain('Mirandol')
    expect(html).not.toContain('Paris')
    expect(html).not.toContain('1861')
  })
})

describe('titre original répété', () => {
  const rendre = (oeuvre: Record<string, unknown>, estAdmin = false) => renderToStaticMarkup(
    <PageTitre
      auteur="Augustin d’Hippone"
      titre="Les Confessions"
      estAdmin={estAdmin}
      onModifier={() => {}}
      oeuvre={oeuvre as never}
    />,
  )

  it('ne répète pas le titre original quand il redit le titre affiché', () => {
    const html = rendre({ titre: 'Les Confessions', titre_affichage: 'Confessiones', titre_original: 'Confessiones' })
    expect(html.match(/Confessiones/g)).toHaveLength(1)
  })

  it('garde le titre original quand il dit autre chose', () => {
    const html = rendre({ titre: 'Les Confessions', titre_original: 'Confessiones' })
    expect(html).toContain('Les Confessions')
    expect(html).toContain('Confessiones')
  })

  it('le laisse sous les yeux de l’administrateur, qui doit pouvoir le corriger', () => {
    const html = rendre({ titre: 'Les Confessions', titre_affichage: 'Confessiones', titre_original: 'Confessiones' }, true)
    expect(html.match(/Confessiones/g)).toHaveLength(2)
    expect(html).toContain('Modifier le titre original')
  })
})

// ── La page de titre est celle de l'ÉDITION AFFICHÉE ─────────────────────────
// Cas RÉEL : Dhuoda, « Manuel pour mon fils » — un latin (Bondurand 1887) et une
// traduction française (Corpus Scriptura 2026) sous la même œuvre. Relevé de l'auteur,
// 8 septembre 2026 : « la page de titre doit correspondre à l'édition qui est affichée ;
// si on a deux éditions, il faut faire en conséquence ».
const latinBondurand: VersionTextuelle = {
  idTexte: 'TXT_A0176O0001_1887_BONDURAND',
  titre: 'Texte latin — Bondurand 1887',
  langue: 'Latin',
  traducteur: null,
  anneeEdition: 1887,
  editionLabel: 'Paris, Alphonse Picard, 1887',
  sourceUrl: null,
  catalogueNoticeIdLigne: null,
  metadata: {},
  isDefault: false,
  isPublic: true,
  statut: 'published',
  labelCourt: 'Bondurand 1887',
  traducteurLabel: null,
  editionDescription: null,
  publicationLabel: 'Paris, Alphonse Picard, 1887',
  villeEdition: 'Paris',
  editeurEdition: 'Alphonse Picard',
  dateEdition: '1887',
}

const oeuvreDhuoda = {
  titre: 'Manuel pour mon fils',
  trad_auteur: 'Traduction IA — Corpus Scriptura',
  editeur: 'Alphonse Picard',
  ville: 'Paris',
  date_publication: '1887',
}

describe('page de titre d’un texte en langue originale', () => {
  it('⛔ n’emprunte pas le traducteur de l’œuvre à un texte qui n’en a pas', () => {
    const html = renderToStaticMarkup(
      <PageTitre
        auteur="Dhuoda"
        titre="Manuel pour mon fils"
        estAdmin={false}
        onModifier={() => {}}
        versionActive={latinBondurand}
        oeuvre={oeuvreDhuoda}
      />,
    )
    expect(html).not.toContain('intelligence artificielle')
    expect(html).not.toContain('Traduction IA')
    expect(html).toContain('Paris, Alphonse Picard, 1887')
  })
})

describe('page de titre d’une lecture en regard', () => {
  const francaisIA: VersionTextuelle = {
    ...latinBondurand,
    idTexte: 'TXT_A0176O0001_FR_IA_2026',
    titre: 'Traduction française IA — publication progressive',
    langue: 'Français',
    traducteur: 'Traduction IA — Corpus Scriptura',
    anneeEdition: 2026,
    editionLabel: 'Corpus Scriptura, traduction IA d’après Bondurand 1887, 2026',
    isDefault: true,
    labelCourt: 'Traduction IA 2026',
    publicationLabel: 'Corpus Scriptura, 2026',
    villeEdition: null,
    editeurEdition: 'Corpus Scriptura',
    dateEdition: '2026',
  }

  const rendre = (versionEnRegard?: VersionTextuelle) => renderToStaticMarkup(
    <PageTitre
      auteur="Dhuoda"
      titre="Manuel pour mon fils"
      estAdmin={false}
      onModifier={() => {}}
      versionActive={francaisIA}
      versionEnRegard={versionEnRegard}
      oeuvre={oeuvreDhuoda}
    />,
  )

  it('nomme les DEUX éditions quand deux paraissent', () => {
    const html = rendre(latinBondurand)
    expect(html).toContain('Texte latin d’après l’édition de Paris, Alphonse Picard, 1887')
    expect(html).toContain('Traduction par intelligence artificielle sous la direction de Corpus Scriptura')
  })

  it('⛔ ne nomme qu’une édition quand une seule paraît', () => {
    const html = rendre()
    expect(html).not.toContain('Texte latin')
    expect(html).toContain('Traduction par intelligence artificielle sous la direction de Corpus Scriptura')
  })

  it('⛔ ne mêle pas les deux adresses : la ville du latin ne passe pas au français', () => {
    // « D’après l’édition de Paris, Corpus Scriptura, 2026 » ne nommait aucune édition
    // réelle : Paris venait de Picard 1887, Corpus Scriptura et 2026 de la traduction.
    const html = rendre()
    expect(html).toContain('D’après l’édition de Corpus Scriptura, 2026')
    expect(html).not.toContain('Paris')
  })
})
