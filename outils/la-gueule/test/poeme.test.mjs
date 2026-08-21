import { test } from 'node:test'
import assert from 'node:assert/strict'
import { annoterPoemes, annotationVide } from '../src/structure.mjs'

const ann = (role, niveau) => { const a = annotationVide(); a.role_suggere = role; if (niveau) a.niveau_suggere = niveau; return a }
const L = (dip, suggestion) => ({ bbox: [100, 100, 400, 50], dip, ...(suggestion ? { suggestion } : {}) })

// ── Passe 4 §3.5 : fil-conducteur poeme_id ──
test('poeme_id : POESIE ouvre ; vers page suivante = même id ; continuation hérite ; PROSE ferme ; POESIE II nouvel id ; prose null', () => {
  const p1 = { num: 1, lignes: [L('POESIE I.'), L('Un vers ici'), L('douleur,')] }
  const p2 = { num: 2, lignes: [L('Encore un vers'), L('II. PROSE.'), L('Corps de prose ordinaire.')] }
  const p3 = { num: 3, lignes: [L('POESIE II.'), L('Autre vers')] }
  const parPage = new Map([
    [1, [ann('titre', 2), ann('vers'), ann('continuation_typographique')]],
    [2, [ann('vers'), ann('titre', 2), ann('corps')]],
    [3, [ann('titre', 2), ann('vers')]],
  ])
  const { poemes } = annoterPoemes([p1, p2, p3], parPage)
  const g = (n, i) => parPage.get(n)[i].poeme_id
  assert.equal(g(1, 0), 'poeme-1-0')  // POESIE I ouvre
  assert.equal(g(1, 1), 'poeme-1-0')  // vers
  assert.equal(g(1, 2), 'poeme-1-0')  // continuation hérite du poème de son vers
  assert.equal(g(2, 0), 'poeme-1-0')  // le poème reste actif au changement de page
  assert.equal(g(2, 1), null)         // PROSE ferme le poème
  assert.equal(g(2, 2), null)         // ligne de prose → poeme_id null
  assert.equal(g(3, 0), 'poeme-3-0')  // POESIE II → nouvel identifiant
  assert.equal(g(3, 1), 'poeme-3-0')
  assert.notEqual(g(1, 0), g(3, 0))   // deux poèmes distincts → retraits jamais mélangés
  assert.equal(Object.keys(poemes).length, 2)
  assert.equal(poemes['poeme-1-0'].poeme_ref, 'livre-1-poesie-1')
  assert.equal(poemes['poeme-3-0'].poeme_ref, 'livre-1-poesie-2')
})

test('poeme_id : corriger le libellé du titre ne change pas l’identifiant (fondé sur la position)', () => {
  const mk = (titre) => ({ pages: [{ num: 1, lignes: [L(titre), L('vers')] }], parPage: new Map([[1, [ann('titre', 2), ann('vers')]]]) })
  const a = mk('POESIE I.'); annoterPoemes(a.pages, a.parPage)
  const b = mk('POESIE PREMIERE'); annoterPoemes(b.pages, b.parPage)
  assert.equal(a.parPage.get(1)[0].poeme_id, b.parPage.get(1)[0].poeme_id) // même position → même id
})

test('poeme_id : suppression du titre → orphelins signalés, jamais de réattribution silencieuse', () => {
  const p1 = { num: 1, lignes: [
    L('POESIE I.', { poeme_id: 'poeme-1-0', statut: 'confirme' }),
    L('Un vers', { poeme_id: 'poeme-1-0', statut: 'confirme' }),
  ] }
  const parPage = new Map([[1, [ann('corps'), ann('vers')]]]) // le titre a été reclassé (supprimé comme POESIE)
  const { orphelins } = annoterPoemes([p1], parPage)
  assert.equal(parPage.get(1)[1].poeme_id, null)              // plus rattaché
  assert.equal(parPage.get(1)[1].poeme_orphelin, true)        // signalé
  assert.equal(parPage.get(1)[1].poeme_id_ancien, 'poeme-1-0') // provenance conservée
  assert.ok(orphelins.some((o) => o.page === 1 && o.ligne === 1))
})
