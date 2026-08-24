import type { ReactNode } from 'react'
import { createClient } from '@supabase/supabase-js'
import { estAdmin } from '@/app/lib/verifAdmin'
import { styleSemantiqueBloc } from '@/app/lib/bibleEdition'
import { stylesInconnus } from '@/app/lib/bibleHierarchieSemantique'
import { codesTraductionsLecture } from '@/app/lib/traductions'
import TodosControle from '../TodosControle'
import ScellesBible899 from '../ScellesBible899'
import { CSS_CONTROLE } from '../stylesControle'
import { ENCRE_TITRE_CARTE, GRAISSE_TITRE, TITRE_CARTE } from '@/app/lib/hierarchieTitres'

export const metadata = { title: 'Statistiques du corpus' }
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
        <a href="/chantier" style={{ display: 'inline-block', padding: '9px 20px', fontSize: '0.9375rem', fontWeight: 500, background: 'var(--cs-vert-aplat)', color: 'var(--cs-sur-aplat)', borderRadius: '8px', textDecoration: 'none' }}>Se connecter</a>
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

// État réel du chantier Fillion, lu en service_role : les compteurs disent ce
// qui est en base, et surtout ce qui est PUBLIC. Tant que rien n'est publié, la
// carte doit le montrer plutôt que de laisser croire à une mise en ligne.
type EtatFillion = {
  famille: string | null
  membres: number
  composants: number
  blocs: number
  notes: number
  illustrations: number
  visibles: number
  /** Styles sémantiques absents du registre : refusés au rendu, à arbitrer. */
  stylesRefuses: string[]
}

async function chargerEtatFillion(): Promise<EtatFillion | null> {
  // ⚠️ Ces comptages passent par le service_role, qui CONTOURNE la RLS : lire une
  // vue publique ici ne dit donc rien de ce que le lecteur voit. Ce que voit le
  // lecteur se recalcule à la main, avec les mêmes conditions que les politiques :
  // contenu public et validé, ET famille publiée. Sans cette dernière condition,
  // la carte annoncerait une mise en ligne qui n'a pas eu lieu.
  const compter = async (table: string, publicSeulement = false) => {
    const requete = supabaseAdmin.from(table).select('*', { count: 'exact', head: true })
    const { count, error } = await (publicSeulement
      ? requete.eq('is_public', true).eq('validation_status', 'validated')
      : requete)
    if (error) throw error
    return count ?? 0
  }
  try {
    const { data: famille, error } = await supabaseAdmin
      .from('bible_edition_families')
      .select('status')
      .eq('family_code', 'fillion-bible')
      .maybeSingle()
    if (error) throw error
    const [membres, composants, blocs, notes, illustrations, blocsPublics, notesPubliques, imagesPubliques] =
      await Promise.all([
        compter('bible_edition_members'),
        compter('bible_edition_components'),
        compter('bible_editorial_body_blocks'),
        compter('bible_verse_notes'),
        compter('bible_edition_assets'),
        compter('bible_editorial_body_blocks', true),
        compter('bible_verse_notes', true),
        compter('bible_edition_assets', true),
      ])
    // Un style que le registre ignore n'est pas rendu : il doit donc se voir
    // ici, sinon un bloc disparaîtrait de la page sans que personne le sache.
    const { data: styles } = await supabaseAdmin
      .from('bible_editorial_body_blocks')
      .select('block_kind, scope_kind')
    const stylesRefuses = stylesInconnus(
      ((styles ?? []) as { block_kind: string; scope_kind: string }[])
        .map((row) => styleSemantiqueBloc(
          row.block_kind as Parameters<typeof styleSemantiqueBloc>[0],
          row.scope_kind as Parameters<typeof styleSemantiqueBloc>[1],
        )),
    )
    const statut = famille?.status ?? null
    return {
      famille: statut,
      membres, composants, blocs, notes, illustrations,
      visibles: statut === 'published' ? blocsPublics + notesPubliques + imagesPubliques : 0,
      stylesRefuses,
    }
  } catch {
    // Déploiement antérieur à la migration : la carte se replie sur sa prose.
    return null
  }
}

