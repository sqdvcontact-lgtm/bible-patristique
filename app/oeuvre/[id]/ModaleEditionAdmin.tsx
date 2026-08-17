'use client'

import { useState, useRef } from 'react'
import type { EditionCible } from './oeuvreTypes'

const BTN_MODAL: React.CSSProperties = { fontSize: '0.6875rem', padding: '4px 9px', borderRadius: '4px', border: '1px solid var(--cs-bord)', background: 'var(--cs-surface)', color: 'var(--cs-texte)', cursor: 'pointer' }

// Le verrou du site ne refuse pas un appel non authentifié : il le REDIRIGE vers
// /chantier. Or `fetch` suit les redirections, si bien qu'une session non
// reconnue revenait en 200 porteur de HTML : `res.ok` était vrai, `res.json()`
// échouait, l'échec était avalé par le `.catch`, et la fonction annonçait un
// succès. La modale se fermait alors sur une modification jamais écrite, sans le
// moindre message. On contrôle donc la redirection et le type de la réponse
// AVANT de la lire (règle posée dans AGENTS.md).
async function appelerAPI(chemin: string, corps: object): Promise<{ ok: boolean; error?: string }> {
  let res: Response
  try {
    res = await fetch(chemin, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps) })
  } catch {
    return { ok: false, error: 'Le serveur n’a pas répondu. Vérifiez la connexion, puis réessayez.' }
  }
  const typeReponse = res.headers.get('content-type') ?? ''
  if (res.redirected || !typeReponse.includes('application/json')) {
    console.error('Édition refusée : réponse inattendue', { chemin, statut: res.status, redirige: res.redirected, url: res.url, type: typeReponse })
    return { ok: false, error: 'Session non reconnue : rien n’a été enregistré. Rechargez la page ou reconnectez-vous, puis réessayez.' }
  }
  const json = await res.json().catch(() => null)
  if (!res.ok || !json) {
    console.error('Édition refusée', { chemin, statut: res.status, json })
    return { ok: false, error: json?.error ?? `Échec de l’enregistrement (HTTP ${res.status}).` }
  }
  return { ok: true }
}

// ── Modale d'édition admin (segment, titre de niveau, ou titre de l'œuvre) ───
// Toutes les écritures passent par des routes serveur (/api/admin/...), qui
// vérifient elles-mêmes le cookie admin avant d'utiliser la clé de service.
// Aucune écriture directe n'est faite depuis ce composant.
const CHAMP_LABEL: Record<string, string> = {
  titre: "Modifier le titre de l'œuvre",
  sous_titre: 'Modifier le sous-titre',
  titre_original: 'Modifier le titre original',
  trad_auteur: 'Modifier le traducteur',
}

