'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/app/lib/supabase'

type Testament = 'Ancien Testament' | 'Nouveau Testament'
type Etape = 'testament' | 'livre' | 'resultat'
type Resultat = { label: string; points: number; detail: string; reponse?: string }
type VersetQuiz = {
  id_verset: string
  livre: string
  chapitre: number
  verset: number
  ref: string
  TR0001: string | null
}
type LivreBiblique = {
  code: string
  nom: string
  testament: Testament
  famille: FamilleCode
  ordre: number
}
type FamilleCode = 'pentateuque' | 'historiques-at' | 'poetiques' | 'grands-prophetes' | 'petits-prophetes' | 'evangiles-actes' | 'paul' | 'catholiques' | 'apocalypse'

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
  pentateuque: { titre: 'Pentateuque', messages: ['Presque ! Le verset se trouve bien dans le Pentateuque, mais vous n’avez pas nommé le bon livre.', 'Très chaud : on reste parmi les cinq premiers livres.'] },
  'historiques-at': { titre: 'Livres historiques', messages: ['Il est bien question de l’histoire d’Israël, mais vous n’avez pas nommé le bon livre !', 'Vous êtes dans la bonne mémoire historique, mais pas dans le bon livre.'] },
  poetiques: { titre: 'Livres poétiques', messages: ['Vous avez perçu la substance poétique de l’ouvrage, mais ce n’est pas le bon livre.', 'L’intuition est bonne : c’est bien le monde sapiential et poétique.'] },
  'petits-prophetes': { titre: 'Petits prophètes', messages: ['L’auteur est un tout petit prophète, oui, mais vous ne l’avez pas nommé correctement !', 'On entend bien un petit prophète, mais pas celui-là.'] },
  'grands-prophetes': { titre: 'Grands prophètes', messages: ['L’auteur est un grand prophète, oui, mais vous ne l’avez pas nommé correctement !', 'Vous êtes dans le grand souffle prophétique, mais pas au bon endroit.'] },
  'evangiles-actes': { titre: 'Évangiles et Actes', messages: ['Pas loin. L’un des quatre évangélistes a bien écrit ce verset !', 'Vous êtes du côté de l’Évangile et des Actes, mais ce livre n’est pas le bon.'] },
  paul: { titre: 'Épîtres de Paul', messages: ['Oui, c’est bien Paul, mais pas cette épître.', 'Vous avez reconnu la voix paulinienne, mais pas la bonne lettre.'] },
  catholiques: { titre: 'Épîtres catholiques ou générales', messages: ['Oui, c’est bien une épître, mais l’auteur n’est pas Paul.', 'Bonne famille d’épîtres, mauvais livre.'] },
  apocalypse: { titre: 'Apocalypse', messages: ['Vous tournez autour de Patmos, mais il faut nommer le livre exact.'] },
}

