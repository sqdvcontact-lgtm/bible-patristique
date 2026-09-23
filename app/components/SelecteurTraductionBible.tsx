'use client'

// Le menu déroulant CENTRAL de la page Bible : le nom du témoin qu'on lit, entre
// deux filets, et la liste de TOUTES les bibles lisibles.
//
// ⛔ Il ne liste QUE des bibles, à UNE exception. Les façons de lire — texte nu, graphie —
// vivent dans le menu « Mode de lecture » du volet de gauche : mêlées ici, elles se
// donnaient pour des traductions de plus, et le lecteur qui les choisissait croyait
// changer de bible. ⚠️ L’exception est la LECTURE EN REGARD (demande de l’auteur,
// 2026-09-21) : elle se range dans le sous-menu de sa famille, après les langues, où elle
// se lit comme une manière de lire CETTE bible et non comme une bible de plus. C'est aussi pourquoi ce menu est le MÊME dans toutes
// les vues de la page (une colonne comme en regard) : on doit toujours pouvoir
// changer de bible, quelle que soit la manière dont on lit celle qu'on a sous les
// yeux.
//
// ⛔ LES BIBLES D'UNE MÊME FAMILLE N'Y FONT QU'UNE ENTRÉE (décision de l'auteur,
// 2026-09-13) : « Bible XIIIe », dont un sous-menu décline les langues, comme dans la
// Polyglotte. Choisir la famille ouvre le TEXTE D'ORIGINE, que le sous-menu met en tête.
// La composition est un module pur et testé, `menuTraductionsBible.ts` ; ce composant ne
// fait que la rendre.
//
// ⛔ LA LISTE QUI S'OUVRE EST `ListeMenuBibles` (15 septembre 2026) : le volet de droite
// d'une œuvre ouvre la même, sous son propre bouton. Ce composant ne garde que le sien.

import IconeChevron from '@/app/components/IconeChevron'
import ListeMenuBibles from '@/app/components/ListeMenuBibles'
import { STYLE_CHEVRON_MENU, TAILLE_CHEVRON_MENU } from '@/app/lib/stylesMenuBibles'
import { useCallback, useId, useRef, useState } from 'react'

import { rendreEnrichi } from '@/app/lib/enrichissements'
import { nomCommun, type BibleDuMenu } from '@/app/lib/menuTraductionsBible'
import { SERIF } from '@/app/lib/polices'

/**
 * Le chevron du menu.
 *
 * ⛔ Il prend l'encre du NOM, pâlie d'un rang (`--cs-texte-doux` contre
 * `--cs-texte-gris`), et non plus un vert clair : c'est une marque d'ouverture, pas
 * un accent, et le vert y appelait l'œil avant le nom qu'il accompagne.
 *
 * ⛔ C'ÉTAIT UN GLYPHE DE TEXTE, `▼`, absent de Source Serif comme de Source Sans :
 * le menu central de la page Bible le rendait donc dans une police système. C'est
 * `IconeChevron`, le chevron unique du site, depuis le 9 septembre 2026.
 *
 * ⚠️ Sa taille reste RELATIVE au nom, et il le faut : la police racine du site est
 * fluide, et un dessin posé en pixels rapetisserait à mesure que le nom grandit.
 * ⚠️ Elle passe de 0,5625 à 0,85 em, et ce n'est pas un agrandissement : le glyphe
 * remplissait presque tout son cadratin quand un chevron dessiné n'en occupe qu'une
 * fraction. À 0,85 em d'un nom de 11,5 px il vaut 9,8 px, la mesure des autres
 * chevrons du site posés contre un texte de ce corps. La raison qui imposait l'unité
 * relative — le poids du glyphe — a disparu ; celle qui l'impose encore est la
 * police racine.
 *
 * ⚠️ `lineHeight: 1` et aucun décalage : le bouton aligne ses enfants sur leur
 * milieu. Le `top: 1.5px` d'avant faisait descendre le chevron sous la ligne du nom.
 */
// ⛔ LES FORMES DU MENU VIVENT DANS `app/lib/stylesMenuBibles.ts` (14 septembre 2026) : la
// Polyglotte y a pris le même modèle, et deux copies d'une forme divergent au premier
// réglage. Les noms locaux restent, pour ne pas réécrire le rendu.
const TAILLE_CHEVRON = TAILLE_CHEVRON_MENU
const STYLE_CHEVRON = STYLE_CHEVRON_MENU

