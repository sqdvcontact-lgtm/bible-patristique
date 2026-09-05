import { describe, expect, it } from 'vitest'
import {
  choisirPaireDeLecture,
  estVersionEnLangueOriginale,
  ensemblesUtilisables,
  memeLangue,
  modeDeLectureEffectif,
  type EnsembleLisible,
  type VersionLisible,
} from './paireDeLecture'
import { chargerProjectionBilingue, type ClientLecture } from './bilingueAlignement'

/**
 * LA PAIRE DE LECTURE — l'épreuve du choix de version.
 *
 * ⛔ CE QUE CES TESTS GARDENT, et qui a cédé le 2026-09-05 : le choix d'une traduction
 * ne doit RIEN devoir à l'ordre d'arrivée des lignes. La page les demandait triées au
 * millésime seul ; deux éditions de 1866 s'y rangeaient donc au hasard, et « la première
 * traduction venue » désignait une fois sur deux l'instantané de travail retiré du
 * service — celui que la politique de lecture d'`oeuvre_textes` montre à
 * l'administrateur et à lui seul.
 *
 * ⚠️ AUCUNE ŒUVRE N'EST CODÉE EN DUR. Le cas relevé (les Annotations sur le livre de
 * Job) sert de DÉCOR : ses identifiants nomment les fixtures pour qu'on reconnaisse la
 * scène, mais rien dans le module ne les connaît, et chaque cas se rejoue par
 * permutation du tableau d'entrée. Un `annee_edition` n'est même pas un champ de
 * `VersionLisible` : il ne peut plus rien décider.
 */

// ── Le décor : les Annotations sur le livre de Job, telles qu'elles étaient ──
const ARCHIVE_FR = 'TXT_A0010O0100_FR_1866_JOYEUX_PRE_RESEG_20260903'
const FR = 'TXT_A0010O0100_LEGACY'
const LA = 'TXT_A0010O0100_LA_1895_ZYCHA'
const ENSEMBLE = 'A0010O0100:JOYEUX1866-ZYCHA1895:FR-LA:PARAGRAPH'

function traduction(idTexte: string, extra: Partial<VersionLisible> = {}): VersionLisible {
  return {
    idTexte,
    langue: 'Français',
    traducteur: 'Abbé Joyeux',
    isDefault: false,
    isPublic: true,
    statut: 'published',
    ...extra,
  }
}

function original(idTexte: string, extra: Partial<VersionLisible> = {}): VersionLisible {
  return {
    idTexte,
    langue: 'Latin',
    traducteur: null,
    isDefault: false,
    isPublic: true,
    statut: 'published',
    ...extra,
  }
}

function ensemble(
  alignmentSetId: string,
  referenceTextId: string,
  alignedTextId: string,
  extra: Partial<EnsembleLisible> = {},
): EnsembleLisible {
  return { alignmentSetId, referenceTextId, alignedTextId, alignmentLevel: 'paragraph', status: 'reviewed_ai', ...extra }
}

/** Toutes les permutations d'un tableau : c'est l'ORDRE qui décidait, il ne décide plus. */
function permutations<T>(items: readonly T[]): T[][] {
  if (items.length <= 1) return [[...items]]
  return items.flatMap((item, i) =>
    permutations([...items.slice(0, i), ...items.slice(i + 1)]).map(reste => [item, ...reste]))
}

/** Le décor complet : l'archive retirée, la traduction courante, le latin, l'alignement
 *  qui ne relie QUE la traduction courante au latin. */
const VERSIONS_JOB: VersionLisible[] = [
  traduction(ARCHIVE_FR, { isPublic: false, isDefault: false, statut: 'retired' }),
  traduction(FR, { isDefault: true, isPublic: true, statut: 'published' }),
  original(LA),
]
const ALIGNEMENTS_JOB: EnsembleLisible[] = [ensemble(ENSEMBLE, FR, LA)]

function paireJob(idTexteActif: string, versions: readonly VersionLisible[] = VERSIONS_JOB) {
  return choisirPaireDeLecture({
    idTexteActif,
    versions,
    alignements: ALIGNEMENTS_JOB,
    langueOriginale: 'Latin',
  })
}

