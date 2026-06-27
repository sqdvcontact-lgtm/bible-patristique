'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'

type Testament = 'Ancien Testament' | 'Nouveau Testament'
type Etape = 'testament' | 'propositions' | 'choixLivre' | 'chapitre' | 'verset' | 'resultat'
type Mode = 'prudent' | 'risque'
type Resultat = { label: string; points: number; detail: string }
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
  categorie: string
  ordre: number
  chapitres: number
}
type Plage = { label: string; debut: number; fin: number }

const LIVRES: LivreBiblique[] = [
  ['GEN','Genèse','Ancien Testament','Pentateuque',1,50], ['EXO','Exode','Ancien Testament','Pentateuque',2,40], ['LEV','Lévitique','Ancien Testament','Pentateuque',3,27], ['NUM','Nombres','Ancien Testament','Pentateuque',4,36], ['DEU','Deutéronome','Ancien Testament','Pentateuque',5,34],
  ['JOS','Josué','Ancien Testament','Historiques',6,24], ['JDG','Juges','Ancien Testament','Historiques',7,21], ['RUT','Ruth','Ancien Testament','Historiques',8,4], ['1SA','1 Samuel','Ancien Testament','Historiques',9,31], ['2SA','2 Samuel','Ancien Testament','Historiques',10,24], ['1KI','1 Rois','Ancien Testament','Historiques',11,22], ['2KI','2 Rois','Ancien Testament','Historiques',12,25], ['1CH','1 Chroniques','Ancien Testament','Historiques',13,29], ['2CH','2 Chroniques','Ancien Testament','Historiques',14,36], ['EZR','Esdras','Ancien Testament','Historiques',15,10], ['NEH','Néhémie','Ancien Testament','Historiques',16,13], ['EST','Esther','Ancien Testament','Historiques',17,10],
  ['JOB','Job','Ancien Testament','Sapientiaux',18,42], ['PSA','Psaumes','Ancien Testament','Sapientiaux',19,150], ['PRO','Proverbes','Ancien Testament','Sapientiaux',20,31], ['ECC','Ecclésiaste','Ancien Testament','Sapientiaux',21,12], ['SNG','Cantique des cantiques','Ancien Testament','Sapientiaux',22,8],
  ['ISA','Isaïe','Ancien Testament','Prophètes',23,66], ['JER','Jérémie','Ancien Testament','Prophètes',24,52], ['LAM','Lamentations','Ancien Testament','Prophètes',25,5], ['EZK','Ézéchiel','Ancien Testament','Prophètes',26,48], ['DAN','Daniel','Ancien Testament','Prophètes',27,12], ['HOS','Osée','Ancien Testament','Prophètes',28,14], ['JOL','Joël','Ancien Testament','Prophètes',29,3], ['AMO','Amos','Ancien Testament','Prophètes',30,9], ['OBA','Abdias','Ancien Testament','Prophètes',31,1], ['JON','Jonas','Ancien Testament','Prophètes',32,4], ['MIC','Michée','Ancien Testament','Prophètes',33,7], ['NAM','Nahum','Ancien Testament','Prophètes',34,3], ['HAB','Habacuc','Ancien Testament','Prophètes',35,3], ['ZEP','Sophonie','Ancien Testament','Prophètes',36,3], ['HAG','Aggée','Ancien Testament','Prophètes',37,2], ['ZEC','Zacharie','Ancien Testament','Prophètes',38,14], ['MAL','Malachie','Ancien Testament','Prophètes',39,4],
  ['MAT','Matthieu','Nouveau Testament','Évangiles',40,28], ['MRK','Marc','Nouveau Testament','Évangiles',41,16], ['LUK','Luc','Nouveau Testament','Évangiles',42,24], ['JHN','Jean','Nouveau Testament','Évangiles',43,21], ['ACT','Actes','Nouveau Testament','Actes',44,28],
  ['ROM','Romains','Nouveau Testament','Épîtres pauliniennes',45,16], ['1CO','1 Corinthiens','Nouveau Testament','Épîtres pauliniennes',46,16], ['2CO','2 Corinthiens','Nouveau Testament','Épîtres pauliniennes',47,13], ['GAL','Galates','Nouveau Testament','Épîtres pauliniennes',48,6], ['EPH','Éphésiens','Nouveau Testament','Épîtres pauliniennes',49,6], ['PHP','Philippiens','Nouveau Testament','Épîtres pauliniennes',50,4], ['COL','Colossiens','Nouveau Testament','Épîtres pauliniennes',51,4], ['1TH','1 Thessaloniciens','Nouveau Testament','Épîtres pauliniennes',52,5], ['2TH','2 Thessaloniciens','Nouveau Testament','Épîtres pauliniennes',53,3], ['1TI','1 Timothée','Nouveau Testament','Épîtres pauliniennes',54,6], ['2TI','2 Timothée','Nouveau Testament','Épîtres pauliniennes',55,4], ['TIT','Tite','Nouveau Testament','Épîtres pauliniennes',56,3], ['PHM','Philémon','Nouveau Testament','Épîtres pauliniennes',57,1], ['HEB','Hébreux','Nouveau Testament','Épîtres pauliniennes',58,13],
  ['JAS','Jacques','Nouveau Testament','Épîtres catholiques',59,5], ['1PE','1 Pierre','Nouveau Testament','Épîtres catholiques',60,5], ['2PE','2 Pierre','Nouveau Testament','Épîtres catholiques',61,3], ['1JN','1 Jean','Nouveau Testament','Épîtres catholiques',62,5], ['2JN','2 Jean','Nouveau Testament','Épîtres catholiques',63,1], ['3JN','3 Jean','Nouveau Testament','Épîtres catholiques',64,1], ['JUD','Jude','Nouveau Testament','Épîtres catholiques',65,1], ['REV','Apocalypse','Nouveau Testament','Apocalypse',66,22],
].map(([code, nom, testament, categorie, ordre, chapitres]) => ({ code, nom, testament, categorie, ordre, chapitres } as LivreBiblique))