type Props = {
  traductions: readonly BibleDuMenu[]
  traductionIndex: number
  setTraductionIndex: (index: number) => void
  /** Ouvrir une famille en regard (voir `ListeMenuBibles`). */
  choisirEnRegard?: (index: number) => void
  /** La page lit la famille en regard : le bouton nomme la famille, non l’un de ses textes. */
  enRegard?: boolean
}

export default function SelecteurTraductionBible({ traductions, traductionIndex, setTraductionIndex, choisirEnRegard, enRegard = false }: Props) {
  const [ouvert, setOuvert] = useState(false)
  const nomLu = traductions[traductionIndex]?.label ?? traductions[traductionIndex]?.code ?? 'Bible'
  const label = enRegard ? `${nomCommun(nomLu)} – en regard` : nomLu
  const cadre = useRef<HTMLDivElement>(null)
  const bouton = useRef<HTMLButtonElement>(null)
  const idListe = useId()

  const fermer = useCallback((rendreLeFoyer: boolean) => {
    setOuvert(false)
    if (rendreLeFoyer) bouton.current?.focus()
  }, [])

  const choisir = useCallback((index: number) => {
    setTraductionIndex(index)
    fermer(true)
  }, [setTraductionIndex, fermer])

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', maxWidth: '22.5rem', margin: '0 auto' }}>
      {/* Double filet à gauche : deux traits fins superposés, bien visibles, comme autrefois.
          Le trait est coloré dès le tiers extérieur (et non seulement au ras du menu) pour
          rester perceptible même sur une faible largeur. */}
      <div style={{ flex: 1, minWidth: '46px', height: '1px', background: 'linear-gradient(to right, transparent 0%, var(--cs-or-doux) 38%, var(--cs-texte-doux) 100%)' }} />
      <div ref={cadre} style={{ position: 'relative' }}>
        <button
          ref={bouton}
          type="button"
          onClick={() => (ouvert ? fermer(false) : setOuvert(true))}
          aria-haspopup="menu"
          aria-expanded={ouvert}
          aria-controls={ouvert ? idListe : undefined}
          title="Choisir la bible"
          style={{
            display: 'flex', alignItems: 'center', gap: '5px',
            padding: '0', border: 'none', background: 'transparent',
            fontSize: '0.71875rem', color: 'var(--cs-texte-gris)', cursor: 'pointer',
            fontFamily: SERIF,
            fontStyle: 'italic', letterSpacing: '0.01em',
            transition: 'color var(--cs-duree-courte)',
          }}>
          {/* ⛔ Le chevron est DOUBLÉ, et le double de gauche est invisible : sans lui,
              le bouton se centrait chevron compris, et le NOM de la bible se trouvait
              donc porté d'une dizaine de pixels à gauche de l'axe du titre qui le
              surmonte. C'est le même procédé que le double de `.cs-onglet-libelle`,
              qui réserve d'avance la largeur d'un libellé en graisse 600. */}
          <span aria-hidden="true" style={{ ...STYLE_CHEVRON, visibility: 'hidden' }}>
            <IconeChevron dir="down" taille={TAILLE_CHEVRON} strokeWidth={1.6} />
          </span>
          {/* ⚠️ LE NOM SE COMPOSE (demande de l'auteur, 2026-09-04) : le siècle y prend ses
              petites capitales et son exposant, et un titre entre astérisques son italique.
              C'est le module partagé avec les notices d'auteur et avec le menu de la
              Polyglotte : un nom de bible ne se compose pas d'une façon là et d'une autre
              ici. ⚠️ Le bouton nomme la bible qu'on LIT, nom entier : « Bible XIIIe – Ancien
              français » dit quelle face de la famille est sous les yeux. */}
          <span>{rendreEnrichi(label)}</span>
          <span aria-hidden="true" style={STYLE_CHEVRON}>
            <IconeChevron dir={ouvert ? 'up' : 'down'} taille={TAILLE_CHEVRON} strokeWidth={1.6} />
          </span>
        </button>
        {ouvert && (
          <ListeMenuBibles id={idListe} libelle="Bibles disponibles"
            traductions={traductions} traductionIndex={traductionIndex}
            choisir={choisir} fermer={fermer} cadre={cadre}
            choisirEnRegard={choisirEnRegard ? (index) => { choisirEnRegard(index); fermer(true) } : undefined}
            enRegard={enRegard}
            style={{ position: 'absolute', top: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)', zIndex: 50, minWidth: '230px' }} />
        )}
      </div>
      {/* Double filet à droite, symétrique. */}
      <div style={{ flex: 1, minWidth: '46px', height: '1px', background: 'linear-gradient(to left, transparent 0%, var(--cs-or-doux) 38%, var(--cs-texte-doux) 100%)' }} />
    </div>
  )
}
