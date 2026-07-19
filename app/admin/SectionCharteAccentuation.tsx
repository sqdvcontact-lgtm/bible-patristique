'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/app/lib/supabase'

const MODELE = `# Charte d'accentuation des majuscules — Corpus Scriptura

Document vivant. Chaque passe de correction sur une nouvelle œuvre alimente ce registre. Ne pas pré-remplir théoriquement : n'inscrire que ce qui a été rencontré et corrigé.

Règle générale : en français, les majuscules s'accentuent (Académie française). Une majuscule non accentuée est une faute, jamais une option. Principaux cas : É (le plus fréquent), À, Â, Ô, Î, Ç, Œ.

---

## Occurrences confirmées

### La Cité de Dieu — A0010O0002 (juillet 2026)

**Noms propres bibliques**
Elie → Élie · Elisée → Élisée · Elisabeth → Élisabeth · Ezéchias → Ézéchias

**Noms propres géographiques et philosophiques**
Epire → Épire · Epicure / Epicuriens → Épicure / Épicuriens · Epictète → Épictète · Epiphane → Épiphane · Etrusque → Étrusque

**Verbes et adjectifs courants**
Ecoutez → Écoutez · Etrange → Étrange · Etait → Était · Etaient → Étaient · Egalement → Également · Eprouvez → Éprouvez

---

## Faux positifs à ne pas toucher

En, Et, Elle, Elles, Eux, Entre, Est, Enfin, Encore, Ensuite, Entier, Environ, Envers, Envoi — pas d'accent en minuscule, donc pas d'accent en majuscule.

Mots latins en début de segment (Ecce, Esto, Ergo…) : ne pas accentuer.

---

## Règles typographiques générales

### Majuscules accentuées

Eglise → Église

### Ligatures

oe → œ · Oe → Œ

### Majuscules abusives sur adjectifs / noms communs à valeur générique

Les noms « saint/sainte » employés comme adjectif qualificatif ou épithète ne prennent pas de majuscule :

- les Saints → les saints
- le Saint → le saint
- les Saintes → les saintes
- la Sainte → la sainte
- des Saints → des saints
- un Saint → un saint
- des Saintes → des saintes
- une Sainte → une sainte

⚠ Exception : Saint + nom propre (Saint Pierre, Saint Paul…) conserve la majuscule.

### Saint-Esprit

- saint Esprit → Saint-Esprit
- Saint Esprit → Saint-Esprit
- Esprit-Saint → Esprit saint
- Esprit Saint → Esprit saint

### Espaces multiples

- [espace][espace] → [espace] (supprimer les doubles espaces)

---

## Requête de diagnostic (à adapter par œuvre)

\`\`\`sql
SELECT id, segment_numero, segment_texte
FROM segments
WHERE segment_texte ~ '(^|[[:space:]«—])E[clbgptzéèêîïr]'
  AND id_oeuvre = 'XXXXXXXX'
ORDER BY segment_numero;
\`\`\`
`

export default function SectionCharteAccentuation() {
  const [contenu, setContenu] = useState('')
  const [misAJour, setMisAJour] = useState<string | null>(null)
  const [statut, setStatut] = useState<'loading' | 'idle' | 'saving' | 'ok' | 'erreur'>('loading')
  const [copie, setCopie] = useState(false)

  const getHeaders = async (): Promise<Record<string, string>> => {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token
    return token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' }
  }

  useEffect(() => {
    getHeaders().then(headers =>
      fetch('/api/admin/charte-accentuation', { headers })
        .then(r => r.json())
        .then(d => {
          setContenu(d.valeur ?? '')
          setMisAJour(d.mis_a_jour ?? null)
          setStatut('idle')
        })
        .catch(() => setStatut('erreur'))
    )
  }, [])

  const sauvegarder = async () => {
    setStatut('saving')
    const headers = await getHeaders()
    const res = await fetch('/api/admin/charte-accentuation', {
      method: 'POST',
      headers,
      body: JSON.stringify({ valeur: contenu }),
    })
    if (res.ok) {
      const d = await res.json()
      setMisAJour(d.mis_a_jour ?? new Date().toISOString())
      setStatut('ok')
      setTimeout(() => setStatut('idle'), 2000)
    } else {
      setStatut('erreur')
    }
  }

  const copier = async () => {
    await navigator.clipboard.writeText(contenu)
    setCopie(true)
    setTimeout(() => setCopie(false), 2000)
  }

  const preRemplir = () => {
    if (window.confirm('Remplacer le contenu actuel par le modèle par défaut ?')) {
      setContenu(MODELE)
    }
  }

  return (
    <div style={{ maxWidth: '780px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '4px' }}>
        <h2 style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9a958d', margin: 0 }}>
          Charte d'accentuation
        </h2>
        {misAJour && (
          <span style={{ fontSize: '10px', color: '#b0a89e' }}>
            Mise à jour le {new Date(misAJour).toLocaleString('fr-FR')}
          </span>
        )}
      </div>
      <p style={{ fontSize: '12px', color: '#8a8278', lineHeight: 1.55, margin: '0 0 14px' }}>
        Règles et requêtes SQL pour la correction des majuscules non accentuées dans le corpus patristique.
      </p>

      <div style={{ background: '#fff', border: '1px solid #e4dfd8', borderRadius: '8px', padding: '16px 18px', marginBottom: '12px' }}>
        {statut === 'loading' ? (
          <p style={{ fontSize: '12px', color: '#b0a89e', fontStyle: 'italic', margin: 0 }}>Chargement…</p>
        ) : (
          <textarea
            value={contenu}
            onChange={e => setContenu(e.target.value)}
            rows={32}
            style={{ width: '100%', boxSizing: 'border-box', fontSize: '12.5px', fontFamily: 'ui-monospace, Consolas, monospace', lineHeight: 1.65, padding: '10px 12px', border: '1px solid #d6d0c4', borderRadius: '5px', background: '#faf8f4', color: '#2a2520', resize: 'vertical', outline: 'none' }}
          />
        )}
        <p style={{ fontSize: '10px', color: '#b0a89e', margin: '5px 0 0' }}>{contenu.length.toLocaleString('fr-FR')} caractères</p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <button onClick={sauvegarder} disabled={statut === 'loading' || statut === 'saving'} className="btn-vert"
          style={{ fontSize: '12px', padding: '8px 18px', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}>
          {statut === 'saving' ? 'Enregistrement…' : statut === 'ok' ? '✓ Enregistré' : 'Sauvegarder'}
        </button>
        <button onClick={copier} disabled={!contenu || statut === 'loading'} className="btn-gris"
          style={{ fontSize: '12px', padding: '8px 18px', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}>
          {copie ? '✓ Copié' : 'Copier'}
        </button>
        {!contenu && statut === 'idle' && (
          <button onClick={preRemplir} className="btn-gris"
            style={{ fontSize: '12px', padding: '8px 18px', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}>
            Pré-remplir avec le modèle
          </button>
        )}
        {statut === 'erreur' && <span style={{ fontSize: '11px', color: '#c0562a' }}>Erreur de connexion.</span>}
      </div>
    </div>
  )
}
