import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const OEUVRE = 'A0010O0023'
const WRITE = process.argv.includes('--write')
const DETAIL = process.argv.includes('--detail')
const RELECTEUR = 'Codex (IA) - lecture intégrale Heptateuque, Genèse Q. LXI-LXX'
const EMPREINTE_ATTENDUE = '12fce21dac91c40e9d2693440e0aaaad1d5a6e08aa81d39f3528e1c9b9bd673b'
const QUESTIONS = [
  'Question LXI', 'Question LXII', 'Question LXIII', 'Question LXIV', 'Question LXV',
  'Question LXVI', 'Question LXVII', 'Question LXVIII', 'Question LXIX', 'Question LXX',
]

// Partition exhaustive du lot : tout segment 186-220 est lié.
const SANS_LIEN = new Set()

// [segment_numero, canon_id, type, motif]
// Les types sont sémantiques : 1 citation rapportée, 2 reprise fondue,
// 3 commentaire précis. Aucun type 4 n'est forcé dans ce lot.
const LIENS = [
  [186, 'GEN.23.7', 1, 'Citation explicite vérifiée de la prosternation d’Abraham devant les fils de Heth.'],
  [186, 'GEN.23.7', 3, 'Question précise sur la compatibilité de Genèse 23,7 avec le culte réservé à Dieu.'],
  [186, 'DEU.6.13', 1, 'Citation scripturaire intentionnelle vérifiée du commandement de servir Dieu seul.'],
  [186, 'DEU.6.13', 3, 'Le commandement de Deutéronome 6,13 est confronté à la prosternation d’Abraham.'],
  [187, 'GEN.23.7', 3, 'La prosternation d’Abraham est distinguée du culte de latrie dû à Dieu seul.'],
  [187, 'DEU.6.13', 1, 'Reprise explicite vérifiée de « tu ne serviras que lui ».'],
  [187, 'DEU.6.13', 3, 'Distinction lexicale entre adoration et service de latrie dans Deutéronome 6,13.'],
  [188, 'REV.19.10', 1, 'Référence intentionnelle vérifiée à l’ange qui refuse l’adoration et ordonne d’adorer Dieu.'],
  [188, 'REV.19.10', 3, 'Apocalypse 19,10 est expliqué comme refus d’une adoration qui confondrait l’ange avec Dieu.'],
  [188, 'GEN.23.7', 3, 'Le refus de l’ange sert à préciser pourquoi l’hommage d’Abraham n’était pas une latrie.'],
  [189, 'REV.19.10', 3, 'L’éclat de l’ange explique le danger d’une adoration rendue à sa place comme à Dieu.'],

  [190, 'GEN.24.2', 1, 'Référence intentionnelle vérifiée à la main placée sous la cuisse d’Abraham.'],
  [190, 'GEN.24.2', 3, 'Le geste de Genèse 24,2 est interprété comme prophétie de la chair issue d’Abraham.'],
  [190, 'GEN.24.3', 1, 'Citation intentionnelle vérifiée du serment par le Seigneur Dieu du ciel et de la terre.'],
  [190, 'GEN.24.3', 3, 'Le titre divin du serment de Genèse 24,3 est rapporté prophétiquement au Christ.'],
  [191, 'GEN.24.2', 3, 'La cuisse d’Abraham est interprétée comme signe de la chair dont le Christ devait naître.'],
  [191, 'GEN.24.3', 3, 'Le Seigneur du ciel et de la terre nommé dans le serment est identifié au Christ.'],

  [192, 'GEN.24.12', 1, 'Référence intentionnelle vérifiée à la prière du serviteur demandant à Dieu un signe.'],
  [192, 'GEN.24.12', 3, 'La prière de Genèse 24,12 ouvre la question sur la légitimité de demander un prodige.'],
  [192, 'GEN.24.14', 1, 'Citation explicite vérifiée du signe proposé : boire et abreuver les chameaux.'],
  [192, 'GEN.24.14', 3, 'Le signe précis de Genèse 24,14 est comparé aux augures interdits.'],
  [193, 'GEN.24.12', 3, 'La demande adressée à Dieu est distinguée d’une observation superstitieuse.'],
  [193, 'GEN.24.14', 3, 'Le prodige demandé en Genèse 24,14 sert de cas à la question de savoir si l’on tente Dieu.'],
  [194, 'DEU.6.16', 1, 'Citation explicite vérifiée du précepte : « Tu ne tenteras pas le Seigneur ton Dieu ».'],
  [194, 'DEU.6.16', 3, 'Le précepte de Deutéronome 6,16 fixe le critère de la demande de signe illégitime.'],
  [194, 'MAT.4.7', 1, 'Citation intentionnelle vérifiée de la réponse du Christ au tentateur.'],
  [194, 'MAT.4.7', 3, 'La réponse du Christ en Matthieu 4,7 illustre l’interdiction de tenter Dieu.'],
  [194, 'GEN.24.12', 3, 'La prière du serviteur est examinée à la lumière de l’interdiction de tenter Dieu.'],
  [194, 'GEN.24.14', 3, 'Le signe demandé par le serviteur est distingué d’une mise à l’épreuve sans raison.'],
  [195, 'MAT.4.6', 3, 'La demande du démon de prouver la puissance du Christ est qualifiée de tentation mauvaise.'],
  [195, 'MAT.4.7', 3, 'La réponse du Christ explique pourquoi la preuve exigée par le démon était mauvaise.'],
  [195, 'JDG.6.17', 1, 'Référence intentionnelle vérifiée au signe demandé par Gédéon avant le combat.'],
  [195, 'JDG.6.17', 3, 'Le signe demandé par Gédéon est interprété comme consultation de Dieu et non tentation.'],
  [195, 'GEN.24.12', 3, 'La demande du serviteur est rapprochée d’une consultation légitime de Dieu.'],
  [195, 'GEN.24.14', 3, 'Le signe de Genèse 24,14 est opposé à la tentation démoniaque du Christ.'],
  [196, 'ISA.7.11', 1, 'Référence intentionnelle vérifiée à l’ordre divin donné à Achaz de demander un signe.'],
  [196, 'ISA.7.11', 3, 'Isaïe 7,11 montre qu’une demande de signe peut être légitime sur ordre de Dieu.'],
  [196, 'ISA.7.12', 1, 'Référence intentionnelle vérifiée au refus d’Achaz de demander un signe par crainte de tenter Dieu.'],
  [196, 'ISA.7.12', 3, 'Le refus d’Achaz est expliqué par sa compréhension du précepte contre la tentation.'],
  [196, 'DEU.6.16', 3, 'Le précepte de ne pas tenter Dieu éclaire la réponse d’Achaz.'],

  [197, 'GEN.24.37', 1, 'Citation explicite vérifiée de l’interdiction de prendre une épouse chananéenne.'],
  [197, 'GEN.24.37', 3, 'La formulation rapportée en Genèse 24,37 est comparée à l’ordre initial.'],
  [197, 'GEN.24.38', 1, 'Citation explicite vérifiée de l’ordre d’aller dans la maison et la parenté du père.'],
  [197, 'GEN.24.38', 3, 'La formulation rapportée en Genèse 24,38 est comparée à l’ordre initial.'],
  [197, 'GEN.24.3', 3, 'L’ordre initial de Genèse 24,3 est confronté au récit qu’en fait le serviteur.'],
  [197, 'GEN.24.4', 3, 'L’ordre initial de Genèse 24,4 est confronté à sa reformulation en Genèse 24,38.'],
  [198, 'GEN.24.3', 3, 'Les mots de l’ordre initial sont comparés à ceux du récit du serviteur.'],
  [198, 'GEN.24.4', 3, 'Le sens de l’ordre d’aller dans la parenté demeure malgré la variation des mots.'],
  [198, 'GEN.24.37', 3, 'Genèse 24,37 sert d’exemple de concordance de pensée sans identité verbale.'],
  [198, 'GEN.24.38', 3, 'Genèse 24,38 sert d’exemple de concordance de pensée sans identité verbale.'],
  [199, 'GEN.24.3', 3, 'La variation interne du récit montre que la vérité ne dépend pas d’une répétition mot à mot.'],
  [199, 'GEN.24.4', 3, 'L’ordre initial illustre la primauté des choses et de l’intention sur l’identité des paroles.'],
  [199, 'GEN.24.37', 3, 'La reprise de l’ordre par le même auteur fonde l’argument sur la vérité du récit.'],
  [199, 'GEN.24.38', 3, 'La reformulation par le même auteur confirme l’accord de pensée malgré les mots différents.'],

  [200, 'GEN.24.41', 1, 'Citation explicite vérifiée de la décharge du serment, avec la variante grecque « malédiction ».'],
  [200, 'GEN.24.41', 3, 'Question lexicale précise sur la variante serment ou malédiction en Genèse 24,41.'],
  [201, 'GEN.24.41', 3, 'Explication étymologique du rapport entre le serment et la malédiction en Genèse 24,41.'],

  [202, 'GEN.24.49', 1, 'Citation explicite vérifiée de la demande de miséricorde et de vérité envers Abraham.'],
  [202, 'GEN.24.49', 3, 'Miséricorde et vérité de Genèse 24,49 sont interprétées comme miséricorde et justice.'],

  [203, 'GEN.24.51', 1, 'Citation explicite vérifiée de la remise de Rébecca selon la parole du Seigneur.'],
  [203, 'GEN.24.51', 3, 'Question précise sur la parole divine invoquée en Genèse 24,51.'],
  [204, 'GEN.24.51', 3, 'Deux interprétations sont proposées pour « selon ce que le Seigneur a dit ».'],
  [204, 'GEN.24.7', 3, 'La parole d’Abraham sur l’ange et l’épouse est examinée comme possible prophétie.'],
  [204, 'GEN.24.42', 3, 'Le récit du signe demandé par le serviteur ouvre la seconde interprétation de la parole divine.'],
  [204, 'GEN.24.43', 3, 'La condition énoncée près de la source appartient au signe rapporté aux parents de Rébecca.'],
  [204, 'GEN.24.44', 3, 'La réponse attendue de la jeune fille précise le signe attribué au Seigneur.'],
  [204, 'GEN.24.45', 3, 'L’arrivée de Rébecca accomplit le signe que le serviteur rapporte.'],
  [204, 'GEN.24.46', 3, 'L’abreuvement du serviteur et des chameaux achève le signe attribué au Seigneur.'],
  [205, 'GEN.24.51', 3, 'La certitude prophétique est utilisée pour écarter la première interprétation de Genèse 24,51.'],
  [205, 'GEN.24.7', 3, 'La parole d’Abraham est jugée conditionnelle et non une prophétie certaine sur Rébecca.'],
  [205, 'GEN.24.8', 2, 'La condition libérant le serviteur de son serment est reprise dans le discours de l’auteur.'],
  [205, 'GEN.24.8', 3, 'La clause de décharge de Genèse 24,8 montre que la parole d’Abraham ne désignait pas sûrement Rébecca.'],

  [206, 'GEN.24.60', 1, 'Citation explicite vérifiée de la bénédiction adressée à Rébecca par ses frères.'],
  [206, 'GEN.24.60', 3, 'La bénédiction de Genèse 24,60 est expliquée comme connaissance des promesses faites à Abraham.'],
  [206, 'GEN.22.17', 3, 'La multiplication de la descendance et la possession des portes ennemies expliquent les souhaits de Genèse 24,60.'],

  [207, 'GEN.24.63', 1, 'Citation explicite vérifiée de la sortie d’Isaac dans la campagne pour méditer.'],
  [207, 'GEN.24.63', 3, 'Question lexicale précise sur le sens de l’exercice ou de la méditation d’Isaac.'],
  [208, 'GEN.24.63', 3, 'Le verbe grec de Genèse 24,63 est interprété comme exercice de l’esprit.'],
  [209, 'GEN.24.63', 3, 'Les traductions du verbe de Genèse 24,63 sont comparées pour dégager le sens de méditation.'],
  [210, 'GEN.24.63', 3, 'Conclusion prudente de l’examen lexical du verbe grec de Genèse 24,63.'],

  [211, 'GEN.25.1', 1, 'Citation explicite vérifiée du mariage d’Abraham avec Céthura.'],
  [211, 'GEN.25.1', 3, 'Question morale précise sur le remariage d’Abraham en Genèse 25,1.'],
  [212, 'GEN.25.2', 2, 'La naissance d’autres enfants de Céthura est reprise dans le raisonnement de l’auteur.'],
  [212, 'GEN.25.1', 3, 'Le remariage avec Céthura est expliqué par la fécondité d’Abraham après le miracle.'],
  [212, 'GEN.25.2', 3, 'Les enfants de Céthura servent à discuter la persistance du don reçu par Abraham.'],
  [212, 'ROM.4.19', 3, 'Le corps d’Abraham comme revenu à la vie reprend l’interprétation de Romains 4,19 exposée plus haut.'],
  [213, 'GEN.25.1', 3, 'Le remariage de Genèse 25,1 est expliqué naturellement par l’union d’un vieillard et d’une femme jeune.'],
  [213, 'GEN.18.11', 3, 'La vieillesse et la stérilité de Sara en Genèse 18,11 distinguent la naissance miraculeuse d’Isaac.'],
  [213, 'ROM.4.19', 3, 'Romains 4,19 éclaire l’impossibilité propre à l’union d’Abraham avec Sara âgée.'],
  [214, 'GEN.25.8', 1, 'Citation intentionnelle vérifiée de l’expression scripturaire « plein de jours ».'],
  [214, 'GEN.25.8', 3, 'L’expression « plein de jours » sert à préciser le vocabulaire de la vieillesse d’Abraham.'],
  [214, 'GEN.24.1', 3, 'Abraham vieux et avancé en jours fournit le fondement lexical de « presbyter ».'],
  [214, 'GEN.25.1', 3, 'La qualification d’Abraham comme ancien éclaire son âge lors du mariage avec Céthura.'],
  [215, 'GEN.24.1', 3, 'La distinction entre vieillard et ancien développe le vocabulaire appliqué à Abraham.'],
  [215, 'GEN.25.1', 3, 'La distinction lexicale explique comment Abraham peut être dit ancien lors de son remariage.'],
  [216, 'GEN.24.1', 3, 'L’usage scripturaire de « presbyter » est précisé par opposition aux plus jeunes.'],
  [216, 'GEN.25.1', 3, 'La précision sur « ancien » poursuit l’explication de l’âge d’Abraham en Genèse 25,1.'],
  [217, 'GEN.25.2', 2, 'Les enfants directs de Céthura sont repris dans le discours sur la postérité d’Abraham.'],
  [217, 'GEN.25.2', 3, 'La descendance de Genèse 25,2 ouvre la recherche d’une intention prophétique.'],
  [217, 'GEN.25.3', 2, 'La suite de la descendance de Céthura est absorbée dans le décompte évoqué par l’auteur.'],
  [217, 'GEN.25.3', 3, 'La généalogie de Genèse 25,3 participe à l’examen du dessein d’Abraham.'],
  [217, 'GEN.25.4', 2, 'La fin de la généalogie de Céthura est reprise dans la mention globale des enfants.'],
  [217, 'GEN.25.4', 3, 'La généalogie de Genèse 25,4 participe à la recherche d’un sens prophétique.'],
  [218, 'GAL.4.22', 1, 'Référence intentionnelle vérifiée aux deux fils d’Abraham, explicitement attribuée à l’Apôtre et signalée par la note.'],
  [218, 'GAL.4.22', 3, 'Galates 4,22 fonde l’interprétation prophétique de la conduite d’Abraham envers Agar.'],
  [218, 'GAL.4.23', 1, 'Référence intentionnelle vérifiée à la naissance selon la chair ou la promesse dans le passage attribué à l’Apôtre.'],
  [218, 'GAL.4.23', 3, 'La naissance selon la chair ou la promesse éclaire l’histoire d’Agar et Sara.'],
  [218, 'GAL.4.24', 1, 'Référence intentionnelle vérifiée aux deux femmes figurant les deux Testaments dans le passage attribué à l’Apôtre.'],
  [218, 'GAL.4.24', 3, 'L’allégorie explicite de Galates 4,24 justifie la lecture prophétique de l’histoire d’Agar.'],
  [218, 'GEN.25.1', 3, 'L’allégorie d’Agar sert de précédent à la recherche d’un sens analogue pour Céthura.'],
  [219, 'GEN.25.1', 3, 'Le remariage avec Céthura demeure l’objet de la recherche d’une signification allégorique.'],
  [220, 'GEN.25.5', 2, 'Le don de tout l’héritage à Isaac est repris dans l’allégorie proposée par l’auteur.'],
  [220, 'GEN.25.5', 3, 'L’héritage donné à Isaac est interprété comme charité et vie éternelle des enfants de la promesse.'],
  [220, 'GEN.25.6', 2, 'Les présents faits aux fils des concubines sont repris dans le discours allégorique.'],
  [220, 'GEN.25.6', 3, 'Les présents de Genèse 25,6 sont interprétés comme dons sacramentels ou miraculeux sans héritage.'],
  [220, 'GAL.4.28', 2, 'L’expression paulinienne « enfants de la promesse » est fondue dans l’interprétation d’Isaac.'],
]

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((ligne) => ligne.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]))
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const { data: segments, error: erreurSegments } = await supabase.from('segments')
  .select('id,segment_numero,segment_texte,notes,ref_niv1,ref_niv2,ref_niv2_texte,liens_revus_le,liens_revus_par')
  .eq('id_oeuvre', OEUVRE).eq('ref_niv1', 'Livre premier').in('ref_niv2', QUESTIONS).order('segment_numero')
