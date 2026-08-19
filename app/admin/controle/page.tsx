import type { ReactNode } from 'react'
import { createClient } from '@supabase/supabase-js'
import { estAdmin } from '@/app/lib/verifAdmin'
import { codesTraductionsLecture } from '@/app/lib/traductions'
import TodosControle from './TodosControle'
import ScellesBible899 from './ScellesBible899'
import { ENCRE_TITRE_CARTE, GRAISSE_TITRE, TITRE_CARTE } from '@/app/lib/hierarchieTitres'

export const metadata = { title: 'Centre de contrôle' }
export const dynamic = 'force-dynamic'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ── Types de la RPC controle_tableau_bord() ──────────────────────────────────
type Tb = {
  genere_le: string
  qualite_calcule_le: string | null
  corpus: { oeuvres_total: number; oeuvres_latin: number; oeuvres_grec: number; oeuvres_fr: number; auteurs: number; editeurs: number; traductions_total: number }
  qualite: { seg_total: number; seg_bon: number; seg_moyen: number; seg_critique: number; seg_controle_humain: number; seg_controle_total: number }
  catalogue: { notices_total: number; notices_refusees: number; notices_sur_site: number; notices_verifie_admin: number; auteurs_termine: number; auteurs_en_cours: number; auteurs_a_reprendre: number; auteurs_suivi_total: number }
  pericopes: { total: number; notice_remplie: number; validees: number; validation_lignes: number; val_presentation: number; val_exegese: number; val_theologie: number; val_tradition: number; val_coherence: number; val_biblio: number }
  bibliographie: { ouvrages: number; liens_pericopes: number; pericopes_avec_biblio: number }
  chronologie: { evenements: number; publies: number; valides: number; a_classer: number }
}
type Todo = { texte: string; fait: boolean }
type Section = { cle: string; titre: string; ordre: number; commentaire_ia: string | null; todos: Todo[]; maj_le: string }

