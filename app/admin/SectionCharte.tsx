'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/app/lib/supabase'

const MODELE = `# CORPUS SCRIPTURA - Charte pour l'assistant IA

## Projet

Corpus Scriptura est une bibliothèque patristique numérique. Les utilisateurs lisent et explorent des textes des Pères de l'Église (extraits, œuvres complètes), avec des renvois aux versets bibliques correspondants.

## Stack technique

- Next.js App Router (version très récente - toujours lire node_modules/next/dist/docs/ avant de modifier des APIs)
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
- Hiérarchie des titres : éviter les doublons de type « Livre I » / « Livre premier » entre le titre et le sous-titre. Pour un même niveau, préférer la forme littéraire dans \`ref_niv1\` (\`Livre premier\`, \`Livre deuxième\`, etc.) et laisser vide le champ \`_texte\` s'il ne fait que répéter la même information.
- Lettrine (drop cap) sur le premier segment de chaque niv1, page 0 seulement, Source Serif 4 3.4em

## Règles typographiques

- Colophon « à l'ancienne » : triangle pointe en bas, lignes décroissantes, Source Serif 4 italique, filets ornementaux
- Guillemets français : « texte » avec espace fine insécable (U+202F)
- Tiret d'incise et séparateurs rédactionnels : utiliser exclusivement le trait d'union simple « - », entouré d'espaces quand il sert d'incise. Ne jamais employer de tiret moyen ni de tiret long dans les textes, les libellés du site, les titres, les commentaires éditoriaux ni les CSV.
- Dates historiques : pour les auteurs, œuvres, traducteurs, traductions et éditions, conserver des bornes début et fin quand il s'agit d'une période. Utiliser un trait d'union simple entre les bornes, par exemple « 354-430 ». Pour toute approximation, écrire simplement « Vers » au début de la borne concernée.
- Volets latéraux page Œuvre : modèle identique à la page Bible (NavLivres.tsx et PanneauPatristique.tsx)

## Règles absolues - préparation des CSV

### Liens bibliques

- Les champs lien_1 à lien_4 doivent **toujours** contenir des identifiants de la forme Bxxxxxx (ex. B028266), jamais des références lisibles comme « Rom 10:10 » ou « Gen 1:1 ».
- Plusieurs références dans un même champ : séparées par ; sans espace (ex. B000001;B029548).
- Pour une plage de versets (ex. Gen 1:26-28), pointer le premier verset de la plage.
- Ne jamais dupliquer la même référence entre lien_1, lien_2, lien_3 et lien_4 ; consolider tout dans lien_1 en priorité.

### Casse

- **Passer systématiquement en bas de casse** tout titre, bout de phrase ou mot écrit entièrement en capitales dans la source si cette capitalisation n'est pas justifiée (nom propre, sigle, titre de dignité consacré). Règle : si ce n'est pas une majuscule de sens, c'est une majuscule de mise en page à supprimer.
- Les titres de niveau (ref_niv1, ref_niv2…) doivent suivre la même règle : seule la première lettre du titre est en majuscule, plus les noms propres.
- Exemple : « CHAPITRE PREMIER. LE SYMBOLE, RÈGLE DE FOI. » → ref_niv1 = « Chapitre premier », ref_niv1_texte = « Le symbole, règle de foi. »

### Orthotypographie française

- Espace **avant** les signes de ponctuation doubles : « ; », « : », « ! », « ? » (espace insécable si possible : U+202F).
- Espace **après** ces mêmes signes.
- Ne pas mettre d'espace avant la virgule ni le point.
- Les guillemets français s'écrivent « texte » avec une espace insécable à l'intérieur.

### O invocatoire

- Le « O » d'invocation ou d'exclamation prend toujours un accent : **Ô** (et non O).
- Exemples corrects : « Ô bonté infinie ! », « Ô Seigneur ! »

## Fichiers clés

- app/oeuvre/[id]/OeuvreClient.tsx - composant principal de la page Œuvre
- app/oeuvre/[id]/ModaleEditionAdmin.tsx - modale d'édition admin des segments et titres
- app/components/NavLivres.tsx - volet gauche de la page Bible (modèle)
- app/components/PanneauPatristique.tsx - volet droit de la page Bible (modèle)
- app/admin/AdminClient.tsx + SectionBibliotheque.tsx - interface admin
- app/api/admin/segment-titre/route.ts - API modification/suppression des titres de niveaux
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
    <div style={{ maxWidth: '48.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '4px' }}>
        <h2 style={{ fontSize: '0.71875rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#9a958d', margin: 0 }}>
          Charte de travail IA
        </h2>
        {misAJour && (
          <span style={{ fontSize: '0.71875rem', color: '#b0a89e' }}>
            Mise à jour le {new Date(misAJour).toLocaleString('fr-FR')}
          </span>
        )}
      </div>
      <p style={{ fontSize: '0.8625rem', color: '#8a8278', lineHeight: 1.55, margin: '0 0 14px' }}>
        Document de référence transmis à l'IA avant chaque session. Rédigez-le librement, copiez-le, collez-le dans la conversation.
      </p>

      <div style={{ background: '#fff', border: '1px solid #e4dfd8', borderRadius: '8px', padding: '16px 18px', marginBottom: '12px' }}>
        {statut === 'loading' ? (
          <p style={{ fontSize: '0.8625rem', color: '#b0a89e', fontStyle: 'italic', margin: 0 }}>Chargement…</p>
        ) : (
          <textarea
            value={contenu}
            onChange={e => setContenu(e.target.value)}
            rows={32}
            style={{ width: '100%', boxSizing: 'border-box', fontSize: '0.89844rem', fontFamily: 'ui-monospace, Consolas, monospace', lineHeight: 1.65, padding: '10px 12px', border: '1px solid #d6d0c4', borderRadius: '5px', background: '#faf8f4', color: '#2a2520', resize: 'vertical', outline: 'none' }}
          />
        )}
        <p style={{ fontSize: '0.71875rem', color: '#b0a89e', margin: '5px 0 0' }}>{contenu.length.toLocaleString('fr-FR')} caractères</p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <button onClick={sauvegarder} disabled={statut === 'loading' || statut === 'saving'} className="btn-vert"
          style={{ fontSize: '0.8625rem', padding: '8px 18px', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}>
          {statut === 'saving' ? 'Enregistrement…' : statut === 'ok' ? '✓ Enregistré' : 'Sauvegarder'}
        </button>
        <button onClick={copier} disabled={!contenu || statut === 'loading'} className="btn-gris"
          style={{ fontSize: '0.8625rem', padding: '8px 18px', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}>
          {copie ? '✓ Copié' : 'Copier'}
        </button>
        {!contenu && statut === 'idle' && (
          <button onClick={preRemplir} className="btn-gris"
            style={{ fontSize: '0.8625rem', padding: '8px 18px', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}>
            Pré-remplir avec le modèle
          </button>
        )}
        {statut === 'erreur' && <span style={{ fontSize: '0.79062rem', color: '#c0562a' }}>Erreur de connexion.</span>}
      </div>
    </div>
  )
}
