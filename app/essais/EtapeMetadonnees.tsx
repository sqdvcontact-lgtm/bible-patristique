'use client'

import { useState } from 'react'

export const CATEGORIES_ESSAIS = ['Exégèse', 'Théologie', 'Spiritualité', 'Patristique', 'Philosophie', 'Histoire', 'Littérature', 'Poésie', 'Méditation']
const RESUME_MIN = 50
const RESUME_MAX = 200

const CONDITIONS = `En publiant un essai ou une méditation sur ce site, vous reconnaissez et acceptez ce qui suit :

— L'œuvre que vous publiez, ainsi que les droits qui s'y rattachent, vous appartiennent en propre, de façon absolue et irrévocable. Vous garantissez en être l'auteur, ou détenir les droits nécessaires à sa publication.

— Nul, hormis vous-même, titulaire du compte, ne peut s'approprier cette œuvre. Elle peut être citée par d'autres, mais seulement ponctuellement, dans le respect du droit de citation, et jamais reprise dans son intégralité sans votre accord.

— Le contenu publié doit respecter les lois en vigueur en France, et s'inscrire dans un esprit de partage, de développement intellectuel, de transmission du savoir et d'intelligence de la foi.

— Vous autorisez l'éditeur du site à apporter des corrections mineures (mise en forme, typographie, orthographe) qui n'altèrent pas le sens de votre texte.

— Vous accordez à Corpus Scriptura le droit d'héberger, d'afficher et de rendre votre texte consultable sur le site, sans que cela ne transfère la propriété de l'œuvre ni n'en restreigne l'usage que vous pourriez en faire ailleurs.

— Le site se réserve le droit de retirer ou de refuser tout contenu manifestement illicite, diffamatoire, ou contraire à l'esprit du projet, après examen par l'administration.

— Vous pouvez à tout moment demander le retrait définitif de votre texte du site.`

export type Metadonnees = { titre: string; sousTitre: string; resume: string; categories: string[] }

