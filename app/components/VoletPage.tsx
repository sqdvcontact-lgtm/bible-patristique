// LE VOLET DE GAUCHE DES TROIS PAGES SŒURS : bibliographie, histoire de l’Église,
// catalogue des péricopes.
//
// ⛔ UN SEUL MODÈLE (demande de l’auteur, 2026-09-24). Les trois pages recomposaient
// chacune sa tête, son chapeau, son repli de téléphone, ses rubriques et ses cases, et
// les trois avaient dérivé : le chapeau en sérif ici, en sans là, absent ailleurs ; une
// case à marqueur carré sur deux pages, à filet vertical sur la troisième ; des axes
// séparés d’un filet sur une page seulement. La forme vit ici, et la page ne donne que
// sa matière : titre, chapeau, recherche, axes.
//
// ⚠️ Le volet se compose EN SANS, comme l’a fixé la bibliographie le 2026-09-24 : c’est
// de l’interface. Le titre seul garde le sérif de `TITRE_VOLET`, et le champ de
// recherche le sien (`ChampRechercheVolet`).
//
// Composant pur, sans crochet : l’état du repli appartient à la page, qui le referme
// quand un saut doit dégager la liste (le sommaire des livres des péricopes).

import type { CSSProperties, ReactNode } from 'react'
import IconeChevron from '@/app/components/IconeChevron'
import { ENCRE_TITRE, GRAISSE_TITRE_VOLET, TITRE_VOLET } from '@/app/lib/hierarchieTitres'
import { RUBRIQUE_AXE } from '@/app/lib/stylesVoletLecture'
import { SANS, SERIF } from '@/app/lib/polices'
import { CHAPEAU_VOLET_PAGE, styleVoletPage, TETE_VOLET_PAGE } from '@/app/lib/voletPage'

const VERT = 'var(--cs-vert)'
const SEP = 'var(--cs-bord-clair)'

const STYLE_TITRE: CSSProperties = {
  margin: 0, fontFamily: SERIF, fontSize: TITRE_VOLET, fontWeight: GRAISSE_TITRE_VOLET,
  color: ENCRE_TITRE, lineHeight: 1.15, letterSpacing: '0.01em',
}

type Props = {
  mobile: boolean
  titre: string
  /** Ce que la page contient, en une ou deux lignes. Facultatif : l’histoire n’en porte pas. */
  chapeau?: ReactNode
  /** L’identifiant du contenu, que le bouton de repli désigne (`aria-controls`). */
  idContenu: string
  /** Le libellé du repli au téléphone : « Filtres », « Rechercher et filtrer »… */
  libelleRepli: string
  /** Un filtre agit : le repli le dit. */
  actifs: boolean
  ouvert: boolean
  surBascule: () => void
  /** Au téléphone, ce qui reste visible AU-DESSUS du repli (la recherche de la bibliographie). */
  horsRepli?: ReactNode
  children: ReactNode
}

export default function VoletPage({ mobile, titre, chapeau, idContenu, libelleRepli, actifs, ouvert, surBascule, horsRepli, children }: Props) {
  return (
    <aside style={{ ...styleVoletPage(mobile), fontFamily: SANS }}>
      <div style={TETE_VOLET_PAGE}>
        <h1 style={STYLE_TITRE}>{titre}</h1>
        {chapeau && <p style={CHAPEAU_VOLET_PAGE}>{chapeau}</p>}
      </div>

      {mobile ? (
        <>
          {horsRepli && <div style={{ padding: '12px 15px 10px' }}>{horsRepli}</div>}
          <button type="button" onClick={surBascule} aria-expanded={ouvert} aria-controls={idContenu}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '10px 15px',
              border: 'none', borderTop: horsRepli ? `1px solid ${SEP}` : 'none', borderBottom: ouvert ? `1px solid ${SEP}` : 'none',
              background: 'transparent', cursor: 'pointer', fontFamily: SANS, fontSize: '0.8125rem', color: 'var(--cs-texte)',
            }}>
            <span>{libelleRepli}{actifs ? ' (actifs)' : ''}</span>
            <span aria-hidden style={{ display: 'inline-flex', color: 'var(--cs-texte-second)' }}>
              <IconeChevron dir={ouvert ? 'up' : 'down'} taille="0.6875rem" strokeWidth={1.5} />
            </span>
          </button>
          {ouvert && <div id={idContenu} style={{ padding: '10px 15px 18px' }}>{children}</div>}
        </>
      ) : (
        <div id={idContenu} className="cs-defilement-discret" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '10px 15px 22px' }}>
          {children}
        </div>
      )}
    </aside>
  )
}

