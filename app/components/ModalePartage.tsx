'use client'

// ── LA FENÊTRE DE PARTAGE — un message, sept portes ──────────────────────────
//
// Une seule fenêtre pour tout le site : la page d'une œuvre, un essai, un chapitre,
// une péricope. Elle montre CE QU'ELLE VA ENVOYER — la ligne et l'adresse — puis les
// canaux, chacun NOMMÉ. Ce que la ligne dit et comment elle se compose vit dans
// `app/lib/partage.ts` ; ici, il n'y a que le dessin et le geste.
//
// ⛔ LES CANAUX SONT NOMMÉS EN TOUTES LETTRES, et c'est ce qui permet de dessiner
// leurs marques AU TRAIT, dans l'idiome du site, plutôt que de coller six logos
// pleins sur un fond crème. La reconnaissance est portée par le MOT ; le glyphe n'a
// plus qu'à seconder. (La page d'œuvre s'interdisait jusqu'ici de nommer un réseau —
// « un site qui envoie chez l'un d'eux choisit à la place du lecteur ». La règle
// tombe par décision de l'auteur, 2026-09-10 : le lecteur choisit dans la fenêtre,
// et le lien nu, qui n'envoie nulle part, garde la première place.)
//
// ⛔ ET LA FENÊTRE NE PARLE PAS. Pas de phrase d'invitation, pas de mode d'emploi :
// « il faut que ce soit simple, peu de texte » (l'auteur, même jour).

import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { HAUTEUR_NAVBAR } from '@/app/lib/mesures'
import { Z_MODALE } from '@/app/lib/empilement'
import { useFermerAEchap } from '@/app/lib/useFermerAEchap'
import { verrouillerLeDefilement } from '@/app/lib/verrouDefilement'
import {
  CANAUX, adressePartage, ligneDePartage, messagePartage,
  type CleCanal, type SujetPartage,
} from '@/app/lib/partage'

/** Durée de l'accusé de réception du lien copié. La même que celle du bouton
 *  « copier » d'une ligne de lecture (`BoutonCopierTexte`) : deux accusés du même
 *  geste ne clignotent pas à des vitesses différentes. */
const DUREE_ACCUSE_MS = 1600

// ── LES MARQUES, AU TRAIT ────────────────────────────────────────────────────
// Toutes dans la même boîte de 24, au même trait de 1,4, comme les pictogrammes de la
// barre et de la rangée d'actions.
//
// ⛔ ELLES SE JUGENT RASTÉRISÉES À 21 px, LEUR TAILLE SERVIE, agrandies au plus proche
// voisin — `tmp/banc-marques-partage.mjs`, qui tire ses tracés de la planche déjà rendue
// et ne redessine donc rien de mémoire. C'est là, et là seulement, qu'on a vu la croix
// de X se lire « fermer » (voir sous `x`).

