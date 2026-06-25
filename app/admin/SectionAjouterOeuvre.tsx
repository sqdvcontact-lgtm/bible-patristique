'use client'

import React from 'react'
import { supabase, parseCSV, telechargerCSVModele } from './adminShared'
import type { Auteur } from './adminTypes'

export default function SectionAjouterOeuvre({ auteurs }: { auteurs: Auteur[] }) {
  const labelStyle: React.CSSProperties = { fontSize: '10px', fontWeight: 600, letterSpacing: '0.08em', color: '#9a958d', display: 'block', marginBottom: '4px' }
  const inputStyle: React.CSSProperties = { width: '100%', padding: '7px 10px', fontSize: '12.5px', border: '1px solid #d6d0c4', borderRadius: '5px', background: '#f9f7f4', color: '#1e1a16', outline: 'none', boxSizing: 'border-box' }

  // ── Étape courante ──
  const [etape, setEtape] = React.useState<'meta' | 'csv' | 'preview' | 'done'>('meta')

  // ── Métadonnées œuvre ──
  const [meta, setMeta] = React.useState({
    id_auteur: '',
    titre: '',
    sous_titre: '',
    titre_original: '',
    trad_auteur: '',
    trad_date: '',
    editeur: '',
    collection: '',
    ville: '',
    date_publication: '',
    url_source: '',
    genre: '',
    langue: '',
  })

  // ── Ajout auteur ──
  const [ajoutAuteur, setAjoutAuteur] = React.useState(false)
  const [nouvelAuteur, setNouvelAuteur] = React.useState({ nom: '', dates: '', siecle: '', tradition: '' })
  const [auteursCourants, setAuteursCourants] = React.useState<Auteur[]>(auteurs)
  const [auteurMsg, setAuteurMsg] = React.useState<string | null>(null)

  // Charger TOUS les auteurs (pas seulement ceux avec des œuvres)
  React.useEffect(() => {
    supabase.from('auteurs').select('id_auteur, nom, dates, siecle, oeuvres(id_oeuvre, titre)')
      .order('nom', { ascending: true })
      .then(({ data }) => { if (data) setAuteursCourants(data as Auteur[]) })
  }, [])

  const creerAuteur = async () => {
    if (!nouvelAuteur.nom.trim()) { setAuteurMsg('Le nom est requis.'); return }

    // Générer id_auteur au format A0006
    const { data: derniers } = await supabase
      .from('auteurs')
      .select('id_auteur')
      .order('id_auteur', { ascending: false })
      .limit(1)

    let prochainNum = 1
    if (derniers && derniers.length > 0) {
      const num = parseInt((derniers[0].id_auteur as string).replace('A', ''), 10)
      if (!isNaN(num)) prochainNum = num + 1
    }
    const idAuteur = `A${String(prochainNum).padStart(4, '0')}`

    const { data, error } = await supabase.from('auteurs').insert({
      id_auteur: idAuteur,
      nom: nouvelAuteur.nom.trim(),
      dates: nouvelAuteur.dates || null,
      siecle: nouvelAuteur.siecle || null,
      tradition: nouvelAuteur.tradition || null,
    }).select().single()
    if (error) { setAuteurMsg('Erreur : ' + error.message); return }
    const nouv = { id_auteur: data.id_auteur, nom: data.nom, dates: data.dates, siecle: data.siecle, oeuvres: [] }
    setAuteursCourants(prev => [...prev, nouv])
    setMeta(m => ({ ...m, id_auteur: data.id_auteur }))
    setAjoutAuteur(false)
    setNouvelAuteur({ nom: '', dates: '', siecle: '', tradition: '' })
    setAuteurMsg(null)
  }

  // ── Import CSV ──
  const [segments, setSegments] = React.useState<Record<string, string>[]>([])
  const [nomFichier, setNomFichier] = React.useState('')
  const [csvErreur, setCsvErreur] = React.useState<string | null>(null)
  const inputCsvRef = React.useRef<HTMLInputElement | null>(null)

  const COLONNES_REQUISES = ['segment_numero', 'segment_texte']

  const lireFichier = async (fichier: File) => {
    setCsvErreur(null)
    const texte = await fichier.text()
    const lignes = parseCSV(texte)
    if (lignes.length === 0) { setCsvErreur('Fichier vide ou non reconnu.'); return }
    const manquantes = COLONNES_REQUISES.filter(c => !Object.keys(lignes[0]).includes(c))
    if (manquantes.length > 0) { setCsvErreur(`Colonnes manquantes : ${manquantes.join(', ')}`); return }
    setSegments(lignes)
    setNomFichier(fichier.name)
  }

  // ── Génération id_oeuvre ──
  const [idOeuvreGenere, setIdOeuvreGenere] = React.useState('')
  const [generationLoading, setGenerationLoading] = React.useState(false)

  const genererIdOeuvre = async () => {
    if (!meta.id_auteur) { setCsvErreur('Choisissez un auteur avant de générer l\'ID.'); return }
    setGenerationLoading(true)
    // Récupérer TOUTES les œuvres de cet auteur pour trouver le vrai max
    const { data } = await supabase
      .from('oeuvres')
      .select('id_oeuvre')
      .eq('id_auteur', meta.id_auteur)
      .order('id_oeuvre', { ascending: false })
    let prochainNum = 1
    if (data && data.length > 0) {
      // Trouver le numéro max parmi toutes les œuvres
      const nums = data.map((d: any) => {
        const match = (d.id_oeuvre as string).match(/O(\d+)$/)
        return match ? parseInt(match[1]) : 0
      })
      prochainNum = Math.max(...nums) + 1
    }
    const id = `${meta.id_auteur}O${String(prochainNum).padStart(4, '0')}`
    setIdOeuvreGenere(id)
    setGenerationLoading(false)
  }

  // ── Import final ──
  const [importing, setImporting] = React.useState(false)
  const [resultat, setResultat] = React.useState<{ ok: boolean; msg: string; idOeuvre?: string } | null>(null)

  const confirmerImport = async () => {
    if (!meta.id_auteur || !meta.titre.trim()) { setCsvErreur('Titre et auteur sont requis.'); return }
    if (!idOeuvreGenere) { setCsvErreur('Générez l\'ID de l\'œuvre avant de continuer.'); return }
    setImporting(true)
    const idOeuvre = idOeuvreGenere

    // 0. Vérifier que l'ID n'existe pas déjà
    const { data: existante } = await supabase.from('oeuvres').select('id_oeuvre').eq('id_oeuvre', idOeuvre).single()
    if (existante) {
      setResultat({ ok: false, msg: `L'ID ${idOeuvre} existe déjà. Régénérez ou modifiez l'ID.` })
      setImporting(false)
      return
    }

    // 1. Créer l'œuvre
    const { error: errOeuvre } = await supabase.from('oeuvres').insert({
      id_oeuvre: idOeuvre,
      id_auteur: meta.id_auteur,
      titre: meta.titre.trim(),
      sous_titre: meta.sous_titre || null,
      titre_original: meta.titre_original || null,
      trad_auteur: meta.trad_auteur || null,
      trad_date: meta.trad_date || null,
      editeur: meta.editeur || null,
      collection: meta.collection || null,
      ville: meta.ville || null,
      date_publication: meta.date_publication || null,
      url_source: meta.url_source || null,
      genre: meta.genre || null,
      langue: meta.langue || null,
    })
    if (errOeuvre) { setResultat({ ok: false, msg: 'Erreur création œuvre : ' + errOeuvre.message }); setImporting(false); return }

    // 2. Insérer les segments par batch de 500
    const rows = segments.map((s, i) => ({
      id_oeuvre: idOeuvre,
      segment_numero: parseInt(s.segment_numero) || i + 1,
      segment_texte: s.segment_texte ?? '',
      ref_niv1: s.ref_niv1 || null,
      ref_niv2: s.ref_niv2 || null,
      ref_niv3: s.ref_niv3 || null,
      ref_niv4: s.ref_niv4 || null,
      ref_niv5: s.ref_niv5 || null,
      lien_1: s.lien_1 || null,
      lien_2: s.lien_2 || null,
      lien_3: s.lien_3 || null,
      lien_4: s.lien_4 || null,
      fiabilite: s.fiabilite || null,
      nature: (s as any).nature || 'texte',
    }))

    let errSeg = null
    const insertedIds: number[] = []
    for (let i = 0; i < rows.length; i += 500) {
      const { data: inserted, error } = await supabase.from('segments').insert(rows.slice(i, i + 500)).select('id')
      if (error) { errSeg = error; break }
      inserted?.forEach((r: any) => insertedIds.push(r.id))
    }

    if (errSeg) {
      // Rollback : supprimer les segments déjà insérés puis l'œuvre
      if (insertedIds.length > 0) {
        await supabase.from('segments').delete().in('id', insertedIds)
      }
      await supabase.from('oeuvres').delete().eq('id_oeuvre', idOeuvre)
      setResultat({ ok: false, msg: 'Erreur import segments : ' + errSeg.message })
    } else {
      setResultat({ ok: true, msg: `${rows.length} segments importés.`, idOeuvre })
      setEtape('done')
    }
    setImporting(false)
  }

  const reset = () => {
    setEtape('meta')
    setMeta({ id_auteur: '', titre: '', sous_titre: '', titre_original: '', trad_auteur: '', trad_date: '', editeur: '', collection: '', ville: '', date_publication: '', url_source: '', genre: '', langue: '' })
    setSegments([]); setNomFichier(''); setCsvErreur(null); setResultat(null)
    setAjoutAuteur(false); setIdOeuvreGenere('')
  }

  // ── Rendu ──
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* Indicateur d'étapes */}
      <div style={{ display: 'flex', gap: '0', marginBottom: '8px' }}>
        {([['meta', 'Métadonnées'], ['csv', 'Import CSV'], ['preview', 'Prévisualisation']] as const).map(([k, l], i) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ fontSize: '11.5px', fontWeight: etape === k ? 600 : 400, color: etape === k ? '#3d6b4f' : (etape === 'done' || ['csv','preview'].indexOf(etape) > ['csv','preview'].indexOf(k as any)) ? '#3d6b4f' : '#b0a89e', padding: '4px 0' }}>
              {i + 1}. {l}
            </span>
            {i < 2 && <span style={{ margin: '0 10px', color: '#d6d0c4', fontSize: '11px' }}>→</span>}
          </div>
        ))}
      </div>

      {/* ── ÉTAPE 1 : Métadonnées ── */}
      {(etape === 'meta' || etape === 'csv') && (
        <div style={{ background: '#fff', border: '1px solid #e4dfd8', borderRadius: '8px', padding: '20px 24px' }}>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: '15px', fontWeight: 'normal', color: '#2a3d30', margin: '0 0 18px' }}>Informations sur l'œuvre</h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            {/* Auteur */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>AUTEUR</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <select value={meta.id_auteur} onChange={e => setMeta(m => ({ ...m, id_auteur: e.target.value }))}
                  style={{ ...inputStyle, flex: 1 }}>
                  <option value="">— Choisir un auteur —</option>
                  {auteursCourants.map(a => (
                    <option key={a.id_auteur} value={String(a.id_auteur)}>{a.nom}{a.dates ? ` (${a.dates})` : ''}</option>
                  ))}
                </select>
                <button onClick={() => setAjoutAuteur(!ajoutAuteur)}
                  style={{ fontSize: '11.5px', padding: '7px 12px', borderRadius: '5px', border: '1px solid #d6d0c4', background: ajoutAuteur ? '#3d6b4f' : '#fff', color: ajoutAuteur ? '#fff' : '#3d6b4f', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  + Nouvel auteur
                </button>
              </div>
            </div>

            {/* Formulaire nouvel auteur */}
            {ajoutAuteur && (
              <div style={{ gridColumn: '1 / -1', background: '#f7f4ef', border: '1px solid #e4dfd8', borderRadius: '6px', padding: '14px 16px' }}>
                <p style={{ fontSize: '11px', fontWeight: 600, color: '#3d6b4f', marginBottom: '12px' }}>Nouvel auteur</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                  <div><label style={labelStyle}>NOM *</label><input value={nouvelAuteur.nom} onChange={e => setNouvelAuteur(p => ({ ...p, nom: e.target.value }))} style={inputStyle} placeholder="Augustin d'Hippone" /></div>
                  <div><label style={labelStyle}>DATES</label><input value={nouvelAuteur.dates} onChange={e => setNouvelAuteur(p => ({ ...p, dates: e.target.value }))} style={inputStyle} placeholder="354-430" /></div>
                  <div><label style={labelStyle}>SIÈCLE (négatif = av. J.-C.)</label><input type="number" value={nouvelAuteur.siecle} onChange={e => setNouvelAuteur(p => ({ ...p, siecle: e.target.value }))} style={inputStyle} placeholder="4" /></div>
                  <div><label style={labelStyle}>TRADITION</label><input value={nouvelAuteur.tradition} onChange={e => setNouvelAuteur(p => ({ ...p, tradition: e.target.value }))} style={inputStyle} placeholder="Catholique" /></div>
                </div>
                {auteurMsg && <p style={{ fontSize: '11.5px', color: '#c0562a', marginBottom: '8px' }}>{auteurMsg}</p>}
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  <button onClick={() => { setAjoutAuteur(false); setAuteurMsg(null) }} style={{ fontSize: '11.5px', padding: '5px 12px', borderRadius: '4px', border: '1px solid #d6d0c4', background: '#fff', color: '#6b6560', cursor: 'pointer' }}>Annuler</button>
                  <button onClick={creerAuteur} style={{ fontSize: '11.5px', padding: '5px 12px', borderRadius: '4px', border: 'none', background: '#3d6b4f', color: '#fff', cursor: 'pointer', fontWeight: 500 }}>Créer l'auteur</button>
                </div>
              </div>
            )}

            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>TITRE FRANÇAIS *</label>
              <input value={meta.titre} onChange={e => setMeta(m => ({ ...m, titre: e.target.value }))} style={inputStyle} placeholder="Les Confessions" />
            </div>

            {/* ID de l'œuvre */}
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>IDENTIFIANT DE L'ŒUVRE</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  value={idOeuvreGenere}
                  onChange={e => setIdOeuvreGenere(e.target.value)}
                  style={{ ...inputStyle, flex: 1, fontFamily: 'monospace', color: idOeuvreGenere ? '#2a3d30' : '#b0a89e' }}
                  placeholder="Ex. A0011O0003 — cliquez sur Générer"
                  readOnly={false}
                />
                <button
                  onClick={genererIdOeuvre}
                  disabled={generationLoading || !meta.id_auteur}
                  style={{ fontSize: '11.5px', padding: '7px 12px', borderRadius: '5px', border: '1px solid #d6d0c4', background: meta.id_auteur ? '#3d6b4f' : '#e4dfd8', color: meta.id_auteur ? '#fff' : '#9a958d', cursor: meta.id_auteur ? 'pointer' : 'default', whiteSpace: 'nowrap', fontWeight: 500 }}>
                  {generationLoading ? '…' : '⟳ Générer'}
                </button>
              </div>
              {idOeuvreGenere && (
                <p style={{ fontSize: '10px', color: '#9a958d', marginTop: '3px' }}>
                  Vous pouvez modifier manuellement si nécessaire.
                </p>
              )}
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>SOUS-TITRE</label>
              <input value={meta.sous_titre} onChange={e => setMeta(m => ({ ...m, sous_titre: e.target.value }))} style={inputStyle} placeholder="Sous-titre de l'œuvre" />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={labelStyle}>TITRE ORIGINAL (latin, grec…)</label>
              <input value={meta.titre_original} onChange={e => setMeta(m => ({ ...m, titre_original: e.target.value }))} style={inputStyle} placeholder="Titre en langue originale" />
            </div>
            <div>
              <label style={labelStyle}>TRADUCTEUR</label>
              <input value={meta.trad_auteur} onChange={e => setMeta(m => ({ ...m, trad_auteur: e.target.value }))} style={inputStyle} placeholder="Michel Moreau" />
            </div>
            <div>
              <label style={labelStyle}>ÉDITEUR</label>
              <input value={meta.editeur} onChange={e => setMeta(m => ({ ...m, editeur: e.target.value }))} style={inputStyle} placeholder="Nom de l'éditeur" />
            </div>
            <div>
              <label style={labelStyle}>COLLECTION</label>
              <input value={meta.collection} onChange={e => setMeta(m => ({ ...m, collection: e.target.value }))} style={inputStyle} placeholder="Nom de la collection" />
            </div>
            <div>
              <label style={labelStyle}>VILLE</label>
              <input value={meta.ville} onChange={e => setMeta(m => ({ ...m, ville: e.target.value }))} style={inputStyle} placeholder="Ville d'édition" />
            </div>
            <div>
              <label style={labelStyle}>DATE DE PUBLICATION</label>
              <input value={meta.date_publication} onChange={e => setMeta(m => ({ ...m, date_publication: e.target.value }))} style={inputStyle} placeholder="Année de publication" />
            </div>
            <div>
              <label style={labelStyle}>URL SOURCE</label>
              <input value={meta.url_source} onChange={e => setMeta(m => ({ ...m, url_source: e.target.value }))} style={inputStyle} placeholder="Lien vers la source numérique" />
            </div>
            <div>
              <label style={labelStyle}>GENRE</label>
              <select value={meta.genre} onChange={e => setMeta(m => ({ ...m, genre: e.target.value }))} style={inputStyle}>
                <>
                  <option value="">— Choisir —</option>
                  <option value="Homélie">Homélie</option>
                  <option value="Commentaire biblique">Commentaire biblique</option>
                  <option value="Traité théologique">Traité théologique</option>
                  <option value="Apologétique">Apologétique</option>
                  <option value="Controverse doctrinale">Controverse doctrinale</option>
                  <option value="Catéchèse">Catéchèse</option>
                  <option value="Texte mystagogique">Texte mystagogique</option>
                  <option value="Règle monastique">Règle monastique</option>
                  <option value="Sentence spirituelle">Sentence spirituelle</option>
                  <option value="Lettre">Lettre</option>
                  <option value="Sermon">Sermon</option>
                  <option value="Vie de saint">Vie de saint</option>
                  <option value="Récit de martyre">Récit de martyre</option>
                  <option value="Confession">Confession</option>
                  <option value="Prière">Prière</option>
                  <option value="Hymne">Hymne</option>
                  <option value="Poème">Poème</option>
                  <option value="Florilège">Florilège</option>
                </>
              </select>
            </div>
            <div>
              <label style={labelStyle}>LANGUE ORIGINALE</label>
              <select value={meta.langue} onChange={e => setMeta(m => ({ ...m, langue: e.target.value }))} style={inputStyle}>
                <>
                  <option value="">— Choisir —</option>
                  <option value="Latin">Latin</option>
                  <option value="Grec">Grec</option>
                  <option disabled style={{ color: '#d6d0c4' }}>──────────</option>
                  <option value="Syriaque">Syriaque</option>
                  <option value="Copte">Copte</option>
                  <option value="Arménien">Arménien</option>
                  <option value="Géorgien">Géorgien</option>
                  <option value="Arabe chrétien">Arabe chrétien</option>
                  <option value="Guèze">Guèze</option>
                </>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={() => { if (!meta.id_auteur || !meta.titre.trim()) { alert('Titre et auteur sont requis.'); return } setEtape('csv') }}
              style={{ fontSize: '12px', padding: '7px 18px', borderRadius: '5px', border: 'none', background: '#3d6b4f', color: '#fff', cursor: 'pointer', fontWeight: 500 }}>
              Suivant : import CSV →
            </button>
          </div>
        </div>
      )}

      {/* ── ÉTAPE 2 : Import CSV ── */}
      {(etape === 'csv' || etape === 'preview') && (
        <div style={{ background: '#fff', border: '1px solid #e4dfd8', borderRadius: '8px', padding: '20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '16px' }}>
            <h2 style={{ fontFamily: "Georgia, serif", fontSize: '15px', fontWeight: 'normal', color: '#2a3d30', margin: 0 }}>Import des segments</h2>
            <button onClick={() => telechargerCSVModele(meta.titre.slice(0,20).replace(/\s/g,'_'))}
              style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '4px', border: '1px solid #d6d0c4', background: '#fff', color: '#6b6560', cursor: 'pointer' }}>
              ↓ Télécharger le CSV modèle
            </button>
          </div>

          {/* Colonnes attendues */}
          <div style={{ background: '#f7f4ef', borderRadius: '5px', padding: '10px 14px', marginBottom: '14px' }}>
            <p style={{ fontSize: '10.5px', fontWeight: 600, color: '#6b6560', marginBottom: '5px' }}>COLONNES ATTENDUES</p>
            <p style={{ fontSize: '11px', color: '#9a958d', fontFamily: 'monospace', lineHeight: 1.7, margin: 0 }}>
              segment_numero, segment_texte, ref_niv1, ref_niv2, ref_niv3, ref_niv4, ref_niv5,<br/>
              lien_1, lien_2, lien_3, lien_4, fiabilite
            </p>
          </div>

          {/* Zone drop / sélection */}
          <div
            onClick={() => inputCsvRef.current?.click()}
            style={{ border: '2px dashed #d6d0c4', borderRadius: '8px', padding: '28px', textAlign: 'center', cursor: 'pointer', background: '#faf8f4', transition: 'border-color 0.15s' }}
            onDragOver={e => { e.preventDefault(); (e.currentTarget as HTMLElement).style.borderColor = '#3d6b4f' }}
            onDragLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#d6d0c4' }}
            onDrop={e => { e.preventDefault(); (e.currentTarget as HTMLElement).style.borderColor = '#d6d0c4'; const f = e.dataTransfer.files[0]; if (f) lireFichier(f) }}
          >
            <p style={{ fontSize: '13px', color: '#9a958d', margin: '0 0 6px' }}>
              {nomFichier ? `✓ ${nomFichier} — ${segments.length} segments` : 'Glissez un fichier CSV ou cliquez pour sélectionner'}
            </p>
            <p style={{ fontSize: '11px', color: '#b0a89e', margin: 0 }}>Format .csv, encodage UTF-8</p>
          </div>
          <input ref={inputCsvRef} type="file" accept=".csv" style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) lireFichier(f) }} />

          {csvErreur && <p style={{ fontSize: '12px', color: '#c0562a', marginTop: '10px' }}>⚠ {csvErreur}</p>}

          {segments.length > 0 && etape === 'csv' && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '14px', gap: '8px' }}>
              <button onClick={() => setEtape('meta')} style={{ fontSize: '12px', padding: '7px 14px', borderRadius: '5px', border: '1px solid #d6d0c4', background: '#fff', color: '#6b6560', cursor: 'pointer' }}>← Retour</button>
              <button onClick={() => setEtape('preview')} style={{ fontSize: '12px', padding: '7px 18px', borderRadius: '5px', border: 'none', background: '#3d6b4f', color: '#fff', cursor: 'pointer', fontWeight: 500 }}>Prévisualiser →</button>
            </div>
          )}
        </div>
      )}

      {/* ── ÉTAPE 3 : Prévisualisation + confirmation ── */}
      {etape === 'preview' && segments.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #e4dfd8', borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #e4dfd8', background: '#f7f4ef' }}>
            <p style={{ fontSize: '12px', color: '#2a3d30', fontWeight: 500, margin: '0 0 4px' }}>
              {auteursCourants.find(a => String(a.id_auteur) === meta.id_auteur)?.nom} — {meta.titre}
            </p>
            <p style={{ fontSize: '11.5px', color: '#9a958d', margin: 0 }}>
              {segments.length} segments · {meta.trad_auteur ? `trad. ${meta.trad_auteur}` : 'traducteur non renseigné'}
            </p>
          </div>

          {/* Aperçu 10 premiers segments */}
          <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px' }}>
              <thead>
                <tr style={{ background: '#f7f4ef', position: 'sticky', top: 0 }}>
                  <th style={{ padding: '7px 12px', textAlign: 'left', color: '#6b6560', fontWeight: 500, borderBottom: '1px solid #e4dfd8', width: '50px' }}>§</th>
                  <th style={{ padding: '7px 12px', textAlign: 'left', color: '#6b6560', fontWeight: 500, borderBottom: '1px solid #e4dfd8', width: '120px' }}>Réf.</th>
                  <th style={{ padding: '7px 12px', textAlign: 'left', color: '#6b6560', fontWeight: 500, borderBottom: '1px solid #e4dfd8' }}>Texte (début)</th>
                </tr>
              </thead>
              <tbody>
                {segments.slice(0, 10).map((s, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#faf8f4', borderBottom: '1px solid #f0ece6' }}>
                    <td style={{ padding: '6px 12px', color: '#3d6b4f', fontWeight: 500 }}>{s.segment_numero}</td>
                    <td style={{ padding: '6px 12px', color: '#9a958d' }}>{[s.ref_niv1, s.ref_niv2].filter(Boolean).join(', ')}</td>
                    <td style={{ padding: '6px 12px', color: '#2a2520' }}>{(s.segment_texte || '').slice(0, 80)}{s.segment_texte?.length > 80 ? '…' : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {segments.length > 10 && (
              <p style={{ padding: '8px 12px', fontSize: '11px', color: '#9a958d', fontStyle: 'italic' }}>… et {segments.length - 10} autres segments</p>
            )}
          </div>

          <div style={{ padding: '14px 20px', borderTop: '1px solid #e4dfd8', display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
            <button onClick={() => setEtape('csv')} disabled={importing} style={{ fontSize: '12px', padding: '7px 14px', borderRadius: '5px', border: '1px solid #d6d0c4', background: '#fff', color: '#6b6560', cursor: 'pointer' }}>← Retour</button>
            <button onClick={confirmerImport} disabled={importing}
              style={{ fontSize: '12px', padding: '7px 20px', borderRadius: '5px', border: 'none', background: importing ? '#8aaa96' : '#3d6b4f', color: '#fff', cursor: importing ? 'default' : 'pointer', fontWeight: 500 }}>
              {importing ? 'Import en cours…' : `Confirmer l'import (${segments.length} segments)`}
            </button>
          </div>
        </div>
      )}

      {/* Erreur import */}
      {resultat && !resultat.ok && (
        <div style={{ background: '#fdf2ee', border: '1px solid #e4c4b8', borderRadius: '6px', padding: '12px 16px' }}>
          <p style={{ fontSize: '12.5px', color: '#c0562a', margin: 0 }}>✗ {resultat.msg}</p>
        </div>
      )}

      {/* ── ÉTAPE 4 : Succès ── */}
      {etape === 'done' && resultat?.ok && (
        <div style={{ background: '#fff', border: '2px solid #3d6b4f', borderRadius: '8px', padding: '28px 24px', textAlign: 'center' }}>
          <p style={{ fontSize: '22px', marginBottom: '10px' }}>✓</p>
          <p style={{ fontFamily: "Georgia, serif", fontSize: '16px', color: '#2a3d30', marginBottom: '8px' }}>{meta.titre}</p>
          <p style={{ fontSize: '12.5px', color: '#5a6b5e', marginBottom: '20px' }}>{resultat.msg}</p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            {resultat.idOeuvre && (
              <a href={`/oeuvre/${resultat.idOeuvre}`} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: '12.5px', padding: '7px 16px', borderRadius: '5px', border: '1px solid #d6d0c4', color: '#2a3d30', textDecoration: 'none' }}>
                Lire l'œuvre ↗
              </a>
            )}
            <button onClick={reset}
              style={{ fontSize: '12.5px', padding: '7px 16px', borderRadius: '5px', border: 'none', background: '#3d6b4f', color: '#fff', cursor: 'pointer', fontWeight: 500 }}>
              Ajouter une autre œuvre
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
// ── Conversion référence biblique → format français ───────────────────────────