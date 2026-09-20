'use client'

// ── LA FICHE : un seul modèle pour les fenêtres « À propos » ───────────────────
//
// Demande de l'auteur, 2026-09-15 : « Fenêtres “Auteur”, “En savoir plus”…
// Uniformiser toutes ces fenêtres : styles, largeurs, hauteurs, etc. Toutes doivent
// être sur le même modèle. » Trois fenêtres le prennent : la fiche d'un AUTEUR
// (`ModaleAuteur`), celle d'une TRADUCTION (`ModaleTraduction`, dont la page « Les
// traductions » rend le même contenu) et celle d'une ÉDITION (`FicheEdition`). Elles
// avaient chacune leur calque, leurs rembourrages sur téléphone, leur en-tête, leur
// portrait et leur grille, et deux d'entre elles s'ouvrent l'une sur l'autre.
//
// Ce module porte le CADRE (`ModaleFiche`), l'EN-TÊTE (`EnTeteFiche`), le PORTRAIT
// (`PortraitFiche`), le CORPS à deux colonnes (`CorpsFiche`), les SECTIONS et la liste
// des OUVRAGES CITÉS (`ListeOuvragesCites`). Il ne pose que des classes : la forme vit
// dans `app/globals.css`, § « LA FICHE ». Doctrine : charte § 38.33.
//
// ⛔ Chaque fiche garde ce qui lui appartient — ses données, ses rubriques —, et rien
// de ce qui les MET EN PAGE : trois copies d'un même cadre finissent toujours par
// diverger, et c'est exactement ce qu'on vient de défaire.

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from 'react'
import { createPortal } from 'react-dom'

import ReferenceBibliographique from '@/app/components/ReferenceBibliographique'
import { CLASSES_BIBLIOGRAPHIE } from '@/app/lib/apparatBibliographie'
import { Z_MODALE } from '@/app/lib/empilement'
import { estUrl } from '@/app/lib/frise'
import { HAUTEUR_NAVBAR } from '@/app/lib/mesures'
import {
  LIBELLE_REPLIER_OUVRAGES,
  libelleVoirPlus,
  partagerOuvragesCites,
  SEUIL_OUVRAGES_CITES,
} from '@/app/lib/ouvragesCitesChargement'
import type { NoticeBibliographique } from '@/app/lib/referenceBibliographique'
import { verrouillerLeDefilement } from '@/app/lib/verrouDefilement'

// Une mesure qui doit précéder la PEINTURE : le portrait s'allonge d'après les lignes
// qu'il habille, et la réserve de la colonne de droite d'après sa hauteur. On ne doit
// jamais voir le premier état.
const useMesureAvantPeinture = typeof window === 'undefined' ? useEffect : useLayoutEffect

// ── Les pièces de composition ─────────────────────────────────────────────────

/** Le titre de section, le même pour les trois fiches : sérif italique, à l'encre des
 *  titres de rubrique. */
export function TitreSection({ children, centre }: { children: ReactNode; centre?: boolean }) {
  return <h3 className={`cs-fiche-titre-section${centre ? ' cs-fiche-titre-section--centre' : ''}`}>{children}</h3>
}

/** Rangée « étiquette · valeur » des sections documentaires. La colonne d'étiquettes
 *  mesure 8,5 rem : elle porte des intitulés entiers (« Responsable de l'édition »).
 *  La classe `cs-fiche-cle` existe pour que la feuille la resserre sur téléphone.
 *  ⚠️ La rangée est un FLEX, donc un contexte de formatage à elle : à côté de la colonne
 *  de droite, elle se range entière dans la place qui reste, et reprend la pleine
 *  mesure sous elle — rangée par rangée. */
const cleTech: CSSProperties = { flexShrink: 0, width: '8.5rem', fontSize: '0.5rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--cs-texte-faible)', lineHeight: 1.5, paddingTop: '1px' }
export const LigneTech = ({ c, children }: { c: string; children: ReactNode }) => children ? (
  <div style={{ display: 'flex', gap: '12px', padding: '4px 0', borderTop: '1px solid var(--cs-fond)', alignItems: 'baseline' }}>
    <span className="cs-fiche-cle" style={cleTech}>{c}</span><span style={{ flex: 1, fontSize: '0.71875rem', color: 'var(--cs-texte)', lineHeight: 1.45 }}>{children}</span>
  </div>
) : null

