'use client'

/**
 * La PLANCHE DES STYLES — quatre ÉPREUVES continues, styles nommés en marge.
 *
 * Le texte court d'un bout à l'autre, comme il court sur le site : c'est ainsi
 * seulement qu'on voit les RELATIONS — le blanc qu'un titre laisse sous lui,
 * l'apparat qui suit un commentaire, la citation qui coupe un paragraphe.
 *
 * ⛔ Le flux n'est jamais interrompu par la mise en page de la planche. Chaque
 * unité est un simple `position: relative` dans la colonne, et sa légende un
 * `position: absolute` posé DANS la marge : les marges verticales se fondent
 * comme sur le site, et les règles de voisinage (`.verset-row + .cs-bible-axe`)
 * continuent de s'appliquer. Une grille à deux colonnes les aurait toutes rompues.
 *
 * ⚠️ Sous 1 200 px, la marge repasse SOUS son unité : la faire disparaître aurait
 * ôté la moitié de la planche, la garder à côté aurait écrasé la colonne de lecture.
 */

import { useState } from 'react'
import OngletsPage from '@/app/components/OngletsPage'
import { EPREUVES, type CleOnglet } from './specimens'

/** Les deux fonds du site. Un style ne s'apprécie pas dans l'absolu : il
 *  s'apprécie sur son fond, et le Cuir a déjà fait paraître gris ce qui était vert. */
const FONDS = {
  papier: { nom: 'Papier', theme: 'light' as const },
  cuir: { nom: 'Cuir', theme: 'dark' as const },
}
type CleFond = keyof typeof FONDS

const CSS = `
  .pl-page { min-height: calc(100vh - 3.5rem); background: var(--cs-fond); padding: 0 0 6rem; }
  .pl-corps { max-width: 72rem; margin: 0 auto; padding: 0 1.5rem; }
  .pl-entete { padding: 2.5rem 0 1.25rem; }
  .pl-retour { font-family: var(--font-source-sans), Arial, sans-serif; font-size: 0.75rem; color: var(--cs-texte-gris); text-decoration: none; }
  .pl-retour:hover { color: var(--cs-vert); }
  .pl-titre { font-family: var(--font-source-serif), Georgia, serif; font-size: 1.75rem; font-weight: 400; color: var(--cs-encre); margin: 0.35rem 0 0.3rem; }
  .pl-sous-titre { font-size: 0.875rem; color: var(--cs-texte-second); line-height: 1.55; margin: 0; max-width: 46rem; }
  .pl-chapeau { font-size: 0.8125rem; color: var(--cs-texte-second); line-height: 1.55; margin: 1.25rem 0 0; max-width: 46rem; }

  .pl-reglages { display: flex; align-items: center; gap: 0.5rem; padding: 0.9rem 0 0; }
  .pl-etiquette { font-family: var(--font-source-sans), Arial, sans-serif; font-size: 0.6875rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--cs-texte-faible); }
  .pl-bouton { font-family: var(--font-source-sans), Arial, sans-serif; font-size: 0.71875rem; padding: 4px 10px; border-radius: 4px; border: 1px solid var(--cs-bord); background: var(--cs-surface); color: var(--cs-texte-second); cursor: pointer; }
  .pl-bouton:hover { color: var(--cs-vert); }
  .pl-bouton--actif { border-color: var(--cs-vert); color: var(--cs-vert); font-weight: 600; }

  /* ── L'ÉPREUVE ────────────────────────────────────────────────────────────
     La colonne de lecture, à sa mesure exacte, et rien qui coupe son flux. */
  .pl-epreuve { width: min(var(--mesure-ligne), 100%); margin: 2.5rem 0 0; }
  .pl-unite { position: relative; }

  /* ⛔ La marge ne s'insère pas dans le flux : elle en sort. Sans cela, chaque
     légende ouvrirait un blanc entre deux unités et la planche mentirait sur
     l'espacement même qu'elle prétend montrer. */
  .pl-marge { position: absolute; left: calc(100% + 1.75rem); top: 0; width: 16rem; }
  .pl-style { font-family: var(--font-source-sans), Arial, sans-serif; font-size: 0.71875rem; font-weight: 600; color: var(--cs-encre); line-height: 1.35; margin: 0 0 0.25rem; }
  .pl-note { font-size: 0.71875rem; color: var(--cs-texte-second); line-height: 1.45; margin: 0; }
  .pl-alerte { font-size: 0.6875rem; color: var(--cs-texte-second); line-height: 1.45; margin: 0.4rem 0 0; padding-left: 0.55rem; border-left: 2px solid var(--cs-or-doux); }

  /* Le filet de repère : il tire l'œil de la légende vers son unité, sans peser. */
  .pl-marge::before { content: ""; position: absolute; left: -1.1rem; top: 0.45rem; width: 0.7rem; height: 1px; background: var(--cs-bord); }

  @media (max-width: 1200px) {
    .pl-epreuve { width: 100%; }
    .pl-marge { position: static; width: auto; margin: 0.5rem 0 1.25rem; padding-left: 0.6rem; border-left: 2px solid var(--cs-bord-clair); }
    .pl-marge::before { display: none; }
  }
`

export default function PlancheStyles() {
  const [onglet, setOnglet] = useState<CleOnglet>('bible')
  const [fond, setFond] = useState<CleFond>('papier')
  const courante = EPREUVES.find((e) => e.cle === onglet) ?? EPREUVES[0]

  return (
    // ⚠️ `data-theme` est posé sur la PLANCHE, non sur la racine : on regarde le
    // Cuir sans quitter le thème dans lequel on travaille.
    <main className="pl-page" data-theme={FONDS[fond].theme}>
      <style>{CSS}</style>
      <div className="pl-corps">
        <header className="pl-entete">
          <a href="/admin" className="pl-retour">← Administration</a>
          <h1 className="pl-titre">Planche des styles</h1>
          <p className="pl-sous-titre">
            Quatre épreuves continues, une par vocabulaire. Le texte court d’un bout à l’autre comme
            il court sur le site : c’est ainsi qu’on voit les relations entre les styles, et non
            seulement chacun d’eux. Les compositions viennent de là où le site les décide — rien
            n’est rejoué ici.
          </p>
          <div className="pl-reglages">
            <span className="pl-etiquette">Fond</span>
            {(Object.keys(FONDS) as CleFond[]).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setFond(c)}
                className={`pl-bouton${fond === c ? ' pl-bouton--actif' : ''}`}
              >
                {FONDS[c].nom}
              </button>
            ))}
          </div>
        </header>

        <OngletsPage
          onglets={EPREUVES.map((e) => ({ cle: e.cle, libelle: e.libelle }))}
          actif={onglet}
          choisir={setOnglet}
          intitule="Familles de styles"
          style={{ marginTop: '1.25rem' }}
        />

        <p className="pl-chapeau">{courante.chapeau}</p>

        <div className="pl-epreuve">
          {courante.unites.map((unite) => (
            <div key={unite.style} className="pl-unite">
              {unite.contenu}
              <aside className="pl-marge">
                <p className="pl-style">{unite.style}</p>
                <p className="pl-note">{unite.note}</p>
                {unite.alerte && <p className="pl-alerte">{unite.alerte}</p>}
              </aside>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