export default async function StatistiquesControlePage() {
  if (!(await estAdmin())) return <EcranReserve />

  const [{ data: tbRaw, error: tbErreur }, { data: sectionsRaw }, codesLisibles, fillion] = await Promise.all([
    chargerTableauBord(),
    supabaseAdmin.from('controle_sections').select('*').order('ordre', { ascending: true }),
    codesTraductionsLecture(supabaseAdmin),
    chargerEtatFillion(),
  ])

  const tb = tbRaw as Tb | null
  const sections = (sectionsRaw ?? []) as Section[]
  const sec = (cle: string) => sections.find((s) => s.cle === cle) ?? { cle, titre: cle, ordre: 0, commentaire_ia: null, todos: [] as Todo[], maj_le: '' }
  const bibleLisibles = codesLisibles.length

  if (!tb) return <EcranPanne erreur={tbErreur} />

  const c = tb.corpus, q = tb.qualite, cat = tb.catalogue, p = tb.pericopes, b = tb.bibliographie, ch = tb.chronologie

  return (
    <main className="cc-page">
      <style>{CSS_CONTROLE}</style>

      <header className="cc-entete">
        <div>
          <a href="/admin/controle" className="cc-retour">← Centre de contrôle</a>
          <h1 className="cc-titre">Statistiques du corpus</h1>
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

        {/* 8. Bible Fillion — l'édition commentée, de son socle à sa publication. */}
        <Carte titre="Bible Fillion" note={sec('chantier_fillion').commentaire_ia} cle="chantier_fillion" todos={sec('chantier_fillion').todos} majLe={sec('chantier_fillion').maj_le}>
          <p style={{ fontSize: '0.8125rem', color: 'var(--cs-texte-second)', lineHeight: 1.55, margin: '0 0 10px', fontFamily: 'var(--font-source-serif), Georgia, serif' }}>
            Intégration de la Bible de Fillion : français et Vulgate imprimée comme deux traductions distinctes, reliées par une famille éditoriale, avec commentaires dans le corps, notes de verset, illustrations et provenance par volume.
          </p>
          {fillion ? (
            <>
              <div className="cc-tuiles">
                <Tuile valeur={fillion.membres ? String(fillion.membres) : '—'} label="Membres de la famille" />
                <Tuile valeur={String(fillion.composants)} label="Volumes décrits" />
                <Tuile valeur={String(fillion.blocs)} label="Blocs du corps" />
                <Tuile valeur={String(fillion.notes)} label="Notes de verset" />
                <Tuile valeur={String(fillion.illustrations)} label="Illustrations" />
                <Tuile
                  valeur={String(fillion.visibles)}
                  label="Éléments visibles du lecteur"
                  ton={fillion.visibles > 0 ? 'vert' : undefined}
                />
              </div>
              {fillion.stylesRefuses.length > 0 && (
                <div className="cc-mention" style={{ color: 'var(--cs-danger)' }}>
                  Styles refusés au rendu, absents du registre : {fillion.stylesRefuses.join(', ')}.
                  Les blocs concernés ne sont pas affichés ; les inscrire dans
                  work/fillion/semantic_display_hierarchy.json, ou corriger leur classement.
                </div>
              )}
              <div className="cc-mention">
                {fillion.famille === null
                  ? 'La famille éditoriale n’est pas encore créée.'
                  : fillion.famille === 'published'
                    ? 'Famille publiée : le catalogue public expose l’édition.'
                    : `Famille au statut « ${fillion.famille} » : rien n’est visible du lecteur tant qu’elle n’est pas publiée.`}
              </div>
            </>
          ) : (
            <div className="cc-mention">Modèle éditorial absent de cette base : compteurs indisponibles.</div>
          )}
        </Carte>

        {/* 9. Textes originaux — chaque original n'existe qu'à un seul endroit, et l'alignement
            dit la correspondance. Carte SANS tuiles, comme le chantier éditorial : compter les
            segments qui portent encore une copie coûte un balayage complet de `segments`
            (7 983 lignes sur 91 350, 1,2 s, aucun index sur `texte_original`), pour un chiffre
            que la note porte déjà et que les tâches détaillent œuvre par œuvre. */}
        <Carte titre="Textes originaux — une seule occurrence" note={sec('textes_originaux').commentaire_ia} cle="textes_originaux" todos={sec('textes_originaux').todos} majLe={sec('textes_originaux').maj_le}>
          <p style={{ fontSize: '0.8125rem', color: 'var(--cs-texte-second)', lineHeight: 1.55, margin: 0, fontFamily: 'var(--font-source-serif), Georgia, serif' }}>
            Un texte en langue originale vit dans ses propres segments, sous son propre identifiant, et l’alignement
            dit la correspondance avec la traduction. La lecture bilingue s’y compose déjà. Restent les œuvres dont
            l’original est encore logé dans <code>segments.texte_original</code> : une par ligne ci-dessous, la
            dernière ligne éteignant la colonne.
          </p>
        </Carte>
      </div>
    </main>
  )
}