// ── Utilitaires de présentation (purs) ───────────────────────────────────────
const nb = (n: number) => (n ?? 0).toLocaleString('fr-FR')
const part = (n: number, d: number) => (d > 0 ? (n / d) * 100 : 0)
function fmtPct(p: number): string {
  if (p > 0 && p < 1) return p.toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' %'
  return Math.round(p).toLocaleString('fr-FR') + ' %'
}
function teinte(p: number): string {
  if (p >= 80) return 'var(--cs-vert)'
  if (p >= 40) return 'var(--cs-or)'
  return 'var(--cs-danger)'
}
function dateFr(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

// ── Petits composants de rendu (serveur) ─────────────────────────────────────
function Tuile({ valeur, label, ton }: { valeur: string; label: string; ton?: 'danger' | 'vert' }) {
  const couleur = ton === 'danger' ? 'var(--cs-danger)' : ton === 'vert' ? 'var(--cs-vert)' : 'var(--cs-encre-fonce)'
  return (
    <div className="cc-tuile">
      <div className="cc-tuile-val" style={{ color: couleur }}>{valeur}</div>
      <div className="cc-tuile-lbl">{label}</div>
    </div>
  )
}

function Jauge({ label, n, d, detail }: { label: string; n: number; d: number; detail?: string }) {
  const p = part(n, d)
  const c = teinte(p)
  return (
    <div className="cc-jauge">
      <div className="cc-jauge-tete">
        <span className="cc-jauge-lbl">{label}</span>
        <span className="cc-jauge-pct" style={{ color: c }}>{fmtPct(p)}</span>
      </div>
      <div className="cc-jauge-piste"><div className="cc-jauge-remplissage" style={{ width: `${Math.max(p, p > 0 ? 1.5 : 0)}%`, background: c }} /></div>
      <div className="cc-jauge-detail">{detail ?? `${nb(n)} / ${nb(d)}`}</div>
    </div>
  )
}

function Carte({ titre, children, note, cle, todos, majLe }: { titre: string; children: ReactNode; note: string | null; cle: string; todos: Todo[]; majLe: string }) {
  return (
    <section className="cc-carte">
      <h2 className="cc-carte-titre">{titre}</h2>
      <div className="cc-carte-corps">{children}</div>

      {note && (
        <div className="cc-note">
          <div className="cc-note-tete">Où en est-on ?</div>
          <p className="cc-note-txt">{note}</p>
        </div>
      )}

      <TodosControle cle={cle} initial={todos} />

      {/* Une carte sans note (celles qui ne portent qu'un outil) n'affiche pas un pied vide. */}
      {majLe && <div className="cc-carte-pied">Note mise à jour le {dateFr(majLe)}</div>}
    </section>
  )
}

// Panne de chargement : on montre l'erreur RÉELLE renvoyée par PostgREST.
// Un message générique rend la page indiagnosticable ; le cas le plus fréquent
// est l'expiration du délai (`statement_timeout` de 8 s sur `service_role`),
// que seul le code 57014 permet de reconnaître.
function EcranPanne({ erreur }: { erreur: { message?: string; code?: string; details?: string; hint?: string } | null }) {
  const expire = erreur?.code === '57014'
  return (
    <main style={{ minHeight: 'calc(100vh - 3.5rem)', background: 'var(--cs-fond)', padding: '3rem 1.5rem' }}>
      <div style={{ maxWidth: '46rem', margin: '0 auto', background: 'var(--cs-surface)', border: '1px solid var(--cs-danger-bord)', borderRadius: '8px', padding: '1.5rem 1.75rem' }}>
        <h1 style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '1.375rem', fontWeight: 'normal', color: 'var(--cs-danger-fonce)', margin: '0 0 0.5rem' }}>
          Les indicateurs n’ont pas pu être chargés
        </h1>
        <p style={{ fontSize: '0.875rem', color: 'var(--cs-texte-second)', lineHeight: 1.6, margin: '0 0 1rem' }}>
          {expire
            ? 'La requête a dépassé le délai autorisé. Le tableau de bord agrège tout le corpus en direct ; sous charge, il peut franchir la limite de huit secondes. Réessayez dans un instant.'
            : 'La RPC controle_tableau_bord n’a rien renvoyé. Le détail technique est ci-dessous.'}
        </p>
        <pre style={{ fontSize: '0.75rem', fontFamily: 'ui-monospace, monospace', color: 'var(--cs-texte)', background: 'var(--cs-fond-doux)', border: '1px solid var(--cs-bord-clair)', borderRadius: '8px', padding: '0.75rem', margin: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
          {erreur
            ? [
                erreur.code ? `code    : ${erreur.code}` : null,
                erreur.message ? `message : ${erreur.message}` : null,
                erreur.details ? `détails : ${erreur.details}` : null,
                erreur.hint ? `piste   : ${erreur.hint}` : null,
              ].filter(Boolean).join('\n')
            : 'Aucune erreur remontée : la RPC a répondu, mais sans contenu.'}
        </pre>
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
        <a href="/chantier" style={{ display: 'inline-block', padding: '9px 20px', fontSize: '0.9375rem', fontWeight: 500, background: 'var(--cs-vert)', color: 'var(--cs-surface)', borderRadius: '8px', textDecoration: 'none' }}>Se connecter</a>
      </div>
    </main>
  )
}

// Le tableau de bord agrège tout le corpus en direct : 2 à 6 s selon la charge,
// pour un `statement_timeout` de 8 s sur `service_role`. Le dépassement (57014) est
// donc TRANSITOIRE, et une seule reprise suffit à le rattraper. On ne réessaie que
// sur ce code : une vraie erreur (droits, objet manquant) doit remonter tout de suite.
const CODE_DELAI_DEPASSE = '57014'

async function chargerTableauBord() {
  for (let essai = 0; ; essai++) {
    const { data, error } = await supabaseAdmin.rpc('controle_tableau_bord')
    if (!error) return { data, error: null }
    console.error(`[controle] RPC controle_tableau_bord (essai ${essai + 1}) :`, error)
    if (essai >= 1 || error.code !== CODE_DELAI_DEPASSE) return { data: null, error }
    await new Promise((resoudre) => setTimeout(resoudre, 1200))
  }
}

export default async function CentreControlePage() {
  if (!(await estAdmin())) return <EcranReserve />

  const [{ data: tbRaw, error: tbErreur }, { data: sectionsRaw }, codesLisibles] = await Promise.all([
    chargerTableauBord(),
    supabaseAdmin.from('controle_sections').select('*').order('ordre', { ascending: true }),
    codesTraductionsLecture(supabaseAdmin),
  ])

  const tb = tbRaw as Tb | null
  const sections = (sectionsRaw ?? []) as Section[]
  const sec = (cle: string) => sections.find((s) => s.cle === cle) ?? { cle, titre: cle, ordre: 0, commentaire_ia: null, todos: [] as Todo[], maj_le: '' }
  const bibleLisibles = codesLisibles.length

  if (!tb) return <EcranPanne erreur={tbErreur} />

  const c = tb.corpus, q = tb.qualite, cat = tb.catalogue, p = tb.pericopes, b = tb.bibliographie, ch = tb.chronologie

  return (
    <main className="cc-page">
      <style>{styles}</style>

      <header className="cc-entete">
        <div>
          <h1 className="cc-titre">Centre de contrôle</h1>
          <p className="cc-sous-titre">Où en est le corpus, à chaque instant.</p>
        </div>
        <div className="cc-horodatage">Généré le {dateFr(tb.genere_le)}</div>
      </header>

      <div className="cc-grille">
        {/* 1. Corpus */}
        <Carte titre={sec('corpus').titre} note={sec('corpus').commentaire_ia} cle="corpus" todos={sec('corpus').todos} majLe={sec('corpus').maj_le}>
          <div className="cc-tuiles">
            <Tuile valeur={nb(c.oeuvres_total)} label="Œuvres en ligne" />
            <Tuile valeur={nb(c.oeuvres_latin)} label="Originaux latins" />
            <Tuile valeur={nb(c.oeuvres_grec)} label="Originaux grecs" />
            <Tuile valeur={nb(c.oeuvres_fr)} label="Traduites en français" />
            <Tuile valeur={nb(c.auteurs)} label="Auteurs répertoriés" />
            <Tuile valeur={nb(c.editeurs)} label="Éditeurs" />
            <Tuile valeur={`${nb(bibleLisibles)} / ${nb(c.traductions_total)}`} label="Traductions bibliques (lisibles / enregistrées)" />
          </div>
        </Carte>

        {/* 2. Qualité du texte */}
        <Carte titre={sec('qualite').titre} note={sec('qualite').commentaire_ia} cle="qualite" todos={sec('qualite').todos} majLe={sec('qualite').maj_le}>
          <Jauge label="Qualité automatique des segments" n={q.seg_bon} d={q.seg_total} detail={`${nb(q.seg_bon)} bons / ${nb(q.seg_total)} segments`} />
          <Jauge label="Contrôle humain des segments" n={q.seg_controle_humain} d={q.seg_controle_total} detail={`${nb(q.seg_controle_humain)} vérifiés / ${nb(q.seg_controle_total)}`} />
          <div className="cc-tuiles" style={{ marginTop: '10px' }}>
            <Tuile valeur={nb(q.seg_bon)} label="Segments bons" ton="vert" />
            <Tuile valeur={nb(q.seg_moyen)} label="Segments moyens" />
            <Tuile valeur={nb(q.seg_critique)} label="Segments critiques" ton={q.seg_critique > 0 ? 'danger' : undefined} />
          </div>
          <div className="cc-mention">Qualité calculée le {dateFr(tb.qualite_calcule_le)} (recalcul sur demande).</div>
        </Carte>

        {/* 3. Catalogue */}
        <Carte titre={sec('catalogue').titre} note={sec('catalogue').commentaire_ia} cle="catalogue" todos={sec('catalogue').todos} majLe={sec('catalogue').maj_le}>
          <Jauge label="Audit du catalogue par auteur" n={cat.auteurs_termine} d={cat.auteurs_suivi_total} detail={`${nb(cat.auteurs_termine)} terminés / ${nb(cat.auteurs_suivi_total)} suivis`} />
          <div className="cc-tuiles" style={{ marginTop: '10px' }}>
            <Tuile valeur={nb(cat.notices_total)} label="Notices au catalogue" />
            <Tuile valeur={nb(cat.notices_sur_site)} label="Déjà sur le site" />
            <Tuile valeur={nb(cat.notices_refusees)} label="Refusées" />
            <Tuile valeur={nb(cat.auteurs_en_cours)} label="Auteurs en cours" />
            <Tuile valeur={nb(cat.auteurs_a_reprendre)} label="Auteurs à reprendre" />
            <Tuile valeur={nb(cat.notices_verifie_admin)} label="Vérifiées en admin" />
          </div>
        </Carte>

        {/* 4. Péricopes */}
        <Carte titre={sec('pericopes').titre} note={sec('pericopes').commentaire_ia} cle="pericopes" todos={sec('pericopes').todos} majLe={sec('pericopes').maj_le}>
          <Jauge label="Rédaction des notices (4 axes)" n={p.notice_remplie} d={p.total} detail={`${nb(p.notice_remplie)} rédigées / ${nb(p.total)}`} />
          <Jauge label="Validation éditoriale" n={p.validees} d={p.total} detail={`${nb(p.validees)} validées / ${nb(p.total)}`} />
          <div className="cc-tuiles" style={{ marginTop: '10px' }}>
            <Tuile valeur={nb(p.total)} label="Péricopes" />
            <Tuile valeur={nb(p.validation_lignes)} label="En relecture" />
            <Tuile valeur={nb(p.validees)} label="Validées" ton={p.validees > 0 ? 'vert' : undefined} />
          </div>
        </Carte>

        {/* 5. Bibliographie */}
        <Carte titre={sec('bibliographie').titre} note={sec('bibliographie').commentaire_ia} cle="bibliographie" todos={sec('bibliographie').todos} majLe={sec('bibliographie').maj_le}>
          <Jauge label="Couverture bibliographique des péricopes" n={b.pericopes_avec_biblio} d={p.total} detail={`${nb(b.pericopes_avec_biblio)} péricopes couvertes / ${nb(p.total)}`} />
          <div className="cc-tuiles" style={{ marginTop: '10px' }}>
            <Tuile valeur={nb(b.ouvrages)} label="Ouvrages bibliographiques" />
            <Tuile valeur={nb(b.liens_pericopes)} label="Liens vers les péricopes" />
          </div>
        </Carte>

        {/* 6. Chronologie */}
        <Carte titre={sec('chronologie').titre} note={sec('chronologie').commentaire_ia} cle="chronologie" todos={sec('chronologie').todos} majLe={sec('chronologie').maj_le}>
          <Jauge label="Publication des événements" n={ch.publies} d={ch.evenements} detail={`${nb(ch.publies)} publiés / ${nb(ch.evenements)}`} />
          <Jauge label="Validation éditoriale" n={ch.valides} d={ch.evenements} detail={`${nb(ch.valides)} validés / ${nb(ch.evenements)}`} />
          <div className="cc-tuiles" style={{ marginTop: '10px' }}>
            <Tuile valeur={nb(ch.evenements)} label="Événements" />
            <Tuile valeur={nb(ch.a_classer)} label="À classer" ton={ch.a_classer > 0 ? 'danger' : undefined} />
          </div>
        </Carte>

        {/* 7. Fac-similé Bible 899 — les images vivent hors du dépôt, leurs scellés se contrôlent ici. */}
        <Carte titre="Fac-similé Bible 899" note={sec('facsimile_bible899').commentaire_ia} cle="facsimile_bible899" todos={sec('facsimile_bible899').todos} majLe={sec('facsimile_bible899').maj_le}>
          <ScellesBible899 />
        </Carte>

        {/* 7. Chantier éditorial (œuvres) — compte rendu transverse et par œuvre. */}
        <Carte titre="Chantier éditorial (œuvres)" note={sec('chantier_oeuvres').commentaire_ia} cle="chantier_oeuvres" todos={sec('chantier_oeuvres').todos} majLe={sec('chantier_oeuvres').maj_le}>
          <p style={{ fontSize: '0.8125rem', color: 'var(--cs-texte-second)', lineHeight: 1.55, margin: 0, fontFamily: 'var(--font-source-serif), Georgia, serif' }}>
            Corrections éditoriales transverses et par œuvre : typographie, notes, titres, segmentation, informations éditoriales des textes latins. Le code d’accueil est posé ; les corrections de données suivent (liste ci-dessous).
          </p>
        </Carte>
      </div>
    </main>
  )
}

const styles = `
  .cc-page { min-height: calc(100vh - 3.5rem); background: var(--cs-fond); padding: 1.75rem 1.5rem 3rem; }
  .cc-entete { max-width: 74rem; margin: 0 auto 1.25rem; display: flex; align-items: flex-end; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
  .cc-titre { font-family: var(--font-source-serif), Georgia, serif; font-size: 1.75rem; font-weight: normal; color: var(--cs-encre-fonce); margin: 0; }
  .cc-sous-titre { font-size: 0.875rem; color: var(--cs-texte-doux); margin: 2px 0 0; font-style: italic; font-family: var(--font-source-serif), Georgia, serif; }
  .cc-horodatage { font-size: 0.75rem; color: var(--cs-texte-doux); font-family: var(--font-source-sans), Arial, sans-serif; }

  .cc-grille { max-width: 74rem; margin: 0 auto; display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 30rem), 1fr)); gap: 1.25rem; align-items: start; }

  .cc-carte { background: var(--cs-surface); border: 1px solid var(--cs-bord-clair); border-radius: 8px; padding: 1.125rem 1.25rem 0.875rem; display: flex; flex-direction: column; }
  .cc-carte-titre { font-family: var(--font-source-serif), Georgia, serif; font-size: 1.1875rem; font-weight: normal; color: var(--cs-encre-fonce); margin: 0 0 0.875rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--cs-bord-clair); }
  .cc-carte-corps { display: flex; flex-direction: column; gap: 0.5rem; }
  .cc-carte-pied { margin-top: 0.75rem; padding-top: 0.5rem; border-top: 1px solid var(--cs-bord-clair); font-size: 0.6875rem; color: var(--cs-texte-faible); font-family: var(--font-source-sans), Arial, sans-serif; }

  .cc-tuiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(7.5rem, 1fr)); gap: 0.625rem; }
  .cc-tuile { background: var(--cs-fond-clair); border: 1px solid var(--cs-bord-clair); border-radius: 8px; padding: 0.625rem 0.75rem; }
  .cc-tuile-val { font-family: var(--font-source-serif), Georgia, serif; font-size: 1.375rem; line-height: 1.1; }
  .cc-tuile-lbl { font-size: 0.6875rem; color: var(--cs-texte-second); margin-top: 0.25rem; font-family: var(--font-source-sans), Arial, sans-serif; line-height: 1.3; }

  .cc-jauge { margin: 0.375rem 0; }
  .cc-jauge-tete { display: flex; justify-content: space-between; align-items: baseline; gap: 0.5rem; }
  .cc-jauge-lbl { font-size: 0.8125rem; color: var(--cs-texte); font-family: var(--font-source-sans), Arial, sans-serif; }
  .cc-jauge-pct { font-family: var(--font-source-serif), Georgia, serif; font-size: 1rem; font-weight: 600; }
  .cc-jauge-piste { height: 7px; background: var(--cs-fond-doux); border-radius: 4px; overflow: hidden; margin: 0.3125rem 0 0.25rem; }
  .cc-jauge-remplissage { height: 100%; border-radius: 4px; transition: none; }
  .cc-jauge-detail { font-size: 0.6875rem; color: var(--cs-texte-doux); font-family: var(--font-source-sans), Arial, sans-serif; }

  .cc-note { margin-top: 0.875rem; background: var(--cs-vert-pale); border-left: 3px solid var(--cs-vert); border-radius: 0 6px 6px 0; padding: 0.625rem 0.75rem; }
  .cc-note-tete { font-size: 0.6875rem; letter-spacing: 0.04em; text-transform: uppercase; color: var(--cs-vert); font-weight: 700; font-family: var(--font-source-sans), Arial, sans-serif; margin-bottom: 0.25rem; }
  .cc-note-txt { font-size: 0.8125rem; color: var(--cs-texte); line-height: 1.5; margin: 0; font-family: var(--font-source-serif), Georgia, serif; }

  .cc-todos { margin-top: 0.75rem; }
  .cc-todos-tete { font-size: 0.6875rem; letter-spacing: 0.04em; text-transform: uppercase; color: var(--cs-texte-second); font-weight: 700; font-family: var(--font-source-sans), Arial, sans-serif; margin-bottom: 0.375rem; }
  .cc-todos-compte { color: var(--cs-texte-doux); font-weight: 500; margin-left: 0.25rem; }
  .cc-todos-liste { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.25rem; }
  .cc-todo { display: flex; align-items: flex-start; gap: 0.5rem; font-size: 0.8125rem; color: var(--cs-texte); font-family: var(--font-source-sans), Arial, sans-serif; line-height: 1.4; }
  .cc-todo-case { flex-shrink: 0; width: 1rem; height: 1rem; border: 1px solid var(--cs-bord); border-radius: 4px; display: inline-flex; align-items: center; justify-content: center; font-size: 0.75rem; color: var(--cs-vert); margin-top: 0.0625rem; }
  .cc-todo-fait .cc-todo-case { background: var(--cs-vert); border-color: var(--cs-vert); color: var(--cs-surface); }
  .cc-todo-fait .cc-todo-txt { color: var(--cs-texte-doux); text-decoration: line-through; }

  /* — Édition discrète des todos — */
  .cc-todo { position: relative; padding-right: 3rem; }
  .cc-todo-txt { flex: 1; }
  button.cc-todo-case { cursor: pointer; padding: 0; background: transparent; transition: border-color .12s; }
  button.cc-todo-case:hover { border-color: var(--cs-vert); }
  button.cc-todo-case:disabled { cursor: default; }
  .cc-todo-actions { position: absolute; right: 0; top: 0; display: inline-flex; gap: 0.125rem; opacity: 0; transition: opacity .12s; }
  .cc-todo:hover .cc-todo-actions, .cc-todo:focus-within .cc-todo-actions { opacity: 1; }
  .cc-todo-btn { border: none; background: transparent; cursor: pointer; font-size: 0.8125rem; line-height: 1; color: var(--cs-texte-faible); padding: 0.125rem 0.3125rem; border-radius: 4px; font-family: var(--font-source-sans), Arial, sans-serif; }
  .cc-todo-btn:hover { color: var(--cs-texte); background: var(--cs-fond-doux); }
  .cc-todo-btn-suppr { font-size: 1rem; }
  .cc-todo-btn-suppr:hover { color: var(--cs-danger); background: var(--cs-danger-fond); }
  .cc-todo-input { flex: 1; width: 100%; font-size: 0.8125rem; font-family: var(--font-source-sans), Arial, sans-serif; color: var(--cs-texte); line-height: 1.4; border: 1px solid var(--cs-bord); border-radius: 4px; padding: 0.1875rem 0.375rem; background: var(--cs-surface); resize: vertical; }
  .cc-todo-input:focus { outline: none; border-color: var(--cs-vert); }
  .cc-todo-ajout { margin-top: 0.375rem; }
  .cc-todo-ajout-btn { border: none; background: transparent; cursor: pointer; font-size: 0.75rem; color: var(--cs-texte-faible); font-family: var(--font-source-sans), Arial, sans-serif; padding: 0.125rem 0; opacity: 0.55; transition: opacity .12s, color .12s; }
  .cc-todos:hover .cc-todo-ajout-btn { opacity: 1; }
  .cc-todo-ajout-btn:hover { color: var(--cs-vert); }
  .cc-todo-erreur { font-size: 0.6875rem; color: var(--cs-danger); margin-top: 0.25rem; font-family: var(--font-source-sans), Arial, sans-serif; }
  @media (hover: none) { .cc-todo-actions { opacity: 1; } .cc-todo-ajout-btn { opacity: 1; } }

  .cc-mention { font-size: 0.6875rem; color: var(--cs-texte-doux); font-family: var(--font-source-sans), Arial, sans-serif; margin-top: 0.5rem; font-style: italic; }

  /* Mobile : les grilles sont déjà en auto-fill (une colonne sur téléphone) ; on
     resserre seulement les gouttières et le titre pour gagner de la place. */
  @media (max-width: 640px) {
    .cc-page { padding: 1rem 0.75rem 2.5rem; }
    .cc-entete { margin-bottom: 1rem; }
    .cc-titre { font-size: 1.375rem; }
    .cc-carte { padding: 1rem 0.875rem 0.75rem; }
    .cc-carte-titre { font-size: 1.0625rem; }
  }
`
