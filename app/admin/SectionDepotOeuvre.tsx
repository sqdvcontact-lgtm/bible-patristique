'use client'

import React, { useState } from 'react'

// ── Types ───────────────────────────────────────────────────────────────────
type ExempleLien = { niveau: 'lien_1' | 'lien_2' | 'lien_3'; passage: string; verset: string; commentaire: string }

type FormState = {
  // 1. Identité de l'œuvre
  auteur: string
  titre: string
  traducteur: string
  editionSource: string

  // 2. Structure hiérarchique
  nbNiveaux: string
  niveau1Nom: string; niveau1Separateur: string
  niveau2Nom: string; niveau2Separateur: string
  niveau3Nom: string; niveau3Separateur: string
  niveauxIrreguliers: string

  // 3. Règle de longueur
  seuilLongueur: 'standard' | 'plus_long' | 'plus_court' | 'personnalise'
  seuilPersonnalise: string
  styleSyntaxique: string

  // 4. Citations bibliques intégrées
  refsEntreParentheses: 'retirer' | 'conserver' | 'variable'
  refsVariableDetails: string

  // 5. Traduction biblique de référence
  traductionBiblique: 'sacy' | 'segond' | 'crampon' | 'vulgate' | 'autre' | 'inconnue'
  traductionAutreDetails: string

  // 6. Exemples de liens (3 minimum)
  exemples: ExempleLien[]

  // 7. Tolérance lien_3
  tolranceLien3: 'prudente' | 'large'

  // 8. Liens déjà saisis manuellement
  aDesLiensManuels: boolean
  liensManuelsDetails: string

  // Texte brut
  texteBrut: string
}

const ETAT_INITIAL: FormState = {
  auteur: '', titre: '', traducteur: '', editionSource: '',
  nbNiveaux: '2',
  niveau1Nom: '', niveau1Separateur: '',
  niveau2Nom: '', niveau2Separateur: '',
  niveau3Nom: '', niveau3Separateur: '',
  niveauxIrreguliers: '',
  seuilLongueur: 'standard', seuilPersonnalise: '', styleSyntaxique: '',
  refsEntreParentheses: 'retirer', refsVariableDetails: '',
  traductionBiblique: 'inconnue', traductionAutreDetails: '',
  exemples: [
    { niveau: 'lien_1', passage: '', verset: '', commentaire: '' },
    { niveau: 'lien_2', passage: '', verset: '', commentaire: '' },
    { niveau: 'lien_3', passage: '', verset: '', commentaire: '' },
  ],
  tolranceLien3: 'prudente',
  aDesLiensManuels: false, liensManuelsDetails: '',
  texteBrut: '',
}

// ── Styles partagés ─────────────────────────────────────────────────────────
const labelStyle: React.CSSProperties = { fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', color: '#9a958d', display: 'block', marginBottom: '4px', textTransform: 'uppercase' }
const inputStyle: React.CSSProperties = { width: '100%', fontSize: '13px', padding: '8px 10px', border: '1px solid #d6d0c4', borderRadius: '5px', background: '#faf8f4', color: '#2a2520', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }
const textareaStyle: React.CSSProperties = { ...inputStyle, resize: 'vertical', lineHeight: 1.5 }
const sectionStyle: React.CSSProperties = { background: '#fff', border: '1px solid #e4dfd8', borderRadius: '8px', padding: '18px 20px', marginBottom: '16px' }
const sectionTitreStyle: React.CSSProperties = { fontSize: '13.5px', fontWeight: 600, color: '#2a3d30', marginBottom: '4px' }
const sectionAideStyle: React.CSSProperties = { fontSize: '11.5px', color: '#9a958d', marginBottom: '14px', lineHeight: 1.5 }
const champStyle: React.CSSProperties = { marginBottom: '12px' }
const radioLabelStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: '#3a3530', cursor: 'pointer', marginBottom: '6px' }

function Champ({ label, aide, children }: { label: string; aide?: string; children: React.ReactNode }) {
  return (
    <div style={champStyle}>
      <label style={labelStyle}>{label}</label>
      {children}
      {aide && <p style={{ fontSize: '10.5px', color: '#b0a89e', margin: '3px 0 0', fontStyle: 'italic' }}>{aide}</p>}
    </div>
  )
}

