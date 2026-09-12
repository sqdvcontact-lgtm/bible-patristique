import { Fragment } from 'react'
import {
  SEPARATEUR_RENDU,
  STYLE_ENTREE_NOTATION,
  STYLE_LISTE_NOTATION,
  STYLE_NOTATION,
  STYLE_RUBRIQUE_NOTATION,
  STYLE_TETE_NOTATION,
  blancAuDessus,
  lireNotationEdition,
} from '@/app/lib/notationEdition'
import { rendreTexteEnrichi } from '@/app/oeuvre/[id]/texteEnrichi'

/**
 * LA NOTICE D'UNE ÉDITION, COMPOSÉE — prose, rubriques, entrées.
 *
 * Doctrine : charte `parametres.charte_ia`, **§ 5.6.1**. La RÈGLE vit dans
 * `app/lib/notationEdition.ts`, pure et testée ; ce fichier n'en est que le rendu, et il
 * ne décide de rien : ni de ce qui fait une rubrique, ni de ce qui coupe une tête.
 *
 * ⛔ AUCUN CROCHET, et ce n'est pas un rangement : le composant doit se rendre hors du
 * navigateur (`renderToStaticMarkup`) pour que la planche `/admin/styles` le juge tel
 * qu'il paraît. C'est la coupure de `ContenuFicheTraduction` et de `ProposVisite`.
 *
 * ⚠️ Le texte passe par `rendreTexteEnrichi`, qui pose la typographie française et lit
 * `*italique*`, `**gras**`, `++petites capitales++` : une notice d'édition écrit des
 * titres de manuscrits, et elle les compose comme le reste du site.
 */
export default function NotationEdition({ texte }: { texte: string | null | undefined }) {
  const blocs = lireNotationEdition(texte)
  if (!blocs.length) return null

  return (
    <div style={STYLE_NOTATION}>
      {blocs.map((bloc, i) => {
        // ⛔ Le blanc vient du VOISINAGE, non d'un écart de conteneur : une rubrique est
        // cousue à la liste qu'elle nomme, et prend son air au-dessus.
        const marginTop = blancAuDessus(blocs[i - 1] ?? null, bloc)
        if (bloc.type === 'prose') {
          return <p key={`p${i}`} className="cs-notice-prose" style={{ marginTop }}>{rendreTexteEnrichi(bloc.texte)}</p>
        }
        // ⛔ Un `<p>`, jamais un titre de rang : la fiche porte déjà ses titres de section,
        // et une rubrique qui s'y ajouterait comme heading disputerait leur plan.
        if (bloc.type === 'rubrique') {
          return <p key={`r${i}`} style={{ ...STYLE_RUBRIQUE_NOTATION, marginTop }}>{bloc.texte}</p>
        }
        return (
          <ul key={`l${i}`} style={{ ...STYLE_LISTE_NOTATION, marginTop }}>
            {bloc.entrees.map((entree, j) => (
              <li key={j} className="cs-notice-prose" style={STYLE_ENTREE_NOTATION}>
                {entree.tete === null ? rendreTexteEnrichi(entree.corps) : (
                  <Fragment>
                    <span style={STYLE_TETE_NOTATION}>{rendreTexteEnrichi(entree.tete)}</span>
                    {SEPARATEUR_RENDU}
                    {rendreTexteEnrichi(entree.corps)}
                  </Fragment>
                )}
              </li>
            ))}
          </ul>
        )
      })}
    </div>
  )
}
