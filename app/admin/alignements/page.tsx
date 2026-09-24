import Link from 'next/link'
import { estAdminDeLaRequete } from '@/app/admin/gardeAdmin'
import { EcranReserve } from '@/app/admin/controle/piecesControle'
import {
  cleDivision,
  degreDeLEmpan,
  divisionsMesurees,
  empansDesMesures,
  lireCleDivision,
} from '@/app/lib/atelierAlignement'
import { bilanDuGrain, LIMITE_EMPAN, REPERE_EMPAN } from '@/app/lib/grainAlignement'
import { chargerDivision, chargerEnsembles, chargerMesures, clientAtelier, type EnsembleAtelier } from './chargementAtelier'
import { CSS_ATELIER } from './stylesAtelier'
import AtelierDivision from './AtelierDivision'

export const metadata = { title: 'Atelier d’alignement' }
export const dynamic = 'force-dynamic'

const nb = (n: number) => n.toLocaleString('fr-FR')

type Params = Promise<{ ensemble?: string; division?: string; tout?: string }>

// L'atelier d'alignement : poser une frontière à la main (charte § 12.2, règle 2).
//
// Trois étages, d'une même page : la liste des ensembles ; un ensemble, son grain et
// ses divisions à revoir ; une division, ses groupes en deux colonnes, qu'on coupe ou
// qu'on fusionne. ⛔ Le site ne faisait que LIRE les trois tables d'alignement : c'est
// ici, et seulement ici, qu'on y écrit, par `/api/admin/alignements`.
export default async function PageAtelierAlignement({ searchParams }: { searchParams: Params }) {
  if (!(await estAdminDeLaRequete())) return <EcranReserve />
  const sp = await searchParams
  const db = clientAtelier()

  let ensembles: EnsembleAtelier[] = []
  let erreur: string | null = null
  try {
    ensembles = await chargerEnsembles(db)
  } catch (e) {
    erreur = (e as { message?: string })?.message ?? String(e)
  }
  const choisi = sp.ensemble ? ensembles.find(e => e.alignmentSetId === sp.ensemble) ?? null : null

  return (
    <main className="atl-page">
      <style>{CSS_ATELIER}</style>
      {choisi && <Link href="/admin/alignements" className="atl-retour">← Tous les ensembles</Link>}
      <h1 className="atl-titre">Atelier d’alignement</h1>
      <p className="atl-sous-titre">
        Le paragraphe de l’édition traduite fait loi, et l’empan reste bref&nbsp;: environ {nb(REPERE_EMPAN)} signes,
        {' '}{nb(LIMITE_EMPAN)} au plus. On coupe un groupe à une jonction de segments, on fusionne deux groupes voisins.
        La langue originale n’oppose aucune frontière.
      </p>
      {erreur && <p className="atl-message atl-message--erreur">Les ensembles n’ont pas pu être lus&nbsp;: {erreur}</p>}
      {!erreur && !choisi && <ListeEnsembles ensembles={ensembles} demande={sp.ensemble} />}
      {choisi && <VueEnsemble ensemble={choisi} division={sp.division} tout={sp.tout === '1'} db={db} />}
    </main>
  )
}

function ListeEnsembles({ ensembles, demande }: { ensembles: EnsembleAtelier[]; demande?: string }) {
  const actifs = ensembles.filter(e => e.status !== 'retired')
  const retires = ensembles.filter(e => e.status === 'retired')
  return (
    <>
      {demande && <p className="atl-message atl-message--erreur">Cet ensemble est introuvable.</p>}
      <p className="atl-rubrique">Ensembles d’alignement</p>
      <TableauEnsembles ensembles={actifs} />
      {retires.length > 0 && (
        <>
          <p className="atl-rubrique">Retirés</p>
          <TableauEnsembles ensembles={retires} />
        </>
      )}
    </>
  )
}