describe('la traduction visée par le bilingue', () => {
  it('est la traduction publiée et par défaut, jamais l’archive retirée', () => {
    const paire = paireJob(FR)
    expect(paire.traductionBilingue?.idTexte).toBe(FR)
    expect(paire.idTexteEnRegard).toBe(LA)
    expect(paire.ensembleBilingue?.alignmentSetId).toBe(ENSEMBLE)
  })

  it('ne dépend d’AUCUN ordre du tableau — archive en tête, au milieu ou en queue', () => {
    // ⛔ Le cœur de la régression : `order('annee_edition')` laissait deux versions de
    // 1866 dans un ordre que Postgres ne promet pas, et `find` prenait la première.
    for (const ordre of permutations(VERSIONS_JOB)) {
      const paire = paireJob(FR, ordre)
      expect(paire.traductionBilingue?.idTexte).toBe(FR)
      expect(paire.traductionFr?.idTexte).toBe(FR)
      expect(paire.original?.idTexte).toBe(LA)
    }
  })

  it('reste sur l’édition qu’on lit quand elle porte l’alignement', () => {
    const paire = paireJob(FR)
    expect(paire.enRegardSurPlace).toBe(true)
    expect(paire.navigationBilingue).toBeNull()
    expect(paire.enRegardParRepli).toBe(false)
  })

  it('quitte l’archive non alignée pour la traduction alignée', () => {
    // Une session administrateur ouvre l'instantané par son adresse : « Français » l'y
    // laisse — on ne change pas d'édition pour rien —, mais le bilingue vise l'édition
    // que l'alignement relie au latin, et le mode ne s'allume pas sur place.
    const paire = paireJob(ARCHIVE_FR)
    expect(paire.traductionFr?.idTexte).toBe(ARCHIVE_FR)
    expect(paire.traductionBilingue?.idTexte).toBe(FR)
    expect(paire.navigationBilingue).toBe(FR)
    expect(paire.enRegardSurPlace).toBe(false)
    expect(paire.ensembleBilingue).toBeNull()
  })

  it('ne laisse jamais « bilingue actif » sur une traduction sans colonne en regard', () => {
    // Le lien direct « ?texte=<archive>&mt=bilingue », tel qu'il était composé par le
    // bouton lui-même. Rien ne peut se mettre en regard ici : le mode retombe au
    // français seul, et la navigation vers l'édition alignée est proposée à part.
    const paire = paireJob(ARCHIVE_FR)
    expect(modeDeLectureEffectif('bilingue', paire)).toBe('fr')
    expect(modeDeLectureEffectif('la', paire)).toBe('fr')
    expect(paire.navigationBilingue).toBe(FR)
  })
})

describe('deux traductions, toutes deux alignées', () => {
  // Le décor de la Consolation de la philosophie : deux français publiés sur un même
  // latin, plus un alignement FRANÇAIS-FRANÇAIS qui n'a rien à faire dans une colonne
  // de latin.
  const CERIZIERS = 'TXT_A0064O0001_FR_1646_CERIZIERS'
  const MIRANDOL = 'TXT_A0064O0001_FR_1861_MIRANDOL'
  const LATIN = 'A0064O0001T0001'
  const versions = [
    traduction(CERIZIERS, { traducteur: 'René de Ceriziers' }),
    original(LATIN),
    traduction(MIRANDOL, { traducteur: 'Louis Judicis de Mirandol', isDefault: true }),
  ]
  const alignements = [
    ensemble('CER-MIG', CERIZIERS, LATIN, { alignmentLevel: 'segment', nbGroupes: 780 }),
    ensemble('MIR-CER', MIRANDOL, CERIZIERS, { alignmentLevel: 'segment', nbGroupes: 784 }),
    ensemble('MIR-MIG', MIRANDOL, LATIN, { alignmentLevel: 'paragraph', nbGroupes: 1142 }),
  ]
  const paire = (idTexteActif: string, ordre = versions) => choisirPaireDeLecture({
    idTexteActif, versions: ordre, alignements, langueOriginale: 'Latin',
  })

  it('garde celle qu’on lit, quelle qu’elle soit', () => {
    expect(paire(MIRANDOL).traductionBilingue?.idTexte).toBe(MIRANDOL)
    expect(paire(MIRANDOL).ensembleBilingue?.alignmentSetId).toBe('MIR-MIG')
    expect(paire(CERIZIERS).traductionBilingue?.idTexte).toBe(CERIZIERS)
    expect(paire(CERIZIERS).ensembleBilingue?.alignmentSetId).toBe('CER-MIG')
  })

  it('retient le texte par défaut quand on lit le latin', () => {
    for (const ordre of permutations(versions)) {
      const depuisLeLatin = paire(LATIN, ordre)
      expect(depuisLeLatin.traductionBilingue?.idTexte).toBe(MIRANDOL)
      expect(depuisLeLatin.traductionFr?.idTexte).toBe(MIRANDOL)
      // On lit l'original : il n'y a rien à mettre EN REGARD de lui-même.
      expect(depuisLeLatin.idTexteEnRegard).toBeNull()
      expect(depuisLeLatin.navigationBilingue).toBe(MIRANDOL)
    }
  })

  it('ignore un alignement entre deux traductions', () => {
    expect(paire(MIRANDOL).ensembleBilingue?.alignmentSetId).not.toBe('MIR-CER')
  })
})