const TRAIT = { stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

const MARQUES: Record<CleCanal, React.ReactNode> = {
  lien: <>
    <path d="M10 14a3.5 3.5 0 0 0 5 0l3-3a3.5 3.5 0 0 0-5-5l-1.5 1.5" {...TRAIT} />
    <path d="M14 10a3.5 3.5 0 0 0-5 0l-3 3a3.5 3.5 0 0 0 5 5l1.5-1.5" {...TRAIT} />
  </>,
  courriel: <>
    <rect x="3.2" y="5.8" width="17.6" height="12.4" rx="1.8" {...TRAIT} />
    <path d="m3.8 7.2 8.2 5.8 8.2-5.8" {...TRAIT} />
  </>,
  whatsapp: <>
    <path d="M20.6 11.7a8.5 8.5 0 0 1-12.5 7.5l-4.7 1.4 1.5-4.5A8.5 8.5 0 1 1 20.6 11.7Z" {...TRAIT} />
    {/* Le combiné, à part et RÉDUIT : c'est le tracé du téléphone du site, posé au
        centre de la bulle. Son trait est divisé par l'échelle pour rendre le même. */}
    <path transform="translate(6.55 5.95) scale(0.43)" strokeWidth={3.1} stroke="currentColor" fill="none"
      strokeLinecap="round" strokeLinejoin="round"
      d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.1 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7 12.8 12.8 0 0 0 .7 2.8 2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4 12.8 12.8 0 0 0 2.8.7 2 2 0 0 1 1.7 2Z" />
  </>,
  facebook: <>
    <rect x="3.5" y="3.5" width="17" height="17" rx="3.6" {...TRAIT} />
    <path d="M14.9 7.7h-1.6a1.9 1.9 0 0 0-1.9 1.9v7.9" {...TRAIT} />
    <path d="M9.6 12.3h4.6" {...TRAIT} />
  </>,
  // ⛔ LE GLYPHE NU, ÉPAIS, D'ANGLE À ANGLE, À BOUTS FRANCS — jamais une croix fine dans
  // un carré : jugée rastérisée à 21 px (`tmp/banc-x-partage.mjs`), celle-là se lit
  // « fermer », qui est le contraire de ce que la tuile propose. La marque de X EST une
  // croix, et ce sont sa graisse et ses bouts coupés qui la distinguent d'une croix de
  // fermeture. ⚠️ Facebook garde son carré : un « f » nu ne dit rien.
  x: <>
    <path d="M4.6 4.6 19.4 19.4" stroke="currentColor" strokeWidth={2.5} strokeLinecap="butt" />
    <path d="M19.4 4.6 4.6 19.4" stroke="currentColor" strokeWidth={2.5} strokeLinecap="butt" />
  </>,
  telegram: <>
    <path d="M21.2 4.3 2.9 11.4l5.6 2.1 1.9 5.7 2.6-3.1 4.6 3.3z" {...TRAIT} />
    <path d="m8.5 13.5 12.7-9.2" {...TRAIT} />
  </>,
  natif: <>
    <circle cx="18" cy="5.1" r="2.85" {...TRAIT} />
    <circle cx="18" cy="18.9" r="2.85" {...TRAIT} />
    <circle cx="5.55" cy="12" r="2.85" {...TRAIT} />
    <path d="m8.1 10.65 7.35-4.05m-7.35 6.75 7.35 4.05" {...TRAIT} />
  </>,
}

const MARQUE_COPIE = <path d="m5.5 12.4 4.3 4.3 8.7-9.4" {...TRAIT} strokeWidth={1.7} />

function Glyphe({ enfants }: { enfants: React.ReactNode }) {
  return <svg width="21" height="21" viewBox="0 0 24 24" fill="none" aria-hidden="true">{enfants}</svg>
}

/**
 * LE PROPOS DE LA FENÊTRE, séparé d'elle : la ligne, l'adresse, les canaux.
 *
 * ⚠️ AUCUN CROCHET ici, et c'est nécessaire : `createPortal` n'existe pas au rendu
 * serveur, et sans cette coupure aucune planche de contrôle ne pourrait rendre la
 * fenêtre hors session — c'est le parti de `ContenuFicheTraduction` et de
 * `ProposVisite`, et il vaut pour la même raison.
 */
export function ProposPartage({ ligne, adresse, canaux, copie, erreur, onCopier, onNatif, onFermer }: {
  ligne: string
  adresse: string
  canaux: { cle: CleCanal; nom: string }[]
  copie: boolean
  erreur: string | null
  onCopier: () => void
  onNatif: () => void
  onFermer: () => void
}) {
  return (
    <>
      <style>{`
        .cs-canal { transition: border-color .14s, color .14s, background .14s; }
        .cs-canal:hover { border-color: var(--cs-vert); color: var(--cs-vert); background: var(--cs-fond-clair); }
        .cs-canal:focus-visible { outline: 2px solid var(--cs-vert); outline-offset: 2px; }
      `}</style>

      <button onClick={onFermer} aria-label="Fermer" className="cs-cible-fine" title="Fermer"
        style={{ position: 'sticky', float: 'right', top: 0, marginRight: '-6px', width: '26px', height: '26px', borderRadius: '50%', border: '1px solid var(--cs-bord-clair)', background: 'var(--cs-surface)', color: 'var(--cs-texte-doux)', fontSize: '0.875rem', lineHeight: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>

      <h2 id="cs-partage-titre" style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '1.0625rem', fontWeight: 500, color: 'var(--cs-encre-fonce)', margin: 0 }}>
        Partager
      </h2>

      {/* CE QUI PART, montré tel quel : la ligne, puis l'adresse. Un partage dont on
          ne voit pas le message se donne à l'aveugle. */}
      <div style={{ marginTop: '12px', padding: '10px 12px', background: 'var(--cs-surface)', border: '1px solid var(--cs-bord-clair)', borderRadius: '8px' }}>
        <p style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '0.8125rem', lineHeight: 1.4, color: 'var(--cs-encre)', margin: 0 }}>
          {ligne}
        </p>
        <p title={adresse} style={{ fontSize: '0.6875rem', lineHeight: 1.4, color: 'var(--cs-texte-second)', margin: '5px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {adresse}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginTop: '14px' }}>
        {canaux.map(({ cle, nom }) => {
          const destination = adressePartage(cle, ligne, adresse)
          const libelle = cle === 'lien' && copie ? 'Lien copié' : nom
          const marque = cle === 'lien' && copie ? MARQUE_COPIE : MARQUES[cle]
          const forme: React.CSSProperties = {
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '7px',
            minHeight: '4.25rem', padding: '10px 4px', borderRadius: '8px',
            border: '1px solid var(--cs-bord-clair)', background: 'var(--cs-surface)',
            color: cle === 'lien' && copie ? 'var(--cs-vert)' : 'var(--cs-texte-second)',
            fontFamily: 'var(--font-source-sans), Arial, sans-serif', fontSize: '0.6875rem', lineHeight: 1.2,
            textAlign: 'center', textDecoration: 'none', cursor: 'pointer',
          }
          const contenu = <><Glyphe enfants={marque} /><span>{libelle}</span></>

          // ⚠️ Un geste (copier, appeler la feuille du système) est un BOUTON ; une
          // destination est un LIEN, qu'on doit pouvoir ouvrir dans un autre onglet.
          if (destination === null) {
            return (
              <button key={cle} type="button" className="cs-canal" style={forme}
                onClick={cle === 'lien' ? onCopier : onNatif}>
                {contenu}
              </button>
            )
          }
          // ⛔ `mailto:` ne prend PAS de nouvel onglet : le client de courrier s'ouvre
          // par-dessus, et l'onglet vide resterait ouvert derrière lui.
          const nouvelOnglet = destination.startsWith('http')
          return (
            <a key={cle} href={destination} className="cs-canal" style={forme}
              {...(nouvelOnglet ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
              {contenu}
            </a>
          )
        })}
      </div>

      <p role="status" aria-live="polite" style={{ fontSize: '0.6875rem', lineHeight: 1.45, color: erreur ? 'var(--cs-danger-fonce)' : 'var(--cs-texte-second)', margin: '12px 0 0', minHeight: '1rem' }}>
        {erreur ?? (copie ? 'Lien copié dans le presse-papiers.' : '')}
      </p>
    </>
  )
}

export default function ModalePartage({ sujet, url, onFermer }: {
  sujet: SujetPartage
  /** L'adresse partagée. Par défaut celle qu'on lit — habits de lecture compris :
   *  on partage la page TELLE QU'ON L'A SOUS LES YEUX. */
  url?: string
  onFermer: () => void
}) {
  const [adresse] = useState(() => url ?? (typeof window === 'undefined' ? '' : window.location.href))
  const [copie, setCopie] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  // ⚠️ La feuille de partage du système ne s'annonce qu'au NAVIGATEUR, et la question se
  // pose UNE fois, à la pose. ⛔ Pas dans un effet, qui déclencherait un rendu en cascade
  // (le linter le refuse) : la fenêtre ne se monte qu'après un clic, donc jamais au rendu
  // serveur, et l'initialiseur paresseux ne peut pas faire diverger les deux.
  const [feuilleSysteme] = useState(() => typeof navigator !== 'undefined' && typeof navigator.share === 'function')

  useFermerAEchap(true, onFermer)
  useEffect(() => verrouillerLeDefilement(), [])

  const ligne = ligneDePartage(sujet)

  const copierLien = useCallback(async () => {
    setErreur(null)
    try {
      await navigator.clipboard.writeText(messagePartage(ligne, adresse))
      setCopie(true)
      setTimeout(() => setCopie(false), DUREE_ACCUSE_MS)
    } catch {
      setErreur('La copie a échoué. Le lien est ci-dessus, à recopier à la main.')
    }
  }, [ligne, adresse])

  const partageSysteme = useCallback(async () => {
    // Un partage abandonné n'est pas une erreur : on ne dit rien, on ne ferme pas.
    await navigator.share({ title: ligne, text: ligne, url: adresse }).catch(() => {})
  }, [ligne, adresse])

  if (typeof document === 'undefined') return null

  const canaux = CANAUX.filter(c => c.cle !== 'natif' || feuilleSysteme)

  return createPortal(
    /* ⛔ Le calque part de HAUTEUR_NAVBAR, jamais d'un nombre de pixels : la barre
       mesure 56 px à la racine 16 et 77 à la racine 22. */
    <div onClick={onFermer}
      style={{ position: 'fixed', top: HAUTEUR_NAVBAR, left: 0, right: 0, bottom: 0, background: 'var(--cs-calque-modale)', zIndex: Z_MODALE, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', overflow: 'hidden' }}>
      <div role="dialog" aria-modal="true" aria-labelledby="cs-partage-titre" onClick={e => e.stopPropagation()}
        style={{ position: 'relative', width: '100%', maxWidth: '24rem', maxHeight: '100%', overflowY: 'auto', overscrollBehavior: 'contain', background: 'var(--cs-fond)', borderRadius: '12px', border: '1px solid var(--cs-bord-clair)', boxShadow: 'var(--cs-ombre-modale)', padding: '22px 24px 20px' }}>
        <ProposPartage ligne={ligne} adresse={adresse} canaux={canaux} copie={copie} erreur={erreur}
          onCopier={copierLien} onNatif={partageSysteme} onFermer={onFermer} />
      </div>
    </div>,
    document.body,
  )
}
