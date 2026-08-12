import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const source = readFileSync(new URL('./OeuvreClient.tsx', import.meta.url), 'utf8')

describe('sommaire responsive de la page œuvre', () => {
  it('masque le débordement horizontal dans les variantes mobile et ordinateur', () => {
    const panneau = source.match(/<nav ref=\{refNav\} data-sommaire-panneau[\s\S]*?<\/nav>/)?.[0]

    expect(panneau).toBeDefined()
    expect(panneau?.match(/overflowX: 'hidden'/g)).toHaveLength(2)
  })

  it('ne rend la poignée que sur ordinateur et la maintient dans le panneau', () => {
    const poignee = source.match(/data-sommaire-poignee[\s\S]*?\/>}/)?.[0]

    expect(source).toContain('{!mobile && <div data-sommaire-poignee')
    expect(poignee).toMatch(
      /data-sommaire-poignee[\s\S]*?position: 'absolute', right: 0,[\s\S]*?width: '5px'/,
    )
    expect(poignee).not.toContain("right: '-4px'")
  })
})