// La rangée des colonnes ÉTROITES : l'étiquette au-dessus de sa valeur. La colonne de
// droite n'a pas la place d'une colonne d'étiquettes de 8,5 rem.
const CLE_EMPILEE: CSSProperties = { fontSize: '0.5rem', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--cs-texte-faible)', display: 'block', lineHeight: 1.4 }
const VAL_EMPILEE: CSSProperties = { fontSize: '0.71875rem', color: 'var(--cs-texte)', lineHeight: 1.35, display: 'block' }

export function RangeeEmpilee({ c, italique, children }: { c: string; italique?: boolean; children: ReactNode }) {
  if (!children) return null
  return (
    <div style={{ padding: '4px 0', borderTop: '1px solid var(--cs-fond)' }}>
      <span style={CLE_EMPILEE}>{c}</span>
      <span style={{ ...VAL_EMPILEE, fontStyle: italique ? 'italic' : 'normal' }}>{children}</span>
    </div>
  )
}

/** Lien vers une source extérieure. Rien du tout si l'adresse n'en est pas une.
 *  ⚠️ C'est un bouton-lien AUTONOME : il prend la forme commune (globals.css).
 *  ⛔ Un élément de composant est toujours VRAI, fût-il rendu à `null` : devant une
 *  rangée qui se tait sur un enfant faux, on teste l'adresse avant de le poser. */
export const Consulter = ({ url, libelle }: { url: string | null | undefined; libelle: string }) => (url && estUrl(url))
  ? <a href={url} target="_blank" rel="noopener noreferrer" className="cs-bouton-lien">{libelle}</a> : null

// ── Le bord bas du portrait se pose sur la dernière ligne qu'il habille ──────────

/**
 * Pose le bord bas d'un portrait FLOTTANT sur la dernière ligne qui l'habille.
 *
 * Un flottant au rapport fixe s'arrête n'importe où dans une ligne : son bord bas coupe
 * la ligne qui passe à côté, ou laisse un blanc sous la dernière qui l'habille. On
 * mesure donc les LIGNES (`getClientRects` d'une plage : une boîte par ligne) et l'on
 * allonge le cadre jusqu'au bas de la dernière ligne qui se tient à sa droite.
 *
 * ⚠️ `getClientRects` cerne les GLYPHES, non la boîte de ligne : on rend à chaque ligne
 *    la moitié de l'interligne de part et d'autre, sinon le bord tomberait dans le blanc.
 * ⚠️ La marge basse du flottant reste à ZÉRO : une marge repousserait sous le cadre la
 *    ligne suivante, que la mesure retrouverait alors à chaque passe.
 * ⛔ On ALLONGE seulement : un cadre plus court que son rapport rognerait le portrait.
 * ⚠️ On parcourt tout le CORPS de la fiche (`[data-fiche-corps]`) : l'en-tête et les
 *    sections sont les frères du cadre, non ses enfants. La colonne de droite et sa
 *    réserve en sont écartées, elles ne l'habillent jamais.
 * ⚠️ Le parcours S'ARRÊTE au premier nœud dont la première ligne passe sous le cadre :
 *    tout ce qui suit est plus bas encore, et une longue fiche ne se relit pas entière à
 *    chaque redimensionnement.
 */
