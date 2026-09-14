'use client'

// Le menu déroulant CENTRAL de la page Bible : le nom du témoin qu'on lit, entre
// deux filets, et la liste de TOUTES les bibles lisibles.
//
// ⛔ Il ne liste QUE des bibles. Les façons de lire — lecture en regard, texte nu,
// graphie — vivent dans le menu « Mode de lecture » du volet de gauche : mêlées ici, elles
// se donnaient pour des traductions de plus, et le lecteur qui les choisissait
// croyait changer de bible. C'est aussi pourquoi ce menu est le MÊME dans toutes
// les vues de la page (une colonne comme en regard) : on doit toujours pouvoir
// changer de bible, quelle que soit la manière dont on lit celle qu'on a sous les
// yeux.
//
// ⛔ LES BIBLES D'UNE MÊME FAMILLE N'Y FONT QU'UNE ENTRÉE (décision de l'auteur,
// 2026-09-13) : « Bible XIIIe », dont un sous-menu décline les langues, comme dans la
// Polyglotte. Choisir la famille ouvre le TEXTE D'ORIGINE, que le sous-menu met en tête.
// La composition est un module pur et testé, `menuTraductionsBible.ts` ; ce composant ne
// fait que la rendre.

import IconeChevron from '@/app/components/IconeChevron'
import { FOND_SURVOL_MENU, rangDeCirculation, STYLE_CADRE_MENU, STYLE_CHEVRON_MENU, styleLigneMenu, TAILLE_CHEVRON_MENU, DELAI_REPLI_MS, LARGEUR_SOUS_MENU_REM } from '@/app/lib/stylesMenuBibles'
import { useEffect, useId, useRef, useState } from 'react'

import { rendreEnrichi } from '@/app/lib/enrichissements'
import { entreesDuMenu, type BibleDuMenu } from '@/app/lib/menuTraductionsBible'

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
const FOND_SURVOL = FOND_SURVOL_MENU
const styleLigne = styleLigneMenu

type Props = {
  traductions: readonly BibleDuMenu[]
  traductionIndex: number
  setTraductionIndex: (index: number) => void
}

