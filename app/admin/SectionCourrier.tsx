'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'

// LA BOÎTE AUX LETTRES.
//
// ⛔ Le formulaire de contact et la proposition d'œuvre du catalogue enregistrent
// leur message dans `messages_contact` « pour ne rien perdre », puis tentent un
// courriel si `RESEND_API_KEY` existe. Elle n'existe pas en production, et aucune
// page ne lisait cette table : les messages n'arrivaient nulle part (constaté le
// 2026-09-07, deux lettres non lues depuis juillet). Cet écran est la levée du
// courrier. Il ne dépend d'aucun service tiers, d'aucun abonnement, d'aucune clé :
// il lit la table, et c'est tout.
//
// ⚠️ Relever n'est pas détruire. « Relevé » pose une date sur la lettre et la range ;
// elle reste lisible dans le second onglet. La suppression demande confirmation, et
// la purge automatique se charge de ce qui a plus de douze mois.

type Lettre = {
  id: number
  nom: string | null
  courriel: string | null
  sujet: string | null
  message: string
  cree_le: string
  traite_le: string | null
}

async function entetes(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  return token
    ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' }
}

function dateLongue(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function SectionCourrier({ onCountChange }: { onCountChange?: (n: number) => void }) {
  const [lettres, setLettres] = useState<Lettre[]>([])
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)
  const [vue, setVue] = useState<'a_relever' | 'relevees'>('a_relever')
  const [occupe, setOccupe] = useState<number | null>(null)

  const charger = useCallback(async () => {
    setErreur(null)
    setChargement(true)
    try {
      const res = await fetch('/api/admin/courrier', { headers: await entetes() })
      if (!res.ok || res.redirected) throw new Error(`Erreur ${res.status}`)
      const { messages, nbATraiter } = await res.json()
      setLettres(messages ?? [])
      onCountChange?.(nbATraiter ?? 0)
    } catch {
      setErreur('Le courrier n’a pas pu être chargé. Vérifiez la connexion.')
    } finally {
      setChargement(false)
    }
  }, [onCountChange])

  useEffect(() => { void charger() }, [charger])

  const relever = async (lettre: Lettre) => {
    const traite = !lettre.traite_le
    setOccupe(lettre.id)
    const res = await fetch('/api/admin/courrier', {
      method: 'PATCH', headers: await entetes(), body: JSON.stringify({ id: lettre.id, traite }),
    })
    setOccupe(null)
    if (!res.ok || res.redirected) { alert('L’enregistrement a échoué. Réessayez.'); return }
    await charger()
  }

  const supprimer = async (lettre: Lettre) => {
    if (!confirm('Supprimer définitivement cette lettre ?')) return
    setOccupe(lettre.id)
    const res = await fetch('/api/admin/courrier', {
      method: 'DELETE', headers: await entetes(), body: JSON.stringify({ id: lettre.id }),
    })
    setOccupe(null)
    if (!res.ok || res.redirected) { alert('La suppression a échoué. Réessayez.'); return }
    await charger()
  }

  const aRelever = lettres.filter(l => !l.traite_le)
  const relevees = lettres.filter(l => l.traite_le)
  const affichees = vue === 'a_relever' ? aRelever : relevees

  if (chargement) return <p style={{ fontSize: '0.875rem', color: 'var(--cs-texte-faible)', fontStyle: 'italic' }}>Chargement…</p>
  if (erreur) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px', background: 'var(--cs-danger-fond)', border: '1px solid var(--cs-danger-bord)', borderRadius: '8px', maxWidth: '31.25rem' }}>
      <span style={{ fontSize: '0.875rem', color: 'var(--cs-danger)' }}>{erreur}</span>
      <button onClick={() => void charger()} style={{ fontSize: '0.78125rem', padding: '4px 10px', borderRadius: '4px', border: '1px solid var(--cs-danger-bord)', background: 'var(--cs-surface)', color: 'var(--cs-danger)', cursor: 'pointer', whiteSpace: 'nowrap' }}>Réessayer</button>
    </div>
  )

  return (
    <div style={{ maxWidth: '51.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '6px' }}>
        <h2 style={{ fontSize: '0.71875rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--cs-texte-doux)', margin: 0 }}>
          Courrier
        </h2>
        <span style={{ fontSize: '0.78125rem', color: 'var(--cs-texte-faible)' }}>
          {lettres.length} lettre{lettres.length > 1 ? 's' : ''}
        </span>
      </div>
      <p style={{ fontSize: '0.78125rem', color: 'var(--cs-texte-faible)', lineHeight: 1.55, margin: '0 0 16px' }}>
        Ce que le formulaire de contact et le bouton « proposer une œuvre » du catalogue
        déposent sur le site. Laisser une adresse est facultatif pour celui qui écrit.
      </p>

      <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid var(--cs-vert-fonce)', marginBottom: '20px' }}>
        {([['a_relever', 'À relever', aRelever.length], ['relevees', 'Relevées', relevees.length]] as ['a_relever' | 'relevees', string, number][]).map(([cle, label, n]) => (
          <button key={cle} onClick={() => setVue(cle)} style={{
            padding: '7px 14px', fontSize: '0.78125rem', background: 'none', border: 'none',
            borderBottom: vue === cle ? '2px solid var(--cs-vert-clair)' : '2px solid transparent',
            color: vue === cle ? 'var(--cs-vert-clair)' : 'var(--cs-vert)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap', marginBottom: '-1px',
          }}>
            {label}
            {n > 0 && (
              <span style={{ fontSize: '0.6875rem', background: cle === 'a_relever' ? 'var(--cs-danger-aplat)' : 'var(--cs-vert-aplat)', color: 'var(--cs-sur-aplat)', borderRadius: '8px', padding: '1px 5px' }}>{n}</span>
            )}
          </button>
        ))}
      </div>

      {affichees.length === 0 ? (
        <p style={{ fontSize: '0.875rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic' }}>
          {vue === 'a_relever' ? 'Aucune lettre en attente.' : 'Aucune lettre relevée.'}
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {affichees.map(l => {
            const busy = occupe === l.id
            const expediteur = l.nom || (l.courriel ? l.courriel : 'Sans nom')
            return (
              <div key={l.id} style={{ background: 'var(--cs-surface)', border: '1px solid var(--cs-bord-clair)', borderRadius: '8px', padding: '13px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                  <span style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '0.875rem', color: 'var(--cs-encre)' }}>
                    {l.sujet || 'Sans objet'}
                  </span>
                  <span style={{ fontSize: '0.71875rem', color: 'var(--cs-texte-faible)', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
                    {dateLongue(l.cree_le)}
                  </span>
                </div>
                <p style={{ fontSize: '0.8125rem', color: 'var(--cs-texte-fort)', lineHeight: 1.6, margin: '0 0 10px', whiteSpace: 'pre-wrap' }}>
                  {l.message}
                </p>
                <p style={{ fontSize: '0.6875rem', color: 'var(--cs-texte-second)', fontWeight: 500, margin: '0 0 10px' }}>
                  {expediteur}
                  {l.courriel && l.nom ? <span style={{ color: 'var(--cs-texte-faible)', fontWeight: 400 }}> · {l.courriel}</span> : null}
                  {!l.courriel ? <span style={{ color: 'var(--cs-texte-faible)', fontWeight: 400, fontStyle: 'italic' }}> · sans adresse de réponse</span> : null}
                </p>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '7px', flexWrap: 'wrap' }}>
                  <button onClick={() => void supprimer(l)} disabled={busy} style={BTN_ROUGE}>Supprimer</button>
                  {l.courriel && (
                    <a href={`mailto:${l.courriel}?subject=${encodeURIComponent(`Re : ${l.sujet || 'votre message à Corpus Scriptura'}`)}`}
                      style={{ ...BTN, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
                      Répondre
                    </a>
                  )}
                  <button onClick={() => void relever(l)} disabled={busy} style={l.traite_le ? BTN : BTN_VERT}>
                    {l.traite_le ? 'Remettre en attente' : 'Relevée'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const BTN: React.CSSProperties = {
  fontSize: '0.6875rem', padding: '5px 12px', borderRadius: '8px', cursor: 'pointer',
  border: '1px solid var(--cs-bord)', background: 'var(--cs-surface)', color: 'var(--cs-texte)',
}
const BTN_VERT: React.CSSProperties = {
  ...BTN, background: 'var(--cs-vert-aplat)', color: 'var(--cs-sur-aplat)', borderColor: 'var(--cs-vert-aplat)',
}
// ⚠️ Le filet prend `--cs-danger-bord`, non le `#e2b9aa` de `.mod-btn.rouge` : recopier
// une teinte en dur l'ajouterait au registre gelé (charte, « La garde chromatique »).
const BTN_ROUGE: React.CSSProperties = {
  ...BTN, color: 'var(--cs-danger-fonce)', borderColor: 'var(--cs-danger-bord)', background: 'var(--cs-fond-clair)',
}
