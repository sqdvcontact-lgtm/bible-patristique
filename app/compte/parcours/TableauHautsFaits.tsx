'use client'

// LE TABLEAU DES HAUTS FAITS — un rayon de reliures.
//
// Décision de l'auteur, 1er septembre 2026, en deux temps. D'abord : « un grand
// tableau de cases à collectionner, dans différents tons harmonieux ; deux états,
// validé et non validé ; les non validées sobres et moches, avec un indice de
// progression ». Puis, la première version rendue et regardée : « ça doit être plus
// souple et plus dans l'esprit du site ; pourquoi ne pas utiliser le style des cartes
// de l'accueil ? le 2/4 est tellement formel ! »
//
// ⛔ UNE CASE GAGNÉE EST UNE RELIURE, UNE CASE EN ATTENTE EST UN EMPLACEMENT VIDE
// SUR LE RAYON. C'est tout le dessin, et il résout ce que la première version ratait.
// Elle opposait un lavis à 8 % de la teinte de famille à un fond crème : mesuré,
// 1,12 contre 1,10 sur la carte — deux nuances de crème, alors qu'on demandait deux
// états francs. Le contraste ne vient plus d'une TEINTE mais d'un RELIEF : la case
// gagnée se pose (dégradé profond, filet clair, ombre portée, liseré de lumière en
// tête, exactement le carton de l'accueil) ; la case en attente se CREUSE (ombre
// interne, fond un cran sous la planche). Les cuirs vivent dans
// `app/lib/reliuresHautsFaits.ts`, sous garde de contraste.
//
// ⛔ PLUS DE CARTE BLANCHE AUTOUR DE CHAQUE SÉRIE. Elles coûtaient 462 px sur les
// 1 144 du tableau — 40 % de sa hauteur en enveloppes —, et l'on ne voyait jamais
// que huit cases sur vingt et une. Une planche continue, les séries nommées par une
// RUBRIQUE, comme le nom de livre en marge du catalogue des péricopes.
//
// ⛔ PLUS AUCUN COMPTE FORMEL. Ni « 2 / 4 » sur la série (le rayon le montre), ni
// « 31 / 50 » sur la case : « 31 passages sur 50 », qui est le mot de l'auteur
// (« 55 versets commentés sur 100 »). Le comptage vit dans `libelleProgression` et
// `libelleCollection`, sous garde.

import type React from 'react'
import {
  familleConnue, libelleCollection, libelleProgression, libelleRestant,
  type DegreEtat, type FamilleCorpus, type Score, type SerieEtat,
} from '@/app/lib/hautsFaits'
import {
  ENCRE_RELIURE, ENCRE_RELIURE_DOUCE, OR_FLEURON, degradeReliure,
} from '@/app/lib/reliuresHautsFaits'

export type Reponse = {
  series: SerieEtat[]
  enVue: string | null
  nouveaux: string[]
  rarete: Record<string, number> | null
  score: Score
  corpus: { auteurs: number; siecles: number; oeuvres: number }
}

/** ⚠️ La famille vient de la base et peut donc être inconnue du code : on retombe
 *  sur l'Écriture plutôt que de rendre une case sans reliure. */
function familleDe(nom: string): FamilleCorpus {
  return familleConnue(nom) ? nom : 'ecriture'
}

/** Le contenu du tableau, séparé de la requête qui l'alimente.
 *
 *  ⛔ Cette coupure n'est pas un rangement. Le site étant fermé, une composition ne
 *  se juge qu'en la rendant hors session, sur une planche : c'est la même règle que
 *  pour `ContenuFicheTraduction` et `ContenuFicheEdition`, et pour la même raison —
 *  un spécimen qui rejouerait la composition de mémoire dériverait au premier
 *  réglage, et ferait ensuite autorité contre la page qu'il décrit.
 *
 *  ⛔ LE THÈME NE SE LIT PAS ICI, ni nulle part en JavaScript : chaque jeton pose
 *  SES DEUX cuirs en propriétés personnalisées et une règle CSS choisit. Décider au
 *  rendu ferait paraître la reliure dans une teinte puis sauter dans l'autre après
 *  l'hydratation — c'est la règle que la charte pose déjà pour les couvertures
 *  d'essai, et c'est aussi ce qui permet à une planche de rendre les deux thèmes. */
