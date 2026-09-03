'use client'

import { useMemo, useState } from 'react'
import type { Message } from './registre'

const TITRE = 'Références imprimées : conserver la forme source ou normaliser l’affichage ?'
const EXEMPLE = 'Jérôme, Commentaire sur Jonas, note 1 : « Référence imprimée : IV Reg. XIV, 23 et seqq. » Ailleurs, la même fonction apparaît sous une forme normalisée, par exemple « Lv 13, 5. » ; chez Jean Chrysostome, on rencontre même « Ps 46, 7 ; Ps. 46, 7. » pour le même verset.'
const QUESTION = 'Pour la future charte des notes, faut-il distinguer systématiquement deux niveaux : (1) la transcription fidèle de la référence telle qu’elle est imprimée dans l’édition source, conservée comme donnée documentaire ; (2) une référence biblique normalisée propre à Corpus Scriptura pour l’affichage, la recherche et les liens ? Si oui, laquelle doit être visible par défaut au lecteur ?'

function dateHeure(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} à ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
}

function ColonneMessages({
  titre, messages, onChanger, envoi, placeholder,
}: {
  titre: string
  messages: Message[]
  onChanger: (messages: Message[]) => Promise<void>
  envoi: boolean
  placeholder: string
}) {
  const [brouillon, setBrouillon] = useState('')

  async function ajouter() {
    const texte = brouillon.trim()
    if (!texte || envoi) return
    setBrouillon('')
    await onChanger([...messages, { texte, posee: null }])
  }

  async function supprimer(index: number) {
    if (envoi || !window.confirm('Supprimer définitivement ce message ?')) return
    await onChanger(messages.filter((_, i) => i !== index))
  }

  return (
    <section style={{ minWidth: 0 }}>
      <h3 style={{ margin: '0 0 8px', fontSize: '0.6875rem', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--cs-texte-doux)' }}>{titre}</h3>
      {messages.length > 0 && (
        <ol style={{ listStyle: 'none', padding: 0, margin: '0 0 10px', counterReset: 'message' }}>
          {messages.map((m, i) => (
            <li key={`${m.posee ?? 'nouveau'}-${i}`} style={{ display: 'flex', gap: '10px', padding: '8px 0', borderTop: '1px solid var(--cs-bord-clair)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: '0.8125rem', lineHeight: 1.6, color: 'var(--cs-texte-fort)', whiteSpace: 'pre-wrap' }}><strong style={{ color: 'var(--cs-texte-doux)' }}>{i + 1}. </strong>{m.texte}</p>
                {m.posee && <p style={{ margin: '3px 0 0', fontSize: '0.65625rem', color: 'var(--cs-texte-doux)' }}>Posée le {dateHeure(m.posee)}</p>}
              </div>
              <button type="button" onClick={() => supprimer(i)} disabled={envoi} style={{ alignSelf: 'flex-start', border: '1px solid var(--cs-bord)', borderRadius: '999px', background: 'transparent', color: 'var(--cs-texte-doux)', padding: '3px 8px', fontSize: '0.65625rem', cursor: 'pointer' }}>Supprimer</button>
            </li>
          ))}
        </ol>
      )}
      <textarea
        value={brouillon}
        onChange={e => setBrouillon(e.target.value)}
        onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); ajouter() } }}
        rows={3}
        placeholder={placeholder}
        style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', border: '1px solid var(--cs-bord)', borderRadius: '6px', background: 'var(--cs-fond-clair)', color: 'var(--cs-encre)', padding: '9px 10px', font: 'inherit', fontSize: '0.8125rem', lineHeight: 1.5 }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
        <span style={{ fontSize: '0.65625rem', color: 'var(--cs-texte-doux)' }}>Ctrl + Entrée</span>
        <button type="button" onClick={ajouter} disabled={envoi || !brouillon.trim()} style={{ border: 'none', borderRadius: '5px', background: 'var(--cs-vert-aplat)', color: 'var(--cs-sur-aplat)', padding: '5px 11px', fontSize: '0.75rem', cursor: 'pointer', opacity: envoi || !brouillon.trim() ? 0.5 : 1 }}>Ajouter</button>
      </div>
    </section>
  )
}