const ETAPES: { key: Etape; label: string }[] = [
  { key: 'testament', label: 'Testament' },
  { key: 'propositions', label: 'Livre' },
  { key: 'chapitre', label: 'Chapitre' },
  { key: 'verset', label: 'Verset' },
  { key: 'resultat', label: 'Résultat' },
]

const livreParCode = new Map(LIVRES.map(l => [l.code, l]))
const livreParNom = new Map(LIVRES.map(l => [normaliser(l.nom), l]))

function normaliser(s: string) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

function melanger<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5)
}

function refLisible(v: VersetQuiz) {
  const livre = livreParCode.get(v.livre)?.nom ?? v.livre
  return `${livre} ${v.chapitre}, ${v.verset}`
}

function genererLivresPlausibles(correct: LivreBiblique): LivreBiblique[] {
  const memeCategorie = LIVRES.filter(l => l.code !== correct.code && l.testament === correct.testament && l.categorie === correct.categorie)
  const memeTestament = LIVRES.filter(l => l.code !== correct.code && l.testament === correct.testament && l.categorie !== correct.categorie)
  return melanger([correct, ...melanger(memeCategorie).slice(0, 4), ...melanger(memeTestament).slice(0, 4)]).slice(0, 5)
}

function genererPlages(max: number, cible: number): Plage[] {
  const taille = Math.max(1, Math.ceil(max / 5))
  const plages: Plage[] = []
  for (let debut = 1; debut <= max; debut += taille) {
    const fin = Math.min(max, debut + taille - 1)
    plages.push({ debut, fin, label: debut === fin ? `${debut}` : `${debut}-${fin}` })
  }
  if (!plages.some(p => cible >= p.debut && cible <= p.fin)) plages.push({ debut: cible, fin: cible, label: `${cible}` })
  return plages.slice(0, 7)
}

function messageScore(score: number) {
  if (score >= 70) return 'Référence très bien identifiée.'
  if (score >= 35) return 'Bonne orientation dans le texte biblique.'
  return 'Référence difficile à situer.'
}

