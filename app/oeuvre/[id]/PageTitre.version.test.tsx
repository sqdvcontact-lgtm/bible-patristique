import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import PageTitre from './PageTitre'
import type { VersionTextuelle } from './oeuvreTypes'

vi.mock('@/app/lib/editeurs', () => ({ resoudreEditeur: () => null }))

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