describe('quand rien ne peut se mettre en regard', () => {
  it('n’offre pas le bilingue : original présent, mais ni alignement ni repli', () => {
    const paire = choisirPaireDeLecture({
      idTexteActif: FR,
      versions: [traduction(FR, { isDefault: true }), original(LA)],
      alignements: [],
      langueOriginale: 'Latin',
      repliTexteOriginal: false,
    })
    expect(paire.bilingueOffert).toBe(false)
    expect(paire.traductionBilingue).toBeNull()
    expect(paire.enRegardSurPlace).toBe(false)
    expect(modeDeLectureEffectif('bilingue', paire)).toBe('fr')
    // ⚠️ Le mode « Latin seul » garde sa cible : le texte latin se lit pour lui-même,
    // à ses titres d'origine, alignement ou non.
    expect(paire.original?.idTexte).toBe(LA)
    expect(paire.idTexteEnRegard).toBe(LA)
  })

  it('ne trouve rien à offrir sur une œuvre sans original du tout', () => {
    const paire = choisirPaireDeLecture({
      idTexteActif: FR,
      versions: [traduction(FR, { isDefault: true })],
      alignements: [],
      langueOriginale: 'Latin',
    })
    expect(paire.original).toBeNull()
    expect(paire.idTexteEnRegard).toBeNull()
    expect(paire.bilingueOffert).toBe(false)
    expect(paire.traductionFr?.idTexte).toBe(FR)
  })
})

describe('le repli « segments.texte_original »', () => {
  // ⛔ Il ne disparaît pas avec cette correction : il sert encore les œuvres dont
  // l'original n'a pas de texte propre, et il tombera avec la colonne, pas avant.
  it('porte le bilingue quand l’original n’a pas de texte autonome', () => {
    const paire = choisirPaireDeLecture({
      idTexteActif: FR,
      versions: [traduction(FR, { isDefault: true })],
      alignements: [],
      langueOriginale: 'Latin',
      repliTexteOriginal: true,
    })
    expect(paire.bilingueOffert).toBe(true)
    expect(paire.enRegardSurPlace).toBe(true)
    expect(paire.enRegardParRepli).toBe(true)
    expect(paire.traductionBilingue?.idTexte).toBe(FR)
    expect(paire.navigationBilingue).toBeNull()
    expect(modeDeLectureEffectif('bilingue', paire)).toBe('bilingue')
    expect(modeDeLectureEffectif('la', paire)).toBe('la')
  })

  it('cède le pas à l’alignement quand les deux existent', () => {
    // Les Confessions portent les deux : le latin comme texte à part entière ET recopié
    // dans les 932 segments de la traduction. C'est le texte qui fait foi, jamais la
    // copie — même règle que dans `originalEnRegard`.
    const paire = choisirPaireDeLecture({
      idTexteActif: FR,
      versions: VERSIONS_JOB,
      alignements: ALIGNEMENTS_JOB,
      langueOriginale: 'Latin',
      repliTexteOriginal: true,
    })
    expect(paire.enRegardParRepli).toBe(false)
    expect(paire.ensembleBilingue?.alignmentSetId).toBe(ENSEMBLE)
  })
})