function TableauEnsembles({ ensembles }: { ensembles: EnsembleAtelier[] }) {
  return (
    <table className="atl-tableau">
      <thead>
        <tr>
          <th>Œuvre</th>
          <th>Ensemble</th>
          <th>Traduction</th>
          <th>Niveau</th>
          <th>Statut</th>
          <th className="atl-num">Groupes</th>
          <th>Lecture</th>
        </tr>
      </thead>
      <tbody>
        {ensembles.map(e => {
          const traduit = e.roleTraduit === 'reference' ? e.reference : e.aligned
          return (
            <tr key={e.alignmentSetId}>
              <td>{e.titreOeuvre}</td>
              <td>
                <Link href={`/admin/alignements?ensemble=${encodeURIComponent(e.alignmentSetId)}`}>
                  <span className="atl-code">{e.alignmentSetId}</span>
                </Link>
              </td>
              <td>{traduit.libelle}</td>
              <td>{e.alignmentLevel ?? '—'}</td>
              <td>{e.status}</td>
              <td className="atl-num">{nb(e.groupes)}</td>
              <td>{e.porteLaLecture ? 'porte la lecture' : '—'}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function Tuile({ valeur, libelle, alerte = false }: { valeur: string; libelle: string; alerte?: boolean }) {
  return (
    <div className={`atl-tuile${alerte ? ' atl-tuile--alerte' : ''}`}>
      <span className="atl-tuile-val">{valeur}</span>
      <span className="atl-tuile-lbl">{libelle}</span>
    </div>
  )
}

async function VueEnsemble({ ensemble, division, tout, db }: {
  ensemble: EnsembleAtelier
  division?: string
  tout: boolean
  db: ReturnType<typeof clientAtelier>
}) {
  const traduit = ensemble.roleTraduit === 'reference' ? ensemble.reference : ensemble.aligned
  const original = ensemble.roleTraduit === 'reference' ? ensemble.aligned : ensemble.reference
  const base = `/admin/alignements?ensemble=${encodeURIComponent(ensemble.alignmentSetId)}`

  let lignes: Awaited<ReturnType<typeof chargerMesures>> = []
  let erreur: string | null = null
  try {
    lignes = await chargerMesures(db, ensemble.alignmentSetId, traduit.idTexte)
  } catch (e) {
    erreur = (e as { message?: string })?.message ?? String(e)
  }
  const empans = empansDesMesures(lignes)
  const bilan = bilanDuGrain(empans)
  const divisions = divisionsMesurees(lignes, empans)
  const montrees = tout ? divisions : divisions.filter(d => d.aRevoir > 0)
  const retenue = lireCleDivision(division)
  const rang = retenue ? divisions.findIndex(d => d.book === retenue.book && d.division === retenue.division) : -1
  let groupes: Awaited<ReturnType<typeof chargerDivision>> = []
  let erreurDivision: string | null = null
  if (retenue) {
    try {
      groupes = await chargerDivision(db, ensemble, retenue.book, retenue.division)
    } catch (e) {
      erreurDivision = (e as { message?: string })?.message ?? String(e)
    }
  }
  const lienDivision = (i: number) => {
    const d = divisions[i]
    return d ? `${base}&division=${cleDivision(d.book, d.division)}${tout ? '&tout=1' : ''}` : null
  }
  const precedente = rang > 0 ? lienDivision(rang - 1) : null
  const suivante = rang >= 0 ? lienDivision(rang + 1) : null

  return (
    <>
      <p className="atl-rubrique">{ensemble.titreOeuvre}</p>
      <p className="atl-code">{ensemble.alignmentSetId} · {ensemble.alignmentLevel ?? 'niveau non déclaré'} · {ensemble.status}</p>
      <p className="atl-sous-titre">
        Texte traduit&nbsp;: {traduit.libelle}{traduit.isPublic ? '' : ' (non publié)'}.
        {' '}En regard&nbsp;: {original.libelle}{original.isPublic ? '' : ' (non publié)'}.
        {ensemble.porteLaLecture ? ' Cet ensemble porte la lecture en regard du site.' : ' Cet ensemble ne porte aucune lecture en regard du site.'}
      </p>

      {erreur ? (
        <p className="atl-message atl-message--erreur">La mesure n’a pas pu se faire&nbsp;: {erreur}</p>
      ) : (
        <div className="atl-tuiles">
          <Tuile valeur={nb(bilan.empans)} libelle="groupes mesurés" />
          <Tuile valeur={nb(bilan.aCheval)} libelle="enjambent un paragraphe" alerte={bilan.aCheval > 0} />
          <Tuile valeur={nb(bilan.tropLong)} libelle={`au-delà de ${nb(LIMITE_EMPAN)} signes`} alerte={bilan.tropLong > 0} />
          <Tuile valeur={nb(bilan.auDessusDuRepere)} libelle={`au-dessus de ${nb(REPERE_EMPAN)} signes`} />
          <Tuile valeur={nb(bilan.paragrapheInconnu)} libelle="à paragraphe inconnu" />
          <Tuile valeur={nb(bilan.medianeSignes)} libelle="signes, médiane" />
          <Tuile valeur={nb(bilan.maxSignes)} libelle="signes, le plus long" />
        </div>
      )}

      <p className="atl-rubrique">
        {tout ? 'Toutes les divisions' : 'Divisions à revoir'} · <Link href={tout ? base : `${base}&tout=1`} className="atl-retour">
          {tout ? 'ne montrer que les divisions à revoir' : 'montrer toutes les divisions'}
        </Link>
      </p>
      {montrees.length === 0 && !erreur && <p className="atl-sous-titre">Aucune division à revoir dans cet ensemble.</p>}
      <nav className="atl-divisions" aria-label="Divisions de l’ensemble">
        {montrees.map(d => {
          const active = retenue?.book === d.book && retenue.division === d.division
          const degre = d.aCheval > 0 ? 'a-cheval' : degreDeLEmpan({ aCheval: false, signes: d.maxSignes })
          return (
            <Link
              key={cleDivision(d.book, d.division)}
              href={`${base}&division=${cleDivision(d.book, d.division)}${tout ? '&tout=1' : ''}`}
              className={`atl-division${active ? ' atl-division--active' : ''}`}
              aria-current={active ? 'page' : undefined}
            >
              <span className="atl-division-libelle">{d.libelle}</span>
              {degre && <span className={`atl-degre atl-degre--${degre}`}>{d.aRevoir} à revoir</span>}
              <span className="atl-division-compte">{nb(d.groupes)} groupes · {nb(d.maxSignes)} signes au plus</span>
            </Link>
          )
        })}
      </nav>

      {retenue && (
        <>
          <p className="atl-rubrique">{rang >= 0 ? divisions[rang].libelle : `Livre ${retenue.book}, division ${retenue.division}`}</p>
          <div className="atl-nav">
            {precedente ? <Link href={precedente}>← Division précédente</Link> : <span />}
            {suivante ? <Link href={suivante}>Division suivante →</Link> : <span />}
          </div>
          {erreurDivision && <p className="atl-message atl-message--erreur">La division n’a pas pu être lue&nbsp;: {erreurDivision}</p>}
          <AtelierDivision
            key={`${ensemble.alignmentSetId}|${cleDivision(retenue.book, retenue.division)}`}
            ensemble={ensemble.alignmentSetId}
            libelleTraduit={traduit.libelle}
            libelleOriginal={original.libelle}
            groupes={groupes}
          />
        </>
      )}
    </>
  )
}
