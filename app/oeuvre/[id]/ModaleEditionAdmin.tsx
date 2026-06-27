'use client'

import { useState, useRef } from 'react'
import type { EditionCible } from './oeuvreTypes'

const BTN_MODAL: React.CSSProperties = { fontSize: '11px', padding: '4px 9px', borderRadius: '4px', border: '1px solid #d6d0c4', background: '#fff', color: '#3a3530', cursor: 'pointer' }

async function appelerAPI(chemin: string, corps: object): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(chemin, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps) })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) return { ok: false, error: json.error ?? 'Erreur.' }
  return { ok: true }
}

// ── Modale d'édition admin (segment, titre de niveau, ou titre de l'œuvre) ───
// Toutes les écritures passent par des routes serveur (/api/admin/...), qui
// vérifient elles-mêmes le cookie admin avant d'utiliser la clé de service.
// Aucune écriture directe n'est faite depuis ce composant.
export default function ModaleEditionAdmin({ cible, idOeuvre, onClose, onEnregistre, onTitreOeuvreModifie }: {
  cible: EditionCible; idOeuvre: string; onClose: () => void; onEnregistre: () => void
  onTitreOeuvreModifie?: (texte: string) => void
}) {
  const [valeur, setValeur] = useState(cible.type === 'segment' ? cible.seg.texte : cible.texteActuel)
  const [etape, setEtape] = useState<'edition' | 'confirmation' | 'confirmation-suppression'>('edition')
  const [statut, setStatut] = useState<'idle' | 'envoi' | 'erreur'>('idle')
  const taRef = useRef<HTMLTextAreaElement>(null)

  const entourer = (avant: string, apres: string = avant) => {
    const ta = taRef.current
    if (!ta) return
    const d = ta.selectionStart, f = ta.selectionEnd
    const selection = valeur.slice(d, f) || 'texte'
    const nouveau = valeur.slice(0, d) + avant + selection + apres + valeur.slice(f)
    setValeur(nouveau)
    setTimeout(() => { ta.focus(); ta.setSelectionRange(d + avant.length, d + avant.length + selection.length) }, 0)
  }

  const inserer = (texte: string) => {
    const ta = taRef.current
    if (!ta) return
    const d = ta.selectionStart, f = ta.selectionEnd
    const nouveau = valeur.slice(0, d) + texte + valeur.slice(f)
    setValeur(nouveau)
    setTimeout(() => { ta.focus(); ta.setSelectionRange(d + texte.length, d + texte.length) }, 0)
  }

  const inserrerLien = () => {
    const url = window.prompt('URL du lien :', 'https://')
    if (url) entourer('[', `](${url})`)
  }

  const enregistrer = async () => {
    setStatut('envoi')
    let resultat: { ok: boolean; error?: string }
    if (cible.type === 'segment') {
      resultat = await appelerAPI('/api/admin/segment-modifier', { id: cible.seg.id, segment_texte: valeur })
    } else if (cible.type === 'titre_oeuvre') {
      resultat = await appelerAPI('/api/admin/update-oeuvre', { id_oeuvre: idOeuvre, champ: 'titre', valeur })
    } else {
      resultat = await appelerAPI('/api/admin/segment-titre', {
        id_oeuvre: idOeuvre, niveau: cible.niveau, action: 'modifier', valeur,
        schemaTexte: cible.schemaTexte, groupe: cible.groupe,
      })
    }
    if (!resultat.ok) { setStatut('erreur'); setEtape('edition'); return }
    if (cible.type === 'titre_oeuvre') onTitreOeuvreModifie?.(valeur)
    else onEnregistre()
    onClose()
  }

  const supprimerTitre = async () => {
    if (cible.type !== 'titre') return
    setStatut('envoi')
    const resultat = await appelerAPI('/api/admin/segment-titre', {
      id_oeuvre: idOeuvre, niveau: cible.niveau, action: 'supprimer', groupe: cible.groupe,
    })
    if (!resultat.ok) { setStatut('erreur'); setEtape('edition'); return }
    onEnregistre(); onClose()
  }

  // Supprime le segment puis décale d'un rang tous les segments numérotés
  // après lui, dans la même œuvre, pour ne jamais laisser de trou de
  // numérotation (citations, sommaire, etc. restent cohérents).
  const supprimerSegment = async () => {
    if (cible.type !== 'segment') return
    setStatut('envoi')
    const resultat = await appelerAPI('/api/admin/segment-supprimer', { id: cible.seg.id })
    if (!resultat.ok) { setStatut('erreur'); setEtape('edition'); return }
    onEnregistre(); onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '8px', padding: '20px 22px', width: '520px', maxWidth: '100%', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <p style={{ fontSize: '12px', fontWeight: 600, color: '#3d6b4f', margin: 0 }}>
            {cible.type === 'segment' ? 'Modifier le segment' : cible.type === 'titre_oeuvre' ? "Modifier le titre de l'œuvre" : `Modifier le titre de niveau ${cible.niveau}`}
          </p>
          <button onClick={onClose} style={{ fontSize: '14px', color: '#b0a89e', background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1 }}>✕</button>
        </div>

        {etape === 'edition' ? <>
          <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
            <button onClick={() => entourer('**')} title="Gras" style={{ ...BTN_MODAL, fontWeight: 700 }}>G</button>
            <button onClick={() => entourer('*')} title="Italique" style={{ ...BTN_MODAL, fontStyle: 'italic' }}>I</button>
            <button onClick={() => entourer('^^')} title="Exposant" style={BTN_MODAL}>x²</button>
            <button onClick={inserrerLien} title="Insérer un lien" style={BTN_MODAL}>Lien</button>
            <span style={{ width: '1px', background: '#e4dfd8' }} />
            <button onClick={() => inserer('\u00A0')} title="Espace insécable" style={{ ...BTN_MODAL, fontSize: '10px' }}>Esp. insécable</button>
            <button onClick={() => inserer('\u202F')} title="Espace fine insécable" style={{ ...BTN_MODAL, fontSize: '10px' }}>Esp. fine</button>
            <button onClick={() => entourer('«\u202F', '\u202F»')} title="Guillemets français" style={BTN_MODAL}>« »</button>
            <button onClick={() => entourer('\u201C', '\u201D')} title="Guillemets anglais (citation imbriquée)" style={BTN_MODAL}>“ ”</button>
          </div>
          <textarea ref={taRef} value={valeur} onChange={e => setValeur(e.target.value)}
            rows={cible.type === 'segment' ? 8 : cible.type === 'titre_oeuvre' ? 4 : 2} autoFocus
            style={{ width: '100%', fontSize: '12.5px', padding: '8px 10px', border: '1px solid #d6d0c4', borderRadius: '5px', background: '#faf8f4', color: '#2a2520', resize: 'vertical', outline: 'none', lineHeight: 1.55, boxSizing: 'border-box', fontFamily: cible.type === 'segment' ? 'Arial, sans-serif' : 'inherit' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
            {cible.type === 'titre' ? (
              <button onClick={supprimerTitre} style={{ fontSize: '10.5px', color: '#c0562a', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                Supprimer ce titre
              </button>
            ) : cible.type === 'segment' ? (
              <button onClick={() => setEtape('confirmation-suppression')} style={{ fontSize: '10.5px', color: '#c0562a', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                Supprimer ce segment
              </button>
            ) : <span />}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={onClose} style={{ fontSize: '11px', padding: '5px 12px', borderRadius: '4px', border: '1px solid #d6d0c4', background: '#fff', color: '#6b6560', cursor: 'pointer' }}>Annuler</button>
              <button onClick={() => setEtape('confirmation')} disabled={!valeur.trim()}
                style={{ fontSize: '11px', padding: '5px 14px', borderRadius: '4px', border: 'none', cursor: valeur.trim() ? 'pointer' : 'default', background: valeur.trim() ? '#3d6b4f' : '#e4dfd8', color: '#fff', fontWeight: 500 }}>
                Modifier
              </button>
            </div>
          </div>
          {statut === 'erreur' && <p style={{ fontSize: '10px', color: '#c0562a', marginTop: '8px' }}>Erreur d'enregistrement — rien n'a été modifié.</p>}
        </> : etape === 'confirmation' ? <>
          <p style={{ fontSize: '11px', color: '#6b6560', marginBottom: '10px' }}>Confirmer cette modification ?</p>
          <div style={{ background: '#faf8f4', border: '1px solid #ede9e2', borderRadius: '5px', padding: '8px 10px', fontSize: '11.5px', color: '#2a2520', marginBottom: '12px', maxHeight: '160px', overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
            {valeur}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button onClick={() => setEtape('edition')} disabled={statut === 'envoi'} style={{ fontSize: '11px', padding: '5px 12px', borderRadius: '4px', border: '1px solid #d6d0c4', background: '#fff', color: '#6b6560', cursor: 'pointer' }}>Retour</button>
            <button onClick={enregistrer} disabled={statut === 'envoi'} style={{ fontSize: '11px', padding: '5px 14px', borderRadius: '4px', border: 'none', cursor: 'pointer', background: '#3d6b4f', color: '#fff', fontWeight: 500 }}>
              {statut === 'envoi' ? 'Envoi…' : 'Confirmer'}
            </button>
          </div>
        </> : <>
          <p style={{ fontSize: '11px', color: '#c0562a', marginBottom: '10px' }}>Supprimer définitivement ce segment ? La numérotation des segments suivants sera décalée automatiquement.</p>
          <div style={{ background: '#faf8f4', border: '1px solid #ede9e2', borderRadius: '5px', padding: '8px 10px', fontSize: '11.5px', color: '#2a2520', marginBottom: '12px', maxHeight: '160px', overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
            {valeur}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button onClick={() => setEtape('edition')} disabled={statut === 'envoi'} style={{ fontSize: '11px', padding: '5px 12px', borderRadius: '4px', border: '1px solid #d6d0c4', background: '#fff', color: '#6b6560', cursor: 'pointer' }}>Retour</button>
            <button onClick={supprimerSegment} disabled={statut === 'envoi'} style={{ fontSize: '11px', padding: '5px 14px', borderRadius: '4px', border: 'none', cursor: 'pointer', background: '#c0562a', color: '#fff', fontWeight: 500 }}>
              {statut === 'envoi' ? 'Suppression…' : 'Supprimer définitivement'}
            </button>
          </div>
        </>}
      </div>
    </div>
  )
}
