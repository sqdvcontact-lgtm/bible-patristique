// Lecture intégrale de l'Homélie IV au peuple d'Antioche (A0014O0038,
// segments 524-626). Les notes [[88]] à [[111]] sont résolues par le contenu.
// Les types 2, 3 et 4 sont des décisions de lecture, jamais une extraction.
// Les traitements continus de Job 1-2 et Daniel 3 reçoivent un lien de
// commentaire sur chacun de leurs segments, en plus des cibles versifiées.
//
//   node scripts/chrysostome-antioche-hom4-lecture.mjs --dry
//   node scripts/chrysostome-antioche-hom4-lecture.mjs --write

import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((ligne) => ligne.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((m) => [m[1], m[2].replace(/^["']|["']$/g, '')]))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const WRITE = process.argv.includes('--write')
const OEUVRE = 'A0014O0038'
const P = 'probable'

// [segment_numero, canon_id, type, motif]
const VERSETS = [
  [532, 'PSA.125.5', 1, 'citation : ceux qui sèment dans les larmes moissonneront dans la joie ; note [[88]]'],
  [534, 'JER.4.3', 1, 'citation : ne pas semer sur les épines mais défricher une terre nouvelle ; note [[89]]'],
  [536, 'JOL.2.13', 1, 'citation : déchirer les cœurs et non les vêtements ; note [[90]]'],

  [549, 'MAT.7.24', 1, 'citation de l’homme sage qui bâtit sa maison sur le roc ; note [[91]]'],
  [550, 'MAT.7.25', 1, 'suite de la citation : pluie, torrents et vents ne renversent pas la maison fondée sur le roc'],
  [550, 'MAT.7.26', 1, 'citation contrastée de l’insensé qui bâtit sa maison sur le sable ; note [[92]]'],
  [551, 'MAT.7.27', 1, 'fin de la citation : la maison est renversée et sa ruine est grande'],
  [551, 'MAT.7.24', 3, 'commentaire du contraste entre les deux constructeurs soumis aux mêmes épreuves'],
  [551, 'MAT.7.26', 3, 'commentaire du contraste entre les deux constructeurs soumis aux mêmes épreuves'],
  [552, 'MAT.7.24', 3, 'interprétation du ferme édifice comme l’âme qui pratique les commandements'],
  [552, 'MAT.7.26', 3, 'interprétation inverse du fondement qui manque à l’âme négligente'],

  [553, 'JOB.1.16', 3, 'le feu tombé du ciel sur les troupeaux de Job est interprété comme la pluie sur la maison ; note [[93]]'],
  [554, 'JOB.2.9', 3, 'les paroles de la femme de Job sont interprétées comme les vents contre la maison ; note [[94]]'],
  [555, 'JOB.1.21', 1, 'citation : Dieu a donné, Dieu ôte, que son nom soit béni'],
  [556, 'ROM.5.3', 1, 'citation de Paul : l’affliction produit la patience ; note [[96]] déplacée'],
  [556, 'ROM.5.4', 1, 'suite de la citation : la patience produit l’épreuve et l’épreuve l’espérance'],

  [572, 'DAN.3.94', 3, 'commentaire de la conservation des corps, cheveux et vêtements dans la fournaise'],
  [572, 'ACT.19.12', 2, 'paraphrase des linges ayant touché Paul qui guérissaient les malades ; note [[97]] imprimée « Lact. 19 »'],
  [573, 'ACT.5.15', 2, 'paraphrase de l’ombre de Pierre qui couvrait les malades ; note [[98]] « Ibid. 5 »'],
  [584, 'DAN.3.2', 1, 'récit annoncé par « il est dit » : convocation des grands à la dédicace de la statue ; note [[99]]'],
  [589, 'DAN.3.4', 1, 'citation narrative du héraut proclamant l’ordre royal à haute voix'],
  [589, 'DAN.3.5', 1, 'suite de la proclamation : au son des instruments, tous doivent adorer la statue'],
  [590, 'DAN.3.6', 1, 'suite de la proclamation : le réfractaire sera jeté dans la fournaise'],
  [597, 'DAN.3.12', 2, 'paraphrase de l’accusation contre les trois Juifs élevés aux charges de Babylone ; note [[100]] déplacée'],
  [599, 'DAN.3.18', 1, 'citation de la profession des trois jeunes gens refusant les dieux et la statue'],

  [605, 'GEN.3.23', 3, 'Adam chassé du paradis après sa faute sert à montrer que le lieu ne protège pas sans vertu'],
  [606, 'MAT.10.16', 1, 'citation du précepte évangélique : être prudent comme le serpent ; note [[102]] déplacée'],
  [607, 'MAT.10.16', 3, 'commentaire de la prudence du serpent qui expose son corps pour sauver sa tête'],
  [608, 'JOB.42.10', 2, 'rappel de la restauration de Job et du double rendu après son épreuve'],
  [608, 'JOB.42.12', 2, 'rappel des biens de Job accrus dans son dernier état'],
  [608, 'JOB.42.13', 2, 'rappel du nombre de ses enfants rétabli après l’épreuve'],
  [611, 'ROM.6.13', 2, 'reprise des membres comme armes de justice et non d’iniquité'],

  [613, 'PSA.56.5', 2, 'reprise de la langue comme glaive tranchant ; note [[103]] déplacée depuis le segment précédent'],
  [613, 'PSA.44.2', 4, 'écho positif de la langue du psalmiste mise au service de la louange ; note [[104]]'],
  [613, 'PRO.18.21', 2, 'paraphrase : la langue travaille tantôt pour la vie, tantôt pour la mort ; la note [[105]] imprimée « Psal. 9 » est fautive'],
  [614, 'PSA.9.28', 2, 'paraphrase de la bouche pleine de malédiction et d’amertume ; véritable cible de la note [[105]]'],
  [614, 'PSA.48.4', 2, 'paraphrase de la bouche qui profère la sagesse ; note [[106]] imprimée « Ibid. 48 »'],
  [614, 'PSA.25.10', 2, 'paraphrase des mains souillées d’iniquité ; note [[107]]'],
  [614, 'PSA.140.2', 4, 'écho des mains élevées comme sacrifice du soir dans la prière'],
  [615, 'PSA.11.3', 2, 'paraphrase des lèvres qui parlent avec un cœur double ; note [[108]] imprimée « Psal. 14 »'],
  [615, 'PSA.44.2', 4, 'écho du cœur bon et sincère qui produit une bonne parole ; note [[109]] déplacée'],
  [615, 'PSA.57.5', 2, 'paraphrase de l’aspic sourd qui bouche ses oreilles ; note [[110]] déplacée'],
  [615, 'PSA.48.5', 2, 'paraphrase de l’oreille du psalmiste inclinée vers la parabole sacrée ; note [[111]] imprimée « Ibid. 57 »'],
]

// [segment_numero, livre, chapitre, motif]
const CHAPITRES = [
  ...[553, 554, 555, 557, 558, 559, 560].map((numero) => [numero, 'JOB', 1,
    'commentaire continu de l’épreuve de Job : pertes, messagers, persévérance et comparaison avec Antioche']),
  ...[553, 554, 555, 557, 558, 559, 560].map((numero) => [numero, 'JOB', 2,
    'commentaire continu de l’épreuve de Job : attaque de Satan, femme de Job et constance dans les maux']),
  ...Array.from({ length: 35 }, (_, i) => [569 + i, 'DAN', 3,
    'commentaire continu de Daniel 3 : les trois jeunes gens, la statue, la fournaise et leur victoire']),
]

const { data: segments, error: erreurSegments } = await sb.from('segments')
  .select('id, id_oeuvre, segment_numero').eq('id_oeuvre', OEUVRE)
  .gte('segment_numero', 524).lte('segment_numero', 626).order('segment_numero')
if (erreurSegments) throw erreurSegments
if (segments.length !== 103) throw new Error(`103 segments attendus, ${segments.length} trouvés`)
const parNumero = new Map(segments.map((s) => [s.segment_numero, s.id]))

const cibles = [...new Set(VERSETS.map((l) => l[1]))]
const presentes = new Set()
for (let i = 0; i < cibles.length; i += 200) {
  const { data, error } = await sb.from('versets_lecture').select('id_verset').in('id_verset', cibles.slice(i, i + 200))
  if (error) throw error
  for (const v of data ?? []) presentes.add(v.id_verset)
}
const absentes = cibles.filter((c) => !presentes.has(c))
if (absentes.length) throw new Error(`Cibles absentes : ${absentes.join(', ')}`)

const chapitresPresents = new Set()
for (const [, livre, chapitre] of CHAPITRES) {
  const cle = `${livre}.${chapitre}`
  if (chapitresPresents.has(cle)) continue
  const { count, error } = await sb.from('versets_canon').select('id', { count: 'exact', head: true })
    .eq('livre', livre).eq('ch_canon', chapitre)
  if (error) throw error
  if (!count) throw new Error(`Chapitre cible absent : ${cle}`)
  chapitresPresents.add(cle)
}

const rows = [
  ...VERSETS.map(([numero, canon_id, type, motif]) => ({
    segment_id: parNumero.get(numero), canon_id, livre: null, chapitre: null,
    type, fiabilite: P, motif, provenance: 'lecture', arbitrage_requis: false,
  })),
  ...CHAPITRES.map(([numero, livre, chapitre, motif]) => ({
    segment_id: parNumero.get(numero), canon_id: null, livre, chapitre,
    type: 3, fiabilite: P, motif, provenance: 'lecture', arbitrage_requis: false,
  })),
]
if (rows.some((l) => !l.segment_id)) throw new Error('Un numéro de segment du relevé est absent')

const cleLien = (l) => `${l.segment_id}|${l.canon_id ?? `${l.livre}.${l.chapitre}`}|${l.type}`
const cles = rows.map(cleLien)
if (new Set(cles).size !== cles.length) throw new Error('Doublon interne dans le relevé')

const parType = rows.reduce((a, l) => ({ ...a, [l.type]: (a[l.type] ?? 0) + 1 }), {})
console.log(`${OEUVRE}, Homélie IV : ${rows.length} liens sur ${new Set(rows.map((l) => l.segment_id)).size} segments`)
console.log(`Types : ${JSON.stringify(parType)} · 103 segments intégralement relus`)

const idsSegments = segments.map((s) => s.id)
const { data: existants, error: erreurExistants } = await sb.from('liens_bibliques')
  .select('segment_id, canon_id, livre, chapitre, type').in('segment_id', idsSegments)
if (erreurExistants) throw erreurExistants
const deja = new Set((existants ?? []).map(cleLien))
const aEcrire = rows.filter((l) => !deja.has(cleLien(l)))
console.log(`${aEcrire.length} à écrire ; ${rows.length - aEcrire.length} déjà présents`)

if (!WRITE) {
  console.log('(--dry : rien écrit)')
  process.exit(0)
}

// Correction issue du sondage : le segment 556 cite exclusivement Rm 5,3-4
// avant que le développement sur Job ne reprenne au segment 557. Une continuité
// de sujet ne doit jamais franchir une parenthèse scripturaire autonome.
const segment556 = parNumero.get(556)
const { error: erreurNettoyage } = await sb.from('liens_bibliques').delete()
  .eq('segment_id', segment556).eq('livre', 'JOB').in('chapitre', [1, 2])
  .is('canon_id', null).eq('type', 3).eq('provenance', 'lecture')
  .like('motif', 'commentaire continu de l’épreuve de Job%')
if (erreurNettoyage) throw erreurNettoyage

for (let i = 0; i < aEcrire.length; i += 200) {
  const { error } = await sb.from('liens_bibliques').insert(aEcrire.slice(i, i + 200))
  if (error) throw error
}
const { error: erreurRevue } = await sb.from('segments').update({
  liens_revus_le: new Date().toISOString(),
  liens_revus_par: 'Codex (IA) — lecture intégrale Homélie IV',
}).in('id', idsSegments)
if (erreurRevue) throw erreurRevue

console.log(`✓ ${aEcrire.length} liens écrits ; ${idsSegments.length} segments marqués relus`)
