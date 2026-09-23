'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { rendreTexteEnrichi } from '@/app/oeuvre/[id]/texteEnrichi'
import { HAUTEUR_NAVBAR } from '@/app/lib/mesures'
import { useFermerAEchap } from '@/app/lib/useFermerAEchap'
import { useFenetreModale } from '@/app/lib/useFenetreModale'
import IconeCroix from './IconeCroix'

// Modale de signalement UNIQUE, partagée par toutes les pages (Bible, Œuvre,
// Polyglotte, Panneau patristique…). Même mise en forme partout.
// `texteObjet` affiche le texte cité EN ENTIER, sous les yeux du rédacteur, afin
// qu'il garde l'objet du signalement devant lui pendant qu'il écrit.
//
// ⛔ AUCUNE COULEUR N'EST ÉCRITE ICI (reprise du 2026-09-21, pour le Cuir) : toute la
// forme vit dans globals.css, § « LA MODALE DE SIGNALEMENT » (`.cs-signalement-*`), et
// les trois niveaux d'importance ont leurs jetons (`--cs-importance-*`), déclinés dans
// les deux thèmes. Depuis le 2026-09-23 la fenêtre est ROUGE d'un bout à l'autre : seuls
// le passage cité et le champ gardent un fond clair, pour qu'on y lise et qu'on y écrive.

/**
 * Le temps que l'accusé de réception reste sous les yeux avant que la fenêtre ne se ferme
 * d'elle-même (demande de l'auteur, 2026-09-23 : « la fenêtre qui s'ouvre se ferme trop
 * vite ; ajouter un symbole de chargement (rond) pour signaler que la fenêtre se ferme
 * dans… N secondes »). Elle se fermait au bout de 1,8 s, sans rien annoncer : on n'avait
 * pas fini de lire qu'elle était partie.
 *
 * ⛔ IL N'EST ÉCRIT QU'UNE FOIS, et c'est la règle de `DELAI_CONFIRMATION_MS` (FicheModele) :
 *    l'anneau reçoit sa durée EN LIGNE depuis cette constante, et la feuille ne pose que le
 *    mouvement. Deux écritures d'un même délai — l'une en millisecondes ici, l'autre en
 *    secondes dans une règle CSS — se désaccorderaient au premier réglage, et la fenêtre se
 *    fermerait avant que l'anneau n'ait fini son tour.
 */
const DELAI_FERMETURE_MS = 6000

/**
 * Le fondu par lequel la fenêtre s'en va, une fois le compte tombé (relevé de l'auteur,
 * 2026-09-23 : « le symbole de chargement manque un peu de fluidité »). Elle disparaissait
 * d'un coup à zéro, l'anneau encore visible : la fin coupait le mouvement au lieu de le
 * finir. ⚠️ Même règle que `DELAI_FERMETURE_MS` : la durée passe EN LIGNE à l'animation,
 * et la feuille ne pose que le mouvement.
 */
const DUREE_SORTIE_MS = 240

/** Le tour de l'anneau, en unités du tracé (2 π r, r = 9). */
const TOUR_ANNEAU = 2 * Math.PI * 9

const NIVEAUX = [
  { val: 'mineur', label: 'Mineur' },
  { val: 'important', label: 'Important' },
  { val: 'bloquant', label: 'Bloquant' },
] as const

type Niveau = 'mineur' | 'important' | 'bloquant'

