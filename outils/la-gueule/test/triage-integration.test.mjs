// Intégration du triage sur le document de test de la consigne (§12, §16.12) :
// « Discours panegyrique sur la Nativité », 35 pages, 1006 lignes, 152 différences IA/machine.
//
// On rejoue les 152 corrections réellement produites sur ce document, en simulant un vérificateur
// visuel : le but n'est pas de mesurer le modèle (impossible sans image), mais de vérifier que la
// MÉCANIQUE de triage ramène la file humaine à quelques cas quand l'image est lisible, et qu'elle
// la remplit quand elle ne l'est pas.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { classerIntervention, deciderTriage, mesurerTriage } from '../src/ia/triage.mjs'

const ICI = dirname(fileURLToPath(import.meta.url))
const CHEMIN = join(ICI, '..', 'projets', 'Discours_panegyrique_sur_la_Nativit__de.json')

/** Les 152 corrections du document, reconstituées depuis ocr0 → dip. */
function corrigees(projet) {
  const out = []
  for (const [n, pg] of Object.entries(projet.pages || {})) {
    if (!Array.isArray(pg.lignes)) continue
    pg.lignes.forEach((l, i) => {
      const a = String(l.ocr0 ?? ''), b = String(l.dip ?? '')
      if (!a || a === b) return
      const s = l.suggestion || {}
      out.push({
        type: 'correction_ocr', page: Number(n), ligne_ids: [i], texte_original: a, texte_candidat: b,
        confiance_modele: 0.99, role: s.role_confirme || s.role_suggere || null,
      })
    })
  }
  return out
}

const net = (lecture) => ({ verdict: 'CANDIDATE', exact_reading: lecture, confidence: 0.99, crop_quality: 'GOOD', visual_evidence: 'net' })
const flou = () => ({ verdict: 'UNREADABLE', exact_reading: '', confidence: 0.3, crop_quality: 'BAD' })

test('le document de test est présent et porte bien ses 152 différences', { skip: !existsSync(CHEMIN) }, () => {
  const p = JSON.parse(readFileSync(CHEMIN, 'utf8'))
  const c = corrigees(p)
  assert.equal(c.length, 152, 'le lot de référence de la consigne')
})

test('image lisible : la quasi-totalité des 152 cas se résout sans l’humain', { skip: !existsSync(CHEMIN) }, () => {
  const p = JSON.parse(readFileSync(CHEMIN, 'utf8'))
  const decisions = corrigees(p).map((iv) => {
    const cls = classerIntervention(iv, { role: iv.role })
    // Un vérificateur qui LIT correctement : il désigne le candidat et le recopie. Deux passes pour
    // les cas à risque, une seule pour les cas simples — exactement ce que fait le pipeline réel.
    const verdicts = cls.classe === 'LOW_RISK'
      ? [net(iv.texte_candidat)]
      : [net(iv.texte_candidat), net(iv.texte_candidat)]
    return deciderTriage(iv, verdicts, { classement: cls })
  })
  const m = mesurerTriage(decisions)
  assert.equal(m.total_candidats, 152)
  // Le KPI de la consigne : la file humaine doit être résiduelle quand les images sont lisibles.
  assert.ok(m.human_review <= 10, `file humaine = ${m.human_review}, attendu ≤ 10`)
  assert.ok(m.automation_resolution_rate >= 0.93, `résolution auto = ${m.automation_resolution_rate}`)
  // Et le dénominateur n'a pas été rogné en route.
  assert.equal(m.auto_accept + m.auto_keep_ocr0 + m.human_review, 152)
})

test('image illisible : rien n’est auto-accepté, tout revient à l’humain', { skip: !existsSync(CHEMIN) }, () => {
  const p = JSON.parse(readFileSync(CHEMIN, 'utf8'))
  const decisions = corrigees(p).map((iv) => deciderTriage(iv, [flou(), flou()]))
  const m = mesurerTriage(decisions)
  assert.equal(m.auto_accept, 0)
  assert.equal(m.human_review, 152, 'aucune automatisation sans preuve visuelle')
})

test('l’image qui contredit la proposition ramène à ocr0, sans déranger personne', { skip: !existsSync(CHEMIN) }, () => {
  const p = JSON.parse(readFileSync(CHEMIN, 'utf8'))
  const decisions = corrigees(p).map((iv) => {
    const cls = classerIntervention(iv, { role: iv.role })
    const v = { verdict: 'OCR0', exact_reading: iv.texte_original, confidence: 0.99, crop_quality: 'GOOD' }
    return deciderTriage(iv, cls.classe === 'LOW_RISK' ? [v] : [v, v], { classement: cls })
  })
  const m = mesurerTriage(decisions)
  assert.ok(m.auto_keep_ocr0 >= 140, `ocr0 conservé = ${m.auto_keep_ocr0}`)
  assert.ok(m.human_review <= 10)
})

