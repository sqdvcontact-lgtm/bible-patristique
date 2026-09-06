// ── La marque des écrits non canoniques ────────────────────────────────────────
//
// Un obèle en exposant, à côté du nom du livre. La Septante porte des écrits que le
// canon catholique ne reçoit pas — 1 Esdras, 3 et 4 Maccabées, le Daniel du vieux grec,
// les Odes, le Psaume 151, les Psaumes de Salomon, la Lettre de Jérémie —, et le lecteur
// doit le savoir AVANT d'ouvrir, non après.
//
// ⚠️ L'exposant et la teinte suffisent, et rien d'autre : pas de pointillé, pas de
// pastille, pas de cartouche (charte, § appels de note). La marque doit se voir sans
// jamais peser plus que le titre qu'elle accompagne.
//
// ⚠️ ELLE DIT VIS-À-VIS DE QUOI. « Non canonique » tout court serait un jugement ; les
// Églises d'Orient ne comptent pas comme Rome, et plusieurs de ces livres sont reçus
// ailleurs. L'infobulle nomme donc le canon de référence, et le texte de rechange que
// lisent les lecteurs d'écran le dit en toutes lettres.

const OBELE = '†'

export default function MarqueNonCanonique({ taille = '0.6875em' }: { taille?: string }) {
  return (
    <sup
      title="Écrit non reçu par le canon catholique"
      style={{
        marginLeft: '0.18em',
        fontSize: taille,
        lineHeight: 0,
        color: 'var(--cs-texte-faible)',
        verticalAlign: 'super',
        fontWeight: 400,
      }}
    >
      <span aria-hidden="true">{OBELE}</span>
      <span className="sr-only">, écrit non reçu par le canon catholique</span>
    </sup>
  )
}
