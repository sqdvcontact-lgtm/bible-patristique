import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const OEUVRE = 'A0010O0023'
const REF_NIV1 = 'Livre premier'
const PREMIER_SEGMENT = 221
const DERNIER_SEGMENT = 252
const NB_SEGMENTS = 32
const EMPREINTE_TEXTE = '681f8e120b4ac84218b4612483dc53ccc7ae2b54ea426effa9d75c6c89c0e37d'
const WRITE = process.argv.includes('--write')
const RELECTEUR = 'Codex (IA) — lecture intégrale Heptateuque, Genèse Q. LXXI-LXXX'
const QUESTIONS_ATTENDUES = [
  'Question LXXI', 'Question LXXII', 'Question LXXIII', 'Question LXXIV', 'Question LXXV',
  'Question LXXVI', 'Question LXXVII', 'Question LXXVIII', 'Question LXXIX', 'Question LXXX',
]

// Partition exhaustive : tout segment du lot appartient à LIENS ou à SANS_LIEN.
const SANS_LIEN = new Set([235])

// Manifeste établi après lecture des segments et confrontation aux témoins
// TR0001, TR0003 et TR0004 de versets_lecture.
// [segment_numero, canon_id, type, motif]
const LIENS = [
  [221, 'GEN.25.13', 1, 'Citation intentionnelle vérifiée de la formule donnant les noms des fils d’Ismaël selon leurs générations ; le texte live porte « Israël », anomalie à revoir au fac-similé.'],
  [221, 'GEN.25.13', 3, 'Question lexicale précise sur la formule « selon les noms de leurs générations » en Genèse 25,13.'],
  [222, 'GEN.25.13', 1, 'Reprise explicite vérifiée de la formule « d’après les noms de leurs générations ».'],
  [222, 'GEN.25.13', 3, 'Examen du rapport entre les noms des fils d’Ismaël et ceux des nations issues d’eux.'],
  [223, 'GEN.25.13', 3, 'La postérité nommée en Genèse 25,13 est distinguée des nations qui n’existèrent que plus tard.'],
  [223, 'GEN.25.16', 1, 'Citation explicite vérifiée des douze princes selon leurs peuples ou nations.'],
  [223, 'GEN.25.16', 3, 'Genèse 25,16 sert à préciser comment les descendants d’Ismaël donnèrent leurs noms à leurs peuples.'],

  [224, 'GEN.25.22', 1, 'Référence intentionnelle vérifiée aux enfants qui s’entrechoquent et à Rébecca allant consulter le Seigneur.'],
  [224, 'GEN.25.22', 3, 'Question précise sur le lieu et la médiation de la consultation rapportée en Genèse 25,22.'],
  [225, 'GEN.25.22', 3, 'Recherche de la manière dont Rébecca consulta le Seigneur en Genèse 25,22.'],
  [225, 'GEN.25.23', 3, 'Recherche de la médiation par laquelle la réponse de Genèse 25,23 fut communiquée.'],
  [226, 'GEN.25.22', 3, 'Hypothèses du songe ou d’une médiation sacerdotale pour expliquer la consultation de Genèse 25,22.'],
  [227, 'GEN.25.22', 1, 'Référence intentionnelle vérifiée à Rébecca allant consulter le Seigneur.'],
  [227, 'GEN.25.23', 1, 'Référence intentionnelle vérifiée au Seigneur répondant à Rébecca.'],
  [227, 'GEN.25.22', 3, 'Conclusion prudente : le mode de consultation de Genèse 25,22 demeure inconnu.'],
  [227, 'GEN.25.23', 3, 'La réalité de la réponse divine de Genèse 25,23 est maintenue malgré le silence sur sa médiation.'],

  [228, 'GEN.25.23', 1, 'Citation explicite vérifiée des deux nations et de l’assujettissement de l’aîné au plus jeune.'],
  [228, 'GEN.25.23', 3, 'Ouverture de l’interprétation spirituelle de la réponse donnée à Rébecca en Genèse 25,23.'],
  [229, 'GEN.25.23', 3, 'L’aîné et le plus jeune de Genèse 25,23 figurent respectivement les hommes charnels et spirituels.'],
  [229, '1CO.15.46', 1, 'Citation explicite vérifiée de l’ordre entre ce qui est animal et ce qui est spirituel.'],
  [230, 'GEN.25.23', 3, 'Ésaü et Jacob sont interprétés comme figures des descendances charnelle et spirituelle du peuple de Dieu.'],
  [231, 'GEN.25.23', 3, 'La domination historique d’Israël sur Édom est lue comme accomplissement de Genèse 25,23.'],
  [231, '2SA.8.14', 1, 'Référence intentionnelle vérifiée à l’assujettissement de toute l’Idumée à David.'],
  [232, 'GEN.25.23', 3, 'La révolte d’Édom est mise en rapport avec la prophétie initiale de Genèse 25,23.'],
  [232, '2KI.8.20', 1, 'Référence intentionnelle vérifiée à Édom secouant la domination de Juda sous Joram.'],
  [232, '2KI.8.22', 1, 'Référence intentionnelle vérifiée à la persistance de l’affranchissement d’Édom.'],
  [232, 'GEN.27.40', 1, 'Référence éditoriale vérifiée à la bénédiction annonçant qu’Ésaü secouerait le joug de son frère.'],
  [232, 'GEN.27.40', 3, 'Genèse 27,40 est interprété comme annonce de la révolte historique des Iduméens.'],

  [233, 'GEN.25.27', 1, 'Citation explicite vérifiée de Jacob homme simple, ou sans artifice, demeurant à la maison.'],
  [233, 'GEN.25.27', 3, 'Analyse lexicale du grec ἄπλαστος pour préciser le qualificatif de Jacob en Genèse 25,27.'],
  [234, 'GEN.25.27', 3, 'La simplicité attribuée à Jacob en Genèse 25,27 est confrontée à la ruse de la bénédiction.'],
  [234, 'GEN.27.35', 3, 'La ruse explicitement nommée en Genèse 27,35 fonde le paradoxe interprétatif avec Genèse 25,27.'],

  [236, 'GEN.26.1', 1, 'Citation explicite vérifiée de la famine et du départ d’Isaac vers Abimélech à Gérare.'],
  [236, 'GEN.26.1', 3, 'Question chronologique sur la place du récit de Genèse 26,1.'],
  [236, 'GEN.25.34', 1, 'Référence intentionnelle vérifiée au repas de lentilles et à la vente du droit d’aînesse.'],
  [236, 'GEN.25.34', 3, 'Genèse 25,34 sert de repère pour dater la famine de Genèse 26,1.'],
  [237, 'GEN.26.1', 3, 'L’identité d’Abimélech sert à éprouver l’hypothèse d’une récapitulation en Genèse 26,1.'],
  [237, 'GEN.25.34', 3, 'La vente du droit d’aînesse demeure le repère narratif auquel le départ d’Isaac est comparé.'],
  [237, 'GEN.20.2', 1, 'Référence intentionnelle vérifiée au premier Abimélech prenant Sara.'],
  [237, 'GEN.21.22', 1, 'Référence intentionnelle vérifiée à Abimélech accompagné de Phicol, chef de son armée, auprès d’Abraham.'],
  [238, 'GEN.26.1', 3, 'Le calcul des âges évalue la possibilité que l’Abimélech de Genèse 26,1 soit le même personnage.'],
  [238, 'GEN.21.32', 1, 'Référence intentionnelle vérifiée à l’alliance conclue entre Abraham et Abimélech.'],
  [238, 'GEN.25.26', 1, 'Référence intentionnelle vérifiée à l’âge de soixante ans d’Isaac lors de la naissance de ses fils.'],
  [238, 'GEN.25.34', 1, 'Référence intentionnelle vérifiée à l’époque de la vente du droit d’aînesse.'],
  [239, 'GEN.26.1', 3, 'Une hypothèse d’âge d’Abimélech est ajoutée au calcul chronologique de Genèse 26,1.'],
  [239, 'GEN.20.2', 1, 'Référence intentionnelle vérifiée à Abimélech prenant Sara, mère d’Isaac.'],
  [239, 'GEN.21.32', 1, 'Référence intentionnelle vérifiée à l’alliance d’Abimélech avec Abraham.'],
  [240, 'GEN.26.1', 3, 'La longue durée des événements qui suivent Genèse 26,1 est utilisée pour discuter leur place chronologique.'],
  [240, 'GEN.25.34', 3, 'Les événements de Gérare sont comparés à la vente du droit d’aînesse rapportée en Genèse 25,34.'],
  [240, 'GEN.26.8', 1, 'Référence intentionnelle vérifiée au long séjour d’Isaac dans le pays.'],
  [240, 'GEN.26.13', 1, 'Référence intentionnelle vérifiée à l’enrichissement et à la grande puissance d’Isaac.'],
  [240, 'GEN.26.20', 1, 'Référence intentionnelle vérifiée à la première contestation au sujet d’un puits.'],
  [240, 'GEN.26.21', 1, 'Référence intentionnelle vérifiée à la seconde contestation au sujet d’un puits.'],
  [241, 'GEN.26.1', 3, 'Conclusion en faveur d’une anticipation narrative des événements ouverts par Genèse 26,1.'],
  [241, 'GEN.25.34', 3, 'Le récit des fils d’Isaac jusqu’au plat de lentilles explique l’ordre de narration avant la reprise de Genèse 26,1.'],

  [242, 'GEN.26.12', 1, 'Citation explicite vérifiée de la bénédiction du Seigneur accordée à Isaac.'],
  [242, 'GEN.26.13', 1, 'Citation explicite vérifiée de la croissance d’Isaac jusqu’à une extrême puissance.'],
  [242, 'GEN.26.12', 3, 'La bénédiction de Genèse 26,12 est interprétée d’abord comme félicité terrestre.'],
  [242, 'GEN.26.13', 3, 'La grandeur croissante de Genèse 26,13 est rapportée à la prospérité temporelle.'],
  [243, 'GEN.26.14', 1, 'Référence intentionnelle vérifiée aux troupeaux, aux serviteurs et à l’envie suscitée par les richesses d’Isaac.'],
  [243, 'GEN.26.16', 1, 'Référence intentionnelle vérifiée à la crainte d’Abimélech devant la puissance d’Isaac.'],
  [243, 'GEN.26.12', 3, 'Les richesses décrites ensuite précisent le sens terrestre de la bénédiction de Genèse 26,12.'],
  [243, 'GEN.26.13', 3, 'La crainte d’Abimélech confirme que la grandeur de Genèse 26,13 désigne aussi une puissance matérielle.'],
  [244, 'GEN.26.12', 3, 'La bénédiction de Genèse 26,12 enseigne que les biens temporels viennent eux aussi de Dieu.'],
  [244, 'GEN.26.13', 3, 'La prospérité de Genèse 26,13 sert à ordonner les petites richesses aux biens véritables.'],
  [244, 'LUK.16.10', 1, 'Citation explicite vérifiée de la fidélité dans les petites choses et dans les grandes.'],
  [244, 'LUK.16.11', 1, 'Citation explicite vérifiée des richesses d’iniquité opposées aux biens véritables.'],
  [245, 'GEN.24.35', 1, 'Référence intentionnelle vérifiée au Seigneur comblant Abraham de bénédictions et de richesses.'],
  [245, 'GEN.26.12', 3, 'Le bienfait accordé à Abraham confirme l’origine divine de la bénédiction d’Isaac en Genèse 26,12.'],
  [245, 'GEN.26.13', 3, 'La richesse d’Abraham sert de parallèle à la prospérité matérielle d’Isaac en Genèse 26,13.'],

  [246, 'GEN.26.28', 1, 'Citation explicite vérifiée du serment proposé entre Abimélech et Isaac.'],
  [246, 'GEN.26.28', 3, 'Le terme rendu par « malédiction » est expliqué comme un serment assorti d’une sanction contre le parjure.'],
  [246, 'GEN.24.41', 1, 'Référence intentionnelle vérifiée à la « malédiction » ou obligation du serment imposé au serviteur d’Abraham.'],
  [246, 'GEN.24.41', 3, 'Le vocabulaire de Genèse 24,41 sert à confirmer le sens donné à la formule de Genèse 26,28.'],

  [247, 'GEN.26.32', 1, 'Citation intentionnelle vérifiée du rapport des serviteurs sur le puits ; le texte suit la variante négative « nous n’avons pas trouvé d’eau ».'],
  [247, 'GEN.26.32', 3, 'La variante négative de Genèse 26,32 fonde la difficulté sur le nom donné au puits.'],
  [247, 'GEN.26.33', 1, 'Référence intentionnelle vérifiée au nom donné par Isaac au puits et à la ville.'],
  [247, 'GEN.26.33', 3, 'Question étymologique sur le rapport entre le puits et le nom de jurement en Genèse 26,33.'],
  [248, 'GEN.26.32', 1, 'Référence intentionnelle vérifiée à la leçon d’autres interprètes : les serviteurs avaient trouvé de l’eau.'],
  [248, 'GEN.26.32', 3, 'Comparaison des variantes positive et négative du rapport des serviteurs en Genèse 26,32.'],
  [248, 'GEN.26.33', 3, 'Même avec la leçon positive, le nom du puits en Genèse 26,33 demeure à expliquer.'],

  [249, 'GEN.27.2', 2, 'La proximité supposée de la mort d’Isaac reprend dans la voix de l’auteur Genèse 27,2.'],
  [249, 'GEN.27.3', 2, 'La demande du produit de la chasse est absorbée dans le résumé narratif de Genèse 27,3.'],
  [249, 'GEN.27.4', 2, 'Le mets aimé et la bénédiction promise sont repris dans le discours de l’auteur depuis Genèse 27,4.'],
  [249, 'GEN.27.5', 2, 'L’intervention de Rébecca est reprise sans citation dans le résumé de Genèse 27,5.'],
  [249, 'GEN.27.8', 2, 'L’initiative de Rébecca envers Jacob est absorbée depuis Genèse 27,8.'],
  [249, 'GEN.27.9', 2, 'La préparation du mets par Rébecca est reprise depuis Genèse 27,9.'],
  [249, 'GEN.27.10', 2, 'Le dessein de faire recevoir la bénédiction au plus jeune reprend Genèse 27,10.'],
  [249, 'GEN.27.14', 2, 'L’exécution du plan de Rébecca est résumée depuis Genèse 27,14.'],
  [249, 'GEN.27.15', 2, 'La préparation de Jacob par Rébecca reprend implicitement Genèse 27,15.'],
  [249, 'GEN.27.16', 2, 'Le déguisement de Jacob est englobé dans le récit absorbé de Genèse 27,16.'],
  [249, 'GEN.27.17', 2, 'La remise du mets à Jacob achève le résumé absorbé de Genèse 27,17.'],
  ...Array.from({ length: 17 }, (_, index) => [
    249, `GEN.27.${index + 1}`, 3,
    `Genèse 27,${index + 1} appartient à la séquence 27,1-17 explicitement commentée comme figure prophétique de la bénédiction du plus jeune.`,
  ]),

  [250, 'GEN.27.33', 1, 'Citation explicite vérifiée de la très grande stupeur ou extase d’Isaac.'],
  [250, 'GEN.27.33', 3, 'Analyse lexicale de l’extase d’Isaac en Genèse 27,33 comme surexcitation de l’esprit.'],
  [251, 'GEN.27.33', 3, 'L’extase de Genèse 27,33 est interprétée comme révélation intérieure confirmant la bénédiction de Jacob.'],
  [252, 'GEN.27.33', 3, 'L’extase prophétique d’Adam est mise en parallèle avec celle d’Isaac en Genèse 27,33.'],
  [252, 'GEN.2.21', 3, 'Le profond sommeil d’Adam en Genèse 2,21 est interprété comme extase prophétique.'],
  [252, 'GEN.2.24', 1, 'Citation scripturaire au second degré vérifiée : les deux seront une seule chair.'],
  [252, 'EPH.5.31', 1, 'Citation explicite vérifiée de l’homme et de la femme devenant une seule chair.'],
  [252, 'EPH.5.32', 1, 'Citation explicite vérifiée du grand mystère rapporté au Christ et à l’Église ; la note « Eph. 6, 31, 32 » est fautive.'],
]

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/)
  .map((ligne) => ligne.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean)
  .map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]))
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const { data: segments, error: erreurSegments } = await supabase.from('segments')
  .select('id,segment_numero,ref_niv1,ref_niv2,ref_niv2_texte,segment_texte,texte_original,notes,nature,liens_revus_le,liens_revus_par')
  .eq('id_oeuvre', OEUVRE).eq('ref_niv1', REF_NIV1)
  .gte('segment_numero', PREMIER_SEGMENT).lte('segment_numero', DERNIER_SEGMENT).order('segment_numero')
