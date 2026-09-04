'use client'

// ── « Ce livre n'est pas dans cette bible » ───────────────────────────────────
//
// La fenêtre s'ouvre quand on clique, dans le volet de gauche de la Bible, un
// livre GRISÉ (demande de l'auteur, 2026-09-04). Jusque-là le clic ne faisait
// rien : la rangée était un bouton, elle répondait au survol, et son geste se
// perdait dans un `return`. Le lecteur en concluait ce qu'il pouvait — que le
// site était cassé, le plus souvent, puisqu'un gris n'explique rien.
//
// Elle dit deux choses, et seulement deux : que le livre ne figure pas dans la
// bible qu'on lit, et où il se lit. ⛔ Elle ne dit PAS pourquoi il n'y figure
// pas : une édition partielle, un tome qui n'est pas encore importé et un livre
// qu'une confession ne reçoit pas se ressemblent de l'extérieur, et le volet ne
// sait pas les distinguer. Mieux vaut une phrase vraie qu'une raison inventée.
//
// ⛔ PAS DE DÉGRADÉ, PAS D'EMBLÈME, PAS DE BOUTONS (2026-09-04, l'auteur : « je
// n'aime guère la mise en forme, surtout le dégradé ; le site n'a aucun dégradé ;
// fais simple, élégant, propre, proportionné »). Elle avait pris le cadre de
// `ModaleCompteRequis` : un bandeau teinté qui s'éteignait vers le bas, un livre
// fermé dessiné dans son anneau, et autant de cartouches bordés que de bibles
// proposées. Trois ornements pour dire une phrase et nommer deux titres.
//
// ⚠️ Ce qui reste est la composition que la fiche « À propos de cette
// traduction » emploie déjà, et le volet avec elle : une rubrique en capitales
// espacées, le nom en sérif, un filet, la phrase — puis une LISTE, celle des
// livres du volet, où chaque rangée n'est qu'un nom et sa flèche. Une fenêtre de
// la page Bible ne s'invente pas un dessin ; elle prend celui de la page.
//
// ⛔ Les traductions proposées sont RÉSOLUES PAR LE PARENT (`BibleLayout`), qui
// tient le catalogue et les capacités de lecture : une édition à segmentation
// éditoriale — Fillion, la Bible 899 — n'est pas dans `livres_par_traduction`, et
// une fenêtre qui n'interrogerait que cette table les tairait toutes les deux.

import { createPortal } from 'react-dom'
import { useEffect, useState } from 'react'
import { HAUTEUR_NAVBAR } from '@/app/lib/mesures'

const SERIF = 'var(--font-source-serif), Georgia, serif'

export type TraductionProposee = { code: string; label: string }

/** Une bible proposée : un nom, une flèche, et rien autour.
 *  ⚠️ Le survol se tient dans un état plutôt que dans une règle de feuille : la
 *  fenêtre n'a pas de bloc `<style>`, et une classe pour deux lignes en appellerait
 *  un. Même parti que `NomVolet`, à qui la flèche est empruntée. */
function RangeeBible({ label, premiere, onChoisir }: {
  label: string; premiere: boolean; onChoisir: () => void
}) {
  const [survol, setSurvol] = useState(false)
  return (
    <button
      onClick={onChoisir}
      onMouseEnter={() => setSurvol(true)}
      onMouseLeave={() => setSurvol(false)}
      onFocus={() => setSurvol(true)}
      onBlur={() => setSurvol(false)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px',
        width: '100%', textAlign: 'left', cursor: 'pointer',
        // ⛔ Ni fond, ni cadre, ni rayon : c'est une rangée de liste, pas un bouton.
        background: 'none', border: 'none',
        borderTop: premiere ? 'none' : '1px solid var(--cs-bord-clair)',
        padding: '9px 0',
        fontFamily: SERIF, fontSize: '0.8125rem', lineHeight: 1.3,
        color: survol ? 'var(--cs-vert)' : 'var(--cs-encre)',
      }}>
      <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      <svg width="9" height="9" viewBox="0 0 10 10" fill="none" aria-hidden="true"
        style={{ flexShrink: 0, color: 'var(--cs-vert)', opacity: survol ? 1 : 0.5, transform: survol ? 'translateX(1px)' : 'none' }}>
        <path d="M1.6 5h6.8M5.6 2.2 8.4 5 5.6 7.8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )
}

