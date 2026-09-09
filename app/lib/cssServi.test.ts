import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import postcss from 'postcss'
import { cssServi } from './cssServi'

describe('cssServi', () => {
  it('retire les commentaires et garde les déclarations', () => {
    const r = cssServi('.a {\n  /* une note */\n  color: red;\n}')
    expect(r).not.toContain('une note')
    expect(r).toContain('color: red;')
  })

  it('retire le retrait de gauche, qui ne veut rien dire en CSS', () => {
    expect(cssServi('        .a { color: red; }')).toBe('.a { color: red; }')
  })

  it('ne laisse aucune ligne vide', () => {
    expect(cssServi('.a{}\n\n\n.b{}')).toBe('.a{}\n.b{}')
  })

  it('est idempotent', () => {
    const s = '/* x */\n.a { color: red; }\n'
    expect(cssServi(cssServi(s))).toBe(cssServi(s))
  })
})

/** Les blocs <style> d'un fichier, sous leurs DEUX écritures : le bloc nu, et le bloc
 *  passé à « cssServi ». ⚠️ Découpe par recherche de chaîne plutôt que par expression
 *  régulière : celle-ci demanderait trois niveaux d'échappement et se relit mal. */
function blocsDeStyle(src: string): string[] {
  const out: string[] = []
  let i = 0
  for (;;) {
    const d = src.indexOf('<style>{', i)
    if (d < 0) break
    const f = src.indexOf('}</style>', d)
    if (f < 0) break
    let corps = src.slice(d + '<style>{'.length, f).trim()
    if (corps.startsWith('cssServi(')) corps = corps.slice('cssServi('.length, -1).trim()
    // Le gabarit de chaîne qui reste porte ses accents graves aux deux bouts.
    if (corps.startsWith('`') && corps.endsWith('`')) corps = corps.slice(1, -1)
    out.push(corps)
    i = f + 1
  }
  return out
}

/* ⛔ LES FICHIERS DONT LES FEUILLES SONT SERVIES FILTRÉES. La liste est CLOSE et elle ne
   peut que grandir : un fichier qui y entre ne peut plus en sortir sans qu'un test le
   dise. Ce sont les quatre feuilles que porte la page d'accueil — la sienne, les cartes,
   la barre de navigation et l'annonce de haut fait, ces deux dernières servies sur TOUTES
   les pages du site. Mesuré le 2026-09-09 avant la passe : 23 060 signes de commentaires
   voyageaient dans le HTML d'un seul chargement d'accueil, dont 12 904 pour la seule
   annonce. ⚠️ AccueilCards et AnnonceHautsFaits sont des composants CLIENT : leur gabarit
   part aussi dans le paquet JavaScript, que le filtrage au service ne touche pas — le
   gain porte sur le HTML, qui n'est jamais mis en cache. */
const FEUILLES_SERVIES_FILTREES = [
  'app/accueil/page.tsx',
  'app/components/AccueilCards.tsx',
  'app/components/Navbar.tsx',
  'app/components/AnnonceHautsFaits.tsx',
]

/* ⛔ LA GARDE QUI COMPTE : le CSS SERVI doit rester du CSS que PostCSS accepte, car
   c'est lui que la chaîne de construction emploie. Une accolade perdue dans une feuille
   a déjà fait échouer deux déploiements de suite (AGENTS.md). Et le service ne doit rien
   retirer d'UTILE : autant de déclarations avant qu'après. */
describe('les blocs <style> du site restent du CSS valide une fois SERVIS', () => {
  for (const page of FEUILLES_SERVIES_FILTREES) {
    it(page, () => {
      const blocs = blocsDeStyle(fs.readFileSync(page, 'utf8'))
      expect(blocs.length, 'aucun bloc <style> trouvé — le motif a-t-il changé ?').toBeGreaterThan(0)
      for (const b of blocs) {
        expect(() => postcss.parse(cssServi(b))).not.toThrow()
        const declarations = (t: string) => (t.replace(/\/\*[\s\S]*?\*\//g, '').match(/;/g) ?? []).length
        expect(declarations(cssServi(b))).toBe(declarations(b))
      }
    })
  }
})

/* ⛔ ET CHACUN DE LEURS BLOCS PASSE RÉELLEMENT PAR « cssServi ». Le contrôle du dessus
   éprouve ce que le filtre RENDRAIT ; celui-ci vérifie qu'on l'appelle. Sans lui, retirer
   l'enveloppe d'un bloc ne casserait rien et ne se verrait nulle part — c'est exactement
   ainsi que trois feuilles sur quatre sont restées non filtrées pendant que la doctrine du
   dépôt les déclarait filtrées. */
describe('les feuilles de la liste passent toutes par cssServi', () => {
  for (const page of FEUILLES_SERVIES_FILTREES) {
    it(page, () => {
      const src = fs.readFileSync(page, 'utf8')
      const ouvertures = src.split('<style>{').length - 1
      const filtres = src.split('<style>{cssServi(').length - 1
      expect(ouvertures, 'aucun bloc <style> trouvé — le motif a-t-il changé ?').toBeGreaterThan(0)
      expect(filtres, `${ouvertures - filtres} bloc(s) <style> servis SANS cssServi`).toBe(ouvertures)
    })
  }
})
