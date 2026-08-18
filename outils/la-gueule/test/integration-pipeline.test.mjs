// Phase 8 — test d'INTÉGRATION du pipeline (sans CLI ni réseau) : contrôle IA (faux fournisseur) →
// classement → application des corrections/reclassements → EXPORT du corps. Vérifie que le livrable
// reflète l'état candidat corrigé, que la source (ocr0) reste intacte, et qu'un ornement est écarté du
// corps sans quitter la source. Aucun accès base : rien n'écrit dans une table active.

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { controlerPageIA } from '../src/ia/controle.mjs'
import { classerValidation } from '../src/ia/validation.mjs'
import { appliquerDansProjet, appliquerReclassement } from '../src/corrections.mjs'
import { construireSegments } from '../src/projet.mjs'

test('intégration : relecture → corrections + reclassement appliqués → export corrigé, source intacte', async () => {
  const projet = { pages: { 7: { largeur: 1000, lignes: [
    { ocr0: 'bommes capables d’honorer', dip: 'bommes capables d’honorer', bbox: [10, 10, 400, 30] },
    { ocr0: 'non-seulemeni l’Église', dip: 'non-seulemeni l’Église', bbox: [10, 50, 400, 70] },
    { ocr0: 'SARA AE ASIA SARA VAE', dip: 'SARA AE ASIA SARA VAE', bbox: [10, 90, 400, 110], suggestion: { role_suggere: 'corps', role_confirme: null } },
  ] } } }

  // Faux fournisseur : renvoie 2 corrections de texte + 1 classification d'ornement (ligne 2).
  const fournisseur = { page: async () => ({
    type: 'relecture_page', statut: 'candidat', abstention: false, modele: 'sonnet-faux', fournisseur: 'faux',
    corrections: [
      { i: 0, texte_ocr: 'bommes capables d’honorer', texte_corrige: 'hommes capables d’honorer', motif: 'b→h' },
      { i: 1, texte_ocr: 'non-seulemeni l’Église', texte_corrige: 'non-seulement l’Église', motif: 'i→t' },
    ],
    classifications: [{ i: 2, role: 'ornement', motif: 'filet gravé lu en charabia' }],
  }) }
  const preparerCharge = async (n, lignes) => ({ n, lignes })

  // 1) Contrôle IA par page (chaîne réelle) → interventions candidates.
  const { interventions } = await controlerPageIA(projet, { fournisseur, consentement: true, preparerCharge })
  assert.equal(interventions.length, 3) // 2 corrections + 1 reclassement

  // 2) Classement : corrections simples auto-appliquées, seul le reclassement demande une décision.
  const v = classerValidation(interventions)
  assert.equal(v.auto_texte.length, 2)   // « bommes→hommes » et « seulemeni→seulement » : 1 caractère chacun
  assert.equal(v.corrections.length, 1)  // le reclassement (structurel) reste à décider
  assert.equal(v.familles.length, 0)

  // 3) Application dans la couche candidate (chaîne réelle) : auto + décision humaine.
  for (const f of [...v.auto_texte, ...v.corrections]) {
    if (f.type === 'reclassement_role') appliquerReclassement(projet.pages[f.page].lignes[f.ligne_ids[0]], { role_avant: f.role_avant, role_apres: f.role_apres, origine: 'ia', regle: f.regle })
    else appliquerDansProjet(projet, f.page, f.ligne_ids[0], { avant: f.texte_original, apres: f.texte_candidat, origine: 'ia', regle: f.regle })
  }

  // 4) EXPORT du corps (fonction réelle) : reflète l'état candidat, exclut l'ornement.
  const corps = construireSegments(projet).map((s) => s.segment_texte || '').join(' ')
  assert.match(corps, /hommes capables/)          // correction appliquée
  assert.match(corps, /non-seulement/)            // correction appliquée
  assert.doesNotMatch(corps, /bommes/)            // l'erreur n'est plus dans le livrable
  assert.doesNotMatch(corps, /seulemeni/)
  assert.doesNotMatch(corps, /SARA AE ASIA/)      // ornement écarté du corps

  // 5) SOURCE intacte : ocr0 conservé, ornement toujours présent en source (juste hors-corps).
  assert.equal(projet.pages[7].lignes[0].ocr0, 'bommes capables d’honorer')
  assert.equal(projet.pages[7].lignes[2].dip, 'SARA AE ASIA SARA VAE')          // texte non supprimé
  assert.equal(projet.pages[7].lignes[2].suggestion.role_confirme, 'ornement')  // reclassé (candidat)
})
