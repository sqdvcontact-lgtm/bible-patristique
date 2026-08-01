'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useEstMobile } from '@/app/lib/useEstMobile'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import { rendreEssai, compterCaracteres, lettreDepuisIndex, type ElementPanneau } from '@/app/lib/texteEnrichiEssai'
import { rendreTexteEnrichi } from '@/app/oeuvre/[id]/texteEnrichi'
import { syntaxeVersHtml, htmlVersSyntaxe, styleNote } from '@/app/lib/serialisationEssai'
import { diffMots } from '@/app/lib/diffTexte'
import VoletEssai from '@/app/lib/VoletEssai'
import SelecteurCitation from '@/app/lib/SelecteurCitation'
import { CATEGORIES_ESSAIS, CONDITIONS, RESUME_MAX, RESUME_MIN, type Metadonnees } from './EtapeMetadonnees'

const MAX_CARACTERES = 8000
const MIN_CARACTERES_PUBLICATION = 2000
// Rouge sourd, terreux : signale un compte hors limite (insuffisant ou excédant)
// sans crier — plus discret et élégant que le rouge-rouille vif des messages d'erreur.
const ROUGE_COMPTE = '#a8564d'
const BTN: React.CSSProperties = { fontSize: '0.65625rem', padding: '8px 6px', borderRadius: '5px', border: '1px solid #d6d0c4', background: '#fff', color: '#2a2520', cursor: 'pointer', width: '100%', textAlign: 'center' }

type Props = {
  essaiExistant?: { id: number; titre: string; sous_titre: string | null; resume: string | null; categories: string[]; contenu: string; statut: string; afficher_nom_reel?: boolean; publie_at?: string | null; verset_en_tete?: string | null }
  modeAdmin?: boolean
  metadonneesInitiales?: Metadonnees | null
  versetEnTeteInitial?: { ref: string; texte: string } | null
}

