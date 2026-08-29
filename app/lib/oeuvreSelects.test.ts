import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { NATURES_CORPS, NATURES_APPARAT, SELECT_SEGMENT } from './oeuvreSelects'
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

describe('les listes de natures n’ont pas de copie qui dérive', () => {
  it('la vue d’apparat interroge les DEUX natures, jamais une égalité', () => {
    for (const chemin of ['app/oeuvre/[id]/page.tsx', 'app/oeuvre/[id]/OeuvreClient.tsx']) {
      const source = lire(chemin)
      // Une égalité sur une seule nature d'apparat, c'est la panne d'origine.
      expect(source).not.toMatch(/\.eq\(\s*'nature'\s*,\s*'apparat_(critique|editeur)'\s*\)/)
      expect(source).toContain('NATURES_APPARAT')
    }
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
})

describe('les colonnes d’un segment se lisent en un seul endroit', () => {
  it('les deux champs de métadonnée sont tirés par leur nom, jamais le jsonb entier', () => {
    // PostgREST rendrait une trentaine de clés par segment, pour une page qui en
    // charge jusqu'à mille d'un coup.
    expect(SELECT_SEGMENT).toContain('numero_verset:segment_metadata->>biblical_verse_number')
    expect(SELECT_SEGMENT).not.toMatch(/(^|,)segment_metadata(,|$)/)
  })
})
