'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import { useEspace } from '@/app/compte/EspaceCompte'
import { inputStyle, type Statut } from '@/app/compte/champsCompte'
import { Rangee } from '@/app/compte/piecesEspace'

/** Le bouton d'une action secondaire, à côté d'un champ. */
const BTN_DISCRET: React.CSSProperties = {
  padding: '6px 13px', borderRadius: '4px', border: '1px solid var(--cs-bord)',
  background: 'var(--cs-surface)', color: 'var(--cs-vert)', fontSize: '0.71875rem',
  cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit',
}

function urlCompte(): string {
  if (typeof window !== 'undefined') return `${window.location.origin}/compte`
  return '/compte'
}

/** Le bloc Connexion : adresse, mot de passe, et la modale de suppression que le
 *  pied de page ouvre. ⛔ Plus de cartes ni d'en-tête : il est une SECTION d'une
 *  page unique depuis la refonte du 1er septembre 2026. */
export default function BlocConnexion({ ouvrirSuppression, onSuppressionOuverte }: {
  ouvrirSuppression: boolean
  onSuppressionOuverte: (v: boolean) => void
}) {
  const router = useRouter()
  const { user } = useEspace()

  const [nouvelEmail, setNouvelEmail] = useState(user.email)
  const [statutEmail, setStatutEmail] = useState<Statut>(null)
  const [envoiEmail, setEnvoiEmail] = useState(false)

  const [nouveauMdp, setNouveauMdp] = useState('')
  const [confirmationMdp, setConfirmationMdp] = useState('')
  const [statutMdp, setStatutMdp] = useState<Statut>(null)
  const [envoiMdp, setEnvoiMdp] = useState(false)

  const modaleSuppression = ouvrirSuppression
  const setModaleSuppression = onSuppressionOuverte
  const [consentSuppression, setConsentSuppression] = useState(false)
  useEffect(() => { if (ouvrirSuppression) { setConsentSuppression(false); setErreurSuppression(null) } }, [ouvrirSuppression])
  const [suppressionEnCours, setSuppressionEnCours] = useState(false)
  const [erreurSuppression, setErreurSuppression] = useState<string | null>(null)

  const modifierEmail = async () => {
    if (!nouvelEmail.trim() || nouvelEmail.trim() === user.email) return
    setEnvoiEmail(true); setStatutEmail(null)
    const { error } = await supabase.auth.updateUser({ email: nouvelEmail.trim() }, { emailRedirectTo: urlCompte() })
    setEnvoiEmail(false)
    if (error) { setStatutEmail({ ok: false, msg: 'L’adresse n’a pas pu être modifiée. Vérifiez l’adresse saisie et réessayez.' }); return }
    setStatutEmail({ ok: true, msg: 'Un e-mail de confirmation a été envoyé à la nouvelle adresse.' })
  }

  const modifierMotDePasse = async () => {
    setStatutMdp(null)
    if (nouveauMdp.length < 6) { setStatutMdp({ ok: false, msg: 'Le mot de passe doit contenir au moins 6 caractères.' }); return }
    if (nouveauMdp !== confirmationMdp) { setStatutMdp({ ok: false, msg: 'Les deux mots de passe ne correspondent pas.' }); return }
    setEnvoiMdp(true)
    const { error } = await supabase.auth.updateUser({ password: nouveauMdp })
    setEnvoiMdp(false)
    if (error) { setStatutMdp({ ok: false, msg: 'Le mot de passe n’a pas pu être modifié. Réessayez.' }); return }
    setNouveauMdp(''); setConfirmationMdp('')
    setStatutMdp({ ok: true, msg: 'Mot de passe modifié.' })
  }

  const supprimerCompte = async () => {
    setSuppressionEnCours(true); setErreurSuppression(null)
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    if (!token) { setErreurSuppression('Session expirée — reconnectez-vous puis réessayez.'); setSuppressionEnCours(false); return }
    const res = await fetch('/api/compte/supprimer', { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) {
      setErreurSuppression('Le compte n’a pas pu être supprimé. Réessayez.')
      setSuppressionEnCours(false); return
    }
    await supabase.auth.signOut()
    router.push('/accueil')
  }

  return (
    <>
      <Rangee label="Adresse" pour="courriel"
        note={statutEmail ? <span style={{ color: statutEmail.ok ? 'var(--cs-vert)' : 'var(--cs-danger-fonce)' }}>{statutEmail.msg}</span>
          : user.email_confirmed_at ? 'Adresse vérifiée.' : 'Adresse non confirmée.'}>
        <span style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input id="courriel" type="email" className="esp-moyen" style={inputStyle} value={nouvelEmail}
            onChange={e => { setNouvelEmail(e.target.value); setStatutEmail(null) }} />
          <button onClick={modifierEmail} disabled={envoiEmail || !nouvelEmail.trim() || nouvelEmail.trim() === user.email}
            style={BTN_DISCRET}>{envoiEmail ? 'Envoi…' : 'Modifier'}</button>
        </span>
      </Rangee>

      {/* ⚠️ Le mot de passe garde SON bouton : ce n'est pas un champ du profil mais
          une action d'authentification, qui part chez Supabase et non dans la même
          écriture. Un seul « Enregistrer » ne peut pas couvrir les deux. */}
      <Rangee label="Mot de passe"
        note={statutMdp ? <span style={{ color: statutMdp.ok ? 'var(--cs-vert)' : 'var(--cs-danger-fonce)' }}>{statutMdp.msg}</span> : 'Six caractères au moins.'}>
        <span style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input type="password" autoComplete="new-password" className="esp-court" style={inputStyle}
            value={nouveauMdp} onChange={e => { setNouveauMdp(e.target.value); setStatutMdp(null) }} placeholder="Nouveau" />
          <input type="password" autoComplete="new-password" className="esp-court" style={inputStyle}
            value={confirmationMdp} onChange={e => { setConfirmationMdp(e.target.value); setStatutMdp(null) }} placeholder="Confirmer" />
          <button onClick={modifierMotDePasse} disabled={envoiMdp || !nouveauMdp || !confirmationMdp} style={BTN_DISCRET}>
            {envoiMdp ? 'Modification…' : 'Changer'}
          </button>
        </span>
      </Rangee>

      {modaleSuppression && (
        <div onClick={() => !suppressionEnCours && setModaleSuppression(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="titre-suppression"
            style={{ background: 'var(--cs-surface)', borderRadius: '12px', padding: '32px', width: '30rem', maxWidth: '100%', boxShadow: 'var(--cs-ombre-modale)' }}>
            <h2 id="titre-suppression" style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '1.125rem', fontWeight: 'normal', color: 'var(--cs-texte-fort)', margin: '0 0 16px' }}>Suppression du compte</h2>
            <p style={{ fontSize: '0.78125rem', color: 'var(--cs-texte)', lineHeight: 1.65, margin: '0 0 14px' }}>
              Cette action est <strong>irrémédiable</strong>. Elle entraînera la suppression immédiate et définitive de :
            </p>
            <ul style={{ fontSize: '0.75rem', color: 'var(--cs-texte-second)', lineHeight: 1.8, margin: '0 0 20px', paddingLeft: '18px' }}>
              <li>Votre profil et toutes vos informations personnelles</li>
              <li>Vos essais publiés et brouillons</li>
              <li>Tous vos commentaires</li>
              <li>Vos citations enregistrées</li>
              <li>Votre bibliothèque et œuvres favorites</li>
              <li>Vos versets enregistrés</li>
              <li>Votre historique et points de rang</li>
            </ul>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', cursor: 'pointer', marginBottom: '20px' }}>
              <input type="checkbox" checked={consentSuppression} onChange={e => setConsentSuppression(e.target.checked)}
                style={{ marginTop: '2px', flexShrink: 0, accentColor: 'var(--cs-danger)' }} />
              <span style={{ fontSize: '0.78125rem', color: 'var(--cs-texte)', lineHeight: 1.5 }}>
                J’ai compris que cette action est définitive et irrémédiable. Je confirme vouloir supprimer mon compte.
              </span>
            </label>
            {erreurSuppression && <p style={{ fontSize: '0.75rem', color: 'var(--cs-danger-fonce)', marginBottom: '12px' }}>{erreurSuppression}</p>}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={() => setModaleSuppression(false)} disabled={suppressionEnCours}
                style={{ fontSize: '0.78125rem', padding: '7px 16px', borderRadius: '8px', border: '1px solid var(--cs-bord)', background: 'var(--cs-surface)', color: 'var(--cs-texte-second)', cursor: 'pointer' }}>
                Annuler
              </button>
              <button onClick={supprimerCompte} disabled={suppressionEnCours || !consentSuppression}
                style={{ fontSize: '0.78125rem', padding: '7px 16px', borderRadius: '8px', border: 'none', background: consentSuppression ? 'var(--cs-danger-aplat)' : 'var(--cs-danger-bord)', color: 'var(--cs-sur-aplat)', fontWeight: 500, cursor: consentSuppression ? 'pointer' : 'default', transition: 'background 0.15s' }}>
                {suppressionEnCours ? 'Suppression…' : 'Supprimer définitivement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
