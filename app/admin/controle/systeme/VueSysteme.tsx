// L'état du système de contrôle v2 : ce que le contrat compact du backend certifie.
//
// Toute la matière vient d'un seul appel, `controle_v2_admin_snapshot()`, et rien ne se
// recalcule ici (charte § 30.2) : le contrôle certifie, l'écran affiche.
import type { ReactNode } from 'react'
import {
  INTITULES_GROUPES,
  SEVERITES,
  ageLisible,
  comptesParSeverite,
  decisionsConnues,
  estFrais,
  etatGeneral,
  grouperAmbiguites,
  lireSnapshot,
  sectionsControle,
  teinteEtat,
  teinteGravite,
  teinteSeverite,
  totauxAlignements,
  type Constat,
  type DiagnosticAlignement,
  type GroupeSection,
  type Severite,
  type Snapshot,
} from '../snapshotV2'
import { CODE_DELAI_DEPASSE, chargerSnapshot } from '../chargementsControle'
import { ADRESSE_SYSTEME } from '../missions'
import { PanneChargement, dateFr, dateHeureFr, nb } from '../piecesControle'

/**
 * Trois rangs, et un chiffre ne dépasse jamais le titre qui l'organise.
 *
 * `action` pour ce qui appelle un geste, `contexte` pour ce qui décrit, `normal`
 * entre les deux. Les rangs se séparent sur DEUX axes, la taille et l'encre :
 * une seule différence de corps ne se voit pas dans une grille de trente tuiles.
 */
type RangTuile = 'action' | 'normal' | 'contexte'

function Tuile({
  valeur,
  label,
  ton,
  rang = 'normal',
}: {
  valeur: string
  label: string
  ton?: 'danger' | 'vert' | 'or'
  rang?: RangTuile
}) {
  const couleur =
    ton === 'danger' ? 'var(--cs-danger)'
      : ton === 'vert' ? 'var(--cs-vert)'
        : ton === 'or' ? 'var(--cs-or)'
          : rang === 'contexte' ? 'var(--cs-texte-second)' : 'var(--cs-encre-fonce)'
  return (
    <div className={`cc-tuile cv-tuile--${rang}`}>
      <div className="cc-tuile-val" style={{ color: couleur }}>{valeur}</div>
      <div className="cc-tuile-lbl">{label}</div>
    </div>
  )
}

function Carte({ id, titre, sous, children }: { id: string; titre: string; sous?: string; children: ReactNode }) {
  return (
    <section className="cc-carte cv-section" id={id}>
      <h2 className="cc-carte-titre">{titre}</h2>
      {sous && <p className="cv-sous">{sous}</p>}
      <div className="cc-carte-corps">{children}</div>
    </section>
  )
}

/** Les détails d'un constat sont un objet libre : on le dit en clair, sans JSON. */
function detailConstat(constat: Constat): string {
  const details = constat.details ?? {}
  const morceaux = Object.entries(details).map(([cle, valeur]) => {
    const dit = Array.isArray(valeur) ? valeur.join(', ') : String(valeur)
    return `${cle.replaceAll('_', ' ')} : ${dit}`
  })
  return morceaux.join(' ; ')
}

// ── La tête : verdict, sévérités, sommaire ───────────────────────────────────

const GROUPES: GroupeSection[] = ['traiter', 'tient', 'contexte']

