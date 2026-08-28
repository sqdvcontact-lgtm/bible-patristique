'use client'

/**
 * La PLANCHE DES STYLES — un exemple de chaque style, sur son fond, à sa mesure.
 *
 * Quatre onglets, parce qu'il y a quatre vocabulaires et qu'on les confond : le
 * texte biblique, le corps d'une œuvre, l'apparat d'une œuvre, l'apparat d'une
 * bible. Les spécimens et leur légende vivent dans `specimens.tsx` ; cette page
 * n'en pose que le cadre.
 *
 * ⚠️ Chaque spécimen dit sa FIDÉLITÉ : rendu par le composant réel du site, ou
 * rejoué aux valeurs exactes faute de pouvoir l'appeler ici. Une reproduction qui
 * dériverait de sa source ferait autorité contre le site : elle est donc marquée.
 */

import { useState } from 'react'
import OngletsPage from '@/app/components/OngletsPage'
import { ONGLETS, type CleOnglet, type Specimen } from './specimens'

/** Les deux fonds du site, aux valeurs exactes de `globals.css`. Un style ne
 *  s'apprécie pas dans l'absolu : il s'apprécie sur son fond, et le Cuir a déjà
 *  fait paraître gris ce qui était vert. */
const FONDS = {
  papier: { nom: 'Papier', theme: 'light' as const },
  cuir: { nom: 'Cuir', theme: 'dark' as const },
}
type CleFond = keyof typeof FONDS

const CSS = `
  .pl-page { min-height: calc(100vh - 3.5rem); background: var(--cs-fond); padding: 0 0 5rem; }
  .pl-corps { max-width: 64rem; margin: 0 auto; padding: 0 1.5rem; }
  .pl-entete { padding: 2.5rem 0 1.25rem; }
  .pl-retour { font-family: var(--font-source-sans), Arial, sans-serif; font-size: 0.75rem; color: var(--cs-texte-gris); text-decoration: none; }
  .pl-retour:hover { color: var(--cs-vert); }
  .pl-titre { font-family: var(--font-source-serif), Georgia, serif; font-size: 1.75rem; font-weight: 400; color: var(--cs-encre); margin: 0.35rem 0 0.3rem; }
  .pl-sous-titre { font-size: 0.875rem; color: var(--cs-texte-second); line-height: 1.55; margin: 0; max-width: 46rem; }

  .pl-reglages { display: flex; align-items: center; gap: 0.5rem; padding: 0.9rem 0 0; }
  .pl-etiquette { font-family: var(--font-source-sans), Arial, sans-serif; font-size: 0.6875rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--cs-texte-faible); }
  .pl-bouton { font-family: var(--font-source-sans), Arial, sans-serif; font-size: 0.71875rem; padding: 4px 10px; border-radius: 4px; border: 1px solid var(--cs-bord); background: var(--cs-surface); color: var(--cs-texte-second); cursor: pointer; }
  .pl-bouton:hover { color: var(--cs-vert); }
  .pl-bouton--actif { border-color: var(--cs-vert); color: var(--cs-vert); font-weight: 600; }

  .pl-chapeau { font-size: 0.8125rem; color: var(--cs-texte-second); line-height: 1.55; margin: 1.5rem 0 0; max-width: 46rem; }

  .pl-groupe { margin-top: 2.5rem; }
  .pl-groupe-titre { font-family: var(--font-source-serif), Georgia, serif; font-size: 1.125rem; font-weight: 400; color: var(--cs-encre); margin: 0 0 0.25rem; }
  .pl-groupe-note { font-size: 0.78125rem; color: var(--cs-texte-second); line-height: 1.5; margin: 0 0 1.1rem; max-width: 46rem; }

  .pl-specimen { display: grid; grid-template-columns: minmax(0, 20rem) minmax(0, 1fr); gap: 1.75rem; padding: 1.25rem 0; border-top: 1px solid var(--cs-bord-clair); align-items: start; }
  @media (max-width: 880px) { .pl-specimen { grid-template-columns: 1fr; gap: 0.9rem; } }

  .pl-code { font-family: var(--font-source-sans), Arial, sans-serif; font-size: 0.78125rem; font-weight: 600; color: var(--cs-encre); margin: 0 0 0.3rem; word-break: break-word; }
  .pl-usage { font-size: 0.78125rem; color: var(--cs-texte-second); line-height: 1.5; margin: 0 0 0.5rem; }
  .pl-source { font-family: var(--font-source-sans), Arial, sans-serif; font-size: 0.6875rem; color: var(--cs-texte-faible); line-height: 1.45; margin: 0; }
  .pl-alerte { font-size: 0.75rem; color: var(--cs-texte-second); line-height: 1.5; margin: 0.5rem 0 0; padding-left: 0.6rem; border-left: 2px solid var(--cs-or-doux); }

  .pl-fidelite { display: inline-block; font-family: var(--font-source-sans), Arial, sans-serif; font-size: 0.625rem; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; padding: 2px 6px; border-radius: 3px; margin-bottom: 0.4rem; }
  .pl-fidelite[data-f="composant"] { color: var(--cs-vert); background: var(--cs-vert-pale); }
  .pl-fidelite[data-f="reproduction"] { color: var(--cs-texte-gris); background: var(--cs-bord-clair); }

  /* La SCÈNE : la mesure du bloc de lecture, sur le fond de la page de lecture.
     ⛔ Sans elle, un spécimen s'étalerait sur toute la largeur de l'écran et
     mentirait sur ses proportions — un retrait de 8 mm ne dit rien sur 60 rem. */
  .pl-scene { width: min(31.25rem, 100%); background: var(--cs-surface); border: 1px solid var(--cs-bord-clair); border-radius: 6px; padding: 1rem 1.15rem; }
  .pl-scene--vide { color: var(--cs-texte-faible); font-size: 0.75rem; font-style: italic; }
`

