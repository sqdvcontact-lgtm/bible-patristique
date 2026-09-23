'use client'

import { useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import { CadreRecuperation, Encart, STYLE_CHAMP, STYLE_ETIQUETTE, CLASSE_BOUTON, STYLE_BOUTON } from '../recuperation'

// ⛔ LE MÊME MESSAGE, que l'adresse ait un compte ou non. Dire « aucun compte ne
// porte cette adresse » apprendrait à n'importe qui quelles adresses sont inscrites.
// Une erreur de la base (débit dépassé, service injoignable) part au journal et
// rend le même accusé : le lecteur n'a rien à en faire, et recommencer suffit.
const ACCUSE = 'Si un compte est associé à cette adresse, un courriel vient de lui être envoyé. Il contient un lien pour choisir un nouveau mot de passe. Pensez à regarder dans les courriers indésirables.'

export default function MotDePasseOubliePage() {
  const [email, setEmail] = useState('')
  const [envoye, setEnvoye] = useState(false)
  const [occupe, setOccupe] = useState(false)

  const envoyer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || occupe) return
    setOccupe(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/nouveau-mot-de-passe`,
      })
      if (error) console.error('[mot de passe oublié] envoi refusé :', error.message)
    } catch (err) {
      console.error('[mot de passe oublié] envoi impossible :', err)
    } finally {
      setOccupe(false)
      setEnvoye(true)
    }
  }

  return (
    <CadreRecuperation titre="Mot de passe oublié">
      {envoye ? (
        <Encart ton="info">{ACCUSE}</Encart>
      ) : (
        <p style={{ fontSize: '0.8125rem', color: 'var(--cs-texte-second)', lineHeight: 1.6, margin: '0 0 1.125rem' }}>
          Indiquez l’adresse de votre compte. Vous recevrez un lien pour choisir un nouveau mot de passe.
        </p>
      )}
      <form onSubmit={envoyer} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
        <div>
          <label htmlFor="cs-email-oubli" style={STYLE_ETIQUETTE}>ADRESSE E-MAIL</label>
          <input id="cs-email-oubli" type="email" autoComplete="email" required value={email}
            onChange={e => setEmail(e.target.value)} placeholder="vous@exemple.fr" style={STYLE_CHAMP} />
        </div>
        <button type="submit" disabled={occupe} className={CLASSE_BOUTON} style={STYLE_BOUTON}>
          {occupe ? 'Envoi…' : envoye ? 'Renvoyer le lien' : 'Recevoir le lien'}
        </button>
      </form>
    </CadreRecuperation>
  )
}
