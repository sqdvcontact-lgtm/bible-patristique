import Link from 'next/link'
import { clientAtelier, mesurerLeGrain, type GrainDUnEnsemble } from '@/app/admin/alignements/chargementAtelier'
import { LIMITE_EMPAN, REPERE_EMPAN } from '@/app/lib/grainAlignement'

const nb = (n: number) => n.toLocaleString('fr-FR')

// Le grain des alignements, ensemble par ensemble (charte § 12.2).
//
// ⛔ La mesure est celle de l'atelier — `mesurerLeGrain`, donc `bilanDuGrain` sur la
// fonction de mesure en base — et non une requête écrite ici : le contrôle ne certifie
// que ce que l'atelier corrige. Elle vit dans sa propre frontière de flux : quelques
// secondes sur la Somme, et une panne n'emporte que cette section.
export default async function GrainEnsembles() {
  let grains: GrainDUnEnsemble[] = []
  let erreur: string | null = null
  try {
    grains = await mesurerLeGrain(clientAtelier())
  } catch (e) {
    erreur = (e as { message?: string })?.message ?? String(e)
    console.error('[controle] grain des alignements :', e)
  }

  return (
    <section className="cc-carte cv-section" id="grain-alignements">
      <h2 className="cc-carte-titre">Grain des alignements</h2>
      <p className="cv-sous">
        Par ensemble et par colonne traduite : les groupes au-dessus du repère ({nb(REPERE_EMPAN)} signes),
        au-delà de la limite ({nb(LIMITE_EMPAN)}), ceux qui enjambent un paragraphe traduit, et ceux dont le
        paragraphe est inconnu. Ils se corrigent dans l’atelier d’alignement.
      </p>
      <div className="cc-carte-corps">
        {erreur ? (
          <p className="cv-vide">La mesure n’a pas pu se faire&nbsp;: {erreur}</p>
        ) : grains.length === 0 ? (
          <p className="cv-vide">Aucun ensemble d’alignement en service.</p>
        ) : (
          <table className="cv-tableau">
            <thead>
              <tr>
                <th>Ensemble</th>
                <th>Colonne</th>
                <th className="cv-num">Groupes</th>
                <th className="cv-num">&gt;&nbsp;{nb(REPERE_EMPAN)}</th>
                <th className="cv-num">&gt;&nbsp;{nb(LIMITE_EMPAN)}</th>
                <th className="cv-num">À cheval</th>
                <th className="cv-num">Paragraphe inconnu</th>
                <th>Lecture</th>
              </tr>
            </thead>
            <tbody>
              {grains.flatMap(({ ensemble, colonnes, erreur: echec }) => {
                const lien = (
                  <Link href={`/admin/alignements?ensemble=${encodeURIComponent(ensemble.alignmentSetId)}`}>
                    {ensemble.titreOeuvre}
                  </Link>
                )
                if (echec || colonnes.length === 0) {
                  return [
                    <tr key={ensemble.alignmentSetId}>
                      <td>{lien}</td>
                      <td colSpan={7} className="cv-vide">{echec ? `Mesure en échec : ${echec}` : 'Aucune colonne traduite.'}</td>
                    </tr>,
                  ]
                }
                return colonnes.map((c, i) => (
                  <tr key={`${ensemble.alignmentSetId}|${c.idTexte}`}>
                    <td>{i === 0 ? lien : null}</td>
                    <td>{c.libelle}</td>
                    <td className="cv-num">{nb(c.bilan.empans)}</td>
                    <td className="cv-num">{nb(c.bilan.auDessusDuRepere)}</td>
                    <td className="cv-num">{c.bilan.tropLong > 0 ? <strong>{nb(c.bilan.tropLong)}</strong> : 0}</td>
                    <td className="cv-num">{c.bilan.aCheval > 0 ? <strong>{nb(c.bilan.aCheval)}</strong> : 0}</td>
                    <td className="cv-num">{nb(c.bilan.paragrapheInconnu)}</td>
                    <td>{ensemble.porteLaLecture ? 'porte la lecture' : '—'}</td>
                  </tr>
                ))
              })}
            </tbody>
          </table>
        )}
      </div>
      <div className="cc-mention">
        Un groupe à cheval défait ce que l’alignement établit ; un groupe trop long tient la frontière mais ne se
        lit plus en regard. Un paragraphe inconnu est un défaut de donnée, jamais une frontière franchie.
      </div>
    </section>
  )
}
