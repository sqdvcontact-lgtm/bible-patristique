import { describe, expect, it } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import {
  FLEURONS, FLEURON_DU_SITE, adresseFleuron, estFleuronConnu, fleuronDe,
} from './fleurons'

/**
 * LA GARDE DU REGISTRE DES FLEURONS.
 *
 * ⛔ Elle confronte les dimensions ÉCRITES aux fichiers réels : c'est par elles que la
 * page calcule la largeur de l'ornement, et une valeur recopiée de travers rendrait un
 * fleuron étiré sans que rien ne le dise. Même parti que le recensement des
 * illustrations, qui compare sa liste au contenu de `public/`.
 */

/** Les dimensions d'un PNG se lisent dans son en-tête IHDR : deux entiers de 32 bits,
 *  gros-boutiens, aux octets 16 et 20. ⚠️ On ne tire pas `sharp` dans un test : la suite
 *  tourne en environnement `node` et doit rester légère. */
function dimensionsPng(chemin: string): { largeur: number; hauteur: number } {
  const octets = readFileSync(chemin)
  return { largeur: octets.readUInt32BE(16), hauteur: octets.readUInt32BE(20) }
}

describe('le registre des fleurons', () => {
  it('n’a pas deux fois la même clé', () => {
    const cles = FLEURONS.map(f => f.cle)
    expect(new Set(cles).size).toBe(cles.length)
  })

  it('n’a pas deux fois la même planche', () => {
    const fichiers = FLEURONS.map(f => f.fichier)
    expect(new Set(fichiers).size).toBe(fichiers.length)
  })

  it('nomme un fleuron du site qui existe', () => {
    expect(estFleuronConnu(FLEURON_DU_SITE)).toBe(true)
  })

  // ⛔ Le fichier doit être là, et aux dimensions déclarées : la page compose sa largeur
  // sur elles (`calc(hauteur * largeur / hauteur)`), et un rapport faux étire le dessin.
  it.each(FLEURONS.map(f => [f.cle, f] as const))('la planche de %s est au dépôt, aux dimensions écrites', (_cle, f) => {
    const chemin = 'public' + adresseFleuron(f)
    expect(existsSync(chemin)).toBe(true)
    expect(dimensionsPng(chemin)).toEqual(f.planche)
  })

  // ⚠️ Une planche se sert au DOUBLE de sa taille d'affichage, jamais plus : au-delà, le
  // navigateur réduit une seconde fois derrière la nôtre et le trait cesse d'être noir.
  // La borne basse est là pour le cas inverse — une planche servie à sa taille d'affichage
  // serait molle sur un écran à forte densité.
  it.each(FLEURONS.map(f => [f.cle, f] as const))('%s se sert entre 1,5 et 2,1 fois sa pose', (_cle, f) => {
    const posePx = Number.parseFloat(f.hauteur) * 16
    const rapport = f.planche.hauteur / posePx
    expect(rapport).toBeGreaterThanOrEqual(1.5)
    expect(rapport).toBeLessThanOrEqual(2.1)
  })

  it('pose sa hauteur en rem, jamais en pixels', () => {
    for (const f of FLEURONS) expect(f.hauteur).toMatch(/^[0-9.]+rem$/)
  })

  describe('fleuronDe', () => {
    it('rend l’ornement demandé', () => {
      expect(fleuronDe('acanthe').fichier).toBe('fleuron-acanthe')
    })

    // ⛔ Le cas ORDINAIRE : une œuvre qui ne demande rien porte le fleuron du site.
    it.each([null, undefined, '', 'un-ornement-retire-du-registre'])('retombe sur le fleuron du site : %s', valeur => {
      expect(fleuronDe(valeur).cle).toBe(FLEURON_DU_SITE)
    })
  })

  it('estFleuronConnu ne dit oui qu’aux clés du registre', () => {
    expect(estFleuronConnu('croix')).toBe(true)
    expect(estFleuronConnu('fleuron-croix')).toBe(false)
    expect(estFleuronConnu(null)).toBe(false)
  })
})
