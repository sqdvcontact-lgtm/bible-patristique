'use client'

// Catalogue de toutes les péricopes — un INDEX ANNOTÉ, sur le modèle d'un index de fin
// d'ouvrage : le nom du livre se tient dans la marge (et y reste tant qu'on parcourt ce
// livre), les références dorées descendent en colonne au même fer, et les péricopes se
// suivent à droite, chacune avec la première phrase de sa notice.
//
// Les données arrivent PRÉ-CHARGÉES du serveur (rendu ISR, voir app/pericopes/page.tsx) ;
// ce composant ne gère que l'interactivité : recherche, cases de filtre, saut à un livre.
//
// Refonte du 2026-08-22, après audit d'ergonomie. Ce qui change et pourquoi :
//
// 1. UNE SEULE COLONNE par livre, au lieu de deux. La grille se remplissait par LIGNE,
//    si bien que Matthieu se lisait en serpentin (1,1 · 2,1 · 2,13 · 2,16 …) pendant que
//    l'œil lisait les colonnes de haut en bas et y voyait deux suites croissantes
//    parallèles. L'ordre canonique — la valeur même du catalogue — était illisible.
// 2. LE NOM DU LIVRE PASSE EN MARGE, collant. En bandeau, chaque livre coûtait un
//    en-tête, un filet et un compte perdu à 600 px du titre ; or 29 livres sur 48 n'ont
//    que trois péricopes ou moins, et 19 n'en ont qu'une. La page était un escalier de
//    vides. En marge, le nom accompagne ses entrées au lieu de les annoncer.
// 3. L'ÉTIQUETTE DE REGISTRE CÈDE LA PLACE À LA NOTICE. « Récit » se répétait sous
//    107 titres sur 249 et formait une trame parasite. Le registre ne paraît plus que
//    lorsqu'il distingue (tout ce qui n'est pas un récit), en glose italique contre le
//    titre. Sous le titre vient la première phrase de la notice : un vrai avant-goût,
//    là où le lecteur cliquait jusqu'ici à l'aveugle.
// 4. LA RECHERCHE COMPREND LES RÉFÉRENCES (« Mt 5 », « Genèse 22 », « psaume 22 ») et
//    les noms de livres : voir app/lib/pericopesRecherche.ts, pur et testé.
// 5. LE VOLET SÉPARE NAVIGUER DE FILTRER, du même gris et de la même graisse jusqu'ici,
//    si bien que rien ne permettait de prédire ce qu'un clic ferait.
//
// Reprise du 2026-08-23 : LA RÉFÉRENCE PREND SA COLONNE, entre le nom du livre et le
// titre, au lieu de flotter au fer à droite de celui-ci. Les chapitres se rangeaient sur
// un bord ragué, loin des entrées qu'ils situent ; au même fer, ils forment la colonne de
// numéros qu'on descend du regard pour retrouver un passage, comme on consulte un index.
// Le compte de péricopes quitte la marge : la liste le montre déjà, et il faisait
// concurrence au nom du livre.
//
// Le même jour, LE PARTAGE PAR TESTAMENT PASSE EN ONGLETS, en haut de la liste et
// collants sous la barre de navigation. C'est le premier tri qu'on fait dans un
// catalogue biblique : il n'a pas sa place au fond d'un volet, en troisième case, parmi
// quinze registres. Les cases « Testament » sont donc retirées du volet — un même choix
// ne se prend pas à deux endroits, et deux cases cochées ne se traduiraient par aucun
// onglet retenu.
//
// ⛔ ET LA RUBRIQUE DE TESTAMENT NE PARAÎT PLUS DU TOUT (27 août 2026). Elle ne se
// montrait déjà plus quand un seul testament était à l'écran, l'onglet le nommant.
// Elle est maintenant retirée aussi de « Tout » : la liste y court d'une seule venue,
// de la Genèse à l'Apocalypse, sans coupure nommée. L'ordre des livres dit le passage
// d'un testament à l'autre à qui le cherche, et les onglets le donnent à qui le veut ;
// une barre de titre au milieu de la course n'ajoutait qu'une halte.