export function ContenuHautsFaits({ etat }: { etat: Reponse }) {
  const nouveaux = new Set(etat.nouveaux ?? [])
  // ⛔ UNE SEULE case est désignée comme la plus proche. Sur une planche de vingt et
  // un creux identiques, c'est elle qui donne le premier geste ; deux marques n'en
  // donneraient aucun (charte § 40.4, la parade à l'effondrement post-badge).
  const proche = etat.series.find(s => s.serie === etat.enVue)?.prochain?.code ?? null

  return (
    <>
      <style>{DESSIN}</style>

      <Tableau score={etat.score} series={etat.series} enVue={etat.enVue} />

      {etat.series.map(serie => (
        <section key={serie.serie} id={`serie-${serie.serie}`} className="esp-section hf-serie">
          {/* ⛔ La rubrique porte le NOM et rien d'autre : le rayon montre déjà
              combien de reliures y sont posées, et « 2 / 4 » est un tableur. */}
          <h2>{serie.nom}</h2>
          <div className="hf-rayon">
            {serie.degres.map(c => (
              <CaseHautFait
                key={c.code}
                c={c}
                dernier={c.degre === serie.degres.length}
                nouveau={nouveaux.has(c.code)}
                proche={c.code === proche}
              />
            ))}
          </div>
        </section>
      ))}
    </>
  )
}

// ── La tête : un nombre, puis une phrase ─────────────────────────────────────
function Tableau({ score, series, enVue }: { score: Score; series: SerieEtat[]; enVue: string | null }) {
  const enAvant = series.find(s => s.serie === enVue)
  const reste = enAvant ? libelleRestant(enAvant) : null

  return (
    <header className="hf-tete">
      <p className="hf-score">
        {score.obtenus} <span>point{score.obtenus !== 1 ? 's' : ''}</span>
      </p>
      {/* ⛔ Le total possible n'est PAS annoncé : « sur 390 » dit d'avance où la
          collection s'arrête, et la charte proscrit la liste finie. La barre a
          disparu pour la même raison — le rayon EST la barre. */}
      <p className="hf-phrase">
        {libelleCollection(score)}
        {enAvant && reste && (
          <>
            {' '}Le plus près : <em>{enAvant.prochain?.nom}</em>, dans « {enAvant.nom} ». {reste}
          </>
        )}
        {!enAvant && ' Le tableau s’élargira avec la bibliothèque.'}
      </p>
    </header>
  )
}

// ── Une case ─────────────────────────────────────────────────────────────────
function CaseHautFait({ c, dernier, nouveau, proche }: {
  c: DegreEtat
  dernier: boolean
  nouveau: boolean
  proche: boolean
}) {
  const famille = familleDe(c.famille)

  // ⛔ UNE CARTE NE S'OUVRE PAS, et ce n'est pas un composant qu'on a simplifié :
  // c'est une décision de l'auteur du 1er septembre 2026 — « ne pas ajouter un texte
  // caché ; ou une leçon ». La carte se suffit. Ce n'est donc plus un bouton : un
  // survol qui soulève et un curseur en main promettaient une action qui n'existe
  // pas. Ce qu'un haut fait a de savant à dire, il le dit UNE fois, dans l'annonce,
  // au moment où il tombe — pas en attendant qu'on vienne le déplier.
  return (
    <div
      className={`hf-jeton ${c.obtenu ? 'hf-jeton--relie' : 'hf-jeton--creux'}${proche ? ' hf-jeton--proche' : ''}`}
      style={c.obtenu
        // ⛔ Les DEUX cuirs voyagent ensemble ; c'est la feuille qui tranche selon
        // le thème posé sur la racine. Aucun choix en JavaScript (charte).
        ? {
            '--hf-cuir-clair': degradeReliure(famille, false),
            '--hf-cuir-sombre': degradeReliure(famille, true),
            color: ENCRE_RELIURE,
          } as React.CSSProperties
        // ⚠️ Le jeton en attente prend l'encre de sa famille SEULEMENT s'il est le
        // plus proche : c'est la seule couleur d'un rayon vide, donc la seule qui
        // désigne. Ailleurs, «currentColor» ne sert que le filet.
        : { color: proche ? `var(--cs-${famille})` : 'var(--cs-bord)' }}
    >
      {c.obtenu ? (
        <>
          {/* ⛔ LA FACE S'EFFACE AU SURVOL et l'explication vient à sa place (auteur,
              1er septembre 2026). C'est la mécanique des cartons de l'accueil, où
              `.ac-card-main` tombe à 0,12 d'opacité pour laisser paraître son volet.
              ⚠️ Ce n'est PAS le texte caché qu'il avait refusé la veille : la notice
              se dépliait alors SOUS la série et poussait tout le tableau ; ici elle
              tient dans la carte, sans rien déplacer, et se lit d'un mouvement. */}
          <span className="hf-face">
            {/* Le dernier degré d'une série porte un fleuron, comme un dos poussé à
                l'or. C'est la seule marque de rareté, et elle ne compte rien. */}
            {dernier && <span className="hf-fleuron" aria-hidden="true">❧</span>}
            <span className="hf-nom">{c.nom}</span>
            <span className="hf-pts" style={{ color: ENCRE_RELIURE_DOUCE }}>
              {nouveau ? 'Nouveau' : `${c.points} points`}
            </span>
          </span>
          {/* ⚠️ Elle reste dans le DOCUMENT, à opacité nulle : un lecteur d'écran la
              lit, et c'est le seul moyen qu'elle soit atteignable sans souris. */}
          <span className="hf-explication">{c.notice}</span>
        </>
      ) : (
        <>
          {/* ⛔ Une case en ATTENTE ne montre rien au survol : la notice est la
              récompense, et la donner d'avance la dépenserait. */}
          <span className="hf-nom">{c.nom}</span>
          {/* ⛔ Une case à FAIT UNIQUE — « Au commencement », « Tolle, lege » — ne
              porte ni indice ni filet : il n'y a pas de chemin à mesurer, seulement
              un geste à faire, et une jauge à zéro ou à plein ne dirait rien. Elle
              se reconnaît à ce que `libelleProgression` rend vide. */}
          {libelleProgression(c) && (
            <>
              <span className="hf-mesure">{libelleProgression(c)}</span>
              <span className="hf-filet" aria-hidden="true">
                <i style={{ width: `${Math.round(c.part * 100)}%` }} />
              </span>
            </>
          )}
        </>
      )}
    </div>
  )
}

