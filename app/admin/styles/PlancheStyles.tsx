'use client'

/**
 * La PLANCHE DES STYLES — quatre ÉPREUVES continues, styles nommés en marge.
 *
 * Le texte court d'un bout à l'autre, comme il court sur le site : c'est ainsi
 * seulement qu'on voit les RELATIONS — le blanc qu'un titre laisse sous lui,
 * l'apparat qui suit un commentaire, la citation qui coupe un paragraphe.
 *
 * ⛔ AUCUNE ENVELOPPE AUTOUR D'UNE UNITÉ. Le premier jet en posait une par unité,
 * pour y accrocher la légende ; elle rompait en silence les règles de VOISINAGE de
 * `globals.css` — `.verset-row + .cs-bible-axe > .cs-bible-bloc` ne trouve plus ses
 * frères quand un `<div>` les sépare —, c'est-à-dire précisément ce que la planche
 * sert à juger. Les contenus sont donc versés À PLAT dans la colonne, et l'on
 * retrouve chaque unité par le RANG de son premier nœud.
 *
 * ⛔ ET LA MARGE A SON PROPRE FLUX. Posées toutes à `top: 0` de leur unité, les
 * légendes se recouvraient dès que l'unité était plus courte qu'elles — un
 * paragraphe fait trente pixels, sa notice en fait cent cinquante. Chacune se cale
 * donc au plus bas de deux repères : le haut de son unité, ou le bas de la légende
 * précédente. C'est la règle des manchettes d'un livre imprimé.
 */

