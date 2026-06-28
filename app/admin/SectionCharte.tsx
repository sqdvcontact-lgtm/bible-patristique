'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/app/lib/supabase'

const MODELE = `# CORPUS SCRIPTURA — Charte pour l'assistant IA

## Projet

Corpus Scriptura est une bibliothèque patristique numérique. Les utilisateurs lisent et explorent des textes des Pères de l'Église (extraits, œuvres complètes), avec des renvois aux versets bibliques correspondants.

## Stack technique

- Next.js App Router (version très récente — toujours lire node_modules/next/dist/docs/ avant de modifier des APIs)
- Supabase (base de données PostgreSQL, stockage fichiers)
- TypeScript
- Déploiement Vercel
- Styles : CSS inline (pas de Tailwind, pas de module CSS sauf exception)

## Structure des pages principales

- / : Page Bible (lecture par livre/chapitre avec traductions)
- /oeuvre/[id] : Page Œuvre (texte patristique paginé, volet gauche = Sommaire, volet droit = Commentaires & références)
- /essais : Liste des publications de la communauté
- /admin : Interface d'administration (accès restreint)
- /profil/[id] : Profil utilisateur

## Conventions importantes

- Styles toujours en objets React inline (pas de classes sauf exceptions nommées explicitement)
- Server Components fetchent les données, Client Components gèrent l'UI
- Les routes API admin vérifient toutes le cookie admin (estAdminServeur)
- Modèle de données segments : chaque segment est un paragraphe numéroté, groupé par niveaux de titres (ref_niv1, ref_niv2, ref_niv3, ref_niv4 pour le titre principal ; ref_niv1_texte, etc. pour le sous-titre)
- Lettrine (drop cap) sur le premier segment de chaque niv1, page 0 seulement, Georgia 3.4em

## Règles typographiques

- Colophon « à l'ancienne » : triangle pointe en bas, lignes décroissantes, Georgia italique, filets ornementaux
- Guillemets français : « texte » avec espace fine insécable (U+202F)
- Volets latéraux page Œuvre : modèle identique à la page Bible (NavLivres.tsx et PanneauPatristique.tsx)

## Fichiers clés

- app/oeuvre/[id]/OeuvreClient.tsx — composant principal de la page Œuvre
- app/oeuvre/[id]/ModaleEditionAdmin.tsx — modale d'édition admin des segments et titres
- app/components/NavLivres.tsx — volet gauche de la page Bible (modèle)
- app/components/PanneauPatristique.tsx — volet droit de la page Bible (modèle)
- app/admin/AdminClient.tsx + SectionBibliotheque.tsx — interface admin
- app/api/admin/segment-titre/route.ts — API modification/suppression des titres de niveaux
`

export default function SectionCharte() {
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
      fetch('/api/admin/charte', { headers })
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
    const res = await fetch('/api/admin/charte', {
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
          Charte de travail IA
        </h2>
        {misAJour && (
          <span style={{ fontSize: '10px', color: '#b0a89e' }}>
            Mise à jour le {new Date(misAJour).toLocaleString('fr-FR')}
          </span>
        )}
      </div>
      <p style={{ fontSize: '12px', color: '#8a8278', lineHeight: 1.55, margin: '0 0 14px' }}>
        Document de référence transmis à l'IA avant chaque session. Rédigez-le librement, copiez-le, collez-le dans la conversation.
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
