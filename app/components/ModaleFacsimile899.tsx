'use client'

// ── Le fac-similé d'un verset de la Bible du XIIIe siècle ─────────────────────
//
// Demande de l'auteur (2026-09-21) : « un petit symbole, au survol, pour ouvrir une
// fenêtre chargeant alors la page précise demandée », et « pendant l'ouverture, un
// cercle de chargement, comme sur la page Bible ».
//
// La fenêtre montre la COLONNE où le verset commence : les images du manuscrit sont
// découpées par colonne (1 484 fichiers, `f1r_a.png`…), non par page. Deux flèches
// passent à la colonne voisine, et un verset à cheval sur deux colonnes le dit.
//
// ⛔ RIEN NE SE CHARGE AVANT LE CLIC : ni la table des colonnes (64 Ko), ni l'image
// (1,3 Mo en moyenne). La page Bible ne porte que la ligne de départ de chaque verset.
//
// ⛔ L'IMAGE PASSE PAR UNE BALISE `<img>`, JAMAIS PAR `next/image` : l'optimisation
// d'images de Vercel compte chaque colonne à chaque largeur, sur un quota. Le navigateur
// la prend directement dans le seau Supabase `manuscrits`.
//
// ⚠️ L'ATTENTE SE DÉDUIT : l'adresse chargée est retenue quand l'image la rend, et l'on
// attend tant qu'elle n'est pas celle qu'on demande. Rien ne se remet à zéro dans un
// effet, et une réponse tardive ne peut pas éteindre l'anneau d'une autre colonne.

import { createPortal } from 'react-dom'
import { useEffect, useRef, useState } from 'react'
import { Z_MODALE } from '@/app/lib/empilement'
import { HAUTEUR_NAVBAR } from '@/app/lib/mesures'
import { useFermerAEchap } from '@/app/lib/useFermerAEchap'
import { useFenetreModale } from '@/app/lib/useFenetreModale'
import { verrouillerLeDefilement } from '@/app/lib/verrouDefilement'
import { Anneau } from '@/app/lib/attenteEnCreux'
import IconeChevron from '@/app/components/IconeChevron'
import IconeCroix from '@/app/components/IconeCroix'
import {
  chargerTableFacsimiles899, libelleColonne899, lireRepere899, urlColonneFacsimile899,
  type ColonneFacsimile899, type TableFacsimiles899,
} from '@/app/lib/facsimiles899'

const SERIF = 'var(--font-source-serif), Georgia, serif'

const STYLE_FLECHE: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  width: 'max(28px, 1.75rem)', height: 'max(28px, 1.75rem)', padding: 0,
  background: 'none', border: 'none', borderRadius: '4px', cursor: 'pointer',
  color: 'var(--cs-vert)',
}

