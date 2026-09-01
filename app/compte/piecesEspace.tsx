'use client'

// LES PIÈCES DE L'ESPACE DU LECTEUR — le sommaire, le bandeau, la rangée de champ.
//
// ⛔ Elles vivent ICI et non dans chaque page : les deux pages les partagent, et une
// forme recopiée à deux endroits ne reste identique que par accident. C'est la même
// raison qui a réuni `stylesVoletLecture.ts`.

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { allerAAncre } from '@/app/lib/defilement'
import { HAUTEUR_NAVBAR } from '@/app/lib/mesures'
import { PAGES_ESPACE, type GroupeAncres, type PageEspace } from '@/app/lib/espaceLecteurNavigation'

// ── Le sommaire ──────────────────────────────────────────────────────────────

/** Suit la section à l'écran pour la marquer dans le sommaire.
 *
 *  ⚠️ Par `IntersectionObserver` et non par un `onScroll` : la page d'œuvre a dû
 *  brider le sien à une mesure par image (charte, « Perf du chemin de lecture »),
 *  et l'observateur ne coûte rien puisqu'il ne parle que lorsqu'une frontière est
 *  franchie. ⛔ La marge basse à -60 % fait que la section ACTIVE est celle du haut
 *  de l'écran, non celle du milieu : sans elle, la dernière section d'une page
 *  courte ne s'allume jamais. */
function useSectionEnVue(ids: string[]): string | null {
  const [active, setActive] = useState<string | null>(ids[0] ?? null)
  const cle = ids.join('|')

  useEffect(() => {
    const liste = cle ? cle.split('|') : []
    const noeuds = liste.map(id => document.getElementById(id)).filter(Boolean) as HTMLElement[]
    if (!noeuds.length) return
    const vues = new Map<string, boolean>()
    const obs = new IntersectionObserver(entrees => {
      for (const e of entrees) vues.set(e.target.id, e.isIntersecting)
      const premier = liste.find(id => vues.get(id))
      if (premier) setActive(premier)
    }, { rootMargin: '-20% 0px -60% 0px' })
    noeuds.forEach(n => obs.observe(n))
    return () => obs.disconnect()
  }, [cle])

  return active
}

export function SommaireEspace({ page, groupes }: { page: PageEspace; groupes: GroupeAncres[] }) {
  const ids = groupes.flatMap(g => g.ancres.map(a => a.id))
  const active = useSectionEnVue(ids)

  return (
    <nav className="esp-sommaire" aria-label="Sommaire">
      <div className="esp-onglets">
        {PAGES_ESPACE.map(p => (
          <Link key={p.cle} href={p.href} aria-current={p.cle === page ? 'page' : undefined}>
            {p.label}
          </Link>
        ))}
      </div>

      {groupes.map(g => (
        <div key={g.rubrique} className="esp-groupe">
          <span className="esp-rubrique">{g.rubrique}</span>
          {g.ancres.map(a => (
            <a
              key={a.id}
              className="esp-lien"
              href={`#${a.id}`}
              aria-current={a.id === active ? 'true' : undefined}
              // ⛔ Jamais un `scrollIntoView` doux et nu : il ne s'exécute pas sur
              // certains postes, et la navigation serait alors MORTE (charte,
              // « Défilement doux »). `allerAAncre` vérifie et rattrape.
              onClick={e => { if (allerAAncre(a.id)) e.preventDefault() }}
            >
              {a.label}
            </a>
          ))}
        </div>
      ))}
    </nav>
  )
}

// ── Le bandeau d'identité ────────────────────────────────────────────────────

/** ⛔ CONDENSÉ (auteur, 1er septembre 2026 : « je veux que le bandeau nom, prénom,
 *  pseudo, photo soit condensé et propre »). Le visage, le pseudonyme, et sous lui
 *  UNE ligne de repères — le nom civil et ce que la page a de chiffré. Cinquante-deux
 *  pixels de haut, là où la version d'avant occupait une carte entière. */
