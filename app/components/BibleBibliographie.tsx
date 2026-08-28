import { CLASSES_BIBLIOGRAPHIE } from '@/app/lib/apparatBibliographie'
import { composerBibliographie } from '@/app/lib/bibleBibliographie'
import { rendreTexteEnrichi } from '@/app/oeuvre/[id]/texteEnrichi'

/**
 * Une note BIBLIOGRAPHIQUE se compose en liste, non en paragraphe suivi.
 *
 * Le genre vient de la donnée — `presentation.style = "bibliographie"` — et de
 * rien d'autre : ⛔ jamais d'une forme reconnue au passage dans le texte, ⛔
 * jamais du titre de la pièce qui l'accueille. Le composant sert la note du
 * paratexte comme celle de la fenêtre, qui composent autrement leur corps mais
 * doivent composer cette liste de la même manière — d'où la famille commune
 * `.cs-apparat-bibliographie`, celle des listes structurées.
 *
 * `entreeAutonome` sert les pièces matérielles où chaque bloc EST déjà une
 * référence bibliographique complète : aucun tiret artificiel n'a alors besoin
 * d'être injecté dans le texte pour déclencher la composition.
 *
 * ⚠️ REPLI HISTORIQUE. Une bibliographie que la donnée déclare mais qui ne
 * porte pas encore ses entrées — pas de marqueur, rien à découper — n'est pas
 * perdue : elle prend le cadre typographique de la famille et reste un
 * paragraphe. ⛔ On n'en devine ni le titre, ni l'auteur, ni l'éditeur : un
 * texte non structuré n'est pas une notice, et le parser serait le contraire de
 * ce que la charte prescrit.
 *
 * ⛔ Aucune puce, aucun tiret : le marqueur de la donnée dit « entrée », il ne
 * s'imprime pas.
 */
export default function BibliographieBible({
  texte,
  lang,
  entreeAutonome = false,
}: {
  texte: string
  lang?: string
  entreeAutonome?: boolean
}) {
  const { chapeau, entrees } = composerBibliographie(texte, { entreeAutonome })
  // Un bloc vide ne compose rien : l'appelant reprend la main.
  if (!chapeau && entrees.length === 0) return null
  return (
    <div className={CLASSES_BIBLIOGRAPHIE.bloc} lang={lang}>
      {chapeau && <p>{rendreTexteEnrichi(chapeau)}</p>}
      {entrees.length > 0 && (
        <ul className={CLASSES_BIBLIOGRAPHIE.liste}>
          {entrees.map((entree, rang) => (
            <li key={`${rang}:${entree.slice(0, 24)}`} className={CLASSES_BIBLIOGRAPHIE.entree}>
              {rendreTexteEnrichi(entree)}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
