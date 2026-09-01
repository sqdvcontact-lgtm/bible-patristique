import { describe, expect, it } from 'vitest'
import {
  auteurDuPortrait, cadrageDepuisPhotoPosition, CADRAGE_PAR_DEFAUT, cheminPortrait,
  familleDeRef, identifiantDeRef, refPortraitValide, traductionDeLEncart, urlPortrait,
  ZOOM_MAX,
} from './portraits'

// La garde du PORTRAIT. Elle vaut surtout pour ce qu'elle REFUSE.
//
// Le défaut réparé le 2026-09-01 n'était pas une faute de frappe : la page du compte
// écrivait dans `profils.avatar_url` une adresse complète venue du navigateur, et la
// page publique la servait ensuite à tous ses visiteurs. La politique RLS borne la
// LIGNE qu'un lecteur peut modifier, jamais la VALEUR qu'il y écrit. Le format est
// donc vérifié en base par une contrainte, et ici par ce motif — les deux doivent
// rester d'accord.

const BASE = 'https://exemple.supabase.co'

describe('références de portrait', () => {
  it('accepte les deux familles du corpus', () => {
    expect(refPortraitValide('auteur:A0010')).toBe(true)
    expect(refPortraitValide('traduction:TR0002')).toBe(true)
    expect(familleDeRef('auteur:A0010')).toBe('auteur')
    expect(familleDeRef('traduction:TR0002')).toBe('traduction')
    expect(identifiantDeRef('auteur:A0010')).toBe('A0010')
  })

  it('refuse tout ce qui n’est pas une référence', () => {
    // ⛔ Le cas qui compte : une adresse extérieure ne doit jamais passer pour une
    // référence, sous aucune forme.
    for (const fautif of [
      'https://ailleurs.example/pixel.gif',
      '//ailleurs.example/pixel.gif',
      'javascript:alert(1)',
      'data:image/svg+xml;base64,AAAA',
      'auteur:../../secret',
      'auteur:A0010/../../etc',
      'auteur:',
      'auteur',
      'oeuvre:O0001',
      '',
      'auteur:' + 'A'.repeat(41),
    ]) {
      expect(refPortraitValide(fautif), fautif).toBe(false)
      expect(urlPortrait(fautif, BASE), fautif).toBeNull()
    }
    expect(refPortraitValide(null)).toBe(false)
    expect(refPortraitValide(undefined)).toBe(false)
  })

  it('fabrique l’adresse dans le bon seau', () => {
    expect(urlPortrait('auteur:A0010', BASE)).toBe(`${BASE}/storage/v1/object/public/auteurs/A0010.jpg`)
    // ⛔ Un traducteur prend son ENCART, jamais son bandeau : le bandeau est couché
    // (charte § 37) et ne donnerait dans un rond qu'une bande de ciel.
    expect(urlPortrait('traduction:TR0002', BASE)).toBe(`${BASE}/storage/v1/object/public/traductions/TR0002-encart.jpg`)
    expect(cheminPortrait('traduction:TR0002')?.fichier).toBe('TR0002-encart.jpg')
  })

  it('sans base d’adresse, ne rend pas une adresse à moitié formée', () => {
    expect(urlPortrait('auteur:A0010', '')).toBeNull()
  })
})

describe('noms de fichiers du seau', () => {
  it('reconnaît un portrait d’auteur, et lui seul', () => {
    expect(auteurDuPortrait('A0010.jpg')).toBe('A0010')
    expect(auteurDuPortrait('.emptyFolderPlaceholder')).toBeNull()
    expect(auteurDuPortrait('A0010.png')).toBeNull()
  })

  it('reconnaît un encart de traduction, et non son bandeau', () => {
    expect(traductionDeLEncart('TR0002-encart.jpg')).toBe('TR0002')
    expect(traductionDeLEncart('TR0002.jpg')).toBeNull()
  })
})

describe('cadrage repris de la bibliothèque', () => {
  it('prend la fiche plutôt que la carte', () => {
    // La fiche est en 0,80 de proportion, la carte en 0,60 : le rond du profil étant
    // carré, c'est la fiche dont le point d'intérêt tombe le mieux.
    const cadrage = cadrageDepuisPhotoPosition({ carte: { x: 10, y: 90, scale: 1 }, fiche: { x: 52, y: 8, scale: 1.6 } })
    expect(cadrage).toEqual({ posX: 52, posY: 8, zoom: 1.6 })
  })

  it('retombe sur la carte, puis sur le défaut', () => {
    expect(cadrageDepuisPhotoPosition({ carte: { x: 30, y: 40, scale: 1.2 } })).toEqual({ posX: 30, posY: 40, zoom: 1.2 })
    expect(cadrageDepuisPhotoPosition(null)).toEqual(CADRAGE_PAR_DEFAUT)
    expect(cadrageDepuisPhotoPosition({})).toEqual(CADRAGE_PAR_DEFAUT)
    expect(cadrageDepuisPhotoPosition({ fiche: { x: 'haut' } })).toEqual(CADRAGE_PAR_DEFAUT)
  })

  it('borne le zoom à la course du curseur', () => {
    // ⚠️ L'administration cadre jusqu'à 3,5. Repris tel quel, le zoom sortirait de la
    // course du curseur du profil, et le lecteur ne pourrait plus revenir en arrière.
    expect(cadrageDepuisPhotoPosition({ fiche: { x: 50, y: 50, scale: 3.5 } }).zoom).toBe(ZOOM_MAX)
    expect(cadrageDepuisPhotoPosition({ fiche: { x: 50, y: 50, scale: 0.2 } }).zoom).toBe(1)
    expect(cadrageDepuisPhotoPosition({ fiche: { x: -20, y: 300, scale: 1 } })).toMatchObject({ posX: 0, posY: 100 })
  })
})