function Radio<T extends string>({ value, current, onChange, label }: { value: T; current: T; onChange: (v: T) => void; label: string }) {
  return (
    <label style={radioLabelStyle}>
      <input type="radio" checked={current === value} onChange={() => onChange(value)} style={{ accentColor: '#3d6b4f' }} />
      {label}
    </label>
  )
}

export default function SectionDepotOeuvre() {
  const [f, setF] = useState<FormState>(ETAT_INITIAL)
  const [fichierNom, setFichierNom] = useState('')
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setF(prev => ({ ...prev, [k]: v }))

  const setExemple = (i: number, champ: keyof ExempleLien, v: string) => {
    setF(prev => {
      const exemples = [...prev.exemples]
      exemples[i] = { ...exemples[i], [champ]: v }
      return { ...prev, exemples }
    })
  }

  const onFichier = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFichierNom(file.name)
    const reader = new FileReader()
    reader.onload = () => set('texteBrut', String(reader.result ?? ''))
    reader.readAsText(file, 'utf-8')
  }

  const champsManquants: string[] = []
  if (!f.auteur.trim()) champsManquants.push('Auteur')
  if (!f.titre.trim()) champsManquants.push('Titre')
  if (!f.texteBrut.trim()) champsManquants.push('Texte de l\u2019œuvre')
  const exemplesRemplis = f.exemples.filter(e => e.passage.trim() && e.verset.trim()).length

  const genererExport = () => {
    const lignes: string[] = []
    lignes.push(`# Cahier des charges — dépôt IA`)
    lignes.push(``)
    lignes.push(`Généré le ${new Date().toLocaleDateString('fr-FR')} via /admin · onglet Dépôt IA`)
    lignes.push(``)
    lignes.push(`## 1. Identité de l'œuvre`)
    lignes.push(`- **Auteur** : ${f.auteur || '—'}`)
    lignes.push(`- **Titre** : ${f.titre || '—'}`)
    lignes.push(`- **Traducteur** : ${f.traducteur || '—'}`)
    lignes.push(`- **Édition source** : ${f.editionSource || '—'}`)
    lignes.push(``)
    lignes.push(`## 2. Structure hiérarchique`)
    lignes.push(`- **Nombre de niveaux** : ${f.nbNiveaux}`)
    if (f.niveau1Nom) lignes.push(`- **Niveau 1** : ${f.niveau1Nom} — séparateur typographique : \`${f.niveau1Separateur || '—'}\``)
    if (f.niveau2Nom) lignes.push(`- **Niveau 2** : ${f.niveau2Nom} — séparateur typographique : \`${f.niveau2Separateur || '—'}\``)
    if (f.niveau3Nom) lignes.push(`- **Niveau 3** : ${f.niveau3Nom} — séparateur typographique : \`${f.niveau3Separateur || '—'}\``)
    if (f.niveauxIrreguliers) lignes.push(`- **Irrégularités signalées** : ${f.niveauxIrreguliers}`)
    lignes.push(``)
    lignes.push(`## 3. Règle de longueur des segments`)
    const seuilLabel = { standard: 'Standard (charte générale, ~300 caractères)', plus_long: 'Segments plus longs que la charte standard', plus_court: 'Segments plus courts que la charte standard', personnalise: 'Seuil personnalisé' }[f.seuilLongueur]
    lignes.push(`- **Seuil retenu** : ${seuilLabel}${f.seuilLongueur === 'personnalise' ? ` — ${f.seuilPersonnalise}` : ''}`)
    if (f.styleSyntaxique) lignes.push(`- **Remarque sur le style syntaxique de l'auteur** : ${f.styleSyntaxique}`)
    lignes.push(``)
    lignes.push(`## 4. Citations bibliques entre parenthèses dans le texte`)
    const refsLabel = { retirer: 'Retirer du texte après extraction du lien', conserver: 'Conserver visibles dans le texte', variable: 'Variable selon le passage' }[f.refsEntreParentheses]
    lignes.push(`- **Traitement retenu** : ${refsLabel}`)
    if (f.refsEntreParentheses === 'variable' && f.refsVariableDetails) lignes.push(`- **Détail du cas variable** : ${f.refsVariableDetails}`)
    lignes.push(``)
    lignes.push(`## 5. Traduction biblique de référence citée par l'auteur`)
    const tradLabel = { sacy: 'Bible de Sacy', segond: 'Bible Segond', crampon: 'Bible Crampon', vulgate: 'Vulgate', autre: 'Autre traduction (hors table versets)', inconnue: 'Inconnue — à déterminer automatiquement' }[f.traductionBiblique]
    lignes.push(`- **Traduction** : ${tradLabel}`)
    if (f.traductionBiblique === 'autre' && f.traductionAutreDetails) lignes.push(`- **Détail** : ${f.traductionAutreDetails}`)
    lignes.push(``)
    lignes.push(`## 6. Exemples de liens fournis par l'utilisateur`)
    f.exemples.forEach((ex, i) => {
      if (!ex.passage.trim()) return
      const niveauLabel = { lien_1: 'lien_1 — citation directe', lien_2: 'lien_2 — citation libre/indirecte', lien_3: 'lien_3 — commentaire doctrinal' }[ex.niveau]
      lignes.push(`### Exemple ${i + 1} — ${niveauLabel}`)
      lignes.push(`- **Passage de l'œuvre** : « ${ex.passage} »`)
      lignes.push(`- **Verset biblique visé** : ${ex.verset}`)
      if (ex.commentaire) lignes.push(`- **Pourquoi ce niveau** : ${ex.commentaire}`)
      lignes.push(``)
    })
    lignes.push(`## 7. Tolérance souhaitée pour lien_3 (commentaire doctrinal)`)
    lignes.push(`- **Réglage** : ${f.tolranceLien3 === 'prudente' ? 'Prudente — peu de lien_3, mais fiables' : 'Large — plus de lien_3, à valider ensuite dans Vérifications'}`)
    lignes.push(``)
    lignes.push(`## 8. Liens déjà saisis manuellement à protéger`)
    lignes.push(`- **Présence de liens manuels** : ${f.aDesLiensManuels ? 'Oui' : 'Non'}`)
    if (f.aDesLiensManuels && f.liensManuelsDetails) lignes.push(`- **Détail** : ${f.liensManuelsDetails}`)
    lignes.push(``)
    lignes.push(`---`)
    lignes.push(``)
    lignes.push(`## Texte brut de l'œuvre`)
    lignes.push(``)
    lignes.push('```')
    lignes.push(f.texteBrut)
    lignes.push('```')

    const contenu = lignes.join('\n')
    const blob = new Blob([contenu], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const slug = (f.titre || 'oeuvre').slice(0, 30).replace(/\s+/g, '_').replace(/[^\w-]/g, '')
    a.download = `depot_${slug}_${new Date().toISOString().slice(0, 10)}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ maxWidth: '720px' }}>
      <div style={{ marginBottom: '20px' }}>
        <p style={{ fontSize: '13px', color: '#5a6b5e', lineHeight: 1.6, margin: 0 }}>
          Ce formulaire produit un <strong>cahier des charges complet</strong> à déposer dans la conversation
          avec l'assistant, afin d'obtenir une segmentation et des liens bibliques fiables dès le premier
          passage. Aucune donnée n'est enregistrée en base — un seul fichier <code>.md</code> est généré au
          téléchargement, contenant vos réponses et le texte de l'œuvre.
        </p>
      </div>

      {/* 1. Identité */}
      <div style={sectionStyle}>
        <p style={sectionTitreStyle}>1. Identité de l'œuvre</p>
        <p style={sectionAideStyle}>Les informations bibliographiques de base.</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <Champ label="Auteur *"><input value={f.auteur} onChange={e => set('auteur', e.target.value)} style={inputStyle} placeholder="Augustin d'Hippone" /></Champ>
          <Champ label="Titre *"><input value={f.titre} onChange={e => set('titre', e.target.value)} style={inputStyle} placeholder="Les Confessions" /></Champ>
          <Champ label="Traducteur"><input value={f.traducteur} onChange={e => set('traducteur', e.target.value)} style={inputStyle} placeholder="Abbé Citoleux" /></Champ>
          <Champ label="Édition source"><input value={f.editionSource} onChange={e => set('editionSource', e.target.value)} style={inputStyle} placeholder="Garnier, 1863" /></Champ>
        </div>
      </div>

      {/* 2. Structure hiérarchique */}
      <div style={sectionStyle}>
        <p style={sectionTitreStyle}>2. Structure hiérarchique</p>
        <p style={sectionAideStyle}>
          Décrivez les niveaux réels de l'œuvre (Livre/Chapitre/§, Partie/Question/Article…) et leur
          séparateur typographique exact dans le texte source.
        </p>
        <Champ label="Nombre de niveaux">
          <select value={f.nbNiveaux} onChange={e => set('nbNiveaux', e.target.value)} style={inputStyle}>
            <option value="1">1 niveau</option>
            <option value="2">2 niveaux</option>
            <option value="3">3 niveaux</option>
            <option value="4">4 niveaux ou plus</option>
          </select>
        </Champ>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <Champ label="Niveau 1 — nom" aide="ex : Livre"><input value={f.niveau1Nom} onChange={e => set('niveau1Nom', e.target.value)} style={inputStyle} /></Champ>
          <Champ label="Niveau 1 — séparateur dans le texte" aide="ex : « Livre XII » ou « L. XII »"><input value={f.niveau1Separateur} onChange={e => set('niveau1Separateur', e.target.value)} style={inputStyle} /></Champ>
          <Champ label="Niveau 2 — nom" aide="ex : Chapitre"><input value={f.niveau2Nom} onChange={e => set('niveau2Nom', e.target.value)} style={inputStyle} /></Champ>
          <Champ label="Niveau 2 — séparateur dans le texte"><input value={f.niveau2Separateur} onChange={e => set('niveau2Separateur', e.target.value)} style={inputStyle} /></Champ>
          <Champ label="Niveau 3 — nom" aide="ex : §, Article"><input value={f.niveau3Nom} onChange={e => set('niveau3Nom', e.target.value)} style={inputStyle} /></Champ>
          <Champ label="Niveau 3 — séparateur dans le texte"><input value={f.niveau3Separateur} onChange={e => set('niveau3Separateur', e.target.value)} style={inputStyle} /></Champ>
        </div>
        <Champ label="Irrégularités à signaler" aide="ex : pas de § dans les chapitres courts, numérotation latine ponctuelle…">
          <textarea value={f.niveauxIrreguliers} onChange={e => set('niveauxIrreguliers', e.target.value)} style={textareaStyle} rows={2} />
        </Champ>
      </div>

      {/* 3. Règle de longueur */}
      <div style={sectionStyle}>
        <p style={sectionTitreStyle}>3. Règle de longueur des segments</p>
        <p style={sectionAideStyle}>La charte standard redécoupe au-delà de ~300 caractères, sauf citation indivisible.</p>
        <Radio value="standard" current={f.seuilLongueur} onChange={v => set('seuilLongueur', v)} label="Appliquer la charte standard" />
        <Radio value="plus_long" current={f.seuilLongueur} onChange={v => set('seuilLongueur', v)} label="Autoriser des segments plus longs (style à phrases-fleuves)" />
        <Radio value="plus_court" current={f.seuilLongueur} onChange={v => set('seuilLongueur', v)} label="Segments plus courts (style sec, articles courts)" />
        <Radio value="personnalise" current={f.seuilLongueur} onChange={v => set('seuilLongueur', v)} label="Seuil personnalisé" />
        {f.seuilLongueur === 'personnalise' && (
          <input value={f.seuilPersonnalise} onChange={e => set('seuilPersonnalise', e.target.value)} style={{ ...inputStyle, marginTop: '6px' }} placeholder="ex : redécouper au-delà de 450 caractères" />
        )}
        <Champ label="Remarque sur le style syntaxique" aide="optionnel">
          <textarea value={f.styleSyntaxique} onChange={e => set('styleSyntaxique', e.target.value)} style={{ ...textareaStyle, marginTop: '8px' }} rows={2} placeholder="ex : phrases très longues à subordonnées multiples, citations parfois sur plusieurs lignes" />
        </Champ>
      </div>

      {/* 4. Citations entre parenthèses */}
      <div style={sectionStyle}>
        <p style={sectionTitreStyle}>4. Citations bibliques entre parenthèses dans le texte</p>
        <p style={sectionAideStyle}>Une fois le lien extrait, faut-il retirer la référence visible du texte ?</p>
        <Radio value="retirer" current={f.refsEntreParentheses} onChange={v => set('refsEntreParentheses', v)} label="Retirer systématiquement (comme pour la Somme théologique)" />
        <Radio value="conserver" current={f.refsEntreParentheses} onChange={v => set('refsEntreParentheses', v)} label="Conserver visibles dans le texte" />
        <Radio value="variable" current={f.refsEntreParentheses} onChange={v => set('refsEntreParentheses', v)} label="Cas variable, à préciser" />
        {f.refsEntreParentheses === 'variable' && (
          <textarea value={f.refsVariableDetails} onChange={e => set('refsVariableDetails', e.target.value)} style={{ ...textareaStyle, marginTop: '6px' }} rows={2} placeholder="ex : retirer sauf quand l'auteur commente explicitement la référence juste après" />
        )}
      </div>

      {/* 5. Traduction biblique de référence */}
      <div style={sectionStyle}>
        <p style={sectionTitreStyle}>5. Traduction biblique citée par l'auteur</p>
        <p style={sectionAideStyle}>Si l'auteur cite une traduction absente de la table <code>versets</code>, le matching automatique doit être adapté.</p>
        <select value={f.traductionBiblique} onChange={e => set('traductionBiblique', e.target.value as FormState['traductionBiblique'])} style={inputStyle}>
          <option value="inconnue">Inconnue — à déterminer automatiquement</option>
          <option value="sacy">Bible de Sacy</option>
          <option value="segond">Bible Segond</option>
          <option value="crampon">Bible Crampon</option>
          <option value="vulgate">Vulgate</option>
          <option value="autre">Autre traduction (absente de la table)</option>
        </select>
        {f.traductionBiblique === 'autre' && (
          <input value={f.traductionAutreDetails} onChange={e => set('traductionAutreDetails', e.target.value)} style={{ ...inputStyle, marginTop: '8px' }} placeholder="ex : traduction de Lemaistre de Sacy révisée, ou Septante via Giguet" />
        )}
      </div>

      {/* 6. Exemples de liens */}
      <div style={sectionStyle}>
        <p style={sectionTitreStyle}>6. Exemples de liens ({exemplesRemplis}/3 minimum recommandé)</p>
        <p style={sectionAideStyle}>
          Donnez un exemple réel, tiré du texte que vous déposez, pour chacun des trois niveaux. C'est ce qui
          permet de calibrer la détection sans itération ultérieure.
        </p>
        {f.exemples.map((ex, i) => {
          const niveauLabel = { lien_1: 'Citation directe (lien_1)', lien_2: 'Citation libre / indirecte (lien_2)', lien_3: 'Commentaire doctrinal (lien_3)' }[ex.niveau]
          return (
            <div key={i} style={{ borderTop: i > 0 ? '1px solid #ede9e2' : 'none', paddingTop: i > 0 ? '12px' : 0, marginTop: i > 0 ? '12px' : 0 }}>
              <p style={{ fontSize: '11.5px', fontWeight: 600, color: '#3d6b4f', marginBottom: '8px' }}>{niveauLabel}</p>
              <Champ label="Passage de l'œuvre">
                <textarea value={ex.passage} onChange={e => setExemple(i, 'passage', e.target.value)} style={textareaStyle} rows={2} placeholder="Collez ici la phrase exacte tirée du texte" />
              </Champ>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                <Champ label="Verset visé" aide="ex : Ps 4,9"><input value={ex.verset} onChange={e => setExemple(i, 'verset', e.target.value)} style={inputStyle} /></Champ>
                <Champ label="Pourquoi ce niveau (optionnel)"><input value={ex.commentaire} onChange={e => setExemple(i, 'commentaire', e.target.value)} style={inputStyle} placeholder="ex : paraphrase sans les mots exacts du verset" /></Champ>
              </div>
            </div>
          )
        })}
      </div>

      {/* 7. Tolérance lien_3 */}
      <div style={sectionStyle}>
        <p style={sectionTitreStyle}>7. Tolérance souhaitée pour lien_3 (commentaire doctrinal)</p>
        <p style={sectionAideStyle}>lien_3 est le plus subjectif des trois niveaux.</p>
        <Radio value="prudente" current={f.tolranceLien3} onChange={v => set('tolranceLien3', v)} label="Prudente — peu de lien_3, mais fiables" />
        <Radio value="large" current={f.tolranceLien3} onChange={v => set('tolranceLien3', v)} label="Large — plus de lien_3, à valider ensuite dans Vérifications" />
      </div>

      {/* 8. Liens manuels existants */}
      <div style={sectionStyle}>
        <p style={sectionTitreStyle}>8. Liens déjà saisis manuellement</p>
        <p style={sectionAideStyle}>Les liens marqués <code>fiabilite = 'vérifié'</code> ne doivent jamais être réécrits.</p>
        <label style={radioLabelStyle}>
          <input type="checkbox" checked={f.aDesLiensManuels} onChange={e => set('aDesLiensManuels', e.target.checked)} style={{ accentColor: '#3d6b4f' }} />
          Cette œuvre contient déjà des liens saisis ou validés manuellement
        </label>
        {f.aDesLiensManuels && (
          <textarea value={f.liensManuelsDetails} onChange={e => set('liensManuelsDetails', e.target.value)} style={{ ...textareaStyle, marginTop: '8px' }} rows={2} placeholder="ex : les segments 1 à 40 ont été vérifiés à la main, ne pas les modifier" />
        )}
      </div>

      {/* Texte brut */}
      <div style={sectionStyle}>
        <p style={sectionTitreStyle}>Texte brut de l'œuvre *</p>
        <p style={sectionAideStyle}>Collez le texte directement, ou importez un fichier .txt.</p>
        <Champ label="Importer un fichier .txt (optionnel)">
          <input type="file" accept=".txt" onChange={onFichier} style={{ fontSize: '12px' }} />
          {fichierNom && <span style={{ fontSize: '11px', color: '#3d6b4f', marginLeft: '8px' }}>{fichierNom} chargé</span>}
        </Champ>
        <textarea
          value={f.texteBrut}
          onChange={e => set('texteBrut', e.target.value)}
          style={{ ...textareaStyle, fontFamily: 'monospace', fontSize: '12px' }}
          rows={12}
          placeholder="Collez ici le texte complet de l'œuvre…"
        />
        <p style={{ fontSize: '10.5px', color: '#b0a89e', margin: '4px 0 0' }}>{f.texteBrut.length.toLocaleString('fr-FR')} caractères</p>
      </div>

      {/* Validation et export */}
      <div style={{ ...sectionStyle, background: champsManquants.length > 0 ? '#fdf2ee' : '#f0f7f2', borderColor: champsManquants.length > 0 ? '#e4c4b8' : 'rgba(61,107,79,0.25)' }}>
        {champsManquants.length > 0 ? (
          <p style={{ fontSize: '12.5px', color: '#9a4a2a', margin: '0 0 12px' }}>
            Champs obligatoires manquants : {champsManquants.join(', ')}
          </p>
        ) : (
          <p style={{ fontSize: '12.5px', color: '#3d6b4f', margin: '0 0 12px' }}>
            Tous les champs essentiels sont remplis.
            {exemplesRemplis < 3 && ` (${exemplesRemplis}/3 exemples de liens fournis — recommandé mais non bloquant.)`}
          </p>
        )}
        <button
          onClick={genererExport}
          disabled={champsManquants.length > 0}
          className={champsManquants.length > 0 ? 'btn-gris' : 'btn-vert'}
          style={{ fontSize: '12.5px', padding: '9px 18px', borderRadius: '6px', cursor: champsManquants.length > 0 ? 'not-allowed' : 'pointer', fontWeight: 500 }}
        >
          Télécharger le cahier des charges (.md)
        </button>
      </div>
    </div>
  )
}
