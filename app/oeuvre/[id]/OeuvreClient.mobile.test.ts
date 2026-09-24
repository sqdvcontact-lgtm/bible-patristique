import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('./OeuvreClient.tsx', import.meta.url), 'utf8')

describe('sommaire responsive de la page œuvre', () => {
  const panneau = source.match(/<aside ref=\{refNav\}[^>]*?data-sommaire-panneau[\s\S]*?<\/aside>/)?.[0]

  it('masque le débordement horizontal dans les variantes mobile et ordinateur', () => {
    expect(panneau).toBeDefined()
    // Le tiroir d'un téléphone défile lui-même ; au bureau, c'est l'enveloppe du contenu.
    expect(panneau?.match(/overflowX: 'hidden'/g)).toHaveLength(2)
  })

  it('pose la poignée sur ordinateur seulement, à cheval sur le filet, hors de ce qui défile', () => {
    // Audit d'harmonie (2026-09-23) : la poignée de gauche vivait DANS le défileur, sur
    // cinq pixels à l'intérieur du filet ; elle prend la mesure des trois autres.
    expect(source).toContain('{!mobile && <div data-sommaire-poignee')
    const poignee = source.match(/data-sommaire-poignee[\s\S]*?\/>}/)?.[0]
    expect(poignee).toMatch(/position: 'absolute', right: '-4px',[\s\S]*?width: '9px'/)
    expect(poignee).toContain('{...poigneeGauche}')
    const iPoignee = panneau!.indexOf('data-sommaire-poignee')
    const iDefileur = panneau!.indexOf("overflowY: 'auto', overflowX: 'hidden', display: 'flex'")
    expect(iPoignee).toBeGreaterThan(-1)
    expect(iDefileur).toBeGreaterThan(iPoignee)
  })

  it('fait du tiroir d’un téléphone une fenêtre modale', () => {
    expect(panneau).toContain("role={tiroirSommaire ? 'dialog' : undefined}")
    expect(source).toContain('useFenetreModale(refNav, tiroirSommaire)')
    expect(source).toContain('useFenetreModale(refAside, tiroirReferences)')
    expect(source).toContain('useFermerAEchap(tiroirSommaire, fermerSommaire)')
    expect(source).toContain('useFermerAEchap(tiroirReferences, fermerReferences)')
  })
})
