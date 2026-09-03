'use client'

import { useState } from 'react'
import type { Message } from './registre'
import { ENCRE_TITRE_CARTE, GRAISSE_TITRE, TITRE_PAGE } from '@/app/lib/hierarchieTitres'

type Question = {
  id: string
  exemple: string
  question: string
}

const QUESTIONS: Question[] = [
  {
    id: 'forme-reference-source',
    exemple: 'Référence imprimée : IV Reg. XIV, 23 et seqq.',
    question: 'Faut-il conserver cette forme imprimée à l’affichage, ou afficher une référence biblique normalisée ?',
  },
  {
    id: 'prefixe-reference-imprimee',
    exemple: 'Référence imprimée : Joan. XII, 28.',
    question: 'Faut-il conserver le préfixe « Référence imprimée : » dans le texte de la note ?',
  },
  {
    id: 'sigles-chiffres-romains',
    exemple: 'Référence imprimée : Ps. LXXII, 27.',
    question: 'Faut-il normaliser systématiquement les sigles et les chiffres romains des références bibliques ?',
  },
  {
    id: 'ponctuation-finale-reference',
    exemple: 'Référence imprimée : He 10, 28-29',
    question: 'Faut-il imposer une ponctuation finale aux notes constituées uniquement d’une référence ?',
  },
  {
    id: 'abreviations-bibliographiques',
    exemple: 'Cf. Joh. Sarisberiensis, Polycrat. ; Bruno, Comm. in Consol. philos. (coll. Ang. Maï) ; Glareanus, Præf. ad édit. Basil., 1570 ; Hug. Grotins, Præf. ad hist. Gothor., Vandal. et Longob. ; Brucker, Hist. crit. philos.',
    question: 'Faut-il normaliser les abréviations bibliographiques dans les notes anciennes ?',
  },
  {
    id: 'orthographe-historique',
    exemple: 'L’orateur parle ici du système de Straton de Lampsaque, disciple d’Aristote. Suivant ce philosophe, les élémens du monde étoient animés, et avoient en eux un principe de mouvement, dont il étoit résulté, sans aucun concours d’une intelligence suprême, un monde et des êtres tels que nous les voyons. Son système avoit quelque rapport avec celui des atomes d’Epicure dont il est parlé ensuite ; mais il n’étoit pas tout-à-fait le même.',
    question: 'Faut-il conserver l’orthographe historique des notes lorsqu’elle est clairement attestée ?',
  },
  {
    id: 'points-suspension',
    exemple: 'Il en est qui supposent… Tels que Démocrite et d’autres philosophes.',
    question: 'Faut-il conserver les points de suspension de l’édition, ou les normaliser selon leur fonction ?',
  },
  {
    id: 'apparat-critique',
    exemple: '2 Magnus es — tua et sapi|| minio depicta S.',
    question: 'L’apparat critique doit-il suivre des règles de normalisation distinctes des autres notes ?',
  },
  {
    id: 'citation-traduction',
    exemple: '« In scriptis, quod verum est, ex proximo sumendum, quum id et non explicant. »',
    question: 'Les citations latines dans les notes doivent-elles être distinguées structurellement du commentaire et de leur traduction ?',
  },
  {
    id: 'reference-incomplete',
    exemple: 'Référence imprimée : 4.',
    question: 'Comment faut-il traiter une référence imprimée manifestement incomplète ou ambiguë ?',
  },
]

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
        style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', border: '1px solid var(--cs-bord)', borderRadius: '4px', background: 'var(--cs-fond-clair)', color: 'var(--cs-encre)', padding: '9px 10px', font: 'inherit', fontSize: '0.8125rem', lineHeight: 1.5 }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
        <span style={{ fontSize: '0.65625rem', color: 'var(--cs-texte-doux)' }}>Ctrl + Entrée</span>
        <button type="button" onClick={ajouter} disabled={envoi || !brouillon.trim()} style={{ border: 'none', borderRadius: '4px', background: 'var(--cs-vert-aplat)', color: 'var(--cs-sur-aplat)', padding: '5px 11px', fontSize: '0.75rem', cursor: 'pointer', opacity: envoi || !brouillon.trim() ? 0.5 : 1 }}>Ajouter</button>
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

  function contexteQuestion(item: Question) {
    return [
      `Exemple : ${item.exemple}`,
      '',
      `Question : ${item.question}`,
      ...(instructions.length ? ['', 'Instructions de l’auteur du site :', ...instructions.map((m, i) => `${i + 1}. ${m.texte}`)] : []),
      '',
      'Réponds uniquement à cette question en vue de fixer une règle de la charte des notes.',
    ].join('\n')
  }

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
        <h1 style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: TITRE_PAGE, fontWeight: GRAISSE_TITRE, color: ENCRE_TITRE_CARTE, margin: '0 0 8px' }}>Propositions de GPT</h1>
        <p style={{ maxWidth: '44rem', margin: '0 0 12px', fontSize: '0.875rem', lineHeight: 1.6, color: 'var(--cs-texte-second)' }}>Questions éditoriales à instruire avant de les transformer en normes de Corpus Scriptura.</p>
        <div style={{ display: 'flex', gap: '18px', flexWrap: 'wrap', fontSize: '0.8125rem', color: 'var(--cs-texte-second)' }}>
          <span><strong style={{ color: 'var(--cs-texte-fort)' }}>{QUESTIONS.length}</strong> propositions</span>
          <span><strong style={{ color: 'var(--cs-texte-fort)' }}>{QUESTIONS.length}</strong> à arbitrer</span>
          <span><strong style={{ color: 'var(--cs-texte-fort)' }}>{instructions.length}</strong> instruction{instructions.length > 1 ? 's' : ''}</span>
          <span><strong style={{ color: 'var(--cs-texte-fort)' }}>{reponses.length}</strong> réponse{reponses.length > 1 ? 's' : ''} de GPT</span>
          <span style={{ marginLeft: 'auto', fontSize: '0.71875rem', color: 'var(--cs-texte-doux)' }}>{envoi ? 'Enregistrement…' : majLe ? `Enregistré le ${dateHeure(majLe)}` : 'Rien d’enregistré'}</span>
        </div>
        {erreur && <p role="alert" style={{ margin: '12px 0 0', padding: '9px 12px', border: '1px solid var(--cs-danger-bord)', borderRadius: '8px', background: 'var(--cs-danger-fond)', color: 'var(--cs-danger)', fontSize: '0.8125rem' }}>{erreur}</p>}
      </header>

      <section>
        <h2 style={{ margin: '0 0 4px', fontSize: '1rem', fontWeight: 600, color: 'var(--cs-encre)' }}>Charte des notes</h2>
        <p style={{ margin: '0 0 12px', fontSize: '0.75rem', color: 'var(--cs-texte-doux)' }}>Échantillon transversal du 3 septembre 2026</p>

        <div style={{ display: 'grid', gap: '12px' }}>
          {QUESTIONS.map((item, index) => (
            <article key={item.id} style={{ background: 'var(--cs-surface)', border: '1px solid var(--cs-bord)', borderLeft: '3px solid var(--cs-texte-doux)', borderRadius: '8px', padding: '15px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.6875rem', color: 'var(--cs-texte-doux)' }}>{index + 1}</span>
                <span style={{ flex: '0 0 auto', border: '1px solid var(--cs-texte-doux)', borderRadius: '999px', padding: '3px 8px', fontSize: '0.6875rem', color: 'var(--cs-texte-doux)' }}>À arbitrer</span>
              </div>
              <p style={{ margin: '10px 0 12px', fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '0.9375rem', lineHeight: 1.65, color: 'var(--cs-texte-fort)', whiteSpace: 'pre-wrap' }}>{item.exemple}</p>
              <p style={{ margin: 0, fontSize: '0.875rem', lineHeight: 1.65, color: 'var(--cs-encre)' }}>{item.question}</p>
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button type="button" onClick={() => navigator.clipboard.writeText(contexteQuestion(item))} style={{ border: '1px solid var(--cs-bord)', borderRadius: '999px', background: 'transparent', color: 'var(--cs-texte-second)', padding: '4px 10px', fontSize: '0.6875rem', cursor: 'pointer' }}>Copier pour GPT</button>
              </div>
            </article>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(18rem, 1fr))', gap: '18px', marginTop: '18px', padding: '16px 18px', background: 'var(--cs-surface)', border: '1px solid var(--cs-bord)', borderRadius: '8px' }}>
          <ColonneMessages titre="Mes instructions" messages={instructions} onChanger={m => enregistrer('instructionsGenerales', m)} envoi={envoi} placeholder="Une instruction…" />
          <ColonneMessages titre="Réponses de GPT" messages={reponses} onChanger={m => enregistrer('reponsesGenerales', m)} envoi={envoi} placeholder="La réponse de GPT…" />
        </div>
      </section>
    </main>
  )
}
