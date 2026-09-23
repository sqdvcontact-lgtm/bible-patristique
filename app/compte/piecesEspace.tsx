'use client'

// LES PIÈCES DE L'ESPACE DU LECTEUR — le sommaire, le bandeau, la rangée de champ.
//
// ⛔ Elles vivent ICI et non dans chaque page : les deux pages les partagent, et une
// forme recopiée à deux endroits ne reste identique que par accident. C'est la même
// raison qui a réuni `stylesVoletLecture.ts`.

import React, { useCallback, useEffect, useId, useRef, useState } from 'react'
import Link from 'next/link'
import { allerAAncre } from '@/app/lib/defilement'
import { HAUTEUR_NAVBAR } from '@/app/lib/mesures'
import { PAGES_ESPACE, type GroupeAncres, type PageEspace } from '@/app/lib/espaceLecteurNavigation'
import PortraitLecteur from '@/app/components/PortraitLecteur'
import { CADRAGE_PAR_DEFAUT } from '@/app/lib/portraits'
import { SERIF } from '@/app/lib/polices'
import { TITRE_CARTE } from '@/app/lib/hierarchieTitres'

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

export function SommaireEspace({ page, groupes, surAncre }: {
  page: PageEspace
  groupes: GroupeAncres[]
  /** Ce que la page a à faire AVANT le saut — déplier le groupe visé, par exemple.
   *  ⚠️ Il s'appelle avant `allerAAncre`, et il ne doit rien déplacer AU-DESSUS de la
   *  cible : ce qui s'ouvre sous elle ne change pas sa place. */
  surAncre?: (id: string) => void
}) {
  const ids = groupes.flatMap(g => g.ancres.map(a => a.id))
  const active = useSectionEnVue(ids)

  return (
    <nav className="esp-sommaire" aria-label="Sommaire">
      {/* ⛔ Les pages se lisent EN COLONNE, une par ligne, depuis qu'elles sont quatre.
          En onglets, elles demandaient 288 px dans une colonne qui en offre 216, et
          « Mon parcours » se coupait en deux. La forme est celle des options d'un volet
          de lecture, et c'est déjà celle des ancres qui suivent : une seule grammaire
          pour toute la colonne. */}
      <div className="esp-pages">
        {PAGES_ESPACE.map(p => (
          <Link key={p.cle} className="esp-lien" href={p.href}
            aria-current={p.cle === page ? 'page' : undefined}>
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
              onClick={e => { surAncre?.(a.id); if (allerAAncre(a.id)) e.preventDefault() }}
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

/** Une action du menu du portrait. */
export type ActionPortrait = { label: string; onChoisir: () => void }

/** Le portrait du bandeau, quand il porte un menu : un clic l'ouvre, et les actions
 *  s'y choisissent. ⛔ Le portrait n'a plus de rangée à lui dans la page (auteur,
 *  2026-09-22) : c'est le visage lui-même qu'on touche pour le changer. */
function PortraitAvecMenu({ visage, actions, nom }: { visage: React.ReactNode; actions: ActionPortrait[]; nom?: string }) {
  const [ouvert, setOuvert] = useState(false)
  const cadre = useRef<HTMLDivElement>(null)
  const bouton = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const idMenu = useId()

  const fermer = useCallback((rendreLeFoyer: boolean) => {
    setOuvert(false)
    if (rendreLeFoyer) bouton.current?.focus()
  }, [])

  // Le foyer entre dans le menu à l'ouverture ; un clic à côté ou Échap le ferme.
  useEffect(() => {
    if (!ouvert) return
    menu.current?.querySelector<HTMLButtonElement>('button')?.focus()
    const dehors = (e: PointerEvent) => {
      if (!cadre.current?.contains(e.target as Node)) fermer(false)
    }
    const touche = (e: KeyboardEvent) => { if (e.key === 'Escape') fermer(true) }
    document.addEventListener('pointerdown', dehors)
    document.addEventListener('keydown', touche)
    return () => {
      document.removeEventListener('pointerdown', dehors)
      document.removeEventListener('keydown', touche)
    }
  }, [ouvert, fermer])

  const circuler = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return
    e.preventDefault()
    const items = [...(menu.current?.querySelectorAll<HTMLButtonElement>('button') ?? [])]
    const i = items.indexOf(document.activeElement as HTMLButtonElement)
    const pas = e.key === 'ArrowDown' ? 1 : -1
    items[(i + pas + items.length) % items.length]?.focus()
  }

  return (
    <div className="esp-portrait" ref={cadre}>
      <button ref={bouton} type="button" className="esp-portrait-bouton"
        aria-label="Changer de portrait" title={nom || 'Changer de portrait'}
        aria-haspopup="menu" aria-expanded={ouvert} aria-controls={ouvert ? idMenu : undefined}
        onClick={() => setOuvert(o => !o)}>
        {visage}
      </button>
      {ouvert && (
        <div ref={menu} id={idMenu} role="menu" className="esp-menu-portrait" onKeyDown={circuler}>
          {actions.map(a => (
            <button key={a.label} type="button" role="menuitem"
              onClick={() => { fermer(false); a.onChoisir() }}>
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/** ⛔ CONDENSÉ (auteur, 1er septembre 2026 : « je veux que le bandeau nom, prénom,
 *  pseudo, photo soit condensé et propre »). Le visage, le pseudonyme, et sous lui
 *  les repères, une ligne chacun : le nom civil, puis ce que la page a de chiffré.
 *
 *  ⛔ Le portrait est CARRÉ et aussi haut que ce bloc (auteur, 2026-09-22 : « embrasser
 *  tout le bloc qui la contient »). ⛔ Le renvoi « Ma page publique » a quitté le
 *  bandeau le même jour : il se pose à côté du titre « Page publique » de « Mon
 *  compte », et le menu de compte le porte sur toutes les pages. */
export function BandeauEspace({ visage, pseudo, reperes, actionsPortrait, nomPortrait }: {
  visage: React.ReactNode
  pseudo: string
  /** Une ligne par repère. */
  reperes: string | string[]
  /** Les actions du menu qu'ouvre le portrait. Sans elles, le portrait n'est qu'une image. */
  actionsPortrait?: ActionPortrait[]
  nomPortrait?: string
}) {
  return (
    <header className="esp-bandeau">
      {actionsPortrait?.length
        ? <PortraitAvecMenu visage={visage} actions={actionsPortrait} nom={nomPortrait} />
        : <div className="esp-portrait">{visage}</div>}
      <div className="esp-bandeau-nom">
        <h1 title={pseudo}>{pseudo}</h1>
        {[reperes].flat().map(r => <p key={r} className="esp-reperes">{r}</p>)}
      </div>
    </header>
  )
}

/** Le bandeau d'une page de l'espace, portrait compris.
 *
 *  ⛔ Les trois pages le composaient chacune pour elle-même : douze lignes de cadrage
 *  recopiées, dont deux exemplaires seulement avant que la chaîne n'en demande un
 *  troisième. Trois copies d'une même forme ne restent identiques que par accident.
 *
 *  ⚠️ Le lecteur est décrit par sa FORME et non par le type `ProfilLecteur` : celui-ci
 *  vit dans le cadre (`EspaceCompte`), qui importe déjà la feuille d'ici, et les deux
 *  modules se noueraient. */
export type LecteurDuBandeau = {
  pseudo: string
  avatar_ref: string | null
  avatar_pos_x: number | null
  avatar_pos_y: number | null
  avatar_zoom: number | null
}

export function BandeauLecteur({ lecteur, reperes, actionsPortrait, nomPortrait }: {
  lecteur: LecteurDuBandeau
  reperes: string | string[]
  actionsPortrait?: ActionPortrait[]
  nomPortrait?: string
}) {
  return (
    <BandeauEspace
      pseudo={lecteur.pseudo}
      reperes={reperes}
      actionsPortrait={actionsPortrait}
      nomPortrait={nomPortrait}
      visage={
        <PortraitLecteur
          refPortrait={lecteur.avatar_ref}
          cadrage={{
            posX: lecteur.avatar_pos_x ?? CADRAGE_PAR_DEFAUT.posX,
            posY: lecteur.avatar_pos_y ?? CADRAGE_PAR_DEFAUT.posY,
            zoom: lecteur.avatar_zoom ?? CADRAGE_PAR_DEFAUT.zoom,
          }}
          initiale={lecteur.pseudo}
          taille={52} carre />
      } />
  )
}

// ── Une section de page, et son titre ────────────────────────────────────────

/** ⚠️ `titre` est facultatif : la première section de « Mon compte » (pseudonyme,
 *  prénom, nom) suit le bandeau sans titre, qui ne disait rien de plus que ses champs. */
export function Section({ id, titre, renvoi, children }: {
  id: string
  titre?: string
  /** Un lien posé sur la ligne du titre, à sa droite. */
  renvoi?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section id={id} className="esp-section">
      {titre && (renvoi
        ? <div className="esp-section-tete"><h2>{titre}</h2>{renvoi}</div>
        : <h2>{titre}</h2>)}
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
/* ⚠️ 13,5rem et non 12,5 depuis que les onglets sont TROIS : « Mon compte » et
   « Mon parcours » en demandaient 135 px à eux deux, « Mes annotations » en ajoute une
   soixantaine, et les libellés se coupaient en deux lignes. On élargit la colonne
   plutôt que d'abréger ce que l'auteur a nommé — une mesure est un réglage, un nom
   est une décision. */
.esp-sommaire { width: 13.5rem; flex-shrink: 0; position: sticky; top: calc(${HAUTEUR_NAVBAR} + 1.5rem); }
.esp-page { flex: 1; min-width: 0; }

/* ⛔ Le sommaire suit le VOLET DE LA BIBLE : rubrique en casse ordinaire, rangée
   pleine largeur qui déborde de sept pixels, et l'entrée courante marquée d'une
   PASTILLE et de rien d'autre. L'auteur a refusé le filet à gauche le 1er septembre
   2026 ; les valeurs sont celles de app/lib/stylesVoletLecture.ts.

   ⛔ Les PAGES prennent la même rangée que les ancres, et le filet dit ce qui les
   sépare : au-dessus on NAVIGUE, au-dessous on saute dans la page qu'on lit. La barre
   d'onglets qu'elles portaient jusqu'au 7 septembre 2026 tenait à deux, se serrait à
   trois et débordait à quatre — une barre d'onglets sur deux rangées n'est plus une
   barre mais une grille (la sous-barre de l'administration a tranché ce cas). */
.esp-pages { margin: 0 0 14px; padding-bottom: 12px;
  border-bottom: 1px solid var(--cs-bord-clair); }
.esp-rubrique { display: block; font-size: 0.625rem; font-weight: 600; letter-spacing: 0.06em;
  color: var(--cs-texte-second); margin: 0 0 1px; }
.esp-groupe + .esp-groupe { margin-top: 14px; }
.esp-lien { display: block; width: calc(100% + 14px); margin: 0 -7px; box-sizing: border-box;
  padding: 2px 7px; border-radius: 4px; font-size: 0.71875rem; line-height: 1.3;
  color: var(--cs-texte-second); text-decoration: none;
  transition: background 0.12s, color 0.12s; }
.esp-lien:hover, .esp-lien:focus-visible { background: rgba(var(--cs-vert-rgb), 0.05); color: var(--cs-texte); }
.esp-lien[aria-current] { background: rgba(var(--cs-vert-rgb), 0.10); color: var(--cs-encre); font-weight: 600; }

/* ⛔ UNE GRILLE ET NON UN FLEX : le portrait carré prend la HAUTEUR du bloc de texte
   (« stretch ») et en tire sa largeur par « aspect-ratio ». Un élément flexible ne sait
   pas faire ce trajet : mesuré dans Chrome, il tombait à zéro pixel de large. Le
   plancher de largeur est un filet de sûreté pour un moteur qui ne le saurait pas non
   plus.
   ⚠️ Le pseudonyme tient en DEUX lignes au plus : le carré suivant le bloc, un
   pseudonyme de quarante signes le portait à 147 px sur un téléphone de 320. */
.esp-bandeau { display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: stretch;
  gap: 14px; padding-bottom: 12px; border-bottom: 1px solid var(--cs-bord-clair); margin-bottom: 20px; }
.esp-bandeau h1 { font-family: ${SERIF}; font-size: ${TITRE_CARTE};
  font-weight: normal; color: var(--cs-encre-fonce); margin: 0; line-height: 1.1;
  display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; line-clamp: 2;
  overflow: hidden; overflow-wrap: anywhere; }
.esp-reperes { font-size: 0.625rem; letter-spacing: 0.1em; text-transform: uppercase;
  color: var(--cs-texte-second); margin: 3px 0 0; line-height: 1.4; }
.esp-reperes + .esp-reperes { margin-top: 1px; }

/* Le portrait qui ouvre son menu : un anneau au survol dit qu'on peut le toucher. */
.esp-portrait { position: relative; aspect-ratio: 1; min-width: 2.75rem; }
.esp-portrait-bouton { display: block; width: 100%; height: 100%; padding: 0; border: none;
  background: none; border-radius: 4px; cursor: pointer; transition: box-shadow 0.12s; }
.esp-portrait-bouton:hover, .esp-portrait-bouton[aria-expanded="true"] {
  box-shadow: 0 0 0 2px rgba(var(--cs-vert-rgb), 0.45); }
.esp-menu-portrait { position: absolute; top: calc(100% + 6px); left: 0; z-index: 20;
  min-width: 11rem; padding: 4px; background: var(--cs-surface);
  border: 1px solid var(--cs-bord); border-radius: 8px; box-shadow: var(--cs-ombre-nette); }
.esp-menu-portrait button { display: block; width: 100%; text-align: left; padding: 7px 10px;
  border: none; border-radius: 4px; background: none; cursor: pointer; font-family: inherit;
  font-size: 0.78125rem; color: var(--cs-texte); }
.esp-menu-portrait button:hover, .esp-menu-portrait button:focus-visible {
  background: rgba(var(--cs-vert-rgb), 0.08); color: var(--cs-encre); }
@media (hover: none) { .esp-menu-portrait button { min-height: 2.25rem; } }
.esp-alerte { font-size: 0.71875rem; color: var(--cs-danger-fonce); margin: -10px 0 16px; }

/* ⚠️ Le décalage d'ancre se compose sur HAUTEUR_NAVBAR, jamais en pixels : la barre
   mesure 56 px à la racine 16 et 77 px à la racine 22 (charte, « Responsive »). */
.esp-section { scroll-margin-top: calc(${HAUTEUR_NAVBAR} + 1.5rem); }
.esp-section + .esp-section { margin-top: 34px; padding-top: 26px;
  border-top: 1px solid var(--cs-bord-clair); }
.esp-section > h2, .esp-section-tete h2 { font-family: ${SERIF};
  font-style: italic; font-weight: normal; font-size: 0.84375rem; color: var(--cs-vert); margin: 0 0 14px; }
/* Un titre et son renvoi sur la même ligne, le renvoi au fer à droite. */
.esp-section-tete { display: flex; align-items: baseline; justify-content: space-between;
  gap: 4px 14px; flex-wrap: wrap; margin: 0 0 14px; }
.esp-section-tete h2 { margin: 0; }

/* ⛔ « MON COMPTE » EST CONDENSÉ (auteur, 2026-09-22 : « condense un peu tout ») : ses
   sections se suivent de plus près que celles des pages qui se LISENT, où le blanc
   sépare des livres et des auteurs. Ici il ne sépare que des réglages. */
.esp-page--compte .esp-section + .esp-section { margin-top: 22px; padding-top: 18px; }
.esp-page--compte .esp-section > h2, .esp-page--compte .esp-section-tete { margin-bottom: 8px; }

.esp-rangee { display: grid; grid-template-columns: 8.5rem 1fr; gap: 14px;
  align-items: start; padding: 4px 0; }
/* ⛔ La colonne d'étiquettes de 8,5rem ne laissait que 122px au champ sur un
   téléphone de 320, 177 sur un de 375 : sous 640 l'étiquette monte au-dessus de
   ce qu'elle nomme, et le champ prend la mesure entière. */
@media (max-width: 640px) {
  .esp-rangee { grid-template-columns: 1fr; gap: 4px; }
  .esp-rangee > label, .esp-etiquette { padding-top: 0; }
}
/* ⛔ Les étiquettes en casse ordinaire (auteur, 2026-09-22 : « plus propre, plus
   lisible ») : les petites capitales espacées de 10 px se lisaient mal, et chaque
   rangée criait son nom. Le blanc du haut pose l'étiquette sur la ligne du champ. */
.esp-rangee > label, .esp-etiquette { font-size: 0.78125rem; color: var(--cs-texte-second);
  padding-top: 8px; line-height: 1.4; }
.esp-note { display: block; font-size: 0.6875rem; color: var(--cs-texte-gris);
  font-style: italic; margin-top: 3px; line-height: 1.5; }

/* ⛔ Chaque champ à SA mesure : un prénom n'a pas la largeur d'une bio. Tous
   faisaient 636 px avant la refonte, mot de passe compris. */
.esp-court { width: 12rem; max-width: 100%; }
.esp-moyen { width: 19rem; max-width: 100%; }
.esp-menu { width: 15rem; max-width: 100%; }
.esp-long { width: 100%; max-width: 26rem; resize: vertical; }

/* ⛔ EN COLONNE (auteur, 1er septembre 2026 : « ce qui paraît : plutôt une
   colonne »). En rang, les quatre bascules débordaient la mesure et se coupaient. */
.esp-bascules { display: flex; flex-direction: column; gap: 8px; padding-top: 5px; }

/* Le pied d'une section qui s'enregistre : sous les champs, aligné sur eux. */
.esp-actions { display: flex; align-items: center; gap: 14px; flex-wrap: wrap;
  margin: 6px 0 0 calc(8.5rem + 14px); min-height: 2rem; }
@media (max-width: 640px) { .esp-actions { margin-left: 0; } }
/* ⛔ Centré (auteur, 2026-09-22) : ces deux actions ne règlent rien de la colonne des
   champs, elles ferment la page. */
.esp-pied { margin-top: 24px; padding-top: 14px; border-top: 1px solid var(--cs-bord-clair);
  display: flex; justify-content: center; gap: 8px 22px; font-size: 0.6875rem; flex-wrap: wrap; }
.esp-pied button { background: none; border: none; padding: 0; cursor: pointer;
  font-family: inherit; font-size: inherit; color: var(--cs-texte-doux); }
.esp-pied button.esp-danger { color: var(--cs-danger); }

/* ⚠️ Sous 900px le sommaire ne peut plus tenir à gauche : il passe au-dessus, et
   ne garde que les quatre PAGES — une liste d'ancres empilée y ferait un
   rouleau avant le premier mot de la page.
   ⚠️ 900px, le seuil de la charte, et non les 60rem d'avant : ils valaient 960 et
   n'appartenaient à aucun des huit seuils admis (audit du 2026-09-06).
   ⚠️ Les pages y perdent le débord de sept pixels, qui n'a de sens que dans une
   colonne étroite, et se rangent en grille (ci-dessous). */
@media (max-width: 900px) {
  /* ⚠️ « stretch » et non plus « flex-start » : en colonne, un enfant à la largeur de
     son contenu se règle sur son plus long mot — le menu des traductions de « Mes
     citations » portait la page à 476 px sur un téléphone de 375. */
  .esp-cadre { flex-direction: column; align-items: stretch; gap: 14px; }
  .esp-sommaire { width: 100%; position: static; }
  .esp-groupe { display: none; }
  /* ⛔ AU TÉLÉPHONE, LES QUATRE PAGES SONT UNE GRILLE DE DEUX SUR DEUX (2026-09-22).
     En ligne, elles ne tenaient pas dans 375 px : le rang débordait, les libellés se
     coupaient, et la page gagnait un défilement horizontal. Quatre cases égales, sans
     pastille ; des filets fins pour seule séparation ; la page ouverte en vert et en
     graisse 600. Les libellés restent entiers : un nom est une décision de l'auteur. */
  .esp-pages { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr));
    margin: 0; padding: 0; border-top: 1px solid var(--cs-bord-clair);
    border-bottom: 1px solid var(--cs-bord-clair); }
  .esp-pages .esp-lien { width: auto; margin: 0; border-radius: 0; box-sizing: border-box;
    display: flex; align-items: center; justify-content: center; text-align: center;
    min-height: 2.5rem; padding: 6px 8px; font-size: 0.78125rem; min-width: 0;
    overflow-wrap: anywhere; }
  .esp-pages .esp-lien:nth-child(odd) { border-right: 1px solid var(--cs-bord-clair); }
  .esp-pages .esp-lien:nth-child(-n+2) { border-bottom: 1px solid var(--cs-bord-clair); }
  .esp-pages .esp-lien:hover, .esp-pages .esp-lien:focus-visible { background: rgba(var(--cs-vert-rgb), 0.04); }
  .esp-pages .esp-lien[aria-current] { background: none; color: var(--cs-vert); font-weight: 600; }
}
/* ⛔ RIEN NE DÉBORDE UN TÉLÉPHONE. La gouttière descend à 16 px, le bandeau se
   resserre, et un pseudonyme long se coupe au lieu de pousser la page. */
@media (max-width: 640px) {
  .esp-cadre { padding: 16px 16px 72px; }
  .esp-bandeau { gap: 12px; padding-bottom: 10px; margin-bottom: 16px; }
}
`
