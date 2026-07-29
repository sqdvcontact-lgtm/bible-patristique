'use client'

import React from 'react'
import { supabase } from '@/app/lib/supabase'
import { ABREV_FR } from '@/app/lib/bible'
import { hydraterLiensHerites } from '@/app/lib/liens'
import ModalLienBiblique, { type ChampLienBiblique, type VersetLienBiblique } from '@/app/components/ModalLienBiblique'
import { analyserCorpus, analyserPerso, RANGS, type Rang, type Verdict } from './controleQualite'
import type { Auteur } from './adminTypes'

type SegmentControle = {
  id: number
  id_oeuvre: string
  auteur?: string | null
  titre?: string | null
  user_id?: string | null
  segment_numero: number
  segment_texte: string | null
  ref_niv1: string | null
  ref_niv2: string | null
  ref_niv3: string | null
  ref_niv4: string | null
  ref_niv1_texte: string | null
  ref_niv2_texte: string | null
  ref_niv3_texte: string | null
  ref_niv4_texte: string | null
  lien_1: string | null
  lien_2: string | null
  lien_3: string | null
  lien_4: string | null
  fiabilite: string | null
  nature: string | null
  statut_controle?: NiveauControle | null
  notes?: string[] | null
  // Colonnes lues par la refonte du 24/07/2026 — les trois premières existaient déjà
  // en base et n'étaient affichées nulle part (2 046 `notes`, 14 `commentaire_ia`,
  // 623 `note_style`). Les deux dernières ont été créées pour cette refonte.
  commentaire_ia?: string | null
  note_style?: number | null
  controle_rang_manuel?: Rang | null
  controle_verifie?: boolean | null
}

type NiveauControle = Rang
// `statut_controle` (perso) portait « revoir » ; le rang s'appelle « moyen » depuis la
// refonte du 24/07/2026. On traduit à la lecture et à l'écriture plutôt que de migrer
// 623 lignes, l'ancien vocabulaire pouvant subsister dans d'autres outils.
const versRang = (v: string | null | undefined): Rang | null =>
  v === 'revoir' ? 'moyen' : v === 'bon' || v === 'moyen' || v === 'critique' ? v : null
const versStatutPerso = (r: Rang): string => (r === 'moyen' ? 'revoir' : r)

// UNE SEULE nature d'apparat dans tout le code : `apparat_critique` (celle que lit la vue
// Apparat de la page œuvre et que valide l'import). L'ancien `apparat` y est ramené à
// l'affichage ; les rares lignes encore en `apparat` en base seront basculées à la
// prochaine modification (une migration Supabase reste souhaitable pour les uniformiser).
const canonNature = (n: string | null | undefined): string => (n === 'apparat' ? 'apparat_critique' : (n ?? 'texte'))
const LIBELLE_NATURE: Record<string, string> = {
  texte: 'Texte', titre: 'Titre', introduction: 'Introduction',
  apparat_critique: 'Apparat critique', separateur: 'Séparateur', citation: 'Citation', note: 'Note',
}
type SegmentAfficheControle = { segment: SegmentControle; contexte?: boolean }
type ChampLien = ChampLienBiblique
type LienBibliqueControle = { champ: ChampLien; id: string }
type VersetLieControle = { ref: string; texte: string }
type ModeControle = 'corpus' | 'perso'
type OeuvreControle = { id_oeuvre: string; auteur: string | null; titre: string }
type LigneOeuvrePerso = {
  id: number
  id_oeuvre: string
  user_id: string
  auteur: string | null
  titre: string
  segment_numero: number
  segment_texte: string | null
  ref_niv1: string | null
  ref_niv2: string | null
  ref_niv3: string | null
  ref_niv4: string | null
  nature: string | null
  statut_controle: string | null
  notes: string[] | null
  note_style: number | null
  controle_rang_manuel: Rang | null
  controle_verifie: boolean | null
}
type VersetSupabaseControle = {
  id_verset: string
  ref: string | null
  livre: string | null
  chapitre: number | null
  verset: number | null
  TR0001: string | null
}

const CARACTERES_PAR_PAGE_CONTROLE = 9000
const SEUIL_TITRE_COLOPHON_CONTROLE = 86
const NBSP_TITRE_COLOPHON_CONTROLE = '\u00A0'

const COULEURS = RANGS

function refsSegment(s: SegmentControle) {
  return [s.ref_niv1, s.ref_niv2, s.ref_niv3, s.ref_niv4].filter(Boolean).join(', ')
}

function decouperTitreColophonControle(texte: string) {
  const mots = texte.trim().split(/\s+/).filter(Boolean)
  if (mots.length <= 1) return [texte.trim()]
  const total = mots.reduce((s, mot) => s + mot.length, 0) + mots.length - 1
  const nbLignes = Math.min(7, Math.max(4, Math.round(total / 34)))
  const haut = Math.min(72, Math.max(46, Math.round(total * 0.36)))
  const bas = Math.max(12, Math.round(haut * 0.22))
  const cibles = Array.from({ length: nbLignes }, (_, i) => {
    const t = nbLignes === 1 ? 0 : i / (nbLignes - 1)
    return Math.round(haut - (haut - bas) * Math.pow(t, 1.18))
  })
  const longueurs = Array.from({ length: mots.length }, () => Array(mots.length + 1).fill(0))
  for (let i = 0; i < mots.length; i += 1) {
    let longueur = 0
    for (let j = i + 1; j <= mots.length; j += 1) {
      longueur += mots[j - 1].length + (j === i + 1 ? 0 : 1)
      longueurs[i][j] = longueur
    }
  }
  const memo = new Map<string, { cout: number; coupes: number[] }>()
  const chercher = (depart: number, ligne: number, precedente: number): { cout: number; coupes: number[] } => {
    const cle = `${depart}-${ligne}-${precedente}`
    const deja = memo.get(cle)
    if (deja) return deja
    const restantes = nbLignes - ligne
    if (restantes === 1) {
      const longueur = longueurs[depart][mots.length]
      const cible = cibles[ligne]
      const violation = Math.max(0, longueur - precedente + 2)
      const cout = Math.pow(longueur - cible, 2) + violation * violation * 1.7
      const resultat = { cout, coupes: [mots.length] }
      memo.set(cle, resultat)
      return resultat
    }
    let meilleur = { cout: Number.POSITIVE_INFINITY, coupes: [] as number[] }
    const minFin = depart + 1
    const maxFin = mots.length - restantes + 1
    for (let fin = minFin; fin <= maxFin; fin += 1) {
      const longueur = longueurs[depart][fin]
      if (ligne > 0 && longueur > precedente + 4) continue
      const cible = cibles[ligne]
      const motFin = mots[fin - 1] ?? ''
      const bonusPonctuation = /[;:.!?»)]$/.test(motFin) ? -48 : /[,]$/.test(motFin) ? -20 : 0
      const penaliteDebutCourt = ligne < 2 && longueur < cible * 0.72 ? 160 : 0
      const pente = Math.max(0, longueur - precedente + 2)
      const suite = chercher(fin, ligne + 1, longueur)
      const cout = Math.pow(longueur - cible, 2) + pente * pente * 2 + penaliteDebutCourt + bonusPonctuation + suite.cout
      if (cout < meilleur.cout) meilleur = { cout, coupes: [fin, ...suite.coupes] }
    }
    memo.set(cle, meilleur)
    return meilleur
  }
  const coupes = chercher(0, 0, 999).coupes
  let depart = 0
  return coupes.map(fin => {
    const ligne = mots.slice(depart, fin).join(' ')
    depart = fin
    return ligne
  }).filter(Boolean)
}

function preparerTitreColophonControle(texte: string) {
  return texte
    .trim()
    .replace(/\s+([;:!?»])/g, `${NBSP_TITRE_COLOPHON_CONTROLE}$1`)
    .replace(/([«])\s+/g, `$1${NBSP_TITRE_COLOPHON_CONTROLE}`)
    .replace(/\s+([,.])/g, '$1')
}

