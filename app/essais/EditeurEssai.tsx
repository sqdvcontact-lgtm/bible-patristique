'use client'

import { Z_MODALE } from '@/app/lib/empilement'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useEstMobile } from '@/app/lib/useEstMobile'
import { createPortal } from 'react-dom'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import { compterCaracteres, lettreDepuisIndex, type ElementPanneau } from '@/app/lib/texteEnrichiEssai'
import { PARAGRAPHE_ESSAI, CITATION_ESSAI, enCss } from '@/app/lib/compositionEssai'
import { rendreTexteEnrichi } from '@/app/oeuvre/[id]/texteEnrichi'
import { syntaxeVersHtml, htmlVersSyntaxe, styleNote } from '@/app/lib/serialisationEssai'
import { diffMots } from '@/app/lib/diffTexte'
import { raccourcisEditeur, collageTexteBrut } from '@/app/lib/raccourcisEditeur'
import VoletEssai from '@/app/lib/VoletEssai'
import SelecteurCitation from '@/app/lib/SelecteurCitation'
import { CATEGORIES_ESSAIS, CONDITIONS, RESUME_MAX, RESUME_MIN, type Metadonnees } from './EtapeMetadonnees'
import { COUVERTURES, couvertureDe } from '@/app/lib/couverturesEssai'
import { FleuronGenre } from '@/app/lib/fleuronsCouverture'
import { ENCRE_TITRE_CARTE, GRAISSE_TITRE, TITRE_CARTE } from '@/app/lib/hierarchieTitres'
import { NOM_ANONYME, colonnesSignature, nomReel, nomSigne, signatureDe, type Signature } from '@/app/lib/signatureEssai'
import { useFermerAEchap } from '@/app/lib/useFermerAEchap'
import { useFenetreModale } from '@/app/lib/useFenetreModale'

const MAX_CARACTERES = 8000
const MIN_CARACTERES_PUBLICATION = 2000
// Rouge sourd, terreux : signale un compte hors limite (insuffisant ou excédant)
// sans crier — plus discret et élégant que le rouge-rouille vif des messages d'erreur.
const ROUGE_COMPTE = '#a8564d'
const BTN: React.CSSProperties = { fontSize: '0.6875rem', padding: '8px 6px', borderRadius: '4px', border: '1px solid var(--cs-bord)', background: 'var(--cs-surface)', color: 'var(--cs-texte-fort)', cursor: 'pointer', width: '100%', textAlign: 'center' }

// Le titre d'un brouillon qu'on n'a pas encore nommé : sans lui, la sauvegarde
// renonçait en silence et le texte n'existait nulle part.
const TITRE_PROVISOIRE = 'Sans titre'

/** La clé de ce qui s'enregistre : deux états de même clé ont le même contenu en base. */
function cleEtatEssai(contenu: string, meta: Metadonnees, signature: string, couverture: string, embleme: string): string {
  return JSON.stringify([contenu, meta.titre.trim(), meta.sousTitre.trim(), meta.resume.trim(), meta.categories, signature, couverture, embleme])
}

type ChampEnErreur = 'session' | 'titre' | 'resume' | 'categories' | 'principale' | 'texte'

type Props = {
  essaiExistant?: { couverture?: string | null; embleme?: string | null; id: number; titre: string; sous_titre: string | null; resume: string | null; categories: string[]; contenu: string; statut: string; afficher_nom_reel?: boolean; anonyme?: boolean; publie_at?: string | null; verset_en_tete?: string | null }
  modeAdmin?: boolean
  metadonneesInitiales?: Metadonnees | null
  versetEnTeteInitial?: { ref: string; texte: string } | null
}

/** La cible d'un départ demandé par le bouton Retour du navigateur, et non par un lien. */
const RETOUR_NAVIGATEUR = '__retour_navigateur__'

