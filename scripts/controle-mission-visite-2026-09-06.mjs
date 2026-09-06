/**
 * Ouvre la mission « La visite — le tutoriel de première ouverture » dans le centre de
 * contrôle. Demande de l'auteur du 6 septembre 2026 : « mettre à jour le tuto plus
 * tard ; revoir les textes du tuto ».
 *
 * La doctrine est à la charte, § 46 ; la mécanique dans AGENTS.md, § « LA VISITE ». Ce
 * qui vit ici est ce qui RESTE À FAIRE : une doctrine ne tient pas le compte des tâches.
 *
 * ⛔ Chaque tâche tient sous 600 signes : au-delà, `nettoyerTodos` (app/api/admin/
 * controle-todos/route.ts) la jetterait silencieusement au premier enregistrement fait
 * depuis l'écran. Le script le vérifie avant d'écrire.
 *
 * ⚠️ Une section neuve NE PARAÎT PAS toute seule : les cartes sont écrites en dur dans
 * app/admin/controle/statistiques/page.tsx, et `sec(cle)` va y chercher la ligne. La
 * carte est posée dans le même commit que ce script.
 *
 * Usage : node --env-file=.env.local scripts/controle-mission-visite-2026-09-06.mjs [--dry]
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const racine = resolve(import.meta.dirname, '..')
const essaiSeul = process.argv.includes('--dry')
const CLE = 'visite'
const LIMITE_TACHE = 600

const commentaire = [
  "Quatre visites servies au 6 septembre 2026 : l'accueil (sept arrêts, seule à expliquer la barre), la Bible classique (sept), la Polyglotte (sept) et la Bibliothèque (cinq). Vingt-six arrêts en tout, chacun portant un titre et deux ou trois paragraphes. La doctrine est à la charte, § 46 ; la mécanique dans AGENTS.md, § « LA VISITE ». Le bouton « Visite » de la barre les rejoue, et il paraît pour tout le monde depuis le 6 septembre au soir, sur les seules pages qui en offrent une.",
  '',
  "Mission ouverte le 6 septembre 2026, à la demande de l'auteur : revoir les TEXTES des arrêts, et reprendre les visites plus tard, à mesure que les pages changent.",
  '',
  "⚠️ Les textes ont été écrits arrêt par arrêt, au fil de la pose des quatre visites, et jamais relus d'un trait. C'est cette relecture-là qui manque : le ton d'une visite se juge en la parcourant ENTIÈRE, non arrêt par arrêt, et quatre visites écrites en deux jours n'ont jamais été confrontées les unes aux autres — ni leurs formules d'ouverture, ni la longueur de leurs paragraphes, ni ce qu'elles promettent.",
  '',
  "⛔ Et une visite DÉCRIT une page : elle vieillit dès que la page bouge, sans que rien ne le signale. Ni les types, ni les tests, ni aucune garde ne voient qu'un repère `data-visite` a disparu d'un composant refondu — l'arrêt sort alors du parcours en silence — ni qu'un arrêt décrit un volet qui n'existe plus. La reprise suit donc chaque refonte d'interface, et c'est ce que cette mission tient ouvert.",
  '',
  "⚠️ Quatre pages ont leur visite. Les autres — l'œuvre, la recherche, la Communauté, l'espace du lecteur, la bibliographie — n'en ont aucune, et rien ne dit encore si elles en veulent une.",
].join('\n')

const taches = [
  "⏳ [visite-textes] Revoir les TEXTES des vingt-six arrêts, d'un trait et visite par visite. Ils ont été écrits au fil de la pose, jamais relus ensemble : à contrôler, la formule d'ouverture de chaque visite, la longueur des paragraphes (deux ou trois par arrêt, une idée par paragraphe), l'écart entre ce qu'un arrêt promet et ce que la page montre vraiment, et le ton — une visite MONTRE, elle n'explique pas ce qui est déjà écrit à l'écran. ⚠️ Se relit dans la page, en jouant la visite, jamais dans le fichier de scénario : un arrêt se juge avec son cadre et sa case sous les yeux.",
  "⏳ [visite-mise-a-jour] Reprendre les visites après les changements d'interface. Une visite décrit une page et vieillit avec elle, sans qu'aucune garde ne le dise : un repère `data-visite` retiré d'un composant fait sortir son arrêt du parcours EN SILENCE, et un arrêt qui décrit un volet refondu ment sans se plaindre. ⚠️ À rejouer après toute refonte de l'un des quatre écrans — accueil, Bible classique, Polyglotte, Bibliothèque — et à étendre aux pages qui n'ont pas encore de visite, si l'auteur en veut.",
]

for (const t of taches) {
  if (t.length > LIMITE_TACHE) throw new Error(`Tâche de ${t.length} signes, ${LIMITE_TACHE} au plus : ${t.slice(0, 70)}…`)
}

const env = Object.fromEntries(
  readFileSync(resolve(racine, '.env.local'), 'utf8').split(/\r?\n/u)
    .map(l => l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/u)).filter(Boolean)
    .map(m => [m[1], m[2].replace(/^["']|["']$/gu, '')]),
)
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

const ligne = {
  cle: CLE,
  titre: 'La visite — le tutoriel de première ouverture',
  ordre: 13,
  commentaire_ia: commentaire,
  todos: taches.map(texte => ({ texte, fait: false })),
  maj_le: new Date().toISOString(),
}

console.log(JSON.stringify({ cle: CLE, taches: taches.length, signes: taches.map(t => t.length), note: commentaire.length, essai_seul: essaiSeul }, null, 2))
if (essaiSeul) {
  console.log('Essai seul : rien n’a été écrit.')
  process.exit(0)
}

const { error } = await db.from('controle_sections').upsert(ligne, { onConflict: 'cle' })
if (error) throw error

const { data: relu, error: erreurRelecture } = await db
  .from('controle_sections')
  .select('cle, titre, ordre, todos, commentaire_ia')
  .eq('cle', CLE)
  .single()
if (erreurRelecture) throw erreurRelecture
if (relu.todos.length !== taches.length) throw new Error('Les tâches relues ne correspondent pas.')
if (relu.commentaire_ia !== commentaire) throw new Error('La note relue ne correspond pas.')

console.log(`Section « ${relu.titre} » ouverte (${relu.todos.length} tâches, ordre ${relu.ordre}).`)