test('vérificateur réaliste : la file reste courte, et chaque cas retenu porte sa raison', { skip: !existsSync(CHEMIN) }, () => {
  const p = JSON.parse(readFileSync(CHEMIN, 'utf8'))
  const ivs = corrigees(p)
  // Un vérificateur faillible mais DÉTERMINISTE : une image sur onze est mauvaise, une sur treize
  // donne raison à la machine, une sur dix-sept livre une troisième lecture. Rien d'aléatoire :
  // le test doit dire la même chose à chaque exécution.
  const decisions = ivs.map((iv, k) => {
    const cls = classerIntervention(iv, { role: iv.role })
    const faire = (passe) => {
      if ((k + passe) % 11 === 0) return flou()
      if ((k + passe) % 13 === 0) return { verdict: 'OCR0', exact_reading: iv.texte_original, confidence: 0.99, crop_quality: 'GOOD' }
      if ((k + passe) % 17 === 0) return { verdict: 'OTHER', exact_reading: 'lecture tierce', confidence: 0.9, crop_quality: 'MEDIUM' }
      return net(iv.texte_candidat)
    }
    const verdicts = cls.classe === 'LOW_RISK' ? [faire(0)] : [faire(0), faire(1)]
    return deciderTriage(iv, verdicts, { classement: cls })
  })
  const m = mesurerTriage(decisions)
  assert.equal(m.total_candidats, 152)
  // Même avec un vérificateur qui trébuche, on est très loin des 152 relectures de départ.
  assert.ok(m.human_review < 60, `file humaine = ${m.human_review}`)
  assert.ok(m.auto_accept > 80, `auto-acceptées = ${m.auto_accept}`)
  for (const d of decisions.filter((x) => x.auto_decision === 'HUMAN_REVIEW')) {
    assert.ok(d.auto_decision_reason, 'toute mise en file doit dire pourquoi')
    assert.ok(d.review_priority > 0, 'et porter une difficulté, pour être ordonnée')
  }
})

test('INVARIANT : jamais d’auto-décision à risque sans deux vérifications concordantes', { skip: !existsSync(CHEMIN) }, () => {
  const p = JSON.parse(readFileSync(CHEMIN, 'utf8'))
  for (const iv of corrigees(p)) {
    const cls = classerIntervention(iv, { role: iv.role })
    if (cls.classe === 'LOW_RISK') continue
    // Une seule vérification, si nette soit-elle, ne peut pas suffire sur un cas à risque.
    const d = deciderTriage(iv, [net(iv.texte_candidat)], { classement: cls })
    assert.equal(d.auto_decision, 'HUMAN_REVIEW', `p${iv.page} L${iv.ligne_ids[0]} : ${cls.flags.join(', ')}`)
  }
})

test('les cas nommés par la consigne sont bien répartis entre les deux régimes (§12)', () => {
  // Groupe 1 : fautes de lettres — une seule vérification suffit.
  const simples = [
    ['Par FEn. MOREL Interprete', 'Par FED. MOREL Interprete'],
    ['Gregotre de Nazianze', 'Gregoire de Nazianze'],
    ['Chez FED. MOREI', 'Chez FED. MOREL'],
    ['cest bomme', 'cest homme'],
    ['sans artisice', 'sans artifice'],
    ['Pasteut.', 'Pasteur.'],
    ['Anpes.', 'Anges.'],
  ]
  for (const [a, b] of simples) {
    const iv = { type: 'correction_ocr', texte_original: a, texte_candidat: b, confiance_modele: 0.99 }
    assert.equal(deciderTriage(iv, [net(b)]).auto_decision, 'AUTO_ACCEPT', `${a} → ${b}`)
  }
  // Groupe 2 : chiffres, renvois, ponctuation — deux vérifications concordantes exigées.
  const risques = [['10', '15'], ['Deut.23.', 'Deut.22.'], ['nité, pronches-tu', 'nité.Bronches-tu'], ['Luc. O.', 'Luc. 6.']]
  for (const [a, b] of risques) {
    const iv = { type: 'correction_ocr', texte_original: a, texte_candidat: b, confiance_modele: 0.99 }
    assert.equal(deciderTriage(iv, [net(b)]).auto_decision, 'HUMAN_REVIEW', `${a} → ${b} : une seule vérification`)
    assert.equal(deciderTriage(iv, [net(b), net(b)]).auto_decision, 'AUTO_ACCEPT', `${a} → ${b} : deux vérifications`)
  }
})
