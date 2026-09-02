'use client'

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/app/lib/supabase'

// Le lexique de modération : ce que le site n'admet ni dans un pseudonyme ni dans
// un commentaire. Tenu ici par l'auteur, appliqué en base par les déclencheurs
// (voir AGENTS.md, « Le lexique de modération »). La liste est courte à dessein :
// injures et insultes, jamais le registre familier.
//
// Deux régimes par terme, et c'est tout ce que l'écran a à expliquer :
// - « mot entier » : le terme ne condamne que s'il est un mot à lui seul (« pute »
//   ne condamne pas « député ») ;
// - sans cette marque : il condamne aussi caché dans un PSEUDONYME (« connard42 »),
//   mais toujours comme mot entier dans un commentaire.

type Terme = { mot: string; entier: boolean }

async function jeton(): Promise<string | undefined> {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token
}

export default function SectionLexique() {
  const [termes, setTermes] = useState<Terme[] | null>(null)
  const [nouveau, setNouveau] = useState('')
  const [nouveauEntier, setNouveauEntier] = useState(false)
  const [erreur, setErreur] = useState('')
  const [occupe, setOccupe] = useState(false)

  const charger = useCallback(async () => {
    const res = await fetch('/api/admin/lexique', { headers: { Authorization: `Bearer ${await jeton()}` } })
    if (!res.ok || res.redirected) { setErreur('La liste n’a pas pu être chargée.'); setTermes([]); return }
    const { termes } = await res.json()
    setTermes(termes)
  }, [])

  useEffect(() => { void charger() }, [charger])

  const envoyer = async (methode: 'POST' | 'DELETE', corps: object) => {
    setOccupe(true); setErreur('')
    const res = await fetch('/api/admin/lexique', {
      method: methode,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await jeton()}` },
      body: JSON.stringify(corps),
    })
    setOccupe(false)
    if (!res.ok || res.redirected) {
      const j = await res.json().catch(() => ({}))
      setErreur(j.error ?? 'L’enregistrement a échoué.')
      return false
    }
    await charger()
    return true
  }

  const ajouter = async () => {
    if (!nouveau.trim()) return
    if (await envoyer('POST', { mot: nouveau, entier: nouveauEntier })) { setNouveau(''); setNouveauEntier(false) }
  }

  const champ: React.CSSProperties = {
    font: 'inherit', fontSize: '0.8125rem', padding: '6px 9px', border: '1px solid var(--cs-bord)',
    borderRadius: '4px', background: 'var(--cs-fond-clair)', color: 'var(--cs-texte-fort)', outline: 'none',
  }
  const bouton: React.CSSProperties = {
    font: 'inherit', fontSize: '0.75rem', padding: '6px 12px', borderRadius: '4px', border: '1px solid var(--cs-bord)',
    background: 'var(--cs-surface)', color: 'var(--cs-texte-second)', cursor: 'pointer',
  }

  return (
    <section>
      <h2 style={{ fontFamily: 'var(--font-source-serif), Georgia, serif', fontSize: '1.1875rem', fontWeight: 500, color: 'var(--cs-encre-fonce)', margin: '0 0 6px' }}>
        Lexique de modération
      </h2>
      <p style={{ fontSize: '0.8125rem', color: 'var(--cs-texte-second)', lineHeight: 1.5, margin: '0 0 4px', maxWidth: '46rem' }}>
        Ce que le site refuse dans un pseudonyme et dans un commentaire. Un terme ajouté agit aussitôt, sans déploiement.
        La liste reste courte : les injures et les insultes, jamais le registre familier, que la modération suffit à tenir.
      </p>
      <p style={{ fontSize: '0.75rem', color: 'var(--cs-texte-gris)', lineHeight: 1.5, margin: '0 0 18px', maxWidth: '46rem' }}>
        Un terme marqué « mot entier » ne condamne que s’il forme un mot à lui seul : « pute » laisse passer « député ».
        Sans cette marque, il condamne aussi caché dans un pseudonyme (« connard42 »). Dans un commentaire, tout terme se
        cherche en mot entier, pluriel compris, sans égard à la casse ni aux accents.
      </p>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '14px' }}>
        <input value={nouveau} onChange={e => setNouveau(e.target.value)} placeholder="Nouveau terme" style={{ ...champ, width: '16rem' }}
          onKeyDown={e => { if (e.key === 'Enter') void ajouter() }} />
        <label style={{ fontSize: '0.75rem', color: 'var(--cs-texte-second)', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <input type="checkbox" checked={nouveauEntier} onChange={e => setNouveauEntier(e.target.checked)} /> mot entier seulement
        </label>
        <button onClick={() => void ajouter()} disabled={occupe || !nouveau.trim()} style={{ ...bouton, background: 'var(--cs-vert-aplat)', color: 'var(--cs-sur-aplat)', border: 'none' }}>
          Ajouter
        </button>
        {erreur && <span style={{ fontSize: '0.75rem', color: 'var(--cs-danger)' }}>{erreur}</span>}
      </div>

      {termes === null ? (
        <p style={{ fontSize: '0.8125rem', color: 'var(--cs-texte-doux)', fontStyle: 'italic' }}>Chargement…</p>
      ) : (
        <>
          <p style={{ fontSize: '0.75rem', color: 'var(--cs-texte-gris)', margin: '0 0 8px' }}>{termes.length} terme{termes.length > 1 ? 's' : ''}</p>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(15rem, 1fr))', gap: '4px 16px' }}>
            {termes.map(t => (
              <li key={t.mot} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0', borderBottom: '1px solid var(--cs-bord-clair)', fontSize: '0.8125rem' }}>
                <span style={{ flex: 1, color: 'var(--cs-texte)' }}>{t.mot}</span>
                <button onClick={() => void envoyer('POST', { mot: t.mot, entier: !t.entier })} disabled={occupe}
                  title={t.entier ? 'Ne condamne que le mot entier ; cliquer pour le chercher aussi dans un pseudonyme' : 'Cherché aussi dans un pseudonyme ; cliquer pour ne condamner que le mot entier'}
                  style={{ ...bouton, padding: '2px 8px', fontSize: '0.625rem', letterSpacing: '0.04em', textTransform: 'uppercase', color: t.entier ? 'var(--cs-vert)' : 'var(--cs-texte-doux)' }}>
                  {t.entier ? 'mot entier' : 'partout'}
                </button>
                <button onClick={() => { if (confirm(`Retirer « ${t.mot} » du lexique ?`)) void envoyer('DELETE', { mot: t.mot }) }} disabled={occupe}
                  title="Retirer" style={{ ...bouton, padding: '2px 7px', color: 'var(--cs-danger)' }}>✕</button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
