'use client'

/**
 * La citation favorite — sa marque, son bouton, sa fenêtre de remplacement
 *
 * ⛔ Le SACRÉ-CŒUR est retiré (2026-08-22, décision d'auteur). Il vivait en deux
 * exemplaires qui ne se ressemblaient même pas : une vignette `sacre-coeur.png`
 * posée en tête de « Mes citations », et un dessin SVG à quatre pièces (croix,
 * flamme, couronne d'épines, cœur) dans la gouttière d'actions. À 13 px, les
 * quatre pièces se confondaient en une tache ; à 26 px, la vignette matricielle
 * se crénelait. Deux dessins pour un seul office, aucun des deux lisible.
 *
 * À sa place, UNE marque et une seule : le QUADRILOBE, la rosace à quatre lobes
 * du remplage gothique. Elle tient sa raison de trois choses :
 *  · elle appartient à la grammaire ornementale du site, elle n'est pas un pictogramme ;
 *  · elle est SYMÉTRIQUE, donc nette à 15 px comme à 30 px, en un seul tracé ;
 *  · elle ne se confond avec rien. L'étoile dit déjà « favori » (`EtoileFavori`,
 *    œuvres et versets) et le cœur disait « aimé ». Le quadrilobe dit « choisi ».
 *
 * Un seul tracé sert les deux emplois, l'emblème de la page et le bouton de choix.
 * La marque du titre EST le bouton qu'on ira chercher dans la liste, et c'est ce
 * qui l'enseigne sans une ligne de mode d'emploi.
 *
 * Géométrie : quatre lobes de rayon 3,2 centrés à 3 du centre, sur les axes. Les
 * points de rencontre tombent d'eux-mêmes aux quatre coins d'un carré (4,81 et
 * 11,19), d'où un tracé de quatre arcs, sans une seule courbe de Bézier à régler.
 */

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { colorMix } from '@/app/lib/couleurs'
import { HAUTEUR_NAVBAR } from '@/app/lib/mesures'
import { texteSansEnrichissement } from '@/app/oeuvre/[id]/texteEnrichi'

export type CitationPreferee = {
  id: string
  texte: string
  type: 'biblique' | 'patristique'
  ref?: string
  auteur?: string
  titre_oeuvre?: string
}

/** Le tracé du quadrilobe, dans une boîte de 16. */
const QUADRILOBE =
  'M4.81 4.81A3.2 3.2 0 0 1 11.19 4.81A3.2 3.2 0 0 1 11.19 11.19' +
  'A3.2 3.2 0 0 1 4.81 11.19A3.2 3.2 0 0 1 4.81 4.81Z'

/**
 * La marque. `plein` = citation choisie : le lobe se remplit et la perle se creuse ;
 * sinon le lobe reste au trait et la perle prend l'encre du tracé.
 *
 * ⚠️ La couleur vient de `currentColor`, jamais d'un attribut `fill=` tokenisé :
 * une custom property n'est pas résolue dans un attribut de présentation SVG
 * (charte, § Palette). C'est donc le parent qui porte `color`.
 */
export function MarqueCitation({ taille = 15, plein = false, perle = true }: {
  taille?: number; plein?: boolean; perle?: boolean
}) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 16 16" aria-hidden="true" style={{ display: 'block' }}>
      <path d={QUADRILOBE}
        fill={plein ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={plein ? 0.8 : 1.2}
        strokeLinejoin="round" />
      {perle && (
        <circle cx="8" cy="8" r="1.15"
          fill={plein ? undefined : 'currentColor'}
          style={plein ? { fill: 'var(--cs-fond-clair)' } : undefined} />
      )}
    </svg>
  )
}

/** Le bouton de choix, posé dans la gouttière d'actions d'une citation. */
export function BoutonCitationPreferee({ actif, onClick, className = 'prel-action' }: {
  actif: boolean; onClick: (e: React.MouseEvent) => void; className?: string
}) {
  return (
    <button onClick={onClick} aria-pressed={actif}
      className={`${className} prel-marque${actif ? ' prel-marque-active' : ''}`}
      title={actif ? 'Retirer cette citation favorite' : 'Choisir comme citation favorite'}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <MarqueCitation taille={15} plein={actif} />
    </button>
  )
}

const extrait = (c: CitationPreferee, max = 150): string => {
  const t = texteSansEnrichissement(c.texte).trim()
  return t.length > max ? `${t.slice(0, max).trimEnd()}…` : t
}

const source = (c: CitationPreferee): string =>
  c.type === 'biblique' ? (c.ref ?? '') : [c.auteur, c.titre_oeuvre].filter(Boolean).join(', ')