if (erreurSegments) throw erreurSegments
if (segments.length !== 35 || segments[0]?.segment_numero !== 186 || segments.at(-1)?.segment_numero !== 220) {
  throw new Error(`Préétat : lot inattendu (${segments.length}, ${segments[0]?.segment_numero}-${segments.at(-1)?.segment_numero})`)
}
if (segments.some((segment, index) => segment.segment_numero !== 186 + index)) throw new Error('Préétat : numérotation non continue')
if (segments.some((segment) => segment.ref_niv1 !== 'Livre premier' || !QUESTIONS.includes(segment.ref_niv2))) {
  throw new Error('Préétat : fuite structurelle hors Genèse LXI-LXX')
}
const questionsTrouvees = new Set(segments.map((segment) => segment.ref_niv2))
if (questionsTrouvees.size !== QUESTIONS.length || QUESTIONS.some((question) => !questionsTrouvees.has(question))) {
  throw new Error('Préétat : les dix questions attendues ne sont pas toutes présentes')
}
if (segments.some((segment) => segment.liens_revus_le || segment.liens_revus_par)) throw new Error('Préétat : un segment est déjà marqué relu')

const empreinte = createHash('sha256').update(JSON.stringify(segments.map((segment) => [
  segment.id, segment.segment_numero, segment.ref_niv1, segment.ref_niv2,
  segment.ref_niv2_texte, segment.segment_texte, segment.notes,
]))).digest('hex')
if (empreinte !== EMPREINTE_ATTENDUE) throw new Error(`Préétat : texte ou structure modifié (${empreinte})`)

