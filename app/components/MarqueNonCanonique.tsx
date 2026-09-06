// ── La marque des écrits non canoniques ────────────────────────────────────────
//
// Deux mots en petit, à côté du nom du livre. La Septante porte des écrits que le canon
// catholique ne reçoit pas — 1 Esdras, 3 et 4 Maccabées, le Daniel du vieux grec, les
// Odes, le Psaume 151, les Psaumes de Salomon, la Lettre de Jérémie —, et le lecteur doit
// le savoir AVANT d'ouvrir, non après.
//
// ⛔ Ils se rangent désormais à leur PLACE TRADITIONNELLE, auprès du livre dont ils
// relèvent (demande de l'auteur, 2026-09-06) : c'est cette mention, et elle seule, qui les
// distingue de leurs voisins. Un obèle en exposant l'a dite une journée ; un signe qu'il
// faut apprendre ne dit rien à qui ne l'a pas appris, et l'auteur a tranché pour les mots.
//
// ⚠️ ELLE DIT VIS-À-VIS DE QUOI, et l'infobulle le nomme. « Non canonique » tout court
// serait un jugement : les Églises d'Orient ne comptent pas comme Rome, et plusieurs de
// ces livres sont reçus ailleurs.
//
// ⚠️ La taille est ABSOLUE, non relative : la marque accompagne un nom de volet de
// 0,84375 rem et un titre de chapitre de 1,25 rem, et en `em` elle serait deux fois plus
// grosse dans le second. C'est la même mention, elle a le même corps.

const TEXTE = 'non canonique'
const INFOBULLE = 'Écrit non reçu par le canon catholique'

export default function MarqueNonCanonique({ taille = '0.5625rem' }: { taille?: string }) {
  return (
    <span
      title={INFOBULLE}
      style={{
        marginLeft: '0.4em',
        fontSize: taille,
        fontFamily: 'var(--font-source-sans), Arial, sans-serif',
        fontWeight: 400,
        fontStyle: 'normal',
        letterSpacing: '0.04em',
        color: 'var(--cs-texte-faible)',
        whiteSpace: 'nowrap',
        verticalAlign: 'baseline',
      }}
    >
      {TEXTE}
    </span>
  )
}
