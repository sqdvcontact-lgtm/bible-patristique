'use client'
// ── L'état d'un texte, réglé depuis la fiche d'une œuvre (charte § 52) ───────
//
// On règle ce que l'éditeur décide : l'état de validation, le motif qui retient un texte
// publiable, et les INFORMATIONS COMPLÉMENTAIRES que cette édition déclare — ses manuscrits
// et leurs sigles, ses abréviations (charte § 5.6). ⛔ Celles-ci vivent sur le TEXTE et se
// règlent donc ICI, édition par édition : celles de Knöll ne sont pas celles d'Arnauld
// d'Andilly, qui vit sous la même œuvre. ⛔ La PUBLICATION ne se règle pas : la base la dérive de ces
// deux colonnes, du nombre de signes et du motif de l'œuvre, et la route rend ce qu'elle a
// décidé. L'écran l'affiche tel quel, sans le deviner.
import { useState } from 'react'
import { headersAdmin } from './adminShared'
import { porteUneNotation } from '@/app/lib/notationEdition'
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
  const [informations, setInformations] = useState(texte.informations_complementaires ?? '')
  const [envoi, setEnvoi] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)

  const modifie = statut !== etatValidation(texte.statut)
    || (motif.trim() || null) !== (texte.motif_non_publication?.trim() || null)
    || (informations.trim() || null) !== (texte.informations_complementaires?.trim() || null)
  const raison = texte.is_public ? null : raisonNonPublication(texte, motifOeuvre)

  const enregistrer = async () => {
    setEnvoi(true)
    setErreur(null)
    try {
      const res = await fetch('/api/admin/texte-etat', {
        method: 'POST',
        headers: await headersAdmin({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ id_texte: texte.id_texte, statut, motif, informations }),
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
      {/* ⚠️ Une zone de TEXTE, non un champ d'une ligne : on y nomme des manuscrits et
          des sigles, et cela s'écrit en plusieurs lignes. Elle paraît toujours — c'est
          l'écran qui la remplit —, quand la RUBRIQUE du lecteur, elle, ne paraît que
          remplie. */}
      <label style={{ gridColumn: '1 / -1', display: 'block', fontSize: '0.6875rem', color: 'var(--cs-texte-second)' }}>
        Informations complémentaires (manuscrits, sigles, abréviations)
        <textarea value={informations} onChange={e => setInformations(e.target.value)} rows={3}
          placeholder="Manuscrits employés, sigles, abréviations, conventions de transcription…"
          style={{ ...champ, width: '100%', boxSizing: 'border-box', marginTop: '3px', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.45 }} />
      </label>
      {/* ⚠️ LA NOTATION SE DIT LÀ OÙ L'ON SAISIT (charte § 5.6.1) : celui qui écrit une
          notice ne relit pas la charte en l'écrivant, et une marque qu'on ignore ne sert
          à personne. ⛔ Et l'écran DIT qu'une notice sans marque se rendra d'un seul tenant,
          plutôt que de laisser prendre pour un défaut ce qui est le cas ordinaire. */}
      <div style={{ gridColumn: '1 / -1', fontSize: '0.625rem', color: 'var(--cs-texte-second)', marginTop: '-6px', lineHeight: 1.5 }}>
        Mise en forme : une ligne « ## Témoins » ouvre une rubrique, une ligne
        « - P — Paris, BnF, latin 12293 : … » une entrée, dont le tiret sépare le sigle de sa
        désignation. Une ligne sans marque reste de la prose.
        {informations.trim() && !porteUneNotation(informations) && (
          <span style={{ color: 'var(--cs-attente)' }}>{' Cette notice ne porte aucune marque : elle se rendra d’un seul tenant.'}</span>
        )}
      </div>
      {raison && <div style={{ gridColumn: '1 / -1', fontSize: '0.6875rem', color: 'var(--cs-texte-second)' }}>{raison}</div>}
      {erreur && <div style={{ gridColumn: '1 / -1', fontSize: '0.6875rem', color: 'var(--cs-danger)' }}>{erreur}</div>}
    </div>
  )
}