export function useBordSurDerniereLigne(cadreRef: RefObject<HTMLDivElement | null>, actif: boolean, cle?: string) {
  const poseRef = useRef<() => void>(() => {})
  useMesureAvantPeinture(() => {
    if (!actif) return
    const cadre = cadreRef.current
    const colonne = cadre?.closest<HTMLElement>('[data-fiche-corps]') ?? cadre?.parentElement ?? null
    if (!cadre || !colonne) { poseRef.current = () => {}; return }
    let vivant = true

    const filtre: NodeFilter = {
      acceptNode(n: Node) {
        if (n.nodeType !== Node.TEXT_NODE) {
          const el = n as Element
          return el === cadre || el.hasAttribute('data-fiche-complement') || el.hasAttribute('data-fiche-reserve')
            ? NodeFilter.FILTER_REJECT
            : NodeFilter.FILTER_SKIP
        }
        return n.nodeValue && n.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP
      },
    }

    const poser = () => {
      if (!vivant) return
      cadre.style.height = ''
      cadre.style.marginBottom = '0px'
      const cadreRect = cadre.getBoundingClientRect()
      const hauteurPosee = cadreRect.height
      const bordNu = cadreRect.bottom

      let basDerniereLigne = 0
      const interlignes = new Map<Element, number>()
      const marcheur = document.createTreeWalker(colonne, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, filtre)
      const plage = document.createRange()
      parcours: for (let n = marcheur.nextNode(); n; n = marcheur.nextNode()) {
        const parent = n.parentElement
        if (!parent) continue
        if (!interlignes.has(parent)) interlignes.set(parent, parseFloat(getComputedStyle(parent).lineHeight))
        const interligne = interlignes.get(parent) as number
        plage.selectNodeContents(n)
        let premiere = true
        for (const r of Array.from(plage.getClientRects())) {
          if (r.width < 1) continue
          const demi = interligne > 0 && interligne > r.height ? (interligne - r.height) / 2 : 0
          const posterieure = r.top - demi >= bordNu - 0.5   // boîte de ligne sous le cadre
          if (posterieure && premiere) break parcours
          premiere = false
          if (posterieure) continue
          if (r.left < cadreRect.right - 0.5) continue      // ligne pleine largeur : passée sous le cadre
          const basBoite = r.bottom + demi
          if (basBoite > basDerniereLigne) basDerniereLigne = basBoite
        }
      }

      const rallonge = basDerniereLigne > 0 ? Math.max(0, Math.round(basDerniereLigne - bordNu)) : 0
      const voulue = rallonge > 0 ? `${Math.round(hauteurPosee) + rallonge}px` : ''
      if (cadre.style.height !== voulue) cadre.style.height = voulue
    }

    poseRef.current = poser
    poser()
    const ro = new ResizeObserver(poser)
    ro.observe(colonne)
    if (typeof document !== 'undefined' && document.fonts) document.fonts.ready.then(poser).catch(() => {})
    return () => { vivant = false; poseRef.current = () => {}; ro.disconnect() }
  }, [actif, cle])

  // LE FILET : un effet sans dépendances repose la mesure à chaque rendu. Une section
  // qui arrive après coup (la frise, le pied) ne redimensionne pas toujours le corps de
  // façon que l'observateur la voie ; la pose est idempotente, elle ne coûte rien.
  useMesureAvantPeinture(() => { poseRef.current() })
}

/**
 * La PREMIÈRE COLONNE d'une liste en rangées de flex, mesurée une fois pour toutes : la
 * plus large des cellules `[data-fiche-colonne]` donne sa largeur à toutes, par la
 * variable `--fiche-colonne` que la feuille lit.
 *
 * ⛔ Une grille alignait ses colonnes toute seule, mais une grille fait CONTEXTE : à côté
 * de la colonne de droite, elle se rangeait entière dans la place qui restait, et ne
 * reprenait jamais la pleine mesure sous elle. Des rangées de flex le font, chacune pour
 * elle ; il ne leur manque que la colonne commune.
 */
export function useColonneCommune(listeRef: RefObject<HTMLElement | null>, cle: string) {
  useMesureAvantPeinture(() => {
    const liste = listeRef.current
    if (!liste) return
    let vivant = true
    const poser = () => {
      if (!vivant) return
      liste.style.removeProperty('--fiche-colonne')
      let max = 0
      for (const cellule of Array.from(liste.querySelectorAll<HTMLElement>('[data-fiche-colonne]'))) {
        max = Math.max(max, cellule.getBoundingClientRect().width)
      }
      if (max > 0) liste.style.setProperty('--fiche-colonne', `${Math.ceil(max)}px`)
    }
    poser()
    const ro = new ResizeObserver(poser)
    ro.observe(liste)
    if (document.fonts) document.fonts.ready.then(poser).catch(() => {})
    return () => { vivant = false; ro.disconnect() }
  }, [cle])
}