async function chargerVersetAleatoire(): Promise<VersetQuiz> {
  const base = () => supabase.from('versets').select('id_verset, ref, livre, chapitre, verset, TR0001', { count: 'exact' }).not('TR0001', 'is', null)
  let count = 0
  let avecExclusion = true
  let countRes = await base().or('quiz_exclu.is.null,quiz_exclu.eq.false').limit(1)
  if (countRes.error) {
    avecExclusion = false
    countRes = await base().limit(1)
  }
  count = countRes.count ?? 0
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

async function maxVersets(livre: string, chapitre: number) {
  const { data } = await supabase.from('versets').select('verset').eq('livre', livre).eq('chapitre', chapitre).order('verset', { ascending: false }).limit(1)
  return (data?.[0]?.verset as number | undefined) ?? 1
}

export default function QuizBibliqueClient() {
  const [verset, setVerset] = useState<VersetQuiz | null>(null)
  const [etape, setEtape] = useState<Etape>('testament')
  const [resultats, setResultats] = useState<Resultat[]>([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)
  const [saisieLivre, setSaisieLivre] = useState('')
  const [livresPressentis, setLivresPressentis] = useState<LivreBiblique[]>([])
  const [choixLivres, setChoixLivres] = useState<LivreBiblique[]>([])
  const [modeChapitre, setModeChapitre] = useState<Mode>('prudent')
  const [modeVerset, setModeVerset] = useState<Mode>('prudent')
  const [chapitreExact, setChapitreExact] = useState('')
  const [versetExact, setVersetExact] = useState('')
  const [maxVersetChapitre, setMaxVersetChapitre] = useState(1)
  const [signalementOuvert, setSignalementOuvert] = useState(false)
  const [raisonSignalement, setRaisonSignalement] = useState('verset trop générique')
  const [commentaireSignalement, setCommentaireSignalement] = useState('')
  const [statutSignalement, setStatutSignalement] = useState<'idle'|'sending'|'ok'|'err'>('idle')

  const livreCorrect = verset ? livreParCode.get(verset.livre) : null
  const score = resultats.reduce((s, r) => s + r.points, 0)
  const plagesChapitres = useMemo(() => livreCorrect && verset ? genererPlages(livreCorrect.chapitres, verset.chapitre) : [], [livreCorrect, verset])
  const plagesVersets = useMemo(() => verset ? genererPlages(maxVersetChapitre, verset.verset) : [], [maxVersetChapitre, verset])
  const suggestionsLivre = useMemo(() => {
    const q = normaliser(saisieLivre)
    if (!q) return []
    return LIVRES.filter(l => normaliser(l.nom).startsWith(q) && !livresPressentis.some(p => p.code === l.code)).slice(0, 6)
  }, [saisieLivre, livresPressentis])

  const nouveauVerset = async () => {
    setChargement(true); setErreur(null); setResultats([]); setEtape('testament'); setLivresPressentis([])
    setSaisieLivre(''); setChapitreExact(''); setVersetExact(''); setSignalementOuvert(false); setStatutSignalement('idle')
    try {
      const v = await chargerVersetAleatoire()
      setVerset(v)
      setMaxVersetChapitre(await maxVersets(v.livre, v.chapitre))
      const livre = livreParCode.get(v.livre)
      if (livre) setChoixLivres(genererLivresPlausibles(livre))
    } catch (e: any) {
      setErreur(e?.message ?? 'Impossible de charger un verset.')
    } finally {
      setChargement(false)
    }
  }

  useEffect(() => { nouveauVerset() }, [])

  const ajouterResultat = (r: Resultat, prochaine: Etape) => {
    setResultats(prev => [...prev, r])
    setEtape(prochaine)
  }

  const repondreTestament = (choix: Testament) => {
    if (!livreCorrect) return
    const ok = choix === livreCorrect.testament
    ajouterResultat({ label: 'Testament', points: ok ? 5 : 0, detail: `Réponse : ${livreCorrect.testament}` }, 'propositions')
  }

  const ajouterLivrePressenti = (livre?: LivreBiblique) => {
    const choisi = livre ?? livreParNom.get(normaliser(saisieLivre))
    if (!choisi || livresPressentis.length >= 5 || livresPressentis.some(l => l.code === choisi.code)) return
    setLivresPressentis(prev => [...prev, choisi])
    setSaisieLivre('')
  }

  const validerLivresPressentis = () => {
    if (!livreCorrect) return
    const index = livresPressentis.findIndex(l => l.code === livreCorrect.code)
    const points = index === -1 ? 0 : 10 + (index === 0 ? 5 : 0)
    ajouterResultat({ label: 'Livres pressentis', points, detail: `Réponse : ${livreCorrect.nom}` }, 'choixLivre')
  }

  const choisirLivre = (code: string) => {
    if (!livreCorrect) return
    ajouterResultat({ label: 'Choix du livre', points: code === livreCorrect.code ? 10 : 0, detail: `Réponse : ${livreCorrect.nom}` }, 'chapitre')
  }

  const choisirPlageChapitre = (p: Plage) => {
    if (!verset) return
    const ok = verset.chapitre >= p.debut && verset.chapitre <= p.fin
    ajouterResultat({ label: 'Chapitre', points: ok ? 10 : 0, detail: `Réponse : chapitre ${verset.chapitre}` }, 'verset')
  }

  const validerChapitreExact = () => {
    if (!verset) return
    const n = parseInt(chapitreExact, 10)
    const points = n === verset.chapitre ? 25 : Math.abs(n - verset.chapitre) === 1 ? 8 : 0
    ajouterResultat({ label: 'Chapitre exact', points, detail: `Réponse : chapitre ${verset.chapitre}` }, 'verset')
  }

  const choisirPlageVerset = (p: Plage) => {
    if (!verset) return
    const ok = verset.verset >= p.debut && verset.verset <= p.fin
    ajouterResultat({ label: 'Verset', points: ok ? 10 : 0, detail: `Réponse : verset ${verset.verset}` }, 'resultat')
  }

  const validerVersetExact = () => {
    if (!verset) return
    const n = parseInt(versetExact, 10)
    const points = n === verset.verset ? 30 : Math.abs(n - verset.verset) === 1 ? 10 : 0
    ajouterResultat({ label: 'Verset exact', points, detail: `Réponse : verset ${verset.verset}` }, 'resultat')
  }

  const signaler = async () => {
    if (!verset) return
    setStatutSignalement('sending')
    const { data: session } = await supabase.auth.getSession()
    const user_id = session.session?.user.id ?? null
    const payload = { id_verset: verset.id_verset, raison: raisonSignalement, commentaire: commentaireSignalement || null, user_id }
    await supabase.from('quiz_signalements').insert(payload)
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
    <main style={{ background: '#f7f4ef', minHeight: '100vh', paddingTop: '48px' }}>
      <div style={{ maxWidth: '760px', margin: '0 auto', padding: '38px 24px 80px' }}>
        <div style={{ textAlign: 'center', marginBottom: '22px' }}>
          <Link href="/traductions?onglet=quiz" style={{ fontSize: '11px', color: '#9a958d', textDecoration: 'none' }}>← Aller plus loin</Link>
          <h1 style={{ fontFamily: 'Georgia, serif', fontSize: 'clamp(24px, 4vw, 34px)', fontWeight: 'normal', color: '#1e2e24', margin: '12px 0 6px' }}>Où est-il écrit ?</h1>
          <p style={{ fontSize: '13px', color: '#6b6560', margin: 0 }}>Retrouvez la référence d’un verset biblique.</p>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
          {ETAPES.map(e => <span key={e.key} style={{ fontSize: '10.5px', color: etape === e.key ? '#3d6b4f' : '#9a958d', borderBottom: etape === e.key ? '2px solid #3d6b4f' : '2px solid transparent', padding: '4px 6px' }}>{e.label}</span>)}
        </div>

        <section style={{ background: '#fff', border: '1px solid #ddd8cf', borderRadius: '8px', padding: '24px', boxShadow: '0 8px 26px rgba(0,0,0,0.04)' }}>
          {chargement ? <p style={{ textAlign: 'center', color: '#9a958d', fontStyle: 'italic' }}>Chargement…</p> : erreur ? (
            <p style={{ textAlign: 'center', color: '#c0562a' }}>{erreur}</p>
          ) : verset && livreCorrect ? (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'center', marginBottom: '18px' }}>
                <span style={{ fontSize: '11px', color: '#9a958d' }}>Score : <strong style={{ color: '#3d6b4f' }}>{score}</strong></span>
                <button onClick={nouveauVerset} style={btnSecondaire}>Nouveau verset</button>
              </div>
              <blockquote lang="fr" style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontSize: '18px', lineHeight: 1.72, color: '#2a2520', textAlign: 'justify', margin: '0 0 22px', padding: '0 8px', hyphens: 'auto' }}>
                « {verset.TR0001} »
              </blockquote>

              {etape === 'testament' && <Bloc titre="1. Testament">
                <div style={ligneBoutons}>
                  <button onClick={() => repondreTestament('Ancien Testament')} style={btnPrincipal}>Ancien Testament</button>
                  <button onClick={() => repondreTestament('Nouveau Testament')} style={btnPrincipal}>Nouveau Testament</button>
                </div>
              </Bloc>}

              {etape === 'propositions' && <Bloc titre="2. Livres pressentis">
                <p style={aide}>Saisissez jusqu’à cinq livres bibliques auxquels vous pensez.</p>
                <div style={{ position: 'relative' }}>
                  <input value={saisieLivre} onChange={e => setSaisieLivre(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') ajouterLivrePressenti() }} placeholder="Ex. Isaïe, Jean, Romains…" style={inputStyle} />
                  {suggestionsLivre.length > 0 && <div style={menuSuggestions}>
                    {suggestionsLivre.map(l => <button key={l.code} onClick={() => ajouterLivrePressenti(l)} style={suggestionStyle}>{l.nom}</button>)}
                  </div>}
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', margin: '10px 0' }}>
                  {livresPressentis.map(l => <span key={l.code} style={tagStyle}>{l.nom}</span>)}
                </div>
                <button onClick={validerLivresPressentis} style={btnPrincipal}>Valider</button>
              </Bloc>}

              {etape === 'choixLivre' && <Bloc titre="3. Choix du livre">
                <div style={ligneBoutons}>{choixLivres.map(l => <button key={l.code} onClick={() => choisirLivre(l.code)} style={btnSecondaire}>{l.nom}</button>)}</div>
              </Bloc>}

              {etape === 'chapitre' && <Bloc titre="4. Chapitre">
                <ModeToggle mode={modeChapitre} setMode={setModeChapitre} />
                {modeChapitre === 'prudent' ? <div style={ligneBoutons}>{plagesChapitres.map(p => <button key={p.label} onClick={() => choisirPlageChapitre(p)} style={btnSecondaire}>{p.label}</button>)}</div> : (
                  <div style={ligneForm}><input value={chapitreExact} onChange={e => setChapitreExact(e.target.value)} type="number" min={1} style={inputCourt} /><button onClick={validerChapitreExact} style={btnPrincipal}>Valider</button></div>
                )}
              </Bloc>}

              {etape === 'verset' && <Bloc titre="5. Verset">
                <ModeToggle mode={modeVerset} setMode={setModeVerset} />
                {modeVerset === 'prudent' ? <div style={ligneBoutons}>{plagesVersets.map(p => <button key={p.label} onClick={() => choisirPlageVerset(p)} style={btnSecondaire}>{p.label}</button>)}</div> : (
                  <div style={ligneForm}><input value={versetExact} onChange={e => setVersetExact(e.target.value)} type="number" min={1} style={inputCourt} /><button onClick={validerVersetExact} style={btnPrincipal}>Valider</button></div>
                )}
              </Bloc>}

              {etape === 'resultat' && <Bloc titre="Résultat">
                <p style={{ fontFamily: 'Georgia, serif', fontSize: '18px', color: '#1e2e24', margin: '0 0 6px' }}>{refLisible(verset)}</p>
                <p style={{ fontSize: '13px', color: '#3d6b4f', fontWeight: 600, margin: '0 0 12px' }}>{score} points — {messageScore(score)}</p>
                {resultats.map(r => <p key={r.label} style={{ fontSize: '12px', color: '#6b6560', margin: '4px 0' }}>{r.label} : <strong>{r.points}</strong> pts. {r.detail}</p>)}
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '16px' }}>
                  <button onClick={nouveauVerset} style={btnPrincipal}>Nouveau verset</button>
                  <button onClick={() => setSignalementOuvert(o => !o)} style={btnSecondaire}>Signaler ce verset comme trop vague</button>
                </div>
                {signalementOuvert && <div style={{ marginTop: '14px', padding: '12px', border: '1px solid #e4dfd8', borderRadius: '6px', background: '#faf8f4' }}>
                  <select value={raisonSignalement} onChange={e => setRaisonSignalement(e.target.value)} style={inputStyle}>
                    {['verset trop générique','verset trop court','doublon ou quasi-doublon','dépend trop du verset précédent','problème de traduction','autre'].map(r => <option key={r}>{r}</option>)}
                  </select>
                  <textarea value={commentaireSignalement} onChange={e => setCommentaireSignalement(e.target.value)} placeholder="Commentaire optionnel" rows={3} style={{ ...inputStyle, marginTop: '8px', resize: 'vertical' }} />
                  <button onClick={signaler} disabled={statutSignalement === 'sending' || statutSignalement === 'ok'} style={{ ...btnPrincipal, marginTop: '8px' }}>{statutSignalement === 'ok' ? 'Signalement envoyé' : 'Envoyer'}</button>
                  {statutSignalement === 'err' && <span style={{ marginLeft: '10px', color: '#c0562a', fontSize: '11px' }}>Erreur d’envoi.</span>}
                </div>}
              </Bloc>}
            </>
          ) : null}
        </section>
      </div>
    </main>
  )
}

