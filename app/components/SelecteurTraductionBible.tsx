'use client'

// Le menu déroulant CENTRAL de la page Bible : le nom du témoin qu'on lit, entre
// deux filets, et la liste de TOUTES les bibles lisibles.
//
// ⛔ Il ne liste QUE des bibles. Les façons de lire — lecture en regard, texte nu,
// graphie — vivent dans le menu « Lecture » du volet de gauche : mêlées ici, elles
// se donnaient pour des traductions de plus, et le lecteur qui les choisissait
// croyait changer de bible. C'est aussi pourquoi ce menu est le MÊME dans toutes
// les vues de la page (une colonne comme en regard) : on doit toujours pouvoir
// changer de bible, quelle que soit la manière dont on lit celle qu'on a sous les
// yeux.

import { useEffect, useId, useRef, useState } from 'react'

import { rendreEnrichi } from '@/app/lib/enrichissements'

type Traduction = { code: string; label: string }

/**
 * Le chevron du menu.
 *
 * ⛔ Il prend l'encre du NOM, pâlie d'un rang (`--cs-texte-doux` contre
 * `--cs-texte-gris`), et non plus un vert clair : c'est une marque d'ouverture, pas
 * un accent, et le vert y appelait l'œil avant le nom qu'il accompagne.
 *
 * ⚠️ Sa taille est en `em`, donc relative au nom : le glyphe ▼ remplit presque tout
 * son cadratin, si bien qu'à taille égale il pèse bien plus qu'une lettre. À 0,5625
 * em du nom, il vaut 6,5 px pour un nom de 11,5 — un cran sous les 7 px d'avant, et
 * l'échelle typographique n'a pas de rang au-dessous de 7.
 *
 * ⚠️ `lineHeight: 1` et aucun décalage : le bouton aligne ses enfants sur leur
 * milieu, et le glyphe est centré dans son cadratin. Le `top: 1.5px` d'avant le
 * faisait descendre sous la ligne du nom.
 */
const STYLE_CHEVRON: React.CSSProperties = {
  color: 'var(--cs-texte-doux)',
  fontSize: '0.5625em',
  fontStyle: 'normal',
  lineHeight: 1,
}

type Props = {
  traductions: readonly Traduction[]
  traductionIndex: number
  setTraductionIndex: (index: number) => void
}

export default function SelecteurTraductionBible({ traductions, traductionIndex, setTraductionIndex }: Props) {
  const [ouvert, setOuvert] = useState(false)
  const label = traductions[traductionIndex]?.label ?? traductions[traductionIndex]?.code ?? 'Bible'
  const cadre = useRef<HTMLDivElement>(null)
  const bouton = useRef<HTMLButtonElement>(null)
  const options = useRef<(HTMLButtonElement | null)[]>([])
  const idListe = useId()

  // Le menu se referme comme tout menu du site : au clic à côté, et à la touche
  // d'échappement. Il ne se fermait ni par l'un ni par l'autre, et restait donc
  // ouvert par-dessus le texte tant qu'on ne rappuyait pas sur son propre bouton.
  // Les deux écouteurs ne sont posés que pendant qu'il est ouvert.
  useEffect(() => {
    if (!ouvert) return
    const dehors = (e: PointerEvent) => {
      if (!cadre.current?.contains(e.target as Node)) setOuvert(false)
    }
    const touche = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setOuvert(false)
      bouton.current?.focus()
    }
    document.addEventListener('pointerdown', dehors)
    document.addEventListener('keydown', touche)
    return () => {
      document.removeEventListener('pointerdown', dehors)
      document.removeEventListener('keydown', touche)
    }
  }, [ouvert])

  // À l'ouverture, le clavier arrive sur la bible qu'on lit : c'est le point de
  // départ naturel pour en changer, et sans cela la liste n'était atteignable qu'à
  // la souris. La mise au point se fait après le rendu de la liste.
  useEffect(() => {
    if (!ouvert) return
    options.current[traductionIndex]?.focus()
  }, [ouvert, traductionIndex])

  // Flèches, début et fin : la circulation attendue d'une liste de choix. On ne
  // change de bible qu'à la validation, le déplacement ne recharge rien.
  const circuler = (e: React.KeyboardEvent, rang: number) => {
    const dernier = traductions.length - 1
    const cible =
      e.key === 'ArrowDown' ? Math.min(rang + 1, dernier)
      : e.key === 'ArrowUp' ? Math.max(rang - 1, 0)
      : e.key === 'Home' ? 0
      : e.key === 'End' ? dernier
      : null
    if (cible === null) return
    e.preventDefault()
    options.current[cible]?.focus()
  }

  const choisir = (rang: number) => {
    setTraductionIndex(rang)
    setOuvert(false)
    bouton.current?.focus()
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
          onClick={() => setOuvert(!ouvert)}
          aria-haspopup="listbox"
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
          <span aria-hidden="true" style={{ ...STYLE_CHEVRON, visibility: 'hidden' }}>▼</span>
          {/* ⚠️ LE NOM SE COMPOSE (demande de l'auteur, 2026-09-04) : « Bible française
              du XIIIe siècle » y prend ses petites capitales et son exposant, et un titre
              entre astérisques son italique. C'est le module partagé avec les notices
              d'auteur et avec le menu de la Polyglotte : un nom de bible ne se compose pas
              d'une façon là et d'une autre ici. */}
          <span>{rendreEnrichi(label)}</span>
          <span aria-hidden="true" style={STYLE_CHEVRON}>{ouvert ? '▲' : '▼'}</span>
        </button>
        {ouvert && (
          <div id={idListe} role="listbox" aria-label="Bibles disponibles"
            style={{ position: 'absolute', top: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)', background: 'var(--cs-surface)', border: '1px solid rgba(var(--cs-vert-rgb),0.18)', borderRadius: '8px', zIndex: 50, boxShadow: 'var(--cs-ombre-flottante)', minWidth: '230px', overflow: 'hidden' }}>
            {traductions.map((t, i) => (
              <button key={t.code} type="button" role="option" aria-selected={traductionIndex === i}
                ref={el => { options.current[i] = el }}
                onClick={() => choisir(i)}
                onKeyDown={e => circuler(e, i)}
                style={{
                width: '100%', textAlign: 'left', padding: '11px 16px', fontSize: '0.8125rem',
                border: 'none', borderBottom: i < traductions.length - 1 ? '1px solid var(--cs-fond-doux)' : 'none',
                background: traductionIndex === i ? 'rgba(var(--cs-vert-rgb),0.08)' : 'var(--cs-surface)',
                color: traductionIndex === i ? 'var(--cs-vert)' : 'var(--cs-texte-fort)',
                fontWeight: traductionIndex === i ? 600 : 400, cursor: 'pointer',
                fontFamily: "var(--font-source-serif), Georgia, serif", letterSpacing: '0.01em',
                transition: 'background 0.12s',
              }}
                onMouseEnter={e => { if (traductionIndex !== i) (e.currentTarget as HTMLElement).style.background = 'rgba(var(--cs-vert-rgb),0.04)' }}
                onMouseLeave={e => { if (traductionIndex !== i) (e.currentTarget as HTMLElement).style.background = 'var(--cs-surface)' }}>
                {rendreEnrichi(t.label)}
              </button>
            ))}
          </div>
        )}
      </div>
      {/* Double filet à droite, symétrique. */}
      <div style={{ flex: 1, minWidth: '46px', height: '1px', background: 'linear-gradient(to left, transparent 0%, var(--cs-or-doux) 38%, var(--cs-texte-doux) 100%)' }} />
    </div>
  )
}
