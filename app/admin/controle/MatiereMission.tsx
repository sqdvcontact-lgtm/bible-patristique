// La matière propre à chaque mission : ses chiffres, son outil, sa présentation.
//
// ⛔ Une mission ne calcule que les siens, et seulement quand on l'ouvre. Six missions
// tirent leurs chiffres du même tableau de bord, qui agrège le corpus entier en direct
// (6,9 s mesurées le 13 septembre 2026, pour huit accordées) : il se fait attendre dans sa
// propre frontière de flux, si bien que la note et les tâches paraissent sans lui, et il est
// gardé cinq minutes pour qu'on passe d'une mission à l'autre sans le recalculer.
//
// ⚠️ Une mission que ce fichier ne connaît pas n'y perd rien : sa note et ses tâches se
// rendent quand même. C'est ce qui manquait à la page des statistiques, dont les cartes
// écrites à la main taisaient deux missions de la base.
import { Suspense, type ReactNode } from 'react'
import { styleSemantiqueBloc } from '@/app/lib/bibleEdition'
import { stylesInconnus } from '@/app/lib/bibleHierarchieSemantique'
import { FILTRE_BIBLE_PUBLIABLE } from '@/app/lib/etatsPublication'
import { codesTraductionsLecture } from '@/app/lib/traductions'
import ScellesBible899 from './ScellesBible899'
import { CODE_DELAI_DEPASSE, chargerTableauBord, supabaseAdmin, type TableauBord } from './chargementsControle'
import { adresseDeMission } from './missions'
import { PanneChargement, dateFr, dateHeureFr, nb } from './piecesControle'

// ── Présentation (pure) ──────────────────────────────────────────────────────

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

// ── Les chiffres du tableau de bord ──────────────────────────────────────────

const DOMAINES_DU_TABLEAU = ['corpus', 'qualite', 'catalogue', 'pericopes', 'bibliographie', 'chronologie'] as const
type DomaineDuTableau = (typeof DOMAINES_DU_TABLEAU)[number]

function estDomaineDuTableau(cle: string): cle is DomaineDuTableau {
  return (DOMAINES_DU_TABLEAU as readonly string[]).includes(cle)
}

function ChiffresDomaine({ domaine, tb, bibleLisibles }: { domaine: DomaineDuTableau; tb: TableauBord; bibleLisibles: number }) {
  const c = tb.corpus, q = tb.qualite, cat = tb.catalogue, p = tb.pericopes, b = tb.bibliographie, ch = tb.chronologie
  switch (domaine) {
    case 'corpus':
      return (
        <div className="cc-tuiles">
          <Tuile valeur={nb(c.oeuvres_total)} label="Œuvres en ligne" />
          <Tuile valeur={nb(c.oeuvres_latin)} label="Originaux latins" />
          <Tuile valeur={nb(c.oeuvres_grec)} label="Originaux grecs" />
          <Tuile valeur={nb(c.oeuvres_fr)} label="Traduites en français" />
          <Tuile valeur={nb(c.auteurs)} label="Auteurs répertoriés" />
          <Tuile valeur={nb(c.editeurs)} label="Éditeurs" />
          <Tuile valeur={`${nb(bibleLisibles)} / ${nb(c.traductions_total)}`} label="Traductions bibliques (lisibles / enregistrées)" />
        </div>
      )
    case 'qualite':
      return (
        <>
          <Jauge label="Qualité automatique des segments" n={q.seg_bon} d={q.seg_total} detail={`${nb(q.seg_bon)} bons / ${nb(q.seg_total)} segments`} />
          <Jauge label="Contrôle humain des segments" n={q.seg_controle_humain} d={q.seg_controle_total} detail={`${nb(q.seg_controle_humain)} vérifiés / ${nb(q.seg_controle_total)}`} />
          <div className="cc-tuiles" style={{ marginTop: '10px' }}>
            <Tuile valeur={nb(q.seg_bon)} label="Segments bons" ton="vert" />
            <Tuile valeur={nb(q.seg_moyen)} label="Segments moyens" />
            <Tuile valeur={nb(q.seg_critique)} label="Segments critiques" ton={q.seg_critique > 0 ? 'danger' : undefined} />
          </div>
          <div className="cc-mention">Qualité calculée le {dateFr(tb.qualite_calcule_le)} (recalcul sur demande).</div>
        </>
      )
    case 'catalogue':
      return (
        <>
          <Jauge label="Audit du catalogue par auteur" n={cat.auteurs_termine} d={cat.auteurs_suivi_total} detail={`${nb(cat.auteurs_termine)} terminés / ${nb(cat.auteurs_suivi_total)} suivis`} />
          <div className="cc-tuiles" style={{ marginTop: '10px' }}>
            <Tuile valeur={nb(cat.notices_total)} label="Notices au catalogue" />
            <Tuile valeur={nb(cat.notices_sur_site)} label="Déjà sur le site" />
            <Tuile valeur={nb(cat.notices_refusees)} label="Refusées" />
            <Tuile valeur={nb(cat.auteurs_en_cours)} label="Auteurs en cours" />
            <Tuile valeur={nb(cat.auteurs_a_reprendre)} label="Auteurs à reprendre" />
            <Tuile valeur={nb(cat.notices_verifie_admin)} label="Vérifiées en admin" />
          </div>
        </>
      )
    case 'pericopes':
      return (
        <>
          <Jauge label="Rédaction des notices (4 axes)" n={p.notice_remplie} d={p.total} detail={`${nb(p.notice_remplie)} rédigées / ${nb(p.total)}`} />
          <Jauge label="Validation éditoriale" n={p.validees} d={p.total} detail={`${nb(p.validees)} validées / ${nb(p.total)}`} />
          <div className="cc-tuiles" style={{ marginTop: '10px' }}>
            <Tuile valeur={nb(p.total)} label="Péricopes" />
            <Tuile valeur={nb(p.validation_lignes)} label="En relecture" />
            <Tuile valeur={nb(p.validees)} label="Validées" ton={p.validees > 0 ? 'vert' : undefined} />
          </div>
        </>
      )
    case 'bibliographie':
      return (
        <>
          <Jauge label="Couverture bibliographique des péricopes" n={b.pericopes_avec_biblio} d={p.total} detail={`${nb(b.pericopes_avec_biblio)} péricopes couvertes / ${nb(p.total)}`} />
          <div className="cc-tuiles" style={{ marginTop: '10px' }}>
            <Tuile valeur={nb(b.ouvrages)} label="Ouvrages bibliographiques" />
            <Tuile valeur={nb(b.liens_pericopes)} label="Liens vers les péricopes" />
          </div>
        </>
      )
    case 'chronologie':
      return (
        <>
          <Jauge label="Publication des événements" n={ch.publies} d={ch.evenements} detail={`${nb(ch.publies)} publiés / ${nb(ch.evenements)}`} />
          <Jauge label="Validation éditoriale" n={ch.valides} d={ch.evenements} detail={`${nb(ch.valides)} validés / ${nb(ch.evenements)}`} />
          <div className="cc-tuiles" style={{ marginTop: '10px' }}>
            <Tuile valeur={nb(ch.evenements)} label="Événements" />
            <Tuile valeur={nb(ch.a_classer)} label="À classer" ton={ch.a_classer > 0 ? 'danger' : undefined} />
          </div>
        </>
      )
  }
}

