/**
 * LE CHAPEAU D'UNE DIVISION PARLE-T-IL DE CETTE DIVISION-LÀ ?
 *
 * ⛔ Ce contrôle ne LIT rien : il compte des mots. Il dit où regarder, jamais ce qu'il
 * faut écrire — l'arbitrage reste une lecture.
 *
 * La mesure : les mots RARES du chapeau d'une division, retrouvés dans le TEXTE de cette
 * division, puis dans celui de ses deux voisines. Un chapeau qui parle mieux de la voisine
 * que de la sienne est un chapeau déplacé.
 *
 *   node --env-file=.env.local node_modules/tsx/dist/cli.mjs scripts/controle-chapeaux-divisions.mts
 *
 * ⚠️ Il SIGNALE, il ne corrige rien, et il se trompe : sur les douze chapeaux qu il a
 * relevés le 9 septembre 2026, DEUX étaient de vraies permutations et dix des faux
 * positifs — un chapeau partage naturellement son vocabulaire avec ses voisins. Le
 * contre-épreuve qui tranche est le TEXTE de la division, jamais le compte de mots.
 */
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const cle = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !cle) throw new Error('NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis.')
const sb = createClient(url, cle, { auth: { persistSession: false } })

/** Les mots vides du français, plus ceux que la prose patristique répète partout. */
const VIDES = new Set([
  'dans', 'pour', 'avec', 'sans', 'sous', 'entre', 'depuis', 'comme', 'plus', 'moins',
  'tout', 'tous', 'toute', 'toutes', 'meme', 'memes', 'autre', 'autres', 'cette', 'celui',
  'celle', 'ceux', 'celles', 'leur', 'leurs', 'notre', 'nos', 'votre', 'vos', 'nous',
  'vous', 'elle', 'elles', 'nest', 'sont', 'etre', 'etait', 'etaient', 'avoir', 'avait',
  'faire', 'fait', 'dire', 'quil', 'quils', 'quelle', 'quelles', 'quand', 'donc', 'ainsi',
  'mais', 'parce', 'pourquoi', 'discours', 'homelie', 'chapitre', 'livre', 'sermon',
  'dieu', 'seigneur', 'saint', 'sainte', 'jesus', 'christ', 'homme', 'hommes',
])

const replier = (t: string) =>
  t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

function motsRares(t: string): Set<string> {
  const out = new Set<string>()
  for (const m of replier(t).split(/[^a-z0-9]+/)) {
    if (m.length >= 5 && !VIDES.has(m)) out.add(m)
  }
  return out
}

function part(chapeau: Set<string>, texte: Set<string>): number {
  if (chapeau.size === 0) return 0
  let n = 0
  for (const m of chapeau) if (texte.has(m)) n++
  return n / chapeau.size
}

type Ligne = {
  id_oeuvre: string
  ref_niv1: string | null
  ref_niv1_texte: string | null
  segment_texte: string | null
  segment_numero: number | null
}

const { data: textes, error: e1 } = await sb
  .from('oeuvre_textes')
  .select('id_texte, id_oeuvre, is_default')
  .eq('is_default', true)
if (e1) throw e1

let signales = 0
for (const t of textes ?? []) {
  const lignes: Ligne[] = []
  for (let debut = 0; ; debut += 1000) {
    const { data, error } = await sb
      .from('segments')
      .select('id_oeuvre, ref_niv1, ref_niv1_texte, segment_texte, segment_numero')
      .eq('id_texte', t.id_texte)
      .neq('espace_textuel', 'apparat_critique')
      .order('segment_numero')
      .range(debut, debut + 999)
    if (error) throw error
    lignes.push(...(data as Ligne[]))
    if (!data || data.length < 1000) break
  }
  // Une division = une suite de segments qui partagent leur `ref_niv1`.
  const divisions: { niv1: string; chapeau: string; texte: string }[] = []
  for (const l of lignes) {
    const niv1 = l.ref_niv1 ?? ''
    const derniere = divisions[divisions.length - 1]
    if (!derniere || derniere.niv1 !== niv1) divisions.push({ niv1, chapeau: '', texte: '' })
    const d = divisions[divisions.length - 1]
    if (!d.chapeau && l.ref_niv1_texte) d.chapeau = l.ref_niv1_texte
    d.texte += ' ' + (l.segment_texte ?? '')
  }
  if (divisions.filter(d => d.chapeau).length < 2) continue

  const mots = divisions.map(d => ({ chapeau: motsRares(d.chapeau), texte: motsRares(d.texte) }))
  for (let i = 0; i < divisions.length; i++) {
    if (!divisions[i].chapeau) continue
    if (mots[i].chapeau.size < 4) continue // un chapeau trop court ne se juge pas
    const sien = part(mots[i].chapeau, mots[i].texte)
    const avant = i > 0 ? part(mots[i].chapeau, mots[i - 1].texte) : 0
    const apres = i + 1 < divisions.length ? part(mots[i].chapeau, mots[i + 1].texte) : 0
    const meilleur = Math.max(avant, apres)
    if (meilleur > sien + 0.12) {
      signales++
      const ou = apres >= avant ? 'SUIVANTE' : 'PRÉCÉDENTE'
      console.log(
        `\n⚠️ ${t.id_oeuvre} · ${divisions[i].niv1 || '(sans niveau 1)'}`,
        `\n   le chapeau parle mieux de la division ${ou} : sien ${sien.toFixed(2)} · avant ${avant.toFixed(2)} · après ${apres.toFixed(2)}`,
        `\n   « ${divisions[i].chapeau.slice(0, 130).replace(/\s+/g, ' ')} »`,
      )
    }
  }
}
console.log(`\n──\n${signales} chapeau(x) signalé(s).`)