export default function ModaleEditionAdmin({ cible, idOeuvre, onClose, onEnregistre, onTitreOeuvreModifie }: {
  cible: EditionCible; idOeuvre: string; onClose: () => void; onEnregistre: () => void
  onTitreOeuvreModifie?: (champ: string, valeur: string) => void
}) {
  const [valeur, setValeur] = useState(cible.type === 'segment' ? cible.seg.texte : cible.texteActuel)
  const [etape, setEtape] = useState<'edition' | 'confirmation' | 'confirmation-suppression'>('edition')
  const [statut, setStatut] = useState<'idle' | 'envoi' | 'erreur'>('idle')
  const [erreurMsg, setErreurMsg] = useState<string | null>(null)
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
      resultat = await appelerAPI('/api/admin/update-oeuvre', { id_oeuvre: idOeuvre, champ: cible.champ, valeur: valeur || null })
    } else {
      resultat = await appelerAPI('/api/admin/segment-titre', {
        id_oeuvre: idOeuvre, niveau: cible.niveau, action: 'modifier', valeur,
        schemaTexte: cible.schemaTexte, groupe: cible.groupe,
      })
    }
    if (!resultat.ok) { setStatut('erreur'); setErreurMsg(resultat.error ?? null); setEtape('edition'); return }
    if (cible.type === 'titre_oeuvre') onTitreOeuvreModifie?.(cible.champ, valeur)
    else onEnregistre()
    onClose()
  }

  const viderChampOeuvre = async (champ: string) => {
    setStatut('envoi')
    const resultat = await appelerAPI('/api/admin/update-oeuvre', { id_oeuvre: idOeuvre, champ, valeur: null })
    if (!resultat.ok) { setStatut('erreur'); setErreurMsg(resultat.error ?? null); setEtape('edition'); return }
    onTitreOeuvreModifie?.(champ, '')
    onClose()
  }

  const supprimerTitre = async () => {
    if (cible.type !== 'titre') return
    setStatut('envoi')
    // schemaTexte = true → on vide uniquement le champ _texte (ne pas toucher au titre principal)
    const resultat = cible.schemaTexte
      ? await appelerAPI('/api/admin/segment-titre', {
          id_oeuvre: idOeuvre, niveau: cible.niveau, action: 'modifier', valeur: '', schemaTexte: true, groupe: cible.groupe,
        })
      : await appelerAPI('/api/admin/segment-titre', {
          id_oeuvre: idOeuvre, niveau: cible.niveau, action: 'supprimer', groupe: cible.groupe,
        })
    if (!resultat.ok) { setStatut('erreur'); setErreurMsg(resultat.error ?? null); setEtape('edition'); return }
    onEnregistre(); onClose()
  }

  // Supprime le segment puis décale d'un rang tous les segments numérotés
  // après lui, dans la même œuvre, pour ne jamais laisser de trou de
  // numérotation (citations, sommaire, etc. restent cohérents).
  const supprimerSegment = async () => {
    if (cible.type !== 'segment') return
    setStatut('envoi')
    const resultat = await appelerAPI('/api/admin/segment-supprimer', { id: cible.seg.id })
    if (!resultat.ok) { setStatut('erreur'); setErreurMsg(resultat.error ?? null); setEtape('edition'); return }
    onEnregistre(); onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--cs-surface)', borderRadius: '8px', padding: '20px 24px', width: '42.5rem', maxWidth: '100%', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--cs-vert)', margin: 0 }}>
            {cible.type === 'segment' ? 'Modifier le segment' : cible.type === 'titre_oeuvre' ? (CHAMP_LABEL[cible.champ] ?? "Modifier le titre de l'œuvre") : `Modifier le titre de niveau ${cible.niveau}`}
          </p>
          <button onClick={onClose} style={{ fontSize: '0.875rem', color: 'var(--cs-texte-faible)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1 }}>✕</button>
        </div>

        {etape === 'edition' ? <>
          <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', flexWrap: 'wrap' }}>
            <button onClick={() => entourer('**')} title="Gras" style={{ ...BTN_MODAL, fontWeight: 700 }}>G</button>
            <button onClick={() => entourer('*')} title="Italique" style={{ ...BTN_MODAL, fontStyle: 'italic' }}>I</button>
            <button onClick={() => entourer('^^')} title="Exposant" style={BTN_MODAL}>x²</button>
            <button onClick={inserrerLien} title="Insérer un lien" style={BTN_MODAL}>Lien</button>
            <span style={{ width: '1px', background: 'var(--cs-bord-clair)' }} />
            <button onClick={() => entourer('« ', ' »')} title="Guillemets français" style={BTN_MODAL}>« »</button>
            <button onClick={() => entourer('“', '”')} title="Guillemets anglais (citation imbriquée)" style={BTN_MODAL}>" "</button>
          </div>
          <textarea ref={taRef} value={valeur} onChange={e => setValeur(e.target.value)}
            rows={cible.type === 'segment' ? 8 : cible.type === 'titre_oeuvre' && cible.champ === 'titre' ? 3 : 2} autoFocus
            style={{ width: '100%', fontSize: '0.78125rem', padding: '8px 10px', border: '1px solid var(--cs-bord)', borderRadius: '5px', background: 'var(--cs-fond-clair)', color: 'var(--cs-texte-fort)', resize: 'vertical', outline: 'none', lineHeight: 1.55, boxSizing: 'border-box', fontFamily: cible.type === 'segment' ? 'var(--font-source-sans), Arial, sans-serif' : 'inherit' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
            {cible.type === 'titre' ? (
              <button onClick={supprimerTitre} style={{ fontSize: '0.65625rem', color: 'var(--cs-danger)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                Supprimer
              </button>
            ) : cible.type === 'segment' ? (
              <button onClick={() => setEtape('confirmation-suppression')} style={{ fontSize: '0.65625rem', color: 'var(--cs-danger)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                Supprimer
              </button>
            ) : cible.type === 'titre_oeuvre' && cible.champ !== 'titre' ? (
              <button onClick={() => viderChampOeuvre(cible.champ)} style={{ fontSize: '0.65625rem', color: 'var(--cs-danger)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                Supprimer
              </button>
            ) : <span />}
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={onClose} style={{ fontSize: '0.6875rem', padding: '5px 12px', borderRadius: '4px', border: '1px solid var(--cs-bord)', background: 'var(--cs-surface)', color: 'var(--cs-texte-second)', cursor: 'pointer' }}>Annuler</button>
              <button onClick={() => setEtape('confirmation')} disabled={!valeur.trim()}
                style={{ fontSize: '0.6875rem', padding: '5px 14px', borderRadius: '4px', border: 'none', cursor: valeur.trim() ? 'pointer' : 'default', background: valeur.trim() ? 'var(--cs-vert)' : 'var(--cs-bord-clair)', color: '#fff', fontWeight: 500 }}>
                Modifier
              </button>
            </div>
          </div>
          {statut === 'erreur' && (
            <p style={{ fontSize: '0.625rem', color: 'var(--cs-danger)', marginTop: '8px' }}>
              Erreur d&rsquo;enregistrement{erreurMsg ? ` — ${erreurMsg}` : ' — rien n’a été modifié.'}
            </p>
          )}
        </> : etape === 'confirmation' ? <>
          <p style={{ fontSize: '0.6875rem', color: 'var(--cs-texte-second)', marginBottom: '10px' }}>Confirmer cette modification ?</p>
          <div style={{ background: 'var(--cs-fond-clair)', border: '1px solid var(--cs-fond-doux)', borderRadius: '5px', padding: '8px 10px', fontSize: '0.71875rem', color: 'var(--cs-texte-fort)', marginBottom: '12px', maxHeight: '160px', overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
            {valeur}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button onClick={() => setEtape('edition')} disabled={statut === 'envoi'} style={{ fontSize: '0.6875rem', padding: '5px 12px', borderRadius: '4px', border: '1px solid var(--cs-bord)', background: 'var(--cs-surface)', color: 'var(--cs-texte-second)', cursor: 'pointer' }}>Retour</button>
            <button onClick={enregistrer} disabled={statut === 'envoi'} style={{ fontSize: '0.6875rem', padding: '5px 14px', borderRadius: '4px', border: 'none', cursor: 'pointer', background: 'var(--cs-vert)', color: '#fff', fontWeight: 500 }}>
              {statut === 'envoi' ? 'Envoi…' : 'Confirmer'}
            </button>
          </div>
        </> : <>
          <p style={{ fontSize: '0.6875rem', color: 'var(--cs-danger)', marginBottom: '10px' }}>Supprimer définitivement ce segment ? La numérotation des segments suivants sera décalée automatiquement.</p>
          <div style={{ background: 'var(--cs-fond-clair)', border: '1px solid var(--cs-fond-doux)', borderRadius: '5px', padding: '8px 10px', fontSize: '0.71875rem', color: 'var(--cs-texte-fort)', marginBottom: '12px', maxHeight: '160px', overflowY: 'auto', whiteSpace: 'pre-wrap' }}>
            {valeur}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button onClick={() => setEtape('edition')} disabled={statut === 'envoi'} style={{ fontSize: '0.6875rem', padding: '5px 12px', borderRadius: '4px', border: '1px solid var(--cs-bord)', background: 'var(--cs-surface)', color: 'var(--cs-texte-second)', cursor: 'pointer' }}>Retour</button>
            <button onClick={supprimerSegment} disabled={statut === 'envoi'} style={{ fontSize: '0.6875rem', padding: '5px 14px', borderRadius: '4px', border: 'none', cursor: 'pointer', background: 'var(--cs-danger)', color: '#fff', fontWeight: 500 }}>
              {statut === 'envoi' ? 'Suppression…' : 'Supprimer définitivement'}
            </button>
          </div>
        </>}
      </div>
    </div>
  )
}