export default function SelecteurTraductionBible({ traductions, traductionIndex, setTraductionIndex }: Props) {
  const [ouvert, setOuvert] = useState(false)
  const [deploye, setDeploye] = useState<{ cle: string; cote: 'droite' | 'gauche' } | null>(null)
  const label = traductions[traductionIndex]?.label ?? traductions[traductionIndex]?.code ?? 'Bible'
  const cadre = useRef<HTMLDivElement>(null)
  const bouton = useRef<HTMLButtonElement>(null)
  const lignes = useRef<(HTMLButtonElement | null)[]>([])
  const sousLignes = useRef<(HTMLButtonElement | null)[]>([])
  const repli = useRef<number | null>(null)
  const idListe = useId()
  const entrees = entreesDuMenu(traductions)
  const rangActif = Math.max(0, entrees.findIndex(e =>
    e.sorte === 'bible' ? e.index === traductionIndex : e.membres.some(m => m.index === traductionIndex)))

  const annulerRepli = () => {
    if (repli.current !== null) { window.clearTimeout(repli.current); repli.current = null }
  }
  const replierBientot = () => {
    annulerRepli()
    repli.current = window.setTimeout(() => { repli.current = null; setDeploye(null) }, DELAI_REPLI_MS)
  }
  const fermer = (rendreLeFoyer: boolean) => {
    annulerRepli()
    setDeploye(null)
    setOuvert(false)
    if (rendreLeFoyer) bouton.current?.focus()
  }

  // Le menu se referme comme tout menu du site : au clic à côté, et à la touche
  // d'échappement. Il ne se fermait ni par l'un ni par l'autre, et restait donc
  // ouvert par-dessus le texte tant qu'on ne rappuyait pas sur son propre bouton.
  // Les deux écouteurs ne sont posés que pendant qu'il est ouvert.
  useEffect(() => {
    if (!ouvert) return
    const dehors = (e: PointerEvent) => {
      if (!cadre.current?.contains(e.target as Node)) fermer(false)
    }
    const touche = (e: KeyboardEvent) => {
      if (e.key === 'Escape') fermer(true)
    }
    document.addEventListener('pointerdown', dehors)
    document.addEventListener('keydown', touche)
    return () => {
      document.removeEventListener('pointerdown', dehors)
      document.removeEventListener('keydown', touche)
    }
  }, [ouvert])

  // À l'ouverture, le clavier arrive sur la bible qu'on lit, ou sur sa famille : c'est le
  // point de départ naturel pour en changer. La mise au point se fait après le rendu.
  useEffect(() => {
    if (!ouvert) return
    lignes.current[rangActif]?.focus()
  }, [ouvert, rangActif])

  // Un sous-menu s'ouvre du côté où il tient : à droite de la ligne, à gauche sinon.
  const deployer = (cle: string, ligne: HTMLElement | null) => {
    annulerRepli()
    const racine = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
    const droite = ligne?.getBoundingClientRect().right ?? 0
    setDeploye({ cle, cote: droite + LARGEUR_SOUS_MENU_REM * racine + 16 > window.innerWidth ? 'gauche' : 'droite' })
  }

  // Flèches, début et fin : la circulation attendue d'une liste de choix. On ne change
  // de bible qu'à la validation, le déplacement ne recharge rien.
  const circuler = (e: React.KeyboardEvent, rang: number, liste: (HTMLButtonElement | null)[], total: number) => {
    const cible = rangDeCirculation(e.key, rang, total)
    if (cible === null) return false
    e.preventDefault()
    liste[cible]?.focus()
    return true
  }

  const choisir = (index: number) => {
    setTraductionIndex(index)
    fermer(true)
  }

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
            fontFamily: "var(--font-source-serif), Georgia, serif",
            fontStyle: 'italic', letterSpacing: '0.01em',
            transition: 'color 0.15s',
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
          <div id={idListe} role="menu" aria-label="Bibles disponibles"
            style={{ ...STYLE_CADRE_MENU, position: 'absolute', top: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)', zIndex: 50, minWidth: '230px' }}>
            {entrees.map((entree, rang) => {
              const premiere = rang === 0
              const derniere = rang === entrees.length - 1

              if (entree.sorte === 'bible') {
                const actif = entree.index === traductionIndex
                return (
                  <button key={traductions[entree.index].code} type="button" role="menuitemradio" aria-checked={actif}
                    ref={el => { lignes.current[rang] = el }}
                    onClick={() => choisir(entree.index)}
                    onKeyDown={e => { circuler(e, rang, lignes.current, entrees.length) }}
                    onMouseEnter={e => { if (deploye) setDeploye(null); if (!actif) e.currentTarget.style.background = FOND_SURVOL }}
                    onMouseLeave={e => { if (!actif) e.currentTarget.style.background = 'var(--cs-surface)' }}
                    style={styleLigne(actif, premiere, derniere)}>
                    {rendreEnrichi(traductions[entree.index].label)}
                  </button>
                )
              }

              // Une FAMILLE : son nom commun, un chevron, et au survol le sous-menu de ses
              // langues. ⛔ Le clic ne se perd pas dans le sous-menu : il ouvre le texte
              // d'origine, que le sous-menu met en tête. Le clavier suit — Entrée choisit,
              // la flèche droite déploie.
              const actif = entree.membres.some(m => m.index === traductionIndex)
              const ouverte = deploye?.cle === entree.cle
              const defaut = entree.membres[0]
              return (
                <div key={entree.cle} role="none" style={{ position: 'relative' }} onMouseLeave={replierBientot}>
                  <button type="button" role="menuitem" aria-haspopup="menu" aria-expanded={ouverte}
                    ref={el => { lignes.current[rang] = el }}
                    title={`${entree.nom} : ${entree.membres.map(m => m.libelle).join(', ')}`}
                    onClick={() => choisir(defaut.index)}
                    onMouseEnter={e => deployer(entree.cle, e.currentTarget)}
                    onKeyDown={e => {
                      if (circuler(e, rang, lignes.current, entrees.length)) return
                      if (e.key === 'ArrowRight') {
                        e.preventDefault()
                        deployer(entree.cle, e.currentTarget)
                        window.setTimeout(() => sousLignes.current[0]?.focus(), 0)
                      } else if (e.key === 'ArrowLeft') {
                        e.preventDefault()
                        setDeploye(null)
                      }
                    }}
                    style={{ ...styleLigne(actif, premiere, derniere), ...(ouverte && !actif ? { background: FOND_SURVOL } : null) }}>
                    <span style={{ flex: 1 }}>{rendreEnrichi(entree.nom)}</span>
                    {/* ⚠️ Le chevron déploie SANS choisir : sur un écran tactile, la main ne
                        survole pas, et c'est lui qui donne accès aux autres langues. */}
                    <span aria-hidden="true" style={STYLE_CHEVRON}
                      onClick={e => {
                        e.stopPropagation()
                        if (ouverte) setDeploye(null)
                        else deployer(entree.cle, e.currentTarget.parentElement)
                      }}>
                      <IconeChevron dir="right" taille={TAILLE_CHEVRON} strokeWidth={1.6} />
                    </span>
                  </button>
                  {ouverte && (
                    <div role="menu" aria-label={entree.nom} onMouseEnter={annulerRepli}
                      style={{
                        ...STYLE_CADRE_MENU, position: 'absolute', top: '-1px', zIndex: 1,
                        minWidth: `${LARGEUR_SOUS_MENU_REM}rem`,
                        ...(deploye.cote === 'droite' ? { left: 'calc(100% + 4px)' } : { right: 'calc(100% + 4px)' }),
                      }}>
                      {entree.membres.map((membre, sousRang) => {
                        const courant = membre.index === traductionIndex
                        return (
                          <button key={traductions[membre.index].code} type="button" role="menuitemradio" aria-checked={courant}
                            ref={el => { sousLignes.current[sousRang] = el }}
                            title={traductions[membre.index].label}
                            onClick={() => choisir(membre.index)}
                            onKeyDown={e => {
                              if (circuler(e, sousRang, sousLignes.current, entree.membres.length)) return
                              if (e.key === 'ArrowLeft') {
                                e.preventDefault()
                                setDeploye(null)
                                lignes.current[rang]?.focus()
                              }
                            }}
                            onMouseEnter={e => { if (!courant) e.currentTarget.style.background = FOND_SURVOL }}
                            onMouseLeave={e => { if (!courant) e.currentTarget.style.background = 'var(--cs-surface)' }}
                            style={styleLigne(courant, sousRang === 0, sousRang === entree.membres.length - 1)}>
                            {rendreEnrichi(membre.libelle)}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
      {/* Double filet à droite, symétrique. */}
      <div style={{ flex: 1, minWidth: '46px', height: '1px', background: 'linear-gradient(to left, transparent 0%, var(--cs-or-doux) 38%, var(--cs-texte-doux) 100%)' }} />
    </div>
  )
}
