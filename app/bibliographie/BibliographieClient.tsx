'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import ReferenceBibliographique from '@/app/components/ReferenceBibliographique'
import IconeChevron from '@/app/components/IconeChevron'
import { CLASSES_BIBLIOGRAPHIE } from '@/app/lib/apparatBibliographie'
import { fragmentsReference } from '@/app/lib/referenceBibliographique'
import { htmlFragments, texteFragments } from '@/app/lib/referenceBibliographiqueSorties'
import { rendreSiecles, siecleEnTexte } from '@/app/lib/siecles'
import { rendreTexteEnrichi } from '@/app/oeuvre/[id]/texteEnrichi'
import { useEstMobile } from '@/app/lib/useEstMobile'
import { allerAAncre } from '@/app/lib/defilement'
import { HAUTEUR_NAVBAR, HAUTEUR_SOUS_NAVBAR } from '@/app/lib/mesures'
import { ENCRE_TITRE, GRAISSE_TITRE_VOLET, TITRE_VOLET } from '@/app/lib/hierarchieTitres'
import { RUBRIQUE_AXE } from '@/app/lib/stylesVoletLecture'
import {
  compterAxe,
  FILTRES_VIDES,
  filtrerBibliographie,
  filtresActifs,
  grouperParLettre,
  indexerRecherche,
  libelleCitations,
  libelleCompte,
  libelleGenre,
  libelleLangueCode,
  libelleRubrique,
  ORDRE_GENRES,
  ORDRE_RUBRIQUES,
  type EntreeBibliographie,
  type FiltresBibliographie,
  type NomsPericopes,
} from '@/app/lib/bibliographieCatalogue'

/**
 * L'OUTIL BIBLIOGRAPHIQUE — la page « Bibliographie » d'« Aller plus loin ».
 *
 * Même grammaire que le catalogue des péricopes, qui est l'autre page-outil du site :
 * un volet de recherche et de filtres à gauche, repliable sur un téléphone, et une
 * liste à droite dont la marge collante dit où l'on est. Ici la marge porte la LETTRE
 * sous laquelle les ouvrages se rangent, comme un catalogue de bibliothèque.
 *
 * ⛔ Chaque référence se compose par LE moteur bibliographique du site
 * (`ReferenceBibliographique`) : cette page n'a aucune règle de composition à elle,
 * et le bouton « Copier » sort la même référence par les mêmes sorties (§ 35.6.6).
 *
 * ⛔ Rien ici ne dit le RANG d'un ouvrage : ni score, ni « secondaire », ni motif
 * (charte § 29.1). Ce que le lecteur voit, c'est ce qu'un catalogue montre.
 */

const FOND = 'var(--cs-fond)'
const BORD = 'var(--cs-bord)'
const SEP = 'var(--cs-fond-doux)'
const VERT = 'var(--cs-vert)'
const SERIF = 'var(--font-source-serif), Georgia, serif'
const SANS = 'var(--font-source-sans), Arial, sans-serif'

/** Nombre de péricopes nommées avant le repli « et N autres » : au-delà, la ligne
 *  fait un paragraphe, et un commentaire de Luc en cite vingt-sept. */
const PERICOPES_VISIBLES = 3

/** Nombre de siècles montrés avant le repli. Huit siècles sont peuplés au
 *  2026-09-06, les trois premiers de quelques ouvrages seulement. */
const SIECLES_VISIBLES = 5

function Rubrique({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginTop: '18px', marginBottom: '2px' }}>
      <span style={RUBRIQUE_AXE}>{children}</span>
      <span aria-hidden style={{ flex: 1, height: '1px', background: SEP }} />
    </div>
  )
}
function GroupeFiltre({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: '12px' }}>
      <div style={{ ...RUBRIQUE_AXE, marginBottom: '6px' }}>{label}</div>
      {children}
    </div>
  )
}

