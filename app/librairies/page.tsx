import type { CSSProperties } from 'react'
import IconeChevron from '@/app/components/IconeChevron'
import { ENCRE_TITRE, GRAISSE_TITRE, TITRE_PAGE } from '@/app/lib/hierarchieTitres'
export const metadata = {
  title: 'Acheter des livres',
  description: 'Où trouver les éditions bibliques et patristiques, neuves, anciennes ou critiques.',
}

type Librairie = { nom: string; description: string; url: string; couleur: string; sep: string; logo?: string; monogramme?: string }

const LIBRAIRIES: Librairie[] = [
  {
    nom: 'La Procure',
    description: 'Éditions contemporaines, annotées ou liturgiques — livres neufs.',
    url: 'https://www.laprocure.com/',
    logo: '/icons/librairies/procure-eventail.png',
    couleur: '#153f78',
    sep: 'rgba(22,63,125,0.32)',
  },
  {
    nom: 'Librairie Pierre Brunet',
    description: "Éditions anciennes et épuisées — livres d'occasion et anciens.",
    url: 'https://www.librairie-pierre-brunet.fr/librairie-en-ligne.html',
    logo: '/icons/librairies/pierre-brunet-livre.png',
    couleur: '#5e3a1c',
    sep: 'rgba(124,88,47,0.38)',
  },
  {
    nom: 'Sources Chrétiennes',
    description: 'La grande collection bilingue des textes patristiques, en édition critique.',
    url: 'https://sourceschretiennes.org/',
    logo: '/icons/librairies/sources-chretiennes-chrisme.png',
    couleur: '#8b1720',
    sep: 'rgba(151,30,37,0.36)',
  },
  {
    nom: 'Corpus Christianorum',
    description: 'Les éditions critiques de référence des auteurs chrétiens, de l’Antiquité au Moyen Âge (Brepols).',
    url: 'https://www.brepols.net/series/CC',
    monogramme: 'CC',
    couleur: '#1f5a5a',
    sep: 'rgba(31,90,90,0.34)',
  },
  {
    nom: 'Bibliothèque Augustinienne',
    description: 'Les œuvres de saint Augustin en bilingue latin-français, introduites et annotées.',
    url: 'https://www.brepols.net/series/ba',
    monogramme: 'BA',
    couleur: '#5d3a6e',
    sep: 'rgba(93,58,110,0.34)',
  },
]

