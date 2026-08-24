import type { ReactNode } from 'react'
import { createClient } from '@supabase/supabase-js'
import { estAdmin } from '@/app/lib/verifAdmin'
import { CSS_CONTROLE } from './stylesControle'
import { ENCRE_TITRE_CARTE, GRAISSE_TITRE, TITRE_CARTE } from '@/app/lib/hierarchieTitres'
import {
  SEVERITES,
  ageLisible,
  comptesParSeverite,
  decisionsConnues,
  estFrais,
  etatGeneral,
  lireSnapshot,
  teinteEtat,
  teinteSeverite,
  type Constat,
  type DiagnosticAlignement,
  type Severite,
  type Snapshot,
} from './snapshotV2'

export const metadata = { title: 'Centre de contrôle' }
export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ── Présentation ─────────────────────────────────────────────────────────────
const nb = (n: number | null | undefined) => (n ?? 0).toLocaleString('fr-FR')

function dateFr(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function dateHeureFr(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })} à ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
}

function Tuile({ valeur, label, ton }: { valeur: string; label: string; ton?: 'danger' | 'vert' | 'or' }) {
  const couleur =
    ton === 'danger' ? 'var(--cs-danger)' : ton === 'vert' ? 'var(--cs-vert)' : ton === 'or' ? 'var(--cs-or)' : 'var(--cs-encre-fonce)'
  return (
    <div className="cc-tuile">
      <div className="cc-tuile-val" style={{ color: couleur }}>{valeur}</div>
      <div className="cc-tuile-lbl">{label}</div>
    </div>
  )
}