/** Une case de filtre : marqueur carré à gauche, qui se remplit quand elle est retenue.
 *  ⚠️ La même que celle du catalogue des péricopes, au pixel : deux pages-outil ne se
 *  cochent pas de deux façons. */
function LigneCompte({ actif, onClick, label, n }: { actif: boolean; onClick: () => void; label: React.ReactNode; n: number }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={actif} style={{
      display: 'flex', alignItems: 'center', gap: '8px', width: '100%', textAlign: 'left', cursor: 'pointer',
      background: 'none', border: 'none', padding: '5px 0', margin: 0, minHeight: '26px',
      fontFamily: SERIF, fontSize: '0.75rem', lineHeight: 1.35,
      color: actif ? VERT : 'var(--cs-texte)', fontWeight: actif ? 600 : 400,
      transition: 'color 0.12s',
    }}>
      <span aria-hidden style={{
        flexShrink: 0, width: '10px', height: '10px', borderRadius: '4px',
        border: `1px solid ${actif ? VERT : 'var(--cs-bord-clair)'}`,
        background: actif ? VERT : 'transparent', transition: 'background 0.12s, border-color 0.12s',
      }} />
      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      <span style={{ fontFamily: SANS, fontSize: '0.625rem', color: actif ? VERT : 'var(--cs-texte-second)' }}>{n}</span>
    </button>
  )
}

/**
 * « Copier la référence » : au presse-papiers en RICHE (l'italique et les petites
 * capitales survivent au collage dans un traitement de texte) et en texte nu pour
 * ce qui ne lit que le texte. Les deux formes viennent des sorties du moteur
 * (§ 35.6.6) ; ce bouton ne compose rien.
 * ⚠️ `ClipboardItem` manque à quelques navigateurs : le texte nu suffit alors.
 */
function BoutonCopierReference({ entree }: { entree: EntreeBibliographie }) {
  const [etat, setEtat] = useState<'repos' | 'copie' | 'erreur'>('repos')
  const copier = async () => {
    const fragments = fragmentsReference(entree.notice)
    const texte = texteFragments(fragments)
    const html = htmlFragments(fragments)
    try {
      if (typeof ClipboardItem !== 'undefined' && navigator.clipboard.write) {
        await navigator.clipboard.write([new ClipboardItem({
          'text/plain': new Blob([texte], { type: 'text/plain' }),
          'text/html': new Blob([html], { type: 'text/html' }),
        })])
      } else {
        await navigator.clipboard.writeText(texte)
      }
      setEtat('copie')
    } catch {
      setEtat('erreur')
    }
    setTimeout(() => setEtat('repos'), 1500)
  }
  const libelle = etat === 'copie' ? 'Référence copiée' : etat === 'erreur' ? 'La copie a échoué' : 'Copier la référence'
  return (
    <button type="button" onClick={copier} className="biblio-copier" aria-live="polite" title={libelle} aria-label={libelle}
      style={{ color: etat === 'copie' ? VERT : etat === 'erreur' ? 'var(--cs-danger)' : undefined }}>
      {etat === 'copie' ? 'Copiée' : etat === 'erreur' ? 'Échec' : 'Copier'}
    </button>
  )
}

/** Les péricopes qui citent l'ouvrage : les premières nommées et liées, le reste
 *  derrière « et N autres », qui déplie tout. */
