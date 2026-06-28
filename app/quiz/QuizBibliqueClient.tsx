'use client'

import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { supabase } from '@/app/lib/supabase'

/* ── Types ──────────────────────────────────────────────────────────────── */
type Mode = 'biblique' | 'patristique' | 'chasse'
type EtapeBiblique = 'testament' | 'livre' | 'resultat'
type EtapePatristique = 'auteur' | 'oeuvre' | 'resultat'
type Resultat = { label: string; points: number; detail: string; reponse?: string }
type VersetQuiz = { id_verset: string; livre: string; chapitre: number; verset: number; ref: string; TR0001: string | null }
type SegmentQuiz = { id: number; texte: string; id_oeuvre: string; id_auteur: string; nomAuteur: string; titreOeuvre: string; siecle: string | null }
type LivreBiblique = { code: string; nom: string; testament: Testament; famille: FamilleCode; ordre: number }
type Testament = 'Ancien Testament' | 'Nouveau Testament'
type FamilleCode = 'pentateuque' | 'historiques-at' | 'poetiques' | 'grands-prophetes' | 'petits-prophetes' | 'evangiles-actes' | 'paul' | 'catholiques' | 'apocalypse'
type Auteur = { id_auteur: string; nom: string; siecle: string | null }
type Oeuvre = { id_oeuvre: string; titre: string; id_auteur: string }

/* ── Données bibliques ───────────────────────────────────────────────────── */
const LIVRES: LivreBiblique[] = [
  ['GEN','Genèse','Ancien Testament','pentateuque',1], ['EXO','Exode','Ancien Testament','pentateuque',2], ['LEV','Lévitique','Ancien Testament','pentateuque',3], ['NUM','Nombres','Ancien Testament','pentateuque',4], ['DEU','Deutéronome','Ancien Testament','pentateuque',5],
  ['JOS','Josué','Ancien Testament','historiques-at',6], ['JDG','Juges','Ancien Testament','historiques-at',7], ['RUT','Ruth','Ancien Testament','historiques-at',8], ['1SA','1 Samuel','Ancien Testament','historiques-at',9], ['2SA','2 Samuel','Ancien Testament','historiques-at',10], ['1KI','1 Rois','Ancien Testament','historiques-at',11], ['2KI','2 Rois','Ancien Testament','historiques-at',12], ['1CH','1 Chroniques','Ancien Testament','historiques-at',13], ['2CH','2 Chroniques','Ancien Testament','historiques-at',14], ['EZR','Esdras','Ancien Testament','historiques-at',15], ['NEH','Néhémie','Ancien Testament','historiques-at',16], ['EST','Esther','Ancien Testament','historiques-at',17],
  ['JOB','Job','Ancien Testament','poetiques',18], ['PSA','Psaumes','Ancien Testament','poetiques',19], ['PRO','Proverbes','Ancien Testament','poetiques',20], ['ECC','Ecclésiaste','Ancien Testament','poetiques',21], ['SNG','Cantique des cantiques','Ancien Testament','poetiques',22],
  ['ISA','Isaïe','Ancien Testament','grands-prophetes',23], ['JER','Jérémie','Ancien Testament','grands-prophetes',24], ['LAM','Lamentations','Ancien Testament','grands-prophetes',25], ['EZK','Ézéchiel','Ancien Testament','grands-prophetes',26], ['DAN','Daniel','Ancien Testament','grands-prophetes',27],
  ['HOS','Osée','Ancien Testament','petits-prophetes',28], ['JOL','Joël','Ancien Testament','petits-prophetes',29], ['AMO','Amos','Ancien Testament','petits-prophetes',30], ['OBA','Abdias','Ancien Testament','petits-prophetes',31], ['JON','Jonas','Ancien Testament','petits-prophetes',32], ['MIC','Michée','Ancien Testament','petits-prophetes',33], ['NAM','Nahum','Ancien Testament','petits-prophetes',34], ['HAB','Habacuc','Ancien Testament','petits-prophetes',35], ['ZEP','Sophonie','Ancien Testament','petits-prophetes',36], ['HAG','Aggée','Ancien Testament','petits-prophetes',37], ['ZEC','Zacharie','Ancien Testament','petits-prophetes',38], ['MAL','Malachie','Ancien Testament','petits-prophetes',39],
  ['MAT','Matthieu','Nouveau Testament','evangiles-actes',40], ['MRK','Marc','Nouveau Testament','evangiles-actes',41], ['LUK','Luc','Nouveau Testament','evangiles-actes',42], ['JHN','Jean','Nouveau Testament','evangiles-actes',43], ['ACT','Actes','Nouveau Testament','evangiles-actes',44],
  ['ROM','Romains','Nouveau Testament','paul',45], ['1CO','1 Corinthiens','Nouveau Testament','paul',46], ['2CO','2 Corinthiens','Nouveau Testament','paul',47], ['GAL','Galates','Nouveau Testament','paul',48], ['EPH','Éphésiens','Nouveau Testament','paul',49], ['PHP','Philippiens','Nouveau Testament','paul',50], ['COL','Colossiens','Nouveau Testament','paul',51], ['1TH','1 Thessaloniciens','Nouveau Testament','paul',52], ['2TH','2 Thessaloniciens','Nouveau Testament','paul',53], ['1TI','1 Timothée','Nouveau Testament','paul',54], ['2TI','2 Timothée','Nouveau Testament','paul',55], ['TIT','Tite','Nouveau Testament','paul',56], ['PHM','Philémon','Nouveau Testament','paul',57],
  ['HEB','Hébreux','Nouveau Testament','catholiques',58], ['JAS','Jacques','Nouveau Testament','catholiques',59], ['1PE','1 Pierre','Nouveau Testament','catholiques',60], ['2PE','2 Pierre','Nouveau Testament','catholiques',61], ['1JN','1 Jean','Nouveau Testament','catholiques',62], ['2JN','2 Jean','Nouveau Testament','catholiques',63], ['3JN','3 Jean','Nouveau Testament','catholiques',64], ['JUD','Jude','Nouveau Testament','catholiques',65],
  ['REV','Apocalypse','Nouveau Testament','apocalypse',66],
].map(([code, nom, testament, famille, ordre]) => ({ code, nom, testament, famille, ordre } as LivreBiblique))

const livreParCode = new Map(LIVRES.map(l => [l.code, l]))

const familles: Record<FamilleCode, { titre: string; messages: string[] }> = {
  pentateuque: { titre: 'Pentateuque', messages: ["Presque ! Le verset se trouve bien dans le Pentateuque, mais vous n'avez pas nommé le bon livre."] },
  'historiques-at': { titre: 'Livres historiques', messages: ["Il est bien question de l'histoire d'Israël, mais vous n'avez pas nommé le bon livre."] },
  poetiques: { titre: 'Livres poétiques', messages: ["Vous avez perçu la substance poétique de l'ouvrage, mais ce n'est pas le bon livre."] },
  'petits-prophetes': { titre: 'Petits prophètes', messages: ["L'auteur est un tout petit prophète, mais vous ne l'avez pas nommé correctement."] },
  'grands-prophetes': { titre: 'Grands prophètes', messages: ["L'auteur est un grand prophète, mais vous ne l'avez pas nommé correctement."] },
  'evangiles-actes': { titre: 'Évangiles et Actes', messages: ["L'un des quatre évangélistes a bien écrit ce verset !"] },
  paul: { titre: 'Épîtres de Paul', messages: ["Oui, c'est bien Paul, mais pas cette épître."] },
  catholiques: { titre: 'Épîtres catholiques', messages: ["Bonne famille d'épîtres, mauvais livre."] },
  apocalypse: { titre: 'Apocalypse', messages: ['Vous tournez autour de Patmos, mais il faut nommer le livre exact.'] },
}

