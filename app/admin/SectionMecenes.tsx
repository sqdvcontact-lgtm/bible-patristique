'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'
import MarqueMecene from '@/app/components/MarqueMecene'

// LE REGISTRE DES DONS — et le rattachement d'un don à un compte.
//
// PayPal ne rend qu'un nom et une adresse électronique, et rien qui pointe vers un
// compte du site. Le rapprochement se fait donc ICI, à la main : on inscrit le don tel
// que PayPal le donne, on cherche le compte sur l'une de ses trois adresses, on
// rattache. ⚠️ C'est un travail de trente secondes par don, et c'est le prix de ne pas
// dépendre d'une notification automatique de PayPal, qui retomberait de toute façon sur
// une comparaison d'adresses approximative. Le jour où le flux le justifiera, la
// colonne `reference` est déjà là pour empêcher de compter deux fois le même don.
//
// ⛔ LA MARQUE SE DÉDUIT DU REGISTRE : `profils.mecene_depuis` se recalcule côté serveur
// sur la date du plus ancien don rattaché. Aucun bouton, ici, ne la pose ni ne la
// retire — on inscrit des dons, et la marque suit.
//
// ⛔ AUCUN MONTANT, nulle part : PayPal tient ce livre-là, et un montant en base serait
// une donnée financière à garder pour rien. C'est aussi ce qui rend la marque
// indivisible. Voir app/components/MarqueMecene.tsx.

type Don = {
  id: string
  user_id: string | null
  pseudo: string | null
  marque_retiree: boolean
  email_donateur: string | null
  nom_donateur: string | null
  reference: string | null
  recu_le: string
  source: string
  note: string | null
}

type Compte = {
  id: string
  pseudo: string | null
  email: string | null
  contact_email: string | null
  mecene_depuis: string | null
}

async function jeton(): Promise<string | undefined> {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token
}

const AUJOURDHUI = () => new Date().toISOString().slice(0, 10)

