import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

// ── UN SEUL MOTEUR DE BALISAGE, CELUI DE LA PAGE DE LECTURE ──────────────────
//
// ⛔ CE QUI SE COPIE DIVERGE, et cela s'est vu à l'écran. Le volet patristique portait
// son propre rendu du texte d'un segment, COPIE de celui de la page de lecture
// (`app/oeuvre/[id]/appelNote.tsx`, `rendreTexteAvecNotes`). La copie avait pris du
// retard de deux alternatives : `<i>…</i>` et `++petites capitales++`, si bien qu'un
// lecteur voyait « <i>avec l'argent</i> » en toutes lettres dans une citation des
// Questions sur l'Heptateuque (relevé de l'auteur, 10 septembre 2026). Une garde a
// d'abord confronté les deux écritures.
//
// ⛔ Le 11 septembre 2026, la copie est PARTIE : elle ne savait ni projeter une ancre
// positionnelle ni lire une note structurée, et le volet importe désormais le moteur de
// la page de lecture, dont il ne change que l'APPEL (`options.appel`). La garde refuse
// donc qu'une liste de conventions reparaisse dans le volet, et que le moteur n'y soit
// plus importé.
//
// ⚠️ La garde ne compare pas des RENDUS, elle lit les ÉCRITURES : c'est la divergence
// des sources qu'il faut interdire, et elle se lit sans monter de DOM.

const LIGNE_REGEX = /^[ \t]*const regex = (\/.+\/g)$/gmu

function conventionsDe(fichier: string): string[] {
  return [...readFileSync(fichier, 'utf8').matchAll(LIGNE_REGEX)].map(m => m[1])
}

const PANNEAU = 'app/components/PanneauPatristique.tsx'
const LECTURE = 'app/oeuvre/[id]/appelNote.tsx'

describe('le volet patristique lit le balisage par le moteur de la page de lecture', () => {
  it('le volet ne porte plus de liste de conventions à lui', () => {
    expect(conventionsDe(PANNEAU)).toHaveLength(0)
  })

  it('il importe le moteur de la page de lecture, et n’en redéfinit aucun', () => {
    const source = readFileSync(PANNEAU, 'utf8')
    expect(source).toMatch(/import\s*\{[^}]*\brendreTexteAvecNotes\b[^}]*\}\s*from\s*'@\/app\/oeuvre\/\[id\]\/appelNote'/)
    expect(source).not.toMatch(/function\s+rendreTexteAvecNotes\b/)
  })

  it('le moteur reconnaît l’italique du corpus, sous ses deux écritures', () => {
    const conventions = conventionsDe(LECTURE)
    expect(conventions).toHaveLength(1)
    const [source] = conventions
    const corps = source.slice(1, source.lastIndexOf('/'))
    const temoin = 'et vous ne serez point rachetés <i>avec l’argent</i>, dit le ++Seigneur++, en *vérité*.'
    const trouves = [...temoin.matchAll(new RegExp(corps, 'gu'))].map(m => m[0])
    expect(trouves).toContain('<i>avec l’argent</i>')
    expect(trouves).toContain('++Seigneur++')
    expect(trouves).toContain('*vérité*')
  })
})