const parNumero = new Map(segments.map((segment) => [segment.segment_numero, segment]))
const numerosLies = new Set(LIENS.map(([numero]) => numero))
const nonClasses = segments.filter((segment) => !numerosLies.has(segment.segment_numero) && !SANS_LIEN.has(segment.segment_numero))
if (nonClasses.length) throw new Error(`Partition incomplète : ${nonClasses.map((segment) => segment.segment_numero).join(', ')}`)
if ([...SANS_LIEN].some((numero) => numerosLies.has(numero) || !parNumero.has(numero))) throw new Error('Déclaration SANS_LIEN incohérente')
if (LIENS.some(([numero, canon, type, motif]) => !parNumero.has(numero) || !canon || ![1, 2, 3, 4].includes(type) || !motif.trim())) {
  throw new Error('Manifeste invalide')
}
const cles = LIENS.map(([numero, canon, type]) => `${numero}|${canon}|${type}`)
if (new Set(cles).size !== cles.length) throw new Error('Doublon interne segment/cible/type')

const cibles = [...new Set(LIENS.map(([, canon]) => canon))]
const { data: temoins, error: erreurTemoins } = await supabase.from('versets_lecture')
  .select('id_verset,ref,"TR0001","TR0003","TR0004"').in('id_verset', cibles)
