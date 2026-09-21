import { describe, expect, it, vi } from 'vitest'
import type { KeyboardEvent } from 'react'
import { activerAuClavier } from './activerAuClavier'

function evenement(cle: string, options: { surSoi?: boolean; repeat?: boolean; ctrl?: boolean } = {}) {
  const cible = {}
  const e = {
    key: cle,
    target: cible,
    currentTarget: options.surSoi === false ? {} : cible,
    repeat: options.repeat ?? false,
    altKey: false,
    ctrlKey: options.ctrl ?? false,
    metaKey: false,
    preventDefault: vi.fn(),
  }
  return e as unknown as KeyboardEvent<HTMLElement> & { preventDefault: ReturnType<typeof vi.fn> }
}

describe('activerAuClavier', () => {
  it('active sur Entrée et sur Espace, et consomme la touche', () => {
    for (const cle of ['Enter', ' ']) {
      const activer = vi.fn()
      const e = evenement(cle)
      activerAuClavier(e, activer)
      expect(activer).toHaveBeenCalledTimes(1)
      expect(e.preventDefault).toHaveBeenCalled()
    }
  })

  it('laisse passer toute autre touche', () => {
    const activer = vi.fn()
    const e = evenement('a')
    activerAuClavier(e, activer)
    expect(activer).not.toHaveBeenCalled()
    expect(e.preventDefault).not.toHaveBeenCalled()
  })

  it('ne s’active pas quand la touche vise un enfant (appel de note, lien)', () => {
    const activer = vi.fn()
    activerAuClavier(evenement('Enter', { surSoi: false }), activer)
    expect(activer).not.toHaveBeenCalled()
  })

  it('ne répète pas l’action sur une touche tenue, ni sous un modificateur', () => {
    const activer = vi.fn()
    activerAuClavier(evenement('Enter', { repeat: true }), activer)
    activerAuClavier(evenement('Enter', { ctrl: true }), activer)
    expect(activer).not.toHaveBeenCalled()
  })
})
