// Vérification visuelle à deux passes : protocole aveugle, arbitrage sur crop, lignes faibles.
// Le fournisseur est simulé — aucun réseau, aucune image : on teste le PROTOCOLE, pas le modèle.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  assignerAveugle, verdictDepuisReponse, verifierParPage, arbitrerParCrop,
  trierInterventions, candidatsDepuisLignesFaibles, retirerFlagsConfirmes,
} from '../src/ia/verificateur.mjs'
import { consigneVerificationPage, consigneArbitrageCrop, consigneLectureCrop } from '../src/ia/prompt.mjs'

const projet = {
  kind: 'imprime',
  pages: {
    2: { lignes: [
      { bbox: [10, 10, 100, 20], ocr0: 'cest bomme', dip: 'cest bomme', confiance: 0.99 },
      { bbox: [10, 40, 100, 20], ocr0: 'Deut.23.', dip: 'Deut.23.', confiance: 0.95, suggestion: { role_suggere: 'note_marginale' } },
      { bbox: [10, 70, 100, 20], ocr0: 'aizrjklm', dip: 'aizrjklm', confiance: 0.42 },
    ] },
  },
}
const iv = (i, avant, apres, extra = {}) => ({
  type: 'correction_ocr', page: 2, ligne_ids: [i], texte_original: avant, texte_candidat: apres,
  confiance_modele: 0.99, bbox: projet.pages[2].lignes[i].bbox, statut: 'propose_ia', ...extra,
})

// Fournisseur simulé : répond en désignant la lecture demandée, SANS savoir laquelle est le candidat.
// `choisir(lectureA, lectureB)` renvoie la lettre à jouer — c'est ce qui permet de vérifier que le
// protocole aveugle retraduit correctement A/B en CANDIDATE/OCR0.
function fournisseurFactice(choisir, { qualite = 'bonne', confiance = 0.99 } = {}) {
  const vus = []
  return {
    vus,
    nom: 'factice', cloud: true, dispo: true, modele: { vision: 'test' },
    async verification(charge) {
      vus.push(charge)
      const items = charge.items || []
      return {
        type: 'verification_visuelle', statut: 'candidat', abstention: false, modele: 'test', fournisseur: 'factice',
        verifications: items.map((it) => {
          const lettre = choisir(it.a, it.b)
          return {
            i: it.i, lecture: lettre, confiance, qualite,
            lecture_exacte: lettre === 'A' ? it.a : (lettre === 'B' ? it.b : 'troisieme'),
            indice: 'test', changement_editorial: false,
          }
        }),
      }
    },
  }
}

// ── Protocole aveugle ─────────────────────────────────────────────────────────────────────────

test('l’affectation A/B est déterministe et s’inverse entre les deux passes', () => {
  const p1 = assignerAveugle('cest bomme', 'cest homme', 1)
  const p2 = assignerAveugle('cest bomme', 'cest homme', 2)
  assert.equal(p1.candidatEnA, !p2.candidatEnA, 'les deux passes doivent présenter l’ordre inverse')
  // Déterministe : deux appels identiques donnent le même résultat (le cache reste utile).
  assert.deepEqual(assignerAveugle('cest bomme', 'cest homme', 1), p1)
  // Les deux lectures sont toujours présentes, quel que soit l'ordre.
  assert.deepEqual([p1.a, p1.b].sort(), ['cest bomme', 'cest homme'].sort())
})

test('la réponse aveugle est retraduite en verdict selon la place réelle du candidat', () => {
  assert.equal(verdictDepuisReponse({ lecture: 'A' }, { candidatEnA: true }).verdict, 'CANDIDATE')
  assert.equal(verdictDepuisReponse({ lecture: 'A' }, { candidatEnA: false }).verdict, 'OCR0')
  assert.equal(verdictDepuisReponse({ lecture: 'B' }, { candidatEnA: true }).verdict, 'OCR0')
  assert.equal(verdictDepuisReponse({ lecture: 'AUTRE' }, { candidatEnA: true }).verdict, 'OTHER')
  assert.equal(verdictDepuisReponse({ lecture: 'n’importe' }, { candidatEnA: true }).verdict, 'UNREADABLE')
  assert.equal(verdictDepuisReponse({ lecture: 'A', qualite: 'mauvaise' }, { candidatEnA: true }).crop_quality, 'BAD')
})