const aliases: Record<string, string> = {
  gn:'GEN',gen:'GEN',genese:'GEN',ex:'EXO',exo:'EXO',exode:'EXO',lv:'LEV',lev:'LEV',levitique:'LEV',nb:'NUM',nom:'NUM',nombres:'NUM',dt:'DEU',deut:'DEU',deuteronome:'DEU',
  jos:'JOS',josue:'JOS',jg:'JDG',juges:'JDG',rt:'RUT',ruth:'RUT','1s':'1SA','1sa':'1SA','1samuel':'1SA','2s':'2SA','2sa':'2SA','2samuel':'2SA',
  '1r':'1KI','1rois':'1KI','2r':'2KI','2rois':'2KI','1ch':'1CH','1chroniques':'1CH','2ch':'2CH','2chroniques':'2CH',esd:'EZR',esdras:'EZR',ne:'NEH',nehemie:'NEH',est:'EST',esther:'EST',
  job:'JOB',ps:'PSA',psaume:'PSA',psaumes:'PSA',pr:'PRO',proverbes:'PRO',qo:'ECC',ec:'ECC',ecclesiaste:'ECC',ct:'SNG',cantique:'SNG',
  is:'ISA',isaie:'ISA',esaie:'ISA',jer:'JER',jeremie:'JER',lm:'LAM',lamentations:'LAM',ez:'EZK',ezechiel:'EZK',dan:'DAN',daniel:'DAN',
  os:'HOS',osee:'HOS',jl:'JOL',joel:'JOL',am:'AMO',amos:'AMO',ab:'OBA',abdias:'OBA',jon:'JON',jonas:'JON',mi:'MIC',michee:'MIC',na:'NAM',nahum:'NAM',ha:'HAB',habacuc:'HAB',so:'ZEP',sophonie:'ZEP',ag:'HAG',aggee:'HAG',za:'ZEC',zacharie:'ZEC',ml:'MAL',malachie:'MAL',
  mt:'MAT',matthieu:'MAT',mc:'MRK',marc:'MRK',lc:'LUK',luc:'LUK',jn:'JHN',jean:'JHN',ac:'ACT',actes:'ACT',
  rm:'ROM',romains:'ROM','1co':'1CO','1corinthiens':'1CO','2co':'2CO','2corinthiens':'2CO',ga:'GAL',galates:'GAL',ep:'EPH',ephesiens:'EPH',ph:'PHP',philippiens:'PHP',col:'COL',colossiens:'COL','1th':'1TH','1thessaloniciens':'1TH','2th':'2TH','2thessaloniciens':'2TH','1tm':'1TI','1timothee':'1TI','2tm':'2TI','2timothee':'2TI',tt:'TIT',tite:'TIT',phm:'PHM',philemon:'PHM',
  he:'HEB',hebreux:'HEB',jc:'JAS',jacques:'JAS','1p':'1PE','1pierre':'1PE','2p':'2PE','2pierre':'2PE','1jn':'1JN','1jean':'1JN','2jn':'2JN','2jean':'2JN','3jn':'3JN','3jean':'3JN',jude:'JUD',ap:'REV',apocalypse:'REV',
}

/* ── Mots pour la Chasse ─────────────────────────────────────────────────── */
const MOTS_CHASSE = [
  { mot: 'lumière',    indice: 'Présent dès le premier jour de la Création.' },
  { mot: 'alliance',   indice: 'Le cœur du rapport entre Dieu et son peuple.' },
  { mot: 'agneau',     indice: 'Animal sacrificiel par excellence.' },
  { mot: 'paix',       indice: 'Don divin promis aux humbles de cœur.' },
  { mot: 'gloire',     indice: 'Rayonnement de la présence divine.' },
  { mot: 'feu',        indice: 'Symbole de la présence et du jugement de Dieu.' },
  { mot: 'eau',        indice: 'Source de vie et de purification.' },
  { mot: 'pain',       indice: 'Nourriture du corps et de l\'âme.' },
  { mot: 'sang',       indice: 'Siège de la vie selon la Loi mosaïque.' },
  { mot: 'justice',    indice: 'Vertu attendue des rois et des prophètes.' },
  { mot: 'grâce',      indice: 'Faveur divine accordée gratuitement.' },
  { mot: 'foi',        indice: 'Fondement de la relation à Dieu selon Paul.' },
  { mot: 'espérance',  indice: 'Vertu théologale orientée vers l\'avenir.' },
  { mot: 'amour',      indice: 'Premier et dernier commandement.' },
  { mot: 'péché',      indice: 'Ce dont le sang de l\'agneau délivre.' },
  { mot: 'salut',      indice: 'But de la mission du Fils selon les évangiles.' },
  { mot: 'pardon',     indice: 'Ce que le père accorde au fils prodigue.' },
  { mot: 'berger',     indice: 'Métaphore royale et divine au long des écritures.' },
  { mot: 'vigne',      indice: 'Israël, le Christ, et le banquet du Royaume.' },
  { mot: 'désert',     indice: 'Lieu d\'épreuve, de rencontre et de purification.' },
  { mot: 'montagne',   indice: 'Lieu de la révélation et de la prière.' },
  { mot: 'sagesse',    indice: 'Attribut divin personnifié dans les écrits sapientiaux.' },
  { mot: 'nuée',       indice: 'Voile de la présence divine dans l\'Exode.' },
  { mot: 'temple',     indice: 'Demeure de Dieu au cœur de Jérusalem.' },
  { mot: 'ange',       indice: 'Messager céleste porteur de la Parole.' },
  { mot: 'prophète',   indice: 'Porte-parole de Dieu auprès du peuple.' },
  { mot: 'cœur',       indice: 'Siège de la volonté et de la foi selon l\'Écriture.' },
  { mot: 'vie',        indice: 'Don premier de Dieu et promesse eschatologique.' },
  { mot: 'mort',       indice: 'Réalité vaincue dans la résurrection.' },
  { mot: 'ressuscité', indice: 'Annonce pascale au cœur du Nouveau Testament.' },
]

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function normaliser(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/['']/g, '').replace(/\s+/g, ' ').trim()
}
function codeDepuisNom(s: string) {
  const n = normaliser(s).replace(/\s/g, '')
  return aliases[n] ?? LIVRES.find(l => normaliser(l.nom).replace(/\s/g, '') === n)?.code ?? null
}
function parserReference(s: string) {
  const match = normaliser(s).match(/^(.+?)\s+(\d+)\s*[,.:]\s*(\d+)$/)
  if (!match) return null
  const code = codeDepuisNom(match[1])
  if (!code) return null
  return { code, chapitre: Number(match[2]), verset: Number(match[3]) }
}
function refLisible(v: VersetQuiz) {
  return `${livreParCode.get(v.livre)?.nom ?? v.livre} ${v.chapitre}, ${v.verset}`
}
function messageScore(score: number) {
  if (score >= 90) return 'Jacob file vers le sommet.'
  if (score >= 55) return 'Belle ascension.'
  if (score >= 25) return "On commence à voir l'échelle."
  return 'Premier barreau.'
}
function formatTemps(s: number) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return m > 0 ? `${m} min ${sec < 10 ? '0' : ''}${sec} s` : `${sec} s`
}

/* ── Chargeurs asynchrones ───────────────────────────────────────────────── */
async function chargerVersetAleatoire(): Promise<VersetQuiz> {
  const base = () => supabase.from('versets').select('id_verset, ref, livre, chapitre, verset, TR0001', { count: 'exact' }).not('TR0001', 'is', null)
  let avecExclusion = true
  let countRes = await base().or('quiz_exclu.is.null,quiz_exclu.eq.false').limit(1)
  if (countRes.error) { avecExclusion = false; countRes = await base().limit(1) }
  const count = countRes.count ?? 0
  if (count <= 0) throw new Error('Aucun verset disponible.')
  for (let i = 0; i < 10; i++) {
    const offset = Math.floor(Math.random() * count)
    let q = base().range(offset, offset)
    if (avecExclusion) q = q.or('quiz_exclu.is.null,quiz_exclu.eq.false') as typeof q
    const { data, error } = await q
    if (error) throw error
    const v = data?.[0] as VersetQuiz | undefined
    if (v && (v.TR0001 ?? '').trim().length >= 35) return v
  }
  throw new Error('Aucun verset convenable trouvé.')
}

async function chargerSegmentAleatoire(): Promise<SegmentQuiz> {
  const { count } = await supabase.from('segments').select('id', { count: 'exact', head: true }).not('segment_texte', 'is', null).not('id_oeuvre', 'is', null)
  if (!count || count === 0) throw new Error('Aucun segment disponible.')
  for (let i = 0; i < 10; i++) {
    const offset = Math.floor(Math.random() * count)
    const { data: segs } = await supabase.from('segments').select('id, segment_texte, id_oeuvre').not('segment_texte', 'is', null).not('id_oeuvre', 'is', null).range(offset, offset)
    const seg = segs?.[0] as any
    if (!seg || (seg.segment_texte ?? '').trim().length < 80) continue
    const { data: oeuvre } = await supabase.from('oeuvres').select('id_oeuvre, titre, id_auteur').eq('id_oeuvre', seg.id_oeuvre).maybeSingle()
    if (!oeuvre) continue
    const { data: auteur } = await supabase.from('auteurs').select('id_auteur, nom, siecle').eq('id_auteur', (oeuvre as any).id_auteur).maybeSingle()
    if (!auteur) continue
    return { id: seg.id, texte: seg.segment_texte, id_oeuvre: seg.id_oeuvre, id_auteur: (oeuvre as any).id_auteur, nomAuteur: (auteur as any).nom, titreOeuvre: (oeuvre as any).titre, siecle: (auteur as any).siecle ?? null }
  }
  throw new Error('Aucun segment convenable trouvé.')
}

