import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const OEUVRE = 'A0010O0023'
const WRITE = process.argv.includes('--write')
const DETAIL = process.argv.includes('--detail')
const RELECTEUR = 'Codex (IA) - lecture intégrale Heptateuque, Genèse Q. CI-CX'
const EMPREINTE_ATTENDUE = '2daa93ebdbd9ab2c4e81abaad537a6057e72c4f84ae3fd6d8e4bacb80b68ab2e'
const QUESTIONS = ['Question CI', 'Question CII', 'Question CIII', 'Question CIV', 'Question CV', 'Question CVI', 'Question CVII', 'Question CVIII', 'Question CIX', 'Question CX']
const SANS_LIEN = new Set()

// [segment_numero, canon_id, type, motif]
const LIENS = [
  [304, 'GEN.32.2', 1, 'Référence intentionnelle vérifiée à la rencontre de Jacob avec les anges de Dieu.'],
  [304, 'GEN.32.2', 3, 'Les anges rencontrés en Genèse 32,2 sont identifiés à la multitude formant le camp.'],
  [304, 'GEN.32.3', 1, 'Référence intentionnelle vérifiée au lieu nommé par Jacob « camp de Dieu ».'],
  [304, 'GEN.32.3', 3, 'Le camp de Dieu de Genèse 32,3 est interprété comme l’armée des anges.'],

  [305, 'GEN.32.7', 1, 'Référence intentionnelle vérifiée à l’arrivée d’Ésaü avec quatre cents hommes.'],
  [305, 'GEN.32.8', 1, 'Référence intentionnelle vérifiée à la frayeur de Jacob et au partage des siens en deux camps.'],
  [305, 'GEN.32.7', 3, 'La nouvelle rapportée en Genèse 32,7 explique la crainte de Jacob.'],
  [305, 'GEN.32.8', 3, 'La division en deux camps de Genèse 32,8 ouvre la question sur la foi de Jacob.'],
  [306, 'GEN.32.9', 1, 'Citation explicite vérifiée de l’espoir qu’un camp échappe si l’autre est frappé.'],
  [306, 'GEN.32.9', 3, 'La précaution de Genèse 32,9 est conciliée avec la foi de Jacob aux promesses.'],
  [306, 'GEN.32.13', 3, 'La promesse d’une descendance innombrable en Genèse 32,13 demeure compatible avec une épreuve du camp.'],
  [307, 'GEN.32.8', 3, 'La division prudente du camp en Genèse 32,8 devient un exemple d’action humaine jointe à la confiance en Dieu.'],
  [307, 'GEN.32.9', 3, 'Le calcul prudent de Genèse 32,9 est distingué d’une mise à l’épreuve de Dieu.'],
  [308, 'GEN.32.10', 1, 'Citation explicite vérifiée de l’invocation de Jacob et de l’ordre divin de retourner dans son pays.'],
  [308, 'GEN.32.11', 1, 'Citation explicite vérifiée du commencement de l’action de grâce pour la miséricorde et la fidélité divines.'],
  [308, 'GEN.32.10', 3, 'L’invocation de Genèse 32,10 manifeste la confiance pieuse de Jacob.'],
  [309, 'GEN.32.11', 1, 'Citation explicite vérifiée du passage du Jourdain avec un bâton et du retour en deux camps.'],
  [309, 'GEN.32.12', 1, 'Citation explicite vérifiée de la demande d’être délivré d’Ésaü.'],
  [309, 'GEN.32.13', 1, 'Citation explicite vérifiée de la promesse d’une postérité pareille au sable de la mer.'],
  [309, 'GEN.32.11', 3, 'Le contraste de Genèse 32,11 entre pauvreté passée et deux camps fonde la reconnaissance de Jacob.'],
  [309, 'GEN.32.12', 3, 'La crainte confessée en Genèse 32,12 manifeste l’infirmité humaine.'],
  [309, 'GEN.32.13', 3, 'Le rappel de la promesse en Genèse 32,13 manifeste la confiance de Jacob.'],
  [310, 'GEN.32.12', 3, 'La peur exprimée en Genèse 32,12 résume l’infirmité humaine présente dans la prière.'],
  [310, 'GEN.32.13', 3, 'La promesse rappelée en Genèse 32,13 résume la confiance de la piété.'],

  [311, 'GEN.32.21', 1, 'Citation explicite vérifiée de la volonté de Jacob d’apaiser Ésaü par les présents qui le précèdent.'],
  [311, 'GEN.32.21', 3, 'Question grammaticale précise sur l’incise narrative de Genèse 32,21.'],
  [312, 'GEN.32.21', 1, 'Citation explicite vérifiée des paroles de Jacob et de l’incise sur les présents.'],
  [312, 'GEN.32.21', 3, 'La voix de Jacob est distinguée de l’addition du narrateur dans Genèse 32,21.'],
  [313, 'GEN.32.21', 1, 'Citation explicite vérifiée de la phrase continue : apaiser, voir le visage et être accueilli.'],
  [313, 'GEN.32.21', 3, 'L’ordre syntaxique de Genèse 32,21 est reconstitué en isolant les mots intercalés par l’écrivain.'],

  [314, 'GEN.32.27', 1, 'Référence intentionnelle vérifiée au refus de Jacob de laisser partir l’ange sans bénédiction.'],
  [314, 'GEN.32.27', 3, 'Le désir d’être béni en Genèse 32,27 est confronté à la victoire apparente de Jacob.'],
  [314, 'GEN.32.29', 1, 'Référence intentionnelle vérifiée à Jacob déclaré fort contre Dieu dans le combat.'],
  [314, 'GEN.32.29', 3, 'La victoire énoncée en Genèse 32,29 est interprétée prophétiquement.'],
  [314, 'GEN.32.30', 1, 'Référence intentionnelle vérifiée à la bénédiction effectivement donnée à Jacob.'],
  [314, 'GEN.32.30', 3, 'La bénédiction de Genèse 32,30 crée le paradoxe d’un vainqueur béni par celui qu’il a vaincu.'],
  [315, 'GEN.32.29', 3, 'La victoire de Jacob en Genèse 32,29 est interprétée comme figure de la crucifixion du Christ par Israël.'],
  [315, 'GEN.32.30', 3, 'La bénédiction de Jacob est interprétée dans les Israélites qui crurent au Christ.'],
  [315, 'ROM.11.1', 1, 'Citation explicite vérifiée de Paul se déclarant Israélite, de la race d’Abraham et de Benjamin.'],
  [315, 'ROM.11.1', 3, 'Romains 11,1 fournit un exemple de l’Israël béni par la foi au Christ.'],
  [316, 'GEN.32.26', 3, 'L’atteinte portée à la cuisse de Jacob en Genèse 32,26 fonde la figure de l’Israël boiteux.'],
  [316, 'GEN.32.30', 3, 'La bénédiction reçue en Genèse 32,30 fonde la figure de l’Israël sauvé par grâce.'],
  [316, 'GEN.32.32', 3, 'La marche boiteuse de Jacob en Genèse 32,32 est interprétée collectivement dans sa descendance.'],
  [316, 'PSA.17.46', 1, 'Citation explicite vérifiée du Psaume 17,46 selon la numérotation grecque : les fils étrangers ont boité hors de leurs voies.'],
  [316, 'PSA.17.46', 3, 'Le Psaume 17,46 éclaire la figure de la partie boiteuse d’Israël.'],
  [316, 'ROM.11.5', 1, 'Citation explicite vérifiée de Romains 11,5 sur le reste sauvé selon l’élection de la grâce.'],
  [316, 'ROM.11.5', 3, 'Romains 11,5 éclaire la partie bénie d’Israël, malgré la note imprimée visant le verset 6.'],

  [317, 'GEN.33.10', 1, 'Citation explicite vérifiée du visage d’Ésaü comparé à la face de Dieu.'],
  [317, 'GEN.33.10', 3, 'Question précise sur la légitimité de la comparaison formulée en Genèse 33,10.'],
  [318, 'GEN.33.10', 3, 'La comparaison de Genèse 33,10 est défendue par la pluralité possible des êtres appelés dieux.'],
  [318, 'PSA.95.5', 2, 'La formule septantante « les dieux des nations sont des démons » est absorbée dans le raisonnement.'],
  [319, 'GEN.33.10', 3, 'La syntaxe impersonnelle de Genèse 33,10 est interprétée comme évitant d’identifier Ésaü au vrai Dieu.'],
  [320, 'GEN.33.10', 3, 'L’accueil favorable d’Ésaü explique la bienveillance de la formule de Genèse 33,10.'],
  [321, 'GEN.33.10', 3, 'Le mot dieu appliqué au visage d’Ésaü est comparé à d’autres emplois scripturaires non divins.'],
  [321, 'EXO.7.1', 1, 'Référence intentionnelle vérifiée à Moïse établi dieu de Pharaon.'],
  [321, 'EXO.7.1', 3, 'Exode 7,1 fournit un parallèle précis pour un homme appelé dieu sans impiété.'],
  [321, '1CO.8.5', 1, 'Citation explicite vérifiée de 1 Corinthiens 8,5 sur les nombreux êtres appelés dieux et seigneurs.'],
  [321, '1CO.8.5', 3, '1 Corinthiens 8,5 justifie l’emploi scripturaire pluriel du mot dieu.'],
  [322, 'GEN.33.10', 3, 'L’absence d’article dans le grec de Genèse 33,10 est invoquée pour distinguer un dieu du Dieu unique.'],

  [323, 'GEN.33.14', 1, 'Référence intentionnelle vérifiée à la promesse de Jacob de rejoindre Ésaü à Séïr.'],
  [323, 'GEN.33.14', 3, 'La promesse de Genèse 33,14 soulève la question d’un possible mensonge.'],
  [323, 'GEN.33.17', 1, 'Référence intentionnelle vérifiée au départ ultérieur de Jacob vers Socoth plutôt que Séïr.'],
  [323, 'GEN.33.17', 3, 'Genèse 33,17 est confronté à la promesse antérieure et expliqué par un changement de décision.'],

  [324, 'GEN.34.2', 1, 'Citation explicite vérifiée de l’enlèvement et de la violence faite à Dina par Sichem.'],
  [324, 'GEN.34.3', 1, 'Citation explicite vérifiée de l’amour de Sichem pour Dina appelée jeune fille.'],
  [324, 'GEN.34.2', 3, 'L’ordre des actions de Genèse 34,2 crée la difficulté sur le nom de vierge.'],
  [324, 'GEN.34.3', 3, 'Le terme appliqué à Dina en Genèse 34,3 est examiné après l’outrage.'],
  [325, 'GEN.34.2', 3, 'Genèse 34,2 est envisagé comme événement raconté avant une reprise chronologique.'],
  [325, 'GEN.34.3', 3, 'Genèse 34,3 peut revenir sur l’amour antérieur de Sichem pour Dina encore vierge.'],
  [326, 'GEN.34.2', 3, 'L’outrage de Genèse 34,2 est replacé après l’attachement et les paroles de Sichem.'],
  [326, 'GEN.34.3', 3, 'Genèse 34,3 est interprété comme décrivant Dina avant l’union forcée.'],

  [327, 'GEN.33.5', 1, 'Référence intentionnelle vérifiée aux fils de Jacob appelés petits enfants devant Ésaü.'],
  [327, 'GEN.33.5', 3, 'L’appellation de Genèse 33,5 est confrontée à la capacité ultérieure des fils de Jacob.'],
  [327, 'GEN.34.25', 1, 'Référence intentionnelle vérifiée au massacre des Sichémites circoncis par Siméon et Lévi.'],
  [327, 'GEN.34.25', 3, 'Le massacre de Genèse 34,25 soulève la difficulté chronologique sur l’âge des fils de Jacob.'],
  [328, 'GEN.33.18', 1, 'Citation explicite vérifiée de l’arrivée de Jacob à Salem et de son établissement près de la ville.'],
  [328, 'GEN.33.19', 1, 'Citation explicite vérifiée de l’achat du champ où Jacob avait établi sa tente.'],
  [328, 'GEN.33.20', 1, 'Citation explicite vérifiée de l’autel dressé par Jacob et de l’invocation du Dieu d’Israël.'],
  [329, 'GEN.34.1', 1, 'Citation explicite vérifiée de la sortie de Dina pour voir les femmes du pays.'],
  [329, 'GEN.33.18', 3, 'L’établissement de Jacob près de Salem implique un séjour non transitoire.'],
  [329, 'GEN.33.19', 3, 'L’achat du champ en Genèse 33,19 manifeste une installation durable.'],
  [329, 'GEN.33.20', 3, 'L’autel dressé en Genèse 33,20 confirme l’établissement prolongé de Jacob.'],
  [329, 'GEN.34.1', 3, 'L’âge social de Dina en Genèse 34,1 confirme que les enfants avaient grandi durant ce séjour.'],
  [330, 'GEN.34.1', 3, 'La sortie de Dina en Genèse 34,1 est comprise comme signe de son âge déjà avancé.'],
  [330, 'GEN.34.25', 3, 'Le temps écoulé explique comment les fils de Jacob purent accomplir l’action de Genèse 34,25.'],
  [331, 'GEN.30.43', 2, 'La grande richesse de Jacob et sa nombreuse domesticité sont reprises dans le raisonnement sans citation formelle.'],
  [331, 'GEN.34.25', 3, 'Les fils nommés en Genèse 34,25 sont interprétés comme chefs d’une suite plus nombreuse.'],

  [332, 'GEN.34.30', 1, 'Citation explicite vérifiée de la crainte de Jacob, peu nombreux, devant une coalition des habitants.'],
  [332, 'GEN.34.30', 3, 'Le petit nombre de Genèse 34,30 est expliqué relativement aux ennemis possibles, non à la prise de la ville.'],
  [333, 'GEN.32.8', 1, 'Référence intentionnelle vérifiée au partage antérieur des gens de Jacob en deux camps.'],
  [333, 'GEN.34.30', 3, 'Les deux camps de Genèse 32,8 confirment que le « petit nombre » de Genèse 34,30 est relatif.'],

  [334, 'GEN.35.1', 1, 'Citation explicite vérifiée de l’ordre de bâtir un autel au Dieu apparu à Jacob pendant sa fuite.'],
  [334, 'GEN.35.1', 3, 'La formulation à la troisième personne de Genèse 35,1 soulève la question de deux locuteurs divins.'],
  [335, 'GEN.35.1', 3, 'Genèse 35,1 est examiné comme possible parole du Père renvoyant à une apparition du Fils.'],
]