if (erreurTemoins) throw erreurTemoins
const parCible = new Map(temoins.map((temoin) => [temoin.id_verset, temoin]))
const absents = cibles.filter((cible) => !parCible.has(cible))
if (absents.length) throw new Error(`Cibles absentes : ${absents.join(', ')}`)
const sansTexte = cibles.filter((cible) => {
  const temoin = parCible.get(cible)
  return !temoin.TR0001 && !temoin.TR0003 && !temoin.TR0004
})
if (sansTexte.length) throw new Error(`Cibles sans témoin lisible : ${sansTexte.join(', ')}`)

const ids = segments.map((segment) => segment.id)
const { count: existants, error: erreurExistants } = await supabase.from('liens_bibliques')
  .select('id', { count: 'exact', head: true }).in('segment_id', ids)
if (erreurExistants) throw erreurExistants
if (existants) throw new Error(`Préétat : ${existants} lien(s) existe(nt) déjà`)

const types = LIENS.reduce((compte, [, , type]) => ({ ...compte, [type]: (compte[type] ?? 0) + 1 }), {})
console.log(JSON.stringify({
  mode: WRITE ? 'écriture' : 'contrôle', lot: 'Genèse LXI-LXX', bornes: [186, 220],
  segments: segments.length, liens: LIENS.length, sans_lien: [...SANS_LIEN],
  cibles_distinctes: cibles.length, types, empreinte,
}, null, 2))