async function verifierVersetContientMot(ref: string, mot: string): Promise<{ ok: boolean; texte?: string; refLisible?: string }> {
  const parsed = parserReference(ref)
  if (!parsed) return { ok: false }
  const { data } = await supabase.from('versets').select('TR0001, livre, chapitre, verset').eq('livre', parsed.code).eq('chapitre', parsed.chapitre).eq('verset', parsed.verset).maybeSingle()
  if (!data || !data.TR0001) return { ok: false }
  const motNorm = normaliser(mot)
  const texteNorm = normaliser(data.TR0001)
  const ok = texteNorm.includes(motNorm)
  const livre = livreParCode.get(data.livre)
  return { ok, texte: data.TR0001, refLisible: livre ? `${livre.nom} ${data.chapitre}, ${data.verset}` : undefined }
}

/* ── Composant principal ────────────────────────────────────────────────── */
export default function QuizBibliqueClient() {
  const [mode, setMode] = useState<Mode>('biblique')

  // Biblique
  const [verset, setVerset] = useState<VersetQuiz | null>(null)
  const [etapeB, setEtapeB] = useState<EtapeBiblique>('testament')
  const [saisieLivre, setSaisieLivre] = useState('')
  const [essaisLivres, setEssaisLivres] = useState<LivreBiblique[]>([])
  const [messageChaud, setMessageChaud] = useState<string | null>(null)
  const [reponseExacte, setReponseExacte] = useState('')

  // Patristique
  const [segment, setSegment] = useState<SegmentQuiz | null>(null)
  const [etapeP, setEtapeP] = useState<EtapePatristique>('auteur')
  const [saisieAuteur, setSaisieAuteur] = useState('')
  const [saisieOeuvre, setSaisieOeuvre] = useState('')
  const [essaisAuteurs, setEssaisAuteurs] = useState<Auteur[]>([])
  const [essaisOeuvres, setEssaisOeuvres] = useState<Oeuvre[]>([])
  const [auteurConfirme, setAuteurConfirme] = useState<Auteur | null>(null)
  const [suggestionsAuteur, setSuggestionsAuteur] = useState<Auteur[]>([])
  const [suggestionsOeuvre, setSuggestionsOeuvre] = useState<Oeuvre[]>([])
  const [messageChaudP, setMessageChaudP] = useState<string | null>(null)

  // Partagé
  const [resultats, setResultats] = useState<Resultat[]>([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)
  const [flashScore, setFlashScore] = useState(false)
  const [signalementOuvert, setSignalementOuvert] = useState(false)
  const [raisonSignalement, setRaisonSignalement] = useState('verset trop générique')
  const [commentaireSignalement, setCommentaireSignalement] = useState('')
  const [statutSignalement, setStatutSignalement] = useState<'idle'|'sending'|'ok'|'err'>('idle')
  const [suggestionsLivreVisible, setSuggestionsLivreVisible] = useState(false)

  const score = resultats.reduce((s, r) => s + r.points, 0)
  const livreCorrect = verset ? livreParCode.get(verset.livre) : null

  /* ── Désactiver Ctrl+F ───────────────────────────────────────────────── */
  useEffect(() => {
    const bloquer = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') { e.preventDefault(); e.stopPropagation() }
    }
    window.addEventListener('keydown', bloquer, true)
    return () => window.removeEventListener('keydown', bloquer, true)
  }, [])

  const suggestionsLivre = useMemo(() => {
    const q = normaliser(saisieLivre)
    if (!q) return []
    return LIVRES.filter(l => normaliser(l.nom).startsWith(q) && !essaisLivres.some(e => e.code === l.code)).slice(0, 6)
  }, [saisieLivre, essaisLivres])

  useEffect(() => {
    const q = saisieAuteur.trim()
    if (q.length < 2) { setSuggestionsAuteur([]); return }
    const t = setTimeout(async () => {
      const { data } = await supabase.from('auteurs').select('id_auteur, nom, siecle').ilike('nom', `%${q}%`).limit(7)
      setSuggestionsAuteur(((data ?? []) as Auteur[]).filter(a => !essaisAuteurs.some(e => e.id_auteur === a.id_auteur)))
    }, 250)
    return () => clearTimeout(t)
  }, [saisieAuteur, essaisAuteurs])

  useEffect(() => {
    const q = saisieOeuvre.trim()
    if (q.length < 2) { setSuggestionsOeuvre([]); return }
    const t = setTimeout(async () => {
      let req = supabase.from('oeuvres').select('id_oeuvre, titre, id_auteur').ilike('titre', `%${q}%`).limit(7)
      if (auteurConfirme) req = req.eq('id_auteur', auteurConfirme.id_auteur)
      const { data } = await req
      setSuggestionsOeuvre(((data ?? []) as Oeuvre[]).filter(o => !essaisOeuvres.some(e => e.id_oeuvre === o.id_oeuvre)))
    }, 250)
    return () => clearTimeout(t)
  }, [saisieOeuvre, essaisOeuvres, auteurConfirme])

  const celebrer = (pts: number) => {
    if (pts <= 0) return
    setFlashScore(true)
    window.setTimeout(() => setFlashScore(false), 900)
  }

  const ajouterResultat = (r: Resultat) => {
    setResultats(prev => [...prev, r])
    celebrer(r.points)
  }

  const nouveauVerset = async () => {
    setChargement(true); setErreur(null); setResultats([]); setEtapeB('testament')
    setEssaisLivres([]); setSaisieLivre(''); setMessageChaud(null)
    setReponseExacte(''); setSignalementOuvert(false); setStatutSignalement('idle')
    try { setVerset(await chargerVersetAleatoire()) }
    catch (e: any) { setErreur(e?.message ?? 'Impossible de charger un verset.') }
    finally { setChargement(false) }
  }

  const nouveauSegment = async () => {
    setChargement(true); setErreur(null); setResultats([]); setEtapeP('auteur')
    setEssaisAuteurs([]); setEssaisOeuvres([]); setSaisieAuteur(''); setSaisieOeuvre('')
    setAuteurConfirme(null); setMessageChaudP(null); setSuggestionsAuteur([]); setSuggestionsOeuvre([])
    try { setSegment(await chargerSegmentAleatoire()) }
    catch (e: any) { setErreur(e?.message ?? 'Impossible de charger un extrait.') }
    finally { setChargement(false) }
  }

  const changerMode = (m: Mode) => {
    setMode(m)
    setResultats([]); setChargement(true); setErreur(null)
    if (m === 'biblique') nouveauVerset()
    else if (m === 'patristique') nouveauSegment()
    else setChargement(false)
  }

  useEffect(() => { nouveauVerset() }, [])

  /* ── Actions bibliques ─────────────────────────────────────────────────── */
  const repondreTestament = (choix: Testament) => {
    if (!livreCorrect) return
    const ok = choix === livreCorrect.testament
    ajouterResultat({ label: 'Testament', points: ok ? 8 : 0, reponse: choix, detail: `Réponse : ${livreCorrect.testament}` })
    setEtapeB('livre')
  }

  const proposerLivre = (livre?: LivreBiblique) => {
    if (!livreCorrect || etapeB === 'resultat') return
    const choisi = livre ?? LIVRES.find(l => l.code === codeDepuisNom(saisieLivre))
    if (!choisi || essaisLivres.some(l => l.code === choisi.code) || essaisLivres.length >= 5) return
    const idx = essaisLivres.length + 1
    setEssaisLivres(prev => [...prev, choisi])
    setSaisieLivre(''); setSuggestionsLivreVisible(false)
    if (choisi.code === livreCorrect.code) {
      const pts = Math.max(12, 42 - (idx - 1) * 6)
      setMessageChaud(null)
      ajouterResultat({ label: `Livre, essai ${idx}`, points: pts, reponse: choisi.nom, detail: `Réponse : ${livreCorrect.nom}` })
      setEtapeB('resultat'); return
    }
    if (choisi.famille === livreCorrect.famille) {
      const msgs = familles[choisi.famille].messages
      setMessageChaud(msgs[(idx - 1) % msgs.length])
    } else setMessageChaud(null)
    ajouterResultat({ label: `Livre, essai ${idx}`, points: 0, reponse: choisi.nom, detail: `Réponse : ${livreCorrect.nom}` })
    if (idx >= 5) setEtapeB('resultat')
  }

  const validerExact = () => {
    if (!verset) return
    const ref = parserReference(reponseExacte)
    const ok = !!ref && ref.code === verset.livre && ref.chapitre === verset.chapitre && ref.verset === verset.verset
    ajouterResultat({ label: 'Je sais !', points: ok ? 50 : 0, reponse: reponseExacte, detail: `Réponse : ${refLisible(verset)}` })
    setEtapeB('resultat')
  }

  /* ── Actions patristiques ──────────────────────────────────────────────── */
  const proposerAuteur = (auteur?: Auteur) => {
    if (!segment || etapeP === 'resultat') return
    const choisi = auteur ?? (suggestionsAuteur.find(a => normaliser(a.nom) === normaliser(saisieAuteur)) ?? suggestionsAuteur[0])
    if (!choisi || essaisAuteurs.some(a => a.id_auteur === choisi.id_auteur) || essaisAuteurs.length >= 5) return
    const idx = essaisAuteurs.length + 1
    setEssaisAuteurs(prev => [...prev, choisi])
    setSaisieAuteur(''); setSuggestionsAuteur([])
    if (choisi.id_auteur === segment.id_auteur) {
      const pts = [35, 22, 12, 5, 2][idx - 1] ?? 0
      setMessageChaudP(null); setAuteurConfirme(choisi)
      ajouterResultat({ label: `Père de l'Église, essai ${idx}`, points: pts, reponse: choisi.nom, detail: `Réponse : ${segment.nomAuteur}` })
      setEtapeP('oeuvre'); return
    }
    if (segment.siecle && choisi.siecle === segment.siecle)
      setMessageChaudP(`Vous êtes dans le bon siècle (${segment.siecle}), mais ce n'est pas le bon père de l'Église.`)
    else setMessageChaudP(null)
    ajouterResultat({ label: `Père de l'Église, essai ${idx}`, points: 0, reponse: choisi.nom, detail: `Réponse : ${segment.nomAuteur}` })
    if (idx >= 5) setEtapeP('oeuvre')
  }

  const proposerOeuvre = (oeuvre?: Oeuvre) => {
    if (!segment || etapeP !== 'oeuvre') return
    const choisi = oeuvre ?? (suggestionsOeuvre.find(o => normaliser(o.titre) === normaliser(saisieOeuvre)) ?? suggestionsOeuvre[0])
    if (!choisi || essaisOeuvres.some(o => o.id_oeuvre === choisi.id_oeuvre) || essaisOeuvres.length >= 5) return
    const idx = essaisOeuvres.length + 1
    setEssaisOeuvres(prev => [...prev, choisi])
    setSaisieOeuvre(''); setSuggestionsOeuvre([])
    if (choisi.id_oeuvre === segment.id_oeuvre) {
      const pts = [25, 15, 8, 3, 1][idx - 1] ?? 0
      ajouterResultat({ label: `Œuvre, essai ${idx}`, points: pts, reponse: choisi.titre, detail: `Réponse : ${segment.titreOeuvre}` })
      setEtapeP('resultat'); return
    }
    ajouterResultat({ label: `Œuvre, essai ${idx}`, points: 0, reponse: choisi.titre, detail: `Réponse : ${segment.titreOeuvre}` })
    if (idx >= 5) setEtapeP('resultat')
  }

  const signaler = async () => {
    if (!verset) return
    setStatutSignalement('sending')
    const { data: session } = await supabase.auth.getSession()
    const user_id = session.session?.user.id ?? null
    await supabase.from('quiz_signalements').insert({ id_verset: verset.id_verset, raison: raisonSignalement, commentaire: commentaireSignalement || null, user_id })
    const fallback = await supabase.from('signalements').insert({ id_segment: null, user_id, message: `Quiz — ${verset.id_verset} — ${raisonSignalement}${commentaireSignalement ? ` : ${commentaireSignalement}` : ''}`, traite: false })
    setStatutSignalement(fallback.error ? 'err' : 'ok')
  }

  const etapesRestantes: string[] = mode === 'biblique'
    ? etapeB === 'testament' ? ['Testament', 'Livre'] : etapeB === 'livre' ? ['Livre'] : []
    : etapeP === 'auteur' ? ['Père de l\'Église', 'Œuvre'] : etapeP === 'oeuvre' ? ['Œuvre'] : []

  const ONGLETS: { id: Mode; label: string; sousTitre: string }[] = [
    { id: 'biblique',    label: 'Où est-il écrit ?',    sousTitre: 'Quiz biblique' },
    { id: 'patristique', label: 'Qui l\'a écrit ?',      sousTitre: 'Quiz patristique' },
    { id: 'chasse',      label: 'La Chasse aux mots',    sousTitre: 'Parcourir la Bible' },
  ]

  const avecEchelle = mode !== 'chasse'

  return (
    <section style={{ maxWidth: '1040px', margin: '0 auto', padding: '24px 20px 82px', fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, sans-serif' }}>
      <style>{`
        @keyframes bibleGamesGlow { 0%{box-shadow:0 0 0 rgba(206,236,170,0);transform:scale(1)} 35%{box-shadow:0 0 34px rgba(210,241,153,0.75);transform:scale(1.035)} 100%{box-shadow:0 0 0 rgba(206,236,170,0);transform:scale(1)} }
        @keyframes bibleGamesSpark { 0%{opacity:0;transform:scale(0.6) translateY(8px)} 35%{opacity:1} 100%{opacity:0;transform:scale(1.35) translateY(-20px)} }
        @keyframes jacobClimb { 0%{transform:translateY(3px)} 100%{transform:translateY(-3px)} }
        @keyframes chassePulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.7;transform:scale(0.97)} }
        @media (max-width:880px) { .bg-layout{grid-template-columns:1fr !important} .bg-score{min-height:auto !important} .bg-ladder{display:none !important} .bg-answer{grid-template-columns:1fr !important} }
      `}</style>

      <div style={{ background: 'linear-gradient(135deg, #f8fbf2 0%, #eef6e7 46%, #dfeedd 100%)', border: '1px solid rgba(61,107,79,0.24)', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 18px 42px rgba(33,68,45,0.12)', position: 'relative' }}>
        {flashScore && <FeuArtifice />}

        {/* ── Onglets ──────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(61,107,79,0.14)', background: 'rgba(255,255,255,0.55)', padding: '0 18px' }}>
          {ONGLETS.map(o => (
            <button key={o.id} onClick={() => changerMode(o.id)} style={{
              flex: 1, padding: '14px 8px 12px', border: 'none', background: 'none', cursor: 'pointer',
              borderBottom: mode === o.id ? '2.5px solid #3d6b4f' : '2.5px solid transparent',
              transition: 'border-color 0.15s',
            }}>
              <p style={{ margin: 0, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.12em', color: mode === o.id ? '#3d6b4f' : '#9aab9a', fontWeight: 800 }}>{o.sousTitre}</p>
              <p style={{ margin: '2px 0 0', fontSize: '13px', color: mode === o.id ? '#193824' : '#6b8a70', fontWeight: mode === o.id ? 800 : 600 }}>{o.label}</p>
            </button>
          ))}
        </div>

        <div className="bg-layout" style={{ display: 'grid', gridTemplateColumns: avecEchelle ? '150px minmax(0,1fr) 190px' : 'minmax(0,1fr)', gap: '16px', padding: '18px', alignItems: 'stretch' }}>

          {/* ── Panneau score (biblique + patristique) ──────────────────── */}
          {avecEchelle && (
            <aside className="bg-score" style={{ background: 'rgba(255,255,255,0.72)', border: '1px solid rgba(61,107,79,0.18)', borderRadius: '12px', padding: '14px 12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '420px' }}>
              <div>
                <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.14em', color: '#6b8a70', fontWeight: 800, margin: '0 0 8px' }}>Score</p>
                <div style={{ fontSize: '42px', lineHeight: 1, fontWeight: 900, color: '#2f6a48', animation: flashScore ? 'bibleGamesGlow 0.9s ease-out' : 'none', borderRadius: '12px', padding: '4px 0' }}>{score}</div>
                <p style={{ fontSize: '11px', lineHeight: 1.35, color: '#5f725f', margin: '8px 0 0' }}>{messageScore(score)}</p>
              </div>
              <button onClick={mode === 'biblique' ? nouveauVerset : nouveauSegment} style={btnSecondaire}>
                {mode === 'biblique' ? 'Nouveau verset' : 'Nouvel extrait'}
              </button>
            </aside>
          )}

          {/* ── Zone de jeu ────────────────────────────────────────────── */}
          <div>
            {mode === 'chasse' ? (
              <JeuChasse />
            ) : chargement ? (
              <p style={etatTexte}>Chargement…</p>
            ) : erreur ? (
              <p style={{ ...etatTexte, color: '#c0562a' }}>{erreur}</p>
            ) : mode === 'biblique' && verset && livreCorrect ? (
              <JeuBiblique
                verset={verset} livreCorrect={livreCorrect} etape={etapeB} resultats={resultats} etapesRestantes={etapesRestantes}
                saisieLivre={saisieLivre} setSaisieLivre={setSaisieLivre}
                suggestionsLivre={suggestionsLivre} suggestionsLivreVisible={suggestionsLivreVisible} setSuggestionsLivreVisible={setSuggestionsLivreVisible}
                essaisLivres={essaisLivres} messageChaud={messageChaud}
                reponseExacte={reponseExacte} setReponseExacte={setReponseExacte}
                repondreTestament={repondreTestament} proposerLivre={proposerLivre} validerExact={validerExact} nouveauVerset={nouveauVerset}
                signalementOuvert={signalementOuvert} setSignalementOuvert={setSignalementOuvert}
                raisonSignalement={raisonSignalement} setRaisonSignalement={setRaisonSignalement}
                commentaireSignalement={commentaireSignalement} setCommentaireSignalement={setCommentaireSignalement}
                statutSignalement={statutSignalement} signaler={signaler} score={score}
              />
            ) : mode === 'patristique' && segment ? (
              <JeuPatristique
                segment={segment} etape={etapeP} resultats={resultats} etapesRestantes={etapesRestantes}
                saisieAuteur={saisieAuteur} setSaisieAuteur={setSaisieAuteur}
                saisieOeuvre={saisieOeuvre} setSaisieOeuvre={setSaisieOeuvre}
                suggestionsAuteur={suggestionsAuteur} suggestionsOeuvre={suggestionsOeuvre}
                essaisAuteurs={essaisAuteurs} essaisOeuvres={essaisOeuvres}
                auteurConfirme={auteurConfirme} messageChaudP={messageChaudP}
                proposerAuteur={proposerAuteur} proposerOeuvre={proposerOeuvre} nouveauSegment={nouveauSegment} score={score}
              />
            ) : null}
          </div>

          {/* ── Échelle de Jacob ─────────────────────────────────────── */}
          {avecEchelle && <EchelleJacob score={score} flash={flashScore} />}
        </div>
      </div>
    </section>
  )
}

/* ── Jeu : La Chasse aux mots ────────────────────────────────────────────── */
function JeuChasse() {
  const [motIdx, setMotIdx] = useState(() => Math.floor(Math.random() * MOTS_CHASSE.length))
  const [phase, setPhase] = useState<'attente' | 'jeu' | 'resultat'>('attente')
  const [secondes, setSecondes] = useState(0)
  const [refs, setRefs] = useState(['', '', ''])
  const [verification, setVerification] = useState<({ ok: boolean; texte?: string; refLisible?: string } | null)[]>([null, null, null])
  const [enCours, setEnCours] = useState(false)
  const [indiceVisible, setIndiceVisible] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const entree = MOTS_CHASSE[motIdx]

  useEffect(() => {
    if (phase === 'jeu') {
      intervalRef.current = setInterval(() => setSecondes(s => s + 1), 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [phase])

  const demarrer = () => {
    setPhase('jeu'); setSecondes(0); setRefs(['', '', '']); setVerification([null, null, null]); setIndiceVisible(false)
  }

  const nouveauMot = () => {
    setMotIdx(Math.floor(Math.random() * MOTS_CHASSE.length))
    setPhase('attente'); setSecondes(0); setRefs(['', '', '']); setVerification([null, null, null]); setIndiceVisible(false)
  }

  const verifier = async () => {
    setEnCours(true)
    const resultats = await Promise.all(refs.map(r => r.trim() ? verifierVersetContientMot(r, entree.mot) : Promise.resolve({ ok: false })))
    setVerification(resultats)
    setPhase('resultat')
    setEnCours(false)
  }

  const nbCorrects = verification.filter(v => v?.ok).length
  const scoreChasse = phase === 'resultat'
    ? Math.max(0, nbCorrects * Math.max(5, 60 - Math.floor(secondes / 5)))
    : 0

  const couleurTemps = secondes < 60 ? '#3d6b4f' : secondes < 120 ? '#9a7a20' : '#c0562a'

  return (
    <div style={{ display: 'grid', gap: '14px' }}>

      {/* Mot vedette */}
      <div style={{
        background: 'rgba(255,255,255,0.80)', border: '1px solid rgba(61,107,79,0.18)',
        borderRadius: '14px', padding: '28px 20px', textAlign: 'center',
      }}>
        <p style={{ margin: '0 0 6px', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.16em', color: '#6b8a70', fontWeight: 800 }}>
          Retrouvez ce mot dans trois versets
        </p>
        <p style={{
          margin: '0 0 10px',
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: 'clamp(32px, 5vw, 48px)',
          fontWeight: 'normal', color: '#193824', letterSpacing: '0.04em',
          fontStyle: 'italic',
          animation: phase === 'attente' ? 'chassePulse 2.8s ease-in-out infinite' : 'none',
        }}>
          {entree.mot}
        </p>

        {phase !== 'attente' && (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(61,107,79,0.08)', borderRadius: '8px', padding: '5px 14px' }}>
            <span style={{ fontSize: '18px', fontWeight: 900, color: couleurTemps, fontVariantNumeric: 'tabular-nums' }}>{formatTemps(secondes)}</span>
          </div>
        )}

        {phase === 'attente' && (
          <div style={{ marginTop: '4px' }}>
            <button
              onClick={() => setIndiceVisible(v => !v)}
              style={{ fontSize: '11px', color: '#9aab9a', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', marginBottom: '14px', display: 'block', margin: '0 auto 14px' }}
            >
              {indiceVisible ? 'Masquer l\'indice' : 'Voir un indice'}
            </button>
            {indiceVisible && (
              <p style={{ fontStyle: 'italic', fontSize: '13px', color: '#5a6b5e', margin: '0 0 16px' }}>{entree.indice}</p>
            )}
            <button onClick={demarrer} style={{ ...btnPrincipal, fontSize: '13px', padding: '10px 28px' }}>
              Lancer le chronomètre
            </button>
          </div>
        )}
      </div>

      {/* Champ de saisie (phase jeu) */}
      {phase === 'jeu' && (
        <div style={{ background: 'rgba(255,255,255,0.74)', border: '1px solid rgba(61,107,79,0.16)', borderRadius: '12px', padding: '16px' }}>
          <p style={{ margin: '0 0 14px', fontSize: '12px', color: '#5d735f', lineHeight: 1.5 }}>
            Entrez trois références de versets contenant ce mot. Format : <em>Gn 1, 1</em> ou <em>Jn 3, 16</em>.<br />
            <span style={{ color: '#9aab9a' }}>Ctrl+F est désactivé sur cette page.</span>
          </p>
          {refs.map((r, i) => (
            <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: '#9aab9a', fontWeight: 800, width: '16px', flexShrink: 0 }}>{i + 1}.</span>
              <input
                value={r}
                onChange={e => setRefs(prev => prev.map((v, j) => j === i ? e.target.value : v))}
                onKeyDown={e => { if (e.key === 'Enter' && i < 2) (document.querySelectorAll('.chasse-input')[i + 1] as HTMLInputElement)?.focus() }}
                placeholder={`Verset ${i + 1} — ex. Ps 23, 1`}
                className="chasse-input"
                style={{ ...inputStyle, flex: 1 }}
              />
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
            <button
              onClick={verifier}
              disabled={enCours || refs.filter(r => r.trim()).length === 0}
              style={btnPrincipal}
            >
              {enCours ? 'Vérification…' : 'Vérifier'}
            </button>
          </div>
        </div>
      )}

      {/* Résultat */}
      {phase === 'resultat' && (
        <div style={{ background: 'rgba(255,255,255,0.74)', border: '1px solid rgba(61,107,79,0.16)', borderRadius: '12px', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '28px', fontWeight: 900, color: '#2f6a48' }}>{scoreChasse} pts</span>
            <span style={{ fontSize: '13px', color: '#5f725f' }}>{nbCorrects}/3 versets corrects · {formatTemps(secondes)}</span>
          </div>

          {verification.map((v, i) => (
            <div key={i} style={{
              marginBottom: '10px', padding: '10px 12px', borderRadius: '9px',
              background: !v ? 'rgba(0,0,0,0.03)' : v.ok ? 'rgba(61,107,79,0.08)' : 'rgba(192,86,42,0.07)',
              border: `1px solid ${!v ? '#e4dfd8' : v.ok ? 'rgba(61,107,79,0.20)' : 'rgba(192,86,42,0.18)'}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: v?.texte ? '6px' : 0 }}>
                <span style={{ fontSize: '14px' }}>{!refs[i].trim() ? '—' : v?.ok ? '✓' : '✗'}</span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: v?.ok ? '#3d6b4f' : '#7a4020' }}>
                  {refs[i].trim() || <em style={{ color: '#9aab9a' }}>Non renseigné</em>}
                </span>
                {v?.refLisible && v.refLisible !== refs[i].trim() && (
                  <span style={{ fontSize: '11px', color: '#9aab9a' }}>→ {v.refLisible}</span>
                )}
              </div>
              {v?.texte && (
                <p style={{ margin: 0, fontSize: '12px', color: '#4a5e50', fontStyle: 'italic', lineHeight: 1.5 }}>
                  « {v.texte.length > 140 ? v.texte.slice(0, 140) + '…' : v.texte} »
                </p>
              )}
            </div>
          ))}

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px' }}>
            <button onClick={demarrer} style={btnSecondaire}>Réessayer ce mot</button>
            <button onClick={nouveauMot} style={btnPrincipal}>Nouveau mot</button>
          </div>
        </div>
      )}

      {/* Aide */}
      {phase === 'jeu' && (
        <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(255,255,255,0.5)', border: '1px solid rgba(61,107,79,0.10)', fontSize: '11.5px', color: '#6b7d6d', lineHeight: 1.6 }}>
          <strong style={{ color: '#3d6b4f' }}>Astuce :</strong> Ouvrez la Bible dans un autre onglet et utilisez la navigation par livre et chapitre.
          {!indiceVisible && phase === 'jeu' && (
            <button onClick={() => setIndiceVisible(true)} style={{ marginLeft: '10px', fontSize: '11px', color: '#9aab9a', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
              Voir l'indice
            </button>
          )}
          {indiceVisible && <span style={{ display: 'block', marginTop: '4px', fontStyle: 'italic', color: '#5a6b5e' }}>{entree.indice}</span>}
        </div>
      )}
    </div>
  )
}

/* ── Jeu biblique ────────────────────────────────────────────────────────── */
function JeuBiblique({ verset, livreCorrect, etape, resultats, etapesRestantes, saisieLivre, setSaisieLivre, suggestionsLivre, suggestionsLivreVisible, setSuggestionsLivreVisible, essaisLivres, messageChaud, reponseExacte, setReponseExacte, repondreTestament, proposerLivre, validerExact, nouveauVerset, signalementOuvert, setSignalementOuvert, raisonSignalement, setRaisonSignalement, commentaireSignalement, setCommentaireSignalement, statutSignalement, signaler, score }: {
  verset: VersetQuiz; livreCorrect: LivreBiblique; etape: EtapeBiblique
  resultats: Resultat[]; etapesRestantes: string[]
  saisieLivre: string; setSaisieLivre: (s: string) => void
  suggestionsLivre: LivreBiblique[]; suggestionsLivreVisible: boolean; setSuggestionsLivreVisible: (b: boolean) => void
  essaisLivres: LivreBiblique[]; messageChaud: string | null
  reponseExacte: string; setReponseExacte: (s: string) => void
  repondreTestament: (t: 'Ancien Testament' | 'Nouveau Testament') => void
  proposerLivre: (l?: LivreBiblique) => void
  validerExact: () => void; nouveauVerset: () => void
  signalementOuvert: boolean; setSignalementOuvert: Dispatch<SetStateAction<boolean>>
  raisonSignalement: string; setRaisonSignalement: (s: string) => void
  commentaireSignalement: string; setCommentaireSignalement: (s: string) => void
  statutSignalement: string; signaler: () => void; score: number
}) {
  return (
    <>
      <div style={{ position: 'sticky', top: '58px', zIndex: 5, background: 'rgba(248,251,242,0.96)', border: '1px solid rgba(61,107,79,0.20)', borderRadius: '13px', padding: '13px 14px', backdropFilter: 'blur(8px)' }}>
        <p lang="fr" style={{ margin: 0, fontSize: '16px', lineHeight: 1.58, color: '#203528', textAlign: 'justify', fontWeight: 560 }}>« {verset.TR0001} »</p>
        <BarreProgression resultats={resultats} etapesRestantes={etapesRestantes} />
      </div>
      <div style={{ marginTop: '14px', display: 'grid', gap: '12px' }}>
        <div className="bg-answer" style={blocJeSaisStyle}>
          <div>
            <p style={{ margin: '0 0 3px', fontSize: '12px', color: '#214d34', fontWeight: 900 }}>Je sais !</p>
            <p style={{ margin: 0, fontSize: '11px', color: '#6c7b6d' }}>Entrez la référence exacte, ex. : Gn 1, 1.</p>
          </div>
          <div style={{ display: 'flex', gap: '7px', minWidth: 0 }}>
            <input value={reponseExacte} onChange={e => setReponseExacte(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') validerExact() }} placeholder="Gn 1, 1" style={inputStyle} />
            <button onClick={validerExact} disabled={!reponseExacte.trim()} style={btnPrincipal}>Valider</button>
          </div>
        </div>
        {etape === 'testament' && (
          <BlocJeu titre="1. Testament">
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button onClick={() => repondreTestament('Ancien Testament')} style={btnPrincipal}>Ancien Testament</button>
              <button onClick={() => repondreTestament('Nouveau Testament')} style={btnPrincipal}>Nouveau Testament</button>
            </div>
          </BlocJeu>
        )}
        {etape === 'livre' && (
          <BlocJeu titre={`2. Livre biblique (essai ${Math.min(essaisLivres.length + 1, 5)}/5)`}>
            <p style={aideStyle}>Faites vos choix un par un. Si vous êtes dans la bonne famille de livres, le jeu vous le dira.</p>
            <div style={{ position: 'relative' }}>
              <input value={saisieLivre}
                onChange={e => { setSaisieLivre(e.target.value); setSuggestionsLivreVisible(true) }}
                onKeyDown={e => { if (e.key === 'Enter') proposerLivre() }}
                onFocus={() => setSuggestionsLivreVisible(true)}
                placeholder="Ex. Genèse, Isaïe, Romains…" style={{ ...inputStyle, width: '100%' }} />
              {suggestionsLivreVisible && suggestionsLivre.length > 0 && (
                <div style={menuSuggestionsStyle}>
                  {suggestionsLivre.map(l => <button key={l.code} onClick={() => { proposerLivre(l); setSuggestionsLivreVisible(false) }} style={suggestionStyle}>{l.nom}</button>)}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center', marginTop: '10px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {essaisLivres.map((l, i) => <span key={l.code} style={tagStyle}>{i + 1}. {l.nom}</span>)}
              </div>
              <button onClick={() => proposerLivre()} disabled={!saisieLivre.trim() || essaisLivres.length >= 5} style={btnPrincipal}>Proposer</button>
            </div>
            {messageChaud && <div style={messageChaudStyle}>{messageChaud}</div>}
          </BlocJeu>
        )}
        {etape === 'resultat' && (
          <BlocResultat verset={verset} livreCorrect={livreCorrect} score={score} resultats={resultats}
            nouveauVerset={nouveauVerset} signalementOuvert={signalementOuvert} setSignalementOuvert={setSignalementOuvert}
            raisonSignalement={raisonSignalement} setRaisonSignalement={setRaisonSignalement}
            commentaireSignalement={commentaireSignalement} setCommentaireSignalement={setCommentaireSignalement}
            statutSignalement={statutSignalement} signaler={signaler} />
        )}
      </div>
    </>
  )
}

/* ── Jeu patristique ─────────────────────────────────────────────────────── */
function JeuPatristique({ segment, etape, resultats, etapesRestantes, saisieAuteur, setSaisieAuteur, saisieOeuvre, setSaisieOeuvre, suggestionsAuteur, suggestionsOeuvre, essaisAuteurs, essaisOeuvres, auteurConfirme, messageChaudP, proposerAuteur, proposerOeuvre, nouveauSegment, score }: {
  segment: SegmentQuiz; etape: EtapePatristique
  resultats: Resultat[]; etapesRestantes: string[]
  saisieAuteur: string; setSaisieAuteur: (s: string) => void
  saisieOeuvre: string; setSaisieOeuvre: (s: string) => void
  suggestionsAuteur: Auteur[]; suggestionsOeuvre: Oeuvre[]
  essaisAuteurs: Auteur[]; essaisOeuvres: Oeuvre[]
  auteurConfirme: Auteur | null; messageChaudP: string | null
  proposerAuteur: (a?: Auteur) => void
  proposerOeuvre: (o?: Oeuvre) => void
  nouveauSegment: () => void; score: number
}) {
  return (
    <>
      <div style={{ position: 'sticky', top: '58px', zIndex: 5, background: 'rgba(248,251,242,0.96)', border: '1px solid rgba(61,107,79,0.20)', borderRadius: '13px', padding: '13px 14px', backdropFilter: 'blur(8px)' }}>
        <p lang="fr" style={{ margin: 0, fontSize: '15px', lineHeight: 1.65, color: '#203528', textAlign: 'justify', fontWeight: 500, fontStyle: 'italic' }}>« {segment.texte} »</p>
        <BarreProgression resultats={resultats} etapesRestantes={etapesRestantes} />
      </div>
      <div style={{ marginTop: '14px', display: 'grid', gap: '12px' }}>
        {etape === 'auteur' && (
          <BlocJeu titre={`1. Père de l'Église (essai ${Math.min(essaisAuteurs.length + 1, 5)}/5)`}>
            <p style={aideStyle}>Entrez le nom d'un père de l'Église. Si vous êtes dans le bon siècle, le jeu vous le dira.</p>
            <div style={{ position: 'relative' }}>
              <input value={saisieAuteur} onChange={e => setSaisieAuteur(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && suggestionsAuteur[0]) proposerAuteur(suggestionsAuteur[0]) }}
                placeholder="Ex. Augustin, Origène, Jean Chrysostome…" style={{ ...inputStyle, width: '100%' }} />
              {suggestionsAuteur.length > 0 && (
                <div style={menuSuggestionsStyle}>
                  {suggestionsAuteur.map(a => <button key={a.id_auteur} onClick={() => proposerAuteur(a)} style={suggestionStyle}>{a.nom}</button>)}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center', marginTop: '10px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {essaisAuteurs.map((a, i) => <span key={a.id_auteur} style={tagStyle}>{i + 1}. {a.nom}</span>)}
              </div>
              <button onClick={() => proposerAuteur(suggestionsAuteur[0])} disabled={!saisieAuteur.trim() || essaisAuteurs.length >= 5 || !suggestionsAuteur[0]} style={btnPrincipal}>Proposer</button>
            </div>
            {messageChaudP && <div style={messageChaudStyle}>{messageChaudP}</div>}
          </BlocJeu>
        )}
        {etape === 'oeuvre' && (
          <BlocJeu titre={`2. Œuvre ${auteurConfirme ? `de ${auteurConfirme.nom}` : ''} (essai ${Math.min(essaisOeuvres.length + 1, 5)}/5)`}>
            <p style={aideStyle}>{auteurConfirme ? `Vous avez identifié l'auteur. Dans quelle œuvre cet extrait est-il tiré ?` : `L'auteur n'a pas été trouvé. Essayez de nommer l'œuvre.`}</p>
            <div style={{ position: 'relative' }}>
              <input value={saisieOeuvre} onChange={e => setSaisieOeuvre(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && suggestionsOeuvre[0]) proposerOeuvre(suggestionsOeuvre[0]) }}
                placeholder="Titre de l'œuvre…" style={{ ...inputStyle, width: '100%' }} />
              {suggestionsOeuvre.length > 0 && (
                <div style={menuSuggestionsStyle}>
                  {suggestionsOeuvre.map(o => <button key={o.id_oeuvre} onClick={() => proposerOeuvre(o)} style={suggestionStyle}>{o.titre}</button>)}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center', marginTop: '10px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {essaisOeuvres.map((o, i) => <span key={o.id_oeuvre} style={tagStyle}>{i + 1}. {o.titre}</span>)}
              </div>
              <button onClick={() => proposerOeuvre(suggestionsOeuvre[0])} disabled={!saisieOeuvre.trim() || essaisOeuvres.length >= 5 || !suggestionsOeuvre[0]} style={btnPrincipal}>Proposer</button>
            </div>
          </BlocJeu>
        )}
        {etape === 'resultat' && (
          <BlocJeu titre="Résultat">
            <p style={{ fontSize: '14px', color: '#163422', margin: '0 0 2px', fontWeight: 900 }}>{segment.nomAuteur}</p>
            <p style={{ fontSize: '13px', color: '#3d6b4f', fontStyle: 'italic', margin: '0 0 8px' }}>{segment.titreOeuvre}</p>
            <p style={{ fontSize: '13px', color: '#3d6b4f', fontWeight: 800, margin: '0 0 12px' }}>{score} points — {messageScore(score)}</p>
            {resultats.map((r, i) => (
              <p key={`${r.label}-${i}`} style={{ fontSize: '12px', color: '#536756', margin: '4px 0' }}>
                {r.label} : <strong>{r.points}</strong> pts{r.reponse ? ` — ${r.reponse}` : ''}. {r.detail}
              </p>
            ))}
            <button onClick={nouveauSegment} style={{ ...btnPrincipal, marginTop: '16px' }}>Nouvel extrait</button>
          </BlocJeu>
        )}
      </div>
    </>
  )
}

/* ── Résultat biblique ───────────────────────────────────────────────────── */
function BlocResultat({ verset, livreCorrect, score, resultats, nouveauVerset, signalementOuvert, setSignalementOuvert, raisonSignalement, setRaisonSignalement, commentaireSignalement, setCommentaireSignalement, statutSignalement, signaler }: {
  verset: VersetQuiz; livreCorrect: LivreBiblique; score: number; resultats: Resultat[]
  nouveauVerset: () => void
  signalementOuvert: boolean; setSignalementOuvert: Dispatch<SetStateAction<boolean>>
  raisonSignalement: string; setRaisonSignalement: (s: string) => void
  commentaireSignalement: string; setCommentaireSignalement: (s: string) => void
  statutSignalement: string; signaler: () => void
}) {
  const ref = `${livreCorrect.nom} ${verset.chapitre}, ${verset.verset}`
  return (
    <BlocJeu titre="Résultat">
      <p style={{ fontSize: '20px', color: '#163422', margin: '0 0 5px', fontWeight: 900 }}>{ref}</p>
      <p style={{ fontSize: '13px', color: '#3d6b4f', fontWeight: 800, margin: '0 0 12px' }}>{score} points — {messageScore(score)}</p>
      {resultats.map((r, i) => (
        <p key={`${r.label}-${i}`} style={{ fontSize: '12px', color: '#536756', margin: '4px 0' }}>
          {r.label} : <strong>{r.points}</strong> pts{r.reponse ? ` — ${r.reponse}` : ''}. {r.detail}
        </p>
      ))}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '16px' }}>
        <button onClick={nouveauVerset} style={btnPrincipal}>Nouveau verset</button>
        <button onClick={() => setSignalementOuvert(o => !o)} style={btnSecondaire}>Signaler ce verset</button>
      </div>
      {signalementOuvert && (
        <div style={{ marginTop: '14px', padding: '12px', border: '1px solid #d7e3d3', borderRadius: '10px', background: '#fbfdf8' }}>
          <select value={raisonSignalement} onChange={e => setRaisonSignalement(e.target.value)} style={{ ...inputStyle, width: '100%' }}>
            {['verset trop générique','verset trop court','doublon ou quasi-doublon','dépend trop du verset précédent','problème de traduction','autre'].map(r => <option key={r}>{r}</option>)}
          </select>
          <textarea value={commentaireSignalement} onChange={e => setCommentaireSignalement(e.target.value)} placeholder="Commentaire optionnel" rows={2} style={{ ...inputStyle, width: '100%', marginTop: '8px', resize: 'vertical' }} />
          <button onClick={signaler} disabled={statutSignalement === 'sending' || statutSignalement === 'ok'} style={{ ...btnPrincipal, marginTop: '8px' }}>
            {statutSignalement === 'ok' ? 'Signalement envoyé ✓' : 'Envoyer'}
          </button>
          {statutSignalement === 'err' && <span style={{ marginLeft: '10px', color: '#c0562a', fontSize: '11px' }}>Erreur.</span>}
        </div>
      )}
    </BlocJeu>
  )
}

/* ── Barre de progression ────────────────────────────────────────────────── */
function BarreProgression({ resultats, etapesRestantes }: { resultats: Resultat[]; etapesRestantes: string[] }) {
  const lignes = [...resultats, ...etapesRestantes.map(label => ({ label, points: 0, detail: 'À jouer', reponse: undefined }))]
  return (
    <div style={{ display: 'flex', gap: '5px', marginTop: '11px', overflowX: 'auto', paddingBottom: '1px' }}>
      {lignes.map((r, i) => {
        const aVenir = i >= resultats.length
        return (
          <div key={`${r.label}-${i}`} style={{ flex: '1 0 100px', minHeight: '36px', borderRadius: '8px', padding: '6px 7px', background: aVenir ? 'rgba(255,255,255,0.68)' : r.points > 0 ? 'rgba(61,107,79,0.13)' : 'rgba(194,112,38,0.10)', border: `1px solid ${aVenir ? 'rgba(61,107,79,0.14)' : r.points > 0 ? 'rgba(61,107,79,0.20)' : 'rgba(194,112,38,0.18)'}` }}>
            <p style={{ margin: 0, fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', color: aVenir ? '#66806a' : r.points > 0 ? '#3d6b4f' : '#9a5520', fontWeight: 900 }}>{r.label}</p>
            <p style={{ margin: '2px 0 0', fontSize: '10px', color: '#294b35', fontWeight: 800 }}>{aVenir ? 'À jouer' : `${r.points} pts${r.reponse ? ` — ${r.reponse}` : ''}`}</p>
          </div>
        )
      })}
    </div>
  )
}

/* ── Échelle de Jacob ────────────────────────────────────────────────────── */
function EchelleJacob({ score, flash }: { score: number; flash: boolean }) {
  const progress = Math.min(100, Math.max(0, score)) / 100
  const yJacob = 248 - progress * 220
  const etoiles = [[22,18],[68,12],[108,8],[132,28],[90,22],[38,35],[120,42],[14,50],[55,5],[100,55]]
  return (
    <aside className="bg-ladder" style={{ background: 'rgba(255,255,255,0.58)', border: '1px solid rgba(61,107,79,0.18)', borderRadius: '12px', padding: '10px 8px', minHeight: '420px', position: 'relative', overflow: 'hidden' }}>
      <p style={{ margin: '0 0 6px', textAlign: 'center', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6a7b68', fontWeight: 900 }}>Échelle de Jacob</p>
      <svg viewBox="0 0 160 310" width="100%" height="320" aria-hidden="true" style={{ display: 'block' }}>
        <defs>
          <linearGradient id="cielGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0d1c2e" /><stop offset="65%" stopColor="#1a3348" /><stop offset="100%" stopColor="#2e5c42" /></linearGradient>
          <linearGradient id="solGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4a3820" /><stop offset="100%" stopColor="#2a1e0e" /></linearGradient>
          <linearGradient id="echelleGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f5e098" /><stop offset="100%" stopColor="#c8a040" /></linearGradient>
          <filter id="lueur"><feGaussianBlur stdDeviation="3" result="blur" /><feComposite in="SourceGraphic" in2="blur" operator="over" /></filter>
        </defs>
        <rect x="0" y="0" width="160" height="280" fill="url(#cielGrad)" />
        {etoiles.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 1.4 : 0.9} fill="#fff" opacity={0.5 + (i % 4) * 0.12} />)}
        <circle cx="128" cy="30" r="12" fill="#e8d870" opacity="0.65" />
        <circle cx="133" cy="27" r="10" fill="#1a3348" opacity="0.95" />
        <rect x="0" y="278" width="160" height="32" fill="url(#solGrad)" />
        <ellipse cx="80" cy="278" rx="62" ry="6" fill="#3a2c14" opacity="0.8" />
        <path d="M20 278 Q28 268 36 278 M40 278 Q46 271 52 278 M110 278 Q118 269 126 278 M130 278 Q137 272 144 278" stroke="#2e5c42" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <line x1="62" y1="272" x2="62" y2="18" stroke="url(#echelleGrad)" strokeWidth="4" strokeLinecap="round" />
        <line x1="98" y1="272" x2="98" y2="18" stroke="url(#echelleGrad)" strokeWidth="4" strokeLinecap="round" />
        {Array.from({ length: 11 }).map((_, i) => { const yy = 255 - i * 22; return <line key={i} x1="62" y1={yy} x2="98" y2={yy} stroke="#f0d278" strokeWidth="3" strokeLinecap="round" opacity={0.85 + (i / 11) * 0.15} /> })}
        <ellipse cx="80" cy="14" rx="22" ry="10" fill="#f5e098" opacity={0.12 + progress * 0.25} filter="url(#lueur)" />
        <ellipse cx="80" cy="14" rx="10" ry="5" fill="#fff" opacity={0.08 + progress * 0.20} />
        <g style={{ transform: `translateY(${yJacob - 248}px)`, transition: 'transform 0.8s cubic-bezier(.2,.8,.2,1)', animation: flash ? 'jacobClimb 0.18s ease-in-out 4 alternate' : 'none' }}>
          <circle cx="80" cy="232" r="8" fill="#f2c99a" stroke="#7a5228" strokeWidth="1.3" />
          <path d="M74 229 Q80 222 86 229" stroke="#5a3820" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <line x1="80" y1="240" x2="80" y2="260" stroke="#4a6e56" strokeWidth="4" strokeLinecap="round" />
          <path d="M80 244 Q72 240 62 242" stroke="#4a6e56" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M80 244 Q88 240 98 242" stroke="#4a6e56" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M80 260 Q75 268 68 272" stroke="#4a6e56" strokeWidth="3.5" fill="none" strokeLinecap="round" />
          <path d="M80 260 Q84 265 90 262" stroke="#4a6e56" strokeWidth="3.5" fill="none" strokeLinecap="round" />
          <circle cx="67" cy="272" r="3" fill="#3a5540" />
          <path d="M76 241 Q70 252 72 262 Q76 268 80 260 Q84 268 88 262 Q90 252 84 241 Z" fill="#5a8a6a" opacity="0.6" stroke="#3a5540" strokeWidth="0.8" />
        </g>
        <g style={{ transform: `translateY(${yJacob - 248}px)`, transition: 'transform 0.8s cubic-bezier(.2,.8,.2,1)' }}>
          <rect x="104" y="228" width="38" height="16" rx="5" fill="rgba(0,0,0,0.45)" />
          <text x="123" y="240" textAnchor="middle" fontSize="10" fontWeight="800" fill="#f5e098" fontFamily="Inter, system-ui, sans-serif">{score} pts</text>
        </g>
      </svg>
    </aside>
  )
}

/* ── Feu d'artifice ──────────────────────────────────────────────────────── */
function FeuArtifice() {
  return (
    <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 20 }}>
      {Array.from({ length: 18 }).map((_, i) => (
        <span key={i} style={{ position: 'absolute', left: `${18 + (i * 37) % 70}%`, top: `${10 + (i * 23) % 55}%`, width: '7px', height: '7px', borderRadius: '50%', background: i % 3 === 0 ? '#f6cf62' : i % 3 === 1 ? '#8bcf83' : '#ffffff', animation: `bibleGamesSpark ${0.55 + (i % 4) * 0.08}s ease-out forwards`, boxShadow: '0 0 12px currentColor' }} />
      ))}
    </div>
  )
}

/* ── Bloc jeu générique ──────────────────────────────────────────────────── */
function BlocJeu({ titre, children }: { titre: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.74)', border: '1px solid rgba(61,107,79,0.16)', borderRadius: '12px', padding: '14px' }}>
      <h3 style={{ fontSize: '15px', color: '#1d3e29', margin: '0 0 10px', fontWeight: 900 }}>{titre}</h3>
      {children}
    </div>
  )
}

/* ── Styles partagés ─────────────────────────────────────────────────────── */
const btnPrincipal = { fontSize: '12px', padding: '8px 13px', borderRadius: '8px', border: 'none', background: '#3d6b4f', color: '#fff', cursor: 'pointer', fontWeight: 800, whiteSpace: 'nowrap' } as const
const btnSecondaire = { fontSize: '12px', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(61,107,79,0.24)', background: '#fff', color: '#3d6b4f', cursor: 'pointer', fontWeight: 800 } as const
const inputStyle = { minWidth: 0, fontSize: '12px', padding: '8px 10px', border: '1px solid #bdd2bf', borderRadius: '8px', background: '#fff', color: '#203528', outline: 'none', boxSizing: 'border-box' } as const
const tagStyle = { fontSize: '11px', color: '#2f6a48', background: 'rgba(61,107,79,0.10)', border: '1px solid rgba(61,107,79,0.20)', borderRadius: '999px', padding: '4px 8px', fontWeight: 700 } as const
const menuSuggestionsStyle = { position: 'absolute', left: 0, right: 0, top: 'calc(100% + 4px)', background: '#fff', border: '1px solid #bdd2bf', borderRadius: '9px', zIndex: 30, boxShadow: '0 10px 26px rgba(35,66,44,0.14)', overflow: 'hidden' } as const
const suggestionStyle = { display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', fontSize: '12px', color: '#203528', background: '#fff', border: 'none', borderBottom: '1px solid #eef3eb', cursor: 'pointer' } as const
const blocJeSaisStyle = { display: 'grid', gridTemplateColumns: 'minmax(150px,1fr) minmax(220px,1.25fr)', gap: '12px', alignItems: 'center', background: '#fffdf6', border: '1px solid rgba(190,154,73,0.28)', borderRadius: '12px', padding: '12px' } as const
const aideStyle = { fontSize: '12px', color: '#5d735f', margin: '0 0 10px', lineHeight: 1.45 } as const
const messageChaudStyle = { marginTop: '10px', padding: '9px 11px', borderRadius: '9px', background: '#fff4df', border: '1px solid rgba(194,112,38,0.26)', color: '#9a5520', fontSize: '12px', fontWeight: 700 } as const
const etatTexte = { textAlign: 'center', color: '#6c7b6d', fontStyle: 'italic', fontSize: '13px' } as const