const aliases: Record<string, string> = {
  gn: 'GEN', gen: 'GEN', genese: 'GEN',
  ex: 'EXO', exo: 'EXO', exode: 'EXO',
  lv: 'LEV', lev: 'LEV', levitique: 'LEV',
  nb: 'NUM', nom: 'NUM', nombres: 'NUM',
  dt: 'DEU', deut: 'DEU', deuteronome: 'DEU',
  jos: 'JOS', josue: 'JOS', jg: 'JDG', juges: 'JDG', rt: 'RUT', ruth: 'RUT',
  '1s': '1SA', '1sa': '1SA', '1samuel': '1SA', '2s': '2SA', '2sa': '2SA', '2samuel': '2SA',
  '1r': '1KI', '1rois': '1KI', '2r': '2KI', '2rois': '2KI', '1ch': '1CH', '1chroniques': '1CH', '2ch': '2CH', '2chroniques': '2CH',
  esd: 'EZR', esdras: 'EZR', ne: 'NEH', nehemie: 'NEH', est: 'EST', esther: 'EST',
  job: 'JOB', ps: 'PSA', psaume: 'PSA', psaumes: 'PSA', pr: 'PRO', proverbes: 'PRO', qo: 'ECC', ec: 'ECC', ecclesiaste: 'ECC', ct: 'SNG', cantique: 'SNG',
  is: 'ISA', isaie: 'ISA', esaie: 'ISA', jer: 'JER', jeremie: 'JER', lm: 'LAM', lamentations: 'LAM', ez: 'EZK', ezechiel: 'EZK', dan: 'DAN', daniel: 'DAN',
  os: 'HOS', osee: 'HOS', jl: 'JOL', joel: 'JOL', am: 'AMO', amos: 'AMO', ab: 'OBA', abdias: 'OBA', jon: 'JON', jonas: 'JON', mi: 'MIC', michee: 'MIC', na: 'NAM', nahum: 'NAM', ha: 'HAB', habacuc: 'HAB', so: 'ZEP', sophonie: 'ZEP', ag: 'HAG', aggee: 'HAG', za: 'ZEC', zacharie: 'ZEC', ml: 'MAL', malachie: 'MAL',
  mt: 'MAT', matthieu: 'MAT', mc: 'MRK', marc: 'MRK', lc: 'LUK', luc: 'LUK', jn: 'JHN', jean: 'JHN', ac: 'ACT', actes: 'ACT',
  rm: 'ROM', romains: 'ROM', '1co': '1CO', '1corinthiens': '1CO', '2co': '2CO', '2corinthiens': '2CO', ga: 'GAL', galates: 'GAL', ep: 'EPH', ephesiens: 'EPH', ph: 'PHP', philippiens: 'PHP', col: 'COL', colossiens: 'COL', '1th': '1TH', '1thessaloniciens': '1TH', '2th': '2TH', '2thessaloniciens': '2TH', '1tm': '1TI', '1timothee': '1TI', '2tm': '2TI', '2timothee': '2TI', tt: 'TIT', tite: 'TIT', phm: 'PHM', philemon: 'PHM',
  he: 'HEB', hebreux: 'HEB', jc: 'JAS', jacques: 'JAS', '1p': '1PE', '1pierre': '1PE', '2p': '2PE', '2pierre': '2PE', '1jn': '1JN', '1jean': '1JN', '2jn': '2JN', '2jean': '2JN', '3jn': '3JN', '3jean': '3JN', jude: 'JUD', ap: 'REV', apocalypse: 'REV',
}

function normaliser(s: string) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[’']/g, '').replace(/\s+/g, ' ').trim()
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
  const livre = livreParCode.get(v.livre)?.nom ?? v.livre
  return `${livre} ${v.chapitre}, ${v.verset}`
}

function melanger<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5)
}

async function chargerVersetAleatoire(): Promise<VersetQuiz> {
  const base = () => supabase.from('versets').select('id_verset, ref, livre, chapitre, verset, TR0001', { count: 'exact' }).not('TR0001', 'is', null)
  let countRes = await base().or('quiz_exclu.is.null,quiz_exclu.eq.false').limit(1)
  let avecExclusion = true
  if (countRes.error) {
    avecExclusion = false
    countRes = await base().limit(1)
  }
  const count = countRes.count ?? 0
  if (count <= 0) throw new Error('Aucun verset disponible.')

  for (let essai = 0; essai < 10; essai++) {
    const offset = Math.floor(Math.random() * count)
    let q = base().range(offset, offset)
    if (avecExclusion) q = q.or('quiz_exclu.is.null,quiz_exclu.eq.false') as typeof q
    const { data, error } = await q
    if (error) throw error
    const v = data?.[0] as VersetQuiz | undefined
    if (v && (v.TR0001 ?? '').replace(/\s+/g, ' ').trim().length >= 35) return v
  }
  throw new Error('Aucun verset assez substantiel trouvé.')
}

function messageScore(score: number) {
  if (score >= 90) return 'Jacob file vers le sommet.'
  if (score >= 55) return 'Belle ascension biblique.'
  if (score >= 25) return 'On commence à voir l’échelle.'
  return 'Premier barreau, et c’est déjà quelque chose.'
}