function TeteSysteme({ snapshot }: { snapshot: Snapshot }) {
  const etat = etatGeneral(snapshot)
  const comptes = comptesParSeverite(snapshot.last_run)
  const sections = sectionsControle(snapshot)
  return (
    <section className="cc-carte cv-sys-tete" aria-label="Verdict du contrôle v2">
      <div className="cv-sys-verdict">
        <div className="cv-verdict" style={{ borderLeftColor: teinteEtat(etat.code) }}>
          <div className="cv-verdict-titre" style={{ color: teinteEtat(etat.code) }}>{etat.libelle}</div>
          <p className="cv-verdict-phrase">{etat.phrase}</p>
        </div>

        <ul className="cv-severites">
          {SEVERITES.map((severite) => (
            <li key={severite}>
              <span className="cv-sev-val" style={{ color: comptes[severite] > 0 ? teinteSeverite(severite) : 'var(--cs-texte-faible)' }}>
                {nb(comptes[severite])}
              </span>
              <span className="cv-sev-lbl">{severite}</span>
            </li>
          ))}
        </ul>
      </div>

      <nav className="cv-sys-nav" aria-label="Sections de l’état du contrôle">
        {GROUPES.map((groupe) => (
          <div className="cv-nav-groupe" key={groupe}>
            <div className="cv-nav-tete">{INTITULES_GROUPES[groupe]}</div>
            <ul>
              {sections.filter((section) => section.groupe === groupe).map((section) => (
                <li key={section.id}>
                  <a href={`#${section.id}`} className="cv-nav-lien">
                    <span className="cv-puce" style={{ background: teinteGravite(section.gravite) }} />
                    <span className="cv-nav-titre">{section.titre}</span>
                    <span className="cv-nav-chiffre">{section.chiffre}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="cc-mention">
        Backend v{snapshot.backend_version}, snapshot de {dateHeureFr(snapshot.generated_at).replace(/^.*à /, '')},
        métriques calculées {ageLisible(snapshot.cache_age_seconds)}.
      </div>
    </section>
  )
}

// ── Les sections ─────────────────────────────────────────────────────────────

function SectionDernierRun({ snapshot }: { snapshot: Snapshot }) {
  const run = snapshot.last_run
  const comptes = comptesParSeverite(run)
  const constats = run?.findings ?? []
  return (
    <Carte id="dernier-run" titre="Dernier run global" sous={`Lancé le ${dateHeureFr(run?.started_at)}, backend v${snapshot.backend_version}.`}>
      {constats.length > 0 ? (
        <ul className="cv-liste">
          {constats.map((constat, index) => (
            <li key={`${constat.rule_code}-${index}`} className="cv-ligne">
              <span className="cv-puce" style={{ background: teinteSeverite(constat.severity as Severite) }} />
              <div>
                <div className="cv-ligne-titre">{constat.rule_code}</div>
                <div className="cv-ligne-detail">{detailConstat(constat) || 'Aucun détail transmis.'}</div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="cv-vide">Aucun constat ouvert.</p>
      )}
      <div className="cc-mention">
        {SEVERITES.map((severite) => `${nb(comptes[severite])} ${severite}`).join(' · ')}.
      </div>
    </Carte>
  )
}

function SectionFileLiens({ snapshot }: { snapshot: Snapshot }) {
  const file = snapshot.link_review_queue
  const proprietaires = snapshot.postcheck_owners ?? []
  if (!file) return null
  return (
    <Carte
      id="file-liens"
      titre="File des postcontrôles de liens"
      sous="Chaque modification suivie garde ses liens dépendants ouverts tant qu’une vérification humaine ne les a pas clos."
    >
      <div className="cc-tuiles">
        <Tuile valeur={nb(file.checks)} label="Postcontrôles ouverts" rang="action" ton={file.checks > 0 ? 'or' : 'vert'} />
        <Tuile valeur={nb(file.dependent_links)} label="Liens dépendants" />
        <Tuile valeur={nb(file.structural_invalid)} label="Structurellement invalides" rang={file.structural_invalid > 0 ? 'action' : 'contexte'} ton={file.structural_invalid > 0 ? 'danger' : undefined} />
        <Tuile valeur={nb(file.bootstrap_checks)} label="Bootstrap" rang="contexte" />
        <Tuile valeur={nb(file.post_go_live_checks)} label="Après go-live" rang="contexte" />
      </div>

      <div className="cv-tete-tableau">Répartition par mission propriétaire</div>
      <table className="cv-tableau">
        <thead>
          <tr>
            <th>Mission</th>
            <th className="cv-num">Contrôles</th>
            <th className="cv-num">Liens</th>
            <th>Routage</th>
          </tr>
        </thead>
        <tbody>
          {proprietaires.map((proprietaire, index) => (
            <tr key={`${proprietaire.routing_status}-${index}`}>
              <td>{proprietaire.missions.join(' ou ')}</td>
              <td className="cv-num">{nb(proprietaire.checks)}</td>
              <td className="cv-num">{nb(proprietaire.dependent_links)}</td>
              <td className="cv-routage">
                <span style={{ color: proprietaire.routing_status === 'routed' ? 'var(--cs-vert)' : 'var(--cs-danger)' }}>
                  {proprietaire.routing_status === 'routed' ? 'routé' : proprietaire.routing_status === 'ambiguous' ? 'ambigu' : proprietaire.routing_status}
                </span>
              </td>
            </tr>
          ))}
          {proprietaires.length === 0 && (
            <tr><td colSpan={4} className="cv-vide">Aucun postcontrôle ouvert.</td></tr>
          )}
        </tbody>
      </table>
    </Carte>
  )
}

function SectionAmbiguites({ snapshot }: { snapshot: Snapshot }) {
  const ambiguites = snapshot.routing_ambiguities ?? []
  const groupes = grouperAmbiguites(ambiguites)
  return (
    <Carte
      id="ambigus"
      titre="Objets à propriétaire ambigu"
      sous="Plusieurs missions revendiquent le même objet. L’arbitrage revient à l’utilisateur, et aucune attribution ne doit être décidée ici."
    >
      {groupes.length === 0 ? (
        <p className="cv-vide">Aucun objet ambigu.</p>
      ) : (
        <>
          <div className="cc-tuiles">
            <Tuile valeur={nb(ambiguites.length)} label="Objets revendiqués" rang="action" ton="danger" />
            <Tuile valeur={nb(groupes.reduce((total, groupe) => total + groupe.liens, 0))} label="Liens dépendants" />
            <Tuile valeur={nb(groupes.length)} label="Conflits de missions" rang="contexte" />
          </div>
          <ul className="cv-liste">
            {groupes.map((groupe) => (
              <li key={groupe.missions.join('|')} className="cv-ligne">
                <span className="cv-puce" style={{ background: 'var(--cs-danger)' }} />
                <div>
                  <div className="cv-ligne-titre">{groupe.missions.join(' ou ')}</div>
                  <div className="cv-ligne-detail">
                    {nb(groupe.objets)} objet{groupe.objets > 1 ? 's' : ''} revendiqué{groupe.objets > 1 ? 's' : ''},
                    {' '}{nb(groupe.liens)} lien{groupe.liens > 1 ? 's' : ''} dépendant{groupe.liens > 1 ? 's' : ''},
                    dernière modification le {dateHeureFr(groupe.dernier)}.
                  </div>
                  <div className="cv-ligne-detail">
                    {groupe.exemples.map((exemple) => `${exemple.object_type} ${exemple.object_id}`).join(', ')}
                    {groupe.objets > groupe.exemples.length ? `, et ${nb(groupe.objets - groupe.exemples.length)} autres.` : '.'}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </Carte>
  )
}

function LigneDiagnostic({ diagnostic, snapshot }: { diagnostic: DiagnosticAlignement; snapshot: Snapshot }) {
  const frais = estFrais(diagnostic)
  const decisions = decisionsConnues(snapshot.alignment_review_memory, diagnostic.book_code)
  return (
    <li className="cv-ligne">
      <span className="cv-puce" style={{ background: frais ? 'var(--cs-vert)' : 'var(--cs-or)' }} />
      <div>
        <div className="cv-ligne-titre">
          {diagnostic.book_code}
          <span className="cv-etiquette" style={{ color: frais ? 'var(--cs-vert)' : 'var(--cs-or)' }}>
            {frais ? 'à jour' : 'périmé'}
          </span>
        </div>
        <div className="cv-ligne-detail">
          {nb(diagnostic.cases.total)} dossiers, dont {nb(diagnostic.cases.high)} haute priorité, {nb(diagnostic.cases.medium)} moyenne et {nb(diagnostic.cases.low)} basse.
          {' '}Calculé le {dateHeureFr(diagnostic.created_at)} par {diagnostic.script_version ?? 'version inconnue'}.
        </div>
        <div className="cv-ligne-detail">
          {frais
            ? `Empreinte capturée ${diagnostic.captured_fingerprint?.slice(0, 12)}, identique à celle du corpus.`
            : `Empreinte du corpus ${diagnostic.current_fingerprint?.slice(0, 12) ?? 'inconnue'}, aucune empreinte capturée${diagnostic.stale_reason ? ` (${diagnostic.stale_reason})` : ''}. Seul un vrai rerun peut le rendre frais.`}
        </div>
        {decisions.length > 0 && (
          <div className="cv-ligne-detail">
            Décisions humaines déjà connues : {decisions.map((decision) => `${decision.n} ${decision.code}`).join(', ')}.
            Elles servent de contexte et ne s’appliquent jamais d’elles-mêmes au nouveau résultat.
          </div>
        )}
      </div>
    </li>
  )
}

function SectionAlignements({ snapshot }: { snapshot: Snapshot }) {
  const outils = snapshot.metrics.alignment_tools
  const diagnostics = snapshot.alignment_diagnostics ?? []
  const memoire = snapshot.alignment_review_memory
  // Les totaux viennent des runs courants, calculés à l'appel, et non du cache
  // de métriques : une heure après un rerun, le cache annonçait encore les
  // dossiers de la veille sous des lignes qui se disaient à jour.
  const totaux = totauxAlignements(diagnostics)
  return (
    <Carte
      id="alignements"
      titre="Outils alignements"
      sous={`Diagnostic seul, sans écriture sur le corpus. L’autorité reste la spine AELF ${snapshot.metrics.aelf_spine.version_code}.`}
    >
      <div className="cc-tuiles">
        <Tuile valeur={`${nb(totaux.frais)} / ${nb(totaux.runs)}`} label="Runs à jour" rang="action" ton={totaux.perimes > 0 ? 'or' : 'vert'} />
        <Tuile valeur={nb(totaux.high)} label="Haute priorité" rang="action" ton={totaux.high > 0 ? 'danger' : 'vert'} />
        <Tuile valeur={nb(totaux.total)} label="Dossiers ouverts" />
        <Tuile valeur={nb(totaux.medium)} label="Priorité moyenne" rang="contexte" />
        <Tuile valeur={nb(totaux.low)} label="Priorité basse" rang="contexte" />
        <Tuile valeur={nb(memoire?.cases_with_review_memory)} label="Dossiers avec mémoire humaine" rang="contexte" />
      </div>

      <ul className="cv-liste">
        {diagnostics.map((diagnostic) => (
          <LigneDiagnostic key={diagnostic.run_id} diagnostic={diagnostic} snapshot={snapshot} />
        ))}
        {diagnostics.length === 0 && <p className="cv-vide">Aucun run courant.</p>}
      </ul>

      <div className="cc-mention">
        Correspondances de spine mises à jour le {dateHeureFr(outils.last_spine_mapping_update)}.
        Aucun diagnostic ne corrige un alignement, un texte, un statut philologique ni un lien.
      </div>
    </Carte>
  )
}

function SectionCertifications({ snapshot }: { snapshot: Snapshot }) {
  const certifications = snapshot.certifications ?? []
  const sales = certifications.filter((item) => item.dirty).length
  return (
    <Carte
      id="certifications"
      titre="Certifications d’invariants"
      sous={sales === 0
        ? `Les ${certifications.length} certifications sont propres et aucune n’est marquée dirty.`
        : `${sales} certification${sales > 1 ? 's' : ''} sur ${certifications.length} sont marquées dirty et doivent être rejouées.`}
    >
      <ul className="cv-liste cv-liste--serree">
        {certifications.map((certification) => (
          <li key={certification.code} className="cv-ligne">
            <span className="cv-puce" style={{ background: certification.dirty || certification.status !== 'ok' ? 'var(--cs-danger)' : 'var(--cs-vert)' }} />
            <div>
              <div className="cv-ligne-titre">{certification.code}</div>
              <div className="cv-ligne-detail">
                {certification.status === 'ok' && !certification.dirty
                  ? `Certifiée le ${dateFr(certification.certified_at)}, ${nb(certification.issue_count)} anomalie${certification.issue_count > 1 ? 's' : ''}.`
                  : `État « ${certification.status} », ${nb(certification.issue_count)} anomalie${certification.issue_count > 1 ? 's' : ''}${certification.dirty_reason ? `, motif : ${certification.dirty_reason}` : ''}.`}
              </div>
            </div>
          </li>
        ))}
        {certifications.length === 0 && <p className="cv-vide">Aucune certification enregistrée.</p>}
      </ul>
    </Carte>
  )
}

function SectionGardes({ snapshot }: { snapshot: Snapshot }) {
  const garde = snapshot.live_guard
  const regles = snapshot.metrics.rules
  const rpc = snapshot.rpc_security
  const nonSuivies = garde.untracked_bible_text_events + garde.untracked_segment_events_with_links
  return (
    <Carte id="gardes" titre="Gardes et règles" sous={snapshot.go_live ? `Go-live du protocole v${snapshot.go_live.version} le ${dateFr(snapshot.go_live.activated_at)}.` : undefined}>
      <div className="cc-tuiles">
        <Tuile valeur={nb(nonSuivies)} label="Écritures non suivies" rang={nonSuivies > 0 ? 'action' : 'contexte'} ton={nonSuivies > 0 ? 'danger' : 'vert'} />
        <Tuile valeur={nb(regles.total)} label="Règles actives" rang="contexte" />
        <Tuile valeur={nb(regles.blocking)} label="Règles bloquantes" rang="contexte" />
        <Tuile valeur={nb(regles.automatic)} label="Règles automatiques" rang="contexte" />
        <Tuile valeur={nb(rpc?.registered)} label="RPC contrôlées" rang="contexte" ton={rpc?.secure ? 'vert' : 'danger'} />
      </div>
      <div className="cc-mention">
        {garde.editorial_work_allowed
          ? 'Le travail éditorial est autorisé sous protocole.'
          : 'Le travail éditorial est suspendu par la garde vivante.'}
        {rpc && !rpc.secure ? ' La sécurité des RPC signale une exposition à corriger.' : ''}
        {' '}Ces chiffres viennent du cache de métriques, calculé {ageLisible(snapshot.cache_age_seconds)}.
      </div>
    </Carte>
  )
}

function SectionSpine({ snapshot }: { snapshot: Snapshot }) {
  const spine = snapshot.metrics.aelf_spine
  const restant = spine.tr0001_tr0005_units - spine.tr0001_tr0005_units_verified
  return (
    <Carte id="spine" titre="Spine AELF" sous={`Autorité canonique ${spine.version_code}, au statut « ${spine.version_status} ».`}>
      <div className="cc-tuiles">
        <Tuile valeur={nb(restant)} label="Unités restant à vérifier" rang={restant > 0 ? 'action' : 'contexte'} ton={restant > 0 ? 'or' : 'vert'} />
        <Tuile valeur={nb(spine.canonical_review)} label="Revues canoniques ouvertes" rang={spine.canonical_review > 0 ? 'normal' : 'contexte'} ton={spine.canonical_review > 0 ? 'or' : undefined} />
        <Tuile valeur={nb(spine.translation_review)} label="Revues de traduction ouvertes" rang={spine.translation_review > 0 ? 'normal' : 'contexte'} ton={spine.translation_review > 0 ? 'or' : undefined} />
        <Tuile valeur={nb(spine.entries)} label="Entrées de la spine" rang="contexte" />
        <Tuile valeur={nb(spine.tr0001_tr0005_units_verified)} label="Unités TR0001–TR0005 vérifiées" rang="contexte" />
      </div>
      <div className="cc-mention">Chiffres du cache de métriques, calculé {ageLisible(snapshot.cache_age_seconds)}.</div>
    </Carte>
  )
}

function SectionLiensBibliques({ snapshot }: { snapshot: Snapshot }) {
  const liens = snapshot.metrics.biblical_links
  return (
    <Carte id="liens-bibliques" titre="Liens bibliques" sous="Couverture canonique de l’ensemble des liens du corpus.">
      <div className="cc-tuiles">
        <Tuile valeur={nb(liens.arbitrage_required)} label="Arbitrage requis" rang={liens.arbitrage_required > 0 ? 'action' : 'contexte'} ton={liens.arbitrage_required > 0 ? 'or' : 'vert'} />
        <Tuile valeur={nb(liens.without_canon)} label="Sans canon" rang={liens.without_canon > 0 ? 'normal' : 'contexte'} ton={liens.without_canon > 0 ? 'or' : undefined} />
        <Tuile valeur={nb(liens.total)} label="Liens enregistrés" rang="contexte" />
        <Tuile valeur={nb(liens.with_canon)} label="Rattachés au canon" rang="contexte" />
      </div>
      <div className="cc-mention">Chiffres du cache de métriques, calculé {ageLisible(snapshot.cache_age_seconds)}.</div>
    </Carte>
  )
}

// ── La vue ───────────────────────────────────────────────────────────────────

export default async function VueSysteme() {
  const { data, error } = await chargerSnapshot()
  const snapshot = lireSnapshot(data)

  if (!snapshot) {
    return (
      <PanneChargement
        titre="Le contrôle v2 n’a pas répondu"
        explication={error?.code === CODE_DELAI_DEPASSE
          ? 'Le contrat recalcule à chaque appel toute la file des postcontrôles de liens, et ce calcul dépasse désormais à lui seul le délai de huit secondes accordé à la page. Tant qu’il n’est pas figé côté base, cette vue ne peut pas s’ouvrir. Les missions du volet, elles, se lisent sans lui.'
          : 'La RPC controle_v2_admin_snapshot n’a rien renvoyé d’exploitable. Le détail technique est ci-dessous.'}
        erreur={error}
        reessayer={ADRESSE_SYSTEME}
      />
    )
  }

  return (
    <>
      <TeteSysteme snapshot={snapshot} />
      <SectionDernierRun snapshot={snapshot} />
      <SectionFileLiens snapshot={snapshot} />
      <SectionAmbiguites snapshot={snapshot} />
      <SectionAlignements snapshot={snapshot} />
      <SectionCertifications snapshot={snapshot} />
      <SectionGardes snapshot={snapshot} />
      <SectionSpine snapshot={snapshot} />
      <SectionLiensBibliques snapshot={snapshot} />
    </>
  )
}