const env = Object.fromEntries(readFileSync('.env.local', 'utf8').split(/\r?\n/).map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)).filter(Boolean).map((match) => [match[1], match[2].replace(/^["']|["']$/g, '')]))
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const { data: segments, error: erreurSegments } = await supabase.from('segments').select('id,segment_numero,segment_texte,notes,ref_niv1,ref_niv2,ref_niv2_texte,liens_revus_le,liens_revus_par').eq('id_oeuvre', OEUVRE).eq('ref_niv1', 'Livre premier').in('ref_niv2', QUESTIONS).order('segment_numero')
if (erreurSegments) throw erreurSegments
if (segments.length !== 32 || segments[0]?.segment_numero !== 304 || segments.at(-1)?.segment_numero !== 335) throw new Error(`Préétat : lot inattendu (${segments.length}, ${segments[0]?.segment_numero}-${segments.at(-1)?.segment_numero})`)
if (segments.some((segment, index) => segment.segment_numero !== 304 + index)) throw new Error('Préétat : numérotation non continue')
if (segments.some((segment) => segment.ref_niv1 !== 'Livre premier' || !QUESTIONS.includes(segment.ref_niv2))) throw new Error('Préétat : fuite structurelle')
const questionsTrouvees = new Set(segments.map((segment) => segment.ref_niv2))
if (questionsTrouvees.size !== QUESTIONS.length || QUESTIONS.some((question) => !questionsTrouvees.has(question))) throw new Error('Préétat : questions incomplètes')
if (segments.some((segment) => segment.liens_revus_le || segment.liens_revus_par)) throw new Error('Préétat : un segment est déjà marqué relu')
const empreinte = createHash('sha256').update(JSON.stringify(segments.map((segment) => [segment.id, segment.segment_numero, segment.ref_niv1, segment.ref_niv2, segment.ref_niv2_texte, segment.segment_texte, segment.notes]))).digest('hex')
if (empreinte !== EMPREINTE_ATTENDUE) throw new Error(`Préétat : texte ou structure modifié (${empreinte})`)

const parNumero = new Map(segments.map((segment) => [segment.segment_numero, segment]))
const numerosLies = new Set(LIENS.map(([numero]) => numero))
const nonClasses = segments.filter((segment) => !numerosLies.has(segment.segment_numero) && !SANS_LIEN.has(segment.segment_numero))
if (nonClasses.length) throw new Error(`Partition incomplète : ${nonClasses.map((segment) => segment.segment_numero).join(', ')}`)
if ([...SANS_LIEN].some((numero) => numerosLies.has(numero) || !parNumero.has(numero))) throw new Error('Déclaration SANS_LIEN incohérente')
if (LIENS.some(([numero, canon, type, motif]) => !parNumero.has(numero) || !canon || ![1, 2, 3, 4].includes(type) || !motif.trim())) throw new Error('Manifeste invalide')
const cles = LIENS.map(([numero, canon, type]) => `${numero}|${canon}|${type}`)
if (new Set(cles).size !== cles.length) throw new Error('Doublon interne segment/cible/type')
const cibles = [...new Set(LIENS.map(([, canon]) => canon))]
const { data: temoins, error: erreurTemoins } = await supabase.from('versets_lecture').select('id_verset,ref,"TR0001","TR0003","TR0004"').in('id_verset', cibles)
if (erreurTemoins) throw erreurTemoins
const parCible = new Map(temoins.map((temoin) => [temoin.id_verset, temoin]))
const absents = cibles.filter((cible) => !parCible.has(cible))
if (absents.length) throw new Error(`Cibles absentes : ${absents.join(', ')}`)
const sansTexte = cibles.filter((cible) => { const temoin = parCible.get(cible); return !temoin.TR0001 && !temoin.TR0003 && !temoin.TR0004 })
if (sansTexte.length) throw new Error(`Cibles sans témoin lisible : ${sansTexte.join(', ')}`)
const ids = segments.map((segment) => segment.id)
const { count: existants, error: erreurExistants } = await supabase.from('liens_bibliques').select('id', { count: 'exact', head: true }).in('segment_id', ids)
if (erreurExistants) throw erreurExistants
if (existants) throw new Error(`Préétat : ${existants} lien(s) existe(nt) déjà`)
const types = LIENS.reduce((count, [, , type]) => ({ ...count, [type]: (count[type] ?? 0) + 1 }), {})
console.log(JSON.stringify({ mode: WRITE ? 'écriture' : 'contrôle', lot: 'Genèse CI-CX', bornes: [304, 335], segments: segments.length, liens: LIENS.length, sans_lien: [...SANS_LIEN], cibles_distinctes: cibles.length, types, empreinte }, null, 2))
if (DETAIL) for (const [numero, canon, type, motif] of LIENS) { const temoin = parCible.get(canon); console.log(JSON.stringify({ segment_numero: numero, canon_id: canon, type, motif, segment_texte: parNumero.get(numero).segment_texte, temoin: temoin.TR0003 || temoin.TR0001 || temoin.TR0004 }, null, 2)) }
if (!WRITE) process.exit(0)

const q = (value) => `'${String(value).replaceAll("'", "''")}'`
const values = LIENS.map(([numero, canon, type, motif]) => `(${parNumero.get(numero).id},${q(canon)},${type},'vérifié',${q(motif)},'lecture',false)`).join(',\n    ')
const idSql = ids.join(',')
const sql = `do $passe$ declare n integer; begin
  if exists(select 1 from liens_bibliques where segment_id in (${idSql})) then raise exception 'Liens déjà présents'; end if;
  if exists(select 1 from segments where id in (${idSql}) and (liens_revus_le is not null or liens_revus_par is not null)) then raise exception 'Marques déjà présentes'; end if;
  insert into liens_bibliques(segment_id,canon_id,type,fiabilite,motif,provenance,arbitrage_requis) values ${values};
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
if (liensApres !== LIENS.length || relusApres !== segments.length) throw new Error(`Postétat invalide : ${liensApres}/${relusApres}`)
if (auditLiens.some((link) => !link.canon_id || !link.motif || link.fiabilite !== 'vérifié' || link.provenance !== 'lecture' || link.arbitrage_requis)) throw new Error('Postcontrôle qualitatif invalide')
const clesApres = auditLiens.map((link) => `${link.segment_id}|${link.canon_id}|${link.type}`)
if (new Set(clesApres).size !== clesApres.length) throw new Error('Postcontrôle : doublon détecté')
console.log(`✓ ${liensApres} liens vérifiés écrits ; ${relusApres} segments marqués relus`)