function Carte({ titre, sous, children }: { titre: string; sous?: string; children: ReactNode }) {
  return (
    <section className="cc-carte">
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

function EcranPanne({ erreur }: { erreur: { message?: string; code?: string; details?: string; hint?: string } | null }) {
  return (
    <main style={{ minHeight: 'calc(100vh - 3.5rem)', background: 'var(--cs-fond)', padding: '3rem 1.5rem' }}>
      <div style={{ maxWidth: '46rem', margin: '0 auto', background: 'var(--cs-surface)', border: '1px solid var(--cs-danger-bord)', borderRadius: '8px', padding: '1.5rem 1.75rem' }}>
        <h1 style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '1.375rem', fontWeight: 'normal', color: 'var(--cs-danger-fonce)', margin: '0 0 0.5rem' }}>
          Le contrôle v2 n’a pas répondu
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--cs-texte-second)', lineHeight: 1.6, margin: '0 0 1rem' }}>
          La RPC controle_v2_admin_snapshot n’a rien renvoyé d’exploitable. Le détail technique est ci-dessous.
          Les statistiques historiques restent accessibles sur leur propre page.
        </p>
        <pre style={{ fontSize: '0.75rem', fontFamily: 'ui-monospace, monospace', color: 'var(--cs-texte)', background: 'var(--cs-fond-doux)', border: '1px solid var(--cs-bord-clair)', borderRadius: '8px', padding: '0.75rem', margin: '0 0 1rem', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
          {erreur
            ? [
                erreur.code ? `code    : ${erreur.code}` : null,
                erreur.message ? `message : ${erreur.message}` : null,
                erreur.details ? `détails : ${erreur.details}` : null,
                erreur.hint ? `piste   : ${erreur.hint}` : null,
              ].filter(Boolean).join('\n')
            : 'Aucune erreur remontée : la RPC a répondu, mais sans contrat lisible.'}
        </pre>
        <a href="/admin/controle/statistiques" style={{ fontSize: '0.875rem', color: 'var(--cs-vert)' }}>Statistiques du corpus →</a>
      </div>
    </main>
  )
}

function EcranReserve() {
  return (
    <main style={{ minHeight: 'calc(100vh - 3.5rem)', background: 'var(--cs-fond)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'var(--cs-surface)', border: '1px solid var(--cs-bord)', borderRadius: '8px', padding: '36px 40px', width: '21.25rem', textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: TITRE_CARTE, fontWeight: GRAISSE_TITRE, color: ENCRE_TITRE_CARTE, marginBottom: '6px' }}>Centre de contrôle</h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--cs-texte-doux)', marginBottom: '20px' }}>Corpus Scriptura</p>
        <p style={{ fontSize: '0.875rem', color: 'var(--cs-texte-second)', lineHeight: 1.6, marginBottom: '22px' }}>
          Cette page est réservée au compte administrateur. Connectez-vous avec ce compte pour y accéder.
        </p>
        <a href="/chantier" style={{ display: 'inline-block', padding: '9px 20px', fontSize: '0.9375rem', fontWeight: 500, background: 'var(--cs-vert-aplat)', color: 'var(--cs-sur-aplat)', borderRadius: '8px', textDecoration: 'none' }}>Se connecter</a>
      </div>
    </main>
  )
}

// ── Cartes du contrôle v2 ────────────────────────────────────────────────────

function CarteDernierRun({ snapshot }: { snapshot: Snapshot }) {
  const run = snapshot.last_run
  const comptes = comptesParSeverite(run)
  const constats = run?.findings ?? []
  return (
    <Carte titre="Dernier run global" sous={`Lancé le ${dateHeureFr(run?.started_at)}, backend v${snapshot.backend_version}.`}>
      <div className="cc-tuiles">
        {SEVERITES.map((severite) => (
          <Tuile
            key={severite}
            valeur={nb(comptes[severite])}
            label={severite}
            ton={comptes[severite] > 0 ? (severite === 'REVIEW' ? 'or' : severite === 'INFO' ? undefined : 'danger') : undefined}
          />
        ))}
      </div>
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
    </Carte>
  )
}

function CarteCertifications({ snapshot }: { snapshot: Snapshot }) {
  const certifications = snapshot.certifications ?? []
  const sales = certifications.filter((item) => item.dirty).length
  return (
    <Carte
      titre="Certifications d’invariants"
      sous={sales === 0
        ? `Les ${certifications.length} certifications sont propres et aucune n’est marquée dirty.`
        : `${sales} certification${sales > 1 ? 's' : ''} sur ${certifications.length} sont marquées dirty et doivent être rejouées.`}
    >
      <ul className="cv-liste">
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

function CarteFileLiens({ snapshot }: { snapshot: Snapshot }) {
  const file = snapshot.link_review_queue
  const proprietaires = snapshot.postcheck_owners ?? []
  if (!file) return null
  return (
    <Carte
      titre="File des postcontrôles de liens"
      sous="Chaque modification suivie garde ses liens dépendants ouverts tant qu’une vérification humaine ne les a pas clos."
    >
      <div className="cc-tuiles">
        <Tuile valeur={nb(file.checks)} label="Postcontrôles ouverts" ton={file.checks > 0 ? 'or' : 'vert'} />
        <Tuile valeur={nb(file.dependent_links)} label="Liens dépendants" />
        <Tuile valeur={nb(file.bootstrap_checks)} label="Bootstrap" />
        <Tuile valeur={nb(file.post_go_live_checks)} label="Après go-live" />
        <Tuile valeur={nb(file.structural_invalid)} label="Structurellement invalides" ton={file.structural_invalid > 0 ? 'danger' : 'vert'} />
        <Tuile valeur={nb(file.ambiguous_owner)} label="Propriétaire ambigu" ton={file.ambiguous_owner > 0 ? 'danger' : 'vert'} />
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
              <td>
                <span style={{ color: proprietaire.routing_status === 'routed' ? 'var(--cs-vert)' : 'var(--cs-danger)' }}>
                  {proprietaire.routing_status === 'routed' ? 'routé' : proprietaire.routing_status}
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

function CarteAmbiguites({ snapshot }: { snapshot: Snapshot }) {
  const ambiguites = snapshot.routing_ambiguities ?? []
  return (
    <Carte
      titre="Objets à propriétaire ambigu"
      sous="Deux missions revendiquent le même objet. L’arbitrage revient à l’utilisateur, et aucune attribution ne doit être décidée ici."
    >
      {ambiguites.length === 0 ? (
        <p className="cv-vide">Aucun objet ambigu.</p>
      ) : (
        <ul className="cv-liste">
          {ambiguites.map((ambiguite) => (
            <li key={`${ambiguite.object_type}-${ambiguite.object_id}`} className="cv-ligne">
              <span className="cv-puce" style={{ background: 'var(--cs-danger)' }} />
              <div>
                <div className="cv-ligne-titre">
                  {ambiguite.object_type} {ambiguite.object_id}
                  {ambiguite.segment_numero ? `, segment ${ambiguite.segment_numero}` : ''}
                  {ambiguite.id_oeuvre ? ` de ${ambiguite.id_oeuvre}` : ''}
                </div>
                <div className="cv-ligne-detail">
                  Missions candidates : {ambiguite.candidate_missions.join(' ou ')}.
                  {' '}{nb(ambiguite.dependent_links)} lien{ambiguite.dependent_links > 1 ? 's' : ''} dépendant{ambiguite.dependent_links > 1 ? 's' : ''}, modifié le {dateHeureFr(ambiguite.last_changed_at)}.
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Carte>
  )
}

function CarteSpine({ snapshot }: { snapshot: Snapshot }) {
  const spine = snapshot.metrics.aelf_spine
  const restant = spine.tr0001_tr0005_units - spine.tr0001_tr0005_units_verified
  return (
    <Carte titre="Spine AELF" sous={`Autorité canonique ${spine.version_code}, au statut « ${spine.version_status} ».`}>
      <div className="cc-tuiles">
        <Tuile valeur={nb(spine.entries)} label="Entrées de la spine" />
        <Tuile valeur={nb(spine.tr0001_tr0005_units_verified)} label="Unités TR0001–TR0005 vérifiées" ton={restant === 0 ? 'vert' : undefined} />
        <Tuile valeur={nb(restant)} label="Unités restant à vérifier" ton={restant > 0 ? 'or' : 'vert'} />
        <Tuile valeur={nb(spine.canonical_review)} label="Revues canoniques ouvertes" ton={spine.canonical_review > 0 ? 'or' : 'vert'} />
        <Tuile valeur={nb(spine.translation_review)} label="Revues de traduction ouvertes" ton={spine.translation_review > 0 ? 'or' : 'vert'} />
      </div>
    </Carte>
  )
}

function CarteLiensBibliques({ snapshot }: { snapshot: Snapshot }) {
  const liens = snapshot.metrics.biblical_links
  return (
    <Carte titre="Liens bibliques" sous="Couverture canonique de l’ensemble des liens du corpus.">
      <div className="cc-tuiles">
        <Tuile valeur={nb(liens.total)} label="Liens enregistrés" />
        <Tuile valeur={nb(liens.with_canon)} label="Rattachés au canon" ton="vert" />
        <Tuile valeur={nb(liens.without_canon)} label="Sans canon" ton={liens.without_canon > 0 ? 'or' : 'vert'} />
        <Tuile valeur={nb(liens.arbitrage_required)} label="Arbitrage requis" ton={liens.arbitrage_required > 0 ? 'or' : 'vert'} />
      </div>
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

function CarteAlignements({ snapshot }: { snapshot: Snapshot }) {
  const outils = snapshot.metrics.alignment_tools
  const diagnostics = snapshot.alignment_diagnostics ?? []
  const memoire = snapshot.alignment_review_memory
  return (
    <Carte
      titre="Outils alignements"
      sous={`Diagnostic seul, sans écriture sur le corpus. L’autorité reste la spine AELF ${snapshot.metrics.aelf_spine.version_code}.`}
    >
      <div className="cc-tuiles">
        <Tuile valeur={nb(outils.cases_total)} label="Dossiers ouverts" />
        <Tuile valeur={nb(outils.cases_high)} label="Haute priorité" ton={outils.cases_high > 0 ? 'danger' : 'vert'} />
        <Tuile valeur={nb(outils.cases_medium)} label="Priorité moyenne" ton={outils.cases_medium > 0 ? 'or' : 'vert'} />
        <Tuile valeur={nb(outils.cases_low)} label="Priorité basse" />
        <Tuile valeur={`${nb(outils.current_runs - outils.stale_runs)} / ${nb(outils.current_runs)}`} label="Runs à jour" ton={outils.stale_runs > 0 ? 'or' : 'vert'} />
        <Tuile valeur={nb(memoire?.cases_with_review_memory)} label="Dossiers avec mémoire humaine" />
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

function CarteGarde({ snapshot }: { snapshot: Snapshot }) {
  const garde = snapshot.live_guard
  const regles = snapshot.metrics.rules
  const rpc = snapshot.rpc_security
  return (
    <Carte titre="Gardes et règles" sous={snapshot.go_live ? `Go-live du protocole v${snapshot.go_live.version} le ${dateFr(snapshot.go_live.activated_at)}.` : undefined}>
      <div className="cc-tuiles">
        <Tuile valeur={nb(regles.total)} label="Règles actives" />
        <Tuile valeur={nb(regles.blocking)} label="Règles bloquantes" />
        <Tuile valeur={nb(regles.automatic)} label="Règles automatiques" />
        <Tuile valeur={nb(rpc?.registered)} label="RPC contrôlées" ton={rpc?.secure ? 'vert' : 'danger'} />
        <Tuile valeur={nb(garde.untracked_bible_text_events)} label="Écritures bibliques non suivies" ton={garde.untracked_bible_text_events > 0 ? 'danger' : 'vert'} />
        <Tuile valeur={nb(garde.untracked_segment_events_with_links)} label="Segments liés non suivis" ton={garde.untracked_segment_events_with_links > 0 ? 'danger' : 'vert'} />
      </div>
      <div className="cc-mention">
        {garde.editorial_work_allowed
          ? 'Le travail éditorial est autorisé sous protocole.'
          : 'Le travail éditorial est suspendu par la garde vivante.'}
        {rpc && !rpc.secure ? ' La sécurité des RPC signale une exposition à corriger.' : ''}
      </div>
    </Carte>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function CentreControlePage() {
  if (!(await estAdmin())) return <EcranReserve />

  const { data, error } = await supabaseAdmin.rpc('controle_v2_admin_snapshot')
  const snapshot = lireSnapshot(data)
  if (!snapshot) {
    if (error) console.error('[controle] RPC controle_v2_admin_snapshot :', error)
    return <EcranPanne erreur={error} />
  }

  const etat = etatGeneral(snapshot)

  return (
    <main className="cc-page">
      <style>{CSS_CONTROLE + CSS_V2}</style>

      <header className="cc-entete">
        <div>
          <h1 className="cc-titre">Centre de contrôle</h1>
          <p className="cc-sous-titre">Ce que le système de contrôle v{snapshot.backend_version} affirme, à l’instant.</p>
        </div>
        <div className="cc-horodatage">
          Snapshot du {dateHeureFr(snapshot.generated_at)}
          <br />
          Métriques calculées {ageLisible(snapshot.cache_age_seconds)}
          <br />
          <a href="/admin/controle/statistiques" className="cv-lien">Statistiques du corpus →</a>
        </div>
      </header>

      <section className="cv-etat" style={{ borderColor: teinteEtat(etat.code) }}>
        <div className="cv-etat-pastille" style={{ background: teinteEtat(etat.code) }} />
        <div className="cv-etat-corps">
          <div className="cv-etat-titre" style={{ color: teinteEtat(etat.code) }}>{etat.libelle}</div>
          <p className="cv-etat-phrase">{etat.phrase}</p>
        </div>
        <div className="cv-etat-chiffres">
          <span><strong>{nb(snapshot.live_guard.open_postchecks)}</strong> postcontrôles ouverts</span>
          <span><strong>{nb(snapshot.live_guard.ambiguous_owner_objects_with_links)}</strong> propriétaires ambigus</span>
          <span><strong>{nb(snapshot.live_guard.stale_alignment_runs)}</strong> runs d’alignement périmés</span>
        </div>
      </section>

      <div className="cc-grille">
        <CarteDernierRun snapshot={snapshot} />
        <CarteCertifications snapshot={snapshot} />
        <CarteFileLiens snapshot={snapshot} />
        <CarteAmbiguites snapshot={snapshot} />
        <CarteAlignements snapshot={snapshot} />
        <CarteSpine snapshot={snapshot} />
        <CarteLiensBibliques snapshot={snapshot} />
        <CarteGarde snapshot={snapshot} />
      </div>
    </main>
  )
}

const CSS_V2 = `
  .cv-lien { color: var(--cs-vert); text-decoration: none; }
  .cv-lien:hover { text-decoration: underline; }

  .cv-etat { max-width: 74rem; margin: 0 auto 1.25rem; background: var(--cs-surface); border: 1px solid var(--cs-bord-clair); border-left-width: 4px; border-radius: 8px; padding: 0.875rem 1.125rem; display: flex; align-items: center; gap: 0.875rem; flex-wrap: wrap; }
  .cv-etat-pastille { width: 0.625rem; height: 0.625rem; border-radius: 50%; flex-shrink: 0; }
  .cv-etat-corps { flex: 1 1 18rem; }
  .cv-etat-titre { font-family: var(--font-source-serif), Georgia, serif; font-size: 1.125rem; }
  .cv-etat-phrase { font-size: 0.8125rem; color: var(--cs-texte-second); margin: 0.125rem 0 0; line-height: 1.5; font-family: var(--font-source-serif), Georgia, serif; }
  .cv-etat-chiffres { display: flex; gap: 1.25rem; flex-wrap: wrap; font-size: 0.75rem; color: var(--cs-texte-second); font-family: var(--font-source-sans), Arial, sans-serif; }
  .cv-etat-chiffres strong { font-family: var(--font-source-serif), Georgia, serif; font-size: 1rem; color: var(--cs-encre-fonce); font-weight: normal; }

  .cv-sous { font-size: 0.8125rem; color: var(--cs-texte-second); line-height: 1.5; margin: -0.5rem 0 0.75rem; font-family: var(--font-source-serif), Georgia, serif; }

  .cv-liste { list-style: none; margin: 0.75rem 0 0; padding: 0; display: flex; flex-direction: column; gap: 0.5rem; }
  .cv-ligne { display: flex; align-items: flex-start; gap: 0.5rem; }
  .cv-puce { width: 0.5rem; height: 0.5rem; border-radius: 50%; flex-shrink: 0; margin-top: 0.3125rem; }
  .cv-ligne-titre { font-size: 0.8125rem; color: var(--cs-texte); font-family: var(--font-source-sans), Arial, sans-serif; font-weight: 600; }
  .cv-ligne-detail { font-size: 0.75rem; color: var(--cs-texte-second); line-height: 1.5; font-family: var(--font-source-sans), Arial, sans-serif; }
  .cv-etiquette { font-size: 0.6875rem; font-weight: 500; margin-left: 0.5rem; letter-spacing: 0.02em; }
  .cv-vide { font-size: 0.8125rem; color: var(--cs-texte-doux); font-style: italic; margin: 0.5rem 0 0; font-family: var(--font-source-serif), Georgia, serif; }

  .cv-tete-tableau { font-size: 0.6875rem; letter-spacing: 0.04em; text-transform: uppercase; color: var(--cs-texte-second); font-weight: 700; font-family: var(--font-source-sans), Arial, sans-serif; margin: 1rem 0 0.375rem; }
  .cv-tableau { width: 100%; border-collapse: collapse; font-size: 0.75rem; font-family: var(--font-source-sans), Arial, sans-serif; }
  .cv-tableau th { text-align: left; font-weight: 600; color: var(--cs-texte-second); border-bottom: 1px solid var(--cs-bord-clair); padding: 0.25rem 0.375rem; }
  .cv-tableau td { color: var(--cs-texte); border-bottom: 1px solid var(--cs-bord-clair); padding: 0.375rem; vertical-align: top; overflow-wrap: anywhere; }
  .cv-tableau .cv-num { text-align: right; font-variant-numeric: tabular-nums; }
`
