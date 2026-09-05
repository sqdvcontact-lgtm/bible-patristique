import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  estSegmentDeLApparat,
  estSegmentDuCorps,
  ESPACE_TEXTUEL_APPARAT,
  ESPACE_TEXTUEL_CORPS,
  ESPACE_TEXTUEL_INTRODUCTION,
  FILTRE_APPARAT_POSTGREST,
  FILTRE_CORPS_POSTGREST,
  limiterRequeteSegmentsALaSurface,
  NATURES_CORPS,
  NATURES_APPARAT,
  segmentsDeLaSurface,
  SELECT_SEGMENT,
  surfaceDuSegment,
} from './oeuvreSelects'
import { NATURE_VALIDES } from './naturesSegments'

/** ⛔ Conservée pour la compatibilité des anciens exports ; ne plus en créer. */
const NATURES_ETEINTES = ['separateur'] as const

describe('le vocabulaire des natures est entièrement rangé', () => {
  it('chaque nature valide possède un repli, et un seul', () => {
    const rangees = [...NATURES_CORPS, ...NATURES_APPARAT, ...NATURES_ETEINTES]
    expect([...rangees].sort()).toEqual([...NATURE_VALIDES].sort())
    expect(new Set(rangees).size).toBe(rangees.length)
  })

  it('le corps porte le lemme et l’apparat de l’auteur', () => {
    expect(NATURES_CORPS).toContain('lemme')
    expect(NATURES_CORPS).toContain('apparat_auteur')
    expect(NATURES_CORPS).not.toContain('apparat_critique')
    expect(NATURES_CORPS).not.toContain('apparat_editeur')
  })
})

const RACINE = join(import.meta.dirname, '..', '..')
const lire = (chemin: string) => readFileSync(join(RACINE, chemin), 'utf8')

