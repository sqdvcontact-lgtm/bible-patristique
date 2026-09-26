import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { POINTS_DE_RUPTURE, estTelephone } from './pointsDeRupture'

const RACINE = path.join(__dirname, '..')
// Hors périmètre : l'administration (tableaux larges, hors du lecteur), comme les
// autres gardes du dessin.
const EXCLUS = [path.join(RACINE, 'admin')]

function fichiers(dossier: string, acc: string[] = []): string[] {
  for (const e of fs.readdirSync(dossier, { withFileTypes: true })) {
    const p = path.join(dossier, e.name)
    if (EXCLUS.some(x => p.startsWith(x))) continue
    if (e.isDirectory()) fichiers(p, acc)
    else if (/\.(tsx?|css)$/.test(e.name) && !/\.test\.tsx?$/.test(e.name)) acc.push(p)
  }
  return acc
}

const ECHELLE = Object.values(POINTS_DE_RUPTURE) as number[]
const MAX_ADMIS = new Set(ECHELLE)
const MIN_ADMIS = new Set(ECHELLE.map(v => v + 1))
// La seule exception : un très grand écran très court (police racine au plafond).
const EXCEPTIONS_MIN = new Set([2400])

describe('les points de rupture', () => {
  it('forment une échelle de quatre valeurs croissantes', () => {
    expect(ECHELLE).toEqual([...ECHELLE].sort((a, b) => a - b))
    expect(ECHELLE.length).toBe(4)
  })

  it('toute requête média de largeur prend une valeur de l’échelle', () => {
    const fautes: string[] = []
    for (const f of fichiers(RACINE)) {
      const s = fs.readFileSync(f, 'utf8')
      for (const m of s.matchAll(/@media[^{]*\{/g)) {
        for (const w of m[0].matchAll(/(max|min)-width:\s*(\d+)px/g)) {
          const v = Number(w[2])
          const ok = w[1] === 'max' ? MAX_ADMIS.has(v) : MIN_ADMIS.has(v) || EXCEPTIONS_MIN.has(v)
          if (!ok) fautes.push(`${path.relative(RACINE, f)} : ${m[0].trim()}`)
        }
      }
    }
    expect(fautes).toEqual([])
  })

  it('useEstMobile ne reçoit pas de seuil écrit en chiffres', () => {
    const fautes: string[] = []
    for (const f of fichiers(RACINE)) {
      const s = fs.readFileSync(f, 'utf8')
      for (const m of s.matchAll(/useEstMobile\((\d+)\)/g)) fautes.push(`${path.relative(RACINE, f)} : ${m[0]}`)
    }
    expect(fautes).toEqual([])
  })
})

describe('estTelephone', () => {
  it('suit Sec-CH-UA-Mobile quand il est là', () => {
    expect(estTelephone('?1', 'Mozilla/5.0 (Windows NT 10.0)')).toBe(true)
    expect(estTelephone('?0', 'Mozilla/5.0 (Linux; Android 14) Mobile Safari')).toBe(false)
  })
  it('lit le user-agent à défaut', () => {
    expect(estTelephone(null, 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148')).toBe(true)
    expect(estTelephone(null, 'Mozilla/5.0 (Linux; Android 14; Pixel 8) Mobile Safari/537.36')).toBe(true)
    expect(estTelephone(null, 'Mozilla/5.0 (Linux; Android 14; SM-X710) Safari/537.36')).toBe(false)
    expect(estTelephone(null, 'Mozilla/5.0 (iPad; CPU OS 12_2 like Mac OS X) Mobile/15E148')).toBe(false)
    expect(estTelephone(null, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe(false)
    expect(estTelephone(undefined, undefined)).toBe(false)
  })
})