export default function ModalSignalement({ titre, texteObjet, onClose, onEnvoyer, avecNiveauImportance = false, titreFenetre = 'Signaler une erreur', placeholder = "Décrivez l'erreur constatée…" }: {
  titre?: string
  texteObjet?: string
  onClose: () => void
  onEnvoyer: (msg: string, importance?: string) => Promise<void>
  avecNiveauImportance?: boolean
  titreFenetre?: string
  placeholder?: string
}) {
  useFermerAEchap(true, onClose)
  const boite = useRef<HTMLDivElement>(null)
  useFenetreModale(boite)
  const [message, setMessage] = useState('')
  const [statut, setStatut] = useState<'idle' | 'sending' | 'ok' | 'err'>('idle')
  const [importance, setImportance] = useState<Niveau>('important')

  // ⚠️ Le compte à rebours ne part QU'APRÈS l'envoi : il n'existe pas tant que `statut`
  // ne vaut pas 'ok', et il se retire avec la fenêtre. `null` dit qu'il ne tourne pas.
  const [reste, setReste] = useState<number | null>(null)

  const envoyer = async () => {
    if (!message.trim()) return
    setStatut('sending')
    try {
      await onEnvoyer(message.trim(), avecNiveauImportance ? importance : undefined)
      setStatut('ok')
      setReste(Math.round(DELAI_FERMETURE_MS / 1000))
    } catch (error) { console.error('Erreur signalement:', error); setStatut('err') }
  }

  // ⛔ UN SEUL MINUTEUR POUR LE COMPTE ET POUR LA FERMETURE : deux minuteurs indépendants
  //    — l'un qui décompte de seconde en seconde, l'autre qui ferme au bout du délai — se
  //    désaccorderaient de quelques dizaines de millisecondes, et la fenêtre se fermerait
  //    tantôt sur « 1 », tantôt sur « 0 ». Ici, c'est le compte qui ferme quand il tombe.
  // ⚠️ Le minuteur se retire au démontage : une fenêtre fermée à la croix pendant le
  //    rebours ne doit pas rappeler `onClose` une seconde plus tard.
  useEffect(() => {
    if (reste === null) return
    // ⚠️ À zéro, la fenêtre ne part pas encore : elle s'efface (`sortie`, déduite du
    // compte, sans état de plus), puis se ferme au bout du fondu.
    if (reste <= 0) {
      const t = setTimeout(onClose, DUREE_SORTIE_MS)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setReste(n => (n === null ? null : n - 1)), 1000)
    return () => clearTimeout(t)
  }, [reste, onClose])

  const sortie = reste !== null && reste <= 0

  if (typeof document === 'undefined') return null
  return createPortal(
    <div onClick={onClose} className={`cs-signalement-calque${sortie ? ' cs-signalement-calque--sortie' : ''}`}
      // ⛔ 2800, non 2000 : le signalement s'ouvre DEPUIS le tiroir des commentaires d'un
      //    essai (voile 2400, tiroir 2401) et depuis les fiches (2700). À 2000 il paraissait
      //    SOUS le voile de ce qui l'avait appelé. Il reste sous la barre (3000).
      // ⛔ Le calque part du BAS DE LA BARRE, jamais de `inset: 0` : centré sur tout
      //    l'écran en paysage, son en-tête et sa croix passaient sous la barre, peinte
      //    par-dessus, et devenaient inatteignables (charte, § Fenêtres contextuelles).
      // ⚠️ Le fondu de sortie se pose sur le CALQUE : le voile s'efface avec la fenêtre,
      //    au lieu de rester sombre une image après elle.
      style={{ top: HAUTEUR_NAVBAR, zIndex: 2800, ...(sortie ? { animationDuration: `${DUREE_SORTIE_MS}ms` } : null) }}>
      <div ref={boite} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={titreFenetre}
        className="cs-signalement-boite">
        <div className="cs-signalement-tete">
          <p className="cs-signalement-titre">{titreFenetre}</p>
          <button type="button" onClick={onClose} aria-label="Fermer" className="cs-signalement-fermer cs-cible-fine">
            <IconeCroix />
          </button>
        </div>

        {statut === 'ok' ? (
          <div role="status" className="cs-signalement-merci">
            {/* ⛔ L'ANNEAU DU REBOURS EST LA MARQUE ELLE-MÊME, et non un objet de plus posé à
                côté : le filet de la marque cochée devient la piste, et un arc se vide dessus.
                Une seconde rondelle sous un rond déjà là aurait fait deux cercles pour une
                seule information. ⚠️ Sa DURÉE vient de `DELAI_FERMETURE_MS`, en style en ligne :
                la feuille ne pose que le mouvement (globals.css, `.cs-signalement-rebours`). */}
            <span aria-hidden="true" className="cs-signalement-merci-marque">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6}
                strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 8.4 6.4 11.8 13 5.2" />
              </svg>
              {reste !== null && (
                <svg className="cs-signalement-rebours" viewBox="0 0 20 20" role="presentation">
                  <circle cx="10" cy="10" r="9"
                    style={{ strokeDasharray: TOUR_ANNEAU, animationDuration: `${DELAI_FERMETURE_MS}ms` }} />
                </svg>
              )}
            </span>
            <p className="cs-signalement-merci-titre">Signalement envoyé</p>
            <p className="cs-signalement-merci-note">Merci : il sera relu.</p>
            {/* ⚠️ Le compte se dit EN CHIFFRES, et il est le seul objet mouvant de la fenêtre :
                l'anneau ne se lit pas à la synthèse vocale, et une région vivante le dit à sa
                place. ⛔ Elle n'est PAS assertive : elle ne doit pas couper l'annonce de
                « Signalement envoyé », qui est ce qu'on est venu lire. */}
            {reste !== null && (
              <p className="cs-signalement-merci-rebours">
                Cette fenêtre se ferme dans{' '}
                {/* ⚠️ Le CHIFFRE se remonte à chaque seconde (sa `key`) et entre en fondu :
                    il ne saute plus d'une valeur à l'autre. */}
                <span key={reste} className="cs-signalement-merci-chiffre">{Math.max(reste, 0)}</span>
                &nbsp;seconde{reste > 1 ? 's' : ''}.
              </p>
            )}
          </div>
        ) : (
          <div className="cs-signalement-corps">
            {(titre || texteObjet) && (
              <div className="cs-signalement-objet">
                <span className="cs-signalement-rubrique">Objet du signalement</span>
                {titre && <p className="cs-signalement-objet-titre">{titre}</p>}
                {texteObjet && (
                  <blockquote className="cs-signalement-cite">
                    {rendreTexteEnrichi(texteObjet)}
                  </blockquote>
                )}
              </div>
            )}

            {avecNiveauImportance && (
              <fieldset className="cs-signalement-niveaux">
                <legend><span className="cs-signalement-rubrique">Importance</span></legend>
                {NIVEAUX.map(n => (
                  <button key={n.val} type="button" onClick={() => setImportance(n.val)}
                    aria-pressed={importance === n.val}
                    className={`cs-signalement-niveau cs-signalement-niveau--${n.val}`}>
                    {n.label}
                  </button>
                ))}
              </fieldset>
            )}

            <textarea aria-label="Description du problème" value={message} onChange={e => setMessage(e.target.value)}
              placeholder={placeholder} rows={4} autoFocus className="cs-signalement-champ" />

            <div className="cs-signalement-pied">
              {statut === 'err' && <span role="alert" className="cs-signalement-erreur">Le signalement n’a pas pu être envoyé. Réessayez.</span>}
              <button type="button" onClick={onClose} className="cs-signalement-bouton cs-signalement-bouton--annuler">Annuler</button>
              <button type="button" onClick={envoyer} disabled={statut === 'sending' || !message.trim()}
                className="cs-signalement-bouton cs-signalement-bouton--envoyer">
                {statut === 'sending' ? 'Envoi…' : 'Envoyer'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
