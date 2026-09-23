'use client'

import { useRef, useState } from 'react'
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

  const envoyer = async () => {
    if (!message.trim()) return
    setStatut('sending')
    try {
      await onEnvoyer(message.trim(), avecNiveauImportance ? importance : undefined)
      setStatut('ok')
      setTimeout(onClose, 1800)
    } catch (error) { console.error('Erreur signalement:', error); setStatut('err') }
  }

  if (typeof document === 'undefined') return null
  return createPortal(
    <div onClick={onClose} className="cs-signalement-calque"
      // ⛔ 2800, non 2000 : le signalement s'ouvre DEPUIS le tiroir des commentaires d'un
      //    essai (voile 2400, tiroir 2401) et depuis les fiches (2700). À 2000 il paraissait
      //    SOUS le voile de ce qui l'avait appelé. Il reste sous la barre (3000).
      // ⛔ Le calque part du BAS DE LA BARRE, jamais de `inset: 0` : centré sur tout
      //    l'écran en paysage, son en-tête et sa croix passaient sous la barre, peinte
      //    par-dessus, et devenaient inatteignables (charte, § Fenêtres contextuelles).
      style={{ top: HAUTEUR_NAVBAR, zIndex: 2800 }}>
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
            <span aria-hidden="true" className="cs-signalement-merci-marque">
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.6}
                strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 8.4 6.4 11.8 13 5.2" />
              </svg>
            </span>
            <p className="cs-signalement-merci-titre">Signalement envoyé</p>
            <p className="cs-signalement-merci-note">Merci : il sera relu.</p>
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
