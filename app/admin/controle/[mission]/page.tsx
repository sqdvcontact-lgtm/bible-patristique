import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import MatiereMission from '../MatiereMission'
import TodosControle from '../TodosControle'
import { chargerFicheMission, chargerMissions, estAdminDeLaRequete } from '../chargementsControle'
import { adresseDeMission, comptesDesTaches } from '../missions'
import { EcranReserve, PanneChargement, dateFr, nb } from '../piecesControle'

export const dynamic = 'force-dynamic'

type Proprietes = { params: Promise<{ mission: string }> }

export async function generateMetadata({ params }: Proprietes): Promise<Metadata> {
  if (!(await estAdminDeLaRequete())) return { title: 'Centre de contrôle' }
  const { mission: cle } = await params
  const { missions } = await chargerMissions()
  const mission = missions.find((entree) => entree.cle === cle)
  return { title: mission ? `${mission.titre} · Centre de contrôle` : 'Centre de contrôle' }
}

function dire(n: number, singulier: string, pluriel: string): string {
  return `${nb(n)} ${n > 1 ? pluriel : singulier}`
}

function sousTitre(comptes: ReturnType<typeof comptesDesTaches>): string {
  if (comptes.total === 0) return 'Aucune tâche inscrite.'
  const faites = comptes.faites === 0 ? 'aucune faite' : `dont ${dire(comptes.faites, 'faite', 'faites')}`
  const enCours = comptes.enCours > 0 ? ` et ${nb(comptes.enCours)} en cours` : ''
  return `${dire(comptes.total, 'tâche', 'tâches')}, ${faites}${enCours}.`
}

// Une mission du centre de contrôle : sa matière propre, sa note et ses tâches.
//
// La note et les tâches se lisent d'une seule ligne de `controle_sections` ; les chiffres, qui
// agrègent le corpus entier, se font attendre dans leur propre frontière de flux, et une
// mission se lit donc avant qu'ils soient calculés.
export default async function PageMission({ params }: Proprietes) {
  if (!(await estAdminDeLaRequete())) return <EcranReserve />

  const { mission: cle } = await params
  const [{ missions }, { fiche, erreur }] = await Promise.all([chargerMissions(), chargerFicheMission(cle)])
  const mission = missions.find((entree) => entree.cle === cle)
  if (!mission) notFound()

  const comptes = comptesDesTaches(fiche?.todos)
  const tenueEnBase = mission.enBase && fiche !== null

  return (
    <>
      <header className="cv-entete">
        <h1 className="cc-titre">{mission.titre}</h1>
        <p className="cc-sous-titre">
          {mission.enBase ? sousTitre(comptes) : 'Outil de contrôle, sans note ni tâches.'}
        </p>
      </header>

      {erreur ? (
        <PanneChargement
          titre="La note et les tâches n’ont pas pu être lues"
          explication="La lecture de la table controle_sections a échoué. Le détail technique est ci-dessous."
          erreur={erreur}
          reessayer={adresseDeMission(mission.cle)}
        />
      ) : (
        <section className="cc-carte cv-mission" aria-label={mission.titre}>
          <MatiereMission cle={mission.cle} />

          {fiche?.commentaire_ia && (
            <div className="cc-note">
              <div className="cc-note-tete">Où en est-on ?</div>
              <p className="cc-note-txt">{fiche.commentaire_ia}</p>
            </div>
          )}

          {tenueEnBase && <TodosControle cle={mission.cle} initial={fiche?.todos ?? []} />}

          {fiche?.maj_le && <div className="cc-carte-pied">Note mise à jour le {dateFr(fiche.maj_le)}</div>}
        </section>
      )}
    </>
  )
}
