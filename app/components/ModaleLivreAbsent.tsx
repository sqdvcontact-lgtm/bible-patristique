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
// ⚠️ Le CADRE est celui de `ModaleCompteRequis` — bandeau teinté, emblème dans
// son anneau, titre en sérif, puis le corps —, et non un dessin propre : c'est le
// même objet, une petite fenêtre qui explique une situation et propose une suite.
//
// ⛔ Les traductions proposées sont RÉSOLUES PAR LE PARENT (`BibleLayout`), qui
// tient le catalogue et les capacités de lecture : une édition à segmentation
// éditoriale — Fillion, la Bible 899 — n'est pas dans `livres_par_traduction`, et
// une fenêtre qui n'interrogerait que cette table les tairait toutes les deux.

import { createPortal } from 'react-dom'
import { useEffect } from 'react'
import { HAUTEUR_NAVBAR } from '@/app/lib/mesures'

const SERIF = 'var(--font-source-serif), Georgia, serif'

export type TraductionProposee = { code: string; label: string }

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
        style={{ background: 'var(--cs-surface)', borderRadius: '12px', border: '1px solid var(--cs-bord)', width: '100%', maxWidth: '24rem', maxHeight: '100%', overflowY: 'auto', boxShadow: 'var(--cs-ombre-modale)' }}>

        {/* Bandeau — la teinte d'encre du site, et un livre fermé pour emblème. */}
        <div style={{ position: 'relative', padding: '20px 24px 16px', background: 'linear-gradient(180deg, var(--cs-vert-pale) 0%, var(--cs-fond-clair) 100%)', borderBottom: '1px solid var(--cs-bord-clair)', borderRadius: '12px 12px 0 0' }}>
          <button onClick={onFermer} aria-label="Fermer" title="Fermer"
            style={{ position: 'absolute', top: '12px', right: '14px', fontSize: '0.9375rem', color: 'var(--cs-texte-doux)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1 }}>✕</button>
          <div aria-hidden="true"
            style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--cs-surface)', border: '1px solid rgba(var(--cs-vert-rgb),0.30)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '10px' }}>
            {/* Un volume fermé, tranche vers le lecteur : le livre qu'on n'ouvre pas. */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M6 3.5h11a1.5 1.5 0 0 1 1.5 1.5v14a1.5 1.5 0 0 1-1.5 1.5H6.5A1.5 1.5 0 0 1 5 19V5a1.5 1.5 0 0 1 1.5-1.5Z" stroke="var(--cs-vert)" strokeWidth="1.4" strokeLinejoin="round"/>
              <path d="M8.2 3.5v17" stroke="var(--cs-vert)" strokeWidth="1.4"/>
            </svg>
          </div>
          <p style={{ fontSize: '0.53125rem', fontWeight: 700, letterSpacing: '0.12em', color: 'var(--cs-vert)', margin: '0 0 4px', textTransform: 'uppercase' }}>
            Absent de cette traduction
          </p>
          <h2 id="cs-livre-absent-titre"
            style={{ fontFamily: SERIF, fontSize: '1.125rem', fontWeight: 'normal', color: 'var(--cs-encre-fonce)', margin: 0, lineHeight: 1.25 }}>
            {nomLivre}
          </h2>
        </div>

        <div style={{ padding: '15px 24px 20px' }}>
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
              <p style={{ fontSize: '0.59375rem', fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--cs-texte-faible)', margin: '16px 0 8px' }}>
                On le lit dans
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {propositions.map(t => (
                  <button key={t.code} onClick={() => onChoisir(t.code)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px',
                      width: '100%', textAlign: 'left', cursor: 'pointer',
                      fontFamily: 'inherit', fontSize: '0.8125rem', color: 'var(--cs-encre)',
                      padding: '9px 12px', borderRadius: '8px',
                      border: '1px solid var(--cs-bord)', background: 'var(--cs-fond)',
                    }}>
                    <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.label}</span>
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true" style={{ flexShrink: 0, color: 'var(--cs-vert)' }}>
                      <path d="M1.6 5h6.8M5.6 2.2 8.4 5 5.6 7.8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}