export default function QuizBibliqueClient() {
  const [verset, setVerset] = useState<VersetQuiz | null>(null)
  const [etape, setEtape] = useState<Etape>('testament')
  const [resultats, setResultats] = useState<Resultat[]>([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)
  const [saisieLivre, setSaisieLivre] = useState('')
  const [essaisLivres, setEssaisLivres] = useState<LivreBiblique[]>([])
  const [messageChaud, setMessageChaud] = useState<string | null>(null)
  const [reponseExacte, setReponseExacte] = useState('')
  const [flashScore, setFlashScore] = useState(false)
  const [signalementOuvert, setSignalementOuvert] = useState(false)
  const [raisonSignalement, setRaisonSignalement] = useState('verset trop générique')
  const [commentaireSignalement, setCommentaireSignalement] = useState('')
  const [statutSignalement, setStatutSignalement] = useState<'idle'|'sending'|'ok'|'err'>('idle')

  const livreCorrect = verset ? livreParCode.get(verset.livre) : null
  const score = resultats.reduce((s, r) => s + r.points, 0)
  const suggestionsLivre = useMemo(() => {
    const q = normaliser(saisieLivre)
    if (!q) return []
    return LIVRES.filter(l => normaliser(l.nom).startsWith(q) && !essaisLivres.some(e => e.code === l.code)).slice(0, 6)
  }, [saisieLivre, essaisLivres])

  const celebrer = (points: number) => {
    if (points <= 0) return
    setFlashScore(true)
    window.setTimeout(() => setFlashScore(false), 900)
  }

  const ajouterResultat = (r: Resultat, prochaine: Etape) => {
    setResultats(prev => [...prev, r])
    setEtape(prochaine)
    celebrer(r.points)
  }

  const nouveauVerset = async () => {
    setChargement(true); setErreur(null); setResultats([]); setEtape('testament'); setEssaisLivres([])
    setSaisieLivre(''); setMessageChaud(null); setReponseExacte(''); setSignalementOuvert(false); setStatutSignalement('idle')
    try {
      setVerset(await chargerVersetAleatoire())
    } catch (e: any) {
      setErreur(e?.message ?? 'Impossible de charger un verset.')
    } finally {
      setChargement(false)
    }
  }

  useEffect(() => { nouveauVerset() }, [])

  const repondreTestament = (choix: Testament) => {
    if (!livreCorrect) return
    const ok = choix === livreCorrect.testament
    ajouterResultat({ label: 'Testament', points: ok ? 8 : 0, reponse: choix, detail: `Réponse : ${livreCorrect.testament}` }, 'livre')
  }

  const proposerLivre = (livre?: LivreBiblique) => {
    if (!livreCorrect || etape === 'resultat') return
    const choisi = livre ?? LIVRES.find(l => l.code === codeDepuisNom(saisieLivre))
    if (!choisi || essaisLivres.some(l => l.code === choisi.code) || essaisLivres.length >= 5) return
    const nouvelIndex = essaisLivres.length + 1
    setEssaisLivres(prev => [...prev, choisi])
    setSaisieLivre('')

    if (choisi.code === livreCorrect.code) {
      const points = Math.max(12, 42 - (nouvelIndex - 1) * 6)
      setMessageChaud(null)
      ajouterResultat({ label: `Livre, essai ${nouvelIndex}`, points, reponse: choisi.nom, detail: `Réponse : ${livreCorrect.nom}` }, 'livre')
      return
    }

    if (choisi.famille === livreCorrect.famille) {
      const variants = familles[choisi.famille].messages
      setMessageChaud(variants[(nouvelIndex - 1) % variants.length])
    } else {
      setMessageChaud(null)
    }
    setResultats(prev => [...prev, { label: `Livre, essai ${nouvelIndex}`, points: 0, reponse: choisi.nom, detail: `Réponse : ${livreCorrect.nom}` }])
    if (nouvelIndex >= 5) setEtape('resultat')
  }

  const validerExact = () => {
    if (!verset) return
    const ref = parserReference(reponseExacte)
    const ok = !!ref && ref.code === verset.livre && ref.chapitre === verset.chapitre && ref.verset === verset.verset
    ajouterResultat({ label: 'Je sais !', points: ok ? 50 : 0, reponse: reponseExacte, detail: `Réponse : ${refLisible(verset)}` }, 'resultat')
  }

  const signaler = async () => {
    if (!verset) return
    setStatutSignalement('sending')
    const { data: session } = await supabase.auth.getSession()
    const user_id = session.session?.user.id ?? null
    await supabase.from('quiz_signalements').insert({ id_verset: verset.id_verset, raison: raisonSignalement, commentaire: commentaireSignalement || null, user_id })
    const fallback = await supabase.from('signalements').insert({
      id_segment: null,
      user_id,
      message: `Quiz — ${verset.id_verset} — ${raisonSignalement}${commentaireSignalement ? ` : ${commentaireSignalement}` : ''}`,
      traite: false,
    })
    if (fallback.error) { setStatutSignalement('err'); return }
    setStatutSignalement('ok')
  }

  return (
    <section style={{ maxWidth: '1040px', margin: '0 auto', padding: '24px 20px 82px', fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <style>{`
        @keyframes bibleGamesGlow { 0% { box-shadow: 0 0 0 rgba(206,236,170,0); transform: scale(1); } 35% { box-shadow: 0 0 34px rgba(210,241,153,0.75); transform: scale(1.035); } 100% { box-shadow: 0 0 0 rgba(206,236,170,0); transform: scale(1); } }
        @keyframes bibleGamesSpark { 0% { opacity: 0; transform: scale(0.6) translateY(8px); } 35% { opacity: 1; } 100% { opacity: 0; transform: scale(1.35) translateY(-20px); } }
        @keyframes jacobClimb { 0% { transform: translateY(3px); } 100% { transform: translateY(-3px); } }
        @media (max-width: 880px) {
          .bible-games-layout { grid-template-columns: 1fr !important; }
          .bible-games-score { min-height: auto !important; }
          .bible-games-ladder { min-height: 300px !important; }
          .bible-games-answer { grid-template-columns: 1fr !important; }
        }
      `}</style>
      <div style={{ background: 'linear-gradient(135deg, #f8fbf2 0%, #eef6e7 46%, #dfeedd 100%)', border: '1px solid rgba(61,107,79,0.24)', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 18px 42px rgba(33,68,45,0.12)', position: 'relative' }}>
        {flashScore && <FeuArtifice />}
        <div className="bible-games-layout" style={{ display: 'grid', gridTemplateColumns: '150px minmax(0,1fr) 190px', gap: '16px', padding: '18px', alignItems: 'stretch' }}>
          <aside className="bible-games-score" style={{ background: 'rgba(255,255,255,0.72)', border: '1px solid rgba(61,107,79,0.18)', borderRadius: '12px', padding: '14px 12px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '420px' }}>
            <div>
              <p style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.14em', color: '#6b8a70', fontWeight: 800, margin: '0 0 8px' }}>Score</p>
              <div style={{ fontSize: '42px', lineHeight: 1, fontWeight: 900, color: '#2f6a48', animation: flashScore ? 'bibleGamesGlow 0.9s ease-out' : 'none', borderRadius: '12px', padding: '4px 0' }}>{score}</div>
              <p style={{ fontSize: '11px', lineHeight: 1.35, color: '#5f725f', margin: '8px 0 0' }}>{messageScore(score)}</p>
            </div>
            <button onClick={nouveauVerset} style={btnSecondaire}>Nouveau verset</button>
          </aside>

          <div>
            <div style={{ marginBottom: '12px' }}>
              <p style={{ margin: '0 0 4px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.16em', color: '#477658', fontWeight: 900 }}>Où est-il écrit ?</p>
              <h2 style={{ margin: 0, fontSize: '24px', lineHeight: 1.1, color: '#193824', fontWeight: 900 }}>Bible games</h2>
            </div>

            {chargement ? <p style={etatTexte}>Chargement…</p> : erreur ? <p style={{ ...etatTexte, color: '#c0562a' }}>{erreur}</p> : verset && livreCorrect ? (
              <>
                <div style={{ position: 'sticky', top: '58px', zIndex: 5, background: 'rgba(248,251,242,0.96)', border: '1px solid rgba(61,107,79,0.20)', borderRadius: '13px', padding: '13px 14px', backdropFilter: 'blur(8px)' }}>
                  <p lang="fr" style={{ margin: 0, fontSize: '16px', lineHeight: 1.58, color: '#203528', textAlign: 'justify', fontWeight: 560 }}>« {verset.TR0001} »</p>
                  <BarreProgression resultats={resultats} etape={etape} />
                </div>

                <div style={{ marginTop: '14px', display: 'grid', gap: '12px' }}>
                  <div className="bible-games-answer" style={blocJeSais}>
                    <div>
                      <p style={{ margin: '0 0 3px', fontSize: '12px', color: '#214d34', fontWeight: 900 }}>Je sais !</p>
                      <p style={{ margin: 0, fontSize: '11px', color: '#6c7b6d' }}>Entrez la référence exacte, par exemple : Gn 1, 1.</p>
                    </div>
                    <div style={{ display: 'flex', gap: '7px', minWidth: 0 }}>
                      <input value={reponseExacte} onChange={e => setReponseExacte(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') validerExact() }} placeholder="Gn 1, 1" style={inputStyle} />
                      <button onClick={validerExact} disabled={!reponseExacte.trim()} style={btnPrincipal}>Valider</button>
                    </div>
                  </div>

                  {etape === 'testament' && <BlocJeu titre="1. Testament">
                    <div style={ligneBoutons}>
                      <button onClick={() => repondreTestament('Ancien Testament')} style={btnPrincipal}>Ancien Testament</button>
                      <button onClick={() => repondreTestament('Nouveau Testament')} style={btnPrincipal}>Nouveau Testament</button>
                    </div>
                  </BlocJeu>}

                  {etape === 'livre' && <BlocJeu titre={`2. Livre biblique (${Math.min(essaisLivres.length + 1, 5)}/5)`}>
                    <p style={aide}>Faites vos choix un par un. Si vous êtes dans la bonne famille de livres, le jeu vous le dira.</p>
                    <div style={{ position: 'relative' }}>
                      <input value={saisieLivre} onChange={e => setSaisieLivre(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') proposerLivre() }} placeholder="Ex. Genèse, Isaïe, Romains…" style={{ ...inputStyle, width: '100%' }} />
                      {suggestionsLivre.length > 0 && <div style={menuSuggestions}>
                        {suggestionsLivre.map(l => <button key={l.code} onClick={() => proposerLivre(l)} style={suggestionStyle}>{l.nom}</button>)}
                      </div>}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', alignItems: 'center', marginTop: '10px', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {essaisLivres.map((l, i) => <span key={l.code} style={tagStyle}>{i + 1}. {l.nom}</span>)}
                      </div>
                      <button onClick={() => proposerLivre()} disabled={!saisieLivre.trim() || essaisLivres.length >= 5} style={btnPrincipal}>Proposer</button>
                    </div>
                    {messageChaud && <div style={{ marginTop: '10px', padding: '9px 11px', borderRadius: '9px', background: '#fff4df', border: '1px solid rgba(194,112,38,0.26)', color: '#9a5520', fontSize: '12px', fontWeight: 700 }}>{messageChaud}</div>}
                  </BlocJeu>}

                  {etape === 'resultat' && <BlocJeu titre="Résultat">
                    <p style={{ fontSize: '20px', color: '#163422', margin: '0 0 5px', fontWeight: 900 }}>{refLisible(verset)}</p>
                    <p style={{ fontSize: '13px', color: '#3d6b4f', fontWeight: 800, margin: '0 0 12px' }}>{score} points — {messageScore(score)}</p>
                    {resultats.map((r, i) => <p key={`${r.label}-${i}`} style={{ fontSize: '12px', color: '#536756', margin: '4px 0' }}>{r.label} : <strong>{r.points}</strong> pts{r.reponse ? ` — ${r.reponse}` : ''}. {r.detail}</p>)}
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '16px' }}>
                      <button onClick={nouveauVerset} style={btnPrincipal}>Nouveau verset</button>
                      <button onClick={() => setSignalementOuvert(o => !o)} style={btnSecondaire}>Signaler ce verset comme trop vague</button>
                    </div>
                    {signalementOuvert && <div style={{ marginTop: '14px', padding: '12px', border: '1px solid #d7e3d3', borderRadius: '10px', background: '#fbfdf8' }}>
                      <select value={raisonSignalement} onChange={e => setRaisonSignalement(e.target.value)} style={{ ...inputStyle, width: '100%' }}>
                        {['verset trop générique','verset trop court','doublon ou quasi-doublon','dépend trop du verset précédent','problème de traduction','autre'].map(r => <option key={r}>{r}</option>)}
                      </select>
                      <textarea value={commentaireSignalement} onChange={e => setCommentaireSignalement(e.target.value)} placeholder="Commentaire optionnel" rows={3} style={{ ...inputStyle, width: '100%', marginTop: '8px', resize: 'vertical' }} />
                      <button onClick={signaler} disabled={statutSignalement === 'sending' || statutSignalement === 'ok'} style={{ ...btnPrincipal, marginTop: '8px' }}>{statutSignalement === 'ok' ? 'Signalement envoyé' : 'Envoyer'}</button>
                      {statutSignalement === 'err' && <span style={{ marginLeft: '10px', color: '#c0562a', fontSize: '11px' }}>Erreur d’envoi.</span>}
                    </div>}
                  </BlocJeu>}
                </div>
              </>
            ) : null}
          </div>

          <EchelleJacob score={score} flash={flashScore} />
        </div>
      </div>
    </section>
  )
}

function BarreProgression({ resultats, etape }: { resultats: Resultat[]; etape: Etape }) {
  const prochain = etape === 'testament' ? 'Testament' : etape === 'livre' ? 'Livre suivant' : 'Résultat'
  const lignes = resultats.length > 0
    ? [...resultats, ...(etape !== 'resultat' ? [{ label: prochain, points: 0, detail: 'À jouer' }] : [])]
    : [{ label: prochain, points: 0, detail: 'À jouer' }]
  return (
    <div style={{ display: 'flex', gap: '5px', marginTop: '11px', overflowX: 'auto', paddingBottom: '1px' }}>
      {lignes.map((r, i) => {
        const estAVenir = i >= resultats.length
        return <div key={`${r.label}-${i}`} style={{ flex: '1 0 108px', minHeight: '36px', borderRadius: '8px', padding: '6px 7px', background: estAVenir ? 'rgba(255,255,255,0.68)' : r.points > 0 ? 'rgba(61,107,79,0.13)' : 'rgba(194,112,38,0.10)', border: `1px solid ${estAVenir ? 'rgba(61,107,79,0.14)' : r.points > 0 ? 'rgba(61,107,79,0.20)' : 'rgba(194,112,38,0.18)'}` }}>
          <p style={{ margin: 0, fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', color: estAVenir ? '#66806a' : r.points > 0 ? '#3d6b4f' : '#9a5520', fontWeight: 900 }}>{r.label}</p>
          <p style={{ margin: '2px 0 0', fontSize: '10px', color: '#294b35', fontWeight: 800 }}>{estAVenir ? 'À jouer' : `${r.points} pts${r.reponse ? ` — ${r.reponse}` : ''}`}</p>
        </div>
      })}
    </div>
  )
}

function EchelleJacob({ score, flash }: { score: number; flash: boolean }) {
  const y = 244 - Math.min(100, score) * 1.75
  return (
    <aside className="bible-games-ladder" style={{ background: 'rgba(255,255,255,0.58)', border: '1px solid rgba(61,107,79,0.18)', borderRadius: '12px', padding: '10px', minHeight: '420px', position: 'relative', overflow: 'hidden' }}>
      <p style={{ margin: '0 0 6px', textAlign: 'center', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6a7b68', fontWeight: 900 }}>Échelle de Jacob</p>
      <svg viewBox="0 0 150 300" width="100%" height="320" aria-hidden="true">
        <defs>
          <pattern id="hachuresJacob" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
            <path d="M0 0h1" stroke="#8f7b5e" strokeWidth="0.5" opacity="0.35" />
          </pattern>
        </defs>
        <rect x="0" y="0" width="150" height="300" fill="rgba(252,249,239,0.42)" />
        <path d="M45 270 L93 28 M80 270 L128 28" stroke="#5f513e" strokeWidth="4" fill="none" strokeLinecap="round" />
        {Array.from({ length: 10 }).map((_, i) => {
          const yy = 250 - i * 23
          return <path key={i} d={`M${50 + i * 4.7} ${yy} L${84 + i * 4.7} ${yy}`} stroke="#7b684f" strokeWidth="3" strokeLinecap="round" />
        })}
        <path d="M18 276 C46 260 88 264 138 276" stroke="#9d8b65" strokeWidth="2" fill="url(#hachuresJacob)" />
        <g style={{ transform: `translate(0px, ${y}px)`, transition: 'transform 0.7s cubic-bezier(.2,.8,.2,1)', animation: flash ? 'jacobClimb 0.18s ease-in-out 4 alternate' : 'none' }}>
          <circle cx="70" cy="24" r="9" fill="#f1d8b3" stroke="#5f513e" strokeWidth="1.4" />
          <path d="M63 21 Q70 13 78 21" stroke="#4b3828" strokeWidth="3" fill="none" strokeLinecap="round" />
          <path d="M70 34 L68 58 M68 42 L54 53 M69 43 L82 53 M68 58 L58 76 M68 58 L78 76" stroke="#365c42" strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M61 36 Q70 43 79 36 L77 59 Q70 65 63 59 Z" fill="#78a36f" stroke="#365c42" strokeWidth="1" />
        </g>
      </svg>
      <div style={{ position: 'absolute', right: '12px', top: `${Math.max(58, y + 42)}px`, transition: 'top 0.7s cubic-bezier(.2,.8,.2,1)', background: '#fffdf6', color: '#38543d', border: '1px solid #d7c9a8', borderRadius: '6px', padding: '4px 7px', fontSize: '11px', fontWeight: 900, boxShadow: '0 4px 12px rgba(74,68,48,0.10)' }}>{score} pts</div>
    </aside>
  )
}

function FeuArtifice() {
  return <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 20 }}>
    {Array.from({ length: 18 }).map((_, i) => (
      <span key={i} style={{ position: 'absolute', left: `${18 + (i * 37) % 70}%`, top: `${10 + (i * 23) % 55}%`, width: '7px', height: '7px', borderRadius: '50%', background: i % 3 === 0 ? '#f6cf62' : i % 3 === 1 ? '#8bcf83' : '#ffffff', animation: `bibleGamesSpark ${0.55 + (i % 4) * 0.08}s ease-out forwards`, boxShadow: '0 0 12px currentColor' }} />
    ))}
  </div>
}

function BlocJeu({ titre, children }: { titre: string; children: React.ReactNode }) {
  return <div style={{ background: 'rgba(255,255,255,0.74)', border: '1px solid rgba(61,107,79,0.16)', borderRadius: '12px', padding: '14px' }}>
    <h3 style={{ fontSize: '15px', color: '#1d3e29', margin: '0 0 10px', fontWeight: 900 }}>{titre}</h3>
    {children}
  </div>
}

const btnPrincipal = { fontSize: '12px', padding: '8px 13px', borderRadius: '8px', border: 'none', background: '#3d6b4f', color: '#fff', cursor: 'pointer', fontWeight: 800, whiteSpace: 'nowrap' } as const
const btnSecondaire = { fontSize: '12px', padding: '8px 12px', borderRadius: '8px', border: '1px solid rgba(61,107,79,0.24)', background: '#fff', color: '#3d6b4f', cursor: 'pointer', fontWeight: 800 } as const
const ligneBoutons = { display: 'flex', gap: '8px', flexWrap: 'wrap' } as const
const aide = { fontSize: '12px', color: '#5d735f', margin: '0 0 10px', lineHeight: 1.45 } as const
const inputStyle = { minWidth: 0, fontSize: '12px', padding: '8px 10px', border: '1px solid #bdd2bf', borderRadius: '8px', background: '#fff', color: '#203528', outline: 'none', boxSizing: 'border-box' } as const
const tagStyle = { fontSize: '11px', color: '#2f6a48', background: 'rgba(61,107,79,0.10)', border: '1px solid rgba(61,107,79,0.20)', borderRadius: '999px', padding: '4px 8px', fontWeight: 700 } as const
const menuSuggestions = { position: 'absolute', left: 0, right: 0, top: 'calc(100% + 4px)', background: '#fff', border: '1px solid #bdd2bf', borderRadius: '9px', zIndex: 30, boxShadow: '0 10px 26px rgba(35,66,44,0.14)', overflow: 'hidden' } as const
const suggestionStyle = { display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', fontSize: '12px', color: '#203528', background: '#fff', border: 'none', borderBottom: '1px solid #eef3eb', cursor: 'pointer' } as const
const blocJeSais = { display: 'grid', gridTemplateColumns: 'minmax(150px, 1fr) minmax(220px, 1.25fr)', gap: '12px', alignItems: 'center', background: '#fffdf6', border: '1px solid rgba(190,154,73,0.28)', borderRadius: '12px', padding: '12px' } as const
const etatTexte = { textAlign: 'center', color: '#6c7b6d', fontStyle: 'italic', fontSize: '13px' } as const