import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { LIVRES } from '@/app/lib/bible'
import { useEstMobile } from '@/app/lib/useEstMobile'
import VisiteGuidee from '@/app/components/VisiteGuidee'
import { CLE_VISITE_PERICOPES, VISITE_PERICOPES } from '@/app/lib/visitePericopes'
import { offrirLaVisite } from '@/app/lib/demandeDeVisite'
import { useCompte } from '@/app/lib/contexteCompte'
import { parsePointCanonique } from '@/app/lib/referencesBibliques'
import { rendreTexteEnrichi } from '@/app/oeuvre/[id]/texteEnrichi'
import { allerAAncre } from '@/app/lib/defilement'
import { HAUTEUR_NAVBAR, HAUTEUR_SOUS_NAVBAR } from '@/app/lib/mesures'
import IconeChevron from '@/app/components/IconeChevron'
import {
  libelleCategoriePericope,
  type PericopeCatalogueItem,
} from '@/app/lib/pericopes'
import { filtrerCatalogue, TESTAMENT_LIVRE } from '@/app/lib/pericopesRecherche'
import { SERIF, SANS } from '@/app/lib/polices'
import { STYLE_PENDANT_VOLET, styleColonnePage, styleMesureCentree } from '@/app/lib/voletPage'
import { usePendantVolet } from '@/app/lib/usePendantVolet'
import VoletPage, { BoutonReinitialiser, GroupeFiltre, LienDiscret, LigneCompte, RubriqueVolet } from '@/app/components/VoletPage'
import ChampRechercheVolet from '@/app/components/ChampRechercheVolet'
import { MentionVide } from '@/app/components/EtatVideVolet'

const FOND = 'var(--cs-fond)'
const BORD = 'var(--cs-bord)'
const VERT = 'var(--cs-vert)'

/** Hauteur de la barre d'onglets. Elle sert DEUX fois de plus : le nom du livre vient
 *  se garer dessous (marge collante) et le saut à un livre s'en écarte d'autant
 *  (scrollMarginTop). Un nombre recopié dériverait de l'un ou de l'autre. */
const HAUTEUR_ONGLETS = '2.75rem'

const ORDRE_LIVRE: Record<string, number> = Object.fromEntries(LIVRES.map((l, i) => [l.code, i]))
const NOM_LIVRE: Record<string, string> = Object.fromEntries(LIVRES.map(l => [l.code, l.nom]))

const TESTAMENTS: { code: 'AT' | 'NT' | 'AUTRES'; label: string }[] = [
  { code: 'AT', label: 'Ancien Testament' },
  { code: 'NT', label: 'Nouveau Testament' },
  { code: 'AUTRES', label: 'Autres écrits' },
]

/** Ce que retient la barre d'onglets : tout le corpus, ou un seul testament. */
type ChoixTestament = 'TOUT' | 'AT' | 'NT' | 'AUTRES'

// Le récit est le registre par DÉFAUT du corpus (107 péricopes sur 249) : le nommer sous
// chaque titre n'apprend rien. On ne glose donc que ce qui distingue.
const REGISTRE_ORDINAIRE = 'recit'

/** Nombre de registres montrés avant le repli : au-delà, la liste dépasse le volet et sa
 *  moitié basse ne porte plus que des filtres à un seul élément. */
const REGISTRES_VISIBLES = 8

function cleTri(item: PericopeCatalogueItem): number {
  const p = parsePointCanonique(item.canon_debut)
  return (p?.chapitre ?? 0) * 1000 + (p?.verset ?? 0)
}

