'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/app/lib/supabase'
import { useEspace } from '@/app/compte/EspaceCompte'
import { Carte, EnTeteRubrique, inputStyle, labelStyle, type Statut } from '@/app/compte/champsCompte'

function urlCompte(): string {
  if (typeof window !== 'undefined') return `${window.location.origin}/compte`
  return '/compte'
}

export default function RubriqueConnexion() {
  const router = useRouter()
  const { user } = useEspace()

  const [nouvelEmail, setNouvelEmail] = useState(user.email)
  const [statutEmail, setStatutEmail] = useState<Statut>(null)
  const [envoiEmail, setEnvoiEmail] = useState(false)

  const [nouveauMdp, setNouveauMdp] = useState('')
  const [confirmationMdp, setConfirmationMdp] = useState('')
  const [statutMdp, setStatutMdp] = useState<Statut>(null)
  const [envoiMdp, setEnvoiMdp] = useState(false)

  const [modaleSuppression, setModaleSuppression] = useState(false)
  const [consentSuppression, setConsentSuppression] = useState(false)
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
      <EnTeteRubrique titre="Connexion">
        L’adresse et le mot de passe qui ouvrent votre compte. La suppression se règle au bas de cette page.
      </EnTeteRubrique>

      <Carte titre="Adresse électronique">
        <label htmlFor="courriel" style={labelStyle}>ADRESSE E-MAIL</label>
        <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
          <input id="courriel" type="email" value={nouvelEmail} onChange={e => { setNouvelEmail(e.target.value); setStatutEmail(null) }} style={{ ...inputStyle, flex: 1 }} />
          <button onClick={modifierEmail} disabled={envoiEmail || !nouvelEmail.trim() || nouvelEmail.trim() === user.email}
            style={{ padding: '9px 14px', borderRadius: '8px', border: '1px solid var(--cs-bord)', background: 'var(--cs-surface)', color: 'var(--cs-vert)', fontSize: '0.78125rem', fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            {envoiEmail ? 'Envoi…' : 'Modifier'}
          </button>
        </div>
        {user.email_confirmed_at && !statutEmail && <p style={{ fontSize: '0.6875rem', color: 'var(--cs-vert)', margin: '5px 0 0' }}>✓ adresse vérifiée</p>}
        {statutEmail && <p style={{ fontSize: '0.71875rem', color: statutEmail.ok ? 'var(--cs-vert)' : 'var(--cs-danger-fonce)', margin: '5px 0 0', lineHeight: 1.5 }}>{statutEmail.msg}</p>}
      </Carte>

      <Carte titre="Mot de passe">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <input type="password" autoComplete="new-password" value={nouveauMdp} onChange={e => { setNouveauMdp(e.target.value); setStatutMdp(null) }} placeholder="Nouveau mot de passe" style={inputStyle} />
          <input type="password" autoComplete="new-password" value={confirmationMdp} onChange={e => { setConfirmationMdp(e.target.value); setStatutMdp(null) }} placeholder="Confirmer" style={inputStyle} />
        </div>
        <button onClick={modifierMotDePasse} disabled={envoiMdp || !nouveauMdp || !confirmationMdp}
          style={{ marginTop: '10px', padding: '7px 14px', borderRadius: '8px', border: '1px solid var(--cs-bord)', background: 'var(--cs-surface)', color: 'var(--cs-vert)', fontSize: '0.78125rem', fontWeight: 500, cursor: 'pointer' }}>
          {envoiMdp ? 'Modification…' : 'Changer le mot de passe'}
        </button>
        {statutMdp && <p style={{ fontSize: '0.71875rem', color: statutMdp.ok ? 'var(--cs-vert)' : 'var(--cs-danger-fonce)', margin: '8px 0 0', lineHeight: 1.5 }}>{statutMdp.msg}</p>}
      </Carte>

      <Carte titre="Suppression du compte" danger>
        <p style={{ fontSize: '0.75rem', color: 'var(--cs-texte-doux)', margin: '0 0 14px', lineHeight: 1.55 }}>
          Pour toute question avant suppression, écrivez à{' '}
          <a href="mailto:sqdv.contact@gmail.com" style={{ color: 'var(--cs-or)', textDecoration: 'none' }}>sqdv.contact@gmail.com</a>.
        </p>
        <button onClick={() => { setModaleSuppression(true); setConsentSuppression(false); setErreurSuppression(null) }}
          style={{ fontSize: '0.78125rem', padding: '7px 16px', borderRadius: '4px', border: '1px solid var(--cs-danger-bord)', background: 'var(--cs-surface)', color: 'var(--cs-danger)', cursor: 'pointer' }}>
          Supprimer mon compte
        </button>
      </Carte>

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