function PericopesCitantes({ entree, noms }: { entree: EntreeBibliographie; noms: NomsPericopes }) {
  const [tout, setTout] = useState(false)
  const n = entree.pericopes.length
  const libelle = libelleCitations(n)
  if (!libelle) return null
  const montrees = tout ? entree.pericopes : entree.pericopes.slice(0, PERICOPES_VISIBLES)
  const cachees = n - montrees.length
  return (
    <span className="biblio-citations">
      <span className="biblio-citations-mot">{libelle}{n > 0 ? ' :' : ''}</span>{' '}
      {montrees.map((id, i) => (
        <span key={id}>
          {i > 0 && (i === montrees.length - 1 && cachees === 0 ? ' et ' : ', ')}
          <Link href={`/pericopes/${id}`} className="biblio-pericope">{rendreTexteEnrichi(noms[id] ?? id)}</Link>
        </span>
      ))}
      {cachees > 0 && (
        <>
          {' '}
          <button type="button" className="biblio-deplier" onClick={() => setTout(true)}>et {cachees} autre{cachees > 1 ? 's' : ''}</button>
        </>
      )}
      {tout && n > PERICOPES_VISIBLES && (
        <>
          {' '}
          <button type="button" className="biblio-deplier" onClick={() => setTout(false)}>Replier</button>
        </>
      )}
    </span>
  )
}

