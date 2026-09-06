import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const lire = (relativePath: string) => readFileSync(new URL(relativePath, import.meta.url), 'utf8')

// Le pied de la fiche d'auteur (6 septembre 2026) : trois renseignements que la base
// portait déjà et que la fenêtre taisait. Ces épreuves gardent les DÉCISIONS, non le
// dessin — une teinte se change, une garde de publication non.
describe('pied de la fiche d’auteur', () => {
  const modale = lire('../components/ModaleAuteur.tsx')

  it('lit les trois sources, et l’empreinte par la fonction', () => {
    // ⛔ L'agrégat des liens ne peut pas se faire en PostgREST, et les politiques de
    // `segments` et `liens_bibliques` sont des EXISTS corrélés : la fonction existe
    // pour cela (migration 20260906123608).
    expect(modale).toContain("rpc('empreinte_biblique_auteur'")
    expect(modale).toContain("from('v_catalogue_notices_dates')")
    expect(modale).toContain("from('ouvrages_bibliographiques')")
  })

  it('applique au catalogue la MÊME garde que la Bibliothèque', () => {
    // Ce que le site n'a pas encore, et que l'auteur n'a pas refusé.
    expect(modale).toContain("eq('presence_sur_le_site', false)")
    expect(modale).toContain("eq('refuse_admin', false)")
  })

  it('applique à la bibliographie la garde d’admissibilité de la page de péricope', () => {
    expect(modale).toContain("neq('statut_editorial', 'rejete')")
    expect(modale).toContain("in('statut_scientifique', ['retenu', 'secondaire'])")
    // L'auteur ancien est la SOURCE de l'ouvrage, jamais son contributeur savant :
    // confondre les deux ferait paraître un Père comme éditeur scientifique moderne.
    expect(modale).toContain("eq('ouvrage_contributeurs_scientifiques.role_contributeur', 'auteur_source')")
  })

  it('tient l’ouvrage pour table de tête, sans quoi le tri porterait sur l’embarqué', () => {
    // PostgREST ne range QUE la ressource embarquée quand on la lui désigne : prendre
    // les contributeurs pour tête rendait trois ouvrages au hasard.
    const tete = modale.indexOf("from('ouvrages_bibliographiques')")
    const tri = modale.indexOf("order('annee'", tete)
    expect(tete).toBeGreaterThan(-1)
    expect(tri).toBeGreaterThan(tete)
    expect(modale).not.toContain("referencedTable: 'ouvrages_bibliographiques'")
  })

  it('se charge en SECONDE VAGUE et se tait quand il n’a rien à dire', () => {
    // La fiche ne doit pas attendre son pied : l'effet est séparé de celui qui charge
    // la notice, les œuvres et la frise.
    expect(modale).toContain('const [pied, setPied] = useState<PiedFiche>(PIED_VIDE)')
    expect(modale).toContain('if (!empreinte && !aEditions && !aOuvrages) return null')
  })
})
