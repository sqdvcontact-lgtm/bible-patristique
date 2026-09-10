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
  STYLE_FACE_NUMERO, STYLE_FERMER_ENCART, STYLE_INTITULE_ENCART, STYLE_NUMERO_SEUL,
  STYLE_NUMERO_TETE, STYLE_RESERVE_CROIX, STYLE_TETE_ENCART,
  styleCadreEncart, styleCorpsEncart,
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
  numero, intitule, placement, signes, onFermer, epinglee = false, marque, style,
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
  /** La longueur de la note, en signes. ⛔ Elle décide de la JUSTIFICATION : sous le
   *  seuil du gris (charte § 3.11), un propos de deux lignes ne se justifie pas. */
  signes: number
  /** Donné quand l'encart ne se ferme pas de lui-même. ⚠️ Sur un survol, la croix
   *  promettrait un geste inutile et changerait la forme de l'objet sous le
   *  curseur : on ne la passe pas. */
  onFermer?: (() => void) | null
  /** L’encart est-il ÉPINGLÉ, c’est-à-dire ouvert d’un clic et non d’un survol ?
   *
   *  ⛔ Il ne commande AUCUNE géométrie : la boîte est la même dans les deux cas, et
   *  c’était précisément le défaut. Il ne pose qu’un filet d’or franc et une pulsation
   *  d’une demi-seconde, pour que le geste se VOIE (demande de l’auteur, 2026-09-09 :
   *  « ajouter un effet pour montrer qu’elle se fixe »). */
  epinglee?: boolean
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
      data-encart-note="" data-epingle={epinglee ? '' : undefined} {...attribut}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onMouseDown={e => e.stopPropagation()}
      style={{
        ...styleCadreEncart(placement),
        // ⛔ EN LIGNE, et il le faut : le cadre pose son filet en style en ligne, et
        // une règle de feuille perdrait contre lui sans `!important`. La PULSATION,
        // elle, vit dans la feuille : une animation bat le style en ligne par l’ordre
        // des origines de la cascade, sans qu’on ait à crier.
        ...(epinglee ? { borderColor: 'var(--cs-or)' } : null),
        ...style,
      }}
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
      <div className="cs-defilement-discret" style={styleCorpsEncart(signes)}>
        {/* ⛔ LA PLACE DE LA CROIX SE RÉSERVE SUR SA SEULE LIGNE. C'était un rembourrage
            à droite du corps, donc payé par toutes les lignes d'une note de vingt ; et
            la boîte, dissymétrique, ne paraissait pas centrée sur son texte. */}
        <span style={STYLE_RESERVE_CROIX} aria-hidden="true" />
        {intitule ? (
          // ⛔ LE NUMÉRO REJOINT LA TÊTE quand il y a une tête, et il ne flotte plus :
          // un flottant n'a rien à habiller quand une ligne entière lui est prise. Les
          // trois — numéro, type, propos — partagent alors UN SEUL fer à gauche, et les
          // deux premiers une ligne de base (relevé de l'auteur, 2026-09-10).
          <div style={STYLE_TETE_ENCART}>
            <span style={STYLE_NUMERO_TETE} aria-hidden="true">{numero}</span>
            <span style={STYLE_INTITULE_ENCART}>{intitule}</span>
          </div>
        ) : (
          // ⛔ SEUL, il PEND : le propos l'habille, et la mesure entière lui revient dès
          // la deuxième ligne. C'est le cas de 58 % des notes, et la médiane du corpus
          // fait dix-sept signes — une ligne, à côté de son numéro.
          // ⚠️ DEUX boîtes, et il en faut deux : le flottant porte le STRUT du propos —
          // c'est ce qui pose le chiffre sur la ligne de base du texte — et le chiffre y
          // vient en ligne, avec sa propre face.
          <span style={STYLE_NUMERO_SEUL} aria-hidden="true">
            <span style={STYLE_FACE_NUMERO}>{numero}</span>
          </span>
        )}
        {/* ⛔ `cs-encart-propos` n'est pas un habillage : c'est la marque par laquelle
            la feuille retire au DERNIER bloc le blanc qui le séparait du suivant. Sans
            elle, ce blanc s'ajoute au rembourrage et la note se tient six pixels trop
            haut dans sa boîte — mesuré le 2026-09-10, douze au-dessus contre dix-huit
            au-dessous. ⚠️ Elle entre AUSSI dans l'estimation de hauteur : voir
            `hauteurSouhaiteeNote`, qui ne compte plus de queue. */}
        <div className="cs-encart-propos" style={{ whiteSpace: 'pre-line' }}>{children}</div>
      </div>
    </div>
  )
}
