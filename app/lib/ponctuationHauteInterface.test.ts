/**
 * GARDE — la ponctuation haute des textes d'interface.
 *
 * Charte § 3.2 : une insécable (U+00A0) devant « : », une fine insécable (U+202F)
 * devant « ; », « ? » et « ! ». Le corpus reçoit la sienne au RENDU
 * (`normaliserEspaces`) ; les textes que le site écrit lui-même dans ses composants,
 * non. Cette garde lit le texte JSX et les attributs qu'on lit ou qu'on entend
 * (`title`, `aria-label`, `placeholder`, `alt`) et refuse une espace ORDINAIRE devant
 * une ponctuation haute.
 *
 * ⚠️ Elle ne lit que le JSX : une chaîne JavaScript peut être une clé, une adresse, un
 *    sélecteur ou une règle CSS, et rien ne dit à la lecture qu'elle s'affiche. Celles
 *    qui s'affichent se corrigent à la main (lot 7 du chantier d'harmonie, 2026-09-24).
 * ⚠️ Idiome : `&nbsp;:` et `&#8239;?` dans le JSX, `\u00A0` et `\u202F` dans une chaîne.
 */
import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import ts from 'typescript'

const RACINE = join(__dirname, '..')

/** Ce que la garde ne lit pas, et pourquoi. */
const HORS_GARDE: { chemin: string; raison: string }[] = [
  { chemin: 'admin/', raison: 'administration : hors du périmètre du chantier' },
  { chemin: 'manuscrits/bible-899/', raison: 'chantier de l’auteur, non touché' },
  { chemin: 'quiz/', raison: 'route neutralisée, version vivante sur la branche Holy Guessr' },
  { chemin: 'auth/apercu-', raison: 'outils d’atelier non versionnés' },
]

const ATTRIBUTS_LUS = new Set(['title', 'aria-label', 'placeholder', 'alt'])
const FAUTE = /[\p{L}\p{N}»)…’] [;:!?](?=$|[\s"'»)<])/u

function fichiers(dossier: string): string[] {
  const sortie: string[] = []
  for (const nom of readdirSync(dossier)) {
    const chemin = join(dossier, nom)
    const rel = relative(RACINE, chemin).split(sep).join('/')
    if (HORS_GARDE.some(h => rel.startsWith(h.chemin))) continue
    if (statSync(chemin).isDirectory()) sortie.push(...fichiers(chemin))
    else if (nom.endsWith('.tsx') && !nom.includes('.test.')) sortie.push(chemin)
  }
  return sortie
}

function fautes(fichier: string): string[] {
  const src = readFileSync(fichier, 'utf8')
  const sf = ts.createSourceFile(fichier, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const trouvees: string[] = []
  const signaler = (n: ts.Node, texte: string) => {
    const m = FAUTE.exec(texte)
    if (!m) return
    const ligne = sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1
    trouvees.push(`${relative(RACINE, fichier).split(sep).join('/')}:${ligne} « …${texte.slice(Math.max(0, m.index - 20), m.index + 3).replace(/\s+/g, ' ')} »`)
  }
  const visite = (n: ts.Node) => {
    if (n.kind === ts.SyntaxKind.JsxText) signaler(n, n.getText(sf))
    else if (ts.isJsxAttribute(n) && ATTRIBUTS_LUS.has(n.name.getText(sf)) && n.initializer && ts.isStringLiteral(n.initializer)) {
      signaler(n, n.initializer.text)
    }
    ts.forEachChild(n, visite)
  }
  visite(sf)
  return trouvees
}

describe('ponctuation haute des textes d’interface (charte § 3.2)', () => {
  it('aucune espace ordinaire devant « : ; ? ! » dans le texte JSX du site', () => {
    const toutes = fichiers(RACINE).flatMap(fautes)
    expect(toutes).toEqual([])
  })

  it('la garde voit la faute qu’elle doit voir', () => {
    const essai = (texte: string) => FAUTE.test(texte)
    expect(essai('Fermer sans enregistrer ?')).toBe(true)
    expect(essai('Motif de la modération : ')).toBe(true)
    expect(essai('les frais ; les soutiens')).toBe(true)
    expect(essai('Fermer sans enregistrer\u202F?')).toBe(false)
    expect(essai('Motif\u00A0: ')).toBe(false)
    expect(essai('Supprimer&#8239;?')).toBe(false)
  })
})