// Référence SANS le nom du livre (celui-ci se tient déjà dans la marge) :
// « 3, 1-24 », « 18, 16 - 19, 29 ». Mêmes conventions d'espaces que la référence complète.
function refDansLivre(debut: string, fin: string | null): string {
  const d = parsePointCanonique(debut)
  if (!d || d.chapitre == null) return ''
  const f = fin ? parsePointCanonique(fin) : d
  const cv = (p: { chapitre: number | null; verset: number | null }) =>
    p.verset != null ? `${p.chapitre}, ${p.verset}` : `${p.chapitre}`
  const debutTxt = cv(d)
  if (!f || (f.chapitre === d.chapitre && f.verset === d.verset)) return debutTxt
  if (f.chapitre === d.chapitre) return f.verset != null ? `${debutTxt}-${f.verset}` : debutTxt
  return f.verset != null ? `${debutTxt} - ${f.chapitre}, ${f.verset}` : `${debutTxt} - ${f.chapitre}`
}

/** La glose italique qui suit le titre : le registre quand il distingue, et l'ensemble. */
function gloseEntree(it: PericopeCatalogueItem): string {
  const parts: string[] = []
  if (it.categorie && it.categorie !== REGISTRE_ORDINAIRE) parts.push(libelleCategoriePericope(it.categorie).toLowerCase())
  if (it.est_collection) parts.push('ensemble')
  return parts.join(', ')
}