// ── Le cadre ──────────────────────────────────────────────────────────────────

// Les fiches OUVERTES, de la plus ancienne à la plus récente : Échap ne ferme que la dernière.
const fichesOuvertes: object[] = []

/**
 * Le CADRE d'une fiche : le calque, la boîte, la croix et le défileur.
 *
 * ⛔ UNE BOÎTE, UNE MESURE : 52 rem de large et 48 rem de haut au plus, et la MÊME
 *    hauteur quel que soit le contenu (globals.css). L'édition ouvre l'auteur, l'encart
 *    ouvre la traduction : on passe de l'une à l'autre sans que le cadre saute.
 * ⚠️ La boîte ne défile pas : c'est son DÉFILEUR qui défile. La croix se pose en absolu
 *    dans la boîte et reste à son coin, sans dépendre d'un positionnement collant.
 * ⚠️ Deux fiches peuvent s'ouvrir l'une sur l'autre : Échap ne ferme que la DERNIÈRE, et
 *    chacune rend le foyer à ce qui l'avait avant elle.
 * ⚠️ `libelle` nomme la fenêtre tant que son titre n'est pas arrivé : `aria-labelledby`
 *    l'emporte dès que l'en-tête est rendu.
 * ⚠️ `avantCorps` se pose dans le défileur, au-dessus du corps : la barre d'onglets
 *    d'une fiche à plusieurs volets.
 */
export function ModaleFiche({ titreId, libelle, onFermer, avantCorps, children }: {
  titreId: string
  libelle?: string
  onFermer: () => void
  avantCorps?: ReactNode
  children: ReactNode
}) {
  const defileurRef = useRef<HTMLDivElement>(null)
  const fermerRef = useRef(onFermer)
  useEffect(() => { fermerRef.current = onFermer })

  useEffect(() => {
    const jeton = {}
    fichesOuvertes.push(jeton)
    const avant = document.activeElement instanceof HTMLElement ? document.activeElement : null
    defileurRef.current?.focus({ preventScroll: true })
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || fichesOuvertes[fichesOuvertes.length - 1] !== jeton) return
      fermerRef.current()
    }
    document.addEventListener('keydown', onKey)
    const relacher = verrouillerLeDefilement()
    return () => {
      document.removeEventListener('keydown', onKey)
      const rang = fichesOuvertes.indexOf(jeton)
      if (rang >= 0) fichesOuvertes.splice(rang, 1)
      relacher()
      if (avant && document.contains(avant)) avant.focus({ preventScroll: true })
    }
  }, [])

  if (typeof document === 'undefined') return null
  return createPortal(
    <div className="cs-fiche-calque" onClick={onFermer} style={{ top: HAUTEUR_NAVBAR, zIndex: Z_MODALE }}>
      <div role="dialog" aria-modal="true" aria-labelledby={titreId} aria-label={libelle}
        className="cs-fiche-boite" onClick={e => e.stopPropagation()}>
        <button type="button" onClick={onFermer} aria-label="Fermer" title="Fermer" className="cs-fiche-fermer cs-cible-fine">✕</button>
        <div ref={defileurRef} tabIndex={-1} className="cs-fiche-defileur cs-defilement-discret">
          {avantCorps}
          {children}
        </div>
      </div>
    </div>,
    document.body,
  )
}

/**
 * L'EN-TÊTE d'une fiche : un surtitre (« À propos de cet auteur »), le nom, une ligne en
 * italique, une ligne de crédit, les repères, les matières. Chaque ligne ne paraît que
 * remplie.
 *
 * ⛔ DEUX LIGNES, ET ELLES NE DISENT PAS LA MÊME CHOSE. `reperes` SITUE — des dates, une
 *    langue — et prend la capitale ; `matieres` dit ce dont la fiche RELÈVE — traditions,
 *    écoles, genres — et reste en bas de casse. Tout verser dans la première donnait,
 *    chez Augustin, trois lignes de capitales espacées où la date de sa mort pesait
 *    autant qu'« augustinisme » (2026-09-20). La fiche d'une œuvre y range ses genres.
 */
