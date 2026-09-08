'use client'

/**
 * L'ENCART D'UNE NOTE — un seul, pour les trois surfaces qui en ouvraient un.
 *
 * La lecture d'une œuvre, la page Bible et les traductions parallèles composaient
 * chacune le sien, et les trois avaient divergé (voir `compositionNote.ts`, qui
 * porte le relevé et la composition). Celui-ci ne connaît ni la donnée, ni la façon
 * dont on l'ouvre : il reçoit un numéro, un intitulé s'il y en a un, une place, et
 * le propos de la note en enfants.
 *
 * ⛔ Le CONTENU reste à chaque surface, et c'est voulu : la page Bible compose ses
 * blocs par `ContenuNoteBiblique`, la lecture d'une œuvre par
 * `ContenuNoteStructuree`, et ce sont deux modèles de donnée. Ce qui se réunit ici
 * est le CADRE, où vivaient les neuf divergences.
 *
 * ⚠️ Il ne porte AUCUN crochet : c'est un composant pur, que `renderToStaticMarkup`
 * rend hors du navigateur. C'est ce qui permet à une planche de le juger.
 */
import type { CSSProperties, ReactNode } from 'react'
import {
  STYLE_FERMER_ENCART, STYLE_INTITULE_ENCART,
  STYLE_NUMERO_ENCART, styleCadreEncart, styleCorpsEncart,
} from '@/app/lib/compositionNote'

export type PlacementEncart = {
  left: number
  top: number
  hauteurMax: number
  /** La largeur retenue quand l'encart se range dans une marge trop étroite pour sa
   *  mesure pleine. Absente, il prend sa mesure. */
  largeur?: number
}

export function EncartNote({
  numero, intitule, placement, onFermer, marque, style,
  onMouseEnter, onMouseLeave, children,
}: {
  /** Le numéro que le LECTEUR voit, celui qu'il vient de cliquer. ⛔ Jamais le
   *  numéro interne : les traductions parallèles affichaient celui-là, si bien que
   *  le même appel ne portait pas le même chiffre d'une surface à l'autre. */
  numero: ReactNode
  /** Le TYPE de la note, ou `null` quand elle n'en déclare aucun — le cas de 58 %
   *  du corpus. ⛔ On n'écrit pas « Note 277 » à qui vient de cliquer le 277. */
  intitule?: string | null
  placement: PlacementEncart
  /** Donné quand l'encart ne se ferme pas de lui-même. ⚠️ Sur un survol, la croix
   *  promettrait un geste inutile et changerait la forme de l'objet sous le
   *  curseur : on ne la passe pas. */
  onFermer?: (() => void) | null
  /** L'attribut par lequel la surface reconnaît son propre encart quand elle guette
   *  le clic extérieur. Chacune a le sien, et il n'y a pas lieu de les unifier ici. */
  marque?: string
  style?: CSSProperties
  /** Un encart ouvert au SURVOL se retient quand la main y entre — on va y lire, et
   *  parfois le faire défiler — et s'en va quand elle le quitte. La surface tient ce
   *  geste, l'encart ne fait que le recevoir. */
  onMouseEnter?: () => void
  onMouseLeave?: () => void
  children: ReactNode
}) {
  const attribut = marque ? { [marque]: '' } : {}
  return (
    <div
      data-encart-note="" {...attribut}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onMouseDown={e => e.stopPropagation()}
      style={{ ...styleCadreEncart(placement), ...style }}
    >
      {onFermer && (
        <button
          type="button" onClick={onFermer} aria-label="Fermer la note"
          className="cs-cible-fine" style={STYLE_FERMER_ENCART}
        >×</button>
      )}
      {/* ⛔ LA BARRE DE DÉFILEMENT EST CELLE DU SITE (`.cs-defilement-discret`, six
          pixels), et ce n'est pas un ornement : la croix se pose au coin du CADRE,
          la barre au bord du CORPS, et une barre système de quinze pixels passe
          exactement dessous — mesuré sur la planche du 8 septembre 2026, la croix
          d'une note longue était posée sur elle. Elle rend en outre six pixels de
          piste au texte. */}
      <div className="cs-defilement-discret" style={styleCorpsEncart(Boolean(onFermer))}>
        {/* ⛔ Le numéro FLOTTE : le propos l'habille, et la mesure entière lui revient
            dès la deuxième ligne. En colonne de grille, il réservait sa gouttière sur
            toute la hauteur de la note. */}
        <span style={STYLE_NUMERO_ENCART} aria-hidden="true">{numero}</span>
        {intitule ? <span style={STYLE_INTITULE_ENCART}>{intitule}</span> : null}
        <div style={{ whiteSpace: 'pre-line' }}>{children}</div>
      </div>
    </div>
  )
}
