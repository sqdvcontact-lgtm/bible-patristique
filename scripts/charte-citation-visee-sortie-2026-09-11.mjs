/**
 * Rectifie la charte, § 13.18 : LA CITATION VISÉE EN VERS EST UNE CITATION SORTIE, et
 * consigne au carnet le relevé qui l'a fondée.
 *
 * Relevé de l'auteur, le soir du 11 septembre 2026, sur la note I-01 de la Consolation :
 * « Le bonheur qui jadis inspirait mes accents, / A fait place aux sombres alarmes… »
 * devrait être une citation sortie. La donnée la déclarait sortie ; une règle écrite le
 * matin même au § 13.18 (« une citation visée n'est jamais sortie ») la gardait au fil.
 * La RÈGLE corrigée va à la charte ; la MESURE va au carnet (AGENTS.md, « le journal de
 * chantier ne va pas dans la charte »).
 *
 * ⛔ La charte se corrige par REMPLACEMENTS, chacun devant se trouver exactement une fois
 * dans les deux exemplaires ; le carnet s'allonge par la FIN, et ce qu'on écrit doit
 * commencer par ce qu'il porte déjà. ⛔ Rien ne s'écrit si un miroir diffère de Supabase.
 * ⚠️ Verrou optimiste sur `mis_a_jour`.
 *
 * Usage : node scripts/charte-citation-visee-sortie-2026-09-11.mjs [--dry]
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = 'C:/Corpus Scriptura/bible-patristique'
const essaiSeul = process.argv.includes('--dry')
const L = lignes => lignes.join('\n')

const REMPLACEMENTS = [
  {
    nom: '§ 13.18 : la citation visée en vers',
    avant: L([
      "- en vers, elle fait toujours unité : ses retours à la ligne ne tiennent pas dans la ligne",
      "  d'un propos. Elle garde ses lignes, en boîtes, avec leur retrait de suite, mais part du",
      "  FER de la note : elle n'est pas une citation sortie.",
    ]),
    apres: L([
      "- en vers, elle fait toujours unité : ses retours à la ligne ne tiennent pas dans la ligne",
      "  d'un propos. Elle garde ses lignes, en boîtes, avec leur retrait de suite, et elle se",
      "  DÉTACHE comme tout vers cité : c'est une citation sortie ;",
      "- en prose, quand la donnée la déclare sortie (`citation_layout = block`), elle fait unité",
      "  elle aussi et se détache : un bloc sorti ne se pose pas sur la ligne d'un autre.",
    ]),
  },
  {
    nom: '§ 13.18 : la disposition, sans exception pour la citation visée',
    avant: L([
      "citationnel. Sans déclaration, un vers se détache, une traduction aussi. Une citation",
      "visée n'est jamais sortie.",
    ]),
    apres: L([
      "citationnel. Sans déclaration, un vers se détache, une traduction aussi, et la prose reste",
      "au fil. ⛔ **La citation visée n'y fait pas exception** (rectification de l'auteur, le soir",
      "du 11 septembre 2026) : une règle du matin la gardait toujours au fil, et elle passait outre",
      "la donnée, qui déclare sorties les citations visées en vers. Un vers cité se détache, qu'il",
      "soit la phrase de l'œuvre ou celle d'un autre.",
    ]),
  },
]

const ENTREE = '\n' + L([
  "### 2026-09-11 (soir) — Boèce, note I-01 : le distique visé que le rendu laissait au fer",
  "",
  "Relevé de l'auteur, sur la note I-01 de la *Consolation* (Mirandol) : « Le bonheur qui",
  "jadis inspirait mes accents, / A fait place aux sombres alarmes… » devrait être une",
  "citation sortie.",
  "",
  "**La donnée le disait déjà.** Les 38 citations visées en vers du texte portent",
  "`citation_layout = block`, posé par la passe de données du jour (métadonnée",
  "`notes_deep_audit_verse_layout_20260911` : « all verse lemmata and quotations are explicit",
  "detached blocks »). Le rendu passait outre : `dispositionCitation` gardait au fil toute",
  "citation visée, selon la règle écrite le matin même au § 13.18, avant que la passe ne",
  "déclare ces vers sortis. Les deux décisions se sont croisées dans la journée, et la",
  "première l'emportait à l'écran : le distique partait du fer de la note, sans le retrait",
  "de 1,5 em que prend tout vers cité.",
  "",
  "**Les 38** : 30 précèdent un commentaire (21 sur plusieurs lignes, 9 sur une seule), 8",
  "une référence (7 et 1). Les 88 citations visées en prose ne déclarent rien ; elles",
  "restent au fil et ouvrent la ligne du propos (§ 13.11).",
  "",
  "**Correction** : la citation visée suit la règle commune, la donnée d'abord, puis la",
  "forme ; une citation visée en prose déclarée sortie ne se pose plus sur la ligne du",
  "propos (aucun cas au 11 septembre 2026). Contrôle par le vrai chargeur et le vrai",
  "composant (`tmp/controle-rendu-notes-boece.mts`) : 235 notes, 728 blocs, 651 unités",
  "rendues, 77 groupes original et traduction, aucune anomalie ; I-01, I-02 et II-18",
  "rendent leur citation visée sortie.",
]) + '\n'

const MARQUE_CARNET = '### 2026-09-11 (soir) — Boèce, note I-01'

const env = Object.fromEntries(
  readFileSync(resolve(racine, '.env.local'), 'utf8')
    .split(/\r?\n/u)
    .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/u))
    .filter(Boolean)
    .map(m => [m[1], m[2].replace(/^["']|["']$/gu, '')]),
)
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

/** ⛔ Chaque motif, exactement une fois : mieux vaut ne rien corriger que corriger à moitié. */
function remplacer(texte, source) {
  let sortie = texte
  for (const { nom, avant, apres } of REMPLACEMENTS) {
    const trouvees = sortie.split(avant).length - 1
    if (trouvees !== 1) throw new Error(`[${source}] « ${nom} » : ${trouvees} occurrence(s), 1 attendue.`)
    sortie = sortie.split(avant).join(apres)
  }
  return sortie
}