export default function ModaleFacsimile899({ reference, repereDebut, repereFin, onFermer }: {
  /** La référence du verset, composée par l'appelant (« Gn 3, 1 »). */
  reference: string
  /** `f100r_a_l04` : la ligne du témoin où le verset commence. */
  repereDebut: string
  /** La ligne où il finit, s'il la porte. */
  repereFin?: string | null
  onFermer: () => void
}) {
  const debut = lireRepere899(repereDebut)
  const fin = lireRepere899(repereFin ?? null)

  const [table, setTable] = useState<TableFacsimiles899 | 'erreur' | null>(null)
  // ⚠️ Un DÉCALAGE depuis la colonne de départ, non un rang absolu : le rang de départ
  // n'est connu qu'avec la table, et on ne le recopie pas dans un effet.
  const [decalage, setDecalage] = useState(0)
  const [agrandi, setAgrandi] = useState(false)
  const [srcChargee, setSrcChargee] = useState<string | null>(null)
  const [srcEnErreur, setSrcEnErreur] = useState<string | null>(null)
  const boiteRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let vivant = true
    chargerTableFacsimiles899()
      .then((t) => { if (vivant) setTable(t) })
      .catch((erreur) => {
        console.error('[fac-similé 899] table des colonnes illisible :', erreur)
        if (vivant) setTable('erreur')
      })
    return () => { vivant = false }
  }, [])

  useEffect(() => verrouillerLeDefilement(), [])

  // Le foyer entre dans la fenêtre, et revient à ce qui l'avait.
  useEffect(() => {
    const avant = document.activeElement as HTMLElement | null
    boiteRef.current?.focus({ preventScroll: true })
    return () => { avant?.focus?.({ preventScroll: true }) }
  }, [])

  useFermerAEchap(true, onFermer)
  // La boîte prend et rend le foyer elle-même (plus haut) : le crochet n'y ajoute que le piège.
  useFenetreModale(boiteRef, true, { foyerInitial: false, rendreLeFoyer: false })

  const rangDepart = table && table !== 'erreur' && debut ? table.rang.get(debut.colonne) : undefined
  const total = table && table !== 'erreur' ? table.colonnes.length : 0
  const rang = rangDepart === undefined ? undefined : Math.min(Math.max(rangDepart + decalage, 0), total - 1)
  const colonne: ColonneFacsimile899 | undefined =
    rang === undefined || table === null || table === 'erreur' ? undefined : table.colonnes[rang]
  const src = colonne ? urlColonneFacsimile899(colonne) : null
  const introuvable = table === 'erreur' || (table !== null && rangDepart === undefined)
  const enAttente = !introuvable && (src === null || (srcChargee !== src && srcEnErreur !== src))
  const imageEnErreur = src !== null && srcEnErreur === src

  const aller = (pas: number) => {
    if (rang === undefined) return
    const cible = rang + pas
    if (cible < 0 || cible >= total) return
    setDecalage((d) => d + pas)
  }

  // Les flèches du clavier tournent les colonnes. ⚠️ Elles passent par `aller`, qui
  // borne : un décalage laissé filer au-delà de la dernière colonne demanderait autant
  // de pressions pour revenir. La référence suit la dernière écriture de `aller`.
  const allerRef = useRef(aller)
  useEffect(() => { allerRef.current = aller })
  useEffect(() => {
    const auClavier = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return
      if (e.key === 'ArrowLeft') { e.preventDefault(); allerRef.current(-1) }
      if (e.key === 'ArrowRight') { e.preventDefault(); allerRef.current(1) }
    }
    document.addEventListener('keydown', auClavier)
    return () => document.removeEventListener('keydown', auClavier)
  }, [])

  // Ce qu'on dit de la colonne affichée, par rapport au verset.
  const surDebut = colonne && debut && colonne.cle === debut.colonne
  const surFin = colonne && fin && colonne.cle === fin.colonne
  const aCheval = debut && fin && debut.colonne !== fin.colonne
  const precision = !colonne ? null
    : surDebut && surFin && debut && fin ? `Le verset y occupe les lignes ${debut.ligne} à ${fin.ligne}.`
    : surDebut && debut ? `Le verset commence à la ligne ${debut.ligne}${aCheval ? ' et se poursuit dans la colonne suivante' : ''}.`
    : surFin && fin ? `Le verset s’achève à la ligne ${fin.ligne}.`
    : null

  // La colonne voisine se prépare dès que celle-ci est là : tourner ne fait plus attendre.
  const preparerVoisines = () => {
    if (rang === undefined || table === null || table === 'erreur') return
    for (const r of [rang + 1, rang - 1]) {
      const voisine = table.colonnes[r]
      if (voisine) { const img = new Image(); img.decoding = 'async'; img.src = urlColonneFacsimile899(voisine) }
    }
  }

  if (typeof document === 'undefined') return null

  return createPortal(
    // ⛔ Le clic s'ARRÊTE ici : un portail remonte ses événements par l'arbre React, et
    // la fenêtre est montée dans la rangée d'un verset, qui se sélectionne au clic.
    <div onClick={(e) => { e.stopPropagation(); onFermer() }}
      style={{ position: 'fixed', top: HAUTEUR_NAVBAR, left: 0, right: 0, bottom: 0, background: 'var(--cs-calque-modale)', zIndex: Z_MODALE, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', overflow: 'hidden' }}>
      <div ref={boiteRef} tabIndex={-1} onClick={(e) => e.stopPropagation()}
        role="dialog" aria-modal="true" aria-labelledby="cs-facsimile-titre"
        style={{ position: 'relative', display: 'flex', flexDirection: 'column', width: 'min(34rem, 100%)', height: '100%', maxHeight: '100%', background: 'var(--cs-surface)', borderRadius: '12px', border: '1px solid var(--cs-bord)', boxShadow: 'var(--cs-ombre-modale)', outline: 'none', overflow: 'hidden' }}>

        {/* La tête : ce qu'on regarde, et d'où cela vient. */}
        <div style={{ flexShrink: 0, padding: '14px 52px 11px 20px', borderBottom: '1px solid var(--cs-bord-clair)' }}>
          <p style={{ fontSize: '0.53125rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--cs-vert)', margin: '0 0 4px' }}>
            Manuscrit · {reference}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button type="button" onClick={() => aller(-1)} disabled={rang === undefined || rang <= 0}
              aria-label="Colonne précédente" title="Colonne précédente"
              style={{ ...STYLE_FLECHE, opacity: rang === undefined || rang <= 0 ? 0.3 : 1 }}>
              <IconeChevron dir="left" taille="1rem" />
            </button>
            <h2 id="cs-facsimile-titre" style={{ fontFamily: SERIF, fontSize: '1.125rem', fontWeight: 'normal', color: 'var(--cs-encre-fonce)', margin: 0, lineHeight: 1.2, minWidth: '7.5em', textAlign: 'center' }}>
              {colonne ? libelleColonne899(colonne) : ' '}
            </h2>
            <button type="button" onClick={() => aller(1)} disabled={rang === undefined || rang >= total - 1}
              aria-label="Colonne suivante" title="Colonne suivante"
              style={{ ...STYLE_FLECHE, opacity: rang === undefined || rang >= total - 1 ? 0.3 : 1 }}>
              <IconeChevron dir="right" taille="1rem" />
            </button>
          </div>
          <p style={{ fontSize: '0.71875rem', color: 'var(--cs-texte-second)', margin: '5px 0 0', lineHeight: 1.4, minHeight: '1.4em' }}>
            {precision ?? ' '}
          </p>
        </div>

        <button type="button" onClick={onFermer} aria-label="Fermer" title="Fermer" className="cs-cible-fine"
          style={{ position: 'absolute', top: '12px', right: '12px', width: 'max(26px, 1.625rem)', height: 'max(26px, 1.625rem)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--cs-vert)' }}>
          <IconeCroix size={15} />
        </button>

        {/* L'image. Elle tient dans la hauteur ; un clic la montre à sa taille réelle. */}
        <div style={{ position: 'relative', flex: '1 1 auto', minHeight: 0, overflow: agrandi ? 'auto' : 'hidden', background: 'var(--cs-fond-doux)' }}>
          {src && !imageEnErreur && colonne && (
            // eslint-disable-next-line @next/next/no-img-element -- délibéré : l'image vient du seau, hors du quota d'optimisation de Vercel
            <img
              key={src}
              src={src}
              width={colonne.largeur}
              height={colonne.hauteur}
              alt={`Manuscrit Français 899, ${libelleColonne899(colonne)}`}
              decoding="async"
              onLoad={() => { setSrcChargee(src); preparerVoisines() }}
              onError={() => setSrcEnErreur(src)}
              onClick={() => setAgrandi((a) => !a)}
              title={agrandi ? 'Revenir à la colonne entière' : 'Agrandir'}
              style={agrandi
                ? { display: 'block', width: `${colonne.largeur}px`, maxWidth: 'none', height: 'auto', margin: '0 auto', cursor: 'zoom-out', opacity: enAttente ? 0 : 1 }
                : { display: 'block', height: '100%', width: 'auto', maxWidth: '100%', objectFit: 'contain', margin: '0 auto', cursor: 'zoom-in', opacity: enAttente ? 0 : 1, transition: 'opacity 0.2s ease-out' }}
            />
          )}
          {enAttente && (
            <div aria-busy="true" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <Anneau />
              <span className="cs-hors-ecran">Chargement du fac-similé</span>
            </div>
          )}
          {(introuvable || imageEnErreur) && (
            <p role="status" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: 0, padding: '0 24px', textAlign: 'center', fontFamily: SERIF, fontStyle: 'italic', fontSize: '0.8125rem', color: 'var(--cs-texte-second)' }}>
              {imageEnErreur ? 'L’image de cette colonne n’a pas pu être chargée.' : 'Cette colonne du manuscrit n’est pas disponible.'}
            </p>
          )}
        </div>

        <p style={{ flexShrink: 0, margin: 0, padding: '8px 20px 10px', borderTop: '1px solid var(--cs-bord-clair)', fontSize: '0.65625rem', color: 'var(--cs-texte-second)', lineHeight: 1.4 }}>
          Paris, Bibliothèque nationale de France, français 899.
        </p>
      </div>
    </div>,
    document.body,
  )
}