// ⚠️ Le dessin vit dans un littéral de gabarit : nommer les propriétés entre
// guillemets français, jamais entre accents graves, qui fermeraient la chaîne.
const DESSIN = `
.hf-tete { margin: 0 0 26px; }
.hf-score { font-family: var(--font-source-serif), Georgia, serif; font-size: 1.75rem;
  line-height: 1; color: var(--cs-encre); margin: 0 0 8px; }
.hf-score span { font-family: var(--font-source-sans), Arial, sans-serif;
  font-size: 0.8125rem; color: var(--cs-texte); }
.hf-phrase { font-family: var(--font-source-serif), Georgia, serif; font-size: 0.875rem;
  font-style: italic; color: var(--cs-texte-second); margin: 0; line-height: 1.6; }
.hf-phrase em { font-style: normal; color: var(--cs-encre); }

.hf-serie { margin: 0 0 22px; }
.hf-rubrique { font-family: var(--font-source-sans), Arial, sans-serif; font-size: 0.5625rem;
  font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase;
  color: var(--cs-texte-doux); margin: 0 0 9px; }

/* ⛔ QUATRE COLONNES FIXES, jamais «auto-fill». Toutes les séries n'ont pas quatre
   degrés : sous auto-fill, un rayon de trois s'étire et ses cases n'ont plus la
   largeur de celles du rayon voisin. Une collection se lit en colonnes. */
.hf-rayon { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
@media (max-width: 30rem) { .hf-rayon { grid-template-columns: repeat(2, 1fr); } }

/* ⛔ LE TEXTE EST CENTRÉ, sur les deux axes (auteur, 1er septembre 2026 : « centrer
   le texte, le faire élégant »). C'est la composition du carton de l'accueil, dont
   le groupe icône-titre est centré dans la carte ; et sur une boîte de dix rem, un
   nom de deux lignes au fer laisse un blanc qu'on lit comme un défaut.
   ⛔ NI CURSEUR NI SOULÈVEMENT : la carte ne s'ouvre plus, et un survol qui la
   soulève promettrait une action qui n'existe pas. */
.hf-jeton { position: relative; border-radius: 8px; min-height: 7.5rem;
  padding: 14px 12px; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 4px;
  overflow: hidden; width: 100%; text-align: center;
  border: 1px solid transparent; }

/* Une case gagnée est une RELIURE : le vocabulaire du carton de l'accueil — filet
   clair, ombre portée, liseré de lumière en tête, vignette.
   ⚠️ L'OMBRE, elle, passe par les JETONS d'élévation et non par l'ombre teintée
   de l'accueil : une ombre recopiée dans un second fichier ne suit plus le thème,
   et la garde chromatique l'a refusée à juste titre. Les six jetons existent pour
   cela (charte, «Élévations»). */
.hf-jeton--relie { background: var(--hf-cuir-clair); border-color: rgba(255,255,255,0.10);
  box-shadow: var(--cs-ombre-flottante), inset 0 1px 0 rgba(255,255,255,0.09); }
:root[data-theme="sombre"] .hf-jeton--relie { background: var(--hf-cuir-sombre); }
.hf-jeton--relie::after { content: ""; position: absolute; inset: 0; pointer-events: none;
  background: linear-gradient(to bottom, rgba(255,255,255,0.07) 0%, transparent 45%); }
.hf-jeton--relie .hf-nom, .hf-jeton--relie .hf-pts { position: relative; z-index: 1; }
.hf-jeton--relie .hf-nom { color: inherit; }
/* Le fleuron du dernier degré coiffe le nom, comme l'icône coiffe le titre d'un
   carton de l'accueil. ⚠️ Il était posé en absolu dans un coin, où il ne se voyait
   pas et où il rompait le centrage qu'on vient de poser. */
.hf-fleuron { font-size: 0.75rem; color: ${OR_FLEURON}; z-index: 1;
  position: relative; line-height: 1; margin-bottom: 2px; }

/* ⛔ Une case en attente n'est pas un rectangle plus pâle : c'est un EMPLACEMENT
   VIDE sur le rayon. Elle se CREUSE au lieu de se poser. */
.hf-jeton--creux { background: color-mix(in srgb, var(--cs-texte) 5%, var(--cs-fond));
  border-color: color-mix(in srgb, var(--cs-texte) 9%, var(--cs-fond));
  box-shadow: inset 0 2px 5px rgba(0,0,0,0.07); }
.hf-jeton--creux .hf-nom { color: var(--cs-texte-faible); }
/* La seule case désignée du rayon vide : son filet prend l'encre de sa famille. */
.hf-jeton--proche { border-color: currentColor; }
.hf-jeton--proche .hf-nom { color: var(--cs-texte-second); }

/* ⛔ L'ÉCHANGE DE FACE AU SURVOL, sur le patron des cartons de l'accueil. La face
   tient le flux — c'est elle qui donne sa hauteur à la carte —, l'explication se
   pose PAR-DESSUS en absolu : deux blocs en flux se pousseraient l'un l'autre, et
   la grille se réagencerait au passage du curseur. */
.hf-face { display: flex; flex-direction: column; align-items: center;
  justify-content: center; gap: 4px; position: relative; z-index: 1;
  transition: opacity 0.16s ease; }
.hf-explication { position: absolute; inset: 0; z-index: 2;
  display: flex; align-items: center; justify-content: center;
  padding: 6px 8px; text-align: center;
  font-family: var(--font-source-serif), Georgia, serif; font-size: 0.625rem;
  line-height: 1.35; color: ${ENCRE_RELIURE_DOUCE};
  opacity: 0; transition: opacity 0.16s ease; pointer-events: none; }
/* ⚠️ Sous «(hover: hover)» seulement : au doigt il n'y a pas de survol, et la face
   reste. C'est la règle déjà posée pour la quatrième d'une couverture de
   publication, qui n'est pas même rendue sur un écran tactile. */
@media (hover: hover) {
  .hf-jeton--relie:hover .hf-face { opacity: 0.06; }
  .hf-jeton--relie:hover .hf-explication { opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .hf-face, .hf-explication { transition: none; }
}

.hf-nom { font-family: var(--font-source-serif), Georgia, serif; font-size: 0.84375rem;
  line-height: 1.25; }
.hf-pts { font-family: var(--font-source-serif), Georgia, serif; font-size: 0.6875rem;
  font-style: italic; }
.hf-mesure { font-family: var(--font-source-serif), Georgia, serif; font-size: 0.6875rem;
  font-style: italic; color: var(--cs-texte-gris); }
/* ⚠️ Le filet ne court plus d'un bord à l'autre : sur une carte centrée, un trait
   qui touche les deux marges tire l'œil hors du groupe. Il en prend la moitié. */
.hf-filet { display: block; height: 2px; border-radius: 999px; margin-top: 4px;
  width: 52%; background: color-mix(in srgb, var(--cs-texte) 10%, transparent); }
.hf-filet i { display: block; height: 100%; border-radius: 999px; background: var(--cs-texte-faible); }

`
