'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import { rendreEssai, compterCaracteres, lettreDepuisIndex, type ElementPanneau } from '@/app/lib/texteEnrichiEssai'
import { syntaxeVersHtml, htmlVersSyntaxe } from '@/app/lib/serialisationEssai'
import { diffMots } from '@/app/lib/diffTexte'
import VoletEssai from '@/app/lib/VoletEssai'
import SelecteurCitation from '@/app/lib/SelecteurCitation'
import EtapeMetadonnees, { type Metadonnees } from './EtapeMetadonnees'

const MAX_CARACTERES = 8000
const BTN: React.CSSProperties = { fontSize: '10.5px', padding: '8px 6px', borderRadius: '5px', border: '1px solid #d6d0c4', background: '#fff', color: '#2a2520', cursor: 'pointer', width: '100%', textAlign: 'center' }

type Props = { essaiExistant?: { id: number; titre: string; sous_titre: string | null; resume: string | null; categories: string[]; contenu: string; statut: string; afficher_nom_reel?: boolean; publie_at?: string | null }; modeAdmin?: boolean }

export default function EditeurEssai({ essaiExistant, modeAdmin }: Props) {
  const router = useRouter()
  const [etape, setEtape] = useState<'metadonnees' | 'redaction'>(essaiExistant ? 'redaction' : 'metadonnees')
  const [meta, setMeta] = useState<Metadonnees>({
    titre: essaiExistant?.titre ?? '', sousTitre: essaiExistant?.sous_titre ?? '',
    resume: essaiExistant?.resume ?? '', categories: essaiExistant?.categories ?? [],
  })
  const [userId, setUserId] = useState<string | null>(null)
  const [profil, setProfil] = useState<{ pseudo: string | null; nom: string | null; prenom: string | null } | null>(null)
  const [afficherNomReel, setAfficherNomReel] = useState(essaiExistant?.afficher_nom_reel ?? false)
  const [id, setId] = useState<number | null>(essaiExistant?.id ?? null)
  const idRef = useRef<number | null>(id)
  idRef.current = id

  const [contenuTexte, setContenuTexte] = useState(essaiExistant?.contenu ?? '')
  const [panneau, setPanneau] = useState<ElementPanneau | null>(null)
  const [editionNote, setEditionNote] = useState<{ mode: 'creation' | 'modification' } | null>(null)
  const [selecteurOuvert, setSelecteurOuvert] = useState(false)
  const [statutEnr, setStatutEnr] = useState<'idle' | 'enregistrement' | 'enregistre' | 'erreur'>('idle')
  const [blocActif, setBlocActif] = useState<'h2' | 'h3' | 'blockquote' | 'p' | null>(null)
  const [comparaisonOuverte, setComparaisonOuverte] = useState(false)
  const contenuOriginalRef = useRef(essaiExistant?.contenu ?? '')

  const editableRef = useRef<HTMLDivElement>(null)
  const savedRange = useRef<Range | null>(null)
  const noteCibleRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user.id ?? null))
  }, [])

  useEffect(() => {
    if (!userId) return
    supabase.from('profils').select('pseudo, nom, prenom').eq('id', userId).maybeSingle().then(({ data }) => setProfil(data))
  }, [userId])

  const nomAffiche = (afficherNomReel && profil?.nom) ? `${profil.prenom ?? ''} ${profil.nom}`.trim() : (profil?.pseudo ?? 'Anonyme')

  // ── Création de l'essai (brouillon) dès la validation des métadonnées ─────
  const validerMetadonnees = async (m: Metadonnees) => {
    setMeta(m)
    if (!idRef.current && userId) {
      const { data } = await supabase.from('essais').insert({
        user_id: userId, titre: m.titre, sous_titre: m.sousTitre || null,
        resume: m.resume, categories: m.categories, contenu: '', statut: 'brouillon',
      }).select('id').single()
      if (data) { setId(data.id); idRef.current = data.id }
    }
    setEtape('redaction')
  }

  // ── Sauvegarde automatique ────────────────────────────────────────────────
  const sauvegarder = useCallback(async (statutForce?: 'brouillon' | 'en_attente') => {
    if (!userId || !idRef.current) return
    setStatutEnr('enregistrement')
    const payload: any = {
      titre: meta.titre, sous_titre: meta.sousTitre || null, resume: meta.resume,
      categories: meta.categories, contenu: contenuTexte, afficher_nom_reel: afficherNomReel,
      updated_at: new Date().toISOString(),
    }
    if (statutForce) payload.statut = statutForce
    else if (!modeAdmin && essaiExistant?.publie_at && contenuTexte !== contenuOriginalRef.current) payload.statut = 'en_attente'
    const { error } = await supabase.from('essais').update(payload).eq('id', idRef.current)
    setStatutEnr(error ? 'erreur' : 'enregistre')
    setTimeout(() => setStatutEnr('idle'), 1500)
  }, [userId, meta, contenuTexte, afficherNomReel])

  useEffect(() => {
    if (etape !== 'redaction' || !contenuTexte.trim()) return
    const t = setTimeout(() => sauvegarder(), 2500)
    return () => clearTimeout(t)
  }, [contenuTexte, etape, sauvegarder])

  // ── Charger le contenu initial dans la zone éditable ──────────────────────
  useEffect(() => {
    if (etape === 'redaction' && editableRef.current && !editableRef.current.dataset.charge) {
      editableRef.current.innerHTML = syntaxeVersHtml(contenuTexte)
      editableRef.current.dataset.charge = '1'
      renumeroterNotes()
    }
  }, [etape, contenuTexte])

  // ── Sélection : on la mémorise pour pouvoir cliquer sur la barre d'outils ─
  const memoriserSelection = () => {
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0 && editableRef.current?.contains(sel.anchorNode)) {
      savedRange.current = sel.getRangeAt(0).cloneRange()
    }
  }
  const restaurerSelection = () => {
    const sel = window.getSelection()
    // Si le focus n'a jamais quitté la zone (le mousedown des boutons est
    // toujours intercepté), la sélection en cours est déjà la bonne — la
    // retoucher avec une Range mémorisée plus tôt risquait de la faire sauter
    // ailleurs si le DOM avait changé depuis (ex. un précédent formatBlock).
    if (sel && sel.rangeCount > 0 && editableRef.current?.contains(sel.anchorNode)) return
    editableRef.current?.focus()
    if (sel && savedRange.current) { sel.removeAllRanges(); sel.addRange(savedRange.current) }
  }

  // Préserve la position du curseur à travers une opération qui modifie le
  // DOM (formatBlock change la balise du bloc entier et peut sinon déplacer
  // le curseur vers le bloc suivant).
  const conserverPosition = (operation: () => void) => {
    restaurerSelection()
    const sel = window.getSelection()
    let marqueur: HTMLElement | null = null
    if (sel && sel.rangeCount > 0 && editableRef.current?.contains(sel.anchorNode)) {
      const range = sel.getRangeAt(0).cloneRange()
      range.collapse(true)
      marqueur = document.createElement('span')
      marqueur.setAttribute('data-marqueur-curseur', '1')
      range.insertNode(marqueur)
    }
    operation()
    if (marqueur && marqueur.parentNode) {
      const r = document.createRange()
      r.setStartAfter(marqueur)
      r.collapse(true)
      const s = window.getSelection()
      s?.removeAllRanges(); s?.addRange(r)
      marqueur.remove()
    } else {
      editableRef.current?.focus()
    }
  }

  const renumeroterNotes = () => {
    if (!editableRef.current) return
    const puces = Array.from(editableRef.current.querySelectorAll<HTMLElement>('[data-chip="note"]'))
    puces.forEach((el, idx) => { el.textContent = lettreDepuisIndex(idx + 1) })
  }

  const declencherChangement = () => {
    if (!editableRef.current) return
    renumeroterNotes()
    setContenuTexte(htmlVersSyntaxe(editableRef.current.innerHTML))
  }

  // ── Commandes de mise en forme ────────────────────────────────────────────
  const commande = (cmd: string, valeur?: string) => {
    restaurerSelection()
    document.execCommand(cmd, false, valeur)
    declencherChangement()
  }

  const appliquerPetitesCaps = () => {
    restaurerSelection()
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0 || sel.getRangeAt(0).collapsed) return
    const range = sel.getRangeAt(0)
    const span = document.createElement('span')
    span.style.fontVariant = 'small-caps'
    span.style.letterSpacing = '0.02em'
    span.appendChild(range.extractContents())
    range.insertNode(span)
    declencherChangement()
  }

  const insererHTML = (html: string) => {
    restaurerSelection()
    document.execCommand('insertHTML', false, html)
    declencherChangement()
  }

  const ajouterNote = () => {
    const texte = window.prompt('Texte de la note :\nVous pouvez y écrire un renvoi sous la forme [libellé](verset:ID) ou [libellé](segment:ID).')
    if (!texte) return
    insererHTML(`<span contenteditable="false" data-chip="note" data-note="${encodeURIComponent(texte)}" style="display:inline-block;color:#3d6b4f;font-weight:600;font-size:0.78em;vertical-align:super;cursor:pointer;background:transparent;padding:0;border:0;border-radius:0;">note</span>&nbsp;`)
  }

  const ouvrirCreationNote = () => {
    memoriserSelection()
    noteCibleRef.current = null
    setEditionNote({ mode: 'creation' })
    setPanneau({ type: 'note', texte: '' })
  }

  const enregistrerNoteDepuisVolet = (texte: string) => {
    if (!texte.trim()) return
    if (editionNote?.mode === 'modification' && noteCibleRef.current) {
      noteCibleRef.current.dataset.note = encodeURIComponent(texte)
      setPanneau({ type: 'note', texte })
      declencherChangement()
      return
    }
    insererHTML(`<span contenteditable="false" data-chip="note" data-note="${encodeURIComponent(texte)}" style="display:inline-block;margin-left:0.08em;color:#3d6b4f;font-weight:600;font-size:0.78em;vertical-align:super;cursor:pointer;background:transparent;padding:0;border:0;border-radius:0;">note</span>&nbsp;`)
    const notes = editableRef.current?.querySelectorAll<HTMLElement>('[data-chip="note"]')
    noteCibleRef.current = notes && notes.length > 0 ? notes[notes.length - 1] : null
    setPanneau({ type: 'note', texte })
    setEditionNote({ mode: 'modification' })
  }

  const inserrerCitation = (c: { label: string; type: 'verset' | 'segment'; id: string }) => {
    insererHTML(`<span contenteditable="false" data-chip="${c.type}" data-id="${c.id}" data-label="${c.label}" style="display:inline-block;color:#3d6b4f;text-decoration:underline;background:rgba(61,107,79,0.07);padding:1px 5px;border-radius:3px;cursor:pointer;">${c.label}</span>&nbsp;`)
    setSelecteurOuvert(false)
  }

  function blocCourant(): HTMLElement | null {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0) return null
    let node: Node | null = sel.getRangeAt(0).startContainer
    while (node && node.nodeType !== Node.ELEMENT_NODE) node = node.parentNode
    let el = node as HTMLElement
    while (el && el !== editableRef.current && !['P', 'H2', 'H3', 'BLOCKQUOTE'].includes(el.tagName)) el = el.parentElement as HTMLElement
    return el && el !== editableRef.current ? el : null
  }

  const detecterBloc = () => {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0 || !editableRef.current?.contains(sel.anchorNode)) return
    const bloc = blocCourant()
    const map: Record<string, typeof blocActif> = { H2: 'h2', H3: 'h3', BLOCKQUOTE: 'blockquote', P: 'p' }
    setBlocActif(bloc ? (map[bloc.tagName] ?? null) : null)
  }

  useEffect(() => {
    document.addEventListener('selectionchange', detecterBloc)
    return () => document.removeEventListener('selectionchange', detecterBloc)
  }, [])

  const appliquerBloc = (tag: 'H2' | 'H3' | 'BLOCKQUOTE') => {
    const cible = tag === 'H2' ? 'h2' : tag === 'H3' ? 'h3' : 'blockquote'
    conserverPosition(() => {
      if (blocActif === cible) document.execCommand('formatBlock', false, 'P')
      else document.execCommand('formatBlock', false, tag)
    })
    setBlocActif(blocActif === cible ? 'p' : cible)
    declencherChangement()
  }

  const appliquerParagraphe = () => {
    conserverPosition(() => { document.execCommand('formatBlock', false, 'P') })
    setBlocActif('p')
    declencherChangement()
  }


  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'b') { e.preventDefault(); document.execCommand('bold'); declencherChangement() }
      else if (e.key === 'i') { e.preventDefault(); document.execCommand('italic'); declencherChangement() }
    }
  }

  // Le collage ne doit jamais importer de mise en forme extérieure (polices,
  // couleurs, tailles…) — on ne conserve que le texte brut.
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault()
    const texte = e.clipboardData.getData('text/plain')
    document.execCommand('insertText', false, texte)
    declencherChangement()
  }

  const insererEspaceInsecable = () => {
    restaurerSelection()
    document.execCommand('insertText', false, '\u00A0')
    declencherChangement()
  }

  const handleClickEditable = (e: React.MouseEvent<HTMLDivElement>) => {
    const cible = (e.target as HTMLElement).closest('[data-chip]') as HTMLElement | null
    if (!cible) return
    const chip = cible.dataset.chip
    if (chip === 'note') {
      const texteActuelVolet = decodeURIComponent(cible.dataset.note ?? '')
      noteCibleRef.current = cible
      setEditionNote({ mode: 'modification' })
      setPanneau({ type: 'note', texte: texteActuelVolet })
      return
      const texteActuel = decodeURIComponent(cible!.dataset.note ?? '')
      const nouveau = window.prompt('Modifier la note :\nVous pouvez y écrire un renvoi sous la forme [libellé](verset:ID) ou [libellé](segment:ID).', texteActuel)
      if (nouveau === null) return
      cible!.dataset.note = encodeURIComponent(nouveau ?? '')
      setPanneau({ type: 'note', texte: nouveau ?? '' })
      declencherChangement()
    }
    else if (chip === 'verset') setPanneau({ type: 'verset', id: cible.dataset.id!, label: cible.dataset.label! })
    else if (chip === 'segment') setPanneau({ type: 'segment', id: cible.dataset.id!, label: cible.dataset.label! })
  }

  const nbCar = compterCaracteres(contenuTexte)

  const publier = async () => {
    if (modeAdmin && essaiExistant?.statut === 'publie') {
      await sauvegarder()
      router.push(`/essais/${idRef.current}`)
      return
    }
    await sauvegarder('en_attente')
    if (idRef.current) router.push(`/essais/${idRef.current}`)
  }

  if (etape === 'metadonnees') {
    return <EtapeMetadonnees valeursInitiales={meta} onValider={validerMetadonnees} />
  }

  const diff = comparaisonOuverte ? diffMots(contenuOriginalRef.current, contenuTexte) : null

  return (
    <main style={{ background: '#f7f4ef', minHeight: 'calc(100vh - 48px)', paddingRight: '320px' }}>
      <style>{`
        .editeur-essai h2,
        .editeur-essai h3,
        .editeur-essai p,
        .editeur-essai blockquote { margin: 0; font-family: 'Helvetica Neue', Arial, sans-serif; }
        .editeur-essai h2 { font-weight: 700; font-size: 1.07em; color: #1e2e24; }
        .editeur-essai h3 { font-style: italic; font-weight: 400; font-size: 1em; color: #2a3d30; }
        .editeur-essai blockquote { font-style: normal; font-size: 0.93em; color: #3a3530; margin-left: 8mm; }
        .editeur-essai p,
        .editeur-essai blockquote { line-height: 1.5; word-spacing: -0.09em; letter-spacing: -0.006em; }
        .editeur-essai h2 + h3,
        .editeur-essai h2 + h2 { margin-top: 3mm; }
        .editeur-essai h2 + p,
        .editeur-essai h2 + blockquote { margin-top: 2mm; }
        .editeur-essai p + h2,
        .editeur-essai blockquote + h2 { margin-top: 5mm; }
        .editeur-essai h3 + h2 { margin-top: 5mm; }
        .editeur-essai h3 + p,
        .editeur-essai h3 + blockquote,
        .editeur-essai h3 + h3,
        .editeur-essai p + p,
        .editeur-essai blockquote + p,
        .editeur-essai p + blockquote,
        .editeur-essai blockquote + blockquote { margin-top: 1mm; }
        .editeur-essai p + h3,
        .editeur-essai blockquote + h3 { margin-top: 3mm; }
      `}</style>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '32px 32px 100px' }}>

        {essaiExistant && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
            <button onClick={() => setComparaisonOuverte(v => !v)} style={{ fontSize: '11px', color: comparaisonOuverte ? '#fff' : '#3d6b4f', background: comparaisonOuverte ? '#3d6b4f' : 'none', border: comparaisonOuverte ? 'none' : '1px solid #3d6b4f', borderRadius: '4px', padding: '4px 10px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {comparaisonOuverte ? 'Revenir à la rédaction' : 'Comparer avec la version d\u2019origine'}
            </button>
          </div>
        )}

        {comparaisonOuverte && diff ? (
          <div style={{ display: 'flex', gap: '20px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', color: '#9a958d', marginBottom: '8px' }}>VERSION D'ORIGINE</p>
              <div style={{ background: '#fff', border: '1px solid #e4dfd8', borderRadius: '6px', padding: '20px 22px', fontSize: '13.5px', lineHeight: 1.7, color: '#1e1a16', whiteSpace: 'pre-wrap' }}>
                {diff.gauche.map((s, i) => s.type === 'supprime'
                  ? <span key={i} style={{ color: '#c0392b', textDecoration: 'line-through' }}>{s.texte}</span>
                  : <span key={i}>{s.texte}</span>)}
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', color: '#9a958d', marginBottom: '8px' }}>VERSION MODIFIÉE</p>
              <div style={{ background: '#fff', border: '1px solid #e4dfd8', borderRadius: '6px', padding: '20px 22px', fontSize: '13.5px', lineHeight: 1.7, color: '#1e1a16', whiteSpace: 'pre-wrap' }}>
                {diff.droite.map((s, i) => s.type === 'ajoute'
                  ? <span key={i} style={{ color: '#c0392b', fontWeight: 600 }}>{s.texte}</span>
                  : <span key={i}>{s.texte}</span>)}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', color: nbCar > MAX_CARACTERES ? '#c0562a' : '#9a958d', fontWeight: nbCar > MAX_CARACTERES ? 600 : 400 }}>
                {nbCar.toLocaleString('fr')} / {MAX_CARACTERES.toLocaleString('fr')}
              </span>
            </div>

            {/* Barre d'outils et zone de rédaction */}
            <div style={{ display: 'flex', gap: '20px', paddingLeft: '128px' }}>
              <div style={{
                position: 'fixed', top: '48px', left: 0, width: '128px', height: 'calc(100vh - 48px)',
                background: '#faf8f4', borderRight: '1px solid #d6d0c4', padding: '20px 14px', overflowY: 'auto',
                zIndex: 50, display: 'flex', flexDirection: 'column', gap: '5px',
              }}>
                <button onMouseDown={e => e.preventDefault()} onClick={() => commande('bold')} style={{ ...BTN, fontWeight: 700 }} title="Gras (Ctrl+B)">Gras</button>
                <button onMouseDown={e => e.preventDefault()} onClick={() => commande('italic')} style={{ ...BTN, fontStyle: 'italic' }} title="Italique (Ctrl+I)">Italique</button>
                <button onMouseDown={e => e.preventDefault()} onClick={appliquerPetitesCaps} style={{ ...BTN, fontVariant: 'small-caps' }}>Petites caps</button>
                <button onMouseDown={e => e.preventDefault()} onClick={insererEspaceInsecable} style={BTN}>Espace insécable</button>
                <div style={{ height: '1px', background: '#e4dfd8', margin: '4px 0' }} />
                <button onMouseDown={e => e.preventDefault()} onClick={() => appliquerBloc('H2')} style={{ ...BTN, background: blocActif === 'h2' ? '#3d6b4f' : '#fff', color: blocActif === 'h2' ? '#fff' : '#2a2520' }}>Titre 1</button>
                <button onMouseDown={e => e.preventDefault()} onClick={() => appliquerBloc('H3')} style={{ ...BTN, background: blocActif === 'h3' ? '#3d6b4f' : '#fff', color: blocActif === 'h3' ? '#fff' : '#2a2520' }}>Titre 2</button>
                <button onMouseDown={e => e.preventDefault()} onClick={() => appliquerBloc('BLOCKQUOTE')} style={{ ...BTN, background: blocActif === 'blockquote' ? '#3d6b4f' : '#fff', color: blocActif === 'blockquote' ? '#fff' : '#2a2520' }}>Citation</button>
                <button onMouseDown={e => e.preventDefault()} onClick={appliquerParagraphe} style={{ ...BTN, background: blocActif === 'p' ? '#3d6b4f' : '#fff', color: blocActif === 'p' ? '#fff' : '#2a2520' }}>Paragraphe</button>
                <div style={{ height: '1px', background: '#e4dfd8', margin: '4px 0' }} />
                <button onMouseDown={e => e.preventDefault()} onClick={ouvrirCreationNote} style={BTN}>+ Note</button>
                <button onMouseDown={e => { e.preventDefault(); memoriserSelection() }} onClick={() => setSelecteurOuvert(true)} style={BTN}>Citer depuis le site</button>
              </div>

              {/* Zone principale — en-tête fixe et zone éditable dans la même carte */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ border: '1px solid #e4dfd8', borderRadius: '6px', background: '#fff', overflow: 'hidden' }}>
                  {/* En-tête non modifiable — auteur, titre, sous-titre, catégories */}
                  <div style={{ textAlign: 'center', padding: '26px 24px 20px', borderBottom: '1px solid #ede9e2' }}>
                    <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#3d6b4f', margin: '0 0 12px', fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>
                      {nomAffiche}
                    </p>
                    <h1 style={{ fontFamily: "Georgia, serif", fontSize: '24px', fontWeight: 'normal', color: '#1e2e24', margin: '0 0 6px' }}>{meta.titre}</h1>
                    {meta.sousTitre && <p style={{ fontSize: '14px', color: '#8a8278', fontStyle: 'italic', margin: '0 0 12px', fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>{meta.sousTitre}</p>}
                    <div style={{ display: 'flex', gap: '5px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '8px' }}>
                      {meta.categories.map(c => (
                        <span key={c} style={{ fontSize: '9.5px', color: '#3d6b4f', background: 'rgba(61,107,79,0.08)', padding: '1px 8px', borderRadius: '9px', fontWeight: 600, fontFamily: "'Helvetica Neue', Arial, sans-serif" }}>{c}</span>
                      ))}
                    </div>
                  </div>

                  {/* La mise en forme s'affiche directement ici — pas de bascule édition/aperçu */}
                  <div
                    ref={editableRef}
                    className="editeur-essai"
                    contentEditable
                    suppressContentEditableWarning
                    onInput={declencherChangement}
                    onKeyDown={handleKeyDown}
                    onPaste={handlePaste}
                    onMouseUp={() => { memoriserSelection(); detecterBloc() }}
                    onKeyUp={() => { memoriserSelection(); detecterBloc() }}
                    onFocus={detecterBloc}
                    onClick={handleClickEditable}
                    style={{
                      minHeight: '420px', fontSize: '15px', lineHeight: 1.5, padding: '24px 30px',
                      background: '#fff', color: '#1e1a16',
                      outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px' }}>
                  <span style={{ fontSize: '11px', color: statutEnr === 'erreur' ? '#c0562a' : '#9a958d' }}>
                    {statutEnr === 'enregistrement' ? 'Enregistrement…' : statutEnr === 'enregistre' ? 'Brouillon enregistré ✓' : statutEnr === 'erreur' ? 'Erreur d\u2019enregistrement' : '\u00a0'}
                  </span>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    {!(modeAdmin && essaiExistant?.statut === 'publie') && (
                      <button onClick={() => sauvegarder('brouillon')} style={{ fontSize: '12.5px', padding: '8px 18px', borderRadius: '5px', border: '1px solid #d6d0c4', background: '#fff', color: '#3a3530', cursor: 'pointer' }}>
                        Enregistrer le brouillon
                      </button>
                    )}
                    <button onClick={publier} style={{ fontSize: '12.5px', padding: '8px 20px', borderRadius: '5px', border: 'none', background: '#3d6b4f', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
                      {modeAdmin && essaiExistant?.statut === 'publie' ? 'Enregistrer les corrections' : 'Publier (soumettre à validation)'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {selecteurOuvert && <SelecteurCitation onChoisir={inserrerCitation} onFermer={() => setSelecteurOuvert(false)} />}
      <VoletEssai element={panneau} onFermer={() => setPanneau(null)} toujoursVisible editionNote={editionNote ? { actif: true, mode: editionNote.mode } : undefined} onEnregistrerNote={enregistrerNoteDepuisVolet} enTete={
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button onClick={() => setEtape('metadonnees')} style={{ fontSize: '11px', color: '#3d6b4f', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0 }}>
            Modifier titre / résumé / catégories
          </button>
          {profil?.nom && (
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '10.5px', color: '#8a8278', cursor: 'pointer', lineHeight: 1.4 }}>
              <input type="checkbox" checked={afficherNomReel} onChange={e => setAfficherNomReel(e.target.checked)} style={{ marginTop: '2px' }} />
              Publier sous mon nom réel ({profil.prenom ? `${profil.prenom} ` : ''}{profil.nom}) plutôt que mon pseudonyme
            </label>
          )}
        </div>
      } />
    </main>
  )
}
