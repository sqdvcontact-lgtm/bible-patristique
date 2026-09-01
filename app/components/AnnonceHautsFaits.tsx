'use client'

// LES ANNONCES DE HAUT FAIT — deux formes, et elles ne se ressemblent pas.
//
// Décision de l'auteur, 1er septembre 2026 : « de petites notifications quand on
// avance vers l'accomplissement d'un objectif ; et une belle notification quand on
// termine un haut fait ».
//
// ⛔ ON N'ANNONCE PAS CHAQUE PAS. Deux paliers par case au plus — la moitié du chemin,
// puis le dernier pas —, et jamais deux fois le même : `palierAtteint` le décide,
// sous garde. Une vignette à chaque prélèvement serait insupportable, et une
// notification qu'on subit cesse d'être lue, comme une garde durablement rouge.
//
// ⚠️ Rien ne s'écrit en base pour cela : ce qui a DÉJÀ été annoncé vit dans le
// stockage local, exactement comme les notifications archivées du site
// (app/lib/notificationsClient.ts). Une annonce est un fait d'écran, pas un fait de
// corpus, et le pire qu'un stockage vidé puisse faire est de la remontrer une fois.

import { useCallback, useEffect, useRef, useState } from 'react'
import { useCompte } from '@/app/lib/contexteCompte'
import {
  casesDuTableau, libellePalier, palierAtteint,
  type DegreEtat, type SerieEtat,
} from '@/app/lib/hautsFaits'

/** La petite vignette dure ce que dure celle de la barre. La belle annonce reste
 *  plus longtemps : elle porte une notice à lire, non une ligne à voir passer. */
const DUREE_VIGNETTE_MS = 3600
const DUREE_ANNONCE_MS = 9000

/** L'événement que tout geste marquant peut émettre pour faire vérifier la
 *  progression. ⚠️ Sans lui, l'annonce n'arrive qu'à l'ouverture d'une session : le
 *  lecteur verrait ce qu'il a gagné en revenant, jamais au moment du geste. */
export const EVENEMENT_PROGRESSION = 'cs-progression'

/** À appeler après un geste qui peut faire avancer une case : un passage retenu, une
 *  œuvre mise en bibliothèque, un commentaire publié. Sans effet hors du navigateur. */
export function signalerProgression() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVENEMENT_PROGRESSION))
}

function cleAnnonces(uid: string) {
  return `hauts_faits_annonces:${uid}`
}

function lireAnnonces(uid: string): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try { return new Set<string>(JSON.parse(localStorage.getItem(cleAnnonces(uid)) ?? '[]')) }
  catch { return new Set() }
}

function ecrireAnnonces(uid: string, valeurs: Set<string>) {
  try { localStorage.setItem(cleAnnonces(uid), JSON.stringify([...valeurs])) } catch {}
}

type Annonce =
  | { forme: 'obtention'; cle: string; c: DegreEtat }
  | { forme: 'palier'; cle: string; c: DegreEtat; texte: string }

