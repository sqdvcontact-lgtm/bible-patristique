import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

// ── DEUX MOTEURS DE BALISAGE, UNE SEULE LISTE DE CONVENTIONS ─────────────────
//
// ⛔ CE QUI SE COPIE DIVERGE, et cela s'est vu à l'écran. Le volet patristique porte
// son propre rendu du texte d'un segment — il lui faut ses infobulles et sa
// numérotation d'appels —, et sa liste de conventions était une COPIE de celle de la
// page de lecture (`app/oeuvre/[id]/appelNote.tsx`, `rendreTexteAvecNotes`). La copie
// avait pris du retard de deux alternatives : `<i>…</i>` et `++petites capitales++`.
// Un lecteur voyait donc « <i>avec l'argent</i> » en toutes lettres dans une citation
// des Questions sur l'Heptateuque, là où la page de l'œuvre rendait la même phrase en
// italique (relevé de l'auteur, 10 septembre 2026).
//
// ⚠️ CE N'EST PAS UN CAS ISOLÉ : le corpus porte ce balisage par dizaines de milliers —
// 1 383 empans dans les seules Questions sur l'Heptateuque, 6 876 versets de la Sacy —
// et toute surface qui l'ignore les montre nus.
//
// ⛔ La garde ne compare pas des RENDUS, elle compare les deux ÉCRITURES : c'est la
// divergence des sources qu'il faut interdire, et elle se lit sans monter de DOM. Même
// parti que `teteVolet.test.ts`, qui confronte la feuille et le code.

const LIGNE_REGEX = /^[ \t]*const regex = (\/.+\/g)$/gmu

function conventionsDe(fichier: string): string[] {
  return [...readFileSync(fichier, 'utf8').matchAll(LIGNE_REGEX)].map(m => m[1])
}

const PANNEAU = 'app/components/PanneauPatristique.tsx'
const LECTURE = 'app/oeuvre/[id]/appelNote.tsx'

describe('le volet patristique lit le même balisage que la page de lecture', () => {
  it('les deux fichiers portent la même liste de conventions', () => {
    const panneau = conventionsDe(PANNEAU)
    const lecture = conventionsDe(LECTURE)
    // ⚠️ Si l'une des deux change, c'est l'AUTRE qu'il faut suivre, jamais ce test
    // qu'il faut accorder : une convention nouvelle se rend partout ou nulle part.
    expect(panneau).toHaveLength(1)
    expect(lecture.length).toBeGreaterThanOrEqual(1)
    expect(lecture).toContain(panneau[0])
  })

  it('cette liste reconnaît l’italique du corpus, sous ses deux écritures', () => {
    const [source] = conventionsDe(PANNEAU)
    const corps = source.slice(1, source.lastIndexOf('/'))
    const temoin = 'et vous ne serez point rachetés <i>avec l’argent</i>, dit le ++Seigneur++, en *vérité*.'
    const trouves = [...temoin.matchAll(new RegExp(corps, 'gu'))].map(m => m[0])
    expect(trouves).toContain('<i>avec l’argent</i>')
    expect(trouves).toContain('++Seigneur++')
    expect(trouves).toContain('*vérité*')
  })
})