function titreCompatibleColophonControle(texte: string) {
  const phrases = texte.split(/[.!?]/).map(p => p.trim()).filter(Boolean)
  if (phrases.length > 2) return false
  if ((texte.match(/[—–-]/g) ?? []).length > 1) return false
  if (texte.length > 165) return false
  return true
}

function rendreTitreColophonControle(texte: string) {
  const propre = preparerTitreColophonControle(texte)
  if (propre.length < SEUIL_TITRE_COLOPHON_CONTROLE || !titreCompatibleColophonControle(propre)) return propre
  const lignes = decouperTitreColophonControle(propre)
  const largeurs = lignes.map((_, index) => {
    const t = lignes.length === 1 ? 0 : index / (lignes.length - 1)
    return `${Math.round(96 - 54 * Math.pow(t, 1.08))}%`
  })
  return (
    <span className="titre-colophon" style={{ display: 'block', maxWidth: '38.125rem', margin: '0 auto', textAlign: 'center', lineHeight: 1.24, wordSpacing: '-0.04em', letterSpacing: '-0.004em' }}>
      {lignes.map((ligne, index) => (
        <span key={`${ligne}-${index}`} style={{ display: 'block', width: largeurs[index] ?? '42%', margin: '0 auto' }}>
          {ligne}
        </span>
      ))}
    </span>
  )
}

function liensSegment(s: SegmentControle) {
  return liensSegmentDetails(s).map(l => l.id)
}

function liensSegmentDetails(s: SegmentControle): LienBibliqueControle[] {
  return (['lien_1', 'lien_2', 'lien_3', 'lien_4'] as const).flatMap(champ =>
    (s[champ] ?? '')
      .split(';')
      .map(v => v.trim())
      .filter(Boolean)
      .map(id => ({ champ, id }))
  )
}

function valeurLiensSegment(s: SegmentControle, champ: ChampLien) {
  return (s[champ] ?? '')
    .split(';')
    .map(v => v.trim())
    .filter(Boolean)
}

// Le diagnostic vit désormais dans `controleQualite.ts`. Celui qu'il remplace, le
// 24/07/2026, était une douzaine d'expressions régulières concluant toujours par
// « Aucun problème évident détecté » — une boîte jamais vide, donc sans valeur — et
// son niveau ne dérivait d'aucun score.

function titreCourt(auteurs: Auteur[], idOeuvre: string) {
  for (const auteur of auteurs) {
    const oeuvre = auteur.oeuvres.find(o => o.id_oeuvre === idOeuvre)
    if (oeuvre) return `${auteur.nom} — ${oeuvre.titre}`
  }
  return idOeuvre
}

function titreCourtControle(auteurs: Auteur[], idOeuvre: string, mode: ModeControle, oeuvresPerso: OeuvreControle[]) {
  if (mode === 'perso') {
    const oeuvre = oeuvresPerso.find(o => o.id_oeuvre === idOeuvre)
    return oeuvre ? `${oeuvre.auteur ? `${oeuvre.auteur} — ` : ''}${oeuvre.titre}` : 'Œuvre personnelle'
  }
  return titreCourt(auteurs, idOeuvre)
}

