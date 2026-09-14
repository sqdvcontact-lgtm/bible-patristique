/**
 * LES CITATIONS FAVORITES DE « MA PAGE » — un diptyque
 *
 * ⛔ La page publique d'un lecteur ne montre plus, de ce qu'il a retenu, que ses deux
 * citations favorites : une de l'Écriture et une des Pères (décision de l'auteur,
 * 2026-09-14). La liste des passages retenus est retirée.
 *
 * Le composant est PUR, sans crochet ni requête, et c'est ce qui permet à une planche de
 * le rendre hors du navigateur. Tout ce qu'il montre lui arrive composé de l'API
 * (`composerFavorites`, app/lib/citationsFavorites.ts) : il ne décide que de ce qu'on
 * MONTRE d'un passage, et de sa forme.
 *
 * ⚠️ Deux colonnes séparées par un filet, comme les deux volets d'un livre ouvert ; la
 * référence au pied de chacune, si bien que les deux attributions tombent sur la même
 * ligne quelle que soit la longueur des passages. Sous 640 px, elles s'empilent.
 */

import Link from 'next/link'
import { MarqueCitation } from '@/app/components/CitationPreferee'
import { capitaliserInitiale, convertirGuillemetsInternes, preparerTexteCitation } from '@/app/lib/citation'
import { couperAuMot, type CitationFavoritePublique } from '@/app/lib/citationsFavorites'
import { sansAppelsDeNote } from '@/app/lib/appelsDeNote'
import { rendreEnrichi } from '@/app/lib/enrichissements'
import { normaliserEspaces } from '@/app/lib/typographie'
import { rendreTexteEnrichi, texteSansEnrichissement } from '@/app/oeuvre/[id]/texteEnrichi'

/** Ce qu'on montre au plus d'un passage. Deux colonnes se lisent plus courtes qu'une. */
export const EXTRAIT_A_DEUX = 320
export const EXTRAIT_SEUL = 480

/** Au-delà, un texte a un gris : il se justifie et se césure (charte § 3.11). */
export const SEUIL_GRIS = 250

export type ExtraitFavorite = { texte: string; tronque: boolean; dense: boolean }

/**
 * Ce qu'on montre d'un passage : sans appel de note, ponctué comme une citation, et coupé
 * au dernier mot entier quand il est trop long.
 *
 * ⚠️ Un passage entier garde son enrichissement (l'italique de Sacy dit un mot ajouté par
 * le traducteur). Un passage COUPÉ le perd : une coupe peut tomber entre deux marques, et
 * une astérisque orpheline s'imprimerait telle quelle. Il ne prend pas non plus de point
 * final, les points de suspension disant déjà qu'il continue.
 */
export function extraitFavorite(texte: string, max: number): ExtraitFavorite {
  const net = sansAppelsDeNote(texte).replace(/[ \t\r\n]+/g, ' ').trim()
  const plat = texteSansEnrichissement(net)
  if (plat.length <= max) {
    return { texte: preparerTexteCitation(net), tronque: false, dense: plat.length > SEUIL_GRIS }
  }
  const coupe = couperAuMot(plat, max)
  return {
    texte: `${normaliserEspaces(capitaliserInitiale(convertirGuillemetsInternes(coupe)))}…`,
    tronque: true,
    dense: coupe.length > SEUIL_GRIS,
  }
}

