'use client'
// ── L'état d'un texte, réglé depuis la fiche d'une œuvre (charte § 52) ───────
//
// On règle ce que l'éditeur décide : l'état de validation et, s'il le faut, le motif qui
// retient un texte publiable. ⛔ La PUBLICATION ne se règle pas : la base la dérive de ces
// deux colonnes, du nombre de signes et du motif de l'œuvre, et la route rend ce qu'elle a
// décidé. L'écran l'affiche tel quel, sans le deviner.
import { useState } from 'react'
import { headersAdmin } from './adminShared'
import type { TexteEtatAdmin } from './adminTypes'
import {
  DEFINITIONS_VALIDATION, ETATS_VALIDATION, LIBELLES_VALIDATION, etatValidation,
  libellePublication, raisonNonPublication, type EtatValidation,
} from '@/app/lib/etatsPublication'

export type ReponseEtatTexte = {
  texte: TexteEtatAdmin
  oeuvre: { id_oeuvre: string; acces_public: boolean; motif_non_publication: string | null }
}

export default function EtatTexteAdmin({ texte, motifOeuvre, onMaj }: {
  texte: TexteEtatAdmin
  motifOeuvre: string | null
  onMaj: (reponse: ReponseEtatTexte) => void
}) {
  const [statut, setStatut] = useState<EtatValidation>(etatValidation(texte.statut) ?? 'en_cours')
  const [motif, setMotif] = useState(texte.motif_non_publication ?? '')
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  const modifie = statut !== etatValidation(texte.statut)
    || (motif.trim() || null) !== (texte.motif_non_publication?.trim() || null)
  const raison = texte.is_public ? null : raisonNonPublication(texte, motifOeuvre)

  const enregistrer = async () => {
    setEnvoi(true)
    setErreur(null)
    try {
      const res = await fetch('/api/admin/texte-etat', {
        method: 'POST',
        headers: await headersAdmin({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ id_texte: texte.id_texte, statut, motif }),
      })
      const corps = await res.json().catch(() => null) as (ReponseEtatTexte & { error?: string }) | null
      if (!res.ok || !corps) { setErreur(corps?.error || 'Échec de l’enregistrement.'); return }
      onMaj(corps)
    } catch {
      setErreur('Erreur réseau.')
    } finally {
      setEnvoi(false)
    }
  }

  const champ = { fontSize: '0.75rem', padding: '4px 7px', borderRadius: '4px', border: '1px solid var(--cs-bord)', background: 'var(--cs-surface)', color: 'var(--cs-texte)' }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', gap: '5px 10px', padding: '8px 10px', border: '1px solid var(--cs-bord-clair)', borderRadius: '4px', background: 'var(--cs-surface)' }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: '0.8125rem', color: 'var(--cs-texte)' }}>
          {[texte.langue, texte.edition_label].filter(Boolean).join(' · ') || texte.titre_version || texte.id_texte}
          {texte.is_default && <span style={{ marginLeft: '6px', fontSize: '0.6875rem', color: 'var(--cs-texte-doux)' }}>par défaut</span>}
        </div>
        <div style={{ fontSize: '0.6875rem', color: 'var(--cs-texte-doux)', fontFamily: 'ui-monospace, Consolas, monospace', overflowWrap: 'anywhere' }}>
          {texte.id_texte} · {(texte.nb_signes ?? 0).toLocaleString('fr')} signes
        </div>
      </div>
      <span title={raison ?? undefined}
        style={{ alignSelf: 'start', fontSize: '0.6875rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: texte.is_public ? 'var(--cs-vert)' : 'var(--cs-attente)' }}>
        {libellePublication(texte.is_public)}
      </span>
      <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        <select value={statut} onChange={e => setStatut(e.target.value as EtatValidation)}
          title={DEFINITIONS_VALIDATION[statut]} aria-label="État de validation" style={champ}>
          {ETATS_VALIDATION.map(e => <option key={e} value={e}>{LIBELLES_VALIDATION[e]}</option>)}
        </select>
        <input value={motif} onChange={e => setMotif(e.target.value)} aria-label="Motif de non-publication"
          placeholder={statut === 'invalide' ? 'Motif requis : droits, doublon, version remplacée…' : 'Motif pour retenir ce texte (facultatif)'}
          style={{ ...champ, flex: 1, minWidth: '12rem' }} />
        <button onClick={enregistrer} disabled={!modifie || envoi}
          style={{ ...champ, cursor: !modifie || envoi ? 'default' : 'pointer', color: 'var(--cs-vert)', fontWeight: 600, opacity: !modifie || envoi ? 0.55 : 1 }}>
          {envoi ? '…' : 'Enregistrer'}
        </button>
      </div>
      {raison && <div style={{ gridColumn: '1 / -1', fontSize: '0.6875rem', color: 'var(--cs-texte-second)' }}>{raison}</div>}
      {erreur && <div style={{ gridColumn: '1 / -1', fontSize: '0.6875rem', color: 'var(--cs-danger)' }}>{erreur}</div>}
    </div>
  )
}