describe('le contrat des surfaces n’a pas de copie qui dérive', () => {
  it('les chargements serveur et client passent par le filtre partagé', () => {
    for (const chemin of ['app/oeuvre/[id]/page.tsx', 'app/oeuvre/[id]/OeuvreClient.tsx']) {
      const source = lire(chemin)
      expect(source).not.toMatch(/\.eq\(\s*'nature'\s*,\s*'apparat_(critique|editeur)'\s*\)/)
      expect(source).toContain('limiterRequeteSegmentsALaSurface')
    }
  })

  it('ne retranche jamais un groupe d’apparat parce que son niv1 existe au corps', () => {
    const source = lire('app/oeuvre/[id]/OeuvreClient.tsx')
    expect(source).not.toContain('niv1TexteSetClient')
    expect(source).not.toMatch(/\.has\(groupe\.niv1\)/)
  })

  it('les RPC de sommaire appliquent la priorité des espaces explicites', () => {
    const migrations = readdirSync(join(RACINE, 'supabase/migrations')).filter(f => f.endsWith('.sql')).sort()

    for (const fonction of ['get_niv1_list', 'get_niv1_texte']) {
      const derniere = migrations.filter(f =>
        lire(join('supabase/migrations', f)).includes(`function public.${fonction}(p_id_oeuvre text, p_id_texte text)`),
      ).pop()
      expect(derniere, `aucune migration ne définit ${fonction}(text, text)`).toBeDefined()
      const sql = lire(join('supabase/migrations', derniere!))
      expect(sql).toContain("s.espace_textuel in ('corps', 'introduction')")
      expect(sql).toContain('s.espace_textuel is null')
      const liste = sql.match(/s\.nature = any\(array\[([^\]]*)\]\)/s)?.[1]
      expect(liste, `la liste de repli des natures est introuvable dans ${fonction}`).toBeDefined()
      const naturesSql = [...liste!.matchAll(/'([^']+)'/g)].map(m => m[1])
      expect([...naturesSql].sort()).toEqual([...NATURES_CORPS].sort())
    }
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

describe('espace_textuel prime sur la nature', () => {
  const corps = {
    id: 1,
    ref_niv1: 'Livre deuxième',
    nature: 'texte',
    espace_textuel: ESPACE_TEXTUEL_CORPS,
  }
  const signatureApparat = {
    id: 2,
    ref_niv1: 'Approbation des docteurs',
    nature: 'signature',
    espace_textuel: ESPACE_TEXTUEL_APPARAT,
  }

  it('place une signature explicitement d’apparat dans l’apparat seulement', () => {
    expect(estSegmentDeLApparat(signatureApparat)).toBe(true)
    expect(estSegmentDuCorps(signatureApparat)).toBe(false)
  })

  it('garde une signature historique sans espace explicite dans le corps', () => {
    const signatureCorps = { nature: 'signature', espace_textuel: null }
    expect(estSegmentDuCorps(signatureCorps)).toBe(true)
    expect(estSegmentDeLApparat(signatureCorps)).toBe(false)
  })

  it('rend l’Avis au lecteur : apparat_editeur explicitement placé en introduction', () => {
    const avis = {
      ref_niv1: 'Avis au lecteur',
      nature: 'apparat_editeur',
      espace_textuel: ESPACE_TEXTUEL_INTRODUCTION,
    }
    expect(surfaceDuSegment(avis)).toBe('corps')
    expect(segmentsDeLaSurface([avis], 'corps')).toEqual([avis])
    expect(segmentsDeLaSurface([avis], 'apparat')).toEqual([])
  })

  it('rend Approbation et Privilège dans l’apparat malgré leur nature apparat_editeur', () => {
    const pieces = [
      { ref_niv1: 'Approbation des docteurs', nature: 'apparat_editeur', espace_textuel: ESPACE_TEXTUEL_APPARAT },
      { ref_niv1: 'Privilège du Roi', nature: 'apparat_editeur', espace_textuel: ESPACE_TEXTUEL_APPARAT },
      signatureApparat,
    ]
    expect(segmentsDeLaSurface(pieces, 'corps')).toEqual([])
    expect(segmentsDeLaSurface(pieces, 'apparat')).toEqual(pieces)
  })

  it('un espace corps explicite l’emporte même sur une nature héritée d’apparat', () => {
    expect(surfaceDuSegment({ nature: 'apparat_critique', espace_textuel: ESPACE_TEXTUEL_CORPS })).toBe('corps')
  })

  it('conserve les replis historiques quand espace_textuel est absent', () => {
    expect(surfaceDuSegment({ nature: 'apparat_critique', espace_textuel: null })).toBe('apparat')
    expect(surfaceDuSegment({ nature: 'apparat_editeur' })).toBe('apparat')
    expect(surfaceDuSegment({ nature: 'texte' })).toBe('corps')
  })

  it('ne range jamais un segment simultanément au corps et à l’apparat', () => {
    const cas = [
      corps,
      signatureApparat,
      { nature: 'signature', espace_textuel: null },
      { nature: 'apparat_critique', espace_textuel: null },
      { nature: 'apparat_editeur', espace_textuel: ESPACE_TEXTUEL_APPARAT },
      { nature: 'apparat_editeur', espace_textuel: ESPACE_TEXTUEL_INTRODUCTION },
      { nature: 'apparat_critique', espace_textuel: ESPACE_TEXTUEL_CORPS },
    ]
    for (const segment of cas) {
      expect(Number(estSegmentDuCorps(segment)) + Number(estSegmentDeLApparat(segment))).toBeLessThanOrEqual(1)
    }
  })

  it('traduit exactement la même priorité dans les filtres PostgREST', () => {
    const appels: [string, string][] = []
    const requete = {
      or(filtres: string) {
        appels.push(['or', filtres])
        return this
      },
    }

    limiterRequeteSegmentsALaSurface(requete, 'corps')
    expect(appels).toEqual([['or', FILTRE_CORPS_POSTGREST]])

    appels.length = 0
    limiterRequeteSegmentsALaSurface(requete, 'apparat')
    expect(appels).toEqual([['or', FILTRE_APPARAT_POSTGREST]])
  })
})

describe('les colonnes d’un segment se lisent en un seul endroit', () => {
  it('les champs de métadonnée nécessaires sont projetés sans lire le jsonb entier', () => {
    expect(SELECT_SEGMENT).toContain('numero_verset:segment_metadata->>biblical_verse_number')
    expect(SELECT_SEGMENT).not.toMatch(/(^|,)segment_metadata(,|$)/)
  })
})
