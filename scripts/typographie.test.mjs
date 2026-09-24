// La passe des importeurs bibliques (sacy-charge, crampon-recharge) compose selon la
// charte § 3.2 par la fonction commune, et non plus par ses anciennes règles, qui posaient
// une insécable pleine chasse devant « ; » et à l'intérieur des guillemets.
import { describe, expect, it } from 'vitest'
import { corrigerTypographie } from './typographie.mjs'

// Par point de code, jamais par littéral : ces espaces se ressemblent toutes à l'écran.
const FINE = String.fromCharCode(0x202f)
const NBSP = String.fromCharCode(0x00a0)

describe('corrigerTypographie, la passe des importeurs bibliques', () => {
  it('compose la ponctuation haute et les guillemets selon la charte', () => {
    expect(corrigerTypographie('Il dit :  « viens » ; et partit !'))
      .toBe(`Il dit${NBSP}: «${FINE}viens${FINE}»${FINE}; et partit${FINE}!`)
  })

  it('garde ses propres règles : virgule, point, parenthèses, apostrophe', () => {
    expect(corrigerTypographie("l'ami , dit-il ( en paix ) .")).toBe('l’ami, dit-il (en paix).')
  })

  it('préserve les balises d’italique', () => {
    expect(corrigerTypographie('<i>Deus</i> ; amen')).toBe(`<i>Deus</i>${FINE}; amen`)
  })

  it('est idempotente', () => {
    const une = corrigerTypographie('Il dit : « viens » ; oui ? l\'ami')
    expect(corrigerTypographie(une)).toBe(une)
  })
})
