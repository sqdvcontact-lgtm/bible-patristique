'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/app/lib/supabase'
import { CadreRecuperation, Encart, STYLE_CHAMP, STYLE_ETIQUETTE, styleBouton } from '../recuperation'

// La page où mène le lien du courriel de récupération.
//
// ⚠️ DEUX FORMES DE LIEN, et la page sait lire les deux :
// - `?code=…` : le flux PKCE, celui du modèle de courriel par défaut. Le client du
//   navigateur (`createBrowserClient`) échange le code de lui-même à son
//   initialisation ; `getSession()` attend cet échange. ⚠️ Il demande le vérificateur
//   posé par le navigateur qui a fait la demande : ouvert sur un autre appareil, le
//   lien échoue, et la page le dit.
// - `?token_hash=…&type=recovery` : la forme d'un modèle de courriel réécrit, qui
//   marche d'un appareil à l'autre. On la vérifie par `verifyOtp`.
// Un lien périmé revient avec `error_code` dans l'adresse (requête ou fragment).

const LONGUEUR_MIN = 8

type Etat = 'verification' | 'pret' | 'invalide' | 'fait'

function parametreDeLAdresse(nom: string): string | null {
  const requete = new URLSearchParams(window.location.search)
  const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  return requete.get(nom) ?? fragment.get(nom)
}

export default function NouveauMotDePassePage() {
  const [etat, setEtat] = useState<Etat>('verification')
  const [mdp, setMdp] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [occupe, setOccupe] = useState(false)

  useEffect(() => {
    let vivant = true
    const { data: abonnement } = supabase.auth.onAuthStateChange(evenement => {
      if (evenement === 'PASSWORD_RECOVERY' && vivant) setEtat('pret')
    })

    const verifier = async () => {
      if (parametreDeLAdresse('error_code') || parametreDeLAdresse('error')) {
        if (vivant) setEtat('invalide')
        return
      }
      const tokenHash = parametreDeLAdresse('token_hash')
      if (tokenHash) {
        const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' })
        if (!vivant) return
        // Le jeton est à usage unique : on le retire de l'adresse, qu'un
        // rechargement ne le présente pas une seconde fois.
        window.history.replaceState(null, '', window.location.pathname)
        setEtat(error ? 'invalide' : 'pret')
        return
      }
      const { data } = await supabase.auth.getSession()
      if (!vivant) return
      if (parametreDeLAdresse('code')) window.history.replaceState(null, '', window.location.pathname)
      setEtat(etatCourant => (etatCourant === 'pret' || data.session ? 'pret' : 'invalide'))
    }
    verifier().catch(err => {
      console.error('[nouveau mot de passe] vérification du lien impossible :', err)
      if (vivant) setEtat('invalide')
    })

    return () => { vivant = false; abonnement.subscription.unsubscribe() }
  }, [])

  const enregistrer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (occupe) return
    if (mdp.length < LONGUEUR_MIN) { setErreur(`Le mot de passe doit compter au moins ${LONGUEUR_MIN} caractères.`); return }
    if (mdp !== confirmation) { setErreur('Les deux mots de passe ne sont pas identiques.'); return }
    setErreur(null)
    setOccupe(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: mdp })
      if (error) {
        setErreur(error.code === 'same_password'
          ? 'Ce mot de passe est celui que vous aviez déjà. Choisissez-en un autre.'
          : error.code === 'weak_password'
            ? 'Ce mot de passe est trop faible. Choisissez-en un plus long ou plus varié.'
            : 'Le mot de passe n’a pas pu être enregistré. Réessayez, ou demandez un nouveau lien.')
        return
      }
      setEtat('fait')
    } catch {
      setErreur('Le mot de passe n’a pas pu être enregistré. Vérifiez votre connexion, puis réessayez.')
    } finally {
      setOccupe(false)
    }
  }

  if (etat === 'verification') {
    return (
      <CadreRecuperation titre="Nouveau mot de passe">
        <p role="status" style={{ fontSize: '0.8125rem', color: 'var(--cs-texte-second)', textAlign: 'center', margin: 0 }}>
          Vérification du lien…
        </p>
      </CadreRecuperation>
    )
  }

  if (etat === 'invalide') {
    return (
      <CadreRecuperation titre="Nouveau mot de passe">
        <Encart ton="erreur">
          Ce lien n’est plus valable. Il a peut-être expiré, déjà servi, ou été ouvert dans un autre navigateur que celui de la demande.
        </Encart>
        <p style={{ fontSize: '0.8125rem', color: 'var(--cs-texte-second)', lineHeight: 1.6, margin: 0, textAlign: 'center' }}>
          <Link href="/auth/mot-de-passe-oublie" className="cs-lien-phrase">Demander un nouveau lien</Link>
        </p>
      </CadreRecuperation>
    )
  }

  if (etat === 'fait') {
    return (
      <CadreRecuperation titre="Nouveau mot de passe">
        <Encart ton="info">Votre mot de passe est enregistré. Vous êtes connecté.</Encart>
        <p style={{ fontSize: '0.8125rem', textAlign: 'center', margin: 0 }}>
          <Link href="/accueil" className="cs-lien-phrase">Aller à l’accueil</Link>
        </p>
      </CadreRecuperation>
    )
  }

  return (
    <CadreRecuperation titre="Nouveau mot de passe">
      {erreur && <Encart ton="erreur">{erreur}</Encart>}
      <form onSubmit={enregistrer} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
        <div>
          <label htmlFor="cs-mdp-nouveau" style={STYLE_ETIQUETTE}>NOUVEAU MOT DE PASSE</label>
          <input id="cs-mdp-nouveau" type="password" autoComplete="new-password" required minLength={LONGUEUR_MIN}
            value={mdp} onChange={e => { setMdp(e.target.value); setErreur(null) }} style={STYLE_CHAMP} />
          <span style={{ display: 'block', fontSize: '0.6875rem', color: 'var(--cs-texte-second)', marginTop: '0.3125rem' }}>
            Au moins {LONGUEUR_MIN} caractères.
          </span>
        </div>
        <div>
          <label htmlFor="cs-mdp-confirmation" style={STYLE_ETIQUETTE}>CONFIRMER LE MOT DE PASSE</label>
          <input id="cs-mdp-confirmation" type="password" autoComplete="new-password" required
            value={confirmation} onChange={e => { setConfirmation(e.target.value); setErreur(null) }} style={STYLE_CHAMP} />
        </div>
        <button type="submit" disabled={occupe} style={styleBouton(occupe)}>
          {occupe ? 'Enregistrement…' : 'Enregistrer le mot de passe'}
        </button>
      </form>
    </CadreRecuperation>
  )
}