export function BandeauEspace({ visage, pseudo, reperes, hrefPublic }: {
  visage: React.ReactNode
  pseudo: string
  reperes: string
  hrefPublic: string | null
}) {
  return (
    <header className="esp-bandeau">
      {visage}
      <div style={{ minWidth: 0 }}>
        <h1>{pseudo}</h1>
        <p className="esp-reperes">{reperes}</p>
      </div>
      {hrefPublic && (
        <a className="esp-public" href={hrefPublic} target="_blank" rel="noopener noreferrer">
          Ma page publique&nbsp;↗
        </a>
      )}
    </header>
  )
}

// ── Une section de page, et son titre ────────────────────────────────────────

export function Section({ id, titre, children }: { id: string; titre: string; children: React.ReactNode }) {
  return (
    <section id={id} className="esp-section">
      <h2>{titre}</h2>
      {children}
    </section>
  )
}

/** Une rangée « étiquette · champ ».
 *
 *  ⛔ `align-items: start` et non `baseline` : une étiquette alignée sur la ligne de
 *  base tombe au BAS d'une zone de texte de trois lignes, ce qui s'est vu sur la
 *  maquette avant qu'on le corrige. */
export function Rangee({ label, pour, children, note }: {
  label: string
  pour?: string
  children: React.ReactNode
  note?: React.ReactNode
}) {
  return (
    <div className="esp-rangee">
      {pour ? <label htmlFor={pour}>{label}</label> : <span className="esp-etiquette">{label}</span>}
      <div>
        {children}
        {note && <span className="esp-note">{note}</span>}
      </div>
    </div>
  )
}

