'use client'

/**
 * La PLANCHE DES STYLES — quatre ÉPREUVES continues, le style se donnant AU SURVOL.
 *
 * Le texte court d'un bout à l'autre, comme il court sur le site : c'est ainsi
 * seulement qu'on voit les RELATIONS — le blanc qu'un titre laisse sous lui,
 * l'apparat qui suit un commentaire, la citation qui coupe un paragraphe.
 *
 * ⛔ AUCUNE ENVELOPPE AUTOUR D'UNE UNITÉ. Un premier jet en posait une par unité,
 * pour y accrocher sa légende ; elle rompait en silence les règles de VOISINAGE de
 * `globals.css` — `.verset-row + .cs-bible-axe > .cs-bible-bloc` ne trouve plus ses
 * frères quand un `<div>` les sépare —, c'est-à-dire précisément ce que la planche
 * sert à juger. Les contenus sont donc versés À PLAT dans la colonne, et l'on
 * retrouve l'unité survolée par le RANG de son premier nœud.
 *
 * ⛔ ET RIEN N'EST ÉCRIT DANS LE TEXTE. La désignation ne pose ni classe ni style
 * sur les nœuds de l'épreuve : elle peint un RECTANGLE par-dessus, hors du flux et
 * sans événements. Toucher aux nœuds, ce serait modifier la composition que la
 * planche est censée montrer telle quelle.
 *
 * ⚠️ Toutes les légendes ensemble ne tenaient pas : posées au haut de leur unité,
 * elles se recouvraient dès qu'une unité était plus courte que sa notice — trente
 * pixels contre cent cinquante. Une SEULE à la fois, celle qu'on désigne, et le
 * problème disparaît au lieu d'être contourné (proposition de l'auteur, 2026-08-29).
 *
 * ⚠️ Le survol seul ne suffirait pas : il ne se lit pas au clavier et il fuit dès
 * qu'on bouge. Le CLIC épingle donc l'unité, et la liste sous l'épreuve donne les
 * mêmes notices en clair, dans l'ordre, atteignables sans souris.
 */

import { Children, Fragment, isValidElement, useEffect, useRef, useState, type ReactNode } from 'react'
import OngletsPage from '@/app/components/OngletsPage'
import { EPREUVES, type CleOnglet } from './specimens'

/** Les deux fonds du site. Un style ne s'apprécie pas dans l'absolu : il
 *  s'apprécie sur son fond, et le Cuir a déjà fait paraître gris ce qui était vert. */
const FONDS = {
  papier: { nom: 'Papier', theme: 'light' as const },
  cuir: { nom: 'Cuir', theme: 'dark' as const },
}
type CleFond = keyof typeof FONDS

/** Ce que la désignation déborde autour de l'unité, pour ne pas la serrer. */
const DEBORD = 6

