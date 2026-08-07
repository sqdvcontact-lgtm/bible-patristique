import { describe, it, expect } from 'vitest'
import { statutUsagePourScore, messageErreurQualification } from './qualification'

// Ces tests couvrent la logique de CODE du chantier « qualification scientifique ».
// Les cas dépendant du calcul de la base (ouvrage exclu absent de la bibliographie,
// recalcul en cascade, refus de valider un lien inadmissible…) sont des tests
// d'intégration à mener contre Supabase, non des tests unitaires.

describe('statutUsagePourScore — correspondance imposée par la base', () => {
  it('associe chaque score de rang au bon statut d’usage', () => {
    expect(statutUsagePourScore(1)).toBe('reference')
    expect(statutUsagePourScore(2)).toBe('solide')
    expect(statutUsagePourScore(3)).toBe('secondaire')
    expect(statutUsagePourScore(4)).toBe('secondaire')
    expect(statutUsagePourScore(5)).toBe('exclu')
  })
  it('traite l’absence de score comme « à vérifier »', () => {
    expect(statutUsagePourScore(null)).toBe('a_verifier')
    expect(statutUsagePourScore(undefined)).toBe('a_verifier')
  })
})

describe('messageErreurQualification — refus de la base rendus lisibles (§10)', () => {
  it('explique un refus RLS sans exposer le détail technique', () => {
    const m = messageErreurQualification('new row violates row-level security policy for table "ouvrages_bibliographiques"')
    expect(m).toMatch(/autorise pas|RLS/i)
  })
  it('signale l’obligation de motif', () => {
    const m = messageErreurQualification('violates check constraint "auteurs_valeur_reserve_motif_chk"')
    expect(m).toMatch(/motif/i)
  })
  it('signale la discordance score / statut d’usage', () => {
    const m = messageErreurQualification('violates check constraint "auteurs_valeur_score_statut_chk"')
    expect(m).toMatch(/statut|score/i)
  })
  it('explique le refus de validation d’un ouvrage non admis (contrainte)', () => {
    const m = messageErreurQualification('new row for relation "ouvrages_bibliographiques" violates check constraint requiring statut_scientifique retenu/secondaire when statut_editorial valide')
    expect(m).toMatch(/valeur scientifique|retenu|secondaire/i)
  })
  it('explique le refus du trigger de contrôle d’usage (message accentué réel)', () => {
    // Message effectivement levé par internal.trg_controler_usage_lien_bibliographique.
    const m = messageErreurQualification('L’ouvrage 162 ne peut être validé ni déclaré utilisé : statut scientifique a_verifier, statut éditorial a_revoir, usage dans les notices documentation_interne.')
    expect(m).toMatch(/valeur scientifique|déclaré utilisé/i)
    expect(m).not.toMatch(/Enregistrement refusé par la base/)
  })
  it('retombe sur un message générique lisible sinon', () => {
    const m = messageErreurQualification('connexion perdue')
    expect(m).toContain('connexion perdue')
  })
})