// ── La feuille de l'espace ───────────────────────────────────────────────────
//
// ⚠️ Elle vit dans un littéral de gabarit : nommer les propriétés entre guillemets
// français, jamais entre accents graves, qui fermeraient la chaîne.
export const FEUILLE_ESPACE = `
.esp-cadre { display: flex; gap: 34px; max-width: 54rem; margin: 0 auto;
  padding: 28px 24px 90px; align-items: flex-start; }
.esp-sommaire { width: 12.5rem; flex-shrink: 0; position: sticky; top: calc(${HAUTEUR_NAVBAR} + 1.5rem); }
.esp-page { flex: 1; min-width: 0; }

/* ⛔ Le sommaire suit le VOLET DE LA BIBLE : rubrique en casse ordinaire, rangée
   pleine largeur qui déborde de sept pixels, et l'entrée courante marquée d'une
   PASTILLE et de rien d'autre. L'auteur a refusé le filet à gauche le 1er septembre
   2026 ; les valeurs sont celles de app/lib/stylesVoletLecture.ts. */
.esp-onglets { display: flex; margin: 0 0 16px; border-bottom: 1px solid var(--cs-bord-clair); }
.esp-onglets a { flex: 1; text-align: center; padding: 0 4px 7px; font-size: 0.71875rem;
  text-decoration: none; color: var(--cs-texte-second); border-bottom: 2px solid transparent;
  margin-bottom: -1px; }
.esp-onglets a[aria-current] { color: var(--cs-vert); font-weight: 600;
  border-bottom-color: var(--cs-vert); }
.esp-rubrique { display: block; font-size: 0.59375rem; font-weight: 600; letter-spacing: 0.06em;
  color: var(--cs-texte-faible); margin: 0 0 1px; }
.esp-groupe + .esp-groupe { margin-top: 14px; }
.esp-lien { display: block; width: calc(100% + 14px); margin: 0 -7px; box-sizing: border-box;
  padding: 2px 7px; border-radius: 4px; font-size: 0.71875rem; line-height: 1.3;
  color: var(--cs-texte-second); text-decoration: none;
  transition: background 0.12s, color 0.12s; }
.esp-lien:hover, .esp-lien:focus-visible { background: rgba(var(--cs-vert-rgb), 0.05); color: var(--cs-texte); }
.esp-lien[aria-current] { background: rgba(var(--cs-vert-rgb), 0.10); color: var(--cs-encre); font-weight: 600; }

.esp-bandeau { display: flex; align-items: center; gap: 14px; padding-bottom: 16px;
  border-bottom: 1px solid var(--cs-bord-clair); margin-bottom: 30px; }
.esp-bandeau h1 { font-family: var(--font-source-serif), Georgia, serif; font-size: 1.4375rem;
  font-weight: normal; color: var(--cs-encre-fonce); margin: 0; line-height: 1.1; }
.esp-reperes { font-size: 0.625rem; letter-spacing: 0.1em; text-transform: uppercase;
  color: var(--cs-texte-doux); margin: 5px 0 0; }
.esp-public { margin-left: auto; font-size: 0.71875rem; color: var(--cs-vert);
  text-decoration: none; white-space: nowrap; flex-shrink: 0; }

/* ⚠️ Le décalage d'ancre se compose sur HAUTEUR_NAVBAR, jamais en pixels : la barre
   mesure 56 px à la racine 16 et 77 px à la racine 22 (charte, « Responsive »). */
.esp-section { scroll-margin-top: calc(${HAUTEUR_NAVBAR} + 1.5rem); }
.esp-section + .esp-section { margin-top: 34px; padding-top: 26px;
  border-top: 1px solid var(--cs-bord-clair); }
.esp-section > h2 { font-family: var(--font-source-serif), Georgia, serif; font-style: italic;
  font-weight: normal; font-size: 0.84375rem; color: var(--cs-vert); margin: 0 0 14px; }

.esp-rangee { display: grid; grid-template-columns: 8.5rem 1fr; gap: 14px;
  align-items: start; padding: 7px 0; }
.esp-rangee > label, .esp-etiquette { font-size: 0.625rem; letter-spacing: 0.1em;
  text-transform: uppercase; color: var(--cs-texte-doux); padding-top: 7px; }
.esp-note { display: block; font-size: 0.625rem; color: var(--cs-texte-faible);
  font-style: italic; margin-top: 3px; line-height: 1.5; }
.esp-fixe { font-family: var(--font-source-serif), Georgia, serif; font-size: 0.875rem;
  color: var(--cs-texte-fort); }

/* ⛔ Chaque champ à SA mesure : un prénom n'a pas la largeur d'une bio. Tous
   faisaient 636 px avant la refonte, mot de passe compris. */
.esp-court { width: 12rem; max-width: 100%; }
.esp-moyen { width: 19rem; max-width: 100%; }
.esp-menu { width: 15rem; max-width: 100%; }
.esp-long { width: 100%; max-width: 26rem; resize: vertical; }

/* ⛔ EN COLONNE (auteur, 1er septembre 2026 : « ce qui paraît : plutôt une
   colonne »). En rang, les quatre bascules débordaient la mesure et se coupaient. */
.esp-bascules { display: flex; flex-direction: column; gap: 9px; padding-top: 5px; }

.esp-enregistrer { margin-top: 30px; padding-top: 18px;
  border-top: 1px solid var(--cs-bord-clair); display: flex; align-items: center;
  gap: 14px; flex-wrap: wrap; }
.esp-pied { margin-top: 34px; padding-top: 16px; border-top: 1px solid var(--cs-bord-clair);
  display: flex; gap: 22px; font-size: 0.65625rem; flex-wrap: wrap; }
.esp-pied button { background: none; border: none; padding: 0; cursor: pointer;
  font-family: inherit; font-size: inherit; color: var(--cs-texte-doux); }
.esp-pied button.esp-danger { color: var(--cs-danger); }

/* ⚠️ Sous 60rem le sommaire ne peut plus tenir à gauche : il passe au-dessus, en
   ligne, et ne garde que les deux onglets — une liste d'ancres empilée y ferait un
   rouleau avant le premier mot de la page. */
@media (max-width: 60rem) {
  .esp-cadre { flex-direction: column; gap: 18px; }
  .esp-sommaire { width: 100%; position: static; }
  .esp-groupe { display: none; }
}
`
