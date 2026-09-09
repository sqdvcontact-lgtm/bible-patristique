import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  appartientALaSurface,
  AUCUN_ECHO,
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
  NATURES_ECHO_APPARAT,
  partagerLApparat,
  sectionDApparat,
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

  // ⚠️ La PLACE DE LECTURE reste unique, même depuis que l'apparat de l'auteur PARAÎT
  // sur deux surfaces : `surfaceDuSegment` dit où le segment vit, `appartientALaSurface`
  // dit ce qu'une surface affiche, et c'est la première que suit `vueInitiale`.
  it('ne range jamais un segment simultanément au corps et à l’apparat', () => {
    const cas = [
      corps,
      signatureApparat,
      { nature: 'apparat_auteur', ref_niv1: 'Prologue', espace_textuel: ESPACE_TEXTUEL_CORPS },
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

describe('l’apparat de l’auteur paraît sur DEUX surfaces, par pièces entières', () => {
  const PIECES = new Set(['Prologue'])
  const prologue = {
    ref_niv1: 'Prologue',
    nature: 'apparat_auteur',
    espace_textuel: ESPACE_TEXTUEL_CORPS,
  }
  // Les dix paragraphes d’auteur pris au milieu du « Livre I » d’Eusèbe, qui en compte
  // 209 : la division n’est pas d’une seule main, elle n’entre donc pas dans l’apparat.
  const digression = {
    ref_niv1: 'Livre I',
    nature: 'apparat_auteur',
    espace_textuel: ESPACE_TEXTUEL_CORPS,
  }

  it('garde le corps comme PLACE DE LECTURE, quoi qu’affiche l’apparat', () => {
    expect(surfaceDuSegment(prologue)).toBe('corps')
    expect(estSegmentDuCorps(prologue)).toBe(true)
    // ⛔ C’est ce que suit `vueInitiale` : un lien profond vers le Prologue de Rufin
    // ouvre le TEXTE, où la pièce se lit à sa place, et non l’apparat, où elle résonne.
    expect(estSegmentDeLApparat(prologue)).toBe(false)
  })

  it('affiche une pièce entière des deux côtés', () => {
    expect(appartientALaSurface(prologue, 'corps', PIECES)).toBe(true)
    expect(appartientALaSurface(prologue, 'apparat', PIECES)).toBe(true)
    expect(segmentsDeLaSurface([prologue], 'apparat', PIECES)).toEqual([prologue])
  })

  it('laisse au corps SEUL le fragment pris dans une division mixte', () => {
    expect(appartientALaSurface(digression, 'corps', PIECES)).toBe(true)
    expect(appartientALaSurface(digression, 'apparat', PIECES)).toBe(false)
    expect(segmentsDeLaSurface([digression], 'apparat', PIECES)).toEqual([])
  })

  it('n’écho rien quand l’appelant ne connaît pas les divisions', () => {
    // ⚠️ Le cas de l’extraction `.docx`, où corps et apparat se suivent dans un seul
    // document : y répéter une préface serait un doublon, non une distinction.
    expect(segmentsDeLaSurface([prologue], 'apparat')).toEqual([])
    expect(segmentsDeLaSurface([prologue], 'apparat', AUCUN_ECHO)).toEqual([])
    expect(segmentsDeLaSurface([prologue], 'corps')).toEqual([prologue])
  })

  it('range l’apparat en deux sections, l’auteur d’abord, l’ordre gardé', () => {
    const avis = { ref_niv1: 'Avis au lecteur', nature: 'apparat_editeur', espace_textuel: ESPACE_TEXTUEL_APPARAT }
    const privilege = { ref_niv1: 'Privilège du Roi', nature: 'apparat_editeur', espace_textuel: ESPACE_TEXTUEL_APPARAT }
    const { auteur, editeur } = partagerLApparat([avis, prologue, privilege])
    expect(auteur).toEqual([prologue])
    expect(editeur).toEqual([avis, privilege])
  })

  it('rend à l’éditeur la nature héritée, qu’on ne reclasse jamais en masse', () => {
    expect(sectionDApparat(prologue)).toBe('auteur')
    expect(sectionDApparat({ nature: 'apparat_critique', espace_textuel: ESPACE_TEXTUEL_APPARAT })).toBe('editeur')
    expect(sectionDApparat({ nature: 'signature', espace_textuel: ESPACE_TEXTUEL_APPARAT })).toBe('editeur')
  })

  it('demande la nature d’écho au filtre PostgREST de l’apparat', () => {
    for (const nature of NATURES_ECHO_APPARAT) {
      expect(FILTRE_APPARAT_POSTGREST).toContain(nature)
      // ⚠️ Le corps la porte AUSSI, dans sa liste de repli : ces segments y sont chez
      // eux, entiers ou fragments, et une seconde surface ne leur retire pas la leur.
      expect(FILTRE_CORPS_POSTGREST).toContain(nature)
    }
  })

  it('la RPC des pièces entières existe, et n’ouvre pas au rôle anonyme', () => {
    const migrations = readdirSync(join(RACINE, 'supabase/migrations')).filter(f => f.endsWith('.sql')).sort()
    const derniere = migrations.filter(f =>
      lire(join('supabase/migrations', f)).includes('function public.get_niv1_apparat_auteur(p_id_oeuvre text, p_id_texte text)'),
    ).pop()
    expect(derniere, 'aucune migration ne définit get_niv1_apparat_auteur').toBeDefined()
    const sql = lire(join('supabase/migrations', derniere!))
    for (const nature of NATURES_ECHO_APPARAT) expect(sql).toContain(`'${nature}'`)
    // ⛔ Une division n'est PURE que si rien d'une autre nature ne l'habite : c'est le
    // `having` qui le dit, et le retirer ferait entrer tout le corps dans l'apparat.
    expect(sql).toContain('having count(*) filter (where s.nature <> \'apparat_auteur\') = 0')
    expect(sql).toMatch(/revoke execute on function public\.get_niv1_apparat_auteur\(text, text\) from public, anon;/)
    expect(sql).toMatch(/grant execute on function public\.get_niv1_apparat_auteur\(text, text\) to authenticated, service_role;/)
  })
})

describe('les colonnes d’un segment se lisent en un seul endroit', () => {
  it('les champs de métadonnée nécessaires sont projetés sans lire le jsonb entier', () => {
    expect(SELECT_SEGMENT).toContain('numero_verset:segment_metadata->>biblical_verse_number')
    expect(SELECT_SEGMENT).not.toMatch(/(^|,)segment_metadata(,|$)/)
  })
})
