import { describe, expect, it } from 'vitest'
import {
  estAttestationPubliable, libelleDuLien, libelleDegre, libelleStatut,
  noticeDeSource, nomsAttestes,
  type LienDAttestation, type SourcePericope,
} from './provenanceNoms'

// Les cas ci-dessous sont RÉELS, relevés en base le 6 septembre 2026 : les deux noms des
// Noces de Cana et leurs six liens, dont trois vers une source interne.
const ROBERTSON: SourcePericope = {
  code: 'ROBERTSON_1922_HARMONY',
  auteur: 'A. T. Robertson ; John A. Broadus',
  titre: 'A Harmony of the Gospels for Students of the Life of Christ',
  annee: 1922, editeur: 'Harper & Brothers',
  url: 'https://www.gutenberg.org/ebooks/36264', estExterne: true,
}
const AELF: SourcePericope = {
  code: 'AELF_BIBLE', auteur: 'Association épiscopale liturgique pour les pays francophones',
  titre: 'La Bible — traduction liturgique officielle',
  annee: null, editeur: 'AELF', url: 'https://www.aelf.org/bible', estExterne: true,
}
const REVISION_IA: SourcePericope = {
  code: 'CS_REVISION_IA_20260803', auteur: 'Corpus Scriptura — assistance GPT-5.6 Thinking',
  titre: 'Audit, enrichissement et rédaction des péricopes du 3 août 2026',
  annee: 2026, editeur: 'Corpus Scriptura', url: null, estExterne: false,
}
const TEXTE_CANONIQUE: SourcePericope = {
  code: 'CS_TEXTE_CANONIQUE', auteur: 'Corpus Scriptura',
  titre: 'Ossature canonique et textes bibliques de Corpus Scriptura',
  annee: 2026, editeur: 'Corpus Scriptura', url: null, estExterne: false,
}

function lien(nomId: number, statut: string, degre: string, source: SourcePericope): LienDAttestation {
  return { nomId, statut, degre, referenceInterne: '§ 29', note: 'Rubrique explicite.', source }
}

const NOMS = [
  { id: 44, nom: 'Noces de Cana', estPrincipal: true, ordre: 0 },
  { id: 315, nom: 'Premier signe', estPrincipal: false, ordre: 1 },
]
const LIENS: LienDAttestation[] = [
  lien(44, 'provenance', 'direct', REVISION_IA),
  lien(44, 'appui', 'contextuel', TEXTE_CANONIQUE),
  lien(44, 'temoin', 'direct', ROBERTSON),
  lien(315, 'provenance', 'direct', REVISION_IA),
  lien(315, 'appui', 'contextuel', TEXTE_CANONIQUE),
  lien(315, 'temoin', 'direct', AELF),
]

describe('attestation des noms de péricope', () => {
  it('⛔ une source INTERNE ne se publie pas : c’est une trace d’atelier', () => {
    expect(estAttestationPubliable(lien(44, 'provenance', 'direct', REVISION_IA))).toBe(false)
    expect(estAttestationPubliable(lien(44, 'appui', 'contextuel', TEXTE_CANONIQUE))).toBe(false)
    expect(estAttestationPubliable(lien(44, 'temoin', 'direct', ROBERTSON))).toBe(true)
  })

  it('⛔ un statut hors du vocabulaire ne se compose pas, et son lien s’écarte', () => {
    expect(libelleStatut('inconnu')).toBeNull()
    expect(libelleStatut(null)).toBeNull()
    expect(estAttestationPubliable(lien(44, 'inconnu', 'direct', ROBERTSON))).toBe(false)
  })

  it('le degré dit le CHEMIN de la preuve, sans bégayer sur le statut', () => {
    expect(libelleDuLien(lien(44, 'temoin', 'direct', ROBERTSON))).toBe('Témoin · attestation directe')
    expect(libelleDuLien(lien(44, 'temoin', 'partiel', ROBERTSON))).toBe('Témoin · attestation partielle')
    expect(libelleDuLien(lien(44, 'appui', 'contextuel', ROBERTSON))).toBe('Appui · par le contexte')
    expect(libelleDegre('inconnu')).toBeNull()
    // Un degré absent ne retire pas le statut : c'est lui que le lien affirme.
    expect(libelleDuLien({ ...lien(44, 'temoin', 'direct', ROBERTSON), degre: null })).toBe('Témoin')
  })

  it('rend le nom PRINCIPAL d’abord, puis les appellations dans leur ordre', () => {
    const rendus = nomsAttestes(NOMS, LIENS)
    expect(rendus.map(n => n.nom)).toEqual(['Noces de Cana', 'Premier signe'])
    expect(rendus[0].estPrincipal).toBe(true)
  })

  it('⛔ ne garde de chaque nom que ses liens PUBLIABLES', () => {
    const rendus = nomsAttestes(NOMS, LIENS)
    expect(rendus[0].liens).toHaveLength(1)
    expect(rendus[0].liens[0].source.code).toBe('ROBERTSON_1922_HARMONY')
    expect(rendus[1].liens[0].source.code).toBe('AELF_BIBLE')
  })

  it('⛔ un nom sans aucun lien publiable ne PARAÎT PAS', () => {
    const seulementInterne = LIENS.filter(l => !l.source.estExterne)
    expect(nomsAttestes(NOMS, seulementInterne)).toEqual([])
  })

  it('range les liens d’un nom : ce qui établit, puis ce qui entoure', () => {
    const noms = [{ id: 1, nom: 'X', estPrincipal: true, ordre: 0 }]
    const liens = [
      lien(1, 'appui', 'contextuel', ROBERTSON),
      lien(1, 'temoin', 'partiel', AELF),
      lien(1, 'temoin', 'direct', ROBERTSON),
    ]
    expect(nomsAttestes(noms, liens)[0].liens.map(libelleDuLien)).toEqual([
      'Témoin · attestation directe',
      'Témoin · attestation partielle',
      'Appui · par le contexte',
    ])
  })

  it('la source entre dans le vocabulaire du moteur, et n’invente pas de lieu', () => {
    const n = noticeDeSource(ROBERTSON)
    expect(n.titre).toBe('A Harmony of the Gospels for Students of the Life of Christ')
    expect(n.auteursTexte).toBe('A. T. Robertson ; John A. Broadus')
    expect(n.annee).toBe(1922)
    expect(n.editeurs).toEqual([{ rang: 1, role: 'editeur', nom: 'Harper & Brothers' }])
    expect(n.lieu).toBeNull()
    // Une source sans éditeur ni année ne pose pas de mention vide.
    const sansEditeur = noticeDeSource({ ...AELF, editeur: null })
    expect(sansEditeur.editeurs).toEqual([])
    expect(sansEditeur.annee).toBeNull()
  })
})
