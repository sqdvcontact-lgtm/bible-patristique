'use client'

import { Fragment } from 'react'

/**
 * La barre d'onglets d'une PAGE — une seule définition pour tout le site.
 *
 * Le dessin vit dans `globals.css` (`.cs-onglets`, `.cs-onglet`), avec la
 * raison de chacun de ses traits ; ce composant n'en pose que le balisage.
 * ⛔ Ne pas recomposer une barre d'onglets en styles en ligne : c'est ainsi que
 * six barres du site en étaient venues à six combinaisons différentes de
 * police, de corps, de gris et de structure, sans qu'aucune décision les sépare.
 *
 * ⚠️ Le libellé est DOUBLÉ dans `data-libelle`, et ce n'est pas une redondance :
 * c'est lui que le double invisible de `.cs-onglet-libelle::after` compose en
 * graisse 600 pour réserver la largeur d'avance, si bien que retenir un onglet
 * ne déplace jamais ses voisins.
 */

export type OngletPage<K extends string> = {
  cle: K
  libelle: string
}

/**
 * Ce que la barre commande, et le balisage d'accessibilité qui va avec.
 *
 * ⛔ `panneaux` n'est pas le défaut universel : un `tablist` promet des
 * `tabpanel` derrière lui. Une barre qui ne fait que RESTREINDRE une même liste
 * — le partage par testament du catalogue des péricopes — est un groupe de
 * filtres, et se déclare comme tel.
 */
export type NatureOnglets = 'panneaux' | 'filtres'

export default function OngletsPage<K extends string>({
  onglets,
  actif,
  choisir,
  nature = 'panneaux',
  intitule,
  style,
}: {
  onglets: readonly OngletPage<K>[]
  actif: K
  choisir: (cle: K) => void
  nature?: NatureOnglets
  /** Ce que la barre nomme, pour qui ne la voit pas. */
  intitule: string
  /** Le PLACEMENT de la barre dans sa page — son blanc alentour, et rien d'autre.
   *  Le dessin appartient au modèle ; l'écart à ce qui suit appartient à la page. */
  style?: React.CSSProperties
}) {
  const panneaux = nature === 'panneaux'
  return (
    <div
      className="cs-onglets"
      style={style}
      role={panneaux ? 'tablist' : 'group'}
      aria-label={intitule}
    >
      {onglets.map((onglet, rang) => {
        const retenu = onglet.cle === actif
        return (
          <Fragment key={onglet.cle}>
            {rang > 0 && <span className="cs-onglets-sep" aria-hidden="true" />}
            <button
              type="button"
              className="cs-onglet"
              role={panneaux ? 'tab' : undefined}
              aria-selected={panneaux ? retenu : undefined}
              aria-pressed={panneaux ? undefined : retenu}
              onClick={() => choisir(onglet.cle)}
            >
              <span className="cs-onglet-libelle" data-libelle={onglet.libelle}>
                {onglet.libelle}
              </span>
            </button>
          </Fragment>
        )
      })}
    </div>
  )
}