describe('les versions retirées', () => {
  // Le décor des Homélies sur l'Hexaéméron : TROIS textes grecs, dont un retiré (avec
  // son propre alignement retiré) et un brouillon sans le moindre segment.
  const FR_HEX = 'TXT_A0017O0001_LEGACY'
  const GREC_RETIRE = 'TXT_A0017O0001_GR_LEGACY_EMBEDDED'
  const GREC_SERVI = 'A0017O0001T0002'
  const GREC_BROUILLON = 'A0017O0001T0001'
  const versions: VersionLisible[] = [
    traduction(FR_HEX, { traducteur: 'Athanase Auger', isDefault: true }),
    { idTexte: GREC_SERVI, langue: 'Grec', traducteur: null, isDefault: false, isPublic: false, statut: 'review' },
    { idTexte: GREC_RETIRE, langue: 'Grec', traducteur: null, isDefault: false, isPublic: false, statut: 'retired' },
    { idTexte: GREC_BROUILLON, langue: 'Grec', traducteur: null, isDefault: false, isPublic: false, statut: 'draft' },
  ]
  const alignements: EnsembleLisible[] = [
    ensemble('GRLEGACY-AUGER', GREC_RETIRE, FR_HEX, { alignmentLevel: 'segment', status: 'retired', nbGroupes: 96 }),
    ensemble('PG29C-AUGER', GREC_SERVI, FR_HEX, { alignmentLevel: 'segment', status: 'reviewed_ai', nbGroupes: 302 }),
  ]

  it('n’en fait jamais une cible implicite, même vue par un administrateur', () => {
    // ⚠️ Une session ADMINISTRATRICE voit les quatre lignes ; une session publique n'en
    // voit qu'une. Le mode « Grec » et la colonne en regard doivent viser le même texte
    // dans les deux cas — celui qui est en service.
    for (const ordre of permutations(versions)) {
      const paire = choisirPaireDeLecture({
        idTexteActif: FR_HEX, versions: ordre, alignements, langueOriginale: 'Grec',
      })
      expect(paire.original?.idTexte).toBe(GREC_SERVI)
      expect(paire.idTexteEnRegard).toBe(GREC_SERVI)
      expect(paire.ensembleBilingue?.alignmentSetId).toBe('PG29C-AUGER')
    }
  })

  it('écarte aussi l’ENSEMBLE d’alignement retiré', () => {
    expect(ensemblesUtilisables(alignements).map(e => e.alignmentSetId)).toEqual(['PG29C-AUGER'])
  })

  it('reste consultable par son adresse, sans déporter le lecteur', () => {
    // Un administrateur qui ouvre nommément le texte retiré le lit : « Français » ne
    // l'expédie pas ailleurs. Ce qu'on interdit, c'est qu'un BOUTON l'y envoie.
    const paire = paireJob(ARCHIVE_FR)
    expect(paire.traductionFr?.idTexte).toBe(ARCHIVE_FR)
  })
})

describe('la session publique', () => {
  it('lit exactement la même paire que la session administratrice', () => {
    // ⛔ C'est l'invariant de la correction : ce que voit l'auteur en plus ne doit rien
    // changer à ce qu'il lit. La liste administrative et la sélection de lecture sont
    // deux choses — les versions privées restent listées côté édition.
    const vuePublique = VERSIONS_JOB.filter(v => v.isPublic)
    const administrateur = paireJob(FR, VERSIONS_JOB)
    const lecteur = paireJob(FR, vuePublique)
    expect(lecteur.traductionFr?.idTexte).toBe(administrateur.traductionFr?.idTexte)
    expect(lecteur.traductionBilingue?.idTexte).toBe(administrateur.traductionBilingue?.idTexte)
    expect(lecteur.original?.idTexte).toBe(administrateur.original?.idTexte)
    expect(lecteur.ensembleBilingue?.alignmentSetId).toBe(administrateur.ensembleBilingue?.alignmentSetId)
    expect(lecteur.enRegardSurPlace).toBe(administrateur.enRegardSurPlace)
  })
})

describe('latin et grec, à l’identique', () => {
  it('reconnaît la langue de l’œuvre sans s’arrêter à la casse ni aux accents', () => {
    expect(memeLangue('Grec', 'grec')).toBe(true)
    expect(memeLangue('Français', 'francais')).toBe(true)
    expect(memeLangue('Latin', 'Grec')).toBe(false)
    expect(memeLangue(null, 'Latin')).toBe(false)
    expect(memeLangue('', '')).toBe(false)
    expect(estVersionEnLangueOriginale({ traducteur: null, langue: 'grec' }, 'Grec')).toBe(true)
    // Une traduction EN grec resterait une traduction : c'est l'absence de traducteur
    // qui fait le texte original.
    expect(estVersionEnLangueOriginale({ traducteur: 'Auger', langue: 'Grec' }, 'Grec')).toBe(false)
  })

  it('vise le texte original quelle que soit la langue', () => {
    const grec = choisirPaireDeLecture({
      idTexteActif: 'FR_GREC',
      versions: [
        traduction('FR_GREC', { isDefault: true }),
        { idTexte: 'GR', langue: 'grec', traducteur: null, isDefault: false, isPublic: false, statut: 'review' },
      ],
      alignements: [ensemble('GR-FR', 'GR', 'FR_GREC')],
      langueOriginale: 'Grec',
    })
    const latin = paireJob(FR)
    expect(grec.original?.idTexte).toBe('GR')
    expect(grec.idTexteEnRegard).toBe('GR')
    expect(grec.enRegardSurPlace).toBe(true)
    expect(latin.original?.idTexte).toBe(LA)
    expect(latin.idTexteEnRegard).toBe(LA)
    expect(latin.enRegardSurPlace).toBe(true)
  })
})