if (DETAIL) {
  for (const [numero, canon, type, motif] of LIENS) {
    const segment = parNumero.get(numero)
    const temoin = parCible.get(canon)
    console.log(JSON.stringify({
      segment_numero: numero, type, canon_id: canon, motif,
      segment_texte: segment.segment_texte,
      temoin: temoin.TR0003 || temoin.TR0001 || temoin.TR0004,
    }, null, 2))
  }
}

if (!WRITE) process.exit(0)

const q = (valeur) => `'${String(valeur).replaceAll("'", "''")}'`
const valeurs = LIENS.map(([numero, canon, type, motif]) =>
  `(${parNumero.get(numero).id},${q(canon)},${type},'vérifié',${q(motif)},'lecture',false)`).join(',\n    ')
const idSql = ids.join(',')
const sql = `do $passe$ declare n integer; begin
  if exists(select 1 from liens_bibliques where segment_id in (${idSql})) then raise exception 'Liens déjà présents'; end if;
  if exists(select 1 from segments where id in (${idSql}) and (liens_revus_le is not null or liens_revus_par is not null)) then raise exception 'Marques déjà présentes'; end if;
  insert into liens_bibliques(segment_id,canon_id,type,fiabilite,motif,provenance,arbitrage_requis) values ${valeurs};
  get diagnostics n=row_count; if n<>${LIENS.length} then raise exception 'Liens %/${LIENS.length}',n; end if;
  update segments set liens_revus_le=now(),liens_revus_par=${q(RELECTEUR)} where id in (${idSql});
  get diagnostics n=row_count; if n<>${segments.length} then raise exception 'Segments %/${segments.length}',n; end if;
end $passe$;`
const { error: erreurEcriture } = await supabase.rpc('exec_sql', { sql })
if (erreurEcriture) throw erreurEcriture