export default function ModaleLivreAbsent({
  nomLivre, nomTraduction, propositions, onChoisir, onFermer,
}: {
  nomLivre: string
  /** La bible qu'on lit, nommée : « la Bible Fillion ne donne pas ce livre ». */
  nomTraduction: string
  /**
   * Les bibles qui portent ce livre, la courante exclue.
   * `null` tant que la réponse de la base n'est pas là : la fenêtre s'ouvre
   * TOUT DE SUITE avec ce qu'elle sait déjà, et complète ensuite — un clic qui
   * n'ouvre rien pendant une requête est le défaut qu'on vient de corriger.
   */
  propositions: readonly TraductionProposee[] | null
  onChoisir: (code: string) => void
  onFermer: () => void
}) {
  // Échap ferme, comme partout ailleurs.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onFermer() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onFermer])

  if (typeof document === 'undefined') return null

  return createPortal(
    <div onClick={onFermer}
      /* ⚠️ Le calque est un NOIR translucide, non un jeton d'encre : c'est une
         ombre, et un jeton se retournerait avec le thème — au Cuir il tirerait un
         rideau clair sur la page (charte, § Encre contre aplat). */
      style={{ position: 'fixed', top: HAUTEUR_NAVBAR, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.45)', zIndex: 2600, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="cs-livre-absent-titre"
        style={{ position: 'relative', background: 'var(--cs-surface)', borderRadius: '12px', border: '1px solid var(--cs-bord)', width: '100%', maxWidth: '22rem', maxHeight: '100%', overflowY: 'auto', boxShadow: 'var(--cs-ombre-modale)', padding: '20px 24px 22px' }}>

        <button onClick={onFermer} aria-label="Fermer" title="Fermer"
          style={{ position: 'absolute', top: '14px', right: '16px', fontSize: '0.875rem', color: 'var(--cs-texte-doux)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1 }}>✕</button>

        {/* La tête : rubrique, nom du livre, filet. C'est celle de la fiche
            « À propos de cette traduction », à la mesure d'une petite fenêtre. */}
        <p style={{ fontSize: '0.53125rem', fontWeight: 700, letterSpacing: '0.12em', color: 'var(--cs-vert)', margin: '0 0 5px', textTransform: 'uppercase' }}>
          Absent de cette traduction
        </p>
        <h2 id="cs-livre-absent-titre"
          style={{ fontFamily: SERIF, fontSize: '1.25rem', fontWeight: 'normal', color: 'var(--cs-encre-fonce)', margin: 0, lineHeight: 1.2 }}>
          {nomLivre}
        </h2>
        <div style={{ height: '1px', background: 'var(--cs-bord-clair)', margin: '14px 0 13px' }} />

        <p style={{ fontSize: '0.78125rem', color: 'var(--cs-texte)', lineHeight: 1.6, margin: 0 }}>
          Ce livre ne figure pas dans <span style={{ fontStyle: 'italic' }}>{nomTraduction}</span> telle
          qu’elle est publiée ici.
        </p>

        {propositions === null ? (
          <p style={{ fontSize: '0.71875rem', fontStyle: 'italic', color: 'var(--cs-texte-doux)', margin: '14px 0 0' }}>
            Recherche des bibles qui le donnent…
          </p>
        ) : propositions.length === 0 ? (
          <p style={{ fontSize: '0.78125rem', color: 'var(--cs-texte-second)', lineHeight: 1.6, margin: '12px 0 0' }}>
            Aucune des bibles publiées sur Corpus Scriptura ne le donne pour l’instant.
          </p>
        ) : (
          <>
            <p style={{ fontSize: '0.59375rem', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--cs-texte-faible)', margin: '17px 0 2px' }}>
              On le lit dans
            </p>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {propositions.map((t, rang) => (
                <RangeeBible key={t.code} label={t.label} premiere={rang === 0}
                  onChoisir={() => onChoisir(t.code)} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}
