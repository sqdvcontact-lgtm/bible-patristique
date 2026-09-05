import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { CLASSES_BIBLIOGRAPHIE } from '@/app/lib/apparatBibliographie'
import type { NoticeBibliographique } from '@/app/lib/referenceBibliographique'
import ReferenceBibliographique, { typographieFragment } from './ReferenceBibliographique'

const NBSP = String.fromCharCode(0x00a0)
const FINE = String.fromCharCode(0x202f)

function vide(id: number, titre: string): NoticeBibliographique {
  return {
    id, forme: null, titre, sousTitre: null, titreHote: null, tomaison: null, pages: null,
    dateAffichee: null, annee: null, lieu: null, editeurs: [], collection: null,
    numeroCollection: null, contributeurs: [], auteursTexte: null, directeursTexte: null,
    traducteursTexte: null,
  }
}

const BAUR: NoticeBibliographique = {
  ...vide(863, "De Anicio Manlio Severino Boëthio, christianae doctrinae assertore : disputatio theologica"),
  lieu: 'Darmstadt', editeurs: [{ rang: 1, role: 'editeur', nom: 'E. Bekker' }], annee: 1841,
  contributeurs: [{
    role: 'auteur_scientifique', nature: 'chercheur', ordre: 1,
    nomAffiche: 'Gustav Adolf Ludwig Baur', prenom: 'Gustav Adolf Ludwig', nomFamille: 'Baur', nomAutorite: 'Gustav Adolf Ludwig Baur',
  }],
}

const HAND: NoticeBibliographique = {
  ...vide(899, 'Boethius (Anicius Manlius Torquatus Severinus)'),
  forme: 'entree_dictionnaire', titreHote: 'Allgemeine Encyclopädie der Wissenschaften und Künste',
  tomaison: '1re section, t. XI', pages: '282-292', lieu: 'Leipzig',
  editeurs: [{ rang: 1, role: 'editeur', nom: 'Johann Friedrich Gleditsch' }], annee: 1823,
  contributeurs: [{
    role: 'auteur_scientifique', nature: 'chercheur', ordre: 1,
    nomAffiche: 'Ferdinand Gotthelf Hand', prenom: 'Ferdinand Gotthelf', nomFamille: 'Hand', nomAutorite: 'Ferdinand Gotthelf Hand',
  }],
}

describe('ReferenceBibliographique', () => {
  it('balise chaque fragment par son rôle, dans l’enveloppe commune', () => {
    const html = renderToStaticMarkup(<ReferenceBibliographique notice={BAUR} />)
    expect(html.startsWith(`<span class="${CLASSES_BIBLIOGRAPHIE.reference}">`)).toBe(true)
    expect(html).toContain('<span class="cs-apparat-bibliographie__auteur" data-champ="prenom">Gustav Adolf Ludwig</span>')
    expect(html).toContain('<span class="cs-apparat-bibliographie__nom-auteur" data-champ="nom_famille">Baur</span>')
    expect(html).toContain('<em class="cs-apparat-bibliographie__titre-ouvrage" data-champ="titre">')
    expect(html).toContain('<span class="cs-apparat-bibliographie__donnees" data-champ="lieu">Darmstadt</span>')
    expect(html).toContain('<span class="cs-apparat-bibliographie__donnees" data-champ="annee">1841</span>')
    // ⛔ Les petites capitales sont SÉMANTIQUES : la chaîne n'est pas passée en capitales.
    expect(html).not.toContain('BAUR')
    // ⚠️ Aucun identifiant sur l'enveloppe : c'est l'appelant qui sait où il est.
    expect(html).not.toContain('data-ouvrage-id')
  })

  it('compose un article : titre en romain entre guillemets, hôte en italique', () => {
    const html = renderToStaticMarkup(<ReferenceBibliographique notice={HAND} />)
    expect(html).toContain('<span class="cs-apparat-bibliographie__titre-article" data-champ="titre">Boethius (Anicius Manlius Torquatus Severinus)</span>')
    expect(html).toContain('<em class="cs-apparat-bibliographie__titre-hote" data-champ="titre_hote">Allgemeine Encyclopädie der Wissenschaften und Künste</em>')
    expect(html).toContain(`, dans <em`)
    expect(html).toContain(`<span class="cs-apparat-bibliographie__donnees" data-champ="pages">282${String.fromCharCode(0x2013)}292</span>`)
    expect(html).toContain(`p.${NBSP}<span`)
    expect(html).toContain(`«${FINE}<span`)
  })

  it('pose la typographie de lecture au RENDU, sans toucher la donnée', () => {
    // L'espace ordinaire devant le deux-points du titre devient insécable à l'écran…
    const html = renderToStaticMarkup(<ReferenceBibliographique notice={BAUR} />)
    expect(html).toContain(`assertore${NBSP}: disputatio`)
    // … et la notice, elle, garde son espace ordinaire.
    expect(BAUR.titre).toContain('assertore : disputatio')
    expect(typographieFragment("L'Idée centrale")).toBe('L’Idée centrale')
  })

  it('tait l’auteur quand on le lui demande, et ne rend rien d’une notice sans titre', () => {
    expect(renderToStaticMarkup(<ReferenceBibliographique notice={BAUR} avecAuteur={false} />)).not.toContain('Baur')
    expect(renderToStaticMarkup(<ReferenceBibliographique notice={vide(1, '  ')} />)).toBe('')
  })
})