async function ChiffresDuTableau({ domaine }: { domaine: DomaineDuTableau }) {
  const [{ tb, erreur }, codesLisibles] = await Promise.all([
    chargerTableauBord(),
    domaine === 'corpus' ? codesTraductionsLecture(supabaseAdmin).catch(() => []) : Promise.resolve([]),
  ])
  if (!tb) {
    return (
      <PanneChargement
        enLigne
        titre="Les chiffres n’ont pas pu être calculés"
        explication={erreur?.code === CODE_DELAI_DEPASSE
          ? 'Le tableau de bord agrège tout le corpus en direct, et il a dépassé deux fois de suite le délai de huit secondes. La note et les tâches de la mission restent lisibles ci-dessous.'
          : 'La RPC controle_tableau_bord n’a rien renvoyé d’exploitable. Le détail technique est ci-dessous.'}
        erreur={erreur}
        reessayer={adresseDeMission(domaine)}
      />
    )
  }
  return (
    <>
      <ChiffresDomaine domaine={domaine} tb={tb} bibleLisibles={codesLisibles.length} />
      <div className="cc-mention">Chiffres calculés le {dateHeureFr(tb.genere_le)} sur le corpus entier, et gardés cinq minutes.</div>
    </>
  )
}

// ── La Bible Fillion ─────────────────────────────────────────────────────────