function normaliserRecherche(valeur: string) {
  return valeur
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

type StatLiens = { nb_liens: number; derniere_maj: string | null }

function formaterDateLiens(iso: string | null) {
  if (!iso) return null
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function refBibliqueFr(ref: string, fallback = ref) {
  const brut = (ref || fallback || '').trim()
  const match = brut.match(/^([1-3]?[A-Z]{2,3})[\s._-]+(\d+)(?::|[._-])?(\d+)?$/i)
  if (!match) return brut
  const code = match[1].toUpperCase()
  const chapitre = String(Number(match[2]))
  const verset = match[3] ? String(Number(match[3])) : ''
  const abr = ABREV_FR[code] ?? code
  return verset ? `${abr} ${chapitre}, ${verset}` : `${abr} ${chapitre}`
}

export default function SectionControleOeuvres({ auteurs }: { auteurs: Auteur[] }) {
  const toutesOeuvres = React.useMemo(() => auteurs.flatMap(a => a.oeuvres.map(o => ({ ...o, auteur: a.nom }))).sort((a, b) => `${a.auteur} ${a.titre}`.localeCompare(`${b.auteur} ${b.titre}`, 'fr')), [auteurs])
  const [modeControle, setModeControle] = React.useState<ModeControle>('corpus')
  const [oeuvresPerso, setOeuvresPerso] = React.useState<OeuvreControle[]>([])
  const [statsLiens, setStatsLiens] = React.useState<Map<string, StatLiens>>(new Map())
  // Rangs agrégés par œuvre (corpus), pour colorer la liste d'accueil : rouge si ≥1
  // critique, jaune si ≥1 moyen sans critique, vert sinon. Calculé côté client (le rang
  // vient de `analyserCorpus`, non stocké en base) — voir la note plus bas.
  const [rangsParOeuvre, setRangsParOeuvre] = React.useState<Map<string, { critique: number; moyen: number }>>(new Map())
  const [chargementRangs, setChargementRangs] = React.useState(false)
  const [idOeuvre, setIdOeuvre] = React.useState('')
  const [segments, setSegments] = React.useState<SegmentControle[]>([])
  const [chargement, setChargement] = React.useState(false)
  const [erreur, setErreur] = React.useState<string | null>(null)
  const [segmentActif, setSegmentActif] = React.useState<number | null>(null)
  const [filtre, setFiltre] = React.useState<NiveauControle | 'tous'>('tous')
  const [rechercheOeuvre, setRechercheOeuvre] = React.useState('')
  const [editionTexte, setEditionTexte] = React.useState('')
  // L'édition se fait DANS le bloc de texte, au crayon (le volet de droite n'a plus de
  // bouton « Modifier »). On retient donc quel segment est ouvert à l'édition.
  const [editionSegmentId, setEditionSegmentId] = React.useState<number | null>(null)
  const [statutAction, setStatutAction] = React.useState<'idle' | 'envoi' | 'erreur'>('idle')
  const [versetsLies, setVersetsLies] = React.useState<Record<string, VersetLieControle>>({})
  const [modaleLienOuverte, setModaleLienOuverte] = React.useState(false)

  const oeuvresRecherche = React.useMemo<OeuvreControle[]>(() => (
    modeControle === 'perso'
      ? oeuvresPerso
      : toutesOeuvres.map(o => ({ id_oeuvre: o.id_oeuvre, auteur: o.auteur ?? null, titre: o.titre }))
  ), [modeControle, oeuvresPerso, toutesOeuvres])

  const libelleOeuvre = React.useCallback((oeuvre: OeuvreControle) => `${oeuvre.auteur ? `${oeuvre.auteur} — ` : ''}${oeuvre.titre}`, [])

  const choisirOeuvreDepuisRecherche = React.useCallback((valeur: string) => {
    const recherche = normaliserRecherche(valeur)
    if (!recherche) return
    const exacte = oeuvresRecherche.find(o => normaliserRecherche(libelleOeuvre(o)) === recherche)
    const partielle = oeuvresRecherche.find(o => {
      const auteur = normaliserRecherche(o.auteur ?? '')
      const titre = normaliserRecherche(o.titre ?? '')
      const complet = normaliserRecherche(libelleOeuvre(o))
      return auteur.includes(recherche) || titre.includes(recherche) || complet.includes(recherche)
    })
    const choisie = exacte ?? partielle
    if (choisie) {
      setIdOeuvre(choisie.id_oeuvre)
      setRechercheOeuvre('')
    }
  }, [libelleOeuvre, oeuvresRecherche])

  // Agrégats de liens par œuvre (vue `oeuvres_liens_stats`) : combien, et quand
  // modifiés pour la dernière fois. Une seule requête pour toute la liste d'accueil.
  React.useEffect(() => {
    if (modeControle !== 'corpus') return
    let annule = false
    supabase
      .from('oeuvres_liens_stats')
      .select('id_oeuvre,nb_liens,derniere_maj')
      .then(({ data }) => {
        if (annule) return
        const map = new Map<string, StatLiens>()
        ;((data ?? []) as { id_oeuvre: string; nb_liens: number; derniere_maj: string | null }[])
          .forEach(r => map.set(r.id_oeuvre, { nb_liens: r.nb_liens, derniere_maj: r.derniere_maj }))
        setStatsLiens(map)
      })
    return () => { annule = true }
  }, [modeControle])

  // Rangs par œuvre (corpus) pour la coloration de l'accueil. Le calcul est fait EN BASE par
  // la vue `oeuvres_controle_stats` (elle porte les signaux les plus lourds d'analyserCorpus
  // et respecte le rang manuel) : UNE requête, au lieu de parcourir ~120 000 segments côté
  // client. Le détail fin par segment reste calculé en JS pour l'œuvre ouverte.
  React.useEffect(() => {
    if (modeControle !== 'corpus') return
    let annule = false
    setChargementRangs(true)
    ;(async () => {
      const { data } = await supabase.from('oeuvres_controle_stats').select('id_oeuvre, critique, moyen')
      if (annule) return
      const compte = new Map<string, { critique: number; moyen: number }>()
      ;((data ?? []) as any[]).forEach(r => {
        if (r.critique || r.moyen) compte.set(r.id_oeuvre, { critique: r.critique ?? 0, moyen: r.moyen ?? 0 })
      })
      setRangsParOeuvre(compte)
      setChargementRangs(false)
    })()
    return () => { annule = true }
  }, [modeControle])

  React.useEffect(() => {
    if (modeControle !== 'corpus') return
    const params = new URLSearchParams(window.location.search)
    const depuisUrl = params.get('id_oeuvre')
    // On s'ouvre sur la LISTE des œuvres (idOeuvre vide), sauf si l'URL en désigne une.
    setIdOeuvre(depuisUrl || '')
  }, [modeControle, toutesOeuvres])

  React.useEffect(() => {
    if (modeControle !== 'perso') return
    let annule = false
    supabase
      .from('oeuvres_personnelles_segments')
      .select('id_oeuvre,auteur,titre')
      .order('titre')
      .then(({ data }) => {
        if (annule) return
        const map = new Map<string, OeuvreControle>()
        ;((data ?? []) as OeuvreControle[]).forEach(o => {
          if (!map.has(o.id_oeuvre)) map.set(o.id_oeuvre, { id_oeuvre: o.id_oeuvre, auteur: o.auteur ?? null, titre: o.titre })
        })
        const liste = [...map.values()]
        setOeuvresPerso(liste)
        setIdOeuvre('')
      })
    return () => { annule = true }
  }, [modeControle])

  React.useEffect(() => {
    if (!idOeuvre) return
    const params = new URLSearchParams(window.location.search)
    params.set('onglet', 'controle-oeuvres')
    params.set('id_oeuvre', idOeuvre)
    params.set('mode', modeControle)
    window.history.replaceState(null, '', `/admin?${params.toString()}`)
  }, [idOeuvre, modeControle])

  // Le rang forcé et le drapeau « vérifié » vont EN BASE. Ils vivaient jusqu'au
  // 24/07/2026 dans `localStorage`, donc perdus d'un navigateur à l'autre et invisibles
  // à tout autre outil. Forcer un rang vaut vérification humaine : les deux vont
  // ensemble, en une seule écriture.
  const table = modeControle === 'perso' ? 'oeuvres_personnelles_segments' : 'segments'

  const changerRangManuel = async (idSegment: number, rang: Rang | 'auto') => {
    const forcé = rang === 'auto' ? null : rang
    const maintenant = forcé ? new Date().toISOString() : null
    setSegments(prev => prev.map(s => s.id === idSegment
      ? { ...s, controle_rang_manuel: forcé, controle_verifie: !!forcé, statut_controle: forcé ?? s.statut_controle }
      : s))
    setStatutAction('envoi')
    const charge: Record<string, unknown> = {
      controle_rang_manuel: forcé,
      controle_verifie: !!forcé,
      controle_verifie_le: maintenant,
    }
    // En mode perso, `statut_controle` reste la colonne historique : on la tient à jour
    // dans son ancien vocabulaire pour ne pas casser ce qui la lit ailleurs.
    if (modeControle === 'perso' && forcé) charge.statut_controle = versStatutPerso(forcé)
    const { error } = await supabase.from(table).update(charge).eq('id', idSegment)
    setStatutAction(error ? 'erreur' : 'idle')
  }

  const changerNature = async (idSegment: number, valeur: string) => {
    setSegments(prev => prev.map(s => s.id === idSegment ? { ...s, nature: valeur } : s))
    setStatutAction('envoi')
    const { error } = await supabase.from(table).update({ nature: valeur }).eq('id', idSegment)
    setStatutAction(error ? 'erreur' : 'idle')
  }

  const enregistrerSegment = async () => {
    if (!actif) return
    setStatutAction('envoi')
    if (modeControle === 'perso') {
      const { error } = await supabase.from('oeuvres_personnelles_segments').update({ segment_texte: editionTexte }).eq('id', actif.id)
      if (error) {
        setStatutAction('erreur')
        return
      }
      setSegments(prev => prev.map(s => s.id === actif.id ? { ...s, segment_texte: editionTexte } : s))
      setEditionSegmentId(null)
      setStatutAction('idle')
      return
    }
    const res = await fetch('/api/admin/segment-modifier', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: actif.id, segment_texte: editionTexte }),
    })
    if (!res.ok) {
      setStatutAction('erreur')
      return
    }
    setSegments(prev => prev.map(s => s.id === actif.id ? { ...s, segment_texte: editionTexte } : s))
    setEditionSegmentId(null)
    setStatutAction('idle')
  }

  const supprimerSegment = async () => {
    if (!actif) return
    if (!window.confirm(`Supprimer le segment ${actif.segment_numero} ?`)) return
    setStatutAction('envoi')
    const numeroSupprime = actif.segment_numero
    const index = segments.findIndex(s => s.id === actif.id)
    const prochain = segments[index + 1] ?? segments[index - 1] ?? null
    if (modeControle === 'perso') {
      const { error } = await supabase.from('oeuvres_personnelles_segments').delete().eq('id', actif.id)
      if (error) {
        setStatutAction('erreur')
        return
      }
      const suivants = segments.filter(s => s.id !== actif.id && s.segment_numero > numeroSupprime)
      await Promise.all(suivants.map(s => supabase.from('oeuvres_personnelles_segments').update({ segment_numero: s.segment_numero - 1 }).eq('id', s.id)))
      setSegments(prev => prev
        .filter(s => s.id !== actif.id)
        .map(s => s.segment_numero > numeroSupprime ? { ...s, segment_numero: s.segment_numero - 1 } : s))
      setSegmentActif(prochain?.id ?? null)
      setEditionSegmentId(null)
      setStatutAction('idle')
      return
    }
    const res = await fetch('/api/admin/segment-supprimer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: actif.id }),
    })
    if (!res.ok) {
      setStatutAction('erreur')
      return
    }
    setSegments(prev => prev
      .filter(s => s.id !== actif.id)
      .map(s => s.segment_numero > numeroSupprime ? { ...s, segment_numero: s.segment_numero - 1 } : s))
    setSegmentActif(prochain?.id ?? null)
    setEditionSegmentId(null)
    setStatutAction('idle')
  }

  const mettreAJourLiens = async (idSegment: number, champ: ChampLien, ids: string[]) => {
    setStatutAction('envoi')
    const valeur = ids.join('; ')
    const res = await fetch('/api/admin/segment-liens', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: idSegment, champ, valeur }),
    })
    if (!res.ok) {
      setStatutAction('erreur')
      return false
    }
    setSegments(prev => prev.map(s => s.id === idSegment ? { ...s, [champ]: valeur || null } : s))
    setStatutAction('idle')
    return true
  }

  const ajouterLienBiblique = () => {
    if (!actif) return
    setModaleLienOuverte(true)
  }

  const confirmerLienBiblique = async (champ: ChampLien, versets: VersetLienBiblique[]) => {
    if (!actif) return
    const ids = valeurLiensSegment(actif, champ)
    const nouveaux = versets.map(v => v.id).filter(id => !ids.includes(id))
    if (nouveaux.length === 0) return
    const ok = await mettreAJourLiens(actif.id, champ, [...ids, ...nouveaux])
    if (!ok) return
    const ajout: Record<string, VersetLieControle> = {}
    versets.forEach(v => {
      ajout[v.id] = { ref: v.label, texte: v.texte }
    })
    setVersetsLies(prev => ({ ...prev, ...ajout }))
    setModaleLienOuverte(false)
  }

  const supprimerLienBiblique = async (lien: LienBibliqueControle) => {
    if (!actif) return
    await mettreAJourLiens(actif.id, lien.champ, valeurLiensSegment(actif, lien.champ).filter(id => id !== lien.id))
  }

  // Les notes vont dans la colonne `notes` des deux tables. Le corpus les écrivait dans
  // `localStorage` alors que 2 046 lignes de `segments.notes` existaient déjà en base et
  // n'étaient jamais lues — c'était le cœur du « ça ne fonctionne pas ».
  const sauverNotes = async (notes: string[]) => {
    if (!actif) return
    setSegments(prev => prev.map(s => s.id === actif.id ? { ...s, notes } : s))
    setStatutAction('envoi')
    const { error } = await supabase.from(table).update({ notes }).eq('id', actif.id)
    setStatutAction(error ? 'erreur' : 'idle')
  }

  const ajouterNote = () => {
    if (!actif) return
    const note = window.prompt('Nouvelle note de contrôle :')
    if (!note?.trim()) return
    sauverNotes([...(actif.notes ?? []), note.trim()])
  }

  const supprimerNote = (index: number) => {
    if (!actif) return
    const notes = [...(actif.notes ?? [])]
    notes.splice(index, 1)
    sauverNotes(notes)
  }


  const ajouterTextePersonnel = async () => {
    const titre = window.prompt('Titre du texte personnel :')
    if (!titre?.trim()) return
    const auteur = window.prompt('Auteur ou signature :', '') ?? ''
    const texte = window.prompt('Collez le texte à relire. Les paragraphes séparés seront transformés en segments :')
    if (!texte?.trim()) return
    const { data: userData } = await supabase.auth.getUser()
    const userId = userData.user?.id
    if (!userId) {
      window.alert('Connectez-vous avant d’ajouter un texte personnel.')
      return
    }
    const idPerso = `PERSO-${Date.now()}`
    const paragraphes = texte
      .split(/\n\s*\n/g)
      .map(p => p.trim())
      .filter(Boolean)
    const lignes = paragraphes.map((segment_texte, i) => ({
      user_id: userId,
      id_oeuvre: idPerso,
      auteur: auteur.trim() || null,
      titre: titre.trim(),
      segment_numero: i + 1,
      segment_texte,
      ref_niv1: titre.trim(),
      nature: 'texte',
      statut_controle: 'bon',
    }))
    const { error } = await supabase.from('oeuvres_personnelles_segments').insert(lignes)
    if (error) {
      window.alert(error.message)
      return
    }
    const nouvelle = { id_oeuvre: idPerso, auteur: auteur.trim() || null, titre: titre.trim() }
    setOeuvresPerso(prev => [...prev, nouvelle].sort((a, b) => a.titre.localeCompare(b.titre, 'fr')))
    setModeControle('perso')
    setIdOeuvre(idPerso)
  }

  React.useEffect(() => {
    if (!idOeuvre) return
    let annule = false
    const charger = async () => {
      setChargement(true)
      setErreur(null)
      if (modeControle === 'perso') {
        const { data, error } = await supabase
          .from('oeuvres_personnelles_segments')
          .select('id,id_oeuvre,user_id,auteur,titre,segment_numero,segment_texte,ref_niv1,ref_niv2,ref_niv3,ref_niv4,nature,statut_controle,notes,note_style,controle_rang_manuel,controle_verifie')
          .eq('id_oeuvre', idOeuvre)
          .order('segment_numero')
        if (error) {
          if (!annule) {
            setErreur(error.message)
            setChargement(false)
          }
          return
        }
        const lignes = ((data ?? []) as LigneOeuvrePerso[]).map(s => ({
          id: s.id,
          id_oeuvre: s.id_oeuvre,
          user_id: s.user_id,
          auteur: s.auteur,
          titre: s.titre,
          segment_numero: s.segment_numero,
          segment_texte: s.segment_texte,
          ref_niv1: s.ref_niv1 ?? s.titre,
          ref_niv2: s.ref_niv2,
          ref_niv3: s.ref_niv3,
          ref_niv4: s.ref_niv4,
          ref_niv1_texte: null,
          ref_niv2_texte: null,
          ref_niv3_texte: null,
          ref_niv4_texte: null,
          lien_1: null,
          lien_2: null,
          lien_3: null,
          lien_4: null,
          fiabilite: null,
          nature: s.nature ?? 'texte',
          statut_controle: versRang(s.statut_controle),
          notes: s.notes ?? [],
          note_style: s.note_style,
          controle_rang_manuel: s.controle_rang_manuel,
          controle_verifie: s.controle_verifie ?? false,
        })) as SegmentControle[]
        if (!annule) {
          setSegments(lignes)
          setSegmentActif(lignes[0]?.id ?? null)
          setChargement(false)
        }
        return
      }
      let lignes: SegmentControle[] = []
      let from = 0
      while (true) {
        const { data, error } = await supabase
          .from('segments')
          .select('id,id_oeuvre,segment_numero,segment_texte,ref_niv1,ref_niv2,ref_niv3,ref_niv4,ref_niv1_texte,ref_niv2_texte,ref_niv3_texte,ref_niv4_texte,lien_1,lien_2,lien_3,lien_4,fiabilite,nature,notes,commentaire_ia,controle_rang_manuel,controle_verifie')
          .eq('id_oeuvre', idOeuvre)
          .order('segment_numero')
          .range(from, from + 999)
        if (error) {
          if (!annule) setErreur(error.message)
          break
        }
        const batch = (data ?? []) as SegmentControle[]
        lignes = lignes.concat(batch)
        if (batch.length < 1000) break
        from += 1000
      }
      // Les liens vivent dans `liens_bibliques` depuis le 20 juillet 2026 (§24.1) :
      // `segments.lien_1` à `lien_4` subsistent mais sont VIDES, si bien que cette
      // section n'affichait plus aucun lien — sans la moindre erreur. Le §24.5 prévoit
      // exactement ce cas : `hydraterLiensHerites` reconstitue ces colonnes en mémoire
      // pour les écrans anciens. Un seul appel les remet en service.
      try { await hydraterLiensHerites(lignes as unknown as { id: number }[]) } catch { /* liens indisponibles : l'écran reste utilisable sans eux */ }
      if (!annule) {
        setSegments(lignes)
        setSegmentActif(lignes[0]?.id ?? null)
        setChargement(false)
      }
    }
    charger()
    return () => { annule = true }
  }, [idOeuvre, modeControle])

  const verdicts = React.useMemo(() => {
    const map = new Map<number, Verdict>()
    segments.forEach(s => {
      const auto = modeControle === 'perso' ? analyserPerso(s) : analyserCorpus(s)
      // Le rang forcé à la main prime, mais le SCORE reste celui de l'analyse : on
      // corrige le jugement, pas la mesure — et l'écart entre les deux se voit.
      const force = s.controle_rang_manuel ?? null
      map.set(s.id, force ? { ...auto, rang: force } : auto)
    })
    return map
  }, [segments, modeControle])
  const stats = React.useMemo(() => {
    const out: Record<Rang, number> = { bon: 0, moyen: 0, critique: 0 }
    verdicts.forEach(v => { out[v.rang] += 1 })
    return out
  }, [verdicts])
  // Natures déjà présentes dans l'œuvre : alimentent le menu déroulant « Nature ».
  // On peut reclasser un segment dans N'IMPORTE lequel des niveaux existants (pas seulement
  // ceux déjà présents dans l'œuvre) : on part d'une liste canonique, complétée des natures
  // effectivement rencontrées. UNE SEULE nature d'apparat : `apparat_critique` (celle que
  // lit la vue Apparat de la page œuvre) ; l'ancien `apparat` y est ramené.
  const NATURES_CANONIQUES = ['texte', 'titre', 'introduction', 'apparat_critique', 'separateur', 'citation', 'note']
  const naturesDisponibles = React.useMemo(() => {
    const set = new Set<string>(NATURES_CANONIQUES)
    segments.forEach(s => { if (s.nature) set.add(canonNature(s.nature)) })
    return [...set].sort((a, b) => a.localeCompare(b, 'fr'))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segments])

  const segmentsAffiches = React.useMemo<SegmentAfficheControle[]>(() => {
    if (filtre !== 'moyen' && filtre !== 'critique') {
      return segments
        .filter(s => filtre === 'tous' || verdicts.get(s.id)?.rang === filtre)
        .map(segment => ({ segment }))
    }

    const vus = new Set<number>()
    const avecContexte: SegmentAfficheControle[] = []
    segments.forEach((segment, index) => {
      if (verdicts.get(segment.id)?.rang !== filtre) return
      ;[segments[index - 1], segment, segments[index + 1]].forEach(voisin => {
        if (!voisin || vus.has(voisin.id)) return
        vus.add(voisin.id)
        avecContexte.push({ segment: voisin, contexte: voisin.id !== segment.id })
      })
    })
    return avecContexte.sort((a, b) => a.segment.segment_numero - b.segment.segment_numero)
  }, [segments, verdicts, filtre])

  const pagesControle = React.useMemo(() => {
    const pages: SegmentAfficheControle[][] = []
    let page: SegmentAfficheControle[] = []
    let longueurPage = 0
    segmentsAffiches.forEach(item => {
      const poids = (item.segment.segment_texte ?? '').length + 160
      if (page.length > 0 && longueurPage + poids > CARACTERES_PAR_PAGE_CONTROLE) {
        pages.push(page)
        page = []
        longueurPage = 0
      }
      page.push(item)
      longueurPage += poids
    })
    if (page.length > 0) pages.push(page)
    return pages
  }, [segmentsAffiches])

  const [pageActuelle, setPageActuelle] = React.useState(0)

  React.useEffect(() => {
    setPageActuelle(0)
  }, [idOeuvre, filtre])

  React.useEffect(() => {
    if (pageActuelle >= pagesControle.length) setPageActuelle(Math.max(0, pagesControle.length - 1))
  }, [pageActuelle, pagesControle.length])

  const pageSegments = pagesControle[pageActuelle] ?? []
  const actif = segments.find(s => s.id === segmentActif) ?? segmentsAffiches[0]?.segment ?? null
  const verdictActif = actif ? verdicts.get(actif.id) : null
  const liensActifs = React.useMemo(() => actif ? liensSegmentDetails(actif) : [], [actif])
  const notesActives = actif?.notes ?? []

  React.useEffect(() => {
    // Le crayon change le segment actif ET ouvre l'édition dans le même geste : sans
    // cette garde, l'effet refermait aussitôt ce que le clic venait d'ouvrir.
    if (editionSegmentId !== null) return
    setEditionTexte(actif?.segment_texte ?? '')
    setStatutAction('idle')
  }, [actif?.id, actif?.segment_texte, editionSegmentId])

  React.useEffect(() => {
    const ids = liensActifs.map(l => l.id).filter(id => !versetsLies[id])
    if (ids.length === 0) return
    let annule = false
    supabase.from('versets_lecture')
      .select('id_verset, ref, livre, chapitre, verset, TR0001')
      .in('id_verset', ids)
      .then(({ data }) => {
        if (annule) return
        const ajout: Record<string, VersetLieControle> = {}
        ;((data ?? []) as VersetSupabaseControle[]).forEach(v => {
          const refTechnique = v.livre && v.chapitre ? `${v.livre} ${v.chapitre}${v.verset ? `:${v.verset}` : ''}` : (v.ref ?? v.id_verset)
          ajout[v.id_verset] = { ref: refBibliqueFr(refTechnique, v.id_verset), texte: v.TR0001 ?? '' }
        })
        setVersetsLies(prev => ({ ...prev, ...ajout }))
      })
    return () => { annule = true }
  }, [liensActifs, versetsLies])

  let dernierGroupe = ''

  return (
    <div className="controle-oeuvres">
      <style>{`
        .controle-oeuvres h1{font-family:var(--font-source-serif), Georgia, serif;font-size:18px;font-weight:normal;color:#1e2e24;margin:0;letter-spacing:.02em;}
        .controle-oeuvres .toolbar{background:#fff;border:1px solid #d9e1dc;border-radius:8px;padding:8px 14px 9px;margin-bottom:12px;box-shadow:0 5px 16px rgba(30,46,38,.045);text-align:center;}
        .controle-oeuvres .toolbar-regle{width:34px;height:1px;background:#c8b89e;margin:5px auto 7px;}
        .controle-oeuvres .oeuvre-search{font-size:11px;border:1px solid #d6d0c4;border-radius:999px;background:#faf8f4;color:#2a2520;padding:5px 12px;width:min(440px,100%);text-align:center;outline:none;transition:border-color .14s,box-shadow .14s,background .14s;}
        .controle-oeuvres .oeuvre-search:focus{background:#fff;border-color:#8aa185;box-shadow:0 0 0 3px rgba(61,107,79,.09);}
        .controle-oeuvres .toolbar > div:last-child{justify-content:center;margin-top:7px;}
        /* Le texte occupe tout ce qui reste ; le volet d'analyse a une largeur fixe et
           généreuse. Plus de centrage : la colonne de lecture part de la gauche. */
        .controle-layout{display:grid;grid-template-columns:minmax(0,1fr) 430px;gap:18px;align-items:start;}
        .segments-panel{background:#fff;border:1px solid #e3ddd3;border-radius:2px;padding:30px 46px 38px;box-shadow:0 10px 28px rgba(30,46,38,.05);}
        .controle-pagination{display:flex;align-items:center;justify-content:center;gap:13px;margin:0 0 23px;color:#8a8278;font-size:12px;}
        .controle-pagination.bas{margin:24px 0 0;}
        .controle-pagination button{border:0;background:transparent;color:#3d6b4f;font-family:var(--font-source-serif), Georgia, serif;font-size:24px;line-height:1;cursor:pointer;padding:0 6px;}
        .controle-pagination button:disabled{opacity:.25;cursor:default;}
        .segment-controle{position:relative;border:0;border-radius:3px;padding:3px 6px 4px;margin-bottom:.38rem;cursor:pointer;transition:background .14s,box-shadow .14s,opacity .14s;}
        .segment-controle:hover{box-shadow:inset 0 0 0 1px rgba(61,107,79,.12);}
        .segment-controle.is-active{box-shadow:inset 0 0 0 1px rgba(61,107,79,.28);}
        /* Le crayon vit DANS le bloc de texte : on corrige là où l'on lit. */
        .segment-crayon{position:absolute;top:1px;right:1px;opacity:0;border:1px solid #d9e1dc;background:rgba(255,255,255,.94);border-radius:4px;padding:1px 6px 2px;font-size:12px;line-height:1.3;cursor:pointer;color:#3d6b4f;transition:opacity .13s;z-index:2;}
        .segment-controle:hover .segment-crayon,.segment-controle.is-active .segment-crayon{opacity:1;}
        .segment-crayon:hover{background:#f2f8f4;border-color:#8aa185;}
        .segment-edition{width:100%;box-sizing:border-box;min-height:130px;border:1px solid #8aa185;border-radius:4px;background:#fffdf9;color:#2a2520;font-family:var(--font-source-sans), Arial, sans-serif;font-size:.82rem;line-height:1.52;padding:8px 10px;resize:vertical;outline:none;}
        .segment-edition-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:7px;}
        /* Volet de droite : score, puis encarts rouge et vert. */
        .score-bloc{display:flex;align-items:center;gap:15px;padding:0 0 13px;border-bottom:1px solid #ede9e2;margin-bottom:13px;}
        .score-chiffre{font-family:var(--font-source-serif), Georgia, serif;font-size:36px;line-height:.95;color:#1e2e24;}
        .score-sur{font-size:11px;color:#9a958d;margin-left:2px;}
        .score-legende{font-size:10px;color:#9a958d;line-height:1.45;margin:3px 0 0;}
        .encart{border-radius:6px;padding:9px 11px 10px;margin-bottom:9px;}
        .encart h4{margin:0 0 6px;font-family:var(--font-source-serif), Georgia, serif;font-size:12px;font-weight:600;font-style:italic;letter-spacing:0;text-transform:none;}
        .encart ul{margin:0;padding-left:15px;display:flex;flex-direction:column;gap:6px;}
        .encart li{font-size:11.5px;line-height:1.5;}
        .encart-rouge{background:#fff4f1;border:1px solid #e6bfb2;}
        .encart-rouge h4{color:#9a2a2a;}
        .encart-rouge li{color:#6f2a19;}
        .encart-vert{background:#f2f8f4;border:1px solid #b9d4c3;}
        .encart-vert h4{color:#2f6046;}
        .encart-vert li{color:#24503a;}
        .badge-manuel{display:inline-block;background:#efe7f6;border:1px solid #c3aed6;color:#5b3a7a;border-radius:999px;padding:2px 8px;font-size:8.5px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;}
        .segment-texte{font-family:var(--font-source-sans), Arial, sans-serif;font-size:.82rem;line-height:1.52;text-align:justify;text-justify:inter-word;hyphens:auto;color:#1e1a16;margin:0;word-spacing:-.025em;letter-spacing:0;white-space:pre-line;}
        .controle-groupe{font-family:var(--font-source-serif), Georgia, serif;font-size:1.12rem;font-weight:400;color:#2a3d30;text-align:center;line-height:1.35;margin:30px auto 17px;max-width:620px;}
        .controle-groupe::after{content:"";display:block;width:38px;height:1px;background:#c8b89e;margin:11px auto 0;}
        .controle-droit{position:sticky;top:142px;max-height:calc(100vh - 160px);overflow-y:auto;background:#fff;border:1px solid #d9e1dc;border-radius:8px;padding:15px 16px;box-shadow:0 10px 28px rgba(30,46,38,.07);}
        .pill{display:inline-flex;align-items:center;border-radius:999px;padding:2px 8px;font-size:9px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;}
        .stat-btn{border:1px solid #d6d0c4;background:#fff;border-radius:999px;padding:3px 8px;font-size:10px;cursor:pointer;color:#5a5450;}
        .stat-btn.active{background:#2f6046;color:#fff;border-color:#2f6046;}
        .mode-btn{border:1px solid #d6d0c4;background:#fff;border-radius:999px;padding:3px 9px;font-size:10px;color:#5a5450;cursor:pointer;}
        .mode-btn.active{background:#f2f8f4;border-color:#3d6b4f;color:#2f6046;font-weight:700;}
        .niveau-btn{border:1px solid #d6d0c4;background:#fff;border-radius:999px;padding:4px 8px;font-size:10px;cursor:pointer;color:#5a5450;transition:background .12s,border-color .12s,color .12s;}
        .niveau-btn.active{font-weight:700;}
        .controle-section{margin-top:16px;padding-top:14px;border-top:1px solid #d8cfbf;}
        .controle-section-title{font-family:var(--font-source-serif), Georgia, serif;font-style:italic;font-size:12.5px;font-weight:normal;letter-spacing:0;text-transform:none;color:#3d6b4f;margin:0 0 8px;}
        .controle-liste-simple{margin:0;padding-left:16px;display:flex;flex-direction:column;gap:5px;color:#3a3530;}
        .controle-liste-simple li{font-size:11.5px;line-height:1.45;}
        .controle-lien-card{border:1px solid #ede9e2;border-radius:7px;background:#fffdf9;padding:8px 9px;margin-bottom:8px;}
        .controle-lien-ref{font-size:11px;font-weight:700;color:#3d6b4f;margin:0 0 4px;}
        .controle-lien-texte{font-size:11.5px;line-height:1.5;color:#332d28;margin:0;white-space:normal;}
        .controle-mini-btn{border:0;background:transparent;color:#9a2a2a;font-size:10.5px;padding:4px 0 0;cursor:pointer;}
        .controle-edition{width:100%;min-height:150px;border:1px solid #d6d0c4;border-radius:6px;background:#fffdf9;color:#2a2520;font-size:12px;line-height:1.55;padding:8px 9px;resize:vertical;}
        .controle-action-btn{border:1px solid #d6d0c4;background:#fff;border-radius:999px;padding:5px 10px;font-size:10.5px;cursor:pointer;color:#3d6b4f;}
        .controle-action-btn.danger{color:#9a2a2a;border-color:#e2b9aa;background:#fff7f4;}
        .controle-action-btn:disabled{opacity:.55;cursor:default;}
        /* En-tête du volet : segment + référence sur une ligne, score/rang alignés à droite. */
        .controle-entete{display:flex;align-items:baseline;justify-content:space-between;gap:12px;padding-bottom:11px;border-bottom:1px solid #d8cfbf;margin-bottom:12px;}
        .controle-entete-ref{min-width:0;font-size:12px;color:#5f6f60;line-height:1.4;}
        .controle-seg-num{font-family:var(--font-source-serif), Georgia, serif;font-size:15px;color:#1e2e24;}
        .controle-seg-ref{color:#8a8278;}
        .controle-entete-score{display:flex;align-items:center;gap:9px;flex-shrink:0;}
        .controle-score-inline{font-family:var(--font-source-serif), Georgia, serif;font-size:21px;color:#1e2e24;line-height:1;}
        .controle-seuils{font-size:10px;color:#b0a89e;margin:0 0 2px;}
        .controle-nature-select{font-size:11px;border:1px solid #d6d0c4;border-radius:5px;background:#fff;color:#2a2520;padding:2px 6px;cursor:pointer;}
        /* Page d'accueil : liste sobre des œuvres. */
        .controle-accueil{background:#fff;border:1px solid #e3ddd3;border-radius:8px;padding:10px 8px;box-shadow:0 6px 18px rgba(30,46,38,.05);max-width:720px;margin:0 auto;}
        .controle-accueil ul{list-style:none;margin:0;padding:0;}
        .controle-accueil li + li{border-top:1px solid #f0ece6;}
        .controle-accueil button{display:block;width:100%;text-align:left;background:transparent;border:0;cursor:pointer;padding:9px 12px;font-family:var(--font-source-serif), Georgia, serif;font-size:13.5px;color:#2a3d30;border-radius:5px;transition:background .12s;}
        .controle-accueil button:hover{background:rgba(61,107,79,.06);}
        .controle-accueil .accueil-titre{display:block;}
        .controle-accueil .accueil-liens{display:block;font-family:var(--font-source-sans), Arial, sans-serif;font-size:10px;color:#a8a094;margin-top:2px;letter-spacing:.02em;}
        .controle-ancien-commentaires,.controle-ancien-commentaires + div{display:none!important;}
        @media(max-width:980px){
          .titre-colophon{max-width:100%!important;line-height:1.32!important;word-spacing:normal!important;letter-spacing:0!important;}
          .titre-colophon > span{display:inline!important;width:auto!important;max-width:100%!important;}
          .titre-colophon > span:not(:last-child)::after{content:" ";}
        }
        @media(max-width:900px){.controle-layout{grid-template-columns:1fr}.segments-panel{padding:26px 22px 34px}.controle-droit{position:static}}
      `}</style>

      <div className="toolbar">
        <h1>Contrôle des œuvres</h1>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '7px', marginTop: '5px' }}>
          <button className={`mode-btn${modeControle === 'corpus' ? ' active' : ''}`} onClick={() => { setModeControle('corpus'); setRechercheOeuvre('') }}>Corpus</button>
          <button className={`mode-btn${modeControle === 'perso' ? ' active' : ''}`} onClick={() => { setModeControle('perso'); setRechercheOeuvre('') }}>Perso</button>
          {modeControle === 'perso' && <button className="mode-btn" onClick={ajouterTextePersonnel}>+ Texte</button>}
        </div>
        <div className="toolbar-regle" />
        <input
          className="oeuvre-search"
          autoComplete="off"
          value={rechercheOeuvre}
          onChange={e => setRechercheOeuvre(e.target.value)}
          onBlur={e => choisirOeuvreDepuisRecherche(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault()
              choisirOeuvreDepuisRecherche(e.currentTarget.value)
            }
          }}
          placeholder={modeControle === 'perso' ? 'Rechercher un texte personnel ou un auteur...' : 'Rechercher une œuvre ou un auteur...'}
        />
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          {(['tous', 'bon', 'moyen', 'critique'] as const).map(f => (
            <button key={f} className={`stat-btn${filtre === f ? ' active' : ''}`} onClick={() => setFiltre(f)}>
              {f === 'tous' ? `Tous ${segments.length}` : `${COULEURS[f].label} ${stats[f]}`}
            </button>
          ))}
        </div>
      </div>

      {erreur && <p style={{ color: '#9a2a2a', fontSize: '0.8625rem' }}>Erreur de chargement : {erreur}</p>}
      {!idOeuvre ? (
        <div className="controle-accueil">
          {modeControle === 'corpus' && chargementRangs && (
            <p style={{ fontSize: '0.79062rem', color: '#9a958d', fontStyle: 'italic', margin: '0 0 8px', padding: '0 12px' }}>Chargement de la qualité…</p>
          )}
          {oeuvresRecherche.length === 0 ? (
            <p style={{ color: '#9a958d', fontStyle: 'italic', fontSize: '0.93437rem', padding: '10px 12px', margin: 0 }}>Aucune œuvre à contrôler.</p>
          ) : (
            <ul>
              {oeuvresRecherche.map(o => {
                const st = modeControle === 'corpus' ? statsLiens.get(o.id_oeuvre) : undefined
                // Couleur de la ligne : rouge si ≥1 critique, jaune si ≥1 moyen (sans
                // critique), vert si ni l'un ni l'autre. Neutre tant que l'analyse tourne.
                const rg = modeControle === 'corpus' ? rangsParOeuvre.get(o.id_oeuvre) : undefined
                const coul = !rangsParOeuvre.size ? null
                  : (rg?.critique ?? 0) > 0 ? { bord: '#c0562a', fond: '#fff0ed' }
                  : (rg?.moyen ?? 0) > 0 ? { bord: '#c7832f', fond: '#fff8ec' }
                  : { bord: '#3d6b4f', fond: '#f2f8f4' }
                return (
                  <li key={o.id_oeuvre} style={coul ? { borderLeft: `3px solid ${coul.bord}`, background: coul.fond, borderRadius: '4px' } : undefined}>
                    <button type="button" onClick={() => setIdOeuvre(o.id_oeuvre)}>
                      <span className="accueil-titre">{libelleOeuvre(o)}</span>
                      {modeControle === 'corpus' && (
                        <span className="accueil-liens">
                          {st && st.nb_liens > 0
                            ? `Liens mis à jour le ${formaterDateLiens(st.derniere_maj)} · ${st.nb_liens} lien${st.nb_liens > 1 ? 's' : ''}`
                            : 'Aucun lien'}
                        </span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      ) : chargement ? (
        <div className="segments-panel"><p style={{ color: '#9a958d', fontStyle: 'italic', fontSize: '0.93437rem' }}>Chargement de l’œuvre…</p></div>
      ) : (
        <div className="controle-layout">
          <div className="segments-panel">
            <div style={{ textAlign: 'center', marginBottom: '30px' }}>
              <button type="button" onClick={() => setIdOeuvre('')} style={{ display: 'block', margin: '0 auto 12px', background: 'transparent', border: 0, color: '#3d6b4f', fontSize: '0.79062rem', cursor: 'pointer' }}>← Toutes les œuvres</button>
              <p style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '1.7825rem', color: '#1e2e24', margin: 0, lineHeight: 1.28 }}>{titreCourtControle(auteurs, idOeuvre, modeControle, oeuvresPerso)}</p>
              <div style={{ width: '42px', height: '1px', background: '#c8b89e', margin: '14px auto 8px' }} />
              <p style={{ fontSize: '0.75469rem', color: '#9a958d', margin: '3px 0 0' }}>{segmentsAffiches.length} segment(s) affiché(s)</p>
            </div>

            {pagesControle.length > 1 && (
              <div className="controle-pagination">
                <button type="button" disabled={pageActuelle === 0} onClick={() => setPageActuelle(p => Math.max(0, p - 1))}>&lsaquo;</button>
                <span>Page {pageActuelle + 1} / {pagesControle.length}</span>
                <button type="button" disabled={pageActuelle >= pagesControle.length - 1} onClick={() => setPageActuelle(p => Math.min(pagesControle.length - 1, p + 1))}>&rsaquo;</button>
              </div>
            )}

            {pageSegments.map(({ segment, contexte }) => {
              const verdict = verdicts.get(segment.id)
              const couleurs = COULEURS[verdict?.rang ?? 'bon']
              const groupe = [segment.ref_niv1, segment.ref_niv2].filter(Boolean).join(' — ')
              const afficherGroupe = groupe && groupe !== dernierGroupe
              if (afficherGroupe) dernierGroupe = groupe
              return (
                <React.Fragment key={segment.id}>
                  {afficherGroupe && (
                    <h2 className="controle-groupe">
                      {rendreTitreColophonControle(groupe)}
                    </h2>
                  )}
                  <article
                    className={`segment-controle${segment.id === segmentActif ? ' is-active' : ''}`}
                    onClick={() => setSegmentActif(segment.id)}
                    style={{
                      background: contexte ? '#fbfaf7' : couleurs.fond,
                      opacity: contexte ? 0.78 : 1,
                    }}
                  >
                    {editionSegmentId === segment.id ? (
                      <>
                        <textarea
                          className="segment-edition"
                          value={editionTexte}
                          autoFocus
                          onClick={e => e.stopPropagation()}
                          onChange={e => setEditionTexte(e.target.value)}
                        />
                        <div className="segment-edition-actions" onClick={e => e.stopPropagation()}>
                          <button className="controle-action-btn" disabled={statutAction === 'envoi'} onClick={enregistrerSegment}>Enregistrer</button>
                          <button className="controle-action-btn" disabled={statutAction === 'envoi'} onClick={() => { setEditionTexte(segment.segment_texte ?? ''); setEditionSegmentId(null); setStatutAction('idle') }}>Annuler</button>
                          <button className="controle-action-btn danger" disabled={statutAction === 'envoi'} onClick={supprimerSegment}>Supprimer le segment</button>
                        </div>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="segment-crayon"
                          title="Modifier ce segment"
                          aria-label={`Modifier le segment ${segment.segment_numero}`}
                          onClick={e => { e.stopPropagation(); setSegmentActif(segment.id); setEditionTexte(segment.segment_texte ?? ''); setEditionSegmentId(segment.id) }}
                        >✎</button>
                        <p className="segment-texte">{segment.segment_texte || 'Segment vide.'}</p>
                      </>
                    )}
                  </article>
                </React.Fragment>
              )
            })}

            {pagesControle.length > 1 && (
              <div className="controle-pagination bas">
                <button type="button" disabled={pageActuelle === 0} onClick={() => setPageActuelle(p => Math.max(0, p - 1))}>&lsaquo;</button>
                <span>Page {pageActuelle + 1} / {pagesControle.length}</span>
                <button type="button" disabled={pageActuelle >= pagesControle.length - 1} onClick={() => setPageActuelle(p => Math.min(pagesControle.length - 1, p + 1))}>&rsaquo;</button>
              </div>
            )}
          </div>

          <aside className="controle-droit">
            {actif && verdictActif ? (
              <>
                {/* En-tête : segment + référence sur UNE ligne ; note et rang alignés à droite. */}
                <div className="controle-entete">
                  <div className="controle-entete-ref">
                    <span className="controle-seg-num">Segment {actif.segment_numero}</span>
                    {refsSegment(actif) && <span className="controle-seg-ref"> · {refsSegment(actif)}</span>}
                    {actif.controle_verifie && <span className="badge-manuel" style={{ marginLeft: '8px' }}>Vérifié</span>}
                  </div>
                  <div className="controle-entete-score">
                    <span className="pill" style={{ background: COULEURS[verdictActif.rang].fond, color: COULEURS[verdictActif.rang].texte, border: `1px solid ${COULEURS[verdictActif.rang].bord}` }}>
                      {COULEURS[verdictActif.rang].label}
                    </span>
                    <span className="controle-score-inline">{verdictActif.score}<span className="score-sur">/20</span></span>
                  </div>
                </div>

                <div className="controle-section" style={{ marginTop: '12px', paddingTop: 0, borderTop: 0 }}>
                  <p className="controle-section-title">
                    Rang {actif.controle_rang_manuel ? '— corrigé à la main' : ''}
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {(['auto', 'bon', 'moyen', 'critique'] as const).map(choix => {
                      const estActif = choix === 'auto' ? !actif.controle_rang_manuel : actif.controle_rang_manuel === choix
                      const couleursChoix = choix === 'auto' ? null : COULEURS[choix]
                      return (
                        <button
                          key={choix}
                          className={`niveau-btn${estActif ? ' active' : ''}`}
                          disabled={statutAction === 'envoi'}
                          onClick={() => changerRangManuel(actif.id, choix)}
                          style={estActif && couleursChoix ? {
                            background: couleursChoix.fond,
                            borderColor: couleursChoix.bord,
                            color: couleursChoix.texte,
                          } : estActif ? {
                            background: '#f0ece6',
                            borderColor: '#c8c0b4',
                            color: '#5a5450',
                          } : undefined}
                        >
                          {choix === 'auto' ? 'Auto' : COULEURS[choix].label}
                        </button>
                      )
                    })}
                  </div>
                  {actif.controle_rang_manuel && (
                    <p style={{ fontSize: '0.75469rem', color: '#5b3a7a', margin: '8px 0 0', lineHeight: 1.45 }}>
                      Rang imposé — le score reste celui de l’analyse ({verdictActif.score}/20).
                    </p>
                  )}
                  {statutAction === 'erreur' && <p style={{ fontSize: '0.79062rem', color: '#9a2a2a', margin: '8px 0 0' }}>Erreur lors de l’enregistrement.</p>}
                </div>

                {/* ── Notes : ce qui justifie le score, sans complaisance ── */}
                <div className="controle-section">
                  <p className="controle-section-title">Notes d’analyse</p>
                  {verdictActif.rouge.length > 0 && (
                    <div className="encart encart-rouge">
                      <h4>À reprendre</h4>
                      <ul>{verdictActif.rouge.map((n, i) => <li key={`r-${i}`}>{n}</li>)}</ul>
                    </div>
                  )}
                  {verdictActif.vert.length > 0 && (
                    <div className="encart encart-vert">
                      <h4>Ce qui tient</h4>
                      <ul>{verdictActif.vert.map((n, i) => <li key={`v-${i}`}>{n}</li>)}</ul>
                    </div>
                  )}
                  {verdictActif.rouge.length === 0 && verdictActif.vert.length === 0 && (
                    <p style={{ fontSize: '0.82656rem', color: '#9a958d', margin: 0, fontStyle: 'italic' }}>
                      Aucun défaut relevé. Pas de note : une boîte vide est une information.
                    </p>
                  )}
                </div>

                {/* ── Notes écrites à la main, ou héritées de la base ── */}
                <div className="controle-section">
                  <p className="controle-section-title">Notes de lecture</p>
                  {notesActives.length > 0 ? (
                    <ul className="controle-liste-simple">
                      {notesActives.map((note, i) => (
                        <li key={`note-${i}`}>
                          {note}
                          <button className="controle-mini-btn" style={{ display: 'block' }} onClick={() => supprimerNote(i)}>Supprimer cette note</button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p style={{ fontSize: '0.82656rem', color: '#9a958d', margin: 0 }}>Aucune note.</p>
                  )}
                  <button className="controle-action-btn" style={{ marginTop: '7px' }} disabled={statutAction === 'envoi'} onClick={ajouterNote}>Ajouter une note</button>
                </div>

                {modeControle === 'corpus' && <div className="controle-section">
                  <p className="controle-section-title">Liens bibliques</p>
                  {liensActifs.length > 0 ? (
                    <div>
                      {liensActifs.map((lien, i) => {
                        const verset = versetsLies[lien.id]
                        return (
                          <div key={`${lien.champ}-${lien.id}-${i}`} className="controle-lien-card">
                            <p className="controle-lien-ref">{verset?.ref ?? refBibliqueFr(lien.id)} <span style={{ color: '#9a958d', fontWeight: 400 }}>({lien.champ})</span></p>
                            <p className="controle-lien-texte">{verset?.texte || 'Texte du verset non chargé.'}</p>
                            <button className="controle-mini-btn" disabled={statutAction === 'envoi'} onClick={() => supprimerLienBiblique(lien)}>Supprimer ce lien</button>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p style={{ fontSize: '0.82656rem', color: '#9a958d', margin: 0 }}>Aucun lien biblique.</p>
                  )}
                  <button className="controle-action-btn" style={{ marginTop: '7px' }} disabled={statutAction === 'envoi'} onClick={ajouterLienBiblique}>Ajouter un lien biblique</button>
                </div>}

                <div className="controle-section">
                  <p className="controle-section-title">Données</p>
                  <div style={{ fontSize: '0.79062rem', color: '#5a5450', lineHeight: 1.9 }}>
                    <div>Longueur : {(actif.segment_texte ?? '').trim().length} signes</div>
                    <div>Liens : {liensSegment(actif).length || 'aucun'}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>Nature :</span>
                      <select
                        className="controle-nature-select"
                        value={canonNature(actif.nature)}
                        disabled={statutAction === 'envoi'}
                        onChange={e => changerNature(actif.id, e.target.value)}
                      >
                        {naturesDisponibles.map(n => <option key={n} value={n}>{LIBELLE_NATURE[n] ?? n}</option>)}
                      </select>
                    </div>
                    {modeControle === 'perso' && actif.note_style != null && <div>Note de style en base : {actif.note_style}/20</div>}
                  </div>
                </div>
              </>
            ) : (
              <p style={{ fontSize: '0.8625rem', color: '#9a958d', fontStyle: 'italic' }}>Sélectionnez un segment.</p>
            )}
          </aside>
        </div>
      )}
      {modaleLienOuverte && (
        <ModalLienBiblique
          ouvert={modaleLienOuverte}
          titre="Ajouter un lien biblique"
          enregistrement={statutAction === 'envoi'}
          onFermer={() => { if (statutAction !== 'envoi') setModaleLienOuverte(false) }}
          onValider={confirmerLienBiblique}
        />
      )}
    </div>
  )
}