export default function BibliographieClient({ entrees: servies, nomsPericopes }: { entrees: EntreeBibliographie[]; nomsPericopes: NomsPericopes }) {
  const mobile = useEstMobile(900)
  const [filtres, setFiltres] = useState<FiltresBibliographie>(FILTRES_VIDES)
  const [tousSiecles, setTousSiecles] = useState(false)
  const [panneauOuvert, setPanneauOuvert] = useState(false)

  // Le texte où la recherche cherche se calcule ici, une fois : il ne voyage pas.
  const entrees = useMemo(() => indexerRecherche(servies), [servies])
  const retenues = useMemo(() => filtrerBibliographie(entrees, filtres), [entrees, filtres])
  const groupes = useMemo(() => grouperParLettre(retenues), [retenues])
  const actifs = filtresActifs(filtres)

  // Les comptes se prennent sur le CORPUS ENTIER, non sur la liste filtrée : un filtre
  // doit dire ce qu'il donnerait, et un axe dont on retire une valeur ne doit pas se
  // vider sous la main.
  const genres = useMemo(() => compterAxe(entrees, e => (e.genre ? [e.genre] : []), ORDRE_GENRES), [entrees])
  const langues = useMemo(() => compterAxe(entrees, e => (e.langue ? [e.langue] : [])), [entrees])
  const siecles = useMemo(() => compterAxe(entrees, e => (e.siecle != null ? [e.siecle] : [])).sort((a, b) => b.valeur - a.valeur), [entrees])
  const rubriques = useMemo(() => compterAxe(entrees, e => e.rubriques, ORDRE_RUBRIQUES), [entrees])
  const lettres = useMemo(() => grouperParLettre(entrees).map(g => g.lettre), [entrees])

  const poser = (partie: Partial<FiltresBibliographie>) => setFiltres(f => ({ ...f, ...partie }))
  const basculer = <T extends string | number>(cle: 'genres' | 'langues' | 'siecles' | 'rubriques', valeur: T) => {
    setFiltres(f => {
      const s = new Set<string | number>(f[cle] as ReadonlySet<string | number>)
      if (s.has(valeur)) s.delete(valeur); else s.add(valeur)
      return { ...f, [cle]: s }
    })
  }
  const reinitialiser = () => setFiltres(FILTRES_VIDES)

  // Un siècle retenu reste visible même replié : on ne cache pas un filtre qui agit.
  const sieclesMontres = tousSiecles ? siecles : siecles.filter((s, i) => i < SIECLES_VISIBLES || filtres.siecles.has(s.valeur))
  const sieclesCaches = siecles.length - sieclesMontres.length

  const lettresPresentes = new Set(groupes.map(g => g.lettre))
  const allerALaLettre = (lettre: string) => {
    if (mobile) setPanneauOuvert(false)
    requestAnimationFrame(() => { allerAAncre(`lettre-${lettre}`) })
  }

  const contenuFiltres = (
    <>
      <div style={{ position: 'relative', marginTop: '2px' }}>
        <input value={filtres.q} onChange={e => poser({ q: e.target.value })} type="text"
          placeholder="Un auteur, un titre, une collection…" aria-label="Rechercher un ouvrage par auteur, titre, collection, maison ou année"
          style={{ width: '100%', boxSizing: 'border-box', fontFamily: SERIF, fontSize: '0.75rem', padding: '7px 24px 7px 28px', borderRadius: '8px', border: `1px solid ${BORD}`, background: 'var(--cs-surface)', color: 'var(--cs-texte)', outline: 'none' }} />
        <svg width="12" height="12" viewBox="0 0 13 13" fill="none" aria-hidden
          style={{ position: 'absolute', left: '9px', top: '50%', transform: 'translateY(-50%)', stroke: 'var(--cs-texte-second)', opacity: 0.75 }}>
          <circle cx="5.5" cy="5.5" r="4.5" strokeWidth="1.2" />
          <line x1="9" y1="9" x2="12" y2="12" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
        {filtres.q && (
          <button type="button" onClick={() => poser({ q: '' })} aria-label="Effacer la recherche"
            style={{ position: 'absolute', right: '7px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cs-texte-second)', fontSize: '0.8125rem', lineHeight: 1, padding: 0 }}>✕</button>
        )}
      </div>

      <p aria-live="polite" style={{ margin: '7px 0 0', fontFamily: SANS, fontSize: '0.625rem', letterSpacing: '0.04em', color: actifs ? VERT : 'var(--cs-texte-second)' }}>
        {libelleCompte(entrees.length, retenues.length, actifs)}
      </p>

      {groupes.length > 0 && (
        <>
          <Rubrique>Parcourir</Rubrique>
          <GroupeFiltre label="Aller à une lettre">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '1px 4px' }}>
              {lettres.map(l => (
                <button key={l} type="button" className="biblio-lien-lettre" onClick={() => allerALaLettre(l)}
                  disabled={!lettresPresentes.has(l)} aria-label={`Aller à la lettre ${l}`}>
                  {l}
                </button>
              ))}
            </div>
          </GroupeFiltre>
        </>
      )}

      <Rubrique>Filtrer</Rubrique>

      {genres.length > 0 && (
        <GroupeFiltre label="Genre">
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {genres.map(({ valeur, n }) => (
              <LigneCompte key={valeur} actif={filtres.genres.has(valeur)} onClick={() => basculer('genres', valeur)} label={libelleGenre(valeur)} n={n} />
            ))}
          </div>
        </GroupeFiltre>
      )}

      {rubriques.length > 0 && (
        <GroupeFiltre label="Cité pour">
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {rubriques.map(({ valeur, n }) => (
              <LigneCompte key={valeur} actif={filtres.rubriques.has(valeur)} onClick={() => basculer('rubriques', valeur)} label={libelleRubrique(valeur)} n={n} />
            ))}
          </div>
        </GroupeFiltre>
      )}

      {langues.length > 1 && (
        <GroupeFiltre label="Langue">
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {langues.map(({ valeur, n }) => (
              <LigneCompte key={valeur} actif={filtres.langues.has(valeur)} onClick={() => basculer('langues', valeur)} label={libelleLangueCode(valeur)} n={n} />
            ))}
          </div>
        </GroupeFiltre>
      )}

      {siecles.length > 1 && (
        <GroupeFiltre label="Parution">
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {sieclesMontres.map(({ valeur, n }) => (
              <LigneCompte key={valeur} actif={filtres.siecles.has(valeur)} onClick={() => basculer('siecles', valeur)} label={rendreSiecles(siecleEnTexte(valeur))} n={n} />
            ))}
          </div>
          {(sieclesCaches > 0 || tousSiecles) && (
            <button type="button" onClick={() => setTousSiecles(o => !o)} className="biblio-lien-discret" style={{ marginTop: '4px' }}>
              {tousSiecles ? 'Afficher moins' : `Afficher les ${sieclesCaches} autres`}
            </button>
          )}
        </GroupeFiltre>
      )}

      {actifs && (
        <button type="button" onClick={reinitialiser}
          style={{ marginTop: '16px', width: '100%', padding: '7px 9px', borderRadius: '8px', cursor: 'pointer', border: `1px solid ${BORD}`, background: 'var(--cs-surface)', color: 'var(--cs-texte-second)', fontFamily: SERIF, fontSize: '0.75rem' }}>
          Réinitialiser les filtres
        </button>
      )}
    </>
  )

  return (
    <main style={{ background: FOND, minHeight: HAUTEUR_SOUS_NAVBAR }}>
      <style>{`
        /* ── Le volet ───────────────────────────────────────────────────────── */
        .biblio-lien-lettre {
          display: flex; align-items: center; justify-content: center; min-height: 24px;
          font-family: ${SANS}; font-size: 0.6875rem; color: var(--cs-texte-second);
          background: none; border: none; cursor: pointer; padding: 0; transition: color 0.12s;
        }
        .biblio-lien-lettre:hover:not(:disabled) { color: ${VERT}; text-decoration: underline; text-underline-offset: 3px; }
        /* Une lettre que le filtre a vidée reste à sa place, en pâle : la grille ne
           se recompose pas sous la main, et l'on voit ce que le filtre a écarté. */
        .biblio-lien-lettre:disabled { color: var(--cs-texte-faible); cursor: default; opacity: 0.55; }
        .biblio-lien-discret {
          background: none; border: none; padding: 4px 0; cursor: pointer;
          font-family: ${SERIF}; font-size: 0.6875rem; font-style: italic; color: var(--cs-texte-second);
        }
        .biblio-lien-discret:hover { color: ${VERT}; }

        /* ── La liste ───────────────────────────────────────────────────────── */
        /* Une lettre = une rangée de deux cases : la lettre dans la marge, ses
           ouvrages à droite. La lettre est COLLANTE, comme le nom d'un livre dans le
           catalogue des péricopes : elle accompagne ses entrées. */
        .biblio-groupe { display: grid; grid-template-columns: 4.5rem 1fr; column-gap: 1.75rem; margin-bottom: 1.5rem; }
        .biblio-marge { text-align: right; }
        .biblio-marge-in { position: sticky; top: calc(${HAUTEUR_NAVBAR} + 14px); padding-top: 1px; }
        .biblio-marge h2 {
          font-family: ${SERIF}; font-size: 1.375rem; font-weight: 400; color: var(--cs-encre);
          margin: 0; line-height: 1; letter-spacing: 0.02em;
        }
        .biblio-groupe--mobile { display: block; margin-bottom: 1.5rem; }
        .biblio-groupe--mobile .biblio-marge { display: flex; align-items: baseline; gap: 11px; text-align: left; margin-bottom: 7px; }
        .biblio-groupe--mobile .biblio-marge-in { position: static; }
        .biblio-groupe--mobile .biblio-marge .rule { flex: 1; height: 1px; align-self: center; background: linear-gradient(to right, var(--cs-bord), transparent); }

        /* ── Une entrée ─────────────────────────────────────────────────────── */
        /* La référence, composée par le moteur et à la forme de TOUTE bibliographie du
           site (retrait suspendu, corps d'un cran sous le texte, ferrée à gauche) ; puis
           une ligne en sans, plus petite et plus pâle : le genre, la langue quand elle
           n'est pas le français, et les péricopes pour lesquelles l'ouvrage est cité.
           ⚠️ Le corps de la référence est posé ICI, sur la liste, et non par le
           modificateur « sans hôte » de la famille : celui-ci sert un apparat, plus
           petit ; un catalogue se lit au corps du texte courant. */
        .biblio-entrees { display: flex; flex-direction: column; gap: 14px; }
        .biblio-entrees .${CLASSES_BIBLIOGRAPHIE.bloc} { font-family: ${SERIF}; font-size: 0.8125rem; color: var(--cs-texte-fort); margin: 0; }
        .biblio-entree { padding: 2px 4px; border-radius: 4px; transition: background 0.14s ease; }
        .biblio-entree:hover { background: rgba(var(--cs-vert-rgb), 0.045); }
        .biblio-l2 {
          display: flex; align-items: baseline; gap: 6px 14px; flex-wrap: wrap;
          margin: 4px 0 0 1.1em;
          font-family: ${SANS}; font-size: 0.65625rem; line-height: 1.45; color: var(--cs-texte-second);
        }
        .biblio-l2 > * { min-width: 0; }
        .biblio-nature { white-space: nowrap; color: var(--cs-texte-gris); }
        .biblio-citations { flex: 1 1 18rem; }
        .biblio-citations-mot { color: var(--cs-texte-gris); }
        .biblio-pericope { color: var(--cs-encre); text-decoration: none; }
        .biblio-pericope:hover { color: ${VERT}; text-decoration: underline; text-underline-offset: 2px; }
        .biblio-deplier {
          background: none; border: none; padding: 0; cursor: pointer;
          font-family: inherit; font-size: inherit; font-style: italic; color: var(--cs-texte-second);
        }
        .biblio-deplier:hover { color: ${VERT}; }
        /* Le bouton de copie ne paraît qu'au survol de l'entrée, à sa droite : une
           liste de six cents boutons ne se lit pas. Sans curseur, il reste visible. */
        .biblio-copier {
          margin-left: auto; background: none; border: 1px solid var(--cs-bord-clair); border-radius: 4px;
          padding: 1px 7px; cursor: pointer; font-family: ${SANS}; font-size: 0.625rem; color: var(--cs-texte-second);
          opacity: 0; transition: opacity 0.14s ease, color 0.14s ease, border-color 0.14s ease;
        }
        .biblio-entree:hover .biblio-copier, .biblio-entree:focus-within .biblio-copier { opacity: 1; }
        .biblio-copier:hover { color: ${VERT}; border-color: ${VERT}; }
        @media (hover: none) { .biblio-copier { opacity: 1; } }
        @media (max-width: 700px) { .biblio-l2 { margin-left: 0.7em; } }
        @media (prefers-reduced-motion: reduce) {
          .biblio-entree, .biblio-copier, .biblio-lien-lettre { transition: none; }
        }
      `}</style>
      <div style={{ display: 'flex', flexDirection: mobile ? 'column' : 'row', alignItems: 'stretch', width: '100%' }}>

        {/* ── Volet de recherche et de filtres (repliable en mobile). ── */}
        <aside style={{
          flexShrink: 0, width: mobile ? '100%' : '15.5rem',
          position: mobile ? 'static' : 'sticky', top: HAUTEUR_NAVBAR,
          height: mobile ? 'auto' : HAUTEUR_SOUS_NAVBAR,
          display: 'flex', flexDirection: 'column',
          background: 'var(--cs-fond-clair)',
          borderRight: mobile ? 'none' : `1px solid ${BORD}`,
          borderBottom: mobile ? `1px solid ${BORD}` : 'none',
        }}>
          <div style={{ flexShrink: 0, borderBottom: `1px solid ${BORD}`, padding: '13px 15px 13px' }}>
            <h1 style={{ margin: 0, fontFamily: SERIF, fontSize: TITRE_VOLET, fontWeight: GRAISSE_TITRE_VOLET, color: ENCRE_TITRE, lineHeight: 1.15, letterSpacing: '0.01em' }}>Bibliographie</h1>
            {/* Le chapeau : ce que la liste contient, et rien d'autre. Deux lignes,
                resserrées comme celles du catalogue des péricopes. */}
            <p style={{ margin: '6px 0 0', fontFamily: SERIF, fontSize: '0.71875rem', lineHeight: 1.4, color: 'var(--cs-texte-second)' }}>
              Les ouvrages sur lesquels s’appuient les notices du site :{' '}
              <span style={{ fontStyle: 'italic', color: 'var(--cs-texte-gris)' }}>commentaires, éditions, études</span>.
            </p>
          </div>

          {mobile ? (
            <>
              <button type="button" onClick={() => setPanneauOuvert(o => !o)} aria-expanded={panneauOuvert} aria-controls="bibliographie-filtres"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '10px 15px', border: 'none', borderBottom: panneauOuvert ? `1px solid ${SEP}` : 'none', background: 'transparent', cursor: 'pointer', fontFamily: SERIF, fontSize: '0.8125rem', color: 'var(--cs-texte)' }}>
                <span>Rechercher et filtrer{actifs ? ' (actifs)' : ''}</span>
                <span aria-hidden style={{ color: 'var(--cs-texte-second)', fontSize: '0.6875rem' }}>{panneauOuvert ? '▲' : '▼'}</span>
              </button>
              {panneauOuvert && <div id="bibliographie-filtres" style={{ padding: '0 15px 18px' }}>{contenuFiltres}</div>}
            </>
          ) : (
            <div id="bibliographie-filtres" className="cs-defilement-discret" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '10px 15px 22px' }}>
              {contenuFiltres}
            </div>
          )}
        </aside>

        {/* ── La liste ── */}
        <section style={{ flex: 1, minWidth: 0, padding: mobile ? '16px 14px 56px' : '22px 2.5rem 64px' }}>
          <div style={{ maxWidth: '48rem', margin: '0 auto' }}>
            {groupes.length === 0 ? (
              <div style={{ paddingTop: '8px' }}>
                <p style={{ fontFamily: SERIF, fontSize: '0.84375rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic', margin: 0 }}>Aucun ouvrage ne correspond à la recherche et aux filtres retenus.</p>
                {actifs && (
                  <button type="button" onClick={reinitialiser}
                    style={{ marginTop: '12px', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', border: `1px solid ${BORD}`, background: 'var(--cs-surface)', color: 'var(--cs-texte-second)', fontFamily: SERIF, fontSize: '0.78125rem' }}>
                    Réinitialiser les filtres
                  </button>
                )}
              </div>
            ) : (
              <div>
                {groupes.map(g => (
                  <div key={g.lettre} id={`lettre-${g.lettre}`}
                    className={mobile ? 'biblio-groupe--mobile' : 'biblio-groupe'}
                    style={{ scrollMarginTop: `calc(${HAUTEUR_NAVBAR} + 12px)` }}>
                    <div className="biblio-marge">
                      <div className="biblio-marge-in">
                        <h2>{g.lettre}</h2>
                      </div>
                      {mobile && <span className="rule" aria-hidden="true" />}
                    </div>
                    <div className={`biblio-entrees ${CLASSES_BIBLIOGRAPHIE.bloc}`}>
                      <ul className={CLASSES_BIBLIOGRAPHIE.liste} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {g.entrees.map(e => {
                          const langue = e.langue && e.langue !== 'fr' ? libelleLangueCode(e.langue) : null
                          return (
                            <li key={e.id} id={`ouvrage-${e.id}`} className={`biblio-entree ${CLASSES_BIBLIOGRAPHIE.entree}`} data-ouvrage-id={e.id} style={{ margin: 0 }}>
                              <ReferenceBibliographique notice={e.notice} />
                              <div className="biblio-l2">
                                <span className="biblio-nature">
                                  {libelleGenre(e.genre)}
                                  {langue && <> · {langue}</>}
                                </span>
                                <PericopesCitantes entree={e} noms={nomsPericopes} />
                                <BoutonCopierReference entree={e} />
                              </div>
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  </div>
                ))}
                <p style={{ marginTop: '2.5rem', fontFamily: SERIF, fontSize: '0.71875rem', fontStyle: 'italic', color: 'var(--cs-texte-faible)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  Les librairies et collections où trouver ces ouvrages
                  <Link href="/librairies" style={{ color: 'var(--cs-vert)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                    sont réunies ici <IconeChevron dir="right" size={11} strokeWidth={1.5} />
                  </Link>
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
