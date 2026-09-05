import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  estSegmentDeLApparat,
  estSegmentDuCorps,
  FILTRE_APPARAT_POSTGREST,
  FILTRE_ESPACE_CORPS_POSTGREST,
  limiterRequeteSegmentsALaSurface,
  NATURES_CORPS,
  NATURES_APPARAT,
  segmentsDeLaSurface,
  SELECT_SEGMENT,
  surfaceDuSegment,
} from './oeuvreSelects'
import { NATURE_VALIDES } from './naturesSegments'

/**
 * ⛔ LA GARDE DU VOCABULAIRE QUI PARAÎT.
 *
 * `NATURES_CORPS` est le seul endroit qui décide qu'une nature est CHARGÉE par la page
 * d'œuvre. Une nature que la base accepte et que cette liste ignore n'est pas mal
 * composée : elle n'existe pas pour le lecteur, en silence, et rien ne le signale.
 *
 * Le dépôt l'a payé DEUX fois. Le 18 août 2026, `apparat_auteur` retiré de la liste a
 * fait disparaître le « Prologue de Rufin aux livres X et XI ». Le 29 août 2026,
 * `lemme` — quarante-sept segments du *Commentaire sur Jonas* de Jérôme, œuvre
 * PUBLIÉE — n'y avait jamais figuré : le lecteur recevait le commentaire sans le
 * verset qu'il commente.
 *
 * D'où cette garde. Toute nature du vocabulaire doit être RANGÉE : au corps, à
 * l'apparat, ou parmi les formes éteintes. Ajouter une nature à `chk_segments_nature`
 * et à `NATURE_VALIDES` sans dire où elle se compose fait donc échouer les tests, ce
 * qui est le seul moment où l'on peut encore y penser.
 */

/** ⛔ Conservée pour la compatibilité des anciens exports ; ne plus en créer. */
const NATURES_ETEINTES = ['separateur'] as const

describe('le vocabulaire des natures est entièrement rangé', () => {
  it('chaque nature valide se compose quelque part, et une seule fois', () => {
    const rangees = [...NATURES_CORPS, ...NATURES_APPARAT, ...NATURES_ETEINTES]
    expect([...rangees].sort()).toEqual([...NATURE_VALIDES].sort())
    expect(new Set(rangees).size).toBe(rangees.length)
  })

  it('le corps porte le LEMME — le verset qu’un commentaire pose en tête', () => {
    // Quarante-sept segments de Jérôme sur Jonas, tous au rang 1 de leur paragraphe.
    expect(NATURES_CORPS).toContain('lemme')
  })

  it('le corps porte l’apparat de l’AUTEUR, jamais celui de l’éditeur', () => {
    expect(NATURES_CORPS).toContain('apparat_auteur')
    expect(NATURES_CORPS).not.toContain('apparat_critique')
    expect(NATURES_CORPS).not.toContain('apparat_editeur')
  })
})

/**
 * ⛔ LA GARDE DES COPIES.
 *
 * Ranger le vocabulaire ne suffisait pas : la garde ci-dessus déclarait depuis
 * toujours qu'`apparat_editeur` « a sa propre vue », et cette vue ne l'a jamais
 * demandé — elle interrogeait `nature = 'apparat_critique'`, à l'égalité. Trois cent
 * quarante-deux segments de cinq œuvres publiées n'ont donc paru NULLE PART, dont le
 * « Sommaire général » de l'Hexaéméron et la « Table des chapitres » de l'Histoire
 * ecclésiastique. Une liste peut être juste et n'être lue par personne.
 *
 * D'où ces deux gardes, qui relisent les COPIES là où elles vivent : dans les requêtes
 * de la page, et dans la fonction en base qui décide qu'une division a du texte.
 */
const RACINE = join(import.meta.dirname, '..', '..')
const lire = (chemin: string) => readFileSync(join(RACINE, chemin), 'utf8')