const CSS = `
  .pl-page { min-height: calc(100vh - 3.5rem); background: var(--cs-fond); padding: 0 0 6rem; }
  .pl-corps { max-width: 72rem; margin: 0 auto; padding: 0 1.5rem; }
  .pl-entete { padding: 2.5rem 0 1.25rem; }
  .pl-retour { font-family: var(--font-source-sans), Arial, sans-serif; font-size: 0.75rem; color: var(--cs-texte-gris); text-decoration: none; }
  .pl-retour:hover { color: var(--cs-vert); }
  .pl-titre { font-family: var(--font-source-serif), Georgia, serif; font-size: 1.75rem; font-weight: 400; color: var(--cs-encre); margin: 0.35rem 0 0.3rem; }
  .pl-sous-titre { font-size: 0.875rem; color: var(--cs-texte-second); line-height: 1.55; margin: 0; max-width: 46rem; }
  .pl-chapeau { font-size: 0.8125rem; color: var(--cs-texte-second); line-height: 1.55; margin: 1.25rem 0 0; max-width: 46rem; }

  .pl-reglages { display: flex; align-items: center; gap: 0.5rem; padding: 0.9rem 0 0; }
  .pl-etiquette { font-family: var(--font-source-sans), Arial, sans-serif; font-size: 0.6875rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--cs-texte-faible); }
  .pl-bouton { font-family: var(--font-source-sans), Arial, sans-serif; font-size: 0.71875rem; padding: 4px 10px; border-radius: 4px; border: 1px solid var(--cs-bord); background: var(--cs-surface); color: var(--cs-texte-second); cursor: pointer; }
  .pl-bouton:hover { color: var(--cs-vert); }
  .pl-bouton--actif { border-color: var(--cs-vert); color: var(--cs-vert); font-weight: 600; }

  /* ── L'ÉPREUVE ─────────────────────────────────────────────────────────── */
  .pl-epreuve { position: relative; margin-top: 2.25rem; }
  /* La colonne de lecture, à sa mesure exacte. ⛔ Ses enfants sont les contenus
     eux-mêmes : aucune enveloppe ne s'intercale entre deux unités. */
  .pl-colonne { width: min(var(--mesure-ligne), 100%); cursor: pointer; }

  /* ⛔ La désignation ne touche pas au texte : un rectangle peint par-dessus, hors
     du flux et sans événements. Poser une classe sur les nœuds, ce serait modifier
     la composition que la planche montre. */
  .pl-designation { position: absolute; pointer-events: none; border-radius: 4px; }
  .pl-designation--survol { background: rgba(var(--cs-vert-rgb),0.07); outline: 1px solid rgba(var(--cs-vert-rgb),0.28); }
  .pl-designation--epingle { background: rgba(var(--cs-vert-rgb),0.11); outline: 1px solid var(--cs-vert); }

  /* La légende : une SEULE à la fois, donc rien à empiler et rien qui se recouvre. */
  .pl-legende { position: absolute; left: min(var(--mesure-ligne), 100%); width: 17rem; margin-left: 1.75rem; }
  .pl-legende::before { content: ""; position: absolute; left: -1.2rem; top: 0.45rem; width: 0.8rem; height: 1px; background: var(--cs-bord); }
  .pl-style { font-family: var(--font-source-sans), Arial, sans-serif; font-size: 0.71875rem; font-weight: 600; color: var(--cs-encre); line-height: 1.35; margin: 0 0 0.25rem; }
  .pl-note { font-size: 0.71875rem; color: var(--cs-texte-second); line-height: 1.45; margin: 0; }
  .pl-alerte { font-size: 0.6875rem; color: var(--cs-texte-second); line-height: 1.45; margin: 0.4rem 0 0; padding-left: 0.55rem; border-left: 2px solid var(--cs-or-doux); }
  .pl-epingle { font-family: var(--font-source-sans), Arial, sans-serif; font-size: 0.625rem; letter-spacing: 0.06em; text-transform: uppercase; color: var(--cs-vert); margin: 0.5rem 0 0; }

  .pl-invite { font-family: var(--font-source-sans), Arial, sans-serif; font-size: 0.71875rem; color: var(--cs-texte-faible); margin: 1.5rem 0 0; }

  /* ── La liste, sous l'épreuve : les mêmes notices, sans souris ──────────── */
  .pl-liste { margin-top: 3rem; padding-top: 1.25rem; border-top: 1px solid var(--cs-bord); }
  .pl-liste-titre { font-family: var(--font-source-sans), Arial, sans-serif; font-size: 0.6875rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--cs-texte-faible); margin: 0 0 1rem; }
  .pl-entree { display: block; width: 100%; max-width: 46rem; text-align: left; background: none; border: none; border-left: 2px solid var(--cs-bord-clair); padding: 0.35rem 0 0.35rem 0.7rem; margin-bottom: 0.9rem; cursor: pointer; font: inherit; }
  .pl-entree:hover, .pl-entree:focus-visible { border-left-color: var(--cs-vert); }
  .pl-entree--actif { border-left-color: var(--cs-vert); }

  @media (max-width: 1200px) {
    .pl-colonne { width: 100%; }
    /* La marge n'a plus la place : la légende passe sous l'épreuve, dans la liste. */
    .pl-legende { display: none; }
  }
`