/** Un axe de filtre : sa rubrique (`RUBRIQUE_AXE`), puis ses cases. */
export function GroupeFiltre({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ marginTop: '12px' }}>
      <div style={{ ...RUBRIQUE_AXE, marginBottom: '6px' }}>{label}</div>
      {children}
    </div>
  )
}

/** La rubrique qui sépare deux parties du volet (le sommaire des livres, puis les
 *  filtres) : son nom, et un filet qui court jusqu’au bord. */
export function RubriqueVolet({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '9px', marginTop: '18px', marginBottom: '2px' }}>
      <span style={RUBRIQUE_AXE}>{children}</span>
      <span aria-hidden style={{ flex: 1, height: '1px', background: SEP }} />
    </div>
  )
}

/**
 * Une case de filtre : marqueur carré à gauche, qui se remplit quand elle est retenue,
 * et le compte à droite quand l’axe en a un. Le marqueur n’est pas un ornement : c’est
 * lui qui dit « ceci se coche ». 26 px de hauteur, la cible minimale.
 */
export function LigneCompte({ actif, onClick, label, n }: { actif: boolean; onClick: () => void; label: ReactNode; n?: number }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={actif} style={{
      display: 'flex', alignItems: 'center', gap: '8px', width: '100%', textAlign: 'left', cursor: 'pointer',
      background: 'none', border: 'none', padding: '5px 0', margin: 0, minHeight: '26px',
      fontFamily: SANS, fontSize: '0.75rem', lineHeight: 1.35,
      color: actif ? VERT : 'var(--cs-texte)', fontWeight: actif ? 600 : 400,
      transition: 'color var(--cs-duree-courte)',
    }}>
      <span aria-hidden style={{
        flexShrink: 0, width: '10px', height: '10px', borderRadius: '4px',
        border: `1px solid ${actif ? VERT : SEP}`,
        background: actif ? VERT : 'transparent', transition: 'background var(--cs-duree-courte), border-color var(--cs-duree-courte)',
      }} />
      <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
      {n != null && <span style={{ fontFamily: SANS, fontSize: '0.6875rem', color: actif ? VERT : 'var(--cs-texte-second)' }}>{n}</span>}
    </button>
  )
}

/** « Afficher les N autres » / « Afficher moins » : un lien discret sous un axe replié. */
export function LienDiscret({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="cs-survol-encre"
      style={{
        marginTop: '4px', background: 'none', border: 'none', padding: '4px 0', cursor: 'pointer',
        fontFamily: SANS, fontSize: '0.6875rem', fontStyle: 'italic',
        '--repos-encre': 'var(--cs-texte-second)', '--survol-encre': VERT,
      } as CSSProperties}>
      {children}
    </button>
  )
}

/** « Réinitialiser les filtres », au pied des axes, quand un filtre agit. */
export function BoutonReinitialiser({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      style={{ marginTop: '16px', width: '100%', padding: '7px 9px', borderRadius: '8px', cursor: 'pointer', border: '1px solid var(--cs-bord)', background: 'var(--cs-surface)', color: 'var(--cs-texte-second)', fontFamily: SANS, fontSize: '0.75rem' }}>
      Réinitialiser les filtres
    </button>
  )
}