export function EnTeteFiche({ surtitre, titre, titreId, sousTitre, ligne, reperes, matieres }: {
  surtitre?: ReactNode; titre?: ReactNode; titreId?: string; sousTitre?: ReactNode
  ligne?: ReactNode; reperes?: ReactNode; matieres?: ReactNode
}) {
  if (!surtitre && !titre && !sousTitre && !ligne && !reperes && !matieres) return null
  return (
    <header className="cs-fiche-entete">
      {surtitre ? <p className="cs-fiche-surtitre">{surtitre}</p> : null}
      {titre ? <h2 id={titreId} className="cs-fiche-titre">{titre}</h2> : null}
      {sousTitre ? <p className="cs-fiche-soustitre">{sousTitre}</p> : null}
      {ligne ? <p className="cs-fiche-ligne">{ligne}</p> : null}
      {reperes ? <p className="cs-fiche-reperes">{reperes}</p> : null}
      {matieres ? <p className="cs-fiche-matieres">{matieres}</p> : null}
    </header>
  )
}

/**
 * Le PORTRAIT d'une fiche, flottant à gauche de l'en-tête et du texte.
 *
 * ⛔ Un seul cadre pour un auteur et pour une traduction : 8,75 rem au rapport 2/3 sous
 *    un passe-partout de 5 px. `CADRES_PORTRAIT.fiche` (app/lib/photoAuteur.ts) écrit
 *    les mêmes mesures pour l'écran de cadrage, et un test confronte les deux.
 * ⚠️ `styleImage` porte le CADRAGE (position, échelle) : il appartient à chaque fiche.
 * ⚠️ Une image qui ne se charge pas cède la place aux initiales, ou à rien.
 */
export function PortraitFiche({ src, styleImage, initiales, cle }: {
  src: string | null; styleImage: CSSProperties; initiales?: string; cle: string
}) {
  const [casse, setCasse] = useState<string | null>(null)
  const cadreRef = useRef<HTMLDivElement>(null)
  const image = src && casse !== src ? src : null
  const visible = Boolean(image || initiales)
  useBordSurDerniereLigne(cadreRef, visible, cle)
  if (!visible) return null
  return (
    <div ref={cadreRef} className="cs-fiche-portrait">
      <div className="cs-fiche-portrait-fenetre">
        {image ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={image} alt="" aria-hidden="true" onError={() => setCasse(image)}
            style={{ width: '100%', height: '100%', display: 'block', ...styleImage }} />
        ) : (
          <span aria-hidden="true" className="cs-fiche-initiales">{initiales}</span>
        )}
      </div>
    </div>
  )
}

/**
 * Le CORPS d'une fiche : le texte à gauche, le complément à droite, la suite et le pied
 * sous les deux.
 *
 * Demande de l'auteur, 2026-09-15 : « Quand la colonne de droite est vide, on peut
 * permettre (par ex. si une chronologie est peu fournie) aux textes de la colonne de
 * gauche de prendre la colonne de droite. » Une grille ne le peut pas : ses colonnes
 * vont jusqu'en bas. Le texte coule donc autour d'un FLOTTANT.
 *
 * ⛔ LE COMPLÉMENT VIT APRÈS LE TEXTE dans le document : c'est l'ordre de lecture, celui
 *    du clavier et du téléphone. Une RÉSERVE vide flotte en tête du corps, à la hauteur
 *    du complément, mesurée ici avant la peinture ; le complément se pose par-dessus, en
 *    absolu.
 * ⚠️ Sous 900 px, la réserve disparaît et le complément reprend sa place dans le flux,
 *    après le texte (globals.css).
 * ⚠️ `suite` et `pied` courent sous les deux colonnes, mais le texte de `suite` reprend
 *    la pleine mesure sous le complément sans le dégager ; le pied, lui, se dégage.
 */