test('la consigne de page ne révèle jamais laquelle des deux lectures est le candidat', () => {
  const c = consigneVerificationPage([{ i: 0, a: 'cest bomme', b: 'cest homme' }])
  assert.ok(c.includes('cest bomme') && c.includes('cest homme'))
  // Les deux lectures voyagent sous des étiquettes neutres : la charge ne porte AUCUNE clé qui
  // dirait l'origine de l'une ou de l'autre.
  const liste = JSON.parse(c.match(/\[\{.*?\}\]/s)[0])
  assert.deepEqual(Object.keys(liste[0]).sort(), ['A', 'B', 'i'])
  // Et la neutralité est dite explicitement au modèle, pour couper court au biais de complaisance.
  assert.match(c, /On ne te dit pas laquelle vient de la machine/)
})

test('la consigne d’arbitrage structurel pose la question de la NATURE, pas des caractères', () => {
  const c = consigneArbitrageCrop({ a: 'corps', b: 'note_marginale', structurel: true })
  assert.match(c, /NATURE/)
  assert.match(c, /marge/)
  assert.ok(!c.includes('caractère par caractère'))
})

test('la lecture nue ne soumet aucune proposition', () => {
  const c = consigneLectureCrop({ zone: 'corps' })
  assert.match(c, /Recopie EXACTEMENT/)
  assert.ok(!c.includes('A = '))
})

// ── Passe 1 et passe 2 ────────────────────────────────────────────────────────────────────────

test('la passe 1 groupe toutes les corrections d’une page en UN appel', async () => {
  const f = fournisseurFactice((a, b) => (a === 'cest homme' || b === 'cest homme' ? (a === 'cest homme' ? 'A' : 'B') : 'A'))
  const lot = [iv(0, 'cest bomme', 'cest homme'), iv(1, 'Deut.23.', 'Deut.22.')]
  const chargePage = async (n, items) => ({ items })
  const v = await verifierParPage(lot, { fournisseur: f, consentement: true, chargePage })
  assert.equal(f.vus.length, 1, 'une seule requête pour les deux corrections de la page')
  assert.equal(v.get(lot[0]).verdict, 'CANDIDATE')
})

test('la passe 2 n’est lancée que pour les cas à risque', async () => {
  const f = fournisseurFactice(() => 'A')
  const cas = [{ iv: iv(1, 'Deut.23.', 'Deut.22.'), contexte: {} }]
  const chargeCrop = async (i, o) => ({ items: [{ i: 0, a: o.a, b: o.b }] })
  await arbitrerParCrop(cas, { fournisseur: f, consentement: true, chargeCrop })
  assert.equal(f.vus.length, 1)
})

// ── Triage complet ────────────────────────────────────────────────────────────────────────────

const chargePage = async (n, items) => ({ items })
const chargeCrop = async (i, o) => ({ items: [{ i: 0, a: o.a, b: o.b }] })

test('LOW_RISK tranché par la seule passe 1 : aucun arbitrage n’est payé', async () => {
  // Le modèle désigne toujours la lecture « cest homme », où qu'elle soit placée.
  const f = fournisseurFactice((a) => (a === 'cest homme' ? 'A' : 'B'))
  const lot = [iv(0, 'cest bomme', 'cest homme')]
  const r = await trierInterventions(projet, lot, { fournisseur: f, consentement: true, chargePage, chargeCrop })
  assert.equal(r.decisions[0].auto_decision, 'AUTO_ACCEPT')
  assert.equal(r.meta.appels_page, 1)
  assert.equal(r.meta.appels_crop, 0, 'un cas simple ne doit pas déclencher d’arbitrage')
  assert.equal(lot[0].statut, 'applique_candidate')
  assert.equal(lot[0].validation_humaine, false, 'une auto-acceptation n’est JAMAIS une validation humaine')
})

test('HIGH_RISK : les deux passes concordent → AUTO_ACCEPT, et l’arbitrage a bien eu lieu', async () => {
  const f = fournisseurFactice((a) => (a === 'Deut.22.' ? 'A' : 'B'))
  const lot = [iv(1, 'Deut.23.', 'Deut.22.')]
  const r = await trierInterventions(projet, lot, { fournisseur: f, consentement: true, chargePage, chargeCrop })
  assert.equal(r.meta.appels_crop, 1)
  assert.equal(r.decisions[0].auto_decision, 'AUTO_ACCEPT')
  assert.equal(r.decisions[0].verdicts.length, 2)
})

