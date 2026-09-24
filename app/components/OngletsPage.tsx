'use client'

import { Fragment, type KeyboardEvent, type ReactNode } from 'react'

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
  /** Ce qui se lit SOUS le libellé : le compte du volet des Pères. Il se range
   *  dans l'onglet, et c'est la page qui le compose ; le modèle ne fait que lui
   *  donner sa ligne (`.cs-onglet--sous`, globals.css). */
  sous?: ReactNode
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
  className,
  style,
  idPanneau,
  idOnglet,
}: {
  onglets: readonly OngletPage<K>[]
  actif: K
  choisir: (cle: K) => void
  nature?: NatureOnglets
  /** Ce que la barre nomme, pour qui ne la voit pas. */
  intitule: string
  /** La MESURE de la barre, quand la page en pose une : elle prend celle de ce
   *  qu'elle commande, non celle de son conteneur. Voir `.cs-onglets`.
   *  ⚠️ Elle porte aussi la VARIANTE de mesure, quand il y en a une : le volet de
   *  lecture passe `cs-onglets--volet`, le modèle étant dessiné pour une page de
   *  46 rem et le volet valant 200 px au repos. ⛔ La variante ne se déclare que
   *  dans `globals.css`, à côté du modèle : c'est encore le modèle, à une autre
   *  mesure, et il ne doit jamais y en avoir un second. */
  className?: string
  /** Le PLACEMENT de la barre dans sa page — son blanc alentour, et rien d'autre.
   *  Le dessin appartient au modèle ; l'écart à ce qui suit appartient à la page. */
  style?: React.CSSProperties
  /** Le `tabpanel` que la barre commande : chaque onglet le nomme par
   *  `aria-controls`. */
  idPanneau?: string
  /** L'identifiant de chaque onglet, que le panneau reprend dans
   *  `aria-labelledby`. */
  idOnglet?: (cle: K) => string
}) {
  const panneaux = nature === 'panneaux'
  // ⚠️ Un seul onglet dans l'ordre de tabulation, les flèches pour passer au voisin
  // (ARIA, « tabs ») : le volet des Pères l'avait seul, il vit ici pour toutes les
  // barres. Un groupe de FILTRES garde ses boutons ordinaires.
  const rangRetenu = Math.max(0, onglets.findIndex(o => o.cle === actif))
  const circuler = (e: KeyboardEvent<HTMLDivElement>) => {
    const n = onglets.length
    if (n === 0) return
    const rang = e.key === 'ArrowRight' ? (rangRetenu + 1) % n
      : e.key === 'ArrowLeft' ? (rangRetenu - 1 + n) % n
      : e.key === 'Home' ? 0
      : e.key === 'End' ? n - 1
      : null
    if (rang === null) return
    e.preventDefault()
    choisir(onglets[rang].cle)
    e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')[rang]?.focus()
  }
  return (
    <div
      className={className ? `cs-onglets ${className}` : 'cs-onglets'}
      style={style}
      role={panneaux ? 'tablist' : 'group'}
      aria-label={intitule}
      onKeyDown={panneaux ? circuler : undefined}
    >
      {onglets.map((onglet, rang) => {
        const retenu = onglet.cle === actif
        return (
          <Fragment key={onglet.cle}>
            {rang > 0 && <span className="cs-onglets-sep" aria-hidden="true" />}
            <button
              type="button"
              id={idOnglet?.(onglet.cle)}
              className={onglet.sous == null ? 'cs-onglet' : 'cs-onglet cs-onglet--sous'}
              role={panneaux ? 'tab' : undefined}
              aria-selected={panneaux ? retenu : undefined}
              aria-controls={panneaux ? idPanneau : undefined}
              aria-pressed={panneaux ? undefined : retenu}
              tabIndex={panneaux ? (rang === rangRetenu ? 0 : -1) : undefined}
              onClick={() => choisir(onglet.cle)}
            >
              <span className="cs-onglet-libelle" data-libelle={onglet.libelle}>
                {onglet.libelle}
              </span>
              {onglet.sous}
            </button>
          </Fragment>
        )
      })}
    </div>
  )
}