// État réel du chantier Fillion, lu en service_role : les compteurs disent ce qui est en
// base, et surtout ce qui est PUBLIC. Tant que rien n'est publié, la mission doit le montrer
// plutôt que de laisser croire à une mise en ligne.
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
  // ⚠️ Ces comptages passent par le service_role, qui CONTOURNE la RLS : lire une vue
  // publique ici ne dit donc rien de ce que le lecteur voit. Ce que voit le lecteur se
  // recalcule avec les mêmes conditions que les politiques. ⛔ Pour la chaîne textuelle,
  // `draft`, `review`, `validated` et `verified` sont des états d'avancement : seuls
  // `rejected` et `retired` ferment. Les illustrations gardent leur exception explicite :
  // elles ne paraissent qu'une fois validées.
  try {
    const { data: famille, error } = await supabaseAdmin
      .from('bible_edition_families')
      .select('id,status')
      .eq('family_code', 'fillion-bible')
      .maybeSingle()
    if (error) throw error
    if (!famille) {
      return {
        famille: null,
        membres: 0,
        composants: 0,
        blocs: 0,
        notes: 0,
        illustrations: 0,
        visibles: 0,
        stylesRefuses: [],
      }
    }

    type PublicationComptee = 'aucune' | 'bible' | 'illustration'
    const compter = async (table: string, publication: PublicationComptee = 'aucune') => {
      const requete = supabaseAdmin
        .from(table)
        .select('*', { count: 'exact', head: true })
        .eq('family_id', famille.id)
      const requetePublique = publication === 'aucune'
        ? requete
        : requete.eq('is_public', true)
      const requeteFinale = publication === 'bible'
        ? requetePublique.or(FILTRE_BIBLE_PUBLIABLE)
        : publication === 'illustration'
          ? requetePublique.eq('validation_status', 'validated')
          : requetePublique
      const { count, error: erreurCompte } = await requeteFinale
      if (erreurCompte) throw erreurCompte
      return count ?? 0
    }
    const [membres, composants, blocs, notes, illustrations, blocsPublics, notesPubliques, imagesPubliques] =
      await Promise.all([
        compter('bible_edition_members'),
        compter('bible_edition_components'),
        compter('bible_editorial_body_blocks'),
        compter('bible_verse_notes'),
        compter('bible_edition_assets'),
        compter('bible_editorial_body_blocks', 'bible'),
        compter('bible_verse_notes', 'bible'),
        compter('bible_edition_assets', 'illustration'),
      ])
    // Un style que le registre ignore n'est pas rendu : il doit donc se voir ici, sinon un
    // bloc disparaîtrait de la page sans que personne le sache.
    const { data: styles } = await supabaseAdmin
      .from('bible_editorial_body_blocks')
      .select('block_kind, scope_kind')
      .eq('family_id', famille.id)
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
  } catch (erreur) {
    console.error('[controle] état de la Bible Fillion :', erreur)
    return null
  }
}

async function ChiffresFillion() {
  const fillion = await chargerEtatFillion()
  if (!fillion) return <div className="cc-mention">Les compteurs de l’édition n’ont pas pu être lus.</div>
  return (
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
  )
}

// ── Les présentations ────────────────────────────────────────────────────────

// Les missions sans tuiles se présentent en une phrase. Leurs chiffres, quand elles en ont,
// coûtent un balayage complet (la copie des originaux dans `segments`, le grain des empans
// joint à tous les membres d'alignement) pour ce que la note porte déjà.
const PRESENTATIONS: Record<string, ReactNode> = {
  chantier_oeuvres: (
    <p className="cv-presentation">
      Corrections éditoriales transverses et par œuvre : typographie, notes, titres, segmentation, informations
      éditoriales des textes latins. Le code d’accueil est posé ; les corrections de données suivent (liste ci-dessous).
    </p>
  ),
  chantier_fillion: (
    <p className="cv-presentation">
      Intégration de la Bible de Fillion : français et Vulgate imprimée comme deux traductions distinctes, reliées par une
      famille éditoriale, avec commentaires dans le corps, notes de verset, illustrations et provenance par volume.
    </p>
  ),
  textes_originaux: (
    <p className="cv-presentation">
      Un texte en langue originale vit dans ses propres segments, sous son propre identifiant, et l’alignement dit la
      correspondance avec la traduction. La lecture bilingue s’y compose déjà. Restent les œuvres dont l’original est
      encore logé dans <code>segments.texte_original</code> : une par ligne ci-dessous, la dernière ligne éteignant la colonne.
    </p>
  ),
  alignements_empans: (
    <p className="cv-presentation">
      Quand l’édition traduite paragraphe, l’alignement suit son paragraphage ; à défaut, on pose des frontières à la main
      aux jonctions sémantiques. Le paragraphe du texte traduit est une frontière qu’aucun groupe n’enjambe, et l’empan
      doit rester bref, faute de quoi l’œil ne tient plus les deux colonnes ensemble. Une œuvre par ligne ci-dessous,
      l’atelier d’alignement étant le préalable de toutes.
    </p>
  ),
  visite: (
    <p className="cv-presentation">
      Une visite montre la page qu’on vient d’ouvrir, dans l’ordre où la page se lit, et la barre de navigation ne
      s’explique que sur l’accueil, qui n’est qu’une porte. Une visite vieillit avec la page qu’elle décrit sans
      qu’aucune garde ne le dise.
    </p>
  ),
}

export default function MatiereMission({ cle }: { cle: string }) {
  const presentation = PRESENTATIONS[cle] ?? null
  const chiffres = estDomaineDuTableau(cle)
    ? <ChiffresDuTableau domaine={cle} />
    : cle === 'chantier_fillion'
      ? <ChiffresFillion />
      : null
  const outil = cle === 'facsimile_bible899' ? <ScellesBible899 /> : null
  if (!presentation && !chiffres && !outil) return null

  return (
    <div className="cc-carte-corps">
      {presentation}
      {chiffres && (
        <Suspense fallback={<p className="cv-vide">Les chiffres se calculent sur le corpus entier : quelques secondes.</p>}>
          {chiffres}
        </Suspense>
      )}
      {outil}
    </div>
  )
}