test('HIGH_RISK : les deux passes désignent la machine → retour automatique à ocr0', async () => {
  const f = fournisseurFactice((a) => (a === 'Deut.23.' ? 'A' : 'B'))
  const lot = [iv(1, 'Deut.23.', 'Deut.22.')]
  const r = await trierInterventions(projet, lot, { fournisseur: f, consentement: true, chargePage, chargeCrop })
  assert.equal(r.decisions[0].auto_decision, 'AUTO_KEEP_OCR0')
  assert.equal(lot[0].statut, 'refuse')
})

test('sans fournisseur, rien n’est automatisé : tout part en revue humaine', async () => {
  const lot = [iv(0, 'cest bomme', 'cest homme')]
  const r = await trierInterventions(projet, lot, { fournisseur: null })
  assert.equal(r.decisions[0].auto_decision, 'HUMAN_REVIEW')
  assert.match(r.decisions[0].auto_decision_reason, /sans_verification/)
})

test('une intervention STRUCTURELLE passe par l’arbitrage et n’exige pas de lecture recopiée', async () => {
  const f = fournisseurFactice(() => 'A', { confiance: 0.99 })
  const lot = [{
    type: 'reclassement_role', page: 2, ligne_ids: [1], texte_original: 'Deut.23.',
    texte_candidat: '[note_marginale]', role_avant: 'corps', role_apres: 'note_marginale',
    confiance_modele: 0.9, statut: 'propose_ia',
  }]
  const r = await trierInterventions(projet, lot, { fournisseur: f, consentement: true, chargePage, chargeCrop })
  assert.equal(r.decisions[0].classe, 'STRUCTURAL')
  assert.equal(r.meta.appels_crop, 1)
  // Une seule décision concluante sur les deux requises (la passe 1 ne traite pas les structurels).
  assert.equal(r.decisions[0].auto_decision, 'HUMAN_REVIEW')
  assert.match(r.decisions[0].auto_decision_reason, /confirmation_manquante/)
})

// ── Lignes de faible confiance (§8) ───────────────────────────────────────────────────────────

// Les verdicts arrivent DÉJÀ traduits par `verdictDepuisReponse` (« AUTRE » → OTHER) : ce module
// travaille sur le vocabulaire du triage, jamais sur celui du prompt.
test('une ligne faible confirmée par l’image disparaît de la file', () => {
  const v = new Map([['2:2', { verdict: 'OTHER', exact_reading: 'aizrjklm', confidence: 0.98, crop_quality: 'GOOD' }]])
  const r = candidatsDepuisLignesFaibles(projet, v)
  assert.equal(r.confirmees.length, 1)
  assert.equal(r.nouveaux.length, 0)
  assert.equal(r.douteuses.length, 0)
})

test('une ligne faible relue différemment engendre un candidat qui repasse au triage', () => {
  const v = new Map([['2:2', { verdict: 'OTHER', exact_reading: 'ainsi qu’il', confidence: 0.99, crop_quality: 'GOOD' }]])
  const r = candidatsDepuisLignesFaibles(projet, v)
  assert.equal(r.nouveaux.length, 1)
  assert.equal(r.nouveaux[0].texte_original, 'aizrjklm')
  assert.equal(r.nouveaux[0].texte_candidat, 'ainsi qu’il')
  assert.equal(r.nouveaux[0].regle, 'ligne_faible_verifiee')
})

test('une ligne faible que l’image ne tranche pas reste à l’humain', () => {
  const v = new Map([['2:2', { verdict: 'ILLISIBLE', exact_reading: '', confidence: 0.3, crop_quality: 'BAD' }]])
  const r = candidatsDepuisLignesFaibles(projet, v)
  assert.equal(r.douteuses.length, 1)
  assert.equal(r.douteuses[0].motif, 'image_ambigue')
})

test('les signalements « confiance faible » des lignes confirmées sont retirés', () => {
  const findings = [
    { regle: 'confiance_faible', page: 2, ligne_ids: [2] },
    { regle: 'confiance_faible', page: 2, ligne_ids: [0] },
    { regle: 'doublon', page: 2, ligne_ids: [2] },
  ]
  const restants = retirerFlagsConfirmes(findings, [{ page: 2, ligne: 2 }])
  assert.equal(restants.length, 2)
  assert.ok(!restants.some((f) => f.regle === 'confiance_faible' && f.ligne_ids[0] === 2))
  assert.ok(restants.some((f) => f.regle === 'doublon'), 'les autres signalements ne sont pas touchés')
})