describe('le contrat des surfaces n’a pas de copie qui dérive', () => {
  it('les chargements serveur et client passent par le filtre partagé', () => {
    for (const chemin of ['app/oeuvre/[id]/page.tsx', 'app/oeuvre/[id]/OeuvreClient.tsx']) {
      const source = lire(chemin)
      // Une égalité sur une seule nature d'apparat, c'est la panne d'origine.
      expect(source).not.toMatch(/\.eq\(\s*'nature'\s*,\s*'apparat_(critique|editeur)'\s*\)/)
      expect(source).toContain('limiterRequeteSegmentsALaSurface')
    }
  })

  it('ne retranche jamais un groupe d’apparat parce que son niv1 existe au corps', () => {
    const source = lire('app/oeuvre/[id]/OeuvreClient.tsx')
    expect(source).not.toContain('niv1TexteSetClient')
    expect(source).not.toMatch(/\.has\(groupe\.niv1\)/)
  })

  it('`get_niv1_texte` est le miroir exact de NATURES_CORPS', () => {
    // La fonction en base dit quels niveaux 1 ont du texte : sa liste décidait, à elle
    // seule, que la « Préface » du Commentaire sur Isaïe n'existait pas.
    // ⚠️ `.sql` SEULEMENT : un `.bak` ou un `.orig` oublié dans le dossier trie après
    // le fichier qu'il copie et deviendrait « la dernière migration ». La garde
    // relirait alors l'état d'avant et passerait sur un défaut réel — vu à l'écriture
    // même de ce test, ce qui dit assez qu'une garde s'éprouve avant d'être crue.
    const migrations = readdirSync(join(RACINE, 'supabase/migrations')).filter(f => f.endsWith('.sql')).sort()
    const derniere = migrations.filter(f =>
      lire(join('supabase/migrations', f)).includes('function public.get_niv1_texte(p_id_oeuvre text, p_id_texte text)')).pop()
    expect(derniere, 'aucune migration ne définit get_niv1_texte').toBeDefined()
    const corps = lire(join('supabase/migrations', derniere!))
    const liste = corps.match(/s\.nature = any\(array\[([^\]]*)\]\)/s)?.[1]
    expect(liste, 'la liste des natures est introuvable dans la migration').toBeDefined()
    const naturesSql = [...liste!.matchAll(/'([^']+)'/g)].map(m => m[1])
    expect([...naturesSql].sort()).toEqual([...NATURES_CORPS].sort())
  })

  it('`get_niv1_list` projette le corps et exclut explicitement l’apparat', () => {
    const migrations = readdirSync(join(RACINE, 'supabase/migrations')).filter(f => f.endsWith('.sql')).sort()
    const derniere = migrations.filter(f =>
      /function public\.get_niv1_list\(\s*p_id_oeuvre text,\s*p_id_texte text\s*\)/.test(
        lire(join('supabase/migrations', f)),
      )).pop()
    expect(derniere, 'aucune migration ne définit get_niv1_list(text, text)').toBeDefined()

    const migration = lire(join('supabase/migrations', derniere!))
    const corps = migration.match(
      /create or replace function public\.get_niv1_list\(\s*p_id_oeuvre text,\s*p_id_texte text\s*\)([\s\S]*?)\$function\$;/,
    )?.[1]
    expect(corps, 'la définition de get_niv1_list(text, text) est introuvable').toBeDefined()
    expect(corps).toContain("s.espace_textuel is distinct from 'apparat_critique'")

    const liste = corps!.match(/s\.nature = any\(array\[([^\]]*)\]\)/s)?.[1]
    expect(liste, 'la liste des natures du corps est introuvable dans get_niv1_list').toBeDefined()
    const naturesSql = [...liste!.matchAll(/'([^']+)'/g)].map(m => m[1])
    expect([...naturesSql].sort()).toEqual([...NATURES_CORPS].sort())
  })

  it('réserve la projection globale à l’administration des styles', () => {
    const routeAdmin = lire('app/api/admin/styles/route.ts')
    expect(routeAdmin).toContain("rpc('get_niv1_list_global'")
    expect(routeAdmin).not.toContain("rpc('get_niv1_list',")

    const migrations = readdirSync(join(RACINE, 'supabase/migrations')).filter(f => f.endsWith('.sql')).sort()
    const derniere = migrations.filter(f =>
      lire(join('supabase/migrations', f)).includes('function public.get_niv1_list_global(')).pop()
    expect(derniere, 'aucune migration ne définit get_niv1_list_global').toBeDefined()
    const migration = lire(join('supabase/migrations', derniere!))
    expect(migration).toMatch(/revoke execute on function public\.get_niv1_list_global\(text, text\)[\s\S]*from public, anon, authenticated;/)
    expect(migration).toMatch(/grant execute on function public\.get_niv1_list_global\(text, text\)[\s\S]*to service_role;/)
  })
})

