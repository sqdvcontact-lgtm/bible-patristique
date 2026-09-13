import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { AGENTS_IA_REFUSES } from './robotsIa'

// Les deux verrous d'un refus de robot, confrontés : ce que le robot lit (app/robots.txt)
// et ce que le proxy lui rend en 403 (AGENTS_IA_REFUSES). Voir AGENTS.md, « Un refus de
// robot a DEUX verrous ».
const lire = (chemin: string) => readFileSync(new URL(chemin, import.meta.url), 'utf8')
const ROBOTS = lire('../robots.txt')

// Jetons qui n'existent QUE dans robots.txt : Google et Apple explorent sous Googlebot et
// Applebot, ces jetons ne règlent que l'usage des pages. Aucun agent ne s'annonce ainsi.
const JETONS_SANS_AGENT = new Set(['Google-Extended', 'Applebot-Extended'])

type Groupe = { agents: string[]; regles: string[] }

function groupes(texte: string): Groupe[] {
  const liste: Groupe[] = []
  for (const brute of texte.split(/\r?\n/)) {
    const ligne = brute.replace(/#.*/, '').trim()
    const deuxPoints = ligne.indexOf(':')
    if (deuxPoints < 0) continue
    const cle = ligne.slice(0, deuxPoints).trim().toLowerCase()
    const valeur = ligne.slice(deuxPoints + 1).trim()
    const courant = liste[liste.length - 1]
    if (cle === 'user-agent') {
      if (!courant || courant.regles.length) liste.push({ agents: [valeur], regles: [] })
      else courant.agents.push(valeur)
    } else if (courant && (cle === 'allow' || cle === 'disallow')) {
      courant.regles.push(`${cle} ${valeur}`)
    }
  }
  return liste
}

// L'agent tel qu'un robot l'annonce, adresse de contact comprise : c'est elle qui piège
// un motif trop large.
const agent = (nom: string) =>
  `Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; ${nom}/1.0; +${nom.toLowerCase()}@exemple.org)`

const tous = groupes(ROBOTS)
const refuses = tous.filter(g => g.regles.includes('disallow /')).flatMap(g => g.agents)
const accueillis = tous.filter(g => !g.agents.includes('*') && g.regles.includes('allow /')).flatMap(g => g.agents)

describe('robots.txt et le proxy disent la même chose', () => {
  it('le proxy refuse chaque robot d’entraînement qui s’annonce', () => {
    const annonces = refuses.filter(nom => !JETONS_SANS_AGENT.has(nom))
    expect(annonces).toContain('ClaudeBot')
    for (const nom of annonces) expect(AGENTS_IA_REFUSES.test(agent(nom)), nom).toBe(true)
  })

  it('le proxy laisse passer chaque assistant qui cite', () => {
    expect(accueillis).toEqual(expect.arrayContaining(['OAI-SearchBot', 'ChatGPT-User', 'Claude-SearchBot', 'Claude-User']))
    for (const nom of accueillis) expect(AGENTS_IA_REFUSES.test(agent(nom)), nom).toBe(false)
  })

  it('aucun robot n’est nommé deux fois', () => {
    const noms = tous.flatMap(g => g.agents)
    expect(new Set(noms).size).toBe(noms.length)
  })

  it('un navigateur ordinaire n’est jamais pris pour un robot', () => {
    const chrome = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'
    expect(AGENTS_IA_REFUSES.test(chrome)).toBe(false)
  })
})

describe('la licence RSL', () => {
  it('est annoncée par robots.txt et réserve l’entraînement', () => {
    expect(ROBOTS).toMatch(/^License: https:\/\/corpus-scriptura\.fr\/license\.xml\r?$/m)
    const licence = lire('../../public/license.xml')
    expect(licence).toContain('<prohibits type="usage">ai-train</prohibits>')
    expect(licence).toContain('<payment type="attribution"/>')
  })
})
