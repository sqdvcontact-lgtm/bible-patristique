import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'

// Ce composant est piloté par des styles EN LIGNE : sa forme ne s'extrait pas
// dans une fonction qu'on pourrait interroger. On monte donc la garde sur le
// source lui-même, faute de mieux, parce que la règle a déjà été enfreinte deux
// fois après avoir été appliquée.
const source = readFileSync(new URL('./NoteTooltip.tsx', import.meta.url), 'utf8')

// Les commentaires expliquent précisément l'interdiction : ils ne sont pas des
// infractions. On ne lit que le code.
const code = source
  .split('\n')
  .filter(ligne => !ligne.trimStart().startsWith('//'))
  .join('\n')

describe('appels de note et renvois — aucun soulignement', () => {
  it('ne pose jamais de pointillé', () => {
    expect(code).not.toContain('dotted')
  })

  it('ne pose jamais de soulignement d’aucune sorte', () => {
    expect(code).not.toContain('textDecorationStyle')
    expect(code).not.toMatch(/textDecoration:\s*'underline'/)
    expect(code).not.toMatch(/borderBottom:\s*'[^']*(?:dotted|dashed|solid)/)
  })

  it('signale l’appel par la teinte, qui doit donc rester', () => {
    expect(code).toContain("color: 'var(--cs-vert)'")
  })
})