const FEUILLE_FAVORITES = `
.profil-favorites {
  margin: 0 0 10px;
  padding: 20px 32px 24px;
  border: 1px solid color-mix(in srgb, var(--cs-or) 28%, transparent);
  border-radius: 8px;
  background: color-mix(in srgb, var(--cs-or) 5%, transparent);
}
.profil-favorites-embleme {
  display: flex; align-items: center; gap: 12px;
  max-width: 160px; margin: 0 auto 20px;
  color: var(--cs-or);
}
.profil-favorites-trait { flex: 1; height: 1px; background: linear-gradient(to right, transparent, var(--cs-or-doux)); }
.profil-favorites-trait--retour { background: linear-gradient(to left, transparent, var(--cs-or-doux)); }
.profil-favorites-diptyque { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); }
.profil-favorites[data-nombre="1"] .profil-favorites-diptyque {
  grid-template-columns: minmax(0, 30rem); justify-content: center;
}
.profil-favorite {
  display: flex; flex-direction: column; min-width: 0;
  padding: 0 26px; color: inherit; text-decoration: none;
}
.profil-favorite:first-child { padding-left: 0; }
.profil-favorite:last-child { padding-right: 0; }
.profil-favorite + .profil-favorite {
  border-left: 1px solid color-mix(in srgb, var(--cs-or) 26%, transparent);
}
/* Le passage est du corpus : sérif, en italique comme une épigraphe. Un mot que
   l'édition met en italique se rend donc en romain.
   Justifier demande une MESURE. Une colonne du diptyque porte une quarantaine de signes
   par ligne : justifiée, elle se creuse de lézardes, et elle voisine une colonne en
   drapeau dès que l'autre passage est court. Elle se compose donc en drapeau, et
   text-wrap: pretty lui évite un mot seul en dernière ligne. Seule la favorite unique
   (30 rem, soixante-dix signes) se justifie au-delà du seuil du gris. */
.profil-favorite-texte {
  margin: 0;
  font-family: var(--font-source-serif), Georgia, serif;
  font-size: 0.9375rem; font-style: italic; line-height: 1.5;
  color: var(--cs-texte-fort);
  overflow-wrap: break-word;
  text-wrap: pretty;
}
.profil-favorite-texte em { font-style: normal; }
.profil-favorites[data-nombre="1"] .profil-favorite-texte[data-dense] {
  text-align: justify; text-justify: inter-word;
  hyphens: auto; -webkit-hyphens: auto;
  word-spacing: -0.025em;
  text-wrap: wrap;
}
/* L'attribution se pose au PIED de sa colonne : les deux tombent sur la même ligne. */
.profil-favorite-attribution {
  margin: auto 0 0; padding-top: 14px;
  font-family: var(--font-source-serif), Georgia, serif; line-height: 1.4;
}
.profil-favorite-attribution::before {
  content: ""; display: block; width: 1.5rem; height: 1px; margin-bottom: 9px;
  background: var(--cs-or-doux);
  transition: width 0.18s ease, background-color 0.18s ease;
}
/* La référence porte seule l'identité du passage : son encre tient le seuil de 4,5. */
.profil-favorite-reference {
  display: block;
  font-size: 0.75rem; font-variant-caps: small-caps; letter-spacing: 0.05em;
  color: var(--cs-texte-fort);
}
.profil-favorite-source {
  display: block; margin-top: 2px;
  font-size: 0.6875rem; color: var(--cs-texte-second);
}
.profil-favorite-source cite { font-style: italic; }
a.profil-favorite:hover .profil-favorite-reference,
a.profil-favorite:focus-visible .profil-favorite-reference {
  text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 2px;
}
a.profil-favorite:hover .profil-favorite-attribution::before,
a.profil-favorite:focus-visible .profil-favorite-attribution::before {
  width: 2.5rem; background: var(--cs-or);
}
@media (prefers-reduced-motion: reduce) {
  .profil-favorite-attribution::before { transition: none; }
}
@media (max-width: 640px) {
  .profil-favorites { padding: 18px 20px 22px; }
  .profil-favorites-diptyque,
  .profil-favorites[data-nombre="1"] .profil-favorites-diptyque { grid-template-columns: minmax(0, 1fr); }
  .profil-favorite,
  .profil-favorite:first-child,
  .profil-favorite:last-child { padding: 0; }
  .profil-favorite + .profil-favorite {
    border-left: none; margin-top: 20px; padding-top: 20px;
    border-top: 1px solid color-mix(in srgb, var(--cs-or) 26%, transparent);
  }
  /* Sur un téléphone, la favorite seule n'a plus sa mesure : elle rejoint le drapeau. */
  .profil-favorites[data-nombre="1"] .profil-favorite-texte[data-dense] {
    text-align: start; hyphens: manual; -webkit-hyphens: manual;
    word-spacing: normal; text-wrap: pretty;
  }
}
`

function Favorite({ citation, max }: { citation: CitationFavoritePublique; max: number }) {
  const extrait = extraitFavorite(citation.texte, max)
  const corps = (
    <>
      <p className="profil-favorite-texte" data-dense={extrait.dense ? '' : undefined}>
        «&#8239;{rendreTexteEnrichi(extrait.texte)}&#8239;»
      </p>
      <p className="profil-favorite-attribution">
        {citation.reference && <span className="profil-favorite-reference">{citation.reference}</span>}
        {(citation.source || citation.lieu) && (
          <span className="profil-favorite-source">
            {citation.source && (citation.type === 'patristique'
              ? <cite>{rendreEnrichi(citation.source)}</cite>
              : rendreEnrichi(citation.source))}
            {citation.source && citation.lieu ? ', ' : null}
            {citation.lieu}
          </span>
        )}
      </p>
    </>
  )
  // ⚠️ Le passage entier mène à sa source quand elle est ouverte : le chapitre pour un
  // verset, l'œuvre au bon segment pour un Père. La référence se souligne au survol.
  return citation.lien
    ? <Link href={citation.lien} className="profil-favorite" data-type={citation.type}>{corps}</Link>
    : <div className="profil-favorite" data-type={citation.type}>{corps}</div>
}

export default function CitationsFavorites({ citations }: { citations: readonly CitationFavoritePublique[] }) {
  if (!citations.length) return null
  const max = citations.length > 1 ? EXTRAIT_A_DEUX : EXTRAIT_SEUL
  return (
    <section className="profil-favorites" data-nombre={citations.length} aria-labelledby="profil-favorites-titre">
      <style>{FEUILLE_FAVORITES}</style>
      <h2 id="profil-favorites-titre" className="cs-hors-ecran">Citations favorites</h2>
      {/* Le quadrilobe est l'enseigne de la citation choisie (charte § 34.2) : la même
          marque que le bouton de choix de « Mes citations ». */}
      <div className="profil-favorites-embleme" aria-hidden="true">
        <span className="profil-favorites-trait" />
        <MarqueCitation taille={22} />
        <span className="profil-favorites-trait profil-favorites-trait--retour" />
      </div>
      <div className="profil-favorites-diptyque">
        {citations.map(c => <Favorite key={c.type} citation={c} max={max} />)}
      </div>
    </section>
  )
}