function Fiche({ specimen }: { specimen: Specimen }) {
  return (
    <div className="pl-specimen">
      <div>
        <span className="pl-fidelite" data-f={specimen.fidelite}>
          {specimen.fidelite === 'composant' ? 'composant réel' : 'reproduction'}
        </span>
        <p className="pl-code">{specimen.code}</p>
        <p className="pl-usage">{specimen.usage}</p>
        <p className="pl-source">{specimen.source}</p>
        {specimen.alerte && <p className="pl-alerte">{specimen.alerte}</p>}
      </div>
      <div className="pl-scene">{specimen.rendu}</div>
    </div>
  )
}

export default function PlancheStyles() {
  const [onglet, setOnglet] = useState<CleOnglet>('bible')
  const [fond, setFond] = useState<CleFond>('papier')
  const courant = ONGLETS.find((o) => o.cle === onglet) ?? ONGLETS[0]

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
            Un exemple de chaque style, à la mesure du bloc de lecture. Quatre vocabulaires, qu’il ne
            faut pas confondre : le texte biblique, le corps d’une œuvre, l’apparat d’une œuvre,
            l’apparat d’une bible. La bibliothèque écrite vit dans <code>work/fillion/STYLES_BIBLIQUES.md</code>.
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
          onglets={ONGLETS.map((o) => ({ cle: o.cle, libelle: o.libelle }))}
          actif={onglet}
          choisir={setOnglet}
          intitule="Familles de styles"
          style={{ marginTop: '1.25rem' }}
        />

        <p className="pl-chapeau">{courant.chapeau}</p>

        {courant.groupes.map((groupe) => (
          <section key={groupe.titre} className="pl-groupe">
            <h2 className="pl-groupe-titre">{groupe.titre}</h2>
            {groupe.note && <p className="pl-groupe-note">{groupe.note}</p>}
            {groupe.specimens.map((specimen) => (
              <Fiche key={specimen.code} specimen={specimen} />
            ))}
          </section>
        ))}
      </div>
    </main>
  )
}
