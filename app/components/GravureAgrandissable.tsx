'use client'

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

import { HAUTEUR_NAVBAR } from '@/app/lib/mesures'

/**
 * ⛔ UNE PLANCHE EST UNE PAGE ENTIÈRE DU VOLUME, ET ELLE NE SE LIT PAS À 440 px.
 *
 * La table des régimes annonce l'agrandissement depuis l'origine ; il n'avait
 * jamais été bâti. Mesuré le 31 août 2026 : vingt-huit planches sur trente-deux
 * sont TOURNÉES — Fillion imprime en paysage, sur une page portrait, celles qui
 * ne tiendraient pas autrement, et on les redresse. Le site bornant la LARGEUR,
 * une planche redressée présente alors sa longue dimension aux 440 px de la
 * colonne quand une planche debout n'y présente que sa courte : son contenu
 * tombe à 0,157 de sa taille au lieu de 0,256, et ses légendes gravées cessent
 * d'être lisibles, trois pixels de hauteur de caractère au lieu de cinq.
 *
 * ⚠️ AUCUN NOUVEAU DÉRIVÉ N'EST NÉCESSAIRE, et c'est ce qui rend la correction
 * si peu coûteuse : le fichier servi fait déjà le DOUBLE de sa taille
 * d'affichage (charte § 35.16.7). Le montrer à sa taille naturelle porte le
 * contenu d'une planche tournée à 0,313 — mieux que ce qu'une planche debout
 * obtient dans le fil du texte.
 *
 * ⛔ Le calque part de `HAUTEUR_NAVBAR` et NE DÉFILE PAS ; c'est la figure qui
 * défile en dedans. Un calque en `inset: 0` laisse le contenu passer sous la
 * barre, qui est peinte par-dessus (charte, § Fenêtres contextuelles).
 */

const SERIF = 'var(--font-source-serif), Georgia, serif'
/** Au-dessus de la barre de navigation et des volets, sous rien d'autre. */
const Z_PLANCHE = 1201

export function GravureAgrandissable({
  legende, alt, enfant, agrandi,
}: {
  legende?: string | null
  alt: string
  /** La gravure telle que la page la compose, dans le fil. */
  enfant: ReactNode
  /** La même, à sa taille naturelle, pour le calque. */
  agrandi: ReactNode
}) {
  const [ouvert, setOuvert] = useState(false)
  useEffect(() => {
    if (!ouvert) return
    const auClavier = (e: KeyboardEvent) => { if (e.key === 'Escape') setOuvert(false) }
    window.addEventListener('keydown', auClavier)
    return () => window.removeEventListener('keydown', auClavier)
  }, [ouvert])

  const cadre: CSSProperties = {
    display: 'block', width: '100%', padding: 0, border: 0, background: 'none',
    cursor: 'zoom-in', font: 'inherit', color: 'inherit', textAlign: 'inherit',
  }

  return (
    <>
      {/* ⚠️ Un BOUTON, non un lien : il n'y a pas d'adresse à ouvrir, et le
          clavier doit pouvoir agrandir comme la souris. */}
      <button type="button" style={cadre} onClick={() => setOuvert(true)}
        aria-label={`Agrandir : ${alt}`} title="Agrandir">
        {enfant}
      </button>
      {ouvert && typeof document !== 'undefined' && createPortal(
        <div
          onClick={() => setOuvert(false)}
          role="dialog" aria-modal="true" aria-label={alt}
          style={{
            position: 'fixed', top: HAUTEUR_NAVBAR, left: 0, right: 0, bottom: 0,
            // ⛔ Un calque est une OMBRE, jamais un jeton d'encre : sur le cuir,
            //    `--cs-texte-fort` est presque blanc et tirerait un rideau clair.
            background: 'rgba(0, 0, 0, 0.55)', zIndex: Z_PLANCHE,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '24px', overflow: 'hidden', cursor: 'zoom-out',
          }}
        >
          <figure
            onClick={(e) => e.stopPropagation()}
            style={{
              margin: 0, width: 'min(100%, 60rem)', maxHeight: '100%', overflowY: 'auto',
              background: 'var(--cs-surface)', border: '1px solid var(--cs-bord)',
              borderRadius: '12px', boxShadow: 'var(--cs-ombre-modale)', padding: '14px',
              cursor: 'default',
            }}
          >
            {agrandi}
            {legende && (
              <figcaption style={{
                margin: '10px auto 0', maxWidth: '34rem', fontFamily: SERIF, fontStyle: 'italic',
                fontSize: '0.78125rem', lineHeight: 1.35, color: 'var(--cs-texte-second)', textAlign: 'center',
              }}>
                {legende}
              </figcaption>
            )}
          </figure>
        </div>,
        document.body,
      )}
    </>
  )
}