/**
 * Verse les contenus À PLAT et retient le RANG du premier nœud de chaque unité.
 *
 * ⛔ C'est ce rang qui remplace l'enveloppe : envelopper aurait rompu les règles de
 * voisinage de `globals.css`, c'est-à-dire ce que la planche sert à juger.
 *
 * ⚠️ Fonction PURE, appelée au rendu ET par la désignation : les deux doivent
 * compter les nœuds de la même façon, sinon le rectangle se pose de travers.
 */
function aplatir(unites: readonly { contenu: ReactNode }[]): { noeuds: ReactNode[]; premiers: number[] } {
  const noeuds: ReactNode[] = []
  const premiers: number[] = []
  for (const unite of unites) {
    premiers.push(noeuds.length)
    for (const enfant of Children.toArray(unite.contenu)) {
      if (isValidElement(enfant) && enfant.type === Fragment) {
        const dedans = (enfant.props as { children?: ReactNode }).children
        for (const petit of Children.toArray(dedans)) noeuds.push(petit)
      } else noeuds.push(enfant)
    }
  }
  return { noeuds, premiers }
}

type Cadre = { haut: number; hauteur: number }

export default function PlancheStyles() {
  const [onglet, setOnglet] = useState<CleOnglet>('bible')
  const [fond, setFond] = useState<CleFond>('papier')
  const [survol, setSurvol] = useState<number | null>(null)
  const [epingle, setEpingle] = useState<number | null>(null)
  const [cadre, setCadre] = useState<Cadre | null>(null)

  const colonne = useRef<HTMLDivElement>(null)
  const courante = EPREUVES.find((e) => e.cle === onglet) ?? EPREUVES[0]
  const { noeuds, premiers } = aplatir(courante.unites)
  const designe = epingle ?? survol

  /** L'unité à laquelle appartient un nœud de l'épreuve, ou `null`. */
  const uniteDe = (cible: EventTarget | null): number | null => {
    const col = colonne.current
    if (!col || !(cible instanceof Node)) return null
    let noeud: Node | null = cible
    while (noeud && noeud.parentNode !== col) noeud = noeud.parentNode
    if (!noeud) return null
    const rang = Array.prototype.indexOf.call(col.children, noeud)
    if (rang < 0) return null
    let unite = 0
    premiers.forEach((debut, i) => { if (debut <= rang) unite = i })
    return unite
  }

  // Le rectangle de l'unité désignée : l'union des boîtes de ses nœuds.
  // ⛔ Mesuré, jamais posé sur les nœuds eux-mêmes.
  useEffect(() => {
    const col = colonne.current
    if (!col || designe == null) { setCadre(null); return }
    const bornes = aplatir(courante.unites).premiers
    const mesurer = () => {
      const debut = bornes[designe]
      const fin = designe + 1 < bornes.length ? bornes[designe + 1] : col.children.length
      const origine = col.getBoundingClientRect().top
      let haut = Infinity
      let bas = -Infinity
      for (let i = debut; i < fin; i += 1) {
        const noeud = col.children[i] as HTMLElement | undefined
        if (!noeud) continue
        const r = noeud.getBoundingClientRect()
        haut = Math.min(haut, r.top - origine)
        bas = Math.max(bas, r.bottom - origine)
      }
      if (!Number.isFinite(haut) || !Number.isFinite(bas)) { setCadre(null); return }
      setCadre({ haut: haut - DEBORD, hauteur: bas - haut + DEBORD * 2 })
    }
    mesurer()
    const observateur = new ResizeObserver(mesurer)
    observateur.observe(col)
    return () => observateur.disconnect()
  }, [designe, courante, fond])

  const unite = designe == null ? null : courante.unites[designe]

  return (
    // ⚠️ `data-theme` est posé sur la PLANCHE, non sur la racine : on regarde le
    // Cuir sans quitter le thème dans lequel on travaille.
    <main className="pl-page" data-theme={FONDS[fond].theme}>
      <style>{CSS}</style>
      <div className="pl-corps">
        <header className="pl-entete">
          <a href="/admin" className="pl-retour">← Administration</a>
          <h1 className="pl-titre">Planche des styles</h1>
          <p className="pl-sous-titre">
            Quatre épreuves continues, une par vocabulaire. Le texte court d’un bout à l’autre comme
            il court sur le site : c’est ainsi qu’on voit les relations entre les styles, et non
            seulement chacun d’eux. Les compositions viennent de là où le site les décide — rien
            n’est rejoué ici.
          </p>
          <div className="pl-reglages">
            <span className="pl-etiquette">Fond</span>
            {(Object.keys(FONDS) as CleFond[]).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setFond(c)}
                className={`pl-bouton${fond === c ? ' pl-bouton--actif' : ''}`}
              >
                {FONDS[c].nom}
              </button>
            ))}
          </div>
        </header>

        <OngletsPage
          onglets={EPREUVES.map((e) => ({ cle: e.cle, libelle: e.libelle }))}
          actif={onglet}
          choisir={(cle) => { setOnglet(cle); setSurvol(null); setEpingle(null) }}
          intitule="Familles de styles"
          style={{ marginTop: '1.25rem' }}
        />

        <p className="pl-chapeau">{courante.chapeau}</p>
        <p className="pl-invite">Survolez un passage pour en lire le style ; cliquez pour l’épingler.</p>

        <div className="pl-epreuve" key={courante.cle}>
          <div
            className="pl-colonne"
            ref={colonne}
            onMouseOver={(e) => setSurvol(uniteDe(e.target))}
            onMouseLeave={() => setSurvol(null)}
            onClick={(e) => {
              const rang = uniteDe(e.target)
              setEpingle((actuel) => (actuel === rang ? null : rang))
            }}
          >
            {noeuds.map((noeud, i) => <Fragment key={i}>{noeud}</Fragment>)}
          </div>

          {cadre && (
            <div
              className={`pl-designation pl-designation--${epingle != null ? 'epingle' : 'survol'}`}
              style={{
                top: cadre.haut,
                height: cadre.hauteur,
                left: -DEBORD,
                width: `calc(min(var(--mesure-ligne), 100%) + ${DEBORD * 2}px)`,
              }}
              aria-hidden="true"
            />
          )}

          {unite && cadre && (
            <aside className="pl-legende" style={{ top: cadre.haut + DEBORD }}>
              <p className="pl-style">{unite.style}</p>
              <p className="pl-note">{unite.note}</p>
              {unite.alerte && <p className="pl-alerte">{unite.alerte}</p>}
              {epingle != null && <p className="pl-epingle">Épinglé — cliquez pour détacher</p>}
            </aside>
          )}
        </div>

        {/* ⚠️ Les mêmes notices en clair, dans l'ordre : le survol ne se lit pas au
            clavier, et sur écran étroit la marge n'a plus la place. */}
        <div className="pl-liste">
          <p className="pl-liste-titre">Tous les styles de cette épreuve</p>
          {courante.unites.map((u, i) => (
            <button
              key={u.style}
              type="button"
              className={`pl-entree${designe === i ? ' pl-entree--actif' : ''}`}
              onMouseEnter={() => setSurvol(i)}
              onFocus={() => setSurvol(i)}
              onMouseLeave={() => setSurvol(null)}
              onBlur={() => setSurvol(null)}
              onClick={() => setEpingle((actuel) => (actuel === i ? null : i))}
            >
              <p className="pl-style">{u.style}</p>
              <p className="pl-note">{u.note}</p>
              {u.alerte && <p className="pl-alerte">{u.alerte}</p>}
            </button>
          ))}
        </div>
      </div>
    </main>
  )
}