export default function SectionMecenes() {
  const [dons, setDons] = useState<Don[] | null>(null)
  const [erreur, setErreur] = useState('')
  const [occupe, setOccupe] = useState(false)

  // Le formulaire d'inscription : ce que PayPal donne, et rien de plus.
  const [nom, setNom] = useState('')
  const [email, setEmail] = useState('')
  const [reference, setReference] = useState('')
  const [date, setDate] = useState(AUJOURDHUI())
  const [note, setNote] = useState('')

  // La recherche de compte, partagée par le formulaire et par les lignes du registre.
  // `cible` dit à qui le compte trouvé sera rattaché : « nouveau » pour le don qu'on
  // est en train d'inscrire, sinon l'identifiant d'un don déjà au registre.
  const [cible, setCible] = useState<string>('nouveau')
  const [recherche, setRecherche] = useState('')
  const [comptes, setComptes] = useState<Compte[] | null>(null)
  const [compteChoisi, setCompteChoisi] = useState<Compte | null>(null)

  const charger = useCallback(async () => {
    const res = await fetch('/api/admin/dons', { headers: { Authorization: `Bearer ${await jeton()}` } })
    if (!res.ok || res.redirected) { setErreur('Le registre n’a pas pu être chargé.'); setDons([]); return }
    const { dons } = await res.json()
    setDons(dons)
  }, [])

  // Le registre est un état EXTÉRIEUR, lu au réseau une fois à l'ouverture de la
  // section : c'est précisément ce qu'un effet est fait pour synchroniser. La règle ne
  // sait pas distinguer ce chargement d'une cascade de rendus.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void charger() }, [charger])

  const envoyer = async (methode: 'POST' | 'PATCH' | 'DELETE', corps: object) => {
    setOccupe(true); setErreur('')
    const res = await fetch('/api/admin/dons', {
      method: methode,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await jeton()}` },
      body: JSON.stringify(corps),
    })
    setOccupe(false)
    const j = await res.json().catch(() => ({}))
    if (!res.ok || res.redirected) { setErreur(j.error ?? 'L’enregistrement a échoué.'); return false }
    // La route rend le registre à jour : pas de second aller-retour pour le relire.
    if (j.dons) setDons(j.dons)
    return true
  }

  const chercher = async () => {
    const q = recherche.trim()
    if (!q) { setComptes(null); return }
    setOccupe(true); setErreur('')
    const res = await fetch(`/api/admin/dons?q=${encodeURIComponent(q)}`, { headers: { Authorization: `Bearer ${await jeton()}` } })
    setOccupe(false)
    if (!res.ok || res.redirected) { setErreur('La recherche a échoué.'); return }
    const { comptes } = await res.json()
    setComptes(comptes)
  }

  /** Un compte trouvé : soit il complète le don qu'on inscrit, soit il en rattache un. */
  const choisirCompte = async (c: Compte) => {
    if (cible === 'nouveau') { setCompteChoisi(c); setComptes(null); setRecherche(''); return }
    if (await envoyer('PATCH', { id: cible, user_id: c.id })) {
      setComptes(null); setRecherche(''); setCible('nouveau')
    }
  }

  const inscrire = async () => {
    const ok = await envoyer('POST', {
      user_id: compteChoisi?.id ?? null,
      nom_donateur: nom, email_donateur: email, reference, recu_le: date, note,
    })
    if (ok) { setNom(''); setEmail(''); setReference(''); setNote(''); setDate(AUJOURDHUI()); setCompteChoisi(null) }
  }

  const champ: React.CSSProperties = {
    font: 'inherit', fontSize: '0.8125rem', padding: '6px 9px', border: '1px solid var(--cs-bord)',
    borderRadius: '4px', background: 'var(--cs-fond-clair)', color: 'var(--cs-texte-fort)', outline: 'none',
  }
  const bouton: React.CSSProperties = {
    font: 'inherit', fontSize: '0.75rem', padding: '6px 12px', borderRadius: '4px', border: '1px solid var(--cs-bord)',
    background: 'var(--cs-surface)', color: 'var(--cs-texte-second)', cursor: 'pointer',
  }
  const cellule: React.CSSProperties = {
    padding: '6px 10px', borderBottom: '1px solid var(--cs-bord-clair)', fontSize: '0.75rem',
    color: 'var(--cs-texte-second)', textAlign: 'left', verticalAlign: 'top',
  }

  return (
    <section>
      <h2 style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '1.1875rem', fontWeight: 500, color: 'var(--cs-encre-fonce)', margin: '0 0 6px' }}>
        Mécènes
      </h2>
      <p style={{ fontSize: '0.8125rem', color: 'var(--cs-texte-second)', lineHeight: 1.5, margin: '0 0 4px', maxWidth: '46rem' }}>
        Le registre des dons reçus. On inscrit le don tel que PayPal le donne, on cherche le compte
        du donateur sur son pseudonyme ou sur l’une de ses adresses, et on rattache. La marque de
        mécène se pose alors d’elle-même sur ce compte, à la date du plus ancien don rattaché.
      </p>
      <p style={{ fontSize: '0.75rem', color: 'var(--cs-texte-gris)', lineHeight: 1.5, margin: '0 0 18px', maxWidth: '46rem' }}>
        Aucun montant n’est demandé ni conservé : PayPal tient ce livre. La marque ne se gradue pas,
        n’entre dans aucun haut fait et n’ouvre aucun droit. Un don sans compte reste au registre,
        sans marque, jusqu’à ce qu’un compte lui soit trouvé.
      </p>

      {erreur && (
        <p role="alert" style={{ fontSize: '0.8125rem', color: 'var(--cs-danger)', background: 'var(--cs-danger-fond)', border: '1px solid var(--cs-danger-bord)', borderRadius: '4px', padding: '8px 10px', margin: '0 0 14px' }}>
          {erreur}
        </p>
      )}

      {/* ── INSCRIRE UN DON ─────────────────────────────────────────────────── */}
      <div style={{ border: '1px solid var(--cs-bord)', borderRadius: '8px', background: 'var(--cs-surface)', padding: '14px 16px', marginBottom: '22px' }}>
        <h3 style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--cs-encre-fonce)', margin: '0 0 10px' }}>Inscrire un don</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
          <input style={{ ...champ, flex: '1 1 12rem' }} placeholder="Nom du donateur (PayPal)" value={nom} onChange={e => setNom(e.target.value)} />
          <input style={{ ...champ, flex: '1 1 14rem' }} placeholder="Adresse du donateur (PayPal)" value={email} onChange={e => setEmail(e.target.value)} />
          <input style={{ ...champ, flex: '1 1 11rem' }} placeholder="Référence de transaction" value={reference} onChange={e => setReference(e.target.value)} />
          <input style={{ ...champ, flex: '0 0 9rem' }} type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <input style={{ ...champ, width: '100%', boxSizing: 'border-box', marginBottom: '10px' }} placeholder="Note (usage interne)" value={note} onChange={e => setNote(e.target.value)} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {compteChoisi ? (
            <span style={{ fontSize: '0.75rem', color: 'var(--cs-texte-second)' }}>
              Rattaché à <strong style={{ color: 'var(--cs-encre-fonce)' }}>{compteChoisi.pseudo ?? '—'}</strong>{' '}
              <button style={{ ...bouton, padding: '2px 8px' }} onClick={() => setCompteChoisi(null)}>Détacher</button>
            </span>
          ) : (
            <span style={{ fontSize: '0.75rem', color: 'var(--cs-texte-gris)', fontStyle: 'italic' }}>
              Aucun compte rattaché — cherchez-en un ci-dessous, ou inscrivez le don tel quel.
            </span>
          )}
          <button style={{ ...bouton, marginLeft: 'auto' }} className="btn-vert" disabled={occupe} onClick={inscrire}>
            Inscrire le don
          </button>
        </div>
      </div>

      {/* ── CHERCHER UN COMPTE ──────────────────────────────────────────────── */}
      <div style={{ border: '1px solid var(--cs-bord)', borderRadius: '8px', background: 'var(--cs-surface)', padding: '14px 16px', marginBottom: '22px' }}>
        <h3 style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--cs-encre-fonce)', margin: '0 0 4px' }}>Chercher un compte</h3>
        <p style={{ fontSize: '0.71875rem', color: 'var(--cs-texte-gris)', margin: '0 0 10px' }}>
          Sur le pseudonyme, l’adresse de connexion ou l’adresse affichée sur la page publique.
          {cible !== 'nouveau' && ' Le compte choisi sera rattaché au don sélectionné dans le registre.'}
        </p>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <input style={{ ...champ, flex: '1 1 16rem' }} placeholder="Pseudonyme ou adresse…" value={recherche}
            onChange={e => setRecherche(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') void chercher() }} />
          <button style={bouton} disabled={occupe} onClick={chercher}>Chercher</button>
          {cible !== 'nouveau' && (
            <button style={bouton} onClick={() => { setCible('nouveau'); setComptes(null) }}>Annuler le rattachement</button>
          )}
        </div>

        {comptes !== null && (
          comptes.length === 0 ? (
            <p style={{ fontSize: '0.75rem', color: 'var(--cs-texte-gris)', fontStyle: 'italic', margin: '10px 0 0' }}>
              Aucun compte ne répond à cette recherche. Le donateur n’en a peut-être pas.
            </p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: '10px 0 0', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {comptes.map(c => (
                <li key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.75rem', color: 'var(--cs-texte-second)', padding: '5px 8px', border: '1px solid var(--cs-bord-clair)', borderRadius: '4px' }}>
                  <strong style={{ color: 'var(--cs-encre-fonce)' }}>{c.pseudo ?? '—'}</strong>
                  {c.mecene_depuis && <MarqueMecene />}
                  <span style={{ color: 'var(--cs-texte-gris)' }}>{c.email}</span>
                  {c.contact_email && c.contact_email !== c.email && (
                    <span style={{ color: 'var(--cs-texte-faible)' }}>· {c.contact_email}</span>
                  )}
                  <button style={{ ...bouton, marginLeft: 'auto' }} disabled={occupe} onClick={() => choisirCompte(c)}>
                    {cible === 'nouveau' ? 'Choisir' : 'Rattacher'}
                  </button>
                </li>
              ))}
            </ul>
          )
        )}
      </div>

      {/* ── LE REGISTRE ─────────────────────────────────────────────────────── */}
      <h3 style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--cs-encre-fonce)', margin: '0 0 8px' }}>
        Le registre {dons && `(${dons.length})`}
      </h3>
      {dons === null ? (
        <p style={{ fontSize: '0.8125rem', color: 'var(--cs-texte-gris)', fontStyle: 'italic' }}>Chargement…</p>
      ) : dons.length === 0 ? (
        <p style={{ fontSize: '0.8125rem', color: 'var(--cs-texte-gris)', fontStyle: 'italic' }}>Aucun don inscrit pour l’instant.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', background: 'var(--cs-surface)', border: '1px solid var(--cs-bord)', borderRadius: '8px' }}>
          <thead>
            <tr>
              {['Reçu le', 'Donateur', 'Compte', 'Référence', ''].map(t => (
                <th key={t} style={{ ...cellule, fontWeight: 700, fontSize: '0.6875rem', letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--cs-texte-faible)' }}>{t}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dons.map(d => (
              <tr key={d.id} style={cible === d.id ? { background: 'rgba(var(--cs-or-rgb),0.10)' } : undefined}>
                <td style={{ ...cellule, whiteSpace: 'nowrap' }}>{d.recu_le}</td>
                <td style={cellule}>
                  {d.nom_donateur ?? '—'}
                  {d.email_donateur && <div style={{ color: 'var(--cs-texte-faible)', fontSize: '0.6875rem' }}>{d.email_donateur}</div>}
                  {d.note && <div style={{ color: 'var(--cs-texte-gris)', fontStyle: 'italic', fontSize: '0.6875rem' }}>{d.note}</div>}
                </td>
                <td style={cellule}>
                  {d.pseudo ? (
                    <>
                      <strong style={{ color: 'var(--cs-encre-fonce)' }}>{d.pseudo}</strong>{' '}
                      <MarqueMecene />
                      {/* Un mécène qui a retiré sa marque n'est pas un rattachement
                          manqué : sans ce mot, on chercherait à la lui redonner. */}
                      {d.marque_retiree && (
                        <div style={{ color: 'var(--cs-texte-faible)', fontSize: '0.6875rem', fontStyle: 'italic' }}>marque retirée par le lecteur</div>
                      )}
                    </>
                  ) : (
                    <span style={{ color: 'var(--cs-texte-faible)', fontStyle: 'italic' }}>aucun</span>
                  )}
                </td>
                <td style={{ ...cellule, fontSize: '0.6875rem', color: 'var(--cs-texte-faible)' }}>{d.reference ?? '—'}</td>
                <td style={{ ...cellule, whiteSpace: 'nowrap' }}>
                  {d.user_id ? (
                    <button style={{ ...bouton, padding: '2px 8px' }} disabled={occupe}
                      onClick={() => envoyer('PATCH', { id: d.id, user_id: null })}>Détacher</button>
                  ) : (
                    <button style={{ ...bouton, padding: '2px 8px' }} disabled={occupe}
                      onClick={() => { setCible(d.id); setComptes(null); setRecherche(d.email_donateur ?? d.nom_donateur ?? '') }}>Rattacher…</button>
                  )}
                  {' '}
                  <button style={{ ...bouton, padding: '2px 8px' }} className="btn-rouge" disabled={occupe}
                    onClick={() => { if (confirm('Effacer ce don du registre ?')) void envoyer('DELETE', { id: d.id }) }}>Effacer</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