import { Children, Fragment, isValidElement, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import OngletsPage from '@/app/components/OngletsPage'
import { EPREUVES, type CleOnglet } from './specimens'
import { calerManchettes } from './manchettes'

/** Les deux fonds du site. Un style ne s'apprécie pas dans l'absolu : il
 *  s'apprécie sur son fond, et le Cuir a déjà fait paraître gris ce qui était vert. */
const FONDS = {
  papier: { nom: 'Papier', theme: 'light' as const },
  cuir: { nom: 'Cuir', theme: 'dark' as const },
}
type CleFond = keyof typeof FONDS

/** En deçà, la marge n'a plus la place : elle passe sous l'épreuve. */
const LARGEUR_MARGE_POSSIBLE = 1200

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
  .pl-epreuve { position: relative; margin-top: 2.5rem; }
  /* La colonne de lecture, à sa mesure exacte. ⛔ Ses enfants sont les contenus
     eux-mêmes : aucune enveloppe ne s'intercale entre deux unités. */
  .pl-colonne { width: min(var(--mesure-ligne), 100%); }

  .pl-marges { position: absolute; left: min(var(--mesure-ligne), 100%); top: 0; width: 17rem; margin-left: 1.75rem; }
  .pl-legende { position: absolute; left: 0; width: 100%; }
  .pl-style { font-family: var(--font-source-sans), Arial, sans-serif; font-size: 0.71875rem; font-weight: 600; color: var(--cs-encre); line-height: 1.35; margin: 0 0 0.25rem; }
  .pl-note { font-size: 0.71875rem; color: var(--cs-texte-second); line-height: 1.45; margin: 0; }
  .pl-alerte { font-size: 0.6875rem; color: var(--cs-texte-second); line-height: 1.45; margin: 0.4rem 0 0; padding-left: 0.55rem; border-left: 2px solid var(--cs-or-doux); }
  /* Le filet de repère : il tire l'œil de la légende vers son unité, sans peser. */
  .pl-legende::before { content: ""; position: absolute; left: -1.2rem; top: 0.45rem; width: 0.8rem; height: 1px; background: var(--cs-bord); }

  /* ── Écran étroit : la marge n'a plus la place, elle passe dessous ──────── */
  .pl-liste { margin-top: 2.5rem; padding-top: 1.25rem; border-top: 1px solid var(--cs-bord); }
  .pl-liste-titre { font-family: var(--font-source-sans), Arial, sans-serif; font-size: 0.6875rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: var(--cs-texte-faible); margin: 0 0 1rem; }
  .pl-liste .pl-legende { position: static; width: auto; margin-bottom: 1.1rem; padding-left: 0.6rem; border-left: 2px solid var(--cs-bord-clair); }
  .pl-liste .pl-legende::before { display: none; }
`

type Mesures = { hauts: number[]; hauteurTotale: number }

/**
 * Verse les contenus À PLAT et retient le RANG du premier nœud de chaque unité.
 *
 * ⛔ C'est ce rang qui remplace l'enveloppe. Envelopper chaque unité aurait rompu
 * les règles de voisinage de `globals.css` — `.verset-row + .cs-bible-axe` ne
 * trouve plus ses frères quand un `<div>` les sépare —, c'est-à-dire précisément
 * ce que la planche sert à juger.
 *
 * ⚠️ Fonction PURE, appelée au rendu ET dans l'effet de calage : les deux doivent
 * compter les nœuds de la même façon, sinon les légendes se posent de travers.
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

/** La marge a-t-elle la place ? ⚠️ Au rendu serveur on la suppose large : c'est
 *  l'état de la grande majorité des écrans d'administration. */
const REQUETE_LARGE = `(min-width: ${LARGEUR_MARGE_POSSIBLE}px)`
function ecouterLargeur(rappel: () => void): () => void {
  const mq = window.matchMedia(REQUETE_LARGE)
  mq.addEventListener('change', rappel)
  return () => mq.removeEventListener('change', rappel)
}

export default function PlancheStyles() {
  const [onglet, setOnglet] = useState<CleOnglet>('bible')
  const [fond, setFond] = useState<CleFond>('papier')
  const [mesures, setMesures] = useState<Mesures>({ hauts: [], hauteurTotale: 0 })
  const large = useSyncExternalStore(
    ecouterLargeur,
    () => window.matchMedia(REQUETE_LARGE).matches,
    () => true,
  )

  const colonne = useRef<HTMLDivElement>(null)
  const legendes = useRef<(HTMLElement | null)[]>([])

  const courante = EPREUVES.find((e) => e.cle === onglet) ?? EPREUVES[0]
  const { noeuds } = aplatir(courante.unites)

  /**
   * La règle des manchettes : chaque légende se pose au plus bas de deux repères,
   * le haut de son unité ou le bas de la précédente. Sans quoi une notice de cent
   * cinquante pixels recouvre celle du paragraphe de trente qui la suit.
   *
   * ⚠️ Le calage se refait quand les polices arrivent, d'où l'observateur : au
   * premier rendu, les hauteurs sont celles des polices de secours.
   */
  useEffect(() => {
    const cadre = colonne.current
    if (!cadre || !large) return
    const { premiers } = aplatir(courante.unites)
    const caler = () => {
      // ⛔ On MESURE ici, on ne décide pas : la règle de pose vit dans
      // `manchettes.ts`, avec ses tests. Sept cas y prouvent qu'aucune légende
      // n'en recouvre une autre, quelles que soient les hauteurs.
      const origine = cadre.getBoundingClientRect().top
      const ancres = premiers.map((rang) => {
        const noeud = cadre.children[rang] as HTMLElement | undefined
        return noeud ? noeud.getBoundingClientRect().top - origine : 0
      })
      const hauteurs = premiers.map((_, i) => legendes.current[i]?.offsetHeight ?? 0)
      setMesures(calerManchettes(ancres, hauteurs))
    }
    const observateur = new ResizeObserver(caler)
    observateur.observe(cadre)
    caler()
    return () => observateur.disconnect()
  }, [courante, large, fond])

  const Legende = ({ rang, style }: { rang: number; style?: React.CSSProperties }) => {
    const unite = courante.unites[rang]
    return (
      <aside
        className="pl-legende"
        ref={(el) => { legendes.current[rang] = el }}
        style={style}
      >
        <p className="pl-style">{unite.style}</p>
        <p className="pl-note">{unite.note}</p>
        {unite.alerte && <p className="pl-alerte">{unite.alerte}</p>}
      </aside>
    )
  }

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
          choisir={setOnglet}
          intitule="Familles de styles"
          style={{ marginTop: '1.25rem' }}
        />

        <p className="pl-chapeau">{courante.chapeau}</p>

        <div
          className="pl-epreuve"
          key={courante.cle}
          style={large ? { minHeight: mesures.hauteurTotale } : undefined}
        >
          <div className="pl-colonne" ref={colonne}>
            {noeuds.map((noeud, i) => <Fragment key={i}>{noeud}</Fragment>)}
          </div>

          {large && (
            <div className="pl-marges">
              {courante.unites.map((unite, i) => (
                <Legende key={unite.style} rang={i} style={{ top: mesures.hauts[i] ?? 0 }} />
              ))}
            </div>
          )}
        </div>

        {!large && (
          <div className="pl-liste">
            <p className="pl-liste-titre">Les styles de cette épreuve</p>
            {courante.unites.map((unite, i) => <Legende key={unite.style} rang={i} />)}
          </div>
        )}
      </div>
    </main>
  )
}