export default function EditeurEssai({ essaiExistant, modeAdmin, metadonneesInitiales, versetEnTeteInitial }: Props) {
  const router = useRouter()
  // L'éditeur est un outil d'écriture à trois panneaux (mise en forme, texte,
  // notes) : impraticable sur téléphone. Comme la Polyglotte, on y renvoie vers
  // un grand écran plutôt que d'entasser les panneaux (voir AGENTS § mobile).
  const mobile = useEstMobile(900)
  const [meta, setMeta] = useState<Metadonnees>({
    titre: essaiExistant?.titre ?? metadonneesInitiales?.titre ?? '',
    sousTitre: essaiExistant?.sous_titre ?? metadonneesInitiales?.sousTitre ?? '',
    resume: essaiExistant?.resume ?? metadonneesInitiales?.resume ?? '',
    categories: essaiExistant?.categories ?? metadonneesInitiales?.categories ?? [],
  })
  const [userId, setUserId] = useState<string | null>(null)
  const [profil, setProfil] = useState<{ pseudo: string | null; nom: string | null; prenom: string | null } | null>(null)
  const [afficherNomReel, setAfficherNomReel] = useState(essaiExistant?.afficher_nom_reel ?? false)
  const [versetEnTete] = useState<{ ref: string; texte: string } | null>(() => {
    if (versetEnTeteInitial) return versetEnTeteInitial
    if (essaiExistant?.verset_en_tete) {
      try { return JSON.parse(essaiExistant.verset_en_tete) } catch {}
    }
    return null
  })
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
  const [confirmPublier, setConfirmPublier] = useState(false)
  const [accepteConditions, setAccepteConditions] = useState(false)
  const [erreurConditions, setErreurConditions] = useState<string | null>(null)
  const contenuOriginalRef = useRef(essaiExistant?.contenu ?? '')
  const creationInitialeRef = useRef(false)

  // Refs toujours à jour pour les closures du setInterval (pas de dépendance stale)
  const contenuTexteRef = useRef(contenuTexte)
  contenuTexteRef.current = contenuTexte
  const metaRef = useRef(meta)
  metaRef.current = meta
  const afficherNomReelRef = useRef(afficherNomReel)
  afficherNomReelRef.current = afficherNomReel
  const derniereCleSauvegardeeRef = useRef('')
  const [derniereSauvegardeAt, setDerniereSauvegardeAt] = useState<Date | null>(null)

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

  useEffect(() => {
    if (!userId || idRef.current || !metadonneesInitiales || creationInitialeRef.current) return
    creationInitialeRef.current = true
    supabase.from('essais').insert({
      user_id: userId, titre: metadonneesInitiales.titre, sous_titre: metadonneesInitiales.sousTitre || null,
      resume: metadonneesInitiales.resume, categories: metadonneesInitiales.categories, contenu: '', statut: 'brouillon',
    }).select('id').single().then(({ data }) => {
      if (data) { setId(data.id); idRef.current = data.id }
    })
  }, [userId, metadonneesInitiales])

  const nomAffiche = (afficherNomReel && profil?.nom) ? `${profil.prenom ?? ''} ${profil.nom}`.trim() : (profil?.pseudo ?? 'Anonyme')

  // ── Sauvegarde automatique ────────────────────────────────────────────────
  const sauvegarder = useCallback(async (statutForce?: 'brouillon' | 'en_attente') => {
    if (!userId) return false
    const titre = meta.titre.trim()
    if (!titre) {
      if (statutForce) alert('Le titre est obligatoire.')
      return false
    }
    setStatutEnr('enregistrement')
    const payload: any = {
      titre, sous_titre: meta.sousTitre.trim() || null, resume: meta.resume.trim(),
      categories: meta.categories, contenu: contenuTexte, afficher_nom_reel: afficherNomReel,
      verset_en_tete: versetEnTete ? JSON.stringify(versetEnTete) : null,
      updated_at: new Date().toISOString(),
    }
    if (statutForce) payload.statut = statutForce
    else if (!modeAdmin && essaiExistant?.publie_at && contenuTexte !== contenuOriginalRef.current) payload.statut = 'en_attente'
    let error: any = null
    if (idRef.current) {
      ;({ error } = await supabase.from('essais').update(payload).eq('id', idRef.current))
    } else {
      const { data, error: insertError } = await supabase
        .from('essais')
        .insert({ ...payload, user_id: userId, statut: statutForce ?? 'brouillon' })
        .select('id')
        .single()
      error = insertError
      if (data) { setId(data.id); idRef.current = data.id }
    }
    setStatutEnr(error ? 'erreur' : 'enregistre')
    setTimeout(() => setStatutEnr('idle'), 1500)
    return !error
  }, [userId, meta, contenuTexte, afficherNomReel, versetEnTete, modeAdmin, essaiExistant?.publie_at])

  useEffect(() => {
    if (!contenuTexte.trim()) return
    const t = setTimeout(() => sauvegarder(), 2500)
    return () => clearTimeout(t)
  }, [contenuTexte, sauvegarder])

  // ── Auto-sauvegarde périodique toutes les 30 secondes ────────────────────
  useEffect(() => {
    if (!userId) return
    const sauvegarderAuto = async () => {
      if (!idRef.current) return
      const cle = `${contenuTexteRef.current}:::${afficherNomReelRef.current}:::${JSON.stringify(metaRef.current)}`
      if (!contenuTexteRef.current.trim() || cle === derniereCleSauvegardeeRef.current) return
      setStatutEnr('enregistrement')
      const payload: Record<string, unknown> = {
        titre: metaRef.current.titre, sous_titre: metaRef.current.sousTitre || null,
        resume: metaRef.current.resume, categories: metaRef.current.categories,
        contenu: contenuTexteRef.current, afficher_nom_reel: afficherNomReelRef.current,
        verset_en_tete: versetEnTete ? JSON.stringify(versetEnTete) : null,
        updated_at: new Date().toISOString(),
      }
      const { error } = await supabase.from('essais').update(payload).eq('id', idRef.current!)
      if (!error) {
        derniereCleSauvegardeeRef.current = cle
        setDerniereSauvegardeAt(new Date())
      }
      setStatutEnr(error ? 'erreur' : 'enregistre')
      setTimeout(() => setStatutEnr('idle'), 2000)
    }
    const t = setInterval(sauvegarderAuto, 30000)
    return () => clearInterval(t)
  }, [userId])

  // ── Charger le contenu initial dans la zone éditable ──────────────────────
  useEffect(() => {
    if (editableRef.current && !editableRef.current.dataset.charge) {
      editableRef.current.innerHTML = syntaxeVersHtml(contenuTexte)
      editableRef.current.dataset.charge = '1'
      renumeroterNotes()
    }
  }, [contenuTexte])

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
    // `preventScroll` : sans lui, redonner le focus à la zone d'édition la fait défiler
    // en haut de page (très désagréable lors de l'insertion d'une citation/note).
    editableRef.current?.focus({ preventScroll: true })
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
      editableRef.current?.focus({ preventScroll: true })
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
    insererHTML(`<span contenteditable="false" data-chip="note" data-note="${encodeURIComponent(texte)}" style="${styleNote}">note</span>&nbsp;`)
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
    insererHTML(`<span contenteditable="false" data-chip="note" data-note="${encodeURIComponent(texte)}" style="${styleNote}">note</span>&nbsp;`)
    const notes = editableRef.current?.querySelectorAll<HTMLElement>('[data-chip="note"]')
    noteCibleRef.current = notes && notes.length > 0 ? notes[notes.length - 1] : null
    setPanneau({ type: 'note', texte })
    setEditionNote({ mode: 'modification' })
  }

  const inserrerCitation = (c: { label: string; type: 'verset' | 'segment'; id: string; complet?: boolean; texte?: string; fin?: string; ref?: string }) => {
    // Citation « complète » : le texte cité forme un bloc Citation (blockquote, SANS
    // guillemets français), la référence devient une NOTE. L'appel de note se place AVANT
    // la ponctuation finale (`fin` : point, sauf « ? » / « ! »).
    if (c.complet && c.texte) {
      const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      // Le contenu de la note peut porter des *italiques* (titre d'œuvre) : on encode aussi
      // l'astérisque pour qu'il ne soit pas réinterprété par la syntaxe légère au rechargement.
      const noteEnc = encodeURIComponent(c.ref ?? c.label).replace(/\*/g, '%2A')
      const note = `<span contenteditable="false" data-chip="note" data-note="${noteEnc}" style="${styleNote}">note</span>`
      insererHTML(`<blockquote>${esc(c.texte)}${note}${esc(c.fin ?? '.')}</blockquote><p><br></p>`)
    } else {
      insererHTML(`<span contenteditable="false" data-chip="${c.type}" data-id="${c.id}" data-label="${c.label}" style="display:inline-block;color:#3d6b4f;text-decoration:underline;background:rgba(61,107,79,0.07);padding:1px 5px;border-radius:3px;cursor:pointer;">${c.label}</span>&nbsp;`)
    }
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

  const remplacerBlocCourant = (tag: 'P' | 'H2' | 'H3' | 'BLOCKQUOTE') => {
    const bloc = blocCourant()
    if (!bloc) {
      document.execCommand('formatBlock', false, tag)
      return
    }
    if (bloc.tagName === tag) return

    const nouveau = document.createElement(tag.toLowerCase())
    while (bloc.firstChild) nouveau.appendChild(bloc.firstChild)
    bloc.replaceWith(nouveau)

    const marqueur = nouveau.querySelector<HTMLElement>('[data-marqueur-curseur="1"]')
    if (marqueur) {
      const r = document.createRange()
      r.setStartAfter(marqueur)
      r.collapse(true)
      const s = window.getSelection()
      s?.removeAllRanges()
      s?.addRange(r)
      marqueur.remove()
    }
  }

  const appliquerBloc = (tag: 'H2' | 'H3' | 'BLOCKQUOTE') => {
    const cible = tag === 'H2' ? 'h2' : tag === 'H3' ? 'h3' : 'blockquote'
    conserverPosition(() => {
      if (blocActif === cible) remplacerBlocCourant('P')
      else remplacerBlocCourant(tag)
    })
    setBlocActif(blocActif === cible ? 'p' : cible)
    declencherChangement()
  }

  const appliquerParagraphe = () => {
    conserverPosition(() => { remplacerBlocCourant('P') })
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
  const resumeLen = meta.resume.trim().length
  const resumeOk = resumeLen >= RESUME_MIN && resumeLen <= RESUME_MAX
  // Compte du texte « hors limite » : trop court (une fois la saisie commencée, sauf
  // pour un admin qui édite un essai déjà publié où le minimum ne s'applique pas) ou
  // trop long. Sert à teinter le compteur en rouge sourd.
  const carSousMin = nbCar > 0 && nbCar < MIN_CARACTERES_PUBLICATION && !(modeAdmin && essaiExistant?.statut === 'publie')
  const carHorsLimite = carSousMin || nbCar > MAX_CARACTERES
  const toggleCategorie = (categorie: string) => {
    setMeta(prev => ({
      ...prev,
      categories: prev.categories.includes(categorie)
        ? prev.categories.filter(c => c !== categorie)
        : [...prev.categories, categorie],
    }))
  }

  const validerAvantSoumission = () => {
    if (!userId) {
      alert('Vous devez être connecté pour soumettre une publication.')
      return false
    }
    if (!meta.titre.trim()) {
      alert('Le titre est obligatoire.')
      return false
    }
    if (!resumeOk) {
      alert(`Le résumé doit faire entre ${RESUME_MIN} et ${RESUME_MAX} caractères.`)
      return false
    }
    if (meta.categories.length === 0) {
      alert('Choisissez au moins une catégorie.')
      return false
    }
    if (nbCar < MIN_CARACTERES_PUBLICATION) {
      alert(`Votre texte doit compter au moins ${MIN_CARACTERES_PUBLICATION.toLocaleString('fr')} caractères pour être soumis à publication.`)
      return false
    }
    if (nbCar > MAX_CARACTERES) {
      alert(`Votre texte dépasse la limite de ${MAX_CARACTERES.toLocaleString('fr')} caractères.`)
      return false
    }
    return true
  }

  const ouvrirConfirmationPublication = () => {
    if (!validerAvantSoumission()) return
    setAccepteConditions(false)
    setErreurConditions(null)
    setConfirmPublier(true)
  }

  const publier = async () => {
    if (modeAdmin && essaiExistant?.statut === 'publie') {
      const ok = await sauvegarder()
      if (ok && idRef.current) router.push(`/essais/${idRef.current}`)
      return
    }
    if (!validerAvantSoumission()) return
    const ok = await sauvegarder('en_attente')
    if (!ok) return
    if (idRef.current) router.push(`/essais/${idRef.current}`)
  }

  const diff = comparaisonOuverte ? diffMots(contenuOriginalRef.current, contenuTexte) : null

  if (mobile) {
    return (
      <main style={{ background: '#f7f4ef', minHeight: 'calc(100dvh - 3.5rem)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 24px' }}>
        <div style={{ maxWidth: '32.5rem', textAlign: 'center', color: '#5b544c', fontFamily: 'var(--font-source-sans), Arial, sans-serif' }}>
          <h1 style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '1.375rem', color: '#3d6b4f', margin: '0 0 14px' }}>Écrire</h1>
          <p style={{ fontSize: '0.9375rem', lineHeight: 1.6, margin: 0 }}>
            L’éditeur demande un écran large : il réunit la mise en forme, les notes et les citations.
            <br /><br />
            <strong>Ouvrez cette page depuis un ordinateur ou une tablette.</strong>
          </p>
        </div>
      </main>
    )
  }

  return (
    <main style={{ background: '#f7f4ef', minHeight: 'calc(100vh - 3.5rem)', paddingRight: '320px' }}>
      <style>{`
        .editeur-essai h2,
        .editeur-essai h3,
        .editeur-essai p,
        .editeur-essai blockquote { margin: 0; }
        .editeur-essai p,
        .editeur-essai blockquote { font-family: var(--font-source-sans), Arial, sans-serif; }
        .editeur-essai h2 { font-family: var(--font-source-serif), Georgia, serif; font-weight: 700; font-size: 1.07em; color: #1e2e24; }
        .editeur-essai h3 { font-family: var(--font-source-serif), Georgia, serif; font-style: italic; font-weight: 400; font-size: 1em; color: #2a3d30; }
        .editeur-essai blockquote { font-style: normal; font-size: 0.93em; color: #3a3530; margin-left: 8mm; text-align: justify; }
        .editeur-essai p,
        .editeur-essai blockquote { line-height: 1.5; word-spacing: -0.09em; letter-spacing: -0.006em; }
        /* Citations resserrées : interligne réduit et bloc condensé (ne touche pas
           aux paragraphes). */
        .editeur-essai blockquote { line-height: 1.3; font-size: 0.9em; margin-top: 0.32em; margin-bottom: 0.5em; }
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
      <div style={{ maxWidth: '56.25rem', margin: '0 auto', padding: '32px 32px 100px' }}>

        {essaiExistant && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
            <button onClick={() => setComparaisonOuverte(v => !v)} style={{ fontSize: '0.6875rem', color: comparaisonOuverte ? '#fff' : '#3d6b4f', background: comparaisonOuverte ? '#3d6b4f' : 'none', border: comparaisonOuverte ? 'none' : '1px solid #3d6b4f', borderRadius: '4px', padding: '4px 10px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {comparaisonOuverte ? 'Revenir à la rédaction' : 'Comparer avec la version d\u2019origine'}
            </button>
          </div>
        )}

        {comparaisonOuverte && diff ? (
          <div style={{ display: 'flex', gap: '20px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.06em', color: '#9a958d', marginBottom: '8px' }}>VERSION D'ORIGINE</p>
              <div style={{ background: '#fff', border: '1px solid #e4dfd8', borderRadius: '6px', padding: '20px 22px', fontSize: '0.84375rem', lineHeight: 1.7, color: '#1e1a16', whiteSpace: 'pre-wrap' }}>
                {diff.gauche.map((s, i) => s.type === 'supprime'
                  ? <span key={i} style={{ color: '#c0392b', textDecoration: 'line-through' }}>{s.texte}</span>
                  : <span key={i}>{s.texte}</span>)}
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.06em', color: '#9a958d', marginBottom: '8px' }}>VERSION MODIFIÉE</p>
              <div style={{ background: '#fff', border: '1px solid #e4dfd8', borderRadius: '6px', padding: '20px 22px', fontSize: '0.84375rem', lineHeight: 1.7, color: '#1e1a16', whiteSpace: 'pre-wrap' }}>
                {diff.droite.map((s, i) => s.type === 'ajoute'
                  ? <span key={i} style={{ color: '#c0392b', fontWeight: 600 }}>{s.texte}</span>
                  : <span key={i}>{s.texte}</span>)}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div style={{ paddingLeft: '128px', marginBottom: '14px' }}>
              <div style={{ background: '#fff', border: '1px solid #e4dfd8', borderRadius: '7px', padding: '16px 18px 18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '18px', alignItems: 'flex-start', marginBottom: '14px' }}>
                  <div>
                    <p style={{ fontSize: '0.59375rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#3d6b4f', margin: '0 0 4px' }}>
                      Informations de publication
                    </p>
                    <p style={{ fontSize: '0.6875rem', color: '#9a958d', margin: 0 }}>
                      Ces informations accompagnent le texte au moment de la soumission.
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontSize: '0.6875rem', color: carHorsLimite ? ROUGE_COMPTE : '#6b6560', fontWeight: carHorsLimite ? 700 : 600, margin: 0, fontVariantNumeric: 'tabular-nums' }}>
                      {nbCar.toLocaleString('fr')} / {MAX_CARACTERES.toLocaleString('fr')} caractères
                    </p>
                    {nbCar < MIN_CARACTERES_PUBLICATION && !(modeAdmin && essaiExistant?.statut === 'publie') && (
                      <p style={{ fontSize: '0.65625rem', color: '#9a958d', margin: '3px 0 0' }}>
                        Publication possible à partir de {MIN_CARACTERES_PUBLICATION.toLocaleString('fr')} caractères
                      </p>
                    )}
                    {nbCar > MAX_CARACTERES && (
                      <p style={{ fontSize: '0.65625rem', color: ROUGE_COMPTE, margin: '3px 0 0' }}>
                        Limite dépassée
                      </p>
                    )}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.59375rem', fontWeight: 700, letterSpacing: '0.08em', color: '#9a958d', textTransform: 'uppercase' }}>Titre *</label>
                    <input
                      value={meta.titre}
                      onChange={e => setMeta(prev => ({ ...prev, titre: e.target.value }))}
                      autoComplete="off"
                      placeholder="Titre"
                      style={{ width: '100%', fontSize: '1rem', fontFamily: 'var(--font-source-serif), Georgia, serif', padding: '7px 0 5px', border: 'none', borderBottom: '1px solid #d6d0c4', outline: 'none', color: '#1e2e24', background: 'transparent', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.59375rem', fontWeight: 700, letterSpacing: '0.08em', color: '#9a958d', textTransform: 'uppercase' }}>Sous-titre</label>
                    <input
                      value={meta.sousTitre}
                      onChange={e => setMeta(prev => ({ ...prev, sousTitre: e.target.value }))}
                      autoComplete="off"
                      placeholder="Sous-titre"
                      style={{ width: '100%', fontSize: '0.8125rem', padding: '8px 0 5px', border: 'none', borderBottom: '1px solid #ede9e2', outline: 'none', color: '#3a3530', background: 'transparent', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px', marginBottom: '5px' }}>
                    <label style={{ fontSize: '0.59375rem', fontWeight: 700, letterSpacing: '0.08em', color: '#9a958d', textTransform: 'uppercase' }}>Résumé *</label>
                    <span style={{ fontSize: '0.65625rem', color: meta.resume.length > 0 && !resumeOk ? ROUGE_COMPTE : '#9a958d', fontVariantNumeric: 'tabular-nums' }}>
                      {resumeLen.toLocaleString('fr')} / {RESUME_MAX.toLocaleString('fr')} caractères
                    </span>
                  </div>
                  <textarea
                    value={meta.resume}
                    onChange={e => setMeta(prev => ({ ...prev, resume: e.target.value }))}
                    rows={3}
                    placeholder={`${RESUME_MIN} à ${RESUME_MAX} caractères présentant la publication`}
                    style={{ width: '100%', fontSize: '0.78125rem', padding: '7px 9px', border: '1px solid #d6d0c4', borderRadius: '5px', background: '#faf8f4', color: '#2a2520', resize: 'vertical', outline: 'none', boxSizing: 'border-box', lineHeight: 1.5 }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.59375rem', fontWeight: 700, letterSpacing: '0.08em', color: '#9a958d', textTransform: 'uppercase', display: 'block', marginBottom: '7px' }}>Catégories *</label>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {CATEGORIES_ESSAIS.map(categorie => {
                      const actif = meta.categories.includes(categorie)
                      return (
                        <button
                          key={categorie}
                          onClick={() => toggleCategorie(categorie)}
                          style={{ fontSize: '0.6875rem', padding: '4px 11px', borderRadius: '12px', cursor: 'pointer', border: `1px solid ${actif ? '#3d6b4f' : '#d6d0c4'}`, background: actif ? 'rgba(61,107,79,0.10)' : '#fff', color: actif ? '#3d6b4f' : '#8a8278', fontWeight: actif ? 600 : 400 }}>
                          {categorie}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Barre d'outils et zone de rédaction */}
            <div style={{ display: 'flex', gap: '20px', paddingLeft: '128px' }}>
              <div style={{
                position: 'fixed', top: '3.5rem', left: 0, width: '8rem', height: 'calc(100vh - 3.5rem)',
                background: '#faf8f4', borderRight: '1px solid #d6d0c4', padding: '20px 14px', overflowY: 'auto',
                zIndex: 50, display: 'flex', flexDirection: 'column', gap: '5px',
              }}>
                <button onMouseDown={e => e.preventDefault()} onClick={() => commande('bold')} style={{ ...BTN, fontWeight: 700 }} title="Gras (Ctrl+B)">Gras</button>
                <button onMouseDown={e => e.preventDefault()} onClick={() => commande('italic')} style={{ ...BTN, fontStyle: 'italic' }} title="Italique (Ctrl+I)">Italique</button>
                <button onMouseDown={e => e.preventDefault()} onClick={() => commande('superscript')} style={BTN} title="Exposant">Exposant</button>
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
                    <p style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#3d6b4f', margin: '0 0 12px', fontFamily: "var(--font-source-sans), Arial, sans-serif" }}>
                      {nomAffiche}
                    </p>
                    <h1 style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: '1.5rem', fontWeight: 'normal', color: '#1e2e24', margin: '0 0 6px' }}>{meta.titre}</h1>
                    {meta.sousTitre && <p style={{ fontSize: '0.875rem', color: '#8a8278', fontStyle: 'italic', margin: '0 0 12px', fontFamily: "var(--font-source-serif), Georgia, serif" }}>{meta.sousTitre}</p>}
                    <div style={{ display: 'flex', gap: '5px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '8px' }}>
                      {meta.categories.map(c => (
                        <span key={c} style={{ fontSize: '0.59375rem', color: '#3d6b4f', background: 'rgba(61,107,79,0.08)', padding: '1px 8px', borderRadius: '9px', fontWeight: 600, fontFamily: "var(--font-source-sans), Arial, sans-serif" }}>{c}</span>
                      ))}
                    </div>
                  </div>

                  {/* Verset en tête — non modifiable */}
                  {versetEnTete && (
                    <div style={{ borderBottom: '1px solid #ede9e2', padding: '28px 40px 24px', textAlign: 'center', background: '#fdfcf9' }}>
                      <p style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: '0.90625rem', lineHeight: 1.8, color: '#4a4440', fontStyle: 'italic', margin: '0 0 10px', letterSpacing: '0.01em' }}>
                        {'« '}{rendreTexteEnrichi(versetEnTete.texte)}{' »'}
                      </p>
                      <p style={{ fontSize: '0.65625rem', letterSpacing: '0.1em', color: '#a09890', margin: 0, fontFamily: "var(--font-source-sans), Arial, sans-serif", textTransform: 'uppercase' }}>
                        {versetEnTete.ref}
                      </p>
                    </div>
                  )}
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
                      minHeight: '420px', fontSize: '0.9375rem', lineHeight: 1.5, padding: '24px 30px',
                      background: '#fff', color: '#1e1a16',
                      outline: 'none', boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Barre d'action sticky ────────────────────────────────────────────── */}
      {!comparaisonOuverte && (
        <div style={{
          position: 'fixed', bottom: 0, left: '128px', right: '320px', zIndex: 60,
          background: '#faf8f4', borderTop: '1px solid #d6d0c4',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 24px', gap: '12px',
        }}>
          <span style={{ fontSize: '0.6875rem', color: statutEnr === 'erreur' ? '#c0562a' : nbCar > MAX_CARACTERES ? ROUGE_COMPTE : '#9a958d', flexShrink: 0 }}>
            {statutEnr === 'enregistrement' ? 'Enregistrement…'
              : statutEnr === 'enregistre' ? 'Enregistré ✓'
              : statutEnr === 'erreur' ? 'Erreur d’enregistrement'
              : nbCar > MAX_CARACTERES ? `Limite dépassée (${nbCar.toLocaleString('fr')} / ${MAX_CARACTERES.toLocaleString('fr')} caractères)`
              : derniereSauvegardeAt ? `Enregistré à ${derniereSauvegardeAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} ✓`
              : ' '}
          </span>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {!(modeAdmin && essaiExistant?.statut === 'publie') && (
              <button
                onClick={() => sauvegarder('brouillon')}
                style={{ fontSize: '0.78125rem', padding: '7px 18px', borderRadius: '5px', border: '1px solid #d6d0c4', background: '#fff', color: '#3a3530', cursor: 'pointer' }}>
                Enregistrer comme brouillon
              </button>
            )}
            <button
              onClick={modeAdmin && essaiExistant?.statut === 'publie' ? publier : ouvrirConfirmationPublication}
              style={{ fontSize: '0.78125rem', padding: '7px 20px', borderRadius: '5px', border: 'none', background: '#3d6b4f', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
              {modeAdmin && essaiExistant?.statut === 'publie' ? 'Enregistrer les corrections' : 'Soumettre la publication'}
            </button>
          </div>
        </div>
      )}

      {/* ── Modale de confirmation avant soumission ──────────────────────────────
          Rendue via un portail sur <body> : sans cela, un ancêtre transformé (l'éditeur
          en a) piège le `position: fixed` et la fenêtre n'est plus centrée sur la page.
          Resserrée et épurée. */}
      {confirmPublier && typeof document !== 'undefined' && createPortal(
        <div onClick={() => setConfirmPublier(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.34)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '10px', padding: '20px 22px', maxWidth: '27.5rem', width: '100%', boxShadow: '0 16px 48px rgba(0,0,0,0.20)' }}>
            <h3 style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '1rem', fontWeight: 'normal', color: '#1e2e24', margin: '0 0 8px' }}>
              Soumettre cette publication ?
            </h3>
            <p style={{ fontSize: '0.75rem', color: '#5a5450', lineHeight: 1.5, margin: '0 0 4px' }}>
              Votre texte «&nbsp;<em style={{ color: '#3a3530', fontStyle: 'italic' }}>{meta.titre}</em>&nbsp;» part en modération ; il reste figé tant qu&apos;il est en attente.
            </p>
            <div style={{ maxHeight: '170px', overflowY: 'auto', fontSize: '0.6875rem', color: '#6b6560', lineHeight: 1.5, whiteSpace: 'pre-line', background: '#faf8f4', border: '1px solid #ede9e2', borderRadius: '5px', padding: '9px 11px', margin: '10px 0' }}>
              {CONDITIONS}
            </div>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.71875rem', color: '#3a3530', margin: '0 0 6px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={accepteConditions}
                onChange={e => { setAccepteConditions(e.target.checked); if (e.target.checked) setErreurConditions(null) }}
                style={{ marginTop: '2px', accentColor: '#3d6b4f' }}
              />
              Je certifie respecter ces conditions de publication.
            </label>
            {erreurConditions && <p style={{ fontSize: '0.6875rem', color: '#c0562a', margin: '0 0 8px' }}>{erreurConditions}</p>}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '12px' }}>
              <button
                onClick={() => { setConfirmPublier(false); setErreurConditions(null) }}
                style={{ fontSize: '0.75rem', padding: '7px 16px', borderRadius: '5px', border: '1px solid #d6d0c4', background: '#fff', color: '#3a3530', cursor: 'pointer' }}>
                Annuler
              </button>
              <button
                onClick={async () => {
                  if (!accepteConditions) {
                    setErreurConditions('Vous devez attester respecter les conditions de publication.')
                    return
                  }
                  setConfirmPublier(false)
                  await publier()
                }}
                style={{ fontSize: '0.75rem', padding: '7px 18px', borderRadius: '5px', border: 'none', background: '#3d6b4f', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>
                Confirmer
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {selecteurOuvert && <SelecteurCitation onChoisir={inserrerCitation} onFermer={() => setSelecteurOuvert(false)} />}
      <VoletEssai element={panneau} onFermer={() => setPanneau(null)} toujoursVisible editionNote={editionNote ? { actif: true, mode: editionNote.mode } : undefined} onEnregistrerNote={enregistrerNoteDepuisVolet} enTete={
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {profil?.nom && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '0.65625rem', color: '#8a8278', cursor: 'pointer', lineHeight: 1.4 }}>
                <input type="checkbox" checked={afficherNomReel} onChange={e => setAfficherNomReel(e.target.checked)} style={{ marginTop: '2px' }} />
                Publier sous mon nom réel ({profil.prenom ? `${profil.prenom} ` : ''}{profil.nom}) plutôt que mon pseudonyme
              </label>
              {afficherNomReel && (
                <p style={{ fontSize: '0.625rem', color: '#7a5a30', background: '#fef9ec', border: '1px solid #e8d5a0', borderRadius: '4px', padding: '6px 9px', margin: 0, lineHeight: 1.55 }}>
                  Votre nom réel apparaîtra sur cet essai et sur votre profil public.
                </p>
              )}
            </div>
          )}
        </div>
      } />
    </main>
  )
}