export default function LibrairiesPage() {
  return (
    <main style={{ background: 'var(--cs-fond)', minHeight: 'calc(100vh - 3.5rem)', paddingTop: '3.5rem' }}>
      <div style={{ maxWidth: '45rem', margin: '0 auto', padding: '22px 24px 0' }}>
        <div style={{ textAlign: 'center', marginBottom: '18px' }}>
          <h1 style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: TITRE_PAGE, fontWeight: GRAISSE_TITRE, color: ENCRE_TITRE, lineHeight: 1.15, marginBottom: '8px' }}>
            Acheter des livres
          </h1>
          <div style={{ width: '36px', height: '1px', background: 'var(--cs-bord)', margin: '0 auto 10px' }} />
          <p style={{ fontSize: '0.78125rem', color: 'var(--cs-texte-gris)', fontStyle: 'italic', margin: 0 }}>
            Où trouver les textes, en éditions neuves, anciennes ou critiques.
          </p>
        </div>
      </div>

      <div style={{ maxWidth: '41.25rem', margin: '0 auto', padding: '2px 24px 60px' }}>
        <style>{`
          /* La hauteur de rangée se mesure en rem, jamais en pixels. La police racine
             du site grandit avec la fenêtre, jusqu'à un tiers de plus sur un grand
             écran ; une hauteur figée à 80 px laissait donc le texte grossir dans une
             boîte qui, elle, ne bougeait pas, et la rangée paraissait d'autant plus
             serrée que l'écran était large. C'est un plancher et non une hauteur : le
             contenu peut pousser au-delà. Avec l'air intérieur, la liste occupe enfin
             la page, au lieu de laisser un quart de sa hauteur vide en dessous. */
          .lib-row {
            display: flex;
            align-items: center;
            min-height: 6rem;
            box-sizing: border-box;
            padding: 1.125rem 0;
            text-decoration: none;
            border-bottom: 1px solid rgba(var(--cs-bord-rgb),0.55);
            position: relative;
            overflow: hidden;
          }
          .lib-row:first-of-type { border-top: 1px solid rgba(var(--cs-bord-rgb),0.55); }
          .lib-contenu {
            display: flex;
            align-items: center;
            flex: 1;
            min-width: 0;
            transition: opacity 0.18s ease, transform 0.18s ease;
          }
          .lib-row:hover .lib-contenu {
            opacity: 0.06;
            transform: translateX(-10px);
          }
          .lib-survol {
            position: absolute;
            inset: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            opacity: 0;
            pointer-events: none;
            transition: opacity 0.18s ease;
            font-family: var(--font-source-serif), Georgia, serif;
            font-size:0.9375rem;
            letter-spacing: 0.01em;
          }
          .lib-row:hover .lib-survol { opacity: 1; }
          .lib-logo-zone {
            width: 5rem;
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .lib-sep {
            width: 1px;
            height: 3.25rem;
            flex-shrink: 0;
            margin: 0 1.5rem;
          }
          .lib-nom {
            font-family: var(--font-source-serif), Georgia, serif;
            font-size:1.0625rem;
            font-weight: normal;
            margin: 0 0 6px;
            line-height: 1.15;
          }
          .lib-desc {
            font-size:0.75rem;
            color: var(--cs-texte-second);
            margin: 0;
            line-height: 1.45;
          }
          /* Le chevron du site, jamais le glyphe « → » : celui-ci dépend de la police,
             s'y étire en trait long et mince, et ne ressemble à aucune autre flèche du
             site. C'est exactement ce que le composant IconeChevron a été fait pour
             remplacer. La taille se règle ici, en CSS, plutôt qu'au rendu : elle doit
             pouvoir changer d'un écran à l'autre. */
          .lib-fleche {
            margin-left: auto;
            padding-left: 1.5rem;
            flex-shrink: 0;
            opacity: 0.82;
            display: flex;
            align-items: center;
          }
          .lib-fleche svg { width: 14px; height: 14px; }
          /* Mobile : la description s'enroule sur deux ou trois lignes et pousse
             elle-même la rangée au-delà du plancher ; celui-ci redescend donc, et
             l'air intérieur avec lui. Logo et séparateur resserrés : l'écran est
             étroit, et la largeur y vaut plus cher que la hauteur. */
          @media (max-width: 640px) {
            .lib-row { min-height: 4.5rem; padding: 1rem 0; }
            .lib-logo-zone { width: 3.5rem; }
            .lib-sep { height: 2.75rem; margin: 0 0.875rem; }
            .lib-nom { font-size: 1rem; }
            .lib-desc { font-size: 0.71875rem; }
          }

          /* ── Sans curseur, ou sur petit écran : le survol n'a plus lieu d'être ──
             Le dessin de bureau repose sur un survol : le contenu de la rangée s'efface
             presque entièrement (opacité 0,06) et glisse vers la gauche, tandis que
             « Visiter la librairie » paraît par-dessus. Sur un écran tactile il n'y a
             pas de curseur, et le survol que certains navigateurs déclenchent au tap
             fait donc CLIGNOTER la rangée avant la navigation : le nom de la librairie
             s'efface au moment précis où l'on appuie dessus. On éteint le mécanisme.
             À la place, une cible franche à droite, qui montre où l'on va sans rien
             cacher. La couleur vient de la librairie, portée par la rangée en propriété
             CSS (jamais un alpha collé à la teinte : voir la charte, fonction colorMix). */
          @media (hover: none), (max-width: 640px) {
            .lib-row:hover .lib-contenu { opacity: 1; transform: none; }
            .lib-survol { display: none; }
            .lib-fleche {
              margin-left: 12px;
              padding-left: 0;
              width: 56px;
              height: 44px;
              border-radius: 8px;
              display: flex;
              align-items: center;
              justify-content: center;
              opacity: 1;
              border: 1px solid color-mix(in srgb, var(--lib-couleur) 42%, transparent);
              background: color-mix(in srgb, var(--lib-couleur) 8%, transparent);
            }
            /* Le chevron grandit avec le bouton : à 14 px il flotterait dans 56 × 44. */
            .lib-fleche svg { width: 18px; height: 18px; }
          }
        `}</style>
        {LIBRAIRIES.map(lib => (
          <a key={lib.nom} href={lib.url} target="_blank" rel="noopener noreferrer" className="lib-row"
            style={{ '--lib-couleur': lib.couleur } as CSSProperties}>
            <div className="lib-contenu">
              <div className="lib-logo-zone">
                {lib.logo ? (
                  <img src={lib.logo} alt="" aria-hidden style={{ width: '52px', height: 'auto', maxHeight: '48px', objectFit: 'contain' }} />
                ) : (
                  <span aria-hidden style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '1.5rem', fontWeight: 'normal', letterSpacing: '0.04em', color: lib.couleur, opacity: 0.9 }}>{lib.monogramme}</span>
                )}
              </div>
              <div className="lib-sep" style={{ background: lib.sep }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p className="lib-nom" style={{ color: lib.couleur }}>{lib.nom}</p>
                <p className="lib-desc">{lib.description}</p>
              </div>
              <span className="lib-fleche" aria-hidden="true" style={{ color: lib.couleur }}><IconeChevron dir="right" strokeWidth={1.6} /></span>
            </div>
            <span className="lib-survol" style={{ color: lib.couleur }}>
              Visiter la librairie <span style={{ display: 'inline-flex', opacity: 0.7 }}><IconeChevron dir="right" size={12} strokeWidth={1.5} /></span>
            </span>
          </a>
        ))}
      </div>
    </main>
  )
}
