import { test } from 'node:test'
import assert from 'node:assert/strict'

import { qualiteIA, qualiteMarkdown, verdict } from '../src/qualite-ia.mjs'

const c = (o) => ({ type: 'correction_ocr', origine: 'ia', regle: 'relecture_page', ...o })
const projet = (corrections) => ({ pages: { 7: { lignes: [{ dip: 'x', corrections }] } } })

test('verdict : une proposition non tranchée n’est PAS un accord', () => {
  assert.equal(verdict(c({ statut: 'applique_candidate' })), null)   // appliquée en candidat, pas relue
  assert.equal(verdict(c({ statut: 'confirme_humain' })), 'acceptee')
  assert.equal(verdict(c({ statut: 'modifie_humain' })), 'amendee')
  assert.equal(verdict(c({ statut: 'refuse' })), 'refusee')
  assert.equal(verdict(c({ statut: 'confirme_humain', annulee: true })), 'annulee') // revenue en arrière
})

test('le taux ne porte que sur les propositions JUGÉES', () => {
  const q = qualiteIA(projet([
    c({ statut: 'confirme_humain' }),
    c({ statut: 'refuse' }),
    c({ statut: 'applique_candidate' }),   // en attente : exclue du taux
  ]))
  assert.equal(q.total.proposees, 3)
  assert.equal(q.total.jugees, 2)
  assert.equal(q.total.en_attente, 1)
  assert.equal(q.total.taux_accord, 50)
})

test('une proposition amendée compte comme un accord (l’IA a vu juste, la forme a changé)', () => {
  const q = qualiteIA(projet([c({ statut: 'modifie_humain' }), c({ statut: 'confirme_humain' })]))
  assert.equal(q.total.taux_accord, 100)
  assert.equal(q.total.amendees, 1)
})

test('ce qui ne vient pas de l’IA n’est pas compté', () => {
  const q = qualiteIA(projet([c({ origine: 'humain', statut: 'confirme_humain' }), c({ origine: 'deterministe' })]))
  assert.equal(q.total.proposees, 0)
})

test('ventilation par règle, la plus jugée en tête', () => {
  const q = qualiteIA(projet([
    c({ regle: 'relecture_page', statut: 'confirme_humain' }),
    c({ regle: 'relecture_page', statut: 'confirme_humain' }),
    c({ regle: 'relecture_page', statut: 'refuse' }),
    c({ regle: 'relecture_role', type: 'reclassement_role', statut: 'refuse' }),
  ]))
  assert.equal(q.regles[0].regle, 'relecture_page')
  assert.equal(q.regles[0].jugees, 3)
  assert.equal(q.regles[0].taux_accord, 66.7)
  assert.equal(q.regles[1].taux_accord, 0)
})

test('aucune décision : aucun taux inventé', () => {
  const q = qualiteIA(projet([c({ statut: 'applique_candidate' })]))
  assert.equal(q.total.taux_accord, null)
  assert.match(qualiteMarkdown(q), /Aucune n’a encore été tranchée|aucune n’a encore été tranchée/i)
})

test('le rapport avertit quand l’échantillon est trop mince', () => {
  const md = qualiteMarkdown(qualiteIA(projet([c({ statut: 'confirme_humain' }), c({ statut: 'refuse' })])))
  assert.match(md, /indicatif, pas un résultat/)
})

test('le rapport signale les règles plus souvent refusées qu’acceptées', () => {
  const mauvaise = Array.from({ length: 6 }, () => c({ regle: 'douteuse', statut: 'refuse' }))
  const md = qualiteMarkdown(qualiteIA(projet(mauvaise)))
  assert.match(md, /À revoir/)
  assert.match(md, /`douteuse`/)
})

test('projet sans aucune proposition', () => {
  assert.match(qualiteMarkdown(qualiteIA({ pages: {} })), /Aucune proposition IA/)
})
