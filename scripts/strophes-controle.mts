/**
 * Ce que le REPLI de `ouvreStrophe` produit sur le corpus — relevé, sans écriture.
 *
 * ⛔ `stanza_before` est la marque de strophe. Quand elle est nulle — « l'édition n'a
 * rien dit » —, `ouvreStrophe` retombe sur un changement de `paragraphe`. Ce repli est
 * juste pour Mirandol, dont `paragraphe` porte des strophes de douze vers ; il ne l'est
 * pas partout, et il n'y a aucun moyen de les distinguer depuis le code.
 *
 * Ce script MESURE ce que le repli déduit, poème par poème, et cherche le signe qui
 * trahit une fausse strophe : une frontière qui tombe après une virgule, c'est-à-dire
 * au milieu d'une phrase. Il n'écrit rien et ne décide rien.
 *
 * ⛔ Il n'a AUCUNE règle à lui : `ouvreStrophe`, `estEnVers` et `marqueStrophe` viennent
 * du module que la page emploie. Une seconde écriture divergerait au premier ajustement,
 * et le contrôle certifierait un site imaginaire.
 *
 * Lancement :
 *   node --env-file=.env.local node_modules/tsx/dist/cli.mjs scripts/strophes-controle.mts
 *   … --detail <id_texte>   pour lister les frontières d'un texte
 */
import { createClient } from '@supabase/supabase-js'
import { estEnVers, marqueStrophe, ouvreStrophe } from '../app/lib/compositionVers'

const client = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

const detail = (() => {
  const i = process.argv.indexOf('--detail')
  return i >= 0 ? process.argv[i + 1] : null
})()

type Seg = {
  id_texte: string
  segment_numero: number
  segment_texte: string
  nature: string | null
  espace_textuel: string | null
  ref_niv1: string | null
  ref_niv2: string | null
  ref_niv3: string | null
  paragraphe: number | null
  segment_metadata: Record<string, unknown> | null
}

/** Une ponctuation qui FERME une phrase. Une strophe s'ouvre après elle, non ailleurs. */
const CLOT_LA_PHRASE = /[.!?][)»"'\]\s]*$/u

async function pages<T>(faire: (de: number, a: number) => PromiseLike<{ data: T[] | null; error: unknown }>) {
  const sortie: T[] = []
  const taille = 1000
  for (let de = 0; ; de += taille) {
    const { data, error } = await faire(de, de + taille - 1)
    if (error) throw error
    const lot = data ?? []
    sortie.push(...lot)
    if (lot.length < taille) return sortie
  }
}

// ⛔ On interroge TEXTE PAR TEXTE, jamais le corpus d'un coup : un filtre sur un chemin
// `jsonb` n'a pas d'index, et `segments` compte 127 000 lignes — la requête unique
// franchit les huit secondes de `statement_timeout` et rend un 57014.
const { data: textes, error: eT } = await client.from('oeuvre_textes').select('id_texte')
if (eT) throw eT

const enVers: Seg[] = []
for (const { id_texte } of textes ?? []) {
  const lot = await pages<Seg>((de, a) =>
    client.from('segments')
      .select('id_texte,segment_numero,segment_texte,nature,espace_textuel,ref_niv1,ref_niv2,ref_niv3,paragraphe,segment_metadata')
      .eq('id_texte', id_texte)
      .eq('segment_metadata->>forme', 'vers')
      .order('segment_numero').range(de, a))
  enVers.push(...lot.filter(s => estEnVers({ segment_metadata: s.segment_metadata })))
}
enVers.sort((a, b) => a.id_texte.localeCompare(b.id_texte) || a.segment_numero - b.segment_numero)

// Un POÈME est une suite CONTIGUË de vers dans la même surface et la même division :
// c'est ce que `fusionnerBlocs` refait, et ce que l'introduction rend d'un bloc.
const cleSurface = (s: Seg) =>
  [s.id_texte, s.espace_textuel ?? '~', s.nature ?? '~', s.ref_niv1 ?? '~', s.ref_niv2 ?? '~', s.ref_niv3 ?? '~'].join('|')

const poemes: Seg[][] = []
for (const s of enVers) {
  const dernier = poemes[poemes.length - 1]
  const suite = dernier
    && cleSurface(dernier[dernier.length - 1]) === cleSurface(s)
    && s.segment_numero === dernier[dernier.length - 1].segment_numero + 1
  if (suite) dernier.push(s)
  else poemes.push([s])
}

type Bilan = {
  vers: number
  marqueRenseignee: number
  poemes: number
  strophes: number
  parRepli: number
  groupes: number[]
  frontieresOuvertes: number
  detail: { numero: number; avant: string; apres: string }[]
}

const bilans = new Map<string, Bilan>()
for (const poeme of poemes) {
  const cle = `${poeme[0].id_texte} · ${poeme[0].espace_textuel ?? '~'} / ${poeme[0].nature ?? '~'}`
  const b = bilans.get(cle) ?? {
    vers: 0, marqueRenseignee: 0, poemes: 0, strophes: 0, parRepli: 0,
    groupes: [], frontieresOuvertes: 0, detail: [],
  }
  b.poemes += 1
  b.vers += poeme.length
  let taille = 0
  for (const [i, s] of poeme.entries()) {
    taille += 1
    const marque = marqueStrophe(s.segment_metadata?.stanza_before)
    if (marque != null) b.marqueRenseignee += 1
    const precedente = i > 0 ? poeme[i - 1] : undefined
    if (i > 0 && ouvreStrophe({ strophe_avant: marque, paragraphe: s.paragraphe }, precedente)) {
      b.strophes += 1
      if (marque == null) b.parRepli += 1
      b.groupes.push(taille - 1)
      taille = 1
      const avant = precedente!.segment_texte.trim()
      if (!CLOT_LA_PHRASE.test(avant)) {
        b.frontieresOuvertes += 1
        b.detail.push({ numero: s.segment_numero, avant: avant.slice(-42), apres: s.segment_texte.trim().slice(0, 42) })
      }
    }
  }
  b.groupes.push(taille)
  bilans.set(cle, b)
}

const rangees = [...bilans.entries()].sort((a, b) => b[1].vers - a[1].vers)

console.log('texte · espace / nature'.padEnd(58), 'vers', 'marq', 'poèm', 'stro', 'repli', 'min', 'max', 'ouvertes')
console.log('-'.repeat(110))
for (const [cle, b] of rangees) {
  const min = Math.min(...b.groupes)
  const max = Math.max(...b.groupes)
  console.log(
    cle.slice(0, 56).padEnd(58),
    String(b.vers).padStart(4), String(b.marqueRenseignee).padStart(4),
    String(b.poemes).padStart(4), String(b.strophes).padStart(4),
    String(b.parRepli).padStart(5), String(min).padStart(3), String(max).padStart(3),
    String(b.frontieresOuvertes).padStart(8),
  )
}
console.log('-'.repeat(110))
console.log('marq = vers dont `stanza_before` est renseignée · repli = strophes déduites du seul `paragraphe`')
console.log('ouvertes = frontières de strophe posées après une ligne qui NE ferme PAS sa phrase')

if (detail) {
  console.log('')
  for (const [cle, b] of rangees) {
    if (!cle.startsWith(detail)) continue
    console.log(`— ${cle} : ${b.frontieresOuvertes} frontière(s) au milieu d'une phrase`)
    for (const d of b.detail.slice(0, 40)) {
      console.log(`   n° ${d.numero} : …${d.avant}  ⟂  ${d.apres}…`)
    }
  }
}