/** ⛔ L'INVARIANT du carnet : on n'écrit QUE par la fin, et jamais sur ce qui est déjà là. */
function ajouter(texte, source) {
  if (texte.includes(MARQUE_CARNET)) throw new Error(`[${source}] « ${MARQUE_CARNET} » y est déjà.`)
  const sortie = texte.trimEnd() + '\n' + ENTREE
  if (!sortie.startsWith(texte.trimEnd())) throw new Error(`[${source}] l'ajout ne prolonge pas le texte existant.`)
  return sortie
}

const EXEMPLAIRES = [
  { cle: 'charte_ia', fichier: resolve(racine, 'charte', 'CHARTE_IA.md'), transformer: remplacer },
  { cle: 'carnet_ia', fichier: resolve(racine, 'charte', 'CARNET_IA.md'), transformer: ajouter },
]

const plans = []
for (const ex of EXEMPLAIRES) {
  const { data, error } = await db.from('parametres').select('valeur,mis_a_jour').eq('cle', ex.cle).single()
  if (error) throw error
  const localAvant = readFileSync(ex.fichier, 'utf8')
  plans.push({
    ...ex,
    data,
    identiques: localAvant.trimEnd() === data.valeur.trimEnd(),
    localApres: ex.transformer(localAvant, `${ex.cle}, fichier local`),
    distantApres: ex.transformer(data.valeur, `${ex.cle}, Supabase`),
    tailles: { local: localAvant.length, supabase: data.valeur.length },
  })
}

console.log(JSON.stringify(plans.map(p => ({
  cle: p.cle, identiques_avant: p.identiques, avant: p.tailles,
  apres: { local: p.localApres.length, supabase: p.distantApres.length }, mis_a_jour: p.data.mis_a_jour,
})), null, 2))

if (plans.some(p => !p.identiques)) {
  throw new Error('Un miroir diffère de Supabase : le tirer d’abord (synchroniser-charte-supabase.mjs --pull). Rien n’a été écrit.')
}

if (essaiSeul) {
  console.log('Essai seul : rien n’a été écrit.')
} else {
  for (const p of plans) {
    const { data: ecrite, error } = await db
      .from('parametres')
      .update({ valeur: p.distantApres, mis_a_jour: new Date().toISOString() })
      .eq('cle', p.cle)
      .eq('mis_a_jour', p.data.mis_a_jour)
      .select('mis_a_jour')
    if (error) throw error
    if (!ecrite || ecrite.length !== 1) {
      throw new Error(`[${p.cle}] a changé entre la lecture et l’écriture : rien n’a été écrit pour lui.`)
    }
    writeFileSync(p.fichier, p.localApres)
    const { data: relue, error: erreurRelecture } = await db.from('parametres').select('valeur').eq('cle', p.cle).single()
    if (erreurRelecture) throw erreurRelecture
    if (relue.valeur !== p.distantApres) throw new Error(`[${p.cle}] relecture : l’exemplaire distant diffère de ce qu’on a écrit.`)
    console.log(`[${p.cle}] écrit dans Supabase et dans le miroir, et relu.`)
  }
}