if (erreurSegments) throw erreurSegments
if (segments.length !== NB_SEGMENTS || segments[0]?.segment_numero !== PREMIER_SEGMENT || segments.at(-1)?.segment_numero !== DERNIER_SEGMENT) {
  throw new Error(`Préétat : lot inattendu (${segments.length} segments)`)
}
const empreinte = createHash('sha256').update(segments.map((segment) => JSON.stringify([
  segment.id, segment.segment_numero, segment.ref_niv1, segment.ref_niv2,
  segment.ref_niv2_texte, segment.segment_texte, segment.texte_original,
  segment.notes, segment.nature,
])).join('\n')).digest('hex')
if (empreinte !== EMPREINTE_TEXTE) throw new Error(`Le texte lu a changé : ${empreinte}`)
const questions = [...new Set(segments.map((segment) => segment.ref_niv2))]
if (JSON.stringify(questions) !== JSON.stringify(QUESTIONS_ATTENDUES)) throw new Error(`Questions inattendues : ${questions.join(', ')}`)
if (segments.some((segment) => segment.liens_revus_le || segment.liens_revus_par)) throw new Error('Un segment est déjà marqué relu')

const parNumero = new Map(segments.map((segment) => [segment.segment_numero, segment]))
const numerosLies = new Set(LIENS.map(([numero]) => numero))
const nonClasses = segments.filter((segment) => !numerosLies.has(segment.segment_numero) && !SANS_LIEN.has(segment.segment_numero))
if (nonClasses.length) throw new Error(`Segments non classés : ${nonClasses.map((segment) => segment.segment_numero).join(', ')}`)
if ([...SANS_LIEN].some((numero) => numerosLies.has(numero) || !parNumero.has(numero))) throw new Error('Déclaration SANS_LIEN incohérente')
if (LIENS.some(([numero, canon, type, motif]) => !parNumero.has(numero) || !canon || ![1, 2, 3, 4].includes(type) || !motif?.trim())) {
  throw new Error('Lien interne incomplet ou invalide')
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
const sansTemoin = cibles.filter((cible) => {
  const temoin = parCible.get(cible)
  return ![temoin.TR0001, temoin.TR0003, temoin.TR0004].some((texte) => texte?.trim())
})
if (sansTemoin.length) throw new Error(`Cibles sans témoin lisible : ${sansTemoin.join(', ')}`)

const ids = segments.map((segment) => segment.id)
const { count: existants, error: erreurExistants } = await supabase.from('liens_bibliques')
  .select('id', { count: 'exact', head: true }).in('segment_id', ids)
if (erreurExistants) throw erreurExistants
if (existants) throw new Error(`${existants} lien(s) existe(nt) déjà dans le lot`)

const types = LIENS.reduce((compte, [, , type]) => ({ ...compte, [type]: (compte[type] ?? 0) + 1 }), {})
console.log(JSON.stringify({
  mode: WRITE ? 'écriture' : 'contrôle', oeuvre: OEUVRE, ref_niv1: REF_NIV1,
  questions, segments: NB_SEGMENTS, bornes: [PREMIER_SEGMENT, DERNIER_SEGMENT],
  empreinte, liens: LIENS.length, sans_lien: [...SANS_LIEN],
  cibles_distinctes: cibles.length, cibles, types,
}, null, 2))
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
  get diagnostics n=row_count; if n<>${NB_SEGMENTS} then raise exception 'Segments %/${NB_SEGMENTS}',n; end if;
end $passe$;`
const { error: erreurEcriture } = await supabase.rpc('exec_sql', { sql })
if (erreurEcriture) throw erreurEcriture

const [{ data: liensApres, error: e1 }, { data: segmentsApres, error: e2 }] = await Promise.all([
  supabase.from('liens_bibliques').select('segment_id,canon_id,type,fiabilite,motif,provenance,arbitrage_requis').in('segment_id', ids),
  supabase.from('segments').select('id,liens_revus_le,liens_revus_par').in('id', ids),
])
if (e1) throw e1
if (e2) throw e2
const clesApres = new Set(liensApres.map((lien) => `${lien.segment_id}|${lien.canon_id}|${lien.type}`))
const clesAttendues = new Set(LIENS.map(([numero, canon, type]) => `${parNumero.get(numero).id}|${canon}|${type}`))
if (liensApres.length !== LIENS.length || clesApres.size !== clesAttendues.size || [...clesAttendues].some((cle) => !clesApres.has(cle))) {
  throw new Error(`Postétat liens invalide : ${liensApres.length}/${LIENS.length}`)
}
if (liensApres.some((lien) => lien.fiabilite !== 'vérifié' || lien.provenance !== 'lecture' || lien.arbitrage_requis || !lien.motif?.trim())) {
  throw new Error('Postétat éditorial invalide')
}
if (segmentsApres.length !== NB_SEGMENTS || segmentsApres.some((segment) => !segment.liens_revus_le || segment.liens_revus_par !== RELECTEUR)) {
  throw new Error(`Postétat relecture invalide : ${segmentsApres.length}/${NB_SEGMENTS}`)
}
console.log(`✓ ${liensApres.length} liens vérifiés écrits ; ${segmentsApres.length} segments marqués relus`)