export function CorpsFiche({ portrait, entete, complement, suite, pied, children }: {
  portrait?: ReactNode; entete?: ReactNode; complement?: ReactNode; suite?: ReactNode; pied?: ReactNode; children?: ReactNode
}) {
  const corpsRef = useRef<HTMLDivElement>(null)
  const aComplement = Boolean(complement)
  useMesureAvantPeinture(() => {
    if (!aComplement) return
    const corps = corpsRef.current
    const reserve = corps?.querySelector<HTMLElement>(':scope > [data-fiche-reserve]')
    const bloc = corps?.querySelector<HTMLElement>(':scope > [data-fiche-complement]')
    if (!reserve || !bloc) return
    const poser = () => {
      const voulue = `${Math.ceil(bloc.getBoundingClientRect().height)}px`
      if (reserve.style.height !== voulue) reserve.style.height = voulue
    }
    poser()
    const ro = new ResizeObserver(poser)
    ro.observe(bloc)
    return () => ro.disconnect()
  }, [aComplement])
  return (
    <div ref={corpsRef} className="cs-fiche-corps" data-fiche-corps="" data-complement={aComplement ? '' : undefined}>
      {aComplement ? <div className="cs-fiche-reserve" data-fiche-reserve="" aria-hidden="true" /> : null}
      <div className="cs-fiche-principal">
        {portrait}
        {entete}
        {children}
      </div>
      {aComplement ? <div className="cs-fiche-complement" data-fiche-complement="">{complement}</div> : null}
      {suite ? <div className="cs-fiche-suite">{suite}</div> : null}
      {pied ? <div className="cs-fiche-pied">{pied}</div> : null}
    </div>
  )
}

/** Une SECTION de la colonne : un titre et son contenu. */
export function SectionFiche({ titre, className, children }: { titre?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <section className={className ? `cs-fiche-section ${className}` : 'cs-fiche-section'}>
      {titre ? <TitreSection>{titre}</TitreSection> : null}
      {children}
    </section>
  )
}

/** Une RUBRIQUE de clôture, sous les deux colonnes, ouverte d'un filet.
 *  ⚠️ Le filet est porté par un bloc qui fait contexte (globals.css) : à côté de la
 *  colonne de droite, il s'arrête où s'arrête le texte au lieu de la traverser. */
export function RubriqueFiche({ titre, children }: { titre: ReactNode; children: ReactNode }) {
  return (
    <section className="cs-fiche-rubrique">
      <div className="cs-fiche-rubrique-tete"><TitreSection>{titre}</TitreSection></div>
      {children}
    </section>
  )
}

/**
 * La liste des OUVRAGES CITÉS, composés par le moteur bibliographique (charte § 47.5).
 *
 * Demande de l'auteur, 2026-09-15 : « “Ouvrages cités dans cette édition” peut être très
 * long ; il faudrait donc, à partir de dix œuvres (pourquoi pas ?), mettre en place un
 * bouton “en voir plus” ou quelque chose du genre. » Au-delà de dix entrées, la liste se
 * REPLIE sur les dix premières, et un bouton dit combien il en reste.
 */
export function ListeOuvragesCites({ notices, avecAuteur = true, seuil = SEUIL_OUVRAGES_CITES }: {
  notices: readonly NoticeBibliographique[]; avecAuteur?: boolean; seuil?: number
}) {
  const [ouvert, setOuvert] = useState(false)
  const idListe = useId()
  if (notices.length === 0) return null
  const { visibles, caches, repliable } = partagerOuvragesCites(notices, ouvert, seuil)
  return (
    <div className={`${CLASSES_BIBLIOGRAPHIE.bloc} ${CLASSES_BIBLIOGRAPHIE.sansHote}`}>
      <ul id={idListe} className={CLASSES_BIBLIOGRAPHIE.liste}>
        {visibles.map(notice => (
          <li key={notice.id} className={CLASSES_BIBLIOGRAPHIE.entree} data-ouvrage-id={notice.id}>
            <ReferenceBibliographique notice={notice} avecAuteur={avecAuteur} />
          </li>
        ))}
      </ul>
      {repliable ? (
        <div className="cs-fiche-voir-plus">
          <button type="button" className="cs-bouton-lien" aria-expanded={ouvert} aria-controls={idListe}
            onClick={() => setOuvert(o => !o)}>
            {ouvert ? LIBELLE_REPLIER_OUVRAGES : libelleVoirPlus(caches)}
          </button>
        </div>
      ) : null}
    </div>
  )
}
