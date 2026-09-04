'use client'

// ── LE RAIL D'UN VOLET REPLIÉ ─────────────────────────────────────────────────
//
// Un volet de lecture se ferme, et ce qui reste de lui est un rail : une bande de
// trente pixels, un chevron, et le NOM DE L'ACTION écrit en hauteur. Il sert les
// deux côtés de la page Bible — les livres à gauche, les commentaires à droite —
// et le volet de la Polyglotte.
//
// ⛔ IL Y AVAIT TROIS RAILS, ET DEUX D'ENTRE EUX ÉTAIENT DEVENUS INATTEIGNABLES
// (demande de l'auteur, 2026-09-04 : « remettre en place le système permettant de
// fermer un volet gauche ou droite ; existe sur le volet gauche de la Polyglotte,
// reprendre le modèle »). Les deux volets de la page Bible savaient se replier
// depuis toujours ; seule la flèche qui les repliait avait disparu, et pour une
// raison qu'aucune lecture du rendu ne montrait — voir la note de `NavLivres`.
// Trois dessins voisins pour un seul objet : celui de la Polyglotte portait le
// passage lu, celui des livres écrivait son nom de bas en haut, celui des Pères de
// haut en bas et deux crans plus petit. Un seul composant désormais.
//
// ⚠️ LE RAIL NOMME L'ACTION, NON LE CONTENU (« ajouter un titre clair sur la barre
// quand elle est fermée ; type : Ouvrir les commentaires »). « Commentaires » écrit
// sur une bande fermée décrit ce qu'on ne voit pas ; « Ouvrir les commentaires » dit
// ce qu'un clic fera. C'est la seule chose qu'un rail ait à dire.
//
// ⚠️ Le texte se lit de HAUT EN BAS, comme un dos de livre français, et c'est le
// modèle de la Polyglotte : `writing-mode: vertical-rl` sans rotation. Le volet des
// livres l'écrivait à l'envers (une rotation d'un demi-tour), si bien que les deux
// rails d'une même page se lisaient en sens contraire.

import IconeChevron from '@/app/components/IconeChevron'

/** Un rail, sur le bord qu'il occupe. Le chevron pointe VERS LA PAGE : c'est le
 *  sens dans lequel le volet va s'ouvrir. */
export default function RailVolet({ cote, libelle, complement, onOuvrir }: {
  /** Le bord de la page où le volet vit. */
  cote: 'gauche' | 'droite'
  /** L'ACTION, jamais le contenu : « Ouvrir les commentaires ». */
  libelle: string
  /** Ce que le volet portait et que la page ne dit plus — le passage lu sur la
   *  Polyglotte. ⚠️ Il se compose un rang sous le libellé, dans le sérif de
   *  lecture : ce n'est pas une seconde action, c'est un repère. */
  complement?: string | null
  onOuvrir: () => void
}) {
  const gauche = cote === 'gauche'
  return (
    <button
      onClick={onOuvrir}
      title={libelle}
      aria-label={libelle}
      className="cs-rail-volet"
      style={{
        width: '30px', flexShrink: 0, height: '100%',
        background: 'var(--cs-fond-clair)', border: 'none',
        [gauche ? 'borderRight' : 'borderLeft']: '1px solid var(--cs-bord)',
        cursor: 'pointer', color: 'var(--cs-texte-doux)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        // Le chevron se pose EN HAUT du rail, là où l'œil arrive, et non au milieu
        // d'une bande qui fait toute la hauteur de l'écran.
        justifyContent: 'flex-start', paddingTop: '12px', gap: '10px',
        overflow: 'hidden',
      }}>
      <IconeChevron dir={gauche ? 'right' : 'left'} size={14} strokeWidth={1.5} />
      {/* ⚠️ Le libellé prend l'encre du texte gris et non celle du texte faible : sur
          une bande de trente pixels, il est le seul contenu, et il doit se lire sans
          qu'on s'en approche. */}
      <span aria-hidden style={{
        writingMode: 'vertical-rl', fontSize: '0.6875rem', letterSpacing: '0.12em',
        textTransform: 'uppercase', fontWeight: 600, color: 'var(--cs-texte-gris)',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxHeight: '58%',
      }}>
        {libelle}
      </span>
      {complement && (
        <span aria-hidden style={{
          writingMode: 'vertical-rl', fontFamily: 'var(--font-source-serif), Georgia, serif',
          fontSize: '0.71875rem', color: 'var(--cs-texte-doux)', letterSpacing: '0.04em',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxHeight: '32%',
        }}>
          {complement}
        </span>
      )}
    </button>
  )
}