const [{ count: liensApres, error: e1 }, { count: relusApres, error: e2 }, { data: auditLiens, error: e3 }] = await Promise.all([
  supabase.from('liens_bibliques').select('id', { count: 'exact', head: true }).in('segment_id', ids),
  supabase.from('segments').select('id', { count: 'exact', head: true }).in('id', ids).not('liens_revus_le', 'is', null),
  supabase.from('liens_bibliques').select('segment_id,canon_id,type,fiabilite,motif,provenance,arbitrage_requis').in('segment_id', ids),
])
if (e1) throw e1
if (e2) throw e2
if (e3) throw e3
if (liensApres !== LIENS.length || relusApres !== segments.length) throw new Error(`Posté­tat invalide : ${liensApres}/${relusApres}`)
if (auditLiens.some((lien) => !lien.canon_id || !lien.motif || lien.fiabilite !== 'vérifié' || lien.provenance !== 'lecture' || lien.arbitrage_requis)) {
  throw new Error('Postcontrôle qualitatif invalide')
}
const clesApres = auditLiens.map((lien) => `${lien.segment_id}|${lien.canon_id}|${lien.type}`)
if (new Set(clesApres).size !== clesApres.length) throw new Error('Postcontrôle : doublon détecté')
console.log(`✓ ${liensApres} liens vérifiés écrits ; ${relusApres} segments marqués relus`)