export default function EditeurEssai({ essaiExistant, modeAdmin, metadonneesInitiales, versetEnTeteInitial }: Props) {
  const router = useRouter()
  // L'éditeur est un outil d'écriture à trois panneaux (mise en forme, texte,
  // notes) : impraticable sur téléphone. Comme la Polyglotte, on y renvoie vers
  // un grand écran plutôt que d'entasser les panneaux (voir AGENTS § mobile).
  const mobile = useEstMobile()
  const [meta, setMeta] = useState<Metadonnees>({
    titre: essaiExistant?.titre ?? metadonneesInitiales?.titre ?? '',
    sousTitre: essaiExistant?.sous_titre ?? metadonneesInitiales?.sousTitre ?? '',
    resume: essaiExistant?.resume ?? metadonneesInitiales?.resume ?? '',
    categories: essaiExistant?.categories ?? metadonneesInitiales?.categories ?? [],
  })
  // Couleur de la couverture. Un texte sans choix prend le vert d'encre du site :
  // une publication n'est jamais sans couverture.
  // Chaîne vide = aucun choix, et c'est le cas par défaut : la couleur est alors
  // TIRÉE de l'identifiant de la publication, ce qui met de la variété au rayon.
  // Poser une couleur d'office ferait naître toutes les publications de la même.
  const [couverture, setCouverture] = useState<string>(essaiExistant?.couverture ?? '')

  // L'emblème de la couverture. Une publication porte souvent plusieurs registres :
  // l'auteur dit lequel l'illustre. Vide = le premier registre qui a un dessin, ce
  // qui était le seul comportement possible avant ce choix.
  const [embleme, setEmbleme] = useState<string>(essaiExistant?.embleme ?? '')
  const [userId, setUserId] = useState<string | null>(null)
  const [profil, setProfil] = useState<{ pseudo: string | null; nom: string | null; prenom: string | null } | null>(null)
  // La signature : le pseudonyme (la règle), le nom réel, ou rien. Un seul état, écrit
  // en deux colonnes qui ne sont jamais vraies ensemble (app/lib/signatureEssai.ts).
  const [signature, setSignature] = useState<Signature>(() => signatureDe(essaiExistant ?? {}))
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
  const fermerConfirmPublier = useCallback(() => setConfirmPublier(false), [])
  useFermerAEchap(confirmPublier, fermerConfirmPublier)
  const boiteConfirmPublier = useRef<HTMLDivElement>(null)
  useFenetreModale(boiteConfirmPublier, confirmPublier)
  const [accepteConditions, setAccepteConditions] = useState(false)
  const [erreurConditions, setErreurConditions] = useState<string | null>(null)
  const contenuOriginalRef = useRef(essaiExistant?.contenu ?? '')
  const creationInitialeRef = useRef(false)

  // ── Un essai EN LIGNE ne se retouche qu'en connaissance de cause ──────────
  // ⛔ La règle de modération ne change pas (déclencheur `forcer_statut_essai`) :
  // toute retouche de ce qui se lit renvoie l'essai en vérification et le retire de
  // la lecture. On l'ANNONCE avant la première modification, et l'on attend une
  // confirmation. Tant qu'elle n'est pas donnée, aucune modification ne passe.
  const enLigne = !modeAdmin && essaiExistant?.statut === 'publie'
  const [retoucheAcceptee, setRetoucheAcceptee] = useState(!enLigne)
  // Une seule fenêtre de confirmation, trois raisons de l'ouvrir.
  const [avertissement, setAvertissement] = useState<null | 'retouche' | 'brouillon' | 'quitter'>(null)
  const departDemandeRef = useRef<string | null>(null)
  const fermerAvertissement = useCallback(() => setAvertissement(null), [])
  useFermerAEchap(avertissement !== null, fermerAvertissement)
  const boiteAvertissement = useRef<HTMLDivElement>(null)
  useFenetreModale(boiteAvertissement, avertissement !== null)
  const retoucheAccepteeRef = useRef(retoucheAcceptee)
  useEffect(() => { retoucheAccepteeRef.current = retoucheAcceptee }, [retoucheAcceptee])
  /** Vrai si la modification peut passer ; sinon ouvre l'avertissement. */
  const autoriserRetouche = useCallback(() => {
    if (retoucheAccepteeRef.current) return true
    setAvertissement('retouche')
    return false
  }, [])

  // ── Contrôle avant soumission : des messages EN LIGNE, près des champs ──────
  // Ils ne paraissent qu'après une première tentative, puis se mettent à jour à
  // mesure que l'auteur corrige.
  const [tentativeSoumission, setTentativeSoumission] = useState(false)

  // Refs toujours à jour pour les closures du setInterval (pas de dépendance stale)
  const contenuTexteRef = useRef(contenuTexte)
  contenuTexteRef.current = contenuTexte
  const metaRef = useRef(meta)
  metaRef.current = meta
  const signatureRef = useRef(signature)
  signatureRef.current = signature
  const couvertureRef = useRef(couverture)
  useEffect(() => { couvertureRef.current = couverture }, [couverture])
  const emblemeRef = useRef(embleme)
  useEffect(() => { emblemeRef.current = embleme }, [embleme])
  // L'état ENREGISTRÉ, sous forme de clé : ce qui diffère de lui n'est pas encore
  // en base. Il sert la ligne d'état et la garde de sortie.
  const cleInitiale = cleEtatEssai(essaiExistant?.contenu ?? '', {
    titre: essaiExistant?.titre ?? '', sousTitre: essaiExistant?.sous_titre ?? '',
    resume: essaiExistant?.resume ?? '', categories: essaiExistant?.categories ?? [],
  }, signatureDe(essaiExistant ?? {}), essaiExistant?.couverture ?? '', essaiExistant?.embleme ?? '')
  const derniereCleSauvegardeeRef = useRef(essaiExistant ? cleInitiale : '')
  const [cleEnregistree, setCleEnregistree] = useState(essaiExistant ? cleInitiale : '')
  const [titreProvisoire, setTitreProvisoire] = useState(false)
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
      if (data) {
        setId(data.id); idRef.current = data.id
        const cle = cleEtatEssai('', metadonneesInitiales, signatureRef.current, '', '')
        derniereCleSauvegardeeRef.current = cle
        setCleEnregistree(cle)
      }
    })
  }, [userId, metadonneesInitiales])

  const nomAffiche = nomSigne(colonnesSignature(signature), profil) ?? NOM_ANONYME
  // Les signatures offertes : le nom réel ne se propose que si le profil en porte un.
  const choixSignature: { valeur: Signature; libelle: string }[] = [
    { valeur: 'pseudonyme', libelle: `Sous mon pseudonyme${profil?.pseudo ? `, ${profil.pseudo}` : ''}` },
    ...(nomReel(profil) ? [{ valeur: 'nom_reel' as const, libelle: `Sous mon nom, ${nomReel(profil)}` }] : []),
    { valeur: 'anonyme', libelle: 'Anonymement' },
  ]

  // ── Sauvegarde automatique ────────────────────────────────────────────────
  const sauvegarder = useCallback(async (statutForce?: 'brouillon' | 'en_attente') => {
    if (!userId) return false
    // Un essai en ligne dont la retouche n'est pas acceptée ne s'écrit pas.
    if (!retoucheAccepteeRef.current) return false
    // Sans titre, le brouillon s'enregistre sous un titre PROVISOIRE, que la ligne
    // d'état signale. Une soumission, elle, exige un vrai titre (contrôlée en amont).
    const titreSaisi = meta.titre.trim()
    const titre = titreSaisi || TITRE_PROVISOIRE
    const cleSauvee = cleEtatEssai(contenuTexte, meta, signature, couverture, embleme)
    setStatutEnr('enregistrement')
    const payload: any = {
      titre, sous_titre: meta.sousTitre.trim() || null, resume: meta.resume.trim(),
      categories: meta.categories, contenu: contenuTexte, ...colonnesSignature(signature),
      couverture: couverture || null,
      embleme: embleme || null,
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
    if (!error) {
      derniereCleSauvegardeeRef.current = cleSauvee
      setCleEnregistree(cleSauvee)
      setTitreProvisoire(!titreSaisi)
      setDerniereSauvegardeAt(new Date())
    }
    setTimeout(() => setStatutEnr('idle'), 1500)
    return !error
  }, [userId, meta, contenuTexte, signature, couverture, embleme, versetEnTete, modeAdmin, essaiExistant?.publie_at])

  // Ce qui n'est pas encore en base. Il commande la ligne d'état et la garde de sortie.
  const cleCourante = cleEtatEssai(contenuTexte, meta, signature, couverture, embleme)
  const nonEnregistre = cleCourante !== cleEnregistree && (!!contenuTexte.trim() || id !== null)

  useEffect(() => {
    if (!contenuTexte.trim()) return
    // Rien à écrire tant que l'état est celui de la base (à l'ouverture, notamment).
    if (cleEtatEssai(contenuTexte, meta, signature, couverture, embleme) === derniereCleSauvegardeeRef.current) return
    const t = setTimeout(() => sauvegarder(), 2500)
    return () => clearTimeout(t)
  }, [contenuTexte, meta, signature, couverture, embleme, sauvegarder])

  // ── Verrou d'un essai en ligne ────────────────────────────────────────────
  // Toute saisie (frappe, suppression, collage, dépôt, mise en forme native) passe
  // par `beforeinput` : on l'arrête là, dans toute la page d'édition, tant que la
  // retouche n'est pas acceptée, et l'on pose la question.
  const mainRef = useRef<HTMLElement>(null)
  useEffect(() => {
    if (retoucheAcceptee) return
    const avantSaisie = (e: Event) => {
      const cible = e.target as Node | null
      if (!cible || !mainRef.current?.contains(cible)) return
      e.preventDefault()
      setAvertissement('retouche')
    }
    document.addEventListener('beforeinput', avantSaisie, true)
    return () => document.removeEventListener('beforeinput', avantSaisie, true)
  }, [retoucheAcceptee])
  /** Pour les boutons de mise en forme et de métadonnées : un clic ne passe pas. */
  const retenirClicSiVerrouille = (e: React.MouseEvent) => {
    if (retoucheAcceptee) return
    if (!(e.target as Element).closest('button')) return
    e.preventDefault()
    e.stopPropagation()
    setAvertissement('retouche')
  }

  // ── Garde de sortie ───────────────────────────────────────────────────────
  // Fermer l'onglet ou recharger : le navigateur pose sa propre question.
  useEffect(() => {
    if (!nonEnregistre) return
    const retenir = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', retenir)
    return () => window.removeEventListener('beforeunload', retenir)
  }, [nonEnregistre])

  // Un lien interne du site : on intercepte le clic, en capture, et l'on demande.
  // ⚠️ Le routeur de Next n'émet aucun événement de départ : c'est le clic qu'on
  // retient, avant qu'il n'atteigne le <Link>.
  useEffect(() => {
    if (!nonEnregistre) return
    const auClic = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const lien = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null
      if (!lien || lien.target === '_blank' || lien.hasAttribute('download')) return
      let url: URL
      try { url = new URL(lien.href, window.location.href) } catch { return }
      if (url.origin !== window.location.origin) return
      if (url.pathname === window.location.pathname && url.search === window.location.search) return
      e.preventDefault()
      e.stopPropagation()
      departDemandeRef.current = url.pathname + url.search + url.hash
      setAvertissement('quitter')
    }
    document.addEventListener('click', auClic, true)
    return () => document.removeEventListener('click', auClic, true)
  }, [nonEnregistre])

  // Le bouton RETOUR du navigateur (audit d'ergonomie du 2026-09-21). Ni
  // `beforeunload` ni la capture des clics ne le voient : Next le traite comme une
  // navigation interne. Dès qu'une modification attend, on pose une entrée
  // SENTINELLE à la même adresse ; Retour la dépile (`popstate`), on la repose et
  // l'on demande. Quitter quand même recule de deux entrées : la sentinelle et
  // l'éditeur. Une fois tout enregistré, un Retour qui tombe sur la sentinelle
  // recule d'une entrée de plus, et le lecteur ne voit rien de ce mécanisme.
  // ⚠️ La sentinelle reste en place une fois posée : l'ôter demanderait un recul,
  // qui est lui-même un `popstate`. Les départs par le site la remplacent donc
  // (`partirVers`) au lieu d'empiler une entrée par-dessus.
  const sentinelleRef = useRef(false)
  const nonEnregistreRef = useRef(nonEnregistre)
  useEffect(() => { nonEnregistreRef.current = nonEnregistre }, [nonEnregistre])
  useEffect(() => {
    if (!nonEnregistre || sentinelleRef.current) return
    window.history.pushState(null, '', window.location.href)
    sentinelleRef.current = true
  }, [nonEnregistre])
  useEffect(() => {
    const auRetour = () => {
      if (!sentinelleRef.current) return
      if (!nonEnregistreRef.current) {
        sentinelleRef.current = false
        window.history.back()
        return
      }
      window.history.pushState(null, '', window.location.href)
      departDemandeRef.current = RETOUR_NAVIGATEUR
      setAvertissement('quitter')
    }
    window.addEventListener('popstate', auRetour)
    return () => window.removeEventListener('popstate', auRetour)
  }, [])
  /** Quitter l'éditeur par le site : la sentinelle, si elle est posée, cède sa
   *  place à la destination au lieu de rester dans l'historique. */
  const partirVers = (cible: string) => {
    if (sentinelleRef.current) { sentinelleRef.current = false; router.replace(cible) }
    else router.push(cible)
  }

  // ── Auto-sauvegarde périodique toutes les 30 secondes ────────────────────
  useEffect(() => {
    if (!userId) return
    const sauvegarderAuto = async () => {
      if (!idRef.current || !retoucheAccepteeRef.current) return
      const cle = cleEtatEssai(contenuTexteRef.current, metaRef.current, signatureRef.current, couvertureRef.current, emblemeRef.current)
      if (!contenuTexteRef.current.trim() || cle === derniereCleSauvegardeeRef.current) return
      setStatutEnr('enregistrement')
      const titreSaisi = metaRef.current.titre.trim()
      const payload: Record<string, unknown> = {
        titre: titreSaisi || TITRE_PROVISOIRE, sous_titre: metaRef.current.sousTitre.trim() || null,
        resume: metaRef.current.resume.trim(), categories: metaRef.current.categories,
        contenu: contenuTexteRef.current, ...colonnesSignature(signatureRef.current),
        couverture: couvertureRef.current || null,
        embleme: emblemeRef.current || null,
        verset_en_tete: versetEnTete ? JSON.stringify(versetEnTete) : null,
        updated_at: new Date().toISOString(),
      }
      const { error } = await supabase.from('essais').update(payload).eq('id', idRef.current!)
      if (!error) {
        derniereCleSauvegardeeRef.current = cle
        setCleEnregistree(cle)
        setTitreProvisoire(!titreSaisi)
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

  // Guillemets : on entoure la sélection (ou insère la paire). Français « … » avec
  // espaces fines insécables, anglais “ … ” pour une citation de second niveau.
  const entourerGuillemets = (avant: string, apres: string) => {
    restaurerSelection()
    const sel = window.getSelection()
    const texte = sel && sel.rangeCount ? sel.toString() : ''
    document.execCommand('insertText', false, `${avant}${texte}${apres}`)
    declencherChangement()
  }

  const ouvrirCreationNote = () => {
    memoriserSelection()
    noteCibleRef.current = null
    setEditionNote({ mode: 'creation' })
    setPanneau({ type: 'note', texte: '' })
  }

  const enregistrerNoteDepuisVolet = (texte: string) => {
    if (!texte.trim()) return
    if (!autoriserRetouche()) return
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
      insererHTML(`<span contenteditable="false" data-chip="${c.type}" data-id="${c.id}" data-label="${c.label}" style="display:inline-block;color:var(--cs-vert);text-decoration:underline;background:rgba(var(--cs-vert-rgb),0.07);padding:1px 5px;border-radius:4px;cursor:pointer;">${c.label}</span>&nbsp;`)
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
    // Verrouillé, les raccourcis de mise en forme ne passent pas (ils écrivent par
    // execCommand, qui n'émet pas de beforeinput) ; la frappe, elle, est arrêtée
    // par l'écoute de beforeinput.
    if (!retoucheAccepteeRef.current) {
      if ((e.ctrlKey || e.metaKey) && !e.altKey && !['c', 'a', 'f'].includes(e.key.toLowerCase())) {
        e.preventDefault()
        setAvertissement('retouche')
      }
      return
    }
    raccourcisEditeur(e, { apresChangement: declencherChangement, exposant: true })
  }

  // Le collage ne doit jamais importer de mise en forme extérieure (polices,
  // couleurs, tailles…) — on ne conserve que le texte brut.
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    if (!autoriserRetouche()) { e.preventDefault(); return }
    collageTexteBrut(e, declencherChangement)
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
    setMeta(prev => {
      const categories = prev.categories.includes(categorie)
        ? prev.categories.filter(c => c !== categorie)
        : [...prev.categories, categorie]
      // ⚠️ Décocher le registre qui portait l'emblème laisserait un choix orphelin,
      // que la lecture rattraperait en silence. On le remet à vide tout de suite,
      // pour que ce que montre le formulaire soit ce qui part en base.
      if (embleme && !categories.includes(embleme)) setEmbleme('')
      return { ...prev, categories }
    })
  }

  // Les manques, champ par champ. ⛔ Plus de série de fenêtres `alert()` : chaque
  // message se lit sous le champ qu'il concerne, et tous ensemble.
  const erreursSoumission: Partial<Record<ChampEnErreur, string>> = {}
  if (!userId) erreursSoumission.session = 'Vous devez être connecté pour soumettre une publication.'
  if (!meta.titre.trim()) erreursSoumission.titre = 'Le titre est obligatoire.'
  if (!resumeOk) erreursSoumission.resume = `Le résumé doit faire entre ${RESUME_MIN} et ${RESUME_MAX} caractères.`
  if (meta.categories.length === 0) erreursSoumission.categories = 'Choisissez au moins une catégorie.'
  // Plusieurs catégories : l’auteur désigne la principale, qui est écrite sur la
  // couverture et qui en donne l’emblème. Elle ne se devine pas.
  else if (meta.categories.length > 1 && !(embleme && meta.categories.includes(embleme))) erreursSoumission.principale = 'Choisissez la catégorie principale de votre publication.'
  if (nbCar < MIN_CARACTERES_PUBLICATION) erreursSoumission.texte = `Votre texte doit compter au moins ${MIN_CARACTERES_PUBLICATION.toLocaleString('fr')} caractères pour être soumis à publication.`
  else if (nbCar > MAX_CARACTERES) erreursSoumission.texte = `Votre texte dépasse la limite de ${MAX_CARACTERES.toLocaleString('fr')} caractères.`
  const erreursAffichees = tentativeSoumission ? erreursSoumission : {}
  const nbErreursAffichees = Object.keys(erreursAffichees).length

  const validerAvantSoumission = () => {
    setTentativeSoumission(true)
    return Object.keys(erreursSoumission).length === 0
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
      if (ok && idRef.current) partirVers(`/essais/${idRef.current}`)
      return
    }
    if (!validerAvantSoumission()) return
    const ok = await sauvegarder('en_attente')
    if (!ok) return
    if (idRef.current) partirVers(`/essais/${idRef.current}`)
  }

  // « Enregistrer comme brouillon » sur un essai en ligne le RETIRE de la lecture :
  // on le dit avant de le faire.
  const enregistrerBrouillon = () => {
    if (enLigne) { setAvertissement('brouillon'); return }
    void sauvegarder('brouillon')
  }

  const confirmerAvertissement = async () => {
    const raison = avertissement
    setAvertissement(null)
    if (raison === 'retouche') {
      setRetoucheAcceptee(true)
      retoucheAccepteeRef.current = true
      editableRef.current?.focus({ preventScroll: true })
    } else if (raison === 'brouillon') {
      setRetoucheAcceptee(true)
      retoucheAccepteeRef.current = true
      await sauvegarder('brouillon')
    } else if (raison === 'quitter') {
      const cible = departDemandeRef.current
      departDemandeRef.current = null
      if (cible === RETOUR_NAVIGATEUR) {
        // Retour du navigateur confirmé : on recule par-dessus la sentinelle reposée
        // ET l'entrée de l'éditeur. La sentinelle tombe d'abord, pour que le
        // `popstate` qui suit ne soit pas pris pour une nouvelle demande.
        setCleEnregistree(cleCourante)
        sentinelleRef.current = false
        window.history.go(-2)
      } else if (cible) {
        // La garde de sortie tombe avec la décision : on ne redemande pas.
        setCleEnregistree(cleCourante)
        partirVers(cible)
      }
    }
  }

  const diff = comparaisonOuverte ? diffMots(contenuOriginalRef.current, contenuTexte) : null

  if (mobile) {
    return (
      <main style={{ background: 'var(--cs-fond)', minHeight: 'calc(100dvh - 3.5rem)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 24px' }}>
        <div style={{ maxWidth: '32.5rem', textAlign: 'center', color: 'var(--cs-texte-second)', fontFamily: 'var(--font-source-sans), Arial, sans-serif' }}>
          <h1 style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: TITRE_CARTE, fontWeight: GRAISSE_TITRE, color: ENCRE_TITRE_CARTE, margin: '0 0 14px' }}>Écrire</h1>
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
    <main ref={mainRef} style={{ background: 'var(--cs-fond)', minHeight: 'calc(100dvh - 3.5rem)', paddingRight: '320px' }}>
      <style>{`
        /* La pastille de choix montre la couverture TELLE QU'ELLE PARAÎTRA : en Cuir
           le rayon est en reliures de cuir, et un nuancier vert y mentirait. */
        :root[data-theme="sombre"] .couv-pastille { background: var(--pastille-s) !important; }
        .editeur-essai h2,
        .editeur-essai h3,
        .editeur-essai p,
        .editeur-essai blockquote { margin: 0; }
        .editeur-essai h2 { font-family: var(--font-source-serif), Georgia, serif; font-weight: 600; font-size: 1.06em; line-height: 1.25; color: var(--cs-encre-fonce); }
        .editeur-essai h3 { font-family: var(--font-source-serif), Georgia, serif; font-style: italic; font-weight: 400; font-size: 1em; color: var(--cs-texte); }
        /* ⛔ La composition du corps vient du module compositionEssai, la MÊME écriture
           que la page de lecture, au lieu d'être recopiée ici. Elle n'était pas « calquée
           exactement » comme le disait ce commentaire : la sérialisation posait ses
           valeurs en clair, cette feuille les siennes, et le composeur une troisième
           série que les !important de la lecture écrasaient.
           ⚠️ Ces deux règles servent les blocs NUS que le navigateur fabrique sous la
           frappe : un retour à la ligne dans une zone éditable crée un paragraphe sans
           attribut de style, et sans elles il tomberait hors composition. */
        .editeur-essai p { ${enCss(PARAGRAPHE_ESSAI)} }
        .editeur-essai blockquote { ${enCss(CITATION_ESSAI)} }
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
        {enLigne && (
          <div role="note" style={{ marginLeft: '128px', marginBottom: '14px', background: 'var(--cs-fond-clair)', border: '1px solid var(--cs-bord)', borderLeft: '3px solid var(--cs-attente)', borderRadius: '8px', padding: '11px 14px', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <p style={{ flex: 1, margin: 0, fontSize: '0.75rem', lineHeight: 1.55, color: 'var(--cs-texte)' }}>
              {retoucheAcceptee
                ? 'Retouche en cours. Dès le premier enregistrement, l’essai quitte la lecture et repart en vérification jusqu’à sa validation.'
                : 'Cet essai est en ligne. Toute modification de son texte, de son titre ou de ses informations de publication le renverra en vérification, et il quittera la lecture jusqu’à sa validation.'}
            </p>
            {!retoucheAcceptee && (
              <button type="button" onClick={() => setAvertissement('retouche')}
                style={{ flexShrink: 0, fontSize: '0.71875rem', padding: '6px 12px', borderRadius: '4px', border: '1px solid var(--cs-bord)', background: 'var(--cs-surface)', color: 'var(--cs-texte-fort)', cursor: 'pointer' }}>
                Modifier l’essai
              </button>
            )}
          </div>
        )}

        {essaiExistant && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
            <button onClick={() => setComparaisonOuverte(v => !v)} style={{ fontSize: '0.6875rem', color: comparaisonOuverte ? 'var(--cs-sur-aplat)' : 'var(--cs-vert)', background: comparaisonOuverte ? 'var(--cs-vert-aplat)' : 'none', border: comparaisonOuverte ? 'none' : '1px solid var(--cs-vert)', borderRadius: '4px', padding: '4px 10px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {comparaisonOuverte ? 'Revenir à la rédaction' : 'Comparer avec la version d\u2019origine'}
            </button>
          </div>
        )}

        {comparaisonOuverte && diff ? (
          <div style={{ display: 'flex', gap: '20px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.06em', color: 'var(--cs-texte-second)', marginBottom: '8px' }}>VERSION D’ORIGINE</p>
              <div style={{ background: 'var(--cs-surface)', border: '1px solid var(--cs-bord-clair)', borderRadius: '8px', padding: '20px 22px', fontSize: '0.84375rem', lineHeight: 1.7, color: 'var(--cs-texte-fort)', whiteSpace: 'pre-wrap' }}>
                {diff.gauche.map((s, i) => s.type === 'supprime'
                  ? <span key={i} style={{ color: 'var(--cs-danger)', textDecoration: 'line-through' }}>{s.texte}</span>
                  : <span key={i}>{s.texte}</span>)}
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.06em', color: 'var(--cs-texte-second)', marginBottom: '8px' }}>VERSION MODIFIÉE</p>
              <div style={{ background: 'var(--cs-surface)', border: '1px solid var(--cs-bord-clair)', borderRadius: '8px', padding: '20px 22px', fontSize: '0.84375rem', lineHeight: 1.7, color: 'var(--cs-texte-fort)', whiteSpace: 'pre-wrap' }}>
                {diff.droite.map((s, i) => s.type === 'ajoute'
                  ? <span key={i} style={{ color: 'var(--cs-danger)', fontWeight: 600 }}>{s.texte}</span>
                  : <span key={i}>{s.texte}</span>)}
              </div>
            </div>
          </div>
        ) : (
          <>
            <div style={{ paddingLeft: '128px', marginBottom: '14px' }} onClickCapture={retenirClicSiVerrouille}>
              <div style={{ background: 'var(--cs-surface)', border: '1px solid var(--cs-bord-clair)', borderRadius: '8px', padding: '16px 18px 18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '18px', alignItems: 'flex-start', marginBottom: '14px' }}>
                  <div>
                    <p style={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--cs-vert)', margin: '0 0 4px' }}>
                      Informations de publication
                    </p>
                    <p style={{ fontSize: '0.6875rem', color: 'var(--cs-texte-gris)', margin: 0 }}>
                      Ces informations accompagnent le texte au moment de la soumission.
                    </p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontSize: '0.6875rem', color: carHorsLimite ? ROUGE_COMPTE : 'var(--cs-texte-second)', fontWeight: carHorsLimite ? 700 : 600, margin: 0, fontVariantNumeric: 'tabular-nums' }}>
                      {nbCar.toLocaleString('fr')} / {MAX_CARACTERES.toLocaleString('fr')} caractères
                    </p>
                    {nbCar < MIN_CARACTERES_PUBLICATION && !(modeAdmin && essaiExistant?.statut === 'publie') && (
                      <p style={{ fontSize: '0.6875rem', color: 'var(--cs-texte-gris)', margin: '3px 0 0' }}>
                        Publication possible à partir de {MIN_CARACTERES_PUBLICATION.toLocaleString('fr')} caractères
                      </p>
                    )}
                    {nbCar > MAX_CARACTERES && (
                      <p style={{ fontSize: '0.6875rem', color: ROUGE_COMPTE, margin: '3px 0 0' }}>
                        Limite dépassée
                      </p>
                    )}
                    {erreursAffichees.texte && <MessageChamp id="erreur-texte">{erreursAffichees.texte}</MessageChamp>}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--cs-texte-second)', textTransform: 'uppercase' }}>Titre *</label>
                    <input aria-label="Titre"
                      aria-invalid={!!erreursAffichees.titre}
                      aria-describedby={erreursAffichees.titre ? 'erreur-titre' : undefined}
                      value={meta.titre}
                      onChange={e => setMeta(prev => ({ ...prev, titre: e.target.value }))}
                      autoComplete="off"
                      placeholder="Titre"
                      style={{ width: '100%', fontSize: '1rem', fontFamily: 'var(--font-source-serif), Georgia, serif', padding: '7px 0 5px', border: 'none', borderBottom: `1px solid ${erreursAffichees.titre ? 'var(--cs-danger)' : 'var(--cs-bord)'}`, outline: 'none', color: 'var(--cs-encre-fonce)', background: 'transparent', boxSizing: 'border-box' }}
                    />
                    {erreursAffichees.titre && <MessageChamp id="erreur-titre">{erreursAffichees.titre}</MessageChamp>}
                  </div>
                  <div>
                    <label style={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--cs-texte-second)', textTransform: 'uppercase' }}>Sous-titre</label>
                    <input aria-label="Sous-titre"
                      value={meta.sousTitre}
                      onChange={e => setMeta(prev => ({ ...prev, sousTitre: e.target.value }))}
                      autoComplete="off"
                      placeholder="Sous-titre"
                      style={{ width: '100%', fontSize: '0.8125rem', padding: '8px 0 5px', border: 'none', borderBottom: '1px solid var(--cs-fond-doux)', outline: 'none', color: 'var(--cs-texte)', background: 'transparent', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px', marginBottom: '5px' }}>
                    <label style={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--cs-texte-second)', textTransform: 'uppercase' }}>Résumé *</label>
                    <span style={{ fontSize: '0.6875rem', color: meta.resume.length > 0 && !resumeOk ? ROUGE_COMPTE : 'var(--cs-texte-gris)', fontVariantNumeric: 'tabular-nums' }}>
                      {resumeLen.toLocaleString('fr')} / {RESUME_MAX.toLocaleString('fr')} caractères
                    </span>
                  </div>
                  <textarea aria-label="Résumé"
                    aria-invalid={!!erreursAffichees.resume}
                    aria-describedby={erreursAffichees.resume ? 'erreur-resume' : undefined}
                    value={meta.resume}
                    onChange={e => setMeta(prev => ({ ...prev, resume: e.target.value }))}
                    rows={3}
                    placeholder={`${RESUME_MIN} à ${RESUME_MAX} caractères présentant la publication`}
                    style={{ width: '100%', fontSize: '0.78125rem', padding: '7px 9px', border: `1px solid ${erreursAffichees.resume ? 'var(--cs-danger)' : 'var(--cs-bord)'}`, borderRadius: '4px', background: 'var(--cs-fond-clair)', color: 'var(--cs-texte-fort)', resize: 'vertical', outline: 'none', boxSizing: 'border-box', lineHeight: 1.5 }}
                  />
                  {erreursAffichees.resume && <MessageChamp id="erreur-resume">{erreursAffichees.resume}</MessageChamp>}
                </div>

                {/* Couverture : la publication se présente en petit livre sur la liste,
                    et l'auteur en choisit la couleur. Le résumé ci-dessus en est la
                    quatrième, qui se retourne au survol. */}
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px', marginBottom: '5px' }}>
                    <label style={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--cs-texte-second)', textTransform: 'uppercase' }}>Couverture</label>
                    <span style={{ fontSize: '0.6875rem', color: 'var(--cs-texte-gris)' }}>
                      {couverture ? couvertureDe(couverture).libelle : 'Au hasard'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                    {/* Première pastille : aucun choix, la couleur est tirée. */}
                    <button type="button" onClick={() => setCouverture('')}
                      title="Au hasard" aria-label="Couverture au hasard" aria-pressed={!couverture}
                      style={{
                        width: '1.5rem', height: '2.25rem', borderRadius: '4px', cursor: 'pointer', padding: 0,
                        background: 'repeating-linear-gradient(135deg, var(--cs-fond-doux) 0 4px, var(--cs-bord-clair) 4px 8px)',
                        border: !couverture ? '2px solid var(--cs-vert)' : '1px solid var(--cs-bord)',
                        boxShadow: !couverture ? '0 0 0 2px rgba(var(--cs-vert-rgb),0.18)' : 'none',
                      }} />
                    {COUVERTURES.map(c => {
                      const actif = c.cle === couverture
                      return (
                        <button key={c.cle} type="button" onClick={() => setCouverture(c.cle)}
                          title={c.libelle} aria-label={`Couverture ${c.libelle}`} aria-pressed={actif}
                          className="couv-pastille"
                          style={{
                            width: '1.5rem', height: '2.25rem', borderRadius: '4px', cursor: 'pointer',
                            '--pastille-s': c.fondSombre,
                            background: c.fond, padding: 0,
                            border: actif ? '2px solid var(--cs-vert)' : '1px solid var(--cs-bord)',
                            boxShadow: actif ? '0 0 0 2px rgba(var(--cs-vert-rgb),0.18)' : 'none',
                          } as React.CSSProperties} />
                      )
                    })}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--cs-texte-second)', textTransform: 'uppercase', display: 'block', marginBottom: '7px' }}>Catégories *</label>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {CATEGORIES_ESSAIS.map(categorie => {
                      const actif = meta.categories.includes(categorie)
                      return (
                        <button
                          key={categorie}
                          onClick={() => toggleCategorie(categorie)}
                          style={{ fontSize: '0.6875rem', padding: '4px 11px', borderRadius: '12px', cursor: 'pointer', border: `1px solid ${actif ? 'var(--cs-vert)' : 'var(--cs-bord)'}`, background: actif ? 'rgba(var(--cs-vert-rgb),0.10)' : 'var(--cs-surface)', color: actif ? 'var(--cs-vert)' : 'var(--cs-texte-gris)', fontWeight: actif ? 600 : 400 }}>
                          {categorie}
                        </button>
                      )
                    })}
                  </div>

                  {erreursAffichees.categories && <MessageChamp id="erreur-categories">{erreursAffichees.categories}</MessageChamp>}

                  {/* LA CATÉGORIE PRINCIPALE. Elle ne se demande qu'à partir de deux
                      catégories : sous deux, il n'y a rien à choisir. Elle est écrite
                      sur la couverture et en donne le fleuron (`essais.embleme`). */}
                  {meta.categories.length > 1 && (
                    <div style={{ marginTop: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px', marginBottom: '5px' }}>
                        <label style={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--cs-texte-second)', textTransform: 'uppercase' }}>Catégorie principale *</label>
                        <span style={{ fontSize: '0.6875rem', color: 'var(--cs-texte-second)' }}>
                          {embleme && meta.categories.includes(embleme) ? embleme : 'À choisir'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {meta.categories.map(categorie => {
                          const actif = embleme === categorie
                          return (
                            <button key={categorie} type="button"
                              onClick={() => setEmbleme(categorie)}
                              title={categorie} aria-label={`Catégorie principale : ${categorie}`} aria-pressed={actif}
                              style={{
                                height: '2.5rem', borderRadius: '4px', cursor: 'pointer', gap: '6px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px 10px 4px 6px',
                                fontSize: '0.75rem', fontWeight: actif ? 600 : 400,
                                background: 'var(--cs-fond-clair)', color: 'var(--cs-encre)',
                                border: actif ? '2px solid var(--cs-vert)' : '1px solid var(--cs-bord)',
                                boxShadow: actif ? '0 0 0 2px rgba(var(--cs-vert-rgb),0.18)' : 'none',
                              }}>
                              <FleuronGenre categorie={categorie} width="54" height="18" />
                              <span>{categorie}</span>
                            </button>
                          )
                        })}
                      </div>
                      {erreursAffichees.principale && <MessageChamp id="erreur-principale">{erreursAffichees.principale}</MessageChamp>}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Barre d'outils et zone de rédaction */}
            <div style={{ display: 'flex', gap: '20px', paddingLeft: '128px' }}>
              <div onClickCapture={retenirClicSiVerrouille} style={{
                position: 'fixed', top: '3.5rem', left: 0, width: '8rem', height: 'calc(100dvh - 3.5rem)',
                background: 'var(--cs-fond-clair)', borderRight: '1px solid var(--cs-bord)', padding: '20px 14px', overflowY: 'auto',
                zIndex: 50, display: 'flex', flexDirection: 'column', gap: '5px',
              }}>
                <button onMouseDown={e => e.preventDefault()} onClick={() => commande('bold')} style={{ ...BTN, fontWeight: 700 }} title="Gras (Ctrl+B)">Gras</button>
                <button onMouseDown={e => e.preventDefault()} onClick={() => commande('italic')} style={{ ...BTN, fontStyle: 'italic' }} title="Italique (Ctrl+I)">Italique</button>
                <button onMouseDown={e => e.preventDefault()} onClick={() => commande('superscript')} style={BTN} title="Exposant">Exposant</button>
                <button onMouseDown={e => e.preventDefault()} onClick={appliquerPetitesCaps} style={{ ...BTN, fontVariant: 'small-caps' }}>Petites caps</button>
                <button onMouseDown={e => e.preventDefault()} onClick={insererEspaceInsecable} style={BTN}>Espace insécable</button>
                <button onMouseDown={e => e.preventDefault()} onClick={() => entourerGuillemets('« ', ' »')} style={BTN} title="Guillemets français « … »">« »</button>
                <button onMouseDown={e => e.preventDefault()} onClick={() => entourerGuillemets('“', '”')} style={BTN} title="Guillemets anglais “ … ” (citation de second niveau)">“ ”</button>
                <div style={{ height: '1px', background: 'var(--cs-bord-clair)', margin: '4px 0' }} />
                <button onMouseDown={e => e.preventDefault()} onClick={() => appliquerBloc('H2')} style={{ ...BTN, background: blocActif === 'h2' ? 'var(--cs-vert-aplat)' : 'var(--cs-surface)', color: blocActif === 'h2' ? 'var(--cs-sur-aplat)' : 'var(--cs-texte-fort)' }}>Titre 1</button>
                <button onMouseDown={e => e.preventDefault()} onClick={() => appliquerBloc('H3')} style={{ ...BTN, background: blocActif === 'h3' ? 'var(--cs-vert-aplat)' : 'var(--cs-surface)', color: blocActif === 'h3' ? 'var(--cs-sur-aplat)' : 'var(--cs-texte-fort)' }}>Titre 2</button>
                <button onMouseDown={e => e.preventDefault()} onClick={() => appliquerBloc('BLOCKQUOTE')} style={{ ...BTN, background: blocActif === 'blockquote' ? 'var(--cs-vert-aplat)' : 'var(--cs-surface)', color: blocActif === 'blockquote' ? 'var(--cs-sur-aplat)' : 'var(--cs-texte-fort)' }}>Citation</button>
                <button onMouseDown={e => e.preventDefault()} onClick={appliquerParagraphe} style={{ ...BTN, background: blocActif === 'p' ? 'var(--cs-vert-aplat)' : 'var(--cs-surface)', color: blocActif === 'p' ? 'var(--cs-sur-aplat)' : 'var(--cs-texte-fort)' }}>Paragraphe</button>
                <div style={{ height: '1px', background: 'var(--cs-bord-clair)', margin: '4px 0' }} />
                <button onMouseDown={e => e.preventDefault()} onClick={ouvrirCreationNote} style={BTN}>+ Note</button>
                <button onMouseDown={e => { e.preventDefault(); memoriserSelection() }} onClick={() => setSelecteurOuvert(true)} style={BTN}>Citer depuis le site</button>
              </div>

              {/* Zone principale — en-tête fixe et zone éditable dans la même carte */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ border: '1px solid var(--cs-bord-clair)', borderRadius: '8px', background: 'var(--cs-surface)', overflow: 'hidden' }}>
                  {/* En-tête non modifiable — auteur, titre, sous-titre, catégories */}
                  <div style={{ textAlign: 'center', padding: '26px 24px 20px', borderBottom: '1px solid var(--cs-fond-doux)' }}>
                    <p style={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--cs-vert)', margin: '0 0 12px', fontFamily: "var(--font-source-sans), Arial, sans-serif" }}>
                      {nomAffiche}
                    </p>
                    <h1 style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: '1.5rem', fontWeight: 'normal', color: 'var(--cs-encre-fonce)', margin: '0 0 6px' }}>{meta.titre}</h1>
                    {meta.sousTitre && <p style={{ fontSize: '0.875rem', color: 'var(--cs-texte-gris)', fontStyle: 'italic', margin: '0 0 12px', fontFamily: "var(--font-source-serif), Georgia, serif" }}>{meta.sousTitre}</p>}
                    <div style={{ display: 'flex', gap: '5px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '8px' }}>
                      {meta.categories.map(c => (
                        <span key={c} style={{ fontSize: '0.6875rem', color: 'var(--cs-vert)', background: 'rgba(var(--cs-vert-rgb),0.08)', padding: '1px 8px', borderRadius: '8px', fontWeight: 600, fontFamily: "var(--font-source-sans), Arial, sans-serif" }}>{c}</span>
                      ))}
                    </div>
                  </div>

                  {/* Verset en tête — non modifiable */}
                  {versetEnTete && (
                    <div style={{ borderBottom: '1px solid var(--cs-fond-doux)', padding: '28px 40px 24px', textAlign: 'center', background: 'var(--cs-surface)' }}>
                      <p style={{ fontFamily: "var(--font-source-serif), Georgia, serif", fontSize: '0.875rem', lineHeight: 1.8, color: 'var(--cs-texte)', fontStyle: 'italic', margin: '0 0 10px', letterSpacing: '0.01em' }}>
                        {'« '}{rendreTexteEnrichi(versetEnTete.texte)}{' »'}
                      </p>
                      <p style={{ fontSize: '0.65625rem', letterSpacing: '0.1em', color: 'var(--cs-texte-second)', margin: 0, fontFamily: "var(--font-source-sans), Arial, sans-serif", textTransform: 'uppercase' }}>
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
                      background: 'var(--cs-surface)', color: 'var(--cs-texte-fort)',
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
          background: 'var(--cs-fond-clair)', borderTop: '1px solid var(--cs-bord)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 24px', gap: '12px',
        }}>
          {/* La ligne d'état dit ce qui est en base, et ce qui ne l'est pas encore.
              ⚠️ aria-live : elle change sans qu'on la regarde. */}
          <span aria-live="polite" style={{ fontSize: '0.6875rem', color: statutEnr === 'erreur' || nbErreursAffichees > 0 ? 'var(--cs-danger)' : nbCar > MAX_CARACTERES ? ROUGE_COMPTE : 'var(--cs-texte-second)', flexShrink: 1, minWidth: 0 }}>
            {statutEnr === 'enregistrement' ? 'Enregistrement…'
              : statutEnr === 'enregistre' ? 'Enregistré ✓'
              : statutEnr === 'erreur' ? 'Erreur d’enregistrement'
              : nbErreursAffichees > 0 ? (erreursAffichees.session ?? (nbErreursAffichees > 1 ? 'Des champs sont à compléter avant la soumission : ils sont signalés en rouge.' : 'Un champ est à compléter avant la soumission : il est signalé en rouge.'))
              : nbCar > MAX_CARACTERES ? `Limite dépassée (${nbCar.toLocaleString('fr')} / ${MAX_CARACTERES.toLocaleString('fr')} caractères)`
              : nonEnregistre && !contenuTexte.trim() ? 'Pas encore enregistré : commencez le texte pour qu’il s’enregistre.'
              : nonEnregistre ? 'Modifications non enregistrées'
              : titreProvisoire ? `Enregistré sous le titre provisoire « ${TITRE_PROVISOIRE} » : donnez-lui un titre.`
              : derniereSauvegardeAt ? `Enregistré à ${derniereSauvegardeAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} ✓`
              : ' '}
          </span>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {!(modeAdmin && essaiExistant?.statut === 'publie') && (
              <button
                onClick={enregistrerBrouillon}
                style={{ fontSize: '0.78125rem', padding: '7px 18px', borderRadius: '4px', border: '1px solid var(--cs-bord)', background: 'var(--cs-surface)', color: 'var(--cs-texte)', cursor: 'pointer' }}>
                Enregistrer comme brouillon
              </button>
            )}
            {/* En ligne et intact, il n'y a rien à soumettre : le bouton n'apparaît
                qu'une fois la retouche acceptée. */}
            {!(enLigne && !retoucheAcceptee) && (
              <button
                onClick={modeAdmin && essaiExistant?.statut === 'publie' ? publier : ouvrirConfirmationPublication}
                style={{ fontSize: '0.78125rem', padding: '7px 20px', borderRadius: '4px', border: 'none', background: 'var(--cs-vert-aplat)', color: 'var(--cs-sur-aplat)', cursor: 'pointer', fontWeight: 600 }}>
                {modeAdmin && essaiExistant?.statut === 'publie' ? 'Enregistrer les corrections' : enLigne ? 'Soumettre les corrections' : 'Soumettre la publication'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Modale de confirmation avant soumission ──────────────────────────────
          Rendue via un portail sur <body> : sans cela, un ancêtre transformé (l'éditeur
          en a) piège le `position: fixed` et la fenêtre n'est plus centrée sur la page.
          Resserrée et épurée. */}
      {confirmPublier && typeof document !== 'undefined' && createPortal(
        <div onClick={() => setConfirmPublier(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.34)', zIndex: Z_MODALE, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div ref={boiteConfirmPublier} role="dialog" aria-modal="true" onClick={e => e.stopPropagation()} style={{ background: 'var(--cs-surface)', borderRadius: '8px', padding: '20px 22px', maxWidth: '27.5rem', width: '100%', boxShadow: 'var(--cs-ombre-modale)' }}>
            <h3 style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '1rem', fontWeight: 'normal', color: 'var(--cs-encre-fonce)', margin: '0 0 8px' }}>
              Soumettre cette publication ?
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--cs-texte)', lineHeight: 1.5, margin: '0 0 4px' }}>
              Votre texte «&nbsp;<em style={{ color: 'var(--cs-texte)', fontStyle: 'italic' }}>{meta.titre}</em>&nbsp;» part en modération ; il reste figé tant qu&apos;il est en attente.
              {' '}{signature === 'anonyme' ? 'Il paraîtra sans nom d’auteur.' : `Il paraîtra signé ${nomAffiche}.`}
            </p>
            <div style={{ maxHeight: '170px', overflowY: 'auto', fontSize: '0.6875rem', color: 'var(--cs-texte-second)', lineHeight: 1.5, whiteSpace: 'pre-line', background: 'var(--cs-fond-clair)', border: '1px solid var(--cs-fond-doux)', borderRadius: '4px', padding: '9px 11px', margin: '10px 0' }}>
              {CONDITIONS}
            </div>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.71875rem', color: 'var(--cs-texte)', margin: '0 0 6px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={accepteConditions}
                onChange={e => { setAccepteConditions(e.target.checked); if (e.target.checked) setErreurConditions(null) }}
                style={{ marginTop: '2px', accentColor: 'var(--cs-vert)' }}
              />
              Je certifie respecter ces conditions de publication.
            </label>
            {erreurConditions && <p style={{ fontSize: '0.6875rem', color: 'var(--cs-danger)', margin: '0 0 8px' }}>{erreurConditions}</p>}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '12px' }}>
              <button
                onClick={() => { setConfirmPublier(false); setErreurConditions(null) }}
                style={{ fontSize: '0.75rem', padding: '7px 16px', borderRadius: '4px', border: '1px solid var(--cs-bord)', background: 'var(--cs-surface)', color: 'var(--cs-texte)', cursor: 'pointer' }}>
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
                style={{ fontSize: '0.75rem', padding: '7px 18px', borderRadius: '4px', border: 'none', background: 'var(--cs-vert-aplat)', color: 'var(--cs-sur-aplat)', cursor: 'pointer', fontWeight: 600 }}>
                Confirmer
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Avertissement : retouche d'un essai en ligne, brouillon, départ ──────
          Même dessin et même mécanique que la fenêtre de soumission (portail,
          Échap, foyer piégé). */}
      {avertissement && typeof document !== 'undefined' && createPortal(
        <div onClick={fermerAvertissement} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.34)', zIndex: Z_MODALE, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div ref={boiteAvertissement} role="dialog" aria-modal="true" aria-labelledby="titre-avertissement-essai" onClick={e => e.stopPropagation()} style={{ background: 'var(--cs-surface)', borderRadius: '8px', padding: '20px 22px', maxWidth: '27.5rem', width: '100%', boxShadow: 'var(--cs-ombre-modale)' }}>
            <h3 id="titre-avertissement-essai" style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '1rem', fontWeight: 'normal', color: 'var(--cs-encre-fonce)', margin: '0 0 8px' }}>
              {avertissement === 'retouche' ? 'Modifier un essai en ligne ?'
                : avertissement === 'brouillon' ? 'Remettre cet essai en brouillon ?'
                : 'Quitter sans enregistrer ?'}
            </h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--cs-texte)', lineHeight: 1.55, margin: 0 }}>
              {avertissement === 'retouche'
                ? 'Cet essai est publié. Dès la première modification enregistrée, il repartira en vérification et ne sera plus lisible par les autres lecteurs jusqu’à sa validation par la modération.'
                : avertissement === 'brouillon'
                  ? 'Enregistrer comme brouillon retire l’essai de la lecture. Il ne sera de nouveau visible qu’une fois republié, et toute modification de son contenu passera par la modération.'
                  : 'Certaines modifications ne sont pas encore enregistrées. Si vous quittez la page maintenant, elles seront perdues.'}
            </p>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button onClick={fermerAvertissement}
                style={{ fontSize: '0.75rem', padding: '7px 16px', borderRadius: '4px', border: '1px solid var(--cs-bord)', background: 'var(--cs-surface)', color: 'var(--cs-texte)', cursor: 'pointer' }}>
                {avertissement === 'quitter' ? 'Rester sur la page' : 'Annuler'}
              </button>
              <button onClick={() => { void confirmerAvertissement() }}
                style={{ fontSize: '0.75rem', padding: '7px 18px', borderRadius: '4px', border: avertissement === 'retouche' ? 'none' : '1px solid var(--cs-danger-bord)', background: avertissement === 'retouche' ? 'var(--cs-vert-aplat)' : 'var(--cs-danger-fond)', color: avertissement === 'retouche' ? 'var(--cs-sur-aplat)' : 'var(--cs-danger-fonce)', cursor: 'pointer', fontWeight: 600 }}>
                {avertissement === 'retouche' ? 'Modifier l’essai'
                  : avertissement === 'brouillon' ? 'Retirer et mettre en brouillon'
                  : 'Quitter sans enregistrer'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {selecteurOuvert && <SelecteurCitation onChoisir={inserrerCitation} onFermer={() => setSelecteurOuvert(false)} />}
      <VoletEssai element={panneau} onFermer={() => setPanneau(null)} toujoursVisible editionNote={editionNote ? { actif: true, mode: editionNote.mode } : undefined} onEnregistrerNote={enregistrerNoteDepuisVolet} enTete={
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {profil && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <p style={{ fontSize: '0.625rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--cs-texte-second)', margin: 0 }}>Signature</p>
              {choixSignature.map(c => (
                <label key={c.valeur} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', fontSize: '0.6875rem', color: 'var(--cs-texte-gris)', cursor: 'pointer', lineHeight: 1.4 }}>
                  <input type="radio" name="signature" value={c.valeur} checked={signature === c.valeur} onChange={() => setSignature(c.valeur)} style={{ marginTop: '2px' }} />
                  {c.libelle}
                </label>
              ))}
              {signature === 'nom_reel' && (
                <p style={{ fontSize: '0.6875rem', color: '#7a5a30', background: 'var(--cs-fond-clair)', border: '1px solid #e8d5a0', borderRadius: '4px', padding: '6px 9px', margin: 0, lineHeight: 1.55 }}>
                  Votre nom réel apparaîtra sur cet essai et sur votre profil public.
                </p>
              )}
              {signature === 'anonyme' && (
                <p style={{ fontSize: '0.6875rem', color: '#7a5a30', background: 'var(--cs-fond-clair)', border: '1px solid #e8d5a0', borderRadius: '4px', padding: '6px 9px', margin: 0, lineHeight: 1.55 }}>
                  Rien ne reliera cette publication à votre compte : ni la liste, ni la page, ni votre page publique ne porteront votre nom. Seule l’administration sait qui écrit, pour la modération.
                </p>
              )}
            </div>
          )}
        </div>
      } />
    </main>
  )
}

/** Le message qui accompagne un champ incomplet, sous lui. */
function MessageChamp({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <p id={id} role="alert" style={{ fontSize: '0.6875rem', color: 'var(--cs-danger)', margin: '4px 0 0', lineHeight: 1.45 }}>
      {children}
    </p>
  )
}