export default function RegistreNotes({
  initialInstructions, initialReponses, initialMajLe,
}: {
  initialInstructions: Message[]
  initialReponses: Message[]
  initialMajLe: string | null
}) {
  const [instructions, setInstructions] = useState(initialInstructions)
  const [reponses, setReponses] = useState(initialReponses)
  const [majLe, setMajLe] = useState(initialMajLe)
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  const contexte = useMemo(() => [
    `Proposition : ${TITRE}`,
    '',
    `Exemple relevé : ${EXEMPLE}`,
    '',
    `Question : ${QUESTION}`,
    ...(instructions.length ? ['', 'Instructions de l’auteur du site :', ...instructions.map((m, i) => `${i + 1}. ${m.texte}`)] : []),
    '',
    'Réponds à ce point précis en vue de fixer une règle de la charte des notes.',
  ].join('\n'), [instructions])

  async function enregistrer(champ: 'instructionsGenerales' | 'reponsesGenerales', messages: Message[]) {
    const avantInstructions = instructions
    const avantReponses = reponses
    if (champ === 'instructionsGenerales') setInstructions(messages)
    else setReponses(messages)
    setEnvoi(true)
    setErreur(null)
    try {
      const res = await fetch('/api/admin/propositions-gpt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [champ]: messages }),
      })
      const type = res.headers.get('content-type') ?? ''
      if (res.redirected || !type.includes('application/json')) throw new Error('Session non reconnue. Rechargez la page.')
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || `Échec de l’enregistrement (${res.status}).`)
      if (champ === 'instructionsGenerales' && Array.isArray(json.instructionsGenerales)) setInstructions(json.instructionsGenerales)
      if (champ === 'reponsesGenerales' && Array.isArray(json.reponsesGenerales)) setReponses(json.reponsesGenerales)
      setMajLe(typeof json.majLe === 'string' ? json.majLe : null)
    } catch (e) {
      setInstructions(avantInstructions)
      setReponses(avantReponses)
      setErreur(e instanceof Error ? e.message : 'Erreur d’enregistrement.')
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <main style={{ maxWidth: '56rem', margin: '0 auto', padding: '28px 24px 64px', minHeight: 'calc(100vh - 3.5rem)', background: 'var(--cs-fond)' }}>
      <header style={{ marginBottom: '24px' }}>
        <h1 style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '2rem', fontWeight: 600, color: 'var(--cs-encre)', margin: '0 0 8px' }}>Propositions de GPT</h1>
        <p style={{ maxWidth: '44rem', margin: '0 0 12px', fontSize: '0.875rem', lineHeight: 1.6, color: 'var(--cs-texte-second)' }}>Questions éditoriales à instruire avant de les transformer en normes de Corpus Scriptura.</p>
        <div style={{ display: 'flex', gap: '18px', flexWrap: 'wrap', fontSize: '0.8125rem', color: 'var(--cs-texte-second)' }}>
          <span><strong style={{ color: 'var(--cs-texte-fort)' }}>1</strong> proposition</span>
          <span><strong style={{ color: 'var(--cs-texte-fort)' }}>1</strong> à arbitrer</span>
          <span><strong style={{ color: 'var(--cs-texte-fort)' }}>{instructions.length}</strong> instruction{instructions.length > 1 ? 's' : ''}</span>
          <span><strong style={{ color: 'var(--cs-texte-fort)' }}>{reponses.length}</strong> réponse{reponses.length > 1 ? 's' : ''} de GPT</span>
          <span style={{ marginLeft: 'auto', fontSize: '0.71875rem', color: 'var(--cs-texte-doux)' }}>{envoi ? 'Enregistrement…' : majLe ? `Enregistré le ${dateHeure(majLe)}` : 'Rien d’enregistré'}</span>
        </div>
        {erreur && <p role="alert" style={{ margin: '12px 0 0', padding: '9px 12px', border: '1px solid var(--cs-danger-bord)', borderRadius: '5px', background: 'var(--cs-danger-fond)', color: 'var(--cs-danger)', fontSize: '0.8125rem' }}>{erreur}</p>}
      </header>

      <section>
        <h2 style={{ margin: '0 0 4px', fontSize: '1rem', fontWeight: 600, color: 'var(--cs-encre)' }}>Charte des notes</h2>
        <p style={{ margin: '0 0 12px', fontSize: '0.75rem', color: 'var(--cs-texte-doux)' }}>Échantillon transversal du 3 septembre 2026</p>

        <article style={{ background: 'var(--cs-surface)', border: '1px solid var(--cs-bord)', borderLeft: '3px solid var(--cs-texte-doux)', borderRadius: '8px', padding: '16px 18px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start', marginBottom: '10px' }}>
            <h3 style={{ margin: 0, fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '1.125rem', fontWeight: 600, color: 'var(--cs-encre)' }}>{TITRE}</h3>
            <span style={{ flex: '0 0 auto', border: '1px solid var(--cs-texte-doux)', borderRadius: '999px', padding: '3px 8px', fontSize: '0.6875rem', color: 'var(--cs-texte-doux)' }}>À arbitrer</span>
          </div>

          <div style={{ margin: '12px 0', padding: '11px 13px', background: 'var(--cs-fond)', borderRadius: '6px' }}>
            <p style={{ margin: '0 0 4px', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--cs-texte-doux)' }}>Exemple</p>
            <p style={{ margin: 0, fontSize: '0.875rem', lineHeight: 1.65, color: 'var(--cs-texte-fort)' }}>{EXEMPLE}</p>
          </div>

          <div style={{ margin: '12px 0 18px' }}>
            <p style={{ margin: '0 0 4px', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--cs-texte-doux)' }}>Question</p>
            <p style={{ margin: 0, fontSize: '0.875rem', lineHeight: 1.65, color: 'var(--cs-texte-fort)' }}>{QUESTION}</p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '14px' }}>
            <button type="button" onClick={() => navigator.clipboard.writeText(contexte)} style={{ border: '1px solid var(--cs-bord)', borderRadius: '999px', background: 'transparent', color: 'var(--cs-texte-second)', padding: '4px 10px', fontSize: '0.6875rem', cursor: 'pointer' }}>Copier pour GPT</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(18rem, 1fr))', gap: '18px', paddingTop: '14px', borderTop: '1px solid var(--cs-bord-clair)' }}>
            <ColonneMessages titre="Mes instructions" messages={instructions} onChanger={m => enregistrer('instructionsGenerales', m)} envoi={envoi} placeholder="Une instruction…" />
            <ColonneMessages titre="Réponses de GPT" messages={reponses} onChanger={m => enregistrer('reponsesGenerales', m)} envoi={envoi} placeholder="La réponse de GPT…" />
          </div>
        </article>
      </section>
    </main>
  )
}