function Bloc({ titre, children }: { titre: string; children: React.ReactNode }) {
  return <div><h2 style={{ fontFamily: 'Georgia, serif', fontSize: '17px', fontWeight: 'normal', color: '#1e2e24', margin: '0 0 12px' }}>{titre}</h2>{children}</div>
}

function ModeToggle({ mode, setMode }: { mode: Mode; setMode: (m: Mode) => void }) {
  return <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
    <button onClick={() => setMode('prudent')} style={mode === 'prudent' ? btnPrincipal : btnSecondaire}>Mode prudent</button>
    <button onClick={() => setMode('risque')} style={mode === 'risque' ? btnPrincipal : btnSecondaire}>Mode risqué</button>
  </div>
}

const btnPrincipal = { fontSize: '12px', padding: '7px 13px', borderRadius: '5px', border: 'none', background: '#3d6b4f', color: '#fff', cursor: 'pointer', fontWeight: 600 } as const
const btnSecondaire = { fontSize: '12px', padding: '7px 13px', borderRadius: '5px', border: '1px solid #d6d0c4', background: '#fff', color: '#3d6b4f', cursor: 'pointer', fontWeight: 500 } as const
const ligneBoutons = { display: 'flex', gap: '8px', flexWrap: 'wrap' } as const
const ligneForm = { display: 'flex', gap: '8px', alignItems: 'center' } as const
const aide = { fontSize: '12px', color: '#6b6560', margin: '0 0 10px' } as const
const inputStyle = { width: '100%', fontSize: '12px', padding: '8px 10px', border: '1px solid #d6d0c4', borderRadius: '5px', background: '#fff', color: '#2a2520', outline: 'none', boxSizing: 'border-box' } as const
const inputCourt = { width: '90px', fontSize: '12px', padding: '8px 10px', border: '1px solid #d6d0c4', borderRadius: '5px', background: '#fff', color: '#2a2520', outline: 'none' } as const
const tagStyle = { fontSize: '11px', color: '#3d6b4f', background: 'rgba(61,107,79,0.08)', border: '1px solid rgba(61,107,79,0.18)', borderRadius: '4px', padding: '3px 7px' } as const
const menuSuggestions = { position: 'absolute', left: 0, right: 0, top: 'calc(100% + 4px)', background: '#fff', border: '1px solid #d6d0c4', borderRadius: '6px', zIndex: 20, boxShadow: '0 8px 22px rgba(0,0,0,0.10)', overflow: 'hidden' } as const
const suggestionStyle = { display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', fontSize: '12px', color: '#2a2520', background: '#fff', border: 'none', borderBottom: '1px solid #ede9e2', cursor: 'pointer' } as const
