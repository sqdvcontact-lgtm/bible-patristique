'use client'

import { useState } from 'react'

const CATEGORIES = ['Philosophie', 'Théologie', 'Exégèse', 'Spiritualité', 'Littérature', 'Poésie', 'Histoire', 'Patristique']
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
  const [erreur, setErreur] = useState<string | null>(null)

  const toggleCategorie = (c: string) => setCategories(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])
  const resumeLen = resume.trim().length
  const resumeOk = resumeLen >= RESUME_MIN && resumeLen <= RESUME_MAX

  const valider = () => {
    if (!titre.trim()) { setErreur('Le titre est obligatoire.'); return }
    if (!resumeOk) { setErreur(`Le résumé doit faire entre ${RESUME_MIN} et ${RESUME_MAX} caractères.`); return }
    if (categories.length === 0) { setErreur('Choisissez au moins une catégorie.'); return }
    if (!accepteConditions) { setErreur('Vous devez attester avoir lu et accepté les conditions de publication.'); return }
    onValider({ titre: titre.trim(), sousTitre: sousTitre.trim(), resume: resume.trim(), categories })
  }

  const estBloc = mode === 'bloc'

  return (
    <main style={{ minHeight: mode === 'page' ? 'calc(100vh - 48px)' : undefined, background: '#f7f4ef', display: 'flex', alignItems: estBloc ? 'flex-start' : 'center', justifyContent: 'center', padding: estBloc ? '8px 0 0' : '24px' }}>
      <div style={{ background: '#fff', border: '1px solid #e4dfd8', borderRadius: '10px', padding: estBloc ? '28px 34px 30px' : '32px 36px', width: '100%', maxWidth: estBloc ? '720px' : '540px', boxShadow: estBloc ? '0 8px 26px rgba(0,0,0,0.035)' : '0 8px 32px rgba(0,0,0,0.06)' }}>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: estBloc ? '22px' : '20px', color: '#1e2e24', margin: '0 0 4px' }}>Nouvelle contribution</h1>
        <p style={{ fontSize: '12px', color: '#9a958d', margin: '0 0 24px' }}>Première étape — une fois validée, vous passerez à la rédaction.</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '9.5px', fontWeight: 600, letterSpacing: '0.08em', color: '#9a958d' }}>TITRE *</label>
            <input value={titre} onChange={e => setTitre(e.target.value)} autoFocus autoComplete="off" name="essai-titre" placeholder="Le titre de votre essai"
              style={{ width: '100%', fontSize: '16px', fontFamily: 'Georgia, serif', padding: '7px 0', border: 'none', borderBottom: '1px solid #d6d0c4', outline: 'none', color: '#1e2e24', background: 'transparent', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: '9.5px', fontWeight: 600, letterSpacing: '0.08em', color: '#9a958d' }}>SOUS-TITRE</label>
            <input value={sousTitre} onChange={e => setSousTitre(e.target.value)} autoComplete="off" name="essai-sous-titre" placeholder="Facultatif"
              style={{ width: '100%', fontSize: '13px', padding: '6px 0', border: 'none', borderBottom: '1px solid #ede9e2', outline: 'none', color: '#3a3530', background: 'transparent', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: '9.5px', fontWeight: 600, letterSpacing: '0.08em', color: '#9a958d' }}>
              RÉSUMÉ — {resumeLen} / {RESUME_MAX} {resume.length > 0 && !resumeOk && <span style={{ color: '#c0562a' }}>({RESUME_MIN} à {RESUME_MAX} caractères requis)</span>}
            </label>
            <textarea value={resume} onChange={e => setResume(e.target.value)} rows={3} placeholder={`${RESUME_MIN} à ${RESUME_MAX} caractères présentant l'essai`}
              style={{ width: '100%', fontSize: '12.5px', padding: '7px 9px', border: '1px solid #d6d0c4', borderRadius: '5px', background: '#faf8f4', color: '#2a2520', resize: 'vertical', outline: 'none', boxSizing: 'border-box', lineHeight: 1.5 }} />
          </div>
          <div>
            <label style={{ fontSize: '9.5px', fontWeight: 600, letterSpacing: '0.08em', color: '#9a958d', display: 'block', marginBottom: '6px' }}>CATÉGORIES *</label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {CATEGORIES.map(c => (
                <button key={c} onClick={() => toggleCategorie(c)}
                  style={{ fontSize: '11px', padding: '4px 11px', borderRadius: '12px', cursor: 'pointer', border: `1px solid ${categories.includes(c) ? '#3d6b4f' : '#d6d0c4'}`, background: categories.includes(c) ? 'rgba(61,107,79,0.10)' : '#fff', color: categories.includes(c) ? '#3d6b4f' : '#8a8278', fontWeight: categories.includes(c) ? 600 : 400 }}>
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ marginTop: '18px' }}>
          <label style={{ fontSize: '9.5px', fontWeight: 600, letterSpacing: '0.08em', color: '#9a958d', display: 'block', marginBottom: '6px' }}>CONDITIONS DE PUBLICATION *</label>
          <div style={{ maxHeight: '140px', overflowY: 'auto', fontSize: '11.5px', color: '#5a5450', lineHeight: 1.55, whiteSpace: 'pre-line', background: '#faf8f4', border: '1px solid #ede9e2', borderRadius: '5px', padding: '10px 12px' }}>
            {CONDITIONS}
          </div>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '7px', fontSize: '11.5px', color: '#3a3530', marginTop: '8px', cursor: 'pointer' }}>
            <input type="checkbox" checked={accepteConditions} onChange={e => setAccepteConditions(e.target.checked)} style={{ marginTop: '2px' }} />
            J'atteste avoir lu et accepté les conditions de publication ci-dessus.
          </label>
        </div>

        {erreur && <p style={{ fontSize: '12px', color: '#c0562a', marginTop: '16px' }}>{erreur}</p>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
          <button onClick={valider} style={{ fontSize: '13px', padding: '9px 22px', borderRadius: '6px', border: 'none', background: '#3d6b4f', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
            Continuer vers la rédaction →
          </button>
        </div>
      </div>
    </main>
  )
}
