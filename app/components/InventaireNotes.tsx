/**
 * LES PIÈCES D'UN INVENTAIRE DE NOTES — la ligne d'une note, la pastille d'une facette, la
 * marque d'un fait d'atelier, le compte. Deux inventaires d'administration les emploient :
 * celui d'une œuvre (`app/oeuvre/[id]/OngletNotes.tsx`) et celui d'une bible
 * (`OngletNotesBible.tsx`), tous deux dans le volet de droite de leur page.
 *
 * ⛔ UNE SEULE ÉCRITURE. L'inventaire de la page Bible est né le 16 septembre 2026 sur le
 * modèle de celui des œuvres ; recopier leurs formes en aurait fait deux, qui ne restent
 * identiques que par accident. Chaque inventaire ne dit que CE QU'IL MONTRE (l'en-tête
 * d'une ligne, son aperçu, ce qui la rend muette) ; le dessin vit ici.
 *
 * Module sans crochet : il se rend hors du navigateur.
 */
import type { CSSProperties, ReactNode } from 'react'
import { SERIF } from '@/app/lib/polices'

/** Le type d'une note, en tête de sa ligne : « Critique textuelle », « Note de l'édition ». */
export const STYLE_INTITULE_LIGNE_NOTE: CSSProperties = {
  fontSize: '0.625rem', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--cs-texte-second)',
}

/** Ce qu'une note dit, ramené à une ligne d'aperçu. */
const STYLE_APERCU_NOTE: CSSProperties = {
  display: 'block', fontFamily: SERIF,
  fontSize: '0.6875rem', lineHeight: 1.42, color: 'var(--cs-texte)',
  overflowWrap: 'anywhere',
}

/** Le rang de pastilles d'un axe de filtre. */
export const STYLE_RANG_FACETTES: CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px' }

export function CompteFacette({ n }: { n: number }) {
  return <span style={{ color: 'var(--cs-texte-doux)', fontVariantNumeric: 'tabular-nums' }}>{n}</span>
}

export function PastilleFacette({ actif, alerte, onClick, children }: {
  actif: boolean
  alerte?: boolean
  onClick: () => void
  children: ReactNode
}) {
  const teinte = alerte ? 'var(--cs-danger-fonce)' : 'var(--cs-vert)'
  return (
    <button type="button" onClick={onClick} aria-pressed={actif}
      style={{
        fontSize: '0.6875rem', lineHeight: 1.2, padding: '4px 8px', borderRadius: '4px',
        border: `1px solid ${actif ? teinte : 'var(--cs-bord)'}`,
        background: actif ? 'var(--cs-vert-pale)' : 'var(--cs-surface)',
        color: actif ? teinte : 'var(--cs-texte-second)',
        cursor: 'pointer', display: 'flex', gap: '5px', alignItems: 'baseline',
      }}>
      {children}
    </button>
  )
}

export function MarqueNote({ alerte, children }: { alerte?: boolean; children: ReactNode }) {
  return (
    <span style={{
      fontSize: '0.625rem', letterSpacing: '0.05em', textTransform: 'uppercase',
      padding: '1px 5px', borderRadius: '4px',
      border: `1px solid ${alerte ? 'var(--cs-danger-bord)' : 'var(--cs-bord)'}`,
      color: alerte ? 'var(--cs-danger-fonce)' : 'var(--cs-texte-second)',
    }}>
      {children}
    </span>
  )
}

/**
 * Une note de l'inventaire.
 *
 * ⛔ C'est un BOUTON, non un bloc cliquable : le clavier l'atteint, et le nom accessible
 * dit où il mène. Le site en compte assez de l'autre sorte (77 relevés à l'audit du
 * 2 septembre 2026) pour ne pas en ajouter un.
 * ⚠️ Une note qui ne s'ouvre pas reste LISTÉE, grisée, et son infobulle dit pourquoi : un
 * inventaire d'atelier est exhaustif, et ce qui ne paraît nulle part est ce qu'on y cherche.
 */
export function LigneNoteInventaire({ numero, courante, atteignable, nomAccessible, infobulle, onClick, entete, children }: {
  /** Le numéro que l'appel porte ; `null` pour une note que la page ne numérote pas, parce
   *  qu'elle ne la pose nulle part. */
  numero: number | null
  courante: boolean
  atteignable: boolean
  nomAccessible: string
  /** Pourquoi la ligne est muette ; rien quand elle s'ouvre. */
  infobulle?: string
  onClick: () => void
  /** Le type de la note, ses repères, ses marques. */
  entete: ReactNode
  /** L'aperçu de la note. */
  children: ReactNode
}) {
  return (
    <button
      type="button"
      disabled={!atteignable}
      onClick={onClick}
      aria-label={nomAccessible}
      title={infobulle}
      style={{
        display: 'grid', gridTemplateColumns: '2.25rem minmax(0, 1fr)', gap: '8px',
        width: '100%', textAlign: 'left', alignItems: 'baseline',
        padding: '6px 8px 7px', borderRadius: '4px',
        border: 'none', background: courante ? 'var(--cs-vert-pale)' : 'none',
        cursor: atteignable ? 'pointer' : 'default',
        opacity: atteignable ? 1 : 0.55,
        borderBottom: '1px solid var(--cs-fond-doux)',
      }}>
      <span style={{
        fontSize: '0.6875rem', fontWeight: 600, textAlign: 'right',
        color: courante ? 'var(--cs-vert)' : 'var(--cs-texte-second)',
        fontVariantNumeric: 'tabular-nums',
      }}>
        {numero ?? <span aria-hidden="true">—</span>}
      </span>
      <span style={{ display: 'block', minWidth: 0 }}>
        <span style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'baseline', marginBottom: '2px' }}>
          {entete}
        </span>
        <span style={STYLE_APERCU_NOTE}>{children}</span>
      </span>
    </button>
  )
}