export default function EtapeMetadonnees({ valeursInitiales, onValider, mode = 'page' }: { valeursInitiales?: Partial<Metadonnees>; onValider: (m: Metadonnees) => void; mode?: 'page' | 'bloc' }) {
  const [titre, setTitre] = useState(valeursInitiales?.titre ?? '')
  const [sousTitre, setSousTitre] = useState(valeursInitiales?.sousTitre ?? '')
  const [resume, setResume] = useState(valeursInitiales?.resume ?? '')
  const [categories, setCategories] = useState<string[]>(valeursInitiales?.categories ?? [])
  const [accepteConditions, setAccepteConditions] = useState(false)
  const [conditionsOuvertes, setConditionsOuvertes] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  const toggleCategorie = (c: string) => setCategories(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])
  const resumeLen = resume.trim().length
  const resumeOk = resumeLen >= RESUME_MIN && resumeLen <= RESUME_MAX

  const valider = () => {
    if (!titre.trim()) { setErreur('Le titre est obligatoire.'); return }
    if (!resumeOk) { setErreur(`Le résumé doit faire entre ${RESUME_MIN} et ${RESUME_MAX} caractères.`); return }
    if (categories.length === 0) { setErreur('Choisissez au moins une catégorie.'); return }
    setErreur(null)
    setAccepteConditions(false)
    setConditionsOuvertes(true)
  }

  const confirmerConditions = () => {
    if (!accepteConditions) { setErreur('Vous devez attester respecter les conditions de publication.'); return }
    onValider({ titre: titre.trim(), sousTitre: sousTitre.trim(), resume: resume.trim(), categories })
  }

  const estBloc = mode === 'bloc'

  return (
    <main style={{ minHeight: mode === 'page' ? 'calc(100vh - 48px)' : undefined, background: '#f7f4ef', display: 'flex', alignItems: estBloc ? 'flex-start' : 'center', justifyContent: 'center', padding: estBloc ? '8px 0 0' : '24px' }}>
      <div style={{ background: '#fff', border: '1px solid #e4dfd8', borderRadius: '10px', padding: estBloc ? '28px 34px 30px' : '32px 36px', width: '100%', maxWidth: estBloc ? '720px' : '540px', boxShadow: estBloc ? '0 8px 26px rgba(0,0,0,0.035)' : '0 8px 32px rgba(0,0,0,0.06)' }}>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: estBloc ? '22px' : '20px', color: '#1e2e24', margin: '0 0 4px' }}>Nouvelle contribution</h1>
        <p style={{ fontSize: '12px', color: '#9a958d', margin: '0 0 24px' }}>
          <span style={{ fontVariant: 'small-caps', letterSpacing: '0.06em' }}>Première étape.</span> Une fois validée, vous passerez à la rédaction.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '9.5px', fontWeight: 600, letterSpacing: '0.08em', color: '#9a958d' }}>TITRE *</label>
            <input value={titre} onChange={e => setTitre(e.target.value)} autoFocus autoComplete="off" name="essai-titre" placeholder="Titre"
              style={{ width: '100%', fontSize: '16px', fontFamily: 'Georgia, serif', padding: '7px 0', border: 'none', borderBottom: '1px solid #d6d0c4', outline: 'none', color: '#1e2e24', background: 'transparent', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: '9.5px', fontWeight: 600, letterSpacing: '0.08em', color: '#9a958d' }}>SOUS-TITRE</label>
            <input value={sousTitre} onChange={e => setSousTitre(e.target.value)} autoComplete="off" name="essai-sous-titre" placeholder="Sous-titre"
              style={{ width: '100%', fontSize: '13px', padding: '6px 0', border: 'none', borderBottom: '1px solid #ede9e2', outline: 'none', color: '#3a3530', background: 'transparent', boxSizing: 'border-box' }} />
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px', marginBottom: '5px' }}>
              <label style={{ fontSize: '9.5px', fontWeight: 600, letterSpacing: '0.08em', color: '#9a958d' }}>RÉSUMÉ</label>
              <span style={{ fontSize: '10px', color: resume.length > 0 && !resumeOk ? '#c0562a' : '#9a958d' }}>
                {resumeLen} / {RESUME_MAX}{resume.length > 0 && !resumeOk ? ` (${RESUME_MIN} à ${RESUME_MAX} caractères requis)` : ''}
              </span>
            </div>
            <textarea value={resume} onChange={e => setResume(e.target.value)} rows={3} placeholder={`${RESUME_MIN} à ${RESUME_MAX} caractères présentant l'essai`}
              style={{ width: '100%', fontSize: '12.5px', padding: '7px 9px', border: '1px solid #d6d0c4', borderRadius: '5px', background: '#faf8f4', color: '#2a2520', resize: 'vertical', outline: 'none', boxSizing: 'border-box', lineHeight: 1.5 }} />
          </div>
          <div>
            <label style={{ fontSize: '9.5px', fontWeight: 600, letterSpacing: '0.08em', color: '#9a958d', display: 'block', marginBottom: '6px' }}>CATÉGORIES *</label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {CATEGORIES_ESSAIS.map(c => (
                <button key={c} onClick={() => toggleCategorie(c)}
                  style={{ fontSize: '11px', padding: '4px 11px', borderRadius: '12px', cursor: 'pointer', border: `1px solid ${categories.includes(c) ? '#3d6b4f' : '#d6d0c4'}`, background: categories.includes(c) ? 'rgba(61,107,79,0.10)' : '#fff', color: categories.includes(c) ? '#3d6b4f' : '#8a8278', fontWeight: categories.includes(c) ? 600 : 400 }}>
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        {erreur && <p style={{ fontSize: '12px', color: '#c0562a', marginTop: '16px' }}>{erreur}</p>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
          <button onClick={valider} style={{ fontSize: '13px', padding: '9px 22px', borderRadius: '6px', border: 'none', background: '#3d6b4f', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
            Continuer vers la rédaction →
          </button>
        </div>
      </div>
      {conditionsOuvertes && (
        <div onClick={() => setConditionsOuvertes(false)} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(30,24,18,0.34)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '520px', maxWidth: '100%', background: '#fff', borderRadius: '9px', border: '1px solid #e4dfd8', boxShadow: '0 14px 42px rgba(0,0,0,0.18)', padding: '20px 22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'center', marginBottom: '10px' }}>
              <p style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#3d6b4f', margin: 0 }}>Conditions de publication</p>
              <button onClick={() => setConditionsOuvertes(false)} style={{ border: 'none', background: 'transparent', color: '#9a958d', cursor: 'pointer', fontSize: '15px', padding: 0 }}>✕</button>
            </div>
            <div style={{ maxHeight: '300px', overflowY: 'auto', fontSize: '11.5px', color: '#5a5450', lineHeight: 1.58, whiteSpace: 'pre-line', background: '#faf8f4', border: '1px solid #ede9e2', borderRadius: '5px', padding: '11px 13px' }}>
              {CONDITIONS}
            </div>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '11.5px', color: '#3a3530', marginTop: '12px', cursor: 'pointer' }}>
              <input type="checkbox" checked={accepteConditions} onChange={e => setAccepteConditions(e.target.checked)} style={{ marginTop: '2px', accentColor: '#3d6b4f' }} />
              Je certifie respecter ces conditions de publication.
            </label>
            {erreur && <p style={{ fontSize: '11px', color: '#c0562a', margin: '10px 0 0' }}>{erreur}</p>}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
              <button onClick={() => setConditionsOuvertes(false)} style={{ fontSize: '11.5px', padding: '6px 13px', borderRadius: '5px', border: '1px solid #d6d0c4', background: '#fff', color: '#6b6560', cursor: 'pointer' }}>Retour</button>
              <button onClick={confirmerConditions} disabled={!accepteConditions}
                style={{ fontSize: '11.5px', padding: '6px 15px', borderRadius: '5px', border: 'none', background: accepteConditions ? '#3d6b4f' : '#e4dfd8', color: accepteConditions ? '#fff' : '#9a958d', cursor: accepteConditions ? 'pointer' : 'default', fontWeight: 600 }}>
                Passer à la rédaction
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