describe('la surface est déterminée par espace_textuel avant la nature', () => {
  const corps = {
    id: 1,
    ref_niv1: 'Livre deuxième',
    nature: 'texte',
    espace_textuel: 'corps',
  }
  const signatureApparat = {
    id: 2,
    ref_niv1: 'Livre deuxième',
    nature: 'signature',
    espace_textuel: 'apparat_critique',
  }

  it('A — conserve le même ref_niv1 sur les deux surfaces', () => {
    expect(segmentsDeLaSurface([corps, signatureApparat], 'corps')).toEqual([corps])
    expect(segmentsDeLaSurface([corps, signatureApparat], 'apparat')).toEqual([signatureApparat])
  })

  it('écarte une Épître explicitement placée dans l’apparat du sommaire du corps', () => {
    const epitre = {
      ref_niv1: 'Épître dédicatoire',
      nature: 'signature',
      espace_textuel: 'apparat_critique',
    }
    expect(segmentsDeLaSurface([epitre], 'corps')).toEqual([])
  })

  it('conserve Livre deuxième au corps même si l’apparat porte le même ref_niv1', () => {
    expect(segmentsDeLaSurface([corps, signatureApparat], 'corps').map(s => s.ref_niv1)).toEqual(['Livre deuxième'])
  })

  it('B — place une signature d’apparat dans l’apparat seulement', () => {
    expect(estSegmentDeLApparat(signatureApparat)).toBe(true)
    expect(estSegmentDuCorps(signatureApparat)).toBe(false)
  })

  it('C — conserve une signature sans espace d’apparat dans le corps', () => {
    const signatureCorps = { nature: 'signature', espace_textuel: null }
    expect(estSegmentDuCorps(signatureCorps)).toBe(true)
    expect(estSegmentDeLApparat(signatureCorps)).toBe(false)
  })

  it('D — conserve apparat_critique sans espace explicite dans l’apparat', () => {
    expect(surfaceDuSegment({ nature: 'apparat_critique', espace_textuel: null })).toBe('apparat')
  })

  it('E — conserve apparat_editeur sans espace explicite dans l’apparat', () => {
    expect(surfaceDuSegment({ nature: 'apparat_editeur' })).toBe('apparat')
  })

  it('F — ne range jamais un segment simultanément au corps et à l’apparat', () => {
    const cas = [
      corps,
      signatureApparat,
      { nature: 'signature', espace_textuel: null },
      { nature: 'apparat_critique', espace_textuel: null },
      { nature: 'apparat_editeur', espace_textuel: 'apparat_critique' },
      { nature: 'apparat_critique', espace_textuel: 'corps' },
    ]
    for (const segment of cas) {
      expect(Number(estSegmentDuCorps(segment)) + Number(estSegmentDeLApparat(segment))).toBeLessThanOrEqual(1)
    }
  })

  it('traduit exactement la même priorité dans les filtres PostgREST', () => {
    const appels: [string, string, (readonly string[])?][] = []
    const requete = {
      in(colonne: string, valeurs: readonly string[]) {
        appels.push(['in', colonne, valeurs])
        return this
      },
      or(filtres: string) {
        appels.push(['or', filtres])
        return this
      },
    }

    limiterRequeteSegmentsALaSurface(requete, 'corps')
    expect(appels).toEqual([
      ['in', 'nature', NATURES_CORPS],
      ['or', FILTRE_ESPACE_CORPS_POSTGREST],
    ])

    appels.length = 0
    limiterRequeteSegmentsALaSurface(requete, 'apparat')
    expect(appels).toEqual([['or', FILTRE_APPARAT_POSTGREST]])
  })
})

describe('les colonnes d’un segment se lisent en un seul endroit', () => {
  it('les deux champs de métadonnée sont tirés par leur nom, jamais le jsonb entier', () => {
    // PostgREST rendrait une trentaine de clés par segment, pour une page qui en
    // charge jusqu'à mille d'un coup.
    expect(SELECT_SEGMENT).toContain('numero_verset:segment_metadata->>biblical_verse_number')
    expect(SELECT_SEGMENT).not.toMatch(/(^|,)segment_metadata(,|$)/)
  })
})