describe('le départage de plusieurs ensembles sur la même paire', () => {
  it('délègue à `choisirEnsembleBilingue` : le plus FIN l’emporte', () => {
    // Le décor de la Doctrine des Apôtres : l'ensemble étiqueté `division` apparie les
    // sections une à une (100 groupes) quand celui étiqueté `paragraph` en réunit
    // jusqu'à cinq contre cinq (57). ⛔ La règle de finesse n'est pas recopiée ici.
    const GREC = 'A0012O0002T0001'
    const FRANCAIS = 'A0012O0002T0002'
    const paire = choisirPaireDeLecture({
      idTexteActif: FRANCAIS,
      versions: [
        { idTexte: GREC, langue: 'Grec', traducteur: null, isDefault: false, isPublic: false, statut: 'review' },
        traduction(FRANCAIS, { traducteur: 'Auguste Laurent ; Hippolyte Hemmer', isDefault: true }),
      ],
      alignements: [
        ensemble('PARAGRAPH', GREC, FRANCAIS, { alignmentLevel: 'paragraph', nbGroupes: 57 }),
        ensemble('SECTION', GREC, FRANCAIS, { alignmentLevel: 'division', nbGroupes: 100 }),
      ],
      langueOriginale: 'Grec',
    })
    expect(paire.ensembleBilingue?.alignmentSetId).toBe('SECTION')
  })
})

describe('ce que la projection bilingue reçoit', () => {
  /** Le strict nécessaire d'un client Supabase, qui note ce qu'on lui demande. */
  type Ligne = Record<string, string | number | null>
  function clientEspion(reponses: Record<string, Ligne[]>) {
    const appels: { table: string; filtres: Record<string, string>; colonne?: string }[] = []
    const from = (table: string) => {
      const filtres: Record<string, string> = {}
      const requete = {
        select: () => requete,
        eq: (colonne: string, valeur: string) => { filtres[colonne] = valeur; return requete },
        in: (colonne: string, valeurs: readonly string[]) => {
          appels.push({ table, filtres: { ...filtres }, colonne })
          const cle = `${table}|${filtres.id_texte ?? ''}`
          return Promise.resolve({
            data: (reponses[cle] ?? []).filter(ligne => valeurs.includes(String(ligne[colonne]))),
          })
        },
      }
      return requete
    }
    return { client: { from } as unknown as ClientLecture, appels }
  }

  it('ne voit QUE les deux textes de l’ensemble retenu', async () => {
    const paire = paireJob(FR)
    expect(paire.ensembleBilingue).not.toBeNull()
    const { client, appels } = clientEspion({
      [`texte_alignement_membres|${FR}`]: [
        { alignment_id: 'g1', role: 'aligned', member_order: 1, id_texte: FR, segment_key: 'fr-1' },
      ],
      [`texte_alignement_membres|${LA}`]: [
        { alignment_id: 'g1', role: 'reference', member_order: 1, id_texte: LA, segment_key: 'la-1' },
      ],
      [`segments|${LA}`]: [
        { segment_key: 'la-1', segment_texte: 'Beatus vir', nature: 'texte', join_before: null },
      ],
    })
    const projection = await chargerProjectionBilingue(client, {
      alignmentSetId: paire.ensembleBilingue!.alignmentSetId,
      idTexteTraduit: FR,
      idTexteOriginal: paire.idTexteEnRegard!,
      clesTraduites: ['fr-1'],
    })
    // ⛔ L'archive retirée n'est interrogée à aucun moment : c'est très exactement ce
    // qui manquait, et qui laissait la colonne de droite vide.
    const textesInterroges = [...new Set(appels.map(a => a.filtres.id_texte))]
    expect(textesInterroges.sort()).toEqual([FR, LA].sort())
    expect(appels.every(a => a.filtres.alignment_set_id === undefined || a.filtres.alignment_set_id === ENSEMBLE)).toBe(true)
    expect(projection.groupeParCle.get('fr-1')).toBe('g1')
    expect(projection.blocParGroupe.get('g1')?.texte).toBe('Beatus vir')
  })
})
