import { composerBibliographie } from '@/app/lib/bibleBibliographie'
import { rendreTexteEnrichi } from '@/app/oeuvre/[id]/texteEnrichi'

/**
 * Une note BIBLIOGRAPHIQUE se compose en liste, non en paragraphe suivi.
 *
 * Le genre vient de la donnée — `presentation.style = "bibliographie"` — et de
 * rien d'autre : ⛔ jamais d'une forme reconnue au passage dans le texte. Le
 * composant sert la note du paratexte comme celle de la fenêtre, qui composent
 * autrement leur corps mais doivent composer cette liste de la même manière.
 *
 * `entreeAutonome` sert les pièces matérielles où chaque bloc EST déjà une
 * référence bibliographique complète : aucun tiret artificiel n'a alors besoin
 * d'être injecté dans le texte pour déclencher la composition.
 *
 * ⛔ Aucune puce, aucun tiret : le marqueur de la donnée dit « entrée », il ne
 * s'imprime pas. Les entrées prennent le retrait de première ligne des
 * bibliographies imprimées, et le corps descend d'un cran sous celui qui les
 * accueille — d'où un `em` et non un `rem`, la note et le paratexte n'ayant pas
 * la même mesure.
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
  // Sans entrée, il n'y a pas de liste : l'appelant compose son paragraphe.
  if (entrees.length === 0) return null
  return (
    <div className="cs-bible-bibliographie" lang={lang}>
      {chapeau && <p>{rendreTexteEnrichi(chapeau)}</p>}
      <ul>
        {entrees.map((entree, rang) => (
          <li key={`${rang}:${entree.slice(0, 24)}`}>{rendreTexteEnrichi(entree)}</li>
        ))}
      </ul>
    </div>
  )
}