export default function AnnonceHautsFaits() {
  const { userId, profilPret } = useCompte()
  const [file, setFile] = useState<Annonce[]>([])
  const [courante, setCourante] = useState<Annonce | null>(null)
  // ⚠️ Une vérification à la fois : deux gestes rapprochés lanceraient deux appels
  // qui se répondraient la même chose, et la seconde réponse rejouerait l'annonce.
  const enCours = useRef(false)

  const verifier = useCallback(async () => {
    if (!userId || enCours.current) return
    enCours.current = true
    try {
      const res = await fetch('/api/compte/hauts-faits')
      if (!res.ok) return
      const { series } = (await res.json()) as { series: SerieEtat[] }
      const deja = lireAnnonces(userId)
      const neuves: Annonce[] = []

      for (const c of casesDuTableau(series ?? [])) {
        // ⛔ L'obtention l'emporte sur le palier : une case qui vient de tomber ne
        // s'annonce pas comme « à mi-chemin ».
        if (c.obtenu) {
          const cle = `obtenu:${c.code}`
          if (!deja.has(cle)) neuves.push({ forme: 'obtention', cle, c })
          continue
        }
        const palier = palierAtteint(c)
        if (!palier) continue
        const cle = `${palier}:${c.code}`
        if (!deja.has(cle)) neuves.push({ forme: 'palier', cle, c, texte: libellePalier(c, palier) })
      }

      if (!neuves.length) return
      // ⚠️ On retient AVANT de montrer : une annonce interrompue (page fermée, onglet
      // changé) ne doit pas revenir à chaque chargement.
      ecrireAnnonces(userId, new Set([...deja, ...neuves.map(n => n.cle)]))
      // Les obtentions d'abord : ce sont elles qu'on est venu chercher.
      setFile(f => [...f, ...neuves.sort((a, b) => (a.forme === b.forme ? 0 : a.forme === 'obtention' ? -1 : 1))])
    } catch {
      // Une annonce est un agrément : son échec ne se montre pas au lecteur.
    } finally {
      enCours.current = false
    }
  }, [userId])

  // ⛔ La PREMIÈRE vérification n'a lieu qu'une fois le profil connu, et une seule fois
  // par session : la route recalcule tous les compteurs, elle n'a pas à partir à chaque
  // page tournée. Ensuite, ce sont les gestes qui la rappellent.
  const amorce = useRef(false)
  useEffect(() => {
    if (!profilPret || !userId || amorce.current) return
    amorce.current = true
    verifier()
  }, [profilPret, userId, verifier])

  useEffect(() => {
    if (!userId) return
    window.addEventListener(EVENEMENT_PROGRESSION, verifier)
    return () => window.removeEventListener(EVENEMENT_PROGRESSION, verifier)
  }, [userId, verifier])

  // Une annonce à la fois, la file s'écoulant d'elle-même.
  useEffect(() => {
    if (courante || !file.length) return
    setCourante(file[0])
    setFile(f => f.slice(1))
  }, [courante, file])

  useEffect(() => {
    if (!courante) return
    const duree = courante.forme === 'obtention' ? DUREE_ANNONCE_MS : DUREE_VIGNETTE_MS
    const minuteur = window.setTimeout(() => setCourante(null), duree)
    return () => window.clearTimeout(minuteur)
  }, [courante])

  if (!courante) return null

  const encre = `var(--cs-${courante.c.famille === 'peres' || courante.c.famille === 'communaute' ? courante.c.famille : 'ecriture'})`
  const grande = courante.forme === 'obtention'

  return (
    <div
      key={courante.cle}
      role="status"
      aria-live="polite"
      onClick={() => setCourante(null)}
      style={{
        position: 'fixed',
        // Sous la barre, comme la vignette de notification : c'est la place que le
        // lecteur connaît déjà pour ce genre d'annonce.
        top: 'calc(3.5rem + 0.75rem)',
        right: '18px',
        width: grande ? '21rem' : '17.5rem',
        maxWidth: 'calc(100vw - 36px)',
        background: 'var(--cs-surface)',
        border: '1px solid var(--cs-bord)',
        borderLeft: `3px solid ${grande ? encre : 'var(--cs-bord)'}`,
        borderRadius: '8px',
        boxShadow: 'var(--cs-ombre-modale)',
        padding: grande ? '14px 16px 16px' : '11px 13px 13px',
        zIndex: 4000,
        cursor: 'pointer',
        overflow: 'hidden',
      }}>
      <style>{`
        @keyframes cs-annonce-jauge { from { transform: scaleX(1) } to { transform: scaleX(0) } }
        .cs-annonce-jauge { transform-origin: left center; animation-name: cs-annonce-jauge; animation-timing-function: linear; animation-fill-mode: forwards; }
        @media (prefers-reduced-motion: reduce) { .cs-annonce-jauge { animation: none; transform: scaleX(1) } }
      `}</style>

      {grande ? (
        <>
          <p style={{ fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: encre, margin: '0 0 5px' }}>
            Haut fait obtenu
          </p>
          <p style={{ margin: '0 0 6px', display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '1.0625rem', color: 'var(--cs-encre-fonce)' }}>
              {courante.c.nom}
            </span>
            <span style={{ fontSize: '0.6875rem', fontWeight: 600, color: encre }}>+{courante.c.points}</span>
          </p>
          {/* ⛔ La notice EST la récompense : elle paraît ici, au moment où la case
              tombe, et non seulement dans le tableau. C'est le seul retour qui soit de
              la même étoffe que la lecture (charte § 40). */}
          <p style={{ fontSize: '0.78125rem', color: 'var(--cs-texte-second)', lineHeight: 1.6, margin: 0 }}>
            {courante.c.notice}
          </p>
        </>
      ) : (
        <>
          <p style={{ fontSize: '0.625rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--cs-texte-doux)', margin: '0 0 3px' }}>
            {courante.c.serie_nom}
          </p>
          <p style={{ fontSize: '0.8125rem', color: 'var(--cs-texte)', lineHeight: 1.4, margin: 0 }}>
            {courante.texte}
          </p>
        </>
      )}

      <div aria-hidden style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '2px', background: 'var(--cs-fond-doux)' }}>
        <div
          className="cs-annonce-jauge"
          style={{
            height: '100%',
            background: grande ? encre : 'var(--cs-bord)',
            animationDuration: `${grande ? DUREE_ANNONCE_MS : DUREE_VIGNETTE_MS}ms`,
          }}
        />
      </div>
    </div>
  )
}