export default function PericopesCatalogueClient({ items }: { items: PericopeCatalogueItem[] }) {
  const mobile = useEstMobile()
  // Le pendant vide du volet, à droite, sur un grand écran (charte § 38.39).
  const pendant = usePendantVolet(52, !mobile)
  const [q, setQ] = useState('')
  const [testament, setTestament] = useState<ChoixTestament>('TOUT')
  const [registres, setRegistres] = useState<Set<string>>(new Set())
  const [tousRegistres, setTousRegistres] = useState(false)
  const [panneauOuvert, setPanneauOuvert] = useState(false)
  // Les deux Testaments s'ouvrent d'emblée, les « Autres écrits » restent repliés :
  // c'est exactement le parti du volet de la Bible classique, où les « Écrits non
  // canoniques » sont le rang qu'on parcourt le moins.
  const [sectionsOuvertes, setSectionsOuvertes] = useState<Set<string>>(new Set(['AT', 'NT']))
  const basculerSection = (code: string) => setSectionsOuvertes(s => {
    const n = new Set(s)
    if (n.has(code)) n.delete(code); else n.add(code)
    return n
  })

  const compteTestament = useMemo(() => {
    const c: Record<string, number> = { AT: 0, NT: 0, AUTRES: 0 }
    for (const it of items) c[TESTAMENT_LIVRE[it.livre] ?? 'AUTRES']++
    return c
  }, [items])

  const registresPresents = useMemo(() => {
    const compte = new Map<string, number>()
    for (const it of items) compte.set(it.categorie, (compte.get(it.categorie) ?? 0) + 1)
    return [...compte.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'fr'))
  }, [items])

  // Toute la décision de filtrage vit dans le module pur `pericopesRecherche`.
  const { items: itemsFiltres, via: viaAppellation } = useMemo(
    () => filtrerCatalogue(items, q, testament === 'TOUT' ? new Set() : new Set([testament]), registres),
    [items, q, testament, registres],
  )

  // « Tout », puis les seuls testaments que le corpus peuple.
  const onglets = useMemo(
    () => [{ code: 'TOUT' as const, label: 'Tout' }, ...TESTAMENTS.filter(t => compteTestament[t.code] > 0)],
    [compteTestament],
  )

  const groupes = useMemo(() => {
    const parLivre = new Map<string, PericopeCatalogueItem[]>()
    for (const it of itemsFiltres) {
      const list = parLivre.get(it.livre) ?? []
      list.push(it)
      parLivre.set(it.livre, list)
    }
    return [...parLivre.entries()]
      .sort((a, b) => (ORDRE_LIVRE[a[0]] ?? 9999) - (ORDRE_LIVRE[b[0]] ?? 9999))
      .map(([livre, list]) => ({ livre, list: list.sort((a, b) => cleTri(a) - cleTri(b)) }))
  }, [itemsFiltres])

  const toggle = (set: Set<string>, val: string, setter: (s: Set<string>) => void) => {
    const s = new Set(set)
    if (s.has(val)) s.delete(val); else s.add(val)
    setter(s)
  }
  const reinitialiser = () => { setQ(''); setTestament('TOUT'); setRegistres(new Set()) }
  const filtresActifs = !!q || testament !== 'TOUT' || registres.size > 0

  // Un registre retenu reste TOUJOURS visible, même replié : on ne cache pas un filtre
  // qui agit, sinon rien ne dit plus pourquoi la liste est courte.
  const registresMontres = tousRegistres
    ? registresPresents
    : registresPresents.filter(([cat], i) => i < REGISTRES_VISIBLES || registres.has(cat))
  const registresCaches = registresPresents.length - registresMontres.length

  // ⛔ PLUS DE COMPTE SOUS LE CHAMP (demande de l'auteur, 2026-09-08). « 249 péricopes »
  //    n'apprenait rien que la liste ne montre, et sous filtre le compte redisait ce que
  //    la liste venait de rendre. Une recherche qui ne rend rien le dit toujours, en clair
  //    et à la place de la liste (« Aucune péricope ne correspond aux filtres retenus »).
  //    ⚠️ Le compte de la MARGE était parti pour la même raison le 2026-08-23 ; celui-ci
  //    était le dernier.

  // Saut à un livre. En mobile on referme d'abord le panneau pour dégager la liste.
  // ⛔ Jamais de `scrollIntoView` doux et nu : il ne s'exécute pas sur certains postes
  // (charte, § Défilement doux). `allerAAncre` glisse puis vérifie qu'on est arrivé.
  const allerAuLivre = (code: string) => {
    if (mobile) setPanneauOuvert(false)
    requestAnimationFrame(() => { allerAAncre(`livre-${code}`) })
  }


  // ── La visite (charte § 46 ; mécanique : AGENTS.md, « LA VISITE ») ──
  // ⛔ On attend `profilPret` : le passage d'une visite vit sur le COMPTE.
  const { visiteFaite, oublierVisite, profilPret } = useCompte()
  const [visite, setVisite] = useState(0)
  const visiteProposee = useRef(false)
  const visitePossible = !mobile && groupes.length > 0
  useEffect(() => {
    if (!visitePossible || !profilPret || visiteProposee.current) return
    visiteProposee.current = true
    const params = new URLSearchParams(window.location.search)
    if (params.has('visite')) oublierVisite(CLE_VISITE_PERICOPES)
    else if (visiteFaite(CLE_VISITE_PERICOPES)) return
    const depart = window.setTimeout(() => setVisite(1), 260)
    return () => window.clearTimeout(depart)
  }, [visitePossible, profilPret, visiteFaite, oublierVisite])
  // La barre n'offre son bouton que là où la visite peut se donner.
  useEffect(() => { if (!visitePossible) return; return offrirLaVisite(() => setVisite(n => n + 1)) }, [visitePossible])

  const contenuFiltres = (
    <>
      <ChampRechercheVolet dataVisite="peri-recherche" valeur={q} surChangement={setQ}
        placeholder="Un titre, « Mt 5 », « Genèse »…" ariaLabel="Rechercher une péricope, un livre ou une référence" />

      {/* ⛔ LE SOMMAIRE PREND LE MODÈLE DU VOLET DE LA BIBLE CLASSIQUE (demande de
          l'auteur, 2026-09-08) : le testament se donne en capitales vertes au fer à
          gauche, sa flèche de repli au fer à droite, et les livres se nomment EN
          TOUTES LETTRES, un par ligne. Voir `NavLivres`, qui est le modèle.
          ⛔ Les deux étiquettes qui coiffaient cette liste — « Parcourir », puis
          « Aller à un livre » — sont retirées : deux rangs de mots pour annoncer un
          index que la page porte déjà en clair, et que sa forme suffit à désigner.
          ⚠️ La grille de quatre colonnes d'abréviations est partie avec elles : dans
          un volet de 15,5 rem, il y a la place d'écrire « Deutéronome ». */}
      {/* ⚠️ Le bloc DÉBORDE sa colonne de six pixels de chaque côté, et c'est ce qui
          l'aligne : le nom d'un testament et celui d'un livre portent tous deux six
          pixels de rembourrage — c'est le fond de survol d'une rangée qui les demande —
          et sans ce débord les deux paraîtraient rentrés par rapport au champ de
          recherche qui les surmonte. Même parti que le volet de la Bible classique, dont
          le défileur retire d'avance ces six pixels à sa gouttière. */}
      {groupes.length > 0 && (
        <div data-visite="peri-sommaire" style={{ marginTop: '14px', marginLeft: '-6px', marginRight: '-6px' }}>
          {TESTAMENTS.map(grp => {
            const livres = groupes.filter(g => (TESTAMENT_LIVRE[g.livre] ?? 'AUTRES') === grp.code)
            if (livres.length === 0) return null
            const ouvert = sectionsOuvertes.has(grp.code)
            return (
              <div key={grp.code}>
                <button type="button" onClick={() => basculerSection(grp.code)} aria-expanded={ouvert}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '9px 6px 5px', textAlign: 'left' }}>
                  <span style={{ fontFamily: SANS, fontSize: '0.75rem', fontWeight: 800, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--cs-vert-fonce)' }}>{grp.label}</span>
                  <span aria-hidden style={{ display: 'inline-flex', color: 'var(--cs-texte-second)' }}><IconeChevron dir={ouvert ? 'up' : 'down'} taille="0.625rem" strokeWidth={1.5} /></span>
                </button>
                {ouvert && livres.map(g => (
                  <button key={g.livre} type="button" className="peri-lien-livre" onClick={() => allerAuLivre(g.livre)}
                    title={`${NOM_LIVRE[g.livre] ?? g.livre} — ${g.list.length} péricope${g.list.length > 1 ? 's' : ''}`}>
                    {NOM_LIVRE[g.livre] ?? g.livre}
                  </button>
                ))}
              </div>
            )
          })}
        </div>
      )}

      <RubriqueVolet>Filtrer</RubriqueVolet>

      {registresPresents.length > 0 && (
        <div data-visite="peri-filtres"><GroupeFiltre label="Registre">
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {registresMontres.map(([cat, n]) => (
              <LigneCompte key={cat} actif={registres.has(cat)} onClick={() => toggle(registres, cat, setRegistres)} label={libelleCategoriePericope(cat)} n={n} />
            ))}
          </div>
          {(registresCaches > 0 || tousRegistres) && (
            <LienDiscret onClick={() => setTousRegistres(o => !o)}>
              {tousRegistres ? 'Afficher moins' : `Afficher les ${registresCaches} autres`}
            </LienDiscret>
          )}
        </GroupeFiltre></div>
      )}

      {filtresActifs && <BoutonReinitialiser onClick={reinitialiser} />}
    </>
  )

  return (
    <main style={{ background: FOND, minHeight: HAUTEUR_SOUS_NAVBAR }}>
      <style>{`
        /* ── Le volet ───────────────────────────────────────────────────────── */
        /* Naviguer et filtrer ne se ressemblent pas : un lien de livre prend le vert
           et se souligne au survol, une case de filtre porte son marqueur carré. */
        /* La rangée d'un livre est celle du volet de la Bible classique : pleine largeur,
           au fer à gauche, dans la police et le corps de la liste des livres. ⚠️ Le nom
           s'enroule plutôt que d'être coupé — « 1 Thessaloniciens » tient sur une ligne à
           la racine 16, non sur un volet resserré, et un nom de livre rogné ne se lit pas. */
        .peri-lien-livre {
          display: flex; align-items: center; width: 100%; min-height: 24px;
          padding: 4px 6px; border-radius: 4px; box-sizing: border-box;
          font-family: ${SANS}; font-size: 0.84375rem; line-height: 1.4; color: var(--cs-texte-second);
          background: none; border: none; text-align: left; cursor: pointer;
          transition: color var(--cs-duree-courte), background var(--cs-duree-courte);
        }
        .peri-lien-livre:hover { color: var(--cs-encre); background: rgba(var(--cs-vert-rgb),0.10); }

        /* ── La liste ───────────────────────────────────────────────────────── */
        /* Un livre = une rangée de deux cases : son nom dans la marge, ses entrées à
           droite. Le nom est COLLANT — il accompagne ses 52 péricopes au lieu de les
           annoncer une fois puis de disparaître. */
        .peri-groupe { display: grid; grid-template-columns: 8.5rem 1fr; column-gap: 1.75rem; margin-bottom: 1.625rem; }
        .peri-marge { text-align: right; }
        .peri-marge-in { position: sticky; top: calc(${HAUTEUR_NAVBAR} + ${HAUTEUR_ONGLETS} + 14px); padding-top: 1px; }
        .peri-marge h2 {
          font-family: ${SERIF}; font-size: 1rem; font-weight: 500; color: var(--cs-encre);
          margin: 0; line-height: 1.2; letter-spacing: 0.01em;
        }

        /* En mobile, la marge n'a plus lieu d'être : le nom coiffe ses entrées, au fer
           à gauche, prolongé d'un filet qui s'estompe. */
        .peri-groupe--mobile { display: block; margin-bottom: 1.625rem; }
        .peri-groupe--mobile .peri-marge { display: flex; align-items: baseline; gap: 11px; text-align: left; margin-bottom: 7px; }
        .peri-groupe--mobile .peri-marge-in { position: static; }
        .peri-groupe--mobile .peri-marge .rule { flex: 1; height: 1px; align-self: center; background: linear-gradient(to right, var(--cs-bord), transparent); }
        /* La colonne des références se resserre sur un écran étroit : à sa largeur de
           bureau elle y prendrait le quart de la mesure. */
        .peri-groupe--mobile .peri-entree { grid-template-columns: 4.5rem minmax(0, 1fr); column-gap: 0.75rem; }

        /* ── Les onglets ────────────────────────────────────────────────────── */
        /* Le partage du corpus se prend en haut et y demeure : la barre est collante sous
           la barre de navigation, comme le volet à sa gauche, et le nom des livres vient
           se garer dessous. */
        .peri-onglets {
          position: sticky; top: ${HAUTEUR_NAVBAR}; z-index: 3;
          height: ${HAUTEUR_ONGLETS};
          box-sizing: border-box; padding-top: 0.5rem; margin-bottom: 1.125rem;
          background: ${FOND};
        }
        /* ⚠️ Le DESSIN des onglets vient du modèle commun (« .cs-onglets » et
           « .cs-onglet », dans globals.css) : police, corps, encres, filets et graisse.
           Il n'en reste ici que ce qui est propre à CETTE barre — la barre
           collante, sa hauteur, et son repli en mobile. La barre portait le
           sérif et un corps à elle ; c'est du chrome, elle prend le sans. */
        .peri-onglets .sep { flex-shrink: 0; width: 1px; height: 14px; align-self: center; background: var(--cs-bord-clair); }
        .peri-onglets .peri-onglet { padding: 0 8px; white-space: nowrap; }
        /* En mobile, les parts égales seraient plus courtes que « Nouveau Testament » :
           les onglets repartent donc de leur propre largeur (flex: 1 1 auto) et ne se
           partagent que le jeu qui reste. On resserre le blanc et le corps plutôt que
           d'abréger « Testament » ; plus étroit que 375 px, la barre glisse — mieux vaut
           un onglet à découvrir qu'un nom de testament rogné.
           ✅ La graisse, elle, ne bouge PLUS : elle avait dû être abandonnée ici faute
           de jeu à distribuer, chaque libellé passé à 600 poussant ses voisins. Le
           modèle réserve désormais la largeur en 600 d'avance, par un double
           invisible, et la barre garde son signal d'onglet retenu sur un téléphone. */
        .peri-onglets--mobile { overflow-x: auto; overscroll-behavior-x: contain; }
        .peri-onglets--mobile .peri-onglet { flex: 1 1 auto; font-size: 0.6875rem; }

        /* Rubrique de Testament : le seul rang au-dessus du livre. Sans elle, la
           descente de 48 livres n'avait aucune articulation. */

        /* ── Une entrée ─────────────────────────────────────────────────────── */
        /* Deux cases : la référence dorée dans sa colonne, puis la péricope. Les
           références partent toutes du même fer, chiffres à chasse fixe, et se lisent
           comme la colonne de numéros d'un index ; le titre commence là où commencent
           tous les autres. Glose italique contre le titre, première phrase de la notice
           dessous, et un chevron doré qui paraît au survol et mène à la péricope. */
        .peri-entrees { display: flex; flex-direction: column; gap: 11px; }
        /* La case du corps ne doit jamais imposer sa largeur intrinsèque à la piste :
           minmax(0, 1fr) et min-width: 0 la font replier son texte. */
        .peri-entree {
          display: grid; grid-template-columns: 4.75rem minmax(0, 1fr); column-gap: 1.125rem; align-items: baseline;
          text-decoration: none; color: inherit;
          padding: 3px 4px; border-radius: 4px; transition: background var(--cs-duree-courte) ease;
        }
        .peri-entree:hover, .peri-entree:focus-visible { background: rgba(var(--cs-vert-rgb), 0.055); }
        .peri-ref { font-family: ${SERIF}; font-size: 0.71875rem; color: var(--cs-or); font-variant-numeric: tabular-nums; white-space: nowrap; }
        .peri-corps { min-width: 0; }
        .peri-titre { display: block; font-family: ${SERIF}; font-size: 0.875rem; font-weight: 500; color: var(--cs-encre-fonce); line-height: 1.26; transition: color var(--cs-duree-courte) ease; }
        .peri-entree:hover .peri-titre, .peri-entree:focus-visible .peri-titre { color: ${VERT}; }
        .peri-glose { margin-left: 6px; font-family: ${SERIF}; font-style: italic; font-size: 0.6875rem; font-weight: 400; color: var(--cs-texte-gris); }
        .peri-l2 { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; margin-top: 2px; }
        /* La notice est bornée à deux lignes : la première phrase fait 118 signes en
           moyenne et tient donc sur une, mais quelques-unes débordent. */
        .peri-notice {
          flex: 1; min-width: 0; font-family: ${SERIF}; font-size: 0.75rem; line-height: 1.45;
          color: var(--cs-texte-second);
          display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden;
        }
        .peri-fleche {
          flex-shrink: 0; display: inline-flex; align-items: center; line-height: 0;
          color: var(--cs-or); opacity: 0; transform: translateX(-3px);
          transition: opacity var(--cs-duree-courte) ease, transform var(--cs-duree-courte) ease;
        }
        .peri-entree:hover .peri-fleche,
        .peri-entree:focus-visible .peri-fleche { opacity: 1; transform: translateX(0); }
        @media (hover: none) { .peri-fleche { opacity: 0.5; transform: none; } }
        .peri-via { display: block; margin-top: 2px; font-family: ${SERIF}; font-style: italic; font-size: 0.6875rem; color: var(--cs-etiquette); }

        @media (prefers-reduced-motion: reduce) {
          .peri-entree, .peri-titre, .peri-fleche, .peri-lien-livre { transition: none; }
        }
      `}</style>
      <div style={{ display: 'flex', flexDirection: mobile ? 'column' : 'row', alignItems: 'stretch', width: '100%' }}>

        {/* ── Volet des filtres (repliable en mobile). ── */}
        {/* Chapeau : la définition, et rien d’autre, composée par le volet commun. Énumération
            par deux-points, pas d'incise entre tirets. */}
        <VoletPage mobile={mobile} titre="Les péricopes"
          chapeau={<>Une péricope est un passage biblique formant une unité de sens&nbsp;: récit, parabole, discours ou psaume.</>}
          idContenu="pericopes-filtres" libelleRepli="Rechercher et filtrer" actifs={filtresActifs}
          ouvert={panneauOuvert} surBascule={() => setPanneauOuvert(o => !o)}>
          {contenuFiltres}
        </VoletPage>

        {/* ── La liste ── */}
        {/* La mesure se CENTRE sur la FENÊTRE depuis le 2026-09-24 (charte § 38.39), non
            plus dans la colonne ; elle ne passe jamais sous le volet. Le fer à gauche du
            2026-08-22 rendait la page bancale, le centrage dans la colonne la décalait
            d'une demi-largeur de volet. La mesure reste à 52rem. */}
        <section style={styleColonnePage(mobile)}>
          <div style={styleMesureCentree('52rem', mobile)}>

            {/* Le partage du corpus, en tête et à demeure. Ce sont des FILTRES, non des
                panneaux : d'où aria-pressed dans un groupe nommé, et non un tablist. */}
            <div role="group" aria-label="Testament"
              className={mobile
                ? 'cs-onglets peri-onglets peri-onglets--mobile cs-defilement-discret'
                : 'cs-onglets peri-onglets'}>
              {onglets.map((o, i) => (
                <Fragment key={o.code}>
                  {i > 0 && <span aria-hidden="true" className="cs-onglets-sep sep" />}
                  <button type="button" className="cs-onglet peri-onglet" aria-pressed={testament === o.code}
                    onClick={() => setTestament(o.code)}>
                    <span className="cs-onglet-libelle" data-libelle={o.label}>{o.label}</span>
                  </button>
                </Fragment>
              ))}
            </div>

            {groupes.length === 0 ? (
              <div style={{ paddingTop: '20px' }}>
                <MentionVide>Aucune péricope ne correspond aux filtres retenus.</MentionVide>
                {filtresActifs && (
                  <button type="button" onClick={reinitialiser}
                    style={{ marginTop: '12px', padding: '6px 14px', borderRadius: '8px', cursor: 'pointer', border: `1px solid ${BORD}`, background: 'var(--cs-surface)', color: 'var(--cs-texte-second)', fontFamily: SERIF, fontSize: '0.78125rem' }}>
                    Réinitialiser les filtres
                  </button>
                )}
              </div>
            ) : (
              <div>
                {groupes.map(g => (
                  <div key={g.livre} id={`livre-${g.livre}`}
                    className={mobile ? 'peri-groupe--mobile' : 'peri-groupe'}
                    style={{ scrollMarginTop: `calc(${HAUTEUR_NAVBAR} + ${HAUTEUR_ONGLETS} + 12px)` }}>
                    <div className="peri-marge">
                      <div className="peri-marge-in">
                        <h2>{NOM_LIVRE[g.livre] ?? g.livre}</h2>
                      </div>
                      {mobile && <span className="rule" aria-hidden="true" />}
                    </div>
                    <div className="peri-entrees">
                      {g.list.map(it => {
                        const via = viaAppellation[it.id]
                        const glose = gloseEntree(it)
                        return (
                          <Link key={it.id} href={`/pericopes/${it.id}`} className="peri-entree">
                            <span className="peri-ref">{refDansLivre(it.canon_debut, it.canon_fin)}</span>
                            <div className="peri-corps">
                              <span className="peri-titre">
                                {rendreTexteEnrichi(it.nom)}
                                {glose && <span className="peri-glose">{glose}</span>}
                              </span>
                              {/* La rangée existe même sans notice : c'est elle qui porte
                                  le chevron, seule affordance de navigation de l'entrée. */}
                              <div className="peri-l2">
                                <span className="peri-notice">{it.notice_debut ? rendreTexteEnrichi(it.notice_debut) : ''}</span>
                                <span className="peri-fleche" aria-hidden="true">
                                  <IconeChevron dir="right" taille="0.8125rem" strokeWidth={1.5} />
                                </span>
                              </div>
                              {via && <span className="peri-via">trouvé via «&#8239;{via}&#8239;»</span>}
                            </div>
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
        {pendant && <div aria-hidden style={STYLE_PENDANT_VOLET} />}
      </div>
      {visite > 0 && <VisiteGuidee key={visite} visite={VISITE_PERICOPES} onFin={() => setVisite(0)} />}
    </main>
  )
}