/** Une des deux citations mises en regard dans la fenêtre. `vive` = la nouvelle. */
function CitationEnRegard({ c, etat, vive }: { c: CitationPreferee; etat: string; vive: boolean }) {
  return (
    <div style={{
      borderLeft: `2px solid ${colorMix('var(--cs-or)', vive ? 70 : 26)}`,
      padding: '2px 0 2px 11px', margin: '0 0 12px',
    }}>
      <p style={{ fontSize: '0.5rem', fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--cs-texte-gris)', margin: '0 0 5px', fontFamily: 'var(--font-source-sans), Arial, sans-serif' }}>
        {etat}
      </p>
      <p style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '0.8125rem', fontStyle: 'italic', color: 'var(--cs-texte)', lineHeight: 1.45, margin: 0 }}>
        «&#8201;{extrait(c)}&#8201;»
      </p>
      {source(c) && (
        <p style={{ fontSize: '0.625rem', color: 'var(--cs-or)', margin: '5px 0 0', letterSpacing: '0.08em', fontFamily: 'var(--font-source-serif), Georgia, serif' }}>
          {source(c)}
        </p>
      )}
    </div>
  )
}

/**
 * La demande de remplacement. On ne porte qu'une citation favorite à la fois, et
 * elle paraît sur le profil public : la remplacer d'un clic, sans rien dire,
 * faisait disparaître un choix que personne n'avait demandé de défaire. La fenêtre
 * montre donc les DEUX citations, l'ancienne et la nouvelle, avant de trancher.
 *
 * ⚠️ Gabarit imposé par la charte (§ Fenêtres contextuelles) : le calque part de
 * `HAUTEUR_NAVBAR` et ne défile pas, c'est la boîte qui défile en dedans.
 */
export function ModaleRemplacerCitation({ actuelle, nouvelle, onConfirmer, onAnnuler }: {
  actuelle: CitationPreferee; nouvelle: CitationPreferee
  onConfirmer: () => void; onAnnuler: () => void
}) {
  const boutonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    boutonRef.current?.focus()
    const auClavier = (e: KeyboardEvent) => { if (e.key === 'Escape') onAnnuler() }
    document.addEventListener('keydown', auClavier)
    return () => document.removeEventListener('keydown', auClavier)
  }, [onAnnuler])

  if (typeof document === 'undefined') return null

  return createPortal(
    <div onClick={onAnnuler}
      style={{
        position: 'fixed', top: HAUTEUR_NAVBAR, left: 0, right: 0, bottom: 0,
        background: colorMix('var(--cs-texte-fort)', 52), zIndex: 2600,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px', overflow: 'hidden',
      }}>
      <div onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="cs-remplacer-titre"
        style={{
          background: 'var(--cs-surface)', borderRadius: '12px', border: '1px solid var(--cs-bord)',
          width: '100%', maxWidth: '26rem', maxHeight: '100%', overflowY: 'auto',
          boxShadow: 'var(--cs-ombre-modale)',
        }}>

        {/* Bandeau. La marque de la page y paraît en grand : on reconnaît le geste qu'on vient de faire. */}
        <div style={{ position: 'relative', padding: '22px 24px 17px', background: `linear-gradient(180deg, ${colorMix('var(--cs-or)', 11)} 0%, var(--cs-fond-clair) 100%)`, borderBottom: '1px solid var(--cs-bord-clair)' }}>
          <button onClick={onAnnuler} aria-label="Fermer"
            style={{ position: 'absolute', top: '12px', right: '14px', fontSize: '0.9375rem', color: 'var(--cs-texte-doux)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1 }}>✕</button>
          <div aria-hidden="true"
            style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'var(--cs-surface)', border: `1px solid ${colorMix('var(--cs-or)', 38)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '11px', color: 'var(--cs-or)' }}>
            <MarqueCitation taille={19} plein />
          </div>
          <h2 id="cs-remplacer-titre"
            style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '1.0625rem', color: 'var(--cs-encre)', margin: 0, lineHeight: 1.3 }}>
            Voulez-vous remplacer votre citation favorite ?
          </h2>
        </div>

        <div style={{ padding: '17px 24px 22px' }}>
          <p style={{ fontSize: '0.8125rem', color: 'var(--cs-texte)', lineHeight: 1.6, margin: '0 0 15px' }}>
            Vous n’en portez qu’une à la fois, et c’est elle qui paraît sur votre profil public.
            Celle que vous gardiez jusqu’ici redeviendra une citation ordinaire.
          </p>

          <CitationEnRegard c={actuelle} etat="Citation actuelle" vive={false} />
          <CitationEnRegard c={nouvelle} etat="Nouvelle citation" vive />

          <div style={{ display: 'flex', gap: '9px', marginTop: '18px' }}>
            <button ref={boutonRef} type="button" onClick={onConfirmer}
              style={{ flex: 1, fontSize: '0.8125rem', fontWeight: 600, padding: '10px 16px', borderRadius: '8px', background: 'var(--cs-vert)', color: 'var(--cs-surface)', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
              Remplacer
            </button>
            <button type="button" onClick={onAnnuler}
              style={{ flex: 1, fontSize: '0.75rem', padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--cs-bord)', background: 'var(--cs-surface)', color: 'var(--cs-texte-second)', cursor: 'pointer', fontFamily: 'inherit' }}>
              Garder l’actuelle
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
